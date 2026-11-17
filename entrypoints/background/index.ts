import { defineBackground } from 'wxt/sandbox';
import { trialRun } from '~/lib/executor';
import { getAiLogs, clearAiLogs } from '~/lib/aiLog';
import { recognizeLocally, recognizeWithAI, testAIConnection } from '~/lib/recognizer';
import { ALARM_NAME, clearDone, markDone, runTaskNow, scheduleAlarms, tick } from '~/lib/scheduler';
import { getSettings } from '~/lib/storage';
import type { AppSettings, SelectionPayload } from '~/lib/types';

const PENDING_KEY = 'cm_pending';

/* ─────────────────────────────────────────────
   侧边面板：优先用 Chrome 原生 sidePanel（钉在浏览器右侧、跨标签页常驻）。
   旧方案（往网页里注入 iframe）已移除：会被页面刷新冲掉，也会挤占页面。
   兜底链：原生面板 → 独立标签页。
   ───────────────────────────────────────────── */

/** 打开原生侧边面板。需要用户手势语境，失败返回 false。 */
async function openPanel(target: { tabId?: number; windowId?: number }): Promise<boolean> {
  if (!chrome.sidePanel) return false;
  try {
    // OpenOptions 要求 tabId / windowId 二选一精确给出，不能都留空。
    if (target.tabId != null) {
      await chrome.sidePanel.open({ tabId: target.tabId });
    } else if (target.windowId != null) {
      await chrome.sidePanel.open({ windowId: target.windowId });
    } else {
      const win = await chrome.windows.getCurrent();
      if (win.id == null) return false;
      await chrome.sidePanel.open({ windowId: win.id });
    }
    return true;
  } catch (error) {
    console.warn('[CapMind] 打开原生面板失败（可能缺少用户手势）', error);
    return false;
  }
}

/** 配置面板：路径带 ctx=panel 标记面板布局。 */
async function setupPanel(): Promise<void> {
  if (!chrome.sidePanel) return;
  try {
    // 只设路径，不设 openPanelOnActionClick：改由 action.onClicked 显式打开，
    // 这样面板打开失败时还能退回独立标签页，而不是点了图标毫无反应。
    await chrome.sidePanel.setOptions({ path: '/sidebar.html?ctx=panel', enabled: true });
  } catch (error) {
    console.warn('[CapMind] sidePanel 配置失败', error);
  }
}

/** 找一个能注入 content script 的普通网页标签页（跳过扩展页和 chrome:// 页）。 */
async function findWebTab(): Promise<chrome.tabs.Tab | undefined> {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const isWeb = (url?: string) =>
    !!url && (url.startsWith('http://') || url.startsWith('https://'));
  const active = tabs.find((t) => t.active);
  if (active && isWeb(active.url)) return active;
  return tabs.find((t) => isWeb(t.url));
}

/**
 * 打开原生侧边面板。这是唯一的界面承载方式——不再回退独立标签页，
 * 避免「圈选后莫名多出一个窗口」。
 *
 * 限制：sidePanel.open() 必须在用户手势内调用。所以只在
 * action.onClicked / contextMenus.onClicked 这类真正的手势入口里调它。
 * 非手势场景（如 AI 分析完成后）不要调，面板若已开着会自动刷新内容。
 */
async function surfaceSidebar(target: { tabId?: number; windowId?: number }): Promise<boolean> {
  return openPanel(target);
}

async function startSelectionOnWebTab(preferredId?: number): Promise<void> {
  const tab = preferredId
    ? (await chrome.tabs.query({ currentWindow: true })).find((t) => t.id === preferredId)
    : await findWebTab();
  if (!tab?.id) {
    console.warn('[CapMind] 没有可用的网页标签页，请先打开一个 http/https 页面');
    return;
  }
  // 面板模式下活动标签页本来就是网页；独立标签页模式必须把网页切到前台才能看到圈选遮罩。
  if (!tab.active) await chrome.tabs.update(tab.id, { active: true });
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'CM_START_SELECTION' });
  } catch (error) {
    console.warn('[CapMind] 该页面未注入 content script，请刷新页面后重试', error);
  }
}

/** 圈选结果 → 识别 → 存为待编辑草稿 → 唤起界面。 */
async function handleSelection(payload: SelectionPayload): Promise<void> {
  const settings = await getSettings();
  const useAI = settings.aiEnabled && Boolean(settings.aiKey);

  const startedAt = Date.now();

  // 先给面板一个「分析中」占位 + 起始时间，面板据此显示已等待秒数。
  if (useAI) {
    await chrome.storage.local.set({
      [PENDING_KEY]: {
        payload,
        recipe: recognizeLocally(payload).recipe,
        warnings: [],
        at: startedAt,
        analyzing: true,
        analyzeStartedAt: startedAt,
        analyzeStage: 'request',
      },
    });
  }

  let result = recognizeLocally(payload);

  if (useAI) {
    // 每 3 秒把「已用时」写回草稿，让面板能显示进度（大模型首字可能很慢）。
    const progressTimer = setInterval(() => {
      void chrome.storage.local.get(PENDING_KEY).then((cur) => {
        const draft = cur[PENDING_KEY];
        if (!draft?.analyzing) return;
        void chrome.storage.local.set({
          [PENDING_KEY]: { ...draft, analyzeElapsed: Math.round((Date.now() - startedAt) / 1000) },
        });
      });
    }, 3000);

    try {
      // 大模型首字可能要几十秒，给足 5 分钟；端点不通时也不会无限挂着。
      result = await Promise.race([
        recognizeWithAI(payload, settings, (info) => {
          // 服务端过载：把「正在重试」写进草稿，面板显示倒计时，用户知道没卡死。
          void chrome.storage.local.get(PENDING_KEY).then((cur) => {
            const draft = cur[PENDING_KEY];
            if (!draft?.analyzing) return;
            void chrome.storage.local.set({
              [PENDING_KEY]: {
                ...draft,
                analyzeStage: 'retry',
                retryAttempt: info.attempt,
                retryMax: info.maxRetry,
                retryWaitSec: info.waitSec,
                retryStatus: info.status,
              },
            });
          });
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AI 请求超过 5 分钟仍未返回，已改用本地识别')), 300000),
        ),
      ]);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      result = recognizeLocally(payload);
      result.warnings.push(`AI 识别不可用，已改用本地识别：${reason}`);
    } finally {
      clearInterval(progressTimer);
    }
  }

  const stored = await chrome.storage.local.get('cm_replace_id');
  const replaceId = stored.cm_replace_id as string | undefined;
  await chrome.storage.local.remove('cm_replace_id');

  await chrome.storage.local.set({
    [PENDING_KEY]: {
      payload,
      recipe: result.recipe,
      warnings: result.warnings,
      analysis: result.analysis,
      at: Date.now(),
      ...(replaceId ? { replaceId } : {}),
    },
  });

  // 手势已失效，这里不能调 sidePanel.open()。面板若开着，会靠 storage.onChanged 自动刷新。
}

export default defineBackground(() => {
  // MV3 的 Service Worker 会被随时终止，每次启动都检查 alarm 并补领漏跑的任务。
  void setupPanel();
  void scheduleAlarms();
  void tick();

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) void tick();
  });

  chrome.runtime.onInstalled.addListener(() => {
    void setupPanel();
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: 'cm-sidebar',
        title: 'CapMind · 打开事项面板',
        contexts: ['page'],
      });
      chrome.contextMenus.create({
        id: 'cm-select',
        title: '圈选这一块，记成事项',
        contexts: ['page'],
      });
    });
    void scheduleAlarms();
  });

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'cm-sidebar') {
      // 右键菜单是用户手势，必须同步走 openPanel，不能先 await 别的东西。
      void surfaceSidebar({ tabId: tab?.id, windowId: tab?.windowId });
    } else if (info.menuItemId === 'cm-select') {
      void startSelectionOnWebTab(tab?.id);
    }
  });

  chrome.action.onClicked.addListener((tab) => {
    // 图标点击是用户手势：立即开面板（唯一承载方式，不再回退独立标签页）。
    void surfaceSidebar({ tabId: tab.id, windowId: tab.windowId });
  });

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    const handle = async (): Promise<unknown> => {
      switch (msg.type) {
        case 'START_SELECTION':
          await startSelectionOnWebTab();
          return { ok: true };
        case 'SELECTION_RESULT':
          await handleSelection(msg.payload as SelectionPayload);
          return { ok: true };
        case 'SELECTION_CANCELLED':
          return { ok: true };
        case 'RUN_TASK':
          return runTaskNow(msg.id as string);
        case 'MARK_DONE':
          await markDone(msg.id as string, 'manual');
          return { ok: true };
        case 'CLEAR_DONE':
          await clearDone(msg.id as string);
          return { ok: true };
        case 'OPEN_TASK_URL': {
          const tasks = await chrome.storage.local.get('cm_tasks');
          const list = (tasks.cm_tasks ?? []) as { id: string; url: string }[];
          const target = list.find((t) => t.id === msg.id);
          if (target?.url) await chrome.tabs.create({ url: target.url, active: true });
          return { ok: !!target };
        }
        case 'TRIAL_RUN':
          return trialRun(msg.recipe, msg.url as string);
        case 'TEST_AI':
          return testAIConnection(msg.settings as AppSettings);
        case 'GET_AI_LOGS':
          return getAiLogs();
        case 'CLEAR_AI_LOGS':
          await clearAiLogs();
          return { ok: true };
        case 'OPEN_PANEL': {
          const ok = await openPanel(
            sender.tab?.windowId != null ? { windowId: sender.tab.windowId } : {},
          );
          return ok ? { ok: true } : { ok: false, message: '请在网页上点工具栏图标打开面板' };
        }
        default:
          return { ok: false, message: '未知消息类型' };
      }
    };

    void handle()
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, message: String(error) }));
    return true;
  });
});

import type { CheckinRecipe, RunOutcome } from './types';

interface ProbeResult {
  found: boolean;
  label: string;
  already: boolean;
  text: string;
}

interface VerifyResult {
  success: boolean;
  text: string;
}

/**
 * 注入目标页面执行的函数们。必须自包含：chrome.scripting 会把函数序列化，
 * 不能引用模块作用域里的变量，也不能是 async（Promise 结果不会被带回）。
 * 所以用「多次同步注入 + 后台等待」代替单个异步函数。
 */
/** 从图片文件名里提取可读文案，必须与 selector.ts 的 textFromUrl 保持一致。 */
function textFromUrl(raw: string): string {
  // 空串直接返回，否则 new URL('', base) 会解析成当前页面，
  // 把页面文件名当成按钮文案。
  if (!raw || !raw.trim()) return '';
  try {
    const path = new URL(raw, location.href).pathname;
    const base = path.slice(path.lastIndexOf('/') + 1);
    return base
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/[@_-]?\d+(\.\d+)?x$/i, '')
      .replace(/[-_+.]+/g, ' ')
      .trim();
  } catch {
    return '';
  }
}

/** 只取元素自身的直接文本节点，必须与 selector.ts 的 ownText 保持一致。 */
function ownText(el: Element): string {
  let out = '';
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === 3) out += node.textContent ?? '';
  }
  return out.replace(/\s+/g, ' ').trim();
}

/**
 * 按钮文案，必须与 selector.ts 的 visibleText 保持一致：
 * 先取直接文本节点，再退到「后代文本但去掉嵌套的按钮/图片」。
 * `<button><span>签到</span></button>` 的文字在 span 里，只取直接文本节点会漏，
 * 那样执行阶段就会把正常按钮误判成「文案不匹配」。
 */
function visibleText(el: Element): string {
  const own = ownText(el);
  if (own) return own;
  const clone = el.cloneNode(true) as Element;
  clone.querySelectorAll('button, img, svg, canvas, input, select, textarea').forEach((n) => n.remove());
  return (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * 判据匹配范围：优先按钮所在的小容器（卡片/表单/区块），找不到才退回全页。
 * 全页匹配在真实站点上极易误判——页面别处常有「已领取」推荐位或帮助文案，
 * 会让签到被误跳过。局部范围能把误判概率压低一个量级。
 */
function localTextOf(el: Element, radius = 4): string {
  let node: Element | null = el.parentElement;
  let depth = 0;
  while (node && depth < radius) {
    const text = (node as HTMLElement).innerText ?? '';
    // 容器小到能读完全部文本（不是整页那种巨型容器）时就用它。
    if (text.length > 0 && text.length < 600) return text;
    node = node.parentElement;
    depth += 1;
  }
  return document.body?.innerText ?? '';
}

function probePage(recipe: CheckinRecipe): ProbeResult {
  const body = document.body?.innerText ?? '';
  const el = recipe.action.selector
    ? document.querySelector(recipe.action.selector)
    : null;
  if (!el) {
    return { found: false, label: '', already: false, text: body.slice(0, 300) };
  }
  // 文案可能不在元素本身，而在内部的 <img alt> 上（图片按钮）。
  // 读取顺序必须与 selector.ts 的 describeButton 完全一致，
  // 否则「识别时拿到文件名、执行时拿不到」会让每次执行都被误判成文案不匹配。
  const img = el.querySelector('img') ?? (el.tagName === 'IMG' ? el : null);
  const label =
    visibleText(el) ||
    (el as HTMLInputElement).value?.trim() ||
    el.getAttribute('aria-label')?.trim() ||
    el.getAttribute('title')?.trim() ||
    img?.getAttribute('alt')?.trim() ||
    img?.getAttribute('title')?.trim() ||
    textFromUrl(img?.getAttribute('src') ?? '') ||
    '';
  // 判据只在按钮附近的局部文本里找，避免全页误命中。
  const scope = localTextOf(el);
  return {
    found: true,
    label,
    already: recipe.alreadySignals.some((signal) => signal && scope.includes(signal)),
    text: body.slice(0, 300),
  };
}

function clickPage(recipe: CheckinRecipe): boolean {
  const el = recipe.action.selector
    ? document.querySelector(recipe.action.selector)
    : null;
  if (!el) return false;
  (el as HTMLElement).click();
  return true;
}

function verifyPage(recipe: CheckinRecipe): VerifyResult {
  const body = document.body?.innerText ?? '';
  const el = recipe.action.selector ? document.querySelector(recipe.action.selector) : null;
  // 局部找不到成功判据时，有些站点是弹 toast（在页面顶部）而不是改按钮文字，
  // 所以这里保留全页兜底，但优先局部。
  const scope = el ? localTextOf(el) : body;
  const hitLocal = recipe.successSignals.some((signal) => signal && scope.includes(signal));
  const hitGlobal = recipe.successSignals.some((signal) => signal && body.includes(signal));
  return {
    success: hitLocal || hitGlobal,
    text: body.slice(0, 300),
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForTabLoad(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    };
    const listener = (id: number, info: chrome.tabs.TabChangeInfo) => {
      if (id === tabId && info.status === 'complete') finish();
    };
    chrome.tabs.onUpdated.addListener(listener);
    setTimeout(finish, 8000);
  });
}

async function withTab<T>(url: string, site: string, fn: (tabId: number) => Promise<T>): Promise<T> {
  const allTabs = await chrome.tabs.query({});
  const existing = allTabs.find((tab) => tab.id && tab.url && tab.url.includes(site));

  if (existing?.id) return fn(existing.id);

  const created = await chrome.tabs.create({ url, active: false });
  if (!created.id) throw new Error('无法打开目标标签页');
  try {
    if (created.status !== 'complete') await waitForTabLoad(created.id);
    await delay(700); // 给单页应用留出渲染时间
    return await fn(created.id);
  } finally {
    try {
      await chrome.tabs.remove(created.id);
    } catch {
      // 标签页可能已被用户关闭，忽略即可。
    }
  }
}

/** 在指定标签页按配方跑一次（doClick=false 为干跑）。 */
export async function runRecipeOnTab(
  tabId: number,
  recipe: CheckinRecipe,
  doClick: boolean,
): Promise<RunOutcome> {
  try {
    const probeResult = await chrome.scripting.executeScript({
      target: { tabId },
      func: probePage,
      args: [recipe],
    });
    const probe = probeResult?.[0]?.result as ProbeResult | undefined;
    if (!probe) return { status: 'error', message: '没有拿到页面探测结果' };

    if (!probe.found) {
      return {
        status: 'needs-human',
        message: '找不到签到按钮，页面可能改版了',
        evidence: probe.text,
      };
    }
    // 图片/画布按钮没有可校验文案（textHintSource === 'none'）：此时只校验元素存在，
    // 不拿空串去比对——否则每次执行都会被误判成「文案不匹配」。
    const verifiable = recipe.action.textHintSource !== 'none' && Boolean(recipe.action.textHint);
    if (verifiable && !probe.label.includes(recipe.action.textHint)) {
      return {
        status: 'needs-human',
        message: '按钮文案不匹配，已停止以免点错',
        evidence: `期望「${recipe.action.textHint}」，实际「${probe.label.slice(0, 60)}」`,
      };
    }
    if (probe.already) {
      return { status: 'already', message: '今天已经领过，跳过' };
    }
    if (!doClick) {
      return {
        status: 'ok',
        message: verifiable
          ? '干跑通过：按钮与判据都匹配，未点击'
          : '干跑通过：按钮存在、判据匹配（图片按钮无文案可校验），未点击',
      };
    }

    const clicked = await chrome.scripting.executeScript({
      target: { tabId },
      func: clickPage,
      args: [recipe],
    });
    if (!clicked?.[0]?.result) {
      return { status: 'error', message: '点击时按钮已消失' };
    }

    await delay(1500);

    const verifyResult = await chrome.scripting.executeScript({
      target: { tabId },
      func: verifyPage,
      args: [recipe],
    });
    const verified = verifyResult?.[0]?.result as VerifyResult | undefined;
    if (!verified) return { status: 'error', message: '没有拿到结果校验' };
    if (verified.success) {
      return { status: 'ok', message: '已点击，命中成功判据' };
    }
    return {
      status: 'needs-human',
      message: '已点击但没命中成功判据，可能需要登录或验证码',
      evidence: verified.text,
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : '注入脚本失败',
    };
  }
}

/** 打开/复用标签页并执行一个签到事项。 */
export async function executeTask(task: import('./types').Task): Promise<RunOutcome> {
  if (!task.recipe) return { status: 'error', message: '这个事项还没有签到配方' };
  return withTab(task.url, task.site, (tabId) =>
    runRecipeOnTab(tabId, task.recipe as CheckinRecipe, true),
  );
}

/** 试跑：在目标页打开并按配方执行，结果交给 UI 展示。 */
export async function trialRun(recipe: CheckinRecipe, url: string): Promise<RunOutcome> {
  const site = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  })();
  return withTab(url, site, (tabId) => runRecipeOnTab(tabId, recipe, true));
}

/* ─────────────────────────────────────────────
   自动模式：不依赖固定 selector，按语义在页面上现场找「领取/签到」按钮。
   这是「browser use 的简化版」——不需要模型，用文案语义 + 可见性就能定位。
   找不到、要登录、点了没效果，一律降级为提醒，不惊扰用户。
   ───────────────────────────────────────────── */

interface FindResult {
  found: boolean;
  /** 命中的按钮文字，用于回报 */
  label: string;
  /** 是否看起来需要登录 */
  needLogin: boolean;
  /** 页面是否显示「已领取」类状态 */
  already: boolean;
}

/** 注入到目标页执行：按语义找按钮，自包含、不能引用模块变量。 */
function findSemanticButton(words: string[], alreadyWords: string[]): FindResult {
  const body = document.body?.innerText ?? '';
  const already = alreadyWords.some((w) => w && body.includes(w));

  const isVisible = (el: Element): boolean => {
    const rect = el.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) return false;
    const style = getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  };

  const nodes = Array.from(
    document.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]'),
  ) as HTMLElement[];

  const pick = (list: HTMLElement[]) => {
    for (const el of list) {
      if (!isVisible(el)) continue;
      const text = (
        el.innerText ||
        (el as HTMLInputElement).value ||
        el.getAttribute('aria-label') ||
        el.getAttribute('title') ||
        ''
      ).trim();
      if (!text || text.length > 30) continue;
      if (words.some((w) => w && text.includes(w))) {
        return { el, text };
      }
    }
    return null;
  };

  const hit = pick(nodes);

  // 需要登录的粗判：页面上有「登录」「注册」按钮而没找到领取按钮。
  const loginBtn = nodes.find((el) => {
    const t = (el.innerText || '').trim();
    return isVisible(el) && (t === '登录' || t === '登入' || t === 'Sign in' || t === 'Log in');
  });

  return {
    found: !!hit,
    label: hit?.text ?? '',
    needLogin: !hit && !!loginBtn,
    already,
  };
}

/** 注入执行：点击语义匹配的按钮。 */
function clickSemanticButton(words: string[]): boolean {
  const nodes = Array.from(
    document.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]'),
  ) as HTMLElement[];
  for (const el of nodes) {
    const rect = el.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) continue;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') continue;
    const text = (
      el.innerText ||
      (el as HTMLInputElement).value ||
      el.getAttribute('aria-label') ||
      ''
    ).trim();
    if (text && text.length <= 30 && words.some((w) => w && text.includes(w))) {
      el.click();
      return true;
    }
  }
  return false;
}

/** 注入执行：点击后看页面是否出现成功迹象。 */
function verifySemantic(successWords: string[]): { success: boolean; text: string } {
  const body = document.body?.innerText ?? '';
  return {
    success: successWords.some((w) => w && body.includes(w)),
    text: body.slice(0, 300),
  };
}

const DEFAULT_AUTO_WORDS = ['去领', '立即领取', '领取', '签到', '打卡', '每日领取', '领额度'];
const DEFAULT_ALREADY_WORDS = ['已领取', '今日已领', '已签到', '明日再来', '已打卡'];
const DEFAULT_SUCCESS_WORDS = ['领取成功', '签到成功', '领取完成', '已到账'];

/**
 * 自动模式执行：打开目标页 → 语义找按钮 → 点击 → 验证。
 * 任一步不成立都返回可降级的状态（needs-human），由调度器转成提醒。
 */
export async function executeAuto(task: import('./types').Task): Promise<RunOutcome> {
  const words = task.autoHints?.buttonWords?.length
    ? task.autoHints.buttonWords
    : DEFAULT_AUTO_WORDS;
  const alreadyWords = task.recipe?.alreadySignals?.length
    ? task.recipe.alreadySignals
    : DEFAULT_ALREADY_WORDS;
  const successWords = task.recipe?.successSignals?.length
    ? task.recipe.successSignals
    : DEFAULT_SUCCESS_WORDS;

  const site = task.site || (() => {
    try { return new URL(task.url).hostname; } catch { return task.url; }
  })();

  return withTab(task.url, site, async (tabId) => {
    try {
      const probeRes = await chrome.scripting.executeScript({
        target: { tabId },
        func: findSemanticButton,
        args: [words, alreadyWords],
      });
      const probe = probeRes?.[0]?.result as FindResult | undefined;
      if (!probe) return { status: 'error', message: '没有拿到页面探测结果' };

      if (probe.already) {
        return { status: 'already', message: '页面显示今天已领取' };
      }
      if (!probe.found) {
        return {
          status: 'needs-human',
          message: probe.needLogin
            ? '需要先登录，自动领取失败，已转为提醒'
            : '页面上没找到领取按钮，可能活动结束或页面变了，已转为提醒',
        };
      }

      const clicked = await chrome.scripting.executeScript({
        target: { tabId },
        func: clickSemanticButton,
        args: [words],
      });
      if (!clicked?.[0]?.result) {
        return { status: 'needs-human', message: `找到了「${probe.label}」但点击失败，已转为提醒` };
      }

      await delay(1800);

      const verifyRes = await chrome.scripting.executeScript({
        target: { tabId },
        func: verifySemantic,
        args: [successWords],
      });
      const verified = verifyRes?.[0]?.result as { success: boolean; text: string } | undefined;
      if (verified?.success) {
        return { status: 'ok', message: `已自动点击「${probe.label}」并确认领取成功` };
      }
      return {
        status: 'needs-human',
        message: `已点击「${probe.label}」但没能确认结果（可能要验证码或二次确认），已转为提醒`,
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : '自动执行失败',
      };
    }
  });
}

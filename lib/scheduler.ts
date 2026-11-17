import { executeAuto } from './executor';
import { notify } from './notifications';
import {
  addDays,
  dayKey,
  getSettings,
  getTasks,
  nextDailyAt,
  saveTask,
} from './storage';
import type { RunOutcome, RunRecord, Task } from './types';

const ALARM_NAME = 'cm-tick';
const HISTORY_LIMIT = 90;

let running = false;

/**
 * 每次 Service Worker 启动都检查一次。MV3 的 alarm 不保证跨会话保留，
 * 所以只在不存在时创建，避免重置周期导致永远不触发。
 */
export async function scheduleAlarms(): Promise<void> {
  try {
    const existing = await chrome.alarms.get(ALARM_NAME);
    if (!existing) {
      chrome.alarms.create(ALARM_NAME, { delayInMinutes: 1, periodInMinutes: 15 });
    }
  } catch (error) {
    console.warn('[CapMind] alarm 检查失败', error);
  }
}

/** 今天是否已经完成（手动标记或自动成功都算）。 */
export function isDoneToday(task: Task, now: number = Date.now()): boolean {
  if (task.lastDoneAt && dayKey(task.lastDoneAt) === dayKey(now)) return true;
  if (task.doneByDay && task.doneByDay[dayKey(now)]) return true;
  return false;
}

/** 记录「今天已完成」。source 区分手动/自动，日历要用。 */
export async function markDone(id: string, source: 'manual' | 'auto'): Promise<void> {
  const tasks = await getTasks();
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  const now = Date.now();
  const key = dayKey(now);
  const settings = await getSettings();

  await saveTask({
    ...task,
    lastDoneAt: now,
    lastDoneBy: source,
    doneByDay: { ...(task.doneByDay ?? {}), [key]: source },
    lastStatus: 'ok',
    // 今天既然完成了，把下次执行推到明天。
    nextRunAt: nextDailyAt(settings.checkinTime, settings.jitterMin, now),
    history: [
      {
        at: now,
        status: 'ok' as const,
        message: source === 'manual' ? '你标记了今天已完成' : '自动领取成功',
      },
      ...task.history,
    ].slice(0, HISTORY_LIMIT),
  });
}

/** 撤销「今天已完成」，用于误点。 */
export async function clearDone(id: string): Promise<void> {
  const tasks = await getTasks();
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  const now = Date.now();
  const key = dayKey(now);
  const next: Record<string, 'manual' | 'auto'> = { ...(task.doneByDay ?? {}) };
  delete next[key];

  const settings = await getSettings();
  // 撤销后这一天应重新变回「待办」。如果今天的提醒时间还没过，就安排在今天；
  // 已经过了则安排到明天，避免撤销后立刻又被提醒一次打扰。
  const candidate = nextDailyAt(settings.checkinTime, settings.jitterMin, now);
  const sameDayTarget = (() => {
    const [h, m] = settings.checkinTime.split(':').map((v) => Number.parseInt(v, 10));
    const d = new Date(now);
    d.setHours(Number.isFinite(h) ? h : 9, Number.isFinite(m) ? m : 30, 0, 0);
    return d.getTime();
  })();
  const nextRunAt = sameDayTarget > now ? sameDayTarget : candidate;

  await saveTask({
    ...task,
    lastDoneAt: undefined,
    lastDoneBy: undefined,
    doneByDay: next,
    lastStatus: undefined,
    nextRunAt,
    history: [
      { at: now, status: 'ok' as const, message: '撤销了今天的完成标记' },
      ...task.history,
    ].slice(0, 90),
  });
}

/** 提醒模式：只发通知，不尝试点击。通知里带「打开去领」的入口语义。 */
async function remind(task: Task, now: number): Promise<void> {
  await notify(
    `${task.title} · 该去领了`,
    '点开会打开页面，领完记得在 CapMind 里标记「今天已完成」。',
    `cm-remind-${task.id}-${dayKey(now)}`,
  );
}

/**
 * 自动模式：尝试自动点击。成功记完成；
 * 找不到 / 要登录 / 点了没效果 → 降级为提醒（不弹红色错误，不惊扰）。
 */
async function autoRun(task: Task, now: number): Promise<void> {
  let outcome: RunOutcome;
  try {
    outcome = await executeAuto(task);
  } catch (error) {
    outcome = { status: 'error', message: error instanceof Error ? error.message : '自动执行异常' };
  }

  const entry: RunRecord = {
    at: now,
    status: outcome.status,
    message: outcome.message,
    evidence: outcome.evidence,
  };

  if (outcome.status === 'ok' || outcome.status === 'already') {
    const key = dayKey(now);
    await saveTask({
      ...task,
      lastRunAt: now,
      lastStatus: outcome.status,
      lastDoneAt: now,
      lastDoneBy: 'auto',
      doneByDay: { ...(task.doneByDay ?? {}), [key]: 'auto' },
      nextRunAt: nextDailyAt(
        (await getSettings()).checkinTime,
        (await getSettings()).jitterMin,
        now,
      ),
      history: [entry, ...task.history].slice(0, HISTORY_LIMIT),
    });
    return;
  }

  // 失败：记录一次，然后降级成提醒。
  await saveTask({
    ...task,
    lastRunAt: now,
    lastStatus: outcome.status,
    nextRunAt: nextDailyAt(
      (await getSettings()).checkinTime,
      (await getSettings()).jitterMin,
      now,
    ),
    history: [entry, ...task.history].slice(0, HISTORY_LIMIT),
  });
  await notify(
    `${task.title} · 自动领取没成功`,
    `${outcome.message}。点开会打开页面，你可以手动完成。`,
    `cm-auto-fail-${task.id}-${dayKey(now)}`,
  );
}

/** 追踪的阶段节点到点提醒。同一个节点每天最多提醒一次，靠 stepNotifiedDay 去重。 */
async function remindSteps(task: Task, now: number): Promise<Task> {
  const steps = task.milestones ?? [];
  const due = steps.find((m) => !m.done && !!m.dueAt && m.dueAt <= now);
  if (!due) return task;

  const today = dayKey(now);
  const notified = task.stepNotifiedDay ?? {};
  if (notified[due.id] === today) return task;

  const message = due.hint
    ? `${due.hint}`
    : '这一步到时间了，做完记得在追踪里勾掉。';
  await notify(
    `${task.title} · 该做「${due.title}」`,
    message,
    `cm-step-${task.id}-${due.id}-${today}`,
  );
  const updated: Task = {
    ...task,
    stepNotifiedDay: { ...notified, [due.id]: today },
    history: [
      { at: now, status: 'needs-human' as const, message: `提醒了阶段「${due.title}」` },
      ...task.history,
    ].slice(0, HISTORY_LIMIT),
  };
  await saveTask(updated);
  return updated;
}

async function reviewMilestone(task: Task, reviewEveryDays: number, now: number): Promise<Task> {
  const days = task.startedAt ? Math.floor((now - task.startedAt) / 86_400_000) : 0;
  const done = task.milestones?.filter((m) => m.done).length ?? 0;
  const total = task.milestones?.length ?? 0;
  const message = `已过 ${days} 天，完成 ${done}/${total} 个里程碑。点开事项推进或延期。`;

  await notify(`${task.title} · 该看看进度了`, message, `cm-review-${task.id}-${dayKey(now)}`);
  const entry: RunRecord = { at: now, status: 'ok', message: `回访提醒已发送：${message}` };
  const updated: Task = {
    ...task,
    nextReviewAt: addDays(now, reviewEveryDays),
    history: [entry, ...task.history].slice(0, HISTORY_LIMIT),
  };
  await saveTask(updated);
  return updated;
}

/** 由 alarm 与 SW 启动共同触发：到点提醒/自动执行、补发到期回访。 */
export async function tick(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const [tasks, settings] = await Promise.all([getTasks(), getSettings()]);
    const now = Date.now();

    for (const task of tasks) {
      if (!task.enabled || task.archivedAt) continue;
      // 杂项没有时间属性，永远不进提醒队列。
      if (task.type === 'clip') continue;

      if (task.type === 'checkin') {
        // 今天已完成（手动或自动）就不再打扰；顺手把下次时间推到明天。
        if (isDoneToday(task, now)) {
          if (!task.nextRunAt || task.nextRunAt <= now) {
            await saveTask({
              ...task,
              nextRunAt: nextDailyAt(settings.checkinTime, settings.jitterMin, now),
            });
          }
          continue;
        }
        if (!task.nextRunAt) {
          await saveTask({
            ...task,
            nextRunAt: nextDailyAt(settings.checkinTime, settings.jitterMin, now),
          });
          continue;
        }
        if (task.nextRunAt > now) continue;

        if (task.mode === 'auto') {
          await autoRun(task, now);
        } else {
          await remind(task, now);
          // 提醒发出后也把下次推到明天，避免同一天反复提醒。
          await saveTask({
            ...task,
            lastStatus: 'needs-human',
            nextRunAt: nextDailyAt(settings.checkinTime, settings.jitterMin, now),
          });
        }
      } else if (task.type === 'milestone') {
        // 两个动作都会存档，必须用上一步的返回值串联，否则后写的会覆盖先写的。
        let current = await remindSteps(task, now);
        if (!current.nextReviewAt || current.nextReviewAt <= now) {
          current = await reviewMilestone(current, settings.reviewEveryDays, now);
        }
      }
    }
  } catch (error) {
    console.error('[CapMind] tick 失败', error);
  } finally {
    running = false;
  }
}

/** 「立即签到」：手动触发一次。自动模式走自动点击，提醒模式只打开页面。 */
export async function runTaskNow(id: string): Promise<{ ok: boolean; message: string }> {
  const tasks = await getTasks();
  const task = tasks.find((t) => t.id === id);
  if (!task) return { ok: false, message: '事项不存在' };
  if (task.type !== 'checkin') return { ok: false, message: '这个事项不是每日任务' };

  if (task.mode === 'auto') {
    const before = Date.now();
    await autoRun(task, before);
    const after = (await getTasks()).find((t) => t.id === id);
    return {
      ok: isDoneToday(after ?? task),
      message: after?.history[0]?.message ?? '已执行',
    };
  }

  // 提醒模式：打开页面，由用户完成。
  try {
    await chrome.tabs.create({ url: task.url, active: true });
  } catch {
    return { ok: false, message: '打开页面失败' };
  }
  return { ok: true, message: '已打开页面，领完记得标记「今天已完成」' };
}

export { ALARM_NAME };

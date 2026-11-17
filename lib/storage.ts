import type { AppSettings, Task } from './types';

const TASKS_KEY = 'cm_tasks';
const SETTINGS_KEY = 'cm_settings';
const HISTORY_LIMIT = 90;

export const DEFAULT_SETTINGS: AppSettings = {
  checkinTime: '09:30',
  jitterMin: 30,
  reviewEveryDays: 7,
  notifyEnabled: true,
  aiEnabled: false,
  aiEndpoint: 'https://api.openai.com/v1',
  aiModel: 'gpt-4o-mini',
  aiKey: '',
};

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 把存储里的原始记录补齐成完整 Task。旧数据没有 tags/excerpt，这里一次补齐，不清库。 */
function normalize(raw: Task): Task {
  return {
    ...raw,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    excerpt: raw.excerpt ?? '',
  };
}

export async function getTasks(): Promise<Task[]> {
  const result = await chrome.storage.local.get(TASKS_KEY);
  const tasks = result[TASKS_KEY];
  return Array.isArray(tasks) ? (tasks as Task[]).map(normalize) : [];
}

/** 三个归档桶。内部 type 沿用旧值，避免调度器和执行器大改。 */
export function kindOf(task: Task): 'todo' | 'project' | 'clip' {
  if (task.type === 'clip') return 'clip';
  if (task.type === 'milestone') return 'project';
  return 'todo';
}

export async function saveTask(task: Task): Promise<void> {
  const tasks = await getTasks();
  const index = tasks.findIndex((t) => t.id === task.id);
  const trimmed: Task = {
    ...task,
    history: task.history.slice(0, HISTORY_LIMIT),
  };
  if (index >= 0) tasks[index] = trimmed;
  else tasks.unshift(trimmed);
  await chrome.storage.local.set({ [TASKS_KEY]: tasks });
}

export async function deleteTask(id: string): Promise<void> {
  const tasks = await getTasks();
  await chrome.storage.local.set({ [TASKS_KEY]: tasks.filter((t) => t.id !== id) });
}

export async function getTask(id: string): Promise<Task | undefined> {
  return (await getTasks()).find((t) => t.id === id);
}

export async function getSettings(): Promise<AppSettings> {
  try {
    const result = await chrome.storage.sync.get(SETTINGS_KEY);
    return { ...DEFAULT_SETTINGS, ...(result[SETTINGS_KEY] as Partial<AppSettings> | undefined) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const next = { ...(await getSettings()), ...patch };
  await chrome.storage.sync.set({ [SETTINGS_KEY]: next });
  return next;
}

/** 本地日期键，用于「今天是否已执行」的幂等判断。 */
export function dayKey(ts: number = Date.now()): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 计算下一次每日执行时间：目标时刻 + 随机抖动；已过则顺延到明天。 */
export function nextDailyAt(time: string, jitterMin: number, from: number = Date.now()): number {
  const [h, m] = time.split(':').map((v) => Number.parseInt(v, 10));
  const hour = Number.isFinite(h) ? Math.min(23, Math.max(0, h)) : 9;
  const minute = Number.isFinite(m) ? Math.min(59, Math.max(0, m)) : 30;
  const base = new Date(from);
  base.setHours(hour, minute, 0, 0);
  const jitter = Math.floor(Math.random() * Math.max(0, jitterMin)) * 60_000;
  let target = base.getTime() + jitter;
  if (target <= from) target += 24 * 60 * 60_000;
  return target;
}

export function addDays(from: number, days: number): number {
  return from + days * 24 * 60 * 60_000;
}

export function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatShortTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

import type { AppSettings, Task } from './types';

/**
 * 全量备份 / 恢复。
 *
 * 为什么需要它：数据存在 Chrome 的用户数据目录里，按扩展 ID 隔离。
 * 「移除扩展」会清空该 ID 的 storage.local（任务、追踪、杂项全没）；
 * unpacked 加载时 ID 又由文件夹路径决定，换路径等于换 ID。
 * 唯一用户可控的保险就是导出成文件。
 */

const BACKUP_VERSION = 1;

export interface BackupFile {
  app: 'capmind';
  version: number;
  exportedAt: number;
  tasks: Task[];
  settings?: AppSettings;
}

/** 从两个存储区收集全部用户数据。 */
export async function buildBackup(): Promise<BackupFile> {
  const local = await chrome.storage.local.get(['cm_tasks']);
  let settings: AppSettings | undefined;
  try {
    const sync = await chrome.storage.sync.get(['cm_settings']);
    settings = sync.cm_settings as AppSettings | undefined;
  } catch {
    // 未登录等情况下 sync 不可读：备份里就不带设置，任务照常导出。
  }
  return {
    app: 'capmind',
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    tasks: Array.isArray(local.cm_tasks) ? (local.cm_tasks as Task[]) : [],
    settings,
  };
}

/** 解析并校验备份文件。抛出的错误信息直接给用户看。 */
export function parseBackup(text: string): BackupFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('不是有效的 JSON 文件');
  }
  const b = raw as Partial<BackupFile>;
  if (!b || b.app !== 'capmind' || !Array.isArray(b.tasks)) {
    throw new Error('不像 CapMind 的备份文件（缺 tasks 或标识字段），没有导入任何东西');
  }
  return {
    app: 'capmind',
    version: typeof b.version === 'number' ? b.version : 1,
    exportedAt: typeof b.exportedAt === 'number' ? b.exportedAt : 0,
    tasks: b.tasks as Task[],
    settings: b.settings && typeof b.settings === 'object' ? b.settings : undefined,
  };
}

/** 恢复：整体覆盖当前任务与设置。调用前应由用户确认过。 */
export async function applyBackup(backup: BackupFile): Promise<void> {
  await chrome.storage.local.set({ cm_tasks: backup.tasks });
  if (backup.settings) {
    await chrome.storage.sync.set({ cm_settings: backup.settings });
  }
}

/** 备份文件名：capmind-backup-2026-11-15.json */
export function backupFileName(): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const d = new Date();
  return `capmind-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
}

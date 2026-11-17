import type { RunStatus } from './types';
import { getSettings } from './storage';

/** 只在需人工、执行出错、回访日三种时机调用。成功与「已领过」静默。 */
export async function notify(title: string, message: string, tag?: string): Promise<void> {
  const settings = await getSettings();
  if (!settings.notifyEnabled) return;
  try {
    await chrome.notifications.create(tag ?? `cm-${Date.now()}`, {
      type: 'basic',
      iconUrl: 'icons/48.png',
      title,
      message,
      priority: 1,
    });
  } catch (error) {
    console.warn('[CapMind] 通知发送失败', error);
  }
}

export function needsAttention(status: RunStatus): boolean {
  return status === 'needs-human' || status === 'error';
}

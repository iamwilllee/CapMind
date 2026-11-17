/**
 * AI 请求诊断日志。
 * 目标是「出错时不用猜」：把请求体、HTTP 状态、响应头、响应正文都留下来，
 * 面板里能直接看，复制给开发者就能定位。
 *
 * 只保留最近若干条，且脱敏 Authorization，避免把 Key 写进日志。
 */

export interface AiCallLog {
  id: string;
  at: number;
  /** 用途：识别 / 测试连接 */
  purpose: 'recognize' | 'test';
  endpoint: string;
  model: string;
  /** HTTP 状态码，未收到响应时为 null */
  status: number | null;
  ok: boolean;
  /** 耗时毫秒 */
  durationMs: number;
  /** 响应正文前若干字符（成功或失败都留） */
  responseBody?: string;
  /** 关键响应头 */
  headers?: Record<string, string>;
  /** 网络层错误信息 */
  error?: string;
  /** 请求体摘要（已脱敏，不含 Key） */
  requestSummary?: string;
}

const MAX_LOGS = 10;

function maskKey(text: string): string {
  return text.replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, 'Bearer ***');
}

function pickHeaders(headers: Headers): Record<string, string> {
  const wanted = ['content-type', 'x-request-id', 'retry-after', 'cf-ray', 'server', 'date'];
  const out: Record<string, string> = {};
  for (const key of wanted) {
    const value = headers.get(key);
    if (value) out[key] = value;
  }
  return out;
}

export async function appendAiLog(log: AiCallLog): Promise<void> {
  try {
    const stored = await chrome.storage.local.get('cm_ai_logs');
    const list = Array.isArray(stored.cm_ai_logs) ? (stored.cm_ai_logs as AiCallLog[]) : [];
    const next = [{ ...log, responseBody: log.responseBody ? maskKey(log.responseBody) : undefined }, ...list].slice(
      0,
      MAX_LOGS,
    );
    await chrome.storage.local.set({ cm_ai_logs: next });
  } catch (error) {
    console.warn('[CapMind] 写 AI 日志失败', error);
  }
}

export async function getAiLogs(): Promise<AiCallLog[]> {
  try {
    const stored = await chrome.storage.local.get('cm_ai_logs');
    return Array.isArray(stored.cm_ai_logs) ? (stored.cm_ai_logs as AiCallLog[]) : [];
  } catch {
    return [];
  }
}

export async function clearAiLogs(): Promise<void> {
  await chrome.storage.local.set({ cm_ai_logs: [] });
}

/** 统一发一次 chat/completions 请求，并把完整诊断写入日志。 */
export interface RetryInfo {
  /** 第几次重试（从 1 开始） */
  attempt: number;
  /** 总共最多重试几次 */
  maxRetry: number;
  /** 本次等待秒数 */
  waitSec: number;
  /** 触发重试的 HTTP 状态 */
  status: number;
}

export async function callChatCompletion(opts: {
  purpose: AiCallLog['purpose'];
  endpoint: string;
  model: string;
  apiKey: string;
  body: Record<string, unknown>;
  /** 进入「等待重试」时回调，让界面能显示倒计时。 */
  onRetry?: (info: RetryInfo) => void;
}): Promise<{ ok: boolean; status: number | null; text: string; log: AiCallLog }> {
  const url = `${opts.endpoint.replace(/\/$/, '')}/chat/completions`;
  const startedAt = Date.now();
  const id = `${startedAt}-${Math.random().toString(36).slice(2, 6)}`;

  const baseLog: Omit<AiCallLog, 'status' | 'ok' | 'durationMs' | 'responseBody' | 'headers' | 'error'> = {
    id,
    at: startedAt,
    purpose: opts.purpose,
    endpoint: url,
    model: opts.model,
    requestSummary: JSON.stringify({
      ...opts.body,
      // 请求体里没有 Key，但把 messages 长度收一下，避免日志过大
      messages: Array.isArray((opts.body as { messages?: unknown[] }).messages)
        ? `[${((opts.body as { messages?: unknown[] }).messages as unknown[]).length} messages]`
        : undefined,
    }).slice(0, 600),
  };

  try {
    // 503 / 429 是免费额度服务的常态（限流或上游过载）。
    // 服务端通常会带 retry-after，按它等一下再试，最多重试 2 次。
    const MAX_RETRY = 2;
    let response: Response | null = null;
    let text = '';
    let attempt = 0;

    for (attempt = 0; attempt <= MAX_RETRY; attempt += 1) {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${opts.apiKey}` },
        body: JSON.stringify(opts.body),
      });
      text = await response.text();

      const retryable = response.status === 503 || response.status === 429;
      if (response.ok || !retryable || attempt === MAX_RETRY) break;

      // 优先听服务端的 retry-after（秒），默认退避 3s → 6s。
      const retryAfter = Number.parseInt(response.headers.get('retry-after') ?? '', 10);
      const waitSec = Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter, 30)
        : 3 * (attempt + 1);
      // 通知界面：正在等待重试，显示倒计时。
      opts.onRetry?.({ attempt: attempt + 1, maxRetry: MAX_RETRY, waitSec, status: response.status });
      await new Promise((resolve) => setTimeout(resolve, waitSec * 1000));
    }

    const finalResponse = response as Response;
    const log: AiCallLog = {
      ...baseLog,
      status: finalResponse.status,
      ok: finalResponse.ok,
      durationMs: Date.now() - startedAt,
      responseBody: text.slice(0, 1200),
      headers: pickHeaders(finalResponse.headers),
      requestSummary: `${baseLog.requestSummary ?? ''}${attempt > 0 ? ` | 已重试 ${attempt} 次` : ''}`,
    };
    await appendAiLog(log);
    return { ok: finalResponse.ok, status: finalResponse.status, text, log };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const log: AiCallLog = {
      ...baseLog,
      status: null,
      ok: false,
      durationMs: Date.now() - startedAt,
      error: message,
    };
    await appendAiLog(log);
    return { ok: false, status: null, text: '', log };
  }
}

import type {
  AppSettings,
  CheckinRecipe,
  RecognizeResult,
  SelectionPayload,
  TextHintSource,
} from './types';
import { callChatCompletion } from './aiLog';

const BUTTON_HINTS = ['签到', '领取', '领额度', '打卡', '领取额度', 'check-in', 'checkin', 'claim', 'daily'];
const ALREADY_DEFAULTS = ['已领取', '今日已领', '已签到', '明日再来', '明天再来', '已打卡'];
// 判据必须足够具体：像 '+' 这种会命中页面上任何「+100」「+1」，
// 真实站点上几乎必然误判成功，所以不放。
const SUCCESS_DEFAULTS = ['领取成功', '签到成功', '领取完成', '领取额度成功', '已到账'];
const FIELD_HINTS = ['额度', '积分', 'credits', 'token', '¥', '天数', '刷新', '连续'];

/** 出现这些词多半是有周期、分阶段的「追踪」，而不是每天点一次的待办。 */
const PROJECT_HINTS = [
  '备案',
  '申请',
  '报名',
  '审批',
  '审核',
  '办理',
  '截止',
  '工作日',
  '周期',
  '提交材料',
  '资质',
];

/** 出现这些词说明是每天要重复做的动作。 */
const DAILY_HINTS = ['每天', '每日', '签到', '打卡', '领取', '登录送', 'daily'];

/**
 * 不联网时也能把内容落到正确的桶里。规则简单、宁可保守：
 * 有周期/审批类词 → 追踪；有每日动作词或按钮 → 待办；都不像 → 杂项。
 */
export function guessKind(payload: SelectionPayload): 'todo' | 'project' | 'clip' {
  const allText = [payload.heading ?? '', ...payload.texts].join(' ').slice(0, 2000);
  const hasButton = payload.buttons.some((b) => (b.text ?? '').trim().length > 0);
  if (PROJECT_HINTS.some((k) => allText.includes(k))) return 'project';
  if (DAILY_HINTS.some((k) => allText.includes(k)) || hasButton) return 'todo';
  return 'clip';
}

/** 从圈选文字里抓几个能当标签的词（只在本地识别时用，AI 会给更准的）。 */
export function guessTags(payload: SelectionPayload): string[] {
  const hashtags = payload.texts
    .join(' ')
    .match(/#[^\s#]{2,12}/g)
    ?.map((t) => t.replace(/^#/, ''))
    .slice(0, 4);
  const site = payload.site.split('.')[0];
  return Array.from(new Set([...(hashtags ?? []), ...(site ? [site] : [])])).slice(0, 4);
}

function uniq(list: string[]): string[] {
  return Array.from(new Set(list.map((s) => s.trim()).filter(Boolean)));
}

type ButtonCandidate = SelectionPayload['buttons'][number];

/**
 * 挑签到按钮。图片按钮的 text 可能来自 alt 或文件名，也可能是空串
 * （纯 sprite / canvas），所以不能再把空文案的候选直接丢掉——
 * 只要 selector 可用就留着，只是排序靠后、且不做文案校验。
 */
function pickButton(payload: SelectionPayload): ButtonCandidate | undefined {
  const scored = payload.buttons
    .filter((b) => b.selector && b.selector.length > 0)
    .map((b) => {
      const text = (b.text ?? '').trim();
      const lower = text.toLowerCase();
      const hintScore = BUTTON_HINTS.reduce(
        (n, h) => (lower.includes(h.toLowerCase()) ? n + 1 : n),
        0,
      );
      // 文案过长不像按钮（多半是整块容器的文本）；空文案不扣分，只是没加分。
      const lengthPenalty = text.length > 40 ? 2 : 0;
      // 有文案可校验的优先：执行阶段能做「点错保护」。
      const verifiable = text ? 1 : 0;
      return { b, score: hintScore * 2 + verifiable - lengthPenalty };
    })
    .sort((a, b) => b.score - a.score);
  return scored.length ? scored[0].b : undefined;
}

/** 不需要任何模型或网络的识别：从圈选出的 DOM 摘要里推断一份可编辑配方。 */
export function recognizeLocally(payload: SelectionPayload): RecognizeResult {
  const warnings: string[] = [];
  const button = pickButton(payload);
  const allText = payload.texts.join(' ');

  const alreadyFromPage = payload.texts.filter((t) =>
    ['已领', '已签', '明日再来', '明天再来', '今日已', '已打卡'].some((k) => t.includes(k)),
  );
  const successFromPage = payload.texts.filter((t) =>
    ['成功', '领取完成', '已到账'].some((k) => t.includes(k)),
  );
  const fields = payload.texts
    .filter((t) => FIELD_HINTS.some((k) => t.toLowerCase().includes(k.toLowerCase())))
    .slice(0, 4)
    .map((value, i) => ({ label: `字段 ${i + 1}`, value: value.slice(0, 40) }));

  if (!button) {
    warnings.push('圈选区域里没找到按钮，请手动填写选择器。');
  } else if (!(button.text ?? '').trim()) {
    warnings.push(
      '按钮是图片或画布，没拿到可校验的文案：执行时只校验元素存在，不校验文案。建议试跑确认。',
    );
  }
  if (alreadyFromPage.length === 0) warnings.push('没识别到「已领取」判据，已填入通用值，建议试跑确认。');
  if (fields.length === 0) warnings.push('没识别到可展示的额度字段，看板将只显示执行状态。');

  const textHintSource: TextHintSource =
    button?.textHintSource ?? ((button?.text ?? '').trim() ? 'text' : 'none');

  const confidence = Math.min(
    0.95,
    0.35 + (button ? 0.3 : 0) + (alreadyFromPage.length ? 0.2 : 0) + (fields.length ? 0.1 : 0),
  );

  const recipe: CheckinRecipe = {
    version: 1,
    site: payload.site,
    urlPattern: payload.url,
    action: {
      kind: 'click',
      selector: button?.selector ?? '',
      textHint: button?.text ?? '',
      textHintSource,
    },
    alreadySignals: uniq([...alreadyFromPage, ...ALREADY_DEFAULTS]).slice(0, 8),
    successSignals: uniq([...successFromPage, ...SUCCESS_DEFAULTS]).slice(0, 8),
    displayFields: fields,
    generatedBy: 'heuristic',
    confidence,
  };

  // 页面正文里出现登录相关词时，明确提醒用户这项需要登录态。
  if (allText.includes('登录') || allText.includes('登陆')) {
    warnings.push('页面出现登录字样，执行前请确认该站点已登录。');
  }

  return {
    recipe,
    warnings,
    // 本地识别也给一份粗判，用户至少不用从头选桶。
    analysis: {
      kind: guessKind(payload),
      taskTitle: payload.heading?.trim() || undefined,
      tags: guessTags(payload),
      reason: '本地启发式判定，可自行改到别的分类',
    },
  };
}

interface AiRecipeShape {
  selector?: string;
  textHint?: string;
  alreadySignals?: string[];
  successSignals?: string[];
  displayFields?: { label: string; value: string }[];
  /** 意图分析结果 */
  kind?: 'todo' | 'project' | 'clip';   // 归到哪个桶
  taskTitle?: string;   // 这项任务叫什么（用圈选块里的标题，不是网页标题）
  targetUrl?: string;   // 真正要去领的地址（可能是「去领」按钮的 href）
  cadence?: string;     // daily / weekly / once
  summary?: string;     // 一句话说明这是什么任务
  buttonWords?: string[];
  /** 追踪专用 */
  expectedDays?: number;                                  // 预计耗时
  deadlineDays?: number;                                  // 从今天算起第几天截止
  steps?: { title: string; dueOffsetDays?: number; hint?: string }[];
  /** 杂项专用 */
  tags?: string[];
  reason?: string;      // 判定理由
}


/** 可选：用户自己配置的模型端点，做意图分析（判断任务类型 / 标题 / 真实领取地址）。 */
export async function recognizeWithAI(
  payload: SelectionPayload,
  settings: AppSettings,
  onRetry?: (info: { attempt: number; maxRetry: number; waitSec: number; status: number }) => void,
): Promise<RecognizeResult> {
  if (!settings.aiKey) throw new Error('未配置模型 API Key');

  const systemPrompt = [
    '你在帮一个浏览器收集助手理解用户圈选的网页区域。用户会把圈到的东西归到三个桶之一：',
    '待办（每天/每周要做的动作）、追踪（有周期、分阶段的长期事）、杂项（没有时间属性的资料）。',
    '',
    '只返回 JSON，字段：',
    '- kind: "todo" | "project" | "clip"，判定规则：',
    '    todo    一次性动作、可每天重复（领额度、签到、打卡、交周报）→ 必须给 targetUrl',
    '    project 有周期/多阶段/要走审批（ICP 备案、资质申请、报名、考试）→ 必须给 deadlineDays 和 steps',
    '    clip    没有时间属性（链接、段落、想法、参考资料）→ 给 excerpt 和 tags',
    '  拿不准就落 clip，宁可少归档不要乱归档。',
    '- taskTitle: 这项任务/这份资料的名字（用圈选区域里的标题文字，不要用网页标题）',
    '- targetUrl: 用户真正该打开的地址。如果圈选的「去领」按钮是链接（buttons[].href 有值），用它；',
    '  如果按钮是页内动作，才用 url。project/clip 可以省略。',
    '- cadence: "daily" | "weekly" | "once"，从文案判断（「每天」「每日」= daily）',
    '- summary: 一句话说明这是什么，帮用户确认',
    '- alreadySignals / successSignals: 表示「今日已领」「领取成功」的文案数组（todo 才需要）',
    '- buttonWords: 按钮上可能出现的词数组（如「去领」「立即领取」），用于以后自动领取时查找',
    '- selector: 若能确定领取按钮的 CSS 选择器就给出，否则留空',
    '- expectedDays: 这类事大概要多少天办完（project 必填，整数）',
    '- deadlineDays: 从今天算起第几天是截止日（project 尽量给，整数）',
    '- steps: project 必填，把整个过程拆成可勾选的阶段节点，每条 { title, dueOffsetDays, hint }：',
    '    title 短到能当一行清单（如「提交主体材料」「等接入商初审」「准备补正材料」）；',
    '    dueOffsetDays 是从今天算起第几天该做这件事；hint 一句话说明要注意什么。',
    '    节点要贴合这类事的真实流程，不要只写「开始」「结束」。',
    '- tags: 3 个以内关键词，用于以后检索（clip 必填，其他可选）',
    '- reason: 一句话说明你为什么归到这个桶',
    '',
    '重要：不要编造页面里不存在的文字。如果 buttons[].href 指向了别的域名，那才是 targetUrl，',
    '当前页 url 只是聚合页，不是真正的地址。',
  ].join('\n');

  const userPayload = {
    currentUrl: payload.url,
    pageTitle: payload.title,
    blockHeading: payload.heading,     // 圈选块里的标题
    blockTexts: payload.texts.slice(0, 40),
    buttons: payload.buttons,          // 含 text 与 href
    domSummary: payload.domSummary.slice(0, 3000),
  };

  const call = await callChatCompletion({
    purpose: 'recognize',
    endpoint: settings.aiEndpoint,
    model: settings.aiModel,
    apiKey: settings.aiKey,
    body: {
      model: settings.aiModel,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(userPayload) },
      ],
    },
    onRetry,
  });

  if (!call.ok) {
    const snippet = call.text ? call.text.slice(0, 200).replace(/\s+/g, ' ') : call.log.error ?? '';
    if (call.status === 503 || call.status === 429) {
      throw new Error(
        `模型服务暂时过载（HTTP ${call.status}），已自动重试仍未成功。稍等 10 秒再圈选一次，或换个模型试试。`,
      );
    }
    throw new Error(`HTTP ${call.status ?? '无响应'}｜${snippet || '服务端未返回内容'}`);
  }

  let data: { choices?: { message?: { content?: string } }[] };
  try {
    data = JSON.parse(call.text);
  } catch {
    throw new Error(`返回不是合法 JSON：${call.text.slice(0, 160)}`);
  }
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error(`返回里没有 choices[0].message.content：${call.text.slice(0, 160)}`);
  }

  const parsed = JSON.parse(content) as AiRecipeShape;
  const fallback = recognizeLocally(payload);

  const recipe: CheckinRecipe = {
    ...fallback.recipe,
    action: {
      kind: 'click',
      selector: parsed.selector ?? fallback.recipe.action.selector,
      textHint: (parsed.textHint ?? '').trim() || fallback.recipe.action.textHint,
      textHintSource: (parsed.textHint ?? '').trim() ? 'text' : (fallback.recipe.action.textHintSource ?? 'none'),
    },
    alreadySignals: uniq([...(parsed.alreadySignals ?? []), ...ALREADY_DEFAULTS]).slice(0, 8),
    successSignals: uniq([...(parsed.successSignals ?? []), ...SUCCESS_DEFAULTS]).slice(0, 8),
    displayFields: parsed.displayFields?.slice(0, 4) ?? fallback.recipe.displayFields,
    generatedBy: 'ai',
    confidence: 0.9,
  };

  return {
    recipe,
    warnings: ['AI 已分析意图，请确认「名称」和「打开地址」是否正确，再试跑。'],
    analysis: {
      kind: parsed.kind === 'todo' || parsed.kind === 'project' || parsed.kind === 'clip'
        ? parsed.kind
        : guessKind(payload),
      taskTitle: parsed.taskTitle?.trim(),
      targetUrl: parsed.targetUrl?.trim(),
      cadence: parsed.cadence,
      summary: parsed.summary?.trim(),
      buttonWords: Array.isArray(parsed.buttonWords) ? parsed.buttonWords.filter(Boolean) : undefined,
      expectedDays: toPositiveInt(parsed.expectedDays),
      deadlineDays: toPositiveInt(parsed.deadlineDays),
      steps: Array.isArray(parsed.steps)
        ? parsed.steps
            .filter((s) => !!s?.title?.trim())
            .slice(0, 12)
            .map((s) => ({
              title: s.title.trim().slice(0, 40),
              dueOffsetDays: toPositiveInt(s.dueOffsetDays),
              hint: s.hint?.trim().slice(0, 60) || undefined,
            }))
        : undefined,
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.filter((t) => typeof t === 'string' && t.trim()).map((t) => t.trim().slice(0, 12)).slice(0, 6)
        : guessTags(payload),
      reason: parsed.reason?.trim().slice(0, 120),
    },
  };
}

/** AI 偶尔返回字符串或 0，统一成「正整数或 undefined」。 */
function toPositiveInt(value: unknown): number | undefined {
  const n = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
}

/**
 * 连通性自检：发一次最小请求，让用户配完不用猜。
 * 返回模型实际回的内容（或错误信息），设置页直接展示。
 */
export async function testAIConnection(settings: AppSettings): Promise<{ ok: boolean; message: string }> {
  if (!settings.aiEndpoint) return { ok: false, message: '还没填 API 端点' };
  if (!settings.aiKey) return { ok: false, message: '还没填 API Key' };
  const call = await callChatCompletion({
    purpose: 'test',
    endpoint: settings.aiEndpoint,
    model: settings.aiModel,
    apiKey: settings.aiKey,
    body: {
      model: settings.aiModel,
      messages: [{ role: 'user', content: '只回复两个字：可用' }],
      max_tokens: 16,
    },
  });

  if (!call.ok) {
    const snippet = call.text ? call.text.slice(0, 300).replace(/\s+/g, ' ') : call.log.error ?? '';
    return {
      ok: false,
      message: `HTTP ${call.status ?? '无响应'}（${call.log.durationMs}ms）｜${snippet || '无返回内容'}`,
    };
  }
  let reply = '';
  try {
    reply = JSON.parse(call.text)?.choices?.[0]?.message?.content ?? '';
  } catch {
    reply = call.text.slice(0, 120);
  }
  return { ok: true, message: `连接成功（${call.log.durationMs}ms），模型回复：${reply || '(空)'}` };
}

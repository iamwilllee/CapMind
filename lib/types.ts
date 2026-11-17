export type TaskType = 'checkin' | 'milestone' | 'clip';
export type RunStatus = 'ok' | 'already' | 'needs-human' | 'error';

/**
 * 每日事项的执行方式。
 * remind —— 到点提醒你去点，你自己完成后标记（默认，最稳）
 * auto   —— 插件尝试自己在浏览器里找到领取按钮并点击（尽力，失败自动降级为提醒）
 */
export type TaskMode = 'remind' | 'auto';

/** 自动模式的探索线索。圈选快照只是线索，执行时按语义重新在页面上找按钮。 */
export interface AutoHints {
  /** 按钮可能包含的词，例如「去领」「立即领取」「签到」 */
  buttonWords: string[];
  /** 圈选时读到的页面文案摘要，用于判断是否还是同一个活动页 */
  pageSummary?: string;
}

/**
 * 文案校验的依据。图片按钮拿不到 textContent，只能靠 alt/title/aria-label；
 * 连这些都没有时（纯 sprite、canvas）就没有可校验的文案，执行阶段只校验元素存在。
 */
export type TextHintSource = 'text' | 'attr' | 'none';

/** 圈选识别生成的签到配方。执行阶段只用这份确定性规则，不调用模型。 */
export interface CheckinRecipe {
  version: 1;
  site: string;
  urlPattern: string;
  action: {
    kind: 'click';
    selector: string;
    textHint: string;
    /** 缺省视为 'text'，兼容旧配方。 */
    textHintSource?: TextHintSource;
  };
  alreadySignals: string[];
  successSignals: string[];
  displayFields: { label: string; value: string }[];
  generatedBy: 'ai' | 'heuristic' | 'manual';
  confidence: number;
  lastValidatedAt?: number;
}

export interface RunRecord {
  at: number;
  status: RunStatus;
  message: string;
  evidence?: string;
}

export interface Milestone {
  id: string;
  title: string;
  done: boolean;
  doneAt?: number;
  /** 这一步该在什么时候做（由 AI 按「从今天起第 N 天」换算成绝对时间）。 */
  dueAt?: number;
  /** 这一步具体要做什么，AI 拆节点时给出的一句话说明。 */
  hint?: string;
  /** ai = 识别时拆出来的；manual = 用户自己加的。 */
  source?: 'ai' | 'manual';
}

/** 归入追踪的收集材料。与 milestones 分层：材料无序、只供查阅，节点有序、进提醒队列。 */
export interface Material {
  id: string;
  title: string;
  url?: string;
  site?: string;
  excerpt?: string;
  note?: string;
  tags?: string[];
  attachedAt: number;
  /** 提取为节点后记下节点 id，避免重复提取。 */
  stepId?: string;
}

export interface Task {
  id: string;
  type: TaskType;
  title: string;
  url: string;
  site: string;
  note: string;
  enabled: boolean;
  createdAt: number;
  archivedAt?: number;

  /** 杂项按标签分类；待办和追踪也允许打标签，只是界面不强调。 */
  tags?: string[];
  /** 圈选时抓到的原文摘录，杂项主要靠它被搜到。 */
  excerpt?: string;

  // ── 每日事项（签到/领取/打卡）──
  /** 执行方式。旧数据缺省按 'remind' 处理。 */
  mode?: TaskMode;
  /** 配方降级为可选线索：不再作为执行入口，只提供语义参考。 */
  recipe?: CheckinRecipe;
  /** 自动模式的探索线索。 */
  autoHints?: AutoHints;
  cadence?: { at: string; jitterMin: number };
  nextRunAt?: number;
  /** 最近一次执行（自动）的时间与结果。 */
  lastRunAt?: number;
  lastStatus?: RunStatus;
  /** 最近一次「完成」的时间——手动或自动都算。按天判断幂等用这个。 */
  lastDoneAt?: number;
  /** 完成来源，用于日历区分手动/自动。 */
  lastDoneBy?: 'manual' | 'auto';
  /** 按天记录完成情况，形如 { '2026-11-13': 'manual' }。 */
  doneByDay?: Record<string, 'manual' | 'auto'>;

  // ── 长周期事项 ──
  expectedDays?: number;
  startedAt?: number;
  /** 总截止时间。ICP 备案这类有明确终点的追踪必须有它。 */
  deadline?: number;
  reviewEveryDays?: number;
  nextReviewAt?: number;
  milestones?: Milestone[];
  /** 每个阶段节点上一次提醒在哪一天（stepId → dayKey），防止 15 分钟一轮的 tick 反复提醒。 */
  stepNotifiedDay?: Record<string, string>;
  /** 归入这个追踪的收集材料（无序，不进提醒）。 */
  materials?: Material[];
  deferredCount?: number;

  history: RunRecord[];
  notifyOnFailure: boolean;
}

/** 圈选后从页面抽取的素材。不含截图二进制，避免存储膨胀。 */
export interface SelectionPayload {
  url: string;
  title: string;
  site: string;
  rect: { x: number; y: number; w: number; h: number };
  buttons: {
    selector: string;
    text: string;
    textHintSource?: TextHintSource;
    /** 按钮指向的地址（<a href> 或最近的 <a> 祖先）。聚合页的「去领」靠这个拿到真实站点。 */
    href?: string;
  }[];
  texts: string[];
  domSummary: string;
  /** 选区里最像标题的那行文字（通常是大字号 / 加粗），不是 document.title。 */
  heading?: string;
}

export interface AppSettings {
  checkinTime: string;
  jitterMin: number;
  reviewEveryDays: number;
  notifyEnabled: boolean;
  aiEnabled: boolean;
  aiEndpoint: string;
  aiModel: string;
  aiKey: string;
}

export interface RecognizeResult {
  recipe: CheckinRecipe;
  warnings: string[];
  /** AI 意图分析结果（本地识别时也会填一份粗判）。 */
  analysis?: {
    /** 归档桶：待办 / 追踪 / 杂项。拿不准时落 clip。 */
    kind?: 'todo' | 'project' | 'clip';
    taskTitle?: string;
    targetUrl?: string;
    cadence?: string;
    summary?: string;
    buttonWords?: string[];
    /** 追踪的预计耗时与截止（从今天算起的天数）。 */
    expectedDays?: number;
    deadlineDays?: number;
    /** 追踪阶段节点，AI 拆出来的。 */
    steps?: { title: string; dueOffsetDays?: number; hint?: string }[];
    /** 杂项的标签。 */
    tags?: string[];
    /** 判定为某个桶的理由，界面展示给用户确认。 */
    reason?: string;
  };
}

export interface RunOutcome {
  status: RunStatus;
  message: string;
  evidence?: string;
}

/** 圈选识别后、尚未保存的配方草稿。用 storage 传递，避免依赖消息到达时序。 */
export interface PendingDraft {
  payload: SelectionPayload;
  recipe: CheckinRecipe;
  warnings: string[];
  /** AI 意图分析结果（标题 / 真实地址 / 节奏）。 */
  analysis?: RecognizeResult['analysis'];
  /** true = 正在等 AI 返回结果，界面显示分析中。 */
  analyzing?: boolean;
  /** 分析开始时间戳与已用秒数，供面板显示进度。 */
  analyzeStartedAt?: number;
  analyzeElapsed?: number;
  /** request = 首次请求中；retry = 服务过载，等待重试 */
  analyzeStage?: 'request' | 'retry';
  retryAttempt?: number;
  retryMax?: number;
  retryWaitSec?: number;
  retryStatus?: number;
  at: number;
  replaceId?: string;
}

/** 扩展内部消息协议（background ↔ sidebar ↔ content）。 */
export type RuntimeMessage =
  | { type: 'START_SELECTION' }
  | { type: 'SELECTION_CANCELLED' }
  | { type: 'SELECTION_RESULT'; payload: SelectionPayload; tabId: number }
  | { type: 'RECOGNIZE_AI'; payload: SelectionPayload }
  | { type: 'RUN_TASK'; id: string }
  | { type: 'MARK_DONE'; id: string }
  | { type: 'CLEAR_DONE'; id: string }
  | { type: 'OPEN_TASK_URL'; id: string }
  | { type: 'TRIAL_RUN'; recipe: CheckinRecipe; url: string }
  | { type: 'OPEN_PANEL' }
  | { type: 'TEST_AI'; settings: AppSettings }
  | { type: 'GET_AI_LOGS' }
  | { type: 'CLEAR_AI_LOGS' }
  | { type: 'CM_PING' }
  | { type: 'CM_START_SELECTION' };

import { useState } from 'react';
import {
  addDays,
  formatShortTime,
  getSettings,
  getTask,
  newId,
  nextDailyAt,
  saveTask,
} from '~/lib/storage';
import { findProjectCandidates, hasStrongCandidate } from '~/lib/matcher';
import type { CheckinRecipe, Material, PendingDraft, RunOutcome, Task } from '~/lib/types';
import type { ViewCtx } from '../App';
import { Back, Bottom, Corners, ViewfinderIcon } from '../ui';

type Kind = 'todo' | 'project' | 'clip';
type Mode = 'remind' | 'auto';

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/** 把 AI 给的「第 N 天」换算成绝对时间戳。 */
function dayOffset(days?: number): number | undefined {
  if (!days || days <= 0) return undefined;
  const d = new Date();
  d.setHours(9, 30, 0, 0);
  return d.getTime() + (days - 1) * 86_400_000;
}

const KIND_META: Record<Kind, { name: string; desc: string }> = {
  todo: { name: '待办', desc: '每天/每周要做的动作，到点提醒或自动完成' },
  project: { name: '追踪', desc: '有周期、分阶段，到节点提醒你推进' },
  clip: { name: '杂项', desc: '没有时间属性的资料，存起来以后能搜到' },
};

export default function RecipeView({ ctx, draft }: { ctx: ViewCtx; draft: PendingDraft }) {
  const analysis = draft.analysis;
  const [kind, setKind] = useState<Kind>(analysis?.kind ?? 'todo');
  const [mode, setMode] = useState<Mode>('remind');
  // 标题优先级：AI 分析出的任务名 > 圈选块里的标题 > 选区首行文字 > 站点名。
  // 绝不用网页标题——聚合页的 document.title 是所有条目共用的，没有区分度。
  const initialTitle =
    analysis?.taskTitle ||
    draft.payload.heading ||
    draft.payload.texts.find((t) => t.length >= 6 && t.length <= 40) ||
    draft.recipe.site ||
    '新事项';
  // 地址优先级：AI 判断的真实领取地址（「去领」指向的站点）> 当前页地址。
  const initialUrl = analysis?.targetUrl || draft.payload.url;
  const targetHost = (() => {
    try {
      return analysis?.targetUrl ? new URL(analysis.targetUrl).hostname : '';
    } catch {
      return '';
    }
  })();

  const [title, setTitle] = useState(initialTitle);
  const [url, setUrl] = useState(initialUrl);
  const [note, setNote] = useState(
    analysis?.summary || draft.payload.texts.slice(0, 2).join(' · ').slice(0, 80),
  );
  const [recipe, setRecipe] = useState<CheckinRecipe>(draft.recipe);
  const [editSignals, setEditSignals] = useState<'already' | 'success' | null>(null);
  const [signalInput, setSignalInput] = useState('');
  const [trial, setTrial] = useState<RunOutcome | null>(null);
  const [trialLoading, setTrialLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  // 追踪：AI 拆好的节点直接预填，用户可改可删；没有 AI 时给一份通用骨架。
  const aiSteps = analysis?.steps ?? [];
  const [expectedDays, setExpectedDays] = useState(String(analysis?.expectedDays ?? 30));
  const [deadlineDays, setDeadlineDays] = useState(
    String(analysis?.deadlineDays ?? analysis?.expectedDays ?? 30),
  );
  const [reviewEveryDays, setReviewEveryDays] = useState('7');
  const [steps, setSteps] = useState<{ title: string; dueAt?: number; hint?: string }[]>(
    aiSteps.length
      ? aiSteps.map((s) => ({
          title: s.title,
          dueAt: dayOffset(s.dueOffsetDays),
          hint: s.hint,
        }))
      : [
          { title: '提交材料', dueAt: dayOffset(1) },
          { title: '等待审核', dueAt: dayOffset(7) },
          { title: '处理补正', dueAt: dayOffset(14) },
          { title: '完成', dueAt: dayOffset(30) },
        ],
  );

  // 杂项：标签 + 原文摘录，靠这两样以后能被搜出来。
  const [tags, setTags] = useState<string[]>(analysis?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const excerpt = draft.payload.texts.slice(0, 8).join(' ').slice(0, 400);

  const existing = draft.replaceId
    ? ctx.tasks.find((t) => t.id === draft.replaceId)
    : undefined;

  // 归入建议：本地打分挑出与这块内容最像的已有追踪（最多 3 个）。
  // 只排序不决定——默认选中强候选，弱候选不预选，最终由用户点确认。
  const candidates = findProjectCandidates(draft.payload, ctx.tasks);
  const [attachTo, setAttachTo] = useState<string | null>(
    hasStrongCandidate(candidates) ? candidates[0].task.id : null,
  );

  const runTrial = async () => {
    setTrialLoading(true);
    try {
      const result = (await chrome.runtime.sendMessage({
        type: 'TRIAL_RUN',
        recipe,
        url,
      })) as RunOutcome;
      setTrial(result ?? { status: 'error', message: '没有拿到试跑结果' });
    } catch (error) {
      setTrial({
        status: 'error',
        message: error instanceof Error ? error.message : '试跑失败',
      });
    } finally {
      setTrialLoading(false);
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      // 归入已有追踪：只挂材料，不新建追踪、不动它的阶段节点。
      if (kind === 'project' && attachTo) {
        const project = await getTask(attachTo);
        if (project) {
          const material: Material = {
            id: newId(),
            title,
            url,
            site: recipe.site || hostOf(url),
            excerpt,
            note,
            tags,
            attachedAt: Date.now(),
          };
          await saveTask({
            ...project,
            materials: [...(project.materials ?? []), material],
          });
          await ctx.refresh();
          ctx.navigate({ name: 'milestone', id: project.id });
          return;
        }
        // 追踪可能刚被删了：退回新建，别丢数据。
        setAttachTo(null);
      }

      const settings = await getSettings();
      const site = recipe.site || hostOf(url);
      const base = {
        id: existing?.id ?? newId(),
        title,
        url,
        site,
        note,
        enabled: true,
        createdAt: existing?.createdAt ?? Date.now(),
        history: existing?.history ?? [],
        notifyOnFailure: true,
      };

      if (kind === 'todo') {
        const passed = trial?.status === 'ok' || trial?.status === 'already';
        // 自动模式必须试跑通过才能启用，否则退回提醒模式，避免每天静默失败。
        const effectiveMode: Mode = mode === 'auto' && !passed ? 'remind' : mode;
        const buttonWords = recipe.action.textHint
          ? [recipe.action.textHint, '去领', '立即领取', '领取', '签到', '打卡']
          : ['去领', '立即领取', '领取', '签到', '打卡'];
        const task: Task = {
          ...base,
          type: 'checkin',
          mode: effectiveMode,
          enabled: existing ? existing.enabled : passed || effectiveMode === 'remind',
          // 配方降级为线索，不再是执行入口。
          recipe: {
            ...recipe,
            site,
            urlPattern: url,
            lastValidatedAt: trial ? Date.now() : recipe.lastValidatedAt,
          },
          autoHints: { buttonWords, pageSummary: draft.payload.texts.slice(0, 5).join(' · ') },
          cadence: { at: settings.checkinTime, jitterMin: settings.jitterMin },
          nextRunAt: existing?.nextRunAt ?? nextDailyAt(settings.checkinTime, settings.jitterMin),
          lastRunAt: existing?.lastRunAt,
          lastDoneAt: existing?.lastDoneAt,
          doneByDay: existing?.doneByDay,
          lastStatus: existing?.lastStatus,
          tags,
        };
        await saveTask(task);
      } else if (kind === 'project') {
        const every = Number.parseInt(reviewEveryDays, 10) || 7;
        const totalDays = Number.parseInt(expectedDays, 10) || 30;
        const deadline = dayOffset(Number.parseInt(deadlineDays, 10) || totalDays);
        const startedAt = existing?.startedAt ?? Date.now();
        const task: Task = {
          ...base,
          type: 'milestone',
          expectedDays: totalDays,
          deadline,
          startedAt,
          reviewEveryDays: every,
          // 回访不要越过截止日：截止前一周收一次，其余按设定间隔。
          nextReviewAt: Math.min(addDays(Date.now(), every), deadline ?? Number.MAX_SAFE_INTEGER),
          milestones: steps
            .filter((s) => s.title.trim())
            .map((s, i) => ({
              id: existing?.milestones?.[i]?.id ?? `${Date.now()}-${i}`,
              title: s.title.trim(),
              done: existing?.milestones?.[i]?.done ?? false,
              doneAt: existing?.milestones?.[i]?.doneAt,
              dueAt: s.dueAt,
              hint: s.hint,
              source: aiSteps.length ? ('ai' as const) : ('manual' as const),
            })),
          deferredCount: existing?.deferredCount ?? 0,
          tags,
        };
        await saveTask(task);
      } else {
        // 杂项：没有时间属性，不进任何提醒队列。
        const task: Task = {
          ...base,
          type: 'clip',
          enabled: false,
          excerpt,
          tags,
          note,
        };
        await saveTask(task);
      }

      await ctx.refresh();
      ctx.navigate({ name: 'today' });
    } finally {
      setBusy(false);
    }
  };

  const commitSignals = () => {
    const list = signalInput
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (editSignals === 'already') {
      setRecipe({ ...recipe, alreadySignals: list });
    } else if (editSignals === 'success') {
      setRecipe({ ...recipe, successSignals: list });
    }
    setEditSignals(null);
  };

  const sourceLabel =
    recipe.generatedBy === 'ai'
      ? 'AI 识别生成'
      : recipe.generatedBy === 'heuristic'
        ? '本地识别生成'
        : '手动填写';

  // AI 分析中：显示加载态，不展示半成品字段，避免用户看到本地兜底结果后又跳变。
  if (draft.analyzing) {
    const elapsed = draft.analyzeElapsed ?? 0;
    const mmss = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
    const retrying = draft.analyzeStage === 'retry';
    return (
      <div className="cm-body">
        <div className="cm-title" style={{ paddingTop: 18 }}>
          {retrying ? '服务繁忙，正在重试…' : '正在分析这块…'}
        </div>

        <div className="cm-pad" style={{ paddingTop: 6 }}>
          <div className="cm-analyze" style={retrying ? { borderColor: 'var(--cm-wait)' } : undefined}>
            <div className="cm-analyze-row">
              <span className="cm-analyze-timer mono">{mmss}</span>
              <span className="cm-analyze-label">
                {retrying
                  ? `模型服务暂时过载（HTTP ${draft.retryStatus ?? 503}），${draft.retryWaitSec ?? 10} 秒后自动重试`
                  : 'AI 正在读这块内容，判断任务和领取地址'}
              </span>
            </div>
            <div className="cm-analyze-track">
              <i className="cm-analyze-bar" style={retrying ? { background: 'var(--cm-wait)' } : undefined} />
            </div>
            {retrying && (
              <div className="cm-analyze-retry">
                第 <b>{draft.retryAttempt ?? 1}</b> / {draft.retryMax ?? 2} 次重试
              </div>
            )}
            <div className="cm-hint" style={{ marginTop: 10 }}>
              大模型首字可能要等几十秒，最多 5 分钟。等不及可以直接关掉面板，之后在「全部」里手动补。
            </div>
          </div>

          <div className="cm-notice" style={{ marginTop: 14 }}>
            <b>提示</b>
            <span>
              {retrying
                ? '这是服务端限流/过载，不是配置错误。重试仍失败的话，稍后再试或换个模型。'
                : '如果一直转很久，多半是端点或 Key 有问题，可以在设置里点「测试连接」查。'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="cm-body">
        <Back onClick={() => ctx.navigate({ name: 'today' })}>返回选区</Back>
        <div className="cm-title">识别结果</div>

        <div className="cm-pad">
        <div className="cm-types">
          {(['todo', 'project', 'clip'] as Kind[]).map((k) => (
            <button
              key={k}
              className={`cm-type ${kind === k ? 'is-active' : ''}`}
              onClick={() => setKind(k)}
            >
              {kind === k && <Corners />}
              {k === 'todo' ? (
                <ViewfinderIcon size={16} />
              ) : k === 'project' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M4 5h16M4 12h16M4 19h10" />
                </svg>
              )}
              <div className="cm-type-name">{KIND_META[k].name}</div>
              <div className="cm-type-desc">{KIND_META[k].desc}</div>
            </button>
          ))}
        </div>

        {kind === 'project' && candidates.length > 0 && (
          <div className="cm-attach">
            <div className="cm-attach-head">
              这块内容和已有追踪像
              {attachTo && <span className="cm-attach-mode">将作为材料归入</span>}
            </div>
            {candidates.map((c) => (
              <button
                type="button"
                key={c.task.id}
                className={`cm-attach-row ${attachTo === c.task.id ? 'is-active' : ''}`}
                onClick={() => setAttachTo(attachTo === c.task.id ? null : c.task.id)}
              >
                <span className="cm-attach-radio" aria-hidden="true" />
                <span className="cm-attach-body">
                  <span className="cm-attach-title">{c.task.title}</span>
                  <span className="cm-attach-why">{c.why.join(' · ')}</span>
                </span>
              </button>
            ))}
            <button
              type="button"
              className={`cm-attach-row is-new ${attachTo === null ? 'is-active' : ''}`}
              onClick={() => setAttachTo(null)}
            >
              <span className="cm-attach-radio" aria-hidden="true" />
              <span className="cm-attach-body">
                <span className="cm-attach-title">新建追踪</span>
                <span className="cm-attach-why">这块是另一件事的开始，不归入上面任何一个</span>
              </span>
            </button>
            {attachTo && (
              <div className="cm-attach-note">
                只会把标题、摘录、链接作为<b>材料</b>挂到该追踪下，不改它的阶段节点。
                需要变成节点时，在追踪里点「提取为节点」。
              </div>
            )}
          </div>
        )}

        <div className="cm-source">
          <Corners />
          <div className="cm-source-text">
            <b>{sourceLabel}</b>
            {analysis?.summary ? ` · ${analysis.summary}` : ` · 置信度 ${Math.round(recipe.confidence * 100)}%`}
            <br />
            {analysis
              ? 'AI 已判断分类，并填好了关键信息，请核对下面几项。'
              : draft.payload.texts.slice(0, 2).join(' · ').slice(0, 70) || '每个字段都可以改'}
          </div>
        </div>

        {draft.warnings.length > 0 && (
          <div className="cm-error">
            {draft.warnings.map((w, i) => (
              <div key={i}>· {w}</div>
            ))}
          </div>
        )}

        <div className="cm-field">
          <label className="cm-label" htmlFor="rc-title">名称</label>
          <input id="rc-title" className="cm-input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="cm-field">
          <label className="cm-label" htmlFor="rc-url">
            {kind === 'todo' ? '每天打开的领取地址' : kind === 'project' ? '办理入口（可选）' : '来源地址'}
            {kind === 'todo' && analysis?.targetUrl && analysis.targetUrl !== draft.payload.url && (
              <span style={{ fontWeight: 400, color: 'var(--cm-accent)' }}>
                {' '}· 取自「{draft.payload.buttons.find((b) => b.text)?.text || '去领'}」按钮
              </span>
            )}
          </label>
          <input id="rc-url" className="cm-input mono" value={url} onChange={(e) => setUrl(e.target.value)} />
          {kind === 'todo' && targetHost && analysis?.targetUrl && analysis.targetUrl !== draft.payload.url && (
            <div className="cm-hint" style={{ marginTop: 6 }}>
              你圈的是聚合页（{draft.payload.site}），真正的领取在 {targetHost}。
              每天会打开下面这个地址。
            </div>
          )}
        </div>
        <div className="cm-field">
          <label className="cm-label" htmlFor="rc-note">备注</label>
          <input id="rc-note" className="cm-input" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        {kind === 'todo' ? (
          <>
            <div className="cm-label" style={{ marginBottom: 6 }}>每天怎么完成</div>
            <div className="cm-types" style={{ marginBottom: 14 }}>
              <button
                className={`cm-type ${mode === 'remind' ? 'is-active' : ''}`}
                onClick={() => setMode('remind')}
                style={{ minHeight: 64 }}
              >
                {mode === 'remind' && <Corners />}
                <div className="cm-type-name" style={{ marginTop: 0 }}>提醒我</div>
                <div className="cm-type-desc">到点提醒 + 打开页面，你领完点「今天已完成」</div>
              </button>
              <button
                className={`cm-type ${mode === 'auto' ? 'is-active' : ''}`}
                onClick={() => setMode('auto')}
                style={{ minHeight: 64 }}
              >
                {mode === 'auto' && <Corners />}
                <div className="cm-type-name" style={{ marginTop: 0 }}>自动帮我领</div>
                <div className="cm-type-desc">插件每天自己打开页面找按钮点，失败会转提醒</div>
              </button>
            </div>

            {mode === 'auto' && !(trial?.status === 'ok' || trial?.status === 'already') && (
              <div className="cm-notice" style={{ marginBottom: 14 }}>
                <b>需要试跑</b>
                <span>自动模式必须先在下面跑通一次，否则保存时会退回「提醒我」。</span>
              </div>
            )}

            <div className="cm-field">
              <label className="cm-label" htmlFor="rc-hint">
                {mode === 'auto'
                  ? '按钮上可能出现的词 · 自动查找用'
                  : '按钮文案（可选，只作线索）'}
              </label>
              <input
                id="rc-hint"
                className="cm-input"
                value={recipe.action.textHint}
                onChange={(e) => {
                  const textHint = e.target.value;
                  // 手动填了文案就恢复成可校验，否则执行阶段会一直跳过校验。
                  setRecipe({
                    ...recipe,
                    action: {
                      ...recipe.action,
                      textHint,
                      textHintSource: textHint.trim() ? 'text' : 'none',
                    },
                  });
                }}
              />
            </div>

            <div className="cm-label" style={{ marginTop: 4 }}>已领过的判据 · 命中就不点</div>
            <div className="cm-chips">
              {recipe.alreadySignals.map((s) => (
                <span className="cm-chip" key={s}>{s}</span>
              ))}
              <button
                className="cm-btn-mini"
                onClick={() => {
                  setEditSignals('already');
                  setSignalInput(recipe.alreadySignals.join(', '));
                }}
              >
                编辑
              </button>
            </div>

            <div className="cm-label">领取成功的判据</div>
            <div className="cm-chips">
              {recipe.successSignals.map((s) => (
                <span className="cm-chip" key={s}>{s}</span>
              ))}
              <button
                className="cm-btn-mini"
                onClick={() => {
                  setEditSignals('success');
                  setSignalInput(recipe.successSignals.join(', '));
                }}
              >
                编辑
              </button>
            </div>

            {editSignals && (
              <div className="cm-field" style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
                <input
                  className="cm-input mono"
                  value={signalInput}
                  onChange={(e) => setSignalInput(e.target.value)}
                  aria-label="编辑判据，逗号分隔"
                />
                <button className="cm-btn-mini is-accent" onClick={commitSignals}>确定</button>
              </div>
            )}

            {trial && (
              <div className="cm-trial">
                <div className="cm-trial-head">
                  <span>
                    试跑一次 · {trial.status === 'ok' || trial.status === 'already' ? '通过' : '未通过'}
                  </span>
                  <span className="mono">{formatShortTime(Date.now())}</span>
                </div>
                <div className="cm-kv">
                  <span className="k mono">01</span>
                  <span className="v" style={{ flex: 1, textAlign: 'left', marginLeft: 10 }}>
                    {trial.message}
                  </span>
                  <span className={trial.status === 'ok' || trial.status === 'already' ? 'cm-pass' : 'cm-fail'}>
                    {trial.status === 'ok' || trial.status === 'already' ? 'PASS' : 'CHECK'}
                  </span>
                </div>
                <div className="cm-trial-foot">这会真的点一次，请确认结果符合预期后再保存。</div>
              </div>
            )}

            {!trial && (
              <div className="cm-notice" style={{ marginTop: 6 }}>
                <b>注意</b>
                <span>未经试跑的配方保存后不会自动执行，可在今日看板里手动启用。</span>
              </div>
            )}
          </>
        ) : kind === 'project' ? (
          <>
            <div className="cm-field-row">
              <div className="cm-field">
                <label className="cm-label" htmlFor="rc-days">预计耗时（天）</label>
                <input id="rc-days" className="cm-input" value={expectedDays} onChange={(e) => setExpectedDays(e.target.value)} />
              </div>
              <div className="cm-field">
                <label className="cm-label" htmlFor="rc-deadline">截止（第 N 天）</label>
                <input id="rc-deadline" className="cm-input" value={deadlineDays} onChange={(e) => setDeadlineDays(e.target.value)} />
              </div>
            </div>
            <div className="cm-field">
              <label className="cm-label" htmlFor="rc-review">回访频率（天）</label>
              <input id="rc-review" className="cm-input" value={reviewEveryDays} onChange={(e) => setReviewEveryDays(e.target.value)} />
            </div>

            <div className="cm-label" style={{ marginTop: 6 }}>
              阶段节点
              {aiSteps.length > 0 && (
                <span style={{ fontWeight: 400, color: 'var(--cm-accent)' }}> · AI 按流程拆的，可改</span>
              )}
            </div>
            {steps.map((s, i) => (
              <div className="cm-ms-edit" key={i}>
                <span className="mono" style={{ fontSize: 10, color: 'var(--cm-ink-3)', flex: '0 0 18px' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <input
                  className="cm-input"
                  style={{ border: 0, flex: 1 }}
                  value={s.title}
                  aria-label={`阶段 ${i + 1}`}
                  onChange={(e) => {
                    const next = [...steps];
                    next[i] = { ...next[i], title: e.target.value };
                    setSteps(next);
                  }}
                />
                {s.dueAt && (
                  <span className="mono" style={{ fontSize: 10, color: 'var(--cm-ink-3)' }}>
                    {new Date(s.dueAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
                  </span>
                )}
                <button
                  className="cm-ms-del"
                  aria-label={`删除阶段 ${i + 1}`}
                  onClick={() => setSteps(steps.filter((_, idx) => idx !== i))}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              className="cm-btn cm-btn-ghost cm-btn-block"
              style={{ border: 0, color: 'var(--cm-accent)', fontWeight: 600 }}
              onClick={() => setSteps([...steps, { title: '新阶段' }])}
            >
              + 添加阶段
            </button>

            <div className="cm-notice" style={{ marginTop: 12 }}>
              <b>提醒</b>
              <span>每个节点到点会单独提醒；没勾掉就说明还没做完。截止日之前还会问你一次进度。</span>
            </div>
          </>
        ) : (
          <>
            <div className="cm-label" style={{ marginTop: 6 }}>标签 · 以后靠它搜</div>
            <div className="cm-chips">
              {tags.length === 0 && <span className="cm-hint">还没有标签</span>}
              {tags.map((t) => (
                <span className="cm-chip" key={t}>
                  {t}
                  <button
                    className="cm-chip-x"
                    aria-label={`移除标签 ${t}`}
                    onClick={() => setTags(tags.filter((x) => x !== t))}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="cm-field" style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
              <input
                className="cm-input"
                placeholder="加标签，回车确认"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  const v = tagInput.trim();
                  if (v && !tags.includes(v)) setTags([...tags, v]);
                  setTagInput('');
                }}
              />
              <button
                className="cm-btn-mini"
                onClick={() => {
                  const v = tagInput.trim();
                  if (v && !tags.includes(v)) setTags([...tags, v]);
                  setTagInput('');
                }}
              >
                添加
              </button>
            </div>

            {excerpt && (
              <>
                <div className="cm-label">原文摘录 · 搜索命中这里</div>
                <div className="cm-excerpt">{excerpt}</div>
              </>
            )}

            <div className="cm-notice" style={{ marginTop: 12 }}>
              <b>杂项</b>
              <span>不会有任何提醒。存好后在「杂项」里按关键词或标签找。</span>
            </div>
          </>
        )}

        <div className="cm-divider" />
        <div className="cm-hint" style={{ margin: '0 0 16px' }}>
          浏览器需要保持打开，自动签到才会执行。关机期间不跑，重新打开后补领。
        </div>
        </div>
      </div>

      <Bottom>
        <button className="cm-btn-mini" onClick={() => void ctx.startSelection(existing?.id)}>
          重新圈选
        </button>
        {kind === 'todo' && (
          <button className="cm-btn-mini" onClick={() => void runTrial()} disabled={trialLoading}>
            {trialLoading ? '试跑中' : '试跑一次'}
          </button>
        )}
        <button className="cm-btn cm-btn-primary" onClick={() => void save()} disabled={busy}>
          {busy
            ? '保存中'
            : kind === 'todo'
              ? '保存并启用'
              : kind === 'project'
                ? attachTo
                  ? '归入该追踪'
                  : '保存追踪'
                : '存进杂项'}
        </button>
      </Bottom>
    </>
  );
}

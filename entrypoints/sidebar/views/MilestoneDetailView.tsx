import { useState } from 'react';
import { addDays, deleteTask, formatShortTime, newId, saveTask } from '~/lib/storage';
import type { Task } from '~/lib/types';
import type { ViewCtx } from '../App';
import { Back, Bottom } from '../ui';

const DEFER_ALERT_THRESHOLD = 3;

export default function MilestoneDetailView({ ctx, task }: { ctx: ViewCtx; task: Task }) {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const milestones = task.milestones ?? [];
  const done = milestones.filter((m) => m.done).length;
  const total = milestones.length;
  const days = task.startedAt ? Math.floor((Date.now() - task.startedAt) / 86_400_000) : 0;
  const expected = task.expectedDays ?? 30;
  const elapsedTicks = Math.min(30, Math.round((days / expected) * 30));
  const deferred = task.deferredCount ?? 0;
  const overDeferred = deferred >= DEFER_ALERT_THRESHOLD;

  const toggleMilestone = async (index: number) => {
    const next = milestones.map((m, i) =>
      i === index ? { ...m, done: !m.done, doneAt: !m.done ? Date.now() : undefined } : m,
    );
    await saveTask({ ...task, milestones: next });
    await ctx.refresh();
  };

  const defer = async () => {
    setBusy(true);
    await saveTask({
      ...task,
      nextReviewAt: addDays(Date.now(), 7),
      deferredCount: deferred + 1,
    });
    await ctx.refresh();
    setBusy(false);
  };

  const archive = async () => {
    setBusy(true);
    await saveTask({ ...task, archivedAt: Date.now(), enabled: false });
    await ctx.refresh();
    ctx.navigate({ name: 'projects' });
    setBusy(false);
  };

  const restore = async () => {
    setBusy(true);
    await saveTask({ ...task, archivedAt: undefined, enabled: true });
    await ctx.refresh();
    setBusy(false);
  };

  const doDelete = async () => {
    setBusy(true);
    await deleteTask(task.id);
    await ctx.refresh();
    ctx.navigate({ name: 'projects' });
  };

  const materials = task.materials ?? [];

  /** 材料转节点：追加到阶段末尾，并在材料上记 stepId 防重复提取。 */
  const extractStep = async (materialId: string) => {
    const material = materials.find((m) => m.id === materialId);
    if (!material || material.stepId) return;
    const step = {
      id: newId(),
      title: material.title.slice(0, 40),
      done: false,
      dueAt: undefined,
      hint: material.excerpt?.slice(0, 60),
      source: 'manual' as const,
    };
    await saveTask({
      ...task,
      milestones: [...milestones, step],
      materials: materials.map((m) => (m.id === materialId ? { ...m, stepId: step.id } : m)),
    });
    await ctx.refresh();
  };

  const removeMaterial = async (materialId: string) => {
    await saveTask({ ...task, materials: materials.filter((m) => m.id !== materialId) });
    await ctx.refresh();
  };

  return (
    <>
      <div className="cm-body">
        <Back onClick={() => ctx.navigate({ name: 'projects' })}>返回事项</Back>
        <div className="cm-title">{task.title}</div>

        {task.archivedAt && (
          <div className="cm-group-note" style={{ paddingBottom: 12 }}>
            已归档，不再回访提醒。可在下方恢复。
          </div>
        )}

        <div className="cm-progress">
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span className="cm-progress-num">
              {done} / {total}
            </span>
            <span className="mono" style={{ fontSize: 10, color: 'var(--cm-ink-3)' }}>
              第 {days} / {expected} 天
            </span>
          </div>
          <div className="cm-ruler" style={{ marginTop: 10 }}>
            {Array.from({ length: 30 }, (_, i) => (
              <i
                key={i}
                className={`cm-tick ${i < elapsedTicks ? 'is-ink' : 'is-empty'} ${i === elapsedTicks - 1 ? 'is-alert' : ''}`}
              />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }} className="mono">
            <span style={{ fontSize: 9, color: 'var(--cm-ink-3)' }}>0</span>
            <span style={{ fontSize: 9, color: 'var(--cm-ink-3)' }}>{expected} 天</span>
          </div>
        </div>

        {overDeferred && (
          <div className="cm-warn">
            <b>已延期 {deferred} 次</b>
            <span>
              这件事已经拖了 {days} 天。要么把当前里程碑拆细，要么直接标记完成——继续延期只会让它一直挂在这里。
            </span>
          </div>
        )}

        <div className="cm-section">进度</div>
        <div className="cm-tl-wrap">
          {milestones.map((m, i) => (
            <div className="cm-tl" key={m.id}>
              <span
                className={`cm-tl-dot ${m.done ? 'is-done' : i === done ? 'is-current' : ''}`}
                onClick={() => void toggleMilestone(i)}
                style={{ cursor: 'pointer' }}
              />
              <div>
                <div className={`cm-tl-name ${m.done ? '' : i === done ? 'is-current' : 'is-pending'}`}>
                  {m.title}
                  {!m.done && i === done ? ' · 待推进' : ''}
                </div>
                <div className="cm-tl-meta">
                  {m.done
                    ? m.doneAt
                      ? `${formatShortTime(m.doneAt)} 完成`
                      : '已完成'
                    : m.dueAt
                      ? `${new Date(m.dueAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })} 该做${i === done ? ' · 当前' : ''}`
                      : i === done
                        ? '进行中'
                        : '未开始'}
                </div>
                {!m.done && m.hint && <div className="cm-tl-hint">{m.hint}</div>}
              </div>
            </div>
          ))}
        </div>

        <div className="cm-divider" />

        <div className="cm-section">材料 · {materials.length}</div>
        <div style={{ padding: '0 16px' }}>
          {materials.length === 0 ? (
            <div className="cm-hint" style={{ paddingBottom: 12 }}>
              还没有材料。圈选相关内容时选「归入这个追踪」，就会挂到这里。
            </div>
          ) : (
            materials.map((m) => (
              <div className="cm-mat" key={m.id}>
                <div className="cm-mat-head">
                  {m.url ? (
                    <a className="cm-mat-title" href={m.url} target="_blank" rel="noreferrer">
                      {m.title}
                    </a>
                  ) : (
                    <span className="cm-mat-title">{m.title}</span>
                  )}
                  <span className="mono cm-mat-site">{m.site ?? ''}</span>
                </div>
                {m.excerpt && <div className="cm-mat-ex">{m.excerpt.slice(0, 90)}</div>}
                <div className="cm-mat-actions">
                  {m.stepId ? (
                    <span className="cm-mat-used">已提取为节点</span>
                  ) : (
                    <button type="button" onClick={() => void extractStep(m.id)}>
                      提取为节点
                    </button>
                  )}
                  <button type="button" className="is-danger" onClick={() => void removeMaterial(m.id)}>
                    移除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="cm-divider" />

        <div className="cm-section">回访记录</div>
        <div style={{ padding: '0 16px 16px' }}>
          {task.history.length === 0 ? (
            <div className="cm-hint" style={{ paddingTop: 8 }}>还没有回访记录。</div>
          ) : (
            task.history.slice(0, 5).map((r, i) => (
              <div className="cm-log" key={`${r.at}-${i}`}>
                <span className="cm-log-time" style={{ flexBasis: 46 }}>
                  {formatShortTime(r.at)}
                </span>
                <span className="cm-log-body">{r.message}</span>
              </div>
            ))
          )}
        </div>

        <div className="cm-divider" />

        <div className="cm-section">管理</div>
        <div style={{ padding: '0 16px 16px' }}>
          <button
            className="cm-btn cm-btn-ghost cm-btn-block"
            onClick={() => void (task.archivedAt ? restore() : archive())}
            disabled={busy}
          >
            {task.archivedAt ? '恢复为活跃事项' : '归档（停止回访，保留记录）'}
          </button>
          {!confirming ? (
            <button
              className="cm-btn cm-btn-ghost cm-btn-block"
              style={{ marginTop: 8, color: 'var(--cm-accent)', borderColor: 'var(--cm-accent)' }}
              onClick={() => setConfirming(true)}
            >
              删除这个事项
            </button>
          ) : (
            <div className="cm-confirm" style={{ margin: '8px 0 0' }}>
              <div className="cm-confirm-title">删除「{task.title}」？</div>
              <div className="cm-confirm-text">
                里程碑进度和回访记录会一起删除，无法恢复。只是不想再提醒的话，用上面的「归档」。
              </div>
              <div className="cm-confirm-actions">
                <button className="cm-btn-danger" onClick={() => void doDelete()} disabled={busy}>
                  确认删除
                </button>
                <button className="cm-btn cm-btn-ghost" onClick={() => setConfirming(false)}>
                  取消
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Bottom>
        <button className="cm-btn cm-btn-primary" onClick={() => void archive()} disabled={busy}>
          标记完成
        </button>
        <button className="cm-btn cm-btn-ghost" onClick={() => void defer()} disabled={busy}>
          延期一周
        </button>
      </Bottom>
    </>
  );
}

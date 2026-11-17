import { useState } from 'react';
import { dayKey, formatShortTime } from '~/lib/storage';
import type { Task } from '~/lib/types';
import type { ViewCtx } from '../App';
import { Bottom, Corners } from '../ui';

/** 今天是否已完成（手动或自动）。与 background 的 isDoneToday 保持一致。 */
function doneToday(task: Task): boolean {
  if (task.lastDoneAt && dayKey(task.lastDoneAt) === dayKey()) return true;
  if (task.doneByDay && task.doneByDay[dayKey()]) return true;
  return false;
}

type Filter = 'all' | 'todo' | 'done';

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
const pad = (n: number) => String(n).padStart(2, '0');

function statusOf(task: Task): 'done' | 'skipped' | 'alert' | 'idle' | 'paused' {
  if (!task.enabled) return 'paused';
  if (doneToday(task)) return 'done';
  if (task.lastStatus === 'needs-human' && doneToday(task) === false && task.history.length) {
    // 自动/提醒失败过，但今天还没完成
    return 'alert';
  }
  return 'idle';
}

function Row({
  task,
  busy,
  onOpen,
  onMarkDone,
  onClearDone,
  onOpenUrl,
  onRunAuto,
  onReselect,
}: {
  task: Task;
  busy: boolean;
  onOpen: () => void;
  onMarkDone: () => void;
  onClearDone: () => void;
  onOpenUrl: () => void;
  onRunAuto: () => void;
  onReselect: () => void;
}) {
  const done = doneToday(task);
  const isAuto = task.mode === 'auto';
  const failed = !done && !!task.lastStatus && task.lastStatus !== 'ok' && task.lastStatus !== 'already';

  const meta = done
    ? `${task.lastDoneBy === 'auto' ? '自动完成' : '你已标记完成'}${task.lastDoneAt ? ' · ' + formatShortTime(task.lastDoneAt) : ''}`
    : failed
      ? task.history[0]?.message ?? '需要你处理'
      : task.lastRunAt
        ? `已提醒 · ${formatShortTime(task.lastRunAt)}`
        : '今天还没做';

  return (
    <div className={`cm-row2 ${done ? 'is-done' : ''} ${failed ? 'is-alert' : ''}`}>
      {/* 左侧：状态点 + 标题 + 元信息 */}
      <span className={`cm-row2-dot ${done ? 'is-done' : failed ? 'is-alert' : ''}`} />

      <div className="cm-row2-body" onClick={onOpen} role="button" tabIndex={0}>
        <div className="cm-row2-title">{task.title}</div>
        <div className="cm-row2-meta">
          <span>{meta}</span>
          <span className="cm-row2-sep">·</span>
          <span className="cm-tag">{isAuto ? '自动' : '提醒'}</span>
        </div>
      </div>

      {/* 右侧：一个主按钮，正反状态同一个位置切换 */}
      <div className="cm-row2-actions">
        {done ? (
          <button
            className="cm-row2-btn is-done"
            onClick={onClearDone}
            disabled={busy}
            title="点一下撤销今天的完成标记"
          >
            <span className="cm-row2-check">✓</span>
            <span className="cm-row2-btn-label">已完成</span>
            <span className="cm-row2-undo">撤销</span>
          </button>
        ) : (
          <button className="cm-row2-btn" onClick={onMarkDone} disabled={busy}>
            今天已完成
          </button>
        )}
      </div>

      {/* 次要操作：一行小链接，不占主视觉 */}
      <div className="cm-row2-links">
        {done && <button type="button" className="is-undo" onClick={onClearDone}>撤销今天的完成</button>}
        <button type="button" onClick={onOpenUrl}>打开去领</button>
        {isAuto && !done && (
          <button type="button" onClick={onRunAuto} disabled={busy}>
            {busy ? '执行中…' : '立即自动领'}
          </button>
        )}
        {failed && <button type="button" onClick={onReselect}>重新圈选</button>}
      </div>
    </div>
  );
}

export default function TodayView({ ctx, mode }: { ctx: ViewCtx; mode: 'today' | 'all' }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  // 活跃 = 未归档；归档只在「全部」里回看，避免从看板上永久消失。
  const active = ctx.tasks.filter((t) => !t.archivedAt);
  const archived = ctx.tasks.filter((t) => !!t.archivedAt);
  const visible = mode === 'all' ? active : active;
  const checkins = visible.filter((t) => t.type === 'checkin');

  const doneCount = checkins.filter(
    (t) => t.lastStatus === 'ok' || t.lastStatus === 'already',
  ).length;
  const alertCount = checkins.filter(
    (t) => t.lastStatus === 'needs-human' || t.lastStatus === 'error',
  ).length;
  const greenTicks = checkins.length ? Math.round((doneCount / checkins.length) * 10) : 0;
  const redTicks = checkins.length ? Math.round((alertCount / checkins.length) * 10) : 0;

  const filtered = checkins.filter((t) => {
    const s = statusOf(t);
    if (filter === 'todo') return s === 'alert' || s === 'idle' || s === 'paused';
    if (filter === 'done') return s === 'done' || s === 'skipped';
    return true;
  });

  /** 统一的操作执行入口：发消息 → 刷新列表。 */
  const act = async (id: string, msg: { type: string; id: string }) => {
    setBusyId(id);
    try {
      await chrome.runtime.sendMessage(msg);
      await ctx.refresh();
    } finally {
      setBusyId(null);
    }
  };

  const now = new Date();
  const isEmpty = active.length === 0;

  return (
    <>
      <div className="cm-body">
        {mode === 'today' && (
          <>
            <div className="cm-date">
              <div className="cm-date-num">
                {pad(now.getMonth() + 1)}.{pad(now.getDate())}
              </div>
              <div className="cm-date-meta">
                {now.getFullYear()} / {pad(now.getMonth() + 1)} / {pad(now.getDate())}
                <br />
                {WEEKDAYS[now.getDay()]}
              </div>
            </div>
            <div className="cm-sub">
              今天有 <em>{alertCount} 件</em>需要你处理
            </div>

            <div className="cm-card today">
              <Corners />
              <div className="cm-card-head">
                <span>今日待办</span>
                <span className="cm-count">
                  {pad(doneCount)} / {pad(checkins.length)}
                </span>
              </div>
              <div className="cm-ruler">
                {Array.from({ length: 10 }, (_, i) => (
                  <i
                    key={i}
                    className={`cm-tick ${
                      i < greenTicks
                        ? ''
                        : i < greenTicks + redTicks
                          ? 'is-alert'
                          : 'is-empty'
                    }`}
                  />
                ))}
              </div>
              <div className="cm-ruler-note">
                {doneCount} 已完成 · {alertCount} 需处理
              </div>
            </div>
          </>
        )}

        {mode === 'all' && (
          <div className="cm-title" style={{ paddingTop: 14 }}>
            全部事项
          </div>
        )}

        {isEmpty ? (
          <div className="cm-empty">
            还没有事项。<br />
            在任意网页圈选一块，存成待办、追踪或杂项。
          </div>
        ) : (
          <>
            <div className="cm-group">
              <div>
                待办 <span className="cm-group-count">{pad(checkins.length)}</span>
              </div>
              <div className="cm-filter">
                {(['all', 'todo', 'done'] as Filter[]).map((f) => (
                  <button
                    key={f}
                    className={filter === f ? 'is-active' : ''}
                    onClick={() => setFilter(f)}
                  >
                    {f === 'all' ? '全部' : f === 'todo' ? '待处理' : '已完成'}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="cm-simple-row">这个筛选下没有事项</div>
            ) : (
              filtered.map((task) => (
                <Row
                  key={task.id}
                  task={task}
                  busy={busyId === task.id}
                  onOpen={() => ctx.navigate({ name: 'checkin', id: task.id })}
                  onMarkDone={() => void act(task.id, { type: 'MARK_DONE', id: task.id })}
                  onClearDone={() => void act(task.id, { type: 'CLEAR_DONE', id: task.id })}
                  onOpenUrl={() => void act(task.id, { type: 'OPEN_TASK_URL', id: task.id })}
                  onRunAuto={() => void act(task.id, { type: 'RUN_TASK', id: task.id })}
                  onReselect={() => void ctx.startSelection(task.id)}
                />
              ))
            )}

          </>
        )}

        {mode === 'all' && archived.length > 0 && (
          <>
            <div className="cm-divider" />
            <div className="cm-group">
              <div>
                已归档 <span className="cm-group-count">{pad(archived.length)}</span>
              </div>
            </div>
            <div className="cm-group-note">归档后不再提醒。点开可以查看历史，或恢复为活跃事项。</div>
            {archived.map((task) => (
              <div
                key={task.id}
                className="cm-archived-row"
                onClick={() =>
                  ctx.navigate({
                    name: task.type === 'checkin' ? 'checkin' : 'milestone',
                    id: task.id,
                  })
                }
                style={{ cursor: 'pointer' }}
              >
                <span className="cm-archived-title">{task.title}</span>
                <span className="mono" style={{ fontSize: 10 }}>
                  {task.archivedAt
                    ? `${pad(new Date(task.archivedAt).getMonth() + 1)}/${pad(new Date(task.archivedAt).getDate())} 归档`
                    : '已归档'}
                </span>
              </div>
            ))}
          </>
        )}
      </div>

      <Bottom>
        <button
          className="cm-btn cm-btn-primary"
          onClick={() => {
            void (async () => {
              await ctx.startSelection();
            })();
          }}
        >
          + 圈选一块
        </button>
        <button
          className="cm-btn cm-btn-ghost"
          onClick={() =>
            ctx.navigate({ name: mode === 'all' ? 'today' : 'settings' })
          }
        >
          {mode === 'all' ? '返回今日' : '设置'}
        </button>
      </Bottom>
    </>
  );
}

export { statusOf };

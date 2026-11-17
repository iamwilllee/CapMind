import { useState } from 'react';
import { dayKey, deleteTask, formatShortTime, saveTask } from '~/lib/storage';

function doneTodayOf(task: Task): boolean {
  if (task.lastDoneAt && dayKey(task.lastDoneAt) === dayKey()) return true;
  if (task.doneByDay && task.doneByDay[dayKey()]) return true;
  return false;
}
import type { Task } from '~/lib/types';
import type { ViewCtx } from '../App';
import { Back, Bottom, Corners } from '../ui';

const pad = (n: number) => String(n).padStart(2, '0');

export default function CheckinDetailView({ ctx, task }: { ctx: ViewCtx; task: Task }) {
  const recipe = task.recipe;
  const last = task.history[0];
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const cells = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const key = dayKey(d.getTime());
    // 优先看「完成记录」：手动/自动都算完成，是这产品的核心指标。
    const doneBy = task.doneByDay?.[key];
    const record = task.history.find((r) => dayKey(r.at) === key);
    let cls = 'cm-cell';
    if (doneBy) {
      cls += doneBy === 'auto' ? ' is-auto-done' : ' is-manual-done';
    } else if (!record) {
      cls += ' is-empty';
    } else if (record.status === 'needs-human' || record.status === 'error') {
      cls += ' is-alert';
    }
    if (i === 29) cls += ' is-today';
    return { key, cls };
  });

  // 用户关心的是「怎么完成、去哪、什么时候」，不是 CSS 选择器。
  const rows: { k: string; v: string }[] = [
    { k: '完成方式', v: task.mode === 'auto' ? '自动帮我领' : '提醒我去领' },
    { k: '每天时间', v: task.cadence ? `${task.cadence.at} 起（随机延后 ${task.cadence.jitterMin} 分钟）` : '默认 09:30' },
    { k: '打开地址', v: task.url },
    { k: '已领判据', v: recipe?.alreadySignals.join(' / ') || '未填写' },
    { k: '成功判据', v: recipe?.successSignals.join(' / ') || '未填写' },
    { k: '上次校验', v: recipe?.lastValidatedAt ? formatShortTime(recipe.lastValidatedAt) : '尚未试跑' },
  ];

  const runNow = async () => {
    setBusy(true);
    try {
      await chrome.runtime.sendMessage({ type: 'RUN_TASK', id: task.id });
      await ctx.refresh();
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    setBusy(true);
    await deleteTask(task.id);
    await ctx.refresh();
    ctx.navigate({ name: 'today' });
  };

  const toggleArchive = async () => {
    setBusy(true);
    await saveTask({
      ...task,
      archivedAt: task.archivedAt ? undefined : Date.now(),
      enabled: task.archivedAt ? task.enabled : false,
    });
    await ctx.refresh();
    ctx.navigate({ name: 'today' });
  };

  return (
    <>
      <div className="cm-body">
        <Back onClick={() => ctx.navigate({ name: 'today' })}>返回事项</Back>
        <div className="cm-title">{task.title}</div>

        {task.archivedAt && (
          <div className="cm-group-note" style={{ paddingBottom: 12 }}>
            已归档，不再自动签到。可在下方恢复。
          </div>
        )}

        <div className="cm-card stat">
          <Corners />
          {doneTodayOf(task) ? (
            <>
              <span className="cm-stat-num" style={{ color: 'var(--cm-ok)' }}>✓</span>
              <span className="cm-stat-label">
                今天已完成（{task.lastDoneBy === 'auto' ? '自动' : '你标记的'}）
                {task.lastDoneAt ? ` · ${formatShortTime(task.lastDoneAt)}` : ''}
              </span>
            </>
          ) : (
            <>
              <span className="cm-stat-num">--:--</span>
              <span className="cm-stat-label">{last?.message ?? '今天还没完成'}</span>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, padding: '0 16px 14px' }}>
          {doneTodayOf(task) ? (
            <button
              className="cm-btn cm-btn-ghost"
              style={{ flex: 1 }}
              onClick={() => void (async () => {
                await chrome.runtime.sendMessage({ type: 'CLEAR_DONE', id: task.id });
                await ctx.refresh();
              })()}
            >
              撤销今天完成
            </button>
          ) : (
            <>
              <button
                className="cm-btn cm-btn-primary"
                style={{ flex: 1 }}
                onClick={() => void (async () => {
                  await chrome.runtime.sendMessage({ type: 'MARK_DONE', id: task.id });
                  await ctx.refresh();
                })()}
              >
                今天已完成
              </button>
              <button
                className="cm-btn cm-btn-ghost"
                onClick={() => void chrome.tabs.create({ url: task.url, active: true })}
              >
                打开去领
              </button>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 16px 2px' }}>
          <span style={{ fontSize: 11, fontWeight: 700 }}>任务设置</span>
          <button className="cm-btn-mini" onClick={() => void ctx.startSelection(task.id)}>
            重新圈选识别
          </button>
        </div>
        <div style={{ padding: '0 16px' }}>
          {rows.map((row) => (
            <div className="cm-kv" key={row.k}>
              <span className="k">{row.k}</span>
              <span className={`v ${row.k === '按钮选择器' ? 'mono' : ''}`}>{row.v}</span>
            </div>
          ))}
        </div>

        <div className="cm-divider" />

        <div className="cm-section">近 30 天</div>
        <div className="cm-heat">
          {cells.map((c) => (
            <i key={c.key} className={c.cls} />
          ))}
        </div>
        <div className="cm-legend">
          <span><i style={{ background: 'var(--cm-ok)' }} />我标记完成</span>
          <span><i style={{ background: 'var(--cm-ok)' , opacity: .55 }} />自动完成</span>
          <span><i style={{ background: 'var(--cm-accent)' }} />需要处理</span>
          <span><i style={{ background: 'var(--cm-grid)' }} />没做</span>
        </div>

        <div className="cm-divider" />

        <div className="cm-section">执行记录</div>
        <div style={{ padding: '0 16px 16px' }}>
          {task.history.length === 0 ? (
            <div className="cm-hint" style={{ paddingTop: 8 }}>还没有执行记录。</div>
          ) : (
            task.history.slice(0, 6).map((r, i) => (
              <div className="cm-log" key={`${r.at}-${i}`}>
                <span className="cm-log-time">
                  {pad(new Date(r.at).getMonth() + 1)}-{pad(new Date(r.at).getDate())} {formatShortTime(r.at)}
                </span>
                <span className="cm-log-body">
                  <b className={r.status === 'needs-human' || r.status === 'error' ? 'is-alert' : ''}>
                    {r.status === 'ok' ? '已领取' : r.status === 'already' ? '今天已领过' : r.status === 'needs-human' ? '需要登录或人工处理' : '执行出错'}
                  </b>
                  {r.message}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="cm-divider" />

        <div className="cm-section">管理</div>
        <div style={{ padding: '0 16px 16px' }}>
          <button className="cm-btn cm-btn-ghost cm-btn-block" onClick={() => void toggleArchive()} disabled={busy}>
            {task.archivedAt ? '恢复为活跃事项' : '归档（停止自动签到，保留记录）'}
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
                签到配方和全部执行记录会一起删除，无法恢复。只是想停掉提醒的话，用上面的「归档」。
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
        <button className="cm-btn cm-btn-primary" onClick={() => void runNow()} disabled={busy}>
          {busy ? '执行中' : '立即签到'}
        </button>
        <button className="cm-btn cm-btn-ghost" onClick={() => ctx.editRecipe(task)}>
          编辑配方
        </button>
      </Bottom>
    </>
  );
}

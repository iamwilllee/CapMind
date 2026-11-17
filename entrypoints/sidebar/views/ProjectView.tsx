import type { ViewCtx } from '../App';
import type { Task } from '~/lib/types';
import { Bottom, Corners } from '../ui';

const pad = (n: number) => String(n).padStart(2, '0');

function daysLeft(deadline?: number): number | undefined {
  if (!deadline) return undefined;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(deadline);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/**
 * 追踪卡：一眼看到「还剩多少天」和「卡在哪一步」。
 * 阶段条用方块刻度而不是百分比进度条——这类事的关键是节点，不是百分比。
 */
function ProjectCard({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const steps = task.milestones ?? [];
  const done = steps.filter((s) => s.done).length;
  const total = steps.length;
  const remaining = daysLeft(task.deadline);
  const nextStep = steps.find((s) => !s.done);
  const overdue = remaining !== undefined && remaining < 0;
  const urgent = remaining !== undefined && remaining >= 0 && remaining <= 3;

  return (
    <div className={`cm-proj ${overdue ? 'is-overdue' : ''}`} onClick={onOpen} role="button" tabIndex={0}>
      <div className="cm-proj-head">
        <span className="cm-proj-title">{task.title}</span>
        {remaining !== undefined ? (
          <span className={`cm-proj-left ${overdue ? 'is-overdue' : urgent ? 'is-urgent' : ''}`}>
            {overdue ? `超期 ${Math.abs(remaining)} 天` : `还剩 ${remaining} 天`}
          </span>
        ) : (
          <span className="cm-proj-left is-muted">无截止</span>
        )}
      </div>

      {task.deadline && (
        <div className="cm-proj-deadline mono">
          截止 {pad(new Date(task.deadline).getMonth() + 1)} / {pad(new Date(task.deadline).getDate())}
        </div>
      )}

      {/* 阶段刻度：已完成实心，当前一个琥珀色，其余空心 */}
      <div className="cm-steps-track">
        {steps.length === 0
          ? Array.from({ length: 6 }, (_, i) => <i key={i} className="cm-step-mark is-empty" />)
          : steps.map((s, i) => (
              <i
                key={s.id}
                className={`cm-step-mark ${s.done ? 'is-done' : i === done ? 'is-current' : 'is-empty'}`}
              />
            ))}
      </div>

      <div className="cm-proj-foot">
        <span className="cm-proj-next">
          {total === 0
            ? '还没有阶段节点，点开添加'
            : done >= total
              ? '全部阶段已完成'
              : `下一步 · ${nextStep?.title ?? ''}`}
        </span>
        <span className="mono cm-proj-count">
          {pad(done)}/{pad(total)}
        </span>
      </div>
    </div>
  );
}

export default function ProjectView({ ctx }: { ctx: ViewCtx }) {
  const projects = ctx.tasks.filter((t) => t.type === 'milestone' && !t.archivedAt);
  // 快到期的排前面，没有截止的沉底。
  const sorted = [...projects].sort((a, b) => {
    const ra = daysLeft(a.deadline);
    const rb = daysLeft(b.deadline);
    if (ra === undefined && rb === undefined) return 0;
    if (ra === undefined) return 1;
    if (rb === undefined) return -1;
    return ra - rb;
  });

  const total = sorted.length;
  const overdueCount = sorted.filter((t) => {
    const r = daysLeft(t.deadline);
    return r !== undefined && r < 0;
  }).length;

  return (
    <>
      <div className="cm-body">
        <div className="cm-title" style={{ paddingTop: 14 }}>
          追踪
        </div>
        <div className="cm-sub">
          共 <em>{total}</em> 个
          {overdueCount > 0 && <> · <span style={{ color: 'var(--cm-accent)' }}>{overdueCount} 个已超期</span></>}
        </div>

        {total === 0 ? (
          <div className="cm-empty">
            还没有追踪。<br />
            圈选一块（比如一份备案指引、一个报名流程），<br />
            识别成「追踪」后会自动拆出阶段节点。
          </div>
        ) : (
          <div className="cm-card-list">
            <Corners />
            {sorted.map((task) => (
              <ProjectCard
                key={task.id}
                task={task}
                onOpen={() => ctx.navigate({ name: 'milestone', id: task.id })}
              />
            ))}
          </div>
        )}
      </div>

      <Bottom>
        <button className="cm-btn cm-btn-primary" onClick={() => void ctx.startSelection()}>
          + 圈选一块
        </button>
        <button className="cm-btn cm-btn-ghost" onClick={() => ctx.navigate({ name: 'today' })}>
          待办
        </button>
      </Bottom>
    </>
  );
}

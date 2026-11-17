import { useMemo, useState } from 'react';
import type { ViewCtx } from '../App';
import type { Task } from '~/lib/types';
import { Bottom } from '../ui';

const pad = (n: number) => String(n).padStart(2, '0');

/** 中文不切词，直接子串匹配：不会出现「搜了但搜不到」的尴尬。 */
function hit(task: Task, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    task.title,
    task.note,
    task.excerpt ?? '',
    task.site,
    (task.tags ?? []).join(' '),
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

export default function ClipView({ ctx }: { ctx: ViewCtx }) {
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<string | null>(null);

  const clips = ctx.tasks.filter((t) => t.type === 'clip' && !t.archivedAt);

  const allTags = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of clips) {
      for (const g of t.tags ?? []) map.set(g, (map.get(g) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [clips]);

  const visible = clips.filter(
    (t) => hit(t, query) && (!tag || (t.tags ?? []).includes(tag)),
  );

  return (
    <>
      <div className="cm-body">
        <div className="cm-title" style={{ paddingTop: 14 }}>
          杂项
        </div>
        <div className="cm-sub">
          共 <em>{clips.length}</em> 条 · 不会提醒
        </div>

        <div className="cm-search">
          <input
            className="cm-search-input"
            placeholder="搜标题、标签、摘录…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="搜索杂项"
          />
          {query && (
            <button className="cm-search-clear" aria-label="清空搜索" onClick={() => setQuery('')}>
              ×
            </button>
          )}
        </div>

        {allTags.length > 0 && (
          <div className="cm-chip-row">
            <button
              className={`cm-chip-filter ${tag === null ? 'is-active' : ''}`}
              onClick={() => setTag(null)}
            >
              全部
            </button>
            {allTags.map(([name, count]) => (
              <button
                key={name}
                className={`cm-chip-filter ${tag === name ? 'is-active' : ''}`}
                onClick={() => setTag(tag === name ? null : name)}
              >
                {name} <span className="cm-chip-count">{count}</span>
              </button>
            ))}
          </div>
        )}

        {visible.length === 0 ? (
          <div className="cm-empty">
            {clips.length === 0 ? (
              <>
                还没有杂项。<br />
                圈选一段话、一个链接，识别成「杂项」就存下来了。
              </>
            ) : (
              <>没有匹配的条目。换个关键词或点「全部」。</>
            )}
          </div>
        ) : (
          visible.map((task) => (
            <div
              key={task.id}
              className="cm-clip"
              onClick={() => ctx.navigate({ name: 'clip', id: task.id })}
              role="button"
              tabIndex={0}
            >
              <div className="cm-clip-title">{task.title}</div>
              {(task.tags ?? []).length > 0 && (
                <div className="cm-clip-tags">
                  {(task.tags ?? []).map((g) => (
                    <span className="cm-tag" key={g}>
                      {g}
                    </span>
                  ))}
                </div>
              )}
              {task.excerpt && <div className="cm-clip-excerpt">{task.excerpt}</div>}
              <div className="cm-clip-meta mono">
                {task.site || '本地'} · {pad(new Date(task.createdAt).getMonth() + 1)}/
                {pad(new Date(task.createdAt).getDate())}
              </div>
            </div>
          ))
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

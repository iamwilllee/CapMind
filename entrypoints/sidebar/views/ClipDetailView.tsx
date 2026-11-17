import { useState } from 'react';
import { deleteTask, saveTask } from '~/lib/storage';
import type { Task } from '~/lib/types';
import type { ViewCtx } from '../App';
import { Back, Bottom } from '../ui';

export default function ClipDetailView({ ctx, task }: { ctx: ViewCtx; task: Task }) {
  const [title, setTitle] = useState(task.title);
  const [note, setNote] = useState(task.note);
  const [tags, setTags] = useState<string[]>(task.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const dirty =
    title !== task.title || note !== task.note || (task.tags ?? []).join() !== tags.join();

  const save = async () => {
    setBusy(true);
    await saveTask({ ...task, title: title.trim() || task.title, note, tags });
    await ctx.refresh();
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const doDelete = async () => {
    setBusy(true);
    await deleteTask(task.id);
    await ctx.refresh();
    ctx.navigate({ name: 'clips' });
  };

  const addTag = () => {
    const v = tagInput.trim();
    if (v && !tags.includes(v)) setTags([...tags, v]);
    setTagInput('');
  };

  return (
    <>
      <div className="cm-body">
        <Back onClick={() => ctx.navigate({ name: 'clips' })}>返回杂项</Back>

        <div className="cm-field">
          <label className="cm-label" htmlFor="cl-title">标题</label>
          <input id="cl-title" className="cm-input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="cm-field">
          <label className="cm-label" htmlFor="cl-note">备注</label>
          <input id="cl-note" className="cm-input" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <div className="cm-label">标签</div>
        <div className="cm-chips">
          {tags.length === 0 && <span className="cm-hint">还没有标签</span>}
          {tags.map((g) => (
            <span className="cm-chip" key={g}>
              {g}
              <button className="cm-chip-x" aria-label={`移除标签 ${g}`} onClick={() => setTags(tags.filter((x) => x !== g))}>
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
              if (e.key === 'Enter') addTag();
            }}
          />
          <button className="cm-btn-mini" onClick={addTag}>添加</button>
        </div>

        {task.excerpt && (
          <>
            <div className="cm-label">原文摘录</div>
            <div className="cm-excerpt">{task.excerpt}</div>
          </>
        )}

        {task.url && (
          <div className="cm-field">
            <div className="cm-label">来源</div>
            <div className="mono cm-clip-url">{task.url}</div>
          </div>
        )}

        <div className="cm-divider" />
        <div className="cm-hint" style={{ margin: '0 0 8px' }}>
          存于 {new Date(task.createdAt).toLocaleString('zh-CN')}
        </div>

        {!confirming ? (
          <button
            className="cm-btn cm-btn-ghost cm-btn-block"
            style={{ color: 'var(--cm-accent)', borderColor: 'var(--cm-accent)' }}
            onClick={() => setConfirming(true)}
            disabled={busy}
          >
            删除这条
          </button>
        ) : (
          <div className="cm-confirm" style={{ margin: '8px 0 0' }}>
            <div className="cm-confirm-title">删除「{task.title}」？</div>
            <div className="cm-confirm-text">删掉就找不回来了。</div>
            <div className="cm-confirm-actions">
              <button className="cm-btn-danger" onClick={() => void doDelete()} disabled={busy}>确认删除</button>
              <button className="cm-btn cm-btn-ghost" onClick={() => setConfirming(false)}>取消</button>
            </div>
          </div>
        )}
      </div>

      <Bottom>
        {task.url && (
          <button
            className="cm-btn-mini"
            onClick={() => void chrome.tabs.create({ url: task.url, active: true })}
          >
            打开来源
          </button>
        )}
        <button className="cm-btn cm-btn-primary" onClick={() => void save()} disabled={busy || !dirty}>
          {busy ? '保存中' : saved ? '已保存' : dirty ? '保存修改' : '没有改动'}
        </button>
      </Bottom>
    </>
  );
}

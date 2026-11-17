import type { ReactNode } from 'react';

export function ViewfinderIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--cm-accent)"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" />
    </svg>
  );
}

export function BackIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export function Header() {
  return (
    <div className="cm-header">
      <div className="cm-brand">
        <ViewfinderIcon />
        <span className="cm-brand-name">CAPMIND</span>
        <span className="cm-ver">v0.1</span>
      </div>
    </div>
  );
}

export type TabKey = 'todo' | 'project' | 'clip' | 'settings';

export function Tabs({ active, onChange }: { active: TabKey; onChange: (tab: TabKey) => void }) {
  const items: { key: TabKey; label: string }[] = [
    { key: 'todo', label: '待办' },
    { key: 'project', label: '追踪' },
    { key: 'clip', label: '杂项' },
    { key: 'settings', label: '设置' },
  ];
  return (
    <div className="cm-tabs">
      {items.map((item) => (
        <button
          key={item.key}
          className={`cm-tab ${active === item.key ? 'is-active' : ''}`}
          onClick={() => onChange(item.key)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function Steps({ current, labels }: { current: number; labels: string[] }) {
  return (
    <div className="cm-steps">
      {labels.map((label, index) => (
        <div key={label} className={`cm-step ${index + 1 === current ? 'is-active' : ''}`}>
          {String(index + 1).padStart(2, '0')} {label}
        </div>
      ))}
    </div>
  );
}

export function Corners() {
  return (
    <>
      <i className="cm-corner tl" />
      <i className="cm-corner tr" />
      <i className="cm-corner bl" />
      <i className="cm-corner br" />
    </>
  );
}

export function Back({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button className="cm-back" onClick={onClick}>
      <BackIcon />
      {children}
    </button>
  );
}

export function Bottom({ children }: { children: ReactNode }) {
  return <div className="cm-bottom">{children}</div>;
}

export function Section({ children }: { children: ReactNode }) {
  return <div className="cm-section">{children}</div>;
}

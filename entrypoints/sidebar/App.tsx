import { useCallback, useEffect, useState } from 'react';
import { getTasks } from '~/lib/storage';
import type { CheckinRecipe, PendingDraft, Task } from '~/lib/types';
import { Header, Steps, Tabs, type TabKey } from './ui';
import TodayView from './views/TodayView';
import SettingsView from './views/SettingsView';
import RecipeView from './views/RecipeView';
import CheckinDetailView from './views/CheckinDetailView';
import MilestoneDetailView from './views/MilestoneDetailView';
import ProjectView from './views/ProjectView';
import ClipView from './views/ClipView';
import ClipDetailView from './views/ClipDetailView';

export type View =
  | { name: 'today' }
  | { name: 'all' }
  | { name: 'projects' }
  | { name: 'clips' }
  | { name: 'settings' }
  | { name: 'recipe'; draft: PendingDraft }
  | { name: 'checkin'; id: string }
  | { name: 'milestone'; id: string }
  | { name: 'clip'; id: string };

export interface ViewCtx {
  tasks: Task[];
  navigate: (view: View) => void;
  refresh: () => Promise<void>;
  startSelection: (replaceId?: string) => Promise<void>;
  editRecipe: (task: Task) => void;
}

const EMPTY_RECIPE: CheckinRecipe = {
  version: 1,
  site: '',
  urlPattern: '',
  action: { kind: 'click', selector: '', textHint: '' },
  alreadySignals: [],
  successSignals: [],
  displayFields: [],
  generatedBy: 'manual',
  confidence: 0,
};

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<View>({ name: 'today' });

  const refresh = useCallback(async () => {
    setTasks(await getTasks());
  }, []);

  useEffect(() => {
    void refresh();

    const onChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string,
    ) => {
      if (areaName !== 'local') return;
      if (changes.cm_tasks) void refresh();
      const draft = changes.cm_pending?.newValue as PendingDraft | undefined;
      if (draft) {
        setView({ name: 'recipe', draft });
        // 分析中的占位不清除：等 AI 结果回来时同一个 key 会再触发一次 onChange，
        // 那时才是最终结果。若这里清掉，中间的「分析中」会闪成空白。
        if (!draft.analyzing) void chrome.storage.local.remove('cm_pending');
      }
    };

    chrome.storage.onChanged.addListener(onChange);
    void (async () => {
      const result = await chrome.storage.local.get('cm_pending');
      const draft = result.cm_pending as PendingDraft | undefined;
      if (draft && Date.now() - draft.at < 5 * 60 * 1000) {
        setView({ name: 'recipe', draft });
        if (!draft.analyzing) await chrome.storage.local.remove('cm_pending');
      }
    })();

    return () => {
      chrome.storage.onChanged.removeListener(onChange);
    };
  }, [refresh]);

  const startSelection = useCallback(async (replaceId?: string) => {
    await chrome.storage.local.set({ cm_replace_id: replaceId ?? null });
    await chrome.runtime.sendMessage({ type: 'START_SELECTION' });
  }, []);

  const editRecipe = useCallback((task: Task) => {
    if (!task.recipe) return;
    const draft: PendingDraft = {
      payload: {
        url: task.url,
        title: task.title,
        site: task.site,
        rect: { x: 0, y: 0, w: 0, h: 0 },
        buttons: [],
        texts: [],
        domSummary: '',
      },
      recipe: task.recipe,
      warnings: [],
      at: Date.now(),
      replaceId: task.id,
    };
    setView({ name: 'recipe', draft });
  }, []);

  const ctx: ViewCtx = { tasks, navigate: setView, refresh, startSelection, editRecipe };

  const tabKey: TabKey =
    view.name === 'settings'
      ? 'settings'
      : view.name === 'projects' || view.name === 'milestone'
        ? 'project'
        : view.name === 'clips' || view.name === 'clip'
          ? 'clip'
          : 'todo';

  const renderView = () => {
    switch (view.name) {
      case 'recipe':
        return <RecipeView key={view.draft.at} ctx={ctx} draft={view.draft} />;
      case 'checkin': {
        const task = tasks.find((t) => t.id === view.id);
        return task ? (
          <CheckinDetailView ctx={ctx} task={task} />
        ) : (
          <TodayView ctx={ctx} mode="today" />
        );
      }
      case 'milestone': {
        const task = tasks.find((t) => t.id === view.id);
        return task ? (
          <MilestoneDetailView ctx={ctx} task={task} />
        ) : (
          <TodayView ctx={ctx} mode="today" />
        );
      }
      case 'settings':
        return <SettingsView ctx={ctx} />;
      case 'projects':
        return <ProjectView ctx={ctx} />;
      case 'clips':
        return <ClipView ctx={ctx} />;
      case 'clip': {
        const task = tasks.find((t) => t.id === view.id);
        return task ? <ClipDetailView ctx={ctx} task={task} /> : <ClipView ctx={ctx} />;
      }
      case 'all':
        return <TodayView ctx={ctx} mode="all" />;
      default:
        return <TodayView ctx={ctx} mode="today" />;
    }
  };

  // 三种承载方式：
  // panel      —— Chrome 原生侧边面板（ctx=panel），钉在浏览器右侧；
  // standalone —— 兜底独立标签页，380px 居中面板 + 坐标纸底纹；
  // （iframe 注入方案已移除。）
  const isPanel = new URLSearchParams(window.location.search).get('ctx') === 'panel';
  const standalone = !isPanel;
  const [panelError, setPanelError] = useState('');

  const openPanel = async () => {
    try {
      const result = (await chrome.runtime.sendMessage({ type: 'OPEN_PANEL' })) as {
        ok: boolean;
        message?: string;
      };
      if (!result?.ok) setPanelError(result?.message ?? '打开面板失败');
    } catch (error) {
      setPanelError(error instanceof Error ? error.message : '打开面板失败');
    }
  };

  return (
    <div className={`cm-stage ${standalone ? 'is-standalone' : ''}`}>
    <div className={`cm-app ${standalone ? 'is-standalone' : ''}`}>
      {/* 面板模式已有 Chrome 原生标题栏（显示扩展名 + 固定/关闭），
          再放一个品牌条就是重复，把 44px 让给内容。独立标签页没有原生栏，才需要。 */}
      {standalone && <Header />}
      {standalone && (
        <div className="cm-mode-hint">
          <span>独立窗口模式 ·</span>
          <button onClick={() => void openPanel()}>打开侧边面板 →</button>
        </div>
      )}
      {standalone && panelError && (
        <div className="cm-error" style={{ margin: 0, fontSize: 10.5 }}>
          {panelError}
        </div>
      )}
      {view.name === 'recipe' ? (
        <Steps current={2} labels={['圈选', '识别结果', '试跑保存']} />
      ) : (
        <Tabs
          active={tabKey}
          onChange={(tab) => {
            if (tab === 'settings') setView({ name: 'settings' });
            else if (tab === 'project') setView({ name: 'projects' });
            else if (tab === 'clip') setView({ name: 'clips' });
            else setView({ name: 'today' });
          }}
        />
      )}
      {renderView()}
    </div>
    </div>
  );
}

export { EMPTY_RECIPE };

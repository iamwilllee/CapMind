import { BookOpen, Camera, Languages, Settings } from 'lucide-react';
import { useTranslation } from '../../../src/i18n';

type TabType = 'overview' | 'capture' | 'vocabulary' | 'settings';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const getMainTabs = (t: (key: string) => string) => [
  { id: 'overview' as const, label: t('tabs.overview'), icon: BookOpen },
  { id: 'capture' as const, label: t('tabs.capture'), icon: Camera },
  { id: 'vocabulary' as const, label: t('tabs.translate'), icon: Languages }
];

const settingsTab = { id: 'settings' as const, icon: Settings };

export const TabNavigation = ({ activeTab, onTabChange }: TabNavigationProps) => {
  const { t } = useTranslation();
  const mainTabs = getMainTabs(t);
  
  return (
    <div className="flex border-b border-gray-200">
      {/* 主要标签页 */}
      {mainTabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === id
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Icon className="w-4 h-4" />
          <span>{label}</span>
        </button>
      ))}
      
      {/* 设置按钮 - 右对齐 */}
      <button
        onClick={() => onTabChange('settings')}
        className={`flex items-center justify-center p-3 text-sm font-medium transition-colors ${
          activeTab === 'settings'
            ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
        }`}
        title={t('tabs.settings')}
      >
        <settingsTab.icon className="w-4 h-4" />
      </button>
    </div>
  );
};

export type { TabType };
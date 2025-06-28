import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { TabNavigation } from './components/TabNavigation';
import { OverviewTab } from './components/tabs/OverviewTab';
import { VocabularyTab } from './components/tabs/VocabularyTab';
import { CaptureTab } from './components/tabs/CaptureTab';
import { SettingsTab } from './components/tabs/SettingsTab';
import { BottomActionBar } from './components/BottomActionBar';
import { ChatDrawer } from './components/ChatDrawer';
import { ThemeProvider, useTheme } from '../../src/contexts/ThemeContext';
import { type TabType } from './components';

interface AppContentProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  handleClose: () => void;
  handleAskAI: () => void;
  isChatDrawerOpen: boolean;
  handleCloseChatDrawer: () => void;
  renderTabContent: () => React.ReactNode;
}

const AppContent: React.FC<AppContentProps> = ({
  activeTab,
  setActiveTab,
  handleClose,
  handleAskAI,
  isChatDrawerOpen,
  handleCloseChatDrawer,
  renderTabContent
}) => {
  const { actualTheme } = useTheme();

  // 强制应用主题到容器元素
  useEffect(() => {
    const container = document.querySelector('#root');
    if (container) {
      container.className = actualTheme === 'dark' ? 'dark' : 'light';
    }
  }, [actualTheme]);

  return (
    <div className={`h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col overflow-hidden ${actualTheme}`}>
      <Header onClose={handleClose} />
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white dark:bg-zinc-950">
        {renderTabContent()}
      </div>
      
      <BottomActionBar onAskAI={handleAskAI} />
      
      {isChatDrawerOpen && (
        <ChatDrawer 
          isOpen={isChatDrawerOpen} 
          onClose={handleCloseChatDrawer} 
        />
      )}
    </div>
  );
};

export default () => {
  const [captureData, setCaptureData] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);

  useEffect(() => {
    // 监听来自 content script 的消息
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'CAPTURE_DATA') {
        setCaptureData(event.data.data);
        setActiveTab('capture');
      }
    };

    // 监听切换到设置页面的事件
    const handleSwitchToSettings = () => {
      setActiveTab('settings');
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('switchToSettings', handleSwitchToSettings);
    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('switchToSettings', handleSwitchToSettings);
    };
  }, []);

  const handleSmartCapture = () => {
    setIsCapturing(true);
    // 发送消息给 content script 开始智能截图
    window.parent.postMessage({ type: 'START_SMART_CAPTURE' }, '*');
    setTimeout(() => setIsCapturing(false), 2000);
  };

  const handleClose = () => {
    window.parent.postMessage({ type: 'CLOSE_SIDEBAR' }, '*');
  };

  const handleAskAI = () => {
    setIsChatDrawerOpen(true);
  };

  const handleCloseChatDrawer = () => {
    setIsChatDrawerOpen(false);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab />;
      case 'capture':
        return (
          <CaptureTab
            captureData={captureData}
            isCapturing={isCapturing}
            onSmartCapture={handleSmartCapture}
          />
        );
      case 'vocabulary':
        return <VocabularyTab />;
      case 'settings':
        return <SettingsTab />;
      default:
        return <OverviewTab />;
    }
  };

  return (
    <ThemeProvider>
      <AppContent 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        handleClose={handleClose}
        handleAskAI={handleAskAI}
        isChatDrawerOpen={isChatDrawerOpen}
        handleCloseChatDrawer={handleCloseChatDrawer}
        renderTabContent={renderTabContent}
      />
    </ThemeProvider>
  );
};

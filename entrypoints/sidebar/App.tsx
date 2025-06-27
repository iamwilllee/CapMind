import { useState, useEffect } from 'react';
import {
  Header,
  TabNavigation,
  BottomActionBar,
  ChatDrawer,
  OverviewTab,
  CaptureTab,
  VocabularyTab,
  SettingsTab,
  type TabType,
  type Word
} from './components';

export default () => {
  const [captureData, setCaptureData] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isCapturing, setIsCapturing] = useState(false);
  const [savedWords, setSavedWords] = useState<Word[]>([]);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);

  useEffect(() => {
    // 监听来自 content script 的消息
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'CAPTURE_DATA') {
        setCaptureData(event.data.data);
        setActiveTab('capture');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
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
        return <VocabularyTab savedWords={savedWords} />;
      case 'settings':
        return <SettingsTab />;
      default:
        return <OverviewTab />;
    }
  };

  return (
    <div className="w-full h-dvh bg-white flex flex-col overflow-hidden">
      <Header onClose={handleClose} />
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {renderTabContent()}
      </div>
      
      <BottomActionBar onAskAI={handleAskAI} />
      
      <ChatDrawer 
        isOpen={isChatDrawerOpen} 
        onClose={handleCloseChatDrawer} 
      />
    </div>
  );
};

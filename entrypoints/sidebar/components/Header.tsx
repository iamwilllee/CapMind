import { Brain, X, Pin, PinOff } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from '../../../src/i18n';

interface HeaderProps {
  onClose: () => void;
}

export const Header = ({ onClose }: HeaderProps) => {
  const [isPinned, setIsPinned] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    // 监听钉住状态变化
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'PIN_MODE_CHANGED') {
        setIsPinned(event.data.isPinned);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleTogglePin = () => {
    // 发送消息给 content script 切换钉住模式
    window.parent.postMessage({ type: 'TOGGLE_PIN_MODE' }, '*');
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
      <div className="flex items-center space-x-2">
        <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
          <Brain className="w-4 h-4 text-white" />
        </div>
        <h1 className="text-lg font-semibold text-gray-900">CapMind</h1>
      </div>
      <div className="flex items-center space-x-2">
        <button 
          onClick={handleTogglePin} 
          className={`p-1 hover:bg-gray-100 rounded transition-colors ${
            isPinned ? 'text-blue-600' : 'text-gray-500'
          }`}
          title={isPinned ? t('header.unpin') : t('header.pin')}
        >
          {isPinned ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
        </button>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>
    </div>
  );
};
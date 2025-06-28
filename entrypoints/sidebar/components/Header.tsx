import { Brain, X, Pin, PinOff } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from '../../../i18n';

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
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-950">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">CapMind</h1>
      </div>
      <div className="flex items-center space-x-1">
        <button 
          onClick={handleTogglePin} 
          className={`p-2 hover:bg-gray-100 dark:hover:bg-zinc-800/50 rounded-lg transition-all duration-200 cursor-pointer ${
            isPinned ? 'text-blue-400' : 'text-gray-600 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-300'
          }`}
          title={isPinned ? t('common.unpin') : t('common.pin')}
        >
          {isPinned ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
        </button>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800/50 rounded-lg transition-all duration-200 cursor-pointer">
          <X className="w-4 h-4 text-gray-600 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-300" />
        </button>
      </div>
    </div>
  );
};
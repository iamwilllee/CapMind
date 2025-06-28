import React from 'react';
import { Brain } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { useTranslation } from '../../../i18n';

interface BottomActionBarProps {
  onAskAI: () => void;
}

export const BottomActionBar: React.FC<BottomActionBarProps> = ({ onAskAI }) => {
  const { t } = useTranslation();
  
  return (
    <div className="border-t border-gray-200 dark:border-zinc-800/50 p-4 bg-white dark:bg-zinc-950">
      <div className="flex items-center justify-center">
        <Button
          variant="ghost"
          onClick={onAskAI}
          className="flex w-full cursor-pointer items-center justify-center space-x-2 rounded-4xl bg-black px-4 py-2 text-sm/6 font-semibold text-white hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600"
        >
          <Brain className="w-5 h-5 text-white" />
          <span className="text-sm font-medium text-white">{t('bottomBar.askAI')}</span>
        </Button>
      </div>
    </div>
  );
};
import { Brain } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { useTranslation } from '../../../src/i18n';

interface BottomActionBarProps {
  onAskAI: () => void;
}

export const BottomActionBar: React.FC<BottomActionBarProps> = ({ onAskAI }) => {
  const { t } = useTranslation();
  
  return (
    <div className="border-t border-gray-200 p-3">
      <div className="flex items-center justify-center">
        <Button
          variant="ghost"
          onClick={onAskAI}
          className="flex w-full cursor-pointer items-center space-x-2 bg-gray-100 hover:bg-gray-200 rounded-full px-4 py-2 transition-colors"
        >
          <Brain className="w-4 h-4 text-gray-600" />
          <span className="text-sm text-gray-600">{t('bottomBar.askAI')}</span>
        </Button>
      </div>
    </div>
  );
};
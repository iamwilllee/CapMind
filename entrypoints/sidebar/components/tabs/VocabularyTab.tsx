import { Brain, BookOpen, Star } from 'lucide-react';

interface Word {
  id: string;
  word: string;
  definition: string;
  pronunciation: string;
  timestamp: number;
}

interface VocabularyTabProps {
  savedWords: Word[];
}

export const VocabularyTab = ({ savedWords }: VocabularyTabProps) => {
  return (
    <div className="p-4">
      <div className="flex items-center space-x-2 mb-4">
        <Brain className="w-5 h-5 text-purple-600" />
        <h2 className="text-lg font-semibold text-gray-900">词汇学习</h2>
      </div>
      
      {savedWords.length === 0 ? (
        <div className="text-center py-8">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">暂无保存的词汇</p>
          <p className="text-gray-400 text-xs mt-1">使用智能截图功能识别文本中的生词</p>
        </div>
      ) : (
        <div className="space-y-3">
          {savedWords.map((word) => (
            <div key={word.id} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">{word.word}</h3>
                <Star className="w-4 h-4 text-yellow-500" />
              </div>
              <p className="text-sm text-gray-600 mb-1">{word.pronunciation}</p>
              <p className="text-sm text-gray-700">{word.definition}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export type { Word };
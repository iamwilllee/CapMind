import { BookOpen, Sparkles } from 'lucide-react';

export const OverviewTab = () => {
  return (
    <div className="p-4">
      <div className="flex items-center space-x-2 mb-4">
        <BookOpen className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-900">Overview</h2>
      </div>
      
      <div className="space-y-4">
        <p className="text-sm text-gray-600 leading-relaxed">
          Lexical 画廊展示了编辑器示例，包括收藏和开源等过滤器。它还展示了表情符号插件，用于实时协作的协作富文本插件以及表格插件，演示了各种编辑器功能。
        </p>
        
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-3 flex items-center">
            <Sparkles className="w-4 h-4 mr-2" />
            Lexical 画廊功能
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div>
                <h4 className="font-medium text-blue-800 mb-1">过滤器</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• 画廊包含收藏和开源示例的过滤器。</li>
                  <li>• 它总共展示了3个示例。</li>
                </ul>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div>
                <h4 className="font-medium text-blue-800 mb-1">插件示例</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• EmojiPlugin：演示如何在编辑器中创建表情符号。</li>
                  <li>• Collab RichText：教授如何在编辑器中实现实时协作。</li>
                  <li>• TablePlugin：指导如何在编辑器中实现表格功能。</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
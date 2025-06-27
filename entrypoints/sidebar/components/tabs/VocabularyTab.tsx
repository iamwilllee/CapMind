import React, { useState, useEffect } from 'react';
import { TranslationResult, TranslationService } from '../../../../lib/translation-service';

interface VocabularyTabProps {
  // 保持接口兼容性，但不再使用savedWords
  savedWords?: any[];
}

export const VocabularyTab = ({ savedWords }: VocabularyTabProps) => {
  const [translations, setTranslations] = useState<TranslationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBilingualMode, setIsBilingualMode] = useState(true);
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [pageTitle, setPageTitle] = useState<string>('');
  const [pageFavicon, setPageFavicon] = useState<string>('');
  const [targetLanguage, setTargetLanguage] = useState<string>('zh');
  const [detectedLanguage, setDetectedLanguage] = useState<string>('');
  const [translationProgress, setTranslationProgress] = useState<{
    total: number;
    completed: number;
    isTranslating: boolean;
  }>({ total: 0, completed: 0, isTranslating: false });

  useEffect(() => {
    // 通过消息获取当前页面信息
    window.parent.postMessage({ type: 'GET_CURRENT_URL' }, '*');
    window.parent.postMessage({ type: 'GET_PAGE_INFO' }, '*');
    
    // 监听响应
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'CURRENT_URL_RESPONSE') {
        setCurrentUrl(event.data.url);
      } else if (event.data.type === 'PAGE_INFO_RESPONSE') {
        setPageTitle(event.data.title || '');
        setPageFavicon(event.data.favicon || '');
        // 检测页面标题语言并设置默认目标语言
        if (event.data.title) {
          const detected = TranslationService.detectLanguage(event.data.title);
          setDetectedLanguage(detected);
          // 根据检测到的语言设置默认目标语言
          if (detected === 'zh') {
            setTargetLanguage('en'); // 中文页面默认翻译为英文
          } else if (detected === 'en') {
            setTargetLanguage('zh'); // 英文页面默认翻译为中文
          } else {
            setTargetLanguage('zh'); // 其他语言默认翻译为中文
          }
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    // 清理函数
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleTranslatePage = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 通过消息请求页面内容
      window.parent.postMessage({ type: 'GET_PAGE_CONTENT' }, '*');
      
      // 等待页面内容响应
      const pageTexts = await new Promise<string[]>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('获取页面内容超时'));
        }, 10000);
        
        const handleMessage = (event: MessageEvent) => {
          if (event.data.type === 'PAGE_CONTENT_RESPONSE') {
            clearTimeout(timeout);
            window.removeEventListener('message', handleMessage);
            resolve(event.data.texts || []);
          }
        };
        
        window.addEventListener('message', handleMessage);
      });
      
      if (pageTexts.length === 0) {
        throw new Error('未找到可翻译的文本内容');
      }
      
      // 检测页面主要语言
      const pageLanguage = TranslationService.detectPageLanguage(pageTexts);
      let actualTargetLanguage = targetLanguage; // 使用局部变量存储实际的目标语言
      
      if (pageLanguage !== 'auto' && pageLanguage !== detectedLanguage) {
        setDetectedLanguage(pageLanguage);
        // 根据检测到的页面语言重新设置目标语言
        if (pageLanguage === 'zh') {
          actualTargetLanguage = 'en';
          setTargetLanguage('en');
        } else if (pageLanguage === 'en') {
          actualTargetLanguage = 'zh';
          setTargetLanguage('zh');
        } else {
          actualTargetLanguage = 'zh'; // 其他语言默认翻译为中文
          setTargetLanguage('zh');
        }
      }
      
      // 初始化翻译进度
      setTranslationProgress({
        total: pageTexts.length,
        completed: 0,
        isTranslating: true
      });
      setTranslations([]); // 清空之前的翻译结果
      
      // 翻译文本 - 实时显示
      const translationResults: TranslationResult[] = [];
      
      for (let i = 0; i < pageTexts.length; i++) {
        const text = pageTexts[i];
        try {
          const result = await TranslationService.translateText(text, {
            targetLanguage: actualTargetLanguage, // 使用局部变量而不是状态值
            sourceLanguage: 'auto'
          });
          translationResults.push(result);
          
          // 立即更新界面显示
          setTranslations([...translationResults]);
          setTranslationProgress(prev => ({
            ...prev,
            completed: i + 1
          }));
          
          // 添加延迟避免API限制
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.error(`翻译失败: ${text}`, error);
          // 即使翻译失败也要更新进度
          setTranslationProgress(prev => ({
            ...prev,
            completed: i + 1
          }));
        }
      }
      
      // 翻译完成
      setTranslationProgress(prev => ({
        ...prev,
        isTranslating: false
      }));
      
    } catch (error) {
      console.error('翻译页面失败:', error);
      setError(error instanceof Error ? error.message : '翻译失败');
      // 重置翻译进度状态
      setTranslationProgress(prev => ({
        ...prev,
        isTranslating: false
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const toggleBilingualMode = () => {
    setIsBilingualMode(!isBilingualMode);
  };

  return (
    <div className="p-4 space-y-4">
      {/* 语言选择器 */}
      <div className="flex items-center justify-between space-x-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">检测语言:</span>
          {detectedLanguage && (
            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
              {
                detectedLanguage === 'zh' ? '中文' :
                detectedLanguage === 'en' ? 'English' :
                detectedLanguage === 'ja' ? '日语' :
                detectedLanguage === 'ko' ? '한국어' :
                detectedLanguage === 'fr' ? '法语' :
                detectedLanguage === 'de' ? '德语' :
                detectedLanguage === 'es' ? '西班牙语' :
                detectedLanguage === 'ar' ? '阿拉伯语' :
                detectedLanguage === 'ru' ? '俄语' :
                detectedLanguage === 'th' ? '泰语' : '其他'
              }
            </span>
          )}
        </div>
        <span className="text-gray-500 mx-2">→</span>
        <div className="flex items-center space-x-2">
          <select
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            title="选择目标语言"
          >
            <option value="zh">中文</option>
             <option value="en">English</option>
             <option value="ja">日语</option>
             <option value="ko">한국어</option>
             <option value="fr">Français</option>
             <option value="de">Deutsch</option>
             <option value="es">Español</option>
             <option value="ar">العربية</option>
             <option value="ru">Русский</option>
             <option value="th">ไทย</option>
          </select>
          
          <button
            onClick={toggleBilingualMode}
            className={`p-2 rounded-lg transition-colors ${
              isBilingualMode 
                ? 'bg-blue-100 text-blue-600' 
                : 'bg-gray-100 text-gray-600'
            }`}
            title={isBilingualMode ? '切换到单语模式' : '切换到双语模式'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </button>
          
          <button
            onClick={handleTranslatePage}
            disabled={isLoading || translationProgress.isTranslating}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading || translationProgress.isTranslating ? '翻译中...' : '翻译页面'}
          </button>
        </div>
      </div>
      
      {/* 网址显示 */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="flex items-center space-x-2 mb-2">
          {pageFavicon && (
            <img 
              src={pageFavicon} 
              alt="favicon" 
              className="w-4 h-4"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
          <span className="text-sm font-medium text-gray-800 truncate">
            {pageTitle || '当前页面'}
          </span>
        </div>
        <div className="text-xs text-gray-500 break-all">
          {currentUrl || '获取页面信息中...'}
        </div>
      </div>
      
      {/* 翻译进度条 */}
      {translationProgress.isTranslating && (
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-blue-700">翻译进度</span>
            <span className="text-xs text-blue-600">
              {translationProgress.completed}/{translationProgress.total}
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${(translationProgress.completed / translationProgress.total) * 100}%` 
              }}
            ></div>
          </div>
        </div>
      )}
      
      {/* 错误信息 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
      
      {/* 翻译结果 */}
      <div className="space-y-3">
        {translations.length === 0 && !translationProgress.isTranslating && (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10m0 0V6a2 2 0 00-2-2H9a2 2 0 00-2 2v2m10 0v10a2 2 0 01-2 2H9a2 2 0 01-2-2V8m10 0H7" />
            </svg>
            <p className="text-sm">点击翻译页面开始翻译</p>
          </div>
        )}
        
        {/* 显示已完成的翻译结果 */}
        {translations.map((translation, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
            {isBilingualMode ? (
              <div className="space-y-2">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">原文:</span> {translation.originalText}
                </div>
                <div className="text-sm text-gray-800">
                  <span className="font-medium">译文:</span> {translation.translatedText}
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-800">
                {translation.translatedText}
              </div>
            )}
          </div>
        ))}
        
        {/* 翻译中的骨架屏 */}
        {translationProgress.isTranslating && (
          <>
            {Array.from({ length: Math.min(3, translationProgress.total - translationProgress.completed) }).map((_, index) => (
              <div key={`skeleton-${index}`} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
                {isBilingualMode ? (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="h-3 bg-gray-200 rounded w-12"></div>
                      <div className="h-3 bg-gray-300 rounded flex-1"></div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="h-3 bg-gray-200 rounded w-12"></div>
                      <div className="h-3 bg-gray-300 rounded flex-1"></div>
                    </div>
                  </div>
                ) : (
                  <div className="h-3 bg-gray-300 rounded w-full"></div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export type { VocabularyTabProps };
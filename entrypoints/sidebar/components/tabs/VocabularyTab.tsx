import React, { useState, useEffect } from 'react';
import { TranslationResult, TranslationService } from '../../../../lib/translation-service';

// TTS 服务
class TTSService {
  private static synthesis = window.speechSynthesis;
  
  static speak(text: string, lang: string = 'en-US') {
    // 停止当前播放
    this.synthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.8;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    this.synthesis.speak(utterance);
  }
  
  static stop() {
    this.synthesis.cancel();
  }
  
  static isSupported() {
    return 'speechSynthesis' in window;
  }
}

export const VocabularyTab = () => {
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
  const [playingIndex, setPlayingIndex] = useState<string | null>(null);

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

  // TTS 播放控制
  const handlePlayTTS = (text: string, index: string, language: string = 'en') => {
    if (playingIndex === index) {
      // 如果正在播放同一个，则停止
      TTSService.stop();
      setPlayingIndex(null);
    } else {
      // 先停止当前播放的语音
      if (playingIndex) {
        TTSService.stop();
      }
      
      // 播放新的
      setPlayingIndex(index);
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'zh' ? 'zh-CN' : 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      utterance.onend = () => {
        setPlayingIndex(null);
      };
      
      utterance.onerror = () => {
        setPlayingIndex(null);
      };
      
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="p-4 space-y-4">

      
      {/* 网址区块 */}
      <div className="bg-gradient-to-r from-white to-blue-50 border border-blue-200 rounded-xl p-5 mb-6 shadow-sm">
        <div className="flex items-center space-x-3 mb-4">
          {pageFavicon && (
            <img src={pageFavicon} alt="" className="w-5 h-5 flex-shrink-0 rounded" />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 truncate mb-1">
              {pageTitle || '未知页面'}
            </h3>
            <p className="text-xs text-gray-500 truncate bg-gray-100 px-2 py-1 rounded-md">{currentUrl}</p>
          </div>
        </div>
        
        {/* 翻译进度条 */}
        {translationProgress.isTranslating && (
          <div className="mb-4 bg-white rounded-lg p-3 border border-blue-100">
            <div className="flex justify-between text-xs text-gray-700 mb-2 font-medium">
              <span className="flex items-center">
                <svg className="w-3 h-3 mr-1 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                翻译进度
              </span>
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">
                {translationProgress.completed}/{translationProgress.total}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out" 
                style={{ 
                  width: `${translationProgress.total > 0 ? (translationProgress.completed / translationProgress.total) * 100 : 0}%` 
                }}
              ></div>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* 语言选择 */}
            <div className="flex items-center space-x-2 bg-white rounded-lg p-2 border border-gray-200">
              <span className="text-xs text-gray-600 font-medium px-2 py-1 bg-gray-100 rounded">
                {detectedLanguage === 'zh' ? '🇨🇳 中文' : 
                 detectedLanguage === 'en' ? '🇺🇸 English' : 
                 detectedLanguage === 'ja' ? '🇯🇵 日本語' : 
                 detectedLanguage === 'ko' ? '🇰🇷 한국어' : 
                 detectedLanguage === 'fr' ? '🇫🇷 Français' : 
                 detectedLanguage === 'de' ? '🇩🇪 Deutsch' : 
                 detectedLanguage === 'es' ? '🇪🇸 Español' : '🔍 自动检测'}
              </span>
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <select 
                value={targetLanguage} 
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="text-xs border-0 bg-transparent focus:outline-none font-medium text-gray-700"
              >
                <option value="zh">🇨🇳 中文</option>
                <option value="en">🇺🇸 English</option>
                <option value="ja">🇯🇵 日本語</option>
                <option value="ko">🇰🇷 한국어</option>
                <option value="fr">🇫🇷 Français</option>
                <option value="de">🇩🇪 Deutsch</option>
                <option value="es">🇪🇸 Español</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* 显示隐藏按钮 */}
            <button
              onClick={toggleBilingualMode}
              className={`p-2 rounded-lg transition-all duration-200 ${
                isBilingualMode 
                  ? 'bg-blue-500 text-white shadow-md hover:bg-blue-600' 
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
              title={isBilingualMode ? '隐藏原文' : '显示原文'}
            >
              {isBilingualMode ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                </svg>
              )}
            </button>
            
            {/* 翻译按钮 */}
            <button
              onClick={handleTranslatePage}
              disabled={isLoading || translationProgress.isTranslating}
              className={`px-4 py-2 rounded-lg font-medium text-xs transition-all duration-200 ${
                isLoading || translationProgress.isTranslating
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-md hover:shadow-lg'
              }`}
            >
              <div className="flex items-center space-x-1">
                {isLoading || translationProgress.isTranslating ? (
                  <>
                    <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>翻译中</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                    <span>翻译</span>
                  </>
                )}
              </div>
            </button>
          </div>
        </div>
      </div>
      
      {/* 错误信息 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
      
      {/* 翻译结果 */}
      <div className="space-y-3">
        {translations.length === 0 && !translationProgress.isTranslating && (
          <div className="text-center py-12 px-6">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-8 border border-blue-200">
              <div className="bg-white rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">准备开始翻译</h3>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                点击上方的翻译按钮，开始翻译当前页面的内容
              </p>
              <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span>智能语言检测</span>
                </div>
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                  </svg>
                  <span>语音朗读</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* 显示已完成的翻译结果 */}
        {translations.map((translation, index) => {
          const isOriginalEnglish = /^[a-zA-Z\s\.,!?;:"'()\-\d]+$/.test(translation.originalText.trim());
          const isTranslatedEnglish = /^[a-zA-Z\s\.,!?;:"'()\-\d]+$/.test(translation.translatedText.trim());
          
          return (
            <div key={index} className="bg-gradient-to-r from-white to-gray-50 border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
              {isBilingualMode ? (
                <div className="space-y-4">
                  {/* 原文 */}
                  <div className="bg-blue-50 rounded-lg p-3 border-l-4 border-blue-400">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-xs text-blue-600 font-medium mb-1 uppercase tracking-wide">原文</div>
                        <div className="text-sm text-gray-800 leading-relaxed">{translation.originalText}</div>
                      </div>
                      {isOriginalEnglish && TTSService.isSupported() && (
                        <button
                          onClick={() => handlePlayTTS(translation.originalText, `orig-${index}`, 'en')}
                          className={`ml-3 p-2 rounded-full transition-all duration-200 ${
                            playingIndex === `orig-${index}` 
                              ? 'bg-blue-500 text-white shadow-lg' 
                              : 'bg-white text-blue-500 hover:bg-blue-100 border border-blue-200'
                          }`}
                          title="朗读原文"
                        >
                          {playingIndex === `orig-${index}` ? (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* 译文 */}
                  <div className="bg-green-50 rounded-lg p-3 border-l-4 border-green-400">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-xs text-green-600 font-medium mb-1 uppercase tracking-wide">译文</div>
                        <div className="text-sm text-gray-800 leading-relaxed">{translation.translatedText}</div>
                      </div>
                      {isTranslatedEnglish && TTSService.isSupported() && (
                        <button
                          onClick={() => handlePlayTTS(translation.translatedText, `trans-${index}`, targetLanguage)}
                          className={`ml-3 p-2 rounded-full transition-all duration-200 ${
                            playingIndex === `trans-${index}` 
                              ? 'bg-green-500 text-white shadow-lg' 
                              : 'bg-white text-green-500 hover:bg-green-100 border border-green-200'
                          }`}
                          title="朗读译文"
                        >
                          {playingIndex === `trans-${index}` ? (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-gray-400">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm text-gray-800 leading-relaxed">{translation.translatedText}</div>
                    </div>
                    {isTranslatedEnglish && TTSService.isSupported() && (
                      <button
                        onClick={() => handlePlayTTS(translation.translatedText, `single-${index}`, targetLanguage)}
                        className={`ml-3 p-2 rounded-full transition-all duration-200 ${
                          playingIndex === `single-${index}` 
                            ? 'bg-gray-500 text-white shadow-lg' 
                            : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
                        }`}
                        title="朗读文本"
                      >
                        {playingIndex === `single-${index}` ? (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        
        {/* 翻译中的骨架屏 */}
        {translationProgress.isTranslating && (
          <>
            {Array.from({ length: Math.min(3, translationProgress.total - translationProgress.completed) }).map((_, index) => (
              <div key={`skeleton-${index}`} className="bg-gradient-to-r from-white to-gray-50 border border-gray-200 rounded-xl p-5 shadow-sm animate-pulse">
                {isBilingualMode ? (
                  <div className="space-y-4">
                    {/* 原文骨架 */}
                    <div className="bg-blue-50 rounded-lg p-3 border-l-4 border-blue-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="h-3 bg-blue-200 rounded w-12 mb-2"></div>
                          <div className="space-y-2">
                            <div className="h-3 bg-gray-300 rounded w-full"></div>
                            <div className="h-3 bg-gray-300 rounded w-3/4"></div>
                          </div>
                        </div>
                        <div className="ml-3 w-8 h-8 bg-gray-200 rounded-full"></div>
                      </div>
                    </div>
                    
                    {/* 译文骨架 */}
                    <div className="bg-green-50 rounded-lg p-3 border-l-4 border-green-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="h-3 bg-green-200 rounded w-12 mb-2"></div>
                          <div className="space-y-2">
                            <div className="h-3 bg-gray-300 rounded w-full"></div>
                            <div className="h-3 bg-gray-300 rounded w-2/3"></div>
                          </div>
                        </div>
                        <div className="ml-3 w-8 h-8 bg-gray-200 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-gray-300 rounded w-full"></div>
                        <div className="h-3 bg-gray-300 rounded w-3/4"></div>
                      </div>
                      <div className="ml-3 w-8 h-8 bg-gray-200 rounded-full"></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};
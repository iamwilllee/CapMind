import React, { useState, useEffect } from 'react';
import { TranslationResult, TranslationService } from '../../../../lib/translation-service';
import { useTranslation } from '../../../../src/i18n';

// TTS Service
class TTSService {
  private static synthesis = window.speechSynthesis;
  
  static speak(text: string, lang: string = 'en-US') {
    // Stop current playback
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
  const { t } = useTranslation();
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
    // Get current page information through messages
    window.parent.postMessage({ type: 'GET_CURRENT_URL' }, '*');
    window.parent.postMessage({ type: 'GET_PAGE_INFO' }, '*');
    
    // Listen for responses
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'CURRENT_URL_RESPONSE') {
        setCurrentUrl(event.data.url);
      } else if (event.data.type === 'PAGE_INFO_RESPONSE') {
        setPageTitle(event.data.title || '');
        setPageFavicon(event.data.favicon || '');
        // Detect page title language and set default target language
        if (event.data.title) {
          const detected = TranslationService.detectLanguage(event.data.title);
          setDetectedLanguage(detected);
          // Set default target language based on detected language
          if (detected === 'zh') {
            setTargetLanguage('en'); // Chinese pages default to English translation
          } else if (detected === 'en') {
            setTargetLanguage('zh'); // English pages default to Chinese translation
          } else {
            setTargetLanguage('zh'); // Other languages default to Chinese translation
          }
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    // Cleanup function
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleTranslatePage = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Request page content through messages
      window.parent.postMessage({ type: 'GET_PAGE_CONTENT' }, '*');
      
      // Wait for page content response
      const pageTexts = await new Promise<string[]>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(t('vocabulary.errors.timeout')));
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
        throw new Error(t('vocabulary.errors.noContent'));
      }
      
      // Detect main page language
      const pageLanguage = TranslationService.detectPageLanguage(pageTexts);
      let actualTargetLanguage = targetLanguage; // Use local variable to store actual target language
      
      if (pageLanguage !== 'auto' && pageLanguage !== detectedLanguage) {
        setDetectedLanguage(pageLanguage);
        // Reset target language based on detected page language
        if (pageLanguage === 'zh') {
          actualTargetLanguage = 'en';
          setTargetLanguage('en');
        } else if (pageLanguage === 'en') {
          actualTargetLanguage = 'zh';
          setTargetLanguage('zh');
        } else {
          actualTargetLanguage = 'zh'; // Other languages default to Chinese translation
          setTargetLanguage('zh');
        }
      }
      
      // Initialize translation progress
      setTranslationProgress({
        total: pageTexts.length,
        completed: 0,
        isTranslating: true
      });
      setTranslations([]); // Clear previous translation results
      
      // Translate text - real-time display
      const translationResults: TranslationResult[] = [];
      
      for (let i = 0; i < pageTexts.length; i++) {
        const text = pageTexts[i];
        try {
          const result = await TranslationService.translateText(text, {
            targetLanguage: actualTargetLanguage, // Use local variable instead of state value
            sourceLanguage: 'auto'
          });
          translationResults.push(result);
          
          // Update UI immediately
          setTranslations([...translationResults]);
          setTranslationProgress(prev => ({
            ...prev,
            completed: i + 1
          }));
          
          // Add delay to avoid API limits
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.error(`${t('vocabulary.errors.translationFailed')}: ${text}`, error);
          // Update progress even if translation fails
          setTranslationProgress(prev => ({
            ...prev,
            completed: i + 1
          }));
        }
      }
      
      // Translation completed
      setTranslationProgress(prev => ({
        ...prev,
        isTranslating: false
      }));
      
    } catch (error) {
      console.error(t('vocabulary.errors.pageTranslationFailed'), error);
      setError(error instanceof Error ? error.message : t('vocabulary.errors.translationFailed'));
      // Reset translation progress state
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

  // TTS playback control
  const handlePlayTTS = (text: string, index: string, language: string = 'en') => {
    if (playingIndex === index) {
      // If playing the same one, stop it
      TTSService.stop();
      setPlayingIndex(null);
    } else {
      // First stop currently playing speech
      if (playingIndex) {
        TTSService.stop();
      }
      
      // Play new one
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

      
      {/* URL block */}
      <div className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800/50 dark:to-gray-700/50 border border-gray-200 dark:border-gray-600/30 rounded-xl p-5 mb-6 shadow-lg backdrop-blur-sm">
        <div className="flex items-center space-x-3 mb-4">
          {pageFavicon && (
            <img src={pageFavicon} alt="" className="w-5 h-5 flex-shrink-0 rounded" />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate mb-1">
              {pageTitle || t('vocabulary.unknownPage')}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate bg-gray-200 dark:bg-gray-700/50 px-2 py-1 rounded-md">{currentUrl}</p>
          </div>
        </div>
        
        {/* Translation progress bar */}
        {translationProgress.isTranslating && (
          <div className="mb-4 bg-gray-100 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-600/30 backdrop-blur-sm">
            <div className="flex justify-between text-xs text-gray-700 dark:text-gray-300 mb-2 font-medium">
              <span className="flex items-center">
                <svg className="w-3 h-3 mr-1 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                {t('vocabulary.translationProgress')}
              </span>
              <span className="bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full text-xs">
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
            {/* Language selection */}
            <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800/50 rounded-lg p-2 border border-gray-200 dark:border-gray-600/30 backdrop-blur-sm">
              <span className="text-xs text-gray-700 dark:text-gray-300 font-medium px-2 py-1 bg-gray-200 dark:bg-gray-700/50 rounded">
                {detectedLanguage === 'zh' ? '🇨🇳 中文' : 
                 detectedLanguage === 'en' ? '🇺🇸 English' : 
                 detectedLanguage === 'ja' ? '🇯🇵 日本語' : 
                 detectedLanguage === 'ko' ? '🇰🇷 한국어' : 
                 detectedLanguage === 'fr' ? '🇫🇷 Français' : 
                 detectedLanguage === 'de' ? '🇩🇪 Deutsch' : 
                 detectedLanguage === 'es' ? '🇪🇸 Español' : '🔍 ' + t('vocabulary.autoDetect')}
              </span>
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <select 
                value={targetLanguage} 
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="text-xs border-0 bg-transparent focus:outline-none font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
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
            {/* Show/hide button */}
            <button
              onClick={toggleBilingualMode}
              className={`p-2 rounded-lg transition-all duration-200 cursor-pointer ${
                isBilingualMode 
                  ? 'bg-blue-500 text-white shadow-md hover:bg-blue-600' 
                  : 'bg-gray-200 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600/30 hover:bg-gray-300 dark:hover:bg-gray-600/50 backdrop-blur-sm'
              }`}
              title={isBilingualMode ? t('vocabulary.hideOriginal') : t('vocabulary.showOriginal')}
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
            
            {/* Translation button */}
            <button
              onClick={handleTranslatePage}
              disabled={isLoading || translationProgress.isTranslating}
              className={`px-4 py-2 rounded-lg font-medium text-xs transition-all duration-200 ${
                isLoading || translationProgress.isTranslating
                  ? 'bg-gray-300 dark:bg-gray-600/50 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-md hover:shadow-lg cursor-pointer'
              }`}
            >
              <div className="flex items-center space-x-1">
                {isLoading || translationProgress.isTranslating ? (
                  <>
                    <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{t('common.translating')}</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                    <span>{t('common.translate')}</span>
                  </>
                )}
              </div>
            </button>
          </div>
        </div>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
      
      {/* Translation results */}
      <div className="space-y-3">
        {translations.length === 0 && !translationProgress.isTranslating && (
          <div className="text-center py-12 px-6">
            <div className="bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800/50 dark:to-gray-700/50 rounded-2xl p-8 border border-gray-200 dark:border-gray-600/30 backdrop-blur-sm">
              <div className="bg-gray-200 dark:bg-gray-700/50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center shadow-lg backdrop-blur-sm">
                <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{t('vocabulary.readyToTranslate')}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                {t('vocabulary.clickToTranslate')}
              </p>
              <div className="flex items-center justify-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span>{t('vocabulary.smartLanguageDetection')}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                  </svg>
                  <span>{t('vocabulary.speechSynthesis')}</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Display completed translation results */}
        {translations.map((translation, index) => {
          const isOriginalEnglish = /^[a-zA-Z\s\.,!?;:"'()\-\d]+$/.test(translation.originalText.trim());
          const isTranslatedEnglish = /^[a-zA-Z\s\.,!?;:"'()\-\d]+$/.test(translation.translatedText.trim());
          
          return (
            <div key={index} className="bg-gradient-to-r from-white to-gray-50 border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
              {isBilingualMode ? (
                <div className="space-y-4">
                  {/* Original text */}
                  <div className="bg-blue-50 rounded-lg p-3 border-l-4 border-blue-400">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-xs text-blue-600 font-medium mb-1 uppercase tracking-wide">{t('vocabulary.original')}</div>
                        <div className="text-sm text-gray-800 leading-relaxed">{translation.originalText}</div>
                      </div>
                      {isOriginalEnglish && TTSService.isSupported() && (
                        <button
                          onClick={() => handlePlayTTS(translation.originalText, `orig-${index}`, 'en')}
                          className={`ml-3 p-2 rounded-full transition-all duration-200 cursor-pointer ${
                            playingIndex === `orig-${index}` 
                              ? 'bg-blue-500 text-white shadow-lg' 
                              : 'bg-gray-700/50 text-blue-400 hover:bg-gray-600/50 border border-gray-600/30 backdrop-blur-sm'
                          }`}
                          title={t('vocabulary.readOriginal')}
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
                  
                  {/* Translation */}
                  <div className="bg-green-50 rounded-lg p-3 border-l-4 border-green-400">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-xs text-green-600 font-medium mb-1 uppercase tracking-wide">{t('vocabulary.translation')}</div>
                        <div className="text-sm text-gray-800 leading-relaxed">{translation.translatedText}</div>
                      </div>
                      {isTranslatedEnglish && TTSService.isSupported() && (
                        <button
                          onClick={() => handlePlayTTS(translation.translatedText, `trans-${index}`, targetLanguage)}
                          className={`ml-3 p-2 rounded-full transition-all duration-200 cursor-pointer ${
                            playingIndex === `trans-${index}` 
                              ? 'bg-green-500 text-white shadow-lg' 
                              : 'bg-gray-700/50 text-green-400 hover:bg-gray-600/50 border border-gray-600/30 backdrop-blur-sm'
                          }`}
                          title={t('vocabulary.readTranslation')}
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
                        className={`ml-3 p-2 rounded-full transition-all duration-200 cursor-pointer ${
                          playingIndex === `single-${index}` 
                            ? 'bg-gray-500 text-white shadow-lg' 
                            : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50 border border-gray-600/30 backdrop-blur-sm'
                        }`}
                        title={t('vocabulary.readText')}
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
        
        {/* Skeleton screen during translation */}
        {translationProgress.isTranslating && (
          <>
            {Array.from({ length: Math.min(3, translationProgress.total - translationProgress.completed) }).map((_, index) => (
              <div key={`skeleton-${index}`} className="bg-gradient-to-r from-white to-gray-50 border border-gray-200 rounded-xl p-5 shadow-sm animate-pulse">
                {isBilingualMode ? (
                  <div className="space-y-4">
                    {/* Original text skeleton */}
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
                    
                    {/* Translation skeleton */}
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
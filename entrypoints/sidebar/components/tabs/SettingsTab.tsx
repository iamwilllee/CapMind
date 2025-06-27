import { useState, useEffect } from 'react';
import { Button } from '../../../../components/ui/button';
import { Settings, Key, Camera, BookOpen, AlertCircle, Check, CheckCircle, XCircle, Loader2, Globe } from 'lucide-react';
import { useTranslation } from '../../../../src/i18n';

export const SettingsTab = () => {
  const [apiKey, setApiKey] = useState('');
  const [ocrApiKey, setOcrApiKey] = useState('');
  const [model, setModel] = useState('deepseek-chat');
  const [autoSaveScreenshots, setAutoSaveScreenshots] = useState(true);
  const [enableAIAnalysis, setEnableAIAnalysis] = useState(true);
  const [autoAddWords, setAutoAddWords] = useState(true);
  const [showPhonetics, setShowPhonetics] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [apiTestStatus, setApiTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [apiTestMessage, setApiTestMessage] = useState<string>('');
  const [isFirstTime, setIsFirstTime] = useState(false);
  const { t, language, switchLanguage } = useTranslation();

  useEffect(() => {
    // Load saved settings
    const loadSettings = async () => {
      try {
        const result = await chrome.storage.sync.get([
          'deepseekApiKey',
          'ocrSpaceApiKey',
          'ai_model',
          'auto_save_screenshots',
          'enable_ai_analysis',
          'auto_add_words',
          'show_phonetics',
          'first_time_setup'
        ]);
        
        if (result.deepseekApiKey) {
          setApiKey(result.deepseekApiKey);
        }
        if (result.ocrSpaceApiKey) {
          setOcrApiKey(result.ocrSpaceApiKey);
        }
        if (result.ai_model) {
          setModel(result.ai_model);
        }
        setAutoSaveScreenshots(result.auto_save_screenshots ?? true);
        setEnableAIAnalysis(result.enable_ai_analysis ?? true);
        setAutoAddWords(result.auto_add_words ?? true);
        setShowPhonetics(result.show_phonetics ?? false);
        setIsFirstTime(!result.first_time_setup);
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    loadSettings();
  }, []);

  const handleSaveSettings = async () => {
    setSaveStatus('saving');
    try {
      await chrome.storage.sync.set({
        deepseekApiKey: apiKey,
        ocrSpaceApiKey: ocrApiKey,
        ai_model: model,
        auto_save_screenshots: autoSaveScreenshots,
        enable_ai_analysis: enableAIAnalysis,
        auto_add_words: autoAddWords,
        show_phonetics: showPhonetics,
        first_time_setup: true
      });
      setSaveStatus('success');
      setIsFirstTime(false);
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const testApiKey = async () => {
    if (!apiKey) {
      setApiTestStatus('error');
      setApiTestMessage(t('settings.ai.enterApiKey'));
      setTimeout(() => {
        setApiTestStatus('idle');
        setApiTestMessage('');
      }, 3000);
      return;
    }
    
    setApiTestStatus('testing');
    setApiTestMessage(t('settings.ai.validating'));
    
    try {
      const response = await fetch('https://api.deepseek.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });
      
      if (response.ok) {
        setApiTestStatus('success');
        setApiTestMessage(t('settings.ai.testSuccess'));
      } else {
        setApiTestStatus('error');
        setApiTestMessage(t('settings.ai.testFailed'));
      }
    } catch (error) {
      setApiTestStatus('error');
      setApiTestMessage(t('settings.ai.networkError'));
    }
    
    setTimeout(() => {
      setApiTestStatus('idle');
      setApiTestMessage('');
    }, 3000);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Settings className="w-6 h-6 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">{t('settings.title')}</h2>
      </div>
      
      {isFirstTime && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 mb-6 shadow-sm">
          <div className="flex items-start space-x-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">🎉 {t('settings.welcome.title')}</h3>
              <p className="text-sm text-blue-700 leading-relaxed">
                {t('settings.welcome.subtitle')}
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="space-y-6">
        {/* AI Settings */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-5">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Key className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900">{t('settings.ai.title')}</h3>
          </div>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('settings.ai.apiKey')}
              </label>
              <div className="flex space-x-3">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={t('settings.ai.apiKeyPlaceholder')}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all h-9"
                />
                <Button
                  onClick={testApiKey}
                  variant="outline"
                  size="sm"
                  disabled={!apiKey || apiTestStatus === 'testing'}
                  className="px-4 py-2 min-w-[80px] h-9"
                >
                  {apiTestStatus === 'testing' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    t('common.test')
                  )}
                </Button>
              </div>
              
              {/* API test status display */}
              {apiTestStatus !== 'idle' && apiTestMessage && (
                <div className={`mt-3 p-3 rounded-lg flex items-center space-x-2 ${
                  apiTestStatus === 'success' 
                    ? 'bg-green-50 border border-green-200' 
                    : apiTestStatus === 'error'
                    ? 'bg-red-50 border border-red-200'
                    : 'bg-blue-50 border border-blue-200'
                }`}>
                  {apiTestStatus === 'success' && <CheckCircle className="w-4 h-4 text-green-600" />}
                  {apiTestStatus === 'error' && <XCircle className="w-4 h-4 text-red-600" />}
                  {apiTestStatus === 'testing' && <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />}
                  <span className={`text-sm font-medium ${
                    apiTestStatus === 'success' 
                      ? 'text-green-700' 
                      : apiTestStatus === 'error'
                      ? 'text-red-700'
                      : 'text-blue-700'
                  }`}>
                    {apiTestMessage}
                  </span>
                </div>
              )}
              
              <p className="text-xs text-gray-500 mt-2">
                {t('settings.ai.getApiKey')}: {t('settings.ai.visitPlatform')} <a href="https://platform.deepseek.com" target="_blank" className="text-blue-600 hover:underline font-medium">{t('settings.ai.deepseekPlatform')}</a>
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('settings.ai.model')}
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white h-9"
              >
                <option value="deepseek-chat">{t('settings.ai.models.chat')}</option>
                <option value="deepseek-coder">{t('settings.ai.models.coder')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('settings.ocr.apiKey')}
              </label>
              <input
                type="password"
                value={ocrApiKey}
                onChange={(e) => setOcrApiKey(e.target.value)}
                placeholder={t('settings.ocr.apiKeyPlaceholder')}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all h-9"
              />
              <p className="text-xs text-gray-500 mt-2">
                {t('settings.ocr.getApiKey')}: {t('settings.ocr.visitApi')} <a href="https://ocr.space/ocrapi" target="_blank" className="text-blue-600 hover:underline font-medium">{t('settings.ocr.ocrSpaceApi')}</a> ({t('settings.ocr.freeLimit')})
              </p>
            </div>
          </div>
        </div>
        
        {/* Screenshot Settings */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-5">
            <div className="p-2 bg-green-100 rounded-lg">
              <Camera className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900">{t('settings.capture.title')}</h3>
          </div>
          <div className="space-y-4">
            <label className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
              <input 
                type="checkbox" 
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" 
                checked={autoSaveScreenshots}
                onChange={(e) => setAutoSaveScreenshots(e.target.checked)}
              />
              <div>
                <span className="text-sm font-medium text-gray-700">{t('settings.capture.autoSave')}</span>
                <p className="text-xs text-gray-500">{t('settings.capture.autoSaveDesc')}</p>
              </div>
            </label>
            <label className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
              <input 
                type="checkbox" 
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" 
                checked={enableAIAnalysis}
                onChange={(e) => setEnableAIAnalysis(e.target.checked)}
              />
              <div>
                <span className="text-sm font-medium text-gray-700">{t('settings.capture.enableAI')}</span>
                <p className="text-xs text-gray-500">{t('settings.capture.enableAIDesc')}</p>
              </div>
            </label>
          </div>
        </div>
        
        {/* Learning Settings */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-5">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BookOpen className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900">{t('settings.learning.title')}</h3>
          </div>
          <div className="space-y-4">
            <label className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
              <input 
                type="checkbox" 
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" 
                checked={autoAddWords}
                onChange={(e) => setAutoAddWords(e.target.checked)}
              />
              <div>
                <span className="text-sm font-medium text-gray-700">{t('settings.learning.autoAddWords')}</span>
                <p className="text-xs text-gray-500">{t('settings.learning.autoAddWordsDesc')}</p>
              </div>
            </label>
            <label className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
              <input 
                type="checkbox" 
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" 
                checked={showPhonetics}
                onChange={(e) => setShowPhonetics(e.target.checked)}
              />
              <div>
                <span className="text-sm font-medium text-gray-700">{t('settings.learning.showPhonetics')}</span>
                <p className="text-xs text-gray-500">{t('settings.learning.showPhoneticsDesc')}</p>
              </div>
            </label>
          </div>
        </div>
        
        {/* Language Settings */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Globe className="w-5 h-5 mr-2 text-blue-600" />
            {t('settings.language.title')}
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                {t('settings.language.interface')}
              </label>
              <select 
                value={language} 
                onChange={(e) => switchLanguage(e.target.value as 'en' | 'zh')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="en">🇺🇸 English</option>
                <option value="zh">🇨🇳 中文</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Save Button */}
        <div className="pt-4">
          <Button 
            onClick={handleSaveSettings} 
            className="w-full py-3 text-base text-white font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200"
            disabled={saveStatus === 'saving'}
          >
            {saveStatus === 'saving' && (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            )}
            {saveStatus === 'success' && <CheckCircle className="w-5 h-5 mr-2" />}
            {saveStatus === 'saving' ? t('common.loading') : saveStatus === 'success' ? t('settings.saveSuccess') : t('common.save')}
          </Button>
          
          {saveStatus === 'error' && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-700">{t('settings.saveFailed')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
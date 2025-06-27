import { useState, useEffect } from 'react';
import { Button } from '../../../../components/ui/button';
import { Settings, Key, Camera, BookOpen, AlertCircle, Check, CheckCircle, XCircle, Loader2 } from 'lucide-react';

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

  useEffect(() => {
    // 加载保存的设置
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
        console.error('加载设置失败:', error);
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
      console.error('保存设置失败:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const testApiKey = async () => {
    if (!apiKey) {
      setApiTestStatus('error');
      setApiTestMessage('请先输入 API Key');
      setTimeout(() => {
        setApiTestStatus('idle');
        setApiTestMessage('');
      }, 3000);
      return;
    }
    
    setApiTestStatus('testing');
    setApiTestMessage('正在验证 API Key...');
    
    try {
      const response = await fetch('https://api.deepseek.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });
      
      if (response.ok) {
        setApiTestStatus('success');
        setApiTestMessage('API Key 验证成功！');
      } else {
        setApiTestStatus('error');
        setApiTestMessage('API Key 验证失败，请检查是否正确');
      }
    } catch (error) {
      setApiTestStatus('error');
      setApiTestMessage('网络错误，无法验证 API Key');
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
        <h2 className="text-xl font-bold text-gray-900">设置</h2>
      </div>
      
      {isFirstTime && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 mb-6 shadow-sm">
          <div className="flex items-start space-x-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">🎉 欢迎使用 CapMind！</h3>
              <p className="text-sm text-blue-700 leading-relaxed">
                请先配置您的 DeepSeek API Key 以启用强大的 AI 功能，包括智能翻译、内容分析等。
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="space-y-6">
        {/* AI 设置 */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-5">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Key className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900">AI 设置</h3>
          </div>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                DeepSeek API Key
              </label>
              <div className="flex space-x-3">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="输入你的 DeepSeek API Key"
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
                    '测试'
                  )}
                </Button>
              </div>
              
              {/* API 测试状态显示 */}
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
                获取 API Key：访问 <a href="https://platform.deepseek.com" target="_blank" className="text-blue-600 hover:underline font-medium">DeepSeek 平台</a>
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                AI 模型
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white h-9"
              >
                <option value="deepseek-chat">DeepSeek Chat - 通用对话模型</option>
                <option value="deepseek-coder">DeepSeek Coder - 代码专用模型</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                OCR Space API Key
              </label>
              <input
                type="password"
                value={ocrApiKey}
                onChange={(e) => setOcrApiKey(e.target.value)}
                placeholder="输入你的 OCR.space API Key（可选）"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all h-9"
              />
              <p className="text-xs text-gray-500 mt-2">
                获取 API Key：访问 <a href="https://ocr.space/ocrapi" target="_blank" className="text-blue-600 hover:underline font-medium">OCR Space API</a> (免费版每月25000次)
              </p>
            </div>
          </div>
        </div>
        
        {/* 截图设置 */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-5">
            <div className="p-2 bg-green-100 rounded-lg">
              <Camera className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900">截图设置</h3>
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
                <span className="text-sm font-medium text-gray-700">自动保存截图</span>
                <p className="text-xs text-gray-500">截图后自动保存到本地</p>
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
                <span className="text-sm font-medium text-gray-700">启用AI分析</span>
                <p className="text-xs text-gray-500">使用AI分析截图内容</p>
              </div>
            </label>
          </div>
        </div>
        
        {/* 学习设置 */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-5">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BookOpen className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900">学习设置</h3>
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
                <span className="text-sm font-medium text-gray-700">自动添加生词</span>
                <p className="text-xs text-gray-500">翻译时自动收集生词到词汇本</p>
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
                <span className="text-sm font-medium text-gray-700">显示音标</span>
                <p className="text-xs text-gray-500">在词汇卡片中显示国际音标</p>
              </div>
            </label>
          </div>
        </div>
        
        {/* 保存按钮 */}
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
            {saveStatus === 'saving' ? '保存中...' : saveStatus === 'success' ? '保存成功！' : '保存所有设置'}
          </Button>
          
          {saveStatus === 'error' && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-700">保存失败，请重试</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
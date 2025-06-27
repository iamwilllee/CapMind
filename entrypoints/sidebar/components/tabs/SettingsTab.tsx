import { Settings, Key, Camera, BookOpen, Check, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '../../../../components/ui/button';

export const SettingsTab = () => {
  const [apiKey, setApiKey] = useState('');
  const [ocrApiKey, setOcrApiKey] = useState('');
  const [model, setModel] = useState('deepseek-chat');
  const [autoSaveScreenshots, setAutoSaveScreenshots] = useState(true);
  const [enableAIAnalysis, setEnableAIAnalysis] = useState(true);
  const [autoAddWords, setAutoAddWords] = useState(true);
  const [showPhonetics, setShowPhonetics] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [isFirstTime, setIsFirstTime] = useState(false);

  useEffect(() => {
    // 加载保存的设置
    const loadSettings = async () => {
      try {
        const result = await chrome.storage.sync.get([
          'deepseek_api_key',
          'ocrSpaceApiKey',
          'ai_model',
          'auto_save_screenshots',
          'enable_ai_analysis',
          'auto_add_words',
          'show_phonetics',
          'first_time_setup'
        ]);
        
        if (result.deepseek_api_key) {
          setApiKey(result.deepseek_api_key);
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
        deepseek_api_key: apiKey,
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
      alert('请先输入 API Key');
      return;
    }
    
    try {
      const response = await fetch('https://api.deepseek.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });
      
      if (response.ok) {
        alert('API Key 验证成功！');
      } else {
        alert('API Key 验证失败，请检查是否正确');
      }
    } catch (error) {
      alert('网络错误，无法验证 API Key');
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center space-x-2 mb-4">
        <Settings className="w-5 h-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-900">设置</h2>
      </div>
      
      {isFirstTime && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-800 mb-1">首次设置</h3>
              <p className="text-sm text-blue-700">
                欢迎使用 CapMind！请先配置您的 DeepSeek API Key 以启用 AI 功能。
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="space-y-4">
        {/* AI 设置 */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3 flex items-center">
            <Key className="w-4 h-4 mr-2 text-blue-600" />
            AI 设置
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                DeepSeek API Key
              </label>
              <div className="flex space-x-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="输入你的 DeepSeek API Key"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button
                  onClick={testApiKey}
                  variant="outline"
                  size="sm"
                  disabled={!apiKey}
                >
                  测试
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                获取 API Key：访问 <a href="https://platform.deepseek.com" target="_blank" className="text-blue-600 hover:underline">DeepSeek 平台</a>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AI 模型
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="deepseek-chat">DeepSeek Chat</option>
                <option value="deepseek-coder">DeepSeek Coder</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                OCR Space API Key
              </label>
              <input
                type="password"
                value={ocrApiKey}
                onChange={(e) => setOcrApiKey(e.target.value)}
                placeholder="输入你的 OCR.space API Key"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                获取 API Key：访问 <a href="https://ocr.space/ocrapi" target="_blank" className="text-blue-600 hover:underline">OCR Space API</a> (免费版每月25000次)
              </p>
            </div>
          </div>
        </div>
        
        {/* 截图设置 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3 flex items-center">
            <Camera className="w-4 h-4 mr-2 text-gray-600" />
            截图设置
          </h3>
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                className="rounded" 
                checked={autoSaveScreenshots}
                onChange={(e) => setAutoSaveScreenshots(e.target.checked)}
              />
              <span className="text-sm text-gray-700">自动保存截图</span>
            </label>
            <label className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                className="rounded" 
                checked={enableAIAnalysis}
                onChange={(e) => setEnableAIAnalysis(e.target.checked)}
              />
              <span className="text-sm text-gray-700">启用AI分析</span>
            </label>
          </div>
        </div>
        
        {/* 学习设置 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3 flex items-center">
            <BookOpen className="w-4 h-4 mr-2 text-gray-600" />
            学习设置
          </h3>
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                className="rounded" 
                checked={autoAddWords}
                onChange={(e) => setAutoAddWords(e.target.checked)}
              />
              <span className="text-sm text-gray-700">自动添加生词</span>
            </label>
            <label className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                className="rounded" 
                checked={showPhonetics}
                onChange={(e) => setShowPhonetics(e.target.checked)}
              />
              <span className="text-sm text-gray-700">显示音标</span>
            </label>
          </div>
        </div>
        
        {/* 保存按钮 */}
        <div className="pt-2">
          <Button 
            onClick={handleSaveSettings} 
            className="w-full"
            disabled={saveStatus === 'saving'}
          >
            {saveStatus === 'saving' && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            )}
            {saveStatus === 'success' && <Check className="w-4 h-4 mr-2" />}
            {saveStatus === 'saving' ? '保存中...' : saveStatus === 'success' ? '保存成功' : '保存设置'}
          </Button>
          
          {saveStatus === 'error' && (
            <p className="text-sm text-red-600 mt-2 text-center">
              保存失败，请重试
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
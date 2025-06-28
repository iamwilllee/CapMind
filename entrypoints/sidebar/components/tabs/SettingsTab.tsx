import React, { useState, useEffect } from "react";
import { Button } from "../../../../components/ui/button";
import {
  Settings,
  Key,
  Camera,
  BookOpen,
  CheckCircle,
  XCircle,
  Loader2,
  Globe,
  Palette,
} from "lucide-react";
import { useTranslation } from "../../../../src/i18n";
import { useTheme } from "../../../../src/contexts/ThemeContext";

export const SettingsTab = () => {
  const [apiKey, setApiKey] = useState("");
  const [zhipuApiKey, setZhipuApiKey] = useState("");
  const [ocrApiKey, setOcrApiKey] = useState("");
  const [model, setModel] = useState("deepseek-chat");
  const [zhipuModel, setZhipuModel] = useState("glm-4");
  const [defaultProvider, setDefaultProvider] = useState("deepseek");
  const [autoSaveScreenshots, setAutoSaveScreenshots] = useState(true);
  const [enableAIAnalysis, setEnableAIAnalysis] = useState(true);
  const [autoAddWords, setAutoAddWords] = useState(true);
  const [showPhonetics, setShowPhonetics] = useState(false);
  const [primaryLanguage, setPrimaryLanguage] = useState("en");
  const [secondaryLanguage, setSecondaryLanguage] = useState("zh");
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "success" | "error"
  >("idle");
  const [apiTestStatus, setApiTestStatus] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle");
  const [apiTestMessage, setApiTestMessage] = useState<string>("");
  const [, setIsFirstTime] = useState(false);
  const { t, language, switchLanguage } = useTranslation();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    // Load saved settings
    const loadSettings = async () => {
      try {
        const result = await chrome.storage.sync.get([
          "deepseekApiKey",
          "zhipuApiKey",
          "ocrSpaceApiKey",
          "ai_model",
          "zhipu_model",
          "default_provider",
          "auto_save_screenshots",
          "enable_ai_analysis",
          "auto_add_words",
          "show_phonetics",
          "primary_language",
          "secondary_language",
          "first_time_setup",
        ]);

        if (result.deepseekApiKey) {
          setApiKey(result.deepseekApiKey);
        }
        if (result.zhipuApiKey) {
          setZhipuApiKey(result.zhipuApiKey);
        }
        if (result.ocrSpaceApiKey) {
          setOcrApiKey(result.ocrSpaceApiKey);
        }
        if (result.ai_model) {
          setModel(result.ai_model);
        }
        if (result.zhipu_model) {
          setZhipuModel(result.zhipu_model);
        }
        setDefaultProvider(result.default_provider ?? "deepseek");
        setAutoSaveScreenshots(result.auto_save_screenshots ?? true);
        setEnableAIAnalysis(result.enable_ai_analysis ?? true);
        setAutoAddWords(result.auto_add_words ?? true);
        setShowPhonetics(result.show_phonetics ?? false);
        setPrimaryLanguage(result.primary_language ?? "en");
        setSecondaryLanguage(result.secondary_language ?? "zh");
        setIsFirstTime(!result.first_time_setup);
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    };
    loadSettings();
  }, []);

  const handleSaveAISettings = async () => {
    setSaveStatus("saving");
    try {
      await chrome.storage.sync.set({
        deepseekApiKey: apiKey,
        zhipuApiKey: zhipuApiKey,
        ocrSpaceApiKey: ocrApiKey,
        ai_model: model,
        zhipu_model: zhipuModel,
        default_provider: defaultProvider,
        first_time_setup: true,
      });
      setSaveStatus("success");
      setIsFirstTime(false);
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error("Failed to save AI settings:", error);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }
  };

  const handleAutoSaveScreenshots = async (checked: boolean) => {
    setAutoSaveScreenshots(checked);
    try {
      await chrome.storage.sync.set({ auto_save_screenshots: checked });
    } catch (error) {
      console.error("Failed to save screenshot setting:", error);
    }
  };

  const handleEnableAIAnalysis = async (checked: boolean) => {
    setEnableAIAnalysis(checked);
    try {
      await chrome.storage.sync.set({ enable_ai_analysis: checked });
    } catch (error) {
      console.error("Failed to save AI analysis setting:", error);
    }
  };

  const handleAutoAddWords = async (checked: boolean) => {
    setAutoAddWords(checked);
    try {
      await chrome.storage.sync.set({ auto_add_words: checked });
    } catch (error) {
      console.error("Failed to save auto add words setting:", error);
    }
  };

  const handleShowPhonetics = async (checked: boolean) => {
    setShowPhonetics(checked);
    try {
      await chrome.storage.sync.set({ show_phonetics: checked });
    } catch (error) {
      console.error("Failed to save phonetics setting:", error);
    }
  };

  const handlePrimaryLanguageChange = async (language: string) => {
    setPrimaryLanguage(language);
    try {
      await chrome.storage.sync.set({ primary_language: language });
    } catch (error) {
      console.error("Failed to save primary language setting:", error);
    }
  };

  const handleSecondaryLanguageChange = async (language: string) => {
    setSecondaryLanguage(language);
    try {
      await chrome.storage.sync.set({ secondary_language: language });
    } catch (error) {
      console.error("Failed to save secondary language setting:", error);
    }
  };

  const testApiKey = async () => {
    if (!apiKey) {
      setApiTestStatus("error");
      setApiTestMessage(t("settings.ai.enterApiKey"));
      setTimeout(() => {
        setApiTestStatus("idle");
        setApiTestMessage("");
      }, 3000);
      return;
    }

    setApiTestStatus("testing");
    setApiTestMessage(t("settings.ai.validating"));

    try {
      const response = await fetch("https://api.deepseek.com/v1/models", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (response.ok) {
        setApiTestStatus("success");
        setApiTestMessage(t("settings.ai.testSuccess"));
      } else {
        setApiTestStatus("error");
        setApiTestMessage(t("settings.ai.testFailed"));
      }
    } catch (error) {
      setApiTestStatus("error");
      setApiTestMessage(t("settings.ai.networkError"));
    }

    setTimeout(() => {
      setApiTestStatus("idle");
      setApiTestMessage("");
    }, 3000);
  };

  return (
    <div className="p-6 space-y-6 bg-white dark:bg-zinc-950">
      {/* Welcome Message */}
      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-6 backdrop-blur-sm">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-blue-500/20 rounded-xl">
            <Settings className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-100 mb-3">
              {t("settings.welcome.title")}
            </h2>
            <p className="text-sm text-gray-600 dark:text-zinc-300 leading-relaxed">
              {t("settings.welcome.subtitle")}
            </p>
          </div>
        </div>
      </div>

      {/* AI Settings */}
      <div className="bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50 rounded-xl p-6 backdrop-blur-sm">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-blue-500/20 rounded-xl">
            <Key className="w-6 h-6 text-blue-400" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-zinc-100 text-lg">
            {t("settings.ai.title")}
          </h3>
        </div>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-3">
              {t("settings.ai.apiKey")}
            </label>
            <div className="flex space-x-3">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={t("settings.ai.apiKeyPlaceholder")}
                className="flex-1 px-4 py-3 text-sm bg-white dark:bg-zinc-800/50 border border-gray-300 dark:border-zinc-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-gray-900 dark:text-zinc-200 placeholder-gray-500 dark:placeholder-zinc-500"
              />
              <Button
                onClick={testApiKey}
                variant="outline"
                size="sm"
                disabled={!apiKey || apiTestStatus === "testing"}
                className="px-4 py-3 min-w-[80px] bg-white dark:bg-zinc-800/50 border-gray-300 dark:border-zinc-700/50 text-gray-900 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700/50 hover:border-gray-400 dark:hover:border-zinc-600/50"
              >
                {apiTestStatus === "testing" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  t("common.test")
                )}
              </Button>
            </div>

            {/* API test status display */}
            {apiTestStatus !== "idle" && apiTestMessage && (
              <div
                className={`mt-4 p-4 rounded-lg flex items-center space-x-3 backdrop-blur-sm ${
                  apiTestStatus === "success"
                    ? "bg-green-500/10 border border-green-500/20"
                    : apiTestStatus === "error"
                    ? "bg-red-500/10 border border-red-500/20"
                    : "bg-blue-500/10 border border-blue-500/20"
                }`}
              >
                {apiTestStatus === "success" && (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                )}
                {apiTestStatus === "error" && (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
                {apiTestStatus === "testing" && (
                  <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                )}
                <span
                  className={`text-sm font-medium ${
                    apiTestStatus === "success"
                      ? "text-green-300"
                      : apiTestStatus === "error"
                      ? "text-red-300"
                      : "text-blue-300"
                  }`}
                >
                  {apiTestMessage}
                </span>
              </div>
            )}

            <p className="text-xs text-gray-600 dark:text-zinc-400 mt-3">
              {t("settings.ai.getApiKey")}: {t("settings.ai.visitPlatform")}{" "}
              <a
                href="https://platform.deepseek.com"
                target="_blank"
                className="text-blue-400 hover:text-blue-300 hover:underline font-medium transition-colors"
              >
                {t("settings.ai.deepseekPlatform")}
              </a>
            </p>
          </div>
          
          {/* 智谱AI设置 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-3">
              智谱AI API Key
            </label>
            <input
              type="password"
              value={zhipuApiKey}
              onChange={(e) => setZhipuApiKey(e.target.value)}
              placeholder="请输入您的智谱AI API Key (可选)"
              className="w-full px-4 py-3 text-sm bg-gray-100 dark:bg-zinc-800/50 border border-gray-300 dark:border-zinc-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-gray-900 dark:text-zinc-200 placeholder-gray-500 dark:placeholder-zinc-500"
            />
            <p className="text-xs text-gray-600 dark:text-zinc-400 mt-3">
              获取API Key: 访问{" "}
              <a
                href="https://open.bigmodel.cn"
                target="_blank"
                className="text-blue-400 hover:text-blue-300 hover:underline font-medium transition-colors"
              >
                智谱AI开放平台
              </a>
            </p>
          </div>
          
          {/* 默认AI提供商 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-3">
              默认AI提供商
            </label>
            <select
              value={defaultProvider}
              onChange={(e) => setDefaultProvider(e.target.value)}
              className="w-full px-4 py-3 text-sm bg-gray-100 dark:bg-zinc-800/50 border border-gray-300 dark:border-zinc-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-gray-900 dark:text-zinc-200 cursor-pointer"
            >
              <option value="deepseek" className="bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-200">
                🚀 DeepSeek
              </option>
              <option value="zhipu" className="bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-200">
                🧠 智谱AI
              </option>
            </select>
          </div>
          
          {/* DeepSeek模型选择 */}
          {defaultProvider === "deepseek" && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-3">
                {t("settings.ai.model")} (DeepSeek)
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-gray-100 dark:bg-zinc-800/50 border border-gray-300 dark:border-zinc-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-gray-900 dark:text-zinc-200 cursor-pointer"
              >
                <option
                  value="deepseek-chat"
                  className="bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-200"
                >
                  {t("settings.ai.models.chat")}
                </option>
                <option
                  value="deepseek-coder"
                  className="bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-200"
                >
                  {t("settings.ai.models.coder")}
                </option>
              </select>
            </div>
          )}
          
          {/* 智谱AI模型选择 */}
          {defaultProvider === "zhipu" && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-3">
                模型选择 (智谱AI)
              </label>
              <select
                value={zhipuModel}
                onChange={(e) => setZhipuModel(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-gray-100 dark:bg-zinc-800/50 border border-gray-300 dark:border-zinc-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-gray-900 dark:text-zinc-200 cursor-pointer"
              >
                <option value="glm-4" className="bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-200">
                  GLM-4 (通用对话)
                </option>
                <option value="glm-4v" className="bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-200">
                  GLM-4V (多模态)
                </option>
                <option value="glm-3-turbo" className="bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-200">
                  GLM-3-Turbo (快速响应)
                </option>
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-3">
              {t("settings.ocr.apiKey")}
            </label>
            <input
              type="password"
              value={ocrApiKey}
              onChange={(e) => setOcrApiKey(e.target.value)}
              placeholder={t("settings.ocr.apiKeyPlaceholder")}
              className="w-full px-4 py-3 text-sm bg-gray-100 dark:bg-zinc-800/50 border border-gray-300 dark:border-zinc-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-gray-900 dark:text-zinc-200 placeholder-gray-500 dark:placeholder-zinc-500"
            />
            <p className="text-xs text-gray-600 dark:text-zinc-400 mt-3">
              {t("settings.ocr.getApiKey")}: {t("settings.ocr.visitApi")}{" "}
              <a
                href="https://ocr.space/ocrapi"
                target="_blank"
                className="text-blue-400 hover:text-blue-300 hover:underline font-medium transition-colors"
              >
                {t("settings.ocr.ocrSpaceApi")}
              </a>{" "}
              ({t("settings.ocr.freeLimit")})
            </p>
          </div>
        </div>
        
        {/* AI Settings Save Button */}
        <div className="pt-4 border-t border-gray-200 dark:border-zinc-700/50">
          <Button
            onClick={handleSaveAISettings}
            className="w-full py-3 text-base text-white font-semibold bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl cursor-pointer"
            disabled={saveStatus === "saving"}
          >
            {saveStatus === "saving" && (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            )}
            {saveStatus === "success" && <CheckCircle className="w-5 h-5 mr-2" />}
            {saveStatus === "saving"
              ? t("common.loading")
              : saveStatus === "success"
              ? t("settings.saveSuccess")
              : t("common.save")}
          </Button>

          {saveStatus === "error" && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center space-x-3 backdrop-blur-sm">
              <XCircle className="w-5 h-5 text-red-400" />
              <span className="text-sm font-medium text-red-300">
                {t("settings.saveFailed")}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Screenshot Settings */}
      <div className="bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50 rounded-xl p-6 backdrop-blur-sm">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-green-500/20 rounded-xl">
            <Camera className="w-6 h-6 text-green-400" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-zinc-100 text-lg">
            {t("settings.capture.title")}
          </h3>
        </div>
        <div className="space-y-4">
          <label className="flex items-center space-x-4 p-4 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800/30 transition-all duration-200 cursor-pointer">
            <input
              type="checkbox"
              className="w-5 h-5 text-blue-500 bg-white dark:bg-zinc-800/50 border-gray-300 dark:border-zinc-700/50 rounded focus:ring-blue-500/50 focus:ring-2"
              checked={autoSaveScreenshots}
              onChange={(e) => handleAutoSaveScreenshots(e.target.checked)}
            />
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-zinc-200">
                {t("settings.capture.autoSave")}
              </span>
              <p className="text-xs text-gray-600 dark:text-zinc-400 mt-1">
                {t("settings.capture.autoSaveDesc")}
              </p>
            </div>
          </label>
          <label className="flex items-center space-x-4 p-4 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800/30 transition-all duration-200 cursor-pointer">
            <input
              type="checkbox"
              className="w-5 h-5 text-blue-500 bg-white dark:bg-zinc-800/50 border-gray-300 dark:border-zinc-700/50 rounded focus:ring-blue-500/50 focus:ring-2"
              checked={enableAIAnalysis}
              onChange={(e) => handleEnableAIAnalysis(e.target.checked)}
            />
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-zinc-200">
                {t("settings.capture.enableAI")}
              </span>
              <p className="text-xs text-gray-600 dark:text-zinc-400 mt-1">
                {t("settings.capture.enableAIDesc")}
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Learning Settings */}
      <div className="bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50 rounded-xl p-6 backdrop-blur-sm">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-purple-500/20 rounded-xl">
            <BookOpen className="w-6 h-6 text-purple-400" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-zinc-100 text-lg">
            {t("settings.learning.title")}
          </h3>
        </div>
        <div className="space-y-4">
          <label className="flex items-center space-x-4 p-4 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800/30 transition-all duration-200 cursor-pointer">
            <input
              type="checkbox"
              className="w-5 h-5 text-blue-500 bg-white dark:bg-zinc-800/50 border-gray-300 dark:border-zinc-700/50 rounded focus:ring-blue-500/50 focus:ring-2"
              checked={autoAddWords}
              onChange={(e) => handleAutoAddWords(e.target.checked)}
            />
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-zinc-200">
                {t("settings.learning.autoAddWords")}
              </span>
              <p className="text-xs text-gray-600 dark:text-zinc-400 mt-1">
                {t("settings.learning.autoAddWordsDesc")}
              </p>
            </div>
          </label>
          <label className="flex items-center space-x-4 p-4 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800/30 transition-all duration-200 cursor-pointer">
            <input
              type="checkbox"
              className="w-5 h-5 text-blue-500 bg-white dark:bg-zinc-800/50 border-gray-300 dark:border-zinc-700/50 rounded focus:ring-blue-500/50 focus:ring-2"
              checked={showPhonetics}
              onChange={(e) => handleShowPhonetics(e.target.checked)}
            />
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-zinc-200">
                {t("settings.learning.showPhonetics")}
              </span>
              <p className="text-xs text-gray-600 dark:text-zinc-400 mt-1">
                {t("settings.learning.showPhoneticsDesc")}
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Theme Settings */}
      <div className="bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50 rounded-xl p-6 backdrop-blur-sm">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-purple-500/20 rounded-xl">
            <Palette className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">{t('settings.theme.title')}</h3>
            <p className="text-sm text-gray-600 dark:text-zinc-400">{t('settings.theme.description')}</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">
              {t('settings.theme.select')}
            </label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
              className="w-full px-4 py-3 bg-gray-100 dark:bg-zinc-800/50 border border-gray-300 dark:border-zinc-700/50 rounded-lg text-gray-900 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200 backdrop-blur-sm cursor-pointer"
            >
              <option value="system" className="bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-200">
                🖥️ {t('settings.theme.system')}
              </option>
              <option value="light" className="bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-200">
                ☀️ {t('settings.theme.light')}
              </option>
              <option value="dark" className="bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-200">
                🌙 {t('settings.theme.dark')}
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Language Settings */}
      <div className="bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50 rounded-xl p-6 backdrop-blur-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-100 mb-4 flex items-center">
          <Globe className="w-6 h-6 mr-3 text-blue-400" />
          {t("settings.language.title")}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-3 block">
              {t("settings.language.interface")}
            </label>
            <select
              value={language}
              onChange={(e) => switchLanguage(e.target.value as "en" | "zh")}
              className="w-full px-4 py-3 bg-gray-100 dark:bg-zinc-800/50 border border-gray-300 dark:border-zinc-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-gray-900 dark:text-zinc-200 text-sm cursor-pointer"
            >
              <option value="en" className="bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-200">
                🇺🇸 English
              </option>
              <option value="zh" className="bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-200">
                🇨🇳 中文
              </option>
            </select>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-3 block">
              主语言 (Primary Language)
            </label>
            <select
              value={primaryLanguage}
              onChange={(e) => handlePrimaryLanguageChange(e.target.value)}
              className="w-full px-4 py-3 bg-gray-100 dark:bg-zinc-800/50 border border-gray-300 dark:border-zinc-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-gray-900 dark:text-zinc-200 text-sm cursor-pointer"
            >
              <option value="en" className="bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-200">
                🇺🇸 English
              </option>
              <option value="zh" className="bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-200">
                🇨🇳 中文
              </option>
              <option value="ja" className="bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-200">
                🇯🇵 日本語
              </option>
              <option value="ko" className="bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-200">
                🇰🇷 한국어
              </option>
              <option value="fr" className="bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-200">
                🇫🇷 Français
              </option>
              <option value="de" className="bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-200">
                🇩🇪 Deutsch
              </option>
              <option value="es" className="bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-200">
                🇪🇸 Español
              </option>
            </select>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-3 block">
              第二语言 (Secondary Language)
            </label>
            <select
              value={secondaryLanguage}
              onChange={(e) => handleSecondaryLanguageChange(e.target.value)}
              className="w-full px-4 py-3 bg-gray-100 dark:bg-zinc-800/50 border border-gray-300 dark:border-zinc-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-gray-900 dark:text-zinc-200 text-sm cursor-pointer"
            >
              <option value="en" className="bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-200">
                🇺🇸 English
              </option>
              <option value="zh" className="bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-200">
                🇨🇳 中文
              </option>
              <option value="ja" className="bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-200">
                🇯🇵 日本語
              </option>
              <option value="ko" className="bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-200">
                🇰🇷 한국어
              </option>
              <option value="fr" className="bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-200">
                🇫🇷 Français
              </option>
              <option value="de" className="bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-200">
                🇩🇪 Deutsch
              </option>
              <option value="es" className="bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-200">
                🇪🇸 Español
              </option>
            </select>
          </div>
        </div>
      </div>


    </div>
  );
};

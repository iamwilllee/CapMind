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
  const [ocrApiKey, setOcrApiKey] = useState("");
  const [model, setModel] = useState("deepseek-chat");
  const [autoSaveScreenshots, setAutoSaveScreenshots] = useState(true);
  const [enableAIAnalysis, setEnableAIAnalysis] = useState(true);
  const [autoAddWords, setAutoAddWords] = useState(true);
  const [showPhonetics, setShowPhonetics] = useState(false);
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
          "ocrSpaceApiKey",
          "ai_model",
          "auto_save_screenshots",
          "enable_ai_analysis",
          "auto_add_words",
          "show_phonetics",
          "first_time_setup",
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
        ocrSpaceApiKey: ocrApiKey,
        ai_model: model,
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
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-3">
              {t("settings.ai.model")}
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
        </div>
      </div>


    </div>
  );
};

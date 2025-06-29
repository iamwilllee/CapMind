import React, { useState, useEffect } from "react";
import { Button } from "../../../../components/ui/button";
import { Select, Option } from "../../../../components/ui/select";
import {
  Settings,
  Key,
  CheckCircle,
  XCircle,
  Loader2,
  Globe,
  Palette,
} from "lucide-react";
import { useTranslation } from "../../../../i18n";
import { useTheme } from "../../../../contexts/ThemeContext";

export const SettingsTab = () => {
  const [apiKey, setApiKey] = useState("");
  const [zhipuApiKey, setZhipuApiKey] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");

  const [ocrApiKey, setOcrApiKey] = useState("");
  const [model, setModel] = useState("deepseek-chat");
  const [zhipuModel, setZhipuModel] = useState("glm-4");
  const [geminiModel, setGeminiModel] = useState("gemini-2.5-flash");
  const [defaultProvider, setDefaultProvider] = useState("deepseek");

  const [primaryLanguage, setPrimaryLanguage] = useState("en");
  const [secondaryLanguage, setSecondaryLanguage] = useState("zh");
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "success" | "error"
  >("idle");
  const [apiTestStatus, setApiTestStatus] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle");
  const [apiTestMessage, setApiTestMessage] = useState<string>("");
  const [zhipuTestStatus, setZhipuTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [zhipuTestMessage, setZhipuTestMessage] = useState("");
  const [geminiTestStatus, setGeminiTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [geminiTestMessage, setGeminiTestMessage] = useState("");
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
          "geminiApiKey",

          "ocrSpaceApiKey",
          "ai_model",
          "zhipu_model",
          "gemini_model",
          "default_provider",
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
        if (result.geminiApiKey) {
          setGeminiApiKey(result.geminiApiKey);
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
        if (result.gemini_model) {
          setGeminiModel(result.gemini_model);
        }
        
        // 智能选择默认提供商：从已配置API密钥的提供商中选择第一个
        let selectedProvider = result.default_provider;
        if (!selectedProvider) {
          if (result.deepseekApiKey) {
            selectedProvider = "deepseek";
          } else if (result.zhipuApiKey) {
            selectedProvider = "zhipu";
          } else if (result.geminiApiKey) {
            selectedProvider = "gemini";
          } else {
            selectedProvider = "deepseek"; // 默认值
          }
        }
        setDefaultProvider(selectedProvider);
        
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
        geminiApiKey: geminiApiKey,

        ocrSpaceApiKey: ocrApiKey,
        ai_model: model,
        zhipu_model: zhipuModel,
        gemini_model: geminiModel,
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

  const testZhipuApiKey = async () => {
    if (!zhipuApiKey) {
      setZhipuTestStatus("error");
      setZhipuTestMessage(t("settings.ai.enterApiKey"));
      setTimeout(() => {
        setZhipuTestStatus("idle");
        setZhipuTestMessage("");
      }, 3000);
      return;
    }

    setZhipuTestStatus("testing");
    setZhipuTestMessage(t("settings.ai.validating"));

    try {
      const response = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${zhipuApiKey}`,
        },
        body: JSON.stringify({
          model: "glm-4",
          messages: [
            {
              role: "user",
              content: "测试"
            }
          ],
          max_tokens: 1
        })
      });

      if (response.ok) {
        setZhipuTestStatus("success");
        setZhipuTestMessage(t("settings.ai.testSuccess"));
      } else {
        const errorData = await response.json();
        setZhipuTestStatus("error");
        setZhipuTestMessage(`${t("settings.ai.testFailed")}: ${errorData.error?.message || t("settings.ai.checkKey")}`);
      }
    } catch (error) {
      setZhipuTestStatus("error");
      setZhipuTestMessage(t("settings.ai.networkError"));
    }

    setTimeout(() => {
      setZhipuTestStatus("idle");
      setZhipuTestMessage("");
    }, 3000);
  };

  const testGeminiApiKey = async () => {
    if (!geminiApiKey) {
      setGeminiTestStatus("error");
      setGeminiTestMessage(t("settings.ai.enterApiKey"));
      setTimeout(() => {
        setGeminiTestStatus("idle");
        setGeminiTestMessage("");
      }, 3000);
      return;
    }



    setGeminiTestStatus("testing");
    setGeminiTestMessage(t("settings.ai.validating"));

    try {
      let response;
      
      // Google AI Studio API
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`);

      if (response.ok) {
        setGeminiTestStatus("success");
        setGeminiTestMessage(t("settings.ai.testSuccess"));
      } else {
        setGeminiTestStatus("error");
        setGeminiTestMessage(t("settings.ai.testFailed"));
      }
    } catch (error) {
      setGeminiTestStatus("error");
      setGeminiTestMessage(t("settings.ai.networkError"));
    }

    setTimeout(() => {
      setGeminiTestStatus("idle");
      setGeminiTestMessage("");
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
                disabled={!apiKey || apiTestStatus === "testing"}
                className="h-12 px-4 py-3 min-w-[80px] bg-white dark:bg-zinc-800/50 border-gray-300 dark:border-zinc-700/50 text-gray-900 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700/50 hover:border-gray-400 dark:hover:border-zinc-600/50"
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
          
          {/* Gemini AI设置 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-3">
              {t("settings.ai.geminiApiKey")}
            </label>
            <div className="flex space-x-3">
              <input
                type="password"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder={t("settings.ai.geminiApiKeyPlaceholder")}
                className="flex-1 px-4 py-3 text-sm bg-white dark:bg-zinc-800/50 border border-gray-300 dark:border-zinc-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-gray-900 dark:text-zinc-200 placeholder-gray-500 dark:placeholder-zinc-500"
              />
              <Button
                onClick={testGeminiApiKey}
                variant="outline"
                disabled={!geminiApiKey || geminiTestStatus === "testing"}
                className="h-12 px-4 py-3 min-w-[80px] bg-white dark:bg-zinc-800/50 border-gray-300 dark:border-zinc-700/50 text-gray-900 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700/50 hover:border-gray-400 dark:hover:border-zinc-600/50"
              >
                {geminiTestStatus === "testing" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  t("common.test")
                )}
              </Button>
            </div>

            {/* Gemini API test status display */}
            {geminiTestStatus !== "idle" && geminiTestMessage && (
              <div
                className={`mt-4 p-4 rounded-lg flex items-center space-x-3 backdrop-blur-sm ${
                  geminiTestStatus === "success"
                    ? "bg-green-500/10 border border-green-500/20"
                    : geminiTestStatus === "error"
                    ? "bg-red-500/10 border border-red-500/20"
                    : "bg-blue-500/10 border border-blue-500/20"
                }`}
              >
                {geminiTestStatus === "success" && (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                )}
                {geminiTestStatus === "error" && (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
                {geminiTestStatus === "testing" && (
                  <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                )}
                <span
                  className={`text-sm font-medium ${
                    geminiTestStatus === "success"
                      ? "text-green-300"
                      : geminiTestStatus === "error"
                      ? "text-red-300"
                      : "text-blue-300"
                  }`}
                >
                  {geminiTestMessage}
                </span>
              </div>
            )}

            <p className="text-xs text-gray-600 dark:text-zinc-400 mt-3">
              {t("settings.ai.getApiKey")}: {t("settings.ai.visitPlatform")}{" "}
              <a
                href="https://makersuite.google.com/app/apikey"
                target="_blank"
                className="text-blue-400 hover:text-blue-300 hover:underline font-medium transition-colors"
              >
                {t("settings.ai.geminiPlatform")}
              </a>
            </p>
          </div>
          
          {/* 智谱AI设置 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-3">
              {t("settings.ai.zhipuApiKey")}
            </label>
            <div className="flex space-x-3">
              <input
                type="password"
                value={zhipuApiKey}
                onChange={(e) => setZhipuApiKey(e.target.value)}
                placeholder={t("settings.ai.zhipuApiKeyPlaceholder")}
                className="flex-1 px-4 py-3 text-sm bg-white dark:bg-zinc-800/50 border border-gray-300 dark:border-zinc-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-gray-900 dark:text-zinc-200 placeholder-gray-500 dark:placeholder-zinc-500"
              />
              <Button
                onClick={testZhipuApiKey}
                variant="outline"
                disabled={!zhipuApiKey || zhipuTestStatus === "testing"}
                className="h-12 px-4 py-3 min-w-[80px] bg-white dark:bg-zinc-800/50 border-gray-300 dark:border-zinc-700/50 text-gray-900 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700/50 hover:border-gray-400 dark:hover:border-zinc-600/50"
              >
                {zhipuTestStatus === "testing" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  t("common.test")
                )}
              </Button>
            </div>

            {/* 智谱AI API test status display */}
            {zhipuTestStatus !== "idle" && zhipuTestMessage && (
              <div
                className={`mt-4 p-4 rounded-lg flex items-center space-x-3 backdrop-blur-sm ${
                  zhipuTestStatus === "success"
                    ? "bg-green-500/10 border border-green-500/20"
                    : zhipuTestStatus === "error"
                    ? "bg-red-500/10 border border-red-500/20"
                    : "bg-blue-500/10 border border-blue-500/20"
                }`}
              >
                {zhipuTestStatus === "success" && (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                )}
                {zhipuTestStatus === "error" && (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
                {zhipuTestStatus === "testing" && (
                  <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                )}
                <span
                  className={`text-sm font-medium ${
                    zhipuTestStatus === "success"
                      ? "text-green-300"
                      : zhipuTestStatus === "error"
                      ? "text-red-300"
                      : "text-blue-300"
                  }`}
                >
                  {zhipuTestMessage}
                </span>
              </div>
            )}

            <p className="text-xs text-gray-600 dark:text-zinc-400 mt-3">
              {t("settings.ai.getApiKey")}: {t("settings.ai.visitPlatform")}{" "}
              <a
                href="https://open.bigmodel.cn"
                target="_blank"
                className="text-blue-400 hover:text-blue-300 hover:underline font-medium transition-colors"
              >
                {t("settings.ai.zhipuPlatform")}
              </a>
            </p>
          </div>
          
          {/* 默认AI提供商 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-3">
              {t("settings.ai.defaultProvider")}
            </label>
            <Select
              value={defaultProvider}
              onChange={(e) => setDefaultProvider(e.target.value)}
            >
              {apiKey && (
                <Option value="deepseek">
                  🚀 {t("settings.ai.providers.deepseek")}
                </Option>
              )}
              {zhipuApiKey && (
                <Option value="zhipu">
                  🧠 {t("settings.ai.providers.zhipu")}
                </Option>
              )}
              {geminiApiKey && (
                <Option value="gemini">
                  🌟 {t("settings.ai.providers.gemini")}
                </Option>
              )}
              {!apiKey && !zhipuApiKey && !geminiApiKey && (
                <Option value="deepseek" disabled>
                  {t("settings.ai.noApiKeysConfigured")}
                </Option>
              )}
            </Select>
          </div>
          
          {/* DeepSeek模型选择 */}
          {defaultProvider === "deepseek" && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-3">
                {t("settings.ai.modelSelection")} (DeepSeek)
              </label>
              <Select
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                <Option value="deepseek-chat">
                  {t("settings.ai.models.deepseekV3")}
                </Option>
                <Option value="deepseek-reasoner">
                  {t("settings.ai.models.deepseekR1")}
                </Option>
              </Select>
            </div>
          )}
          
          {/* 智谱AI模型选择 */}
          {defaultProvider === "zhipu" && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-3">
                {t("settings.ai.modelSelection")} ({t("settings.ai.providers.zhipu")})
              </label>
              <Select
                value={zhipuModel}
                onChange={(e) => setZhipuModel(e.target.value)}
              >
                <Option value="glm-4">
                  {t("settings.ai.models.glm4")}
                </Option>
                <Option value="glm-4v">
                  {t("settings.ai.models.glm4v")}
                </Option>
                <Option value="glm-3-turbo">
                  {t("settings.ai.models.glm3Turbo")}
                </Option>
              </Select>
            </div>
          )}
          
          {/* Gemini模型选择 */}
          {defaultProvider === "gemini" && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-3">
                {t("settings.ai.modelSelection")} (Gemini)
              </label>
              <Select
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
              >
                <Option value="gemini-2.5-flash">
                  {t("settings.ai.models.gemini2Flash")}
                </Option>
                <Option value="gemini-2.5-pro">
                  {t("settings.ai.models.gemini2Pro")}
                </Option>
              </Select>
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
            <Select
              value={theme}
              onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
              className="focus:ring-purple-500/50 focus:border-purple-500/50"
            >
              <Option value="system">
                🖥️ {t('settings.theme.system')}
              </Option>
              <Option value="light">
                ☀️ {t('settings.theme.light')}
              </Option>
              <Option value="dark">
                🌙 {t('settings.theme.dark')}
              </Option>
            </Select>
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
            <Select
              value={language}
              onChange={(e) => switchLanguage(e.target.value as "en" | "zh")}
            >
              <Option value="en">
                🇺🇸 English
              </Option>
              <Option value="zh">
                🇨🇳 中文
              </Option>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-3 block">
              {t("settings.language.primary")}
            </label>
            <Select
              value={primaryLanguage}
              onChange={(e) => handlePrimaryLanguageChange(e.target.value)}
            >
              <Option value="en">
                🇺🇸 English
              </Option>
              <Option value="zh">
                🇨🇳 中文
              </Option>
              <Option value="ja">
                🇯🇵 日本語
              </Option>
              <Option value="ko">
                🇰🇷 한국어
              </Option>
              <Option value="fr">
                🇫🇷 Français
              </Option>
              <Option value="de">
                🇩🇪 Deutsch
              </Option>
              <Option value="es">
                🇪🇸 Español
              </Option>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-3 block">
              {t("settings.language.secondary")}
            </label>
            <Select
              value={secondaryLanguage}
              onChange={(e) => handleSecondaryLanguageChange(e.target.value)}
            >
              <Option value="en">
                🇺🇸 English
              </Option>
              <Option value="zh">
                🇨🇳 中文
              </Option>
              <Option value="ja">
                🇯🇵 日本語
              </Option>
              <Option value="ko">
                🇰🇷 한국어
              </Option>
              <Option value="fr">
                🇫🇷 Français
              </Option>
              <Option value="de">
                🇩🇪 Deutsch
              </Option>
              <Option value="es">
                🇪🇸 Español
              </Option>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
};

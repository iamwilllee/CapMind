import {
  BookOpen,
  Sparkles,
  Camera,
  MessageSquare,
  BookMarked,
  Settings,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "../../../../i18n";

interface ContentSummary {
  title: string;
  mainPoints: string[];
  keyTopics: string[];
  summary: string;
}

interface TreeNode {
  id: string;
  title: string;
  content?: string;
  children?: TreeNode[];
}

export const OverviewTab = () => {
  const { t } = useTranslation();
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [contentSummary, setContentSummary] = useState<ContentSummary | null>(
    null
  );
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [apiKey, setApiKey] = useState("");
  const [zhipuApiKey, setZhipuApiKey] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");

  const [model, setModel] = useState("deepseek-chat");
  const [zhipuModel, setZhipuModel] = useState("glm-4");
  const [geminiModel, setGeminiModel] = useState("gemini-2.5-flash");
  const [defaultProvider, setDefaultProvider] = useState("deepseek");
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");
  const [primaryLanguage, setPrimaryLanguage] = useState("en");

  useEffect(() => {
    // Check API Key configuration and first-time usage, load cached analysis results
    const checkSetup = async () => {
      try {
        // Get current page URL
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentPageUrl = tabs[0]?.url || "";
        setCurrentUrl(currentPageUrl);
        
        const result = await chrome.storage.sync.get([
          "deepseekApiKey",
          "zhipuApiKey",
          "geminiApiKey",
          "ai_model",
          "zhipu_model",
          "gemini_model",
          "default_provider",
          "first_time_setup",
          "cached_analysis",
          "has_analyzed",
          "cached_url",
          "primary_language"
        ]);
        
        // 检查是否有任何API密钥配置
        const hasKey = !!(result.deepseekApiKey || result.zhipuApiKey || result.geminiApiKey);
        setHasApiKey(hasKey);
        
        setApiKey(result.deepseekApiKey || "");
        setZhipuApiKey(result.zhipuApiKey || "");
        setGeminiApiKey(result.geminiApiKey || "");
        setModel(result.ai_model || "deepseek-chat");
        setZhipuModel(result.zhipu_model || "glm-4");
        setGeminiModel(result.gemini_model || "gemini-2.5-flash");
        setDefaultProvider(result.default_provider || "deepseek");
        setIsFirstTime(!result.first_time_setup);
        setPrimaryLanguage(result.primary_language || "en");
        
        // Check if URL changed, clear cache if it did
        if (result.cached_url && result.cached_url !== currentPageUrl) {
          // URL changed, clear cache
          await chrome.storage.sync.remove(["cached_analysis", "has_analyzed", "cached_url"]);
          setHasAnalyzed(false);
        } else if (result.cached_analysis && result.cached_url === currentPageUrl) {
          // Same URL, restore cached analysis results
          setContentSummary(result.cached_analysis.contentSummary);
          setTreeData(result.cached_analysis.treeData);
          setHasAnalyzed(!!result.has_analyzed);
        }
      } catch (error) {
        console.error(t('overview.errors.checkSettingsFailed'), error);
        setIsFirstTime(true);
      }
    };
    checkSetup();
  }, []);

  // Auto analyze page when hasApiKey status updates (first time only)
  useEffect(() => {
    if (hasApiKey && !hasAnalyzed && !contentSummary) {
      analyzeCurrentPage();
    }
  }, [hasApiKey, hasAnalyzed]);

  // Get current web page content
  const getCurrentPageContent = async (): Promise<string> => {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(
            tabs[0].id,
            { action: "getPageContent" },
            (response) => {
              if (chrome.runtime.lastError) {
                // If unable to get via content script, try direct access
                chrome.scripting.executeScript(
                  {
                    target: { tabId: tabs[0].id! },
                    func: () => {
                      // Get page title
                      const title = document.title;
                      // Get main content
                      const content =
                        document.body.innerText ||
                        document.body.textContent ||
                        "";
                      // Get page URL
                      const url = window.location.href;
                      return { title, content: content.slice(0, 5000), url }; // Limit content length
                    },
                  },
                  (results) => {
                    if (results && results[0]) {
                      const { title, content, url } = results[0].result;
                      resolve(
                        `${t('overview.pageTitle')}: ${title}\n${t('overview.pageUrl')}: ${url}\n\n${t('overview.pageContent')}:\n${content}`
                      );
                    } else {
                      resolve(t('overview.errors.cannotGetContent'));
                    }
                  }
                );
              } else {
                resolve(response?.content || t('overview.errors.cannotGetContent'));
              }
            }
          );
        } else {
          resolve(t('overview.errors.cannotGetCurrentPage'));
        }
      });
    });
  };

  // Analyze content using configured AI API
  const analyzeContent = async (content: string): Promise<ContentSummary> => {
    // Language mapping for analysis
    const languageMap: Record<string, string> = {
      'en': 'English',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'ko': 'Korean',
      'fr': 'French',
      'de': 'German',
      'es': 'Spanish'
    };
    
    const targetLanguage = languageMap[primaryLanguage] || 'English';
    
    const prompt = `Please analyze the following web page content and provide a comprehensive summary in ${targetLanguage}. Return the result in JSON format with the following structure:

{
  "title": "Page title or main topic",
  "summary": "Brief summary of the content (2-3 sentences)",
  "mainPoints": ["Key point 1", "Key point 2", "Key point 3"],
  "keyTopics": ["Topic 1", "Topic 2", "Topic 3"]
}

Web page content:
${content}`;

    let response: Response;
    
    // 根据默认提供商选择相应的API
    if (defaultProvider === "deepseek" && apiKey) {
      response = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 1000,
        }),
      });
    } else if (defaultProvider === "zhipu" && zhipuApiKey) {
      response = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${zhipuApiKey}`,
        },
        body: JSON.stringify({
          model: zhipuModel,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 1000,
        }),
      });
    } else if (defaultProvider === "gemini" && geminiApiKey) {
      // Google AI Studio API
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }],
            role: "user"
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2000,
          }
        })
      });
    } else {
      throw new Error(t('overview.errors.noValidApiKey'));
    }

    if (!response.ok) {
      throw new Error(`${t('overview.errors.apiRequestFailed')}: ${response.status}`);
    }

    const data = await response.json();
    let result = "";
    
    // 根据不同API提取响应内容
    if (defaultProvider === "gemini") {
      result = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else {
      result = data.choices?.[0]?.message?.content || "";
    }

    try {
      // 尝试解析JSON响应
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error(t('overview.errors.parseAIResponseFailed'), error);
    }

    // Return default structure if parsing fails
    return {
      title: t('overview.defaultAnalysis.title'),
      summary: result.slice(0, 200) + "...",
      mainPoints: [t('overview.defaultAnalysis.aiResult'), t('overview.defaultAnalysis.checkDetails')],
      keyTopics: [t('overview.defaultAnalysis.webContent'), t('overview.defaultAnalysis.smartAnalysis')],
    };
  };

  // Convert content summary to tree structure
  const convertToTreeData = (summary: ContentSummary): TreeNode[] => {
    return [
      {
        id: "summary",
        title: summary.title,
        content: summary.summary,
        children: [
          {
            id: "main-points",
            title: t('overview.mainPoints'),
            children: summary.mainPoints.map((point, index) => ({
              id: `point-${index}`,
              title: point,
            })),
          },
          {
            id: "key-topics",
            title: t('overview.keyTopics'),
            children: summary.keyTopics.map((topic, index) => ({
              id: `topic-${index}`,
              title: topic,
            })),
          },
        ],
      },
    ];
  };

  // Analyze current page
  const analyzeCurrentPage = async () => {
    if (!hasApiKey) {
      alert(t('overview.errors.configureApiKey'));
      return;
    }

    setIsLoading(true);
    try {
      const content = await getCurrentPageContent();
      const summary = await analyzeContent(content);
      const treeDataResult = convertToTreeData(summary);
      
      setContentSummary(summary);
      setTreeData(treeDataResult);
      setHasAnalyzed(true);
      
      // Save analysis results to cache
      await chrome.storage.sync.set({
        cached_analysis: {
          contentSummary: summary,
          treeData: treeDataResult
        },
        has_analyzed: true,
        cached_url: currentUrl
      });
    } catch (error) {
      console.error(t('overview.errors.analyzePageFailed'), error);
      alert(t('overview.errors.analysisFailedCheckKey'));
    } finally {
      setIsLoading(false);
    }
  };

  // Render tree nodes
  const renderTreeNode = (node: TreeNode, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isLeaf = !hasChildren;
    const paddingLeft = level * 24 + 12;

    return (
      <div key={node.id} className="relative">
        <div
          className="flex items-center py-3 px-3 hover:bg-gray-100 dark:hover:bg-zinc-800/30 rounded-lg relative transition-all duration-200"
          style={{ paddingLeft: `${paddingLeft}px` }}
        >
          {/* Dot marker */}
          <div className="mr-4 flex items-center justify-center">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                level === 0
                  ? "bg-blue-400"
                  : isLeaf
                  ? "bg-cyan-400"
                  : "bg-blue-300"
              }`}
            />
          </div>

          <span className="text-sm font-medium text-gray-800 dark:text-zinc-200">
            {node.title}
          </span>
        </div>

        {/* Show content summary (top-level nodes only) */}
        {node.content && level === 0 && (
          <div className="ml-10 mb-3 text-sm text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-800/40 p-4 rounded-lg border-l-4 border-blue-400 backdrop-blur-sm">
            {node.content}
          </div>
        )}

        {/* Always show all child nodes */}
        {hasChildren && (
          <div>
            {node.children!.map((child) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 bg-white dark:bg-zinc-950">
      {/* First-time usage guide */}
        {(isFirstTime || !hasApiKey) && (
          <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/50 rounded-xl p-6 mb-6 backdrop-blur-sm">
            <div className="flex items-start space-x-4">
              <AlertCircle className="w-6 h-6 text-orange-500 dark:text-orange-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-orange-800 dark:text-orange-200 mb-3 text-lg">
                  {isFirstTime ? t('overview.welcome.title') : t('overview.welcome.configRequired')}
                </h3>
                <p className="text-sm text-orange-700 dark:text-orange-300 mb-4 leading-relaxed">
                  {isFirstTime
                    ? t('overview.welcome.firstTimeMessage')
                    : t('overview.welcome.configMessage')}
                </p>
                <button
                  onClick={() => {
                    // Logic to switch to settings page needs to be passed through parent component
                    window.dispatchEvent(new CustomEvent("switchToSettings"));
                  }}
                  className="text-sm bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-all duration-200 font-medium cursor-pointer shadow-sm"
                >
                  {t('overview.welcome.goToSettings')}
                </button>
              </div>
            </div>
          </div>
        )}

      <div className="space-y-6">
        {/* Analysis results */}
        {contentSummary && treeData.length > 0 && (
          <div className="bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50 rounded-xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-zinc-100 flex items-center text-lg">
                <BookOpen className="w-5 h-5 mr-3 text-blue-400" />
                {t('overview.pageContentAnalysis')}
              </h3>
              <button
                onClick={analyzeCurrentPage}
                disabled={isLoading}
                className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800/50 cursor-pointer"
                title={t('overview.reanalyze')}
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                />
                <span className="text-sm font-medium">{isLoading ? t('overview.analyzing') : t('overview.refresh')}</span>
              </button>
            </div>
            <div className="space-y-3">
              {treeData.map((node) => renderTreeNode(node))}
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading && !contentSummary && (
          <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 rounded-xl p-6 backdrop-blur-sm">
            <div className="flex items-center space-x-4">
              <RefreshCw className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 text-lg">
                  {t('overview.analyzingPageContent')}
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-200 mt-2 leading-relaxed">
                  {t('overview.aiAnalyzingInfo')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Feature description */}
        {!contentSummary && !isLoading && (
          <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 rounded-xl p-6 backdrop-blur-sm">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-4 flex items-center text-lg">
              <Sparkles className="w-5 h-5 mr-3 text-blue-600 dark:text-blue-400" />
              {t('overview.featureDescription.title')}
            </h3>
            <div className="text-sm text-blue-700 dark:text-blue-200 space-y-3 leading-relaxed">
              <p>• {t('overview.featureDescription.autoAnalysis')}</p>
              <p>• {t('overview.featureDescription.treeStructure')}</p>
              <p>• {t('overview.featureDescription.refreshButton')}</p>
              <p>• {t('overview.featureDescription.aiTechnology')}</p>
            </div>
          </div>
        )}

        {hasApiKey && (
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/50 rounded-xl p-6 backdrop-blur-sm">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 dark:bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold text-green-800 dark:text-green-200">{t('overview.aiReady.title')}</span>
            </div>
            <p className="text-sm text-green-700 dark:text-green-300 mt-2 leading-relaxed">
              {t('overview.aiReady.message')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

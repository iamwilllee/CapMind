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
import { useTranslation } from "../../../../src/i18n";

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
  const [model, setModel] = useState("deepseek-chat");
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");

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
          "ai_model",
          "first_time_setup",
          "cached_analysis",
          "has_analyzed",
          "cached_url"
        ]);
        const hasKey = !!result.deepseekApiKey;
        setHasApiKey(hasKey);
        setApiKey(result.deepseekApiKey || "");
        setModel(result.ai_model || "deepseek-chat");
        setIsFirstTime(!result.first_time_setup);
        
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

  // Analyze content using DeepSeek API
  const analyzeContent = async (content: string): Promise<ContentSummary> => {
    const prompt = `${t('overview.analysisPrompt')}

{
  "title": "${t('overview.promptFields.title')}",
  "summary": "${t('overview.promptFields.summary')}",
  "mainPoints": ["${t('overview.promptFields.point1')}", "${t('overview.promptFields.point2')}", "${t('overview.promptFields.point3')}"],
  "keyTopics": ["${t('overview.promptFields.topic1')}", "${t('overview.promptFields.topic2')}", "${t('overview.promptFields.topic3')}"]
}

${t('overview.webContent')}：
${content}`;

    const response = await fetch(
      "https://api.deepseek.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 1000,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`${t('overview.errors.apiRequestFailed')}: ${response.status}`);
    }

    const data = await response.json();
    const result = data.choices[0]?.message?.content || "";

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
    const paddingLeft = level * 20 + 8;

    return (
      <div key={node.id} className="relative">
        <div
          className="flex items-center py-2 px-2 hover:bg-gray-50 rounded relative"
          style={{ paddingLeft: `${paddingLeft}px` }}
        >
          {/* Dot marker */}
          <div className="mr-3 flex items-center justify-center">
            <div
              className={`w-2 h-2 rounded-full ${
                level === 0
                  ? "bg-blue-600"
                  : isLeaf
                  ? "bg-blue-400"
                  : "bg-blue-500"
              }`}
            />
          </div>

          <span className="text-sm font-medium text-gray-800">
            {node.title}
          </span>
        </div>

        {/* Show content summary (top-level nodes only) */}
        {node.content && level === 0 && (
          <div className="ml-8 mb-2 text-sm text-gray-600 bg-gray-50 p-3 rounded border-l-4 border-blue-500">
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
    <div className="p-4">
      {/* First-time usage guide */}
      {(isFirstTime || !hasApiKey) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-800 mb-2">
                {isFirstTime ? t('overview.welcome.title') : t('overview.welcome.configRequired')}
              </h3>
              <p className="text-sm text-amber-700 mb-3">
                {isFirstTime
                  ? t('overview.welcome.firstTimeMessage')
                  : t('overview.welcome.configMessage')}
              </p>
              <button
                onClick={() => {
                  // Logic to switch to settings page needs to be passed through parent component
                  window.dispatchEvent(new CustomEvent("switchToSettings"));
                }}
                className="text-sm bg-amber-600 text-white px-3 py-1 rounded hover:bg-amber-700 transition-colors"
              >
                {t('overview.welcome.goToSettings')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Analysis results */}
        {contentSummary && treeData.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900 flex items-center">
                <BookOpen className="w-4 h-4 mr-2" />
                {t('overview.pageContentAnalysis')}
              </h3>
              <button
                onClick={analyzeCurrentPage}
                disabled={isLoading}
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors p-1 rounded"
                title={t('overview.reanalyze')}
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                />
                <span className="text-sm">{isLoading ? t('overview.analyzing') : t('overview.refresh')}</span>
              </button>
            </div>
            <div className="space-y-2">
              {treeData.map((node) => renderTreeNode(node))}
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading && !contentSummary && (
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
              <div>
                <h3 className="font-medium text-blue-900">
                  {t('overview.analyzingPageContent')}
                </h3>
                <p className="text-sm text-blue-700 mt-1">
                  {t('overview.aiAnalyzingInfo')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Feature description */}
        {!contentSummary && !isLoading && (
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-3 flex items-center">
              <Sparkles className="w-4 h-4 mr-2" />
              {t('overview.featureDescription.title')}
            </h3>
            <div className="text-sm text-blue-700 space-y-2">
              <p>• {t('overview.featureDescription.autoAnalysis')}</p>
              <p>• {t('overview.featureDescription.treeStructure')}</p>
              <p>• {t('overview.featureDescription.refreshButton')}</p>
              <p>• {t('overview.featureDescription.aiTechnology')}</p>
            </div>
          </div>
        )}

        {hasApiKey && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-green-800">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium">{t('overview.aiReady.title')}</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              {t('overview.aiReady.message')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

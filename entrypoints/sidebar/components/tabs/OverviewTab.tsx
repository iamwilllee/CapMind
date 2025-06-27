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
    // 检查是否配置了 API Key 和是否首次使用，同时加载缓存的分析结果
    const checkSetup = async () => {
      try {
        // 获取当前页面URL
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentPageUrl = tabs[0]?.url || "";
        setCurrentUrl(currentPageUrl);
        
        const result = await chrome.storage.sync.get([
          "deepseek_api_key",
          "ai_model",
          "first_time_setup",
          "cached_analysis",
          "has_analyzed",
          "cached_url"
        ]);
        const hasKey = !!result.deepseek_api_key;
        setHasApiKey(hasKey);
        setApiKey(result.deepseek_api_key || "");
        setModel(result.ai_model || "deepseek-chat");
        setIsFirstTime(!result.first_time_setup);
        
        // 检查URL是否发生变化，如果变化了就清除缓存
        if (result.cached_url && result.cached_url !== currentPageUrl) {
          // URL变化了，清除缓存
          await chrome.storage.sync.remove(["cached_analysis", "has_analyzed", "cached_url"]);
          setHasAnalyzed(false);
        } else if (result.cached_analysis && result.cached_url === currentPageUrl) {
          // URL相同，恢复缓存的分析结果
          setContentSummary(result.cached_analysis.contentSummary);
          setTreeData(result.cached_analysis.treeData);
          setHasAnalyzed(!!result.has_analyzed);
        }
      } catch (error) {
        console.error("检查设置失败:", error);
        setIsFirstTime(true);
      }
    };
    checkSetup();
  }, []);

  // 当 hasApiKey 状态更新后，自动分析页面（仅首次）
  useEffect(() => {
    if (hasApiKey && !hasAnalyzed && !contentSummary) {
      analyzeCurrentPage();
    }
  }, [hasApiKey, hasAnalyzed]);

  // 获取当前网页内容
  const getCurrentPageContent = async (): Promise<string> => {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(
            tabs[0].id,
            { action: "getPageContent" },
            (response) => {
              if (chrome.runtime.lastError) {
                // 如果无法通过content script获取，尝试直接获取
                chrome.scripting.executeScript(
                  {
                    target: { tabId: tabs[0].id! },
                    func: () => {
                      // 获取页面标题
                      const title = document.title;
                      // 获取主要内容
                      const content =
                        document.body.innerText ||
                        document.body.textContent ||
                        "";
                      // 获取页面URL
                      const url = window.location.href;
                      return { title, content: content.slice(0, 5000), url }; // 限制内容长度
                    },
                  },
                  (results) => {
                    if (results && results[0]) {
                      const { title, content, url } = results[0].result;
                      resolve(
                        `标题: ${title}\n网址: ${url}\n\n内容:\n${content}`
                      );
                    } else {
                      resolve("无法获取页面内容");
                    }
                  }
                );
              } else {
                resolve(response?.content || "无法获取页面内容");
              }
            }
          );
        } else {
          resolve("无法获取当前页面");
        }
      });
    });
  };

  // 使用DeepSeek API分析内容
  const analyzeContent = async (content: string): Promise<ContentSummary> => {
    const prompt = `请分析以下网页内容，并按照以下JSON格式返回结构化的总结：

{
  "title": "页面主题标题",
  "summary": "简洁的内容摘要（2-3句话）",
  "mainPoints": ["要点1", "要点2", "要点3"],
  "keyTopics": ["关键主题1", "关键主题2", "关键主题3"]
}

网页内容：
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
      throw new Error(`API 请求失败: ${response.status}`);
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
      console.error("解析AI响应失败:", error);
    }

    // 如果解析失败，返回默认结构
    return {
      title: "内容分析",
      summary: result.slice(0, 200) + "...",
      mainPoints: ["AI分析结果", "请查看详细内容"],
      keyTopics: ["网页内容", "智能分析"],
    };
  };

  // 将内容总结转换为树状结构
  const convertToTreeData = (summary: ContentSummary): TreeNode[] => {
    return [
      {
        id: "summary",
        title: summary.title,
        content: summary.summary,
        children: [
          {
            id: "main-points",
            title: "主要要点",
            children: summary.mainPoints.map((point, index) => ({
              id: `point-${index}`,
              title: point,
            })),
          },
          {
            id: "key-topics",
            title: "关键主题",
            children: summary.keyTopics.map((topic, index) => ({
              id: `topic-${index}`,
              title: topic,
            })),
          },
        ],
      },
    ];
  };

  // 分析当前页面
  const analyzeCurrentPage = async () => {
    if (!hasApiKey) {
      alert("请先配置 DeepSeek API Key");
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
      
      // 将分析结果保存到缓存
      await chrome.storage.sync.set({
        cached_analysis: {
          contentSummary: summary,
          treeData: treeDataResult
        },
        has_analyzed: true,
        cached_url: currentUrl
      });
    } catch (error) {
      console.error("分析页面失败:", error);
      alert("分析页面失败，请检查API Key是否正确");
    } finally {
      setIsLoading(false);
    }
  };

  // 渲染树节点
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
          {/* 圆点标记 */}
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

        {/* 显示内容摘要（仅顶级节点） */}
        {node.content && level === 0 && (
          <div className="ml-8 mb-2 text-sm text-gray-600 bg-gray-50 p-3 rounded border-l-4 border-blue-500">
            {node.content}
          </div>
        )}

        {/* 始终显示所有子节点 */}
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
      {/* 首次使用引导 */}
      {(isFirstTime || !hasApiKey) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-800 mb-2">
                {isFirstTime ? "欢迎使用 CapMind！" : "需要配置 API Key"}
              </h3>
              <p className="text-sm text-amber-700 mb-3">
                {isFirstTime
                  ? "为了使用 AI 功能，请先在设置中配置您的 DeepSeek API Key。"
                  : "检测到您还未配置 DeepSeek API Key，请前往设置页面进行配置。"}
              </p>
              <button
                onClick={() => {
                  // 切换到设置页面的逻辑需要通过父组件传递
                  window.dispatchEvent(new CustomEvent("switchToSettings"));
                }}
                className="text-sm bg-amber-600 text-white px-3 py-1 rounded hover:bg-amber-700 transition-colors"
              >
                前往设置
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* 分析结果 */}
        {contentSummary && treeData.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900 flex items-center">
                <BookOpen className="w-4 h-4 mr-2" />
                页面内容分析
              </h3>
              <button
                onClick={analyzeCurrentPage}
                disabled={isLoading}
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors p-1 rounded"
                title="重新分析"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                />
                <span className="text-sm">{isLoading ? "分析中" : "刷新"}</span>
              </button>
            </div>
            <div className="space-y-2">
              {treeData.map((node) => renderTreeNode(node))}
            </div>
          </div>
        )}

        {/* 加载状态 */}
        {isLoading && !contentSummary && (
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
              <div>
                <h3 className="font-medium text-blue-900">
                  正在分析页面内容...
                </h3>
                <p className="text-sm text-blue-700 mt-1">
                  AI 正在提取并分析当前网页的关键信息
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 功能说明 */}
        {!contentSummary && !isLoading && (
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-3 flex items-center">
              <Sparkles className="w-4 h-4 mr-2" />
              功能说明
            </h3>
            <div className="text-sm text-blue-700 space-y-2">
              <p>• 打开 Overview 页面时，AI 将自动分析当前网页内容</p>
              <p>• 分析结果将以树状结构展示，包含主要要点和关键主题</p>
              <p>• 点击右上角刷新按钮可重新分析页面内容</p>
              <p>• 基于 DeepSeek AI 技术，提供智能内容理解</p>
            </div>
          </div>
        )}

        {hasApiKey && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-green-800">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium">AI 功能已就绪</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              您已成功配置 API Key，可以开始使用所有 AI 功能了！
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

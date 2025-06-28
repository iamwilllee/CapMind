import React, { useState, useEffect, useRef } from "react";
import { X, Send, Sparkles, Brain } from "lucide-react";
import { useTranslation } from "../../../src/i18n";
import { Button } from "../../../components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

// 打字机效果组件
interface TypewriterProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
}

const Typewriter: React.FC<TypewriterProps> = ({
  text,
  speed = 30,
  onComplete,
}) => {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayText((prev) => prev + text[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, speed);
      return () => clearTimeout(timer);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, speed, onComplete]);

  useEffect(() => {
    setDisplayText("");
    setCurrentIndex(0);
  }, [text]);

  return (
    <div className="prose prose-sm max-w-none prose-zinc dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="mb-3 last:mb-0 text-gray-800 dark:text-zinc-200 leading-relaxed">
              {children}
            </p>
          ),
          code: ({ children, className }) => {
            const isInlineCode = !className;
            if (isInlineCode) {
              return (
                <code className="bg-gray-100 dark:bg-zinc-800/70 text-red-600 dark:text-red-400 px-2 py-1 rounded text-xs font-mono border border-gray-200 dark:border-zinc-700">
                  {children}
                </code>
              );
            }
            return (
              <code className="block">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <div className="relative my-4 group">
              <pre className="bg-gray-900 dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 rounded-lg p-4 overflow-x-auto text-sm font-mono shadow-lg">
                <code className="text-gray-100 dark:text-zinc-200 leading-relaxed">
                  {children}
                </code>
              </pre>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs font-mono">
                  代码
                </div>
              </div>
            </div>
          ),
          ul: ({ children }) => (
            <ul className="list-disc ml-4 mb-4 space-y-1 text-gray-800 dark:text-zinc-200">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal ml-4 mb-4 space-y-1 text-gray-800 dark:text-zinc-200">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-gray-800 dark:text-zinc-200 leading-relaxed">
              {children}
            </li>
          ),
          h1: ({ children }) => (
            <h1 className="text-lg font-bold mb-4 mt-6 first:mt-0 text-gray-900 dark:text-zinc-100 border-b border-gray-200 dark:border-zinc-700 pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-bold mb-3 mt-5 first:mt-0 text-gray-900 dark:text-zinc-100">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-bold mb-2 mt-4 first:mt-0 text-gray-900 dark:text-zinc-100">
              {children}
            </h3>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-500/50 pl-4 my-4 italic text-gray-600 dark:text-zinc-300 bg-gray-50 dark:bg-zinc-800/30 py-3 rounded-r">
              {children}
            </blockquote>
          ),
          hr: () => (
            <hr className="my-6 border-gray-200 dark:border-zinc-700" />
          ),
        }}
      >
        {displayText}
      </ReactMarkdown>
    </div>
  );
};

export const ChatDrawer: React.FC<ChatDrawerProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("deepseek-chat");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [includePageContent, setIncludePageContent] = useState(true);
  const [pageContent, setPageContent] = useState("");
  const [showContextHint, setShowContextHint] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    // 加载保存的 API Key
    const loadApiKey = async () => {
      try {
        const result = await chrome.storage.sync.get([
          "deepseekApiKey",
          "ai_model",
        ]);
        if (result.deepseekApiKey) {
          setApiKey(result.deepseekApiKey);
        }
        if (result.ai_model) {
          setModel(result.ai_model);
        }
      } catch (error) {
        console.error("加载设置失败:", error);
      }
    };
    loadApiKey();
  }, []);

  useEffect(() => {
    // Auto scroll to latest message
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    // Get page content
    const getPageContent = async () => {
      try {
        const response = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (response[0]?.id) {
          const result = await chrome.tabs.sendMessage(response[0].id, {
            action: "getPageContent",
          });
          if (result?.success && result.content) {
            setPageContent(result.content);
          }
        }
      } catch (error) {
        console.error(t("chat.errors.getPageContentFailed"), error);
      }
    };

    if (isOpen && includePageContent) {
      getPageContent();
    }
  }, [isOpen, includePageContent]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const sendMessage = async (content: string) => {
    if (!apiKey) {
      const shouldGoToSettings = confirm(t("chat.errors.noApiKey"));
      if (shouldGoToSettings) {
        onClose();
        window.dispatchEvent(new CustomEvent("switchToSettings"));
      }
      return;
    }

    // Build message content, include page content if context is enabled
    let messageContent = content;
    if (includePageContent && pageContent) {
      messageContent = `${content}\n\n--- ${t(
        "chat.context.pageContext"
      )} ---\n${pageContent}`;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Build API request message list
      const apiMessages = [...messages, userMessage].map((msg) => {
        // Only current message needs page content context
        if (msg.id === userMessage.id && includePageContent && pageContent) {
          return {
            role: msg.role,
            content: messageContent,
          };
        }
        return {
          role: msg.role,
          content: msg.content,
        };
      });

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
            messages: apiMessages,
            temperature: 0.7,
            max_tokens: 2000,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          t("chat.errors.apiRequestFailed", { status: response.status })
        );
      }

      const data = await response.json();
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          data.choices[0]?.message?.content || t("chat.errors.noResponse"),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: t("chat.error"),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    await sendMessage(input.trim());
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: "rgba(0, 0, 0, 0.4)" }}
    >
      <div
        className="bg-white dark:bg-zinc-950 shadow-2xl flex flex-col rounded-t-3xl border border-gray-200 dark:border-zinc-700/70"
        style={{
          height: "calc(100vh - 60px)",
          marginTop: "60px",
          marginLeft: "8px",
          marginRight: "8px",
          marginBottom: "8px",
          width: "calc(100% - 16px)",
          boxShadow:
            "0 -25px 50px -12px rgba(0, 0, 0, 0.8), 0 -12px 25px -6px rgba(0, 0, 0, 0.6), 0 0 80px rgba(59, 130, 246, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-zinc-800/50 bg-gray-50 dark:bg-zinc-900/50 rounded-t-3xl backdrop-blur-sm">
          <div className="flex items-center space-x-4">
            <div className="relative p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl shadow-sm">
              <Brain className="w-6 h-6 text-blue-400" />
              <Sparkles className="w-3 h-3 text-purple-400 absolute -top-1 -right-1 animate-pulse" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-100">
              {t("chat.title")}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800/50 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-6 h-6 text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 dark:text-zinc-400 mt-20">
              <div className="relative p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl w-24 h-24 mx-auto mb-8 flex items-center justify-center backdrop-blur-sm">
                <Brain className="w-12 h-12 text-blue-400" />
                <Sparkles className="w-6 h-6 text-purple-400 absolute -top-2 -right-2 animate-pulse" />
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-2xl animate-pulse"></div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-zinc-200 mb-3">
                {t("chat.welcome.title")}
              </h3>
              <p className="text-sm text-gray-600 dark:text-zinc-400 leading-relaxed max-w-xs mx-auto">
                {t("chat.welcome.subtitle")}
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-5 py-4 text-sm shadow-lg backdrop-blur-sm ${
                  message.role === "user"
                    ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium"
                    : "bg-gray-100 dark:bg-zinc-900/70 border border-gray-200 dark:border-zinc-700/50 text-gray-900 dark:text-zinc-200"
                }`}
              >
                {message.role === "user" ? (
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {message.content}
                  </p>
                ) : (
                  <Typewriter text={message.content} speed={20} />
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-zinc-900/70 border border-gray-200 dark:border-zinc-700/50 rounded-2xl px-5 py-4 text-sm shadow-lg backdrop-blur-sm">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Context Hint */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-zinc-900/30 border-t border-gray-200 dark:border-zinc-800/50 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="includeContext"
                  checked={includePageContent}
                  onChange={(e) => setIncludePageContent(e.target.checked)}
                  className="w-4 h-4 text-blue-500 bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-600 rounded focus:ring-blue-500/50 focus:ring-2"
                />
                <label
                  htmlFor="includeContext"
                  className="text-gray-700 dark:text-zinc-300 cursor-pointer font-medium"
                >
                  {t("chat.context.includePageContent")}
                </label>
              </div>
              {includePageContent && pageContent && (
                <span className="text-blue-600 dark:text-blue-300 bg-blue-500/20 px-3 py-1 rounded-full text-xs font-medium">
                  {t("chat.context.pageContentFetched")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="p-6 border-t border-gray-200 dark:border-zinc-800/50 bg-gray-50 dark:bg-zinc-900/30 backdrop-blur-sm">
          <form onSubmit={onSubmit} className="flex space-x-4">
            <input
              value={input}
              onChange={handleInputChange}
              placeholder={t("chat.placeholder")}
              className="flex-1 px-4 py-3 text-sm border border-gray-300 dark:border-zinc-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all bg-white dark:bg-zinc-800/50 text-gray-900 dark:text-zinc-200 placeholder-gray-500 dark:placeholder-zinc-500 shadow-sm h-12"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="sm"
              disabled={isLoading || !input.trim()}
              className="px-5 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg transition-all h-12 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

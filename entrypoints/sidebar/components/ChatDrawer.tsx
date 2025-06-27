import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: string;
  role: 'user' | 'assistant';
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

const Typewriter: React.FC<TypewriterProps> = ({ text, speed = 30, onComplete }) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timer);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, speed, onComplete]);

  useEffect(() => {
    setDisplayText('');
    setCurrentIndex(0);
  }, [text]);

  return (
    <div className="prose prose-sm max-w-none prose-gray dark:prose-invert">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          code: ({ children }) => <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">{children}</code>,
          pre: ({ children }) => <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">{children}</pre>,
          ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
          blockquote: ({ children }) => <blockquote className="border-l-4 border-gray-300 pl-3 italic">{children}</blockquote>,
        }}
      >
        {displayText}
      </ReactMarkdown>
    </div>
  );
};

export const ChatDrawer: React.FC<ChatDrawerProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('deepseek-chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [includePageContent, setIncludePageContent] = useState(true);
  const [pageContent, setPageContent] = useState('');
  const [showContextHint, setShowContextHint] = useState(true);

  useEffect(() => {
    // 加载保存的 API Key
    const loadApiKey = async () => {
      try {
        const result = await chrome.storage.sync.get(['deepseek_api_key', 'ai_model']);
        if (result.deepseek_api_key) {
          setApiKey(result.deepseek_api_key);
        }
        if (result.ai_model) {
          setModel(result.ai_model);
        }
      } catch (error) {
        console.error('加载设置失败:', error);
      }
    };
      loadApiKey();
    }, []);

  useEffect(() => {
    // 自动滚动到最新消息
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // 获取页面内容
    const getPageContent = async () => {
      try {
        const response = await chrome.tabs.query({ active: true, currentWindow: true });
        if (response[0]?.id) {
          const result = await chrome.tabs.sendMessage(response[0].id, { action: 'getPageContent' });
          if (result?.success && result.content) {
            setPageContent(result.content);
          }
        }
      } catch (error) {
        console.error('获取页面内容失败:', error);
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
      const shouldGoToSettings = confirm('请先在设置中配置 DeepSeek API Key。是否现在前往设置页面？');
      if (shouldGoToSettings) {
        onClose();
        window.dispatchEvent(new CustomEvent('switchToSettings'));
      }
      return;
    }

    // 构建消息内容，如果启用了页面内容上下文则包含页面内容
    let messageContent = content;
    if (includePageContent && pageContent) {
      messageContent = `${content}\n\n--- 页面上下文 ---\n${pageContent}`;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // 构建API请求的消息列表
      const apiMessages = [...messages, userMessage].map(msg => {
        // 只有当前消息需要包含页面内容上下文
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

      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: apiMessages,
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.choices[0]?.message?.content || '抱歉，我无法回答这个问题。',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，发生了错误。请检查你的 API Key 是否正确，或稍后再试。',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
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
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0, 0, 0, 0.1)' }}>
      <div 
        className="bg-white shadow-2xl flex flex-col rounded-t-3xl border border-gray-200" 
        style={{ 
          height: 'calc(100vh - 60px)', 
          marginTop: '60px',
          marginLeft: '8px',
          marginRight: '8px',
          marginBottom: '8px',
          width: 'calc(100% - 16px)',
          boxShadow: '0 -20px 40px -8px rgba(0, 0, 0, 0.15), 0 -8px 16px -4px rgba(0, 0, 0, 0.1)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-3xl">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-xl shadow-sm">
              <MessageCircle className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">AI 助手</h2>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </Button>
        </div>



        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-16">
              <div className="p-4 bg-blue-50 rounded-2xl w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <MessageCircle className="w-10 h-10 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">开始对话</h3>
              <p className="text-sm text-gray-500 mb-1">我是您的智能助手，可以帮您：</p>
              <div className="text-xs text-gray-400 space-y-1 max-w-xs mx-auto">
                <p>• 解答各种问题</p>
                <p>• 分析网页内容</p>
                <p>• 翻译和学习辅助</p>
              </div>
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                    : 'bg-white border border-gray-200 text-gray-900'
                }`}
              >
                {message.role === 'user' ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                ) : (
                  <Typewriter text={message.content} speed={20} />
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm shadow-sm">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Context Hint */}
        {showContextHint && (
          <div className="px-4 py-2 bg-blue-50 border-t border-blue-100">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <input
                    type="checkbox"
                    id="includeContext"
                    checked={includePageContent}
                    onChange={(e) => setIncludePageContent(e.target.checked)}
                    className="w-3 h-3 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="includeContext" className="text-blue-700 cursor-pointer">
                    包含页面内容
                  </label>
                </div>
                {includePageContent && pageContent && (
                  <span className="text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full text-xs">
                    已获取页面内容
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowContextHint(false)}
                className="text-blue-400 hover:text-blue-600 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <form onSubmit={onSubmit} className="flex space-x-3">
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="输入你的问题..."
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white shadow-sm h-10"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="sm"
              disabled={isLoading || !input.trim()}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl shadow-sm transition-all h-10"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
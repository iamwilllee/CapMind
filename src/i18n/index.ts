import { useState, useEffect, useCallback } from 'react';
import en from './locales/en.json';
import zh from './locales/zh.json';

type Messages = typeof en;
type Language = 'en' | 'zh';

const messages: Record<Language, Messages> = {
  en,
  zh
};

// 获取浏览器语言设置
const getBrowserLanguage = (): Language => {
  // 默认使用英文
  return 'en';
};

// 从存储中获取用户设置的语言
const getStoredLanguage = async (): Promise<Language> => {
  try {
    const result = await chrome.storage.sync.get(['language']);
    return result.language || 'en'; // 默认英文
  } catch {
    return 'en'; // 默认英文
  }
};

// 全局语言状态
let currentLanguage: Language = 'en';
const languageListeners: Set<(lang: Language) => void> = new Set();

// 初始化语言设置
export const initializeLanguage = async (): Promise<Language> => {
  const language = await getStoredLanguage();
  currentLanguage = language;
  languageListeners.forEach(listener => listener(language));
  return language;
};

// 切换语言
export const switchLanguage = async (language: Language): Promise<void> => {
  currentLanguage = language;
  await chrome.storage.sync.set({ language });
  languageListeners.forEach(listener => listener(language));
};

// 获取当前语言
export const getCurrentLanguage = (): Language => {
  return currentLanguage;
};

// 翻译函数
export const t = (key: string, params?: Record<string, any>): any => {
  const keys = key.split('.');
  let value: any = messages[currentLanguage];
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // 回退到英文
      value = messages.en;
      for (const fallbackKey of keys) {
        if (value && typeof value === 'object' && fallbackKey in value) {
          value = value[fallbackKey];
        } else {
          return key; // 如果都找不到，返回key本身
        }
      }
      break;
    }
  }
  
  // 如果是数组，直接返回
  if (Array.isArray(value)) {
    return value;
  }
  
  if (typeof value !== 'string') {
    return key;
  }
  
  // 简单的参数替换
  if (params) {
    return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
      return params[paramKey] || match;
    });
  }
  
  return value;
};

// React Hook for translations
export const useTranslation = () => {
  const [language, setLanguage] = useState<Language>(currentLanguage);
  
  useEffect(() => {
    // 初始化语言
    initializeLanguage().then(setLanguage);
    
    // 监听语言变化
    const listener = (lang: Language) => setLanguage(lang);
    languageListeners.add(listener);
    
    return () => {
      languageListeners.delete(listener);
    };
  }, []);
  
  const switchLang = useCallback(async (lang: Language) => {
    await switchLanguage(lang);
  }, []);
  
  const translate = useCallback((key: string, params?: Record<string, any>) => {
    return t(key, params);
  }, [language]); // 依赖language确保重新渲染
  
  return {
    t: translate,
    language,
    switchLanguage: switchLang,
    isZh: language === 'zh',
    isEn: language === 'en'
  };
};
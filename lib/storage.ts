import { Word } from './vocabulary';

export interface StorageData {
  vocabulary: Word[];
  screenshots: ScreenshotData[];
  settings: AppSettings;
  apiKeys: APIKeys;
}

export interface ScreenshotData {
  id: string;
  dataUrl: string;
  timestamp: number;
  metadata?: {
    url?: string;
    title?: string;
    area?: {
      left: number;
      top: number;
      width: number;
      height: number;
    };
  };
  analyzedText?: string;
  extractedWords?: string[];
}

export interface AppSettings {
  autoAnalyze: boolean;
  autoExtractWords: boolean;
  language: 'zh' | 'en';
  theme: 'light' | 'dark' | 'auto';
  maxScreenshots: number;
  reviewReminder: boolean;
  reviewInterval: number; // 小时
}

export interface APIKeys {
  googleVisionApiKey?: string;
  openaiApiKey?: string;
  youdaoAppKey?: string;
  youdaoAppSecret?: string;
}

/**
 * 默认设置
 */
const DEFAULT_SETTINGS: AppSettings = {
  autoAnalyze: true,
  autoExtractWords: true,
  language: 'zh',
  theme: 'auto',
  maxScreenshots: 50,
  reviewReminder: true,
  reviewInterval: 24
};

/**
 * 获取存储的单词
 */
export async function getStoredWords(): Promise<Word[]> {
  try {
    const result = await chrome.storage.local.get(['vocabulary']);
    return result.vocabulary || [];
  } catch (error) {
    console.error('获取单词失败:', error);
    return [];
  }
}

/**
 * 保存单词到存储
 */
export async function saveWordToStorage(word: Word): Promise<void> {
  try {
    const words = await getStoredWords();
    
    // 检查是否已存在
    const existingIndex = words.findIndex(w => w.word === word.word);
    
    if (existingIndex >= 0) {
      words[existingIndex] = word;
    } else {
      words.unshift(word);
    }
    
    await chrome.storage.local.set({ vocabulary: words });
  } catch (error) {
    console.error('保存单词失败:', error);
    throw new Error('保存单词失败');
  }
}

/**
 * 删除单词
 */
export async function deleteWordFromStorage(wordId: string): Promise<void> {
  try {
    const words = await getStoredWords();
    const filteredWords = words.filter(w => w.id !== wordId);
    
    await chrome.storage.local.set({ vocabulary: filteredWords });
  } catch (error) {
    console.error('删除单词失败:', error);
    throw new Error('删除单词失败');
  }
}

/**
 * 获取存储的截图
 */
export async function getStoredScreenshots(): Promise<ScreenshotData[]> {
  try {
    const result = await chrome.storage.local.get(['screenshots']);
    return result.screenshots || [];
  } catch (error) {
    console.error('获取截图失败:', error);
    return [];
  }
}

/**
 * 保存截图到存储
 */
export async function saveScreenshotToStorage(screenshot: ScreenshotData): Promise<void> {
  try {
    const screenshots = await getStoredScreenshots();
    const settings = await getSettings();
    
    // 添加新截图
    screenshots.unshift(screenshot);
    
    // 限制截图数量
    if (screenshots.length > settings.maxScreenshots) {
      screenshots.splice(settings.maxScreenshots);
    }
    
    await chrome.storage.local.set({ screenshots });
  } catch (error) {
    console.error('保存截图失败:', error);
    throw new Error('保存截图失败');
  }
}

/**
 * 删除截图
 */
export async function deleteScreenshotFromStorage(screenshotId: string): Promise<void> {
  try {
    const screenshots = await getStoredScreenshots();
    const filteredScreenshots = screenshots.filter(s => s.id !== screenshotId);
    
    await chrome.storage.local.set({ screenshots: filteredScreenshots });
  } catch (error) {
    console.error('删除截图失败:', error);
    throw new Error('删除截图失败');
  }
}

/**
 * 获取应用设置
 */
export async function getSettings(): Promise<AppSettings> {
  try {
    const result = await chrome.storage.sync.get(['settings']);
    return { ...DEFAULT_SETTINGS, ...result.settings };
  } catch (error) {
    console.error('获取设置失败:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * 保存应用设置
 */
export async function saveSettings(settings: Partial<AppSettings>): Promise<void> {
  try {
    const currentSettings = await getSettings();
    const newSettings = { ...currentSettings, ...settings };
    
    await chrome.storage.sync.set({ settings: newSettings });
  } catch (error) {
    console.error('保存设置失败:', error);
    throw new Error('保存设置失败');
  }
}

/**
 * 获取API密钥
 */
export async function getAPIKeys(): Promise<APIKeys> {
  try {
    const result = await chrome.storage.sync.get([
      'googleVisionApiKey',
      'openaiApiKey',
      'youdaoAppKey',
      'youdaoAppSecret'
    ]);
    
    return {
      googleVisionApiKey: result.googleVisionApiKey,
      openaiApiKey: result.openaiApiKey,
      youdaoAppKey: result.youdaoAppKey,
      youdaoAppSecret: result.youdaoAppSecret
    };
  } catch (error) {
    console.error('获取API密钥失败:', error);
    return {};
  }
}

/**
 * 保存API密钥
 */
export async function saveAPIKeys(keys: Partial<APIKeys>): Promise<void> {
  try {
    await chrome.storage.sync.set(keys);
  } catch (error) {
    console.error('保存API密钥失败:', error);
    throw new Error('保存API密钥失败');
  }
}

/**
 * 清理过期数据
 */
export async function cleanupExpiredData(): Promise<void> {
  try {
    const screenshots = await getStoredScreenshots();
    const settings = await getSettings();
    
    // 清理超过限制数量的截图
    if (screenshots.length > settings.maxScreenshots) {
      const validScreenshots = screenshots.slice(0, settings.maxScreenshots);
      await chrome.storage.local.set({ screenshots: validScreenshots });
    }
    
    // 清理超过30天的截图
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentScreenshots = screenshots.filter(s => s.timestamp > thirtyDaysAgo);
    
    if (recentScreenshots.length !== screenshots.length) {
      await chrome.storage.local.set({ screenshots: recentScreenshots });
    }
    
  } catch (error) {
    console.error('清理数据失败:', error);
  }
}

/**
 * 获取存储使用情况
 */
export async function getStorageUsage(): Promise<{
  used: number;
  total: number;
  percentage: number;
}> {
  try {
    const usage = await chrome.storage.local.getBytesInUse();
    const quota = chrome.storage.local.QUOTA_BYTES;
    
    return {
      used: usage,
      total: quota,
      percentage: (usage / quota) * 100
    };
  } catch (error) {
    console.error('获取存储使用情况失败:', error);
    return {
      used: 0,
      total: 0,
      percentage: 0
    };
  }
}

/**
 * 导出数据
 */
export async function exportData(): Promise<string> {
  try {
    const words = await getStoredWords();
    const screenshots = await getStoredScreenshots();
    const settings = await getSettings();
    
    const exportData = {
      vocabulary: words,
      screenshots: screenshots.map(s => ({
        ...s,
        dataUrl: '' // 不导出图片数据，太大
      })),
      settings,
      exportTime: Date.now(),
      version: '1.0.0'
    };
    
    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    console.error('导出数据失败:', error);
    throw new Error('导出数据失败');
  }
}

/**
 * 导入数据
 */
export async function importData(jsonData: string): Promise<void> {
  try {
    const data = JSON.parse(jsonData);
    
    if (data.vocabulary) {
      await chrome.storage.local.set({ vocabulary: data.vocabulary });
    }
    
    if (data.settings) {
      await saveSettings(data.settings);
    }
    
  } catch (error) {
    console.error('导入数据失败:', error);
    throw new Error('导入数据失败');
  }
}

/**
 * 清空所有数据
 */
export async function clearAllData(): Promise<void> {
  try {
    await chrome.storage.local.clear();
    await chrome.storage.sync.clear();
  } catch (error) {
    console.error('清空数据失败:', error);
    throw new Error('清空数据失败');
  }
}
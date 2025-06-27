import { generateId } from './utils';

export interface Word {
  id: string;
  word: string;
  definition: string;
  pronunciation: string;
  partOfSpeech?: string;
  example?: string;
  translation?: string;
  timestamp: number;
  reviewCount: number;
  lastReviewed?: number;
  difficulty: 'easy' | 'medium' | 'hard';
  source?: string; // 来源（截图、手动添加等）
}

export interface DictionaryResponse {
  word: string;
  phonetic?: string;
  meanings: Array<{
    partOfSpeech: string;
    definitions: Array<{
      definition: string;
      example?: string;
    }>;
  }>;
}

/**
 * 有道词典API配置
 */
const YOUDAO_API_URL = 'https://openapi.youdao.com/api';

/**
 * 获取有道词典API配置
 */
async function getYoudaoConfig(): Promise<{ appKey: string; appSecret: string }> {
  try {
    const result = await chrome.storage.sync.get(['youdaoAppKey', 'youdaoAppSecret']);
    return {
      appKey: result.youdaoAppKey || '',
      appSecret: result.youdaoAppSecret || ''
    };
  } catch (error) {
    console.error('获取有道API配置失败:', error);
    return { appKey: '', appSecret: '' };
  }
}

/**
 * 设置有道词典API配置
 */
export async function setYoudaoConfig(appKey: string, appSecret: string): Promise<void> {
  try {
    await chrome.storage.sync.set({
      youdaoAppKey: appKey,
      youdaoAppSecret: appSecret
    });
  } catch (error) {
    console.error('设置有道API配置失败:', error);
    throw new Error('设置API配置失败');
  }
}

/**
 * 生成有道API签名
 */
function generateYoudaoSign(appKey: string, appSecret: string, query: string, salt: string, curtime: string): string {
  const str = appKey + query + salt + curtime + appSecret;
  // 这里需要实现SHA256哈希，简化处理
  return btoa(str).substring(0, 32);
}

/**
 * 从文本中提取英文单词
 */
export function extractEnglishWords(text: string): string[] {
  // 匹配英文单词的正则表达式
  const wordPattern = /\b[a-zA-Z]{2,}\b/g;
  const words = text.match(wordPattern) || [];
  
  // 去重并过滤常见词
  const commonWords = new Set([
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have',
    'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you',
    'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they',
    'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my',
    'one', 'all', 'would', 'there', 'their', 'what', 'so',
    'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go',
    'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just',
    'him', 'know', 'take', 'people', 'into', 'year', 'your',
    'good', 'some', 'could', 'them', 'see', 'other', 'than',
    'then', 'now', 'look', 'only', 'come', 'its', 'over',
    'think', 'also', 'back', 'after', 'use', 'two', 'how',
    'our', 'work', 'first', 'well', 'way', 'even', 'new',
    'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us'
  ]);
  
  const uniqueWords = Array.from(new Set(
    words
      .map(word => word.toLowerCase())
      .filter(word => 
        word.length >= 3 && 
        !commonWords.has(word) &&
        !/\d/.test(word) // 排除包含数字的词
      )
  ));
  
  return uniqueWords;
}

/**
 * 使用有道词典API查询单词
 */
export async function lookupWordYoudao(word: string): Promise<Word | null> {
  try {
    const config = await getYoudaoConfig();
    
    if (!config.appKey || !config.appSecret) {
      throw new Error('请先设置有道词典API配置');
    }
    
    const salt = Date.now().toString();
    const curtime = Math.round(Date.now() / 1000).toString();
    const sign = generateYoudaoSign(config.appKey, config.appSecret, word, salt, curtime);
    
    const params = new URLSearchParams({
      q: word,
      from: 'en',
      to: 'zh-CHS',
      appKey: config.appKey,
      salt,
      sign,
      signType: 'v3',
      curtime
    });
    
    const response = await fetch(`${YOUDAO_API_URL}?${params}`);
    
    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.errorCode !== '0') {
      throw new Error(`查询失败: ${data.errorCode}`);
    }
    
    // 解析响应数据
    const translation = data.translation?.[0] || '';
    const phonetic = data.basic?.phonetic || '';
    const explains = data.basic?.explains || [];
    
    return {
      id: generateId(),
      word: word.toLowerCase(),
      definition: explains.join('; '),
      pronunciation: phonetic ? `/${phonetic}/` : '',
      translation,
      timestamp: Date.now(),
      reviewCount: 0,
      difficulty: 'medium',
      source: 'youdao'
    };
    
  } catch (error) {
    console.error('有道词典查询失败:', error);
    return null;
  }
}

/**
 * 使用免费词典API查询单词
 */
export async function lookupWordFree(word: string): Promise<Word | null> {
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    
    if (!response.ok) {
      throw new Error(`查询失败: ${response.status}`);
    }
    
    const data: DictionaryResponse[] = await response.json();
    
    if (!data || data.length === 0) {
      return null;
    }
    
    const entry = data[0];
    const meaning = entry.meanings[0];
    const definition = meaning?.definitions[0];
    
    return {
      id: generateId(),
      word: word.toLowerCase(),
      definition: definition?.definition || '',
      pronunciation: entry.phonetic || '',
      partOfSpeech: meaning?.partOfSpeech || '',
      example: definition?.example || '',
      timestamp: Date.now(),
      reviewCount: 0,
      difficulty: 'medium',
      source: 'free-api'
    };
    
  } catch (error) {
    console.error('免费词典查询失败:', error);
    return null;
  }
}

/**
 * 查询单词（优先使用免费API）
 */
export async function lookupWord(word: string): Promise<Word | null> {
  try {
    // 首先尝试免费API
    let result = await lookupWordFree(word);
    
    // 如果免费API失败，尝试有道词典
    if (!result) {
      result = await lookupWordYoudao(word);
    }
    
    return result;
  } catch (error) {
    console.error('查询单词失败:', error);
    return null;
  }
}

/**
 * 从文本中提取单词并查询释义
 */
export async function extractWords(text: string): Promise<Word[]> {
  try {
    const words = extractEnglishWords(text);
    const results: Word[] = [];
    
    // 限制同时查询的单词数量，避免API限制
    const maxWords = 10;
    const wordsToLookup = words.slice(0, maxWords);
    
    for (const word of wordsToLookup) {
      try {
        const wordInfo = await lookupWord(word);
        if (wordInfo) {
          results.push(wordInfo);
        }
        
        // 添加延迟避免API限制
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`查询单词 ${word} 失败:`, error);
      }
    }
    
    return results;
  } catch (error) {
    console.error('提取单词失败:', error);
    return [];
  }
}

/**
 * 保存单词到词汇本
 */
export async function saveWord(word: Word): Promise<void> {
  try {
    const result = await chrome.storage.local.get(['vocabulary']);
    const vocabulary: Word[] = result.vocabulary || [];
    
    // 检查是否已存在
    const existingIndex = vocabulary.findIndex(w => w.word === word.word);
    
    if (existingIndex >= 0) {
      // 更新现有单词
      vocabulary[existingIndex] = {
        ...vocabulary[existingIndex],
        ...word,
        timestamp: Date.now()
      };
    } else {
      // 添加新单词
      vocabulary.unshift(word);
    }
    
    await chrome.storage.local.set({ vocabulary });
  } catch (error) {
    console.error('保存单词失败:', error);
    throw new Error('保存单词失败');
  }
}

/**
 * 获取保存的单词
 */
export async function getSavedWords(): Promise<Word[]> {
  try {
    const result = await chrome.storage.local.get(['vocabulary']);
    return result.vocabulary || [];
  } catch (error) {
    console.error('获取单词失败:', error);
    return [];
  }
}

/**
 * 删除单词
 */
export async function deleteWord(wordId: string): Promise<void> {
  try {
    const result = await chrome.storage.local.get(['vocabulary']);
    const vocabulary: Word[] = result.vocabulary || [];
    
    const filteredVocabulary = vocabulary.filter(w => w.id !== wordId);
    
    await chrome.storage.local.set({ vocabulary: filteredVocabulary });
  } catch (error) {
    console.error('删除单词失败:', error);
    throw new Error('删除单词失败');
  }
}

/**
 * 更新单词复习状态
 */
export async function updateWordReview(wordId: string, difficulty: 'easy' | 'medium' | 'hard'): Promise<void> {
  try {
    const result = await chrome.storage.local.get(['vocabulary']);
    const vocabulary: Word[] = result.vocabulary || [];
    
    const wordIndex = vocabulary.findIndex(w => w.id === wordId);
    
    if (wordIndex >= 0) {
      vocabulary[wordIndex] = {
        ...vocabulary[wordIndex],
        reviewCount: vocabulary[wordIndex].reviewCount + 1,
        lastReviewed: Date.now(),
        difficulty
      };
      
      await chrome.storage.local.set({ vocabulary });
    }
  } catch (error) {
    console.error('更新复习状态失败:', error);
    throw new Error('更新复习状态失败');
  }
}

/**
 * 获取需要复习的单词
 */
export async function getWordsForReview(): Promise<Word[]> {
  try {
    const vocabulary = await getSavedWords();
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    return vocabulary.filter(word => {
      if (!word.lastReviewed) {
        return true; // 从未复习过的单词
      }
      
      const daysSinceReview = (now - word.lastReviewed) / oneDayMs;
      
      // 根据难度决定复习间隔
      switch (word.difficulty) {
        case 'easy':
          return daysSinceReview >= 7; // 一周后复习
        case 'medium':
          return daysSinceReview >= 3; // 三天后复习
        case 'hard':
          return daysSinceReview >= 1; // 一天后复习
        default:
          return daysSinceReview >= 3;
      }
    });
  } catch (error) {
    console.error('获取复习单词失败:', error);
    return [];
  }
}
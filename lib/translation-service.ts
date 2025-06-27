interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
}

interface TranslationOptions {
  targetLanguage?: string;
  sourceLanguage?: string;
}

export class TranslationService {
  private static readonly API_URL = 'https://api.deepseek.com/v1/chat/completions';
  
  private static async getApiKey(): Promise<string> {
    try {
      const result = await chrome.storage.sync.get(['deepseekApiKey']);
      return result.deepseekApiKey || '';
    } catch (error) {
      console.error('Failed to get API key from storage:', error);
      return '';
    }
  }
  
  static async setApiKey(apiKey: string): Promise<void> {
    try {
      await chrome.storage.sync.set({ deepseekApiKey: apiKey });
    } catch (error) {
      console.error('Failed to save API key to storage:', error);
      throw error;
    }
  }
  
  static async translateText(
    text: string, 
    options: TranslationOptions = {}
  ): Promise<TranslationResult> {
    const { targetLanguage = 'zh', sourceLanguage = 'auto' } = options;
    
    // 语言代码映射
    const languageMap: { [key: string]: string } = {
      'zh': '中文',
      'en': 'English',
      'ja': '日语',
      'ko': '韩语',
      'fr': 'French',
      'de': 'German',
      'es': 'Spanish',
      'auto': '自动检测'
    };
    
    const targetLangName = languageMap[targetLanguage] || targetLanguage;
    const sourceLangName = sourceLanguage === 'auto' ? '自动检测' : (languageMap[sourceLanguage] || sourceLanguage);
    
    try {
      const apiKey = await this.getApiKey();
      
      if (!apiKey) {
        throw new Error('请先在设置中配置 DeepSeek API 密钥');
      }
      
      const prompt = sourceLanguage === 'auto' 
        ? `请将以下文本翻译成${targetLangName}，只返回翻译结果，不要添加任何解释：\n\n${text}`
        : `请将以下${sourceLangName}文本翻译成${targetLangName}，只返回翻译结果，不要添加任何解释：\n\n${text}`;
      
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 1000
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const translatedText = data.choices[0].message.content.trim();
        
        return {
          originalText: text,
          translatedText,
          sourceLanguage: this.detectLanguage(text),
          targetLanguage
        };
      } else {
        throw new Error('Invalid response from DeepSeek API');
      }
    } catch (error) {
      console.error('Translation error:', error);
      // 如果 DeepSeek API 失败，回退到简单的错误处理
      throw new Error(`翻译失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }
  
  static async translatePageContent(): Promise<TranslationResult[]> {
    // 获取页面主要文本内容
    const textElements = document.querySelectorAll(
      'p, h1, h2, h3, h4, h5, h6, span, div, li, td, th, blockquote'
    );
    
    const textContents: string[] = [];
    
    textElements.forEach(element => {
      const text = element.textContent?.trim();
      if (text && 
          text.length > 10 && 
          text.length < 500 && 
          !text.includes('©') && 
          !text.includes('®') &&
          !/^\d+$/.test(text) && // 排除纯数字
          !/^[\s\W]*$/.test(text) // 排除只有标点符号的文本
      ) {
        textContents.push(text);
      }
    });
    
    // 去重并限制数量
    const uniqueTexts = [...new Set(textContents)].slice(0, 20);
    
    // 批量翻译
    const translations: TranslationResult[] = [];
    
    for (const text of uniqueTexts) {
      try {
        const result = await this.translateText(text);
        translations.push(result);
        // 添加延迟避免API限制
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to translate: ${text}`, error);
      }
    }
    
    return translations;
  }
  
  static detectLanguage(text: string): string {
    // 增强的语言检测
    const chineseRegex = /[\u4e00-\u9fff]/g;
    const japaneseRegex = /[\u3040-\u309f\u30a0-\u30ff]/g;
    const koreanRegex = /[\uac00-\ud7af]/g;
    const arabicRegex = /[\u0600-\u06ff]/g;
    const russianRegex = /[\u0400-\u04ff]/g;
    const thaiRegex = /[\u0e00-\u0e7f]/g;
    
    // 计算各种字符的数量
    const totalChars = text.length;
    const chineseMatches = text.match(chineseRegex);
    const japaneseMatches = text.match(japaneseRegex);
    const koreanMatches = text.match(koreanRegex);
    const arabicMatches = text.match(arabicRegex);
    const russianMatches = text.match(russianRegex);
    const thaiMatches = text.match(thaiRegex);
    
    const chineseCount = chineseMatches ? chineseMatches.join('').length : 0;
    const japaneseCount = japaneseMatches ? japaneseMatches.join('').length : 0;
    const koreanCount = koreanMatches ? koreanMatches.join('').length : 0;
    const arabicCount = arabicMatches ? arabicMatches.join('').length : 0;
    const russianCount = russianMatches ? russianMatches.join('').length : 0;
    const thaiCount = thaiMatches ? thaiMatches.join('').length : 0;
    
    // 如果包含中文字符且比例较高（降低阈值）
    if (chineseCount > 0 && chineseCount / totalChars > 0.05) {
      return 'zh';
    }
    
    // 如果包含日文字符
    if (japaneseCount > 0 && japaneseCount / totalChars > 0.03) {
      return 'ja';
    }
    
    // 如果包含韩文字符
    if (koreanCount > 0 && koreanCount / totalChars > 0.05) {
      return 'ko';
    }
    
    // 如果包含阿拉伯文字符
    if (arabicCount > 0 && arabicCount / totalChars > 0.05) {
      return 'ar';
    }
    
    // 如果包含俄文字符
    if (russianCount > 0 && russianCount / totalChars > 0.05) {
      return 'ru';
    }
    
    // 如果包含泰文字符
    if (thaiCount > 0 && thaiCount / totalChars > 0.05) {
      return 'th';
    }
    
    // 检测是否为纯英文
    const englishRegex = /^[a-zA-Z\s.,!?;:"'()\-\d]+$/;
    if (englishRegex.test(text.trim())) {
      return 'en';
    }
    
    // 检测常见的欧洲语言特征
    const frenchWords = /\b(le|la|les|de|du|des|et|à|un|une|dans|pour|avec|sur|par|ce|cette|qui|que|est|sont|avoir|être)\b/i;
    const germanWords = /\b(der|die|das|und|oder|aber|mit|von|zu|in|auf|für|durch|über|unter|zwischen|ist|sind|haben|sein)\b/i;
    const spanishWords = /\b(el|la|los|las|de|del|y|o|pero|con|por|para|en|sobre|bajo|entre|es|son|tener|ser)\b/i;
    
    if (frenchWords.test(text)) {
      return 'fr';
    }
    
    if (germanWords.test(text)) {
      return 'de';
    }
    
    if (spanishWords.test(text)) {
      return 'es';
    }
    
    return 'auto';
  }
  
  static detectPageLanguage(texts: string[]): string {
    // 分析多个文本片段来更准确地检测页面语言
    const languageCounts: { [key: string]: number } = {};
    
    texts.forEach(text => {
      const detected = this.detectLanguage(text);
      if (detected !== 'auto') {
        languageCounts[detected] = (languageCounts[detected] || 0) + 1;
      }
    });
    
    // 找出出现次数最多的语言
    let maxCount = 0;
    let dominantLanguage = 'auto';
    
    Object.entries(languageCounts).forEach(([lang, count]) => {
      if (count > maxCount) {
        maxCount = count;
        dominantLanguage = lang;
      }
    });
    
    return dominantLanguage;
  }
}

export type { TranslationResult, TranslationOptions };
export interface AIAnalysisResult {
  text: string;
  confidence: number;
  language?: string;
  entities?: string[];
}

export interface VisionAPIResponse {
  responses: Array<{
    textAnnotations?: Array<{
      description: string;
      locale?: string;
    }>;
    fullTextAnnotation?: {
      text: string;
    };
    error?: {
      code: number;
      message: string;
    };
  }>;
}

export interface OCRSpaceResponse {
  ParsedResults: Array<{
    TextOverlay: {
      Lines: Array<{
        LineText: string;
        Words: Array<{
          WordText: string;
          Left: number;
          Top: number;
          Height: number;
          Width: number;
        }>;
      }>;
      HasOverlay: boolean;
      Message: string;
    };
    TextOrientation: string;
    FileParseExitCode: number;
    ParsedText: string;
    ErrorMessage?: string;
    ErrorDetails?: string;
  }>;
  OCRExitCode: number;
  IsErroredOnProcessing: boolean;
  ProcessingTimeInMilliseconds: string;
  SearchablePDFURL?: string;
}

/**
 * Google Vision API配置
 */
const VISION_API_ENDPOINT = 'https://vision.googleapis.com/v1/images:annotate';

/**
 * 获取API密钥
 */
async function getAPIKey(): Promise<string> {
  try {
    const result = await chrome.storage.sync.get(['googleVisionApiKey']);
    return result.googleVisionApiKey || '';
  } catch (error) {
    console.error('获取API密钥失败:', error);
    return '';
  }
}

/**
 * 获取OCR.space API密钥
 */
async function getOCRSpaceAPIKey(): Promise<string> {
  try {
    const result = await chrome.storage.sync.get(['ocrSpaceApiKey']);
    return result.ocrSpaceApiKey || '';
  } catch (error) {
    console.error('获取OCR.space API密钥失败:', error);
    return '';
  }
}

/**
 * 设置API密钥
 */
export async function setAPIKey(apiKey: string): Promise<void> {
  try {
    await chrome.storage.sync.set({ googleVisionApiKey: apiKey });
  } catch (error) {
    console.error('设置API密钥失败:', error);
    throw new Error('设置API密钥失败');
  }
}

/**
 * 设置OCR.space API密钥
 */
export async function setOCRSpaceAPIKey(apiKey: string): Promise<void> {
  try {
    await chrome.storage.sync.set({ ocrSpaceApiKey: apiKey });
  } catch (error) {
    console.error('设置OCR.space API密钥失败:', error);
    throw new Error('设置OCR.space API密钥失败');
  }
}

/**
 * 将DataURL转换为Base64
 */
function dataUrlToBase64(dataUrl: string): string {
  return dataUrl.split(',')[1];
}

/**
 * 使用Google Vision API分析图片
 */
export async function analyzeImage(imageDataUrl: string): Promise<string> {
  try {
    const apiKey = await getAPIKey();
    
    if (!apiKey) {
      throw new Error('请先设置Google Vision API密钥');
    }
    
    const base64Image = dataUrlToBase64(imageDataUrl);
    
    const requestBody = {
      requests: [
        {
          image: {
            content: base64Image
          },
          features: [
            {
              type: 'TEXT_DETECTION',
              maxResults: 50
            },
            {
              type: 'DOCUMENT_TEXT_DETECTION',
              maxResults: 50
            }
          ]
        }
      ]
    };
    
    const response = await fetch(`${VISION_API_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }
    
    const data: VisionAPIResponse = await response.json();
    
    if (data.responses[0]?.error) {
      throw new Error(`Vision API错误: ${data.responses[0].error.message}`);
    }
    
    // 提取文本
    const textAnnotations = data.responses[0]?.textAnnotations;
    if (textAnnotations && textAnnotations.length > 0) {
      return textAnnotations[0].description;
    }
    
    // 如果没有文本注释，尝试获取完整文本
    const fullText = data.responses[0]?.fullTextAnnotation?.text;
    if (fullText) {
      return fullText;
    }
    
    return '';
    
  } catch (error) {
    console.error('图片分析失败:', error);
    throw error;
  }
}

/**
 * 使用OpenAI API分析图片（备选方案）
 */
export async function analyzeImageWithOpenAI(imageDataUrl: string): Promise<string> {
  try {
    const result = await chrome.storage.sync.get(['openaiApiKey']);
    const apiKey = result.openaiApiKey;
    
    if (!apiKey) {
      throw new Error('请先设置OpenAI API密钥');
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: '请提取这张图片中的所有文字内容，保持原有格式。'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageDataUrl
                }
              }
            ]
          }
        ],
        max_tokens: 1000
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API请求失败: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0]?.message?.content || '';
    
  } catch (error) {
    console.error('OpenAI图片分析失败:', error);
    throw error;
  }
}

/**
 * 检测文本语言
 */
export function detectLanguage(text: string): string {
  // 简单的语言检测
  const englishPattern = /[a-zA-Z]/;
  const chinesePattern = /[\u4e00-\u9fff]/;
  const japanesePattern = /[\u3040-\u309f\u30a0-\u30ff]/;
  const koreanPattern = /[\uac00-\ud7af]/;
  
  if (chinesePattern.test(text)) {
    return 'zh';
  } else if (japanesePattern.test(text)) {
    return 'ja';
  } else if (koreanPattern.test(text)) {
    return 'ko';
  } else if (englishPattern.test(text)) {
    return 'en';
  }
  
  return 'unknown';
}

/**
 * 提取文本中的实体（简单实现）
 */
export function extractEntities(text: string): string[] {
  const entities: string[] = [];
  
  // 提取邮箱
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emails = text.match(emailPattern);
  if (emails) {
    entities.push(...emails);
  }
  
  // 提取URL
  const urlPattern = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
  const urls = text.match(urlPattern);
  if (urls) {
    entities.push(...urls);
  }
  
  // 提取电话号码
  const phonePattern = /\b\d{3}-\d{3}-\d{4}\b|\b\d{10}\b/g;
  const phones = text.match(phonePattern);
  if (phones) {
    entities.push(...phones);
  }
  
  return entities;
}

/**
 * 使用OCR.space API进行OCR识别
 */
export async function analyzeImageWithOCRSpace(imageDataUrl: string): Promise<string> {
  try {
    const apiKey = await getOCRSpaceAPIKey();
    
    if (!apiKey) {
      throw new Error('请先设置OCR.space API密钥');
    }
    
    // 将DataURL转换为Blob
    const response = await fetch(imageDataUrl);
    const blob = await response.blob();
    
    // 创建FormData
    const formData = new FormData();
    formData.append('file', blob, 'image.png');
    formData.append('apikey', apiKey);
    formData.append('language', 'chs'); // 默认英文，可以根据需要调整
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('OCREngine', '2'); // 使用Engine 2，支持更多语言
    
    const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData
    });
    
    if (!ocrResponse.ok) {
      throw new Error(`OCR.space API请求失败: ${ocrResponse.status} ${ocrResponse.statusText}`);
    }
    
    const data: OCRSpaceResponse = await ocrResponse.json();
    
    if (data.IsErroredOnProcessing) {
      throw new Error(`OCR处理失败: ${data.ParsedResults[0]?.ErrorMessage || '未知错误'}`);
    }
    
    // 提取识别的文本
    if (data.ParsedResults && data.ParsedResults.length > 0) {
      return data.ParsedResults[0].ParsedText || '';
    }
    
    return '';
    
  } catch (error) {
    console.error('OCR.space分析失败:', error);
    throw error;
  }
}

/**
 * 分析图片并返回详细结果
 */
export async function analyzeImageDetailed(imageDataUrl: string): Promise<AIAnalysisResult> {
  try {
    const text = await analyzeImage(imageDataUrl);
    const language = detectLanguage(text);
    const entities = extractEntities(text);
    
    return {
      text,
      confidence: text.length > 0 ? 0.9 : 0.1,
      language,
      entities
    };
  } catch (error) {
    console.error('详细分析失败:', error);
    return {
      text: '',
      confidence: 0,
      language: 'unknown',
      entities: []
    };
  }
}

/**
 * 使用OCR.space进行图片分析并返回详细结果
 */
export async function analyzeImageWithOCRSpaceDetailed(imageDataUrl: string): Promise<AIAnalysisResult> {
  try {
    const text = await analyzeImageWithOCRSpace(imageDataUrl);
    const language = detectLanguage(text);
    const entities = extractEntities(text);
    
    return {
      text,
      confidence: text.length > 0 ? 0.9 : 0.1,
      language,
      entities
    };
  } catch (error) {
    console.error('OCR.space详细分析失败:', error);
    return {
      text: '',
      confidence: 0,
      language: 'unknown',
      entities: []
    };
  }
}

/**
 * 获取DeepSeek API密钥
 */
async function getDeepSeekAPIKey(): Promise<string> {
  try {
    const result = await chrome.storage.sync.get(['deepseek_api_key']);
    return result.deepseek_api_key || '';
  } catch (error) {
    console.error('获取DeepSeek API密钥失败:', error);
    return '';
  }
}

/**
 * 使用DeepSeek AI总结文本
 */
export async function summarizeText(text: string): Promise<string> {
  try {
    const apiKey = await getDeepSeekAPIKey();
    
    if (!apiKey) {
      throw new Error('请先设置DeepSeek API密钥');
    }
    
    if (!text || text.trim().length === 0) {
      return '未检测到文本内容';
    }
    
    const prompt = `请对以下OCR识别的文本进行智能总结，要求：
1. 提取关键信息和要点
2. 保持简洁明了
3. 如果是英文内容，请提供中文翻译
4. 如果包含专业术语，请简要解释

文本内容：
${text}`;
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
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
        max_tokens: 1000,
        temperature: 0.7
      })
    });
    
    if (!response.ok) {
      throw new Error(`DeepSeek API请求失败: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.choices[0]?.message?.content || '总结生成失败';
    
  } catch (error) {
    console.error('文本总结失败:', error);
    throw error;
  }
}

/**
 * OCR + AI总结的完整流程
 */
export async function ocrAndSummarize(imageDataUrl: string): Promise<{ ocrText: string; summary: string }> {
  try {
    // 第一步：OCR识别
    const ocrText = await analyzeImageWithOCRSpace(imageDataUrl);
    
    if (!ocrText || ocrText.trim().length === 0) {
      return {
        ocrText: '',
        summary: '未检测到文本内容'
      };
    }
    
    // 第二步：AI总结
    const summary = await summarizeText(ocrText);
    
    return {
      ocrText,
      summary
    };
    
  } catch (error) {
    console.error('OCR和总结流程失败:', error);
    throw error;
  }
}
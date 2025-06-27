export interface CaptureArea {
  left: number;
  top: number;
  width: number;
  height: number;
}

export type CaptureType = 'area' | 'full' | 'visible';

/**
 * 截取当前可见区域
 */
export async function captureScreenshot(type: CaptureType = 'visible'): Promise<string> {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab({
      format: 'png',
      quality: 100
    });
    
    return dataUrl;
  } catch (error) {
    console.error('截图失败:', error);
    throw new Error('截图失败，请检查权限设置');
  }
}

/**
 * 截取指定区域
 */
export async function captureArea(area: CaptureArea): Promise<string> {
  try {
    // 首先截取整个可见区域
    const fullScreenshot = await captureScreenshot('visible');
    
    // 使用Canvas裁剪指定区域
    return cropImage(fullScreenshot, area);
  } catch (error) {
    console.error('区域截图失败:', error);
    throw new Error('区域截图失败');
  }
}

/**
 * 裁剪图片
 */
export function cropImage(dataUrl: string, area: CaptureArea): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('无法创建Canvas上下文'));
        return;
      }
      
      // 设置画布大小为裁剪区域大小
      canvas.width = area.width;
      canvas.height = area.height;
      
      // 计算设备像素比
      const devicePixelRatio = window.devicePixelRatio || 1;
      
      // 裁剪图片
      ctx.drawImage(
        img,
        area.left * devicePixelRatio,
        area.top * devicePixelRatio,
        area.width * devicePixelRatio,
        area.height * devicePixelRatio,
        0,
        0,
        area.width,
        area.height
      );
      
      // 转换为DataURL
      const croppedDataUrl = canvas.toDataURL('image/png', 1.0);
      resolve(croppedDataUrl);
    };
    
    img.onerror = () => {
      reject(new Error('图片加载失败'));
    };
    
    img.src = dataUrl;
  });
}

/**
 * 全页面截图（需要滚动）
 */
export async function captureFullPage(): Promise<string> {
  try {
    // 获取当前标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.id) {
      throw new Error('无法获取当前标签页');
    }
    
    // 注入脚本获取页面尺寸
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        return {
          scrollHeight: document.documentElement.scrollHeight,
          scrollWidth: document.documentElement.scrollWidth,
          clientHeight: document.documentElement.clientHeight,
          clientWidth: document.documentElement.clientWidth,
          scrollTop: document.documentElement.scrollTop,
          scrollLeft: document.documentElement.scrollLeft
        };
      }
    });
    
    const pageInfo = result.result;
    
    if (!pageInfo) {
      throw new Error('无法获取页面信息');
    }
    
    // 如果页面不需要滚动，直接截图
    if (pageInfo.scrollHeight <= pageInfo.clientHeight) {
      return await captureScreenshot('visible');
    }
    
    // 需要滚动截图的情况下，这里简化处理
    // 实际项目中可能需要分段截图然后拼接
    console.warn('全页面截图功能需要进一步实现');
    return await captureScreenshot('visible');
    
  } catch (error) {
    console.error('全页面截图失败:', error);
    throw new Error('全页面截图失败');
  }
}

/**
 * 保存截图到本地存储
 */
export async function saveScreenshot(dataUrl: string, metadata?: any): Promise<string> {
  try {
    const id = `screenshot_${Date.now()}`;
    
    await chrome.storage.local.set({
      [id]: {
        dataUrl,
        timestamp: Date.now(),
        metadata
      }
    });
    
    return id;
  } catch (error) {
    console.error('保存截图失败:', error);
    throw new Error('保存截图失败');
  }
}

/**
 * 从本地存储获取截图
 */
export async function getScreenshot(id: string): Promise<any> {
  try {
    const result = await chrome.storage.local.get([id]);
    return result[id] || null;
  } catch (error) {
    console.error('获取截图失败:', error);
    return null;
  }
}

/**
 * 删除截图
 */
export async function deleteScreenshot(id: string): Promise<void> {
  try {
    await chrome.storage.local.remove([id]);
  } catch (error) {
    console.error('删除截图失败:', error);
    throw new Error('删除截图失败');
  }
}
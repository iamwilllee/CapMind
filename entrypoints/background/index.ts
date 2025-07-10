import { defineBackground } from 'wxt/sandbox';

export default defineBackground(() => {
  console.log('CapMind background script started');

  // 监听来自content script和popup的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action || message.type) {
      case 'captureArea':
        handleAreaCapture(message.area, sender.tab?.id);
        break;
      case 'captureFullPage':
        handleFullPageCapture(sender.tab?.id);
        break;
      case 'START_CAPTURE':
        handleSmartCapture(sender.tab?.id, sendResponse);
        return true; // 保持消息通道开放

      case 'toggleSidebar':
        handleToggleSidebar(sender.tab?.id);
        break;
    }
    return true;
  });

  // 创建右键菜单
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: 'capmind-sidebar',
      title: 'CapMind 打开侧边栏',
      contexts: ['page']
    });

    chrome.contextMenus.create({
      id: 'capmind-capture',
      title: 'CapMind 截图学习',
      contexts: ['page']
    });


  });

  // 处理右键菜单点击
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    switch (info.menuItemId) {
      case 'capmind-sidebar':
        if (tab?.id) {
          chrome.tabs.sendMessage(tab.id, { action: 'toggleSidebar' });
        }
        break;
      case 'capmind-capture':
        if (tab?.id) {
          chrome.tabs.sendMessage(tab.id, { action: 'startCapture' });
        }
        break;

    }
  });

  // 处理插件图标点击
  chrome.action.onClicked.addListener((tab) => {
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'toggleSidebar' });
    }
  });

  async function handleToggleSidebar(tabId?: number) {
    if (!tabId) return;
    
    try {
      // 发送切换侧边栏消息到content script
      chrome.tabs.sendMessage(tabId, { action: 'toggleSidebar' });
    } catch (error) {
      console.error('切换侧边栏失败:', error);
    }
  }

  async function handleAreaCapture(area: any, tabId?: number) {
    if (!tabId) return;

    try {
      // 截取当前标签页的完整可见区域
      const fullDataUrl = await chrome.tabs.captureVisibleTab({
        format: 'png',
        quality: 100
      });

      // 裁剪指定区域
      const croppedDataUrl = await cropImageInBackground(fullDataUrl, area);
      
      // 将截图数据存储到storage
      await chrome.storage.local.set({
        lastCapture: {
          dataUrl: croppedDataUrl,
          area,
          timestamp: Date.now()
        }
      });

      // 通知content script截图完成
      chrome.tabs.sendMessage(tabId, {
        action: 'captureComplete',
        dataUrl: croppedDataUrl
      });

      // 显示成功通知
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon/48.png',
        title: 'CapMind',
        message: '截图成功！已保存到剪贴板'
      });

    } catch (error) {
      console.error('截图失败:', error);
      
      // 显示错误通知
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon/48.png',
        title: 'CapMind',
        message: '截图失败，请重试'
      });
    }
  }

  // 在background中实现图片裁剪
  async function cropImageInBackground(dataUrl: string, area: any): Promise<string> {
    try {
      // 创建一个离屏canvas
      const canvas = new OffscreenCanvas(area.width, area.height);
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('无法创建Canvas上下文');
      }
      
      // 使用 createImageBitmap 替代 Image 构造函数
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const imageBitmap = await createImageBitmap(blob);
      
      // 获取实际的设备像素比
      // Chrome的captureVisibleTab会根据设备像素比返回高分辨率图片
      const devicePixelRatio = area.devicePixelRatio || 1;
      
      // 裁剪图片 - 使用设备像素比调整坐标和尺寸
      ctx.drawImage(
        imageBitmap,
        area.left * devicePixelRatio,
        area.top * devicePixelRatio,
        area.width * devicePixelRatio,
        area.height * devicePixelRatio,
        0,
        0,
        area.width,
        area.height
      );
      
      // 转换为Blob然后转为DataURL
      const resultBlob = await canvas.convertToBlob({ type: 'image/png', quality: 1.0 });
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('转换失败'));
        reader.readAsDataURL(resultBlob);
      });
      
    } catch (error) {
      throw new Error(`图片处理失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async function handleFullPageCapture(tabId?: number) {
    if (!tabId) return;

    try {
      const dataUrl = await chrome.tabs.captureVisibleTab({
        format: 'png',
        quality: 100
      });

      await chrome.storage.local.set({
        lastCapture: {
          dataUrl,
          type: 'fullPage',
          timestamp: Date.now()
        }
      });

      chrome.runtime.sendMessage({
        action: 'captureComplete',
        dataUrl
      });

    } catch (error) {
      console.error('全页截图失败:', error);
    }
  }

  async function handleSmartCapture(tabId?: number, sendResponse?: (response: any) => void) {
    if (!tabId) {
      sendResponse?.({ error: 'No tab ID provided' });
      return;
    }

    try {
      // 截取当前标签页的完整可见区域
      const dataUrl = await chrome.tabs.captureVisibleTab({
        format: 'png',
        quality: 100
      });
      
      // 将截图数据存储到storage
      await chrome.storage.local.set({
        lastCapture: {
          dataUrl,
          timestamp: Date.now(),
          type: 'smart'
        }
      });

      // 返回截图数据
      sendResponse?.({ dataUrl });

      // 显示成功通知
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon/48.png',
        title: 'CapMind',
        message: '智能截图成功！'
      });

    } catch (error) {
       console.error('智能截图失败:', error);
       sendResponse?.({ error: error instanceof Error ? error.message : 'Unknown error' });
      
      // 显示错误通知
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon/48.png',
        title: 'CapMind',
        message: '智能截图失败，请重试'
      });
    }
  }

  

  // 监听标签页更新，清理旧的截图数据
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
      // 可以在这里做一些清理工作
    }
  });

  // 定期清理存储的数据
  setInterval(async () => {
    try {
      const result = await chrome.storage.local.get(['lastCapture']);
      if (result.lastCapture) {
        const age = Date.now() - result.lastCapture.timestamp;
        // 如果截图超过1小时，清理掉
        if (age > 60 * 60 * 1000) {
          await chrome.storage.local.remove(['lastCapture']);
        }
      }
    } catch (error) {
      console.error('清理数据失败:', error);
    }
  }, 10 * 60 * 1000); // 每10分钟检查一次
});
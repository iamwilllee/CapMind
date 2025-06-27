// 消息处理模块

import { ScreenCapture } from './capture';
import { SidebarManager } from './sidebar';
import { showSuccessMessage } from './ui-utils';

export class MessageHandler {
  private screenCapture: ScreenCapture;
  private sidebarManager: SidebarManager;

  constructor(screenCapture: ScreenCapture, sidebarManager: SidebarManager) {
    this.screenCapture = screenCapture;
    this.sidebarManager = sidebarManager;
    this.setupMessageListeners();
  }

  private setupMessageListeners() {
    // 监听来自popup、background和sidebar的消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'startCapture') {
        this.screenCapture.start();
        sendResponse({ success: true });
      } else if (message.action === 'captureComplete') {
        // 截图完成，显示成功提示并更新侧边栏
        showSuccessMessage();
        this.sidebarManager.updateWithCapture(message.dataUrl);
        sendResponse({ success: true });
      } else if (message.action === 'toggleSidebar') {
        // 直接处理侧边栏切换
        this.sidebarManager.toggle();
        sendResponse({ success: true });
      } else if (message.action === 'getPageContent') {
        // 获取当前页面内容
        const pageContent = this.getPageContent();
        sendResponse({ success: true, content: pageContent });
      }
      return true;
    });

    // 监听来自sidebar的消息
    window.addEventListener('message', (event) => {
      if (event.data.type === 'START_SMART_CAPTURE') {
        this.screenCapture.start();
      } else if (event.data.type === 'CLOSE_SIDEBAR') {
        this.sidebarManager.hide();
      }
    });

    // 添加右键菜单支持
    document.addEventListener('contextmenu', (e) => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim()) {
        // 如果有选中文本，可以添加快速查词功能
        const selectedText = selection.toString().trim();
        if (/^[a-zA-Z]+$/.test(selectedText)) {
          // 发送查词请求
          chrome.runtime.sendMessage({
            action: 'lookupWord',
            word: selectedText
          });
        }
      }
    });
  }

  private getPageContent(): string {
    // 获取页面标题
    const title = document.title;
    
    // 获取页面主要文本内容
    const content = this.extractMainContent();
    
    // 获取当前URL
    const url = window.location.href;
    
    return `页面标题: ${title}\n页面URL: ${url}\n\n页面内容:\n${content}`;
  }

  private extractMainContent(): string {
    // 移除脚本和样式标签
    const elementsToRemove = document.querySelectorAll('script, style, nav, header, footer, aside, .sidebar, .menu, .navigation');
    const clonedDoc = document.cloneNode(true) as Document;
    
    elementsToRemove.forEach(el => {
      const clonedEl = clonedDoc.querySelector(el.tagName.toLowerCase());
      if (clonedEl) {
        clonedEl.remove();
      }
    });
    
    // 尝试找到主要内容区域
    const mainSelectors = [
      'main',
      'article', 
      '.content',
      '.main-content',
      '.post-content',
      '.entry-content',
      '#content',
      '#main'
    ];
    
    let mainContent = '';
    
    for (const selector of mainSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        mainContent = this.getTextContent(element);
        if (mainContent.length > 100) {
          break;
        }
      }
    }
    
    // 如果没有找到主要内容，使用body内容
    if (!mainContent || mainContent.length < 100) {
      mainContent = this.getTextContent(document.body);
    }
    
    // 限制内容长度，避免过长
    return mainContent.length > 3000 ? mainContent.substring(0, 3000) + '...' : mainContent;
  }

  private getTextContent(element: Element): string {
    // 获取元素的文本内容，保留基本格式
    let text = '';
    
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        const textContent = node.textContent?.trim();
        if (textContent) {
          text += textContent + ' ';
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        
        // 跳过不需要的元素
        if (['SCRIPT', 'STYLE', 'NAV', 'HEADER', 'FOOTER', 'ASIDE'].includes(el.tagName)) {
          continue;
        }
        
        // 递归获取子元素内容
        const childText = this.getTextContent(el);
        if (childText.trim()) {
          text += childText + ' ';
        }
        
        // 在块级元素后添加换行
        if (['DIV', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI'].includes(el.tagName)) {
          text += '\n';
        }
      }
    }
    
    // 清理多余的空白字符
    return text.replace(/\s+/g, ' ').replace(/\n\s*\n/g, '\n').trim();
  }
}
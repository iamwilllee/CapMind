// 侧边栏管理模块

import { createIframeUi } from 'wxt/client';

export class SidebarManager {
  private ui: any = null;
  private isVisible = false;
  private isPinned = false;
  private ctx: any;

  constructor(ctx: any) {
    this.ctx = ctx;
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // 监听ESC键关闭侧边栏
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });

    // 监听来自iframe的消息
    window.addEventListener('message', (event) => {
      if (event.data.type === 'START_SMART_CAPTURE') {
        this.handleSmartCapture();
      } else if (event.data.type === 'CLOSE_SIDEBAR') {
        this.hide();
      } else if (event.data.type === 'TOGGLE_PIN_MODE') {
        this.togglePinMode();
      } else if (event.data.type === 'GET_CURRENT_URL') {
        this.handleGetCurrentUrl();
      } else if (event.data.type === 'GET_PAGE_CONTENT') {
        this.handleGetPageContent();
      } else if (event.data.type === 'GET_PAGE_INFO') {
        this.handleGetPageInfo();
      }
    });
  }

  private async handleSmartCapture() {
    try {
      // 隐藏侧边栏以便截图
      this.hide();
      
      // 等待侧边栏隐藏动画完成
      await new Promise(resolve => setTimeout(resolve, 350));
      
      // 发送消息给background script开始智能截图
      const response = await chrome.runtime.sendMessage({
        action: 'START_CAPTURE'
      });
      
      if (response && response.dataUrl) {
        this.updateWithCapture(response.dataUrl);
      }
    } catch (error) {
      console.error('Smart capture failed:', error);
      // 如果出错，重新显示侧边栏
      this.show();
    }
  }

  create() {
    if (this.ui) return;

    // 使用 createIframeUi 创建 iframe 侧边栏
    this.ui = createIframeUi(this.ctx, {
      page: '/sidebar.html',
      position: 'overlay',
      onMount: (wrapper, iframe) => {
        this.updateWrapperStyles(wrapper);
        
        iframe.style.cssText = `
          width: 100%;
          height: 100%;
          border: none;
          border-left: 1px solid #e5e7eb;
          box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
          background: white;
        `;
        
        // 关闭按钮已在App.tsx中实现，无需重复添加
      }
    });
  }

  private updateWrapperStyles(wrapper: HTMLElement) {
    if (this.isPinned) {
      // 钉住模式：侧边栏嵌入页面，页面内容向左移动
      wrapper.style.cssText = `
        position: fixed;
        top: 0;
        right: 0;
        width: 460px;
        height: 100vh;
        z-index: 2147483647;
        transition: all 0.3s ease-in-out;
      `;
      
      // 调整页面内容
      document.body.style.marginRight = '460px';
      document.body.style.transition = 'margin-right 0.3s ease-in-out';
    } else {
      // 浮动模式：侧边栏覆盖在页面上
      wrapper.style.cssText = `
        position: fixed;
        top: 0;
        right: ${this.isVisible ? '0px' : '-460px'};
        width: 460px;
        height: 100vh;
        z-index: 2147483647;
        transition: right 0.3s ease-in-out;
      `;
      
      // 恢复页面内容
      document.body.style.marginRight = '0';
    }
  }





  show() {
    if (!this.ui) {
      this.create();
    }
    
    if (this.ui) {
      this.ui.mount();
      // 获取 wrapper 元素并设置样式
      setTimeout(() => {
        const wrapper = this.ui.wrapper;
        if (wrapper) {
          this.updateWrapperStyles(wrapper);
        }
      }, 0);
      this.isVisible = true;
    }
  }

  hide() {
    if (this.ui && this.ui.wrapper) {
      if (this.isPinned) {
        // 钉住模式下隐藏侧边栏并恢复页面布局
        this.ui.wrapper.style.right = '-460px';
        document.body.style.marginRight = '0';
      } else {
        // 浮动模式下隐藏侧边栏
        this.ui.wrapper.style.right = '-460px';
      }
      
      this.isVisible = false;
      // 延迟卸载以允许动画完成
      setTimeout(() => {
        if (this.ui) {
          this.ui.remove();
        }
      }, 300);
    }
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  updateWithCapture(dataUrl: string) {
    // 通过 postMessage 向 iframe 发送数据
    if (this.ui && this.ui.iframe) {
      this.ui.iframe.contentWindow?.postMessage({
        type: 'CAPTURE_DATA',
        data: dataUrl
      }, '*');
    }
    // 如果侧边栏未打开，自动打开它
    if (!this.isVisible) {
      this.show();
    }
  }

  togglePinMode() {
    this.isPinned = !this.isPinned;
    
    // 如果侧边栏当前可见，重新应用样式
    if (this.isVisible && this.ui && this.ui.wrapper) {
      this.updateWrapperStyles(this.ui.wrapper);
    }
    
    // 通知侧边栏组件钉住状态已改变
    if (this.ui && this.ui.iframe) {
      this.ui.iframe.contentWindow?.postMessage({
        type: 'PIN_MODE_CHANGED',
        isPinned: this.isPinned
      }, '*');
    }
  }

  private handleGetCurrentUrl() {
    // 发送当前页面URL给侧边栏
    if (this.ui && this.ui.iframe) {
      this.ui.iframe.contentWindow?.postMessage({
        type: 'CURRENT_URL_RESPONSE',
        url: window.location.href
      }, '*');
    }
  }

  private handleGetPageContent() {
    // 获取页面文本内容
    const textElements = document.querySelectorAll(
      'p, h1, h2, h3, h4, h5, h6, span:not([class*="icon"]):not([class*="btn"]):not([class*="nav"]):not([class*="menu"]), div:not([class*="nav"]):not([class*="menu"]):not([class*="header"]):not([class*="footer"]):not([id*="sidebar"]):not([class*="sidebar"]), li, blockquote'
    );
    
    const textContents: string[] = [];
    
    textElements.forEach(element => {
      // 跳过侧边栏相关元素
      if (element.closest('[id*="sidebar"]') || element.closest('[class*="sidebar"]')) {
        return;
      }
      
      const text = element.textContent?.trim();
      if (text && 
          text.length > 15 && 
          text.length < 300 && 
          !text.includes('©') && 
          !text.includes('®') &&
          !/^\d+$/.test(text) &&
          !/^[\s\W]*$/.test(text) &&
          !text.toLowerCase().includes('cookie') &&
          !text.toLowerCase().includes('privacy') &&
          !text.toLowerCase().includes('terms') &&
          !text.toLowerCase().includes('policy')
      ) {
        textContents.push(text);
      }
    });
    
    // 去重并限制数量
    const uniqueTexts = [...new Set(textContents)].slice(0, 15);
    
    // 发送页面内容给侧边栏
    if (this.ui && this.ui.iframe) {
      this.ui.iframe.contentWindow?.postMessage({
        type: 'PAGE_CONTENT_RESPONSE',
        texts: uniqueTexts
      }, '*');
    }
  }

  private handleGetPageInfo() {
    // 获取页面标题
    const title = document.title;
    
    // 获取页面favicon
    let favicon = '';
    
    // 尝试多种方式获取favicon
    const iconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement ||
                    document.querySelector('link[rel="shortcut icon"]') as HTMLLinkElement ||
                    document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
    
    if (iconLink && iconLink.href) {
      favicon = iconLink.href;
    } else {
      // 如果没有找到，使用默认的favicon路径
      const url = new URL(window.location.href);
      favicon = `${url.protocol}//${url.host}/favicon.ico`;
    }
    
    // 发送页面信息给侧边栏
    if (this.ui && this.ui.iframe) {
      this.ui.iframe.contentWindow?.postMessage({
        type: 'PAGE_INFO_RESPONSE',
        title: title,
        favicon: favicon
      }, '*');
    }
  }

  get visible() {
    return this.isVisible;
  }
  
  get pinned() {
    return this.isPinned;
  }
}
// 侧边栏管理模块

import { createIframeUi } from 'wxt/client';

export class SidebarManager {
  private ui: any = null;
  private isVisible = false;
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
        // 设置 iframe 样式
        wrapper.style.cssText = `
          position: fixed;
          top: 0;
          right: -460px;
          width: 460px;
          height: 100vh;
          z-index: 2147483647;
          transition: right 0.3s ease-in-out;
        `;
        
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
          wrapper.style.right = '0px';
        }
      }, 0);
      this.isVisible = true;
    }
  }

  hide() {
    if (this.ui && this.ui.wrapper) {
      this.ui.wrapper.style.right = '-460px';
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

  get visible() {
    return this.isVisible;
  }
}
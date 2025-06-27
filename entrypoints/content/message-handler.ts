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
}
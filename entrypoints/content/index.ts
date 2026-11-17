import { defineContentScript } from 'wxt/sandbox';
import './style.css';
import { startSelection } from './selector';

// 只负责两件事：圈选遮罩、响应自检。侧边栏是原生 sidePanel，不再注入 iframe。
export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      switch (msg.type) {
        case 'CM_PING':
          // 供 Service Worker 控制台自检：确认这个页面已注入 content script。
          sendResponse({ ok: true, where: 'content', url: location.href });
          return true;
        case 'CM_START_SELECTION':
          void startSelection().then((payload) => {
            if (payload) {
              void chrome.runtime.sendMessage({ type: 'SELECTION_RESULT', payload });
            } else {
              void chrome.runtime.sendMessage({ type: 'SELECTION_CANCELLED' });
            }
          });
          sendResponse({ ok: true });
          return true;
        default:
          // 不认识的消息不要占着通道，否则调用方会收到端口提前关闭的错误。
          return false;
      }
    });
  },
});

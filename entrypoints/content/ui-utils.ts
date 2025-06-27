// UI工具函数模块

/**
 * 显示截图成功提示消息
 */
export function showSuccessMessage() {
  const successMsg = document.createElement('div');
  successMsg.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    padding: 20px 30px;
    border-radius: 12px;
    font-size: 16px;
    z-index: 1000002;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.2);
    text-align: center;
    animation: fadeInScale 0.3s ease-out;
  `;
  successMsg.innerHTML = '✅ 截图成功！<br><small style="opacity: 0.8;">已保存到剪贴板</small>';
  
  // 添加动画样式
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeInScale {
      from {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.8);
      }
      to {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(successMsg);
  
  // 3秒后自动移除
  setTimeout(() => {
    if (successMsg.parentNode) {
      successMsg.remove();
    }
    if (style.parentNode) {
      style.remove();
    }
  }, 3000);
}

/**
 * 显示错误提示消息
 * @param message 错误消息内容
 */
export function showErrorMessage(message: string) {
  const errorMsg = document.createElement('div');
  errorMsg.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
    padding: 20px 30px;
    border-radius: 12px;
    font-size: 16px;
    z-index: 1000002;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.2);
    text-align: center;
    animation: fadeInScale 0.3s ease-out;
  `;
  errorMsg.innerHTML = `❌ ${message}`;
  
  // 添加动画样式（如果不存在）
  if (!document.querySelector('#capmind-animations')) {
    const style = document.createElement('style');
    style.id = 'capmind-animations';
    style.textContent = `
      @keyframes fadeInScale {
        from {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.8);
        }
        to {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(errorMsg);
  
  // 3秒后自动移除
  setTimeout(() => {
    if (errorMsg.parentNode) {
      errorMsg.remove();
    }
  }, 3000);
}

/**
 * 显示加载提示消息
 * @param message 加载消息内容
 * @returns 返回移除函数
 */
export function showLoadingMessage(message: string): () => void {
  const loadingMsg = document.createElement('div');
  loadingMsg.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
    color: white;
    padding: 20px 30px;
    border-radius: 12px;
    font-size: 16px;
    z-index: 1000002;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.2);
    text-align: center;
    animation: fadeInScale 0.3s ease-out;
  `;
  loadingMsg.innerHTML = `⏳ ${message}`;
  
  // 添加动画样式（如果不存在）
  if (!document.querySelector('#capmind-animations')) {
    const style = document.createElement('style');
    style.id = 'capmind-animations';
    style.textContent = `
      @keyframes fadeInScale {
        from {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.8);
        }
        to {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(loadingMsg);
  
  // 返回移除函数
  return () => {
    if (loadingMsg.parentNode) {
      loadingMsg.remove();
    }
  };
}

/**
 * 创建通知提示
 * @param message 提示消息
 * @param type 提示类型
 * @param duration 显示时长（毫秒）
 */
export function showNotification(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration = 3000) {
  const colors = {
    success: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    error: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    info: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    warning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
  };

  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️'
  };

  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${colors[type]};
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 1000002;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.2);
    animation: slideInRight 0.3s ease-out;
    max-width: 300px;
  `;
  notification.innerHTML = `${icons[type]} ${message}`;
  
  // 添加动画样式（如果不存在）
  if (!document.querySelector('#capmind-slide-animations')) {
    const style = document.createElement('style');
    style.id = 'capmind-slide-animations';
    style.textContent = `
      @keyframes slideInRight {
        from {
          opacity: 0;
          transform: translateX(100%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      @keyframes slideOutRight {
        from {
          opacity: 1;
          transform: translateX(0);
        }
        to {
          opacity: 0;
          transform: translateX(100%);
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(notification);
  
  // 自动移除
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease-out';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 300);
  }, duration);
}
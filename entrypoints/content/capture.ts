// 截图选择功能模块

export interface CaptureArea {
  left: number;
  top: number;
  width: number;
  height: number;
}

export class ScreenCapture {
  private isSelecting = false;
  private selectionOverlay: HTMLDivElement | null = null;
  private highlightedElement: HTMLElement | null = null;
  private originalOutline = '';
  private originalBoxShadow = '';

  constructor() {
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  start() {
    if (this.isSelecting) return;
    
    this.isSelecting = true;
    document.body.style.cursor = 'pointer';
    
    // 创建遮罩层
    this.createOverlay();
    
    // 添加事件监听器
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('click', this.handleClick);
    document.addEventListener('keydown', this.handleKeyDown);
  }

  private createOverlay() {
    this.selectionOverlay = document.createElement('div');
    this.selectionOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.3);
      z-index: 999999;
      pointer-events: none;
      backdrop-filter: blur(1px);
    `;
    document.body.appendChild(this.selectionOverlay);

    // 创建提示信息
    const tooltip = document.createElement('div');
    tooltip.id = 'capmind-tooltip';
    tooltip.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 1000001;
      pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.2);
    `;
    tooltip.innerHTML = '🎯 移动鼠标选择元素，点击确定截图，按 <kbd style="background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 4px; font-size: 12px;">ESC</kbd> 取消';
    document.body.appendChild(tooltip);
  }

  private handleMouseMove(e: MouseEvent) {
    if (!this.isSelecting) return;
    
    // 临时隐藏遮罩层以获取真实的元素
    if (this.selectionOverlay) {
      this.selectionOverlay.style.pointerEvents = 'none';
    }
    
    // 获取鼠标下的元素
    let elementUnderMouse = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
    
    // 恢复遮罩层
    if (this.selectionOverlay) {
      this.selectionOverlay.style.pointerEvents = 'none';
    }
    
    // 过滤掉不合适的元素
    if (!elementUnderMouse || 
        elementUnderMouse === document.body || 
        elementUnderMouse === document.documentElement ||
        elementUnderMouse.id === 'capmind-tooltip' ||
        elementUnderMouse === this.selectionOverlay) {
      return;
    }
    
    // 寻找更合适的父元素（如果当前元素太小或是文本节点）
    elementUnderMouse = this.findBestElement(elementUnderMouse);
    
    // 如果是新元素，更新高亮
    if (elementUnderMouse !== this.highlightedElement) {
      // 恢复之前元素的样式
      if (this.highlightedElement) {
        this.highlightedElement.style.outline = this.originalOutline;
        this.highlightedElement.style.boxShadow = this.originalBoxShadow;
        this.highlightedElement.style.position = '';
        this.highlightedElement.style.zIndex = '';
        
        // 移除高亮覆盖层
        const existingOverlay = document.getElementById('capmind-highlight-overlay');
        if (existingOverlay) {
          existingOverlay.remove();
        }
      }
      
      // 高亮新元素
      this.highlightedElement = elementUnderMouse;
      this.originalOutline = this.highlightedElement.style.outline;
      this.originalBoxShadow = this.highlightedElement.style.boxShadow;
      
      // 创建更明显的高亮效果
      this.highlightedElement.style.outline = '3px solid #00ff88';
      this.highlightedElement.style.boxShadow = '0 0 0 1px #00ff88, 0 0 20px rgba(0, 255, 136, 0.4), inset 0 0 0 2px rgba(0, 255, 136, 0.1)';
      this.highlightedElement.style.position = 'relative';
      this.highlightedElement.style.zIndex = '1000000';
      
      // 添加一个半透明的覆盖层来突出显示选中区域
      const highlightOverlay = document.createElement('div');
      highlightOverlay.id = 'capmind-highlight-overlay';
      const rect = this.highlightedElement.getBoundingClientRect();
      highlightOverlay.style.cssText = `
        position: fixed;
        top: ${rect.top}px;
        left: ${rect.left}px;
        width: ${rect.width}px;
        height: ${rect.height}px;
        background: rgba(0, 255, 136, 0.1);
        border: 2px solid #00ff88;
        z-index: 1000000;
        pointer-events: none;
        border-radius: 4px;
        box-shadow: 0 0 30px rgba(0, 255, 136, 0.3);
      `;
      document.body.appendChild(highlightOverlay);
    }
  }
  
  private findBestElement(element: HTMLElement): HTMLElement {
    // 如果元素太小，尝试找到更合适的父元素
    const rect = element.getBoundingClientRect();
    if (rect.width < 20 || rect.height < 20) {
      const parent = element.parentElement;
      if (parent && parent !== document.body && parent !== document.documentElement) {
        return this.findBestElement(parent);
      }
    }
    
    // 优先选择有意义的容器元素
    const meaningfulTags = ['DIV', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'NAV', 'MAIN', 'ASIDE', 'IMG', 'VIDEO', 'CANVAS'];
    if (!meaningfulTags.includes(element.tagName)) {
      const parent = element.parentElement;
      if (parent && meaningfulTags.includes(parent.tagName)) {
        return parent;
      }
    }
    
    return element;
  }

  private handleClick(e: MouseEvent) {
    if (!this.isSelecting || !this.highlightedElement) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // 获取元素的位置和尺寸
    const rect = this.highlightedElement.getBoundingClientRect();
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    
    const area: CaptureArea = {
      left: rect.left + scrollX,
      top: rect.top + scrollY,
      width: rect.width,
      height: rect.height
    };
    
    // 执行截图
    this.captureSelectedArea(area);
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      this.cancel();
    }
  }

  private captureSelectedArea(area: CaptureArea) {
    // 发送截图请求到background script
    chrome.runtime.sendMessage({
      action: 'captureArea',
      area: area
    });
    
    this.cancel();
  }

  cancel() {
    this.isSelecting = false;
    document.body.style.cursor = '';
    
    // 恢复高亮元素的样式
    if (this.highlightedElement) {
      this.highlightedElement.style.outline = this.originalOutline;
      this.highlightedElement.style.boxShadow = this.originalBoxShadow;
      this.highlightedElement.style.position = '';
      this.highlightedElement.style.zIndex = '';
      this.highlightedElement = null;
    }
    
    // 移除高亮覆盖层
    const highlightOverlay = document.getElementById('capmind-highlight-overlay');
    if (highlightOverlay) {
      highlightOverlay.remove();
    }
    
    // 移除事件监听器
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('click', this.handleClick);
    document.removeEventListener('keydown', this.handleKeyDown);
    
    // 移除遮罩层和提示信息
    if (this.selectionOverlay) {
      this.selectionOverlay.remove();
      this.selectionOverlay = null;
    }
    
    const tooltip = document.getElementById('capmind-tooltip');
    if (tooltip) {
      tooltip.remove();
    }
  }
}
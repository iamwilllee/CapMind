// Sidebar management module

import { createIframeUi } from 'wxt/client';

export class SidebarManager {
  private ui: any = null;
  private isVisible = false;
  private isPinned = false;
  private ctx: any;
  private screenCapture: any = null;
  private isSmartCaptureMode = false;

  constructor(ctx: any, screenCapture?: any) {
    this.ctx = ctx;
    this.screenCapture = screenCapture;
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Listen for ESC key to close sidebar
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });

    // Listen for messages from iframe
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
    
    // Listen for capture completion events (fallback for non-smart capture)
    document.addEventListener('captureComplete', (event: any) => {
      if (event.detail && event.detail.action === 'captureComplete') {
        // Only handle if this is not from smart capture mode
        // Smart capture mode handles this in its own event listener
        if (!this.isSmartCaptureMode) {
          this.updateWithCapture(event.detail.dataUrl);
        }
      }
    });
  }

  private async handleSmartCapture() {
    try {
      // Set smart capture mode flag
      this.isSmartCaptureMode = true;
      
      // Hide sidebar in floating mode to avoid interference
      const shouldHideSidebar = !this.isPinned;
      
      if (shouldHideSidebar) {
        this.hide();
        // Wait for sidebar hide animation to complete
        await new Promise(resolve => setTimeout(resolve, 350));
      }
      
      // Start element selection mode instead of direct screenshot
      if (this.screenCapture) {
        this.screenCapture.start();
        
        // Listen for capture completion
        const handleCaptureComplete = (event: any) => {
          if (event.detail && event.detail.action === 'captureComplete') {
            // Show sidebar and switch to capture tab after element capture
            if (shouldHideSidebar) {
              this.show();
            }
            
            // Send capture data first
            this.updateWithCapture(event.detail.dataUrl);
            
            // Then switch to capture tab with a small delay to ensure data is processed
            setTimeout(() => {
              if (this.ui && this.ui.iframe) {
                this.ui.iframe.contentWindow?.postMessage({
                  type: 'SWITCH_TO_CAPTURE_TAB'
                }, '*');
              }
            }, 100);
            
            // Reset smart capture mode flag
            this.isSmartCaptureMode = false;
            
            // Remove event listener
            document.removeEventListener('captureComplete', handleCaptureComplete);
          }
        };
        
        document.addEventListener('captureComplete', handleCaptureComplete);
      } else {
        // Fallback to old behavior if screenCapture is not available
        const response = await chrome.runtime.sendMessage({
          action: 'START_CAPTURE'
        });
        
        if (response && response.dataUrl) {
          this.updateWithCapture(response.dataUrl);
          
          if (shouldHideSidebar) {
            this.show();
          }
          
          if (this.ui && this.ui.iframe) {
            this.ui.iframe.contentWindow?.postMessage({
              type: 'SWITCH_TO_CAPTURE_TAB'
            }, '*');
          }
        }
        
        // Reset smart capture mode flag
        this.isSmartCaptureMode = false;
      }
    } catch (error) {
      console.error('Smart capture failed:', error);
      // Reset smart capture mode flag on error
      this.isSmartCaptureMode = false;
      // If error occurs and sidebar was hidden, show it again
      if (!this.isPinned && !this.isVisible) {
        this.show();
      }
    }
  }

  create() {
    if (this.ui) return;

    // Use createIframeUi to create iframe sidebar
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
        `;
        
        // Close button is already implemented in App.tsx, no need to add again
      }
    });
  }

  private updateWrapperStyles(wrapper: HTMLElement) {
    if (this.isPinned) {
      // Pinned mode: sidebar embedded in page, page content moves left
      wrapper.style.cssText = `
        position: fixed;
        top: 0;
        right: 0;
        width: 460px;
        height: 100vh;
        z-index: 2147483647;
        transition: all 0.3s ease-in-out;
      `;
      
      // Adjust page content
      document.body.style.marginRight = '460px';
      document.body.style.transition = 'margin-right 0.3s ease-in-out';
    } else {
      // Floating mode: sidebar overlays on page
      wrapper.style.cssText = `
        position: fixed;
        top: 0;
        right: ${this.isVisible ? '0px' : '-460px'};
        width: 460px;
        height: 100vh;
        z-index: 2147483647;
        transition: right 0.3s ease-in-out;
      `;
      
      // Restore page content
      document.body.style.marginRight = '0';
    }
  }





  show() {
    if (!this.ui) {
      this.create();
    }
    
    if (this.ui) {
      // Only mount if not already mounted
      if (!this.ui.wrapper || !document.contains(this.ui.wrapper)) {
        this.ui.mount();
      }
      
      // Get wrapper element and set styles
      setTimeout(() => {
        const wrapper = this.ui.wrapper;
        if (wrapper) {
          this.updateWrapperStyles(wrapper);
          // Show the sidebar by setting right position
          if (this.isPinned) {
            wrapper.style.right = '0px';
            document.body.style.marginRight = '460px';
          } else {
            wrapper.style.right = '0px';
          }
        }
      }, 0);
      this.isVisible = true;
    }
  }

  hide() {
    if (this.ui && this.ui.wrapper) {
      if (this.isPinned) {
        // Hide sidebar and restore page layout in pinned mode
        this.ui.wrapper.style.right = '-460px';
        document.body.style.marginRight = '0';
      } else {
        // Hide sidebar in floating mode
        this.ui.wrapper.style.right = '-460px';
      }
      
      this.isVisible = false;
      // Don't remove the DOM element to preserve state
      // Just hide it with CSS transform/position
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
    // Send data to iframe via postMessage
    if (this.ui && this.ui.iframe) {
      this.ui.iframe.contentWindow?.postMessage({
        type: 'CAPTURE_DATA',
        data: dataUrl
      }, '*');
    }
    // Only show sidebar if it's pinned or was already visible before capture
    // In floating mode, don't auto-show after capture to avoid interrupting user workflow
    if (!this.isVisible && this.isPinned) {
      this.show();
    }
  }

  togglePinMode() {
    this.isPinned = !this.isPinned;
    
    // If sidebar is currently visible, reapply styles
    if (this.isVisible && this.ui && this.ui.wrapper) {
      this.updateWrapperStyles(this.ui.wrapper);
    }
    
    // Notify sidebar component that pin state has changed
    if (this.ui && this.ui.iframe) {
      this.ui.iframe.contentWindow?.postMessage({
        type: 'PIN_MODE_CHANGED',
        isPinned: this.isPinned
      }, '*');
    }
  }

  private handleGetCurrentUrl() {
    // Send current page URL to sidebar
    if (this.ui && this.ui.iframe) {
      this.ui.iframe.contentWindow?.postMessage({
        type: 'CURRENT_URL_RESPONSE',
        url: window.location.href
      }, '*');
    }
  }

  private handleGetPageContent() {
    // Get page text content
    const textElements = document.querySelectorAll(
      'p, h1, h2, h3, h4, h5, h6, span:not([class*="icon"]):not([class*="btn"]):not([class*="nav"]):not([class*="menu"]), div:not([class*="nav"]):not([class*="menu"]):not([class*="header"]):not([class*="footer"]):not([id*="sidebar"]):not([class*="sidebar"]), li, blockquote'
    );
    
    const textContents: string[] = [];
    
    textElements.forEach(element => {
      // Skip sidebar related elements
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
    
    // Remove duplicates and limit quantity
    const uniqueTexts = [...new Set(textContents)].slice(0, 15);
    
    // Send page content to sidebar
    if (this.ui && this.ui.iframe) {
      this.ui.iframe.contentWindow?.postMessage({
        type: 'PAGE_CONTENT_RESPONSE',
        texts: uniqueTexts
      }, '*');
    }
  }

  private handleGetPageInfo() {
    // Get page title
    const title = document.title;
    
    // Get page favicon
    let favicon = '';
    
    // Try multiple ways to get favicon
    const iconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement ||
                    document.querySelector('link[rel="shortcut icon"]') as HTMLLinkElement ||
                    document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
    
    if (iconLink && iconLink.href) {
      favicon = iconLink.href;
    } else {
      // If not found, use default favicon path
      const url = new URL(window.location.href);
      favicon = `${url.protocol}//${url.host}/favicon.ico`;
    }
    
    // Send page info to sidebar
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
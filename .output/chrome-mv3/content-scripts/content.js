var content = function() {
  "use strict";var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  function defineContentScript(definition2) {
    return definition2;
  }
  class ScreenCapture {
    constructor() {
      __publicField(this, "isSelecting", false);
      __publicField(this, "selectionOverlay", null);
      __publicField(this, "highlightedElement", null);
      __publicField(this, "originalOutline", "");
      __publicField(this, "originalBoxShadow", "");
      this.handleMouseMove = this.handleMouseMove.bind(this);
      this.handleClick = this.handleClick.bind(this);
      this.handleKeyDown = this.handleKeyDown.bind(this);
    }
    start() {
      if (this.isSelecting) return;
      this.isSelecting = true;
      document.body.style.cursor = "pointer";
      this.createOverlay();
      document.addEventListener("mousemove", this.handleMouseMove);
      document.addEventListener("click", this.handleClick);
      document.addEventListener("keydown", this.handleKeyDown);
    }
    createOverlay() {
      this.selectionOverlay = document.createElement("div");
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
      const tooltip = document.createElement("div");
      tooltip.id = "capmind-tooltip";
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
    handleMouseMove(e) {
      if (!this.isSelecting) return;
      if (this.selectionOverlay) {
        this.selectionOverlay.style.pointerEvents = "none";
      }
      let elementUnderMouse = document.elementFromPoint(e.clientX, e.clientY);
      if (this.selectionOverlay) {
        this.selectionOverlay.style.pointerEvents = "none";
      }
      if (!elementUnderMouse || elementUnderMouse === document.body || elementUnderMouse === document.documentElement || elementUnderMouse.id === "capmind-tooltip" || elementUnderMouse === this.selectionOverlay) {
        return;
      }
      elementUnderMouse = this.findBestElement(elementUnderMouse);
      if (elementUnderMouse !== this.highlightedElement) {
        if (this.highlightedElement) {
          this.highlightedElement.style.outline = this.originalOutline;
          this.highlightedElement.style.boxShadow = this.originalBoxShadow;
          this.highlightedElement.style.position = "";
          this.highlightedElement.style.zIndex = "";
          const existingOverlay = document.getElementById("capmind-highlight-overlay");
          if (existingOverlay) {
            existingOverlay.remove();
          }
        }
        this.highlightedElement = elementUnderMouse;
        this.originalOutline = this.highlightedElement.style.outline;
        this.originalBoxShadow = this.highlightedElement.style.boxShadow;
        this.highlightedElement.style.outline = "3px solid #00ff88";
        this.highlightedElement.style.boxShadow = "0 0 0 1px #00ff88, 0 0 20px rgba(0, 255, 136, 0.4), inset 0 0 0 2px rgba(0, 255, 136, 0.1)";
        this.highlightedElement.style.position = "relative";
        this.highlightedElement.style.zIndex = "1000000";
        const highlightOverlay = document.createElement("div");
        highlightOverlay.id = "capmind-highlight-overlay";
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
    findBestElement(element) {
      const rect = element.getBoundingClientRect();
      if (rect.width < 20 || rect.height < 20) {
        const parent = element.parentElement;
        if (parent && parent !== document.body && parent !== document.documentElement) {
          return this.findBestElement(parent);
        }
      }
      const meaningfulTags = ["DIV", "SECTION", "ARTICLE", "HEADER", "FOOTER", "NAV", "MAIN", "ASIDE", "IMG", "VIDEO", "CANVAS"];
      if (!meaningfulTags.includes(element.tagName)) {
        const parent = element.parentElement;
        if (parent && meaningfulTags.includes(parent.tagName)) {
          return parent;
        }
      }
      return element;
    }
    handleClick(e) {
      if (!this.isSelecting || !this.highlightedElement) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = this.highlightedElement.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const left = Math.max(0, rect.left);
      const top = Math.max(0, rect.top);
      const right = Math.min(viewportWidth, rect.right);
      const bottom = Math.min(viewportHeight, rect.bottom);
      const area = {
        left,
        top,
        width: right - left,
        height: bottom - top
      };
      if (area.width <= 0 || area.height <= 0) {
        console.warn("选中的元素不在可见区域内");
        return;
      }
      this.captureSelectedArea(area);
    }
    handleKeyDown(e) {
      if (e.key === "Escape") {
        this.cancel();
      }
    }
    captureSelectedArea(area) {
      const devicePixelRatio = window.devicePixelRatio || 1;
      chrome.runtime.sendMessage({
        action: "captureArea",
        area: {
          ...area,
          devicePixelRatio
        }
      });
      this.cancel();
    }
    cancel() {
      this.isSelecting = false;
      document.body.style.cursor = "";
      if (this.highlightedElement) {
        this.highlightedElement.style.outline = this.originalOutline;
        this.highlightedElement.style.boxShadow = this.originalBoxShadow;
        this.highlightedElement.style.position = "";
        this.highlightedElement.style.zIndex = "";
        this.highlightedElement = null;
      }
      const highlightOverlay = document.getElementById("capmind-highlight-overlay");
      if (highlightOverlay) {
        highlightOverlay.remove();
      }
      document.removeEventListener("mousemove", this.handleMouseMove);
      document.removeEventListener("click", this.handleClick);
      document.removeEventListener("keydown", this.handleKeyDown);
      if (this.selectionOverlay) {
        this.selectionOverlay.remove();
        this.selectionOverlay = null;
      }
      const tooltip = document.getElementById("capmind-tooltip");
      if (tooltip) {
        tooltip.remove();
      }
    }
  }
  content;
  function getDefaultExportFromCjs(x) {
    return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
  }
  var browserPolyfill$1 = { exports: {} };
  var browserPolyfill = browserPolyfill$1.exports;
  var hasRequiredBrowserPolyfill;
  function requireBrowserPolyfill() {
    if (hasRequiredBrowserPolyfill) return browserPolyfill$1.exports;
    hasRequiredBrowserPolyfill = 1;
    (function(module, exports) {
      (function(global, factory) {
        {
          factory(module);
        }
      })(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : browserPolyfill, function(module2) {
        if (!(globalThis.chrome && globalThis.chrome.runtime && globalThis.chrome.runtime.id)) {
          throw new Error("This script should only be loaded in a browser extension.");
        }
        if (!(globalThis.browser && globalThis.browser.runtime && globalThis.browser.runtime.id)) {
          const CHROME_SEND_MESSAGE_CALLBACK_NO_RESPONSE_MESSAGE = "The message port closed before a response was received.";
          const wrapAPIs = (extensionAPIs) => {
            const apiMetadata = {
              "alarms": {
                "clear": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "clearAll": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "get": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "getAll": {
                  "minArgs": 0,
                  "maxArgs": 0
                }
              },
              "bookmarks": {
                "create": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "get": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getChildren": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getRecent": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getSubTree": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getTree": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "move": {
                  "minArgs": 2,
                  "maxArgs": 2
                },
                "remove": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "removeTree": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "search": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "update": {
                  "minArgs": 2,
                  "maxArgs": 2
                }
              },
              "browserAction": {
                "disable": {
                  "minArgs": 0,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                },
                "enable": {
                  "minArgs": 0,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                },
                "getBadgeBackgroundColor": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getBadgeText": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getPopup": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getTitle": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "openPopup": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "setBadgeBackgroundColor": {
                  "minArgs": 1,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                },
                "setBadgeText": {
                  "minArgs": 1,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                },
                "setIcon": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "setPopup": {
                  "minArgs": 1,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                },
                "setTitle": {
                  "minArgs": 1,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                }
              },
              "browsingData": {
                "remove": {
                  "minArgs": 2,
                  "maxArgs": 2
                },
                "removeCache": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "removeCookies": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "removeDownloads": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "removeFormData": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "removeHistory": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "removeLocalStorage": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "removePasswords": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "removePluginData": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "settings": {
                  "minArgs": 0,
                  "maxArgs": 0
                }
              },
              "commands": {
                "getAll": {
                  "minArgs": 0,
                  "maxArgs": 0
                }
              },
              "contextMenus": {
                "remove": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "removeAll": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "update": {
                  "minArgs": 2,
                  "maxArgs": 2
                }
              },
              "cookies": {
                "get": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getAll": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getAllCookieStores": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "remove": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "set": {
                  "minArgs": 1,
                  "maxArgs": 1
                }
              },
              "devtools": {
                "inspectedWindow": {
                  "eval": {
                    "minArgs": 1,
                    "maxArgs": 2,
                    "singleCallbackArg": false
                  }
                },
                "panels": {
                  "create": {
                    "minArgs": 3,
                    "maxArgs": 3,
                    "singleCallbackArg": true
                  },
                  "elements": {
                    "createSidebarPane": {
                      "minArgs": 1,
                      "maxArgs": 1
                    }
                  }
                }
              },
              "downloads": {
                "cancel": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "download": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "erase": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getFileIcon": {
                  "minArgs": 1,
                  "maxArgs": 2
                },
                "open": {
                  "minArgs": 1,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                },
                "pause": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "removeFile": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "resume": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "search": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "show": {
                  "minArgs": 1,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                }
              },
              "extension": {
                "isAllowedFileSchemeAccess": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "isAllowedIncognitoAccess": {
                  "minArgs": 0,
                  "maxArgs": 0
                }
              },
              "history": {
                "addUrl": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "deleteAll": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "deleteRange": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "deleteUrl": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getVisits": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "search": {
                  "minArgs": 1,
                  "maxArgs": 1
                }
              },
              "i18n": {
                "detectLanguage": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getAcceptLanguages": {
                  "minArgs": 0,
                  "maxArgs": 0
                }
              },
              "identity": {
                "launchWebAuthFlow": {
                  "minArgs": 1,
                  "maxArgs": 1
                }
              },
              "idle": {
                "queryState": {
                  "minArgs": 1,
                  "maxArgs": 1
                }
              },
              "management": {
                "get": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getAll": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "getSelf": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "setEnabled": {
                  "minArgs": 2,
                  "maxArgs": 2
                },
                "uninstallSelf": {
                  "minArgs": 0,
                  "maxArgs": 1
                }
              },
              "notifications": {
                "clear": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "create": {
                  "minArgs": 1,
                  "maxArgs": 2
                },
                "getAll": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "getPermissionLevel": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "update": {
                  "minArgs": 2,
                  "maxArgs": 2
                }
              },
              "pageAction": {
                "getPopup": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getTitle": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "hide": {
                  "minArgs": 1,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                },
                "setIcon": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "setPopup": {
                  "minArgs": 1,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                },
                "setTitle": {
                  "minArgs": 1,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                },
                "show": {
                  "minArgs": 1,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                }
              },
              "permissions": {
                "contains": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getAll": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "remove": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "request": {
                  "minArgs": 1,
                  "maxArgs": 1
                }
              },
              "runtime": {
                "getBackgroundPage": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "getPlatformInfo": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "openOptionsPage": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "requestUpdateCheck": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "sendMessage": {
                  "minArgs": 1,
                  "maxArgs": 3
                },
                "sendNativeMessage": {
                  "minArgs": 2,
                  "maxArgs": 2
                },
                "setUninstallURL": {
                  "minArgs": 1,
                  "maxArgs": 1
                }
              },
              "sessions": {
                "getDevices": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "getRecentlyClosed": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "restore": {
                  "minArgs": 0,
                  "maxArgs": 1
                }
              },
              "storage": {
                "local": {
                  "clear": {
                    "minArgs": 0,
                    "maxArgs": 0
                  },
                  "get": {
                    "minArgs": 0,
                    "maxArgs": 1
                  },
                  "getBytesInUse": {
                    "minArgs": 0,
                    "maxArgs": 1
                  },
                  "remove": {
                    "minArgs": 1,
                    "maxArgs": 1
                  },
                  "set": {
                    "minArgs": 1,
                    "maxArgs": 1
                  }
                },
                "managed": {
                  "get": {
                    "minArgs": 0,
                    "maxArgs": 1
                  },
                  "getBytesInUse": {
                    "minArgs": 0,
                    "maxArgs": 1
                  }
                },
                "sync": {
                  "clear": {
                    "minArgs": 0,
                    "maxArgs": 0
                  },
                  "get": {
                    "minArgs": 0,
                    "maxArgs": 1
                  },
                  "getBytesInUse": {
                    "minArgs": 0,
                    "maxArgs": 1
                  },
                  "remove": {
                    "minArgs": 1,
                    "maxArgs": 1
                  },
                  "set": {
                    "minArgs": 1,
                    "maxArgs": 1
                  }
                }
              },
              "tabs": {
                "captureVisibleTab": {
                  "minArgs": 0,
                  "maxArgs": 2
                },
                "create": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "detectLanguage": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "discard": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "duplicate": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "executeScript": {
                  "minArgs": 1,
                  "maxArgs": 2
                },
                "get": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getCurrent": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "getZoom": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "getZoomSettings": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "goBack": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "goForward": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "highlight": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "insertCSS": {
                  "minArgs": 1,
                  "maxArgs": 2
                },
                "move": {
                  "minArgs": 2,
                  "maxArgs": 2
                },
                "query": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "reload": {
                  "minArgs": 0,
                  "maxArgs": 2
                },
                "remove": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "removeCSS": {
                  "minArgs": 1,
                  "maxArgs": 2
                },
                "sendMessage": {
                  "minArgs": 2,
                  "maxArgs": 3
                },
                "setZoom": {
                  "minArgs": 1,
                  "maxArgs": 2
                },
                "setZoomSettings": {
                  "minArgs": 1,
                  "maxArgs": 2
                },
                "update": {
                  "minArgs": 1,
                  "maxArgs": 2
                }
              },
              "topSites": {
                "get": {
                  "minArgs": 0,
                  "maxArgs": 0
                }
              },
              "webNavigation": {
                "getAllFrames": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getFrame": {
                  "minArgs": 1,
                  "maxArgs": 1
                }
              },
              "webRequest": {
                "handlerBehaviorChanged": {
                  "minArgs": 0,
                  "maxArgs": 0
                }
              },
              "windows": {
                "create": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "get": {
                  "minArgs": 1,
                  "maxArgs": 2
                },
                "getAll": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "getCurrent": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "getLastFocused": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "remove": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "update": {
                  "minArgs": 2,
                  "maxArgs": 2
                }
              }
            };
            if (Object.keys(apiMetadata).length === 0) {
              throw new Error("api-metadata.json has not been included in browser-polyfill");
            }
            class DefaultWeakMap extends WeakMap {
              constructor(createItem, items = void 0) {
                super(items);
                this.createItem = createItem;
              }
              get(key) {
                if (!this.has(key)) {
                  this.set(key, this.createItem(key));
                }
                return super.get(key);
              }
            }
            const isThenable = (value) => {
              return value && typeof value === "object" && typeof value.then === "function";
            };
            const makeCallback = (promise, metadata) => {
              return (...callbackArgs) => {
                if (extensionAPIs.runtime.lastError) {
                  promise.reject(new Error(extensionAPIs.runtime.lastError.message));
                } else if (metadata.singleCallbackArg || callbackArgs.length <= 1 && metadata.singleCallbackArg !== false) {
                  promise.resolve(callbackArgs[0]);
                } else {
                  promise.resolve(callbackArgs);
                }
              };
            };
            const pluralizeArguments = (numArgs) => numArgs == 1 ? "argument" : "arguments";
            const wrapAsyncFunction = (name, metadata) => {
              return function asyncFunctionWrapper(target, ...args) {
                if (args.length < metadata.minArgs) {
                  throw new Error(`Expected at least ${metadata.minArgs} ${pluralizeArguments(metadata.minArgs)} for ${name}(), got ${args.length}`);
                }
                if (args.length > metadata.maxArgs) {
                  throw new Error(`Expected at most ${metadata.maxArgs} ${pluralizeArguments(metadata.maxArgs)} for ${name}(), got ${args.length}`);
                }
                return new Promise((resolve, reject) => {
                  if (metadata.fallbackToNoCallback) {
                    try {
                      target[name](...args, makeCallback({
                        resolve,
                        reject
                      }, metadata));
                    } catch (cbError) {
                      console.warn(`${name} API method doesn't seem to support the callback parameter, falling back to call it without a callback: `, cbError);
                      target[name](...args);
                      metadata.fallbackToNoCallback = false;
                      metadata.noCallback = true;
                      resolve();
                    }
                  } else if (metadata.noCallback) {
                    target[name](...args);
                    resolve();
                  } else {
                    target[name](...args, makeCallback({
                      resolve,
                      reject
                    }, metadata));
                  }
                });
              };
            };
            const wrapMethod = (target, method, wrapper) => {
              return new Proxy(method, {
                apply(targetMethod, thisObj, args) {
                  return wrapper.call(thisObj, target, ...args);
                }
              });
            };
            let hasOwnProperty = Function.call.bind(Object.prototype.hasOwnProperty);
            const wrapObject = (target, wrappers = {}, metadata = {}) => {
              let cache = /* @__PURE__ */ Object.create(null);
              let handlers = {
                has(proxyTarget2, prop) {
                  return prop in target || prop in cache;
                },
                get(proxyTarget2, prop, receiver) {
                  if (prop in cache) {
                    return cache[prop];
                  }
                  if (!(prop in target)) {
                    return void 0;
                  }
                  let value = target[prop];
                  if (typeof value === "function") {
                    if (typeof wrappers[prop] === "function") {
                      value = wrapMethod(target, target[prop], wrappers[prop]);
                    } else if (hasOwnProperty(metadata, prop)) {
                      let wrapper = wrapAsyncFunction(prop, metadata[prop]);
                      value = wrapMethod(target, target[prop], wrapper);
                    } else {
                      value = value.bind(target);
                    }
                  } else if (typeof value === "object" && value !== null && (hasOwnProperty(wrappers, prop) || hasOwnProperty(metadata, prop))) {
                    value = wrapObject(value, wrappers[prop], metadata[prop]);
                  } else if (hasOwnProperty(metadata, "*")) {
                    value = wrapObject(value, wrappers[prop], metadata["*"]);
                  } else {
                    Object.defineProperty(cache, prop, {
                      configurable: true,
                      enumerable: true,
                      get() {
                        return target[prop];
                      },
                      set(value2) {
                        target[prop] = value2;
                      }
                    });
                    return value;
                  }
                  cache[prop] = value;
                  return value;
                },
                set(proxyTarget2, prop, value, receiver) {
                  if (prop in cache) {
                    cache[prop] = value;
                  } else {
                    target[prop] = value;
                  }
                  return true;
                },
                defineProperty(proxyTarget2, prop, desc) {
                  return Reflect.defineProperty(cache, prop, desc);
                },
                deleteProperty(proxyTarget2, prop) {
                  return Reflect.deleteProperty(cache, prop);
                }
              };
              let proxyTarget = Object.create(target);
              return new Proxy(proxyTarget, handlers);
            };
            const wrapEvent = (wrapperMap) => ({
              addListener(target, listener, ...args) {
                target.addListener(wrapperMap.get(listener), ...args);
              },
              hasListener(target, listener) {
                return target.hasListener(wrapperMap.get(listener));
              },
              removeListener(target, listener) {
                target.removeListener(wrapperMap.get(listener));
              }
            });
            const onRequestFinishedWrappers = new DefaultWeakMap((listener) => {
              if (typeof listener !== "function") {
                return listener;
              }
              return function onRequestFinished(req) {
                const wrappedReq = wrapObject(req, {}, {
                  getContent: {
                    minArgs: 0,
                    maxArgs: 0
                  }
                });
                listener(wrappedReq);
              };
            });
            const onMessageWrappers = new DefaultWeakMap((listener) => {
              if (typeof listener !== "function") {
                return listener;
              }
              return function onMessage(message, sender, sendResponse) {
                let didCallSendResponse = false;
                let wrappedSendResponse;
                let sendResponsePromise = new Promise((resolve) => {
                  wrappedSendResponse = function(response) {
                    didCallSendResponse = true;
                    resolve(response);
                  };
                });
                let result2;
                try {
                  result2 = listener(message, sender, wrappedSendResponse);
                } catch (err) {
                  result2 = Promise.reject(err);
                }
                const isResultThenable = result2 !== true && isThenable(result2);
                if (result2 !== true && !isResultThenable && !didCallSendResponse) {
                  return false;
                }
                const sendPromisedResult = (promise) => {
                  promise.then((msg) => {
                    sendResponse(msg);
                  }, (error) => {
                    let message2;
                    if (error && (error instanceof Error || typeof error.message === "string")) {
                      message2 = error.message;
                    } else {
                      message2 = "An unexpected error occurred";
                    }
                    sendResponse({
                      __mozWebExtensionPolyfillReject__: true,
                      message: message2
                    });
                  }).catch((err) => {
                    console.error("Failed to send onMessage rejected reply", err);
                  });
                };
                if (isResultThenable) {
                  sendPromisedResult(result2);
                } else {
                  sendPromisedResult(sendResponsePromise);
                }
                return true;
              };
            });
            const wrappedSendMessageCallback = ({
              reject,
              resolve
            }, reply) => {
              if (extensionAPIs.runtime.lastError) {
                if (extensionAPIs.runtime.lastError.message === CHROME_SEND_MESSAGE_CALLBACK_NO_RESPONSE_MESSAGE) {
                  resolve();
                } else {
                  reject(new Error(extensionAPIs.runtime.lastError.message));
                }
              } else if (reply && reply.__mozWebExtensionPolyfillReject__) {
                reject(new Error(reply.message));
              } else {
                resolve(reply);
              }
            };
            const wrappedSendMessage = (name, metadata, apiNamespaceObj, ...args) => {
              if (args.length < metadata.minArgs) {
                throw new Error(`Expected at least ${metadata.minArgs} ${pluralizeArguments(metadata.minArgs)} for ${name}(), got ${args.length}`);
              }
              if (args.length > metadata.maxArgs) {
                throw new Error(`Expected at most ${metadata.maxArgs} ${pluralizeArguments(metadata.maxArgs)} for ${name}(), got ${args.length}`);
              }
              return new Promise((resolve, reject) => {
                const wrappedCb = wrappedSendMessageCallback.bind(null, {
                  resolve,
                  reject
                });
                args.push(wrappedCb);
                apiNamespaceObj.sendMessage(...args);
              });
            };
            const staticWrappers = {
              devtools: {
                network: {
                  onRequestFinished: wrapEvent(onRequestFinishedWrappers)
                }
              },
              runtime: {
                onMessage: wrapEvent(onMessageWrappers),
                onMessageExternal: wrapEvent(onMessageWrappers),
                sendMessage: wrappedSendMessage.bind(null, "sendMessage", {
                  minArgs: 1,
                  maxArgs: 3
                })
              },
              tabs: {
                sendMessage: wrappedSendMessage.bind(null, "sendMessage", {
                  minArgs: 2,
                  maxArgs: 3
                })
              }
            };
            const settingMetadata = {
              clear: {
                minArgs: 1,
                maxArgs: 1
              },
              get: {
                minArgs: 1,
                maxArgs: 1
              },
              set: {
                minArgs: 1,
                maxArgs: 1
              }
            };
            apiMetadata.privacy = {
              network: {
                "*": settingMetadata
              },
              services: {
                "*": settingMetadata
              },
              websites: {
                "*": settingMetadata
              }
            };
            return wrapObject(extensionAPIs, staticWrappers, apiMetadata);
          };
          module2.exports = wrapAPIs(chrome);
        } else {
          module2.exports = globalThis.browser;
        }
      });
    })(browserPolyfill$1);
    return browserPolyfill$1.exports;
  }
  var browserPolyfillExports = requireBrowserPolyfill();
  const originalBrowser = /* @__PURE__ */ getDefaultExportFromCjs(browserPolyfillExports);
  const browser = originalBrowser;
  function print$1(method, ...args) {
    if (typeof args[0] === "string") {
      const message = args.shift();
      method(`[wxt] ${message}`, ...args);
    } else {
      method("[wxt]", ...args);
    }
  }
  const logger$1 = {
    debug: (...args) => print$1(console.debug, ...args),
    log: (...args) => print$1(console.log, ...args),
    warn: (...args) => print$1(console.warn, ...args),
    error: (...args) => print$1(console.error, ...args)
  };
  const _WxtLocationChangeEvent = class _WxtLocationChangeEvent extends Event {
    constructor(newUrl, oldUrl) {
      super(_WxtLocationChangeEvent.EVENT_NAME, {});
      this.newUrl = newUrl;
      this.oldUrl = oldUrl;
    }
  };
  __publicField(_WxtLocationChangeEvent, "EVENT_NAME", getUniqueEventName("wxt:locationchange"));
  let WxtLocationChangeEvent = _WxtLocationChangeEvent;
  function getUniqueEventName(eventName) {
    var _a;
    return `${(_a = browser == null ? void 0 : browser.runtime) == null ? void 0 : _a.id}:${"content"}:${eventName}`;
  }
  function createLocationWatcher(ctx) {
    let interval;
    let oldUrl;
    return {
      /**
       * Ensure the location watcher is actively looking for URL changes. If it's already watching,
       * this is a noop.
       */
      run() {
        if (interval != null) return;
        oldUrl = new URL(location.href);
        interval = ctx.setInterval(() => {
          let newUrl = new URL(location.href);
          if (newUrl.href !== oldUrl.href) {
            window.dispatchEvent(new WxtLocationChangeEvent(newUrl, oldUrl));
            oldUrl = newUrl;
          }
        }, 1e3);
      }
    };
  }
  const _ContentScriptContext = class _ContentScriptContext {
    constructor(contentScriptName, options) {
      __publicField(this, "isTopFrame", window.self === window.top);
      __publicField(this, "abortController");
      __publicField(this, "locationWatcher", createLocationWatcher(this));
      __publicField(this, "receivedMessageIds", /* @__PURE__ */ new Set());
      this.contentScriptName = contentScriptName;
      this.options = options;
      this.abortController = new AbortController();
      if (this.isTopFrame) {
        this.listenForNewerScripts({ ignoreFirstEvent: true });
        this.stopOldScripts();
      } else {
        this.listenForNewerScripts();
      }
    }
    get signal() {
      return this.abortController.signal;
    }
    abort(reason) {
      return this.abortController.abort(reason);
    }
    get isInvalid() {
      if (browser.runtime.id == null) {
        this.notifyInvalidated();
      }
      return this.signal.aborted;
    }
    get isValid() {
      return !this.isInvalid;
    }
    /**
     * Add a listener that is called when the content script's context is invalidated.
     *
     * @returns A function to remove the listener.
     *
     * @example
     * browser.runtime.onMessage.addListener(cb);
     * const removeInvalidatedListener = ctx.onInvalidated(() => {
     *   browser.runtime.onMessage.removeListener(cb);
     * })
     * // ...
     * removeInvalidatedListener();
     */
    onInvalidated(cb) {
      this.signal.addEventListener("abort", cb);
      return () => this.signal.removeEventListener("abort", cb);
    }
    /**
     * Return a promise that never resolves. Useful if you have an async function that shouldn't run
     * after the context is expired.
     *
     * @example
     * const getValueFromStorage = async () => {
     *   if (ctx.isInvalid) return ctx.block();
     *
     *   // ...
     * }
     */
    block() {
      return new Promise(() => {
      });
    }
    /**
     * Wrapper around `window.setInterval` that automatically clears the interval when invalidated.
     */
    setInterval(handler, timeout) {
      const id = setInterval(() => {
        if (this.isValid) handler();
      }, timeout);
      this.onInvalidated(() => clearInterval(id));
      return id;
    }
    /**
     * Wrapper around `window.setTimeout` that automatically clears the interval when invalidated.
     */
    setTimeout(handler, timeout) {
      const id = setTimeout(() => {
        if (this.isValid) handler();
      }, timeout);
      this.onInvalidated(() => clearTimeout(id));
      return id;
    }
    /**
     * Wrapper around `window.requestAnimationFrame` that automatically cancels the request when
     * invalidated.
     */
    requestAnimationFrame(callback) {
      const id = requestAnimationFrame((...args) => {
        if (this.isValid) callback(...args);
      });
      this.onInvalidated(() => cancelAnimationFrame(id));
      return id;
    }
    /**
     * Wrapper around `window.requestIdleCallback` that automatically cancels the request when
     * invalidated.
     */
    requestIdleCallback(callback, options) {
      const id = requestIdleCallback((...args) => {
        if (!this.signal.aborted) callback(...args);
      }, options);
      this.onInvalidated(() => cancelIdleCallback(id));
      return id;
    }
    addEventListener(target, type, handler, options) {
      var _a;
      if (type === "wxt:locationchange") {
        if (this.isValid) this.locationWatcher.run();
      }
      (_a = target.addEventListener) == null ? void 0 : _a.call(
        target,
        type.startsWith("wxt:") ? getUniqueEventName(type) : type,
        handler,
        {
          ...options,
          signal: this.signal
        }
      );
    }
    /**
     * @internal
     * Abort the abort controller and execute all `onInvalidated` listeners.
     */
    notifyInvalidated() {
      this.abort("Content script context invalidated");
      logger$1.debug(
        `Content script "${this.contentScriptName}" context invalidated`
      );
    }
    stopOldScripts() {
      window.postMessage(
        {
          type: _ContentScriptContext.SCRIPT_STARTED_MESSAGE_TYPE,
          contentScriptName: this.contentScriptName,
          messageId: Math.random().toString(36).slice(2)
        },
        "*"
      );
    }
    verifyScriptStartedEvent(event) {
      var _a, _b, _c;
      const isScriptStartedEvent = ((_a = event.data) == null ? void 0 : _a.type) === _ContentScriptContext.SCRIPT_STARTED_MESSAGE_TYPE;
      const isSameContentScript = ((_b = event.data) == null ? void 0 : _b.contentScriptName) === this.contentScriptName;
      const isNotDuplicate = !this.receivedMessageIds.has((_c = event.data) == null ? void 0 : _c.messageId);
      return isScriptStartedEvent && isSameContentScript && isNotDuplicate;
    }
    listenForNewerScripts(options) {
      let isFirst = true;
      const cb = (event) => {
        if (this.verifyScriptStartedEvent(event)) {
          this.receivedMessageIds.add(event.data.messageId);
          const wasFirst = isFirst;
          isFirst = false;
          if (wasFirst && (options == null ? void 0 : options.ignoreFirstEvent)) return;
          this.notifyInvalidated();
        }
      };
      addEventListener("message", cb);
      this.onInvalidated(() => removeEventListener("message", cb));
    }
  };
  __publicField(_ContentScriptContext, "SCRIPT_STARTED_MESSAGE_TYPE", getUniqueEventName(
    "wxt:content-script-started"
  ));
  let ContentScriptContext = _ContentScriptContext;
  const nullKey = Symbol("null");
  let keyCounter = 0;
  class ManyKeysMap extends Map {
    constructor() {
      super();
      this._objectHashes = /* @__PURE__ */ new WeakMap();
      this._symbolHashes = /* @__PURE__ */ new Map();
      this._publicKeys = /* @__PURE__ */ new Map();
      const [pairs] = arguments;
      if (pairs === null || pairs === void 0) {
        return;
      }
      if (typeof pairs[Symbol.iterator] !== "function") {
        throw new TypeError(typeof pairs + " is not iterable (cannot read property Symbol(Symbol.iterator))");
      }
      for (const [keys, value] of pairs) {
        this.set(keys, value);
      }
    }
    _getPublicKeys(keys, create = false) {
      if (!Array.isArray(keys)) {
        throw new TypeError("The keys parameter must be an array");
      }
      const privateKey = this._getPrivateKey(keys, create);
      let publicKey;
      if (privateKey && this._publicKeys.has(privateKey)) {
        publicKey = this._publicKeys.get(privateKey);
      } else if (create) {
        publicKey = [...keys];
        this._publicKeys.set(privateKey, publicKey);
      }
      return { privateKey, publicKey };
    }
    _getPrivateKey(keys, create = false) {
      const privateKeys = [];
      for (let key of keys) {
        if (key === null) {
          key = nullKey;
        }
        const hashes = typeof key === "object" || typeof key === "function" ? "_objectHashes" : typeof key === "symbol" ? "_symbolHashes" : false;
        if (!hashes) {
          privateKeys.push(key);
        } else if (this[hashes].has(key)) {
          privateKeys.push(this[hashes].get(key));
        } else if (create) {
          const privateKey = `@@mkm-ref-${keyCounter++}@@`;
          this[hashes].set(key, privateKey);
          privateKeys.push(privateKey);
        } else {
          return false;
        }
      }
      return JSON.stringify(privateKeys);
    }
    set(keys, value) {
      const { publicKey } = this._getPublicKeys(keys, true);
      return super.set(publicKey, value);
    }
    get(keys) {
      const { publicKey } = this._getPublicKeys(keys);
      return super.get(publicKey);
    }
    has(keys) {
      const { publicKey } = this._getPublicKeys(keys);
      return super.has(publicKey);
    }
    delete(keys) {
      const { publicKey, privateKey } = this._getPublicKeys(keys);
      return Boolean(publicKey && super.delete(publicKey) && this._publicKeys.delete(privateKey));
    }
    clear() {
      super.clear();
      this._symbolHashes.clear();
      this._publicKeys.clear();
    }
    get [Symbol.toStringTag]() {
      return "ManyKeysMap";
    }
    get size() {
      return super.size;
    }
  }
  function isPlainObject(value) {
    if (value === null || typeof value !== "object") {
      return false;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== null && prototype !== Object.prototype && Object.getPrototypeOf(prototype) !== null) {
      return false;
    }
    if (Symbol.iterator in value) {
      return false;
    }
    if (Symbol.toStringTag in value) {
      return Object.prototype.toString.call(value) === "[object Module]";
    }
    return true;
  }
  function _defu(baseObject, defaults, namespace = ".", merger) {
    if (!isPlainObject(defaults)) {
      return _defu(baseObject, {}, namespace, merger);
    }
    const object = Object.assign({}, defaults);
    for (const key in baseObject) {
      if (key === "__proto__" || key === "constructor") {
        continue;
      }
      const value = baseObject[key];
      if (value === null || value === void 0) {
        continue;
      }
      if (merger && merger(object, key, value, namespace)) {
        continue;
      }
      if (Array.isArray(value) && Array.isArray(object[key])) {
        object[key] = [...value, ...object[key]];
      } else if (isPlainObject(value) && isPlainObject(object[key])) {
        object[key] = _defu(
          value,
          object[key],
          (namespace ? `${namespace}.` : "") + key.toString(),
          merger
        );
      } else {
        object[key] = value;
      }
    }
    return object;
  }
  function createDefu(merger) {
    return (...arguments_) => (
      // eslint-disable-next-line unicorn/no-array-reduce
      arguments_.reduce((p, c) => _defu(p, c, "", merger), {})
    );
  }
  const defu = createDefu();
  const isExist = (element) => {
    return element !== null ? { isDetected: true, result: element } : { isDetected: false };
  };
  const isNotExist = (element) => {
    return element === null ? { isDetected: true, result: null } : { isDetected: false };
  };
  const getDefaultOptions = () => ({
    target: globalThis.document,
    unifyProcess: true,
    detector: isExist,
    observeConfigs: {
      childList: true,
      subtree: true,
      attributes: true
    },
    signal: void 0,
    customMatcher: void 0
  });
  const mergeOptions = (userSideOptions, defaultOptions) => {
    return defu(userSideOptions, defaultOptions);
  };
  const unifyCache = new ManyKeysMap();
  function createWaitElement(instanceOptions) {
    const { defaultOptions } = instanceOptions;
    return (selector, options) => {
      const {
        target,
        unifyProcess,
        observeConfigs,
        detector,
        signal,
        customMatcher
      } = mergeOptions(options, defaultOptions);
      const unifyPromiseKey = [
        selector,
        target,
        unifyProcess,
        observeConfigs,
        detector,
        signal,
        customMatcher
      ];
      const cachedPromise = unifyCache.get(unifyPromiseKey);
      if (unifyProcess && cachedPromise) {
        return cachedPromise;
      }
      const detectPromise = new Promise(
        // biome-ignore lint/suspicious/noAsyncPromiseExecutor: avoid nesting promise
        async (resolve, reject) => {
          if (signal == null ? void 0 : signal.aborted) {
            return reject(signal.reason);
          }
          const observer = new MutationObserver(
            async (mutations) => {
              for (const _ of mutations) {
                if (signal == null ? void 0 : signal.aborted) {
                  observer.disconnect();
                  break;
                }
                const detectResult2 = await detectElement({
                  selector,
                  target,
                  detector,
                  customMatcher
                });
                if (detectResult2.isDetected) {
                  observer.disconnect();
                  resolve(detectResult2.result);
                  break;
                }
              }
            }
          );
          signal == null ? void 0 : signal.addEventListener(
            "abort",
            () => {
              observer.disconnect();
              return reject(signal.reason);
            },
            { once: true }
          );
          const detectResult = await detectElement({
            selector,
            target,
            detector,
            customMatcher
          });
          if (detectResult.isDetected) {
            return resolve(detectResult.result);
          }
          observer.observe(target, observeConfigs);
        }
      ).finally(() => {
        unifyCache.delete(unifyPromiseKey);
      });
      unifyCache.set(unifyPromiseKey, detectPromise);
      return detectPromise;
    };
  }
  async function detectElement({
    target,
    selector,
    detector,
    customMatcher
  }) {
    const element = customMatcher ? customMatcher(selector) : target.querySelector(selector);
    return await detector(element);
  }
  const waitElement = createWaitElement({
    defaultOptions: getDefaultOptions()
  });
  function createIframeUi(ctx, options) {
    const wrapper = document.createElement("div");
    wrapper.setAttribute("data-wxt-iframe", "");
    const iframe = document.createElement("iframe");
    iframe.src = browser.runtime.getURL(options.page);
    wrapper.appendChild(iframe);
    let mounted = void 0;
    const mount = () => {
      var _a;
      applyPosition(wrapper, iframe, options);
      mountUi(wrapper, options);
      mounted = (_a = options.onMount) == null ? void 0 : _a.call(options, wrapper, iframe);
    };
    const remove = () => {
      var _a;
      (_a = options.onRemove) == null ? void 0 : _a.call(options, mounted);
      wrapper.remove();
      mounted = void 0;
    };
    const mountFunctions = createMountFunctions(
      {
        mount,
        remove
      },
      options
    );
    ctx.onInvalidated(remove);
    return {
      get mounted() {
        return mounted;
      },
      iframe,
      wrapper,
      ...mountFunctions
    };
  }
  function applyPosition(root, positionedElement, options) {
    var _a, _b;
    if (options.position === "inline") return;
    if (options.zIndex != null) root.style.zIndex = String(options.zIndex);
    root.style.overflow = "visible";
    root.style.position = "relative";
    root.style.width = "0";
    root.style.height = "0";
    root.style.display = "block";
    if (positionedElement) {
      if (options.position === "overlay") {
        positionedElement.style.position = "absolute";
        if ((_a = options.alignment) == null ? void 0 : _a.startsWith("bottom-"))
          positionedElement.style.bottom = "0";
        else positionedElement.style.top = "0";
        if ((_b = options.alignment) == null ? void 0 : _b.endsWith("-right"))
          positionedElement.style.right = "0";
        else positionedElement.style.left = "0";
      } else {
        positionedElement.style.position = "fixed";
        positionedElement.style.top = "0";
        positionedElement.style.bottom = "0";
        positionedElement.style.left = "0";
        positionedElement.style.right = "0";
      }
    }
  }
  function getAnchor(options) {
    if (options.anchor == null) return document.body;
    let resolved = typeof options.anchor === "function" ? options.anchor() : options.anchor;
    if (typeof resolved === "string") {
      if (resolved.startsWith("/")) {
        const result2 = document.evaluate(
          resolved,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        );
        return result2.singleNodeValue ?? void 0;
      } else {
        return document.querySelector(resolved) ?? void 0;
      }
    }
    return resolved ?? void 0;
  }
  function mountUi(root, options) {
    var _a, _b;
    const anchor = getAnchor(options);
    if (anchor == null)
      throw Error(
        "Failed to mount content script UI: could not find anchor element"
      );
    switch (options.append) {
      case void 0:
      case "last":
        anchor.append(root);
        break;
      case "first":
        anchor.prepend(root);
        break;
      case "replace":
        anchor.replaceWith(root);
        break;
      case "after":
        (_a = anchor.parentElement) == null ? void 0 : _a.insertBefore(root, anchor.nextElementSibling);
        break;
      case "before":
        (_b = anchor.parentElement) == null ? void 0 : _b.insertBefore(root, anchor);
        break;
      default:
        options.append(anchor, root);
        break;
    }
  }
  function createMountFunctions(baseFunctions, options) {
    let autoMountInstance = void 0;
    const stopAutoMount = () => {
      autoMountInstance == null ? void 0 : autoMountInstance.stopAutoMount();
      autoMountInstance = void 0;
    };
    const mount = () => {
      baseFunctions.mount();
    };
    const unmount = baseFunctions.remove;
    const remove = () => {
      stopAutoMount();
      baseFunctions.remove();
    };
    const autoMount = (autoMountOptions) => {
      if (autoMountInstance) {
        logger$1.warn("autoMount is already set.");
      }
      autoMountInstance = autoMountUi(
        { mount, unmount, stopAutoMount },
        {
          ...options,
          ...autoMountOptions
        }
      );
    };
    return {
      mount,
      remove,
      autoMount
    };
  }
  function autoMountUi(uiCallbacks, options) {
    const abortController = new AbortController();
    const EXPLICIT_STOP_REASON = "explicit_stop_auto_mount";
    const _stopAutoMount = () => {
      var _a;
      abortController.abort(EXPLICIT_STOP_REASON);
      (_a = options.onStop) == null ? void 0 : _a.call(options);
    };
    let resolvedAnchor = typeof options.anchor === "function" ? options.anchor() : options.anchor;
    if (resolvedAnchor instanceof Element) {
      throw Error(
        "autoMount and Element anchor option cannot be combined. Avoid passing `Element` directly or `() => Element` to the anchor."
      );
    }
    async function observeElement(selector) {
      let isAnchorExist = !!getAnchor(options);
      if (isAnchorExist) {
        uiCallbacks.mount();
      }
      while (!abortController.signal.aborted) {
        try {
          const changedAnchor = await waitElement(selector ?? "body", {
            customMatcher: () => getAnchor(options) ?? null,
            detector: isAnchorExist ? isNotExist : isExist,
            signal: abortController.signal
          });
          isAnchorExist = !!changedAnchor;
          if (isAnchorExist) {
            uiCallbacks.mount();
          } else {
            uiCallbacks.unmount();
            if (options.once) {
              uiCallbacks.stopAutoMount();
            }
          }
        } catch (error) {
          if (abortController.signal.aborted && abortController.signal.reason === EXPLICIT_STOP_REASON) {
            break;
          } else {
            throw error;
          }
        }
      }
    }
    observeElement(resolvedAnchor);
    return { stopAutoMount: _stopAutoMount };
  }
  class SidebarManager {
    constructor(ctx) {
      __publicField(this, "ui", null);
      __publicField(this, "isVisible", false);
      __publicField(this, "isPinned", false);
      __publicField(this, "ctx");
      this.ctx = ctx;
      this.setupEventListeners();
    }
    setupEventListeners() {
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && this.isVisible) {
          this.hide();
        }
      });
      window.addEventListener("message", (event) => {
        if (event.data.type === "START_SMART_CAPTURE") {
          this.handleSmartCapture();
        } else if (event.data.type === "CLOSE_SIDEBAR") {
          this.hide();
        } else if (event.data.type === "TOGGLE_PIN_MODE") {
          this.togglePinMode();
        } else if (event.data.type === "GET_CURRENT_URL") {
          this.handleGetCurrentUrl();
        } else if (event.data.type === "GET_PAGE_CONTENT") {
          this.handleGetPageContent();
        } else if (event.data.type === "GET_PAGE_INFO") {
          this.handleGetPageInfo();
        }
      });
    }
    async handleSmartCapture() {
      try {
        this.hide();
        await new Promise((resolve) => setTimeout(resolve, 350));
        const response = await chrome.runtime.sendMessage({
          action: "START_CAPTURE"
        });
        if (response && response.dataUrl) {
          this.updateWithCapture(response.dataUrl);
        }
      } catch (error) {
        console.error("Smart capture failed:", error);
        this.show();
      }
    }
    create() {
      if (this.ui) return;
      this.ui = createIframeUi(this.ctx, {
        page: "/sidebar.html",
        position: "overlay",
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
        }
      });
    }
    updateWrapperStyles(wrapper) {
      if (this.isPinned) {
        wrapper.style.cssText = `
        position: fixed;
        top: 0;
        right: 0;
        width: 460px;
        height: 100vh;
        z-index: 2147483647;
        transition: all 0.3s ease-in-out;
      `;
        document.body.style.marginRight = "460px";
        document.body.style.transition = "margin-right 0.3s ease-in-out";
      } else {
        wrapper.style.cssText = `
        position: fixed;
        top: 0;
        right: ${this.isVisible ? "0px" : "-460px"};
        width: 460px;
        height: 100vh;
        z-index: 2147483647;
        transition: right 0.3s ease-in-out;
      `;
        document.body.style.marginRight = "0";
      }
    }
    show() {
      if (!this.ui) {
        this.create();
      }
      if (this.ui) {
        this.ui.mount();
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
          this.ui.wrapper.style.right = "-460px";
          document.body.style.marginRight = "0";
        } else {
          this.ui.wrapper.style.right = "-460px";
        }
        this.isVisible = false;
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
    updateWithCapture(dataUrl) {
      var _a;
      if (this.ui && this.ui.iframe) {
        (_a = this.ui.iframe.contentWindow) == null ? void 0 : _a.postMessage({
          type: "CAPTURE_DATA",
          data: dataUrl
        }, "*");
      }
      if (!this.isVisible) {
        this.show();
      }
    }
    togglePinMode() {
      var _a;
      this.isPinned = !this.isPinned;
      if (this.isVisible && this.ui && this.ui.wrapper) {
        this.updateWrapperStyles(this.ui.wrapper);
      }
      if (this.ui && this.ui.iframe) {
        (_a = this.ui.iframe.contentWindow) == null ? void 0 : _a.postMessage({
          type: "PIN_MODE_CHANGED",
          isPinned: this.isPinned
        }, "*");
      }
    }
    handleGetCurrentUrl() {
      var _a;
      if (this.ui && this.ui.iframe) {
        (_a = this.ui.iframe.contentWindow) == null ? void 0 : _a.postMessage({
          type: "CURRENT_URL_RESPONSE",
          url: window.location.href
        }, "*");
      }
    }
    handleGetPageContent() {
      var _a;
      const textElements = document.querySelectorAll(
        'p, h1, h2, h3, h4, h5, h6, span:not([class*="icon"]):not([class*="btn"]):not([class*="nav"]):not([class*="menu"]), div:not([class*="nav"]):not([class*="menu"]):not([class*="header"]):not([class*="footer"]):not([id*="sidebar"]):not([class*="sidebar"]), li, blockquote'
      );
      const textContents = [];
      textElements.forEach((element) => {
        var _a2;
        if (element.closest('[id*="sidebar"]') || element.closest('[class*="sidebar"]')) {
          return;
        }
        const text = (_a2 = element.textContent) == null ? void 0 : _a2.trim();
        if (text && text.length > 15 && text.length < 300 && !text.includes("©") && !text.includes("®") && !/^\d+$/.test(text) && !/^[\s\W]*$/.test(text) && !text.toLowerCase().includes("cookie") && !text.toLowerCase().includes("privacy") && !text.toLowerCase().includes("terms") && !text.toLowerCase().includes("policy")) {
          textContents.push(text);
        }
      });
      const uniqueTexts = [...new Set(textContents)].slice(0, 15);
      if (this.ui && this.ui.iframe) {
        (_a = this.ui.iframe.contentWindow) == null ? void 0 : _a.postMessage({
          type: "PAGE_CONTENT_RESPONSE",
          texts: uniqueTexts
        }, "*");
      }
    }
    handleGetPageInfo() {
      var _a;
      const title = document.title;
      let favicon = "";
      const iconLink = document.querySelector('link[rel="icon"]') || document.querySelector('link[rel="shortcut icon"]') || document.querySelector('link[rel="apple-touch-icon"]');
      if (iconLink && iconLink.href) {
        favicon = iconLink.href;
      } else {
        const url = new URL(window.location.href);
        favicon = `${url.protocol}//${url.host}/favicon.ico`;
      }
      if (this.ui && this.ui.iframe) {
        (_a = this.ui.iframe.contentWindow) == null ? void 0 : _a.postMessage({
          type: "PAGE_INFO_RESPONSE",
          title,
          favicon
        }, "*");
      }
    }
    get visible() {
      return this.isVisible;
    }
    get pinned() {
      return this.isPinned;
    }
  }
  content;
  function showSuccessMessage() {
    const successMsg = document.createElement("div");
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
    const style = document.createElement("style");
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
    setTimeout(() => {
      if (successMsg.parentNode) {
        successMsg.remove();
      }
      if (style.parentNode) {
        style.remove();
      }
    }, 3e3);
  }
  content;
  class MessageHandler {
    constructor(screenCapture, sidebarManager) {
      __publicField(this, "screenCapture");
      __publicField(this, "sidebarManager");
      this.screenCapture = screenCapture;
      this.sidebarManager = sidebarManager;
      this.setupMessageListeners();
    }
    setupMessageListeners() {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === "startCapture") {
          this.screenCapture.start();
          sendResponse({ success: true });
        } else if (message.action === "captureComplete") {
          showSuccessMessage();
          this.sidebarManager.updateWithCapture(message.dataUrl);
          sendResponse({ success: true });
        } else if (message.action === "toggleSidebar") {
          this.sidebarManager.toggle();
          sendResponse({ success: true });
        } else if (message.action === "getPageContent") {
          const pageContent = this.getPageContent();
          sendResponse({ success: true, content: pageContent });
        }
        return true;
      });
      window.addEventListener("message", (event) => {
        if (event.data.type === "START_SMART_CAPTURE") {
          this.screenCapture.start();
        } else if (event.data.type === "CLOSE_SIDEBAR") {
          this.sidebarManager.hide();
        }
      });
      document.addEventListener("contextmenu", (e) => {
        const selection = window.getSelection();
        if (selection && selection.toString().trim()) {
          const selectedText = selection.toString().trim();
          if (/^[a-zA-Z]+$/.test(selectedText)) {
            chrome.runtime.sendMessage({
              action: "lookupWord",
              word: selectedText
            });
          }
        }
      });
    }
    getPageContent() {
      const title = document.title;
      const content2 = this.extractMainContent();
      const url = window.location.href;
      return `页面标题: ${title}
页面URL: ${url}

页面内容:
${content2}`;
    }
    extractMainContent() {
      const elementsToRemove = document.querySelectorAll("script, style, nav, header, footer, aside, .sidebar, .menu, .navigation");
      const clonedDoc = document.cloneNode(true);
      elementsToRemove.forEach((el) => {
        const clonedEl = clonedDoc.querySelector(el.tagName.toLowerCase());
        if (clonedEl) {
          clonedEl.remove();
        }
      });
      const mainSelectors = [
        "main",
        "article",
        ".content",
        ".main-content",
        ".post-content",
        ".entry-content",
        "#content",
        "#main"
      ];
      let mainContent = "";
      for (const selector of mainSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          mainContent = this.getTextContent(element);
          if (mainContent.length > 100) {
            break;
          }
        }
      }
      if (!mainContent || mainContent.length < 100) {
        mainContent = this.getTextContent(document.body);
      }
      return mainContent.length > 3e3 ? mainContent.substring(0, 3e3) + "..." : mainContent;
    }
    getTextContent(element) {
      var _a;
      let text = "";
      for (const node of element.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          const textContent = (_a = node.textContent) == null ? void 0 : _a.trim();
          if (textContent) {
            text += textContent + " ";
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node;
          if (["SCRIPT", "STYLE", "NAV", "HEADER", "FOOTER", "ASIDE"].includes(el.tagName)) {
            continue;
          }
          const childText = this.getTextContent(el);
          if (childText.trim()) {
            text += childText + " ";
          }
          if (["DIV", "P", "H1", "H2", "H3", "H4", "H5", "H6", "LI"].includes(el.tagName)) {
            text += "\n";
          }
        }
      }
      return text.replace(/\s+/g, " ").replace(/\n\s*\n/g, "\n").trim();
    }
  }
  content;
  const definition = defineContentScript({
    matches: ["<all_urls>"],
    main(ctx) {
      console.log("CapMind content script loaded");
      const screenCapture = new ScreenCapture();
      const sidebarManager = new SidebarManager(ctx);
      new MessageHandler(screenCapture, sidebarManager);
      console.log("CapMind modules initialized successfully");
    }
  });
  content;
  function initPlugins() {
  }
  function print(method, ...args) {
    if (typeof args[0] === "string") {
      const message = args.shift();
      method(`[wxt] ${message}`, ...args);
    } else {
      method("[wxt]", ...args);
    }
  }
  const logger = {
    debug: (...args) => print(console.debug, ...args),
    log: (...args) => print(console.log, ...args),
    warn: (...args) => print(console.warn, ...args),
    error: (...args) => print(console.error, ...args)
  };
  const result = (async () => {
    try {
      initPlugins();
      const { main, ...options } = definition;
      const ctx = new ContentScriptContext("content", options);
      return await main(ctx);
    } catch (err) {
      logger.error(
        `The content script "${"content"}" crashed on startup!`,
        err
      );
      throw err;
    }
  })();
  return result;
}();
content;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3d4dEAwLjE5LjI5X0B0eXBlcytub2RlQDIwLjE5LjFfbGlnaHRuaW5nY3NzQDEuMzAuMV9yb2xsdXBANC40NC4xL25vZGVfbW9kdWxlcy93eHQvZGlzdC9zYW5kYm94L2RlZmluZS1jb250ZW50LXNjcmlwdC5tanMiLCIuLi8uLi8uLi9lbnRyeXBvaW50cy9jb250ZW50L2NhcHR1cmUudHMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvLnBucG0vd2ViZXh0ZW5zaW9uLXBvbHlmaWxsQDAuMTIuMC9ub2RlX21vZHVsZXMvd2ViZXh0ZW5zaW9uLXBvbHlmaWxsL2Rpc3QvYnJvd3Nlci1wb2x5ZmlsbC5qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS93eHRAMC4xOS4yOV9AdHlwZXMrbm9kZUAyMC4xOS4xX2xpZ2h0bmluZ2Nzc0AxLjMwLjFfcm9sbHVwQDQuNDQuMS9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvYnJvd3Nlci9pbmRleC5tanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvLnBucG0vd3h0QDAuMTkuMjlfQHR5cGVzK25vZGVAMjAuMTkuMV9saWdodG5pbmdjc3NAMS4zMC4xX3JvbGx1cEA0LjQ0LjEvbm9kZV9tb2R1bGVzL3d4dC9kaXN0L3NhbmRib3gvdXRpbHMvbG9nZ2VyLm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS93eHRAMC4xOS4yOV9AdHlwZXMrbm9kZUAyMC4xOS4xX2xpZ2h0bmluZ2Nzc0AxLjMwLjFfcm9sbHVwQDQuNDQuMS9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvY2xpZW50L2NvbnRlbnQtc2NyaXB0cy9jdXN0b20tZXZlbnRzLm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS93eHRAMC4xOS4yOV9AdHlwZXMrbm9kZUAyMC4xOS4xX2xpZ2h0bmluZ2Nzc0AxLjMwLjFfcm9sbHVwQDQuNDQuMS9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvY2xpZW50L2NvbnRlbnQtc2NyaXB0cy9sb2NhdGlvbi13YXRjaGVyLm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS93eHRAMC4xOS4yOV9AdHlwZXMrbm9kZUAyMC4xOS4xX2xpZ2h0bmluZ2Nzc0AxLjMwLjFfcm9sbHVwQDQuNDQuMS9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvY2xpZW50L2NvbnRlbnQtc2NyaXB0cy9jb250ZW50LXNjcmlwdC1jb250ZXh0Lm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS9tYW55LWtleXMtbWFwQDIuMC4xL25vZGVfbW9kdWxlcy9tYW55LWtleXMtbWFwL2luZGV4LmpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL2RlZnVANi4xLjQvbm9kZV9tb2R1bGVzL2RlZnUvZGlzdC9kZWZ1Lm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS9AMW5hdHN1K3dhaXQtZWxlbWVudEA0LjEuMi9ub2RlX21vZHVsZXMvQDFuYXRzdS93YWl0LWVsZW1lbnQvZGlzdC9kZXRlY3RvcnMubWpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL0AxbmF0c3Urd2FpdC1lbGVtZW50QDQuMS4yL25vZGVfbW9kdWxlcy9AMW5hdHN1L3dhaXQtZWxlbWVudC9kaXN0L2luZGV4Lm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS93eHRAMC4xOS4yOV9AdHlwZXMrbm9kZUAyMC4xOS4xX2xpZ2h0bmluZ2Nzc0AxLjMwLjFfcm9sbHVwQDQuNDQuMS9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvY2xpZW50L2NvbnRlbnQtc2NyaXB0cy91aS9pbmRleC5tanMiLCIuLi8uLi8uLi9lbnRyeXBvaW50cy9jb250ZW50L3NpZGViYXIudHMiLCIuLi8uLi8uLi9lbnRyeXBvaW50cy9jb250ZW50L3VpLXV0aWxzLnRzIiwiLi4vLi4vLi4vZW50cnlwb2ludHMvY29udGVudC9tZXNzYWdlLWhhbmRsZXIudHMiLCIuLi8uLi8uLi9lbnRyeXBvaW50cy9jb250ZW50L2luZGV4LnRzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBmdW5jdGlvbiBkZWZpbmVDb250ZW50U2NyaXB0KGRlZmluaXRpb24pIHtcbiAgcmV0dXJuIGRlZmluaXRpb247XG59XG4iLCIvLyDmiKrlm77pgInmi6nlip/og73mqKHlnZdcblxuZXhwb3J0IGludGVyZmFjZSBDYXB0dXJlQXJlYSB7XG4gIGxlZnQ6IG51bWJlcjtcbiAgdG9wOiBudW1iZXI7XG4gIHdpZHRoOiBudW1iZXI7XG4gIGhlaWdodDogbnVtYmVyO1xuICBkZXZpY2VQaXhlbFJhdGlvPzogbnVtYmVyO1xufVxuXG5leHBvcnQgY2xhc3MgU2NyZWVuQ2FwdHVyZSB7XG4gIHByaXZhdGUgaXNTZWxlY3RpbmcgPSBmYWxzZTtcbiAgcHJpdmF0ZSBzZWxlY3Rpb25PdmVybGF5OiBIVE1MRGl2RWxlbWVudCB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGhpZ2hsaWdodGVkRWxlbWVudDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBvcmlnaW5hbE91dGxpbmUgPSAnJztcbiAgcHJpdmF0ZSBvcmlnaW5hbEJveFNoYWRvdyA9ICcnO1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuaGFuZGxlTW91c2VNb3ZlID0gdGhpcy5oYW5kbGVNb3VzZU1vdmUuYmluZCh0aGlzKTtcbiAgICB0aGlzLmhhbmRsZUNsaWNrID0gdGhpcy5oYW5kbGVDbGljay5iaW5kKHRoaXMpO1xuICAgIHRoaXMuaGFuZGxlS2V5RG93biA9IHRoaXMuaGFuZGxlS2V5RG93bi5iaW5kKHRoaXMpO1xuICB9XG5cbiAgc3RhcnQoKSB7XG4gICAgaWYgKHRoaXMuaXNTZWxlY3RpbmcpIHJldHVybjtcbiAgICBcbiAgICB0aGlzLmlzU2VsZWN0aW5nID0gdHJ1ZTtcbiAgICBkb2N1bWVudC5ib2R5LnN0eWxlLmN1cnNvciA9ICdwb2ludGVyJztcbiAgICBcbiAgICAvLyDliJvlu7rpga7nvanlsYJcbiAgICB0aGlzLmNyZWF0ZU92ZXJsYXkoKTtcbiAgICBcbiAgICAvLyDmt7vliqDkuovku7bnm5HlkKzlmahcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCB0aGlzLmhhbmRsZU1vdXNlTW92ZSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLmhhbmRsZUNsaWNrKTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgdGhpcy5oYW5kbGVLZXlEb3duKTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlT3ZlcmxheSgpIHtcbiAgICB0aGlzLnNlbGVjdGlvbk92ZXJsYXkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICB0aGlzLnNlbGVjdGlvbk92ZXJsYXkuc3R5bGUuY3NzVGV4dCA9IGBcbiAgICAgIHBvc2l0aW9uOiBmaXhlZDtcbiAgICAgIHRvcDogMDtcbiAgICAgIGxlZnQ6IDA7XG4gICAgICB3aWR0aDogMTAwJTtcbiAgICAgIGhlaWdodDogMTAwJTtcbiAgICAgIGJhY2tncm91bmQ6IHJnYmEoMCwgMCwgMCwgMC4zKTtcbiAgICAgIHotaW5kZXg6IDk5OTk5OTtcbiAgICAgIHBvaW50ZXItZXZlbnRzOiBub25lO1xuICAgICAgYmFja2Ryb3AtZmlsdGVyOiBibHVyKDFweCk7XG4gICAgYDtcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHRoaXMuc2VsZWN0aW9uT3ZlcmxheSk7XG5cbiAgICAvLyDliJvlu7rmj5DnpLrkv6Hmga9cbiAgICBjb25zdCB0b29sdGlwID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgdG9vbHRpcC5pZCA9ICdjYXBtaW5kLXRvb2x0aXAnO1xuICAgIHRvb2x0aXAuc3R5bGUuY3NzVGV4dCA9IGBcbiAgICAgIHBvc2l0aW9uOiBmaXhlZDtcbiAgICAgIHRvcDogMjBweDtcbiAgICAgIGxlZnQ6IDUwJTtcbiAgICAgIHRyYW5zZm9ybTogdHJhbnNsYXRlWCgtNTAlKTtcbiAgICAgIGJhY2tncm91bmQ6IGxpbmVhci1ncmFkaWVudCgxMzVkZWcsICM2NjdlZWEgMCUsICM3NjRiYTIgMTAwJSk7XG4gICAgICBjb2xvcjogd2hpdGU7XG4gICAgICBwYWRkaW5nOiAxMnB4IDIwcHg7XG4gICAgICBib3JkZXItcmFkaXVzOiA4cHg7XG4gICAgICBmb250LXNpemU6IDE0cHg7XG4gICAgICB6LWluZGV4OiAxMDAwMDAxO1xuICAgICAgcG9pbnRlci1ldmVudHM6IG5vbmU7XG4gICAgICBmb250LWZhbWlseTogLWFwcGxlLXN5c3RlbSwgQmxpbmtNYWNTeXN0ZW1Gb250LCAnU2Vnb2UgVUknLCBSb2JvdG8sIHNhbnMtc2VyaWY7XG4gICAgICBib3gtc2hhZG93OiAwIDRweCAyMHB4IHJnYmEoMCwgMCwgMCwgMC4zKTtcbiAgICAgIGJvcmRlcjogMXB4IHNvbGlkIHJnYmEoMjU1LCAyNTUsIDI1NSwgMC4yKTtcbiAgICBgO1xuICAgIHRvb2x0aXAuaW5uZXJIVE1MID0gJ/Cfjq8g56e75Yqo6byg5qCH6YCJ5oup5YWD57Sg77yM54K55Ye756Gu5a6a5oiq5Zu+77yM5oyJIDxrYmQgc3R5bGU9XCJiYWNrZ3JvdW5kOiByZ2JhKDI1NSwyNTUsMjU1LDAuMik7IHBhZGRpbmc6IDJweCA2cHg7IGJvcmRlci1yYWRpdXM6IDRweDsgZm9udC1zaXplOiAxMnB4O1wiPkVTQzwva2JkPiDlj5bmtognO1xuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodG9vbHRpcCk7XG4gIH1cblxuICBwcml2YXRlIGhhbmRsZU1vdXNlTW92ZShlOiBNb3VzZUV2ZW50KSB7XG4gICAgaWYgKCF0aGlzLmlzU2VsZWN0aW5nKSByZXR1cm47XG4gICAgXG4gICAgLy8g5Li05pe26ZqQ6JeP6YGu572p5bGC5Lul6I635Y+W55yf5a6e55qE5YWD57SgXG4gICAgaWYgKHRoaXMuc2VsZWN0aW9uT3ZlcmxheSkge1xuICAgICAgdGhpcy5zZWxlY3Rpb25PdmVybGF5LnN0eWxlLnBvaW50ZXJFdmVudHMgPSAnbm9uZSc7XG4gICAgfVxuICAgIFxuICAgIC8vIOiOt+WPlum8oOagh+S4i+eahOWFg+e0oFxuICAgIGxldCBlbGVtZW50VW5kZXJNb3VzZSA9IGRvY3VtZW50LmVsZW1lbnRGcm9tUG9pbnQoZS5jbGllbnRYLCBlLmNsaWVudFkpIGFzIEhUTUxFbGVtZW50O1xuICAgIFxuICAgIC8vIOaBouWkjemBrue9qeWxglxuICAgIGlmICh0aGlzLnNlbGVjdGlvbk92ZXJsYXkpIHtcbiAgICAgIHRoaXMuc2VsZWN0aW9uT3ZlcmxheS5zdHlsZS5wb2ludGVyRXZlbnRzID0gJ25vbmUnO1xuICAgIH1cbiAgICBcbiAgICAvLyDov4fmu6TmjonkuI3lkIjpgILnmoTlhYPntKBcbiAgICBpZiAoIWVsZW1lbnRVbmRlck1vdXNlIHx8IFxuICAgICAgICBlbGVtZW50VW5kZXJNb3VzZSA9PT0gZG9jdW1lbnQuYm9keSB8fCBcbiAgICAgICAgZWxlbWVudFVuZGVyTW91c2UgPT09IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCB8fFxuICAgICAgICBlbGVtZW50VW5kZXJNb3VzZS5pZCA9PT0gJ2NhcG1pbmQtdG9vbHRpcCcgfHxcbiAgICAgICAgZWxlbWVudFVuZGVyTW91c2UgPT09IHRoaXMuc2VsZWN0aW9uT3ZlcmxheSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBcbiAgICAvLyDlr7vmib7mm7TlkIjpgILnmoTniLblhYPntKDvvIjlpoLmnpzlvZPliY3lhYPntKDlpKrlsI/miJbmmK/mlofmnKzoioLngrnvvIlcbiAgICBlbGVtZW50VW5kZXJNb3VzZSA9IHRoaXMuZmluZEJlc3RFbGVtZW50KGVsZW1lbnRVbmRlck1vdXNlKTtcbiAgICBcbiAgICAvLyDlpoLmnpzmmK/mlrDlhYPntKDvvIzmm7TmlrDpq5jkuq5cbiAgICBpZiAoZWxlbWVudFVuZGVyTW91c2UgIT09IHRoaXMuaGlnaGxpZ2h0ZWRFbGVtZW50KSB7XG4gICAgICAvLyDmgaLlpI3kuYvliY3lhYPntKDnmoTmoLflvI9cbiAgICAgIGlmICh0aGlzLmhpZ2hsaWdodGVkRWxlbWVudCkge1xuICAgICAgICB0aGlzLmhpZ2hsaWdodGVkRWxlbWVudC5zdHlsZS5vdXRsaW5lID0gdGhpcy5vcmlnaW5hbE91dGxpbmU7XG4gICAgICAgIHRoaXMuaGlnaGxpZ2h0ZWRFbGVtZW50LnN0eWxlLmJveFNoYWRvdyA9IHRoaXMub3JpZ2luYWxCb3hTaGFkb3c7XG4gICAgICAgIHRoaXMuaGlnaGxpZ2h0ZWRFbGVtZW50LnN0eWxlLnBvc2l0aW9uID0gJyc7XG4gICAgICAgIHRoaXMuaGlnaGxpZ2h0ZWRFbGVtZW50LnN0eWxlLnpJbmRleCA9ICcnO1xuICAgICAgICBcbiAgICAgICAgLy8g56e76Zmk6auY5Lqu6KaG55uW5bGCXG4gICAgICAgIGNvbnN0IGV4aXN0aW5nT3ZlcmxheSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjYXBtaW5kLWhpZ2hsaWdodC1vdmVybGF5Jyk7XG4gICAgICAgIGlmIChleGlzdGluZ092ZXJsYXkpIHtcbiAgICAgICAgICBleGlzdGluZ092ZXJsYXkucmVtb3ZlKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8g6auY5Lqu5paw5YWD57SgXG4gICAgICB0aGlzLmhpZ2hsaWdodGVkRWxlbWVudCA9IGVsZW1lbnRVbmRlck1vdXNlO1xuICAgICAgdGhpcy5vcmlnaW5hbE91dGxpbmUgPSB0aGlzLmhpZ2hsaWdodGVkRWxlbWVudC5zdHlsZS5vdXRsaW5lO1xuICAgICAgdGhpcy5vcmlnaW5hbEJveFNoYWRvdyA9IHRoaXMuaGlnaGxpZ2h0ZWRFbGVtZW50LnN0eWxlLmJveFNoYWRvdztcbiAgICAgIFxuICAgICAgLy8g5Yib5bu65pu05piO5pi+55qE6auY5Lqu5pWI5p6cXG4gICAgICB0aGlzLmhpZ2hsaWdodGVkRWxlbWVudC5zdHlsZS5vdXRsaW5lID0gJzNweCBzb2xpZCAjMDBmZjg4JztcbiAgICAgIHRoaXMuaGlnaGxpZ2h0ZWRFbGVtZW50LnN0eWxlLmJveFNoYWRvdyA9ICcwIDAgMCAxcHggIzAwZmY4OCwgMCAwIDIwcHggcmdiYSgwLCAyNTUsIDEzNiwgMC40KSwgaW5zZXQgMCAwIDAgMnB4IHJnYmEoMCwgMjU1LCAxMzYsIDAuMSknO1xuICAgICAgdGhpcy5oaWdobGlnaHRlZEVsZW1lbnQuc3R5bGUucG9zaXRpb24gPSAncmVsYXRpdmUnO1xuICAgICAgdGhpcy5oaWdobGlnaHRlZEVsZW1lbnQuc3R5bGUuekluZGV4ID0gJzEwMDAwMDAnO1xuICAgICAgXG4gICAgICAvLyDmt7vliqDkuIDkuKrljYrpgI/mmI7nmoTopobnm5blsYLmnaXnqoHlh7rmmL7npLrpgInkuK3ljLrln59cbiAgICAgIGNvbnN0IGhpZ2hsaWdodE92ZXJsYXkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIGhpZ2hsaWdodE92ZXJsYXkuaWQgPSAnY2FwbWluZC1oaWdobGlnaHQtb3ZlcmxheSc7XG4gICAgICBjb25zdCByZWN0ID0gdGhpcy5oaWdobGlnaHRlZEVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICBoaWdobGlnaHRPdmVybGF5LnN0eWxlLmNzc1RleHQgPSBgXG4gICAgICAgIHBvc2l0aW9uOiBmaXhlZDtcbiAgICAgICAgdG9wOiAke3JlY3QudG9wfXB4O1xuICAgICAgICBsZWZ0OiAke3JlY3QubGVmdH1weDtcbiAgICAgICAgd2lkdGg6ICR7cmVjdC53aWR0aH1weDtcbiAgICAgICAgaGVpZ2h0OiAke3JlY3QuaGVpZ2h0fXB4O1xuICAgICAgICBiYWNrZ3JvdW5kOiByZ2JhKDAsIDI1NSwgMTM2LCAwLjEpO1xuICAgICAgICBib3JkZXI6IDJweCBzb2xpZCAjMDBmZjg4O1xuICAgICAgICB6LWluZGV4OiAxMDAwMDAwO1xuICAgICAgICBwb2ludGVyLWV2ZW50czogbm9uZTtcbiAgICAgICAgYm9yZGVyLXJhZGl1czogNHB4O1xuICAgICAgICBib3gtc2hhZG93OiAwIDAgMzBweCByZ2JhKDAsIDI1NSwgMTM2LCAwLjMpO1xuICAgICAgYDtcbiAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoaGlnaGxpZ2h0T3ZlcmxheSk7XG4gICAgfVxuICB9XG4gIFxuICBwcml2YXRlIGZpbmRCZXN0RWxlbWVudChlbGVtZW50OiBIVE1MRWxlbWVudCk6IEhUTUxFbGVtZW50IHtcbiAgICAvLyDlpoLmnpzlhYPntKDlpKrlsI/vvIzlsJ3or5Xmib7liLDmm7TlkIjpgILnmoTniLblhYPntKBcbiAgICBjb25zdCByZWN0ID0gZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICBpZiAocmVjdC53aWR0aCA8IDIwIHx8IHJlY3QuaGVpZ2h0IDwgMjApIHtcbiAgICAgIGNvbnN0IHBhcmVudCA9IGVsZW1lbnQucGFyZW50RWxlbWVudDtcbiAgICAgIGlmIChwYXJlbnQgJiYgcGFyZW50ICE9PSBkb2N1bWVudC5ib2R5ICYmIHBhcmVudCAhPT0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50KSB7XG4gICAgICAgIHJldHVybiB0aGlzLmZpbmRCZXN0RWxlbWVudChwYXJlbnQpO1xuICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvLyDkvJjlhYjpgInmi6nmnInmhI/kuYnnmoTlrrnlmajlhYPntKBcbiAgICBjb25zdCBtZWFuaW5nZnVsVGFncyA9IFsnRElWJywgJ1NFQ1RJT04nLCAnQVJUSUNMRScsICdIRUFERVInLCAnRk9PVEVSJywgJ05BVicsICdNQUlOJywgJ0FTSURFJywgJ0lNRycsICdWSURFTycsICdDQU5WQVMnXTtcbiAgICBpZiAoIW1lYW5pbmdmdWxUYWdzLmluY2x1ZGVzKGVsZW1lbnQudGFnTmFtZSkpIHtcbiAgICAgIGNvbnN0IHBhcmVudCA9IGVsZW1lbnQucGFyZW50RWxlbWVudDtcbiAgICAgIGlmIChwYXJlbnQgJiYgbWVhbmluZ2Z1bFRhZ3MuaW5jbHVkZXMocGFyZW50LnRhZ05hbWUpKSB7XG4gICAgICAgIHJldHVybiBwYXJlbnQ7XG4gICAgICB9XG4gICAgfVxuICAgIFxuICAgIHJldHVybiBlbGVtZW50O1xuICB9XG5cbiAgcHJpdmF0ZSBoYW5kbGVDbGljayhlOiBNb3VzZUV2ZW50KSB7XG4gICAgaWYgKCF0aGlzLmlzU2VsZWN0aW5nIHx8ICF0aGlzLmhpZ2hsaWdodGVkRWxlbWVudCkgcmV0dXJuO1xuICAgIFxuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIFxuICAgIC8vIOiOt+WPluWFg+e0oOeahOS9jee9ruWSjOWwuuWvuO+8iOebuOWvueS6juinhuWPo++8iVxuICAgIGNvbnN0IHJlY3QgPSB0aGlzLmhpZ2hsaWdodGVkRWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICBcbiAgICAvLyDnoa7kv53miKrlm77ljLrln5/lnKjlj6/op4HojIPlm7TlhoVcbiAgICBjb25zdCB2aWV3cG9ydFdpZHRoID0gd2luZG93LmlubmVyV2lkdGg7XG4gICAgY29uc3Qgdmlld3BvcnRIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gICAgXG4gICAgLy8g6K6h566X5a6e6ZmF55qE5oiq5Zu+5Yy65Z+f77yI6ZmQ5Yi25Zyo6KeG5Y+j5YaF77yJXG4gICAgY29uc3QgbGVmdCA9IE1hdGgubWF4KDAsIHJlY3QubGVmdCk7XG4gICAgY29uc3QgdG9wID0gTWF0aC5tYXgoMCwgcmVjdC50b3ApO1xuICAgIGNvbnN0IHJpZ2h0ID0gTWF0aC5taW4odmlld3BvcnRXaWR0aCwgcmVjdC5yaWdodCk7XG4gICAgY29uc3QgYm90dG9tID0gTWF0aC5taW4odmlld3BvcnRIZWlnaHQsIHJlY3QuYm90dG9tKTtcbiAgICBcbiAgICBjb25zdCBhcmVhOiBDYXB0dXJlQXJlYSA9IHtcbiAgICAgIGxlZnQ6IGxlZnQsXG4gICAgICB0b3A6IHRvcCxcbiAgICAgIHdpZHRoOiByaWdodCAtIGxlZnQsXG4gICAgICBoZWlnaHQ6IGJvdHRvbSAtIHRvcFxuICAgIH07XG4gICAgXG4gICAgLy8g5qOA5p+l5oiq5Zu+5Yy65Z+f5piv5ZCm5pyJ5pWIXG4gICAgaWYgKGFyZWEud2lkdGggPD0gMCB8fCBhcmVhLmhlaWdodCA8PSAwKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ+mAieS4reeahOWFg+e0oOS4jeWcqOWPr+ingeWMuuWfn+WGhScpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBcbiAgICAvLyDmiafooYzmiKrlm75cbiAgICB0aGlzLmNhcHR1cmVTZWxlY3RlZEFyZWEoYXJlYSk7XG4gIH1cblxuICBwcml2YXRlIGhhbmRsZUtleURvd24oZTogS2V5Ym9hcmRFdmVudCkge1xuICAgIGlmIChlLmtleSA9PT0gJ0VzY2FwZScpIHtcbiAgICAgIHRoaXMuY2FuY2VsKCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBjYXB0dXJlU2VsZWN0ZWRBcmVhKGFyZWE6IENhcHR1cmVBcmVhKSB7XG4gICAgLy8g6I635Y+W6K6+5aSH5YOP57Sg5q+UXG4gICAgY29uc3QgZGV2aWNlUGl4ZWxSYXRpbyA9IHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvIHx8IDE7XG4gICAgXG4gICAgLy8g5Y+R6YCB5oiq5Zu+6K+35rGC5YiwYmFja2dyb3VuZCBzY3JpcHTvvIzljIXlkKvorr7lpIflg4/ntKDmr5Tkv6Hmga9cbiAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7XG4gICAgICBhY3Rpb246ICdjYXB0dXJlQXJlYScsXG4gICAgICBhcmVhOiB7XG4gICAgICAgIC4uLmFyZWEsXG4gICAgICAgIGRldmljZVBpeGVsUmF0aW9cbiAgICAgIH1cbiAgICB9KTtcbiAgICBcbiAgICB0aGlzLmNhbmNlbCgpO1xuICB9XG5cbiAgY2FuY2VsKCkge1xuICAgIHRoaXMuaXNTZWxlY3RpbmcgPSBmYWxzZTtcbiAgICBkb2N1bWVudC5ib2R5LnN0eWxlLmN1cnNvciA9ICcnO1xuICAgIFxuICAgIC8vIOaBouWkjemrmOS6ruWFg+e0oOeahOagt+W8j1xuICAgIGlmICh0aGlzLmhpZ2hsaWdodGVkRWxlbWVudCkge1xuICAgICAgdGhpcy5oaWdobGlnaHRlZEVsZW1lbnQuc3R5bGUub3V0bGluZSA9IHRoaXMub3JpZ2luYWxPdXRsaW5lO1xuICAgICAgdGhpcy5oaWdobGlnaHRlZEVsZW1lbnQuc3R5bGUuYm94U2hhZG93ID0gdGhpcy5vcmlnaW5hbEJveFNoYWRvdztcbiAgICAgIHRoaXMuaGlnaGxpZ2h0ZWRFbGVtZW50LnN0eWxlLnBvc2l0aW9uID0gJyc7XG4gICAgICB0aGlzLmhpZ2hsaWdodGVkRWxlbWVudC5zdHlsZS56SW5kZXggPSAnJztcbiAgICAgIHRoaXMuaGlnaGxpZ2h0ZWRFbGVtZW50ID0gbnVsbDtcbiAgICB9XG4gICAgXG4gICAgLy8g56e76Zmk6auY5Lqu6KaG55uW5bGCXG4gICAgY29uc3QgaGlnaGxpZ2h0T3ZlcmxheSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjYXBtaW5kLWhpZ2hsaWdodC1vdmVybGF5Jyk7XG4gICAgaWYgKGhpZ2hsaWdodE92ZXJsYXkpIHtcbiAgICAgIGhpZ2hsaWdodE92ZXJsYXkucmVtb3ZlKCk7XG4gICAgfVxuICAgIFxuICAgIC8vIOenu+mZpOS6i+S7tuebkeWQrOWZqFxuICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHRoaXMuaGFuZGxlTW91c2VNb3ZlKTtcbiAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuaGFuZGxlQ2xpY2spO1xuICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCB0aGlzLmhhbmRsZUtleURvd24pO1xuICAgIFxuICAgIC8vIOenu+mZpOmBrue9qeWxguWSjOaPkOekuuS/oeaBr1xuICAgIGlmICh0aGlzLnNlbGVjdGlvbk92ZXJsYXkpIHtcbiAgICAgIHRoaXMuc2VsZWN0aW9uT3ZlcmxheS5yZW1vdmUoKTtcbiAgICAgIHRoaXMuc2VsZWN0aW9uT3ZlcmxheSA9IG51bGw7XG4gICAgfVxuICAgIFxuICAgIGNvbnN0IHRvb2x0aXAgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FwbWluZC10b29sdGlwJyk7XG4gICAgaWYgKHRvb2x0aXApIHtcbiAgICAgIHRvb2x0aXAucmVtb3ZlKCk7XG4gICAgfVxuICB9XG59IiwiKGZ1bmN0aW9uIChnbG9iYWwsIGZhY3RvcnkpIHtcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09IFwiZnVuY3Rpb25cIiAmJiBkZWZpbmUuYW1kKSB7XG4gICAgZGVmaW5lKFwid2ViZXh0ZW5zaW9uLXBvbHlmaWxsXCIsIFtcIm1vZHVsZVwiXSwgZmFjdG9yeSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICBmYWN0b3J5KG1vZHVsZSk7XG4gIH0gZWxzZSB7XG4gICAgdmFyIG1vZCA9IHtcbiAgICAgIGV4cG9ydHM6IHt9XG4gICAgfTtcbiAgICBmYWN0b3J5KG1vZCk7XG4gICAgZ2xvYmFsLmJyb3dzZXIgPSBtb2QuZXhwb3J0cztcbiAgfVxufSkodHlwZW9mIGdsb2JhbFRoaXMgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxUaGlzIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdGhpcywgZnVuY3Rpb24gKG1vZHVsZSkge1xuICAvKiB3ZWJleHRlbnNpb24tcG9seWZpbGwgLSB2MC4xMi4wIC0gVHVlIE1heSAxNCAyMDI0IDE4OjAxOjI5ICovXG4gIC8qIC0qLSBNb2RlOiBpbmRlbnQtdGFicy1tb2RlOiBuaWw7IGpzLWluZGVudC1sZXZlbDogMiAtKi0gKi9cbiAgLyogdmltOiBzZXQgc3RzPTIgc3c9MiBldCB0dz04MDogKi9cbiAgLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICAgKiBMaWNlbnNlLCB2LiAyLjAuIElmIGEgY29weSBvZiB0aGUgTVBMIHdhcyBub3QgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzXG4gICAqIGZpbGUsIFlvdSBjYW4gb2J0YWluIG9uZSBhdCBodHRwOi8vbW96aWxsYS5vcmcvTVBMLzIuMC8uICovXG4gIFwidXNlIHN0cmljdFwiO1xuXG4gIGlmICghKGdsb2JhbFRoaXMuY2hyb21lICYmIGdsb2JhbFRoaXMuY2hyb21lLnJ1bnRpbWUgJiYgZ2xvYmFsVGhpcy5jaHJvbWUucnVudGltZS5pZCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJUaGlzIHNjcmlwdCBzaG91bGQgb25seSBiZSBsb2FkZWQgaW4gYSBicm93c2VyIGV4dGVuc2lvbi5cIik7XG4gIH1cbiAgaWYgKCEoZ2xvYmFsVGhpcy5icm93c2VyICYmIGdsb2JhbFRoaXMuYnJvd3Nlci5ydW50aW1lICYmIGdsb2JhbFRoaXMuYnJvd3Nlci5ydW50aW1lLmlkKSkge1xuICAgIGNvbnN0IENIUk9NRV9TRU5EX01FU1NBR0VfQ0FMTEJBQ0tfTk9fUkVTUE9OU0VfTUVTU0FHRSA9IFwiVGhlIG1lc3NhZ2UgcG9ydCBjbG9zZWQgYmVmb3JlIGEgcmVzcG9uc2Ugd2FzIHJlY2VpdmVkLlwiO1xuXG4gICAgLy8gV3JhcHBpbmcgdGhlIGJ1bGsgb2YgdGhpcyBwb2x5ZmlsbCBpbiBhIG9uZS10aW1lLXVzZSBmdW5jdGlvbiBpcyBhIG1pbm9yXG4gICAgLy8gb3B0aW1pemF0aW9uIGZvciBGaXJlZm94LiBTaW5jZSBTcGlkZXJtb25rZXkgZG9lcyBub3QgZnVsbHkgcGFyc2UgdGhlXG4gICAgLy8gY29udGVudHMgb2YgYSBmdW5jdGlvbiB1bnRpbCB0aGUgZmlyc3QgdGltZSBpdCdzIGNhbGxlZCwgYW5kIHNpbmNlIGl0IHdpbGxcbiAgICAvLyBuZXZlciBhY3R1YWxseSBuZWVkIHRvIGJlIGNhbGxlZCwgdGhpcyBhbGxvd3MgdGhlIHBvbHlmaWxsIHRvIGJlIGluY2x1ZGVkXG4gICAgLy8gaW4gRmlyZWZveCBuZWFybHkgZm9yIGZyZWUuXG4gICAgY29uc3Qgd3JhcEFQSXMgPSBleHRlbnNpb25BUElzID0+IHtcbiAgICAgIC8vIE5PVEU6IGFwaU1ldGFkYXRhIGlzIGFzc29jaWF0ZWQgdG8gdGhlIGNvbnRlbnQgb2YgdGhlIGFwaS1tZXRhZGF0YS5qc29uIGZpbGVcbiAgICAgIC8vIGF0IGJ1aWxkIHRpbWUgYnkgcmVwbGFjaW5nIHRoZSBmb2xsb3dpbmcgXCJpbmNsdWRlXCIgd2l0aCB0aGUgY29udGVudCBvZiB0aGVcbiAgICAgIC8vIEpTT04gZmlsZS5cbiAgICAgIGNvbnN0IGFwaU1ldGFkYXRhID0ge1xuICAgICAgICBcImFsYXJtc1wiOiB7XG4gICAgICAgICAgXCJjbGVhclwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImNsZWFyQWxsXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0XCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0QWxsXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwiYm9va21hcmtzXCI6IHtcbiAgICAgICAgICBcImNyZWF0ZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldENoaWxkcmVuXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0UmVjZW50XCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0U3ViVHJlZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldFRyZWVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMFxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJtb3ZlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAyLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDJcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwicmVtb3ZlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwicmVtb3ZlVHJlZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNlYXJjaFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInVwZGF0ZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMixcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAyXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcImJyb3dzZXJBY3Rpb25cIjoge1xuICAgICAgICAgIFwiZGlzYWJsZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJmYWxsYmFja1RvTm9DYWxsYmFja1wiOiB0cnVlXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImVuYWJsZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJmYWxsYmFja1RvTm9DYWxsYmFja1wiOiB0cnVlXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldEJhZGdlQmFja2dyb3VuZENvbG9yXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0QmFkZ2VUZXh0XCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0UG9wdXBcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRUaXRsZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcIm9wZW5Qb3B1cFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNldEJhZGdlQmFja2dyb3VuZENvbG9yXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDEsXG4gICAgICAgICAgICBcImZhbGxiYWNrVG9Ob0NhbGxiYWNrXCI6IHRydWVcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwic2V0QmFkZ2VUZXh0XCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDEsXG4gICAgICAgICAgICBcImZhbGxiYWNrVG9Ob0NhbGxiYWNrXCI6IHRydWVcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwic2V0SWNvblwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNldFBvcHVwXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDEsXG4gICAgICAgICAgICBcImZhbGxiYWNrVG9Ob0NhbGxiYWNrXCI6IHRydWVcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwic2V0VGl0bGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwiZmFsbGJhY2tUb05vQ2FsbGJhY2tcIjogdHJ1ZVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJicm93c2luZ0RhdGFcIjoge1xuICAgICAgICAgIFwicmVtb3ZlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAyLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDJcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwicmVtb3ZlQ2FjaGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJyZW1vdmVDb29raWVzXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwicmVtb3ZlRG93bmxvYWRzXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwicmVtb3ZlRm9ybURhdGFcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJyZW1vdmVIaXN0b3J5XCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwicmVtb3ZlTG9jYWxTdG9yYWdlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwicmVtb3ZlUGFzc3dvcmRzXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwicmVtb3ZlUGx1Z2luRGF0YVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNldHRpbmdzXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwiY29tbWFuZHNcIjoge1xuICAgICAgICAgIFwiZ2V0QWxsXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwiY29udGV4dE1lbnVzXCI6IHtcbiAgICAgICAgICBcInJlbW92ZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlbW92ZUFsbFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInVwZGF0ZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMixcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAyXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcImNvb2tpZXNcIjoge1xuICAgICAgICAgIFwiZ2V0XCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0QWxsXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0QWxsQ29va2llU3RvcmVzXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwicmVtb3ZlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwic2V0XCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwiZGV2dG9vbHNcIjoge1xuICAgICAgICAgIFwiaW5zcGVjdGVkV2luZG93XCI6IHtcbiAgICAgICAgICAgIFwiZXZhbFwiOiB7XG4gICAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgICBcIm1heEFyZ3NcIjogMixcbiAgICAgICAgICAgICAgXCJzaW5nbGVDYWxsYmFja0FyZ1wiOiBmYWxzZVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJwYW5lbHNcIjoge1xuICAgICAgICAgICAgXCJjcmVhdGVcIjoge1xuICAgICAgICAgICAgICBcIm1pbkFyZ3NcIjogMyxcbiAgICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDMsXG4gICAgICAgICAgICAgIFwic2luZ2xlQ2FsbGJhY2tBcmdcIjogdHJ1ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiZWxlbWVudHNcIjoge1xuICAgICAgICAgICAgICBcImNyZWF0ZVNpZGViYXJQYW5lXCI6IHtcbiAgICAgICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcImRvd25sb2Fkc1wiOiB7XG4gICAgICAgICAgXCJjYW5jZWxcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJkb3dubG9hZFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImVyYXNlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0RmlsZUljb25cIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJvcGVuXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDEsXG4gICAgICAgICAgICBcImZhbGxiYWNrVG9Ob0NhbGxiYWNrXCI6IHRydWVcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwicGF1c2VcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJyZW1vdmVGaWxlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwicmVzdW1lXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwic2VhcmNoXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwic2hvd1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJmYWxsYmFja1RvTm9DYWxsYmFja1wiOiB0cnVlXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcImV4dGVuc2lvblwiOiB7XG4gICAgICAgICAgXCJpc0FsbG93ZWRGaWxlU2NoZW1lQWNjZXNzXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiaXNBbGxvd2VkSW5jb2duaXRvQWNjZXNzXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwiaGlzdG9yeVwiOiB7XG4gICAgICAgICAgXCJhZGRVcmxcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJkZWxldGVBbGxcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMFxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJkZWxldGVSYW5nZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImRlbGV0ZVVybFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldFZpc2l0c1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNlYXJjaFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcImkxOG5cIjoge1xuICAgICAgICAgIFwiZGV0ZWN0TGFuZ3VhZ2VcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRBY2NlcHRMYW5ndWFnZXNcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMFxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJpZGVudGl0eVwiOiB7XG4gICAgICAgICAgXCJsYXVuY2hXZWJBdXRoRmxvd1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcImlkbGVcIjoge1xuICAgICAgICAgIFwicXVlcnlTdGF0ZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcIm1hbmFnZW1lbnRcIjoge1xuICAgICAgICAgIFwiZ2V0XCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0QWxsXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0U2VsZlwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNldEVuYWJsZWRcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDIsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJ1bmluc3RhbGxTZWxmXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwibm90aWZpY2F0aW9uc1wiOiB7XG4gICAgICAgICAgXCJjbGVhclwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImNyZWF0ZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAyXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldEFsbFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldFBlcm1pc3Npb25MZXZlbFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInVwZGF0ZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMixcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAyXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcInBhZ2VBY3Rpb25cIjoge1xuICAgICAgICAgIFwiZ2V0UG9wdXBcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRUaXRsZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImhpZGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwiZmFsbGJhY2tUb05vQ2FsbGJhY2tcIjogdHJ1ZVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJzZXRJY29uXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwic2V0UG9wdXBcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwiZmFsbGJhY2tUb05vQ2FsbGJhY2tcIjogdHJ1ZVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJzZXRUaXRsZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJmYWxsYmFja1RvTm9DYWxsYmFja1wiOiB0cnVlXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNob3dcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwiZmFsbGJhY2tUb05vQ2FsbGJhY2tcIjogdHJ1ZVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJwZXJtaXNzaW9uc1wiOiB7XG4gICAgICAgICAgXCJjb250YWluc1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldEFsbFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlbW92ZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlcXVlc3RcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJydW50aW1lXCI6IHtcbiAgICAgICAgICBcImdldEJhY2tncm91bmRQYWdlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0UGxhdGZvcm1JbmZvXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwib3Blbk9wdGlvbnNQYWdlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwicmVxdWVzdFVwZGF0ZUNoZWNrXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwic2VuZE1lc3NhZ2VcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogM1xuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJzZW5kTmF0aXZlTWVzc2FnZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMixcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAyXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNldFVuaW5zdGFsbFVSTFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcInNlc3Npb25zXCI6IHtcbiAgICAgICAgICBcImdldERldmljZXNcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRSZWNlbnRseUNsb3NlZFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlc3RvcmVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJzdG9yYWdlXCI6IHtcbiAgICAgICAgICBcImxvY2FsXCI6IHtcbiAgICAgICAgICAgIFwiY2xlYXJcIjoge1xuICAgICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImdldFwiOiB7XG4gICAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiZ2V0Qnl0ZXNJblVzZVwiOiB7XG4gICAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwicmVtb3ZlXCI6IHtcbiAgICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJzZXRcIjoge1xuICAgICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIFwibWFuYWdlZFwiOiB7XG4gICAgICAgICAgICBcImdldFwiOiB7XG4gICAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiZ2V0Qnl0ZXNJblVzZVwiOiB7XG4gICAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJzeW5jXCI6IHtcbiAgICAgICAgICAgIFwiY2xlYXJcIjoge1xuICAgICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImdldFwiOiB7XG4gICAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiZ2V0Qnl0ZXNJblVzZVwiOiB7XG4gICAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwicmVtb3ZlXCI6IHtcbiAgICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJzZXRcIjoge1xuICAgICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwidGFic1wiOiB7XG4gICAgICAgICAgXCJjYXB0dXJlVmlzaWJsZVRhYlwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAyXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImNyZWF0ZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImRldGVjdExhbmd1YWdlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZGlzY2FyZFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImR1cGxpY2F0ZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImV4ZWN1dGVTY3JpcHRcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRDdXJyZW50XCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0Wm9vbVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldFpvb21TZXR0aW5nc1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdvQmFja1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdvRm9yd2FyZFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImhpZ2hsaWdodFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImluc2VydENTU1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAyXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcIm1vdmVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDIsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJxdWVyeVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlbG9hZFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAyXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlbW92ZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlbW92ZUNTU1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAyXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNlbmRNZXNzYWdlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAyLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDNcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwic2V0Wm9vbVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAyXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNldFpvb21TZXR0aW5nc1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAyXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInVwZGF0ZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAyXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcInRvcFNpdGVzXCI6IHtcbiAgICAgICAgICBcImdldFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcIndlYk5hdmlnYXRpb25cIjoge1xuICAgICAgICAgIFwiZ2V0QWxsRnJhbWVzXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0RnJhbWVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJ3ZWJSZXF1ZXN0XCI6IHtcbiAgICAgICAgICBcImhhbmRsZXJCZWhhdmlvckNoYW5nZWRcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMFxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJ3aW5kb3dzXCI6IHtcbiAgICAgICAgICBcImNyZWF0ZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAyXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldEFsbFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldEN1cnJlbnRcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRMYXN0Rm9jdXNlZFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlbW92ZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInVwZGF0ZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMixcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAyXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgaWYgKE9iamVjdC5rZXlzKGFwaU1ldGFkYXRhKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiYXBpLW1ldGFkYXRhLmpzb24gaGFzIG5vdCBiZWVuIGluY2x1ZGVkIGluIGJyb3dzZXItcG9seWZpbGxcIik7XG4gICAgICB9XG5cbiAgICAgIC8qKlxuICAgICAgICogQSBXZWFrTWFwIHN1YmNsYXNzIHdoaWNoIGNyZWF0ZXMgYW5kIHN0b3JlcyBhIHZhbHVlIGZvciBhbnkga2V5IHdoaWNoIGRvZXNcbiAgICAgICAqIG5vdCBleGlzdCB3aGVuIGFjY2Vzc2VkLCBidXQgYmVoYXZlcyBleGFjdGx5IGFzIGFuIG9yZGluYXJ5IFdlYWtNYXBcbiAgICAgICAqIG90aGVyd2lzZS5cbiAgICAgICAqXG4gICAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjcmVhdGVJdGVtXG4gICAgICAgKiAgICAgICAgQSBmdW5jdGlvbiB3aGljaCB3aWxsIGJlIGNhbGxlZCBpbiBvcmRlciB0byBjcmVhdGUgdGhlIHZhbHVlIGZvciBhbnlcbiAgICAgICAqICAgICAgICBrZXkgd2hpY2ggZG9lcyBub3QgZXhpc3QsIHRoZSBmaXJzdCB0aW1lIGl0IGlzIGFjY2Vzc2VkLiBUaGVcbiAgICAgICAqICAgICAgICBmdW5jdGlvbiByZWNlaXZlcywgYXMgaXRzIG9ubHkgYXJndW1lbnQsIHRoZSBrZXkgYmVpbmcgY3JlYXRlZC5cbiAgICAgICAqL1xuICAgICAgY2xhc3MgRGVmYXVsdFdlYWtNYXAgZXh0ZW5kcyBXZWFrTWFwIHtcbiAgICAgICAgY29uc3RydWN0b3IoY3JlYXRlSXRlbSwgaXRlbXMgPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBzdXBlcihpdGVtcyk7XG4gICAgICAgICAgdGhpcy5jcmVhdGVJdGVtID0gY3JlYXRlSXRlbTtcbiAgICAgICAgfVxuICAgICAgICBnZXQoa2V5KSB7XG4gICAgICAgICAgaWYgKCF0aGlzLmhhcyhrZXkpKSB7XG4gICAgICAgICAgICB0aGlzLnNldChrZXksIHRoaXMuY3JlYXRlSXRlbShrZXkpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHN1cGVyLmdldChrZXkpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8qKlxuICAgICAgICogUmV0dXJucyB0cnVlIGlmIHRoZSBnaXZlbiBvYmplY3QgaXMgYW4gb2JqZWN0IHdpdGggYSBgdGhlbmAgbWV0aG9kLCBhbmQgY2FuXG4gICAgICAgKiB0aGVyZWZvcmUgYmUgYXNzdW1lZCB0byBiZWhhdmUgYXMgYSBQcm9taXNlLlxuICAgICAgICpcbiAgICAgICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIHRlc3QuXG4gICAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB0aGUgdmFsdWUgaXMgdGhlbmFibGUuXG4gICAgICAgKi9cbiAgICAgIGNvbnN0IGlzVGhlbmFibGUgPSB2YWx1ZSA9PiB7XG4gICAgICAgIHJldHVybiB2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIHZhbHVlLnRoZW4gPT09IFwiZnVuY3Rpb25cIjtcbiAgICAgIH07XG5cbiAgICAgIC8qKlxuICAgICAgICogQ3JlYXRlcyBhbmQgcmV0dXJucyBhIGZ1bmN0aW9uIHdoaWNoLCB3aGVuIGNhbGxlZCwgd2lsbCByZXNvbHZlIG9yIHJlamVjdFxuICAgICAgICogdGhlIGdpdmVuIHByb21pc2UgYmFzZWQgb24gaG93IGl0IGlzIGNhbGxlZDpcbiAgICAgICAqXG4gICAgICAgKiAtIElmLCB3aGVuIGNhbGxlZCwgYGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcmAgY29udGFpbnMgYSBub24tbnVsbCBvYmplY3QsXG4gICAgICAgKiAgIHRoZSBwcm9taXNlIGlzIHJlamVjdGVkIHdpdGggdGhhdCB2YWx1ZS5cbiAgICAgICAqIC0gSWYgdGhlIGZ1bmN0aW9uIGlzIGNhbGxlZCB3aXRoIGV4YWN0bHkgb25lIGFyZ3VtZW50LCB0aGUgcHJvbWlzZSBpc1xuICAgICAgICogICByZXNvbHZlZCB0byB0aGF0IHZhbHVlLlxuICAgICAgICogLSBPdGhlcndpc2UsIHRoZSBwcm9taXNlIGlzIHJlc29sdmVkIHRvIGFuIGFycmF5IGNvbnRhaW5pbmcgYWxsIG9mIHRoZVxuICAgICAgICogICBmdW5jdGlvbidzIGFyZ3VtZW50cy5cbiAgICAgICAqXG4gICAgICAgKiBAcGFyYW0ge29iamVjdH0gcHJvbWlzZVxuICAgICAgICogICAgICAgIEFuIG9iamVjdCBjb250YWluaW5nIHRoZSByZXNvbHV0aW9uIGFuZCByZWplY3Rpb24gZnVuY3Rpb25zIG9mIGFcbiAgICAgICAqICAgICAgICBwcm9taXNlLlxuICAgICAgICogQHBhcmFtIHtmdW5jdGlvbn0gcHJvbWlzZS5yZXNvbHZlXG4gICAgICAgKiAgICAgICAgVGhlIHByb21pc2UncyByZXNvbHV0aW9uIGZ1bmN0aW9uLlxuICAgICAgICogQHBhcmFtIHtmdW5jdGlvbn0gcHJvbWlzZS5yZWplY3RcbiAgICAgICAqICAgICAgICBUaGUgcHJvbWlzZSdzIHJlamVjdGlvbiBmdW5jdGlvbi5cbiAgICAgICAqIEBwYXJhbSB7b2JqZWN0fSBtZXRhZGF0YVxuICAgICAgICogICAgICAgIE1ldGFkYXRhIGFib3V0IHRoZSB3cmFwcGVkIG1ldGhvZCB3aGljaCBoYXMgY3JlYXRlZCB0aGUgY2FsbGJhY2suXG4gICAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IG1ldGFkYXRhLnNpbmdsZUNhbGxiYWNrQXJnXG4gICAgICAgKiAgICAgICAgV2hldGhlciBvciBub3QgdGhlIHByb21pc2UgaXMgcmVzb2x2ZWQgd2l0aCBvbmx5IHRoZSBmaXJzdFxuICAgICAgICogICAgICAgIGFyZ3VtZW50IG9mIHRoZSBjYWxsYmFjaywgYWx0ZXJuYXRpdmVseSBhbiBhcnJheSBvZiBhbGwgdGhlXG4gICAgICAgKiAgICAgICAgY2FsbGJhY2sgYXJndW1lbnRzIGlzIHJlc29sdmVkLiBCeSBkZWZhdWx0LCBpZiB0aGUgY2FsbGJhY2tcbiAgICAgICAqICAgICAgICBmdW5jdGlvbiBpcyBpbnZva2VkIHdpdGggb25seSBhIHNpbmdsZSBhcmd1bWVudCwgdGhhdCB3aWxsIGJlXG4gICAgICAgKiAgICAgICAgcmVzb2x2ZWQgdG8gdGhlIHByb21pc2UsIHdoaWxlIGFsbCBhcmd1bWVudHMgd2lsbCBiZSByZXNvbHZlZCBhc1xuICAgICAgICogICAgICAgIGFuIGFycmF5IGlmIG11bHRpcGxlIGFyZSBnaXZlbi5cbiAgICAgICAqXG4gICAgICAgKiBAcmV0dXJucyB7ZnVuY3Rpb259XG4gICAgICAgKiAgICAgICAgVGhlIGdlbmVyYXRlZCBjYWxsYmFjayBmdW5jdGlvbi5cbiAgICAgICAqL1xuICAgICAgY29uc3QgbWFrZUNhbGxiYWNrID0gKHByb21pc2UsIG1ldGFkYXRhKSA9PiB7XG4gICAgICAgIHJldHVybiAoLi4uY2FsbGJhY2tBcmdzKSA9PiB7XG4gICAgICAgICAgaWYgKGV4dGVuc2lvbkFQSXMucnVudGltZS5sYXN0RXJyb3IpIHtcbiAgICAgICAgICAgIHByb21pc2UucmVqZWN0KG5ldyBFcnJvcihleHRlbnNpb25BUElzLnJ1bnRpbWUubGFzdEVycm9yLm1lc3NhZ2UpKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKG1ldGFkYXRhLnNpbmdsZUNhbGxiYWNrQXJnIHx8IGNhbGxiYWNrQXJncy5sZW5ndGggPD0gMSAmJiBtZXRhZGF0YS5zaW5nbGVDYWxsYmFja0FyZyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHByb21pc2UucmVzb2x2ZShjYWxsYmFja0FyZ3NbMF0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwcm9taXNlLnJlc29sdmUoY2FsbGJhY2tBcmdzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICB9O1xuICAgICAgY29uc3QgcGx1cmFsaXplQXJndW1lbnRzID0gbnVtQXJncyA9PiBudW1BcmdzID09IDEgPyBcImFyZ3VtZW50XCIgOiBcImFyZ3VtZW50c1wiO1xuXG4gICAgICAvKipcbiAgICAgICAqIENyZWF0ZXMgYSB3cmFwcGVyIGZ1bmN0aW9uIGZvciBhIG1ldGhvZCB3aXRoIHRoZSBnaXZlbiBuYW1lIGFuZCBtZXRhZGF0YS5cbiAgICAgICAqXG4gICAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZVxuICAgICAgICogICAgICAgIFRoZSBuYW1lIG9mIHRoZSBtZXRob2Qgd2hpY2ggaXMgYmVpbmcgd3JhcHBlZC5cbiAgICAgICAqIEBwYXJhbSB7b2JqZWN0fSBtZXRhZGF0YVxuICAgICAgICogICAgICAgIE1ldGFkYXRhIGFib3V0IHRoZSBtZXRob2QgYmVpbmcgd3JhcHBlZC5cbiAgICAgICAqIEBwYXJhbSB7aW50ZWdlcn0gbWV0YWRhdGEubWluQXJnc1xuICAgICAgICogICAgICAgIFRoZSBtaW5pbXVtIG51bWJlciBvZiBhcmd1bWVudHMgd2hpY2ggbXVzdCBiZSBwYXNzZWQgdG8gdGhlXG4gICAgICAgKiAgICAgICAgZnVuY3Rpb24uIElmIGNhbGxlZCB3aXRoIGZld2VyIHRoYW4gdGhpcyBudW1iZXIgb2YgYXJndW1lbnRzLCB0aGVcbiAgICAgICAqICAgICAgICB3cmFwcGVyIHdpbGwgcmFpc2UgYW4gZXhjZXB0aW9uLlxuICAgICAgICogQHBhcmFtIHtpbnRlZ2VyfSBtZXRhZGF0YS5tYXhBcmdzXG4gICAgICAgKiAgICAgICAgVGhlIG1heGltdW0gbnVtYmVyIG9mIGFyZ3VtZW50cyB3aGljaCBtYXkgYmUgcGFzc2VkIHRvIHRoZVxuICAgICAgICogICAgICAgIGZ1bmN0aW9uLiBJZiBjYWxsZWQgd2l0aCBtb3JlIHRoYW4gdGhpcyBudW1iZXIgb2YgYXJndW1lbnRzLCB0aGVcbiAgICAgICAqICAgICAgICB3cmFwcGVyIHdpbGwgcmFpc2UgYW4gZXhjZXB0aW9uLlxuICAgICAgICogQHBhcmFtIHtib29sZWFufSBtZXRhZGF0YS5zaW5nbGVDYWxsYmFja0FyZ1xuICAgICAgICogICAgICAgIFdoZXRoZXIgb3Igbm90IHRoZSBwcm9taXNlIGlzIHJlc29sdmVkIHdpdGggb25seSB0aGUgZmlyc3RcbiAgICAgICAqICAgICAgICBhcmd1bWVudCBvZiB0aGUgY2FsbGJhY2ssIGFsdGVybmF0aXZlbHkgYW4gYXJyYXkgb2YgYWxsIHRoZVxuICAgICAgICogICAgICAgIGNhbGxiYWNrIGFyZ3VtZW50cyBpcyByZXNvbHZlZC4gQnkgZGVmYXVsdCwgaWYgdGhlIGNhbGxiYWNrXG4gICAgICAgKiAgICAgICAgZnVuY3Rpb24gaXMgaW52b2tlZCB3aXRoIG9ubHkgYSBzaW5nbGUgYXJndW1lbnQsIHRoYXQgd2lsbCBiZVxuICAgICAgICogICAgICAgIHJlc29sdmVkIHRvIHRoZSBwcm9taXNlLCB3aGlsZSBhbGwgYXJndW1lbnRzIHdpbGwgYmUgcmVzb2x2ZWQgYXNcbiAgICAgICAqICAgICAgICBhbiBhcnJheSBpZiBtdWx0aXBsZSBhcmUgZ2l2ZW4uXG4gICAgICAgKlxuICAgICAgICogQHJldHVybnMge2Z1bmN0aW9uKG9iamVjdCwgLi4uKil9XG4gICAgICAgKiAgICAgICBUaGUgZ2VuZXJhdGVkIHdyYXBwZXIgZnVuY3Rpb24uXG4gICAgICAgKi9cbiAgICAgIGNvbnN0IHdyYXBBc3luY0Z1bmN0aW9uID0gKG5hbWUsIG1ldGFkYXRhKSA9PiB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBhc3luY0Z1bmN0aW9uV3JhcHBlcih0YXJnZXQsIC4uLmFyZ3MpIHtcbiAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPCBtZXRhZGF0YS5taW5BcmdzKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIGF0IGxlYXN0ICR7bWV0YWRhdGEubWluQXJnc30gJHtwbHVyYWxpemVBcmd1bWVudHMobWV0YWRhdGEubWluQXJncyl9IGZvciAke25hbWV9KCksIGdvdCAke2FyZ3MubGVuZ3RofWApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPiBtZXRhZGF0YS5tYXhBcmdzKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIGF0IG1vc3QgJHttZXRhZGF0YS5tYXhBcmdzfSAke3BsdXJhbGl6ZUFyZ3VtZW50cyhtZXRhZGF0YS5tYXhBcmdzKX0gZm9yICR7bmFtZX0oKSwgZ290ICR7YXJncy5sZW5ndGh9YCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBpZiAobWV0YWRhdGEuZmFsbGJhY2tUb05vQ2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgLy8gVGhpcyBBUEkgbWV0aG9kIGhhcyBjdXJyZW50bHkgbm8gY2FsbGJhY2sgb24gQ2hyb21lLCBidXQgaXQgcmV0dXJuIGEgcHJvbWlzZSBvbiBGaXJlZm94LFxuICAgICAgICAgICAgICAvLyBhbmQgc28gdGhlIHBvbHlmaWxsIHdpbGwgdHJ5IHRvIGNhbGwgaXQgd2l0aCBhIGNhbGxiYWNrIGZpcnN0LCBhbmQgaXQgd2lsbCBmYWxsYmFja1xuICAgICAgICAgICAgICAvLyB0byBub3QgcGFzc2luZyB0aGUgY2FsbGJhY2sgaWYgdGhlIGZpcnN0IGNhbGwgZmFpbHMuXG4gICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0W25hbWVdKC4uLmFyZ3MsIG1ha2VDYWxsYmFjayh7XG4gICAgICAgICAgICAgICAgICByZXNvbHZlLFxuICAgICAgICAgICAgICAgICAgcmVqZWN0XG4gICAgICAgICAgICAgICAgfSwgbWV0YWRhdGEpKTtcbiAgICAgICAgICAgICAgfSBjYXRjaCAoY2JFcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihgJHtuYW1lfSBBUEkgbWV0aG9kIGRvZXNuJ3Qgc2VlbSB0byBzdXBwb3J0IHRoZSBjYWxsYmFjayBwYXJhbWV0ZXIsIGAgKyBcImZhbGxpbmcgYmFjayB0byBjYWxsIGl0IHdpdGhvdXQgYSBjYWxsYmFjazogXCIsIGNiRXJyb3IpO1xuICAgICAgICAgICAgICAgIHRhcmdldFtuYW1lXSguLi5hcmdzKTtcblxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgQVBJIG1ldGhvZCBtZXRhZGF0YSwgc28gdGhhdCB0aGUgbmV4dCBBUEkgY2FsbHMgd2lsbCBub3QgdHJ5IHRvXG4gICAgICAgICAgICAgICAgLy8gdXNlIHRoZSB1bnN1cHBvcnRlZCBjYWxsYmFjayBhbnltb3JlLlxuICAgICAgICAgICAgICAgIG1ldGFkYXRhLmZhbGxiYWNrVG9Ob0NhbGxiYWNrID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgbWV0YWRhdGEubm9DYWxsYmFjayA9IHRydWU7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1ldGFkYXRhLm5vQ2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgdGFyZ2V0W25hbWVdKC4uLmFyZ3MpO1xuICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0YXJnZXRbbmFtZV0oLi4uYXJncywgbWFrZUNhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICByZXNvbHZlLFxuICAgICAgICAgICAgICAgIHJlamVjdFxuICAgICAgICAgICAgICB9LCBtZXRhZGF0YSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgfTtcblxuICAgICAgLyoqXG4gICAgICAgKiBXcmFwcyBhbiBleGlzdGluZyBtZXRob2Qgb2YgdGhlIHRhcmdldCBvYmplY3QsIHNvIHRoYXQgY2FsbHMgdG8gaXQgYXJlXG4gICAgICAgKiBpbnRlcmNlcHRlZCBieSB0aGUgZ2l2ZW4gd3JhcHBlciBmdW5jdGlvbi4gVGhlIHdyYXBwZXIgZnVuY3Rpb24gcmVjZWl2ZXMsXG4gICAgICAgKiBhcyBpdHMgZmlyc3QgYXJndW1lbnQsIHRoZSBvcmlnaW5hbCBgdGFyZ2V0YCBvYmplY3QsIGZvbGxvd2VkIGJ5IGVhY2ggb2ZcbiAgICAgICAqIHRoZSBhcmd1bWVudHMgcGFzc2VkIHRvIHRoZSBvcmlnaW5hbCBtZXRob2QuXG4gICAgICAgKlxuICAgICAgICogQHBhcmFtIHtvYmplY3R9IHRhcmdldFxuICAgICAgICogICAgICAgIFRoZSBvcmlnaW5hbCB0YXJnZXQgb2JqZWN0IHRoYXQgdGhlIHdyYXBwZWQgbWV0aG9kIGJlbG9uZ3MgdG8uXG4gICAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBtZXRob2RcbiAgICAgICAqICAgICAgICBUaGUgbWV0aG9kIGJlaW5nIHdyYXBwZWQuIFRoaXMgaXMgdXNlZCBhcyB0aGUgdGFyZ2V0IG9mIHRoZSBQcm94eVxuICAgICAgICogICAgICAgIG9iamVjdCB3aGljaCBpcyBjcmVhdGVkIHRvIHdyYXAgdGhlIG1ldGhvZC5cbiAgICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IHdyYXBwZXJcbiAgICAgICAqICAgICAgICBUaGUgd3JhcHBlciBmdW5jdGlvbiB3aGljaCBpcyBjYWxsZWQgaW4gcGxhY2Ugb2YgYSBkaXJlY3QgaW52b2NhdGlvblxuICAgICAgICogICAgICAgIG9mIHRoZSB3cmFwcGVkIG1ldGhvZC5cbiAgICAgICAqXG4gICAgICAgKiBAcmV0dXJucyB7UHJveHk8ZnVuY3Rpb24+fVxuICAgICAgICogICAgICAgIEEgUHJveHkgb2JqZWN0IGZvciB0aGUgZ2l2ZW4gbWV0aG9kLCB3aGljaCBpbnZva2VzIHRoZSBnaXZlbiB3cmFwcGVyXG4gICAgICAgKiAgICAgICAgbWV0aG9kIGluIGl0cyBwbGFjZS5cbiAgICAgICAqL1xuICAgICAgY29uc3Qgd3JhcE1ldGhvZCA9ICh0YXJnZXQsIG1ldGhvZCwgd3JhcHBlcikgPT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb3h5KG1ldGhvZCwge1xuICAgICAgICAgIGFwcGx5KHRhcmdldE1ldGhvZCwgdGhpc09iaiwgYXJncykge1xuICAgICAgICAgICAgcmV0dXJuIHdyYXBwZXIuY2FsbCh0aGlzT2JqLCB0YXJnZXQsIC4uLmFyZ3MpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9O1xuICAgICAgbGV0IGhhc093blByb3BlcnR5ID0gRnVuY3Rpb24uY2FsbC5iaW5kKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkpO1xuXG4gICAgICAvKipcbiAgICAgICAqIFdyYXBzIGFuIG9iamVjdCBpbiBhIFByb3h5IHdoaWNoIGludGVyY2VwdHMgYW5kIHdyYXBzIGNlcnRhaW4gbWV0aG9kc1xuICAgICAgICogYmFzZWQgb24gdGhlIGdpdmVuIGB3cmFwcGVyc2AgYW5kIGBtZXRhZGF0YWAgb2JqZWN0cy5cbiAgICAgICAqXG4gICAgICAgKiBAcGFyYW0ge29iamVjdH0gdGFyZ2V0XG4gICAgICAgKiAgICAgICAgVGhlIHRhcmdldCBvYmplY3QgdG8gd3JhcC5cbiAgICAgICAqXG4gICAgICAgKiBAcGFyYW0ge29iamVjdH0gW3dyYXBwZXJzID0ge31dXG4gICAgICAgKiAgICAgICAgQW4gb2JqZWN0IHRyZWUgY29udGFpbmluZyB3cmFwcGVyIGZ1bmN0aW9ucyBmb3Igc3BlY2lhbCBjYXNlcy4gQW55XG4gICAgICAgKiAgICAgICAgZnVuY3Rpb24gcHJlc2VudCBpbiB0aGlzIG9iamVjdCB0cmVlIGlzIGNhbGxlZCBpbiBwbGFjZSBvZiB0aGVcbiAgICAgICAqICAgICAgICBtZXRob2QgaW4gdGhlIHNhbWUgbG9jYXRpb24gaW4gdGhlIGB0YXJnZXRgIG9iamVjdCB0cmVlLiBUaGVzZVxuICAgICAgICogICAgICAgIHdyYXBwZXIgbWV0aG9kcyBhcmUgaW52b2tlZCBhcyBkZXNjcmliZWQgaW4ge0BzZWUgd3JhcE1ldGhvZH0uXG4gICAgICAgKlxuICAgICAgICogQHBhcmFtIHtvYmplY3R9IFttZXRhZGF0YSA9IHt9XVxuICAgICAgICogICAgICAgIEFuIG9iamVjdCB0cmVlIGNvbnRhaW5pbmcgbWV0YWRhdGEgdXNlZCB0byBhdXRvbWF0aWNhbGx5IGdlbmVyYXRlXG4gICAgICAgKiAgICAgICAgUHJvbWlzZS1iYXNlZCB3cmFwcGVyIGZ1bmN0aW9ucyBmb3IgYXN5bmNocm9ub3VzLiBBbnkgZnVuY3Rpb24gaW5cbiAgICAgICAqICAgICAgICB0aGUgYHRhcmdldGAgb2JqZWN0IHRyZWUgd2hpY2ggaGFzIGEgY29ycmVzcG9uZGluZyBtZXRhZGF0YSBvYmplY3RcbiAgICAgICAqICAgICAgICBpbiB0aGUgc2FtZSBsb2NhdGlvbiBpbiB0aGUgYG1ldGFkYXRhYCB0cmVlIGlzIHJlcGxhY2VkIHdpdGggYW5cbiAgICAgICAqICAgICAgICBhdXRvbWF0aWNhbGx5LWdlbmVyYXRlZCB3cmFwcGVyIGZ1bmN0aW9uLCBhcyBkZXNjcmliZWQgaW5cbiAgICAgICAqICAgICAgICB7QHNlZSB3cmFwQXN5bmNGdW5jdGlvbn1cbiAgICAgICAqXG4gICAgICAgKiBAcmV0dXJucyB7UHJveHk8b2JqZWN0Pn1cbiAgICAgICAqL1xuICAgICAgY29uc3Qgd3JhcE9iamVjdCA9ICh0YXJnZXQsIHdyYXBwZXJzID0ge30sIG1ldGFkYXRhID0ge30pID0+IHtcbiAgICAgICAgbGV0IGNhY2hlID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICAgICAgbGV0IGhhbmRsZXJzID0ge1xuICAgICAgICAgIGhhcyhwcm94eVRhcmdldCwgcHJvcCkge1xuICAgICAgICAgICAgcmV0dXJuIHByb3AgaW4gdGFyZ2V0IHx8IHByb3AgaW4gY2FjaGU7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBnZXQocHJveHlUYXJnZXQsIHByb3AsIHJlY2VpdmVyKSB7XG4gICAgICAgICAgICBpZiAocHJvcCBpbiBjYWNoZSkge1xuICAgICAgICAgICAgICByZXR1cm4gY2FjaGVbcHJvcF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIShwcm9wIGluIHRhcmdldCkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxldCB2YWx1ZSA9IHRhcmdldFtwcm9wXTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAvLyBUaGlzIGlzIGEgbWV0aG9kIG9uIHRoZSB1bmRlcmx5aW5nIG9iamVjdC4gQ2hlY2sgaWYgd2UgbmVlZCB0byBkb1xuICAgICAgICAgICAgICAvLyBhbnkgd3JhcHBpbmcuXG5cbiAgICAgICAgICAgICAgaWYgKHR5cGVvZiB3cmFwcGVyc1twcm9wXSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgLy8gV2UgaGF2ZSBhIHNwZWNpYWwtY2FzZSB3cmFwcGVyIGZvciB0aGlzIG1ldGhvZC5cbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHdyYXBNZXRob2QodGFyZ2V0LCB0YXJnZXRbcHJvcF0sIHdyYXBwZXJzW3Byb3BdKTtcbiAgICAgICAgICAgICAgfSBlbHNlIGlmIChoYXNPd25Qcm9wZXJ0eShtZXRhZGF0YSwgcHJvcCkpIHtcbiAgICAgICAgICAgICAgICAvLyBUaGlzIGlzIGFuIGFzeW5jIG1ldGhvZCB0aGF0IHdlIGhhdmUgbWV0YWRhdGEgZm9yLiBDcmVhdGUgYVxuICAgICAgICAgICAgICAgIC8vIFByb21pc2Ugd3JhcHBlciBmb3IgaXQuXG4gICAgICAgICAgICAgICAgbGV0IHdyYXBwZXIgPSB3cmFwQXN5bmNGdW5jdGlvbihwcm9wLCBtZXRhZGF0YVtwcm9wXSk7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSB3cmFwTWV0aG9kKHRhcmdldCwgdGFyZ2V0W3Byb3BdLCB3cmFwcGVyKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBUaGlzIGlzIGEgbWV0aG9kIHRoYXQgd2UgZG9uJ3Qga25vdyBvciBjYXJlIGFib3V0LiBSZXR1cm4gdGhlXG4gICAgICAgICAgICAgICAgLy8gb3JpZ2luYWwgbWV0aG9kLCBib3VuZCB0byB0aGUgdW5kZXJseWluZyBvYmplY3QuXG4gICAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS5iaW5kKHRhcmdldCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiICYmIHZhbHVlICE9PSBudWxsICYmIChoYXNPd25Qcm9wZXJ0eSh3cmFwcGVycywgcHJvcCkgfHwgaGFzT3duUHJvcGVydHkobWV0YWRhdGEsIHByb3ApKSkge1xuICAgICAgICAgICAgICAvLyBUaGlzIGlzIGFuIG9iamVjdCB0aGF0IHdlIG5lZWQgdG8gZG8gc29tZSB3cmFwcGluZyBmb3IgdGhlIGNoaWxkcmVuXG4gICAgICAgICAgICAgIC8vIG9mLiBDcmVhdGUgYSBzdWItb2JqZWN0IHdyYXBwZXIgZm9yIGl0IHdpdGggdGhlIGFwcHJvcHJpYXRlIGNoaWxkXG4gICAgICAgICAgICAgIC8vIG1ldGFkYXRhLlxuICAgICAgICAgICAgICB2YWx1ZSA9IHdyYXBPYmplY3QodmFsdWUsIHdyYXBwZXJzW3Byb3BdLCBtZXRhZGF0YVtwcm9wXSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGhhc093blByb3BlcnR5KG1ldGFkYXRhLCBcIipcIikpIHtcbiAgICAgICAgICAgICAgLy8gV3JhcCBhbGwgcHJvcGVydGllcyBpbiAqIG5hbWVzcGFjZS5cbiAgICAgICAgICAgICAgdmFsdWUgPSB3cmFwT2JqZWN0KHZhbHVlLCB3cmFwcGVyc1twcm9wXSwgbWV0YWRhdGFbXCIqXCJdKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIFdlIGRvbid0IG5lZWQgdG8gZG8gYW55IHdyYXBwaW5nIGZvciB0aGlzIHByb3BlcnR5LFxuICAgICAgICAgICAgICAvLyBzbyBqdXN0IGZvcndhcmQgYWxsIGFjY2VzcyB0byB0aGUgdW5kZXJseWluZyBvYmplY3QuXG4gICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShjYWNoZSwgcHJvcCwge1xuICAgICAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgIGdldCgpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiB0YXJnZXRbcHJvcF07XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzZXQodmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgIHRhcmdldFtwcm9wXSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhY2hlW3Byb3BdID0gdmFsdWU7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBzZXQocHJveHlUYXJnZXQsIHByb3AsIHZhbHVlLCByZWNlaXZlcikge1xuICAgICAgICAgICAgaWYgKHByb3AgaW4gY2FjaGUpIHtcbiAgICAgICAgICAgICAgY2FjaGVbcHJvcF0gPSB2YWx1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRhcmdldFtwcm9wXSA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBkZWZpbmVQcm9wZXJ0eShwcm94eVRhcmdldCwgcHJvcCwgZGVzYykge1xuICAgICAgICAgICAgcmV0dXJuIFJlZmxlY3QuZGVmaW5lUHJvcGVydHkoY2FjaGUsIHByb3AsIGRlc2MpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgZGVsZXRlUHJvcGVydHkocHJveHlUYXJnZXQsIHByb3ApIHtcbiAgICAgICAgICAgIHJldHVybiBSZWZsZWN0LmRlbGV0ZVByb3BlcnR5KGNhY2hlLCBwcm9wKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gUGVyIGNvbnRyYWN0IG9mIHRoZSBQcm94eSBBUEksIHRoZSBcImdldFwiIHByb3h5IGhhbmRsZXIgbXVzdCByZXR1cm4gdGhlXG4gICAgICAgIC8vIG9yaWdpbmFsIHZhbHVlIG9mIHRoZSB0YXJnZXQgaWYgdGhhdCB2YWx1ZSBpcyBkZWNsYXJlZCByZWFkLW9ubHkgYW5kXG4gICAgICAgIC8vIG5vbi1jb25maWd1cmFibGUuIEZvciB0aGlzIHJlYXNvbiwgd2UgY3JlYXRlIGFuIG9iamVjdCB3aXRoIHRoZVxuICAgICAgICAvLyBwcm90b3R5cGUgc2V0IHRvIGB0YXJnZXRgIGluc3RlYWQgb2YgdXNpbmcgYHRhcmdldGAgZGlyZWN0bHkuXG4gICAgICAgIC8vIE90aGVyd2lzZSB3ZSBjYW5ub3QgcmV0dXJuIGEgY3VzdG9tIG9iamVjdCBmb3IgQVBJcyB0aGF0XG4gICAgICAgIC8vIGFyZSBkZWNsYXJlZCByZWFkLW9ubHkgYW5kIG5vbi1jb25maWd1cmFibGUsIHN1Y2ggYXMgYGNocm9tZS5kZXZ0b29sc2AuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIFRoZSBwcm94eSBoYW5kbGVycyB0aGVtc2VsdmVzIHdpbGwgc3RpbGwgdXNlIHRoZSBvcmlnaW5hbCBgdGFyZ2V0YFxuICAgICAgICAvLyBpbnN0ZWFkIG9mIHRoZSBgcHJveHlUYXJnZXRgLCBzbyB0aGF0IHRoZSBtZXRob2RzIGFuZCBwcm9wZXJ0aWVzIGFyZVxuICAgICAgICAvLyBkZXJlZmVyZW5jZWQgdmlhIHRoZSBvcmlnaW5hbCB0YXJnZXRzLlxuICAgICAgICBsZXQgcHJveHlUYXJnZXQgPSBPYmplY3QuY3JlYXRlKHRhcmdldCk7XG4gICAgICAgIHJldHVybiBuZXcgUHJveHkocHJveHlUYXJnZXQsIGhhbmRsZXJzKTtcbiAgICAgIH07XG5cbiAgICAgIC8qKlxuICAgICAgICogQ3JlYXRlcyBhIHNldCBvZiB3cmFwcGVyIGZ1bmN0aW9ucyBmb3IgYW4gZXZlbnQgb2JqZWN0LCB3aGljaCBoYW5kbGVzXG4gICAgICAgKiB3cmFwcGluZyBvZiBsaXN0ZW5lciBmdW5jdGlvbnMgdGhhdCB0aG9zZSBtZXNzYWdlcyBhcmUgcGFzc2VkLlxuICAgICAgICpcbiAgICAgICAqIEEgc2luZ2xlIHdyYXBwZXIgaXMgY3JlYXRlZCBmb3IgZWFjaCBsaXN0ZW5lciBmdW5jdGlvbiwgYW5kIHN0b3JlZCBpbiBhXG4gICAgICAgKiBtYXAuIFN1YnNlcXVlbnQgY2FsbHMgdG8gYGFkZExpc3RlbmVyYCwgYGhhc0xpc3RlbmVyYCwgb3IgYHJlbW92ZUxpc3RlbmVyYFxuICAgICAgICogcmV0cmlldmUgdGhlIG9yaWdpbmFsIHdyYXBwZXIsIHNvIHRoYXQgIGF0dGVtcHRzIHRvIHJlbW92ZSBhXG4gICAgICAgKiBwcmV2aW91c2x5LWFkZGVkIGxpc3RlbmVyIHdvcmsgYXMgZXhwZWN0ZWQuXG4gICAgICAgKlxuICAgICAgICogQHBhcmFtIHtEZWZhdWx0V2Vha01hcDxmdW5jdGlvbiwgZnVuY3Rpb24+fSB3cmFwcGVyTWFwXG4gICAgICAgKiAgICAgICAgQSBEZWZhdWx0V2Vha01hcCBvYmplY3Qgd2hpY2ggd2lsbCBjcmVhdGUgdGhlIGFwcHJvcHJpYXRlIHdyYXBwZXJcbiAgICAgICAqICAgICAgICBmb3IgYSBnaXZlbiBsaXN0ZW5lciBmdW5jdGlvbiB3aGVuIG9uZSBkb2VzIG5vdCBleGlzdCwgYW5kIHJldHJpZXZlXG4gICAgICAgKiAgICAgICAgYW4gZXhpc3Rpbmcgb25lIHdoZW4gaXQgZG9lcy5cbiAgICAgICAqXG4gICAgICAgKiBAcmV0dXJucyB7b2JqZWN0fVxuICAgICAgICovXG4gICAgICBjb25zdCB3cmFwRXZlbnQgPSB3cmFwcGVyTWFwID0+ICh7XG4gICAgICAgIGFkZExpc3RlbmVyKHRhcmdldCwgbGlzdGVuZXIsIC4uLmFyZ3MpIHtcbiAgICAgICAgICB0YXJnZXQuYWRkTGlzdGVuZXIod3JhcHBlck1hcC5nZXQobGlzdGVuZXIpLCAuLi5hcmdzKTtcbiAgICAgICAgfSxcbiAgICAgICAgaGFzTGlzdGVuZXIodGFyZ2V0LCBsaXN0ZW5lcikge1xuICAgICAgICAgIHJldHVybiB0YXJnZXQuaGFzTGlzdGVuZXIod3JhcHBlck1hcC5nZXQobGlzdGVuZXIpKTtcbiAgICAgICAgfSxcbiAgICAgICAgcmVtb3ZlTGlzdGVuZXIodGFyZ2V0LCBsaXN0ZW5lcikge1xuICAgICAgICAgIHRhcmdldC5yZW1vdmVMaXN0ZW5lcih3cmFwcGVyTWFwLmdldChsaXN0ZW5lcikpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGNvbnN0IG9uUmVxdWVzdEZpbmlzaGVkV3JhcHBlcnMgPSBuZXcgRGVmYXVsdFdlYWtNYXAobGlzdGVuZXIgPT4ge1xuICAgICAgICBpZiAodHlwZW9mIGxpc3RlbmVyICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICByZXR1cm4gbGlzdGVuZXI7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogV3JhcHMgYW4gb25SZXF1ZXN0RmluaXNoZWQgbGlzdGVuZXIgZnVuY3Rpb24gc28gdGhhdCBpdCB3aWxsIHJldHVybiBhXG4gICAgICAgICAqIGBnZXRDb250ZW50KClgIHByb3BlcnR5IHdoaWNoIHJldHVybnMgYSBgUHJvbWlzZWAgcmF0aGVyIHRoYW4gdXNpbmcgYVxuICAgICAgICAgKiBjYWxsYmFjayBBUEkuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXFcbiAgICAgICAgICogICAgICAgIFRoZSBIQVIgZW50cnkgb2JqZWN0IHJlcHJlc2VudGluZyB0aGUgbmV0d29yayByZXF1ZXN0LlxuICAgICAgICAgKi9cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG9uUmVxdWVzdEZpbmlzaGVkKHJlcSkge1xuICAgICAgICAgIGNvbnN0IHdyYXBwZWRSZXEgPSB3cmFwT2JqZWN0KHJlcSwge30gLyogd3JhcHBlcnMgKi8sIHtcbiAgICAgICAgICAgIGdldENvbnRlbnQ6IHtcbiAgICAgICAgICAgICAgbWluQXJnczogMCxcbiAgICAgICAgICAgICAgbWF4QXJnczogMFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGxpc3RlbmVyKHdyYXBwZWRSZXEpO1xuICAgICAgICB9O1xuICAgICAgfSk7XG4gICAgICBjb25zdCBvbk1lc3NhZ2VXcmFwcGVycyA9IG5ldyBEZWZhdWx0V2Vha01hcChsaXN0ZW5lciA9PiB7XG4gICAgICAgIGlmICh0eXBlb2YgbGlzdGVuZXIgIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgIHJldHVybiBsaXN0ZW5lcjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBXcmFwcyBhIG1lc3NhZ2UgbGlzdGVuZXIgZnVuY3Rpb24gc28gdGhhdCBpdCBtYXkgc2VuZCByZXNwb25zZXMgYmFzZWQgb25cbiAgICAgICAgICogaXRzIHJldHVybiB2YWx1ZSwgcmF0aGVyIHRoYW4gYnkgcmV0dXJuaW5nIGEgc2VudGluZWwgdmFsdWUgYW5kIGNhbGxpbmcgYVxuICAgICAgICAgKiBjYWxsYmFjay4gSWYgdGhlIGxpc3RlbmVyIGZ1bmN0aW9uIHJldHVybnMgYSBQcm9taXNlLCB0aGUgcmVzcG9uc2UgaXNcbiAgICAgICAgICogc2VudCB3aGVuIHRoZSBwcm9taXNlIGVpdGhlciByZXNvbHZlcyBvciByZWplY3RzLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0geyp9IG1lc3NhZ2VcbiAgICAgICAgICogICAgICAgIFRoZSBtZXNzYWdlIHNlbnQgYnkgdGhlIG90aGVyIGVuZCBvZiB0aGUgY2hhbm5lbC5cbiAgICAgICAgICogQHBhcmFtIHtvYmplY3R9IHNlbmRlclxuICAgICAgICAgKiAgICAgICAgRGV0YWlscyBhYm91dCB0aGUgc2VuZGVyIG9mIHRoZSBtZXNzYWdlLlxuICAgICAgICAgKiBAcGFyYW0ge2Z1bmN0aW9uKCopfSBzZW5kUmVzcG9uc2VcbiAgICAgICAgICogICAgICAgIEEgY2FsbGJhY2sgd2hpY2gsIHdoZW4gY2FsbGVkIHdpdGggYW4gYXJiaXRyYXJ5IGFyZ3VtZW50LCBzZW5kc1xuICAgICAgICAgKiAgICAgICAgdGhhdCB2YWx1ZSBhcyBhIHJlc3BvbnNlLlxuICAgICAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgICAgICogICAgICAgIFRydWUgaWYgdGhlIHdyYXBwZWQgbGlzdGVuZXIgcmV0dXJuZWQgYSBQcm9taXNlLCB3aGljaCB3aWxsIGxhdGVyXG4gICAgICAgICAqICAgICAgICB5aWVsZCBhIHJlc3BvbnNlLiBGYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAqL1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gb25NZXNzYWdlKG1lc3NhZ2UsIHNlbmRlciwgc2VuZFJlc3BvbnNlKSB7XG4gICAgICAgICAgbGV0IGRpZENhbGxTZW5kUmVzcG9uc2UgPSBmYWxzZTtcbiAgICAgICAgICBsZXQgd3JhcHBlZFNlbmRSZXNwb25zZTtcbiAgICAgICAgICBsZXQgc2VuZFJlc3BvbnNlUHJvbWlzZSA9IG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICAgICAgd3JhcHBlZFNlbmRSZXNwb25zZSA9IGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICBkaWRDYWxsU2VuZFJlc3BvbnNlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgcmVzb2x2ZShyZXNwb25zZSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIGxldCByZXN1bHQ7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGxpc3RlbmVyKG1lc3NhZ2UsIHNlbmRlciwgd3JhcHBlZFNlbmRSZXNwb25zZSk7XG4gICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBQcm9taXNlLnJlamVjdChlcnIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBpc1Jlc3VsdFRoZW5hYmxlID0gcmVzdWx0ICE9PSB0cnVlICYmIGlzVGhlbmFibGUocmVzdWx0KTtcblxuICAgICAgICAgIC8vIElmIHRoZSBsaXN0ZW5lciBkaWRuJ3QgcmV0dXJuZWQgdHJ1ZSBvciBhIFByb21pc2UsIG9yIGNhbGxlZFxuICAgICAgICAgIC8vIHdyYXBwZWRTZW5kUmVzcG9uc2Ugc3luY2hyb25vdXNseSwgd2UgY2FuIGV4aXQgZWFybGllclxuICAgICAgICAgIC8vIGJlY2F1c2UgdGhlcmUgd2lsbCBiZSBubyByZXNwb25zZSBzZW50IGZyb20gdGhpcyBsaXN0ZW5lci5cbiAgICAgICAgICBpZiAocmVzdWx0ICE9PSB0cnVlICYmICFpc1Jlc3VsdFRoZW5hYmxlICYmICFkaWRDYWxsU2VuZFJlc3BvbnNlKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gQSBzbWFsbCBoZWxwZXIgdG8gc2VuZCB0aGUgbWVzc2FnZSBpZiB0aGUgcHJvbWlzZSByZXNvbHZlc1xuICAgICAgICAgIC8vIGFuZCBhbiBlcnJvciBpZiB0aGUgcHJvbWlzZSByZWplY3RzIChhIHdyYXBwZWQgc2VuZE1lc3NhZ2UgaGFzXG4gICAgICAgICAgLy8gdG8gdHJhbnNsYXRlIHRoZSBtZXNzYWdlIGludG8gYSByZXNvbHZlZCBwcm9taXNlIG9yIGEgcmVqZWN0ZWRcbiAgICAgICAgICAvLyBwcm9taXNlKS5cbiAgICAgICAgICBjb25zdCBzZW5kUHJvbWlzZWRSZXN1bHQgPSBwcm9taXNlID0+IHtcbiAgICAgICAgICAgIHByb21pc2UudGhlbihtc2cgPT4ge1xuICAgICAgICAgICAgICAvLyBzZW5kIHRoZSBtZXNzYWdlIHZhbHVlLlxuICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UobXNnKTtcbiAgICAgICAgICAgIH0sIGVycm9yID0+IHtcbiAgICAgICAgICAgICAgLy8gU2VuZCBhIEpTT04gcmVwcmVzZW50YXRpb24gb2YgdGhlIGVycm9yIGlmIHRoZSByZWplY3RlZCB2YWx1ZVxuICAgICAgICAgICAgICAvLyBpcyBhbiBpbnN0YW5jZSBvZiBlcnJvciwgb3IgdGhlIG9iamVjdCBpdHNlbGYgb3RoZXJ3aXNlLlxuICAgICAgICAgICAgICBsZXQgbWVzc2FnZTtcbiAgICAgICAgICAgICAgaWYgKGVycm9yICYmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yIHx8IHR5cGVvZiBlcnJvci5tZXNzYWdlID09PSBcInN0cmluZ1wiKSkge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBlcnJvci5tZXNzYWdlO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBcIkFuIHVuZXhwZWN0ZWQgZXJyb3Igb2NjdXJyZWRcIjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBzZW5kUmVzcG9uc2Uoe1xuICAgICAgICAgICAgICAgIF9fbW96V2ViRXh0ZW5zaW9uUG9seWZpbGxSZWplY3RfXzogdHJ1ZSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2goZXJyID0+IHtcbiAgICAgICAgICAgICAgLy8gUHJpbnQgYW4gZXJyb3Igb24gdGhlIGNvbnNvbGUgaWYgdW5hYmxlIHRvIHNlbmQgdGhlIHJlc3BvbnNlLlxuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIHNlbmQgb25NZXNzYWdlIHJlamVjdGVkIHJlcGx5XCIsIGVycik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgLy8gSWYgdGhlIGxpc3RlbmVyIHJldHVybmVkIGEgUHJvbWlzZSwgc2VuZCB0aGUgcmVzb2x2ZWQgdmFsdWUgYXMgYVxuICAgICAgICAgIC8vIHJlc3VsdCwgb3RoZXJ3aXNlIHdhaXQgdGhlIHByb21pc2UgcmVsYXRlZCB0byB0aGUgd3JhcHBlZFNlbmRSZXNwb25zZVxuICAgICAgICAgIC8vIGNhbGxiYWNrIHRvIHJlc29sdmUgYW5kIHNlbmQgaXQgYXMgYSByZXNwb25zZS5cbiAgICAgICAgICBpZiAoaXNSZXN1bHRUaGVuYWJsZSkge1xuICAgICAgICAgICAgc2VuZFByb21pc2VkUmVzdWx0KHJlc3VsdCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNlbmRQcm9taXNlZFJlc3VsdChzZW5kUmVzcG9uc2VQcm9taXNlKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBMZXQgQ2hyb21lIGtub3cgdGhhdCB0aGUgbGlzdGVuZXIgaXMgcmVwbHlpbmcuXG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH07XG4gICAgICB9KTtcbiAgICAgIGNvbnN0IHdyYXBwZWRTZW5kTWVzc2FnZUNhbGxiYWNrID0gKHtcbiAgICAgICAgcmVqZWN0LFxuICAgICAgICByZXNvbHZlXG4gICAgICB9LCByZXBseSkgPT4ge1xuICAgICAgICBpZiAoZXh0ZW5zaW9uQVBJcy5ydW50aW1lLmxhc3RFcnJvcikge1xuICAgICAgICAgIC8vIERldGVjdCB3aGVuIG5vbmUgb2YgdGhlIGxpc3RlbmVycyByZXBsaWVkIHRvIHRoZSBzZW5kTWVzc2FnZSBjYWxsIGFuZCByZXNvbHZlXG4gICAgICAgICAgLy8gdGhlIHByb21pc2UgdG8gdW5kZWZpbmVkIGFzIGluIEZpcmVmb3guXG4gICAgICAgICAgLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9tb3ppbGxhL3dlYmV4dGVuc2lvbi1wb2x5ZmlsbC9pc3N1ZXMvMTMwXG4gICAgICAgICAgaWYgKGV4dGVuc2lvbkFQSXMucnVudGltZS5sYXN0RXJyb3IubWVzc2FnZSA9PT0gQ0hST01FX1NFTkRfTUVTU0FHRV9DQUxMQkFDS19OT19SRVNQT05TRV9NRVNTQUdFKSB7XG4gICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoZXh0ZW5zaW9uQVBJcy5ydW50aW1lLmxhc3RFcnJvci5tZXNzYWdlKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHJlcGx5ICYmIHJlcGx5Ll9fbW96V2ViRXh0ZW5zaW9uUG9seWZpbGxSZWplY3RfXykge1xuICAgICAgICAgIC8vIENvbnZlcnQgYmFjayB0aGUgSlNPTiByZXByZXNlbnRhdGlvbiBvZiB0aGUgZXJyb3IgaW50b1xuICAgICAgICAgIC8vIGFuIEVycm9yIGluc3RhbmNlLlxuICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IocmVwbHkubWVzc2FnZSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc29sdmUocmVwbHkpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgY29uc3Qgd3JhcHBlZFNlbmRNZXNzYWdlID0gKG5hbWUsIG1ldGFkYXRhLCBhcGlOYW1lc3BhY2VPYmosIC4uLmFyZ3MpID0+IHtcbiAgICAgICAgaWYgKGFyZ3MubGVuZ3RoIDwgbWV0YWRhdGEubWluQXJncykge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgYXQgbGVhc3QgJHttZXRhZGF0YS5taW5BcmdzfSAke3BsdXJhbGl6ZUFyZ3VtZW50cyhtZXRhZGF0YS5taW5BcmdzKX0gZm9yICR7bmFtZX0oKSwgZ290ICR7YXJncy5sZW5ndGh9YCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGFyZ3MubGVuZ3RoID4gbWV0YWRhdGEubWF4QXJncykge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgYXQgbW9zdCAke21ldGFkYXRhLm1heEFyZ3N9ICR7cGx1cmFsaXplQXJndW1lbnRzKG1ldGFkYXRhLm1heEFyZ3MpfSBmb3IgJHtuYW1lfSgpLCBnb3QgJHthcmdzLmxlbmd0aH1gKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgIGNvbnN0IHdyYXBwZWRDYiA9IHdyYXBwZWRTZW5kTWVzc2FnZUNhbGxiYWNrLmJpbmQobnVsbCwge1xuICAgICAgICAgICAgcmVzb2x2ZSxcbiAgICAgICAgICAgIHJlamVjdFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGFyZ3MucHVzaCh3cmFwcGVkQ2IpO1xuICAgICAgICAgIGFwaU5hbWVzcGFjZU9iai5zZW5kTWVzc2FnZSguLi5hcmdzKTtcbiAgICAgICAgfSk7XG4gICAgICB9O1xuICAgICAgY29uc3Qgc3RhdGljV3JhcHBlcnMgPSB7XG4gICAgICAgIGRldnRvb2xzOiB7XG4gICAgICAgICAgbmV0d29yazoge1xuICAgICAgICAgICAgb25SZXF1ZXN0RmluaXNoZWQ6IHdyYXBFdmVudChvblJlcXVlc3RGaW5pc2hlZFdyYXBwZXJzKVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgcnVudGltZToge1xuICAgICAgICAgIG9uTWVzc2FnZTogd3JhcEV2ZW50KG9uTWVzc2FnZVdyYXBwZXJzKSxcbiAgICAgICAgICBvbk1lc3NhZ2VFeHRlcm5hbDogd3JhcEV2ZW50KG9uTWVzc2FnZVdyYXBwZXJzKSxcbiAgICAgICAgICBzZW5kTWVzc2FnZTogd3JhcHBlZFNlbmRNZXNzYWdlLmJpbmQobnVsbCwgXCJzZW5kTWVzc2FnZVwiLCB7XG4gICAgICAgICAgICBtaW5BcmdzOiAxLFxuICAgICAgICAgICAgbWF4QXJnczogM1xuICAgICAgICAgIH0pXG4gICAgICAgIH0sXG4gICAgICAgIHRhYnM6IHtcbiAgICAgICAgICBzZW5kTWVzc2FnZTogd3JhcHBlZFNlbmRNZXNzYWdlLmJpbmQobnVsbCwgXCJzZW5kTWVzc2FnZVwiLCB7XG4gICAgICAgICAgICBtaW5BcmdzOiAyLFxuICAgICAgICAgICAgbWF4QXJnczogM1xuICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICBjb25zdCBzZXR0aW5nTWV0YWRhdGEgPSB7XG4gICAgICAgIGNsZWFyOiB7XG4gICAgICAgICAgbWluQXJnczogMSxcbiAgICAgICAgICBtYXhBcmdzOiAxXG4gICAgICAgIH0sXG4gICAgICAgIGdldDoge1xuICAgICAgICAgIG1pbkFyZ3M6IDEsXG4gICAgICAgICAgbWF4QXJnczogMVxuICAgICAgICB9LFxuICAgICAgICBzZXQ6IHtcbiAgICAgICAgICBtaW5BcmdzOiAxLFxuICAgICAgICAgIG1heEFyZ3M6IDFcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIGFwaU1ldGFkYXRhLnByaXZhY3kgPSB7XG4gICAgICAgIG5ldHdvcms6IHtcbiAgICAgICAgICBcIipcIjogc2V0dGluZ01ldGFkYXRhXG4gICAgICAgIH0sXG4gICAgICAgIHNlcnZpY2VzOiB7XG4gICAgICAgICAgXCIqXCI6IHNldHRpbmdNZXRhZGF0YVxuICAgICAgICB9LFxuICAgICAgICB3ZWJzaXRlczoge1xuICAgICAgICAgIFwiKlwiOiBzZXR0aW5nTWV0YWRhdGFcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIHJldHVybiB3cmFwT2JqZWN0KGV4dGVuc2lvbkFQSXMsIHN0YXRpY1dyYXBwZXJzLCBhcGlNZXRhZGF0YSk7XG4gICAgfTtcblxuICAgIC8vIFRoZSBidWlsZCBwcm9jZXNzIGFkZHMgYSBVTUQgd3JhcHBlciBhcm91bmQgdGhpcyBmaWxlLCB3aGljaCBtYWtlcyB0aGVcbiAgICAvLyBgbW9kdWxlYCB2YXJpYWJsZSBhdmFpbGFibGUuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSB3cmFwQVBJcyhjaHJvbWUpO1xuICB9IGVsc2Uge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZ2xvYmFsVGhpcy5icm93c2VyO1xuICB9XG59KTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWJyb3dzZXItcG9seWZpbGwuanMubWFwXG4iLCJpbXBvcnQgb3JpZ2luYWxCcm93c2VyIGZyb20gXCJ3ZWJleHRlbnNpb24tcG9seWZpbGxcIjtcbmV4cG9ydCBjb25zdCBicm93c2VyID0gb3JpZ2luYWxCcm93c2VyO1xuIiwiZnVuY3Rpb24gcHJpbnQobWV0aG9kLCAuLi5hcmdzKSB7XG4gIGlmIChpbXBvcnQubWV0YS5lbnYuTU9ERSA9PT0gXCJwcm9kdWN0aW9uXCIpIHJldHVybjtcbiAgaWYgKHR5cGVvZiBhcmdzWzBdID09PSBcInN0cmluZ1wiKSB7XG4gICAgY29uc3QgbWVzc2FnZSA9IGFyZ3Muc2hpZnQoKTtcbiAgICBtZXRob2QoYFt3eHRdICR7bWVzc2FnZX1gLCAuLi5hcmdzKTtcbiAgfSBlbHNlIHtcbiAgICBtZXRob2QoXCJbd3h0XVwiLCAuLi5hcmdzKTtcbiAgfVxufVxuZXhwb3J0IGNvbnN0IGxvZ2dlciA9IHtcbiAgZGVidWc6ICguLi5hcmdzKSA9PiBwcmludChjb25zb2xlLmRlYnVnLCAuLi5hcmdzKSxcbiAgbG9nOiAoLi4uYXJncykgPT4gcHJpbnQoY29uc29sZS5sb2csIC4uLmFyZ3MpLFxuICB3YXJuOiAoLi4uYXJncykgPT4gcHJpbnQoY29uc29sZS53YXJuLCAuLi5hcmdzKSxcbiAgZXJyb3I6ICguLi5hcmdzKSA9PiBwcmludChjb25zb2xlLmVycm9yLCAuLi5hcmdzKVxufTtcbiIsImltcG9ydCB7IGJyb3dzZXIgfSBmcm9tIFwid3h0L2Jyb3dzZXJcIjtcbmV4cG9ydCBjbGFzcyBXeHRMb2NhdGlvbkNoYW5nZUV2ZW50IGV4dGVuZHMgRXZlbnQge1xuICBjb25zdHJ1Y3RvcihuZXdVcmwsIG9sZFVybCkge1xuICAgIHN1cGVyKFd4dExvY2F0aW9uQ2hhbmdlRXZlbnQuRVZFTlRfTkFNRSwge30pO1xuICAgIHRoaXMubmV3VXJsID0gbmV3VXJsO1xuICAgIHRoaXMub2xkVXJsID0gb2xkVXJsO1xuICB9XG4gIHN0YXRpYyBFVkVOVF9OQU1FID0gZ2V0VW5pcXVlRXZlbnROYW1lKFwid3h0OmxvY2F0aW9uY2hhbmdlXCIpO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGdldFVuaXF1ZUV2ZW50TmFtZShldmVudE5hbWUpIHtcbiAgcmV0dXJuIGAke2Jyb3dzZXI/LnJ1bnRpbWU/LmlkfToke2ltcG9ydC5tZXRhLmVudi5FTlRSWVBPSU5UfToke2V2ZW50TmFtZX1gO1xufVxuIiwiaW1wb3J0IHsgV3h0TG9jYXRpb25DaGFuZ2VFdmVudCB9IGZyb20gXCIuL2N1c3RvbS1ldmVudHMubWpzXCI7XG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTG9jYXRpb25XYXRjaGVyKGN0eCkge1xuICBsZXQgaW50ZXJ2YWw7XG4gIGxldCBvbGRVcmw7XG4gIHJldHVybiB7XG4gICAgLyoqXG4gICAgICogRW5zdXJlIHRoZSBsb2NhdGlvbiB3YXRjaGVyIGlzIGFjdGl2ZWx5IGxvb2tpbmcgZm9yIFVSTCBjaGFuZ2VzLiBJZiBpdCdzIGFscmVhZHkgd2F0Y2hpbmcsXG4gICAgICogdGhpcyBpcyBhIG5vb3AuXG4gICAgICovXG4gICAgcnVuKCkge1xuICAgICAgaWYgKGludGVydmFsICE9IG51bGwpIHJldHVybjtcbiAgICAgIG9sZFVybCA9IG5ldyBVUkwobG9jYXRpb24uaHJlZik7XG4gICAgICBpbnRlcnZhbCA9IGN0eC5zZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgIGxldCBuZXdVcmwgPSBuZXcgVVJMKGxvY2F0aW9uLmhyZWYpO1xuICAgICAgICBpZiAobmV3VXJsLmhyZWYgIT09IG9sZFVybC5ocmVmKSB7XG4gICAgICAgICAgd2luZG93LmRpc3BhdGNoRXZlbnQobmV3IFd4dExvY2F0aW9uQ2hhbmdlRXZlbnQobmV3VXJsLCBvbGRVcmwpKTtcbiAgICAgICAgICBvbGRVcmwgPSBuZXdVcmw7XG4gICAgICAgIH1cbiAgICAgIH0sIDFlMyk7XG4gICAgfVxuICB9O1xufVxuIiwiaW1wb3J0IHsgYnJvd3NlciB9IGZyb20gXCJ3eHQvYnJvd3NlclwiO1xuaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSBcIi4uLy4uL3NhbmRib3gvdXRpbHMvbG9nZ2VyLm1qc1wiO1xuaW1wb3J0IHsgZ2V0VW5pcXVlRXZlbnROYW1lIH0gZnJvbSBcIi4vY3VzdG9tLWV2ZW50cy5tanNcIjtcbmltcG9ydCB7IGNyZWF0ZUxvY2F0aW9uV2F0Y2hlciB9IGZyb20gXCIuL2xvY2F0aW9uLXdhdGNoZXIubWpzXCI7XG5leHBvcnQgY2xhc3MgQ29udGVudFNjcmlwdENvbnRleHQge1xuICBjb25zdHJ1Y3Rvcihjb250ZW50U2NyaXB0TmFtZSwgb3B0aW9ucykge1xuICAgIHRoaXMuY29udGVudFNjcmlwdE5hbWUgPSBjb250ZW50U2NyaXB0TmFtZTtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIHRoaXMuYWJvcnRDb250cm9sbGVyID0gbmV3IEFib3J0Q29udHJvbGxlcigpO1xuICAgIGlmICh0aGlzLmlzVG9wRnJhbWUpIHtcbiAgICAgIHRoaXMubGlzdGVuRm9yTmV3ZXJTY3JpcHRzKHsgaWdub3JlRmlyc3RFdmVudDogdHJ1ZSB9KTtcbiAgICAgIHRoaXMuc3RvcE9sZFNjcmlwdHMoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5saXN0ZW5Gb3JOZXdlclNjcmlwdHMoKTtcbiAgICB9XG4gIH1cbiAgc3RhdGljIFNDUklQVF9TVEFSVEVEX01FU1NBR0VfVFlQRSA9IGdldFVuaXF1ZUV2ZW50TmFtZShcbiAgICBcInd4dDpjb250ZW50LXNjcmlwdC1zdGFydGVkXCJcbiAgKTtcbiAgaXNUb3BGcmFtZSA9IHdpbmRvdy5zZWxmID09PSB3aW5kb3cudG9wO1xuICBhYm9ydENvbnRyb2xsZXI7XG4gIGxvY2F0aW9uV2F0Y2hlciA9IGNyZWF0ZUxvY2F0aW9uV2F0Y2hlcih0aGlzKTtcbiAgcmVjZWl2ZWRNZXNzYWdlSWRzID0gLyogQF9fUFVSRV9fICovIG5ldyBTZXQoKTtcbiAgZ2V0IHNpZ25hbCgpIHtcbiAgICByZXR1cm4gdGhpcy5hYm9ydENvbnRyb2xsZXIuc2lnbmFsO1xuICB9XG4gIGFib3J0KHJlYXNvbikge1xuICAgIHJldHVybiB0aGlzLmFib3J0Q29udHJvbGxlci5hYm9ydChyZWFzb24pO1xuICB9XG4gIGdldCBpc0ludmFsaWQoKSB7XG4gICAgaWYgKGJyb3dzZXIucnVudGltZS5pZCA9PSBudWxsKSB7XG4gICAgICB0aGlzLm5vdGlmeUludmFsaWRhdGVkKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnNpZ25hbC5hYm9ydGVkO1xuICB9XG4gIGdldCBpc1ZhbGlkKCkge1xuICAgIHJldHVybiAhdGhpcy5pc0ludmFsaWQ7XG4gIH1cbiAgLyoqXG4gICAqIEFkZCBhIGxpc3RlbmVyIHRoYXQgaXMgY2FsbGVkIHdoZW4gdGhlIGNvbnRlbnQgc2NyaXB0J3MgY29udGV4dCBpcyBpbnZhbGlkYXRlZC5cbiAgICpcbiAgICogQHJldHVybnMgQSBmdW5jdGlvbiB0byByZW1vdmUgdGhlIGxpc3RlbmVyLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBicm93c2VyLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKGNiKTtcbiAgICogY29uc3QgcmVtb3ZlSW52YWxpZGF0ZWRMaXN0ZW5lciA9IGN0eC5vbkludmFsaWRhdGVkKCgpID0+IHtcbiAgICogICBicm93c2VyLnJ1bnRpbWUub25NZXNzYWdlLnJlbW92ZUxpc3RlbmVyKGNiKTtcbiAgICogfSlcbiAgICogLy8gLi4uXG4gICAqIHJlbW92ZUludmFsaWRhdGVkTGlzdGVuZXIoKTtcbiAgICovXG4gIG9uSW52YWxpZGF0ZWQoY2IpIHtcbiAgICB0aGlzLnNpZ25hbC5hZGRFdmVudExpc3RlbmVyKFwiYWJvcnRcIiwgY2IpO1xuICAgIHJldHVybiAoKSA9PiB0aGlzLnNpZ25hbC5yZW1vdmVFdmVudExpc3RlbmVyKFwiYWJvcnRcIiwgY2IpO1xuICB9XG4gIC8qKlxuICAgKiBSZXR1cm4gYSBwcm9taXNlIHRoYXQgbmV2ZXIgcmVzb2x2ZXMuIFVzZWZ1bCBpZiB5b3UgaGF2ZSBhbiBhc3luYyBmdW5jdGlvbiB0aGF0IHNob3VsZG4ndCBydW5cbiAgICogYWZ0ZXIgdGhlIGNvbnRleHQgaXMgZXhwaXJlZC5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogY29uc3QgZ2V0VmFsdWVGcm9tU3RvcmFnZSA9IGFzeW5jICgpID0+IHtcbiAgICogICBpZiAoY3R4LmlzSW52YWxpZCkgcmV0dXJuIGN0eC5ibG9jaygpO1xuICAgKlxuICAgKiAgIC8vIC4uLlxuICAgKiB9XG4gICAqL1xuICBibG9jaygpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKCkgPT4ge1xuICAgIH0pO1xuICB9XG4gIC8qKlxuICAgKiBXcmFwcGVyIGFyb3VuZCBgd2luZG93LnNldEludGVydmFsYCB0aGF0IGF1dG9tYXRpY2FsbHkgY2xlYXJzIHRoZSBpbnRlcnZhbCB3aGVuIGludmFsaWRhdGVkLlxuICAgKi9cbiAgc2V0SW50ZXJ2YWwoaGFuZGxlciwgdGltZW91dCkge1xuICAgIGNvbnN0IGlkID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgaWYgKHRoaXMuaXNWYWxpZCkgaGFuZGxlcigpO1xuICAgIH0sIHRpbWVvdXQpO1xuICAgIHRoaXMub25JbnZhbGlkYXRlZCgoKSA9PiBjbGVhckludGVydmFsKGlkKSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG4gIC8qKlxuICAgKiBXcmFwcGVyIGFyb3VuZCBgd2luZG93LnNldFRpbWVvdXRgIHRoYXQgYXV0b21hdGljYWxseSBjbGVhcnMgdGhlIGludGVydmFsIHdoZW4gaW52YWxpZGF0ZWQuXG4gICAqL1xuICBzZXRUaW1lb3V0KGhhbmRsZXIsIHRpbWVvdXQpIHtcbiAgICBjb25zdCBpZCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgaWYgKHRoaXMuaXNWYWxpZCkgaGFuZGxlcigpO1xuICAgIH0sIHRpbWVvdXQpO1xuICAgIHRoaXMub25JbnZhbGlkYXRlZCgoKSA9PiBjbGVhclRpbWVvdXQoaWQpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cbiAgLyoqXG4gICAqIFdyYXBwZXIgYXJvdW5kIGB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lYCB0aGF0IGF1dG9tYXRpY2FsbHkgY2FuY2VscyB0aGUgcmVxdWVzdCB3aGVuXG4gICAqIGludmFsaWRhdGVkLlxuICAgKi9cbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGNhbGxiYWNrKSB7XG4gICAgY29uc3QgaWQgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKC4uLmFyZ3MpID0+IHtcbiAgICAgIGlmICh0aGlzLmlzVmFsaWQpIGNhbGxiYWNrKC4uLmFyZ3MpO1xuICAgIH0pO1xuICAgIHRoaXMub25JbnZhbGlkYXRlZCgoKSA9PiBjYW5jZWxBbmltYXRpb25GcmFtZShpZCkpO1xuICAgIHJldHVybiBpZDtcbiAgfVxuICAvKipcbiAgICogV3JhcHBlciBhcm91bmQgYHdpbmRvdy5yZXF1ZXN0SWRsZUNhbGxiYWNrYCB0aGF0IGF1dG9tYXRpY2FsbHkgY2FuY2VscyB0aGUgcmVxdWVzdCB3aGVuXG4gICAqIGludmFsaWRhdGVkLlxuICAgKi9cbiAgcmVxdWVzdElkbGVDYWxsYmFjayhjYWxsYmFjaywgb3B0aW9ucykge1xuICAgIGNvbnN0IGlkID0gcmVxdWVzdElkbGVDYWxsYmFjaygoLi4uYXJncykgPT4ge1xuICAgICAgaWYgKCF0aGlzLnNpZ25hbC5hYm9ydGVkKSBjYWxsYmFjayguLi5hcmdzKTtcbiAgICB9LCBvcHRpb25zKTtcbiAgICB0aGlzLm9uSW52YWxpZGF0ZWQoKCkgPT4gY2FuY2VsSWRsZUNhbGxiYWNrKGlkKSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG4gIGFkZEV2ZW50TGlzdGVuZXIodGFyZ2V0LCB0eXBlLCBoYW5kbGVyLCBvcHRpb25zKSB7XG4gICAgaWYgKHR5cGUgPT09IFwid3h0OmxvY2F0aW9uY2hhbmdlXCIpIHtcbiAgICAgIGlmICh0aGlzLmlzVmFsaWQpIHRoaXMubG9jYXRpb25XYXRjaGVyLnJ1bigpO1xuICAgIH1cbiAgICB0YXJnZXQuYWRkRXZlbnRMaXN0ZW5lcj8uKFxuICAgICAgdHlwZS5zdGFydHNXaXRoKFwid3h0OlwiKSA/IGdldFVuaXF1ZUV2ZW50TmFtZSh0eXBlKSA6IHR5cGUsXG4gICAgICBoYW5kbGVyLFxuICAgICAge1xuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICBzaWduYWw6IHRoaXMuc2lnbmFsXG4gICAgICB9XG4gICAgKTtcbiAgfVxuICAvKipcbiAgICogQGludGVybmFsXG4gICAqIEFib3J0IHRoZSBhYm9ydCBjb250cm9sbGVyIGFuZCBleGVjdXRlIGFsbCBgb25JbnZhbGlkYXRlZGAgbGlzdGVuZXJzLlxuICAgKi9cbiAgbm90aWZ5SW52YWxpZGF0ZWQoKSB7XG4gICAgdGhpcy5hYm9ydChcIkNvbnRlbnQgc2NyaXB0IGNvbnRleHQgaW52YWxpZGF0ZWRcIik7XG4gICAgbG9nZ2VyLmRlYnVnKFxuICAgICAgYENvbnRlbnQgc2NyaXB0IFwiJHt0aGlzLmNvbnRlbnRTY3JpcHROYW1lfVwiIGNvbnRleHQgaW52YWxpZGF0ZWRgXG4gICAgKTtcbiAgfVxuICBzdG9wT2xkU2NyaXB0cygpIHtcbiAgICB3aW5kb3cucG9zdE1lc3NhZ2UoXG4gICAgICB7XG4gICAgICAgIHR5cGU6IENvbnRlbnRTY3JpcHRDb250ZXh0LlNDUklQVF9TVEFSVEVEX01FU1NBR0VfVFlQRSxcbiAgICAgICAgY29udGVudFNjcmlwdE5hbWU6IHRoaXMuY29udGVudFNjcmlwdE5hbWUsXG4gICAgICAgIG1lc3NhZ2VJZDogTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc2xpY2UoMilcbiAgICAgIH0sXG4gICAgICBcIipcIlxuICAgICk7XG4gIH1cbiAgdmVyaWZ5U2NyaXB0U3RhcnRlZEV2ZW50KGV2ZW50KSB7XG4gICAgY29uc3QgaXNTY3JpcHRTdGFydGVkRXZlbnQgPSBldmVudC5kYXRhPy50eXBlID09PSBDb250ZW50U2NyaXB0Q29udGV4dC5TQ1JJUFRfU1RBUlRFRF9NRVNTQUdFX1RZUEU7XG4gICAgY29uc3QgaXNTYW1lQ29udGVudFNjcmlwdCA9IGV2ZW50LmRhdGE/LmNvbnRlbnRTY3JpcHROYW1lID09PSB0aGlzLmNvbnRlbnRTY3JpcHROYW1lO1xuICAgIGNvbnN0IGlzTm90RHVwbGljYXRlID0gIXRoaXMucmVjZWl2ZWRNZXNzYWdlSWRzLmhhcyhldmVudC5kYXRhPy5tZXNzYWdlSWQpO1xuICAgIHJldHVybiBpc1NjcmlwdFN0YXJ0ZWRFdmVudCAmJiBpc1NhbWVDb250ZW50U2NyaXB0ICYmIGlzTm90RHVwbGljYXRlO1xuICB9XG4gIGxpc3RlbkZvck5ld2VyU2NyaXB0cyhvcHRpb25zKSB7XG4gICAgbGV0IGlzRmlyc3QgPSB0cnVlO1xuICAgIGNvbnN0IGNiID0gKGV2ZW50KSA9PiB7XG4gICAgICBpZiAodGhpcy52ZXJpZnlTY3JpcHRTdGFydGVkRXZlbnQoZXZlbnQpKSB7XG4gICAgICAgIHRoaXMucmVjZWl2ZWRNZXNzYWdlSWRzLmFkZChldmVudC5kYXRhLm1lc3NhZ2VJZCk7XG4gICAgICAgIGNvbnN0IHdhc0ZpcnN0ID0gaXNGaXJzdDtcbiAgICAgICAgaXNGaXJzdCA9IGZhbHNlO1xuICAgICAgICBpZiAod2FzRmlyc3QgJiYgb3B0aW9ucz8uaWdub3JlRmlyc3RFdmVudCkgcmV0dXJuO1xuICAgICAgICB0aGlzLm5vdGlmeUludmFsaWRhdGVkKCk7XG4gICAgICB9XG4gICAgfTtcbiAgICBhZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBjYik7XG4gICAgdGhpcy5vbkludmFsaWRhdGVkKCgpID0+IHJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGNiKSk7XG4gIH1cbn1cbiIsImNvbnN0IG51bGxLZXkgPSBTeW1ib2woJ251bGwnKTsgLy8gYG9iamVjdEhhc2hlc2Aga2V5IGZvciBudWxsXG5cbmxldCBrZXlDb3VudGVyID0gMDtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWFueUtleXNNYXAgZXh0ZW5kcyBNYXAge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpO1xuXG5cdFx0dGhpcy5fb2JqZWN0SGFzaGVzID0gbmV3IFdlYWtNYXAoKTtcblx0XHR0aGlzLl9zeW1ib2xIYXNoZXMgPSBuZXcgTWFwKCk7IC8vIGh0dHBzOi8vZ2l0aHViLmNvbS90YzM5L2VjbWEyNjIvaXNzdWVzLzExOTRcblx0XHR0aGlzLl9wdWJsaWNLZXlzID0gbmV3IE1hcCgpO1xuXG5cdFx0Y29uc3QgW3BhaXJzXSA9IGFyZ3VtZW50czsgLy8gTWFwIGNvbXBhdFxuXHRcdGlmIChwYWlycyA9PT0gbnVsbCB8fCBwYWlycyA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0aWYgKHR5cGVvZiBwYWlyc1tTeW1ib2wuaXRlcmF0b3JdICE9PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKHR5cGVvZiBwYWlycyArICcgaXMgbm90IGl0ZXJhYmxlIChjYW5ub3QgcmVhZCBwcm9wZXJ0eSBTeW1ib2woU3ltYm9sLml0ZXJhdG9yKSknKTtcblx0XHR9XG5cblx0XHRmb3IgKGNvbnN0IFtrZXlzLCB2YWx1ZV0gb2YgcGFpcnMpIHtcblx0XHRcdHRoaXMuc2V0KGtleXMsIHZhbHVlKTtcblx0XHR9XG5cdH1cblxuXHRfZ2V0UHVibGljS2V5cyhrZXlzLCBjcmVhdGUgPSBmYWxzZSkge1xuXHRcdGlmICghQXJyYXkuaXNBcnJheShrZXlzKSkge1xuXHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIGtleXMgcGFyYW1ldGVyIG11c3QgYmUgYW4gYXJyYXknKTtcblx0XHR9XG5cblx0XHRjb25zdCBwcml2YXRlS2V5ID0gdGhpcy5fZ2V0UHJpdmF0ZUtleShrZXlzLCBjcmVhdGUpO1xuXG5cdFx0bGV0IHB1YmxpY0tleTtcblx0XHRpZiAocHJpdmF0ZUtleSAmJiB0aGlzLl9wdWJsaWNLZXlzLmhhcyhwcml2YXRlS2V5KSkge1xuXHRcdFx0cHVibGljS2V5ID0gdGhpcy5fcHVibGljS2V5cy5nZXQocHJpdmF0ZUtleSk7XG5cdFx0fSBlbHNlIGlmIChjcmVhdGUpIHtcblx0XHRcdHB1YmxpY0tleSA9IFsuLi5rZXlzXTsgLy8gUmVnZW5lcmF0ZSBrZXlzIGFycmF5IHRvIGF2b2lkIGV4dGVybmFsIGludGVyYWN0aW9uXG5cdFx0XHR0aGlzLl9wdWJsaWNLZXlzLnNldChwcml2YXRlS2V5LCBwdWJsaWNLZXkpO1xuXHRcdH1cblxuXHRcdHJldHVybiB7cHJpdmF0ZUtleSwgcHVibGljS2V5fTtcblx0fVxuXG5cdF9nZXRQcml2YXRlS2V5KGtleXMsIGNyZWF0ZSA9IGZhbHNlKSB7XG5cdFx0Y29uc3QgcHJpdmF0ZUtleXMgPSBbXTtcblx0XHRmb3IgKGxldCBrZXkgb2Yga2V5cykge1xuXHRcdFx0aWYgKGtleSA9PT0gbnVsbCkge1xuXHRcdFx0XHRrZXkgPSBudWxsS2V5O1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCBoYXNoZXMgPSB0eXBlb2Yga2V5ID09PSAnb2JqZWN0JyB8fCB0eXBlb2Yga2V5ID09PSAnZnVuY3Rpb24nID8gJ19vYmplY3RIYXNoZXMnIDogKHR5cGVvZiBrZXkgPT09ICdzeW1ib2wnID8gJ19zeW1ib2xIYXNoZXMnIDogZmFsc2UpO1xuXG5cdFx0XHRpZiAoIWhhc2hlcykge1xuXHRcdFx0XHRwcml2YXRlS2V5cy5wdXNoKGtleSk7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXNbaGFzaGVzXS5oYXMoa2V5KSkge1xuXHRcdFx0XHRwcml2YXRlS2V5cy5wdXNoKHRoaXNbaGFzaGVzXS5nZXQoa2V5KSk7XG5cdFx0XHR9IGVsc2UgaWYgKGNyZWF0ZSkge1xuXHRcdFx0XHRjb25zdCBwcml2YXRlS2V5ID0gYEBAbWttLXJlZi0ke2tleUNvdW50ZXIrK31AQGA7XG5cdFx0XHRcdHRoaXNbaGFzaGVzXS5zZXQoa2V5LCBwcml2YXRlS2V5KTtcblx0XHRcdFx0cHJpdmF0ZUtleXMucHVzaChwcml2YXRlS2V5KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gSlNPTi5zdHJpbmdpZnkocHJpdmF0ZUtleXMpO1xuXHR9XG5cblx0c2V0KGtleXMsIHZhbHVlKSB7XG5cdFx0Y29uc3Qge3B1YmxpY0tleX0gPSB0aGlzLl9nZXRQdWJsaWNLZXlzKGtleXMsIHRydWUpO1xuXHRcdHJldHVybiBzdXBlci5zZXQocHVibGljS2V5LCB2YWx1ZSk7XG5cdH1cblxuXHRnZXQoa2V5cykge1xuXHRcdGNvbnN0IHtwdWJsaWNLZXl9ID0gdGhpcy5fZ2V0UHVibGljS2V5cyhrZXlzKTtcblx0XHRyZXR1cm4gc3VwZXIuZ2V0KHB1YmxpY0tleSk7XG5cdH1cblxuXHRoYXMoa2V5cykge1xuXHRcdGNvbnN0IHtwdWJsaWNLZXl9ID0gdGhpcy5fZ2V0UHVibGljS2V5cyhrZXlzKTtcblx0XHRyZXR1cm4gc3VwZXIuaGFzKHB1YmxpY0tleSk7XG5cdH1cblxuXHRkZWxldGUoa2V5cykge1xuXHRcdGNvbnN0IHtwdWJsaWNLZXksIHByaXZhdGVLZXl9ID0gdGhpcy5fZ2V0UHVibGljS2V5cyhrZXlzKTtcblx0XHRyZXR1cm4gQm9vbGVhbihwdWJsaWNLZXkgJiYgc3VwZXIuZGVsZXRlKHB1YmxpY0tleSkgJiYgdGhpcy5fcHVibGljS2V5cy5kZWxldGUocHJpdmF0ZUtleSkpO1xuXHR9XG5cblx0Y2xlYXIoKSB7XG5cdFx0c3VwZXIuY2xlYXIoKTtcblx0XHR0aGlzLl9zeW1ib2xIYXNoZXMuY2xlYXIoKTtcblx0XHR0aGlzLl9wdWJsaWNLZXlzLmNsZWFyKCk7XG5cdH1cblxuXHRnZXQgW1N5bWJvbC50b1N0cmluZ1RhZ10oKSB7XG5cdFx0cmV0dXJuICdNYW55S2V5c01hcCc7XG5cdH1cblxuXHRnZXQgc2l6ZSgpIHtcblx0XHRyZXR1cm4gc3VwZXIuc2l6ZTtcblx0fVxufVxuIiwiZnVuY3Rpb24gaXNQbGFpbk9iamVjdCh2YWx1ZSkge1xuICBpZiAodmFsdWUgPT09IG51bGwgfHwgdHlwZW9mIHZhbHVlICE9PSBcIm9iamVjdFwiKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGNvbnN0IHByb3RvdHlwZSA9IE9iamVjdC5nZXRQcm90b3R5cGVPZih2YWx1ZSk7XG4gIGlmIChwcm90b3R5cGUgIT09IG51bGwgJiYgcHJvdG90eXBlICE9PSBPYmplY3QucHJvdG90eXBlICYmIE9iamVjdC5nZXRQcm90b3R5cGVPZihwcm90b3R5cGUpICE9PSBudWxsKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmIChTeW1ib2wuaXRlcmF0b3IgaW4gdmFsdWUpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKFN5bWJvbC50b1N0cmluZ1RhZyBpbiB2YWx1ZSkge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpID09PSBcIltvYmplY3QgTW9kdWxlXVwiO1xuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBfZGVmdShiYXNlT2JqZWN0LCBkZWZhdWx0cywgbmFtZXNwYWNlID0gXCIuXCIsIG1lcmdlcikge1xuICBpZiAoIWlzUGxhaW5PYmplY3QoZGVmYXVsdHMpKSB7XG4gICAgcmV0dXJuIF9kZWZ1KGJhc2VPYmplY3QsIHt9LCBuYW1lc3BhY2UsIG1lcmdlcik7XG4gIH1cbiAgY29uc3Qgb2JqZWN0ID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMpO1xuICBmb3IgKGNvbnN0IGtleSBpbiBiYXNlT2JqZWN0KSB7XG4gICAgaWYgKGtleSA9PT0gXCJfX3Byb3RvX19cIiB8fCBrZXkgPT09IFwiY29uc3RydWN0b3JcIikge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGNvbnN0IHZhbHVlID0gYmFzZU9iamVjdFtrZXldO1xuICAgIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gdm9pZCAwKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgaWYgKG1lcmdlciAmJiBtZXJnZXIob2JqZWN0LCBrZXksIHZhbHVlLCBuYW1lc3BhY2UpKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpICYmIEFycmF5LmlzQXJyYXkob2JqZWN0W2tleV0pKSB7XG4gICAgICBvYmplY3Rba2V5XSA9IFsuLi52YWx1ZSwgLi4ub2JqZWN0W2tleV1dO1xuICAgIH0gZWxzZSBpZiAoaXNQbGFpbk9iamVjdCh2YWx1ZSkgJiYgaXNQbGFpbk9iamVjdChvYmplY3Rba2V5XSkpIHtcbiAgICAgIG9iamVjdFtrZXldID0gX2RlZnUoXG4gICAgICAgIHZhbHVlLFxuICAgICAgICBvYmplY3Rba2V5XSxcbiAgICAgICAgKG5hbWVzcGFjZSA/IGAke25hbWVzcGFjZX0uYCA6IFwiXCIpICsga2V5LnRvU3RyaW5nKCksXG4gICAgICAgIG1lcmdlclxuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb2JqZWN0W2tleV0gPSB2YWx1ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG9iamVjdDtcbn1cbmZ1bmN0aW9uIGNyZWF0ZURlZnUobWVyZ2VyKSB7XG4gIHJldHVybiAoLi4uYXJndW1lbnRzXykgPT4gKFxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSB1bmljb3JuL25vLWFycmF5LXJlZHVjZVxuICAgIGFyZ3VtZW50c18ucmVkdWNlKChwLCBjKSA9PiBfZGVmdShwLCBjLCBcIlwiLCBtZXJnZXIpLCB7fSlcbiAgKTtcbn1cbmNvbnN0IGRlZnUgPSBjcmVhdGVEZWZ1KCk7XG5jb25zdCBkZWZ1Rm4gPSBjcmVhdGVEZWZ1KChvYmplY3QsIGtleSwgY3VycmVudFZhbHVlKSA9PiB7XG4gIGlmIChvYmplY3Rba2V5XSAhPT0gdm9pZCAwICYmIHR5cGVvZiBjdXJyZW50VmFsdWUgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIG9iamVjdFtrZXldID0gY3VycmVudFZhbHVlKG9iamVjdFtrZXldKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxufSk7XG5jb25zdCBkZWZ1QXJyYXlGbiA9IGNyZWF0ZURlZnUoKG9iamVjdCwga2V5LCBjdXJyZW50VmFsdWUpID0+IHtcbiAgaWYgKEFycmF5LmlzQXJyYXkob2JqZWN0W2tleV0pICYmIHR5cGVvZiBjdXJyZW50VmFsdWUgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIG9iamVjdFtrZXldID0gY3VycmVudFZhbHVlKG9iamVjdFtrZXldKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxufSk7XG5cbmV4cG9ydCB7IGNyZWF0ZURlZnUsIGRlZnUgYXMgZGVmYXVsdCwgZGVmdSwgZGVmdUFycmF5Rm4sIGRlZnVGbiB9O1xuIiwiY29uc3QgaXNFeGlzdCA9IChlbGVtZW50KSA9PiB7XG4gIHJldHVybiBlbGVtZW50ICE9PSBudWxsID8geyBpc0RldGVjdGVkOiB0cnVlLCByZXN1bHQ6IGVsZW1lbnQgfSA6IHsgaXNEZXRlY3RlZDogZmFsc2UgfTtcbn07XG5jb25zdCBpc05vdEV4aXN0ID0gKGVsZW1lbnQpID0+IHtcbiAgcmV0dXJuIGVsZW1lbnQgPT09IG51bGwgPyB7IGlzRGV0ZWN0ZWQ6IHRydWUsIHJlc3VsdDogbnVsbCB9IDogeyBpc0RldGVjdGVkOiBmYWxzZSB9O1xufTtcblxuZXhwb3J0IHsgaXNFeGlzdCwgaXNOb3RFeGlzdCB9O1xuIiwiaW1wb3J0IE1hbnlLZXlzTWFwIGZyb20gJ21hbnkta2V5cy1tYXAnO1xuaW1wb3J0IHsgZGVmdSB9IGZyb20gJ2RlZnUnO1xuaW1wb3J0IHsgaXNFeGlzdCB9IGZyb20gJy4vZGV0ZWN0b3JzLm1qcyc7XG5cbmNvbnN0IGdldERlZmF1bHRPcHRpb25zID0gKCkgPT4gKHtcbiAgdGFyZ2V0OiBnbG9iYWxUaGlzLmRvY3VtZW50LFxuICB1bmlmeVByb2Nlc3M6IHRydWUsXG4gIGRldGVjdG9yOiBpc0V4aXN0LFxuICBvYnNlcnZlQ29uZmlnczoge1xuICAgIGNoaWxkTGlzdDogdHJ1ZSxcbiAgICBzdWJ0cmVlOiB0cnVlLFxuICAgIGF0dHJpYnV0ZXM6IHRydWVcbiAgfSxcbiAgc2lnbmFsOiB2b2lkIDAsXG4gIGN1c3RvbU1hdGNoZXI6IHZvaWQgMFxufSk7XG5jb25zdCBtZXJnZU9wdGlvbnMgPSAodXNlclNpZGVPcHRpb25zLCBkZWZhdWx0T3B0aW9ucykgPT4ge1xuICByZXR1cm4gZGVmdSh1c2VyU2lkZU9wdGlvbnMsIGRlZmF1bHRPcHRpb25zKTtcbn07XG5cbmNvbnN0IHVuaWZ5Q2FjaGUgPSBuZXcgTWFueUtleXNNYXAoKTtcbmZ1bmN0aW9uIGNyZWF0ZVdhaXRFbGVtZW50KGluc3RhbmNlT3B0aW9ucykge1xuICBjb25zdCB7IGRlZmF1bHRPcHRpb25zIH0gPSBpbnN0YW5jZU9wdGlvbnM7XG4gIHJldHVybiAoc2VsZWN0b3IsIG9wdGlvbnMpID0+IHtcbiAgICBjb25zdCB7XG4gICAgICB0YXJnZXQsXG4gICAgICB1bmlmeVByb2Nlc3MsXG4gICAgICBvYnNlcnZlQ29uZmlncyxcbiAgICAgIGRldGVjdG9yLFxuICAgICAgc2lnbmFsLFxuICAgICAgY3VzdG9tTWF0Y2hlclxuICAgIH0gPSBtZXJnZU9wdGlvbnMob3B0aW9ucywgZGVmYXVsdE9wdGlvbnMpO1xuICAgIGNvbnN0IHVuaWZ5UHJvbWlzZUtleSA9IFtcbiAgICAgIHNlbGVjdG9yLFxuICAgICAgdGFyZ2V0LFxuICAgICAgdW5pZnlQcm9jZXNzLFxuICAgICAgb2JzZXJ2ZUNvbmZpZ3MsXG4gICAgICBkZXRlY3RvcixcbiAgICAgIHNpZ25hbCxcbiAgICAgIGN1c3RvbU1hdGNoZXJcbiAgICBdO1xuICAgIGNvbnN0IGNhY2hlZFByb21pc2UgPSB1bmlmeUNhY2hlLmdldCh1bmlmeVByb21pc2VLZXkpO1xuICAgIGlmICh1bmlmeVByb2Nlc3MgJiYgY2FjaGVkUHJvbWlzZSkge1xuICAgICAgcmV0dXJuIGNhY2hlZFByb21pc2U7XG4gICAgfVxuICAgIGNvbnN0IGRldGVjdFByb21pc2UgPSBuZXcgUHJvbWlzZShcbiAgICAgIC8vIGJpb21lLWlnbm9yZSBsaW50L3N1c3BpY2lvdXMvbm9Bc3luY1Byb21pc2VFeGVjdXRvcjogYXZvaWQgbmVzdGluZyBwcm9taXNlXG4gICAgICBhc3luYyAocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGlmIChzaWduYWw/LmFib3J0ZWQpIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0KHNpZ25hbC5yZWFzb24pO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG9ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoXG4gICAgICAgICAgYXN5bmMgKG11dGF0aW9ucykgPT4ge1xuICAgICAgICAgICAgZm9yIChjb25zdCBfIG9mIG11dGF0aW9ucykge1xuICAgICAgICAgICAgICBpZiAoc2lnbmFsPy5hYm9ydGVkKSB7XG4gICAgICAgICAgICAgICAgb2JzZXJ2ZXIuZGlzY29ubmVjdCgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGNvbnN0IGRldGVjdFJlc3VsdDIgPSBhd2FpdCBkZXRlY3RFbGVtZW50KHtcbiAgICAgICAgICAgICAgICBzZWxlY3RvcixcbiAgICAgICAgICAgICAgICB0YXJnZXQsXG4gICAgICAgICAgICAgICAgZGV0ZWN0b3IsXG4gICAgICAgICAgICAgICAgY3VzdG9tTWF0Y2hlclxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgaWYgKGRldGVjdFJlc3VsdDIuaXNEZXRlY3RlZCkge1xuICAgICAgICAgICAgICAgIG9ic2VydmVyLmRpc2Nvbm5lY3QoKTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKGRldGVjdFJlc3VsdDIucmVzdWx0KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgICAgc2lnbmFsPy5hZGRFdmVudExpc3RlbmVyKFxuICAgICAgICAgIFwiYWJvcnRcIixcbiAgICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBvYnNlcnZlci5kaXNjb25uZWN0KCk7XG4gICAgICAgICAgICByZXR1cm4gcmVqZWN0KHNpZ25hbC5yZWFzb24pO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgeyBvbmNlOiB0cnVlIH1cbiAgICAgICAgKTtcbiAgICAgICAgY29uc3QgZGV0ZWN0UmVzdWx0ID0gYXdhaXQgZGV0ZWN0RWxlbWVudCh7XG4gICAgICAgICAgc2VsZWN0b3IsXG4gICAgICAgICAgdGFyZ2V0LFxuICAgICAgICAgIGRldGVjdG9yLFxuICAgICAgICAgIGN1c3RvbU1hdGNoZXJcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChkZXRlY3RSZXN1bHQuaXNEZXRlY3RlZCkge1xuICAgICAgICAgIHJldHVybiByZXNvbHZlKGRldGVjdFJlc3VsdC5yZXN1bHQpO1xuICAgICAgICB9XG4gICAgICAgIG9ic2VydmVyLm9ic2VydmUodGFyZ2V0LCBvYnNlcnZlQ29uZmlncyk7XG4gICAgICB9XG4gICAgKS5maW5hbGx5KCgpID0+IHtcbiAgICAgIHVuaWZ5Q2FjaGUuZGVsZXRlKHVuaWZ5UHJvbWlzZUtleSk7XG4gICAgfSk7XG4gICAgdW5pZnlDYWNoZS5zZXQodW5pZnlQcm9taXNlS2V5LCBkZXRlY3RQcm9taXNlKTtcbiAgICByZXR1cm4gZGV0ZWN0UHJvbWlzZTtcbiAgfTtcbn1cbmFzeW5jIGZ1bmN0aW9uIGRldGVjdEVsZW1lbnQoe1xuICB0YXJnZXQsXG4gIHNlbGVjdG9yLFxuICBkZXRlY3RvcixcbiAgY3VzdG9tTWF0Y2hlclxufSkge1xuICBjb25zdCBlbGVtZW50ID0gY3VzdG9tTWF0Y2hlciA/IGN1c3RvbU1hdGNoZXIoc2VsZWN0b3IpIDogdGFyZ2V0LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICByZXR1cm4gYXdhaXQgZGV0ZWN0b3IoZWxlbWVudCk7XG59XG5jb25zdCB3YWl0RWxlbWVudCA9IGNyZWF0ZVdhaXRFbGVtZW50KHtcbiAgZGVmYXVsdE9wdGlvbnM6IGdldERlZmF1bHRPcHRpb25zKClcbn0pO1xuXG5leHBvcnQgeyBjcmVhdGVXYWl0RWxlbWVudCwgZ2V0RGVmYXVsdE9wdGlvbnMsIHdhaXRFbGVtZW50IH07XG4iLCJpbXBvcnQgeyBicm93c2VyIH0gZnJvbSBcInd4dC9icm93c2VyXCI7XG5pbXBvcnQgeyB3YWl0RWxlbWVudCB9IGZyb20gXCJAMW5hdHN1L3dhaXQtZWxlbWVudFwiO1xuaW1wb3J0IHtcbiAgaXNFeGlzdCBhcyBtb3VudERldGVjdG9yLFxuICBpc05vdEV4aXN0IGFzIHJlbW92ZURldGVjdG9yXG59IGZyb20gXCJAMW5hdHN1L3dhaXQtZWxlbWVudC9kZXRlY3RvcnNcIjtcbmltcG9ydCB7IGxvZ2dlciB9IGZyb20gXCIuLi8uLi8uLi9zYW5kYm94L3V0aWxzL2xvZ2dlci5tanNcIjtcbmltcG9ydCB7IGNyZWF0ZUlzb2xhdGVkRWxlbWVudCB9IGZyb20gXCJAd2ViZXh0LWNvcmUvaXNvbGF0ZWQtZWxlbWVudFwiO1xuZXhwb3J0ICogZnJvbSBcIi4vdHlwZXMubWpzXCI7XG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlSW50ZWdyYXRlZFVpKGN0eCwgb3B0aW9ucykge1xuICBjb25zdCB3cmFwcGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChvcHRpb25zLnRhZyB8fCBcImRpdlwiKTtcbiAgd3JhcHBlci5zZXRBdHRyaWJ1dGUoXCJkYXRhLXd4dC1pbnRlZ3JhdGVkXCIsIFwiXCIpO1xuICBsZXQgbW91bnRlZCA9IHZvaWQgMDtcbiAgY29uc3QgbW91bnQgPSAoKSA9PiB7XG4gICAgYXBwbHlQb3NpdGlvbih3cmFwcGVyLCB2b2lkIDAsIG9wdGlvbnMpO1xuICAgIG1vdW50VWkod3JhcHBlciwgb3B0aW9ucyk7XG4gICAgbW91bnRlZCA9IG9wdGlvbnMub25Nb3VudD8uKHdyYXBwZXIpO1xuICB9O1xuICBjb25zdCByZW1vdmUgPSAoKSA9PiB7XG4gICAgb3B0aW9ucy5vblJlbW92ZT8uKG1vdW50ZWQpO1xuICAgIHdyYXBwZXIucmVwbGFjZUNoaWxkcmVuKCk7XG4gICAgd3JhcHBlci5yZW1vdmUoKTtcbiAgICBtb3VudGVkID0gdm9pZCAwO1xuICB9O1xuICBjb25zdCBtb3VudEZ1bmN0aW9ucyA9IGNyZWF0ZU1vdW50RnVuY3Rpb25zKFxuICAgIHtcbiAgICAgIG1vdW50LFxuICAgICAgcmVtb3ZlXG4gICAgfSxcbiAgICBvcHRpb25zXG4gICk7XG4gIGN0eC5vbkludmFsaWRhdGVkKHJlbW92ZSk7XG4gIHJldHVybiB7XG4gICAgZ2V0IG1vdW50ZWQoKSB7XG4gICAgICByZXR1cm4gbW91bnRlZDtcbiAgICB9LFxuICAgIHdyYXBwZXIsXG4gICAgLi4ubW91bnRGdW5jdGlvbnNcbiAgfTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVJZnJhbWVVaShjdHgsIG9wdGlvbnMpIHtcbiAgY29uc3Qgd3JhcHBlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gIHdyYXBwZXIuc2V0QXR0cmlidXRlKFwiZGF0YS13eHQtaWZyYW1lXCIsIFwiXCIpO1xuICBjb25zdCBpZnJhbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaWZyYW1lXCIpO1xuICBpZnJhbWUuc3JjID0gYnJvd3Nlci5ydW50aW1lLmdldFVSTChvcHRpb25zLnBhZ2UpO1xuICB3cmFwcGVyLmFwcGVuZENoaWxkKGlmcmFtZSk7XG4gIGxldCBtb3VudGVkID0gdm9pZCAwO1xuICBjb25zdCBtb3VudCA9ICgpID0+IHtcbiAgICBhcHBseVBvc2l0aW9uKHdyYXBwZXIsIGlmcmFtZSwgb3B0aW9ucyk7XG4gICAgbW91bnRVaSh3cmFwcGVyLCBvcHRpb25zKTtcbiAgICBtb3VudGVkID0gb3B0aW9ucy5vbk1vdW50Py4od3JhcHBlciwgaWZyYW1lKTtcbiAgfTtcbiAgY29uc3QgcmVtb3ZlID0gKCkgPT4ge1xuICAgIG9wdGlvbnMub25SZW1vdmU/Lihtb3VudGVkKTtcbiAgICB3cmFwcGVyLnJlbW92ZSgpO1xuICAgIG1vdW50ZWQgPSB2b2lkIDA7XG4gIH07XG4gIGNvbnN0IG1vdW50RnVuY3Rpb25zID0gY3JlYXRlTW91bnRGdW5jdGlvbnMoXG4gICAge1xuICAgICAgbW91bnQsXG4gICAgICByZW1vdmVcbiAgICB9LFxuICAgIG9wdGlvbnNcbiAgKTtcbiAgY3R4Lm9uSW52YWxpZGF0ZWQocmVtb3ZlKTtcbiAgcmV0dXJuIHtcbiAgICBnZXQgbW91bnRlZCgpIHtcbiAgICAgIHJldHVybiBtb3VudGVkO1xuICAgIH0sXG4gICAgaWZyYW1lLFxuICAgIHdyYXBwZXIsXG4gICAgLi4ubW91bnRGdW5jdGlvbnNcbiAgfTtcbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjcmVhdGVTaGFkb3dSb290VWkoY3R4LCBvcHRpb25zKSB7XG4gIGNvbnN0IGNzcyA9IFtvcHRpb25zLmNzcyA/PyBcIlwiXTtcbiAgaWYgKGN0eC5vcHRpb25zPy5jc3NJbmplY3Rpb25Nb2RlID09PSBcInVpXCIpIHtcbiAgICBjb25zdCBlbnRyeUNzcyA9IGF3YWl0IGxvYWRDc3MoKTtcbiAgICBjc3MucHVzaChlbnRyeUNzcy5yZXBsYWNlQWxsKFwiOnJvb3RcIiwgXCI6aG9zdFwiKSk7XG4gIH1cbiAgY29uc3Qge1xuICAgIGlzb2xhdGVkRWxlbWVudDogdWlDb250YWluZXIsXG4gICAgcGFyZW50RWxlbWVudDogc2hhZG93SG9zdCxcbiAgICBzaGFkb3dcbiAgfSA9IGF3YWl0IGNyZWF0ZUlzb2xhdGVkRWxlbWVudCh7XG4gICAgbmFtZTogb3B0aW9ucy5uYW1lLFxuICAgIGNzczoge1xuICAgICAgdGV4dENvbnRlbnQ6IGNzcy5qb2luKFwiXFxuXCIpLnRyaW0oKVxuICAgIH0sXG4gICAgbW9kZTogb3B0aW9ucy5tb2RlID8/IFwib3BlblwiLFxuICAgIGlzb2xhdGVFdmVudHM6IG9wdGlvbnMuaXNvbGF0ZUV2ZW50c1xuICB9KTtcbiAgc2hhZG93SG9zdC5zZXRBdHRyaWJ1dGUoXCJkYXRhLXd4dC1zaGFkb3ctcm9vdFwiLCBcIlwiKTtcbiAgbGV0IG1vdW50ZWQ7XG4gIGNvbnN0IG1vdW50ID0gKCkgPT4ge1xuICAgIG1vdW50VWkoc2hhZG93SG9zdCwgb3B0aW9ucyk7XG4gICAgYXBwbHlQb3NpdGlvbihzaGFkb3dIb3N0LCBzaGFkb3cucXVlcnlTZWxlY3RvcihcImh0bWxcIiksIG9wdGlvbnMpO1xuICAgIG1vdW50ZWQgPSBvcHRpb25zLm9uTW91bnQodWlDb250YWluZXIsIHNoYWRvdywgc2hhZG93SG9zdCk7XG4gIH07XG4gIGNvbnN0IHJlbW92ZSA9ICgpID0+IHtcbiAgICBvcHRpb25zLm9uUmVtb3ZlPy4obW91bnRlZCk7XG4gICAgc2hhZG93SG9zdC5yZW1vdmUoKTtcbiAgICB3aGlsZSAodWlDb250YWluZXIubGFzdENoaWxkKVxuICAgICAgdWlDb250YWluZXIucmVtb3ZlQ2hpbGQodWlDb250YWluZXIubGFzdENoaWxkKTtcbiAgICBtb3VudGVkID0gdm9pZCAwO1xuICB9O1xuICBjb25zdCBtb3VudEZ1bmN0aW9ucyA9IGNyZWF0ZU1vdW50RnVuY3Rpb25zKFxuICAgIHtcbiAgICAgIG1vdW50LFxuICAgICAgcmVtb3ZlXG4gICAgfSxcbiAgICBvcHRpb25zXG4gICk7XG4gIGN0eC5vbkludmFsaWRhdGVkKHJlbW92ZSk7XG4gIHJldHVybiB7XG4gICAgc2hhZG93LFxuICAgIHNoYWRvd0hvc3QsXG4gICAgdWlDb250YWluZXIsXG4gICAgLi4ubW91bnRGdW5jdGlvbnMsXG4gICAgZ2V0IG1vdW50ZWQoKSB7XG4gICAgICByZXR1cm4gbW91bnRlZDtcbiAgICB9XG4gIH07XG59XG5mdW5jdGlvbiBhcHBseVBvc2l0aW9uKHJvb3QsIHBvc2l0aW9uZWRFbGVtZW50LCBvcHRpb25zKSB7XG4gIGlmIChvcHRpb25zLnBvc2l0aW9uID09PSBcImlubGluZVwiKSByZXR1cm47XG4gIGlmIChvcHRpb25zLnpJbmRleCAhPSBudWxsKSByb290LnN0eWxlLnpJbmRleCA9IFN0cmluZyhvcHRpb25zLnpJbmRleCk7XG4gIHJvb3Quc3R5bGUub3ZlcmZsb3cgPSBcInZpc2libGVcIjtcbiAgcm9vdC5zdHlsZS5wb3NpdGlvbiA9IFwicmVsYXRpdmVcIjtcbiAgcm9vdC5zdHlsZS53aWR0aCA9IFwiMFwiO1xuICByb290LnN0eWxlLmhlaWdodCA9IFwiMFwiO1xuICByb290LnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XG4gIGlmIChwb3NpdGlvbmVkRWxlbWVudCkge1xuICAgIGlmIChvcHRpb25zLnBvc2l0aW9uID09PSBcIm92ZXJsYXlcIikge1xuICAgICAgcG9zaXRpb25lZEVsZW1lbnQuc3R5bGUucG9zaXRpb24gPSBcImFic29sdXRlXCI7XG4gICAgICBpZiAob3B0aW9ucy5hbGlnbm1lbnQ/LnN0YXJ0c1dpdGgoXCJib3R0b20tXCIpKVxuICAgICAgICBwb3NpdGlvbmVkRWxlbWVudC5zdHlsZS5ib3R0b20gPSBcIjBcIjtcbiAgICAgIGVsc2UgcG9zaXRpb25lZEVsZW1lbnQuc3R5bGUudG9wID0gXCIwXCI7XG4gICAgICBpZiAob3B0aW9ucy5hbGlnbm1lbnQ/LmVuZHNXaXRoKFwiLXJpZ2h0XCIpKVxuICAgICAgICBwb3NpdGlvbmVkRWxlbWVudC5zdHlsZS5yaWdodCA9IFwiMFwiO1xuICAgICAgZWxzZSBwb3NpdGlvbmVkRWxlbWVudC5zdHlsZS5sZWZ0ID0gXCIwXCI7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBvc2l0aW9uZWRFbGVtZW50LnN0eWxlLnBvc2l0aW9uID0gXCJmaXhlZFwiO1xuICAgICAgcG9zaXRpb25lZEVsZW1lbnQuc3R5bGUudG9wID0gXCIwXCI7XG4gICAgICBwb3NpdGlvbmVkRWxlbWVudC5zdHlsZS5ib3R0b20gPSBcIjBcIjtcbiAgICAgIHBvc2l0aW9uZWRFbGVtZW50LnN0eWxlLmxlZnQgPSBcIjBcIjtcbiAgICAgIHBvc2l0aW9uZWRFbGVtZW50LnN0eWxlLnJpZ2h0ID0gXCIwXCI7XG4gICAgfVxuICB9XG59XG5mdW5jdGlvbiBnZXRBbmNob3Iob3B0aW9ucykge1xuICBpZiAob3B0aW9ucy5hbmNob3IgPT0gbnVsbCkgcmV0dXJuIGRvY3VtZW50LmJvZHk7XG4gIGxldCByZXNvbHZlZCA9IHR5cGVvZiBvcHRpb25zLmFuY2hvciA9PT0gXCJmdW5jdGlvblwiID8gb3B0aW9ucy5hbmNob3IoKSA6IG9wdGlvbnMuYW5jaG9yO1xuICBpZiAodHlwZW9mIHJlc29sdmVkID09PSBcInN0cmluZ1wiKSB7XG4gICAgaWYgKHJlc29sdmVkLnN0YXJ0c1dpdGgoXCIvXCIpKSB7XG4gICAgICBjb25zdCByZXN1bHQgPSBkb2N1bWVudC5ldmFsdWF0ZShcbiAgICAgICAgcmVzb2x2ZWQsXG4gICAgICAgIGRvY3VtZW50LFxuICAgICAgICBudWxsLFxuICAgICAgICBYUGF0aFJlc3VsdC5GSVJTVF9PUkRFUkVEX05PREVfVFlQRSxcbiAgICAgICAgbnVsbFxuICAgICAgKTtcbiAgICAgIHJldHVybiByZXN1bHQuc2luZ2xlTm9kZVZhbHVlID8/IHZvaWQgMDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IocmVzb2x2ZWQpID8/IHZvaWQgMDtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc29sdmVkID8/IHZvaWQgMDtcbn1cbmZ1bmN0aW9uIG1vdW50VWkocm9vdCwgb3B0aW9ucykge1xuICBjb25zdCBhbmNob3IgPSBnZXRBbmNob3Iob3B0aW9ucyk7XG4gIGlmIChhbmNob3IgPT0gbnVsbClcbiAgICB0aHJvdyBFcnJvcihcbiAgICAgIFwiRmFpbGVkIHRvIG1vdW50IGNvbnRlbnQgc2NyaXB0IFVJOiBjb3VsZCBub3QgZmluZCBhbmNob3IgZWxlbWVudFwiXG4gICAgKTtcbiAgc3dpdGNoIChvcHRpb25zLmFwcGVuZCkge1xuICAgIGNhc2Ugdm9pZCAwOlxuICAgIGNhc2UgXCJsYXN0XCI6XG4gICAgICBhbmNob3IuYXBwZW5kKHJvb3QpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSBcImZpcnN0XCI6XG4gICAgICBhbmNob3IucHJlcGVuZChyb290KTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgXCJyZXBsYWNlXCI6XG4gICAgICBhbmNob3IucmVwbGFjZVdpdGgocm9vdCk7XG4gICAgICBicmVhaztcbiAgICBjYXNlIFwiYWZ0ZXJcIjpcbiAgICAgIGFuY2hvci5wYXJlbnRFbGVtZW50Py5pbnNlcnRCZWZvcmUocm9vdCwgYW5jaG9yLm5leHRFbGVtZW50U2libGluZyk7XG4gICAgICBicmVhaztcbiAgICBjYXNlIFwiYmVmb3JlXCI6XG4gICAgICBhbmNob3IucGFyZW50RWxlbWVudD8uaW5zZXJ0QmVmb3JlKHJvb3QsIGFuY2hvcik7XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgb3B0aW9ucy5hcHBlbmQoYW5jaG9yLCByb290KTtcbiAgICAgIGJyZWFrO1xuICB9XG59XG5mdW5jdGlvbiBjcmVhdGVNb3VudEZ1bmN0aW9ucyhiYXNlRnVuY3Rpb25zLCBvcHRpb25zKSB7XG4gIGxldCBhdXRvTW91bnRJbnN0YW5jZSA9IHZvaWQgMDtcbiAgY29uc3Qgc3RvcEF1dG9Nb3VudCA9ICgpID0+IHtcbiAgICBhdXRvTW91bnRJbnN0YW5jZT8uc3RvcEF1dG9Nb3VudCgpO1xuICAgIGF1dG9Nb3VudEluc3RhbmNlID0gdm9pZCAwO1xuICB9O1xuICBjb25zdCBtb3VudCA9ICgpID0+IHtcbiAgICBiYXNlRnVuY3Rpb25zLm1vdW50KCk7XG4gIH07XG4gIGNvbnN0IHVubW91bnQgPSBiYXNlRnVuY3Rpb25zLnJlbW92ZTtcbiAgY29uc3QgcmVtb3ZlID0gKCkgPT4ge1xuICAgIHN0b3BBdXRvTW91bnQoKTtcbiAgICBiYXNlRnVuY3Rpb25zLnJlbW92ZSgpO1xuICB9O1xuICBjb25zdCBhdXRvTW91bnQgPSAoYXV0b01vdW50T3B0aW9ucykgPT4ge1xuICAgIGlmIChhdXRvTW91bnRJbnN0YW5jZSkge1xuICAgICAgbG9nZ2VyLndhcm4oXCJhdXRvTW91bnQgaXMgYWxyZWFkeSBzZXQuXCIpO1xuICAgIH1cbiAgICBhdXRvTW91bnRJbnN0YW5jZSA9IGF1dG9Nb3VudFVpKFxuICAgICAgeyBtb3VudCwgdW5tb3VudCwgc3RvcEF1dG9Nb3VudCB9LFxuICAgICAge1xuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICAuLi5hdXRvTW91bnRPcHRpb25zXG4gICAgICB9XG4gICAgKTtcbiAgfTtcbiAgcmV0dXJuIHtcbiAgICBtb3VudCxcbiAgICByZW1vdmUsXG4gICAgYXV0b01vdW50XG4gIH07XG59XG5mdW5jdGlvbiBhdXRvTW91bnRVaSh1aUNhbGxiYWNrcywgb3B0aW9ucykge1xuICBjb25zdCBhYm9ydENvbnRyb2xsZXIgPSBuZXcgQWJvcnRDb250cm9sbGVyKCk7XG4gIGNvbnN0IEVYUExJQ0lUX1NUT1BfUkVBU09OID0gXCJleHBsaWNpdF9zdG9wX2F1dG9fbW91bnRcIjtcbiAgY29uc3QgX3N0b3BBdXRvTW91bnQgPSAoKSA9PiB7XG4gICAgYWJvcnRDb250cm9sbGVyLmFib3J0KEVYUExJQ0lUX1NUT1BfUkVBU09OKTtcbiAgICBvcHRpb25zLm9uU3RvcD8uKCk7XG4gIH07XG4gIGxldCByZXNvbHZlZEFuY2hvciA9IHR5cGVvZiBvcHRpb25zLmFuY2hvciA9PT0gXCJmdW5jdGlvblwiID8gb3B0aW9ucy5hbmNob3IoKSA6IG9wdGlvbnMuYW5jaG9yO1xuICBpZiAocmVzb2x2ZWRBbmNob3IgaW5zdGFuY2VvZiBFbGVtZW50KSB7XG4gICAgdGhyb3cgRXJyb3IoXG4gICAgICBcImF1dG9Nb3VudCBhbmQgRWxlbWVudCBhbmNob3Igb3B0aW9uIGNhbm5vdCBiZSBjb21iaW5lZC4gQXZvaWQgcGFzc2luZyBgRWxlbWVudGAgZGlyZWN0bHkgb3IgYCgpID0+IEVsZW1lbnRgIHRvIHRoZSBhbmNob3IuXCJcbiAgICApO1xuICB9XG4gIGFzeW5jIGZ1bmN0aW9uIG9ic2VydmVFbGVtZW50KHNlbGVjdG9yKSB7XG4gICAgbGV0IGlzQW5jaG9yRXhpc3QgPSAhIWdldEFuY2hvcihvcHRpb25zKTtcbiAgICBpZiAoaXNBbmNob3JFeGlzdCkge1xuICAgICAgdWlDYWxsYmFja3MubW91bnQoKTtcbiAgICB9XG4gICAgd2hpbGUgKCFhYm9ydENvbnRyb2xsZXIuc2lnbmFsLmFib3J0ZWQpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGNoYW5nZWRBbmNob3IgPSBhd2FpdCB3YWl0RWxlbWVudChzZWxlY3RvciA/PyBcImJvZHlcIiwge1xuICAgICAgICAgIGN1c3RvbU1hdGNoZXI6ICgpID0+IGdldEFuY2hvcihvcHRpb25zKSA/PyBudWxsLFxuICAgICAgICAgIGRldGVjdG9yOiBpc0FuY2hvckV4aXN0ID8gcmVtb3ZlRGV0ZWN0b3IgOiBtb3VudERldGVjdG9yLFxuICAgICAgICAgIHNpZ25hbDogYWJvcnRDb250cm9sbGVyLnNpZ25hbFxuICAgICAgICB9KTtcbiAgICAgICAgaXNBbmNob3JFeGlzdCA9ICEhY2hhbmdlZEFuY2hvcjtcbiAgICAgICAgaWYgKGlzQW5jaG9yRXhpc3QpIHtcbiAgICAgICAgICB1aUNhbGxiYWNrcy5tb3VudCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHVpQ2FsbGJhY2tzLnVubW91bnQoKTtcbiAgICAgICAgICBpZiAob3B0aW9ucy5vbmNlKSB7XG4gICAgICAgICAgICB1aUNhbGxiYWNrcy5zdG9wQXV0b01vdW50KCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBpZiAoYWJvcnRDb250cm9sbGVyLnNpZ25hbC5hYm9ydGVkICYmIGFib3J0Q29udHJvbGxlci5zaWduYWwucmVhc29uID09PSBFWFBMSUNJVF9TVE9QX1JFQVNPTikge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIG9ic2VydmVFbGVtZW50KHJlc29sdmVkQW5jaG9yKTtcbiAgcmV0dXJuIHsgc3RvcEF1dG9Nb3VudDogX3N0b3BBdXRvTW91bnQgfTtcbn1cbmFzeW5jIGZ1bmN0aW9uIGxvYWRDc3MoKSB7XG4gIGNvbnN0IHVybCA9IGJyb3dzZXIucnVudGltZS5nZXRVUkwoXG4gICAgYC9jb250ZW50LXNjcmlwdHMvJHtpbXBvcnQubWV0YS5lbnYuRU5UUllQT0lOVH0uY3NzYFxuICApO1xuICB0cnkge1xuICAgIGNvbnN0IHJlcyA9IGF3YWl0IGZldGNoKHVybCk7XG4gICAgcmV0dXJuIGF3YWl0IHJlcy50ZXh0KCk7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGxvZ2dlci53YXJuKFxuICAgICAgYEZhaWxlZCB0byBsb2FkIHN0eWxlcyBAICR7dXJsfS4gRGlkIHlvdSBmb3JnZXQgdG8gaW1wb3J0IHRoZSBzdHlsZXNoZWV0IGluIHlvdXIgZW50cnlwb2ludD9gLFxuICAgICAgZXJyXG4gICAgKTtcbiAgICByZXR1cm4gXCJcIjtcbiAgfVxufVxuIiwiLy8gU2lkZWJhciBtYW5hZ2VtZW50IG1vZHVsZVxuXG5pbXBvcnQgeyBjcmVhdGVJZnJhbWVVaSB9IGZyb20gJ3d4dC9jbGllbnQnO1xuXG5leHBvcnQgY2xhc3MgU2lkZWJhck1hbmFnZXIge1xuICBwcml2YXRlIHVpOiBhbnkgPSBudWxsO1xuICBwcml2YXRlIGlzVmlzaWJsZSA9IGZhbHNlO1xuICBwcml2YXRlIGlzUGlubmVkID0gZmFsc2U7XG4gIHByaXZhdGUgY3R4OiBhbnk7XG5cbiAgY29uc3RydWN0b3IoY3R4OiBhbnkpIHtcbiAgICB0aGlzLmN0eCA9IGN0eDtcbiAgICB0aGlzLnNldHVwRXZlbnRMaXN0ZW5lcnMoKTtcbiAgfVxuXG4gIHByaXZhdGUgc2V0dXBFdmVudExpc3RlbmVycygpIHtcbiAgICAvLyBMaXN0ZW4gZm9yIEVTQyBrZXkgdG8gY2xvc2Ugc2lkZWJhclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCAoZSkgPT4ge1xuICAgICAgaWYgKGUua2V5ID09PSAnRXNjYXBlJyAmJiB0aGlzLmlzVmlzaWJsZSkge1xuICAgICAgICB0aGlzLmhpZGUoKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIExpc3RlbiBmb3IgbWVzc2FnZXMgZnJvbSBpZnJhbWVcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIChldmVudCkgPT4ge1xuICAgICAgaWYgKGV2ZW50LmRhdGEudHlwZSA9PT0gJ1NUQVJUX1NNQVJUX0NBUFRVUkUnKSB7XG4gICAgICAgIHRoaXMuaGFuZGxlU21hcnRDYXB0dXJlKCk7XG4gICAgICB9IGVsc2UgaWYgKGV2ZW50LmRhdGEudHlwZSA9PT0gJ0NMT1NFX1NJREVCQVInKSB7XG4gICAgICAgIHRoaXMuaGlkZSgpO1xuICAgICAgfSBlbHNlIGlmIChldmVudC5kYXRhLnR5cGUgPT09ICdUT0dHTEVfUElOX01PREUnKSB7XG4gICAgICAgIHRoaXMudG9nZ2xlUGluTW9kZSgpO1xuICAgICAgfSBlbHNlIGlmIChldmVudC5kYXRhLnR5cGUgPT09ICdHRVRfQ1VSUkVOVF9VUkwnKSB7XG4gICAgICAgIHRoaXMuaGFuZGxlR2V0Q3VycmVudFVybCgpO1xuICAgICAgfSBlbHNlIGlmIChldmVudC5kYXRhLnR5cGUgPT09ICdHRVRfUEFHRV9DT05URU5UJykge1xuICAgICAgICB0aGlzLmhhbmRsZUdldFBhZ2VDb250ZW50KCk7XG4gICAgICB9IGVsc2UgaWYgKGV2ZW50LmRhdGEudHlwZSA9PT0gJ0dFVF9QQUdFX0lORk8nKSB7XG4gICAgICAgIHRoaXMuaGFuZGxlR2V0UGFnZUluZm8oKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgaGFuZGxlU21hcnRDYXB0dXJlKCkge1xuICAgIHRyeSB7XG4gICAgICAvLyBIaWRlIHNpZGViYXIgZm9yIHNjcmVlbnNob3RcbiAgICAgIHRoaXMuaGlkZSgpO1xuICAgICAgXG4gICAgICAvLyBXYWl0IGZvciBzaWRlYmFyIGhpZGUgYW5pbWF0aW9uIHRvIGNvbXBsZXRlXG4gICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMzUwKSk7XG4gICAgICBcbiAgICAgIC8vIFNlbmQgbWVzc2FnZSB0byBiYWNrZ3JvdW5kIHNjcmlwdCB0byBzdGFydCBzbWFydCBjYXB0dXJlXG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHtcbiAgICAgICAgYWN0aW9uOiAnU1RBUlRfQ0FQVFVSRSdcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UuZGF0YVVybCkge1xuICAgICAgICB0aGlzLnVwZGF0ZVdpdGhDYXB0dXJlKHJlc3BvbnNlLmRhdGFVcmwpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdTbWFydCBjYXB0dXJlIGZhaWxlZDonLCBlcnJvcik7XG4gICAgICAvLyBJZiBlcnJvciBvY2N1cnMsIHNob3cgc2lkZWJhciBhZ2FpblxuICAgICAgdGhpcy5zaG93KCk7XG4gICAgfVxuICB9XG5cbiAgY3JlYXRlKCkge1xuICAgIGlmICh0aGlzLnVpKSByZXR1cm47XG5cbiAgICAvLyBVc2UgY3JlYXRlSWZyYW1lVWkgdG8gY3JlYXRlIGlmcmFtZSBzaWRlYmFyXG4gICAgdGhpcy51aSA9IGNyZWF0ZUlmcmFtZVVpKHRoaXMuY3R4LCB7XG4gICAgICBwYWdlOiAnL3NpZGViYXIuaHRtbCcsXG4gICAgICBwb3NpdGlvbjogJ292ZXJsYXknLFxuICAgICAgb25Nb3VudDogKHdyYXBwZXIsIGlmcmFtZSkgPT4ge1xuICAgICAgICB0aGlzLnVwZGF0ZVdyYXBwZXJTdHlsZXMod3JhcHBlcik7XG4gICAgICAgIFxuICAgICAgICBpZnJhbWUuc3R5bGUuY3NzVGV4dCA9IGBcbiAgICAgICAgICB3aWR0aDogMTAwJTtcbiAgICAgICAgICBoZWlnaHQ6IDEwMCU7XG4gICAgICAgICAgYm9yZGVyOiBub25lO1xuICAgICAgICAgIGJvcmRlci1sZWZ0OiAxcHggc29saWQgI2U1ZTdlYjtcbiAgICAgICAgICBib3gtc2hhZG93OiAtNHB4IDAgMjBweCByZ2JhKDAsIDAsIDAsIDAuMSk7XG4gICAgICAgICAgYmFja2dyb3VuZDogd2hpdGU7XG4gICAgICAgIGA7XG4gICAgICAgIFxuICAgICAgICAvLyBDbG9zZSBidXR0b24gaXMgYWxyZWFkeSBpbXBsZW1lbnRlZCBpbiBBcHAudHN4LCBubyBuZWVkIHRvIGFkZCBhZ2FpblxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSB1cGRhdGVXcmFwcGVyU3R5bGVzKHdyYXBwZXI6IEhUTUxFbGVtZW50KSB7XG4gICAgaWYgKHRoaXMuaXNQaW5uZWQpIHtcbiAgICAgIC8vIFBpbm5lZCBtb2RlOiBzaWRlYmFyIGVtYmVkZGVkIGluIHBhZ2UsIHBhZ2UgY29udGVudCBtb3ZlcyBsZWZ0XG4gICAgICB3cmFwcGVyLnN0eWxlLmNzc1RleHQgPSBgXG4gICAgICAgIHBvc2l0aW9uOiBmaXhlZDtcbiAgICAgICAgdG9wOiAwO1xuICAgICAgICByaWdodDogMDtcbiAgICAgICAgd2lkdGg6IDQ2MHB4O1xuICAgICAgICBoZWlnaHQ6IDEwMHZoO1xuICAgICAgICB6LWluZGV4OiAyMTQ3NDgzNjQ3O1xuICAgICAgICB0cmFuc2l0aW9uOiBhbGwgMC4zcyBlYXNlLWluLW91dDtcbiAgICAgIGA7XG4gICAgICBcbiAgICAgIC8vIEFkanVzdCBwYWdlIGNvbnRlbnRcbiAgICAgIGRvY3VtZW50LmJvZHkuc3R5bGUubWFyZ2luUmlnaHQgPSAnNDYwcHgnO1xuICAgICAgZG9jdW1lbnQuYm9keS5zdHlsZS50cmFuc2l0aW9uID0gJ21hcmdpbi1yaWdodCAwLjNzIGVhc2UtaW4tb3V0JztcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gRmxvYXRpbmcgbW9kZTogc2lkZWJhciBvdmVybGF5cyBvbiBwYWdlXG4gICAgICB3cmFwcGVyLnN0eWxlLmNzc1RleHQgPSBgXG4gICAgICAgIHBvc2l0aW9uOiBmaXhlZDtcbiAgICAgICAgdG9wOiAwO1xuICAgICAgICByaWdodDogJHt0aGlzLmlzVmlzaWJsZSA/ICcwcHgnIDogJy00NjBweCd9O1xuICAgICAgICB3aWR0aDogNDYwcHg7XG4gICAgICAgIGhlaWdodDogMTAwdmg7XG4gICAgICAgIHotaW5kZXg6IDIxNDc0ODM2NDc7XG4gICAgICAgIHRyYW5zaXRpb246IHJpZ2h0IDAuM3MgZWFzZS1pbi1vdXQ7XG4gICAgICBgO1xuICAgICAgXG4gICAgICAvLyBSZXN0b3JlIHBhZ2UgY29udGVudFxuICAgICAgZG9jdW1lbnQuYm9keS5zdHlsZS5tYXJnaW5SaWdodCA9ICcwJztcbiAgICB9XG4gIH1cblxuXG5cblxuXG4gIHNob3coKSB7XG4gICAgaWYgKCF0aGlzLnVpKSB7XG4gICAgICB0aGlzLmNyZWF0ZSgpO1xuICAgIH1cbiAgICBcbiAgICBpZiAodGhpcy51aSkge1xuICAgICAgdGhpcy51aS5tb3VudCgpO1xuICAgICAgLy8gR2V0IHdyYXBwZXIgZWxlbWVudCBhbmQgc2V0IHN0eWxlc1xuICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIGNvbnN0IHdyYXBwZXIgPSB0aGlzLnVpLndyYXBwZXI7XG4gICAgICAgIGlmICh3cmFwcGVyKSB7XG4gICAgICAgICAgdGhpcy51cGRhdGVXcmFwcGVyU3R5bGVzKHdyYXBwZXIpO1xuICAgICAgICB9XG4gICAgICB9LCAwKTtcbiAgICAgIHRoaXMuaXNWaXNpYmxlID0gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICBoaWRlKCkge1xuICAgIGlmICh0aGlzLnVpICYmIHRoaXMudWkud3JhcHBlcikge1xuICAgICAgaWYgKHRoaXMuaXNQaW5uZWQpIHtcbiAgICAgICAgLy8gSGlkZSBzaWRlYmFyIGFuZCByZXN0b3JlIHBhZ2UgbGF5b3V0IGluIHBpbm5lZCBtb2RlXG4gICAgICAgIHRoaXMudWkud3JhcHBlci5zdHlsZS5yaWdodCA9ICctNDYwcHgnO1xuICAgICAgICBkb2N1bWVudC5ib2R5LnN0eWxlLm1hcmdpblJpZ2h0ID0gJzAnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gSGlkZSBzaWRlYmFyIGluIGZsb2F0aW5nIG1vZGVcbiAgICAgICAgdGhpcy51aS53cmFwcGVyLnN0eWxlLnJpZ2h0ID0gJy00NjBweCc7XG4gICAgICB9XG4gICAgICBcbiAgICAgIHRoaXMuaXNWaXNpYmxlID0gZmFsc2U7XG4gICAgICAvLyBEZWxheSB1bm1vdW50aW5nIHRvIGFsbG93IGFuaW1hdGlvbiB0byBjb21wbGV0ZVxuICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIGlmICh0aGlzLnVpKSB7XG4gICAgICAgICAgdGhpcy51aS5yZW1vdmUoKTtcbiAgICAgICAgfVxuICAgICAgfSwgMzAwKTtcbiAgICB9XG4gIH1cblxuICB0b2dnbGUoKSB7XG4gICAgaWYgKHRoaXMuaXNWaXNpYmxlKSB7XG4gICAgICB0aGlzLmhpZGUoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zaG93KCk7XG4gICAgfVxuICB9XG5cbiAgdXBkYXRlV2l0aENhcHR1cmUoZGF0YVVybDogc3RyaW5nKSB7XG4gICAgLy8gU2VuZCBkYXRhIHRvIGlmcmFtZSB2aWEgcG9zdE1lc3NhZ2VcbiAgICBpZiAodGhpcy51aSAmJiB0aGlzLnVpLmlmcmFtZSkge1xuICAgICAgdGhpcy51aS5pZnJhbWUuY29udGVudFdpbmRvdz8ucG9zdE1lc3NhZ2Uoe1xuICAgICAgICB0eXBlOiAnQ0FQVFVSRV9EQVRBJyxcbiAgICAgICAgZGF0YTogZGF0YVVybFxuICAgICAgfSwgJyonKTtcbiAgICB9XG4gICAgLy8gSWYgc2lkZWJhciBpcyBub3Qgb3BlbiwgYXV0b21hdGljYWxseSBvcGVuIGl0XG4gICAgaWYgKCF0aGlzLmlzVmlzaWJsZSkge1xuICAgICAgdGhpcy5zaG93KCk7XG4gICAgfVxuICB9XG5cbiAgdG9nZ2xlUGluTW9kZSgpIHtcbiAgICB0aGlzLmlzUGlubmVkID0gIXRoaXMuaXNQaW5uZWQ7XG4gICAgXG4gICAgLy8gSWYgc2lkZWJhciBpcyBjdXJyZW50bHkgdmlzaWJsZSwgcmVhcHBseSBzdHlsZXNcbiAgICBpZiAodGhpcy5pc1Zpc2libGUgJiYgdGhpcy51aSAmJiB0aGlzLnVpLndyYXBwZXIpIHtcbiAgICAgIHRoaXMudXBkYXRlV3JhcHBlclN0eWxlcyh0aGlzLnVpLndyYXBwZXIpO1xuICAgIH1cbiAgICBcbiAgICAvLyBOb3RpZnkgc2lkZWJhciBjb21wb25lbnQgdGhhdCBwaW4gc3RhdGUgaGFzIGNoYW5nZWRcbiAgICBpZiAodGhpcy51aSAmJiB0aGlzLnVpLmlmcmFtZSkge1xuICAgICAgdGhpcy51aS5pZnJhbWUuY29udGVudFdpbmRvdz8ucG9zdE1lc3NhZ2Uoe1xuICAgICAgICB0eXBlOiAnUElOX01PREVfQ0hBTkdFRCcsXG4gICAgICAgIGlzUGlubmVkOiB0aGlzLmlzUGlubmVkXG4gICAgICB9LCAnKicpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgaGFuZGxlR2V0Q3VycmVudFVybCgpIHtcbiAgICAvLyBTZW5kIGN1cnJlbnQgcGFnZSBVUkwgdG8gc2lkZWJhclxuICAgIGlmICh0aGlzLnVpICYmIHRoaXMudWkuaWZyYW1lKSB7XG4gICAgICB0aGlzLnVpLmlmcmFtZS5jb250ZW50V2luZG93Py5wb3N0TWVzc2FnZSh7XG4gICAgICAgIHR5cGU6ICdDVVJSRU5UX1VSTF9SRVNQT05TRScsXG4gICAgICAgIHVybDogd2luZG93LmxvY2F0aW9uLmhyZWZcbiAgICAgIH0sICcqJyk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBoYW5kbGVHZXRQYWdlQ29udGVudCgpIHtcbiAgICAvLyBHZXQgcGFnZSB0ZXh0IGNvbnRlbnRcbiAgICBjb25zdCB0ZXh0RWxlbWVudHMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFxuICAgICAgJ3AsIGgxLCBoMiwgaDMsIGg0LCBoNSwgaDYsIHNwYW46bm90KFtjbGFzcyo9XCJpY29uXCJdKTpub3QoW2NsYXNzKj1cImJ0blwiXSk6bm90KFtjbGFzcyo9XCJuYXZcIl0pOm5vdChbY2xhc3MqPVwibWVudVwiXSksIGRpdjpub3QoW2NsYXNzKj1cIm5hdlwiXSk6bm90KFtjbGFzcyo9XCJtZW51XCJdKTpub3QoW2NsYXNzKj1cImhlYWRlclwiXSk6bm90KFtjbGFzcyo9XCJmb290ZXJcIl0pOm5vdChbaWQqPVwic2lkZWJhclwiXSk6bm90KFtjbGFzcyo9XCJzaWRlYmFyXCJdKSwgbGksIGJsb2NrcXVvdGUnXG4gICAgKTtcbiAgICBcbiAgICBjb25zdCB0ZXh0Q29udGVudHM6IHN0cmluZ1tdID0gW107XG4gICAgXG4gICAgdGV4dEVsZW1lbnRzLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICAvLyBTa2lwIHNpZGViYXIgcmVsYXRlZCBlbGVtZW50c1xuICAgICAgaWYgKGVsZW1lbnQuY2xvc2VzdCgnW2lkKj1cInNpZGViYXJcIl0nKSB8fCBlbGVtZW50LmNsb3Nlc3QoJ1tjbGFzcyo9XCJzaWRlYmFyXCJdJykpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgXG4gICAgICBjb25zdCB0ZXh0ID0gZWxlbWVudC50ZXh0Q29udGVudD8udHJpbSgpO1xuICAgICAgaWYgKHRleHQgJiYgXG4gICAgICAgICAgdGV4dC5sZW5ndGggPiAxNSAmJiBcbiAgICAgICAgICB0ZXh0Lmxlbmd0aCA8IDMwMCAmJiBcbiAgICAgICAgICAhdGV4dC5pbmNsdWRlcygnwqknKSAmJiBcbiAgICAgICAgICAhdGV4dC5pbmNsdWRlcygnwq4nKSAmJlxuICAgICAgICAgICEvXlxcZCskLy50ZXN0KHRleHQpICYmXG4gICAgICAgICAgIS9eW1xcc1xcV10qJC8udGVzdCh0ZXh0KSAmJlxuICAgICAgICAgICF0ZXh0LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ2Nvb2tpZScpICYmXG4gICAgICAgICAgIXRleHQudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygncHJpdmFjeScpICYmXG4gICAgICAgICAgIXRleHQudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygndGVybXMnKSAmJlxuICAgICAgICAgICF0ZXh0LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ3BvbGljeScpXG4gICAgICApIHtcbiAgICAgICAgdGV4dENvbnRlbnRzLnB1c2godGV4dCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgXG4gICAgLy8gUmVtb3ZlIGR1cGxpY2F0ZXMgYW5kIGxpbWl0IHF1YW50aXR5XG4gICAgY29uc3QgdW5pcXVlVGV4dHMgPSBbLi4ubmV3IFNldCh0ZXh0Q29udGVudHMpXS5zbGljZSgwLCAxNSk7XG4gICAgXG4gICAgLy8gU2VuZCBwYWdlIGNvbnRlbnQgdG8gc2lkZWJhclxuICAgIGlmICh0aGlzLnVpICYmIHRoaXMudWkuaWZyYW1lKSB7XG4gICAgICB0aGlzLnVpLmlmcmFtZS5jb250ZW50V2luZG93Py5wb3N0TWVzc2FnZSh7XG4gICAgICAgIHR5cGU6ICdQQUdFX0NPTlRFTlRfUkVTUE9OU0UnLFxuICAgICAgICB0ZXh0czogdW5pcXVlVGV4dHNcbiAgICAgIH0sICcqJyk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBoYW5kbGVHZXRQYWdlSW5mbygpIHtcbiAgICAvLyBHZXQgcGFnZSB0aXRsZVxuICAgIGNvbnN0IHRpdGxlID0gZG9jdW1lbnQudGl0bGU7XG4gICAgXG4gICAgLy8gR2V0IHBhZ2UgZmF2aWNvblxuICAgIGxldCBmYXZpY29uID0gJyc7XG4gICAgXG4gICAgLy8gVHJ5IG11bHRpcGxlIHdheXMgdG8gZ2V0IGZhdmljb25cbiAgICBjb25zdCBpY29uTGluayA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2xpbmtbcmVsPVwiaWNvblwiXScpIGFzIEhUTUxMaW5rRWxlbWVudCB8fFxuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdsaW5rW3JlbD1cInNob3J0Y3V0IGljb25cIl0nKSBhcyBIVE1MTGlua0VsZW1lbnQgfHxcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignbGlua1tyZWw9XCJhcHBsZS10b3VjaC1pY29uXCJdJykgYXMgSFRNTExpbmtFbGVtZW50O1xuICAgIFxuICAgIGlmIChpY29uTGluayAmJiBpY29uTGluay5ocmVmKSB7XG4gICAgICBmYXZpY29uID0gaWNvbkxpbmsuaHJlZjtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSWYgbm90IGZvdW5kLCB1c2UgZGVmYXVsdCBmYXZpY29uIHBhdGhcbiAgICAgIGNvbnN0IHVybCA9IG5ldyBVUkwod2luZG93LmxvY2F0aW9uLmhyZWYpO1xuICAgICAgZmF2aWNvbiA9IGAke3VybC5wcm90b2NvbH0vLyR7dXJsLmhvc3R9L2Zhdmljb24uaWNvYDtcbiAgICB9XG4gICAgXG4gICAgLy8gU2VuZCBwYWdlIGluZm8gdG8gc2lkZWJhclxuICAgIGlmICh0aGlzLnVpICYmIHRoaXMudWkuaWZyYW1lKSB7XG4gICAgICB0aGlzLnVpLmlmcmFtZS5jb250ZW50V2luZG93Py5wb3N0TWVzc2FnZSh7XG4gICAgICAgIHR5cGU6ICdQQUdFX0lORk9fUkVTUE9OU0UnLFxuICAgICAgICB0aXRsZTogdGl0bGUsXG4gICAgICAgIGZhdmljb246IGZhdmljb25cbiAgICAgIH0sICcqJyk7XG4gICAgfVxuICB9XG5cbiAgZ2V0IHZpc2libGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuaXNWaXNpYmxlO1xuICB9XG4gIFxuICBnZXQgcGlubmVkKCkge1xuICAgIHJldHVybiB0aGlzLmlzUGlubmVkO1xuICB9XG59IiwiLy8gVUnlt6Xlhbflh73mlbDmqKHlnZdcblxuLyoqXG4gKiDmmL7npLrmiKrlm77miJDlip/mj5DnpLrmtojmga9cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNob3dTdWNjZXNzTWVzc2FnZSgpIHtcbiAgY29uc3Qgc3VjY2Vzc01zZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBzdWNjZXNzTXNnLnN0eWxlLmNzc1RleHQgPSBgXG4gICAgcG9zaXRpb246IGZpeGVkO1xuICAgIHRvcDogNTAlO1xuICAgIGxlZnQ6IDUwJTtcbiAgICB0cmFuc2Zvcm06IHRyYW5zbGF0ZSgtNTAlLCAtNTAlKTtcbiAgICBiYWNrZ3JvdW5kOiBsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCAjMTBiOTgxIDAlLCAjMDU5NjY5IDEwMCUpO1xuICAgIGNvbG9yOiB3aGl0ZTtcbiAgICBwYWRkaW5nOiAyMHB4IDMwcHg7XG4gICAgYm9yZGVyLXJhZGl1czogMTJweDtcbiAgICBmb250LXNpemU6IDE2cHg7XG4gICAgei1pbmRleDogMTAwMDAwMjtcbiAgICBmb250LWZhbWlseTogLWFwcGxlLXN5c3RlbSwgQmxpbmtNYWNTeXN0ZW1Gb250LCAnU2Vnb2UgVUknLCBSb2JvdG8sIHNhbnMtc2VyaWY7XG4gICAgYm94LXNoYWRvdzogMCA4cHggMzJweCByZ2JhKDAsIDAsIDAsIDAuMyk7XG4gICAgYm9yZGVyOiAxcHggc29saWQgcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjIpO1xuICAgIHRleHQtYWxpZ246IGNlbnRlcjtcbiAgICBhbmltYXRpb246IGZhZGVJblNjYWxlIDAuM3MgZWFzZS1vdXQ7XG4gIGA7XG4gIHN1Y2Nlc3NNc2cuaW5uZXJIVE1MID0gJ+KchSDmiKrlm77miJDlip/vvIE8YnI+PHNtYWxsIHN0eWxlPVwib3BhY2l0eTogMC44O1wiPuW3suS/neWtmOWIsOWJqui0tOadvzwvc21hbGw+JztcbiAgXG4gIC8vIOa3u+WKoOWKqOeUu+agt+W8j1xuICBjb25zdCBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XG4gIHN0eWxlLnRleHRDb250ZW50ID0gYFxuICAgIEBrZXlmcmFtZXMgZmFkZUluU2NhbGUge1xuICAgICAgZnJvbSB7XG4gICAgICAgIG9wYWNpdHk6IDA7XG4gICAgICAgIHRyYW5zZm9ybTogdHJhbnNsYXRlKC01MCUsIC01MCUpIHNjYWxlKDAuOCk7XG4gICAgICB9XG4gICAgICB0byB7XG4gICAgICAgIG9wYWNpdHk6IDE7XG4gICAgICAgIHRyYW5zZm9ybTogdHJhbnNsYXRlKC01MCUsIC01MCUpIHNjYWxlKDEpO1xuICAgICAgfVxuICAgIH1cbiAgYDtcbiAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChzdHlsZSk7XG4gIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoc3VjY2Vzc01zZyk7XG4gIFxuICAvLyAz56eS5ZCO6Ieq5Yqo56e76ZmkXG4gIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgIGlmIChzdWNjZXNzTXNnLnBhcmVudE5vZGUpIHtcbiAgICAgIHN1Y2Nlc3NNc2cucmVtb3ZlKCk7XG4gICAgfVxuICAgIGlmIChzdHlsZS5wYXJlbnROb2RlKSB7XG4gICAgICBzdHlsZS5yZW1vdmUoKTtcbiAgICB9XG4gIH0sIDMwMDApO1xufVxuXG4vKipcbiAqIOaYvuekuumUmeivr+aPkOekuua2iOaBr1xuICogQHBhcmFtIG1lc3NhZ2Ug6ZSZ6K+v5raI5oGv5YaF5a65XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzaG93RXJyb3JNZXNzYWdlKG1lc3NhZ2U6IHN0cmluZykge1xuICBjb25zdCBlcnJvck1zZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBlcnJvck1zZy5zdHlsZS5jc3NUZXh0ID0gYFxuICAgIHBvc2l0aW9uOiBmaXhlZDtcbiAgICB0b3A6IDUwJTtcbiAgICBsZWZ0OiA1MCU7XG4gICAgdHJhbnNmb3JtOiB0cmFuc2xhdGUoLTUwJSwgLTUwJSk7XG4gICAgYmFja2dyb3VuZDogbGluZWFyLWdyYWRpZW50KDEzNWRlZywgI2VmNDQ0NCAwJSwgI2RjMjYyNiAxMDAlKTtcbiAgICBjb2xvcjogd2hpdGU7XG4gICAgcGFkZGluZzogMjBweCAzMHB4O1xuICAgIGJvcmRlci1yYWRpdXM6IDEycHg7XG4gICAgZm9udC1zaXplOiAxNnB4O1xuICAgIHotaW5kZXg6IDEwMDAwMDI7XG4gICAgZm9udC1mYW1pbHk6IC1hcHBsZS1zeXN0ZW0sIEJsaW5rTWFjU3lzdGVtRm9udCwgJ1NlZ29lIFVJJywgUm9ib3RvLCBzYW5zLXNlcmlmO1xuICAgIGJveC1zaGFkb3c6IDAgOHB4IDMycHggcmdiYSgwLCAwLCAwLCAwLjMpO1xuICAgIGJvcmRlcjogMXB4IHNvbGlkIHJnYmEoMjU1LCAyNTUsIDI1NSwgMC4yKTtcbiAgICB0ZXh0LWFsaWduOiBjZW50ZXI7XG4gICAgYW5pbWF0aW9uOiBmYWRlSW5TY2FsZSAwLjNzIGVhc2Utb3V0O1xuICBgO1xuICBlcnJvck1zZy5pbm5lckhUTUwgPSBg4p2MICR7bWVzc2FnZX1gO1xuICBcbiAgLy8g5re75Yqg5Yqo55S75qC35byP77yI5aaC5p6c5LiN5a2Y5Zyo77yJXG4gIGlmICghZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2NhcG1pbmQtYW5pbWF0aW9ucycpKSB7XG4gICAgY29uc3Qgc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xuICAgIHN0eWxlLmlkID0gJ2NhcG1pbmQtYW5pbWF0aW9ucyc7XG4gICAgc3R5bGUudGV4dENvbnRlbnQgPSBgXG4gICAgICBAa2V5ZnJhbWVzIGZhZGVJblNjYWxlIHtcbiAgICAgICAgZnJvbSB7XG4gICAgICAgICAgb3BhY2l0eTogMDtcbiAgICAgICAgICB0cmFuc2Zvcm06IHRyYW5zbGF0ZSgtNTAlLCAtNTAlKSBzY2FsZSgwLjgpO1xuICAgICAgICB9XG4gICAgICAgIHRvIHtcbiAgICAgICAgICBvcGFjaXR5OiAxO1xuICAgICAgICAgIHRyYW5zZm9ybTogdHJhbnNsYXRlKC01MCUsIC01MCUpIHNjYWxlKDEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgYDtcbiAgICBkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKHN0eWxlKTtcbiAgfVxuICBcbiAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChlcnJvck1zZyk7XG4gIFxuICAvLyAz56eS5ZCO6Ieq5Yqo56e76ZmkXG4gIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgIGlmIChlcnJvck1zZy5wYXJlbnROb2RlKSB7XG4gICAgICBlcnJvck1zZy5yZW1vdmUoKTtcbiAgICB9XG4gIH0sIDMwMDApO1xufVxuXG4vKipcbiAqIOaYvuekuuWKoOi9veaPkOekuua2iOaBr1xuICogQHBhcmFtIG1lc3NhZ2Ug5Yqg6L295raI5oGv5YaF5a65XG4gKiBAcmV0dXJucyDov5Tlm57np7vpmaTlh73mlbBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNob3dMb2FkaW5nTWVzc2FnZShtZXNzYWdlOiBzdHJpbmcpOiAoKSA9PiB2b2lkIHtcbiAgY29uc3QgbG9hZGluZ01zZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBsb2FkaW5nTXNnLnN0eWxlLmNzc1RleHQgPSBgXG4gICAgcG9zaXRpb246IGZpeGVkO1xuICAgIHRvcDogNTAlO1xuICAgIGxlZnQ6IDUwJTtcbiAgICB0cmFuc2Zvcm06IHRyYW5zbGF0ZSgtNTAlLCAtNTAlKTtcbiAgICBiYWNrZ3JvdW5kOiBsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCAjM2I4MmY2IDAlLCAjMWQ0ZWQ4IDEwMCUpO1xuICAgIGNvbG9yOiB3aGl0ZTtcbiAgICBwYWRkaW5nOiAyMHB4IDMwcHg7XG4gICAgYm9yZGVyLXJhZGl1czogMTJweDtcbiAgICBmb250LXNpemU6IDE2cHg7XG4gICAgei1pbmRleDogMTAwMDAwMjtcbiAgICBmb250LWZhbWlseTogLWFwcGxlLXN5c3RlbSwgQmxpbmtNYWNTeXN0ZW1Gb250LCAnU2Vnb2UgVUknLCBSb2JvdG8sIHNhbnMtc2VyaWY7XG4gICAgYm94LXNoYWRvdzogMCA4cHggMzJweCByZ2JhKDAsIDAsIDAsIDAuMyk7XG4gICAgYm9yZGVyOiAxcHggc29saWQgcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjIpO1xuICAgIHRleHQtYWxpZ246IGNlbnRlcjtcbiAgICBhbmltYXRpb246IGZhZGVJblNjYWxlIDAuM3MgZWFzZS1vdXQ7XG4gIGA7XG4gIGxvYWRpbmdNc2cuaW5uZXJIVE1MID0gYOKPsyAke21lc3NhZ2V9YDtcbiAgXG4gIC8vIOa3u+WKoOWKqOeUu+agt+W8j++8iOWmguaenOS4jeWtmOWcqO+8iVxuICBpZiAoIWRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNjYXBtaW5kLWFuaW1hdGlvbnMnKSkge1xuICAgIGNvbnN0IHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcbiAgICBzdHlsZS5pZCA9ICdjYXBtaW5kLWFuaW1hdGlvbnMnO1xuICAgIHN0eWxlLnRleHRDb250ZW50ID0gYFxuICAgICAgQGtleWZyYW1lcyBmYWRlSW5TY2FsZSB7XG4gICAgICAgIGZyb20ge1xuICAgICAgICAgIG9wYWNpdHk6IDA7XG4gICAgICAgICAgdHJhbnNmb3JtOiB0cmFuc2xhdGUoLTUwJSwgLTUwJSkgc2NhbGUoMC44KTtcbiAgICAgICAgfVxuICAgICAgICB0byB7XG4gICAgICAgICAgb3BhY2l0eTogMTtcbiAgICAgICAgICB0cmFuc2Zvcm06IHRyYW5zbGF0ZSgtNTAlLCAtNTAlKSBzY2FsZSgxKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIGA7XG4gICAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChzdHlsZSk7XG4gIH1cbiAgXG4gIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQobG9hZGluZ01zZyk7XG4gIFxuICAvLyDov5Tlm57np7vpmaTlh73mlbBcbiAgcmV0dXJuICgpID0+IHtcbiAgICBpZiAobG9hZGluZ01zZy5wYXJlbnROb2RlKSB7XG4gICAgICBsb2FkaW5nTXNnLnJlbW92ZSgpO1xuICAgIH1cbiAgfTtcbn1cblxuLyoqXG4gKiDliJvlu7rpgJrnn6Xmj5DnpLpcbiAqIEBwYXJhbSBtZXNzYWdlIOaPkOekuua2iOaBr1xuICogQHBhcmFtIHR5cGUg5o+Q56S657G75Z6LXG4gKiBAcGFyYW0gZHVyYXRpb24g5pi+56S65pe26ZW/77yI5q+r56eS77yJXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzaG93Tm90aWZpY2F0aW9uKG1lc3NhZ2U6IHN0cmluZywgdHlwZTogJ3N1Y2Nlc3MnIHwgJ2Vycm9yJyB8ICdpbmZvJyB8ICd3YXJuaW5nJyA9ICdpbmZvJywgZHVyYXRpb24gPSAzMDAwKSB7XG4gIGNvbnN0IGNvbG9ycyA9IHtcbiAgICBzdWNjZXNzOiAnbGluZWFyLWdyYWRpZW50KDEzNWRlZywgIzEwYjk4MSAwJSwgIzA1OTY2OSAxMDAlKScsXG4gICAgZXJyb3I6ICdsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCAjZWY0NDQ0IDAlLCAjZGMyNjI2IDEwMCUpJyxcbiAgICBpbmZvOiAnbGluZWFyLWdyYWRpZW50KDEzNWRlZywgIzNiODJmNiAwJSwgIzFkNGVkOCAxMDAlKScsXG4gICAgd2FybmluZzogJ2xpbmVhci1ncmFkaWVudCgxMzVkZWcsICNmNTllMGIgMCUsICNkOTc3MDYgMTAwJSknXG4gIH07XG5cbiAgY29uc3QgaWNvbnMgPSB7XG4gICAgc3VjY2VzczogJ+KchScsXG4gICAgZXJyb3I6ICfinYwnLFxuICAgIGluZm86ICfihLnvuI8nLFxuICAgIHdhcm5pbmc6ICfimqDvuI8nXG4gIH07XG5cbiAgY29uc3Qgbm90aWZpY2F0aW9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIG5vdGlmaWNhdGlvbi5zdHlsZS5jc3NUZXh0ID0gYFxuICAgIHBvc2l0aW9uOiBmaXhlZDtcbiAgICB0b3A6IDIwcHg7XG4gICAgcmlnaHQ6IDIwcHg7XG4gICAgYmFja2dyb3VuZDogJHtjb2xvcnNbdHlwZV19O1xuICAgIGNvbG9yOiB3aGl0ZTtcbiAgICBwYWRkaW5nOiAxNnB4IDI0cHg7XG4gICAgYm9yZGVyLXJhZGl1czogOHB4O1xuICAgIGZvbnQtc2l6ZTogMTRweDtcbiAgICB6LWluZGV4OiAxMDAwMDAyO1xuICAgIGZvbnQtZmFtaWx5OiAtYXBwbGUtc3lzdGVtLCBCbGlua01hY1N5c3RlbUZvbnQsICdTZWdvZSBVSScsIFJvYm90bywgc2Fucy1zZXJpZjtcbiAgICBib3gtc2hhZG93OiAwIDRweCAyMHB4IHJnYmEoMCwgMCwgMCwgMC4zKTtcbiAgICBib3JkZXI6IDFweCBzb2xpZCByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMik7XG4gICAgYW5pbWF0aW9uOiBzbGlkZUluUmlnaHQgMC4zcyBlYXNlLW91dDtcbiAgICBtYXgtd2lkdGg6IDMwMHB4O1xuICBgO1xuICBub3RpZmljYXRpb24uaW5uZXJIVE1MID0gYCR7aWNvbnNbdHlwZV19ICR7bWVzc2FnZX1gO1xuICBcbiAgLy8g5re75Yqg5Yqo55S75qC35byP77yI5aaC5p6c5LiN5a2Y5Zyo77yJXG4gIGlmICghZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2NhcG1pbmQtc2xpZGUtYW5pbWF0aW9ucycpKSB7XG4gICAgY29uc3Qgc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xuICAgIHN0eWxlLmlkID0gJ2NhcG1pbmQtc2xpZGUtYW5pbWF0aW9ucyc7XG4gICAgc3R5bGUudGV4dENvbnRlbnQgPSBgXG4gICAgICBAa2V5ZnJhbWVzIHNsaWRlSW5SaWdodCB7XG4gICAgICAgIGZyb20ge1xuICAgICAgICAgIG9wYWNpdHk6IDA7XG4gICAgICAgICAgdHJhbnNmb3JtOiB0cmFuc2xhdGVYKDEwMCUpO1xuICAgICAgICB9XG4gICAgICAgIHRvIHtcbiAgICAgICAgICBvcGFjaXR5OiAxO1xuICAgICAgICAgIHRyYW5zZm9ybTogdHJhbnNsYXRlWCgwKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgQGtleWZyYW1lcyBzbGlkZU91dFJpZ2h0IHtcbiAgICAgICAgZnJvbSB7XG4gICAgICAgICAgb3BhY2l0eTogMTtcbiAgICAgICAgICB0cmFuc2Zvcm06IHRyYW5zbGF0ZVgoMCk7XG4gICAgICAgIH1cbiAgICAgICAgdG8ge1xuICAgICAgICAgIG9wYWNpdHk6IDA7XG4gICAgICAgICAgdHJhbnNmb3JtOiB0cmFuc2xhdGVYKDEwMCUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgYDtcbiAgICBkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKHN0eWxlKTtcbiAgfVxuICBcbiAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChub3RpZmljYXRpb24pO1xuICBcbiAgLy8g6Ieq5Yqo56e76ZmkXG4gIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgIG5vdGlmaWNhdGlvbi5zdHlsZS5hbmltYXRpb24gPSAnc2xpZGVPdXRSaWdodCAwLjNzIGVhc2Utb3V0JztcbiAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIGlmIChub3RpZmljYXRpb24ucGFyZW50Tm9kZSkge1xuICAgICAgICBub3RpZmljYXRpb24ucmVtb3ZlKCk7XG4gICAgICB9XG4gICAgfSwgMzAwKTtcbiAgfSwgZHVyYXRpb24pO1xufSIsIi8vIOa2iOaBr+WkhOeQhuaooeWdl1xuXG5pbXBvcnQgeyBTY3JlZW5DYXB0dXJlIH0gZnJvbSAnLi9jYXB0dXJlJztcbmltcG9ydCB7IFNpZGViYXJNYW5hZ2VyIH0gZnJvbSAnLi9zaWRlYmFyJztcbmltcG9ydCB7IHNob3dTdWNjZXNzTWVzc2FnZSB9IGZyb20gJy4vdWktdXRpbHMnO1xuXG5leHBvcnQgY2xhc3MgTWVzc2FnZUhhbmRsZXIge1xuICBwcml2YXRlIHNjcmVlbkNhcHR1cmU6IFNjcmVlbkNhcHR1cmU7XG4gIHByaXZhdGUgc2lkZWJhck1hbmFnZXI6IFNpZGViYXJNYW5hZ2VyO1xuXG4gIGNvbnN0cnVjdG9yKHNjcmVlbkNhcHR1cmU6IFNjcmVlbkNhcHR1cmUsIHNpZGViYXJNYW5hZ2VyOiBTaWRlYmFyTWFuYWdlcikge1xuICAgIHRoaXMuc2NyZWVuQ2FwdHVyZSA9IHNjcmVlbkNhcHR1cmU7XG4gICAgdGhpcy5zaWRlYmFyTWFuYWdlciA9IHNpZGViYXJNYW5hZ2VyO1xuICAgIHRoaXMuc2V0dXBNZXNzYWdlTGlzdGVuZXJzKCk7XG4gIH1cblxuICBwcml2YXRlIHNldHVwTWVzc2FnZUxpc3RlbmVycygpIHtcbiAgICAvLyDnm5HlkKzmnaXoh6pwb3B1cOOAgWJhY2tncm91bmTlkoxzaWRlYmFy55qE5raI5oGvXG4gICAgY2hyb21lLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKChtZXNzYWdlLCBzZW5kZXIsIHNlbmRSZXNwb25zZSkgPT4ge1xuICAgICAgaWYgKG1lc3NhZ2UuYWN0aW9uID09PSAnc3RhcnRDYXB0dXJlJykge1xuICAgICAgICB0aGlzLnNjcmVlbkNhcHR1cmUuc3RhcnQoKTtcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSB9KTtcbiAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS5hY3Rpb24gPT09ICdjYXB0dXJlQ29tcGxldGUnKSB7XG4gICAgICAgIC8vIOaIquWbvuWujOaIkO+8jOaYvuekuuaIkOWKn+aPkOekuuW5tuabtOaWsOS+p+i+ueagj1xuICAgICAgICBzaG93U3VjY2Vzc01lc3NhZ2UoKTtcbiAgICAgICAgdGhpcy5zaWRlYmFyTWFuYWdlci51cGRhdGVXaXRoQ2FwdHVyZShtZXNzYWdlLmRhdGFVcmwpO1xuICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlIH0pO1xuICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLmFjdGlvbiA9PT0gJ3RvZ2dsZVNpZGViYXInKSB7XG4gICAgICAgIC8vIOebtOaOpeWkhOeQhuS+p+i+ueagj+WIh+aNolxuICAgICAgICB0aGlzLnNpZGViYXJNYW5hZ2VyLnRvZ2dsZSgpO1xuICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlIH0pO1xuICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLmFjdGlvbiA9PT0gJ2dldFBhZ2VDb250ZW50Jykge1xuICAgICAgICAvLyDojrflj5blvZPliY3pobXpnaLlhoXlrrlcbiAgICAgICAgY29uc3QgcGFnZUNvbnRlbnQgPSB0aGlzLmdldFBhZ2VDb250ZW50KCk7XG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUsIGNvbnRlbnQ6IHBhZ2VDb250ZW50IH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG5cbiAgICAvLyDnm5HlkKzmnaXoh6pzaWRlYmFy55qE5raI5oGvXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCAoZXZlbnQpID0+IHtcbiAgICAgIGlmIChldmVudC5kYXRhLnR5cGUgPT09ICdTVEFSVF9TTUFSVF9DQVBUVVJFJykge1xuICAgICAgICB0aGlzLnNjcmVlbkNhcHR1cmUuc3RhcnQoKTtcbiAgICAgIH0gZWxzZSBpZiAoZXZlbnQuZGF0YS50eXBlID09PSAnQ0xPU0VfU0lERUJBUicpIHtcbiAgICAgICAgdGhpcy5zaWRlYmFyTWFuYWdlci5oaWRlKCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyDmt7vliqDlj7PplK7oj5zljZXmlK/mjIFcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdjb250ZXh0bWVudScsIChlKSA9PiB7XG4gICAgICBjb25zdCBzZWxlY3Rpb24gPSB3aW5kb3cuZ2V0U2VsZWN0aW9uKCk7XG4gICAgICBpZiAoc2VsZWN0aW9uICYmIHNlbGVjdGlvbi50b1N0cmluZygpLnRyaW0oKSkge1xuICAgICAgICAvLyDlpoLmnpzmnInpgInkuK3mlofmnKzvvIzlj6/ku6Xmt7vliqDlv6vpgJ/mn6Xor43lip/og71cbiAgICAgICAgY29uc3Qgc2VsZWN0ZWRUZXh0ID0gc2VsZWN0aW9uLnRvU3RyaW5nKCkudHJpbSgpO1xuICAgICAgICBpZiAoL15bYS16QS1aXSskLy50ZXN0KHNlbGVjdGVkVGV4dCkpIHtcbiAgICAgICAgICAvLyDlj5HpgIHmn6Xor43or7fmsYJcbiAgICAgICAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7XG4gICAgICAgICAgICBhY3Rpb246ICdsb29rdXBXb3JkJyxcbiAgICAgICAgICAgIHdvcmQ6IHNlbGVjdGVkVGV4dFxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGdldFBhZ2VDb250ZW50KCk6IHN0cmluZyB7XG4gICAgLy8g6I635Y+W6aG16Z2i5qCH6aKYXG4gICAgY29uc3QgdGl0bGUgPSBkb2N1bWVudC50aXRsZTtcbiAgICBcbiAgICAvLyDojrflj5bpobXpnaLkuLvopoHmlofmnKzlhoXlrrlcbiAgICBjb25zdCBjb250ZW50ID0gdGhpcy5leHRyYWN0TWFpbkNvbnRlbnQoKTtcbiAgICBcbiAgICAvLyDojrflj5blvZPliY1VUkxcbiAgICBjb25zdCB1cmwgPSB3aW5kb3cubG9jYXRpb24uaHJlZjtcbiAgICBcbiAgICByZXR1cm4gYOmhtemdouagh+mimDogJHt0aXRsZX1cXG7pobXpnaJVUkw6ICR7dXJsfVxcblxcbumhtemdouWGheWuuTpcXG4ke2NvbnRlbnR9YDtcbiAgfVxuXG4gIHByaXZhdGUgZXh0cmFjdE1haW5Db250ZW50KCk6IHN0cmluZyB7XG4gICAgLy8g56e76Zmk6ISa5pys5ZKM5qC35byP5qCH562+XG4gICAgY29uc3QgZWxlbWVudHNUb1JlbW92ZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ3NjcmlwdCwgc3R5bGUsIG5hdiwgaGVhZGVyLCBmb290ZXIsIGFzaWRlLCAuc2lkZWJhciwgLm1lbnUsIC5uYXZpZ2F0aW9uJyk7XG4gICAgY29uc3QgY2xvbmVkRG9jID0gZG9jdW1lbnQuY2xvbmVOb2RlKHRydWUpIGFzIERvY3VtZW50O1xuICAgIFxuICAgIGVsZW1lbnRzVG9SZW1vdmUuZm9yRWFjaChlbCA9PiB7XG4gICAgICBjb25zdCBjbG9uZWRFbCA9IGNsb25lZERvYy5xdWVyeVNlbGVjdG9yKGVsLnRhZ05hbWUudG9Mb3dlckNhc2UoKSk7XG4gICAgICBpZiAoY2xvbmVkRWwpIHtcbiAgICAgICAgY2xvbmVkRWwucmVtb3ZlKCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgXG4gICAgLy8g5bCd6K+V5om+5Yiw5Li76KaB5YaF5a655Yy65Z+fXG4gICAgY29uc3QgbWFpblNlbGVjdG9ycyA9IFtcbiAgICAgICdtYWluJyxcbiAgICAgICdhcnRpY2xlJywgXG4gICAgICAnLmNvbnRlbnQnLFxuICAgICAgJy5tYWluLWNvbnRlbnQnLFxuICAgICAgJy5wb3N0LWNvbnRlbnQnLFxuICAgICAgJy5lbnRyeS1jb250ZW50JyxcbiAgICAgICcjY29udGVudCcsXG4gICAgICAnI21haW4nXG4gICAgXTtcbiAgICBcbiAgICBsZXQgbWFpbkNvbnRlbnQgPSAnJztcbiAgICBcbiAgICBmb3IgKGNvbnN0IHNlbGVjdG9yIG9mIG1haW5TZWxlY3RvcnMpIHtcbiAgICAgIGNvbnN0IGVsZW1lbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgICAgIGlmIChlbGVtZW50KSB7XG4gICAgICAgIG1haW5Db250ZW50ID0gdGhpcy5nZXRUZXh0Q29udGVudChlbGVtZW50KTtcbiAgICAgICAgaWYgKG1haW5Db250ZW50Lmxlbmd0aCA+IDEwMCkge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8vIOWmguaenOayoeacieaJvuWIsOS4u+imgeWGheWuue+8jOS9v+eUqGJvZHnlhoXlrrlcbiAgICBpZiAoIW1haW5Db250ZW50IHx8IG1haW5Db250ZW50Lmxlbmd0aCA8IDEwMCkge1xuICAgICAgbWFpbkNvbnRlbnQgPSB0aGlzLmdldFRleHRDb250ZW50KGRvY3VtZW50LmJvZHkpO1xuICAgIH1cbiAgICBcbiAgICAvLyDpmZDliLblhoXlrrnplb/luqbvvIzpgb/lhY3ov4fplb9cbiAgICByZXR1cm4gbWFpbkNvbnRlbnQubGVuZ3RoID4gMzAwMCA/IG1haW5Db250ZW50LnN1YnN0cmluZygwLCAzMDAwKSArICcuLi4nIDogbWFpbkNvbnRlbnQ7XG4gIH1cblxuICBwcml2YXRlIGdldFRleHRDb250ZW50KGVsZW1lbnQ6IEVsZW1lbnQpOiBzdHJpbmcge1xuICAgIC8vIOiOt+WPluWFg+e0oOeahOaWh+acrOWGheWuue+8jOS/neeVmeWfuuacrOagvOW8j1xuICAgIGxldCB0ZXh0ID0gJyc7XG4gICAgXG4gICAgZm9yIChjb25zdCBub2RlIG9mIGVsZW1lbnQuY2hpbGROb2Rlcykge1xuICAgICAgaWYgKG5vZGUubm9kZVR5cGUgPT09IE5vZGUuVEVYVF9OT0RFKSB7XG4gICAgICAgIGNvbnN0IHRleHRDb250ZW50ID0gbm9kZS50ZXh0Q29udGVudD8udHJpbSgpO1xuICAgICAgICBpZiAodGV4dENvbnRlbnQpIHtcbiAgICAgICAgICB0ZXh0ICs9IHRleHRDb250ZW50ICsgJyAnO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKG5vZGUubm9kZVR5cGUgPT09IE5vZGUuRUxFTUVOVF9OT0RFKSB7XG4gICAgICAgIGNvbnN0IGVsID0gbm9kZSBhcyBFbGVtZW50O1xuICAgICAgICBcbiAgICAgICAgLy8g6Lez6L+H5LiN6ZyA6KaB55qE5YWD57SgXG4gICAgICAgIGlmIChbJ1NDUklQVCcsICdTVFlMRScsICdOQVYnLCAnSEVBREVSJywgJ0ZPT1RFUicsICdBU0lERSddLmluY2x1ZGVzKGVsLnRhZ05hbWUpKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIOmAkuW9kuiOt+WPluWtkOWFg+e0oOWGheWuuVxuICAgICAgICBjb25zdCBjaGlsZFRleHQgPSB0aGlzLmdldFRleHRDb250ZW50KGVsKTtcbiAgICAgICAgaWYgKGNoaWxkVGV4dC50cmltKCkpIHtcbiAgICAgICAgICB0ZXh0ICs9IGNoaWxkVGV4dCArICcgJztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8g5Zyo5Z2X57qn5YWD57Sg5ZCO5re75Yqg5o2i6KGMXG4gICAgICAgIGlmIChbJ0RJVicsICdQJywgJ0gxJywgJ0gyJywgJ0gzJywgJ0g0JywgJ0g1JywgJ0g2JywgJ0xJJ10uaW5jbHVkZXMoZWwudGFnTmFtZSkpIHtcbiAgICAgICAgICB0ZXh0ICs9ICdcXG4nO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8vIOa4heeQhuWkmuS9meeahOepuueZveWtl+esplxuICAgIHJldHVybiB0ZXh0LnJlcGxhY2UoL1xccysvZywgJyAnKS5yZXBsYWNlKC9cXG5cXHMqXFxuL2csICdcXG4nKS50cmltKCk7XG4gIH1cbn0iLCJpbXBvcnQgeyBkZWZpbmVDb250ZW50U2NyaXB0IH0gZnJvbSBcInd4dC9zYW5kYm94XCI7XG5pbXBvcnQgeyBTY3JlZW5DYXB0dXJlIH0gZnJvbSBcIi4vY2FwdHVyZVwiO1xuaW1wb3J0IHsgU2lkZWJhck1hbmFnZXIgfSBmcm9tIFwiLi9zaWRlYmFyXCI7XG5pbXBvcnQgeyBNZXNzYWdlSGFuZGxlciB9IGZyb20gXCIuL21lc3NhZ2UtaGFuZGxlclwiO1xuaW1wb3J0IFwifi9hc3NldHMvc3R5bGVzLmNzc1wiO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb250ZW50U2NyaXB0KHtcbiAgbWF0Y2hlczogW1wiPGFsbF91cmxzPlwiXSxcbiAgbWFpbihjdHg6IGFueSkge1xuICAgIGNvbnNvbGUubG9nKFwiQ2FwTWluZCBjb250ZW50IHNjcmlwdCBsb2FkZWRcIik7XG5cbiAgICAvLyDliJ3lp4vljJblkITkuKrmqKHlnZdcbiAgICBjb25zdCBzY3JlZW5DYXB0dXJlID0gbmV3IFNjcmVlbkNhcHR1cmUoKTtcbiAgICBjb25zdCBzaWRlYmFyTWFuYWdlciA9IG5ldyBTaWRlYmFyTWFuYWdlcihjdHgpO1xuICAgIG5ldyBNZXNzYWdlSGFuZGxlcihzY3JlZW5DYXB0dXJlLCBzaWRlYmFyTWFuYWdlcik7XG5cbiAgICAvLyDmqKHlnZfliJ3lp4vljJblrozmiJDvvIxjb250ZW50IHNjcmlwdCDliqDovb3lrozmr5VcbiAgICBjb25zb2xlLmxvZyhcIkNhcE1pbmQgbW9kdWxlcyBpbml0aWFsaXplZCBzdWNjZXNzZnVsbHlcIik7XG4gIH0sXG59KTtcbiJdLCJuYW1lcyI6WyJkZWZpbml0aW9uIiwidGhpcyIsIm1vZHVsZSIsInByb3h5VGFyZ2V0IiwidmFsdWUiLCJyZXN1bHQiLCJtZXNzYWdlIiwicHJpbnQiLCJsb2dnZXIiLCJyZW1vdmVEZXRlY3RvciIsIm1vdW50RGV0ZWN0b3IiLCJfYSIsImNvbnRlbnQiXSwibWFwcGluZ3MiOiI7Ozs7O0FBQU8sV0FBUyxvQkFBb0JBLGFBQVk7QUFDOUMsV0FBT0E7QUFBQSxFQUNUO0FBQUEsRUNRTyxNQUFNLGNBQWM7QUFBQSxJQU96QixjQUFjO0FBTk4seUNBQWM7QUFDZCw4Q0FBMEM7QUFDMUMsZ0RBQXlDO0FBQ3pDLDZDQUFrQjtBQUNsQiwrQ0FBb0I7QUFHMUIsV0FBSyxrQkFBa0IsS0FBSyxnQkFBZ0IsS0FBSyxJQUFJO0FBQ3JELFdBQUssY0FBYyxLQUFLLFlBQVksS0FBSyxJQUFJO0FBQzdDLFdBQUssZ0JBQWdCLEtBQUssY0FBYyxLQUFLLElBQUk7QUFBQSxJQUFBO0FBQUEsSUFHbkQsUUFBUTtBQUNOLFVBQUksS0FBSyxZQUFhO0FBRXRCLFdBQUssY0FBYztBQUNuQixlQUFTLEtBQUssTUFBTSxTQUFTO0FBRzdCLFdBQUssY0FBQTtBQUdMLGVBQVMsaUJBQWlCLGFBQWEsS0FBSyxlQUFlO0FBQzNELGVBQVMsaUJBQWlCLFNBQVMsS0FBSyxXQUFXO0FBQ25ELGVBQVMsaUJBQWlCLFdBQVcsS0FBSyxhQUFhO0FBQUEsSUFBQTtBQUFBLElBR2pELGdCQUFnQjtBQUN0QixXQUFLLG1CQUFtQixTQUFTLGNBQWMsS0FBSztBQUNwRCxXQUFLLGlCQUFpQixNQUFNLFVBQVU7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQVd0QyxlQUFTLEtBQUssWUFBWSxLQUFLLGdCQUFnQjtBQUcvQyxZQUFNLFVBQVUsU0FBUyxjQUFjLEtBQUs7QUFDNUMsY0FBUSxLQUFLO0FBQ2IsY0FBUSxNQUFNLFVBQVU7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFnQnhCLGNBQVEsWUFBWTtBQUNw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

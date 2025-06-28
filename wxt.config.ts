import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "CapMind",
    description: "CapMind 是一款基于 AI 的智能网页浏览助手，集成页面内容分析、智能截图、实时翻译和 AI 问答功能，让您的网页浏览更加智能高效。",
    version: "1.0.0",
    permissions: ["activeTab", "storage", "tabs", "scripting", "contextMenus", "notifications"],
    host_permissions: ["https://*/*", "http://*/*"],
    action: {
      default_title: "CapMind - 智能网页浏览助手",
    },
    content_scripts: [
      {
        matches: ["<all_urls>"],
        js: ["content-scripts/content.js"],
      },
    ],
    background: {
      service_worker: "background.js",
    },
    icons: {
      16: "icon/16.png",
      32: "icon/32.png",
      48: "icon/48.png",
      128: "icon/128.png",
    },
    web_accessible_resources: [
      {
        resources: ["content-scripts/content.css", "sidebar.html"],
        matches: ["<all_urls>"]
      }
    ],
  },
  vite: () => ({
    css: {
      postcss: './postcss.config.js',
    },
  }),
  runner: {
    binaries: {
      edge: "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    },
    chromiumArgs: ["--user-data-dir=./.wxt/browser-data"],
  },
});

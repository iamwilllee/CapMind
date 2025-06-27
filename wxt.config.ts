import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "CapMind",
    description: "智能浏览器插件，集成智能截图 + AI识图 + 英语学习",
    version: "1.0.0",
    permissions: ["activeTab", "storage", "tabs", "scripting", "contextMenus", "notifications"],
    host_permissions: ["https://*/*", "http://*/*"],
    action: {
      default_title: "CapMind - 智能截图学习助手",
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
    plugins: [tailwindcss()],
  }),
  runner: {
    binaries: {
      edge: "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    },
    chromiumArgs: ["--user-data-dir=./.wxt/browser-data"],
  },
});

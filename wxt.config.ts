import { defineConfig } from "wxt";
import { resolve } from "node:path";
import { version } from "./package.json";

// Google Chrome 会忽略命令行的 --load-extension / --disable-extensions-except
// （日志里能看到 "is not allowed in Google Chrome, ignoring"）。补上 except 参数
// 对部分 Chromium 版本有效；正式版 Chrome 若仍加载不了，用「加载已解压的扩展程序」
// 手动装 .output/chrome-mv3 即可，见 docs/TESTING.md。
const DEV_OUT_DIR = resolve(process.cwd(), ".output", "chrome-mv3");

export default defineConfig({
  modules: ["@wxt-dev/module-react", "@wxt-dev/auto-icons"],
  manifest: {
    name: "CapMind",
    description:
      "在网页上圈选一块，自动归类为待办、追踪或杂项：每日签到到点提醒或自动领，长周期事项拆阶段节点逐个盯，资料随手存可搜。数据只存本地，无后端无遥测。",
    version,
    permissions: [
      "activeTab",
      "storage",
      "tabs",
      "scripting",
      "contextMenus",
      "notifications",
      "alarms",
      "sidePanel",
    ],
    host_permissions: ["<all_urls>"],
    action: {
      default_title: "CapMind · 事项助手",
    },
    web_accessible_resources: [
      {
        resources: ["sidebar.html", "content-scripts/content.css"],
        matches: ["<all_urls>"],
      },
    ],
  },
  vite: () => ({
    css: {
      postcss: "./postcss.config.js",
    },
  }),
  runner: {
    binaries: {
      edge: "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    },
    chromiumArgs: [
      "--user-data-dir=./.wxt/browser-data",
      `--disable-extensions-except=${DEV_OUT_DIR}`,
    ],
  },
});

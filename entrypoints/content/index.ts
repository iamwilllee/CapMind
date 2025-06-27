import { defineContentScript } from "wxt/sandbox";
import { ScreenCapture } from "./capture";
import { SidebarManager } from "./sidebar";
import { MessageHandler } from "./message-handler";
import "~/assets/styles.css";

export default defineContentScript({
  matches: ["<all_urls>"],
  main(ctx: any) {
    console.log("CapMind content script loaded");

    // 初始化各个模块
    const screenCapture = new ScreenCapture();
    const sidebarManager = new SidebarManager(ctx);
    new MessageHandler(screenCapture, sidebarManager);

    // 模块初始化完成，content script 加载完毕
    console.log("CapMind modules initialized successfully");
  },
});

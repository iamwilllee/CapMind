# 发布指南 · CapMind 事项助手

## 保住扩展 ID（重要）

插件已上线，扩展 ID 由 **Chrome Web Store 的那个条目**决定；代码里没有 `manifest.key`，`wxt.config.ts` 与构建产物都没有。

发布新版本时：

1. **用同一个商店条目上传新 zip**，不要新建条目；
2. `package.json` 版本号在 `0.0.2` 基础上继续递增（当前 `0.1.0`），不要重置为 `0.0.1`；
3. 商店描述、权限理由、隐私政策按 `CHROME_STORE_CHECKLIST.md` / `PRIVACY.md` 更新；
4. 提交前逐条填写 `<all_urls>` 与自动点击的权限理由。

## 版本号

```bash
npm run version:patch   # 0.1.0 → 0.1.1
npm run version:minor   # 0.1.0 → 0.2.0
npm run version:major   # 0.1.0 → 1.0.0
```

## 构建

```bash
pnpm compile            # 类型检查
pnpm build              # .output/chrome-mv3
pnpm zip                # .output/chrome-mv3.zip
pnpm build:firefox      # .output/firefox-mv2
pnpm zip:firefox        # .output/firefox-mv2.zip
pnpm release            # build + 两个 zip
```

## CI

`.github/workflows/release.yml` 在 push 到 `main` 时构建两个目标并创建 GitHub Release / artifact。它**不负责**上传 Chrome Web Store——商店上传需手动用同一条目提交，避免误用新条目导致 ID 变化。

## 发布前冒烟测试

1. `chrome://extensions` 加载 `.output/chrome-mv3`；
2. 打开任意网页，点击图标或右键「CapMind · 打开事项」；
3. 点「+ 圈选一块」，拖拽框选一个含按钮的区域；
4. 确认识别结果，逐字段检查选择器与判据，点「试跑一次」；
5. 保存，回到「今日」看板确认事项出现；
6. 在设置里把签到时间调到几分钟后，确认 `chrome.alarms` 能触发并写入执行记录；
7. 新建一个长周期事项，把回访频率调为 1 天，确认通知与回访记录。

## 相关文档

- [PRD](docs/PRD.md)
- [商店检查清单](CHROME_STORE_CHECKLIST.md)
- [隐私政策](PRIVACY.md)
- [安全审计](SECURITY_AUDIT.md)
- [设计稿 canvas](../designs/capmind-tasks/project/canvas.json)

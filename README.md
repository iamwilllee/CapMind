# CapMind · 事项助手

> 在网页上圈选一块，它判断这是待办、追踪还是杂项，分别归到对应的桶里。

浏览器端信息收集 Agent。基于 **WXT + React + TypeScript** 的 Chrome MV3 扩展。

## 三个桶

圈选的东西按「有没有时间形状」分成三类，界面顶部就是三个 tab：

| Tab | 收什么 | 收进来之后 |
|---|---|---|
| **待办** | 每天/每周要做的动作（领额度、签到、交周报） | 到点提醒，或自动帮你点掉 |
| **追踪** | 有周期、分阶段的事（ICP 备案、资质申请、考试报名） | AI 拆出阶段节点，逐节点提醒，带截止倒计时 |
| **杂项** | 没有时间属性的资料（链接、段落、想法） | 只存不提醒，按标题 / 标签 / 摘录搜出来 |

分类由 AI 判断（kind 字段），拿不准就落「杂项」——宁可少归档，不要乱归档。判不准时也可在识别结果页手动改。

界面是 Chrome **原生侧边面板**：点工具栏图标即钉在浏览器右侧，跨标签页常驻（旧浏览器回退为独立标签页）。圈选在网页上完成，识别结果直接出现在面板里。

**每日事项（两种方式）**
圈选任意领额度 / 签到的区域，扩展读出「这是什么活动、什么频率、去哪领」，然后你选每天怎么完成：

- **提醒我**（默认，最稳）：到点提醒 + 一键打开页面，你领完后点「今天已完成」。插件不碰页面。
- **自动帮我领**（尽力）：插件每天自己打开页面、按语义找「去领 / 领取 / 签到」按钮点一次并核对结果。找不到、要登录、点了没效果，就自动降级成提醒，不会静默失败。

圈选只是**一次性的线索**，不是每天的执行入口——真正每天用的是「地址 + 频率 + 今天做没做」。

**长周期待办提醒**
备案、续费这类跨月事项，记录预计耗时、里程碑和回访频率。到回访日主动问你「现在到哪一步了」，可推进、延期或标记完成。

## 关键设计

- **不内置任何站点**：靠用户圈选现场生成配方，加新站点不用改代码。
- **模型只在创建时调用**：默认本地启发式识别（零网络、零 Key）；AI 为可选项。每日执行是纯确定性规则，不调用模型、不上传页面内容。
- **判据优先于点击**：按钮文案不匹配或判据缺失时转人工，不猜、不破解验证码、不代填凭据。
- **MV3 用 `chrome.alarms` 调度**：Service Worker 启动即检查并补领漏跑任务，不依赖 `setInterval`。
- **浏览器必须开着**：关机期间不执行，重新打开后补领；设置页与空状态都写明了这个边界。

## 开发

```bash
pnpm install
pnpm dev            # Chrome 开发
pnpm dev:firefox    # Firefox 开发
pnpm compile        # TypeScript 检查
pnpm build          # 生产构建 → .output/chrome-mv3
pnpm zip            # 打包 Chrome 版本
```

## 测试

见 [测试手册](docs/TESTING.md)。附了两个不需要登录的模拟签到页：

- [test/checkin-demo.html](test/checkin-demo.html) —— 普通文本按钮
- [test/checkin-image-demo.html](test/checkin-image-demo.html) —— 图片按钮、纯 CSS sprite、canvas 自绘按钮

```bash
python3 -m http.server 8899 --directory test
```

然后在装好扩展的 Chrome 里访问 `http://127.0.0.1:8899/checkin-demo.html`。

图片/画布按钮的识别与执行有自动自检（无头 Chrome，不需要装扩展）：

```bash
pnpm verify:images
```

## 目录

```
entrypoints/
  background/index.ts   # alarm 调度、状态机、消息路由、识别
  content/index.ts      # 圈选遮罩与自检（界面是原生 sidePanel）
  content/selector.ts   # 圈选遮罩与 DOM 摘要提取
  content/style.css     # 圈选遮罩样式（cm-sel-* 前缀）
  sidebar/              # React 侧边栏（App / ui / views）
lib/
  types.ts              # Task / CheckinRecipe / 消息协议
  storage.ts            # chrome.storage CRUD、时间计算
  recognizer.ts         # 本地启发式 + 可选 AI 识别
  executor.ts           # 按配方在目标页执行
  scheduler.ts          # alarms、补领、回访
  notifications.ts
assets/viewfinder.css     # 取景框设计系统（纯 CSS）
designs/capmind-tasks/  # 设计稿 canvas
docs/PRD.md             # 产品方案
```

## 发布（保留插件 ID）

插件已上线，扩展 ID 由 **Chrome Web Store 的那个条目**决定，代码里没有 `manifest.key`。保住 ID 的做法：

1. 用**同一个商店条目**上传新 zip，不要新建条目；
2. `package.json` 版本号在 `0.0.2` 基础上继续递增（当前 `0.1.0`），不要重置；
3. `pnpm build && pnpm zip`，上传 `.output/chrome-mv3.zip`；
4. 商店描述、权限说明、隐私政策见 `CHROME_STORE_CHECKLIST.md` / `PRIVACY.md`。

详见 [发布指南](RELEASE.md) 与 [PRD](docs/PRD.md)。

## 许可

MIT

# CapMind 商店发布文案（0.1.0）

> 用于 Chrome Web Store 条目 `lobklckoajeijnebfpfbmcpjekafbbca`。
> 旧文案（AI 浏览助手/智能截图/实时翻译/AI 问答）已作废，以下为新版事项助手定位。

---

## 软件包中的摘要（来自 manifest.json，需上传新包后生效）

在网页上圈选一块，自动归类为待办、追踪或杂项：每日签到到点提醒或自动领，长周期事项拆阶段节点逐个盯，资料随手存可搜。数据只存本地，无后端无遥测。

---

## 说明（简体中文）

CapMind · 事项助手

在任意网页上圈选一块内容，CapMind 会判断它属于哪一类，并帮你管起来。所有数据只存在你的浏览器本地，没有后端、没有账号。

三个收纳桶

• 待办 — 每天或每周要做的动作（领额度、签到、打卡）。到点提醒你，或让扩展自动帮你点掉；自动执行失败会自动转为提醒，不会静默失败。完成后可一键撤销。

• 追踪 — 有周期、分阶段的事（ICP 备案、资质申请、考试报名）。AI 拆出阶段节点，逐节点提醒，带截止倒计时；你陆续收集到的资料作为「材料」归入同一个追踪，需要时一键提取为新节点。

• 杂项 — 没有时间属性的资料（链接、段落、想法）。只存不提醒，按标题、标签或原文摘录搜索。

怎么用

1. 点工具栏图标，打开右侧的原生侧边面板；
2. 在网页上框选一块内容；
3. CapMind 自动识别并预填，你核对后保存；
4. 到点会在浏览器里收到通知。

隐私与设计

• 本地优先：无后端、无账号、无遥测、无分析 SDK；
• 圈选只读取你框选的区域，不读整页、不读其他标签、不上传截图；
• 每日执行是纯本地判断，不发任何网络请求；
• AI 识别默认关闭；开启后数据只发往你自己配置的端点；
• 支持一键导出 / 导入备份，换设备不丢数据；
• 黑白主题，界面克制。

注意：浏览器需要保持打开，定时提醒与自动执行才会运行；关机期间不执行，重新打开后补上。

---

## Description (English)

CapMind · Items Assistant

Select any block of content on a web page. CapMind works out what it is and files it for you. All data stays locally in your browser — no backend, no account.

Three buckets

• To-Do — Daily or weekly actions (claim credits, check in, sign in). Get a reminder at the right time, or let the extension do the click for you. If automation fails it falls back to a reminder, never silently. Completed items can be undone with one click.

• Track — Multi-stage, long-running matters (ICP filing, permit applications, exam registration). AI breaks the process into stages, reminds you at each one, and shows a deadline countdown. Materials you collect attach to the same track and can be promoted into new stages with one click.

• Clips — Undated material (links, paragraphs, ideas). Stored without reminders, searchable by title, tag, or excerpt.

How to use

1. Click the toolbar icon to open the native right-side panel;
2. Drag-select a block on any page;
3. CapMind recognizes and pre-fills the fields — you review and save;
4. Get a browser notification when it's time.

Privacy & design

• Local first: no backend, no account, no telemetry, no analytics SDK;
• Selection reads only the area you highlight — never the whole page, other tabs, or screenshots;
• Daily execution is purely local — no network requests;
• AI recognition is off by default; when enabled, data goes only to your own endpoint;
• One-click backup export / import;
• Clean black-and-white theme.

Note: keep your browser open for scheduled reminders and automation. Tasks missed while the browser was closed are made up on reopen.

---

## 权限理由（用于「隐私权」tab / 权限说明）

• `storage` — 在本机保存事项、设置与 90 天执行历史。
• `alarms` — MV3 下唯一可靠的定时调度，用于每日提醒与追踪节点提醒。
• `tabs` / `scripting` — 打开目标页并注入本地判据校验与一次点击（仅在你保存的事项上）。
• `activeTab` — 响应工具栏图标点击，读取当前标签页的圈选区域。
• `contextMenus` — 提供「圈选这一块，记成事项」右键入口。
• `notifications` — 只在需人工处理、执行失败或回访日发通知。
• `<all_urls>` — 圈选与执行需作用于你指定的任意站点。扩展只在你主动圈选或已保存的站点上读取选区内容并执行一次点击，不读取整页、不读取其他标签页、不读取浏览历史。

---

## 其他字段建议

• 类别：工具（Tools）
• 语言：简体中文（Chinese Simplified）
• 首页网址：（留空，无独立官网）
• 支持信息页面网址：（建议填一个 GitHub Issues 或留空）
• 成人内容：关闭

# CapMind · 事项助手 PRD v0.2

> **全部重做，保留插件 ID。** 首期两件事：**圈选识别生成签到配方** + **长周期待办提醒**。
> 不再内置任何站点，也不再预设 adapter——用户教它，而不是开发者猜。

| 项 | 值 |
| --- | --- |
| 版本 | v0.2（待评审） |
| 日期 | 2026-11-13 |
| 落地工程 | 现有 `CapMind v0.0.2` 目录，清空重写 |
| 上架状态 | 插件已上线、无用户；开发完成后用**同一商店条目**发新版替换 |
| 关联设计稿 | `designs/capmind-tasks/`（claude-design canvas） |
| 状态 | 待拍板「开放问题」后进入开发 |

---

## 0. 相对 v0.1 的三处调整

| # | v0.1 | **v0.2（本版）** |
| --- | --- | --- |
| 1 | 开发者内置 3 个站点 adapter | **不内置任何站点**。用户在目标网页上**圈选区域 → AI/OCR 识别 → 生成签到配方**，任意站点自助接入 |
| 2 | 在现有 CapMind 上「新增一个事项 Tab」，旧功能共存 | **全部重做并替换**。旧功能（AI 概览、智能截图、翻译、词汇本、AI 问答）全部删除；**保留插件 ID 与上架身份**，直接发布替换已上线插件 |
| 3 | 录制 / LLM 自愈放到 v0.3 | **圈选识别提前到首期核心**，但执行阶段仍是确定性规则，不调模型 |

---

## 1. 前提与处置

### 1.1 代码处置清单

**删除（现有全部业务功能）**

```
entrypoints/sidebar/components/tabs/{OverviewTab,CaptureTab,VocabularyTab,SettingsTab}.tsx
entrypoints/sidebar/components/{ChatDrawer,BottomActionBar}.tsx
entrypoints/content/{capture,message-handler,sidebar,ui-utils}.ts
lib/{vocabulary,screenshot,translation-service,ai-service,storage}.ts  # 按新模型重写
smart-capture/                    # 独立子包，删除
components/ui/*                   # 保留组件库底座，按新设计系统裁剪
i18n/locales/*                    # 文案全换
assets/*                          # 样式全换
README.md / RELEASE.md / CHROME_STORE_CHECKLIST.md / PRIVACY.md / SECURITY_AUDIT.md
```

**保留（身份 / 工程 / 上架）**

| 保留项 | 原因 |
| --- | --- |
| `wxt.config.ts` 中的 `manifest.name` / `version` / `action` 与打包目标 | 同一商店条目要求包名与版本连续递增 |
| `package.json` 的 `name: capmind`、版本号、build / zip / release 脚本 | 发布链路复用 |
| `.github/workflows/release.yml`、`scripts/version.js`、`RELEASE.md`、`CHROME_STORE_CHECKLIST.md` 的**流程骨架** | 发布流程沿用，文案内容按新产品重写 |
| `PRIVACY.md` / `SECURITY_AUDIT.md` 的**文档位置** | 商店审核材料仍在，内容按新数据流重写 |
| WXT + React + TypeScript + Tailwind 技术栈 |  scaffold 不换 |
| `.gitignore` / `tsconfig*` / `.npmrc` | 工程配置 |

### 1.2 插件 ID 怎么保住（重要）

排查结果：

- `wxt.config.ts` 与 `.output/chrome-mv3/manifest.json` **都没有 `manifest.key`**；
- `release.yml` 只做 `pnpm build → zip → GitHub Release / artifact`，**没有 Chrome Web Store 上传步骤**，代码里也没有 item ID。

所以扩展 ID 目前**完全由 Chrome Web Store 后台的那个条目决定**，不在代码里。保留 ID 的实际动作是：

1. 开发完成后，**在同一个商店条目里上传新 zip**（不要新建条目），ID 自动不变；
2. `package.json` 版本号在 `0.0.2` 基础上继续递增，不要重置为 `0.0.1`；
3. 保留现有发布流程骨架；若后续要接商店自动上传，把 item ID 作为 secret 注入，不写进代码；
4. **可选**：若希望本地 `pnpm dev` 加载时也保持同一 ID，需要从已上线扩展的 `chrome://extensions` 复制 `key` 写入 `manifest.key`——这一步需要你提供，见开放问题 5。

> 结论：**不需要保留任何业务代码来保 ID**，只需要保住商店条目和版本连续性。

### 1.3 其他假设（需确认）

- 只做 Chromium MV3（Chrome / Edge），沿用 `<all_urls>` host_permissions。
- 界面采用 Chrome **原生 `chrome.sidePanel`** 侧边面板（实测反馈 iframe 方案会被页面挤占、刷新即失效）；旧浏览器回退独立标签页。
- 识别**默认走本地启发式规则**（分析圈选出的按钮与文案，零网络、零 Key）；用户可在设置里开启 AI，用自己配置的 OpenAI 兼容端点做一次识别，失败自动回落本地。
- 首期不做跨设备同步、不做云端「关机也签到」、不做账号体系。
- **本轮只交付 PRD 与设计稿，不动代码**。代码清空放到你确认方案之后执行。

---

## 2. 背景与定位

**痛点**：`aihot.news/free-tokens` 这类聚合页列出大量免费额度，多数要每日签到；站点只做信息聚合（「今天还能领 ¥598」「下次刷新还有 11:56」），不替你领，也不替你记你打算用哪几个。另一头，ICP 备案、域名续费这类跨月事项，普通 Todo 只在到期日提醒一次，中间没有回访，极易烂尾。

**现有产品的缝隙**（详见 [附录 B](#附录-b调研来源)）：专用签到工具站点写死；AI 浏览器 Agent 泛化执行但无长期状态；Todo 只提醒不执行。没有一款把「随手记录 → 自动执行 / 定期回访 → 失败提醒」缝起来。

**一句话定位**：CapMind 是一个**浏览器端个人事项 Agent**——你在网页上圈一块，它学会怎么替你签到；你记一件要办一个月的事，它每周回来问你到哪一步了。

### 首期目标

| | |
| --- | --- |
| G1 | 任意签到站点，用户 3 步内接入，不需要开发者写代码 |
| G2 | 每天自动执行，漏签补领，出问题才提醒 |
| G3 | 长周期事项每周回访，不静默烂尾 |

### Non-goals

- 不做内置站点库、不做站点白名单
- 不做全自动无人确认的「识别即生效」——生成结果必须可编辑、可试跑
- 不做验证码破解、不代填账号密码
- 不做云端 Worker 兜底、不承诺关机也能跑
- 不做跨端同步、团队协作、额度价值聚合展示
- 不做通用对话式 Agent / 自然语言下达任务（v0.3 再议）

---

## 2.5 首期执行模型（v0.2 修订）

原设计以「圈选出的按钮选择器」为执行核心，实测发现两个问题：按钮可能不在当前页（聚合页跳转）、需要登录态。修订为：

**圈选 = 一次性线索，不是执行入口。** 真正每天使用的是 `url` + `cadence` + `lastDoneAt`。

| 模式 | 谁执行 | 插件职责 | 失败处理 |
| --- | --- | --- | --- |
| `remind` 提醒（默认） | 用户 | 到点通知 + 打开页面；用户点「今天已完成」记 `lastDoneAt` | 无（本就不代点） |
| `auto` 自动（尽力） | 插件 | 打开页面 → **按语义现场找**按钮（不依赖固定 selector）→ 点击 → 核对成功判据 | 找不到/需登录/无效果 → 降级为提醒通知 |

自动模式必须**试跑通过**才能启用，否则保存时自动退回提醒模式。判据匹配范围收窄到按钮局部容器，避免全页「已领取」文案造成误判。

## 3. 核心概念

### 3.1 统一「事项」模型

两类事只是**执行主体**与**成功判定方式**不同，其余（捕获、存储、调度、通知、历史、看板）完全共用。

```ts
type TaskType = 'checkin' | 'milestone';
type RunStatus = 'ok' | 'already' | 'needs-human' | 'error';

interface Task {
  id: string;
  type: TaskType;
  title: string;
  url: string;
  site: string;
  note: string;
  enabled: boolean;
  createdAt: number;
  archivedAt?: number;

  // ── 仅 checkin ──
  recipe?: CheckinRecipe;
  cadence?: { kind: 'daily'; at: string; jitterMin: number };
  nextRunAt?: number;
  lastRunAt?: number;
  lastStatus?: RunStatus;

  // ── 仅 milestone ──
  expectedDays?: number;
  startedAt?: number;
  reviewEveryDays?: number;   // 默认 7
  nextReviewAt?: number;
  milestones?: { id: string; title: string; done: boolean; doneAt?: number }[];
  deferredCount?: number;

  history: RunRecord[];
  notifyOnFailure: boolean;
}

interface RunRecord {
  at: number;
  status: RunStatus;
  message: string;
  evidence?: string;          // 本地 DOM 摘要 / 截图
}
```

### 3.2 ⭐ CheckinRecipe（本次的核心）

圈选识别的产物。它是一份**可编辑、可试跑、可重新生成**的结构化配方，替代 v0.1 的硬编码 adapter。

```ts
interface CheckinRecipe {
  version: 1;
  site: string;                    // hostname
  urlPattern: string;              // 该配方在哪些页面生效
  action: {
    kind: 'click' | 'fetch' | 'script';
    selector?: string;             // AI 生成的按钮选择器
    textHint?: string;             // 按钮文案，执行前校验选择器没漂移
    coords?: { x: number; y: number };  // 选区相对坐标，兜底
  };
  alreadySignals: string[];        // 「今日已领取」「明日再来」→ 幂等判据
  successSignals: string[];        // 「领取成功」「+100 积分」→ 成功判据
  displayFields: { label: string; value?: string; selector?: string }[];
  evidenceSnapshot?: string;       // 识别时的 DOM 摘要 + 选区截图（本地）
  generatedBy: 'ai' | 'ocr' | 'manual';
  confidence?: number;
  lastValidatedAt?: number;
}
```

| 字段 | 由谁产生 | 为什么需要 |
| --- | --- | --- |
| `action.selector` | AI（VLM 看布局）/ 用户手改 | 每日执行点哪里 |
| `action.textHint` | OCR + AI | 执行前校验按钮文案没变，防止选择器漂移到别处 |
| `alreadySignals` | AI 理解页面文案 | **幂等**：命中就不点，避免重复领取 |
| `successSignals` | AI 理解页面文案 | 确认真的领到了，而不是只点了按钮 |
| `displayFields` | OCR + AI | 看板上显示「今日额度 ¥598」「刷新倒计时」 |
| `evidenceSnapshot` | 本地 | 站点改版时对比、支持「重新圈选识别」 |
| `confidence` | AI | 低于阈值强制先试跑，不允许直接保存 |

> **设计红线**：识别只在**创建 / 重新识别**时发生；每日执行是纯确定性规则，**不调用模型、不产生费用、不上传任何页面内容**。

### 3.3 两类事项对照

| | 每日签到 | 长周期事项 |
| --- | --- | --- |
| 谁执行 | 机器按配方全自动 | 人主导，机器只回访 |
| 成功判定 | 明确，靠 `successSignals` | 模糊，需人判断进度 |
| 触发 | 每日固定时间 + 随机抖动 | 每 N 天回访一次 |
| 失败 | 自动重试一次 + 通知 | 不需重试，只提醒 |
| 看板形态 | 紧凑状态行 | 带进度条的区块 |
| 完成 | 每天重置 | 归档留痕 |

---

## 4. 功能需求

### FR-1 圈选捕获（P0）
- 侧边栏 / 右键菜单 / 工具栏提供「圈选一块」入口，进入选区模式
- 页面上出现遮罩，用户拖拽框选任意区域；支持重选、Esc 取消
- 抓取三类素材：**选区截图**、**选区内 DOM 摘要**（元素、文本、按钮文案、属性）、**当前 URL / 标题 / favicon**
- 圈选完成后弹出类型选择：**「记成每日签到」/「记成长周期事项」**
- **验收**：任意站点 3 步内完成圈选；取消后页面无残留 DOM / 监听

### FR-2 AI / OCR 识别生成签到详情（P0）
- 把选区素材交给识别层，输出 `CheckinRecipe` 草稿
- **AI 路径**（默认）：用户配置的视觉模型，返回结构化 JSON（按钮选择器、判据、展示字段、置信度）
- **OCR 路径**（无 Key / 用户关闭 AI）：只提取文字，生成「按钮文案 + 已领/成功关键词」草稿，选择器留空由用户补
- 生成结果以**可编辑表单**呈现，逐字段可改，不黑盒
- 置信度低 / 关键字段缺失（无 `alreadySignals`）时，界面明确标出「建议先试跑」
- **验收**：在未见过的站点上能生成可编辑配方；AI 不可用时 OCR 路径仍可完成创建

### FR-3 试跑与保存（P0）
- 「试跑一次」：立即在当前页面按配方走一遍**判据校验 → 点击 → 结果判定**，展示每步命中情况
- 试跑不通过时给出具体原因（选择器没找到 / 文案不匹配 / 没命中成功判据），并提供「重新圈选」「手动改选择器」
- 保存后配方进入每日调度；保存即写 `lastValidatedAt`
- **验收**：没有试跑通过的配方默认不启用自动执行（可强制开启但需二次确认）

### FR-4 按配方每日执行（P0）
- 调度：`chrome.alarms` + 每日固定时间 + 随机抖动
- 执行顺序（**判据优先于点击**）：
  1. 打开 / 复用目标 tab（后台、不抢焦点）
  2. 用 `textHint` 校验 `selector` 仍指向同一元素，不匹配 → `needs-human`
  3. 命中 `alreadySignals` → 记 `already`，**不点击**
  4. 点击 → 命中 `successSignals` → `ok`
  5. 都不匹配 → `needs-human` + 通知 + 建议「重新圈选识别」
- 补领：浏览器启动 / SW 唤醒时扫描 `nextRunAt < now`，5 分钟内补
- 失败分级：`needs-human`（未登录 / 验证码 / 判据失效 / 页面改版）、`error`（网络 / 超时，自动重试 1 次）
- 手动兜底：每项「立即签到」
- **验收**：未登录、验证码、页面改版三种情况都有明确状态与通知，且不会误点其他按钮

### FR-5 长周期待办提醒（P0）
- 圈选后选择「记成长周期事项」，识别结果自动填入标题 / 备注（如圈到「备案审核 20 个工作日」）
- 填「预计耗时」「回访频率」（默认 7 天）、里程碑列表
- 到回访日发通知：「备案 · 已过 14 天，到哪一步了？」，可「打开 / 稍后 / 延期一周」
- 一键延期并记 `deferredCount`；**延期 ≥ 3 次**在看板与详情页显示「已延期 N 次」并提示重新评估（拆小步骤 / 标记完成 / 删除）
- 完成时归档留痕
- **验收**：跨 4 周准时回访，延期后日期正确重算，不重复通知

### FR-6 统一看板「今日」Tab（P0）
- 顶部：日期 + 今日签到完成度（x/y 刻度）+ 待处理计数
- 「每日签到」：紧凑状态行（站点 · 最近结果 · 来源标记「圈选生成」· 立即签到）
- 「长周期事项」：进度条 + 里程碑完成数 + 下次回访
- 筛选：全部 / 待处理 / 已完成
- 「全部」页底部有**已归档**区：归档事项带删除线 + 归档日期，点开可查看历史或恢复为活跃事项
- 空状态给明确下一步：「在任意网页圈选一块，教它替你签到」
- **验收**：一屏内看到两类事项

### FR-7 历史与配方维护（P1）
- 每项近 30 天日历热力图、执行记录（含失败原因与证据摘要）
- 配方详情页展示全部字段、来源、置信度、上次校验时间
- 「重新圈选识别」：站点改版后重走 FR-1～FR-3，保留历史
- 详情页「管理」区：归档（停止执行/回访，保留记录，可恢复）与删除（二次确认，连带记录一起删除）
- 本地保留 90 天记录，超限自动清理

### FR-8 通知（P0）
- 只在三种时机发：`needs-human` / `error` / 回访日；`ok`、`already` 静默
- 文案写清「哪一项 + 出了什么事 + 点开能做什么」

### FR-9 设置与身份（P0 / P1）
- P0：模型服务商 / API Key（本地加密存储，沿用现有 key 管理思路）、是否启用 AI、签到时段、通知开关
- P0：`manifest` 权限、`package.json` 版本、`release.yml` 发布链路按第 1 节处置
- P1：数据导出 / 导入、主题与语言、配方批量管理

---

## 5. 关键流程

**A. 圈选 → 生成签到配方**

```
进入选区模式 → 拖拽框选
  → 抓取 [截图 + DOM 摘要 + URL]
  → 选择类型「每日签到」
  → 识别层（AI 视觉模型 / OCR 兜底）→ CheckinRecipe 草稿
  → 可编辑表单（逐字段可改，低置信度标记）
  → 试跑一次 → 展示判据命中情况
  → 确认保存 → 进入每日调度
```

**B. 每日执行**

```
SW 启动 → ensureAlarms() + 扫描漏跑
  → alarm 触发 → 串行队列
  → 打开 tab → 校验 textHint → 检查 alreadySignals
  → 点击 → 检查 successSignals
  → 写 history / 更新 nextRunAt
  → needs-human / error → 通知
```

**C. 长周期回访**

```
ensureAlarms() 扫描 nextReviewAt ≤ now
  → 通知 + 看板标「待回访」
  → 用户「推进 / 延期 / 完成」→ 重算或归档
```

---

## 6. 技术方案

### 6.1 目录（清空后重建）

```
entrypoints/
  background/index.ts          # alarms 调度、状态机、消息路由、通知
  content/
    index.ts                   # 侧边栏注入
    selector.ts                # 圈选遮罩、选区抓取、DOM 摘要
  sidebar/
    App.tsx / main.tsx / index.html
    components/
      TodayTab.tsx
      TaskRow.tsx / MilestoneBlock.tsx
      RecipeEditor.tsx         # 识别结果可编辑表单
      TypePicker.tsx           # 签到 / 长周期选择
      TrialRunPanel.tsx        # 试跑结果
      TaskDetail.tsx
      SettingsTab.tsx
lib/
  tasks.ts                     # Task 类型 + CRUD + 状态计算
  recipe.ts                    # CheckinRecipe 生成、校验、执行
  recognizer.ts                # AI / OCR 识别层
  executor.ts                  # 按配方执行、判据判定
  scheduler.ts                 # alarms / ensureAlarms / 补领 / 串行队列
  storage.ts                   # chrome.storage.local / sync（重写）
  notifications.ts
assets/viewfinder.css            # 取景框设计系统（纯 CSS tokens + 组件类，不依赖 Tailwind 运行时）
entrypoints/sidebar/ui.tsx     # 共享小组件（Header / Tabs / Steps / Corners）
entrypoints/sidebar/views/     # 今日 / 识别结果 / 详情 / 设置
```

### 6.2 ⚠️ 必须修的技术债

v0.1 已指出：`entrypoints/background/index.ts:259` 用 `setInterval` 做定时清理。MV3 的 Service Worker 空闲即被终止，`setInterval` 不会持续存在。**本次重写直接用 `chrome.alarms` + `ensureAlarms()`**，不把旧调度逻辑带过来（[alarms API](https://developer.chrome.com/docs/extensions/reference/api/alarms)、[MV3 定时任务踩坑](https://cloud.tencent.cn/developer/article/2513437)）。

### 6.3 权限

| | 内容 |
| --- | --- |
| 现有 | `activeTab, storage, tabs, scripting, contextMenus, notifications` |
| **新增** | `alarms` |
| 已新增 | `sidePanel`（原生侧边面板承载界面） |
| 不建议新增 | `cookies`（复用已登录 tab 即可） |

`host_permissions` 保持 `<all_urls>`（圈选需要任意站点注入），商店说明里收窄用途描述。

### 6.4 识别层

| 路径 | 输入 | 输出 | 触发时机 |
| --- | --- | --- | --- |
| 本地启发式（默认） | 选区 DOM 摘要（按钮、文案、文本） | `CheckinRecipe` 草稿 | 仅创建 / 重新识别，零网络 |
| AI（可选） | DOM 摘要 + 结构化 prompt，用户自配端点 | 覆盖草稿字段 | 仅创建 / 重新识别；失败自动回落本地 |
| 手动 | — | 用户逐字段填 | 随时 |

- 模型需支持 vision；Key 由用户在设置里配置，**本地加密存储，不发往除用户指定端点外的任何地方**
- 识别结果一律走「表单 → 试跑 → 保存」，模型输出永不直接生效
- 每日执行阶段**完全不调用模型**

### 6.5 存储与隐私

- `chrome.storage.local`：`tasks`、`taskRuns`（近 90 天）、`evidenceSnapshot`（限量）
- `chrome.storage.sync`：`settings`（签到时段、回访频率、通知开关、是否启用 AI）
- **不存账号密码；不上传整页、不上传其他标签页；圈选截图只发用户自己配置的模型端点**
- `PRIVACY.md` 按新数据流重写，明确「识别时发送什么、执行时发送什么（无）」

### 6.6 边界（要在 UI 里说清）

- **浏览器必须开着**才会自动签到；关机期间不跑，重开后补领。不承诺 7×24。
- 设备睡眠时 alarms 不唤醒设备，醒来后靠 `lastRunAt` 补跑。
- 未登录 / 验证码 → `needs-human`，**绝不尝试输入凭据、不破解验证码**。
- 每次执行只开自己创建的 tab，用完关闭，不抢用户焦点。

---

## 7. 风险与对策

| 风险 | 影响 | 对策 |
| --- | --- | --- |
| AI 生成的Selector不稳 / 判据误判 | 误点别的按钮 | `textHint` 执行前校验 + 试跑 + 人工确认；判据优先于点击 |
| 站点改版，配方失效 | 静默失败 | 不匹配一律 `needs-human` + 通知 + 引导「重新圈选识别」，不猜、不强点 |
| 模型返回非结构化 / 幻觉 | 脏配方 | JSON schema 校验 + 逐字段可编辑 + 低置信度强制试跑 |
| Key 泄露 / 截图外传 | 隐私事故 | 只发用户指定端点；设置里可关闭 AI 走 OCR；隐私说明写清 |
| 模型成本 | 持续费用 | 识别只在创建时发生，执行阶段零调用 |
| SW 被终止 / alarm 丢失 | 漏签 | `ensureAlarms()` + 补领，不用 `setInterval` |
| 重复通知 / 通知疲劳 | 用户关权限 | `ok`/`already` 静默；以 `nextReviewAt` 为唯一凭据，发出即重算 |
| 用户以为关机也能跑 | 预期落差 | 空状态、新建表单、设置页三处写明边界 |
| 时区 / 跨零点 | 漏签或重复 | 本地时间 + 时间戳比较，日期边界统一 Asia/Shanghai |
| 商店审核（`<all_urls>` + 自动点击 + 新数据流） | 上架受阻 | 隐私政策重写；强调本地执行、无数据外传；保留现有审核材料框架 |
| **发版替换丢失 ID** | 用户与评价断掉 | 用同一商店条目上传；版本从 `0.0.2` 递增，不重置 |

---

## 8. 分期

| 阶段 | 范围 |
| --- | --- |
| **MVP（本期）** | 第 1 节代码清空 + FR-1～FR-6、FR-8、FR-9 P0 + `alarms` 重写；单浏览器、单机 |
| v0.3 | FR-7 完整历史与配方维护、OCR 增强、配方批量管理、导出导入 |
| v0.4（才谈 Agent） | 自然语言创建事项、失效时 LLM 辅助重新定位选择器、云端兜底、跨端同步 |

---

## 9. 验收标准

- [ ] 在**从未适配过**的站点上，圈选 → 识别 → 试跑 → 保存全流程 ≤ 3 分钟，无需改代码
- [ ] AI 不可用时 OCR 路径仍能完成创建
- [ ] 生成的配方每个字段可编辑；低置信度配方未经试跑不能启用自动执行
- [ ] 试跑展示判据命中明细；选择器漂移时不会误点
- [ ] 3 个不同站点连续 14 天自动签到完成率 ≥ 90%，`already` 不重复点击
- [ ] 关闭浏览器再打开，漏签任务 5 分钟内补领
- [ ] 未登录 / 验证码 / 页面改版分别产生 `needs-human` 且引导重新圈选
- [ ] 长周期事项第 7 / 14 / 21 天准时回访，延期后日期正确，无重复通知
- [ ] `ok` / `already` 不产生任何通知
- [ ] 每日执行阶段无模型调用（网络面板可验证）
- [ ] `background/index.ts` 中不再有 `setInterval` 承担调度职责
- [ ] 旧功能（概览 / 截图 / 翻译 / 词汇 / AI 问答）代码与资源已清除
- [ ] `pnpm compile` / `pnpm build` / `pnpm zip` 通过；版本号在 `0.0.2` 之上递增
- [ ] 用同一 Chrome Web Store 条目上传，扩展 ID 与线上一致

---

## 10. 开放问题（需要你拍板）

1. **识别用哪个模型？** 需要 vision 能力。建议默认 Gemini / OpenAI 兼容视觉模型，Key 用户自填。
2. **AI 不可用时是否强制走 OCR？** 建议是（否则无 Key 用户完全用不了）。
3. **圈选交互细节**：拖拽矩形选区，还是「点元素自动高亮」？建议两者都做（拖拽为主，点选为辅）。
4. **试跑是否允许真的领取？** 建议允许但显著标注「这会真的点一次」；也可做「只校验不点击」的干跑模式。
5. **是否要固定本地扩展 ID 的 `manifest.key`？** 如需要，请从已上线扩展的 `chrome://extensions` 复制 key 给我；不提供则沿用「商店条目保 ID」的方式。
6. **长周期默认回访频率 / 签到默认时间？** 建议 7 天 / `09:30` + 0–30 分钟抖动。
7. **本轮确认后是否直接执行代码清空？** 建议先按这份 PRD + 设计稿确认，再动手删文件。

---

## 附录 A：设计主题

**取景框 / Viewfinder**（`designs/capmind-tasks/` canvas）——从「在网页上框一块」出发：雾白坐标纸底 `#F0F0ED`、墨黑 `#1B1A17` 结构、朱砂 `#B23A1F` 主色、苔绿 `#3F6B4A` 完成态、直角细线、取景框四角标与刻度尺。无蓝色、无渐变。扩展页面不加载外部字体，用系统字体栈 + 等宽数字还原同一套质感。

## 附录 B：与 v0.1 的关系

`docs/PRD.md` 已被本版覆盖。`design/mockup.html` 与 `design/preview.png` 是 v0.1 的 HTML 设计稿，保留作参考；**本版设计稿在 `designs/capmind-tasks/` canvas 中**。

## 附录 C：调研来源

- [WXT 官方文档](https://wxt.dev/guide/installation.html) · [Chrome alarms API](https://developer.chrome.com/docs/extensions/reference/api/alarms) · [MV3 定时任务实践](https://cloud.tencent.cn/developer/article/2513437)
- [AIHOT Token 羊毛](https://aihot.news/free-tokens) · [AIHOT 开源仓库](https://github.com/KKKKhazix/AIHOT)
- 现有签到工具（站点写死，作为反例）：[daily-checkin-extension](https://github.com/stone123-btn/daily-checkin-extension)、[WB-AutoClaim](https://github.com/007wuzhaokang/WB-AutoClaim)、[ai-token-checkin-workers](https://github.com/DewellNaa/ai-token-checkin-workers)
- 浏览器端 Agent：[Nanobrowser](https://chromewebstore.google.com/detail/nanobrowser/imbddededgmcgfhfpcjmijokokekbkal?hl=en)、[MCP-B Agent](https://chromewebstore.google.com/detail/mcp-b-agent/daohopfhkdelnpemnhlekblhnikhdhfa)、[Tabbit](https://www.stdaily.com/web/gdxw/2026-03/02/content_478782.html)
- 通用自动化：[Automa](https://github.com/automaapp/documentation/blob/8e8bf8b651455648d743a7d792b49e237b82a047/docs/zh/blocks/trigger.md)、[UI.Vision](https://chromewebstore.google.com/detail/uivision/gcbalfbdmfieckjlnblleoemohcganoc?hl=zh-TW&gl=HK)

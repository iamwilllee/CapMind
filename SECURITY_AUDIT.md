# 安全审计 · CapMind 0.1.0

审计范围：MV3 扩展的本地数据流、页面注入、调度与可选 AI 识别。

## 架构边界

| 组件 | 运行位置 | 能力 |
| --- | --- | --- |
| `background` Service Worker | 扩展进程 | alarms、storage、tabs、scripting、notifications、可选模型请求 |
| `sidebar.html` | 扩展页面（iframe 注入网页） | 完整 UI；可直接调用 `chrome.*` |
| `content` 脚本 | 宿主页面（隔离世界） | 侧边栏 iframe、圈选遮罩、DOM 摘要提取 |

侧边栏 iframe 与 content 脚本之间只用 `window.postMessage` 传递「关闭」指令；业务数据一律走 `chrome.storage` 与 `chrome.runtime`，不通过在页面里广播敏感内容。

## 页面注入

- `chrome.scripting.executeScript` 注入的函数是**自包含的**：只接收 `recipe` 与 `doClick` 两个参数，函数体内只引用 `document` / `setTimeout`，不引用模块作用域变量。构建产物已确认无打包器 helper 依赖。
- 注入逻辑遵循**判据优先于点击**：
  1. 选择器找不到元素 → `needs-human`，不动作；
  2. 按钮文案与 `textHint` 不匹配 → `needs-human`，不点击；
  3. 页面文本命中 `alreadySignals` → `already`，跳过；
  4. 点击后未命中 `successSignals` → `needs-human` + 通知。
- 点击目标是用户在配方里确认过的元素，不做坐标盲点、不遍历点击无关按钮。

## 凭据与验证码

- 不读取、不保存、不填写账号密码或 Cookie；
- 不破解验证码；检测到需要登录/验证码时转为 `needs-human` 并通知用户手动处理；
- 每次执行只操作自己打开或复用的目标标签页，用完关闭，不改动用户当前焦点标签页。

## 内容安全策略

- Manifest V3，扩展页面默认 CSP（`script-src 'self'`），无内联脚本、无 `eval`、无远程脚本；
- 样式为本地 CSS，不加载外部字体或远程资源；
- 圈选遮罩使用 `cm-sel-*` 类名前缀与独立 z-index，避免与宿主页面样式互相污染；
- content 脚本不向页面写入 `innerHTML` 用户数据（提示条为固定文案）。

## 数据与网络

- 事项、配方、历史只写 `chrome.storage.local`；设置写 `chrome.storage.sync`；
- 执行历史保留 90 天自动截断；圈选截图不落盘、不上传；
- **每日执行阶段零网络请求**；
- 唯一可能的外部请求：用户在设置里主动开启 AI 并填入 Key 后，创建/重新识别配方时向**用户自配的 OpenAI 兼容端点**发送圈选 DOM 摘要。默认关闭，失败自动回落本地识别。

## 调度可靠性

- 使用 `chrome.alarms`（周期 30 分钟）+ SW 启动时 `scheduleAlarms()` / `tick()`；
- 不使用 `setInterval` 承担调度（MV3 Service Worker 会休眠）；
- `scheduleAlarms()` 只在 alarm 不存在时创建，避免反复重置导致永不触发；
- `tick()` 有运行锁与 `nextRunAt` / `lastRunAt` 幂等判断，不会重复点击。

## 已知边界

- 浏览器关闭期间不执行，重新打开后补领（UI 已明示，不承诺 7×24）；
- 站点改版会导致配方失效，此时转人工并提供「重新圈选识别」，不自动猜测新选择器；
- `host_permissions: <all_urls>` 是功能必需，需在商店权限理由中说明。

## 检查命令

```bash
pnpm audit
pnpm compile
pnpm build
```

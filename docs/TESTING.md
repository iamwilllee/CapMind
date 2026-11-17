# 测试手册 · CapMind 事项助手

目标是**不需要登录任何真实站点**就能跑通完整流程。我准备了一个模拟签到页：[test/checkin-demo.html](../test/checkin-demo.html)。

![测试页](test/demo-preview.png)

---

## 一、把扩展装进 Chrome

### 方式 A：加载构建产物（推荐，最贴近真实使用）

1. 打开 `chrome://extensions`，右上角开启**开发者模式**；
2. 点「加载已解压的扩展程序」，选择 `/Users/lwl/Desktop/workspace/capmind/.output/chrome-mv3`；
3. 建议把 CapMind 固定到工具栏。

> 如果你日常 Chrome 里装过线上版 CapMind，先把它**停用**，否则两个图标会混淆。
> 本地加载生成的扩展 ID 和商店 ID 不同，这是正常的；发布时用同一商店条目上传才会保住线上 ID。
>
> **装完先在 `chrome://extensions` 里确认没有红色错误提示**，并把 CapMind 图标**固定到工具栏**（拼图图标 → 图钉）。

### 界面在哪：原生侧边面板

点工具栏图标，面板**钉在浏览器右侧**，切换标签页不会消失，也不会挤占网页布局。圈选在网页上完成，**识别结果直接出现在面板里**，不新开标签页。

浏览器不支持原生面板时，自动回退为独立标签页（380px 面板居中 + 坐标纸底纹，顶部有「独立窗口模式 · 打开侧边面板 →」入口）。

### 点图标没反应？按顺序排查

**1. 确认扩展真的加载了**

`chrome://extensions` 里 CapMind 卡片应无红色错误。点「**重新加载**」，并确认图标已固定到工具栏（拼图图标 → 图钉）。

**2. 确认加载的是新构建**

旧构建没有 `sidePanel` 权限。打开 `chrome://extensions` → CapMind →「检查视图 Service Worker」→ Console 执行：

```js
chrome.runtime.getManifest().permissions
```

应包含 `"sidePanel"`。没有说明加载的是旧目录，重新加载 `.output/chrome-mv3`。

**3. 确认 Chrome 版本**

`chrome://version` 查看版本，原生侧边面板需要 **Chrome 114+**（`sidePanel.open()` 需要 116+）。低于此版本会走独立标签页兜底，功能不受影响。

**4. 自检脚本**

同一 Console 里执行：

```js
(async () => {
  const m = chrome.runtime.getManifest();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let ping = 'n/a';
  if (tab?.id) {
    ping = await new Promise((r) =>
      chrome.tabs.sendMessage(tab.id, { type: 'CM_PING' }, (resp) =>
        r(resp ? 'OK' : 'FAIL: ' + (chrome.runtime.lastError?.message ?? 'no response'))
      )
    );
  }
  console.log({
    extensionId: chrome.runtime.id,
    hasSidePanel: !!chrome.sidePanel,
    permissions: m.permissions,
    activeTabUrl: tab?.url,
    contentScriptPing: ping,
  });
})();
```

- `hasSidePanel: true` → 原生面板可用
- `contentScriptPing: OK` → 当前页面能圈选（`chrome://` 页会 `FAIL`，属正常）
- `permissions` 缺 `sidePanel` → 加载的是旧构建

**5. 手动开面板**

右键网页 →「**CapMind · 打开事项面板**」。右键菜单属于用户手势，可直接打开面板。

### 面板的已知限制

- 面板宽度由浏览器控制（拖动面板左边缘可调整），不受扩展控制；
- 面板在**每个窗口独立**，跨窗口不共享；
- 圈选遮罩会覆盖网页，但**面板保持打开**，识别完成后草稿自动出现在面板里。

### 方式 B：开发模式（改代码时热更新）

```bash
cd /Users/lwl/Desktop/workspace/capmind
pnpm dev
```

WXT 会自动打开一个**独立配置**的 Chrome 窗口并加载扩展，改代码会热更新。注意它用的是 `.wxt/browser-data` 用户目录，**没有你日常 Chrome 的登录态**——要测真实站点登录态请用方式 A。

> 这台机器的 Google Chrome 会忽略命令行的 `--load-extension`（日志里是
> `--load-extension is not allowed in Google Chrome, ignoring.`），所以 `pnpm dev`
> 打开的窗口里**可能没有扩展**。`wxt.config.ts` 已补上 `--disable-extensions-except`
> 作为兼容尝试，但正式版 Chrome 仍可能忽略。遇到这种情况直接用方式 A 手动加载，最省事。

---

## 二、启动测试站点

扩展的 content script 只注入 `http/https` 页面，所以用一个本地 server：

```bash
cd /Users/lwl/Desktop/workspace/capmind
python3 -m http.server 8899 --directory test
```

然后访问 **http://127.0.0.1:8899/checkin-demo.html**

图片按钮与画布按钮用另一个测试页：**http://127.0.0.1:8899/checkin-image-demo.html**

> 装好扩展后**刷新一次页面**，content script 才会注入（它只在页面加载时生效）。
> 也可以直接用 `file://` 打开测试页，但需要在 `chrome://extensions` 里给 CapMind 开启「允许访问文件网址」，多一步，不如用 server。

### 图片按钮 / 画布按钮（自动自检）

签到按钮常常是一张图片，甚至是一块 `<canvas>`。这类按钮没有 `textContent`，识别与执行都有专门的兜底逻辑，改动后请跑一次自检：

```bash
pnpm verify:images
```

它用无头 Chrome 加载上面两个测试页，把 `selector.ts` / `recognizer.ts` / `executor.ts` 编译后注入，断言：

| 场景 | 期望 |
| --- | --- |
| `<button><img alt="签到领额度">` | `textHint` 取到 alt，`textHintSource = 'attr'` |
| `<button><img src="btn_checkin_claim@2x.png">` | `textHint` 从文件名推断成 `btn checkin claim` |
| 纯 CSS sprite（`div[role=button]`） | 拿不到文案，`textHintSource = 'none'`，**不伪造**文案 |
| `<canvas>` 自绘按钮 | 靠圈选中心点兜底拿到 selector，`textHintSource = 'none'` |
| 以上所有 | selector **唯一命中**且指向目标元素；执行侧读到的文案与识别侧一致，不误判「文案不匹配」 |

找不到浏览器时用 `CM_CHROME=/path/to/chrome pnpm verify:images` 指定。

> 没有可校验文案的按钮（`textHintSource = 'none'`）执行时只校验元素存在，不校验文案——这是有意的取舍：宁可少一层保护，也不要每天误报「文案不匹配」。想恢复保护，在配方编辑页手动填「按钮文案」即可。

---

## 三、端到端流程（约 3 分钟）

| 步骤 | 操作 | 预期结果 |
| --- | --- | --- |
| 1 | 点工具栏图标（或右键「CapMind · 打开事项」） | 右侧出现侧边栏，显示「还没有事项」空态 |
| 2 | 点底部「**+ 圈选一块**」 | 整页变暗，顶部出现黑色说明条「拖拽框选要自动签到的那一块」，中央有呼吸中的引导框 |
| 3 | 拖拽框选「每日签到」白框 | 选区亮起（其余变暗），出现尺寸标签；**底部弹出操作条**显示「已框入 N 个可点元素」+「重选」+「识别这块 →」 |
| 4 | 点「识别这块 →」（或按 Enter） | 面板自动显示识别结果 `02 识别结果`，显示**本地识别生成 · 置信度** |
| 5 | 检查配方字段 | 签到按钮选择器应为 `#checkin-btn`；按钮文案应为「签到领额度」；已有「已领过 / 成功」判据 |
| 6 | 点「**试跑一次**」 | 真的点了一次按钮 → 测试页显示「领取成功 +100 积分」，侧边栏出现绿色 `试跑一次 · 通过 / PASS` |
| 7 | 点「**保存并启用**」 | 回到「今日」看板，出现以测试页标题命名的事项，状态为已领取 |
| 8 | 点该行的「**立即签到**」 | 显示「**今天已经领过，跳过**」——这是幂等验证，不应再点第二次 |

> 「试跑一次」会真的点击按钮。想重来就**刷新测试页**，按钮状态会重置。

### 长周期事项

1. 再点「+ 圈选一块」，框选页面下方的「网站 ICP 备案」文本块；
2. 在识别结果里选「**长周期事项**」；
3. 填名称、预计耗时 30 天、回访 7 天，确认里程碑列表；
4. 保存 → 今日看板出现带进度条的「长周期事项」区块；
5. 点标题进入详情 → 点里程碑圆点可勾选完成、可「延期一周」、可「标记完成」归档。

---

## 四、验证失败路径（很重要）

这是「判据优先于点击」的核心保障：

1. 打开签到事项详情 → 点「编辑配方」；
2. 把**按钮文案**改成 `不存在的按钮`，保存；
3. 回今日看板点「立即签到」；
4. **预期**：状态变红「按钮文案不匹配，已停止以免点错」，并弹一条通知；测试页按钮**不应该**被点击；
5. 点「重新圈选」或再编辑改回，恢复。

其他可测的失败态：把「签到按钮选择器」改成一个不存在的值 → 应报「找不到签到按钮，页面可能改版了」。

---

## 五、不用等一天，快速验证定时与补领

调度是 30 分钟一轮的 `chrome.alarms`，不用干等。用「Service Worker 启动即补领」这条路径：

1. `chrome://extensions` → 找到 CapMind → 点「**检查视图 Service Worker**」打开控制台；
2. 在控制台执行：

```js
chrome.storage.local.get('cm_tasks', ({ cm_tasks = [] }) => {
  const t = cm_tasks.find((x) => x.type === 'checkin');
  if (!t) return console.warn('还没有签到事项');
  t.nextRunAt = Date.now() - 1000;
  delete t.lastRunAt;
  delete t.lastStatus;
  chrome.storage.local.set({ cm_tasks }, () =>
    console.log('已把 nextRunAt 设为过去，现在去扩展页点「重新加载」')
  );
});
```

3. 回到 `chrome://extensions`，点 CapMind 卡片上的「**重新加载**」；
4. Service Worker 启动时 `tick()` 会立刻补领 → 测试页被自动打开/复用并签到，今日看板出现新的执行记录，失败时会弹通知。

**长周期回访**同理，把 `nextReviewAt` 设为过去再重载：

```js
chrome.storage.local.get('cm_tasks', ({ cm_tasks = [] }) => {
  const t = cm_tasks.find((x) => x.type === 'milestone');
  if (!t) return console.warn('还没有长周期事项');
  t.nextReviewAt = Date.now() - 1000;
  chrome.storage.local.set({ cm_tasks }, () => console.log('重载扩展即可触发回访提醒'));
});
```

---

## 六、去哪看日志

| 组件 | 位置 |
| --- | --- |
| background / 调度 / 识别 | `chrome://extensions` → CapMind →「检查视图 Service Worker」Console |
| 侧边栏 UI | 在面板内右键 →「检查」，或 `chrome://extensions` → CapMind →「检查视图」里找 `sidebar.html` |
| content script / 圈选 | 测试页 F12 Console（`[CapMind]` 前缀日志主要是错误信息） |
| 存储数据 | 任意扩展页控制台 `chrome.storage.local.get('cm_tasks', console.log)` |

---

## 七、常见坑

- **加载扩展后没反应** → 刷新目标页面，content script 只在新页面加载时注入。
- **圈选时面板还在** → 这是设计：面板保持打开，遮罩覆盖网页；识别完成后草稿会自动出现在面板里，无需切换。
- **独立标签页想换成钉住的面板** → 点顶部「打开侧边面板 →」，成功后面板钉在右侧，独立标签页自动关闭。右键菜单「CapMind · 打开事项面板」也能直接开面板。
- **收不到通知** → 检查 macOS 系统通知权限与 Chrome 网站通知权限。即使没弹通知，看板状态和执行记录仍然会更新，可在 SW Console 看到 `[CapMind] 通知发送失败`。
- **试跑没反应 / 报「没有拿到页面探测结果」** → 通常是因为目标页是 `chrome://` 等受限页面，或页面还没加载完；用 http 测试页重试。
- **改了代码没生效** → 方式 A 需要在 `chrome://extensions` 点「重新加载」；改 CSS/TS 后还要重新 `pnpm build`。
- **想测真实站点登录态** → 用方式 A 把 `chrome-mv3` 装进你日常 Chrome（不要用 `pnpm dev` 的隔离窗口）。

---

## 八、验收清单

- [ ] 圈选 → 识别结果自动生成，字段可逐项编辑
- [ ] 试跑真的点击并命中成功判据
- [ ] 保存后今日看板出现事项
- [ ] 「立即签到」第二次显示「今天已经领过，跳过」，不重复点击
- [ ] 改错按钮文案后停止点击 + 通知，恢复后又能成功
- [ ] 重载扩展能补领漏跑任务
- [ ] 长周期事项能勾选里程碑、延期、归档
- [ ] 长周期回访能通过重载触发通知
- [ ] 成功 / 已领过**不产生**通知，只有失败和回访才响
- [ ] 设置里关闭通知后，失败也不弹（但状态仍记录）
- [ ] 点工具栏图标，面板**钉在浏览器右侧**，切换标签页不消失
- [ ] 浏览器不支持面板时，点图标弹出独立 CapMind 标签页（兜底路径）
- [ ] 圈选完成后，识别结果**直接出现在面板里**，不新开标签页
- [ ] 独立标签页里点「打开侧边面板 →」能换成钉住的面板
- [ ] 自检脚本里 `contentScriptPing` 在普通网页上为 `OK`
- [ ] 详情页「删除这个事项」需二次确认，确认后从看板消失
- [ ] 详情页「归档」后从今日看板消失，在「全部」的已归档区可回看并恢复
- [ ] 长周期事项延期满 3 次后，看板与详情页出现「已延期 N 次」提示
- [ ] `chrome.runtime.getManifest().permissions` 含 `sidePanel`

测完告诉我哪一步不对，我直接改。

> 相关文档：[PRD](PRD.md) · [README](../README.md) · [发布指南](../RELEASE.md)

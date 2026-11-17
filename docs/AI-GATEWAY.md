# 免费大模型 / OCR 统一网关 · 方案评估

> 起因：看到 [AIHOT · Token 羊毛](https://aihot.news/free-tokens) 列了大量免费大模型与 OCR 额度，设想「做一个统一服务，背后负载均衡掉这些免费 API，再统一提供出来」。
> 本文回答三件事：**这些额度到底能不能当 API 用**、**市面上有没有现成的**、**我们该不该做**。

| 项 | 值 |
| --- | --- |
| 版本 | v1（评估） |
| 日期 | 2026-11-13 |
| 状态 | **已决：暂不落地**，只保留评估与选型结论 |
| 已定方向 | 若将来要做，**OCR 与 LLM 共用同一个网关**，对外统一成 `ocr` 别名 |
| 数据来源 | aihot.news 页面快照（2026-11-13）、各项目仓库 API、各厂商官方文档 |

---

## 0. 结论

1. **不要自己写网关。** 现成项目覆盖「统一入口 + 多 Key 轮询 + 重试 + 熔断 + 用量统计」，配置即可。
2. **首选 [GPT-Load](https://github.com/tbphp/gpt-load)**（MIT、Go 单二进制、7.2k⭐），它的「分组朝上游 / 访问密钥朝应用」两层模型正好对应我们的用法；且原生透传 Mistral `/v1/ocr`。
3. **真正要自己写的只有一块：免费额度的配额账本。** 没有任何网关知道「魔搭每天 200 魔粒、Cloudflare 每天 1 万 Neurons、百灵每月 1 日发券」这种按天/按月重置的上游预算。
4. **但 CapMind 现在不需要它。** AI 只在创建配方时可选调用（默认关闭），OCR 场景是圈选一小块 DOM，本地启发式已零成本覆盖。为这个量级池化十几个免费 Key、写配额账本、承担 ToS 风险，投入产出不划算。

---

## 1. 事实核查：这 57 张卡里能当 API 用的有多少

对页面 57 张卡做标签解析（标签含 `限产品内使用` 视为产品内权益）：

| 类别 | 数量 | 典型 |
| --- | --- | --- |
| **仅限产品内使用** | **31 张** | 豆包客户端签到 200 额度、Qoder 100 Credits、TRAE 100 积分、ima 50 算力、小浣熊 300 积分、AStudio、AutoClaw、Zed、WPS 灵犀、MiniMax Code… |
| 能当 API 用 | 26 张 | 见下 |
| 其中 **一次性新人赠金/代金券** | 14 张 | 超算互联网 1 亿 Token、百炼各模型 100 万、千帆 20 元、火山方舟 4×50 万、硅基 16 元、DeepSeek 6 元、阿里学生 300 元、Drex/TokenHub… |
| 其中 **按天/按月反复发放** | **约 12 张** | 见下表 |

> 页面自己的统计口径也印证这点：「今天还能领 ¥598」里绝大部分是产品内积分，不是 API 余额。页面多处原文写着「**不是开放平台 API 余额**」「**不能当 API**」。

### 1.1 可反复拿到的 API 额度（真正的可用池）

| 来源 | 额度 | 重置语义 | 前置条件 |
| --- | --- | --- | --- |
| 魔搭社区 API-Inference | 200 魔粒/天（绑阿里云 +50） | 24 小时滚动 | 实名 + 绑阿里云 + 验证邮箱 |
| Cloudflare Workers AI | 1 万 Neurons/天 | 北京时间 08:00 | 免费计划，超额即停 |
| 百度 ERNIE 5.5 Flash Preview | 共享 50 次/天，20 次/分 | 每日 | — |
| 蚂蚁百灵 | ¥10 抵扣券/月 | 每月 1 日 | 新计费平台 |
| 腾讯 EdgeOne Makers | 50 万 Token/月 | 每月 | 仅限技术验证 |
| 书生·端砚 | 墨点/月 | 每月 | 测试期福利，额度以账户为准 |
| Rime | $50/月（语音） | 每月 | 限评估开发、年满 18 |
| LiveKit | $2.5/月（推理） | 每月 | 需开发接入 |
| Drex | $5/月 | 每月 | 注册满一月 + 真人认证 |
| ElevenLabs | 1 万积分/月 | 每月 | 不可商用 |
| 百灵 Ling-3.2-flash | 限时免费 | 活动期 | 绑支付宝 |
| StepAudio 3 四款预览 | 限时免费 | 活动期 | 实名 |

**三种不同的重置语义（滚动 24h / 固定时刻 / 每月 1 日）——这才是配额账本真正的活。**

### 1.2 OCR 侧：只有四条能长期免费调

| 来源 | 接口形态 | 能否直接接网关 |
| --- | --- | --- |
| 硅基流动 `PaddleOCR-VL-1.5` | OpenAI `chat/completions` + 图片 base64 | ✅ 最省事，实名后免费、按模型限速 |
| 面壁 `MiniCPM-OCR 1.0` | 开放平台 API Key | ✅ 手机号验证即可 |
| SoMark OXR | 免注册 `/v1` | ⚠️ 官方写「请求排队、不建议生产使用」 |
| 百度 / 腾讯云 OCR | 各 1000 次/月 | ⚠️ 各自签名鉴权，非 OpenAI 兼容，需适配层 |

**关键判断：2026 年国内 OCR 基本已 VLM 化 + OpenAI 兼容。** 硅基流动的 PaddleOCR-VL 就是标准 `chat/completions`。所以「LLM 网关」和「OCR 网关」在我们这里可以是同一个服务，不需要两套——**只有 Mistral 原生 `/v1/ocr` 与百度/腾讯签名接口需要额外适配层**。

---

## 2. 市面方案对比

仓库状态核对于 2026-11-13（GitHub API）：

| 项目 | ⭐ | 协议 | 语言 | 定位 | 适配度 |
| --- | --- | --- | --- | --- | --- |
| [GPT-Load](https://github.com/tbphp/gpt-load) | 7.2k | **MIT** | Go | 多渠道多凭据自托管网关；单二进制；凭据池/权重/重试/冷却/黑名单/会话亲和；原生透传 OpenAI、Anthropic、Gemini、**Mistral `/v1/ocr`** | ★★★★★ |
| [new-api](https://github.com/QuantumNous/new-api) | 51.9k | **AGPL-3.0** | Go | 国内最活跃中转面板；渠道优先级+权重+失败重试+多 Key；带计费/配额/多用户控制台 | ★★★★ |
| [one-api](https://github.com/songquanpeng/one-api) | 37.4k | MIT | Go | 元祖，生态成熟但维护放缓（最近提交 2026-01） | ★★★ |
| [LiteLLM](https://github.com/BerriAI/litellm) | 63.2k | MIT + 企业目录 | Python | 功能最全：虚拟 Key / 预算 / 护栏 / 可观测；Mistral 走 [pass-through `/v1/ocr`](https://docs.litellm.ai/docs/pass_through/mistral) | ★★★ |
| [OmniRoute](https://github.com/cheaper-inference/OmniRoute) | 87.0k | MIT | TS | **专做免费池**：380 provider / 150+ free tier / 20 种路由策略 / 带 `/v1/ocr` | ★★★ |
| [freellmpool](https://pypi.org/project/freellmpool/) | 149 | MIT | Python | 专门把各厂免费层池化成一个 OpenAI 兼容端点；keyless 可起；有 Docker 镜像 | ★★★ |
| [OcrRoute](https://pypi.org/project/ocrroute/) | 3 | MIT | Python | 56 个 OCR 引擎的网关；18 种路由策略、熔断、配额、缓存、成本追踪、`/v1/ocr` | ★★ |
| [Bifrost](https://github.com/maximhq/bifrost) | 9.5k | Apache-2.0 | Go | 高性能网关内核（GPT-Load 建在它上面） | ★★★ |

### 选型结论

- **自用 / 团队内 → GPT-Load。** MIT 干净；Go 单二进制，**本机没有 Docker 也能跑**；两层模型（分组朝上游、访问密钥朝应用）正好对应「多个免费 Key 池化后发一把钥匙给应用」。模型别名可把 `PaddleOCR-VL / MiniCPM-OCR / Qwen-VL` 统一暴露成 `ocr` 一个名字，客户端换供应商不用改代码。
- **要对外发 Key、要算钱 → new-api。** 但 **AGPL-3.0**，商用嵌入前看清协议义务；README 明确写了面向公众提供生成式 AI 服务需自行完成备案等合规义务。
- **只想 10 分钟感受「免费池」手感 →** `uvx freellmpool proxy`（起在 `localhost:8080`）或 `npm i -g omniroute`（`localhost:20128`），都是 OpenAI 兼容。
- **不要把 OcrRoute 当主网关**：3 星、单人项目，形态完美但风险太高；只值得参考它 `auto/free` 路由的思路。

> GPT-Load 2.0 目前是 RC 线（rc.63，2026-11-08），1.4.x 是维护中的稳定线；且 **2.0 是单实例设计，不支持水平扩展**。自用足够。

---

## 3. 若要做：推荐架构

```
CapMind / 脚本 / 其他应用
        │  一个 BaseURL + 一把 AccessKey
        │  model 别名：chat / chat-strong / ocr
        ▼
  GPT-Load (:3001)  ── 凭据池 · 权重 · 重试 · 冷却 · 熔断 · 用量日志
        │
        ├─ 分组 A: 硅基流动      → PaddleOCR-VL-1.5(free) / DeepSeek / BGE
        ├─ 分组 B: 魔搭 API-Inference → 200 魔粒/天
        ├─ 分组 C: Cloudflare Workers AI → 1 万 Neurons/天
        ├─ 分组 D: 面壁 MiniCPM-OCR
        └─ 分组 E: 百灵 / ERNIE / SoMark（兜底）
        ▲
        │  每日预算 / 重置时刻（08:00、24h 滚动、每月 1 日）
  [配额账本 sidecar] ← 市面上没有，需要自己写
```

### 3.1 必须自己写的三块

| # | 模块 | 为什么网关做不了 | 规模 |
| --- | --- | --- | --- |
| 1 | **配额账本** | GPT-Load 的成本封顶按「访问密钥」算，不按「上游免费额度」算。需要一张 `(provider, window, used, resets_at)` 表，请求前准入、超限就临时降权该分组 | ~300 行 |
| 2 | **健康探针** | 免费额度耗尽时上游多半返回 429 而非 401，必须把「额度耗尽」与「限流」区分开，否则熔断会误杀健康渠道 | ~100 行 |
| 3 | **百度/腾讯 OCR 适配器** | 仅当要用那 1000 次/月时才需要：签名鉴权 → 转成 OpenAI 兼容响应 | ~200 行 |

### 3.2 为什么 OCR 与 LLM 共用一个网关

已定方向：**不单独做 OCR 网关**。理由：

- 国内 OCR 已 VLM 化，硅基流动 PaddleOCR-VL 就是 `chat/completions`，与 LLM 同协议；
- 一套凭据池、一套配额账本、一套日志，运维面减半；
- 用 GPT-Load 的模型别名把不同厂商的 OCR 模型收敛成 `ocr`，客户端（含 CapMind）只认这一个名字，换供应商零改动；
- 真正需要独立适配的只有 Mistral 原生 `/v1/ocr`（GPT-Load 已原生透传）和百度/腾讯签名接口（写一个适配器即可）。

---

## 3.5 CapMind 到底需不需要 OCR

上一节说的是「要不要建网关」。这里单独回答一个更前置的问题：**CapMind 的圈选识别需不需要 OCR。**

### 3.5.1 现状：纯 DOM，识别与执行两段都是

| 阶段 | 位置 | 手段 |
| --- | --- | --- |
| 圈选抽取 | `entrypoints/content/selector.ts` | `document.body.querySelectorAll('*')` + `getBoundingClientRect()` 求交集 |
| 本地识别 | `lib/recognizer.ts` | 从 `buttons` / `texts` 挑按钮与判据 |
| 每日执行 | `lib/executor.ts` | 注入 `document.querySelector` + `body.innerText` |

**签到主路径不需要 OCR**：按钮必须是可点的 DOM 元素。但有三个真实缺口。

### 3.5.2 三类会失效的图片场景

| # | 场景 | 问题 | 能否用 DOM 手段修 |
| --- | --- | --- | --- |
| ① | `<button><img src="..."></button>` | 原实现 `filter(b => b.text.length > 0)` 把 `textContent` 为空的按钮整个丢弃，`buttons: []`，本地和 AI 都识别失败 | ✅ 能 |
| ② | `<canvas>` / CSS sprite 按钮 | `canvas` 不是 `BUTTON`/`A`/`role=button`，连候选都进不去 | ✅ 能（中心点兜底） |
| ③ | 跨域 iframe 内的按钮 | `elementsInRect` 只扫当前 `document`，只能圈到 iframe 元素本身 | ❌ 不能，OCR 也救不了（拿不到内部 selector，执行同样点不进去） |

### 3.5.3 关键认知：OCR 给的是像素，不是选择器

**OCR 无法替代 DOM 识别。** 它输出文字和像素坐标，而配方要的是 CSS selector。唯一的桥接路径是：

```
截图 → OCR 得到「签到」的文字框坐标 (x, y)
     → document.elementFromPoint(x, y)
     → 反查回真实 DOM 节点 → 生成 selector
```

OCR 只负责「把像素翻译成文字」，再由 `elementFromPoint` 翻译回 DOM。这条链路对 canvas 尤其有效——canvas 内部元素查不到，但 `elementFromPoint` 能拿到 canvas 节点本身。

### 3.5.4 已落地：两个 P0 补丁（不涉及任何网络请求）

2026-11-13 已实现并验证，**OCR 排在最后，先用 DOM 手段解决**：

| 补丁 | 位置 | 做法 |
| --- | --- | --- |
| 放宽文案来源 | `selector.ts` `describeButton` | 依次退到 `aria-label` → `input.value` → `title` → 内部 `img[alt]` → `img[title]` → **图片文件名**（`btn_checkin@2x.png` → `btn checkin`）→ `background-image` 的 URL |
| canvas / 自绘兜底 | `selector.ts` `extractPayload` | 候选为空时用圈选中心点 `elementsFromPoint` 反查（要跳过圈选遮罩本身） |
| 执行侧对齐 | `executor.ts` `probePage` | 文案读取顺序必须与识别侧**完全一致**，否则「识别时拿到文件名、执行时拿不到」会让每天执行都误判「文案不匹配」 |

同时修掉两个既有 bug：

- **`cssPath` 的 `nth-of-type` 从未生效**：`tag` 是小写、`child.tagName` 是大写，比较恒为假，导致生成的 selector 不唯一（执行时可能点到别的元素）。
- **`textContent` 拼进后代文本**：容器型按钮会拿到一大段无关文字，改为只取直接文本节点（`ownText`）。

新增 `textHintSource` 字段区分文案来源：

| 值 | 含义 | 执行行为 |
| --- | --- | --- |
| `'text'` | 元素自身可见文字 | 校验文案，不匹配就停（防点错） |
| `'attr'` | 来自 alt / title / 文件名 | 同上 |
| `'none'` | 纯 sprite / canvas，无文案可校验 | **只校验元素存在**，不比对空串 |

> `'none'` 是有意的取舍：宁可少一层保护，也不要每天误报「文案不匹配」。用户在配方编辑页手动填文案后会自动恢复成 `'text'`。

自检：`pnpm verify:images`（无头 Chrome 跑 42 条断言，覆盖 4 个图片场景 + 1 个文本回归）。

### 3.5.5 仍未解决：什么时候才真的需要 OCR

只有**纯 sprite 图、无语义文件名、且不是 canvas 可反查**的按钮才必须 OCR。补丁上线后这已是长尾。

若将来要做，按优先级：

| 优先级 | 方案 | 成本 | 代价 |
| --- | --- | --- | --- |
| P1 | 本地 OCR（tesseract.js / 本机服务） | 中 | 包体变大；不碰隐私承诺 |
| P2 | 云端 OCR（硅基流动 PaddleOCR-VL，即 `ocr` 别名） | 低代码 | **违反 [PRIVACY.md](../PRIVACY.md) 的「不上传选区截图」承诺**，需同步改隐私政策与商店描述 |

技术上 `chrome.tabs.captureVisibleTab` 靠现有 `<all_urls>` + `activeTab` 就够，**不用加新权限**，但有每秒 2 次的频率限制。

**结论：签到主路径不需要 OCR；需要 OCR 的只剩长尾场景，且应复用同一个网关的 `ocr` 别名，而不是单独做一套。**

### 3.5.6 「干脆全截图 + 全走 OCR」可行吗

这是一个合理的直觉，2026-11-13 做了实测验证。结论：**技术上能跑通，但作为默认架构不划算**，原因不在于能不能 OCR，而在于**OCR 给的是像素坐标，不是可复用的定位锚点**。

#### 实测结论（无头 Chrome + canvas 双按钮页面）

一个 canvas 上画了两个按钮「签到领额度」和「查看规则」，测试结果：

| 环节 | 结果 |
| --- | --- |
| 截图 | ✅ 两个按钮清晰可辨 |
| OCR 出文字框坐标 | ✅ 能给出两组不同坐标 |
| 坐标 → `elementFromPoint` | ⚠️ **两组坐标都命中同一个 `CANVAS` 节点** |
| 按坐标真点击 | ✅ 可行，但**必须用带 `clientX/clientY` 的合成 MouseEvent**（`el.click()` 不带坐标，会点到 canvas 内部原点，实测点错） |

关键代码（坐标换算与点击）：

```js
// 截图坐标 → 页面坐标（全页截图要对滚动量补偿）
const r = el.getBoundingClientRect();
const pageX = r.left + localX;            // 可视区坐标
const pageY = r.top + localY;             // 若截的是全页：再加 window.scrollY

// 点击必须带坐标，普通 el.click() 不行
const opts = { bubbles: true, cancelable: true, clientX: pageX, clientY: pageY, view: window };
el.dispatchEvent(new MouseEvent('mousedown', opts));
el.dispatchEvent(new MouseEvent('mouseup', opts));
el.dispatchEvent(new MouseEvent('click', opts));
```

#### 为什么不能作为默认架构

| # | 问题 | 说明 |
| --- | --- | --- |
| ① | **可复现性崩塌** | DOM 配方存的是 `selector + 文案判据`，每天执行靠「先校验再点」。OCR 坐标是**一次快照**，页面布局一变（弹窗、A/B、响应式、字体加载）坐标就全错，而且**无法在点击前校验**——等于把「判据优先于点击」这个核心安全性退化成「盲点坐标」。 |
| ② | **隐私承诺要推翻** | [PRIVACY.md](../PRIVACY.md) 明写「不会保存或上传选区截图」。全走 OCR 要么改成本地 OCR（包体 +1.7G 级模型或 tesseract 依赖），要么推翻承诺。 |
| ③ | **成本换不来收益** | 现有补丁已覆盖 img[alt]、文件名、canvas、span 等绝大多数情况；OCR 只为解决「纯 sprite 且无可读来源」这一小撮，却要让**所有**签到每次多一次截图 + 推理。 |
| ④ | **canvas 内部无法区分** | 实测两组坐标落到同一节点。若站点的「签到」和「查看规则」画在同一块 canvas 上，OCR 知道文字在哪，但**生成的 selector 是同一个**，仍要靠硬编码坐标区分——这又回到问题 ①。 |

#### 但有一种情况它确实更优

**iframe 内的按钮**（见 3.5.2 ③）。`elementsInRect` 跨不过 iframe，DOM 方案是死路；而截图能拍到 iframe 内容，OCR 能读到文字，再用坐标在该 iframe 内派发鼠标事件——这是**唯一能覆盖 iframe 的路子**。

所以合理的定位是：

| 场景 | 方案 |
| --- | --- |
| 默认（绝大多数站点） | **DOM 配方**：selector + 文案判据，每天可校验、可复现 |
| 纯 sprite / 无语义图 / **跨域 iframe** | **OCR 兜底**：截图 → OCR → 坐标 → 合成鼠标事件 |
| 两者并存 | 配方里加 `strategy: 'dom' \| 'ocr'`，OCR 配方的「判据校验」改成「点击区域内的文字仍命中」 |

若要做 OCR 兜底，注意三点：

1. **点击必须带坐标**的合成 MouseEvent，并且优先用 `Input.dispatchMouseEvent`（更接近真实）而非 `el.click()`；
2. **全页截图要补偿滚动量**（`getBoundingClientRect().top + scrollY`），可视区截图则不用；
3. **保留校验**：点击前后各截一次，比对目标区域的文字，用来代替 DOM 的「文案判据」，不要变成盲点。

> 一句话：**截图 OCR 是「补充手段」，不是「替代架构」。** 把它当默认路径，等于用一个不可校验的坐标去替换可校验的规则，安全性反而下降。

---

## 4. 风险与红线

| 风险 | 说明 | 处置 |
| --- | --- | --- |
| **ToS：转售/分发** | 这些免费额度是发给「你自己用」的，多数条款禁止转售或对外分发。aihot 页面底部自己写明「**不收 API 中转站**」，并提醒「领取前请看清对方条款」 | **自用可以，对外卖/公开送不行** |
| **假模型** | 有研究实测转售中转里 **45.8%** 的指纹测试模型身份不符、输出偏差最高 47%（[Real Money, Fake Models](https://arxiv.org/abs/2603.01919)） | 自建 + 用自己申请的 Key，是唯一安全路径 |
| **合规备案** | 面向中国公众提供生成式 AI 服务需备案；new-api README 专门写了这条 | 只在本机/内网跑，不面向公众 |
| **隐私政策冲突** | [PRIVACY.md](../PRIVACY.md) 现在明确写着「没有后端服务器、没有账号体系、没有遥测」 | 网关只跑 `127.0.0.1` 时该表述仍成立（数据不出本机）；一旦挪到公网 VPS，必须同步改 PRIVACY.md、商店描述、加数据处理者条款 |
| **额度随时消失** | 页面自带「3 天内核实不了就下架」「到了厂商写明的截止时间自动下架」 | 别把任何关键路径押在单一免费源上 |

---

## 5. 落地步骤（将来要做时，本机免 Docker）

> 记录备查，本次不执行。

**第 0 步 · 先验证值不值得（10 分钟，零配置）**

```bash
uvx freellmpool proxy        # localhost:8080，OpenAI 兼容，无需任何 key
curl localhost:8080/v1/chat/completions -H 'Content-Type: application/json' \
  -d '{"model":"auto","messages":[{"role":"user","content":"hi"}]}'
```

**第 1 步 · 装 GPT-Load（原生二进制，避开 Docker）**

```bash
mkdir -p ~/ai-gateway && cd ~/ai-gateway
curl -L -o gpt-load \
  https://github.com/tbphp/gpt-load/releases/download/v2.0.0-rc.63/gpt-load-macos-arm64
chmod +x gpt-load && DATA_DIR=./data ./gpt-load
cat data/auth.key            # 管理密钥
open http://127.0.0.1:3001
```

**第 2 步 · 界面三步**：建分组（选渠道 + 填 Key + 选模型）→ 配模型别名（`ocr` → `PaddleOCR-VL-1.5`）→ 建访问密钥（勾协议、设限额）。

**第 3 步 · CapMind 接入（零代码）**

[lib/recognizer.ts](../lib/recognizer.ts) 已是标准 OpenAI 兼容调用（`${aiEndpoint}/chat/completions` + Bearer），设置页三个字段直接填：

```
aiEndpoint = http://127.0.0.1:3001/v1
aiModel    = ocr        # GPT-Load 里的别名
aiKey      = 你签发的 AccessKey
```

**第 4 步 · 才轮到写配额账本 sidecar。**

---

## 6. 决策记录

| 问题 | 决定 |
| --- | --- |
| 现在落地吗？ | **不落地。** 只保留本评估文档，不启动任何服务 |
| OCR 怎么处理？ | **与 LLM 共用同一个网关，统一成 `ocr` 别名** |
| 网关选型（若将来做） | GPT-Load（MIT、单二进制、原生透传 Mistral `/v1/ocr`） |
| 部署位置（若将来做） | 先本机 `127.0.0.1`，不上公网 |
| 触发条件 | CapMind 的模型调用量或 OCR 需求涨到「单 Key 明显不够 / 需要跨厂商容灾」时再启动 |

### 什么情况下值得重启这个议题

- **情形 A（轻量）**：只是不想付模型钱、量在每天几十次 → 别建网关，申请硅基流动（PaddleOCR-VL 免费）+ 魔搭两个 Key 填进设置页就够。
- **情形 B（基础设施）**：要给 CapMind、脚本、其他 agent 共用一套 → 按第 3、5 节做，先本地跑，不上公网。

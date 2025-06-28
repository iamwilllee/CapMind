# CapMind

一款基于 AI 的智能网页浏览助手，集成页面内容分析、智能截图、实时翻译和 AI 问答功能的浏览器插件。

## 🚀 功能特性

### 📊 智能概览 (Overview)
- 🧠 **AI 页面分析**: 自动分析当前网页内容，提取主要要点和关键主题
- 🌳 **结构化展示**: 以树状结构展示分析结果，便于快速理解
- 🔄 **实时刷新**: 支持重新分析页面内容
- 🎯 **智能摘要**: 生成简洁的内容摘要和核心观点

### 📸 智能截图 (Capture)
- ✂️ **智能元素截图**: 精准捕获网页元素
- 🔍 **OCR 文字识别**: 自动提取截图中的文字内容
- 🤖 **AI 内容分析**: 智能分析截图内容并生成摘要
- 💾 **一键保存**: 支持将截图保存到本地

### 🌐 实时翻译 (Translate)
- 🚀 **页面翻译**: 一键翻译整个网页内容
- 🎯 **智能语言检测**: 自动识别源语言
- 🔊 **语音朗读**: 支持原文和译文的语音播放
- 📱 **双语对照**: 可选择显示或隐藏原文
- 🎨 **多语言支持**: 支持中英日韩法德西等多种语言

### 💬 AI 助手 (Chat)
- 🤖 **智能对话**: 基于 DeepSeek AI 的智能问答
- 📄 **页面上下文**: 可包含当前页面内容进行分析
- 🔗 **多模型支持**: 支持 DeepSeek-V3 和 DeepSeek-R1 推理模型
- ⚡ **实时响应**: 快速获得 AI 回答和建议

### ⚙️ 智能设置 (Settings)
- 🔑 **API 配置**: 支持 DeepSeek、Gemini、智谱AI 等多个 AI 服务商
- 🎨 **主题切换**: 支持浅色/深色/跟随系统主题
- 🌍 **多语言界面**: 中英文界面切换
- 🔧 **个性化配置**: 丰富的功能开关和参数设置

## 🛠️ 技术栈

- **前端框架**: WXT + React + TypeScript
- **样式**: Tailwind CSS + Shadcn/ui
- **包管理**: Pnpm
- **AI服务**: DeepSeek API / Gemini API / 智谱AI API
- **存储**: Chrome Storage API
- **国际化**: 自定义 i18n 解决方案
- **UI组件**: Radix UI + Lucide React

## 📦 安装

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建生产版本
pnpm build

# 打包为zip文件
pnpm zip
```

## 🎯 使用流程

### 首次使用
1. 安装插件后，点击浏览器工具栏中的 CapMind 图标
2. 在设置页面配置您的 AI API Key (支持 DeepSeek、Gemini、智谱AI)
3. 选择偏好的主题和语言设置

### 日常使用
1. **智能概览**: 打开任意网页，插件自动分析页面内容并生成结构化摘要
2. **智能截图**: 点击截图按钮，选择页面区域，AI 自动识别文字并分析内容
3. **实时翻译**: 一键翻译整个页面，支持多语言和语音朗读
4. **AI 问答**: 随时向 AI 助手提问，获得基于页面内容的智能回答

## 🔧 开发

### 目录结构

```
capmind/
├── entrypoints/          # WXT 入口点
│   ├── background/       # 后台脚本
│   ├── content/         # 内容脚本
│   └── sidebar/         # 侧边栏页面
├── components/          # React 组件
│   └── ui/             # UI 组件库
├── contexts/           # React 上下文
├── i18n/              # 国际化
│   └── locales/       # 语言文件
├── lib/               # 工具库
├── assets/            # 静态资源
├── scripts/           # 构建脚本
└── public/            # 公共资源
```

### API 配置

支持以下 AI 服务商：

- **DeepSeek**：`https://api.deepseek.com`
- **Google Gemini**：`https://generativelanguage.googleapis.com`
- **智谱 AI**：`https://open.bigmodel.cn`
- **OCR Space**：`https://api.ocr.space`

在设置页面配置相应的 API 密钥即可使用。

### 版本管理和发布

项目采用自动化发布流程，详见 [发布指南](RELEASE.md)。

#### 快速发布

```bash
# 更新版本号（补丁版本）
npm run version:patch

# 推送到 main 分支触发自动发布
git push origin main
```

#### 版本类型

- `npm run version:patch` - 修复版本 (1.0.0 → 1.0.1)
- `npm run version:minor` - 功能版本 (1.0.0 → 1.1.0)
- `npm run version:major` - 重大版本 (1.0.0 → 2.0.0)

#### 构建命令

```bash
# 开发模式
npm run dev              # Chrome 开发
npm run dev:firefox      # Firefox 开发

# 生产构建
npm run build            # 构建扩展
npm run zip              # 打包 Chrome 版本
npm run zip:firefox      # 打包 Firefox 版本
npm run release          # 构建并打包所有版本
```

## 📄 许可证

MIT License
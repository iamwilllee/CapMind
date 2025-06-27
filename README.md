# CapMind - 智能截图学习助手

一款集成智能截图、AI识图和英语学习功能的浏览器插件。

## 🚀 功能特性

### 📸 智能截图
- 选择网页任意区域进行截图
- 一键全页面截图
- 保存为PNG格式

### 🤖 AI识图
- 调用AI API识别图片内容
- OCR文字提取
- 生成图片描述

### 📚 英语学习
- 自动提取英文单词
- 显示单词释义和音标
- 保存到个人词汇本
- 简单的复习提醒

## 🛠️ 技术栈

- **前端框架**: WXT + React + TypeScript
- **样式**: Tailwind CSS + Shadcn UI
- **认证**: BetterAuth
- **包管理**: Pnpm
- **AI服务**: Google Vision API / OpenAI API
- **存储**: Chrome Storage API

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

1. 点击插件图标激活
2. 拖拽选择截图区域
3. AI自动分析图片内容
4. 提取英文单词并显示释义
5. 选择保存到词汇本

## 🔧 开发

### 目录结构

```
capmind/
├── entrypoints/          # 插件入口点
│   ├── popup/           # 弹窗页面
│   ├── content/         # 内容脚本
│   └── background/      # 后台脚本
├── components/          # React组件
├── lib/                # 工具库
├── types/              # 类型定义
├── assets/             # 静态资源
└── public/             # 公共文件
```

### API配置

需要配置以下API密钥：

- Google Vision API Key
- 有道词典API Key
- OpenAI API Key (可选)

## 📄 许可证

MIT License
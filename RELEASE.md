# 发布指南

## 自动化发布流程

本项目已配置 GitHub Actions 自动化工作流，当代码推送到 `main` 分支时会自动构建并创建 Release。

## 版本管理

### 语义化版本控制

项目采用 [语义化版本控制](https://semver.org/lang/zh-CN/)：

- **主版本号 (Major)**：不兼容的 API 修改
- **次版本号 (Minor)**：向下兼容的功能性新增
- **修订号 (Patch)**：向下兼容的问题修正

### 版本更新命令

```bash
# 修订版本 (1.0.0 -> 1.0.1)
npm run version:patch

# 次版本 (1.0.0 -> 1.1.0)
npm run version:minor

# 主版本 (1.0.0 -> 2.0.0)
npm run version:major
```

### 发布流程

1. **开发完成后，更新版本号**
   ```bash
   npm run version:patch  # 或 minor/major
   ```

2. **推送到 main 分支**
   ```bash
   git push origin main
   ```

3. **GitHub Actions 自动执行**
   - 安装依赖
   - 构建扩展 (Chrome + Firefox)
   - 打包 ZIP 文件
   - 创建 GitHub Release
   - 上传扩展包到 Release 附件

## 手动构建

如需本地构建和测试：

```bash
# 构建所有平台
npm run release

# 或分别构建
npm run build          # 构建扩展
npm run zip            # 打包 Chrome 版本
npm run zip:firefox    # 打包 Firefox 版本
```

## 输出文件

构建完成后，扩展包位于 `.output/` 目录：

- `chrome-mv3.zip` - Chrome 扩展包 (Manifest V3)
- `firefox-mv2.zip` - Firefox 扩展包 (Manifest V2)

## Release 内容

每个 Release 包含：

- **Chrome 扩展包** - 支持 Chrome、Edge 等 Chromium 内核浏览器
- **Firefox 扩展包** - 支持 Firefox 浏览器
- **版本说明** - 功能更新和安装指南
- **安装说明** - 详细的安装步骤

## 注意事项

1. **版本号同步**：`package.json` 和 `wxt.config.ts` 中的版本号会自动同步
2. **标签检查**：如果版本标签已存在，不会重复创建 Release
3. **构建缓存**：使用 pnpm 和 Node.js 缓存加速构建
4. **文件过滤**：README 等文档更新不会触发构建

## 故障排除

### 构建失败

1. 检查 Node.js 版本兼容性
2. 确认所有依赖已正确安装
3. 检查 TypeScript 编译错误

### Release 创建失败

1. 确认 GitHub Token 权限
2. 检查版本号是否已存在
3. 验证构建输出文件路径

### 版本脚本错误

1. 确认 Git 工作目录干净
2. 检查文件权限
3. 验证 Node.js 版本支持 ES modules
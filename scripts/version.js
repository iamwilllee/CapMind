#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const args = process.argv.slice(2);
const versionType = args[0] || 'patch'; // patch, minor, major

// 读取当前版本
const packageJsonPath = path.join(process.cwd(), 'package.json');
const wxtConfigPath = path.join(process.cwd(), 'wxt.config.ts');

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const currentVersion = packageJson.version;

// 计算新版本号
function incrementVersion(version, type) {
  const [major, minor, patch] = version.split('.').map(Number);
  
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

const newVersion = incrementVersion(currentVersion, versionType);

console.log(`🔄 版本更新: ${currentVersion} -> ${newVersion}`);

// 更新 package.json
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
console.log('✅ 已更新 package.json');

// 更新 wxt.config.ts 中的版本号
let wxtConfig = fs.readFileSync(wxtConfigPath, 'utf8');
wxtConfig = wxtConfig.replace(
  /version: ["']([^"']+)["']/,
  `version: "${newVersion}"`
);
fs.writeFileSync(wxtConfigPath, wxtConfig);
console.log('✅ 已更新 wxt.config.ts');

// Git 操作
try {
  execSync('git add package.json wxt.config.ts', { stdio: 'inherit' });
  execSync(`git commit -m "chore: bump version to ${newVersion}"`, { stdio: 'inherit' });
  console.log('✅ 已提交版本更新');
  
  console.log('\n📋 接下来的步骤:');
  console.log('1. 检查更改是否正确');
  console.log('2. 推送到 main 分支: git push origin main');
  console.log('3. GitHub Actions 将自动构建并创建 Release');
  console.log(`4. Release 标签: v${newVersion}`);
} catch (error) {
  console.error('❌ Git 操作失败:', error.message);
  process.exit(1);
}

console.log(`\n🎉 版本 ${newVersion} 准备完成！`);
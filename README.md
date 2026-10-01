# 我的世界基岩版皮肤包创建器

一个纯前端的《我的世界》基岩版皮肤包创建工具：在浏览器里预览皮肤、管理皮肤列表，一键导出为游戏可直接导入的 `.mcpack` 皮肤包，无需安装任何程序。

## 功能特性

- **3D 皮肤预览** — 基于 skinview3d 实时渲染，支持内外双层皮肤，可拖拽旋转、滚轮缩放，带行走动画。
- **多皮肤管理** — 支持一次多选添加 PNG，上方展示区一次展示一张，左右箭头切换。
- **用户名导入** — 输入 Java 版用户名即可在线下载皮肤并加入皮肤包，皮肤名自动填入用户名。
- **纤细模型自动识别** — 添加皮肤时自动检测手臂宽度（纤细 / 经典），识别结果可手动纠正。
- **逐皮肤设置** — 每张皮肤可自定义显示名与模型类型。
- **一键导出** — 生成包含 `manifest.json`、`skins.json`、皮肤 PNG、中英文语言文件与项目固定的 `static/pack_icon.png` 包封面图的 `.mcpack`，导入游戏即用。

## 使用方法

1. 用浏览器打开页面（需 https 或 localhost 环境）。
2. 点击「添加皮肤」选择一张或多张 64x64 / 128x128 的皮肤 PNG。
3. 在下方输入皮肤包名称（即导出的文件名）。
4. 点击「导出 .mcpack」，将下载的文件导入《我的世界》基岩版即可。

## 本地开发

```powershell
node serve.mjs   # 启动 https://localhost:8443（需本地 SSL 证书）
node test-zip.mjs # 运行 zip 生成器自检测试
```

## 技术栈

- [MDUI 2](https://www.mdui.org/) — Material Design 3 组件库
- [skinview3d](https://github.com/bs-community/skinview3d) — Minecraft 皮肤 3D 渲染
- 自带零依赖 zip 生成器（`static/js/zip.js`），无构建步骤、无 npm 依赖

## 许可证

本项目基于 [MIT License](LICENSE) 开源。

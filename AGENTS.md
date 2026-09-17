# AGENTS.md — 我的世界基岩版皮肤包创建器

## 项目目标

一个纯前端单页应用：在浏览器里制作《我的世界》基岩版皮肤包并导出为 `.mcpack` 文件。

## 功能需求

- **上方：皮肤展示区** — 一次只展示一张皮肤的 3D 预览（支持内外双层皮肤），通过左右箭头按钮切换上一张/下一张，并显示"当前 / 总数"，可拖拽旋转、滚轮缩放。
- 每张皮肤可设置：皮肤显示名（写入语言文件）、模型类型（经典 / 纤细）。
- 纤细模型自动识别：检查右臂顶面区域 (50,16)-(52,20) 透明度（纤细手臂宽 3px 此处留空），识别结果写入开关，用户可手动纠正。
- 添加（支持一次多选 PNG）、删除皮肤（删除需经对话框二次确认）。
- **Java 版用户名导入** — 输入用户名下载皮肤并加入包（皮肤名自动填用户名）。Mojang 官方 API 无 CORS，故走 MineTools（`api.minetools.eu/uuid/{name}` 查 UUID）+ Crafatar（`crafatar.com/skins/{uuid}` 下载 PNG），两者均允许跨域。用户名查询前做 NFKC 规范化（全角→半角）。
- **导入皮肤包** — 解析已有 `.mcpack`/`.zip` 重建编辑状态（`static/js/zip.js` 的 `parseZip`，支持 STORE/DEFLATE），包名、描述（去除署名行）、皮肤名（取自 zh_CN.lang）、纤细标记（取自 skins.json geometry）均自动回填。
- **下方：皮肤包名称区** — 输入皮肤包名称与包描述（可选），导出时的 `.mcpack` 文件名与包内显示名称均使用名称；manifest 简介为"用户描述 \n 皮肤由 www.mcneko.com/tools/skinpack 生成"（无描述时只有署名行）。
- 一键导出 `.mcpack`（本质为 zip），包含：
  - `manifest.json`（format_version 2，`skin_pack` 模块，随机 UUID，简介末行固定为"皮肤由 www.mcneko.com/tools/skinpack 生成"）
  - `skins.json`（skins 数组、serialize_name、localization_name）
  - 各皮肤 PNG（`skin_N.png`）
  - `texts/en_US.lang`、`texts/zh_CN.lang`
  - `pack_icon.png`（复用第一张皮肤，没有则省略）

## 技术约定

- 纯静态页面，无构建步骤、无 npm 依赖。
- UI 使用 **MDUI 2**（CDN：`https://cdn.jsdmirror.com/npm/mdui@2`，Web Components 用法）。
- 3D 预览使用 **skinview3d**（CDN：`https://cdn.jsdmirror.com/npm/skinview3d@3/bundles/skinview3d.bundle.js`），自动渲染双层皮肤。
- zip 生成不引入 JSZip，使用自带的 `static/js/zip.js`（STORE 不压缩，纯函数 `createZip(files)`）。
- 自有 JS 文件统一放 `static/js/`。

## 本地运行 / 测试

按用户规则，本地测试必须启用 SSL，证书位于：

- `D:\mkcert\localhost.key`
- `D:\mkcert\localhost.crt`

```powershell
node serve.mjs   # https://localhost:8443
```

`test-zip.mjs` 是 zip.js 的自检测试：

```powershell
node test-zip.mjs
```

## 注意事项

- 皮肤包 `localization_name` 不能含空格，导出时需把包名清洗成标识符；显示名照原样写入 `.lang`。
- `crypto.randomUUID()` 生成 UUID（仅 https/localhost 环境可用，serve.mjs 已保证）。

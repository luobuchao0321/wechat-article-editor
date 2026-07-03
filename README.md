# ContentCraft — Open-source WeChat Article Editor

<p align="center">
  <img src="./public/media/contentcraft-logo.png" alt="ContentCraft Logo" width="96" />
</p>

<p align="center">
  <strong>Import WeChat articles, extract SVG layout modules, replace images safely, and build a reusable local-first content library.</strong>
</p>

<p align="center">
  中文：开源微信公众号文章编辑器，支持文章导入、SVG 排版模块复用、图片替换、素材库沉淀与本地优先内容工作流。
</p>

<p align="center">
  <a href="https://github.com/luobuchao0321/wechat-article-editor/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/luobuchao0321/wechat-article-editor?style=social"></a>
  <a href="https://github.com/luobuchao0321/wechat-article-editor/blob/main/LICENSE"><img alt="MIT License" src="https://img.shields.io/github/license/luobuchao0321/wechat-article-editor"></a>
  <a href="https://github.com/luobuchao0321/wechat-article-editor"><img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black"></a>
  <a href="https://github.com/luobuchao0321/wechat-article-editor"><img alt="React" src="https://img.shields.io/badge/React-19-149eca"></a>
</p>

<p align="center">
  <a href="https://github.com/luobuchao0321/wechat-article-editor/releases/tag/v1.0.1">Desktop App</a> ·
  <a href="#功能亮点">功能亮点</a> ·
  <a href="#快速开始">快速开始</a> ·
  <a href="#部署">部署</a> ·
  <a href="./README.en.md">English</a>
</p>

---

![ContentCraft brand card](./docs/assets/contentcraft-brand-card.png)

## 项目定位

ContentCraft 内容匠，是一个面向微信公众号文章转载、SVG 排版模块复用与素材沉淀的开源编辑器，适合内容创作者、运营团队和二次开发者快速搭建本地优先的公众号排版工作流。

它的核心不是“又一个富文本编辑器”，而是把微信公众号文章、SVG 排版模块、图片替换、素材复用与官网/CMS 后台转载串成一个可二次开发的开源工作流。

## 立即体验

- 桌面安装包：[ContentCraft v1.0.1 Release](https://github.com/luobuchao0321/wechat-article-editor/releases/tag/v1.0.1)
- 本地开发：见下方 [快速开始](#快速开始)
- 在线 Demo：建议部署到 Vercel 后把地址补到这里

一键部署：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/luobuchao0321/wechat-article-editor)

## 功能亮点

ContentCraft 不是一个简单的富文本框，而是围绕“公众号转载、样式复用、模块二次编辑、本地素材沉淀”设计的开源编辑器。

- 导入公众号文章：解析文章内容，提取正文、图片、SVG、排版模块等元素
- 模块化编辑：插入的 SVG/排版模块可作为独立块管理，支持移动、留白、替换
- 图片替换：识别模块中图片位置，替换前提示推荐尺寸，减少错位和拉伸
- 样式调整：支持背景色、字体、字号、对齐、间距等常用排版操作
- 素材沉淀：可把优秀公众号排版、SVG、动图等导入素材库并长期复用
- 一键复制：转换为兼容微信公众号编辑器、135 类编辑器、CMS / KindEditor 的内联 HTML
- 多格式导入：支持 HTML、Word、PDF、Excel 等内容来源
- 本地优先：默认数据保存在浏览器本地，适合个人内容工作流和开源二次开发
- 跨平台：支持 Web 本地运行，也提供 macOS、Windows、Linux 桌面安装包

## 功能预览

![ContentCraft 编辑器界面](./docs/assets/editor-screenshot.jpg)

建议录制 3 张 GIF 放在这里，GitHub 首页的转化会更好：

| 场景 | 建议动图内容 |
| --- | --- |
| 导入公众号文章 | 粘贴/导入文章后自动解析图片、SVG、正文模块 |
| 替换模块图片 | 点击模块图片，查看推荐尺寸，替换后保持其他元素不丢失 |
| 素材库复用 | 导入 SVG/动图素材，保存到素材库，再插入编辑区 |

推荐保存路径：

```text
docs/assets/demo-import.gif
docs/assets/demo-replace-image.gif
docs/assets/demo-library.gif
```

录好后，把下面三行取消注释即可展示：

```md
<!--
![导入公众号文章](./docs/assets/demo-import.gif)
![替换模块图片](./docs/assets/demo-replace-image.gif)
![素材库复用](./docs/assets/demo-library.gif)
-->
```

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0

### 本地运行

```bash
git clone https://github.com/luobuchao0321/wechat-article-editor.git
cd wechat-article-editor
npm install
npm run dev
```

默认访问：

```text
http://localhost:3001
```

### 生产构建

```bash
npm run build
npm start
```

### 桌面版安装包

1.0.1 开始提供 Electron 桌面版打包配置。桌面版本质上是本地运行的 ContentCraft，不需要把文章内容上传到第三方服务。

```bash
# 本地调试桌面版
npm run desktop:dev

# 当前系统可构建的桌面安装包
npm run desktop:build

# macOS DMG，包含 Apple Silicon 与 Intel
npm run dist:mac

# macOS 单架构构建，适合排查或单独发包
npm run dist:mac:arm64
npm run dist:mac:x64

# Windows NSIS 安装包，配置为 x64 与 32 位
npm run dist:win

# Linux AppImage / deb
npm run dist:linux
```

构建产物默认输出到 `release/`。Windows 与 Linux 安装包建议在对应系统或 GitHub Actions 构建机上生成，macOS 本机优先生成 DMG。

## 部署

### Vercel

1. 打开上方 `Deploy with Vercel`
2. 登录 Vercel 并选择 GitHub 仓库
3. Framework Preset 选择 `Next.js`
4. Build Command 使用 `npm run build`
5. 部署完成后，把 Demo 地址更新到 README 顶部

### Cloudflare Pages

Cloudflare Pages 也可以部署，但 Next.js 16 的适配需要额外关注运行时兼容性。建议第一版先用 Vercel，等功能稳定后再补 Cloudflare Pages 配置。

## 支持平台

| 平台 | 状态 | 说明 |
| --- | --- | --- |
| Web | 支持 | Chrome / Edge / Safari / Firefox |
| macOS | 支持 | DMG：Apple Silicon 与 Intel |
| Windows | 支持 | NSIS 安装包：x64 与 32 位 |
| Linux | 支持 | AppImage / deb |

## 技术栈

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Electron
- Cheerio / Mammoth / ExcelJS / pdf-parse

## 合规说明

- 本项目为独立开源项目，不包含第三方编辑器的 VIP 素材或受版权保护素材
- 不提供绕过付费限制、批量抓取付费素材、搬运商业模板等能力
- 导入功能面向用户本人有权处理的文章、素材和文档
- `.cache/`、`.next/`、本地测试文章和系统临时文件不应提交到仓库

## 贡献

欢迎提交 Issue 和 Pull Request。比较适合优先贡献的方向：

- 更稳定的公众号文章解析
- SVG 模块选中与图片替换体验
- 素材库分类、搜索、导入导出
- README 演示 GIF、教程和部署文档
- Cloudflare Pages 部署适配

## 支持作者

如果这个项目帮你节省了排版时间，可以请作者喝杯咖啡。也欢迎通过 Issue 反馈真实使用场景，后续会优先围绕内容创作者、运营团队和定制化公众号排版工作流继续优化。

小程序中可以使用 `public/media/sponsor-poster.png` 作为中间页图片，并在 `<image>` 组件上开启 `show-menu-by-longpress="true"`，引导用户长按保存后打开微信扫码。

<p align="center">
  <img src="./docs/assets/sponsor-poster-preview.jpg" alt="支持 ContentCraft 开源创作" width="320" />
</p>

## License

[MIT](./LICENSE) © ContentCraft

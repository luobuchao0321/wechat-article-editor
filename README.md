# ContentCraft · 内容匠

<p align="center">
  <img src="./public/media/contentcraft-logo.png" alt="ContentCraft Logo" width="96" />
</p>

<p align="center">
  <strong>面向微信公众号转载、排版与素材复用的开源编辑器</strong>
</p>

<p align="center">
  <a href="https://github.com/luobuchao0321/contentcraft-editor/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/luobuchao0321/contentcraft-editor?style=social"></a>
  <a href="https://github.com/luobuchao0321/contentcraft-editor/blob/main/LICENSE"><img alt="MIT License" src="https://img.shields.io/github/license/luobuchao0321/contentcraft-editor"></a>
  <a href="https://github.com/luobuchao0321/contentcraft-editor"><img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black"></a>
  <a href="https://github.com/luobuchao0321/contentcraft-editor"><img alt="React" src="https://img.shields.io/badge/React-19-149eca"></a>
</p>

<p align="center">
  <a href="#在线体验">在线体验</a> ·
  <a href="#功能亮点">功能亮点</a> ·
  <a href="#快速开始">快速开始</a> ·
  <a href="#部署">部署</a> ·
  <a href="./README.en.md">English</a>
</p>

---

## 在线体验

当前建议优先部署到 Vercel，完成后把 Demo 地址填到这里：

> Demo: `https://your-contentcraft-demo.vercel.app`

一键部署：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/luobuchao0321/contentcraft-editor)

## 功能亮点

ContentCraft 不是一个简单的富文本框，而是围绕“公众号转载、样式复用、模块二次编辑”设计的开源编辑器。

- 导入公众号文章：解析文章内容，提取正文、图片、SVG、排版模块等元素
- 模块化编辑：插入的 SVG/排版模块可作为独立块管理，支持移动、留白、替换
- 图片替换：识别模块中图片位置，替换前提示推荐尺寸，减少错位和拉伸
- 样式调整：支持背景色、字体、字号、对齐、间距等常用排版操作
- 素材沉淀：可把优秀公众号排版、SVG、动图等导入素材库并长期复用
- 多格式导入：支持 HTML、Word、PDF、Excel 等内容来源
- 本地优先：默认数据保存在浏览器本地，适合个人内容工作流和开源二次开发
- 跨平台：macOS、Windows、Linux 都可以通过现代浏览器使用

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
git clone https://github.com/luobuchao0321/contentcraft-editor.git
cd contentcraft-editor
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

| 操作系统 | 状态 | 浏览器 |
| --- | --- | --- |
| macOS | 支持 | Chrome / Edge / Safari / Firefox |
| Windows | 支持 | Chrome / Edge / Firefox |
| Linux | 支持 | Chrome / Edge / Firefox |

## 技术栈

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Cheerio / Mammoth / xlsx / pdf-parse

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

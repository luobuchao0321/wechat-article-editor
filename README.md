# ContentCraft 内容匠｜开源公众号文章编辑器

<p align="center">
  <img src="./public/media/contentcraft-logo.png" alt="ContentCraft Logo" width="96" />
</p>

<p align="center">
  <strong>导入公众号文章，提取可复用的排版模块，换图改字，沉淀为自己的本地素材库。</strong>
</p>

<p align="center">
  面向内容创作者、运营团队和二次开发者的本地优先公众号内容工作台。
</p>

<p align="center">
  <a href="https://github.com/luobuchao0321/wechat-article-editor/releases/latest"><strong>下载桌面版</strong></a> ·
  <a href="#一分钟上手">一分钟上手</a> ·
  <a href="#功能">功能</a> ·
  <a href="./README.en.md">English</a>
</p>

<p align="center">
  <a href="https://github.com/luobuchao0321/wechat-article-editor/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/luobuchao0321/wechat-article-editor?style=social"></a>
  <a href="https://github.com/luobuchao0321/wechat-article-editor/blob/main/LICENSE"><img alt="MIT License" src="https://img.shields.io/github/license/luobuchao0321/wechat-article-editor"></a>
  <a href="https://github.com/luobuchao0321/wechat-article-editor/releases/latest"><img alt="Desktop release" src="https://img.shields.io/github/v/release/luobuchao0321/wechat-article-editor?display_name=tag"></a>
</p>

![ContentCraft editor](./docs/assets/editor-screenshot.jpg)

## 它解决什么问题

看到一篇排版精致的公众号文章时，通常很难把标题块、图文卡片、SVG 动效、分隔符或尾图安全地复用到自己的文章里。手动复制 HTML 容易丢样式，替换一张图片又可能影响整个模块。

ContentCraft 把这条流程变成：

```text
导入有权处理的公众号文章
→ 提取正文、图片与排版模块
→ 选中一个模块，换图、改字、调整间距
→ 保存到本地素材库
→ 复制兼容的内联 HTML 到公众号后台或其他富文本系统
```

SVG 是其中一种实现形式，不是使用门槛。你不需要会写 SVG 或 HTML，也能完成日常的素材复用与排版编辑。

## 一分钟上手

1. 打开「公众号编辑」。
2. 点击左侧的「加载示例」，先体验模块选择、图片替换和保存。
3. 再粘贴 `https://mp.weixin.qq.com/s/...` 的公开文章链接，选择「替换正文」或「追加正文」。
4. 在画布中点击模块或图片，右侧会显示对应编辑项与图片推荐尺寸。
5. 保存常用模块到本地素材库；完成后点击「一键复制公众号编辑器 HTML」。

> 导入与素材复用只适用于你本人有权处理的文章、图片和排版内容。

## 功能

- **公众号文章导入**：解析公开文章正文、图片、SVG 与可识别的排版模块。
- **模块化编辑**：模块可移动、复制、删除、前后留白，并可调整背景、边距与圆角。
- **图片安全替换**：定位模块内的具体图片，替换前给出建议尺寸，避免其他图片一起丢失。
- **本地素材库**：将标题块、图文卡片、尾图、分隔符、动图等长期保存到 IndexedDB。
- **一键复制**：输出内联样式 HTML，适合粘贴到公众号后台、CMS 或支持源码模式的富文本编辑器。
- **多格式导入**：支持 HTML、Word、PDF 与 Excel 内容导入。
- **智能小助手**：接入自有模型接口，完成标题、摘要、润色、去 AI 味与风险检查。
- **本地优先**：草稿与模块默认保存在本机；跨平台桌面版支持 macOS、Windows 与 Linux。

## 下载与运行

### 桌面版

从 [Latest Release](https://github.com/luobuchao0321/wechat-article-editor/releases/latest) 下载对应系统的安装包。文件选择、校验方式和系统安全提示见 [下载说明](./docs/DOWNLOADS.md)。

### 本地运行

```bash
git clone https://github.com/luobuchao0321/wechat-article-editor.git
cd wechat-article-editor
npm install
npm run dev
```

打开 `http://localhost:3001`。

### 私有部署

可以使用 Docker 或部署到自己的 Node.js 环境。公开部署前请阅读 [安全说明](./SECURITY.md)：文章导入接口仅接受公开微信公众号链接，且应在网关增加频率限制。

```bash
docker compose up --build
```

## 数据与隐私

草稿与素材库默认保存于本地浏览器或桌面应用。AI 小助手仅在你主动调用时将文章内容和 API Key 发往你填写的模型服务。详细说明见 [隐私与本地数据](./docs/PRIVACY.md)。

## 示例与贡献

仓库包含版权安全的 HTML、SVG 与文章样例，位于 [examples](./examples/README.md)。

欢迎提交 Issue 和 Pull Request，特别需要这些方向的贡献：

- 真实公众号文章导入的兼容性反馈
- 多图片 SVG/HTML 模块的替换测试用例
- 本地素材库的搜索、分类、导入与导出
- 不含第三方受版权保护素材的示例模块

贡献方式见 [CONTRIBUTING.md](./CONTRIBUTING.md)，安全问题请参阅 [SECURITY.md](./SECURITY.md)。

## 合规

- 本项目不包含第三方付费素材或受版权保护的模板。
- 不提供绕过付费限制、批量抓取付费素材或搬运商业模板的功能。
- 请只导入、保存和复用你有权处理的内容与素材。

## 支持作者

如果项目帮你节省了排版时间，欢迎通过 Issue 分享真实使用场景或支持后续维护。

<p align="center">
  <img src="./docs/assets/sponsor-poster-preview-v2.jpg" alt="支持 ContentCraft 开源创作" width="320" />
</p>

## License

[MIT](./LICENSE) © ContentCraft

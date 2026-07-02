# 🎨 ContentCraft

<p align="center">
  <strong>Open-source WeChat Article Editor</strong><br/>
  Article Import · Style Editing · Module Reuse · SVG Asset Management
</p>

<p align="center">
  <a href="#✨-features">✨ Features</a> ·
  <a href="#🚀-quick-start">🚀 Quick Start</a> ·
  <a href="#💻-supported-platforms">💻 Platforms</a> ·
  <a href="#📄-license">📄 License</a> ·
  🌐 <a href="./README.md">中文</a>
</p>

---

## ✨ Features

- **Article Import** — One-click import of WeChat article content with automatic SVG, image, and style extraction
- **Style Editing** — Visual editing of background colors, fonts, alignment, spacing, and more
- **Module Management** — Insert SVG modules as independent blocks; move up/down, add/remove spacing
- **Image Replacement** — Click images within modules to replace; auto-detects recommended pixel dimensions
- **Asset Library** — Import and persistently store custom WeChat styling assets (SVG, GIFs, etc.)
- **Multi-format Import** — Supports Word (.docx), PDF, Excel, HTML document formats
- **System Fonts** — Auto-detects installed OS fonts (macOS / Windows / Linux)
- **Pure Frontend** — Built on Next.js with zero server dependency; data stored in local browser

## 🚀 Quick Start

### Requirements

- Node.js >= 18.0.0
- npm >= 9.0.0 or pnpm >= 8.0.0

### Install and Run

```bash
# Clone the repository
git clone https://github.com/luobuchao0321/contentcraft-editor.git
cd contentcraft-editor

# Install dependencies
npm install
# or
pnpm install

# Start development server (defaults to http://localhost:3001)
npm run dev
```

### Production Build

```bash
npm run build
npm start
```

## 💻 Supported Platforms

| OS | Status | Browser |
|----|--------|---------|
| macOS | Chrome / Edge / Safari / Firefox |
| Windows | Chrome / Edge / Firefox |
| Linux | Chrome / Edge / Firefox |

## Tech Stack

- **Framework**: Next.js 16 + React 19
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3

## Contributing

Issues and Pull Requests are welcome!

1. Fork this repository
2. Create your feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add some feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

## License

[MIT](./LICENSE) © ContentCraft

## Acknowledgments

- Independently developed; no copyrighted materials from third-party editors used
- Inspired by the WeChat content editing workflow; built as an open-source tool for content creators

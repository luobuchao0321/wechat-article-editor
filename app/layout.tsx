import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ContentCraft · 内容匠',
  description: '开源公众号编辑器：文章转载、样式编辑、模块复用，适配 macOS / Windows / Linux',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  )
}

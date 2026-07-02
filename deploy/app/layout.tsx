import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'H5 高保真排版助手',
  description: '微信公众号文章高保真排版迁移工具',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  )
}

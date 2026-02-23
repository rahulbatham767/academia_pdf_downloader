import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AcademiaPDF — Download Research Papers',
  description: 'Download Academia.edu PDFs instantly. Paste a URL, preview, and download.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="grain">{children}</body>
    </html>
  )
}

import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Direction Sky - Crypto Intelligence Platform',
  description: 'Advanced crypto intelligence platform providing real-time market analysis, confluence alerts, and trading insights.',
  keywords: 'crypto, bitcoin, trading, intelligence, market analysis, alerts',
  authors: [{ name: 'Direction Sky Team' }],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-900 text-white antialiased`}>
        {children}
      </body>
    </html>
  )
} 
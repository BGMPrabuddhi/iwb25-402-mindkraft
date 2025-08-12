import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Layout from '@/Components/layout/Layout'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SafeRoute - Road Safety Reporting Platform',
  description: 'Community-driven road safety reporting and driver assistance platform for Sri Lanka',
  keywords: 'road safety, Sri Lanka, traffic reports, hazard reporting, community safety',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Layout>
          {children}
        </Layout>
      </body>
    </html>
  )
}
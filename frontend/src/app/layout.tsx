import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY 

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
      <head>
        <Script 
          src={`https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry&v=weekly`}
          strategy="beforeInteractive"
          id="google-maps"
          async
          defer
        />
      </head>
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  )
}
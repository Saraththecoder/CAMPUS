// app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: {
    default: 'Campus Compliance',
    template: '%s | Campus Compliance',
  },
  description: 'Secure anonymous complaint management for campus communities.',
  openGraph: {
    title: 'Campus Compliance Portal',
    description: 'Secure anonymous complaint management for campus communities.',
    type: 'website',
  },
  icons: {
    icon: '/favicon.ico',
  },
}

import TextSplashScreen from '@/components/ui/TextSplashScreen'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <TextSplashScreen />
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1a1f1c',
              border: '1px solid rgba(0, 224, 156, 0.2)',
              color: '#e0ede6',
              fontFamily: 'Space Grotesk, sans-serif',
            },
          }}
        />
      </body>
    </html>
  )
}

import './globals.css'
import { Toaster } from '@/components/ui/sonner'

export const metadata = {
  title: 'CORPAY — Corporate Spending Governance',
  description: 'Allocate, control, track and govern employee spending in real-time on India\u2019s UPI rails.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: 'CORPAY', statusBarStyle: 'black-translucent' },
}

export const viewport = {
  width: 'device-width', initialScale: 1, maximumScale: 1, themeColor: '#0F172A'
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json"/>
        <meta name="apple-mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
        <meta name="apple-mobile-web-app-title" content="CORPAY"/>
        <meta name="mobile-web-app-capable" content="yes"/>
      </head>
      <body>
        {children}
        <Toaster position="top-right" richColors closeButton/>
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}))}` }}/>
      </body>
    </html>
  )
}

import './globals.css'
import { Toaster } from '@/components/ui/sonner'

export const metadata = {
  title: 'CORPAY — Corporate Spending Governance',
  description: 'Allocate, control, track and govern employee spending in real-time on India\u2019s UPI rails.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  )
}

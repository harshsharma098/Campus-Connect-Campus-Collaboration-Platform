import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import Sidebar from '@/components/Sidebar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Campus Connect',
  description: 'Connect, collaborate, and grow with your campus community',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <div className="flex h-screen">
            <Sidebar />
            <main className="flex-1 ml-60 bg-discord-dark-1 overflow-y-auto discord-scrollbar">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}

import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/layout/Sidebar'
import { ThemeProvider } from '@/components/theme/ThemeProvider'

export const metadata: Metadata = {
  title: 'AdManage - AI Ad Creator',
  description: 'Create stunning ads with AI in seconds',
}

const themeScript = `
  try {
    const t = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (t === 'dark' || (!t && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
  } catch {}
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        {/* Inline script prevents flash of wrong theme before React hydration */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ThemeProvider>
          <div className="flex h-full">
            <Sidebar />
            <main className="flex-1 ml-60 overflow-auto min-h-screen">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}

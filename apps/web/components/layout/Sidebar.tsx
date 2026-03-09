'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, FolderOpen, Package, Zap, Sun, Moon, ChevronUp } from 'lucide-react'
import { useTheme } from '@/components/theme/ThemeProvider'

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/projects', label: 'Projects', icon: FolderOpen },
  { href: '/products', label: 'Products', icon: Package },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-gray-900 flex flex-col z-40 border-r border-gray-800">
      {/* Logo */}
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-700 rounded-lg flex items-center justify-center shadow-lg shadow-violet-900/40">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-semibold text-lg tracking-tight">AdManage</span>
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 mt-5 space-y-0.5">
        <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-2">
          Menu
        </p>
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-violet-600 text-white shadow-sm shadow-violet-900/50'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
            U
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-gray-200 text-xs font-medium truncate">User</p>
            <p className="text-gray-500 text-[10px] truncate">user@example.com</p>
          </div>
          <ChevronUp className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
        </div>
      </div>
    </aside>
  )
}

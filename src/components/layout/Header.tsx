'use client'

import Image from 'next/image'
import { Sun, Moon, Menu } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Badge } from '@/components/ui/badge'
import { useState, useEffect } from 'react'

export function Header({ title, onMenuClick }: { title?: string; onMenuClick?: () => void }) {
  const { userData } = useAuth()
  const [dark, setDark] = useState(false)
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const tick = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(tick)
  }, [])

  const formattedDate = now
    ? now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark') {
      document.documentElement.classList.add('dark')
      setDark(true)
    } else {
      document.documentElement.classList.remove('dark')
      setDark(false)
    }
  }, [])

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    if (next) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  return (
    <header className="sticky top-0 z-30 h-12 flex items-center justify-between px-3 sm:px-4 gap-2 bg-white/80 backdrop-blur border-b border-gray-100 dark:bg-gray-950/80 dark:border-gray-800 shrink-0">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="sm:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 shrink-0"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <h1 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
          {title || 'TESDA Region VII MBMS'}
        </h1>
        {formattedDate && (
          <>
            <span className="hidden sm:block h-4 w-px bg-gray-200 dark:bg-gray-700" />
            <span className="hidden sm:block text-xs text-gray-400 dark:text-gray-500 font-medium whitespace-nowrap">
              {formattedDate}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          onClick={toggleDark}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
          aria-label="Toggle theme"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {userData && (
          <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-gray-700 ml-1">
            <div className="text-right hidden md:block">
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[140px]">{userData.username}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[140px]">{userData.department}</p>
            </div>
            <div className="h-8 w-8 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 bg-white flex items-center justify-center shrink-0">
              <Image
                src="/tesda-logo.png"
                alt="TESDA"
                width={32}
                height={32}
                className="object-contain w-full h-full p-0.5"
              />
            </div>
            {userData.role === 'admin' && (
              <Badge variant="info" className="text-[10px] px-1.5 py-0">admin</Badge>
            )}
          </div>
        )}
      </div>
    </header>
  )
}

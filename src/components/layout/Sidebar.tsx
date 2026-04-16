'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, LogOut, Menu, X, ChevronRight, Shield, Users
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  adminOnly?: boolean
  hideForAdmin?: boolean
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { href: '/admin', label: 'Admin Portal', icon: <Shield className="h-5 w-5" />, adminOnly: true },
  { href: '/ict-team', label: 'ICT Team', icon: <Users className="h-5 w-5" /> },
]

interface SidebarProps {
  mobileOpen?: boolean
  setMobileOpen?: (open: boolean) => void
}

export function Sidebar({ mobileOpen = false, setMobileOpen }: SidebarProps) {
  const [expanded, setExpanded] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const pathname = usePathname()
  const { userData, logout } = useAuth()

  useEffect(() => {
    const check = () => setIsMobile(window.matchMedia('(max-width: 639px)').matches)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const items = navItems.filter((item) => {
    if (item.adminOnly && userData?.role !== 'admin') return false
    if (item.hideForAdmin && userData?.role === 'admin') return false
    return true
  })

  const closeMobile = () => setMobileOpen?.(false)
  const showExpanded = expanded || (isMobile && mobileOpen)

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {isMobile && mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMobile}
            className="fixed inset-0 z-30 bg-black/40 sm:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{
          width: showExpanded ? 240 : 64,
          x: isMobile && !mobileOpen ? -260 : 0,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed left-0 top-0 h-full z-40 flex flex-col bg-white border-r border-gray-100 dark:bg-gray-950 dark:border-gray-800 shadow-sm"
      >
        {/* Logo / Toggle */}
        <div className="flex items-center h-16 px-4 border-b border-gray-100 dark:border-gray-800">
          <button
            onClick={() => {
              if (isMobile) closeMobile()
              else setExpanded(!expanded)
            }}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {showExpanded ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <AnimatePresence>
            {showExpanded && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="ml-3 font-bold text-sm text-blue-600 whitespace-nowrap"
              >
                TESDA MBMS
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-hidden py-4 px-2 space-y-1">
          {items.map((item, i) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  href={item.href}
                  onClick={() => isMobile && closeMobile()}
                  className={cn(
                    'flex items-center gap-3 px-2 py-2.5 rounded-lg transition-colors text-sm font-medium',
                    active
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                  )}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  <AnimatePresence>
                    {showExpanded && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="truncate"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {showExpanded && active && (
                    <ChevronRight className="h-3 w-3 ml-auto text-blue-500" />
                  )}
                </Link>
              </motion.div>
            )
          })}
        </nav>

        {/* Bottom: user + logout */}
        <div className="border-t border-gray-100 dark:border-gray-800 p-3 space-y-2">
          <AnimatePresence>
            {showExpanded && userData && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-2 py-1.5"
              >
                <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {userData.username}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {userData.department}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={logout}
            className={cn(
              'flex items-center gap-3 w-full px-2 py-2.5 rounded-lg text-sm font-medium transition-colors',
              'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
            )}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            <AnimatePresence>
              {showExpanded && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  Sign Out
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>
    </>
  )
}

'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useSidebar } from '@/contexts/SidebarContext'
import { cn } from '@/lib/utils'

export function DashboardLayout({
  children,
  title,
  fullHeight = false,
}: {
  children: React.ReactNode
  title?: string
  fullHeight?: boolean
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { expanded } = useSidebar()

  return (
    <div className={cn(
      'bg-gray-50 dark:bg-gray-950',
      fullHeight ? 'h-screen overflow-hidden' : 'min-h-screen'
    )}>
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      {/* Desktop: margin tracks the sidebar width (64px / 240px). Mobile: the sidebar is an overlay drawer. */}
      <div className={cn(
        'ml-0 flex flex-col transition-[margin] duration-300 ease-out',
        expanded ? 'sm:ml-60' : 'sm:ml-16',
        fullHeight ? 'h-screen overflow-hidden' : 'min-h-screen'
      )}>
        <Header title={title} onMenuClick={() => setMobileOpen(true)} />
        <main className={cn(
          'flex-1 w-full',
          fullHeight
            ? 'overflow-hidden p-2 sm:p-3'
            : 'p-3 sm:p-6 max-w-screen-xl mx-auto overflow-auto'
        )}>
          {children}
        </main>
      </div>
    </div>
  )
}

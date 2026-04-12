'use client'

import { Sidebar } from './Sidebar'
import { Header } from './Header'
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
  return (
    <div className={cn(
      'bg-gray-50 dark:bg-gray-950',
      fullHeight ? 'h-screen overflow-hidden' : 'min-h-screen'
    )}>
      <Sidebar />
      <div className={cn(
        'ml-16 flex flex-col transition-all duration-300',
        fullHeight ? 'h-screen overflow-hidden' : 'min-h-screen'
      )}>
        <Header title={title} />
        <main className={cn(
          'flex-1 w-full',
          fullHeight
            ? 'overflow-hidden p-3'
            : 'p-6 max-w-screen-xl mx-auto overflow-auto'
        )}>
          {children}
        </main>
      </div>
    </div>
  )
}

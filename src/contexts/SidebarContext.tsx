'use client'

import React, { createContext, useContext, useState } from 'react'

// Desktop sidebar open/closed state. Lives in the root layout so it survives
// page navigation, and so DashboardLayout can push the content over to match.
interface SidebarContextType {
  expanded: boolean
  setExpanded: (expanded: boolean) => void
}

const SidebarContext = createContext<SidebarContextType>({
  expanded: false,
  setExpanded: () => {},
})

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <SidebarContext.Provider value={{ expanded, setExpanded }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  return useContext(SidebarContext)
}

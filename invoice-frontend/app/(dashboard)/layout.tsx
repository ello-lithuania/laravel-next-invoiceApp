'use client'
import { useState, useEffect, Suspense } from 'react'
import Sidebar from '@/components/dashboard/Sidebar'
import Header from '@/components/dashboard/Header'
import StatsBar from '@/components/dashboard/StatsBar'
import Breadcrumbs from '@/components/Breadcrumbs'
import { UserProvider } from '@/contexts/UserContext'
import CommandPalette from '@/components/CommandPalette'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // Read the saved state synchronously so the first client render already
  // matches the pre-paint markup set by the blocking script in the root
  // layout — no expand→collapse flicker on load.
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('sidebar-expanded') !== 'false'
  })

  // Once React controls the sidebar, drop the pre-hydration bridge so the
  // CSS overrides step aside and runtime toggling animates normally.
  useEffect(() => {
    document.documentElement.classList.remove('pre-hydration')
  }, [])

  useEffect(() => {
    localStorage.setItem('sidebar-expanded', String(sidebarExpanded))
    document.documentElement.classList.toggle('sidebar-collapsed', !sidebarExpanded)
  }, [sidebarExpanded])

  return (
    <UserProvider>
    <CommandPalette />
    <div className="flex h-screen overflow-hidden t-page-bg">
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        sidebarExpanded={sidebarExpanded}
        setSidebarExpanded={setSidebarExpanded}
      />

      <div className="relative flex flex-col flex-1 overflow-hidden">
        <Suspense fallback={null}>
          <Header
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            sidebarExpanded={sidebarExpanded}
            setSidebarExpanded={setSidebarExpanded}
          />
        </Suspense>

        {/* main scrolls; the StatsBar below stays pinned to the bottom */}
        <main className="grow overflow-y-auto overflow-x-hidden">
          <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
            <Suspense fallback={null}>
              <Breadcrumbs />
            </Suspense>
            {children}
          </div>
        </main>

        <StatsBar />
      </div>
    </div>
    </UserProvider>
  )
}

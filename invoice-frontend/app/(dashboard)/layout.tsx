'use client'
import { useState, useEffect, Suspense } from 'react'
import Sidebar from '@/components/dashboard/Sidebar'
import Header from '@/components/dashboard/Header'
import Breadcrumbs from '@/components/Breadcrumbs'
import { UserProvider } from '@/contexts/UserContext'
import CommandPalette from '@/components/CommandPalette'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarExpanded, setSidebarExpanded] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('sidebar-expanded')
    if (stored !== null) {
      setSidebarExpanded(stored === 'true')
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('sidebar-expanded', String(sidebarExpanded))
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

      <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        <Suspense fallback={null}>
          <Header
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            sidebarExpanded={sidebarExpanded}
            setSidebarExpanded={setSidebarExpanded}
          />
        </Suspense>

        <main className="grow">
          <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
            <Suspense fallback={null}>
              <Breadcrumbs />
            </Suspense>
            {children}
          </div>
        </main>
      </div>
    </div>
    </UserProvider>
  )
}

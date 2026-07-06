'use client'
import { useState, useEffect, useLayoutEffect, Suspense } from 'react'
import Sidebar from '@/components/dashboard/Sidebar'
import Header from '@/components/dashboard/Header'
import StatsBar from '@/components/dashboard/StatsBar'
import Breadcrumbs from '@/components/Breadcrumbs'
import { UserProvider } from '@/contexts/UserContext'
import CommandPalette from '@/components/CommandPalette'

// useLayoutEffect on the client (runs before paint → no flash), useEffect on
// the server render (avoids the SSR warning during static generation).
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // Must start at the SAME value the static HTML was built with (expanded),
  // or hydration mismatches (React #418). The blocking script in the root
  // layout + the pre-hydration CSS bridge make the collapsed rail *paint*
  // correctly before this effect runs, so there's still no visible flicker.
  const [sidebarExpanded, setSidebarExpanded] = useState(true)

  useIsomorphicLayoutEffect(() => {
    // Apply the saved state right after hydration but before the browser paints,
    // so the collapsed markup and the bridge removal commit together — no flash,
    // and no hydration mismatch (first render matched the static HTML).
    if (localStorage.getItem('sidebar-expanded') === 'false') setSidebarExpanded(false)
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

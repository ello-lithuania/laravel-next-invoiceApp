'use client'
import { useEffect, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'
import DashboardHeader from '@/components/dashboard/Header'
import Loading from '@/components/Loading'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(false)
  const pathname = usePathname()
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    
    setLoading(true)
    const timer = setTimeout(() => setLoading(false), 600)
    return () => clearTimeout(timer)
  }, [pathname])

  if (loading) {
    return <Loading />
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <DashboardHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  )
}
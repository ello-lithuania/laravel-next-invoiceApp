'use client'
import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SidebarProps {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  sidebarExpanded: boolean
  setSidebarExpanded: (expanded: boolean) => void
}

const navItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg className="shrink-0 fill-current" width="16" height="16" viewBox="0 0 16 16">
        <path d="M5.936.278A7.983 7.983 0 0 1 8 0a8 8 0 1 1-8 8c0-.722.104-1.413.278-2.064a1 1 0 1 1 1.932.516A5.99 5.99 0 0 0 2 8a6 6 0 1 0 6-6c-.53 0-1.045.076-1.548.21A1 1 0 1 1 5.936.278Z" />
        <path d="M6.068 7.482A2.003 2.003 0 0 0 8 10a2 2 0 1 0-.518-3.932L3.707 2.293a1 1 0 0 0-1.414 1.414l3.775 3.775Z" />
      </svg>
    ),
  },
  {
    label: 'Invoices',
    href: '/invoices',
    icon: (
      <svg className="shrink-0 fill-current" width="16" height="16" viewBox="0 0 16 16">
        <path d="M6 0a6 6 0 0 0-6 6c0 1.077.304 2.062.78 2.912a1 1 0 1 0 1.745-.976A3.945 3.945 0 0 1 2 6a4 4 0 0 1 4-4c.693 0 1.344.194 1.936.525A1 1 0 1 0 8.912.779 5.944 5.944 0 0 0 6 0Z" />
        <path d="M10 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12Zm-4 6a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z" />
      </svg>
    ),
  },
  {
    label: 'Clients',
    href: '/clients',
    icon: (
      <svg className="shrink-0 fill-current" width="16" height="16" viewBox="0 0 16 16">
        <path d="M12 1a1 1 0 1 0-2 0v2a3 3 0 0 0 3 3h2a1 1 0 1 0 0-2h-2a1 1 0 0 1-1-1V1ZM1 10a1 1 0 1 0 0 2h2a1 1 0 0 1 1 1v2a1 1 0 1 0 2 0v-2a3 3 0 0 0-3-3H1ZM5 0a1 1 0 0 1 1 1v2a3 3 0 0 1-3 3H1a1 1 0 0 1 0-2h2a1 1 0 0 0 1-1V1a1 1 0 0 1 1-1ZM12 13a1 1 0 0 1 1-1h2a1 1 0 1 0 0-2h-2a3 3 0 0 0-3 3v2a1 1 0 1 0 2 0v-2Z" />
      </svg>
    ),
  },
]

export default function Sidebar({ sidebarOpen, setSidebarOpen, sidebarExpanded, setSidebarExpanded }: SidebarProps) {
  const pathname = usePathname()
  const trigger = useRef<HTMLButtonElement>(null)
  const sidebar = useRef<HTMLDivElement>(null)

  // Close on click outside (mobile)
  useEffect(() => {
    const clickHandler = (e: MouseEvent) => {
      if (!sidebar.current || !trigger.current) return
      if (!sidebarOpen || sidebar.current.contains(e.target as Node) || trigger.current.contains(e.target as Node)) return
      setSidebarOpen(false)
    }
    document.addEventListener('click', clickHandler)
    return () => document.removeEventListener('click', clickHandler)
  })

  // Close on ESC
  useEffect(() => {
    const keyHandler = (e: KeyboardEvent) => {
      if (!sidebarOpen || e.key !== 'Escape') return
      setSidebarOpen(false)
    }
    document.addEventListener('keydown', keyHandler)
    return () => document.removeEventListener('keydown', keyHandler)
  })

  // Close mobile on route change
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  return (
    <div className="min-w-fit">
      {/* Backdrop (mobile) */}
      <div
        className={`fixed inset-0 bg-gray-900/30 z-40 lg:hidden transition-opacity duration-200 ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <div
        ref={sidebar}
        className={`flex flex-col absolute z-40 left-0 top-0 lg:static lg:left-auto lg:top-auto lg:translate-x-0 h-[100dvh] overflow-y-scroll lg:overflow-y-auto no-scrollbar shrink-0 p-4 transition-all duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-64'
        } ${sidebarExpanded ? 'w-64' : 'w-64 lg:w-20'} rounded-r-2xl shadow-sm`}
        style={{ backgroundColor: 'var(--t-bg-sidebar)', backdropFilter: 'blur(12px)' }}
      >
        {/* Header */}
        <div className="flex justify-between mb-10 pr-3 sm:px-2">
          {/* Close button (mobile) */}
          <button
            ref={trigger}
            className="lg:hidden text-gray-500 hover:text-gray-400"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <span className="sr-only">Close sidebar</span>
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
              <path d="M10.7 18.7l1.4-1.4L7.8 13H20v-2H7.8l4.3-4.3-1.4-1.4L4 12z" />
            </svg>
          </button>
          {/* Logo */}
          <Link href="/dashboard" className="block">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 btn-gradient">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className={`text-lg font-bold text-gray-800 dark:text-gray-100 duration-200 ${sidebarExpanded ? 'opacity-100' : 'lg:opacity-0 lg:hidden'}`}>
                InvoiceApp
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <div className="space-y-8">
          <div>
            <h3 className="text-xs uppercase text-gray-400 dark:text-gray-500 font-semibold pl-3">
              <span className={`${sidebarExpanded ? 'block' : 'hidden lg:block lg:text-center'}`}>
                {sidebarExpanded ? 'Pages' : '•••'}
              </span>
            </h3>
            <ul className="mt-3">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                return (
                  <li key={item.href} className={`pl-4 pr-3 py-2 rounded-lg mb-0.5 last:mb-0`}
                    style={isActive ? { background: `linear-gradient(to right, var(--t-accent-soft), transparent)` } : {}}
                  >
                    <Link
                      href={item.href}
                      className={`block truncate transition duration-150 ${
                        isActive
                          ? ''
                          : 'text-gray-800 dark:text-gray-100 hover:text-gray-900 dark:hover:text-white'
                      }`}
                      style={isActive ? { color: 'var(--t-accent)' } : {}}
                      title={!sidebarExpanded ? item.label : undefined}
                    >
                      <div className="flex items-center">
                        <span style={isActive ? { color: 'var(--t-accent)' } : { color: 'var(--t-text-muted)' }}>
                          {item.icon}
                        </span>
                        <span className={`text-sm font-medium ml-4 duration-200 ${
                          sidebarExpanded ? 'opacity-100' : 'lg:opacity-0 lg:hidden'
                        }`}>
                          {item.label}
                        </span>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>

        {/* New Invoice CTA */}
        <div className="mt-auto pt-4">
          <Link
            href="/invoices/new"
            className={`btn btn-gradient w-full ${sidebarExpanded ? 'gap-2' : 'lg:px-0 lg:justify-center'}`}
            title={!sidebarExpanded ? 'New Invoice' : undefined}
          >
            <svg className="fill-current shrink-0" width="16" height="16" viewBox="0 0 16 16">
              <path d="M15 7H9V1c0-.6-.4-1-1-1S7 .4 7 1v6H1c-.6 0-1 .4-1 1s.4 1 1 1h6v6c0 .6.4 1 1 1s1-.4 1-1V9h6c.6 0 1-.4 1-1s-.4-1-1-1z" />
            </svg>
            <span className={`duration-200 ${sidebarExpanded ? 'opacity-100' : 'lg:hidden lg:opacity-0'}`}>New Invoice</span>
          </Link>

          {/* Expand / collapse button */}
          <div className="hidden lg:inline-flex justify-end mt-2 w-full">
            <button
              onClick={() => setSidebarExpanded(!sidebarExpanded)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700/50"
            >
              <svg className={`fill-current text-gray-400 dark:text-gray-500 shrink-0 transition-transform duration-200 ${sidebarExpanded ? 'rotate-180' : ''}`} width="16" height="16" viewBox="0 0 16 16">
                <path d="M6.6 13.4L5.2 12l4-4-4-4 1.4-1.4L12 8z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

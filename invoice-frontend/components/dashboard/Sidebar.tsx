'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { stats } from '@/lib/api'
import { STATS_REFRESH_EVENT } from '@/lib/utils'

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
    addHref: '/clients/new',
    icon: (
      <svg className="shrink-0 fill-current" width="16" height="16" viewBox="0 0 16 16">
        <path d="M12 1a1 1 0 1 0-2 0v2a3 3 0 0 0 3 3h2a1 1 0 1 0 0-2h-2a1 1 0 0 1-1-1V1ZM1 10a1 1 0 1 0 0 2h2a1 1 0 0 1 1 1v2a1 1 0 1 0 2 0v-2a3 3 0 0 0-3-3H1ZM5 0a1 1 0 0 1 1 1v2a3 3 0 0 1-3 3H1a1 1 0 0 1 0-2h2a1 1 0 0 0 1-1V1a1 1 0 0 1 1-1ZM12 13a1 1 0 0 1 1-1h2a1 1 0 1 0 0-2h-2a3 3 0 0 0-3 3v2a1 1 0 1 0 2 0v-2Z" />
      </svg>
    ),
  },
  {
    label: 'Time Tracking',
    href: '/time-tracking',
    icon: (
      <svg className="shrink-0 fill-current" width="16" height="16" viewBox="0 0 16 16">
        <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0Zm0 14A6 6 0 1 1 8 2a6 6 0 0 1 0 12Z" />
        <path d="M9 4a1 1 0 0 0-2 0v4a1 1 0 0 0 .293.707l2 2a1 1 0 0 0 1.414-1.414L9 7.586V4Z" />
      </svg>
    ),
  },
  {
    label: 'Year Summary',
    href: '/year-summary',
    icon: (
      <svg className="shrink-0 fill-current" width="16" height="16" viewBox="0 0 16 16">
        <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2zm2 0v12h8V2H4z" />
        <path d="M5 5h6v1H5V5zm0 3h6v1H5V8zm0 3h4v1H5v-1z" />
      </svg>
    ),
  },
  {
    label: 'Activity',
    href: '/activity',
    icon: (
      <svg className="shrink-0 fill-current" width="16" height="16" viewBox="0 0 16 16">
        <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM7 4a1 1 0 0 1 2 0v3.6l2.3 2.3a1 1 0 0 1-1.4 1.4l-2.6-2.6A1 1 0 0 1 7 8V4z" />
      </svg>
    ),
  },
]

export default function Sidebar({ sidebarOpen, setSidebarOpen, sidebarExpanded }: SidebarProps) {
  const pathname = usePathname()
  const trigger = useRef<HTMLButtonElement>(null)
  const sidebar = useRef<HTMLDivElement>(null)
  const [unpaidCount, setUnpaidCount] = useState(0)

  // Live unpaid badge on the Invoices item — fetch on mount and refresh
  // whenever a status change fires the global stats-refresh event.
  useEffect(() => {
    let active = true
    const load = () => stats.quickStats()
      .then(d => { if (active) setUnpaidCount(d.unpaid_count) })
      .catch(() => { /* badge is best-effort */ })
    load()
    window.addEventListener(STATS_REFRESH_EVENT, load)
    return () => { active = false; window.removeEventListener(STATS_REFRESH_EVENT, load) }
  }, [])

  const renderItem = (item: { label: string; href: string; icon: React.ReactNode; addHref?: string }) => {
    // trailingSlash: true makes usePathname() return e.g. "/dashboard/" — strip
    // it so the exact match for the Dashboard item works (not just startsWith).
    const path = pathname.replace(/\/+$/, '') || '/'
    const isActive = path === item.href || (item.href !== '/dashboard' && path.startsWith(item.href + '/'))
    const badge = item.href === '/invoices' && unpaidCount > 0 ? unpaidCount : null
    return (
      <li key={item.href} className={`relative isolate mb-1 last:mb-0 transition-all`}>
        {isActive && (
          // Full-bleed accent band: fills to the sidebar's inner edges (cancels
          // the p-4 via -left-4/-right-4), no radius, no white side gaps. Sits
          // behind the content (-z-10) so icon/label stay on top.
          <span className="absolute inset-y-0 -left-4 -right-4 -z-10" style={{ background: 'var(--t-accent-soft)' }} aria-hidden="true" />
        )}
        {badge !== null && !sidebarExpanded && (
          <span
            className="hidden lg:flex absolute top-0.5 right-1.5 min-w-[16px] h-4 px-1 items-center justify-center rounded-full z-10 text-[10px] font-bold leading-none text-white tabular-nums"
            style={{ background: 'var(--t-accent)' }}
            title={`${badge} unpaid invoice${badge === 1 ? '' : 's'}`}
          >
            {badge > 9 ? '9+' : badge}
          </span>
        )}
        {item.addHref && sidebarExpanded && (
          <Link
            href={item.addHref}
            title={`New ${item.label}`}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-6 h-6 flex items-center justify-center bd-clip-sm transition-colors"
            style={{ color: 'var(--t-text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--t-accent-soft)'; e.currentTarget.style.color = 'var(--t-accent)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t-text-muted)' }}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" className="fill-current">
              <path d="M15 7H9V1c0-.6-.4-1-1-1S7 .4 7 1v6H1c-.6 0-1 .4-1 1s.4 1 1 1h6v6c0 .6.4 1 1 1s1-.4 1-1V9h6c.6 0 1-.4 1-1s-.4-1-1-1z" />
            </svg>
          </Link>
        )}
        <Link
          href={item.href}
          className={`block rounded-lg outline-none focus:outline-none transition duration-150 ${
            // collapsed (lg): vertical icon+label rail; expanded: horizontal row
            sidebarExpanded ? 'pl-4 pr-3 py-2.5' : 'pl-4 pr-3 py-2.5 lg:px-1 lg:py-2'
          } ${isActive ? '' : 'text-gray-800 dark:text-gray-100 hover:text-gray-900 dark:hover:text-white'}`}
          style={isActive ? { color: 'var(--t-accent)' } : undefined}
        >
          <div className={`flex items-center ${sidebarExpanded ? '' : 'lg:flex-col lg:gap-1'}`}>
            <span style={isActive ? { color: 'var(--t-accent)' } : { color: 'var(--t-text-muted)' }}>
              {item.icon}
            </span>
            <span className={`nav-label font-medium duration-200 ${
              sidebarExpanded
                ? 'text-sm ml-4 truncate'
                : 'text-sm ml-4 truncate lg:ml-0 lg:text-[10px] lg:leading-tight lg:font-semibold lg:text-center lg:whitespace-normal lg:overflow-visible'
            }`}>
              {item.label}
            </span>
            {badge !== null && sidebarExpanded && (
              <span className="ml-auto text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded-full"
                style={{ background: 'var(--t-accent-soft)', color: 'var(--t-accent)' }}
                title={`${badge} unpaid invoice${badge === 1 ? '' : 's'}`}>
                {badge}
              </span>
            )}
          </div>
        </Link>
      </li>
    )
  }

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
        id="sidebar"
        ref={sidebar}
        className={`flex flex-col absolute z-40 left-0 top-0 lg:static lg:left-auto lg:top-auto lg:translate-x-0 h-[100dvh] overflow-y-scroll lg:overflow-y-auto no-scrollbar shrink-0 p-4 transition-all duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-64'
        } ${sidebarExpanded ? 'w-56' : 'w-56 lg:w-20'} shadow-sm`}
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
          {/* Logo — spinning 3D cube + gradient wordmark */}
          <Link href="/dashboard" className="block">
            <div className="flex items-center gap-2.5">
              <div className="bd-cube-stage shrink-0">
                <div className="bd-cube"><span /><span /><span /><span /><span /><span /></div>
              </div>
              <span className={`bd-wordmark text-lg duration-200 ${sidebarExpanded ? 'opacity-100' : 'lg:opacity-0 lg:hidden'}`}>
                Invoicer
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <div>
          {/* Section label only makes sense when expanded — a lone "•••" reads
              as noise on the collapsed rail, so drop it entirely there. */}
          <h3 className={`text-xs uppercase text-gray-400 dark:text-gray-500 font-semibold pl-3 ${sidebarExpanded ? 'block' : 'hidden'}`}>
            Menu
          </h3>
          <ul className={sidebarExpanded ? 'mt-3' : 'mt-3 lg:mt-0'}>{navItems.map(renderItem)}</ul>
        </div>
      </div>
    </div>
  )
}

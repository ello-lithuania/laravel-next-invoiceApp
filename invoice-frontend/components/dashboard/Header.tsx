'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { auth, activity as activityApi, Activity } from '@/lib/api'
import { useTheme, themes } from '@/contexts/ThemeContext'
import { useUser } from '@/contexts/UserContext'

interface HeaderProps {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  sidebarExpanded: boolean
  setSidebarExpanded: (expanded: boolean) => void
}

export default function Header({ sidebarOpen, setSidebarOpen, sidebarExpanded, setSidebarExpanded }: HeaderProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { user } = useUser()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)
  const [themePickerOpen, setThemePickerOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [activities, setActivities] = useState<Activity[]>([])
  const { colorTheme, isDark, mounted, setColorTheme, toggleMode } = useTheme()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdown = useRef<HTMLDivElement>(null)
  const activityDropdown = useRef<HTMLDivElement>(null)
  const themeDropdown = useRef<HTMLDivElement>(null)
  const createDropdown = useRef<HTMLDivElement>(null)
  const searchInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const q = searchParams.get('search') || ''
    if (pathname.startsWith('/invoices')) {
      setSearchQuery(q)
    } else {
      setSearchQuery('')
    }
  }, [searchParams, pathname])

  useEffect(() => {
    // User now comes from UserContext (fetched once for the whole dashboard).
    activityApi.list()
      .then(setActivities)
      .catch(() => { /* api() handles 401; ignore transient activity errors */ })
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdown.current && !dropdown.current.contains(e.target as Node)) setDropdownOpen(false)
      if (activityDropdown.current && !activityDropdown.current.contains(e.target as Node)) setActivityOpen(false)
      if (themeDropdown.current && !themeDropdown.current.contains(e.target as Node)) setThemePickerOpen(false)
      if (createDropdown.current && !createDropdown.current.contains(e.target as Node)) setCreateOpen(false)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // ⌘K is handled by the global CommandPalette
      if (e.key === 'Escape') { setSearchOpen(false); setThemePickerOpen(false) }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const handleLogout = async () => {
    try { await auth.logout() } catch (e: any) { /* logout best-effort */ }
    router.push('/login')
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/invoices?search=${encodeURIComponent(searchQuery.trim())}`)
      setSearchOpen(false)
    }
  }

  const timeAgo = (date: string) => {
    const now = new Date()
    const d = new Date(date)
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
    return d.toLocaleDateString('lt-LT')
  }

  return (
    <header className="sticky top-0 z-30" style={{ backgroundColor: 'var(--t-bg-header)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--t-border)' }}>
      <div className="px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between h-16">

        {/* Left: Hamburger toggle */}
        <div className="flex items-center gap-4">
          <button
            className="flex items-center justify-center w-10 h-10 bd-clip-sm transition-colors"
            style={{ border: '1px solid var(--t-border)', background: 'var(--t-bg-card)', color: 'var(--t-text-secondary)' }}
            aria-controls="sidebar"
            onClick={(e) => {
              e.stopPropagation()
              if (window.innerWidth < 1024) {
                setSidebarOpen(!sidebarOpen)
              } else {
                setSidebarExpanded(!sidebarExpanded)
              }
            }}
          >
            <span className="sr-only">Toggle sidebar</span>
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <rect x="4" y="5" width="16" height="2" />
              <rect x="4" y="11" width="16" height="2" />
              <rect x="4" y="17" width="16" height="2" />
            </svg>
          </button>
        </div>

        {/* Center: Search */}
        <div className="flex-1 max-w-xl mx-4 sm:mx-8 hidden sm:block">
          <form onSubmit={handleSearch} className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--t-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchInput}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search or type command..."
              className="w-full pl-12 pr-20 py-2.5 text-sm bd-clip-sm transition-all"
              style={{ background: 'var(--t-bg-input)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <kbd className="px-2 py-1 text-[11px] font-medium rounded shadow-sm" style={{ color: 'var(--t-text-muted)', background: 'var(--t-bg-elevated)', border: '1px solid var(--t-border)' }}>⌘</kbd>
              <kbd className="px-2 py-1 text-[11px] font-medium rounded shadow-sm" style={{ color: 'var(--t-text-muted)', background: 'var(--t-bg-elevated)', border: '1px solid var(--t-border)' }}>K</kbd>
            </div>
          </form>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-3">
          {/* Quick create */}
          <div className="relative" ref={createDropdown}>
            <button
              onClick={() => setCreateOpen(!createOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bd-clip-sm text-sm font-semibold text-white btn-gradient"
              title="Create new"
            >
              <svg className="fill-current shrink-0" width="14" height="14" viewBox="0 0 16 16">
                <path d="M15 7H9V1c0-.6-.4-1-1-1S7 .4 7 1v6H1c-.6 0-1 .4-1 1s.4 1 1 1h6v6c0 .6.4 1 1 1s1-.4 1-1V9h6c.6 0 1-.4 1-1s-.4-1-1-1z" />
              </svg>
              <span className="hidden sm:inline">New</span>
            </button>

            {createOpen && (
              <div className="header-dropdown absolute right-0 mt-2.5 w-56 rounded-xl shadow-2xl z-20 overflow-hidden"
                style={{ background: 'var(--t-bg-card)', border: '1px solid var(--t-border)', backdropFilter: 'blur(16px)', maxWidth: 'calc(100vw - 2rem)' }}
              >
                {[
                  { label: 'New Invoice', sub: 'Create an invoice', href: '/invoices/new', color: 'var(--t-accent)', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                  { label: 'New Client', sub: 'Add a client', href: '/clients/new', color: '#a855f7', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
                  { label: 'Time Entry', sub: 'Track time', href: '/time-tracking', color: '#10b981', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
                ].map((it) => (
                  <Link key={it.href} href={it.href} onClick={() => setCreateOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 transition-colors"
                    style={{ borderBottom: '1px solid var(--t-border-light)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--t-bg-elevated)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span className="w-9 h-9 bd-clip-sm flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${it.color}, color-mix(in srgb, ${it.color} 60%, #000))` }}>
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={it.icon} />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold t-text">{it.label}</p>
                      <p className="text-xs t-text-muted">{it.sub}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Mobile search button */}
          <button
            className="sm:hidden w-8 h-8 flex items-center justify-center rounded-full transition-colors"
            style={{ color: 'var(--t-text-muted)' }}
            onClick={() => setSearchOpen(!searchOpen)}
          >
            <svg className="fill-current" width={16} height={16} viewBox="0 0 16 16">
              <path d="M7 14c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7ZM7 2C4.243 2 2 4.243 2 7s2.243 5 5 5 5-2.243 5-5-2.243-5-5-5Z" />
              <path d="m13.314 11.9 2.393 2.393a.999.999 0 1 1-1.414 1.414L11.9 13.314a8.019 8.019 0 0 0 1.414-1.414Z" />
            </svg>
          </button>

          {/* Dark/Light toggle (sun/moon) */}
          <button
            className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
            style={{ color: 'var(--t-text-muted)' }}
            onClick={toggleMode}
            title={mounted ? (isDark ? 'Switch to light mode' : 'Switch to dark mode') : undefined}
            suppressHydrationWarning
          >
            {/* Sun — shown in dark mode (click to switch to light) */}
            <svg className="fill-current hidden dark:block" width={16} height={16} viewBox="0 0 16 16">
              <path d="M8 0a1 1 0 0 1 1 1v.5a1 1 0 1 1-2 0V1a1 1 0 0 1 1-1Z" />
              <path d="M12 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm-4 2a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
              <path d="M13.657 3.757a1 1 0 0 0-1.414-1.414l-.354.354a1 1 0 0 0 1.414 1.414l.354-.354ZM13.5 8a1 1 0 0 1 1-1h.5a1 1 0 1 1 0 2h-.5a1 1 0 0 1-1-1ZM13.303 11.889a1 1 0 0 0-1.414 1.414l.354.354a1 1 0 0 0 1.414-1.414l-.354-.354ZM8 13.5a1 1 0 0 1 1 1v.5a1 1 0 1 1-2 0v-.5a1 1 0 0 1 1-1ZM4.111 13.303a1 1 0 1 0-1.414-1.414l-.354.354a1 1 0 1 0 1.414 1.414l.354-.354ZM0 8a1 1 0 0 1 1-1h.5a1 1 0 0 1 0 2H1a1 1 0 0 1-1-1ZM3.757 2.343a1 1 0 1 0-1.414 1.414l.354.354A1 1 0 1 0 4.11 2.697l-.354-.354Z" />
            </svg>
            {/* Moon — shown in light mode (click to switch to dark) */}
            <svg className="fill-current block dark:hidden" width={16} height={16} viewBox="0 0 16 16">
              <path d="M11.875 4.375a.625.625 0 1 0 1.25 0c.001-.69.56-1.249 1.25-1.25a.625.625 0 1 0 0-1.25 1.252 1.252 0 0 1-1.25-1.25.625.625 0 1 0-1.25 0 1.252 1.252 0 0 1-1.25 1.25.625.625 0 1 0 0 1.25c.69.001 1.249.56 1.25 1.25Z" />
              <path d="M7.019 1.985a1.55 1.55 0 0 0-.483-1.36 1.44 1.44 0 0 0-1.53-.277C2.056 1.553 0 4.5 0 7.9 0 12.352 3.648 16 8.1 16c3.407 0 6.246-2.058 7.51-4.963a1.446 1.446 0 0 0-.25-1.55 1.554 1.554 0 0 0-1.372-.502c-4.01.552-7.539-2.987-6.97-7ZM2 7.9C2 5.64 3.193 3.664 4.961 2.6 4.82 7.245 8.72 11.158 13.36 11.04 12.265 12.822 10.341 14 8.1 14 4.752 14 2 11.248 2 7.9Z" />
            </svg>
          </button>

          {/* Theme Color Picker (grid icon) */}
          <div className="relative" ref={themeDropdown}>
            <button
              className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
              style={{ color: 'var(--t-text-muted)' }}
              onClick={() => setThemePickerOpen(!themePickerOpen)}
              title="Choose theme color"
            >
              <svg width={16} height={16} viewBox="0 0 16 16" fill="currentColor">
                <rect x="1" y="1" width="4" height="4" rx="1" />
                <rect x="6" y="1" width="4" height="4" rx="1" />
                <rect x="11" y="1" width="4" height="4" rx="1" />
                <rect x="1" y="6" width="4" height="4" rx="1" />
                <rect x="6" y="6" width="4" height="4" rx="1" />
                <rect x="11" y="6" width="4" height="4" rx="1" />
                <rect x="1" y="11" width="4" height="4" rx="1" />
                <rect x="6" y="11" width="4" height="4" rx="1" />
                <rect x="11" y="11" width="4" height="4" rx="1" />
              </svg>
            </button>

            {themePickerOpen && (
              <div className="header-dropdown absolute right-0 mt-2.5 w-64 rounded-xl shadow-2xl z-20 overflow-hidden"
                style={{ background: 'var(--t-bg-card)', border: '1px solid var(--t-border)', backdropFilter: 'blur(16px)', maxWidth: 'calc(100vw - 2rem)' }}
              >
                <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--t-border)' }}>
                  <h3 className="text-sm font-semibold t-text">Theme Color</h3>
                  <p className="text-xs t-text-muted mt-0.5">Choose your color palette</p>
                </div>
                <div className="p-3 grid grid-cols-3 gap-2">
                  {themes.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => { setColorTheme(t.id); setThemePickerOpen(false) }}
                      className={`relative rounded-lg overflow-hidden transition-all h-16 ${
                        colorTheme === t.id ? 'ring-2 scale-105' : 'hover:scale-105'
                      }`}
                      style={{
                        ...(colorTheme === t.id ? { '--tw-ring-color': 'var(--t-accent)' } as any : {}),
                      }}
                    >
                      <div className={`theme-swatch-${t.id} w-full h-full flex items-center justify-center`}>
                        <span className="text-xs font-medium px-2 py-0.5 rounded backdrop-blur-sm text-white/90 bg-black/30">{t.name}</span>
                      </div>
                      {colorTheme === t.id && (
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: 'var(--t-accent)' }}>
                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notifications / Activity */}
          <div className="relative" ref={activityDropdown}>
            <button
              className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
              style={{ color: 'var(--t-text-muted)' }}
              onClick={() => setActivityOpen(!activityOpen)}
            >
              <span className="relative">
                <svg className="fill-current" width={16} height={16} viewBox="0 0 16 16">
                  <path d="M8 0a1 1 0 0 0-1 1v.1A6.003 6.003 0 0 0 2 7v3.159c0 .538-.214 1.055-.595 1.436L.11 12.89a.75.75 0 0 0 .53 1.28h14.72a.75.75 0 0 0 .53-1.28l-1.295-1.296A2.032 2.032 0 0 1 14 10.159V7a6.003 6.003 0 0 0-5-5.9V1a1 1 0 0 0-1-1ZM5.5 14.5a2.5 2.5 0 0 0 5 0h-5Z" />
                </svg>
              </span>
            </button>

            {activityOpen && (
              <div className="header-dropdown absolute right-0 mt-2.5 w-80 sm:w-96 rounded-xl shadow-2xl z-20 overflow-hidden"
                style={{ background: 'var(--t-bg-card)', border: '1px solid var(--t-border)', backdropFilter: 'blur(16px)', maxWidth: 'calc(100vw - 2rem)' }}
              >
                <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--t-border)' }}>
                  <h3 className="text-sm font-semibold t-text">Recent Activity</h3>
                  {activities.length > 0 && (
                    <span className="text-xs t-text-muted">{activities.length} items</span>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {activities.length === 0 ? (
                    <div className="px-4 py-8 text-center t-text-muted text-sm">No recent activity</div>
                  ) : (
                    <div>
                      {activities.slice(0, 8).map((item) => (
                        <Link
                          key={`${item.type}-${item.id}`}
                          href={item.type === 'client' ? `/clients/edit?id=${item.id}` : `/invoices/edit?id=${item.id}`}
                          className="flex items-start gap-3 px-4 py-3 transition-colors"
                          style={{ borderBottom: '1px solid var(--t-border-light)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--t-bg-elevated)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          onClick={() => setActivityOpen(false)}
                        >
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                            item.type === 'client' ? 'bg-purple-500/15' : 'bg-emerald-500/15'
                          }`}>
                            {item.type === 'client' ? (
                              <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium t-text truncate">{item.title}</p>
                            <p className="text-xs t-text-muted mt-0.5">
                              {item.type === 'client' ? 'New client' : item.subtitle}
                              {item.total ? ` · ${item.total} €` : ''}
                            </p>
                          </div>
                          <span className="text-[11px] t-text-muted shrink-0 mt-1">{timeAgo(item.date)}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                <div className="px-4 py-2.5" style={{ borderTop: '1px solid var(--t-border)', background: 'var(--t-bg-elevated)' }}>
                  <Link href="/dashboard" className="text-xs font-medium t-accent hover:underline" onClick={() => setActivityOpen(false)}>
                    View all activity →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <hr className="w-px h-6 border-none" style={{ background: 'var(--t-border)' }} />

          {/* User menu — Volta style */}
          <div className="relative inline-flex" ref={dropdown}>
            <button className="inline-flex justify-center items-center group" onClick={() => setDropdownOpen(!dropdownOpen)}>
              <div className="w-8 h-8 bd-clip-sm flex items-center justify-center text-white text-sm font-semibold btn-gradient" suppressHydrationWarning>
                {user?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex items-center truncate">
                <span className="truncate ml-2 text-sm font-medium max-w-[120px] t-text" suppressHydrationWarning>
                  {user?.name || 'User'}
                </span>
                <svg className="w-3 h-3 shrink-0 ml-1 fill-current t-text-muted" viewBox="0 0 12 12">
                  <path d="M5.9 11.4L.5 6l1.4-1.4 4 4 4-4L11.3 6z" />
                </svg>
              </div>
            </button>

            {dropdownOpen && (
              <div className="header-dropdown origin-top-right z-10 absolute top-full min-w-56 rounded-xl shadow-2xl overflow-hidden mt-2 right-0"
                style={{ background: 'var(--t-bg-card)', border: '1px solid var(--t-border)', backdropFilter: 'blur(16px)', maxWidth: 'calc(100vw - 2rem)' }}
              >
                {/* User info header */}
                <div className="px-4 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid var(--t-border)' }}>
                  <div className="w-12 h-12 bd-clip flex items-center justify-center text-white text-lg font-bold btn-gradient shrink-0">
                    {user?.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold t-text truncate">{user?.name}</p>
                    <p className="text-xs t-text-muted truncate">{user?.email}</p>
                  </div>
                </div>

                {/* Links */}
                <div className="py-2">
                  <Link href="/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium t-text-secondary transition-colors"
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--t-bg-elevated)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => setDropdownOpen(false)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    My Profile
                  </Link>
                  <Link href="/settings" className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium t-text-secondary transition-colors"
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--t-bg-elevated)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => setDropdownOpen(false)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Account Settings
                  </Link>
                </div>

                {/* Sign Out */}
                <div className="p-3" style={{ borderTop: '1px solid var(--t-border)' }}>
                  <button
                    onClick={handleLogout}
                    className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:brightness-110"
                    style={{ background: 'linear-gradient(135deg, var(--t-gradient-from), var(--t-gradient-to))', boxShadow: '0 2px 8px var(--t-accent-glow)' }}
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Mobile search (expandable) */}
      {searchOpen && (
        <div className="sm:hidden px-4 py-3" style={{ borderTop: '1px solid var(--t-border)', background: 'var(--t-bg-card)' }}>
          <form onSubmit={handleSearch} className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--t-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search invoices…"
              autoFocus
              className="w-full pl-10 pr-4 py-2.5 text-sm bd-clip-sm transition-colors"
              style={{ background: 'var(--t-bg-input)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
            />
          </form>
        </div>
      )}
    </header>
  )
}

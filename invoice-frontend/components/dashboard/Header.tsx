'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { auth, activity as activityApi, Activity } from '@/lib/api'

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
  const [user, setUser] = useState<any>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)
  const [activities, setActivities] = useState<Activity[]>([])
  const [darkMode, setDarkMode] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdown = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const q = searchParams.get('search') || ''
    if (pathname.startsWith('/invoices')) {
      setSearchQuery(q)
    } else {
      setSearchQuery('')
    }
  }, [searchParams, pathname])
  const activityDropdown = useRef<HTMLDivElement>(null)
  const searchInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userData, activityData] = await Promise.all([
          auth.user(),
          activityApi.list()
        ])
        setUser(userData)
        setActivities(activityData)
      } catch (e) {
        router.push('/login')
      }
    }
    fetchData()
  }, [router])

  useEffect(() => {
    const isDark = localStorage.getItem('dark-mode') !== 'false'
    setDarkMode(isDark)
    if (isDark) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdown.current && !dropdown.current.contains(e.target as Node)) setDropdownOpen(false)
      if (activityDropdown.current && !activityDropdown.current.contains(e.target as Node)) setActivityOpen(false)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchInput.current?.focus()
      }
      if (e.key === 'Escape') setSearchOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const toggleDarkMode = () => {
    const newMode = !darkMode
    setDarkMode(newMode)
    localStorage.setItem('dark-mode', String(newMode))
    document.documentElement.classList.add('transition-colors')
    document.documentElement.classList.toggle('dark', newMode)
    setTimeout(() => document.documentElement.classList.remove('transition-colors'), 400)
  }

  const handleLogout = async () => {
    try { await auth.logout() } catch (e) {}
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
    <header className="sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700/60">
      <div className="px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between h-16">

        {/* Left: Hamburger toggle */}
        <div className="flex items-center gap-4">
          <button
            className="flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors shadow-sm"
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
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchInput}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search or type command..."
              className="w-full pl-12 pr-20 py-2.5 text-sm bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700/60 rounded-lg text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:bg-white dark:focus:bg-gray-900/80 focus:shadow-sm transition-all"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <kbd className="px-2 py-1 text-[11px] font-medium text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded shadow-sm">⌘</kbd>
              <kbd className="px-2 py-1 text-[11px] font-medium text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded shadow-sm">K</kbd>
            </div>
          </form>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-3">
          {/* Mobile search button */}
          <button
            className="sm:hidden w-8 h-8 flex items-center justify-center hover:bg-gray-100 lg:hover:bg-gray-200 dark:hover:bg-gray-700/50 dark:lg:hover:bg-gray-800 rounded-full"
            onClick={() => setSearchOpen(!searchOpen)}
          >
            <svg className="fill-current text-gray-500/80 dark:text-gray-400/80" width={16} height={16} viewBox="0 0 16 16">
              <path d="M7 14c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7ZM7 2C4.243 2 2 4.243 2 7s2.243 5 5 5 5-2.243 5-5-2.243-5-5-5Z" />
              <path d="m13.314 11.9 2.393 2.393a.999.999 0 1 1-1.414 1.414L11.9 13.314a8.019 8.019 0 0 0 1.414-1.414Z" />
            </svg>
          </button>

          {/* Dark mode */}
          <button
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 lg:hover:bg-gray-200 dark:hover:bg-gray-700/50 dark:lg:hover:bg-gray-800 rounded-full"
            onClick={toggleDarkMode}
          >
            {darkMode ? (
              <svg className="fill-current text-gray-500/80 dark:text-gray-400/80" width={16} height={16} viewBox="0 0 16 16">
                <path d="M8 0a1 1 0 0 1 1 1v.5a1 1 0 1 1-2 0V1a1 1 0 0 1 1-1Z" />
                <path d="M12 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm-4 2a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
                <path d="M13.657 3.757a1 1 0 0 0-1.414-1.414l-.354.354a1 1 0 0 0 1.414 1.414l.354-.354ZM13.5 8a1 1 0 0 1 1-1h.5a1 1 0 1 1 0 2h-.5a1 1 0 0 1-1-1ZM13.303 11.889a1 1 0 0 0-1.414 1.414l.354.354a1 1 0 0 0 1.414-1.414l-.354-.354ZM8 13.5a1 1 0 0 1 1 1v.5a1 1 0 1 1-2 0v-.5a1 1 0 0 1 1-1ZM4.111 13.303a1 1 0 1 0-1.414-1.414l-.354.354a1 1 0 1 0 1.414 1.414l.354-.354ZM0 8a1 1 0 0 1 1-1h.5a1 1 0 0 1 0 2H1a1 1 0 0 1-1-1ZM3.757 2.343a1 1 0 1 0-1.414 1.414l.354.354A1 1 0 1 0 4.11 2.697l-.354-.354Z" />
              </svg>
            ) : (
              <svg className="fill-current text-gray-500/80 dark:text-gray-400/80" width={16} height={16} viewBox="0 0 16 16">
                <path d="M11.875 4.375a.625.625 0 1 0 1.25 0c.001-.69.56-1.249 1.25-1.25a.625.625 0 1 0 0-1.25 1.252 1.252 0 0 1-1.25-1.25.625.625 0 1 0-1.25 0 1.252 1.252 0 0 1-1.25 1.25.625.625 0 1 0 0 1.25c.69.001 1.249.56 1.25 1.25Z" />
                <path d="M7.019 1.985a1.55 1.55 0 0 0-.483-1.36 1.44 1.44 0 0 0-1.53-.277C2.056 1.553 0 4.5 0 7.9 0 12.352 3.648 16 8.1 16c3.407 0 6.246-2.058 7.51-4.963a1.446 1.446 0 0 0-.25-1.55 1.554 1.554 0 0 0-1.372-.502c-4.01.552-7.539-2.987-6.97-7ZM2 7.9C2 5.64 3.193 3.664 4.961 2.6 4.82 7.245 8.72 11.158 13.36 11.04 12.265 12.822 10.341 14 8.1 14 4.752 14 2 11.248 2 7.9Z" />
              </svg>
            )}
          </button>

          {/* Notifications / Activity */}
          <div className="relative" ref={activityDropdown}>
            <button
              className={`w-8 h-8 flex items-center justify-center hover:bg-gray-100 lg:hover:bg-gray-200 dark:hover:bg-gray-700/50 dark:lg:hover:bg-gray-800 rounded-full ${activityOpen ? 'bg-gray-200 dark:bg-gray-800' : ''}`}
              onClick={() => setActivityOpen(!activityOpen)}
            >
              <span className="relative">
                <svg className="fill-current text-gray-500/80 dark:text-gray-400/80" width={16} height={16} viewBox="0 0 16 16">
                  <path d="M8 0a1 1 0 0 0-1 1v.1A6.003 6.003 0 0 0 2 7v3.159c0 .538-.214 1.055-.595 1.436L.11 12.89a.75.75 0 0 0 .53 1.28h14.72a.75.75 0 0 0 .53-1.28l-1.295-1.296A2.032 2.032 0 0 1 14 10.159V7a6.003 6.003 0 0 0-5-5.9V1a1 1 0 0 0-1-1ZM5.5 14.5a2.5 2.5 0 0 0 5 0h-5Z" />
                </svg>
              </span>
            </button>

            {activityOpen && (
              <div className="absolute right-0 mt-2.5 w-[calc(100vw-1rem)] sm:w-96 max-w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-xl shadow-xl z-20 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Recent Activity</h3>
                  {activities.length > 0 && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">{activities.length} items</span>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {activities.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-400 dark:text-gray-500 text-sm">
                      No recent activity
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
                      {activities.slice(0, 8).map((item) => (
                        <Link
                          key={`${item.type}-${item.id}`}
                          href={item.type === 'client' ? `/clients/edit?id=${item.id}` : `/invoices/edit?id=${item.id}`}
                          className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                          onClick={() => setActivityOpen(false)}
                        >
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                            item.type === 'client' ? 'bg-purple-100 dark:bg-purple-500/15' : 'bg-emerald-100 dark:bg-emerald-500/15'
                          }`}>
                            {item.type === 'client' ? (
                              <svg className="w-4 h-4 text-purple-500 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 text-emerald-500 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{item.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {item.type === 'client' ? 'New client' : item.subtitle}
                              {item.total ? ` · ${item.total} €` : ''}
                            </p>
                          </div>
                          <span className="text-[11px] text-gray-400 dark:text-gray-500 shrink-0 mt-1">
                            {timeAgo(item.date)}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-700/30">
                  <Link href="/dashboard" className="text-xs font-medium text-blue-500 hover:text-blue-600 transition-colors" onClick={() => setActivityOpen(false)}>
                    View all activity →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <hr className="w-px h-6 bg-gray-200 dark:bg-gray-700/60 border-none" />

          {/* User menu */}
          <div className="relative inline-flex" ref={dropdown}>
            <button className="inline-flex justify-center items-center group" onClick={() => setDropdownOpen(!dropdownOpen)}>
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-gray-900 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                {user?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex items-center truncate">
                <span className="truncate ml-2 text-sm font-medium text-gray-600 dark:text-gray-100 group-hover:text-gray-800 dark:group-hover:text-white max-w-[120px]">
                  {user?.name || 'User'}
                </span>
                <svg className="w-3 h-3 shrink-0 ml-1 fill-current text-gray-400 dark:text-gray-500" viewBox="0 0 12 12">
                  <path d="M5.9 11.4L.5 6l1.4-1.4 4 4 4-4L11.3 6z" />
                </svg>
              </div>
            </button>

            {dropdownOpen && (
              <div className="origin-top-right z-10 absolute top-full min-w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 py-1.5 rounded-lg shadow-lg overflow-hidden mt-1 right-0">
                <div className="pt-0.5 pb-2 px-3 mb-1 border-b border-gray-200 dark:border-gray-700/60">
                  <div className="font-medium text-gray-800 dark:text-gray-100">{user?.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 italic">{user?.email}</div>
                </div>
                <ul>
                  <li>
                    <Link href="/profile" className="font-medium text-sm text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white flex items-center py-1 px-3" onClick={() => setDropdownOpen(false)}>
                      My Profile
                    </Link>
                  </li>
                  <li>
                    <Link href="/settings" className="font-medium text-sm text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white flex items-center py-1 px-3" onClick={() => setDropdownOpen(false)}>
                      Settings
                    </Link>
                  </li>
                  <li>
                    <button onClick={handleLogout} className="font-medium text-sm text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white flex items-center py-1 px-3 w-full">
                      Sign Out
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Mobile search (expandable) */}
      {searchOpen && (
        <div className="sm:hidden border-t border-gray-200 dark:border-gray-700/60 px-4 py-3 bg-white dark:bg-gray-800">
          <form onSubmit={handleSearch} className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search invoices…"
              autoFocus
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700/60 rounded-lg text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
          </form>
        </div>
      )}
    </header>
  )
}

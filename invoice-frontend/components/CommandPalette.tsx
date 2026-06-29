'use client'
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { clients, invoices, Client, Invoice } from '@/lib/api'

type Item = {
  id: string
  group: 'Action' | 'Page' | 'Client' | 'Invoice'
  label: string
  sub?: string
  href: string
  icon: React.ReactNode
}

const ICON = {
  plus: <svg viewBox="0 0 16 16" className="fill-current" width="15" height="15"><path d="M15 7H9V1c0-.6-.4-1-1-1S7 .4 7 1v6H1c-.6 0-1 .4-1 1s.4 1 1 1h6v6c0 .6.4 1 1 1s1-.4 1-1V9h6c.6 0 1-.4 1-1s-.4-1-1-1z" /></svg>,
  page: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="15" height="15"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" /></svg>,
  client: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="15" height="15"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  invoice: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="15" height="15"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
}

const STATIC: Item[] = [
  { id: 'a-inv', group: 'Action', label: 'New Invoice', sub: 'Create an invoice', href: '/invoices/new', icon: ICON.plus },
  { id: 'a-cli', group: 'Action', label: 'New Client', sub: 'Add a client', href: '/clients/new', icon: ICON.plus },
  { id: 'a-time', group: 'Action', label: 'New Time Entry', sub: 'Track time', href: '/time-tracking', icon: ICON.plus },
  { id: 'p-dash', group: 'Page', label: 'Dashboard', href: '/dashboard', icon: ICON.page },
  { id: 'p-inv', group: 'Page', label: 'Invoices', href: '/invoices', icon: ICON.page },
  { id: 'p-cli', group: 'Page', label: 'Clients', href: '/clients', icon: ICON.page },
  { id: 'p-time', group: 'Page', label: 'Time Tracking', href: '/time-tracking', icon: ICON.page },
  { id: 'p-year', group: 'Page', label: 'Year Summary', href: '/year-summary', icon: ICON.page },
  { id: 'p-prof', group: 'Page', label: 'Profile', href: '/profile', icon: ICON.page },
  { id: 'p-set', group: 'Page', label: 'Settings', href: '/settings', icon: ICON.page },
]

export default function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [data, setData] = useState<Item[]>([])
  const loadedRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Open on ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Lazy-load clients + invoices on first open
  useEffect(() => {
    if (!open || loadedRef.current) return
    loadedRef.current = true
    Promise.all([
      clients.list().catch(() => [] as Client[]),
      // Only the 50 most recent invoices — keeps the payload light.
      // Deep/full search is still available via the header search bar.
      invoices.listPaginated('per_page=50').then(r => r.data).catch(() => [] as Invoice[]),
    ])
      .then(([cs, invs]) => {
        const items: Item[] = [
          ...cs.map(c => ({ id: `c-${c.id}`, group: 'Client' as const, label: c.name, sub: c.email || c.company_code || 'Client', href: `/clients/view?id=${c.id}`, icon: ICON.client })),
          ...invs.map(inv => ({ id: `i-${inv.id}`, group: 'Invoice' as const, label: `${inv.series} ${inv.number}`, sub: inv.client?.name || `${Number(inv.total).toFixed(2)} €`, href: `/invoices/edit?id=${inv.id}`, icon: ICON.invoice })),
        ]
        setData(items)
      })
  }, [open])

  // Reset + focus on open/close
  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  const results = useMemo(() => {
    const pool = [...STATIC, ...data]
    const q = query.trim().toLowerCase()
    const matched = q
      ? pool.filter(it => it.label.toLowerCase().includes(q) || it.sub?.toLowerCase().includes(q))
      : pool.filter(it => it.group === 'Action' || it.group === 'Page')
    // cap per group to keep it tidy
    const caps: Record<string, number> = { Action: 6, Page: 8, Client: 6, Invoice: 6 }
    const counts: Record<string, number> = {}
    return matched.filter(it => {
      counts[it.group] = (counts[it.group] || 0) + 1
      return counts[it.group] <= caps[it.group]
    }).slice(0, 24)
  }, [query, data])

  useEffect(() => { setActive(0) }, [query])

  const go = useCallback((it?: Item) => {
    const target = it || results[active]
    if (!target) return
    setOpen(false)
    router.push(target.href)
  }, [results, active, router])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); go() }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false) }
  }

  // keep active item in view
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (!open) return null

  let idx = -1
  let lastGroup = ''

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] px-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl rounded-xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--t-bg-card)', border: '1px solid var(--t-border)', backdropFilter: 'blur(16px)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* accent top bar */}
        <div className="h-1" style={{ background: 'linear-gradient(90deg, var(--t-gradient-from), var(--t-accent))' }} />
        {/* search */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--t-border)' }}>
          <svg className="w-5 h-5 shrink-0" style={{ color: 'var(--t-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search invoices, clients, actions…"
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--t-text)' }}
          />
          <kbd className="text-[11px] px-1.5 py-0.5 rounded" style={{ color: 'var(--t-text-muted)', background: 'var(--t-bg-elevated)', border: '1px solid var(--t-border)' }}>esc</kbd>
        </div>

        {/* results */}
        <div ref={listRef} className="max-h-[52vh] overflow-y-auto py-2">
          {results.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm t-text-muted">No results for “{query}”</div>
          ) : results.map((it) => {
            idx++
            const myIdx = idx
            const showHeader = it.group !== lastGroup
            lastGroup = it.group
            const isActive = myIdx === active
            return (
              <div key={it.id}>
                {showHeader && (
                  <div className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider t-text-muted">{it.group}</div>
                )}
                <button
                  data-idx={myIdx}
                  onClick={() => go(it)}
                  onMouseEnter={() => setActive(myIdx)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                  style={{ background: isActive ? 'var(--t-bg-elevated)' : 'transparent' }}
                >
                  <span className="w-8 h-8 bd-clip-sm flex items-center justify-center shrink-0"
                    style={isActive
                      ? { background: 'linear-gradient(135deg, var(--t-gradient-from), var(--t-accent))', color: '#fff' }
                      : { background: 'var(--t-bg-elevated)', color: 'var(--t-text-muted)' }}>
                    {it.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium truncate t-text">{it.label}</span>
                    {it.sub && <span className="block text-xs truncate t-text-muted">{it.sub}</span>}
                  </span>
                  {isActive && (
                    <kbd className="text-[11px] px-1.5 py-0.5 rounded shrink-0" style={{ color: 'var(--t-accent)', background: 'var(--t-accent-soft)' }}>↵</kbd>
                  )}
                </button>
              </div>
            )
          })}
        </div>

        {/* footer hint */}
        <div className="flex items-center gap-4 px-4 py-2 text-[11px] t-text-muted" style={{ borderTop: '1px solid var(--t-border)', background: 'var(--t-bg-elevated)' }}>
          <span>↑↓ navigate</span><span>↵ open</span><span>esc close</span>
        </div>
      </div>
    </div>
  )
}

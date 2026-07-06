'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { stats, QuickStats } from '@/lib/api'
import { formatCurrency, STATS_REFRESH_EVENT } from '@/lib/utils'

// Persistent bar pinned to the bottom of the dashboard — an at-a-glance
// snapshot of earnings & outstanding that stays visible like the side menu.
// Refreshes on navigation and whenever a page fires STATS_REFRESH_EVENT
// (e.g. after an invoice status change).
export default function StatsBar() {
  const pathname = usePathname()
  const [data, setData] = useState<QuickStats | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('statsbar-collapsed')
    if (stored === 'true') setCollapsed(true)
  }, [])

  useEffect(() => {
    let active = true
    const load = () => stats.quickStats().then(d => { if (active) setData(d) }).catch(() => {})
    load()
    window.addEventListener(STATS_REFRESH_EVENT, load)
    return () => { active = false; window.removeEventListener(STATS_REFRESH_EVENT, load) }
  }, [pathname])

  const toggle = () => {
    setCollapsed(c => {
      const next = !c
      localStorage.setItem('statsbar-collapsed', String(next))
      return next
    })
  }

  if (!data) return null

  const paidRatio = data.total_invoices > 0 ? Math.round((data.paid_count / data.total_invoices) * 100) : 0

  const items = [
    { label: `Earned ${data.year}`, value: formatCurrency(data.year_revenue), color: '#10b981' },
    { label: 'Outstanding', value: formatCurrency(data.unpaid_total), sub: `${data.unpaid_count} unpaid`, color: '#fb923c' },
    { label: 'Total earned', value: formatCurrency(data.total_revenue), color: 'var(--t-accent)' },
    { label: 'Paid ratio', value: `${paidRatio}%`, sub: `${data.paid_count}/${data.total_invoices}`, color: '#a855f7' },
  ]

  return (
    <div
      className="shrink-0 z-20"
      style={{
        background: 'var(--t-bg-header)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--t-border)',
      }}
    >
      <div className="px-4 sm:px-6 lg:px-8">
        {collapsed ? (
          <div className="h-10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-4 min-w-0 overflow-x-auto no-scrollbar">
              <span className="text-xs font-semibold tabular-nums whitespace-nowrap" style={{ color: '#10b981' }}>
                {formatCurrency(data.year_revenue)} <span className="t-text-muted font-normal">earned</span>
              </span>
              <span className="text-xs font-semibold tabular-nums whitespace-nowrap" style={{ color: '#fb923c' }}>
                {formatCurrency(data.unpaid_total)} <span className="t-text-muted font-normal">due</span>
              </span>
            </div>
            <button onClick={toggle} className="shrink-0 t-text-muted hover:t-accent transition-colors p-1" title="Show stats">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
            </button>
          </div>
        ) : (
          <div className="h-16 flex items-center gap-2">
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-6 min-w-0">
              {items.map((it, i) => (
                <div key={i} className="flex items-center gap-2.5 min-w-0">
                  <span className="w-1.5 h-8 rounded-full shrink-0" style={{ background: it.color }} />
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs uppercase tracking-wider font-medium t-text-muted truncate">{it.label}</p>
                    <p className="text-sm sm:text-base font-bold tabular-nums t-text leading-tight truncate">
                      {it.value}
                      {it.sub && <span className="ml-1.5 text-[10px] font-normal t-text-muted">{it.sub}</span>}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={toggle} className="shrink-0 t-text-muted hover:t-accent transition-colors p-1" title="Collapse stats">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

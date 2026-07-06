'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { stats, QuickStats } from '@/lib/api'
import { formatCurrency, STATS_REFRESH_EVENT } from '@/lib/utils'

// Tiny inline sparkline. Optional `reference` draws a dashed horizontal line
// (e.g. the monthly goal target) so you can see which months cleared it.
function MiniSpark({ data, color, reference }: { data: number[]; color: string; reference?: number }) {
  if (!data || data.length < 2) return null
  const w = 76, h = 26
  const vals = reference != null ? [...data, reference] : data
  const max = Math.max(...vals), min = Math.min(...vals)
  const range = max - min || 1
  const yOf = (v: number) => h - ((v - min) / range) * (h - 6) - 3
  const step = w / (data.length - 1)
  const pts = data.map((v, i) => [i * step, yOf(v)] as const)
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible" aria-hidden="true">
      <path d={`${line} L${w},${h} L0,${h} Z`} fill={color} fillOpacity="0.12" />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {reference != null && (
        <line x1="0" y1={yOf(reference)} x2={w} y2={yOf(reference)} stroke="var(--t-accent)" strokeWidth="1.25" strokeDasharray="3 2" opacity="0.95" />
      )}
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2" fill={color} />
    </svg>
  )
}

// Persistent bar pinned to the bottom of the dashboard — an at-a-glance
// snapshot of earnings & outstanding that stays visible like the side menu.
// Refreshes on navigation and whenever a page fires STATS_REFRESH_EVENT
// (e.g. after an invoice status change).
export default function StatsBar() {
  const pathname = usePathname()
  const [data, setData] = useState<QuickStats | null>(null)
  const [goal, setGoal] = useState(0)

  useEffect(() => {
    let active = true
    const load = () => stats.quickStats().then(d => { if (active) setData(d) }).catch(() => {})
    load()
    // Re-read the year goal here too — it's set on the dashboard and stored
    // in localStorage, so navigating back picks up any change.
    setGoal(Number(localStorage.getItem('year-goal')) || 0)
    window.addEventListener(STATS_REFRESH_EVENT, load)
    return () => { active = false; window.removeEventListener(STATS_REFRESH_EVENT, load) }
  }, [pathname])

  if (!data) return null

  const paidRatio = data.total_invoices > 0 ? Math.round((data.paid_count / data.total_invoices) * 100) : 0

  // Year-goal projection: how much is left, and — extrapolating the current
  // daily pace across the whole year — the chance of hitting the goal.
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const endOfYear = new Date(now.getFullYear() + 1, 0, 1)
  const dayMs = 86400000
  const daysInYear = Math.round((endOfYear.getTime() - startOfYear.getTime()) / dayMs)
  const daysElapsed = Math.max(1, Math.floor((now.getTime() - startOfYear.getTime()) / dayMs) + 1)
  const daysLeft = Math.max(0, daysInYear - daysElapsed)
  const remaining = Math.max(goal - data.year_revenue, 0)
  // Project from completed months only — the current month is still in progress,
  // so its partial (and lagging-paid) total would skew the run-rate.
  const monthIdx = now.getMonth() // number of whole months already finished
  const currentMonthPaid = data.revenue_sparkline?.[data.revenue_sparkline.length - 1] ?? 0
  const completedRevenue = Math.max(0, data.year_revenue - currentMonthPaid)
  const projected = monthIdx >= 1 ? (completedRevenue / monthIdx) * 12 : data.year_revenue
  const chance = goal > 0 ? Math.round((projected / goal) * 100) : 0
  // Sparkline of completed months only — drop the current, still-in-progress
  // month so it doesn't show a misleading dip at the end.
  const earnedSpark = data.revenue_sparkline ? data.revenue_sparkline.slice(0, -1) : []
  const goalColor = remaining === 0 ? '#10b981' : chance >= 100 ? '#10b981' : chance >= 60 ? 'var(--t-accent)' : '#fb923c'

  const goalItem = goal > 0
    ? {
        label: remaining > 0 ? 'To year goal' : `Goal ${now.getFullYear()} reached`,
        value: remaining > 0 ? formatCurrency(remaining) : '✓ Done',
        sub: remaining > 0 ? `${Math.round((daysLeft / daysInYear) * 100)}% of year left` : `${formatCurrency(data.year_revenue)} earned`,
        color: goalColor,
        href: '/dashboard',
      }
    : { label: 'Year goal', value: 'Set a goal →', color: 'var(--t-text-muted)', href: '/dashboard', sub: undefined as string | undefined }

  const items = [
    { label: `Earned ${data.year}`, value: formatCurrency(data.year_revenue), color: '#10b981', href: '/year-summary' as string, sub: undefined as string | undefined },
    goalItem,
    { label: 'Outstanding', value: formatCurrency(data.unpaid_total), sub: `${data.unpaid_count} unpaid` as string | undefined, color: '#fb923c', href: '/dashboard' },
    { label: 'Paid ratio', value: `${paidRatio}%`, sub: `${data.paid_count}/${data.total_invoices}` as string | undefined, color: '#a855f7', href: '/year-summary' },
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
        <div className="h-16 flex items-center gap-2">
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-1 sm:gap-3 min-w-0">
            {items.map((it, i) => (
              <Link
                key={i}
                href={it.href}
                className="group flex items-center gap-2.5 min-w-0 rounded-lg px-2 py-1 -mx-1 transition-colors hover:bg-[var(--t-bg-elevated)]"
              >
                <span className="w-1.5 h-8 rounded-full shrink-0 transition-all group-hover:h-9" style={{ background: it.color }} />
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs uppercase tracking-wider font-medium t-text-muted truncate">{it.label}</p>
                  <p className="text-sm sm:text-base font-bold tabular-nums t-text leading-tight truncate">
                    {it.value}
                    {it.sub && <span className="ml-1.5 text-[10px] font-normal t-text-muted">{it.sub}</span>}
                  </p>
                </div>
              </Link>
            ))}
          </div>
          {earnedSpark.some(v => v > 0) && (
            <div className="hidden md:block leading-tight shrink-0 pl-3" title={goal > 0 ? 'Paid revenue per completed month · dashed line = monthly goal (goal ÷ 12)' : 'Paid revenue per completed month'}>
              <p className="text-[10px] uppercase tracking-wider font-medium t-text-muted mb-0.5">Earned / mo</p>
              <MiniSpark data={earnedSpark} color="#10b981" reference={goal > 0 ? goal / 12 : undefined} />
            </div>
          )}
          {goal > 0 && (
            <div className="hidden md:block text-right leading-tight shrink-0 pl-3" title="Projected year-end vs. your goal at the current pace">
              <p className="text-[10px] uppercase tracking-wider font-medium t-text-muted">Pace</p>
              <p className="text-sm font-bold tabular-nums" style={{ color: goalColor }}>
                {chance}%<span className="ml-1 text-[10px] font-normal" style={{ color: goalColor }}>{chance >= 100 ? 'on track' : 'on pace'}</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

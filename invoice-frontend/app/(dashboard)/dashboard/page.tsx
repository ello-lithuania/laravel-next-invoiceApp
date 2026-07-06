'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { stats, invoices, Invoice, ClientBreakdownResponse } from '@/lib/api'
import { toast } from 'react-toastify'
import { statusColors, formatCurrency, refreshStats } from '@/lib/utils'
import { Skeleton } from '@/components/Skeleton'
import { useUser } from '@/contexts/UserContext'
import dynamic from 'next/dynamic'

// Lazy-load the chart so recharts/d3 stays out of the dashboard's initial bundle.
const RevenueChart = dynamic(() => import('@/components/dashboard/RevenueChart'), {
  ssr: false,
  loading: () => <Skeleton className="h-80 rounded-xl" />,
})

function AnimatedNumber({ value, prefix = '', suffix = '', duration = 1000 }: { value: number; prefix?: string; suffix?: string; duration?: number }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const startTime = useRef<number | null>(null)
  const startValue = useRef(0)

  useEffect(() => {
    startValue.current = display
    startTime.current = null
    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp
      const progress = Math.min((timestamp - startTime.current) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(startValue.current + (value - startValue.current) * eased)
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [value, duration])

  const formatted = value >= 1 && value % 1 === 0
    ? Math.round(display).toLocaleString('lt-LT')
    : new Intl.NumberFormat('lt-LT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(display)

  return <span ref={ref}>{prefix}{formatted}{suffix}</span>
}

// Lightweight inline-SVG sparkline (no chart lib needed for a tiny trend line).
function Sparkline({ data, color, width = 96, height = 28 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (!data || data.length < 2) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const stepX = width / (data.length - 1)
  const points = data.map((v, i) => {
    const x = i * stepX
    const y = height - ((v - min) / range) * (height - 4) - 2
    return [x, y] as const
  })
  const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${width},${height} L0,${height} Z`
  const gradId = `spark-${color.replace(/[^a-z0-9]/gi, '')}`
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="2.2" fill={color} />
    </svg>
  )
}

interface ChartData {
  month?: string
  date?: string
  count: number
  total: number
}

interface StatsData {
  chart: ChartData[]
  summary: {
    total_invoices: number
    total_amount: number
  }
  period: string
}

const periods = [
  { value: '1m', label: 'This Month' },
  { value: '3m', label: '3 Months' },
  { value: '6m', label: '6 Months' },
  { value: '9m', label: '9 Months' },
  { value: '1y', label: 'This Year' },
]


function useThemeVar(varName: string, fallback: string): string {
  const [val, setVal] = useState(fallback)
  useEffect(() => {
    const update = () => {
      const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
      if (v) setVal(v)
    }
    update()
    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [varName])
  return val
}

export default function Dashboard() {
  const { user } = useUser()
  const [statsData, setStatsData] = useState<StatsData | null>(null)
  const [clientBreakdown, setClientBreakdown] = useState<ClientBreakdownResponse>({ clients: [], year: new Date().getFullYear(), year_total: 0 })
  const [unpaidInvoices, setUnpaidInvoices] = useState<Invoice[]>([])
  const [quickStatsData, setQuickStatsData] = useState<{ total_revenue: number; total_clients: number; total_invoices: number; paid_count: number; unpaid_count: number; revenue_sparkline: number[]; revenue_trend: number } | null>(null)
  const [activePeriod, setActivePeriod] = useState('1m')
  // Per-section loading so each part reveals as soon as its own request lands,
  // instead of one all-or-nothing skeleton waiting on the slowest call.
  const [quickLoading, setQuickLoading] = useState(true)
  const [unpaidLoading, setUnpaidLoading] = useState(true)
  const [breakdownLoading, setBreakdownLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [unpaidFilter, setUnpaidFilter] = useState<'all' | 'this_week' | 'this_month' | 'overdue'>('all')
  const [yearGoal, setYearGoal] = useState<number>(0)
  const [editingGoal, setEditingGoal] = useState(false)

  useEffect(() => {
    const g = localStorage.getItem('year-goal')
    if (g) setYearGoal(Number(g) || 0)
  }, [])

  const saveGoal = (v: number) => {
    setYearGoal(v)
    localStorage.setItem('year-goal', String(v))
  }

  const chartBar = useThemeVar('--t-chart-bar', '#38bdf8')
  const chartGrid = useThemeVar('--t-chart-grid', '#1e293b')
  const tooltipBg = useThemeVar('--t-tooltip-bg', '#0f172a')
  const tooltipBorder = useThemeVar('--t-tooltip-border', '#1e293b')
  const textMuted = useThemeVar('--t-text-muted', '#64748b')
  const accent = useThemeVar('--t-accent', '#38bdf8')

  useEffect(() => {
    let active = true
    // Fire independently (not Promise.all) so the fastest section paints first.
    stats.quickStats()
      .then(d => { if (active) setQuickStatsData(d) })
      .catch(e => toast.error(e.message || 'Failed to load stats'))
      .finally(() => { if (active) setQuickLoading(false) })
    invoices.unpaid()
      .then(d => { if (active) setUnpaidInvoices(d) })
      .catch(e => toast.error(e.message || 'Failed to load invoices'))
      .finally(() => { if (active) setUnpaidLoading(false) })
    stats.clientBreakdown()
      .then(d => { if (active) setClientBreakdown(d) })
      .catch(e => toast.error(e.message || 'Failed to load clients'))
      .finally(() => { if (active) setBreakdownLoading(false) })
    return () => { active = false }
  }, [])

  useEffect(() => { loadStats() }, [activePeriod])

  const loadStats = async () => {
    setStatsLoading(true)
    try {
      const data = await stats.get(activePeriod)
      setStatsData(data)
    } catch (e: any) {
      toast.error(e.message || 'Failed to load statistics')
    } finally {
      setStatsLoading(false)
    }
  }

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await invoices.updateStatus(id, status)
      // Refresh everything the status touches — not just the unpaid list, but
      // the revenue/paid-ratio cards and the year total too, so marking an
      // invoice paid updates the whole dashboard instead of leaving stale numbers.
      const [unpaidData, quick, breakdown] = await Promise.all([
        invoices.unpaid(),
        stats.quickStats().catch(() => null),
        stats.clientBreakdown().catch(() => null),
      ])
      setUnpaidInvoices(unpaidData)
      if (quick) setQuickStatsData(quick)
      if (breakdown) setClientBreakdown(breakdown)
      refreshStats() // keep the global stats bar in sync too
      toast.success(`Invoice status changed to ${status}`)
    } catch (e: any) {
      toast.error(e.message || 'Failed to update status')
    }
  }

  const formatDate = (value: string) => {
    if (value.length === 10) {
      const date = new Date(value)
      return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
    }
    const [year, m] = value.split('-')
    const date = new Date(parseInt(year), parseInt(m) - 1)
    return date.toLocaleDateString('en-US', { month: 'long' })
  }

  const getDaysOverdue = (dueDate: string) => {
    const due = new Date(dueDate)
    const today = new Date()
    return Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
  }

  const unpaidTotal = unpaidInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0)

  const filteredUnpaid = useMemo(() => {
    if (unpaidFilter === 'all') return unpaidInvoices
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    return unpaidInvoices.filter(inv => {
      const due = new Date(inv.due_date)
      if (unpaidFilter === 'this_week') {
        // Mon-Sun ISO week
        const day = (now.getDay() + 6) % 7 // 0=Mon
        const start = new Date(todayStart); start.setDate(todayStart.getDate() - day)
        const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999)
        return due >= start && due <= end
      }
      if (unpaidFilter === 'this_month') {
        return due.getFullYear() === now.getFullYear() && due.getMonth() === now.getMonth()
      }
      if (unpaidFilter === 'overdue') {
        return due < todayStart
      }
      return true
    })
  }, [unpaidInvoices, unpaidFilter])

  const filteredUnpaidTotal = filteredUnpaid.reduce((sum, inv) => sum + Number(inv.total || 0), 0)

  // Receivables aging — bucket unpaid invoices by how overdue they are
  const aging = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const b = {
      notDue: { count: 0, amount: 0, label: 'Not due yet', color: '#10b981' },
      d0_30: { count: 0, amount: 0, label: '0–30 days', color: '#f59e0b' },
      d31_60: { count: 0, amount: 0, label: '31–60 days', color: '#fb923c' },
      d60: { count: 0, amount: 0, label: '60+ days', color: '#ef4444' },
    }
    unpaidInvoices.forEach(inv => {
      const due = new Date(inv.due_date)
      const days = Math.floor((today.getTime() - due.getTime()) / 86400000)
      const amt = Number(inv.total || 0)
      const k = days < 0 ? 'notDue' : days <= 30 ? 'd0_30' : days <= 60 ? 'd31_60' : 'd60'
      b[k].count++; b[k].amount += amt
    })
    const total = b.notDue.amount + b.d0_30.amount + b.d31_60.amount + b.d60.amount
    return { ...b, total }
  }, [unpaidInvoices])

  const goalProgress = yearGoal > 0 ? Math.min((clientBreakdown.year_total / yearGoal) * 100, 100) : 0

  // Pace projection: extrapolate the current daily earning rate across the whole
  // year to see whether you're on track to hit the goal, and what monthly pace
  // the remainder needs.
  const goalNow = new Date()
  const goalStart = new Date(goalNow.getFullYear(), 0, 1)
  const goalEnd = new Date(goalNow.getFullYear() + 1, 0, 1)
  const goalDayMs = 86400000
  const daysInYear = Math.round((goalEnd.getTime() - goalStart.getTime()) / goalDayMs)
  const daysElapsed = Math.max(1, Math.floor((goalNow.getTime() - goalStart.getTime()) / goalDayMs) + 1)
  const daysLeft = Math.max(0, daysInYear - daysElapsed)
  const monthsElapsed = goalNow.getMonth() + 1
  const monthsLeft = 12 - monthsElapsed
  const projectedYear = (clientBreakdown.year_total / daysElapsed) * daysInYear
  const monthlyAvg = clientBreakdown.year_total / monthsElapsed
  const remainingToGoal = Math.max(yearGoal - clientBreakdown.year_total, 0)
  const neededPerMonth = monthsLeft > 0 ? remainingToGoal / monthsLeft : remainingToGoal
  const onTrack = projectedYear >= yearGoal
  const projectedPct = yearGoal > 0 ? Math.min((projectedYear / yearGoal) * 100, 100) : 0
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="reveal">
        <h1 className="text-2xl md:text-3xl font-bold mb-2 t-text">Dashboard</h1>
        <p className="t-text-muted" suppressHydrationWarning>Welcome back, {user?.name || ''}</p>
      </div>

      {/* Stat Cards */}
      {quickLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : quickStatsData && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger">
          {[
            { label: 'Total Revenue', value: quickStatsData.total_revenue, suffix: ' €', sub: 'From paid invoices', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: '#10b981', trend: quickStatsData.revenue_trend, spark: quickStatsData.revenue_sparkline },
            { label: 'Total Invoices', value: quickStatsData.total_invoices, sub: `${quickStatsData.paid_count} paid`, icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: accent },
            { label: 'Clients', value: quickStatsData.total_clients, sub: 'Active clients', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', color: '#a855f7' },
            { label: 'Paid Ratio', value: quickStatsData.total_invoices > 0 ? Math.round((quickStatsData.paid_count / quickStatsData.total_invoices) * 100) : 0, suffix: '%', sub: `${quickStatsData.unpaid_count} unpaid`, icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', color: '#f59e0b' },
          ].map((stat, i) => (
            <div key={i} className="t-stat-card prism-card hover-lift">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bd-clip-sm flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${stat.color}, ${stat.color}bb)` }}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                  </svg>
                </div>
                <p className="text-xs uppercase tracking-wider font-medium t-text-muted">{stat.label}</p>
                {stat.trend !== undefined && (
                  <span
                    className="ml-auto inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums px-1.5 py-0.5 rounded-md"
                    style={{
                      color: stat.trend >= 0 ? '#10b981' : '#ef4444',
                      background: stat.trend >= 0 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                    }}
                    title="vs. last month"
                  >
                    {stat.trend >= 0 ? '↑' : '↓'}{Math.abs(stat.trend)}%
                  </span>
                )}
              </div>
              <p className="text-3xl font-extrabold tracking-tight t-text">
                <AnimatedNumber value={stat.value} suffix={stat.suffix} />
              </p>
              <div className="flex items-end justify-between gap-2 mt-1">
                <p className="text-xs" style={{ color: stat.color }}>{stat.sub}</p>
                {stat.spark && <Sparkline data={stat.spark} color={stat.color} />}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Unpaid Invoices */}
      {unpaidLoading ? (
        <div className="t-card prism-card p-6">
          <Skeleton className="h-7 w-56 mb-6" />
          <div className="space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}
          </div>
        </div>
      ) : unpaidInvoices.length > 0 && (
        <div className="t-card prism-card p-6 reveal">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-xl font-semibold t-text flex items-center gap-2">
              <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Unpaid Invoices ({unpaidInvoices.length})
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(251, 146, 60, 0.12)', border: '1px solid rgba(251, 146, 60, 0.3)' }}>
                <span className="text-xs uppercase tracking-wider font-medium" style={{ color: '#fb923c' }}>{unpaidFilter === 'all' ? 'Total Outstanding' : 'Filtered Total'}</span>
                <span className="text-base font-bold" style={{ color: '#fb923c' }}>{formatCurrency(filteredUnpaidTotal)}</span>
              </div>
              <Link href="/invoices" className="t-accent text-sm hover:underline">View all →</Link>
            </div>
          </div>

          {/* Quick filter chips */}
          <div className="flex flex-wrap gap-2 mb-5">
            {(() => {
              const now = new Date()
              const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
              const day = (now.getDay() + 6) % 7
              const weekStart = new Date(todayStart); weekStart.setDate(todayStart.getDate() - day)
              const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6); weekEnd.setHours(23, 59, 59, 999)
              const counts = {
                all: unpaidInvoices.length,
                this_week: unpaidInvoices.filter(i => { const d = new Date(i.due_date); return d >= weekStart && d <= weekEnd }).length,
                this_month: unpaidInvoices.filter(i => { const d = new Date(i.due_date); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() }).length,
                overdue: unpaidInvoices.filter(i => new Date(i.due_date) < todayStart).length,
              }
              const chips: Array<{ key: typeof unpaidFilter; label: string; count: number }> = [
                { key: 'all', label: 'All', count: counts.all },
                { key: 'this_week', label: 'This Week', count: counts.this_week },
                { key: 'this_month', label: 'This Month', count: counts.this_month },
                { key: 'overdue', label: 'Overdue', count: counts.overdue },
              ]
              return chips.map(chip => {
                const active = unpaidFilter === chip.key
                const isOverdue = chip.key === 'overdue'
                return (
                  <button
                    key={chip.key}
                    onClick={() => setUnpaidFilter(chip.key)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${active ? 'btn-gradient' : ''}`}
                    style={!active ? {
                      background: isOverdue && chip.count > 0 ? 'rgba(239, 68, 68, 0.10)' : 'var(--t-bg-elevated)',
                      color: isOverdue && chip.count > 0 ? '#ef4444' : 'var(--t-text-secondary)',
                      border: '1px solid var(--t-border-light)',
                    } : {}}
                  >
                    {chip.label}
                    <span className={`tabular-nums ${active ? 'opacity-90' : 'opacity-70'}`}>· {chip.count}</span>
                  </button>
                )
              })
            })()}
          </div>

          <div className="overflow-x-auto">
            {filteredUnpaid.length === 0 ? (
              <div className="py-8 text-center t-text-muted text-sm">No invoices match this filter.</div>
            ) : (<>
            {/* Desktop table */}
            <table className="w-full hidden md:table">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--t-border)' }}>
                  {['Invoice', 'Client', 'Due Date', 'Amount', 'Status'].map((h, i) => (
                    <th key={h} className={`px-4 py-3 text-xs font-medium uppercase tracking-wider t-text-muted ${i === 3 ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUnpaid.map((inv) => {
                  const daysOverdue = getDaysOverdue(inv.due_date)
                  return (
                    <tr key={inv.id} className="transition-colors" style={{ borderBottom: '1px solid var(--t-border-light)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--t-bg-elevated)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td className="px-4 py-3">
                        <Link href={`/invoices/edit?id=${inv.id}`} className="t-text font-medium hover:underline" style={{ textDecorationColor: 'var(--t-accent)' }}>
                          {inv.series} {inv.number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm t-text-secondary">{inv.client?.name}</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm ${daysOverdue > 0 ? 'text-red-400' : ''}`} style={daysOverdue <= 0 ? { color: 'var(--t-text-muted)' } : {}}>
                          {inv.due_date?.split('T')[0]}
                          {daysOverdue > 0 && <span className="ml-1.5 text-xs opacity-75">({daysOverdue}d)</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right t-text font-medium tabular-nums">{Number(inv.total).toFixed(2)} €</td>
                      <td className="px-4 py-3">
                        <select
                          value={inv.status || 'draft'}
                          onChange={(e) => handleStatusChange(inv.id, e.target.value)}
                          className={`px-3 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${statusColors[inv.status || 'draft']}`}
                        >
                          <option value="draft">Draft</option>
                          <option value="sent">Sent</option>
                          <option value="paid">Paid</option>
                          <option value="overdue">Overdue</option>
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--t-border)' }}>
                  <td colSpan={3} className="px-4 py-3 text-sm font-semibold t-text text-right">Total Unpaid:</td>
                  <td className="px-4 py-3 text-right text-lg font-bold tabular-nums" style={{ color: '#fb923c' }}>{formatCurrency(filteredUnpaidTotal)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>

            {/* Mobile cards */}
            <div className="md:hidden divide-y" style={{ borderColor: 'var(--t-border-light)' }}>
              {filteredUnpaid.map((inv) => {
                const daysOverdue = getDaysOverdue(inv.due_date)
                return (
                  <div key={inv.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <Link href={`/invoices/edit?id=${inv.id}`} className="t-text font-medium hover:underline">{inv.series} {inv.number}</Link>
                      <span className="t-text font-semibold tabular-nums">{formatCurrency(Number(inv.total))}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="t-text-muted text-sm">{inv.client?.name}</span>
                      <span className={`text-sm ${daysOverdue > 0 ? 'text-red-400' : ''}`} style={daysOverdue <= 0 ? { color: 'var(--t-text-muted)' } : {}}>
                        {inv.due_date?.split('T')[0]}
                        {daysOverdue > 0 && <span className="ml-1 text-xs">({daysOverdue}d)</span>}
                      </span>
                    </div>
                    <select
                      value={inv.status || 'draft'}
                      onChange={(e) => handleStatusChange(inv.id, e.target.value)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${statusColors[inv.status || 'draft']}`}
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>
                )
              })}
              <div className="p-4 flex items-center justify-between" style={{ borderTop: '2px solid var(--t-border)' }}>
                <span className="text-sm font-semibold t-text">Total Unpaid:</span>
                <span className="text-lg font-bold tabular-nums" style={{ color: '#fb923c' }}>{formatCurrency(filteredUnpaidTotal)}</span>
              </div>
            </div>
            </>)}
          </div>
        </div>
      )}

      {/* Analytics: receivables aging + year goal */}
      {!unpaidLoading && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Aging */}
          <div className="t-card prism-card p-6 lg:col-span-2 reveal">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold t-text">Receivables Aging</h2>
              <span className="text-sm font-bold tabular-nums t-text">{formatCurrency(aging.total)}</span>
            </div>
            <p className="text-xs t-text-muted mb-5">Outstanding amounts by how overdue they are</p>

            {aging.total === 0 ? (
              <div className="py-8 text-center t-text-muted text-sm">🎉 Nothing outstanding — all invoices are paid.</div>
            ) : (
              <>
                {/* stacked bar */}
                <div className="flex h-3 rounded-full overflow-hidden mb-5" style={{ background: 'var(--t-bg-elevated)' }}>
                  {[aging.notDue, aging.d0_30, aging.d31_60, aging.d60].map((s, i) => (
                    s.amount > 0 ? <div key={i} style={{ width: `${(s.amount / aging.total) * 100}%`, background: s.color }} title={`${s.label}: ${formatCurrency(s.amount)}`} /> : null
                  ))}
                </div>
                {/* buckets */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[aging.notDue, aging.d0_30, aging.d31_60, aging.d60].map((s, i) => (
                    <div key={i} className="rounded-lg p-3" style={{ background: 'var(--t-bg-elevated)' }}>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                        <span className="text-xs t-text-muted truncate">{s.label}</span>
                      </div>
                      <p className="text-lg font-bold tabular-nums t-text">{formatCurrency(s.amount)}</p>
                      <p className="text-xs t-text-muted">{s.count} {s.count === 1 ? 'invoice' : 'invoices'}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Year goal */}
          <div className="t-card prism-card p-6 reveal">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold t-text">Year Goal {clientBreakdown.year}</h2>
              <button onClick={() => setEditingGoal(v => !v)} className="t-text-muted hover:t-accent transition-colors" title="Edit goal">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
            </div>
            <p className="text-xs t-text-muted mb-4">Paid income vs. your target</p>

            {editingGoal ? (
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="number" min="0" autoFocus
                  defaultValue={yearGoal || ''}
                  placeholder="e.g. 30000"
                  onKeyDown={e => { if (e.key === 'Enter') { saveGoal(Number((e.target as HTMLInputElement).value) || 0); setEditingGoal(false) } }}
                  className="flex-1 p-2 text-sm bd-clip-sm"
                  style={{ background: 'var(--t-bg-input)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
                />
                <button
                  onClick={e => { const inp = (e.currentTarget.previousElementSibling as HTMLInputElement); saveGoal(Number(inp.value) || 0); setEditingGoal(false) }}
                  className="px-3 py-2 text-sm font-semibold text-white btn-gradient bd-clip-sm"
                >Save</button>
              </div>
            ) : yearGoal > 0 ? (
              <>
                <div className="flex items-end justify-between mb-2">
                  <span className="text-2xl font-extrabold tabular-nums t-text">{formatCurrency(clientBreakdown.year_total)}</span>
                  <span className="text-sm t-text-muted">/ {formatCurrency(yearGoal)}</span>
                </div>
                <div className="w-full h-3 rounded-full overflow-hidden mb-2" style={{ background: 'var(--t-bg-elevated)' }}>
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${goalProgress}%`, background: 'linear-gradient(90deg, var(--t-gradient-from), var(--t-accent))' }} />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold t-accent">{goalProgress.toFixed(0)}% reached</span>
                  <span className="t-text-muted">{formatCurrency(Math.max(yearGoal - clientBreakdown.year_total, 0))} to go</span>
                </div>

                {/* Pace projection — are you on track to hit the goal? */}
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--t-border-light)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs t-text-muted">Projected year-end</span>
                    <span className="text-sm font-bold tabular-nums" style={{ color: onTrack ? '#10b981' : '#fb923c' }}>{formatCurrency(projectedYear)}</span>
                  </div>
                  <div className="text-xs font-semibold" style={{ color: onTrack ? '#10b981' : '#fb923c' }}>
                    {onTrack
                      ? `▲ On track — ~${formatCurrency(projectedYear - yearGoal)} over goal`
                      : `▼ Behind — need ${formatCurrency(neededPerMonth)}/mo${monthsLeft > 0 ? ` for ${monthsLeft} mo` : ''}`}
                  </div>
                  <p className="text-[11px] t-text-muted mt-1">
                    Avg {formatCurrency(monthlyAvg)}/mo · {daysLeft} days left · {projectedPct.toFixed(0)}% of goal on pace
                  </p>
                </div>
              </>
            ) : (
              <button onClick={() => setEditingGoal(true)} className="w-full py-6 rounded-lg text-sm t-text-muted transition-colors" style={{ border: '1px dashed var(--t-border)' }}>
                + Set a revenue goal for {clientBreakdown.year}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Charts + Sidebar */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Statistics */}
          <div className="t-card prism-card p-6 reveal">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h2 className="text-xl font-semibold t-text">Invoice Statistics</h2>
              <div className="flex flex-wrap gap-2">
                {periods.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setActivePeriod(p.value)}
                    className={`px-4 py-2 bd-clip-sm text-sm font-medium transition-all ${
                      activePeriod === p.value ? 'btn-gradient' : ''
                    }`}
                    style={activePeriod !== p.value ? {
                      background: 'var(--t-bg-elevated)',
                      color: 'var(--t-text-secondary)',
                    } : {}}
                    onMouseEnter={e => { if (activePeriod !== p.value) e.currentTarget.style.color = 'var(--t-text)' }}
                    onMouseLeave={e => { if (activePeriod !== p.value) e.currentTarget.style.color = 'var(--t-text-secondary)' }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div className="rounded-xl p-4" style={{ background: 'var(--t-bg-elevated)', border: '1px solid var(--t-border-light)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--t-accent-soft)' }}>
                    <svg className="w-5 h-5 t-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider t-text-muted">Total Invoices</p>
                    <p className="text-2xl font-semibold t-text">{statsData?.summary.total_invoices || 0}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl p-4" style={{ background: 'var(--t-bg-elevated)', border: '1px solid var(--t-border-light)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider t-text-muted">Total Amount</p>
                    <p className="text-2xl font-semibold t-text">{formatCurrency(statsData?.summary.total_amount || 0)}</p>
                  </div>
                </div>
              </div>
            </div>

            {statsLoading ? (
              <Skeleton className="h-80 rounded-xl" />
            ) : statsData?.chart && statsData.chart.length > 0 ? (
              <RevenueChart
                data={statsData.chart.map(d => ({ ...d, label: formatDate(d.date || d.month) }))}
                grid={chartGrid}
                text={textMuted}
                tooltipBg={tooltipBg}
                tooltipBorder={tooltipBorder}
                bar={chartBar}
              />
            ) : (
              <div className="h-80 flex items-center justify-center t-text-muted">
                <div className="text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p>No invoice data for this period</p>
                  <p className="text-sm mt-1">Create your first invoice to see statistics</p>
                </div>
              </div>
            )}
          </div>

          {/* Top 10 Clients (current year, paid only) */}
          <div className="t-card prism-card p-6 reveal">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
              <div>
                <h2 className="text-xl font-semibold t-text">Top 10 Clients ({clientBreakdown.year})</h2>
                <p className="text-xs t-text-muted mt-1">By paid income for the current year</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'var(--t-accent-soft)', border: '1px solid var(--t-border)' }}>
                <span className="text-xs uppercase tracking-wider font-medium t-text-muted">Year Total</span>
                <span className="text-base font-bold t-accent">{formatCurrency(clientBreakdown.year_total)}</span>
              </div>
            </div>
            {breakdownLoading ? (
              <div className="space-y-3">
                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 rounded-lg" />)}
              </div>
            ) : clientBreakdown.clients.length > 0 ? (
              <div className="space-y-3 stagger">
                {clientBreakdown.clients.map((c, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--t-bg-elevated)', color: 'var(--t-text-secondary)' }}>
                          {i + 1}
                        </span>
                        <span className="t-text font-medium text-sm truncate">{c.name}</span>
                        <span className="text-xs t-text-muted whitespace-nowrap">({c.count} sf)</span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="t-text font-semibold tabular-nums text-sm">{formatCurrency(c.total)}</span>
                        <span className="text-sm font-bold tabular-nums w-14 text-right" style={{ color: 'var(--t-accent)' }}>
                          {c.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden ml-9" style={{ background: 'var(--t-bg-elevated)', maxWidth: 'calc(100% - 2.25rem)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(c.percentage, 100)}%`, backgroundColor: 'var(--t-accent)' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-60 flex items-center justify-center t-text-muted">
                <div className="text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                  </svg>
                  <p>No paid invoices for {clientBreakdown.year}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="t-card prism-card p-6 reveal">
            <h2 className="text-xl font-semibold t-text mb-4">Quick Actions</h2>
            <div className="space-y-3">
              {[
                { href: '/invoices/new', label: 'New Invoice', sub: 'Create a new invoice', icon: 'M12 4v16m8-8H4', gradient: true },
                { href: '/clients/new', label: 'Add Client', sub: 'Add a new client', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', color: '#a855f7' },
                { href: '/invoices', label: 'View Invoices', sub: 'See all invoices', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: '#22c55e' },
                { href: '/profile', label: 'My Profile', sub: 'Update seller details', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', color: '#f59e0b' },
              ].map((action) => (
                <Link key={action.href} href={action.href}
                  className="flex items-center gap-3 p-3 rounded-xl transition-all"
                  style={{ background: 'transparent' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--t-bg-elevated)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div className={`w-10 h-10 bd-clip-sm flex items-center justify-center shrink-0 ${action.gradient ? 'btn-gradient' : ''}`}
                    style={!action.gradient ? { background: `linear-gradient(135deg, ${action.color}, ${action.color}bb)` } : {}}
                  >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={action.icon} />
                    </svg>
                  </div>
                  <div>
                    <p className="t-text font-medium text-sm">{action.label}</p>
                    <p className="t-text-muted text-xs">{action.sub}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Status Overview */}
          <div className="t-card prism-card p-6 reveal">
            <h2 className="text-lg font-semibold t-text mb-4">Invoice Status Overview</h2>
            {(() => {
              const statusCounts = unpaidInvoices.reduce((acc, inv) => {
                const s = inv.status || 'draft'
                acc[s] = (acc[s] || 0) + 1
                return acc
              }, {} as Record<string, number>)
              const total = unpaidInvoices.length || 1
              const statuses = [
                { key: 'draft', label: 'Draft', color: '#9ca3af', count: statusCounts['draft'] || 0 },
                { key: 'sent', label: 'Sent', color: accent, count: statusCounts['sent'] || 0 },
                { key: 'overdue', label: 'Overdue', color: '#ef4444', count: statusCounts['overdue'] || 0 },
              ]
              return (
                <div className="space-y-4">
                  {statuses.map((s) => (
                    <div key={s.key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm t-text-secondary">{s.label}</span>
                        <span className="text-sm font-medium t-text">{s.count}</span>
                      </div>
                      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--t-bg-elevated)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max((s.count / total) * 100, s.count > 0 ? 8 : 0)}%`, backgroundColor: s.color }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="pt-3 mt-3" style={{ borderTop: '1px solid var(--t-border-light)' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium t-text-secondary">Total Unpaid</span>
                      <span className="text-lg font-bold t-text">{unpaidInvoices.length}</span>
                    </div>
                    <p className="text-xs t-text-muted mt-1">
                      {formatCurrency(unpaidTotal)} outstanding
                    </p>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}

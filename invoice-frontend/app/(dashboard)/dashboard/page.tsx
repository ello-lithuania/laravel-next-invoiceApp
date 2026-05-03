'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { profile, stats, invoices, Invoice, ClientBreakdownResponse } from '@/lib/api'
import { toast } from 'react-toastify'
import { statusColors, formatCurrency } from '@/lib/utils'
import { Skeleton } from '@/components/Skeleton'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

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

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-9 w-48 mb-2" />
        <Skeleton className="h-5 w-64" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <div className="t-card rounded-xl p-6">
        <Skeleton className="h-7 w-56 mb-6" />
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}
        </div>
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2"><Skeleton className="h-96 rounded-xl" /></div>
        <div><Skeleton className="h-96 rounded-xl" /></div>
      </div>
    </div>
  )
}

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
  const [userName, setUserName] = useState('')
  const [statsData, setStatsData] = useState<StatsData | null>(null)
  const [clientBreakdown, setClientBreakdown] = useState<ClientBreakdownResponse>({ clients: [], year: new Date().getFullYear(), year_total: 0 })
  const [unpaidInvoices, setUnpaidInvoices] = useState<Invoice[]>([])
  const [quickStatsData, setQuickStatsData] = useState<{ total_revenue: number; total_clients: number; total_invoices: number; paid_count: number; unpaid_count: number } | null>(null)
  const [activePeriod, setActivePeriod] = useState('1m')
  const [loading, setLoading] = useState(true)
  const [unpaidFilter, setUnpaidFilter] = useState<'all' | 'this_week' | 'this_month' | 'overdue'>('all')

  const chartBar = useThemeVar('--t-chart-bar', '#38bdf8')
  const chartGrid = useThemeVar('--t-chart-grid', '#1e293b')
  const tooltipBg = useThemeVar('--t-tooltip-bg', '#0f172a')
  const tooltipBorder = useThemeVar('--t-tooltip-border', '#1e293b')
  const textMuted = useThemeVar('--t-text-muted', '#64748b')
  const accent = useThemeVar('--t-accent', '#38bdf8')

  useEffect(() => { loadData() }, [])
  useEffect(() => { loadStats() }, [activePeriod])

  const loadData = async () => {
    try {
      const [userData, breakdownData, unpaidData, qStats] = await Promise.all([
        profile.get(),
        stats.clientBreakdown(),
        invoices.unpaid(),
        stats.quickStats()
      ])
      setUserName(userData.name)
      setClientBreakdown(breakdownData)
      setUnpaidInvoices(unpaidData)
      setQuickStatsData(qStats)
    } catch (e: any) {
      toast.error(e.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const data = await stats.get(activePeriod)
      setStatsData(data)
    } catch (e: any) {
      toast.error(e.message || 'Failed to load statistics')
    }
  }

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await invoices.updateStatus(id, status)
      const unpaidData = await invoices.unpaid()
      setUnpaidInvoices(unpaidData)
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
  
  if (loading) return <DashboardSkeleton />

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-2 t-text">Dashboard</h1>
        <p className="t-text-muted">Welcome back, {userName}</p>
      </div>

      {/* Stat Cards */}
      {quickStatsData && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Revenue', value: quickStatsData.total_revenue, suffix: ' €', sub: 'From paid invoices', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: '#10b981' },
            { label: 'Total Invoices', value: quickStatsData.total_invoices, sub: `${quickStatsData.paid_count} paid`, icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: accent },
            { label: 'Clients', value: quickStatsData.total_clients, sub: 'Active clients', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', color: '#a855f7' },
            { label: 'Paid Ratio', value: quickStatsData.total_invoices > 0 ? Math.round((quickStatsData.paid_count / quickStatsData.total_invoices) * 100) : 0, suffix: '%', sub: `${quickStatsData.unpaid_count} unpaid`, icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', color: '#f59e0b' },
          ].map((stat, i) => (
            <div key={i} className="t-stat-card">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${stat.color}15` }}>
                  <svg className="w-5 h-5" style={{ color: stat.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                  </svg>
                </div>
                <p className="text-xs uppercase tracking-wider font-medium t-text-muted">{stat.label}</p>
              </div>
              <p className="text-2xl font-bold t-text">
                <AnimatedNumber value={stat.value} suffix={stat.suffix} />
              </p>
              <p className="text-xs mt-1" style={{ color: stat.color }}>{stat.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Unpaid Invoices */}
      {unpaidInvoices.length > 0 && (
        <div className="t-card rounded-xl p-6">
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
                      <span className="t-text font-semibold">{inv.total} EUR</span>
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

      {/* Charts + Sidebar */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Statistics */}
          <div className="t-card rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h2 className="text-xl font-semibold t-text">Invoice Statistics</h2>
              <div className="flex flex-wrap gap-2">
                {periods.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setActivePeriod(p.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
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

            {statsData?.chart && statsData.chart.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statsData.chart.map(d => ({ ...d, label: formatDate(d.date || d.month) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                    <XAxis dataKey="label" stroke={textMuted} fontSize={12} />
                    <YAxis stroke={textMuted} fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: tooltipBg,
                        border: `1px solid ${tooltipBorder}`,
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: '#fff' }}
                      formatter={(value: number) => [formatCurrency(value), 'Amount']}
                    />
                    <Bar dataKey="total" name="Amount" fill={chartBar} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
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
          <div className="t-card rounded-xl p-6">
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
            {clientBreakdown.clients.length > 0 ? (
              <div className="space-y-3">
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
          <div className="t-card rounded-xl p-6">
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
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${action.gradient ? 'btn-gradient' : ''}`}
                    style={!action.gradient ? { backgroundColor: `${action.color}18` } : {}}
                  >
                    <svg className="w-5 h-5" style={{ color: action.gradient ? '#fff' : action.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div className="t-card rounded-xl p-6">
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

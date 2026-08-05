'use client'
import { useState, useEffect, type ReactNode } from 'react'
import { stats, YearSummaryData } from '@/lib/api'
import { toast } from 'react-toastify'
import { Skeleton } from '@/components/Skeleton'
import { triggerDownload } from '@/lib/utils'
import { useRefetchOnReturn } from '@/lib/useRefetchOnReturn'

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// A primary metric card with a strong number and a readable, higher-contrast
// sub-line (the old cards used gray-400 text that washed out on the light card).
function StatCard({ label, value, valueColor, sub, icon }: {
  label: string
  value: ReactNode
  valueColor?: string
  sub?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700/60 prism-card p-5 hover-lift">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
        {icon && (
          <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--t-accent-soft)', color: 'var(--t-accent)' }}>
            {icon}
          </span>
        )}
      </div>
      <p className={`text-2xl font-bold tabular-nums ${valueColor ? '' : 'text-gray-800 dark:text-gray-100'}`} style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </p>
      {sub != null && <div className="text-sm font-medium text-gray-600 dark:text-gray-300 mt-1.5">{sub}</div>}
    </div>
  )
}

// A compact analytics card: big highlighted figure, optional progress bar and
// a muted caption. Used for the derived "Insights" row.
function InsightCard({ label, value, valueColor, caption, progress }: {
  label: string
  value: ReactNode
  valueColor?: string
  caption?: ReactNode
  progress?: number
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700/60 prism-card p-5 hover-lift">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">{label}</p>
      <p className="text-2xl font-bold tabular-nums" style={valueColor ? { color: valueColor } : undefined}>{value}</p>
      {progress != null && (
        <div className="w-full h-1.5 rounded-full overflow-hidden mt-2.5" style={{ background: 'var(--t-bg-elevated)' }}>
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(Math.max(progress, 0), 100)}%`, background: valueColor || 'var(--t-accent)' }} />
        </div>
      )}
      {caption != null && <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mt-2">{caption}</p>}
    </div>
  )
}

function YearSummarySkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-9 w-56 mb-2" />
          <Skeleton className="h-5 w-72" />
        </div>
        <Skeleton className="h-12 w-36 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  )
}

export default function YearSummary() {
  const [year, setYear] = useState<number | null>(null)
  const [data, setData] = useState<YearSummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [clientPage, setClientPage] = useState(1)

  useEffect(() => {
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch the year list and the (current-year) summary in parallel instead of
  // waterfalling list → summary. If the most recent year with data isn't the
  // current year, fall back to loading that year's summary.
  const init = async () => {
    setLoading(true)
    const current = new Date().getFullYear()
    try {
      const [years, res] = await Promise.all([
        stats.availableYears(),
        stats.yearSummary(current),
      ])
      setAvailableYears(years)
      const selected = years.length > 0 ? years[0] : current
      setYear(selected)
      if (selected === current) {
        setData(res.data)
        setLoading(false)
      } else {
        await loadData(selected)
      }
    } catch {
      setLoading(false)
    }
  }

  const loadData = async (y: number) => {
    setLoading(true)
    try {
      const res = await stats.yearSummary(y)
      setData(res.data)
    } catch (e: any) {
      toast.error('Failed to load year summary')
    }
    setLoading(false)
  }

  useRefetchOnReturn(() => { if (year) loadData(year) })

  const changeYear = (y: number) => {
    setYear(y)
    setClientPage(1)
    loadData(y)
  }

  // Open a blob in a new tab (token travels in the Authorization header, not
  // the URL). The tab is reserved synchronously so the popup blocker allows it.
  const openPdf = async (download: boolean) => {
    // Download → forced <a download> with a real name; View → open in a tab.
    const win = download ? null : window.open('', '_blank')
    try {
      const url = await stats.yearSummaryPdfBlobUrl(year!, download)
      if (download) {
        triggerDownload(url, `metine-suvestine-${year}.pdf`)
        setTimeout(() => URL.revokeObjectURL(url), 10000)
      } else if (win) {
        win.location.href = url
        setTimeout(() => URL.revokeObjectURL(url), 60000)
      } else {
        window.open(url, '_blank')
      }
    } catch (e: any) {
      if (win) win.close()
      toast.error(e.message || 'Failed to generate PDF')
    }
  }

  const handleViewPdf = () => openPdf(false)
  const handleDownloadPdf = () => openPdf(true)

  if (loading) return <YearSummarySkeleton />

  if (availableYears.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="font-medium text-gray-500 dark:text-gray-400">No invoices yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Create invoices to see the year summary</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  // For the current year, don't list months that haven't happened yet.
  const now = new Date()
  const isCurrentYear = year === now.getFullYear()
  const visibleMonths = data.months.filter(m => !isCurrentYear || m.month <= now.getMonth() + 1)
  const maxMonth = Math.max(...visibleMonths.map(m => m.total), 1)
  // Clients ranked by share of revenue, paginated — no per-client hours (the
  // point is who made up what % of the total).
  const clientsPerPage = 10
  const clientTotalPages = Math.max(1, Math.ceil(data.clients.length / clientsPerPage))
  const pagedClients = data.clients.slice((clientPage - 1) * clientsPerPage, clientPage * clientsPerPage)

  // --- Derived analytics (computed client-side from the summary data) ---
  const paidPct = data.total_revenue > 0 ? (data.paid_revenue / data.total_revenue) * 100 : 0
  const activeMonths = data.months.filter(m => m.total > 0)
  const avgActiveMonth = activeMonths.length ? data.total_revenue / activeMonths.length : 0
  const topClient = data.clients[0] || null
  const topClientPct = topClient && data.total_revenue > 0 ? (topClient.total / data.total_revenue) * 100 : 0
  const top3Pct = data.total_revenue > 0
    ? (data.clients.slice(0, 3).reduce((s, c) => s + c.total, 0) / data.total_revenue) * 100
    : 0
  // Completed months only (drop the still-in-progress current month for this year).
  const completedMonths = data.months.filter(m => !isCurrentYear || m.month < now.getMonth() + 1)
  const completedRevenue = completedMonths.reduce((s, m) => s + m.total, 0)
  // Momentum: last 3 completed months vs the 3 before them.
  const last3 = completedMonths.slice(-3).reduce((s, m) => s + m.total, 0)
  const prev3 = completedMonths.slice(-6, -3).reduce((s, m) => s + m.total, 0)
  const momentum = completedMonths.length >= 6 && prev3 > 0 ? ((last3 - prev3) / prev3) * 100 : null
  // Projected year-end at the current run-rate (current year only).
  const projectedYear = isCurrentYear && completedMonths.length > 0
    ? (completedRevenue / completedMonths.length) * 12
    : null
  const collectionColor = paidPct >= 80 ? '#16a34a' : paidPct >= 50 ? 'var(--t-accent)' : '#d97706'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">Year Summary</h1>
          <p className="text-gray-500 dark:text-gray-400">Revenue, clients and time analysis</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={year ?? ''}
            onChange={e => changeYear(Number(e.target.value))}
            className="px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 font-medium"
          >
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={handleViewPdf}
            className="btn-gradient px-5 py-3 rounded-xl font-medium transition-colors flex items-center gap-2 bd-clip-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            PDF
          </button>
          <button
            onClick={handleDownloadPdf}
            className="px-5 py-3 rounded-xl font-medium transition-colors flex items-center gap-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </button>
        </div>
      </div>

      {/* Primary metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Revenue"
          value={`${fmt(data.total_revenue)} €`}
          valueColor="var(--t-accent)"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" /></svg>}
          sub={
            <div className="flex gap-3">
              <span className="text-green-600 dark:text-green-400">✓ {fmt(data.paid_revenue)} €</span>
              <span className="text-amber-600 dark:text-amber-400">○ {fmt(data.unpaid_revenue)} €</span>
            </div>
          }
        />
        <StatCard
          label="Invoices"
          value={data.total_invoices}
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
          sub={`Avg. ${fmt(data.avg_invoice)} € / invoice`}
        />
        <StatCard
          label="Clients"
          value={data.total_clients}
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z" /></svg>}
          sub={`Avg. ${fmt(data.avg_monthly)} € / month`}
        />
        <StatCard
          label="Billed Hours"
          value={data.total_hours > 0 ? `${data.total_hours.toFixed(1)} h` : '—'}
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          sub={data.avg_hourly_rate > 0 ? `Avg. ${fmt(data.avg_hourly_rate)} € / h` : 'No hourly items'}
        />
      </div>

      {/* Insights — derived analytics */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">Insights</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <InsightCard
            label="Collection Rate"
            value={`${paidPct.toFixed(0)}%`}
            valueColor={collectionColor}
            progress={paidPct}
            caption={`${fmt(data.unpaid_revenue)} € still outstanding`}
          />
          <InsightCard
            label="Top Client Share"
            value={topClient ? `${topClientPct.toFixed(0)}%` : '—'}
            caption={topClient ? <span className="truncate block">{topClient.name} · top 3 = {top3Pct.toFixed(0)}%</span> : 'No clients yet'}
          />
          <InsightCard
            label="Momentum"
            value={momentum != null ? `${momentum >= 0 ? '+' : ''}${momentum.toFixed(0)}%` : '—'}
            valueColor={momentum != null ? (momentum >= 0 ? '#16a34a' : '#dc2626') : undefined}
            caption={momentum != null ? 'Last 3 months vs previous 3' : 'Needs 6+ months of data'}
          />
          {projectedYear != null ? (
            <InsightCard
              label="Projected Year-End"
              value={`${fmt(projectedYear)} €`}
              valueColor="var(--t-accent)"
              caption="At the current pace"
            />
          ) : (
            <InsightCard
              label="Avg / Active Month"
              value={`${fmt(avgActiveMonth)} €`}
              caption={`${activeMonths.length} active month${activeMonths.length === 1 ? '' : 's'}`}
            />
          )}
        </div>
      </div>

      {/* Best / worst month */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label="Best Month"
          value={data.best_month ? monthNames[data.best_month.month - 1] : '—'}
          valueColor={data.best_month ? '#16a34a' : undefined}
          sub={data.best_month ? `${fmt(data.best_month.total)} € · ${data.best_month.invoice_count} inv.` : undefined}
        />
        <StatCard
          label="Worst Month"
          value={data.worst_month ? monthNames[data.worst_month.month - 1] : '—'}
          valueColor={data.worst_month ? '#d97706' : undefined}
          sub={data.worst_month ? `${fmt(data.worst_month.total)} € · ${data.worst_month.invoice_count} inv.` : undefined}
        />
      </div>

      {/* Monthly chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700/60 prism-card p-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Monthly Breakdown</h2>
        <div className="space-y-1">
          {visibleMonths.map(m => (
            <div key={m.month} className="flex items-center gap-3 rounded-lg px-2 -mx-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
              <span className={`w-20 text-sm font-medium shrink-0 ${m.is_best ? 'text-green-600 dark:text-green-400' : m.is_worst ? 'text-amber-600 dark:text-amber-400' : 'text-gray-600 dark:text-gray-400'}`}>
                {monthNames[m.month - 1].slice(0, 3)}
                {m.is_best && ' ★'}
                {m.is_worst && ' ▽'}
              </span>
              <div className="flex-1 h-7 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden relative">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.max((m.total / maxMonth) * 100, 0)}%`,
                    background: m.is_best
                      ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                      : m.is_worst
                        ? 'linear-gradient(90deg, #eab308, #ca8a04)'
                        : 'linear-gradient(90deg, var(--t-gradient-from), var(--t-gradient-to))',
                    minWidth: m.total > 0 ? '4px' : '0',
                  }}
                />
                {m.total > 0 && (
                  <span className="absolute inset-y-0 flex items-center text-xs font-medium px-3"
                    style={{ color: (m.total / maxMonth) > 0.3 ? '#fff' : 'var(--t-text-secondary)' }}>
                    {fmt(m.total)} €
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500 w-12 text-right shrink-0">
                {m.invoice_count > 0 ? `${m.invoice_count} inv.` : ''}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Client breakdown — ranked by share of revenue, paginated */}
      {data.clients.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700/60 prism-card p-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Clients</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Share of {fmt(data.total_revenue)} € total</p>
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500">{data.clients.length} client{data.clients.length === 1 ? '' : 's'}</span>
          </div>

          <div className="space-y-3">
            {pagedClients.map((c, i) => {
              const rank = (clientPage - 1) * clientsPerPage + i + 1
              const pct = data.total_revenue > 0 ? (c.total / data.total_revenue) * 100 : 0
              return (
                <div key={rank} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--t-bg-elevated)', color: 'var(--t-text-secondary)' }}>{rank}</span>
                      <span className="font-medium text-sm truncate text-gray-800 dark:text-gray-100">{c.name}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">({c.invoice_count} inv.)</span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="font-semibold tabular-nums text-sm text-gray-800 dark:text-gray-100">{fmt(c.total)} €</span>
                      <span className="text-sm font-bold tabular-nums w-14 text-right" style={{ color: 'var(--t-accent)' }}>{pct.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden ml-9" style={{ background: 'var(--t-bg-elevated)', maxWidth: 'calc(100% - 2.25rem)' }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: 'var(--t-accent)' }} />
                  </div>
                </div>
              )
            })}
          </div>

          {clientTotalPages > 1 && (
            <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100 dark:border-gray-700/60">
              <span className="text-xs text-gray-400 dark:text-gray-500">Page {clientPage} of {clientTotalPages}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setClientPage(p => Math.max(1, p - 1))}
                  disabled={clientPage === 1}
                  className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Prev
                </button>
                <button
                  onClick={() => setClientPage(p => Math.min(clientTotalPages, p + 1))}
                  disabled={clientPage === clientTotalPages}
                  className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Largest invoice */}
      {data.largest_invoice && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700/60 prism-card p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">Highlights</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--t-accent-soft)' }}>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Largest Invoice</p>
              <p className="font-bold text-gray-800 dark:text-gray-100">{fmt(data.largest_invoice.total)} €</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {data.largest_invoice.series} {data.largest_invoice.number} · {data.largest_invoice.client}
              </p>
            </div>
            {data.total_hours > 0 && (
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--t-accent-soft)' }}>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">From Time Tracking</p>
                <p className="font-bold text-gray-800 dark:text-gray-100">{fmt(data.time_tracking_revenue)} €</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {data.total_hours.toFixed(1)} h · avg. {fmt(data.avg_hourly_rate)} €/h
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {data.total_invoices === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700/60 prism-card p-12 text-center">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="font-medium text-gray-500 dark:text-gray-400">No data for {year}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Create invoices to see the summary</p>
        </div>
      )}
    </div>
  )
}

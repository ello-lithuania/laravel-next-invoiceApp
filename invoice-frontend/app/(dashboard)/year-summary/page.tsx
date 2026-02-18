'use client'
import { useState, useEffect } from 'react'
import { stats, YearSummaryData } from '@/lib/api'
import { toast } from 'react-toastify'
import { Skeleton } from '@/components/Skeleton'

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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

  useEffect(() => {
    loadYears()
  }, [])

  useEffect(() => {
    if (year) loadData()
  }, [year])

  const loadYears = async () => {
    try {
      const years = await stats.availableYears()
      setAvailableYears(years)
      if (years.length > 0) {
        setYear(years[0])
      } else {
        setLoading(false)
      }
    } catch {
      setLoading(false)
    }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await stats.yearSummary(year!)
      setData(res.data)
    } catch (e: any) {
      toast.error('Failed to load year summary')
    }
    setLoading(false)
  }

  const handleViewPdf = () => {
    window.open(stats.yearSummaryPdfUrl(year!), '_blank')
  }

  const handleDownloadPdf = () => {
    window.open(stats.yearSummaryPdfUrl(year!, true), '_blank')
  }

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

  const maxMonth = Math.max(...data.months.map(m => m.total), 1)

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
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 font-medium"
          >
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={handleViewPdf}
            className="btn-gradient px-5 py-3 rounded-xl font-medium transition-colors flex items-center gap-2"
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

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700/60 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Revenue</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--t-accent)' }}>{fmt(data.total_revenue)} €</p>
          <div className="flex gap-3 mt-2 text-xs">
            <span className="text-green-500">✓ {fmt(data.paid_revenue)} €</span>
            <span className="text-yellow-500">○ {fmt(data.unpaid_revenue)} €</span>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700/60 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Invoices</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{data.total_invoices}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Avg. {fmt(data.avg_invoice)} €</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700/60 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Clients</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{data.total_clients}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Avg. {fmt(data.avg_monthly)} €/mo</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700/60 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Hours</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{data.total_hours > 0 ? `${data.total_hours.toFixed(1)} h` : '—'}</p>
          {data.avg_hourly_rate > 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Avg. {fmt(data.avg_hourly_rate)} €/h</p>
          )}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700/60 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Best Month</p>
          {data.best_month ? (
            <>
              <p className="text-lg font-bold text-green-500">{monthNames[data.best_month.month - 1]}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{fmt(data.best_month.total)} € · {data.best_month.invoice_count} inv.</p>
            </>
          ) : <p className="text-lg text-gray-400">—</p>}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700/60 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Worst Month</p>
          {data.worst_month ? (
            <>
              <p className="text-lg font-bold text-yellow-500">{monthNames[data.worst_month.month - 1]}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{fmt(data.worst_month.total)} € · {data.worst_month.invoice_count} inv.</p>
            </>
          ) : <p className="text-lg text-gray-400">—</p>}
        </div>
      </div>

      {/* Monthly chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700/60 p-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Monthly Breakdown</h2>
        <div className="space-y-3">
          {data.months.map(m => (
            <div key={m.month} className="flex items-center gap-3">
              <span className={`w-20 text-sm font-medium shrink-0 ${m.is_best ? 'text-green-500' : m.is_worst ? 'text-yellow-500' : 'text-gray-600 dark:text-gray-400'}`}>
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

      {/* Client breakdown */}
      {data.clients.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700/60 overflow-hidden">
          <div className="p-6 pb-3">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Clients</h2>
          </div>
          {/* Desktop */}
          <div className="hidden md:block">
            <table className="w-full">
              <thead className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left">Client</th>
                  <th className="px-6 py-3 text-right">Invoices</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                  <th className="px-6 py-3 text-right">Hours</th>
                  <th className="px-6 py-3 text-right">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {data.clients.map((c, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-6 py-3 font-medium text-gray-800 dark:text-gray-100">{c.name}</td>
                    <td className="px-6 py-3 text-right text-gray-500 dark:text-gray-400">{c.invoice_count}</td>
                    <td className="px-6 py-3 text-right font-medium text-gray-800 dark:text-gray-100">{fmt(c.total)} €</td>
                    <td className="px-6 py-3 text-right text-gray-500 dark:text-gray-400">
                      {c.hours > 0 ? `${c.hours.toFixed(1)} h` : '—'}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: 'var(--t-accent-soft)', color: 'var(--t-accent)' }}>
                        {data.total_revenue > 0 ? ((c.total / data.total_revenue) * 100).toFixed(1) : 0}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile */}
          <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700/60">
            {data.clients.map((c, i) => (
              <div key={i} className="p-4 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-800 dark:text-gray-100">{c.name}</span>
                  <span className="font-bold" style={{ color: 'var(--t-accent)' }}>{fmt(c.total)} €</span>
                </div>
                <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span>{c.invoice_count} inv.</span>
                  {c.hours > 0 && <span>{c.hours.toFixed(1)} h</span>}
                  <span>{data.total_revenue > 0 ? ((c.total / data.total_revenue) * 100).toFixed(1) : 0}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Largest invoice */}
      {data.largest_invoice && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700/60 p-6">
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
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700/60 p-12 text-center">
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

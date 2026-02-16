'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { profile, stats, invoices, Invoice } from '@/lib/api'
import { toast } from 'react-toastify'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

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

interface UnpaidInvoice extends Invoice {
  status?: string
}

const periods = [
  { value: '1m', label: 'This Month' },
  { value: '3m', label: '3 Months' },
  { value: '6m', label: '6 Months' },
  { value: '9m', label: '9 Months' },
  { value: '1y', label: 'This Year' },
]

const statusColors: Record<string, string> = {
  draft: 'bg-gray-500/20 text-gray-600 dark:text-gray-300',
  sent: 'bg-blue-500/15 text-blue-500',
  paid: 'bg-emerald-500/15 text-green-400',
  overdue: 'bg-red-500/20 text-red-400',
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700/50 rounded ${className}`} />
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-9 w-48 mb-2" />
        <Skeleton className="h-5 w-64" />
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700/60 p-6">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-5 w-20" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="grid grid-cols-5 gap-4">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700/60 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <Skeleton className="h-7 w-40" />
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-10 w-24" />
                ))}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
            <Skeleton className="h-80 rounded-xl" />
          </div>

          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700/60 p-6">
            <Skeleton className="h-7 w-52 mb-6" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700/60 p-6">
            <Skeleton className="h-7 w-32 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700/60 p-6">
            <Skeleton className="h-7 w-36 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [userName, setUserName] = useState('')
  const [statsData, setStatsData] = useState<StatsData | null>(null)
  const [clientBreakdown, setClientBreakdown] = useState<{ name: string; total: number; count: number }[]>([])
  const [unpaidInvoices, setUnpaidInvoices] = useState<UnpaidInvoice[]>([])
  const [quickStatsData, setQuickStatsData] = useState<{ total_revenue: number; total_clients: number; total_invoices: number; paid_count: number; unpaid_count: number } | null>(null)
  const [activePeriod, setActivePeriod] = useState('1m')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    loadStats()
  }, [activePeriod])

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
    } catch (e) {}
    setLoading(false)
  }

  const loadStats = async () => {
    try {
      const data = await stats.get(activePeriod)
      setStatsData(data)
    } catch (e) {}
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' }).format(value)
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
    const diff = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }
  
  if (loading) return <DashboardSkeleton />

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400">Welcome back, {userName}</p>
      </div>

      {quickStatsData && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700/60 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium">Total Revenue</p>
            </div>
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              <AnimatedNumber value={quickStatsData.total_revenue} suffix=" €" />
            </p>
            <p className="text-xs text-emerald-500 mt-1">From paid invoices</p>
          </div>
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700/60 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium">Total Invoices</p>
            </div>
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              <AnimatedNumber value={quickStatsData.total_invoices} />
            </p>
            <p className="text-xs text-blue-500 mt-1">{quickStatsData.paid_count} paid</p>
          </div>
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700/60 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium">Clients</p>
            </div>
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              <AnimatedNumber value={quickStatsData.total_clients} />
            </p>
            <p className="text-xs text-purple-500 mt-1">Active clients</p>
          </div>
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700/60 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium">Paid Ratio</p>
            </div>
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              <AnimatedNumber value={quickStatsData.total_invoices > 0 ? Math.round((quickStatsData.paid_count / quickStatsData.total_invoices) * 100) : 0} suffix="%" />
            </p>
            <p className="text-xs text-amber-500 mt-1">{quickStatsData.unpaid_count} unpaid</p>
          </div>
        </div>
      )}

      {unpaidInvoices.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700/60 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Unpaid Invoices ({unpaidInvoices.length})
            </h2>
            <Link href="/invoices" className="text-blue-500 hover:text-blue-400 text-sm">
              View all →
            </Link>
          </div>
          <div className="overflow-x-auto">
            {/* Desktop table */}
            <table className="w-full hidden md:table">
              <thead className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50">
                <tr className="border-b border-gray-100 dark:border-gray-700/60">
                  <th className="px-4 py-3 text-left text-gray-400 dark:text-gray-500 text-xs font-medium uppercase tracking-wider">Invoice</th>
                  <th className="px-4 py-3 text-left text-gray-400 dark:text-gray-500 text-xs font-medium uppercase tracking-wider">Client</th>
                  <th className="px-4 py-3 text-left text-gray-400 dark:text-gray-500 text-xs font-medium uppercase tracking-wider">Due Date</th>
                  <th className="px-4 py-3 text-right text-gray-400 dark:text-gray-500 text-xs font-medium uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-gray-400 dark:text-gray-500 text-xs font-medium uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {unpaidInvoices.map((inv) => {
                  const daysOverdue = getDaysOverdue(inv.due_date)
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50 dark:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/invoices/edit?id=${inv.id}`} className="text-gray-800 dark:text-gray-100 font-medium hover:text-blue-500 transition-colors">
                          {inv.series} {inv.number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-sm">{inv.client?.name}</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm ${daysOverdue > 0 ? 'text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                          {inv.due_date?.split('T')[0]}
                          {daysOverdue > 0 && (
                            <span className="ml-1.5 text-xs opacity-75">({daysOverdue}d)</span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-800 dark:text-gray-100 font-medium tabular-nums">{Number(inv.total).toFixed(2)} €</td>
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
            </table>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700/60">
              {unpaidInvoices.map((inv) => {
                const daysOverdue = getDaysOverdue(inv.due_date)
                return (
                  <div key={inv.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <Link href={`/invoices/edit?id=${inv.id}`} className="text-gray-800 dark:text-gray-100 font-medium hover:text-blue-500">
                        {inv.series} {inv.number}
                      </Link>
                      <span className="text-gray-800 dark:text-gray-100 font-semibold">{inv.total} EUR</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 dark:text-gray-400 text-sm">{inv.client?.name}</span>
                      <span className={`text-sm ${daysOverdue > 0 ? 'text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
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
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700/60 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Invoice Statistics</h2>
              <div className="flex flex-wrap gap-2">
                {periods.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setActivePeriod(p.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activePeriod === p.value
                        ? 'bg-gradient-to-r from-blue-600 via-blue-700 to-gray-900 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700/60 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-gray-400 dark:text-gray-500 text-xs uppercase tracking-wider">Total Invoices</p>
                    <p className="text-2xl font-semibold text-gray-800 dark:text-gray-100">{statsData?.summary.total_invoices || 0}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700/60 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-gray-400 dark:text-gray-500 text-xs uppercase tracking-wider">Total Amount</p>
                    <p className="text-2xl font-semibold text-gray-800 dark:text-gray-100">{formatCurrency(statsData?.summary.total_amount || 0)}</p>
                  </div>
                </div>
              </div>
            </div>

            {statsData?.chart && statsData.chart.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statsData.chart.map(d => ({ ...d, label: formatDate(d.date || d.month) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: '#fff' }}
                      formatter={(value: number) => [formatCurrency(value), 'Amount']}
                    />
                    <Bar dataKey="total" name="Amount" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-400 dark:text-gray-500">
                <div className="text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p>No invoice data for this period</p>
                  <p className="text-sm mt-1">Create your first invoice to see statistics</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700/60 p-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6">Revenue by Client (Top 5)</h2>
            {clientBreakdown.length > 0 ? (
              <div className="flex items-center justify-center py-4">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={clientBreakdown.map(c => ({ ...c, total: Number(c.total) }))}
                      dataKey="total"
                      nameKey="name"
                      cx="50%"
                      cy={130}
                      outerRadius={100}
                    >
                    {clientBreakdown.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={['#3b82f6', '#22d3ee', '#a855f7', '#22c55e', '#f97316'][index % 5]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                    itemStyle={{ color: '#fff' }}
                    labelStyle={{ color: '#fff' }}
                    formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                  />
                  <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-400 dark:text-gray-500">
                <div className="text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                  </svg>
                  <p>No client data yet</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700/60 p-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link href="/invoices/new" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:bg-gray-700/50 transition-colors">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-gray-900 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-800 dark:text-gray-100 font-medium text-sm">New Invoice</p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs">Create a new invoice</p>
                </div>
              </Link>
              <Link href="/clients/new" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:bg-gray-700/50 transition-colors">
                <div className="w-10 h-10 bg-purple-500/15 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-800 dark:text-gray-100 font-medium">Add Client</p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Add a new client</p>
                </div>
              </Link>
              <Link href="/invoices" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:bg-gray-700/50 transition-colors">
                <div className="w-10 h-10 bg-emerald-500/15 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-800 dark:text-gray-100 font-medium">View Invoices</p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">See all invoices</p>
                </div>
              </Link>
              <Link href="/profile" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:bg-gray-700/50 transition-colors">
                <div className="w-10 h-10 bg-amber-500/15 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-800 dark:text-gray-100 font-medium">My Profile</p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Update seller details</p>
                </div>
              </Link>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700/60 p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Invoice Status Overview</h2>
            {(() => {
              const statusCounts = unpaidInvoices.reduce((acc, inv) => {
                const s = inv.status || 'draft'
                acc[s] = (acc[s] || 0) + 1
                return acc
              }, {} as Record<string, number>)
              const total = unpaidInvoices.length || 1
              const statuses = [
                { key: 'draft', label: 'Draft', color: 'bg-gray-400', count: statusCounts['draft'] || 0 },
                { key: 'sent', label: 'Sent', color: 'bg-blue-500', count: statusCounts['sent'] || 0 },
                { key: 'overdue', label: 'Overdue', color: 'bg-red-500', count: statusCounts['overdue'] || 0 },
              ]
              return (
                <div className="space-y-4">
                  {statuses.map((s) => (
                    <div key={s.key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm text-gray-600 dark:text-gray-300">{s.label}</span>
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{s.count}</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${s.color} rounded-full transition-all duration-500`}
                          style={{ width: `${Math.max((s.count / total) * 100, s.count > 0 ? 8 : 0)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="pt-3 mt-3 border-t border-gray-100 dark:border-gray-700/60">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Unpaid</span>
                      <span className="text-lg font-bold text-gray-800 dark:text-gray-100">{unpaidInvoices.length}</span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {formatCurrency(unpaidInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0))} outstanding
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
'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { invoices, clients as clientsApi, getToken } from '@/lib/api'

interface Client {
  id: number
  name: string
}

interface Invoice {
  id: number
  series: string
  number: number
  client_id: number
  client?: Client
  invoice_date: string
  due_date: string
  total: number
  status?: string
}

interface PaginatedResponse {
  data: Invoice[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
]

const statusColors: Record<string, string> = {
  draft: 'bg-slate-500/20 text-slate-300',
  sent: 'bg-blue-500/20 text-blue-400',
  paid: 'bg-green-500/20 text-green-400',
  overdue: 'bg-red-500/20 text-red-400',
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-700/50 rounded ${className}`} />
}

function InvoicesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-9 w-36 mb-2" />
          <Skeleton className="h-5 w-56" />
        </div>
        <Skeleton className="h-12 w-40 rounded-xl" />
      </div>

      <div className="flex flex-wrap gap-4">
        <Skeleton className="h-12 flex-1 min-w-[200px] rounded-xl" />
        <Skeleton className="h-12 flex-1 min-w-[200px] rounded-xl" />
        <Skeleton className="h-12 flex-1 min-w-[200px] rounded-xl" />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="px-6 py-4 text-left"><Skeleton className="h-4 w-20" /></th>
              <th className="px-6 py-4 text-left"><Skeleton className="h-4 w-16" /></th>
              <th className="px-6 py-4 text-left"><Skeleton className="h-4 w-14" /></th>
              <th className="px-6 py-4 text-left"><Skeleton className="h-4 w-14" /></th>
              <th className="px-6 py-4 text-left"><Skeleton className="h-4 w-16" /></th>
              <th className="px-6 py-4 text-left"><Skeleton className="h-4 w-20" /></th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i} className="border-b border-slate-800">
                <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
                <td className="px-6 py-4"><Skeleton className="h-5 w-32" /></td>
                <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
                <td className="px-6 py-4"><Skeleton className="h-5 w-20" /></td>
                <td className="px-6 py-4"><Skeleton className="h-7 w-20 rounded-lg" /></td>
                <td className="px-6 py-4"><Skeleton className="h-5 w-28" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function Invoices() {
  const [list, setList] = useState<Invoice[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [monthOptions, setMonthOptions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [filterMonth, setFilterMonth] = useState('')
  const [filterClient, setFilterClient] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [sortBy, setSortBy] = useState('invoice_date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    loadClients()
    loadMonths()
  }, [])

  useEffect(() => {
    loadInvoices()
  }, [page, filterMonth, filterClient, filterStatus, sortBy, sortDir])

  const loadClients = async () => {
    try {
      const data = await clientsApi.list()
      setClients(data)
    } catch (e) {}
  }

  const loadMonths = async () => {
    try {
      const data = await invoices.months()
      setMonthOptions(data)
    } catch (e) {}
  }

  const loadInvoices = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('per_page', '10')
      params.set('sort_by', sortBy)
      params.set('sort_dir', sortDir)
      if (filterMonth) params.set('month', filterMonth)
      if (filterClient) params.set('client_id', filterClient)
      if (filterStatus) params.set('status', filterStatus)
      
      const data = await invoices.listPaginated(params.toString())
      setList(data.data)
      setLastPage(data.last_page)
      setTotal(data.total)
    } catch (e) {}
    setLoading(false)
  }

  const handleDelete = async (id: number) => {
    if (confirm('Delete this invoice?')) {
      await invoices.delete(id)
      loadInvoices()
      loadMonths()
    }
  }

  const handleStatusChange = async (id: number, status: string) => {
    await invoices.updateStatus(id, status)
    loadInvoices()
  }

  const downloadPdf = (id: number) => {
    const token = getToken()
    window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/invoices/${id}/pdf?token=${token}`, '_blank')
  }

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortDir('desc')
    }
    setPage(1)
  }

  const handleFilterChange = () => {
    setPage(1)
  }

  const getMonthOptions = () => {
    return monthOptions.map(m => {
      const [year, month] = m.split('-')
      const date = new Date(parseInt(year), parseInt(month) - 1, 1)
      const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
      return { value: m, label }
    })
  }

  const SortIcon = ({ column }: { column: string }) => (
    <span className="ml-1 inline-block">
      {sortBy === column ? (
        sortDir === 'asc' ? (
          <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )
      ) : (
        <svg className="w-4 h-4 inline opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )}
    </span>
  )

  if (loading && list.length === 0) return <InvoicesSkeleton />

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Invoices</h1>
          <p className="text-slate-400">Create and manage your invoices</p>
        </div>
        <Link
          href="/invoices/new"
          className="px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-400 text-white hover:opacity-90"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Invoice
        </Link>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <select
            value={filterMonth}
            onChange={(e) => { setFilterMonth(e.target.value); handleFilterChange() }}
            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors"
          >
            <option value="">All months</option>
            {getMonthOptions().map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <select
            value={filterClient}
            onChange={(e) => { setFilterClient(e.target.value); handleFilterChange() }}
            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors"
          >
            <option value="">All clients</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); handleFilterChange() }}
            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors"
          >
            {statusOptions.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        {(filterMonth || filterClient || filterStatus) && (
          <button
            onClick={() => { setFilterMonth(''); setFilterClient(''); setFilterStatus(''); handleFilterChange() }}
            className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              <th 
                className="px-6 py-4 text-left text-slate-400 text-sm font-medium cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('number')}
              >
                Number <SortIcon column="number" />
              </th>
              <th 
                className="px-6 py-4 text-left text-slate-400 text-sm font-medium cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('client_name')}
              >
                Client <SortIcon column="client_name" />
              </th>
              <th 
                className="px-6 py-4 text-left text-slate-400 text-sm font-medium cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('invoice_date')}
              >
                Date <SortIcon column="invoice_date" />
              </th>
              <th 
                className="px-6 py-4 text-left text-slate-400 text-sm font-medium cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('total')}
              >
                Total <SortIcon column="total" />
              </th>
              <th className="px-6 py-4 text-left text-slate-400 text-sm font-medium">Status</th>
              <th className="px-6 py-4 text-left text-slate-400 text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="text-slate-500">
                    <svg className="w-12 h-12 mx-auto mb-3 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p>No invoices found</p>
                    {(filterMonth || filterClient || filterStatus) && (
                      <p className="text-sm mt-1">Try changing the filters</p>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              list.map((inv) => (
                <tr key={inv.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 text-white font-medium">{inv.series} {inv.number}</td>
                  <td className="px-6 py-4 text-slate-300">{inv.client?.name}</td>
                  <td className="px-6 py-4 text-slate-300">{inv.invoice_date?.split('T')[0]}</td>
                  <td className="px-6 py-4 text-white font-medium">{inv.total} EUR</td>
                  <td className="px-6 py-4">
                    <select
                      value={inv.status || 'draft'}
                      onChange={(e) => handleStatusChange(inv.id, e.target.value)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium border-0 cursor-pointer ${statusColors[inv.status || 'draft']}`}
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => downloadPdf(inv.id)} 
                      className="text-green-400 hover:text-green-300 mr-4 transition-colors"
                    >
                      PDF
                    </button>
                    <Link 
                      href={`/invoices/edit?id=${inv.id}`}
                      className="text-blue-400 hover:text-blue-300 mr-4 transition-colors"
                    >
                      Edit
                    </Link>
                    <button 
                      onClick={() => handleDelete(inv.id)} 
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {lastPage > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800">
            <div className="text-slate-400 text-sm">
              Showing {list.length} of {total} invoices
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, lastPage) }, (_, i) => {
                  let pageNum
                  if (lastPage <= 5) {
                    pageNum = i + 1
                  } else if (page <= 3) {
                    pageNum = i + 1
                  } else if (page >= lastPage - 2) {
                    pageNum = lastPage - 4 + i
                  } else {
                    pageNum = page - 2 + i
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                        page === pageNum
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>

              <button
                onClick={() => setPage(p => Math.min(lastPage, p + 1))}
                disabled={page === lastPage}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
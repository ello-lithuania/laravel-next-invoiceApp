'use client'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { invoices, clients as clientsApi, Invoice as InvoiceType, Client as ClientType } from '@/lib/api'
import { toast } from 'react-toastify'
import { statusColors, refreshStats, formatCurrency, formatDate } from '@/lib/utils'
import { Skeleton } from '@/components/Skeleton'
import ConfirmModal from '@/components/ConfirmModal'
import SearchableSelect from '@/components/SearchableSelect'

interface PaginatedResponse {
  data: InvoiceType[]
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
  { value: 'overdue', label: "Won't pay" },
]

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

      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700/60 prism-card overflow-hidden">
        <table className="w-full">
          <thead className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50">
            <tr className="border-b border-gray-200 dark:border-gray-700/60">
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
              <tr key={i} className="border-b border-gray-200 dark:border-gray-700/60">
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

function InvoicesContent() {
  const [list, setList] = useState<InvoiceType[]>([])
  const [clients, setClients] = useState<ClientType[]>([])
  const [monthOptions, setMonthOptions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [filterMonth, setFilterMonth] = useState('')
  const [filterClient, setFilterClient] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [sortBy, setSortBy] = useState('number')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [selected, setSelected] = useState<number[]>([])
  const [pdfPreview, setPdfPreview] = useState<{ open: boolean; url: string; title: string }>({ open: false, url: '', title: '' })
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({ open: false, title: '', message: '', onConfirm: () => {} })
  const router = useRouter()
  const searchParams = useSearchParams()
  const [filterSearch, setFilterSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  useEffect(() => {
    const search = searchParams.get('search') || ''
    setFilterSearch(search)
  }, [searchParams])

  useEffect(() => {
    loadClients()
    loadMonths()
  }, [])

  // Debounce search input → filterSearch
  useEffect(() => {
    const t = setTimeout(() => {
      setFilterSearch(searchInput)
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    loadInvoices()
  }, [page, filterMonth, filterClient, filterStatus, filterSearch, sortBy, sortDir])

  const loadClients = async () => {
    try {
      const data = await clientsApi.list()
      setClients(data)
    } catch (e: any) {
      toast.error(e.message || 'Failed to load clients')
    }
  }

  const loadMonths = async () => {
    try {
      const data = await invoices.months()
      setMonthOptions(data)
    } catch (e: any) {
      toast.error(e.message || 'Failed to load months')
    }
  }

  const loadInvoices = async () => {
    setLoading(true)
    setSelected([])
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('per_page', '10')
      params.set('sort_by', sortBy)
      params.set('sort_dir', sortDir)
      if (filterMonth) params.set('month', filterMonth)
      if (filterClient) params.set('client_id', filterClient)
      if (filterStatus) params.set('status', filterStatus)
      if (filterSearch) params.set('search', filterSearch)
      
      const data = await invoices.listPaginated(params.toString())
      setList(data.data)
      setLastPage(data.last_page)
      setTotal(data.total)
    } catch (e: any) {
      toast.error(e.message || 'Failed to load invoices')
    }
    setLoading(false)
  }

  const handleDelete = (id: number) => {
    setConfirmModal({
      open: true,
      title: 'Delete Invoice',
      message: 'Are you sure you want to delete this invoice? This action cannot be undone.',
      onConfirm: async () => {
        setConfirmModal(m => ({ ...m, open: false }))
        try {
          await invoices.delete(id)
          toast.success('Invoice deleted')
          loadInvoices()
          loadMonths()
          refreshStats()
        } catch (e: any) {
          toast.error(e.message || 'Failed to delete invoice')
        }
      }
    })
  }

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await invoices.updateStatus(id, status)
      toast.success('Status updated')
      loadInvoices()
      refreshStats()
    } catch (e: any) {
      toast.error(e.message || 'Failed to update status')
    }
  }

  // Close the preview and free the blob URL it was holding.
  const closePdfPreview = () => {
    setPdfPreview(prev => {
      if (prev.url) URL.revokeObjectURL(prev.url)
      return { open: false, url: '', title: '' }
    })
  }

  const previewPdf = async (inv: InvoiceType) => {
    const title = `${inv.series}-${String(inv.number).padStart(4, '0')}`
    try {
      // Fetched with the Authorization header (token no longer in the URL).
      const url = await invoices.pdfBlobUrl(inv.id)
      setPdfPreview({ open: true, url, title })
    } catch (e: any) {
      toast.error(e.message || 'Failed to load PDF')
    }
  }

  const toggleSelect = (id: number) => {
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const toggleSelectAll = () => {
    if (selected.length === list.length) {
      setSelected([])
    } else {
      setSelected(list.map(i => i.id))
    }
  }

  const handleBulkDelete = () => {
    setConfirmModal({
      open: true,
      title: `Delete ${selected.length} Invoice(s)`,
      message: `Are you sure you want to delete ${selected.length} invoice(s)? This action cannot be undone.`,
      onConfirm: async () => {
        setConfirmModal(m => ({ ...m, open: false }))
        try {
          await invoices.bulkDelete(selected)
          toast.success(`${selected.length} invoice(s) deleted`)
          setSelected([])
          loadInvoices()
          loadMonths()
          refreshStats()
        } catch (e: any) {
          toast.error(e.message || 'Failed to delete invoices')
        }
      }
    })
  }

  const handleDuplicate = async (id: number) => {
    try {
      const newInvoice = await invoices.duplicate(id)
      toast.success(`Invoice duplicated as ${newInvoice.series}-${String(newInvoice.number).padStart(4, '0')}`)
      router.push(`/invoices/edit?id=${newInvoice.id}`)
    } catch (e: any) {
      toast.error(e.message || 'Failed to duplicate invoice')
    }
  }

  const handleBulkStatus = async (status: string) => {
    try {
      await invoices.bulkUpdateStatus(selected, status)
      toast.success(`${selected.length} invoice(s) updated to ${status}`)
      setSelected([])
      loadInvoices()
      refreshStats()
    } catch (e: any) {
      toast.error(e.message || 'Failed to update statuses')
    }
  }

  // Days a still-unpaid invoice is past its due date (0 if paid or not yet due).
  const overdueDays = (inv: InvoiceType) => {
    if (inv.status === 'paid' || !inv.due_date) return 0
    const due = new Date(inv.due_date)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return Math.floor((today.getTime() - due.getTime()) / 86400000)
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
    <>
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">Invoices</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage your invoices</p>
        </div>
        <Link
          href="/invoices/new"
          className="w-full sm:w-auto text-center btn-gradient px-6 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 bd-clip-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Invoice
        </Link>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search by series, number, client or notes..."
            className="w-full pl-10 pr-9 py-3 bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700/60 rounded-lg text-gray-800 dark:text-gray-100 focus:border-blue-500 focus:outline-none transition-colors"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Clear"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="flex-1 min-w-[200px]">
          <SearchableSelect
            value={filterMonth}
            onChange={(v) => { setFilterMonth(v); handleFilterChange() }}
            options={getMonthOptions().map(m => ({ value: m.value, label: m.label }))}
            allLabel="All months"
            placeholder="Search months…"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <SearchableSelect
            value={filterClient}
            onChange={(v) => { setFilterClient(v); handleFilterChange() }}
            options={clients.map(c => ({ value: String(c.id), label: c.name }))}
            allLabel="All clients"
            placeholder="Search clients…"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); handleFilterChange() }}
            className="w-full p-3 bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700/60 rounded-lg text-gray-800 dark:text-gray-100 focus:border-blue-500 focus:outline-none transition-colors"
          >
            {statusOptions.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        {(filterMonth || filterClient || filterStatus || filterSearch) && (
          <button
            onClick={() => { setFilterMonth(''); setFilterClient(''); setFilterStatus(''); setSearchInput(''); setFilterSearch(''); router.replace('/invoices'); handleFilterChange() }}
            className="px-4 py-3 bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700/60 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl px-4 py-3">
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{selected.length} selected</span>
          <div className="flex items-center gap-2 ml-auto">
            <select
              onChange={(e) => { if (e.target.value) { handleBulkStatus(e.target.value); e.target.value = '' } }}
              className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-200 cursor-pointer"
              defaultValue=""
            >
              <option value="" disabled>Change status...</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Won&apos;t pay</option>
            </select>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Delete ({selected.length})
            </button>
            <button
              onClick={() => setSelected([])}
              className="px-3 py-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700/60 prism-card overflow-hidden">
        {/* Desktop table */}
        <div className="hidden md:block">
        <table className="w-full">
          <thead className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50">
            <tr className="border-b border-gray-100 dark:border-gray-700/60">
              <th className="px-4 py-3.5 w-10">
                <input
                  type="checkbox"
                  checked={list.length > 0 && selected.length === list.length}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-blue-500 cursor-pointer"
                />
              </th>
              <th 
                className="px-6 py-3.5 text-left text-gray-400 dark:text-gray-500 text-xs font-medium uppercase tracking-wider cursor-pointer hover:text-gray-600 dark:text-gray-300 transition-colors"
                onClick={() => handleSort('number')}
              >
                Number <SortIcon column="number" />
              </th>
              <th 
                className="px-6 py-3.5 text-left text-gray-400 dark:text-gray-500 text-xs font-medium uppercase tracking-wider cursor-pointer hover:text-gray-600 dark:text-gray-300 transition-colors"
                onClick={() => handleSort('client_name')}
              >
                Client <SortIcon column="client_name" />
              </th>
              <th 
                className="px-6 py-3.5 text-left text-gray-400 dark:text-gray-500 text-xs font-medium uppercase tracking-wider cursor-pointer hover:text-gray-600 dark:text-gray-300 transition-colors"
                onClick={() => handleSort('invoice_date')}
              >
                Date <SortIcon column="invoice_date" />
              </th>
              <th 
                className="px-6 py-3.5 text-right text-gray-400 dark:text-gray-500 text-xs font-medium uppercase tracking-wider cursor-pointer hover:text-gray-600 dark:text-gray-300 transition-colors"
                onClick={() => handleSort('total')}
              >
                Amount <SortIcon column="total" />
              </th>
              <th className="px-6 py-3.5 text-left text-gray-400 dark:text-gray-500 text-xs font-medium uppercase tracking-wider">Status</th>
              <th className="px-6 py-3.5 text-right text-gray-400 dark:text-gray-500 text-xs font-medium uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
            {list.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-16 text-center">
                  <div className="text-gray-400 dark:text-gray-500">
                    <svg className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {(filterMonth || filterClient || filterStatus || filterSearch) ? (
                      <>
                        <p className="font-medium">No invoices match these filters</p>
                        <button onClick={() => { setFilterMonth(''); setFilterClient(''); setFilterStatus(''); setSearchInput(''); setFilterSearch(''); router.replace('/invoices') }} className="mt-3 text-sm t-accent hover:underline">Clear filters</button>
                      </>
                    ) : (
                      <>
                        <p className="font-medium text-gray-600 dark:text-gray-300">No invoices yet</p>
                        <p className="text-sm mt-1 mb-4">Create your first invoice to get started.</p>
                        <Link href="/invoices/new" className="inline-flex items-center gap-2 btn-gradient px-5 py-2.5 rounded-xl font-medium bd-clip-sm">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                          Create Invoice
                        </Link>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              list.map((inv) => {
                const late = overdueDays(inv)
                return (
                <tr key={inv.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group ${selected.includes(inv.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                  <td className="px-4 py-4 w-10 relative">
                    {late > 0 && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-red-500" title={`${late} day${late === 1 ? '' : 's'} overdue`} />}
                    <input
                      type="checkbox"
                      checked={selected.includes(inv.id)}
                      onChange={() => toggleSelect(inv.id)}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <Link href={`/invoices/edit?id=${inv.id}`} className="text-gray-800 dark:text-gray-100 font-medium group-hover:text-blue-500 transition-colors">
                      {inv.series}-{String(inv.number).padStart(4, '0')}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{inv.client?.name}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{formatDate(inv.invoice_date)}</span>
                    {late > 0 && (
                      <span className="ml-2 inline-block px-1.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/15 text-red-500" title={`Due ${formatDate(inv.due_date)}`}>
                        {late}d late
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-800 dark:text-gray-100 font-medium tabular-nums">{formatCurrency(Number(inv.total))}</td>
                  <td className="px-6 py-4">
                    <select
                      value={inv.status || 'draft'}
                      onChange={(e) => handleStatusChange(inv.id, e.target.value)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${statusColors[inv.status || 'draft']}`}
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Won&apos;t pay</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/time-tracking?invoice_id=${inv.id}`}
                        className="p-2 text-gray-500 dark:text-gray-400 hover:text-cyan-500 hover:bg-cyan-500/10 rounded-lg transition-colors"
                        title="Track time against this invoice"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </Link>
                      <button 
                        onClick={() => previewPdf(inv)} 
                        className="p-2 text-gray-500 dark:text-gray-400 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                        title="Preview PDF"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>
                      <Link 
                        href={`/invoices/edit?id=${inv.id}`}
                        className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Link>
                      <button 
                        onClick={() => handleDuplicate(inv.id)} 
                        className="p-2 text-gray-500 dark:text-gray-400 hover:text-purple-500 hover:bg-purple-500/10 rounded-lg transition-colors"
                        title="Duplicate"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => handleDelete(inv.id)} 
                        className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
                )
              })
            )}
          </tbody>
        </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden">
          {list.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="text-gray-400 dark:text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {(filterMonth || filterClient || filterStatus || filterSearch) ? (
                  <>
                    <p>No invoices match these filters</p>
                    <button onClick={() => { setFilterMonth(''); setFilterClient(''); setFilterStatus(''); setSearchInput(''); setFilterSearch(''); router.replace('/invoices') }} className="mt-3 text-sm t-accent hover:underline">Clear filters</button>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-gray-600 dark:text-gray-300">No invoices yet</p>
                    <Link href="/invoices/new" className="mt-4 inline-flex items-center gap-2 btn-gradient px-5 py-2.5 rounded-xl font-medium bd-clip-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      Create Invoice
                    </Link>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {list.map((inv) => (
                <div key={inv.id} className={`p-4 space-y-3 ${selected.includes(inv.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selected.includes(inv.id)}
                        onChange={() => toggleSelect(inv.id)}
                        className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-blue-500 cursor-pointer"
                      />
                      <Link href={`/invoices/edit?id=${inv.id}`} className="text-gray-800 dark:text-gray-100 font-medium hover:text-blue-500">
                        {inv.series}-{String(inv.number).padStart(4, '0')}
                      </Link>
                    </div>
                    <span className="text-gray-800 dark:text-gray-100 font-medium tabular-nums">{formatCurrency(Number(inv.total))}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400 text-sm">{inv.client?.name}</span>
                    <span className="text-gray-400 dark:text-gray-500 text-sm">
                      {formatDate(inv.invoice_date)}
                      {overdueDays(inv) > 0 && (
                        <span className="ml-2 px-1.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/15 text-red-500">{overdueDays(inv)}d late</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <select
                      value={inv.status || 'draft'}
                      onChange={(e) => handleStatusChange(inv.id, e.target.value)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${statusColors[inv.status || 'draft']}`}
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Won&apos;t pay</option>
                    </select>
                    <div className="flex items-center gap-4">
                      <button onClick={() => previewPdf(inv)} className="text-green-400 hover:text-green-300 text-sm transition-colors">PDF</button>
                      <Link href={`/invoices/edit?id=${inv.id}`} className="text-blue-500 hover:text-blue-400 text-sm transition-colors">Edit</Link>
                      <button onClick={() => handleDuplicate(inv.id)} className="text-purple-500 hover:text-purple-400 text-sm transition-colors">Copy</button>
                      <button onClick={() => handleDelete(inv.id)} className="text-red-400 hover:text-red-300 text-sm transition-colors">Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {total > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700/60">
            <div className="text-gray-500 dark:text-gray-400 text-sm">
              Showing {list.length} of {total} invoice{total === 1 ? '' : 's'}
            </div>
            {lastPage > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-2 bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700/60 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                        page === pageNum
                          ? 'bg-gradient-to-r from-blue-600 via-blue-700 to-gray-900 text-white shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
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
                className="px-3 py-2 bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700/60 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            )}
          </div>
        )}
      </div>
    </div>

    {/* PDF Preview Modal */}
      {pdfPreview.open && (
        <div className="fixed inset-0 z-50 flex flex-col">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closePdfPreview} />
          <div className="relative bg-white dark:bg-gray-800 flex flex-col flex-1 overflow-hidden">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-200 dark:border-gray-700/60 shrink-0">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Invoice {pdfPreview.title}</h3>
              <div className="flex items-center gap-2">
                <a
                  href={pdfPreview.url}
                  download={`invoice-${pdfPreview.title}.pdf`}
                  className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </a>
                <button
                  onClick={closePdfPreview}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 bg-gray-100 dark:bg-gray-900">
              <iframe src={pdfPreview.url} className="w-full h-full" title="PDF Preview" />
            </div>
          </div>
        </div>
      )}

    <ConfirmModal
      open={confirmModal.open}
      title={confirmModal.title}
      message={confirmModal.message}
      confirmLabel="Delete"
      variant="danger"
      onConfirm={confirmModal.onConfirm}
      onCancel={() => setConfirmModal(m => ({ ...m, open: false }))}
    />
    </>
  )
}

export default function Invoices() {
  return (
    <Suspense fallback={<InvoicesSkeleton />}>
      <InvoicesContent />
    </Suspense>
  )
}

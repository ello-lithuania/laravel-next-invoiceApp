'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { clients, Client } from '@/lib/api'
import { toast } from 'react-toastify'
import { Skeleton } from '@/components/Skeleton'
import ConfirmModal from '@/components/ConfirmModal'
import { useRefetchOnReturn } from '@/lib/useRefetchOnReturn'

function ClientsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-9 w-32 mb-2" />
          <Skeleton className="h-5 w-48" />
        </div>
        <Skeleton className="h-12 w-36 rounded-xl" />
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700/60 prism-card overflow-hidden">
        <table className="w-full">
          <thead className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50">
            <tr className="border-b border-gray-200 dark:border-gray-700/60">
              <th className="px-6 py-4 text-left"><Skeleton className="h-4 w-16" /></th>
              <th className="px-6 py-4 text-left"><Skeleton className="h-4 w-24" /></th>
              <th className="px-6 py-4 text-left"><Skeleton className="h-4 w-20" /></th>
              <th className="px-6 py-4 text-left"><Skeleton className="h-4 w-16" /></th>
              <th className="px-6 py-4 text-left"><Skeleton className="h-4 w-20" /></th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i} className="border-b border-gray-200 dark:border-gray-700/60">
                <td className="px-6 py-4"><Skeleton className="h-5 w-32" /></td>
                <td className="px-6 py-4"><Skeleton className="h-5 w-28" /></td>
                <td className="px-6 py-4"><Skeleton className="h-5 w-40" /></td>
                <td className="px-6 py-4"><Skeleton className="h-5 w-28" /></td>
                <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function Clients() {
  const [list, setList] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({ open: false, title: '', message: '', onConfirm: () => {} })

  const PER_PAGE = 10

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchTerm(searchInput)
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    loadClients()
  }, [page, searchTerm])

  const loadClients = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('per_page', String(PER_PAGE))
      if (searchTerm) params.set('search', searchTerm)

      const data = await clients.paginated(params.toString())
      setList(data.data)
      setLastPage(data.last_page)
      setTotal(data.total)
    } catch (e: any) {
      toast.error(e.message || 'Failed to load clients')
    }
    setLoading(false)
  }

  useRefetchOnReturn(() => loadClients())

  const handleDelete = (id: number) => {
    setConfirmModal({
      open: true,
      title: 'Delete Client',
      message: 'Are you sure you want to delete this client? This action cannot be undone.',
      onConfirm: async () => {
        setConfirmModal(m => ({ ...m, open: false }))
        try {
          await clients.delete(id)
          toast.success('Client deleted')
          if (list.length === 1 && page > 1) {
            setPage(page - 1)
          } else {
            loadClients()
          }
        } catch (e: any) {
          toast.error(e.message || 'Failed to delete client')
        }
      }
    })
  }

  if (loading && list.length === 0) return <ClientsSkeleton />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">Clients</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage your clients</p>
        </div>
        <Link
          href="/clients/new"
          className="w-full sm:w-auto text-center btn-gradient px-6 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 bd-clip-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Client
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="Search by name, company code, VAT, email or phone..."
          className="w-full pl-12 pr-10 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:border-transparent transition-colors"
          style={{ ['--tw-ring-color' as string]: 'var(--t-accent)' }}
        />
        {searchInput && (
          <button
            onClick={() => setSearchInput('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            title="Clear"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700/60 prism-card overflow-hidden">
        {/* Desktop table */}
        <div className="hidden md:block">
        <table className="w-full">
          <thead className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50">
            <tr className="border-b border-gray-100 dark:border-gray-700/60">
              <th className="px-6 py-3.5 text-left text-gray-400 dark:text-gray-500 text-xs font-medium uppercase tracking-wider">Name</th>
              <th className="px-6 py-3.5 text-left text-gray-400 dark:text-gray-500 text-xs font-medium uppercase tracking-wider">Company Code</th>
              <th className="px-6 py-3.5 text-left text-gray-400 dark:text-gray-500 text-xs font-medium uppercase tracking-wider">Email</th>
              <th className="px-6 py-3.5 text-left text-gray-400 dark:text-gray-500 text-xs font-medium uppercase tracking-wider">Phone</th>
              <th className="px-6 py-3.5 text-right text-gray-400 dark:text-gray-500 text-xs font-medium uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
            {list.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center">
                  <div className="text-gray-400 dark:text-gray-500">
                    <svg className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="font-medium">{searchTerm ? 'No clients match your search' : 'No clients yet'}</p>
                    <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">{searchTerm ? 'Try a different keyword' : 'Add your first client to get started'}</p>
                  </div>
                </td>
              </tr>
            ) : (
              list.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link href={`/clients/view?id=${client.id}`} className={`font-medium group-hover:text-blue-500 transition-colors ${client.has_uncollectible ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-100'}`}>
                        {client.name}
                      </Link>
                      {client.has_uncollectible && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500/15 text-red-600 dark:text-red-400 whitespace-nowrap" title="Has an invoice marked Won't pay — this client doesn't pay">
                          Won&apos;t pay
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm">{client.company_code || '—'}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm">{client.email || '—'}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm">{client.phone || '—'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <Link 
                        href={`/clients/view?id=${client.id}`}
                        className="p-2 text-gray-500 dark:text-gray-400 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                        title="View"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </Link>
                      <Link 
                        href={`/clients/edit?id=${client.id}`}
                        className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Link>
                      <button 
                        onClick={() => handleDelete(client.id)} 
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
              ))
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p>{searchTerm ? 'No clients match your search' : 'No clients yet'}</p>
                <p className="text-sm mt-1">{searchTerm ? 'Try a different keyword' : 'Add your first client to get started'}</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {list.map((client) => (
                <div key={client.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Link href={`/clients/view?id=${client.id}`} className={`font-medium hover:text-blue-500 truncate ${client.has_uncollectible ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-100'}`}>
                        {client.name}
                      </Link>
                      {client.has_uncollectible && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500/15 text-red-600 dark:text-red-400 whitespace-nowrap shrink-0" title="This client has a written-off invoice">
                          Won&apos;t pay
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <Link href={`/clients/view?id=${client.id}`} className="text-emerald-500 hover:text-emerald-400 text-sm transition-colors">View</Link>
                      <Link href={`/clients/edit?id=${client.id}`} className="text-blue-500 hover:text-blue-400 text-sm transition-colors">Edit</Link>
                      <button onClick={() => handleDelete(client.id)} className="text-red-400 hover:text-red-300 text-sm transition-colors">Delete</button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                    {client.company_code && <span>{client.company_code}</span>}
                    {client.email && <span>{client.email}</span>}
                    {client.phone && <span>{client.phone}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing <span className="font-medium text-gray-700 dark:text-gray-300">{(page - 1) * PER_PAGE + 1}</span>
            {' – '}
            <span className="font-medium text-gray-700 dark:text-gray-300">{Math.min(page * PER_PAGE, total)}</span>
            {' of '}
            <span className="font-medium text-gray-700 dark:text-gray-300">{total}</span>
            {' clients'}
          </p>
          {lastPage > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ←
              </button>
              {Array.from({ length: lastPage }, (_, i) => i + 1).map(p => {
                const show = p === 1 || p === lastPage || Math.abs(p - page) <= 1
                const showEllipsis = (p === 2 && page > 4) || (p === lastPage - 1 && page < lastPage - 3)
                if (!show && showEllipsis) return <span key={p} className="px-2 text-gray-400">…</span>
                if (!show) return null
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      p === page ? 'btn-gradient' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    {p}
                  </button>
                )
              })}
              <button
                onClick={() => setPage(p => Math.min(lastPage, p + 1))}
                disabled={page === lastPage}
                className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                →
              </button>
            </div>
          )}
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
    </div>
  )
}

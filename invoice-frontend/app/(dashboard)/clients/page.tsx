'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { clients, Client } from '@/lib/api'
import { toast } from 'react-toastify'
import { Skeleton } from '@/components/Skeleton'
import ConfirmModal from '@/components/ConfirmModal'
import SearchableSelect from '@/components/SearchableSelect'
import { useRefetchOnReturn } from '@/lib/useRefetchOnReturn'
import { formatCurrency, formatDate } from '@/lib/utils'

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
      <Skeleton className="h-11 w-full max-w-md rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-44 w-full rounded-xl" />
        ))}
      </div>
    </div>
  )
}

export default function Clients() {
  const router = useRouter()
  const [list, setList] = useState<Client[]>([])
  const [allClients, setAllClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({ open: false, title: '', message: '', onConfirm: () => {} })

  const PER_PAGE = 12

  useEffect(() => {
    loadClients()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  // Full client list (name-ordered) for the "jump to a client" picker.
  useEffect(() => {
    clients.list().then(setAllClients).catch(() => {})
  }, [])

  const loadClients = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('per_page', String(PER_PAGE))

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

      {/* Jump to a client — pick from the full list even if you don't recall the exact name. */}
      <div className="max-w-md">
        <SearchableSelect
          value=""
          onChange={(id) => { if (id) router.push(`/clients/view?id=${id}`) }}
          options={allClients.map(c => ({ value: String(c.id), label: c.name }))}
          allLabel="Jump to a client…"
          placeholder="Search client by name…"
        />
      </div>

      {list.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700/60 prism-card p-12 text-center">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className="font-medium text-gray-600 dark:text-gray-300">No clients yet</p>
          <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">Add your first client to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((client, i) => {
            const rank = (page - 1) * PER_PAGE + i + 1
            const count = client.invoices_count ?? 0
            const totalBilled = Number(client.invoices_total ?? 0)
            const paid = Number(client.invoices_paid ?? 0)
            const paidPct = totalBilled > 0 ? Math.min(100, (paid / totalBilled) * 100) : 0
            return (
              <div key={client.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700/60 prism-card p-5 hover-lift flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold tabular-nums w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--t-bg-elevated)', color: 'var(--t-text-muted)' }}>{rank}</span>
                      <Link href={`/clients/view?id=${client.id}`} className={`font-semibold truncate hover:underline ${client.has_uncollectible ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-100'}`}>{client.name}</Link>
                    </div>
                    {(client.company_code || client.email) && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-8 truncate">{client.company_code || client.email}</p>
                    )}
                  </div>
                  {client.has_uncollectible && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500/15 text-red-600 dark:text-red-400 whitespace-nowrap shrink-0" title="Has an invoice marked Won't pay — this client doesn't pay">Won&apos;t pay</span>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-gray-400 dark:text-gray-500">Invoices</p>
                    <p className="text-xl font-bold text-gray-800 dark:text-gray-100 tabular-nums">{count}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-gray-400 dark:text-gray-500">Total billed</p>
                    <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--t-accent)' }}>{formatCurrency(totalBilled)}</p>
                  </div>
                </div>

                {/* Paid ratio */}
                {totalBilled > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-500 dark:text-gray-400">{formatCurrency(paid)} paid</span>
                      <span className="font-semibold text-green-600 dark:text-green-400 tabular-nums">{paidPct.toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--t-bg-elevated)' }}>
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${paidPct}%`, background: '#16a34a' }} />
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
                  <span className="text-xs text-gray-400 dark:text-gray-500">{client.last_invoice_date ? `Last: ${formatDate(client.last_invoice_date)}` : 'No invoices'}</span>
                  <div className="flex items-center gap-1">
                    <Link href={`/clients/view?id=${client.id}`} aria-label={`View ${client.name}`} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors" title="View">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </Link>
                    <Link href={`/clients/edit?id=${client.id}`} aria-label={`Edit ${client.name}`} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors" title="Edit">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </Link>
                    <button onClick={() => handleDelete(client.id)} aria-label={`Delete ${client.name}`} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

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

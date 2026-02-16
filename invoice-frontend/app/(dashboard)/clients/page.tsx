'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { clients } from '@/lib/api'
import { toast } from 'react-toastify'
import ConfirmModal from '@/components/ConfirmModal'

interface Client {
  id: number
  name: string
  company_code?: string
  email?: string
  phone?: string
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700/50 rounded ${className}`} />
}

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
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700/60 overflow-hidden">
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
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({ open: false, title: '', message: '', onConfirm: () => {} })

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    try {
      const data = await clients.list()
      setList(data)
    } catch (e: any) {
      toast.error(e.message || 'Failed to load clients')
    }
    setLoading(false)
  }

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
          loadClients()
        } catch (e: any) {
          toast.error(e.message || 'Failed to delete client')
        }
      }
    })
  }

  if (loading) return <ClientsSkeleton />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">Clients</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage your clients</p>
        </div>
        <Link
          href="/clients/new"
          className="w-full sm:w-auto text-center btn-gradient px-6 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Client
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700/60 overflow-hidden">
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
                    <p className="font-medium">No clients yet</p>
                    <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">Add your first client to get started</p>
                  </div>
                </td>
              </tr>
            ) : (
              list.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                  <td className="px-6 py-4">
                    <Link href={`/clients/view?id=${client.id}`} className="text-gray-800 dark:text-gray-100 font-medium group-hover:text-blue-500 transition-colors">
                      {client.name}
                    </Link>
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
                <p>No clients yet</p>
                <p className="text-sm mt-1">Add your first client to get started</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {list.map((client) => (
                <div key={client.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Link href={`/clients/view?id=${client.id}`} className="text-gray-800 dark:text-gray-100 font-medium hover:text-blue-500">
                      {client.name}
                    </Link>
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
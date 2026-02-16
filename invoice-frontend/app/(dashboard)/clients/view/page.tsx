'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { clients, getToken } from '@/lib/api'
import { toast } from 'react-toastify'

interface ClientInvoice {
  id: number
  series: string
  number: number
  invoice_date: string
  due_date: string
  total: number
  status?: string
}

interface ClientDetail {
  id: number
  name: string
  company_code?: string
  vat_code?: string
  address?: string
  email?: string
  phone?: string
  notes?: string
  invoices: ClientInvoice[]
  invoices_total: number
  invoices_paid: number
  invoices_count: number
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-500/20 text-gray-600 dark:text-gray-300',
  sent: 'bg-blue-500/15 text-blue-500',
  paid: 'bg-green-500/20 text-green-400',
  overdue: 'bg-red-500/20 text-red-400',
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700/50 rounded ${className}`} />
}

export default function ClientView() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const [client, setClient] = useState<ClientDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) loadClient()
  }, [id])

  const loadClient = async () => {
    try {
      const data = await clients.get(Number(id))
      setClient(data as ClientDetail)
    } catch (e: any) {
      toast.error(e.message || 'Failed to load client')
    }
    setLoading(false)
  }

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' }).format(v)

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-48 mb-2" />
      <div className="grid sm:grid-cols-3 gap-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )

  if (!client) return (
    <div className="text-center py-16 text-gray-400">
      <p className="text-lg font-medium">Client not found</p>
      <Link href="/clients" className="text-blue-500 hover:text-blue-400 mt-2 inline-block">← Back to clients</Link>
    </div>
  )

  const unpaid = client.invoices_total - client.invoices_paid

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 mb-1">{client.name}</h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
            {client.company_code && <span>Code: {client.company_code}</span>}
            {client.vat_code && <span>VAT: {client.vat_code}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/invoices/new?client_id=${client.id}`}
            className="btn-gradient px-4 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Invoice
          </Link>
          <Link
            href={`/clients/edit?id=${client.id}`}
            className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg font-medium text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Edit Client
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700/60 p-5">
          <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium mb-2">Total Invoiced</p>
          <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{formatCurrency(client.invoices_total)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700/60 p-5">
          <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium mb-2">Paid</p>
          <p className="text-xl font-bold text-emerald-500">{formatCurrency(client.invoices_paid)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700/60 p-5">
          <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium mb-2">Unpaid</p>
          <p className="text-xl font-bold text-amber-500">{formatCurrency(unpaid)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700/60 p-5">
          <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium mb-2">Invoices</p>
          <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{client.invoices_count}</p>
        </div>
      </div>

      {/* Client Info */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700/60 p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Contact Information</h2>
          <div className="space-y-3">
            {client.email && (
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <a href={`mailto:${client.email}`} className="text-sm text-blue-500 hover:text-blue-400">{client.email}</a>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <a href={`tel:${client.phone}`} className="text-sm text-gray-600 dark:text-gray-300">{client.phone}</a>
              </div>
            )}
            {client.address && (
              <div className="flex items-start gap-3">
                <svg className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm text-gray-600 dark:text-gray-300">{client.address}</span>
              </div>
            )}
            {!client.email && !client.phone && !client.address && (
              <p className="text-sm text-gray-400 dark:text-gray-500">No contact information</p>
            )}
          </div>
          {client.notes && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/60">
              <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium mb-2">Notes</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}
        </div>

        {/* Invoices Table */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700/60 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700/60">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Invoice History</h2>
          </div>

          {client.invoices.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-400 dark:text-gray-500 font-medium">No invoices yet</p>
              <Link href={`/invoices/new?client_id=${client.id}`} className="text-blue-500 hover:text-blue-400 text-sm mt-2 inline-block">
                Create first invoice →
              </Link>
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block">
                <table className="w-full">
                  <thead className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-6 py-3 text-left">Number</th>
                      <th className="px-6 py-3 text-left">Date</th>
                      <th className="px-6 py-3 text-right">Amount</th>
                      <th className="px-6 py-3 text-left">Status</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                    {client.invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                        <td className="px-6 py-3">
                          <Link href={`/invoices/edit?id=${inv.id}`} className="text-gray-800 dark:text-gray-100 font-medium group-hover:text-blue-500 transition-colors text-sm">
                            {inv.series}-{String(inv.number).padStart(4, '0')}
                          </Link>
                        </td>
                        <td className="px-6 py-3 text-gray-500 dark:text-gray-400 text-sm">{inv.invoice_date?.split('T')[0]}</td>
                        <td className="px-6 py-3 text-right text-gray-800 dark:text-gray-100 font-medium tabular-nums text-sm">{Number(inv.total).toFixed(2)} €</td>
                        <td className="px-6 py-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[inv.status || 'draft']}`}>
                            {(inv.status || 'draft').charAt(0).toUpperCase() + (inv.status || 'draft').slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/invoices/edit?id=${inv.id}`} className="p-1.5 text-gray-400 hover:text-blue-500 rounded transition-colors" title="Edit">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700/60">
                {client.invoices.map((inv) => (
                  <Link key={inv.id} href={`/invoices/edit?id=${inv.id}`} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <div>
                      <p className="text-gray-800 dark:text-gray-100 font-medium text-sm">{inv.series}-{String(inv.number).padStart(4, '0')}</p>
                      <p className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">{inv.invoice_date?.split('T')[0]}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-800 dark:text-gray-100 font-medium text-sm tabular-nums">{Number(inv.total).toFixed(2)} €</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[inv.status || 'draft']}`}>
                        {(inv.status || 'draft').charAt(0).toUpperCase() + (inv.status || 'draft').slice(1)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

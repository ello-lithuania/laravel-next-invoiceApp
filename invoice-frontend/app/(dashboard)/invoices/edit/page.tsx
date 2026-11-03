'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { invoices, clients as clientsApi, Client } from '@/lib/api'
import { toast } from 'react-toastify'
import { triggerDownload, getErrorMessage } from '@/lib/utils'
import InvoiceForm from '@/components/invoices/InvoiceForm'
import { emptyItem, type InvoiceFormValues } from '@/components/invoices/types'

function EditInvoiceForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const [clients, setClients] = useState<Client[]>([])
  const [duplicating, setDuplicating] = useState(false)
  const [invoiceMeta, setInvoiceMeta] = useState<{ series: string; number: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<InvoiceFormValues>({
    client_id: '',
    invoice_date: '',
    due_date: '',
    notes: '',
    items: [{ ...emptyItem }]
  })

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    try {
      const [cli, inv] = await Promise.all([
        clientsApi.list(),
        id ? invoices.get(Number(id)) : null
      ])
      setClients(cli)
      if (inv) {
        setInvoiceMeta({ series: inv.series, number: inv.number })
        setForm({
          client_id: String(inv.client_id),
          invoice_date: inv.invoice_date.split('T')[0],
          due_date: inv.due_date.split('T')[0],
          notes: inv.notes || '',
          items: inv.items?.map(i => ({
            description: i.description,
            unit: i.unit,
            quantity: i.quantity,
            price: i.price
          })) || [{ ...emptyItem }]
        })
      }
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Failed to load invoice'))
    }
    setLoading(false)
  }

  const handleSubmit = async (value: InvoiceFormValues) => {
    try {
      await invoices.update(Number(id), { ...value, client_id: Number(value.client_id) })
      router.push('/invoices')
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Failed to save invoice'))
    }
  }

  const handleDuplicate = async () => {
    setDuplicating(true)
    try {
      const newInvoice = await invoices.duplicate(Number(id))
      toast.success(`Invoice duplicated as ${newInvoice.series}-${String(newInvoice.number).padStart(4, '0')}`)
      router.push(`/invoices/edit?id=${newInvoice.id}`)
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Failed to duplicate invoice'))
    }
    setDuplicating(false)
  }

  const downloadPdf = async () => {
    if (!id) return
    try {
      const url = await invoices.pdfBlobUrl(Number(id), { download: true })
      const name = invoiceMeta
        ? `invoice-${invoiceMeta.series}-${invoiceMeta.number}.pdf`
        : `invoice-${id}.pdf`
      triggerDownload(url, name)
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Failed to download PDF'))
    }
  }

  if (loading) return <div className="text-gray-800 dark:text-gray-100 p-8">Loading...</div>

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/invoices" className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">Edit Invoice</h1>
            <p className="text-gray-500 dark:text-gray-400">Update invoice details</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadPdf}
            className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg font-medium text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            PDF
          </button>
          <button
            onClick={handleDuplicate}
            disabled={duplicating}
            className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg font-medium text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
            </svg>
            {duplicating ? 'Duplicating...' : 'Duplicate'}
          </button>
        </div>
      </div>

      <InvoiceForm mode="edit" value={form} onChange={setForm} clients={clients} onSubmit={handleSubmit} />
    </div>
  )
}

export default function EditInvoice() {
  return (
    <Suspense fallback={<div className="text-gray-800 dark:text-gray-100 p-8">Loading...</div>}>
      <EditInvoiceForm />
    </Suspense>
  )
}
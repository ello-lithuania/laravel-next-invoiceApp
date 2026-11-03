'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { invoices, clients as clientsApi, Client, ClientHistory, ClientHistoryItem } from '@/lib/api'
import { toast } from 'react-toastify'
import { refreshStats, addOneMonth, getErrorMessage } from '@/lib/utils'
import InvoiceForm from '@/components/invoices/InvoiceForm'
import ClientHistoryPanel from '@/components/invoices/ClientHistoryPanel'
import { emptyItem, type InvoiceFormValues } from '@/components/invoices/types'

const getToday = () => new Date().toISOString().split('T')[0]

export default function NewInvoice() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [clientHistory, setClientHistory] = useState<ClientHistory | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [repeating, setRepeating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<InvoiceFormValues>({
    client_id: '',
    invoice_date: getToday(),
    due_date: addOneMonth(getToday()),
    notes: '',
    items: [{ ...emptyItem }]
  })

  useEffect(() => {
    loadClients()
  }, [])

  // Pull this client's billing history whenever the selected client changes,
  // so we can suggest the exact services + prices used for *them* before.
  useEffect(() => {
    if (!form.client_id) { setClientHistory(null); return }
    let active = true
    setHistoryLoading(true)
    invoices.clientHistory(form.client_id)
      .then(h => { if (active) setClientHistory(h) })
      .catch(() => { if (active) setClientHistory(null) })
      .finally(() => { if (active) setHistoryLoading(false) })
    return () => { active = false }
  }, [form.client_id])

  // Copy an existing invoice's line items + notes into THIS new invoice form
  // (dates stay as the new invoice's — today / due in a month). It never opens
  // or edits the old invoice; it just seeds a fresh one from its data.
  const copyInvoiceItems = async (invoiceId: number, label: string) => {
    setRepeating(true)
    try {
      const full = await invoices.get(invoiceId)
      const items = (full.items || []).map(it => ({
        description: it.description,
        unit: it.unit || 'h',
        quantity: Number(it.quantity) || 1,
        price: Number(it.price) || 0,
      }))
      setForm(prev => ({
        ...prev,
        items: items.length ? items : prev.items,
        notes: full.notes || prev.notes,
      }))
      toast.success(`Copied items from ${label}`)
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Failed to load that invoice'))
    }
    setRepeating(false)
  }

  // One-click "repeat last invoice" — ideal for the same monthly retainer billing.
  const repeatLastInvoice = () => {
    const last = clientHistory?.invoices?.[0]
    if (last) copyInvoiceItems(last.id, `${last.series} ${last.number}`)
  }

  // Insert a remembered line item (description + unit + the price used for this
  // client) as a new row, reusing the empty trailing row if there is one.
  const insertHistoryItem = (hi: ClientHistoryItem) => {
    setForm(prev => {
      const items = [...prev.items]
      const newItem = { description: hi.description, unit: hi.unit || 'h', quantity: 1, price: Number(hi.price) || 0 }
      const last = items[items.length - 1]
      if (last && !last.description && !last.price) items[items.length - 1] = newItem
      else items.push(newItem)
      return { ...prev, items }
    })
  }

  const loadClients = async () => {
    try {
      const data = await clientsApi.list()
      setClients(data)
    } catch {
      toast.error('Failed to load clients')
    }
    setLoading(false)
  }

  const handleSubmit = async (value: InvoiceFormValues) => {
    try {
      await invoices.create({ ...value, client_id: Number(value.client_id) })
      refreshStats()
      toast.success('Invoice created successfully')
      router.push('/invoices')
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Failed to create invoice'))
    }
  }

  if (loading) return <div className="text-gray-800 dark:text-gray-100 p-8">Loading...</div>

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/invoices" className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">New Invoice</h1>
          <p className="text-gray-500 dark:text-gray-400">Create a new invoice</p>
        </div>
      </div>

      <InvoiceForm mode="create" value={form} onChange={setForm} clients={clients} onSubmit={handleSubmit}>
        {form.client_id && (
          <ClientHistoryPanel
            clientName={clients.find(c => c.id === Number(form.client_id))?.name}
            history={clientHistory}
            loading={historyLoading}
            copying={repeating}
            onRepeatLast={repeatLastInvoice}
            onCopyInvoice={copyInvoiceItems}
            onInsertItem={insertHistoryItem}
          />
        )}
      </InvoiceForm>
    </div>
  )
}

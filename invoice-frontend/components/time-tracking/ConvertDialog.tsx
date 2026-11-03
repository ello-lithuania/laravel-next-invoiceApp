import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-toastify'
import { timeEntries, TimeEntry } from '@/lib/api'
import { addOneMonth, getErrorMessage } from '@/lib/utils'
import { totalMoney } from './entryHelpers'
import { ConvertToInvoiceModal } from './TimeTrackingModals'

// Turns the selected entries into an invoice, then opens it for editing.
export function ConvertDialog({ open, selectedIds, selectedEntries, onClose, onConverted }: {
  open: boolean
  selectedIds: number[]
  selectedEntries: TimeEntry[]
  onClose: () => void
  // Called after the invoice was created (the page clears its selection).
  onConverted: () => void
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(() => {
    const today = new Date().toISOString().split('T')[0]
    return { invoice_date: today, due_date: addOneMonth(today), notes: '' }
  })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const invoice = await timeEntries.convertToInvoice({
        time_entry_ids: selectedIds,
        ...form,
      })
      toast.success('Invoice created from time entries!')
      onConverted()
      router.push(`/invoices/edit?id=${invoice.id}`)
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Failed to convert'))
    }
    setSaving(false)
  }

  return (
    <ConvertToInvoiceModal
      open={open}
      onClose={onClose}
      selectedCount={selectedIds.length}
      total={totalMoney(selectedEntries)}
      form={form}
      setForm={setForm}
      onSubmit={submit}
      saving={saving}
    />
  )
}

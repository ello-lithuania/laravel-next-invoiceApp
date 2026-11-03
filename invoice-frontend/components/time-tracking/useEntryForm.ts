import { FormEvent, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-toastify'
import { timeEntries, TrackableInvoice } from '@/lib/api'
import { getErrorMessage } from '@/lib/utils'
import { entryFormReducer, initialEntryFormState } from './entryFormState'

const DESCRIPTIONS_KEY = 'timeTrackingDescriptions'
const RATES_KEY = 'timeTrackingRates'
const MAX_SAVED_DESCRIPTIONS = 50

interface Options {
  trackableInvoices: TrackableInvoice[]
  // Called after an entry was created/updated, so the list can reload.
  onSaved: () => void
}

// The add/edit form: its state, the remembered descriptions and per-client
// rates (localStorage), the ?invoice_id / ?new URL shortcuts, and submit.
export function useEntryForm({ trackableInvoices, onSaved }: Options) {
  const router = useRouter()
  const [form, dispatch] = useReducer(entryFormReducer, initialEntryFormState)
  const [saving, setSaving] = useState(false)
  const [savedDescriptions, setSavedDescriptions] = useState<string[]>([])
  const [savedRates, setSavedRates] = useState<Record<string, string>>({})
  const invoiceParamHandled = useRef(false)

  const { values } = form

  useEffect(() => {
    const saved = localStorage.getItem(DESCRIPTIONS_KEY)
    if (saved) setSavedDescriptions(JSON.parse(saved))
    const rates = localStorage.getItem(RATES_KEY)
    if (rates) setSavedRates(JSON.parse(rates))
  }, [])

  // Handle ?invoice_id URL param: pre-fill form for tracking against this invoice
  useEffect(() => {
    if (invoiceParamHandled.current) return
    const invoiceIdParam = new URLSearchParams(window.location.search).get('invoice_id')
    if (!invoiceIdParam) return
    if (trackableInvoices.length === 0) return // wait for invoices to load

    invoiceParamHandled.current = true
    router.replace('/time-tracking')
    const invoice = trackableInvoices.find(inv => inv.id === Number(invoiceIdParam))
    if (!invoice) {
      toast.error('This invoice has no hourly items, cannot track time against it')
      return
    }
    dispatch({ type: 'trackInvoice', invoice, savedRate: savedRates[String(invoice.client_id)] || '' })
    toast.success(`Tracking against ${invoice.series} ${invoice.number}`)
  }, [trackableInvoices, savedRates, router])

  // ?new=1 (from the header "New → Time Entry") opens the add-entry form directly.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('new')) {
      dispatch({ type: 'open' })
      router.replace('/time-tracking')
    }
  }, [router])

  // Trackable invoices for the selected client (only those with hours remaining)
  const clientInvoices = useMemo(() => {
    if (!values.client_id) return []
    return trackableInvoices.filter(inv => inv.client_id === Number(values.client_id))
  }, [trackableInvoices, values.client_id])

  const submit = async (e: FormEvent) => {
    e.preventDefault()

    // "Already invoiced" requires an invoice link — that's the whole point (countdown).
    if (values.is_prepaid && !values.invoice_id) {
      if (clientInvoices.length === 0) {
        toast.error('No invoices with hourly items for this client. Create one first or uncheck "Already invoiced".')
      } else {
        toast.error('Select an invoice from the list')
      }
      return
    }

    setSaving(true)
    try {
      const hours = parseInt(values.duration_hours || '0')
      const minutes = parseInt(values.duration_minutes || '0')

      const data = {
        client_id: Number(values.client_id),
        group_name: values.group_name.trim() || null,
        description: values.description,
        hourly_rate: Number(values.hourly_rate),
        duration_seconds: (hours * 3600) + (minutes * 60),
        is_prepaid: values.is_prepaid && !!values.invoice_id,
        invoice_id: values.is_prepaid && values.invoice_id ? Number(values.invoice_id) : null,
      }

      if (form.editingId) {
        await timeEntries.update(form.editingId, data)
        toast.success('Time entry updated')
      } else {
        await timeEntries.create(data)
        toast.success('Time entry created')
      }

      // Remember the description for the suggestions
      if (values.description && !savedDescriptions.includes(values.description)) {
        const updated = [...new Set([values.description, ...savedDescriptions])].slice(0, MAX_SAVED_DESCRIPTIONS)
        setSavedDescriptions(updated)
        localStorage.setItem(DESCRIPTIONS_KEY, JSON.stringify(updated))
      }

      // Remember the rate per client
      if (values.client_id && values.hourly_rate) {
        const updatedRates = { ...savedRates, [values.client_id]: values.hourly_rate }
        setSavedRates(updatedRates)
        localStorage.setItem(RATES_KEY, JSON.stringify(updatedRates))
      }

      dispatch({ type: 'close' })
      onSaved()
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Failed to save'))
    }
    setSaving(false)
  }

  return { form, dispatch, saving, savedDescriptions, savedRates, clientInvoices, submit }
}

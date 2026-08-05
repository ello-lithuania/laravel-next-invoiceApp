'use client'
import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { timeEntries, clients as clientsApi, invoices as invoicesApi, Client, TimeEntry, TrackableInvoice } from '@/lib/api'
import { toast } from 'react-toastify'
import { Skeleton } from '@/components/Skeleton'
import ConfirmModal from '@/components/ConfirmModal'
import SearchableSelect from '@/components/SearchableSelect'
import { useRefetchOnReturn } from '@/lib/useRefetchOnReturn'
import { addOneMonth } from '@/lib/utils'
import { AssignGroupModal, ConvertToInvoiceModal } from '@/components/dashboard/TimeTrackingModals'

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatHours(seconds: number): string {
  const h = (seconds / 3600).toFixed(2)
  return `${h} val.`
}

function TimeTrackingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-9 w-40 mb-2" />
          <Skeleton className="h-5 w-56" />
        </div>
      </div>
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  )
}

export default function TimeTracking() {
  const router = useRouter()
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [trackableInvoices, setTrackableInvoices] = useState<TrackableInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Filters
  const [filterClient, setFilterClient] = useState('')
  const [filterInvoiced, setFilterInvoiced] = useState('false')

  // New entry form
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({
    client_id: '',
    group_name: '',
    description: '',
    hourly_rate: '',
    duration_hours: '',
    duration_minutes: '',
    is_prepaid: false,
    invoice_id: '',
  })

  // Saved descriptions & rates (localStorage)
  const [savedDescriptions, setSavedDescriptions] = useState<string[]>([])
  const [savedRates, setSavedRates] = useState<Record<string, string>>({})
  const [showDescSuggestions, setShowDescSuggestions] = useState(false)
  const descRef = useRef<HTMLDivElement>(null)

  // Client searchable dropdown
  const [clientSearch, setClientSearch] = useState('')
  const [showClientSuggestions, setShowClientSuggestions] = useState(false)
  const [showGroupSuggestions, setShowGroupSuggestions] = useState(false)
  const clientRef = useRef<HTMLDivElement>(null)

  // Timer
  const [runningEntry, setRunningEntry] = useState<TimeEntry | null>(null)
  const [timerDisplay, setTimerDisplay] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Selection for convert
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [groupValue, setGroupValue] = useState('')
  const [convertForm, setConvertForm] = useState({
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: addOneMonth(new Date().toISOString().split('T')[0]),
    notes: '',
  })

  // Confirm modal
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({ open: false, title: '', message: '', onConfirm: () => {} })

  // Add minutes inline
  const [addMinutesId, setAddMinutesId] = useState<number | null>(null)
  const [addMinutesValue, setAddMinutesValue] = useState('')

  // Stop with minutes confirmation
  const [stoppingEntry, setStoppingEntry] = useState<TimeEntry | null>(null)
  const [stopMinutes, setStopMinutes] = useState('')

  useEffect(() => {
    loadData()
  }, [filterClient, filterInvoiced])

  useEffect(() => {
    const saved = localStorage.getItem('timeTrackingDescriptions')
    if (saved) setSavedDescriptions(JSON.parse(saved))
    const rates = localStorage.getItem('timeTrackingRates')
    if (rates) setSavedRates(JSON.parse(rates))
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (descRef.current && !descRef.current.contains(e.target as Node)) setShowDescSuggestions(false)
      if (clientRef.current && !clientRef.current.contains(e.target as Node)) setShowClientSuggestions(false)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  // Keep client search input in sync when form.client_id changes externally (edit, URL param, reset)
  useEffect(() => {
    if (form.client_id) {
      const selected = clients.find(c => String(c.id) === String(form.client_id))
      if (selected && clientSearch !== selected.name) setClientSearch(selected.name)
    } else if (!showClientSuggestions) {
      setClientSearch('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.client_id, clients])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // Handle ?invoice_id URL param: pre-fill form for tracking against this invoice
  const [urlParamHandled, setUrlParamHandled] = useState(false)
  useEffect(() => {
    if (urlParamHandled) return
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const invoiceIdParam = params.get('invoice_id')
    if (!invoiceIdParam) return
    if (trackableInvoices.length === 0) return // wait for invoices to load

    const invoice = trackableInvoices.find(inv => inv.id === Number(invoiceIdParam))
    if (!invoice) {
      toast.error('This invoice has no hourly items, cannot track time against it')
      setUrlParamHandled(true)
      router.replace('/time-tracking')
      return
    }

    setForm(prev => ({
      ...prev,
      client_id: String(invoice.client_id),
      hourly_rate: prev.hourly_rate || savedRates[String(invoice.client_id)] || '',
      is_prepaid: true,
      invoice_id: String(invoice.id),
    }))
    setShowForm(true)
    setUrlParamHandled(true)
    router.replace('/time-tracking')
    toast.success(`Tracking against ${invoice.series} ${invoice.number}`)
  }, [trackableInvoices, urlParamHandled, savedRates, router])

  // ?new=1 (from the header "New → Time Entry") opens the add-entry form directly.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.has('new')) {
      setShowForm(true)
      router.replace('/time-tracking')
    }
  }, [router])

  const startTimerInterval = useCallback((entry: TimeEntry) => {
    if (timerRef.current) clearInterval(timerRef.current)
    const startedAt = new Date(entry.started_at!).getTime()

    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000)
      setTimerDisplay(elapsed)
    }
    tick()
    timerRef.current = setInterval(tick, 500)
  }, [])

  const loadData = async () => {
    try {
      const [entriesData, clientsData, trackableData] = await Promise.all([
        timeEntries.list(buildParams()),
        clientsApi.list(),
        invoicesApi.trackable(),
      ])
      setEntries(entriesData)
      setClients(clientsData)
      setTrackableInvoices(trackableData)

      // Check for running entry
      const running = entriesData.find(e => e.is_running)
      if (running) {
        setRunningEntry(running)
        startTimerInterval(running)
      } else {
        setRunningEntry(null)
        setTimerDisplay(0)
        if (timerRef.current) clearInterval(timerRef.current)
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to load data')
    }
    setLoading(false)
  }

  useRefetchOnReturn(() => loadData())

  const buildParams = () => {
    const params = new URLSearchParams()
    if (filterClient) params.set('client_id', filterClient)
    if (filterInvoiced !== '') params.set('invoiced', filterInvoiced)
    return params.toString()
  }

  const resetForm = () => {
    setForm({ client_id: '', group_name: '', description: '', hourly_rate: '', duration_hours: '', duration_minutes: '', is_prepaid: false, invoice_id: '' })
    setEditingId(null)
    setShowForm(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // "Already invoiced" requires an invoice link — that's the whole point (countdown).
    if (form.is_prepaid && !form.invoice_id) {
      if (formClientInvoices.length === 0) {
        toast.error('No invoices with hourly items for this client. Create one first or uncheck "Already invoiced".')
      } else {
        toast.error('Select an invoice from the list')
      }
      return
    }

    setSaving(true)
    try {
      const hours = parseInt(form.duration_hours || '0')
      const minutes = parseInt(form.duration_minutes || '0')
      const durationSeconds = (hours * 3600) + (minutes * 60)

      const data = {
        client_id: Number(form.client_id),
        group_name: form.group_name.trim() || null,
        description: form.description,
        hourly_rate: Number(form.hourly_rate),
        duration_seconds: durationSeconds,
        is_prepaid: form.is_prepaid && !!form.invoice_id,
        invoice_id: form.is_prepaid && form.invoice_id ? Number(form.invoice_id) : null,
      }

      if (editingId) {
        await timeEntries.update(editingId, data)
        toast.success('Time entry updated')
      } else {
        await timeEntries.create(data)
        toast.success('Time entry created')
      }

      // Save description to suggestions
      if (form.description && !savedDescriptions.includes(form.description)) {
        const updated = [...new Set([form.description, ...savedDescriptions])].slice(0, 50)
        setSavedDescriptions(updated)
        localStorage.setItem('timeTrackingDescriptions', JSON.stringify(updated))
      }

      // Save rate per client
      if (form.client_id && form.hourly_rate) {
        const updatedRates = { ...savedRates, [form.client_id]: form.hourly_rate }
        setSavedRates(updatedRates)
        localStorage.setItem('timeTrackingRates', JSON.stringify(updatedRates))
      }

      resetForm()
      loadData()
    } catch (e: any) {
      toast.error(e.message || 'Failed to save')
    }
    setSaving(false)
  }

  // Assign the current selection to a group (existing name, a new name, or null
  // to remove). Regroups local state immediately, then reconciles via loadData.
  const applyBulkGroup = async (group: string | null) => {
    const ids = selectedIds
    if (ids.length === 0) return
    try {
      await timeEntries.bulkUpdateGroup(ids, group)
      setEntries(prev => prev.map(e => (ids.includes(e.id) ? { ...e, group_name: group } : e)))
      toast.success(group ? `Assigned to "${group}"` : 'Group removed')
      setShowGroupModal(false)
      setGroupValue('')
      setSelectedIds([])
      loadData()
    } catch (e: any) {
      toast.error(e.message || 'Failed to update group')
    }
  }

  const handleBulkGroup = () => applyBulkGroup(groupValue.trim() || null)

  // Select all billable entries in a group and open the convert-to-invoice
  // modal — one click to invoice a whole group, no manual checkbox picking.
  const invoiceGroup = (groupKey: string) => {
    const billable = entries.filter(e => (e.group_name || '') === groupKey && !e.is_invoiced && !e.is_running)
    if (billable.length === 0) { toast.info('No billable entries in this group'); return }
    const clientIds = new Set(billable.map(e => e.client_id))
    if (clientIds.size > 1) { toast.error('This group has entries from several clients — invoice each client separately'); return }
    setSelectedIds(billable.map(e => e.id))
    setShowConvertModal(true)
  }

  // Remove the group from every entry in a section (one click on the header).
  const handleUngroup = async (groupKey: string) => {
    const ids = entries.filter(e => (e.group_name || '') === groupKey).map(e => e.id)
    if (ids.length === 0) return
    try {
      await timeEntries.bulkUpdateGroup(ids, null)
      setEntries(prev => prev.map(e => (ids.includes(e.id) ? { ...e, group_name: null } : e)))
      toast.success('Ungrouped')
      loadData()
    } catch (e: any) {
      toast.error(e.message || 'Failed to ungroup')
    }
  }

  const handleEdit = (entry: TimeEntry) => {
    const hours = Math.floor(entry.duration_seconds / 3600)
    const minutes = Math.floor((entry.duration_seconds % 3600) / 60)
    setForm({
      client_id: String(entry.client_id),
      group_name: entry.group_name || '',
      description: entry.description,
      hourly_rate: String(entry.hourly_rate),
      duration_hours: String(hours),
      duration_minutes: String(minutes),
      is_prepaid: !!entry.is_prepaid,
      invoice_id: entry.invoice_id ? String(entry.invoice_id) : '',
    })
    setEditingId(entry.id)
    setShowForm(true)
  }

  const handleDelete = (id: number) => {
    setConfirmModal({
      open: true,
      title: 'Delete Time Entry',
      message: 'Are you sure you want to delete this time entry?',
      onConfirm: async () => {
        setConfirmModal(m => ({ ...m, open: false }))
        try {
          await timeEntries.delete(id)
          toast.success('Time entry deleted')
          loadData()
        } catch (e: any) {
          toast.error(e.message || 'Failed to delete')
        }
      }
    })
  }

  const handleStart = async (entry: TimeEntry) => {
    try {
      const updated = await timeEntries.start(entry.id)
      setRunningEntry(updated)
      startTimerInterval(updated)
      loadData()
    } catch (e: any) {
      toast.error(e.message || 'Failed to start timer')
    }
  }

  const handleStop = (entry: TimeEntry) => {
    // Calculate current SESSION elapsed minutes (round up)
    const startedAt = new Date(entry.started_at!).getTime()
    const elapsed = Math.floor((Date.now() - startedAt) / 1000)
    const roundedMinutes = Math.max(1, Math.ceil(elapsed / 60))
    setStoppingEntry(entry)
    setStopMinutes(String(roundedMinutes))
  }

  const confirmStop = async () => {
    if (!stoppingEntry) return
    const minutes = parseInt(stopMinutes)
    if (!minutes || minutes <= 0) { toast.error('Enter valid minutes'); return }
    try {
      await timeEntries.stop(stoppingEntry.id, minutes)
      setStoppingEntry(null)
      setStopMinutes('')
      setRunningEntry(null)
      setTimerDisplay(0)
      if (timerRef.current) clearInterval(timerRef.current)
      toast.success(`Stopped — ${minutes} min. saved`)
      loadData()
    } catch (e: any) {
      toast.error(e.message || 'Failed to stop timer')
    }
  }

  const cancelStop = () => {
    setStoppingEntry(null)
    setStopMinutes('')
  }

  const handleAddMinutes = async (entryId: number) => {
    const minutes = parseInt(addMinutesValue)
    if (!minutes || minutes <= 0) return
    try {
      await timeEntries.addTime(entryId, minutes)
      toast.success(`+${minutes} min. added`)
      setAddMinutesId(null)
      setAddMinutesValue('')
      loadData()
    } catch (e: any) {
      toast.error(e.message || 'Failed to add time')
    }
  }

  const handleAddPresetMinutes = async (entryId: number, minutes: number) => {
    try {
      await timeEntries.addTime(entryId, minutes)
      toast.success(`+${minutes} min. added`)
      loadData()
    } catch (e: any) {
      toast.error(e.message || 'Failed to add time')
    }
  }

  const toggleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleConvertToInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const invoice = await timeEntries.convertToInvoice({
        time_entry_ids: selectedIds,
        ...convertForm,
      })
      toast.success('Invoice created from time entries!')
      setSelectedIds([])
      setShowConvertModal(false)
      router.push(`/invoices/edit?id=${invoice.id}`)
    } catch (e: any) {
      toast.error(e.message || 'Failed to convert')
    }
    setSaving(false)
  }

  // Editable = not invoiced, OR invoiced but prepaid (still being worked on)
  const isEditable = (entry: TimeEntry) => !entry.is_invoiced || !!entry.is_prepaid

  // Active prepaid = marked as prepaid AND still has time remaining (or no invoice link).
  // When remaining hours hit 0, the entry visually becomes regular "Invoiced".
  const isActivePrepaid = (entry: TimeEntry) => {
    if (!entry.is_prepaid) return false
    if (!entry.invoice_id) return true
    const inv = trackableMap[entry.invoice_id]
    if (!inv) return true
    return inv.remaining_hours > 0
  }

  // For active prepaid entries with an invoice link, display COUNTDOWN of remaining
  // time/value instead of accumulated worked time.
  // liveSeconds = current running session elapsed seconds (so countdown ticks down live).
  const getRowDisplay = (entry: TimeEntry, liveSeconds: number = 0) => {
    if (entry.is_prepaid && entry.invoice_id) {
      const inv = trackableMap[entry.invoice_id]
      if (inv && inv.remaining_hours > 0) {
        const remainingSec = Math.max(0, Math.round(inv.remaining_hours * 3600) - liveSeconds)
        return {
          seconds: remainingSec,
          money: (remainingSec / 3600) * Number(entry.hourly_rate),
          isCountdown: true,
        }
      }
    }
    const sec = entry.duration_seconds + liveSeconds
    return {
      seconds: sec,
      money: (sec / 3600) * Number(entry.hourly_rate),
      isCountdown: false,
    }
  }

  // Trackable invoices for currently selected form client (only sent/draft/etc with hours remaining)
  const formClientInvoices = useMemo(() => {
    if (!form.client_id) return [] as TrackableInvoice[]
    return trackableInvoices.filter(inv => inv.client_id === Number(form.client_id))
  }, [trackableInvoices, form.client_id])

  // Distinct existing group/department names — used for the form autocomplete.
  const existingGroups = useMemo(
    () => Array.from(new Set(entries.map(e => e.group_name).filter((g): g is string => !!g && g.trim() !== ''))).sort(),
    [entries]
  )

  // Group entries by group_name for the grouped list view; named groups first
  // (alphabetical), ungrouped entries in a trailing bucket. Each group carries
  // its subtotal (seconds + money).
  const groupedEntries = useMemo(() => {
    const map = new Map<string, TimeEntry[]>()
    for (const e of entries) {
      const key = e.group_name || ''
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    const groups = Array.from(map.entries()).map(([key, list]) => ({
      key,
      label: key || 'Ungrouped',
      entries: list,
      seconds: list.reduce((s, e) => s + e.duration_seconds, 0),
      money: list.reduce((s, e) => s + (e.duration_seconds / 3600) * Number(e.hourly_rate), 0),
    }))
    groups.sort((a, b) => (a.key === '' ? 1 : b.key === '' ? -1 : a.label.localeCompare(b.label)))
    return groups
  }, [entries])

  // Only insert group headers when it adds information: more than one group,
  // or a single, explicitly-named group.
  const showGroups = groupedEntries.length > 1 || (groupedEntries.length === 1 && groupedEntries[0].key !== '')

  // Group metadata keyed by group_name, for subtotal lookup while rendering.
  const groupMeta = useMemo(() => new Map(groupedEntries.map(g => [g.key, g])), [groupedEntries])

  // Entries ordered so same-group rows are adjacent (matches groupedEntries order).
  const orderedEntries = useMemo(
    () => (showGroups ? groupedEntries.flatMap(g => g.entries) : entries),
    [showGroups, groupedEntries, entries]
  )

  // Quick lookup invoice by id
  const trackableMap = useMemo(() => {
    const map: Record<number, TrackableInvoice> = {}
    trackableInvoices.forEach(inv => { map[inv.id] = inv })
    return map
  }, [trackableInvoices])

  // Group non-invoiced entries by client for convert selection
  const selectableEntries = entries.filter(e => !e.is_invoiced && !e.is_running)
  const selectedEntries = entries.filter(e => selectedIds.includes(e.id))
  const selectedClientIds = [...new Set(selectedEntries.map(e => e.client_id))]
  const canConvert = selectedIds.length > 0 && selectedClientIds.length === 1

  // An empty list is different from an empty account: a client filter, or any
  // invoiced-filter other than the default "Not invoiced", means results were
  // filtered out — say so instead of "create your first entry".
  const filtersActive = !!filterClient || filterInvoiced !== 'false'
  const resetFilters = () => { setFilterClient(''); setFilterInvoiced('') }

  if (loading) return <TimeTrackingSkeleton />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">Time Tracking</h1>
          <p className="text-gray-500 dark:text-gray-400">Track time and convert to invoices</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm) }}
          className="w-full sm:w-auto text-center btn-gradient px-6 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 bd-clip-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Entry
        </button>
      </div>

      {/* Running Timer Banner */}
      {runningEntry && (
        <div className="rounded-xl border p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          style={{ backgroundColor: 'var(--t-accent-soft)', borderColor: 'var(--t-accent)' }}>
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <div>
              <p className="font-semibold text-gray-800 dark:text-gray-100">{runningEntry.description}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{runningEntry.client?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-2xl font-mono font-bold block" style={{ color: 'var(--t-accent)' }}>
                {formatDuration(timerDisplay)}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                total: {formatDuration((runningEntry.duration_seconds || 0) + timerDisplay)}
              </span>
            </div>
            {stoppingEntry?.id === runningEntry.id ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-600 dark:text-gray-300">Add:</span>
                <input
                  type="number"
                  min="1"
                  value={stopMinutes}
                  onChange={e => setStopMinutes(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') confirmStop(); if (e.key === 'Escape') cancelStop() }}
                  autoFocus
                  className="w-20 px-3 py-2 text-sm font-mono rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-center"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">min.</span>
                <button
                  onClick={confirmStop}
                  className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium text-sm transition-colors"
                >
                  Save & Stop
                </button>
                <button
                  onClick={cancelStop}
                  className="px-3 py-2 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleStop(runningEntry)}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                  <rect x="3" y="3" width="10" height="10" rx="1" />
                </svg>
                Stop
              </button>
            )}
          </div>
        </div>
      )}

      {/* New / Edit Entry Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700/60 prism-card p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
            {editingId ? 'Edit Time Entry' : 'New Time Entry'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client *</label>
                <div ref={clientRef} className="relative">
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={e => {
                      setClientSearch(e.target.value)
                      setShowClientSuggestions(true)
                      if (form.client_id) setForm({ ...form, client_id: '' })
                    }}
                    onFocus={() => setShowClientSuggestions(true)}
                    required
                    placeholder="Search client..."
                    autoComplete="off"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:border-transparent transition-colors"
                    style={{ ['--tw-ring-color' as string]: 'var(--t-accent)' }}
                  />
                  {showClientSuggestions && (
                    <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {(() => {
                        const filtered = clients.filter(c => !clientSearch || c.name.toLowerCase().includes(clientSearch.toLowerCase()))
                        if (filtered.length === 0) {
                          return <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">No clients found</div>
                        }
                        return filtered.map(c => (
                          <div
                            key={c.id}
                            onClick={() => {
                              const clientId = String(c.id)
                              setForm({ ...form, client_id: clientId, hourly_rate: savedRates[clientId] || form.hourly_rate })
                              setClientSearch(c.name)
                              setShowClientSuggestions(false)
                            }}
                            className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
                          >
                            <span className={c.has_uncollectible ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-800 dark:text-gray-100'}>{c.name}</span>
                            {c.has_uncollectible && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500/15 text-red-600 dark:text-red-400 whitespace-nowrap" title="This client doesn't pay (written-off invoice)">Won&apos;t pay</span>
                            )}
                          </div>
                        ))
                      })()}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hourly Rate (€) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.hourly_rate}
                  onChange={e => setForm({ ...form, hourly_rate: e.target.value })}
                  required
                  placeholder="0.00"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:border-transparent transition-colors"
                  style={{ ['--tw-ring-color' as string]: 'var(--t-accent)' }}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Group <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={form.group_name}
                    onChange={e => { setForm({ ...form, group_name: e.target.value }); setShowGroupSuggestions(true) }}
                    onFocus={() => setShowGroupSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowGroupSuggestions(false), 150)}
                    placeholder="e.g. Marketing…"
                    autoComplete="off"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:border-transparent transition-colors"
                    style={{ ['--tw-ring-color' as string]: 'var(--t-accent)' }}
                  />
                  {showGroupSuggestions && existingGroups.filter(g => g.toLowerCase().includes(form.group_name.toLowerCase())).length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {existingGroups.filter(g => g.toLowerCase().includes(form.group_name.toLowerCase())).map(g => (
                        <div
                          key={g}
                          onMouseDown={() => { setForm(prev => ({ ...prev, group_name: g })); setShowGroupSuggestions(false) }}
                          className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 text-sm"
                        >
                          {g}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Manual Duration <span className="font-normal text-gray-400">(optional)</span></label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={form.duration_hours}
                    onFocus={e => e.currentTarget.select()}
                    onChange={e => setForm({ ...form, duration_hours: e.target.value })}
                    placeholder="0"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:border-transparent transition-colors"
                    style={{ ['--tw-ring-color' as string]: 'var(--t-accent)' }}
                  />
                  <span className="text-gray-500 dark:text-gray-400 text-sm">val.</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={form.duration_minutes}
                    onFocus={e => e.currentTarget.select()}
                    onChange={e => setForm({ ...form, duration_minutes: e.target.value })}
                    placeholder="0"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:border-transparent transition-colors"
                    style={{ ['--tw-ring-color' as string]: 'var(--t-accent)' }}
                  />
                  <span className="text-gray-500 dark:text-gray-400 text-sm">min.</span>
                </div>
              </div>
            </div>

            {/* Prepaid SF — already invoiced */}
            <div className="rounded-lg border border-dashed p-3 sm:p-4" style={{ borderColor: 'var(--t-border)', background: 'var(--t-bg-elevated)' }}>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_prepaid}
                  onChange={e => setForm({ ...form, is_prepaid: e.target.checked, invoice_id: e.target.checked ? form.invoice_id : '' })}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 dark:border-gray-600"
                  style={{ accentColor: 'var(--t-accent)' }}
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Already invoiced</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Check this if you already issued the invoice in advance and are now working off the hours
                  </p>
                </div>
              </label>
              {form.is_prepaid && (
                <div className="mt-3 pl-6">
                  {!form.client_id ? (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">Select a client first</p>
                  ) : formClientInvoices.length === 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs text-yellow-600 dark:text-yellow-400">
                        No invoices with hourly items found for this client. Create one first to track work against it.
                      </p>
                      <Link href="/invoices/new" className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded transition-colors" style={{ background: 'var(--t-accent-soft)', color: 'var(--t-accent)' }}>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create Invoice
                      </Link>
                    </div>
                  ) : (
                    <select
                      value={form.invoice_id}
                      onChange={e => setForm({ ...form, invoice_id: e.target.value })}
                      required={form.is_prepaid}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:border-transparent transition-colors"
                      style={{ ['--tw-ring-color' as string]: 'var(--t-accent)' }}
                    >
                      <option value="">Select invoice...</option>
                      {formClientInvoices.map(inv => (
                        <option key={inv.id} value={inv.id}>
                          {inv.series} {inv.number} — {inv.worked_hours} of {inv.total_hours} hrs used, {inv.remaining_hours} hrs remaining
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>

            <div ref={descRef} className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description / Task *</label>
              <input
                type="text"
                value={form.description}
                onChange={e => { setForm({ ...form, description: e.target.value }); setShowDescSuggestions(true) }}
                onFocus={() => setShowDescSuggestions(true)}
                required
                placeholder="e.g. Website development, Bug fixing..."
                autoComplete="off"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:border-transparent transition-colors"
                style={{ ['--tw-ring-color' as string]: 'var(--t-accent)' }}
              />
              {showDescSuggestions && savedDescriptions.filter(d => d.toLowerCase().includes(form.description.toLowerCase())).length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {savedDescriptions
                    .filter(d => d.toLowerCase().includes(form.description.toLowerCase()))
                    .slice(0, 8)
                    .map((desc, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => { setForm({ ...form, description: desc }); setShowDescSuggestions(false) }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        {desc}
                      </button>
                    ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="btn-gradient px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 bd-clip-sm"
              >
                {saving ? 'Saving...' : editingId ? 'Update Entry' : 'Create Entry'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2.5 rounded-lg font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="w-full sm:w-64">
          <SearchableSelect
            value={filterClient}
            onChange={setFilterClient}
            options={clients.map(c => ({ value: String(c.id), label: c.name }))}
            allLabel="All Clients"
            placeholder="Search client…"
          />
        </div>
        <select
          value={filterInvoiced}
          onChange={e => setFilterInvoiced(e.target.value)}
          className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm"
        >
          <option value="false">Not Invoiced</option>
          <option value="true">Invoiced</option>
          <option value="">All</option>
        </select>

        {selectedIds.length > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => { setGroupValue(''); setShowGroupModal(true) }}
              className="px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 border"
              style={{ borderColor: 'var(--t-border)', color: 'var(--t-accent)', background: 'var(--t-accent-soft)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Assign to group ({selectedIds.length})
            </button>
            <button
              onClick={() => canConvert ? setShowConvertModal(true) : toast.error('Select entries from one client only')}
              disabled={!canConvert}
              className="px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: 'var(--t-accent)', color: '#fff' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Convert to Invoice ({selectedIds.length})
            </button>
          </div>
        )}
      </div>

      {/* Entries Table */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700/60 overflow-hidden">
        {/* Desktop */}
        <div className="hidden md:block">
          <table className="w-full">
            <thead className="sticky top-0 z-10 text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700">
              <tr className="border-b border-gray-100 dark:border-gray-700/60">
                <th className="px-4 py-3.5 text-left w-10">
                  {selectableEntries.length > 0 && (
                    <input
                      type="checkbox"
                      checked={selectableEntries.length > 0 && selectableEntries.every(e => selectedIds.includes(e.id))}
                      onChange={() => {
                        const allSelected = selectableEntries.every(e => selectedIds.includes(e.id))
                        setSelectedIds(allSelected ? [] : selectableEntries.map(e => e.id))
                      }}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
                      style={{ accentColor: 'var(--t-accent)' }}
                    />
                  )}
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-medium uppercase tracking-wider">Client</th>
                <th className="px-4 py-3.5 text-left text-xs font-medium uppercase tracking-wider">Description</th>
                <th className="px-4 py-3.5 text-left text-xs font-medium uppercase tracking-wider">Rate</th>
                <th className="px-4 py-3.5 text-left text-xs font-medium uppercase tracking-wider">Duration</th>
                <th className="px-4 py-3.5 text-left text-xs font-medium uppercase tracking-wider">Total</th>
                <th className="px-4 py-3.5 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                <th className="px-4 py-3.5 text-right text-xs font-medium uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="text-gray-400 dark:text-gray-500">
                      <svg className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="font-medium">{filtersActive ? 'No entries match the current filters' : 'No time entries yet'}</p>
                      {filtersActive ? (
                        <button onClick={resetFilters} className="text-sm mt-1 font-medium" style={{ color: 'var(--t-accent)' }}>Clear filters</button>
                      ) : (
                        <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">Create your first time entry to start tracking</p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                orderedEntries.map((entry, i, arr) => {
                  const hours = entry.duration_seconds / 3600
                  const total = hours * entry.hourly_rate
                  const gChanged = showGroups && (i === 0 || (arr[i - 1].group_name || '') !== (entry.group_name || ''))
                  const g = gChanged ? groupMeta.get(entry.group_name || '') : null

                  return (
                    <Fragment key={entry.id}>
                    {g && (g.key === '' ? (
                      // Ungrouped entries: a clear divider band (no confusing label).
                      <tr aria-hidden="true">
                        <td colSpan={8} className="p-0">
                          <div className="h-7 border-y border-gray-200 dark:border-gray-700" style={{ background: 'var(--t-bg-elevated)' }} />
                        </td>
                      </tr>
                    ) : (
                      <tr style={{ background: 'var(--t-accent-soft)', borderTop: '3px solid var(--t-accent)', borderBottom: '1px solid var(--t-border)' }}>
                        <td colSpan={8} className="px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <span className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--t-accent)' }}>{g.label}</span>
                              {g.entries.some(e => !e.is_invoiced && !e.is_running) && (
                                <button
                                  onClick={() => invoiceGroup(g.key)}
                                  className="text-[11px] font-semibold px-2.5 py-1 rounded text-white transition-colors"
                                  style={{ background: 'var(--t-accent)' }}
                                  title="Create an invoice from this group's entries"
                                >
                                  Invoice
                                </button>
                              )}
                              <button
                                onClick={() => handleUngroup(g.key)}
                                className="text-[11px] font-semibold px-2.5 py-1 rounded-full border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-300 hover:text-red-500 hover:border-red-400 dark:hover:border-red-500 transition-colors"
                                title="Remove this group from its entries"
                              >
                                Ungroup
                              </button>
                            </div>
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-100 tabular-nums">
                              {g.entries.length} entr{g.entries.length === 1 ? 'y' : 'ies'} · {formatHours(g.seconds)} · €{g.money.toFixed(2)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    <tr className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${isActivePrepaid(entry) ? 'bg-blue-50/60 dark:bg-blue-500/5' : ''}`} style={isActivePrepaid(entry) ? { boxShadow: 'inset 3px 0 0 #3b82f6' } : {}}>
                      <td className="px-4 py-3">
                        {!entry.is_invoiced && !entry.is_running && (
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(entry.id)}
                            onChange={() => toggleSelect(entry.id)}
                            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
                            style={{ accentColor: 'var(--t-accent)' }}
                          />
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-800 dark:text-gray-100 font-medium text-sm">
                        {entry.client?.name || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-sm">
                        <div>{entry.description}</div>
                        {entry.is_prepaid && entry.invoice_id && trackableMap[entry.invoice_id] && (
                          <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium" style={{ background: 'var(--t-accent-soft)', color: 'var(--t-accent)' }}>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            {trackableMap[entry.invoice_id].series} {trackableMap[entry.invoice_id].number}
                            {' · '}
                            {trackableMap[entry.invoice_id].remaining_hours > 0
                              ? `${trackableMap[entry.invoice_id].remaining_hours} hrs remaining`
                              : 'complete'}
                          </div>
                        )}
                        {entry.is_prepaid && !entry.invoice_id && (
                          <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Edit to link an invoice (countdown won't work)
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-sm">€{Number(entry.hourly_rate).toFixed(2)}/val.</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {(() => {
                            const liveSec = entry.is_running && entry.id === runningEntry?.id ? timerDisplay : 0
                            const display = getRowDisplay(entry, liveSec)
                            if (entry.is_running) {
                              return (
                                <>
                                  <span className="font-mono font-bold" style={{ color: display.isCountdown ? '#3b82f6' : 'var(--t-accent)' }}>
                                    {entry.id === runningEntry?.id ? formatDuration(display.seconds) : '...'}
                                  </span>
                                  {entry.id === runningEntry?.id && !display.isCountdown && (
                                    <span className="text-gray-400 dark:text-gray-500 text-xs font-mono">
                                      (total: {formatDuration((entry.duration_seconds || 0) + timerDisplay)})
                                    </span>
                                  )}
                                  <span className="text-gray-400 dark:text-gray-500 text-xs">
                                    ({formatHours(display.seconds)}{display.isCountdown ? ' remaining' : ''})
                                  </span>
                                </>
                              )
                            }
                            return (
                              <>
                                <span className={`font-mono ${display.isCountdown ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}>
                                  {formatDuration(display.seconds)}
                                </span>
                                <span className="text-gray-400 dark:text-gray-500 text-xs">
                                  ({formatHours(display.seconds)}{display.isCountdown ? ' remaining' : ''})
                                </span>
                              </>
                            )
                          })()}
                          {isEditable(entry) && !entry.is_running && (
                            <>
                              {addMinutesId === entry.id ? (
                                <span className="inline-flex items-center gap-1 ml-1">
                                  <input
                                    type="number"
                                    min="1"
                                    value={addMinutesValue}
                                    onChange={e => setAddMinutesValue(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleAddMinutes(entry.id); if (e.key === 'Escape') { setAddMinutesId(null); setAddMinutesValue('') } }}
                                    placeholder="min"
                                    autoFocus
                                    className="w-16 px-1.5 py-0.5 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                                  />
                                  <button
                                    onClick={() => handleAddMinutes(entry.id)}
                                    className="p-0.5 rounded text-green-500 hover:bg-green-500/10 transition-colors"
                                    title="Add"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => { setAddMinutesId(null); setAddMinutesValue('') }}
                                    className="p-0.5 rounded text-gray-400 hover:bg-gray-500/10 transition-colors"
                                    title="Cancel"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1">
                                  {[5, 15, 30].map(m => (
                                    <button
                                      key={m}
                                      onClick={() => handleAddPresetMinutes(entry.id, m)}
                                      className="px-1.5 py-0.5 text-xs rounded border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                                      title={`Add ${m} minutes`}
                                    >
                                      +{m}
                                    </button>
                                  ))}
                                  <button
                                    onClick={() => { setAddMinutesId(entry.id); setAddMinutesValue('') }}
                                    className="px-1.5 py-0.5 text-xs rounded border border-dashed border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-500 dark:hover:text-gray-400 transition-colors"
                                    title="Add custom minutes"
                                  >
                                    +min
                                  </button>
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-800 dark:text-gray-100 text-sm font-medium">
                        {(() => {
                          const liveSec = entry.is_running && entry.id === runningEntry?.id ? timerDisplay : 0
                          const display = getRowDisplay(entry, liveSec)
                          return (
                            <span className={display.isCountdown ? 'text-blue-600 dark:text-blue-400' : ''}>
                              €{display.money.toFixed(2)}
                            </span>
                          )
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        {entry.is_running ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            Running
                          </span>
                        ) : isActivePrepaid(entry) ? (
                          <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
                            Prepaid
                          </span>
                        ) : entry.is_invoiced ? (
                          <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400">
                            Invoiced
                          </span>
                        ) : (
                          <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">
                            Not Invoiced
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {isEditable(entry) && (
                            <>
                              {entry.is_running ? (
                                <button
                                  onClick={() => handleStop(entry)}
                                  className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                  title="Stop"
                                >
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                                    <rect x="3" y="3" width="10" height="10" rx="1" />
                                  </svg>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleStart(entry)}
                                  className="p-2 hover:bg-green-500/10 rounded-lg transition-colors"
                                  style={{ color: 'var(--t-accent)' }}
                                  title="Start"
                                >
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M4 2l10 6-10 6V2z" />
                                  </svg>
                                </button>
                              )}
                              {!entry.is_running && (
                                <>
                                  <button
                                    onClick={() => handleEdit(entry)}
                                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                                    title="Edit"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleDelete(entry.id)}
                                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                    title="Delete"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    </Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden">
          {entries.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="text-gray-400 dark:text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>{filtersActive ? 'No entries match the current filters' : 'No time entries yet'}</p>
                {filtersActive && <button onClick={resetFilters} className="text-sm mt-1 font-medium" style={{ color: 'var(--t-accent)' }}>Clear filters</button>}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {orderedEntries.map((entry, i, arr) => {
                const hours = entry.duration_seconds / 3600
                const total = hours * entry.hourly_rate
                const gChanged = showGroups && (i === 0 || (arr[i - 1].group_name || '') !== (entry.group_name || ''))
                const g = gChanged ? groupMeta.get(entry.group_name || '') : null

                return (
                  <Fragment key={entry.id}>
                  {g && (g.key === '' ? (
                    <div aria-hidden="true" className="h-6 border-y border-gray-200 dark:border-gray-700" style={{ background: 'var(--t-bg-elevated)' }} />
                  ) : (
                    <div className="px-4 py-3" style={{ background: 'var(--t-accent-soft)', borderTop: '3px solid var(--t-accent)', borderBottom: '1px solid var(--t-border)' }}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--t-accent)' }}>{g.label}</span>
                          {g.entries.some(e => !e.is_invoiced && !e.is_running) && (
                            <button onClick={() => invoiceGroup(g.key)} className="text-[11px] font-semibold px-2.5 py-1 rounded text-white transition-colors" style={{ background: 'var(--t-accent)' }}>Invoice</button>
                          )}
                          <button onClick={() => handleUngroup(g.key)} className="text-[11px] font-semibold px-2.5 py-1 rounded-full border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-300 hover:text-red-500 hover:border-red-400 transition-colors">Ungroup</button>
                        </div>
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-100 tabular-nums">{formatHours(g.seconds)} · €{g.money.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                  <div className={`p-4 space-y-2 ${isActivePrepaid(entry) ? 'bg-blue-50/60 dark:bg-blue-500/5' : ''}`} style={isActivePrepaid(entry) ? { boxShadow: 'inset 3px 0 0 #3b82f6' } : {}}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {!entry.is_invoiced && !entry.is_running && (
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(entry.id)}
                            onChange={() => toggleSelect(entry.id)}
                            className="w-4 h-4 mt-1 rounded border-gray-300"
                            style={{ accentColor: 'var(--t-accent)' }}
                          />
                        )}
                        <div>
                          <p className="font-medium text-gray-800 dark:text-gray-100">{entry.description}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{entry.client?.name}</p>
                          {entry.is_prepaid && entry.invoice_id && trackableMap[entry.invoice_id] && (
                            <p className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium" style={{ background: 'var(--t-accent-soft)', color: 'var(--t-accent)' }}>
                              {trackableMap[entry.invoice_id].series} {trackableMap[entry.invoice_id].number} · {trackableMap[entry.invoice_id].remaining_hours > 0
                                ? `${trackableMap[entry.invoice_id].remaining_hours} hrs remaining`
                                : 'complete'}
                            </p>
                          )}
                          {entry.is_prepaid && !entry.invoice_id && (
                            <p className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">
                              ⚠ Edit to link an invoice
                            </p>
                          )}
                        </div>
                      </div>
                      {entry.is_running ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                          Running
                        </span>
                      ) : isActivePrepaid(entry) ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">Prepaid</span>
                      ) : entry.is_invoiced ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400">Invoiced</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">Pending</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex gap-4 text-gray-500 dark:text-gray-400">
                        {(() => {
                          const liveSec = entry.is_running && entry.id === runningEntry?.id ? timerDisplay : 0
                          const display = getRowDisplay(entry, liveSec)
                          return (
                            <span className="font-mono">
                              {entry.is_running && entry.id === runningEntry?.id ? (
                                <>
                                  <span style={{ color: display.isCountdown ? '#3b82f6' : 'var(--t-accent)' }}>{formatDuration(display.seconds)}</span>
                                  {!display.isCountdown && (
                                    <span className="text-xs"> (total: {formatDuration((entry.duration_seconds || 0) + timerDisplay)})</span>
                                  )}
                                  {display.isCountdown && <span className="text-xs"> remaining</span>}
                                </>
                              ) : (
                                <span className={display.isCountdown ? 'text-blue-600 dark:text-blue-400' : ''}>
                                  {formatDuration(display.seconds)}
                                  {display.isCountdown && <span className="text-xs ml-1">remaining</span>}
                                </span>
                              )}
                            </span>
                          )
                        })()}
                        <span>€{Number(entry.hourly_rate).toFixed(2)}/val.</span>
                      </div>
                      {(() => {
                        const liveSec = entry.is_running && entry.id === runningEntry?.id ? timerDisplay : 0
                        const display = getRowDisplay(entry, liveSec)
                        return (
                          <span className={`font-medium ${display.isCountdown ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-100'}`}>
                            €{display.money.toFixed(2)}
                          </span>
                        )
                      })()}
                    </div>
                    {isEditable(entry) && (
                      <div className="flex items-center gap-3 pt-1 flex-wrap">
                        {entry.is_running ? (
                          <button onClick={() => handleStop(entry)} className="text-red-500 text-sm font-medium">Stop</button>
                        ) : (
                          <>
                            <button onClick={() => handleStart(entry)} className="text-sm font-medium" style={{ color: 'var(--t-accent)' }}>Start</button>
                            <button onClick={() => handleEdit(entry)} className="text-blue-500 text-sm font-medium">Edit</button>
                            <button onClick={() => handleDelete(entry.id)} className="text-red-400 text-sm font-medium">Delete</button>
                            {addMinutesId === entry.id ? (
                              <span className="inline-flex items-center gap-1">
                                <input
                                  type="number"
                                  min="1"
                                  value={addMinutesValue}
                                  onChange={e => setAddMinutesValue(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') handleAddMinutes(entry.id); if (e.key === 'Escape') { setAddMinutesId(null); setAddMinutesValue('') } }}
                                  placeholder="min"
                                  autoFocus
                                  className="w-16 px-1.5 py-0.5 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                                />
                                <button onClick={() => handleAddMinutes(entry.id)} className="text-green-500 text-sm font-medium">✓</button>
                                <button onClick={() => { setAddMinutesId(null); setAddMinutesValue('') }} className="text-gray-400 text-sm">✕</button>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1">
                                {[5, 15, 30].map(m => (
                                  <button
                                    key={m}
                                    onClick={() => handleAddPresetMinutes(entry.id, m)}
                                    className="text-xs text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-600 px-1.5 py-0.5 rounded hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                                  >
                                    +{m}
                                  </button>
                                ))}
                                <button
                                  onClick={() => { setAddMinutesId(entry.id); setAddMinutesValue('') }}
                                  className="text-xs text-gray-400 dark:text-gray-500 border border-dashed border-gray-300 dark:border-gray-600 px-1.5 py-0.5 rounded hover:text-gray-500 dark:hover:text-gray-400 transition-colors"
                                >
                                  +min
                                </button>
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  </Fragment>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Total summary for selected */}
      {selectedIds.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700/60 prism-card p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium">{selectedIds.length}</span> entries selected
              {' · '}
              <span className="font-mono">
                {formatHours(selectedEntries.reduce((sum, e) => sum + e.duration_seconds, 0))}
              </span>
              {' · '}
              Total: <span className="font-semibold text-gray-800 dark:text-gray-100">
                €{selectedEntries.reduce((sum, e) => sum + (e.duration_seconds / 3600 * e.hourly_rate), 0).toFixed(2)}
              </span>
            </div>
            {!canConvert && selectedClientIds.length > 1 && (
              <p className="text-sm text-red-500">Select entries from one client only</p>
            )}
          </div>
        </div>
      )}

      <AssignGroupModal
        open={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        selectedCount={selectedIds.length}
        existingGroups={existingGroups}
        value={groupValue}
        onChange={setGroupValue}
        onApply={applyBulkGroup}
      />

      <ConvertToInvoiceModal
        open={showConvertModal}
        onClose={() => setShowConvertModal(false)}
        selectedCount={selectedIds.length}
        total={selectedEntries.reduce((sum, e) => sum + (e.duration_seconds / 3600 * e.hourly_rate), 0)}
        form={convertForm}
        setForm={setConvertForm}
        onSubmit={handleConvertToInvoice}
        saving={saving}
      />

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
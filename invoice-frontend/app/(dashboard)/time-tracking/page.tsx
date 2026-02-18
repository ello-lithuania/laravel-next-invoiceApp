'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { timeEntries, clients as clientsApi, Client, TimeEntry } from '@/lib/api'
import { toast } from 'react-toastify'
import { Skeleton } from '@/components/Skeleton'
import ConfirmModal from '@/components/ConfirmModal'

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
    description: '',
    hourly_rate: '',
    duration_hours: '',
    duration_minutes: '',
  })

  // Saved descriptions & rates (localStorage)
  const [savedDescriptions, setSavedDescriptions] = useState<string[]>([])
  const [savedRates, setSavedRates] = useState<Record<string, string>>({})
  const [showDescSuggestions, setShowDescSuggestions] = useState(false)
  const descRef = useRef<HTMLDivElement>(null)

  // Timer
  const [runningEntry, setRunningEntry] = useState<TimeEntry | null>(null)
  const [timerDisplay, setTimerDisplay] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Selection for convert
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [convertForm, setConvertForm] = useState({
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0] })(),
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
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

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
      const [entriesData, clientsData] = await Promise.all([
        timeEntries.list(buildParams()),
        clientsApi.list(),
      ])
      setEntries(entriesData)
      setClients(clientsData)

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

  const buildParams = () => {
    const params = new URLSearchParams()
    if (filterClient) params.set('client_id', filterClient)
    if (filterInvoiced !== '') params.set('invoiced', filterInvoiced)
    return params.toString()
  }

  const resetForm = () => {
    setForm({ client_id: '', description: '', hourly_rate: '', duration_hours: '', duration_minutes: '' })
    setEditingId(null)
    setShowForm(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const hours = parseInt(form.duration_hours || '0')
      const minutes = parseInt(form.duration_minutes || '0')
      const durationSeconds = (hours * 3600) + (minutes * 60)

      const data = {
        client_id: Number(form.client_id),
        description: form.description,
        hourly_rate: Number(form.hourly_rate),
        duration_seconds: durationSeconds,
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

  const handleEdit = (entry: TimeEntry) => {
    const hours = Math.floor(entry.duration_seconds / 3600)
    const minutes = Math.floor((entry.duration_seconds % 3600) / 60)
    setForm({
      client_id: String(entry.client_id),
      description: entry.description,
      hourly_rate: String(entry.hourly_rate),
      duration_hours: String(hours),
      duration_minutes: String(minutes),
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

  // Group non-invoiced entries by client for convert selection
  const selectableEntries = entries.filter(e => !e.is_invoiced && !e.is_running)
  const selectedEntries = entries.filter(e => selectedIds.includes(e.id))
  const selectedClientIds = [...new Set(selectedEntries.map(e => e.client_id))]
  const canConvert = selectedIds.length > 0 && selectedClientIds.length === 1

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
          className="w-full sm:w-auto text-center btn-gradient px-6 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
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
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700/60 p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
            {editingId ? 'Edit Time Entry' : 'New Time Entry'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client *</label>
                <select
                  value={form.client_id}
                  onChange={e => {
                    const clientId = e.target.value
                    setForm({ ...form, client_id: clientId, hourly_rate: savedRates[clientId] || form.hourly_rate })
                  }}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:border-transparent transition-colors"
                  style={{ ['--tw-ring-color' as string]: 'var(--t-accent)' }}
                >
                  <option value="">Select client...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Manual Duration (optional — if not using timer)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={form.duration_hours}
                  onChange={e => setForm({ ...form, duration_hours: e.target.value })}
                  placeholder="0"
                  className="w-24 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:border-transparent transition-colors"
                  style={{ ['--tw-ring-color' as string]: 'var(--t-accent)' }}
                />
                <span className="text-gray-500 dark:text-gray-400 text-sm">val.</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={form.duration_minutes}
                  onChange={e => setForm({ ...form, duration_minutes: e.target.value })}
                  placeholder="0"
                  className="w-24 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:border-transparent transition-colors"
                  style={{ ['--tw-ring-color' as string]: 'var(--t-accent)' }}
                />
                <span className="text-gray-500 dark:text-gray-400 text-sm">min.</span>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="btn-gradient px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
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
        <select
          value={filterClient}
          onChange={e => setFilterClient(e.target.value)}
          className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm"
        >
          <option value="">All Clients</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
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
          <button
            onClick={() => canConvert ? setShowConvertModal(true) : toast.error('Select entries from one client only')}
            disabled={!canConvert}
            className="ml-auto px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: 'var(--t-accent)', color: '#fff' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Convert to Invoice ({selectedIds.length})
          </button>
        )}
      </div>

      {/* Entries Table */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700/60 overflow-hidden">
        {/* Desktop */}
        <div className="hidden md:block">
          <table className="w-full">
            <thead className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50">
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
                      <p className="font-medium">No time entries yet</p>
                      <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">Create your first time entry to start tracking</p>
                    </div>
                  </td>
                </tr>
              ) : (
                entries.map(entry => {
                  const hours = entry.duration_seconds / 3600
                  const total = hours * entry.hourly_rate

                  return (
                    <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
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
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-sm">{entry.description}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-sm">€{Number(entry.hourly_rate).toFixed(2)}/val.</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {entry.is_running ? (
                            <>
                              <span className="font-mono font-bold" style={{ color: 'var(--t-accent)' }}>
                                {entry.id === runningEntry?.id ? formatDuration(timerDisplay) : '...'}
                              </span>
                              {entry.id === runningEntry?.id && (
                                <span className="text-gray-400 dark:text-gray-500 text-xs font-mono">
                                  (total: {formatDuration((entry.duration_seconds || 0) + timerDisplay)})
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-gray-600 dark:text-gray-300 font-mono">{formatDuration(entry.duration_seconds)}</span>
                          )}
                          <span className="text-gray-400 dark:text-gray-500 text-xs">
                            ({formatHours(entry.is_running && entry.id === runningEntry?.id ? (entry.duration_seconds || 0) + timerDisplay : entry.duration_seconds)})
                          </span>
                          {!entry.is_invoiced && !entry.is_running && (
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
                                <button
                                  onClick={() => { setAddMinutesId(entry.id); setAddMinutesValue('') }}
                                  className="px-1.5 py-0.5 text-xs rounded border border-dashed border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-500 dark:hover:text-gray-400 transition-colors"
                                  title="Add minutes"
                                >
                                  +min
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-800 dark:text-gray-100 text-sm font-medium">
                        €{(entry.is_running && entry.id === runningEntry?.id
                          ? (((entry.duration_seconds || 0) + timerDisplay) / 3600 * entry.hourly_rate)
                          : total
                        ).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        {entry.is_running ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            Running
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
                          {!entry.is_invoiced && (
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
                <p>No time entries yet</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {entries.map(entry => {
                const hours = entry.duration_seconds / 3600
                const total = hours * entry.hourly_rate

                return (
                  <div key={entry.id} className="p-4 space-y-2">
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
                        </div>
                      </div>
                      {entry.is_running ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                          Running
                        </span>
                      ) : entry.is_invoiced ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400">Invoiced</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">Pending</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex gap-4 text-gray-500 dark:text-gray-400">
                        <span className="font-mono">
                          {entry.is_running && entry.id === runningEntry?.id
                            ? <><span style={{ color: 'var(--t-accent)' }}>{formatDuration(timerDisplay)}</span> <span className="text-xs">(total: {formatDuration((entry.duration_seconds || 0) + timerDisplay)})</span></>
                            : formatDuration(entry.duration_seconds)
                          }
                        </span>
                        <span>€{Number(entry.hourly_rate).toFixed(2)}/val.</span>
                      </div>
                      <span className="font-medium text-gray-800 dark:text-gray-100">
                        €{(entry.is_running && entry.id === runningEntry?.id
                          ? (((entry.duration_seconds || 0) + timerDisplay) / 3600 * entry.hourly_rate)
                          : total
                        ).toFixed(2)}
                      </span>
                    </div>
                    {!entry.is_invoiced && (
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
                              <button
                                onClick={() => { setAddMinutesId(entry.id); setAddMinutesValue('') }}
                                className="text-xs text-gray-400 dark:text-gray-500 border border-dashed border-gray-300 dark:border-gray-600 px-1.5 py-0.5 rounded hover:text-gray-500 dark:hover:text-gray-400 transition-colors"
                              >
                                +min
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Total summary for selected */}
      {selectedIds.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700/60 p-4">
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

      {/* Convert to Invoice Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4" onClick={() => setShowConvertModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Convert to Invoice</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {selectedIds.length} time entries · €{selectedEntries.reduce((sum, e) => sum + (e.duration_seconds / 3600 * e.hourly_rate), 0).toFixed(2)} total
            </p>
            <form onSubmit={handleConvertToInvoice} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Invoice Date *</label>
                <input
                  type="date"
                  value={convertForm.invoice_date}
                  onChange={e => setConvertForm({ ...convertForm, invoice_date: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date *</label>
                <input
                  type="date"
                  value={convertForm.due_date}
                  onChange={e => setConvertForm({ ...convertForm, due_date: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <textarea
                  value={convertForm.notes}
                  onChange={e => setConvertForm({ ...convertForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                  placeholder="Optional notes for the invoice..."
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-gradient px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create Invoice'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConvertModal(false)}
                  className="px-6 py-2.5 rounded-lg font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
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
    </div>
  )
}

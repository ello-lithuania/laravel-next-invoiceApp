'use client'
import type { FormEvent } from 'react'
import type { TimeEntry, TimeEntryEvent } from '@/lib/api'
import { addOneMonth, formatDate } from '@/lib/utils'

// Bulk-assign the selected time entries to a group. `onApply` handles all three
// paths: a string (existing/new group), or null (remove from group).
export function AssignGroupModal({ open, onClose, selectedCount, existingGroups, value, onChange, onApply }: {
  open: boolean
  onClose: () => void
  selectedCount: number
  existingGroups: string[]
  value: string
  onChange: (v: string) => void
  onApply: (group: string | null) => void
}) {
  if (!open) return null
  const create = () => { if (value.trim()) onApply(value.trim()) }
  return (
    <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">Assign to group</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{selectedCount} entries selected</p>

        {existingGroups.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Pick existing group</p>
            <div className="flex flex-wrap gap-2">
              {existingGroups.map(gname => (
                <button
                  key={gname}
                  onClick={() => onApply(gname)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium border transition-colors"
                  style={{ borderColor: 'var(--t-accent)', color: 'var(--t-accent)', background: 'var(--t-accent-soft)' }}
                >
                  {gname}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
          {existingGroups.length > 0 ? 'Or create new' : 'Group name'}
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') create() }}
            placeholder="e.g. Marketing, IT…"
            autoFocus
            autoComplete="off"
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:border-transparent transition-colors"
            style={{ ['--tw-ring-color' as string]: 'var(--t-accent)' }}
          />
          <button
            onClick={create}
            disabled={!value.trim()}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-40"
            style={{ backgroundColor: 'var(--t-accent)' }}
          >
            Create
          </button>
        </div>

        <div className="flex justify-between items-center mt-5">
          <button
            onClick={() => onApply(null)}
            className="text-sm font-medium text-gray-400 hover:text-red-500 transition-colors"
            title="Remove group from the selected entries"
          >
            Remove from group
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

type ConvertForm = { invoice_date: string; due_date: string; notes: string }

// Turn the selected time entries into an invoice.
export function ConvertToInvoiceModal({ open, onClose, selectedCount, total, form, setForm, onSubmit, saving }: {
  open: boolean
  onClose: () => void
  selectedCount: number
  total: number
  form: ConvertForm
  setForm: (f: ConvertForm) => void
  onSubmit: (e: FormEvent) => void
  saving: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Convert to Invoice</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {selectedCount} time entries · €{total.toFixed(2)} total
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Invoice Date *</label>
            <input
              type="date"
              value={form.invoice_date}
              onChange={e => setForm({ ...form, invoice_date: e.target.value, due_date: addOneMonth(e.target.value) })}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date *</label>
            <input
              type="date"
              value={form.due_date}
              onChange={e => setForm({ ...form, due_date: e.target.value })}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
              placeholder="Optional notes for the invoice..."
            />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="btn-gradient px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 bd-clip-sm"
            >
              {saving ? 'Creating...' : 'Create Invoice'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-lg font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const DAY_MS = 86400000

function monthKeyOf(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabelOf(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
}

// Every month between two keys, gaps included — a silent month is the signal.
function monthsBetween(from: string, to: string): string[] {
  const [fy, fm] = from.split('-').map(Number)
  const [ty, tm] = to.split('-').map(Number)
  const out: string[] = []
  let y = fy, m = fm
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`)
    m++
    if (m > 12) { m = 1; y++ }
  }
  return out
}

function daysAgo(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / DAY_MS))
}

const SOURCE_LABELS: Record<TimeEntryEvent['source'], string> = {
  created: 'created',
  add_time: 'added',
  timer: 'timer',
  edit: 'edited',
  backfill: 'existing total',
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return `${formatDate(iso)}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
}

// How one entry's hours accumulated: month-by-month (empty months included, a
// silent month is the signal) plus every recorded change, newest first.
export function EntryTimelineModal({ open, onClose, entry, events }: {
  open: boolean
  onClose: () => void
  entry: TimeEntry | null
  events: TimeEntryEvent[] | null
}) {
  if (!open || !entry) return null

  const body = (() => {
    if (!events) return <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">Loading…</p>
    if (events.length === 0) return <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">No history recorded for this entry.</p>

    const first = events[0].created_at
    const last = events[events.length - 1].created_at
    const totalHours = entry.duration_seconds / 3600
    const spanDays = Math.max(1, Math.round((new Date(last).getTime() - new Date(first).getTime()) / DAY_MS))
    const onlyBackfill = events.every(e => e.source === 'backfill')

    const buckets = new Map<string, { hours: number; count: number }>()
    for (const e of events) {
      const k = monthKeyOf(e.created_at)
      const b = buckets.get(k) || { hours: 0, count: 0 }
      b.hours += e.seconds_delta / 3600
      b.count++
      buckets.set(k, b)
    }
    const months = monthsBetween(monthKeyOf(first), monthKeyOf(new Date().toISOString()))
    const maxHours = Math.max(...Array.from(buckets.values()).map(b => Math.abs(b.hours)), 0.01)

    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3" style={{ background: 'var(--t-bg-elevated)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Started</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{formatDate(first)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">{daysAgo(first)} days ago</p>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3" style={{ background: 'var(--t-bg-elevated)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Last activity</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{formatDate(last)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">{daysAgo(last)} days ago</p>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3" style={{ background: 'var(--t-bg-elevated)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Pace</p>
            <p className="text-sm font-semibold tabular-nums" style={{ color: 'var(--t-accent)' }}>
              {spanDays >= 30
                ? `${(totalHours / (spanDays / 30.44)).toFixed(1)} h / month`
                : `${totalHours.toFixed(1)} h in ${spanDays} d.`}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">{totalHours.toFixed(2)} h total</p>
          </div>
        </div>

        <div className="space-y-1.5 mb-5">
          {months.map(k => {
            const b = buckets.get(k)
            return (
              <div key={k} className="flex items-center gap-3 text-xs">
                <span className="w-16 shrink-0 text-gray-500 dark:text-gray-400 tabular-nums">{monthLabelOf(k)}</span>
                <div className="flex-1 h-4 rounded-sm overflow-hidden" style={{ background: 'var(--t-bg-elevated)' }}>
                  {b && (
                    <div className="h-full rounded-sm" style={{ width: `${Math.max(2, (Math.abs(b.hours) / maxHours) * 100)}%`, background: 'var(--t-accent)' }} />
                  )}
                </div>
                <span className={`w-24 shrink-0 text-right tabular-nums ${b ? 'text-gray-700 dark:text-gray-200' : 'text-gray-300 dark:text-gray-600'}`}>
                  {b ? `${b.hours.toFixed(2)} h · ${b.count}×` : '—'}
                </span>
              </div>
            )
          })}
        </div>

        {onlyBackfill && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            This entry predates history tracking — its whole total sits on the day it was created. Every change from now on lands on its own date.
          </p>
        )}

        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Changes</p>
        <div className="max-h-56 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/60 border border-gray-200 dark:border-gray-700 rounded-lg">
          {[...events].reverse().map(ev => (
            <div key={ev.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="text-gray-800 dark:text-gray-100 tabular-nums">{formatDateTime(ev.created_at)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{SOURCE_LABELS[ev.source] || ev.source}</p>
              </div>
              <div className="shrink-0 text-right tabular-nums">
                <p className={`font-medium ${ev.seconds_delta < 0 ? 'text-red-500' : 'text-gray-700 dark:text-gray-200'}`}>
                  {ev.seconds_delta >= 0 ? '+' : '−'}{(Math.abs(ev.seconds_delta) / 3600).toFixed(2)} h
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">→ {(ev.total_seconds / 3600).toFixed(2)} h</p>
              </div>
            </div>
          ))}
        </div>
      </>
    )
  })()

  return (
    <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 truncate">{entry.description}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {entry.client?.name}
              {entry.group_name && ` · ${entry.group_name}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {body}
      </div>
    </div>
  )
}


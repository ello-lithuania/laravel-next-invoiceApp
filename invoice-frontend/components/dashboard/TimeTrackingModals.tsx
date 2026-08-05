'use client'
import type { FormEvent } from 'react'
import { addOneMonth } from '@/lib/utils'

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

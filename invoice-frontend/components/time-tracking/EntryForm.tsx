import { FormEvent, useEffect, useRef } from 'react'
import Link from 'next/link'
import type { Client, TrackableInvoice } from '@/lib/api'
import type { EntryFormValues } from './entryFormState'
import { ClientPicker } from './ClientPicker'
import { GroupInput } from './GroupInput'
import { DescriptionInput } from './DescriptionInput'

const inputClass = 'w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:border-transparent transition-colors'
const ringStyle = { ['--tw-ring-color' as string]: 'var(--t-accent)' }

// The add / edit form for one time entry. Fully controlled: values come from
// the parent, every change goes back through `onChange`.
export function EntryForm({
  values, editingId, saving, clients, clientInvoices, savedRates, savedDescriptions, existingGroups,
  onChange, onSubmit, onCancel,
}: {
  values: EntryFormValues
  editingId: number | null
  saving: boolean
  clients: Client[]
  clientInvoices: TrackableInvoice[]
  savedRates: Record<string, string>
  savedDescriptions: string[]
  existingGroups: string[]
  onChange: (patch: Partial<EntryFormValues>) => void
  onSubmit: (e: FormEvent) => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  // The form lives at the top of the page — without this, hitting Edit far down
  // the list looks like nothing happened.
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [editingId])

  return (
    <div ref={ref} className="scroll-mt-24 bg-white dark:bg-gray-800 shadow-xs rounded-xl border border-gray-200 dark:border-gray-700/60 prism-card p-6">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
        {editingId ? 'Edit Time Entry' : 'New Time Entry'}
      </h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client *</label>
            <ClientPicker
              clients={clients}
              selectedId={values.client_id}
              onSelect={client => {
                const clientId = String(client.id)
                onChange({ client_id: clientId, hourly_rate: savedRates[clientId] || values.hourly_rate })
              }}
              onClear={() => onChange({ client_id: '' })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hourly Rate (€) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={values.hourly_rate}
              onChange={e => onChange({ hourly_rate: e.target.value })}
              required
              placeholder="0.00"
              className={inputClass}
              style={ringStyle}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Group <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <GroupInput
              value={values.group_name}
              onChange={group_name => onChange({ group_name })}
              existingGroups={existingGroups}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Manual Duration <span className="font-normal text-gray-400">(optional)</span></label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={values.duration_hours}
                onFocus={e => e.currentTarget.select()}
                onChange={e => onChange({ duration_hours: e.target.value })}
                placeholder="0"
                className={inputClass}
                style={ringStyle}
              />
              <span className="text-gray-500 dark:text-gray-400 text-sm">val.</span>
              <input
                type="number"
                min="0"
                max="59"
                value={values.duration_minutes}
                onFocus={e => e.currentTarget.select()}
                onChange={e => onChange({ duration_minutes: e.target.value })}
                placeholder="0"
                className={inputClass}
                style={ringStyle}
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
              checked={values.is_prepaid}
              onChange={e => onChange({ is_prepaid: e.target.checked, invoice_id: e.target.checked ? values.invoice_id : '' })}
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
          {values.is_prepaid && (
            <div className="mt-3 pl-6">
              {!values.client_id ? (
                <p className="text-xs text-yellow-600 dark:text-yellow-400">Select a client first</p>
              ) : clientInvoices.length === 0 ? (
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
                  value={values.invoice_id}
                  onChange={e => onChange({ invoice_id: e.target.value })}
                  required={values.is_prepaid}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:border-transparent transition-colors"
                  style={ringStyle}
                >
                  <option value="">Select invoice...</option>
                  {clientInvoices.map(inv => (
                    <option key={inv.id} value={inv.id}>
                      {inv.series} {inv.number} — {inv.worked_hours} of {inv.total_hours} hrs used, {inv.remaining_hours} hrs remaining
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        <DescriptionInput
          value={values.description}
          onChange={description => onChange({ description })}
          savedDescriptions={savedDescriptions}
        />

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
            onClick={onCancel}
            className="px-6 py-2.5 rounded-lg font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

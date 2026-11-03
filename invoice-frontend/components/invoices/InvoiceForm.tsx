'use client'
import { useState, useEffect, type FormEvent, type ReactNode } from 'react'
import Link from 'next/link'
import type { Client } from '@/lib/api'
import { formatCurrency, addOneMonth } from '@/lib/utils'
import LineItemsEditor from './LineItemsEditor'
import type { InvoiceFormValues } from './types'

type PickableClient = Pick<Client, 'id' | 'name' | 'has_uncollectible'>

// "create" and "edit" differ in a handful of small details; keeping them in one
// table makes the differences easy to see (and to unify later if wanted).
const MODE_CONFIG = {
  create: {
    autoDueDate: true,
    showClientWarning: true,
    lockFirstItem: true,
    selectOnFocus: true,
    formatMoney: formatCurrency,
    uncollectibleTitle: "This client has a written-off invoice — they don't pay",
    submitLabel: 'Create Invoice',
    savingLabel: 'Creating...',
    submitClass: 'flex-1 sm:flex-initial btn-gradient bd-clip-sm px-8 py-3 font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2',
  },
  edit: {
    autoDueDate: false,
    showClientWarning: false,
    lockFirstItem: false,
    selectOnFocus: false,
    formatMoney: (value: number) => `${value.toFixed(2)} EUR`,
    uncollectibleTitle: "This client doesn't pay (written-off invoice)",
    submitLabel: 'Update Invoice',
    savingLabel: 'Saving...',
    submitClass: 'flex-1 sm:flex-initial btn-gradient px-8 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 bd-clip-sm',
  },
} as const

const inputClass = 'w-full p-3 bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700/60 rounded-lg text-gray-800 dark:text-gray-100 focus:border-blue-500 focus:outline-hidden transition-colors'

interface InvoiceFormProps {
  mode: keyof typeof MODE_CONFIG
  value: InvoiceFormValues
  onChange: (value: InvoiceFormValues) => void
  clients: PickableClient[]
  /** Runs on submit; the page does the API call, toasts and redirect (and handles its own errors). */
  onSubmit: (value: InvoiceFormValues) => Promise<void>
  /** Page-specific block shown between the dates and the line items. */
  children?: ReactNode
}

interface ClientPickerProps {
  clients: PickableClient[]
  clientId: string
  onSelect: (clientId: string) => void
  uncollectibleTitle: string
  showWarning: boolean
}

function ClientPicker({ clients, clientId, onSelect, uncollectibleTitle, showWarning }: ClientPickerProps) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)

  const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).slice(0, 10)
  const selected = clients.find(c => c.id === Number(clientId))

  return (
    <div>
      <label className="block text-gray-500 dark:text-gray-400 text-sm mb-2">Client *</label>
      <div className="relative">
        <input
          type="text"
          placeholder="Search client..."
          value={open ? search : (selected?.name || '')}
          onChange={(e) => {
            setSearch(e.target.value)
            setOpen(true)
            if (!e.target.value) onSelect('')
          }}
          onFocus={() => setOpen(true)}
          className={inputClass}
          required={!clientId}
        />
        {open && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700/60 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-3 text-gray-400 dark:text-gray-500">No clients found</div>
            ) : (
              filtered.map(c => (
                <div
                  key={c.id}
                  onClick={() => {
                    onSelect(String(c.id))
                    setSearch('')
                    setOpen(false)
                  }}
                  className="p-3 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer transition-colors flex items-center gap-2"
                >
                  <span className={c.has_uncollectible ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-800 dark:text-gray-100'}>{c.name}</span>
                  {c.has_uncollectible && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500/15 text-red-600 dark:text-red-400 whitespace-nowrap" title={uncollectibleTitle}>
                      Won&apos;t pay
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        )}
        {/* Invisible backdrop: a click anywhere else closes the dropdown. */}
        {open && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
        )}
      </div>
      {showWarning && selected?.has_uncollectible && (
        <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">⚠ This client has a written-off invoice — they don&apos;t pay.</p>
      )}
    </div>
  )
}

export default function InvoiceForm({ mode, value, onChange, clients, onSubmit, children }: InvoiceFormProps) {
  const config = MODE_CONFIG[mode]
  const [savedDescriptions, setSavedDescriptions] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('savedDescriptions')
    if (saved) setSavedDescriptions(JSON.parse(saved))
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    // Remember new descriptions for the autocomplete, even if the save then fails.
    const newDescriptions = value.items.map(i => i.description).filter(d => d && !savedDescriptions.includes(d))
    if (newDescriptions.length > 0) {
      const updated = [...new Set([...savedDescriptions, ...newDescriptions])]
      localStorage.setItem('savedDescriptions', JSON.stringify(updated))
    }
    try {
      await onSubmit(value)
    } finally {
      setSaving(false)
    }
  }

  const total = Number(value.items.reduce((sum, item) => sum + item.quantity * item.price, 0).toFixed(2))

  return (
    <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl border border-gray-200 dark:border-gray-700/60 prism-card p-6">
      <form onSubmit={handleSubmit}>
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <ClientPicker
            clients={clients}
            clientId={value.client_id}
            onSelect={(clientId) => onChange({ ...value, client_id: clientId })}
            uncollectibleTitle={config.uncollectibleTitle}
            showWarning={config.showClientWarning}
          />
          <div>
            <label className="block text-gray-500 dark:text-gray-400 text-sm mb-2">Invoice Date *</label>
            <input
              type="date"
              value={value.invoice_date}
              onChange={(e) => onChange({
                ...value,
                invoice_date: e.target.value,
                ...(config.autoDueDate && { due_date: addOneMonth(e.target.value) }),
              })}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className="block text-gray-500 dark:text-gray-400 text-sm mb-2">Due Date *</label>
            <input
              type="date"
              value={value.due_date}
              onChange={(e) => onChange({ ...value, due_date: e.target.value })}
              className={inputClass}
              required
            />
          </div>
        </div>

        {children}

        <LineItemsEditor
          items={value.items}
          onChange={(items) => onChange({ ...value, items })}
          savedDescriptions={savedDescriptions}
          lockFirstItem={config.lockFirstItem}
          selectOnFocus={config.selectOnFocus}
          formatMoney={config.formatMoney}
        />

        <div className="mb-6">
          <label className="block text-gray-500 dark:text-gray-400 text-sm mb-2">Notes</label>
          <textarea
            value={value.notes}
            onChange={(e) => onChange({ ...value, notes: e.target.value })}
            className={inputClass}
            rows={2}
          />
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-700/60">
          <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">Total: {config.formatMoney(total)}</div>
          <div className="flex gap-4 w-full sm:w-auto">
            <Link
              href="/invoices"
              className="flex-1 sm:flex-initial text-center px-8 py-3 rounded-xl font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </Link>
            <button type="submit" disabled={saving} className={config.submitClass}>
              {saving ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {config.savingLabel}
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {config.submitLabel}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

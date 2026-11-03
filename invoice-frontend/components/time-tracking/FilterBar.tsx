import type { ReactNode } from 'react'
import type { Client } from '@/lib/api'
import SearchableSelect from '@/components/SearchableSelect'

// Client + invoiced filters and the "Dates" toggle. `children` is the slot
// for the bulk-action buttons that sit at the far end of the row.
export function FilterBar({ clients, filterClient, onFilterClientChange, filterInvoiced, onFilterInvoicedChange, showDates, onToggleDates, children }: {
  clients: Client[]
  filterClient: string
  onFilterClientChange: (value: string) => void
  filterInvoiced: string
  onFilterInvoicedChange: (value: string) => void
  showDates: boolean
  onToggleDates: () => void
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="w-full sm:w-64">
        <SearchableSelect
          value={filterClient}
          onChange={onFilterClientChange}
          options={clients.map(c => ({ value: String(c.id), label: c.name }))}
          allLabel="All Clients"
          placeholder="Search client…"
        />
      </div>
      <select
        value={filterInvoiced}
        onChange={e => onFilterInvoicedChange(e.target.value)}
        className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm"
      >
        <option value="false">Not Invoiced</option>
        <option value="true">Invoiced</option>
        <option value="">All</option>
      </select>

      <button
        onClick={onToggleDates}
        className="px-4 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2"
        style={showDates
          ? { borderColor: 'var(--t-accent)', color: 'var(--t-accent)', background: 'var(--t-accent-soft)' }
          : { borderColor: 'var(--t-border)', color: 'var(--t-text-muted)' }}
        title="Show when each entry was added"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Dates
      </button>

      {children}
    </div>
  )
}

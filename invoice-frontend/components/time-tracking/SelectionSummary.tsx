import type { TimeEntry } from '@/lib/api'
import { totalMoney, totalSeconds } from './entryHelpers'
import { formatHours } from './format'

// Totals for the checked entries, plus a hint when they span several clients.
export function SelectionSummary({ selectedCount, selectedEntries, canConvert, clientCount }: {
  selectedCount: number
  selectedEntries: TimeEntry[]
  canConvert: boolean
  clientCount: number
}) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl border border-gray-200 dark:border-gray-700/60 prism-card p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="text-sm text-gray-600 dark:text-gray-300">
          <span className="font-medium">{selectedCount}</span> entries selected
          {' · '}
          <span className="font-mono">
            {formatHours(totalSeconds(selectedEntries))}
          </span>
          {' · '}
          Total: <span className="font-semibold text-gray-800 dark:text-gray-100">
            €{totalMoney(selectedEntries).toFixed(2)}
          </span>
        </div>
        {!canConvert && clientCount > 1 && (
          <p className="text-sm text-red-500">Select entries from one client only</p>
        )}
      </div>
    </div>
  )
}

import { formatDate } from '@/lib/utils'
import type { EntryItemProps } from './types'
import { getRowDisplay, isActivePrepaid, isEditable, isSelectable, liveSecondsFor } from './entryHelpers'
import { formatDuration } from './format'
import { EntryStatusBadgeCompact } from './EntryStatusBadge'
import { AddMinutesCompact } from './AddMinutes'

// One entry as a mobile card.
export function EntryCard({ entry, selected, showDates, trackableMap, live, onToggleSelect, addMinutes, actions }: EntryItemProps) {
  const activePrepaid = isActivePrepaid(entry, trackableMap)
  const display = getRowDisplay(entry, trackableMap, liveSecondsFor(entry, live))
  const isTickingNow = entry.is_running && entry.id === live.runningId
  const linkedInvoice = entry.invoice_id ? trackableMap[entry.invoice_id] : undefined

  return (
    <div className={`p-4 space-y-2 ${activePrepaid ? 'bg-blue-50/60 dark:bg-blue-500/5' : ''}`} style={activePrepaid ? { boxShadow: 'inset 3px 0 0 #3b82f6' } : {}}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {isSelectable(entry) && (
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect(entry.id)}
              className="w-4 h-4 mt-1 rounded border-gray-300"
              style={{ accentColor: 'var(--t-accent)' }}
            />
          )}
          <div>
            <p className="font-medium text-gray-800 dark:text-gray-100">{entry.description}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{entry.client?.name}</p>
            {showDates && <p className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">Added {formatDate(entry.created_at)}</p>}
            {entry.is_prepaid && linkedInvoice && (
              <p className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium" style={{ background: 'var(--t-accent-soft)', color: 'var(--t-accent)' }}>
                {linkedInvoice.series} {linkedInvoice.number} · {linkedInvoice.remaining_hours > 0
                  ? `${linkedInvoice.remaining_hours} hrs remaining`
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
        <EntryStatusBadgeCompact entry={entry} activePrepaid={activePrepaid} />
      </div>
      <div className="flex items-center justify-between text-sm">
        <div className="flex gap-4 text-gray-500 dark:text-gray-400">
          <span className="font-mono">
            {isTickingNow ? (
              <>
                <span style={{ color: display.isCountdown ? '#3b82f6' : 'var(--t-accent)' }}>{formatDuration(display.seconds)}</span>
                {!display.isCountdown && (
                  <span className="text-xs"> (total: {formatDuration((entry.duration_seconds || 0) + live.elapsed)})</span>
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
          <span>€{Number(entry.hourly_rate).toFixed(2)}/val.</span>
        </div>
        <span className={`font-medium ${display.isCountdown ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-100'}`}>
          €{display.money.toFixed(2)}
        </span>
      </div>
      <div className="flex items-center gap-3 pt-1 flex-wrap">
        <button onClick={() => actions.onTimeline(entry)} className="text-sm font-medium text-gray-500 dark:text-gray-400">Timeline</button>
        {isEditable(entry) && (
          entry.is_running ? (
            <button onClick={() => actions.onStop(entry)} className="text-red-500 text-sm font-medium">Stop</button>
          ) : (
            <>
              <button onClick={() => actions.onStart(entry)} className="text-sm font-medium" style={{ color: 'var(--t-accent)' }}>Start</button>
              <button onClick={() => actions.onEdit(entry)} className="text-blue-500 text-sm font-medium">Edit</button>
              <button onClick={() => actions.onDelete(entry.id)} className="text-red-400 text-sm font-medium">Delete</button>
              <AddMinutesCompact entryId={entry.id} controls={addMinutes} />
            </>
          )
        )}
      </div>
    </div>
  )
}

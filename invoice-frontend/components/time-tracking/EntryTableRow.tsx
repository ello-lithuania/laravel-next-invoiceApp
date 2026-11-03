import { formatDate } from '@/lib/utils'
import type { EntryItemProps } from './types'
import { getRowDisplay, isActivePrepaid, isEditable, isSelectable, liveSecondsFor } from './entryHelpers'
import { formatDuration, formatHours } from './format'
import { EntryStatusBadge } from './EntryStatusBadge'
import { AddMinutes } from './AddMinutes'

// One entry as a desktop table row.
export function EntryTableRow({ entry, selected, showDates, trackableMap, live, onToggleSelect, addMinutes, actions }: EntryItemProps) {
  const activePrepaid = isActivePrepaid(entry, trackableMap)
  const display = getRowDisplay(entry, trackableMap, liveSecondsFor(entry, live))
  const isTicking = entry.id === live.runningId
  const linkedInvoice = entry.invoice_id ? trackableMap[entry.invoice_id] : undefined

  return (
    <tr className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${activePrepaid ? 'bg-blue-50/60 dark:bg-blue-500/5' : ''}`} style={activePrepaid ? { boxShadow: 'inset 3px 0 0 #3b82f6' } : {}}>
      <td className="px-4 py-3">
        {isSelectable(entry) && (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(entry.id)}
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
        {showDates && (
          <div className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
            Added {formatDate(entry.created_at)}
            {entry.updated_at.slice(0, 10) !== entry.created_at.slice(0, 10) && ` · updated ${formatDate(entry.updated_at)}`}
          </div>
        )}
        {entry.is_prepaid && linkedInvoice && (
          <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium" style={{ background: 'var(--t-accent-soft)', color: 'var(--t-accent)' }}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {linkedInvoice.series} {linkedInvoice.number}
            {' · '}
            {linkedInvoice.remaining_hours > 0
              ? `${linkedInvoice.remaining_hours} hrs remaining`
              : 'complete'}
          </div>
        )}
        {entry.is_prepaid && !entry.invoice_id && (
          <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Edit to link an invoice (countdown won’t work)
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-sm">€{Number(entry.hourly_rate).toFixed(2)}/val.</td>
      <td className="px-4 py-3 text-sm">
        <div className="flex items-center gap-1.5 flex-wrap">
          {entry.is_running ? (
            <>
              <span className="font-mono font-bold" style={{ color: display.isCountdown ? '#3b82f6' : 'var(--t-accent)' }}>
                {isTicking ? formatDuration(display.seconds) : '...'}
              </span>
              {isTicking && !display.isCountdown && (
                <span className="text-gray-400 dark:text-gray-500 text-xs font-mono">
                  (total: {formatDuration((entry.duration_seconds || 0) + live.elapsed)})
                </span>
              )}
              <span className="text-gray-400 dark:text-gray-500 text-xs">
                ({formatHours(display.seconds)}{display.isCountdown ? ' remaining' : ''})
              </span>
            </>
          ) : (
            <>
              <span className={`font-mono ${display.isCountdown ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}>
                {formatDuration(display.seconds)}
              </span>
              <span className="text-gray-400 dark:text-gray-500 text-xs">
                ({formatHours(display.seconds)}{display.isCountdown ? ' remaining' : ''})
              </span>
            </>
          )}
          {isEditable(entry) && !entry.is_running && (
            <AddMinutes entryId={entry.id} controls={addMinutes} />
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-gray-800 dark:text-gray-100 text-sm font-medium">
        <span className={display.isCountdown ? 'text-blue-600 dark:text-blue-400' : ''}>
          €{display.money.toFixed(2)}
        </span>
      </td>
      <td className="px-4 py-3">
        <EntryStatusBadge entry={entry} activePrepaid={activePrepaid} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => actions.onTimeline(entry)}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-500/10 rounded-lg transition-colors"
            title="Timeline — when these hours were logged"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          {isEditable(entry) && (
            <>
              {entry.is_running ? (
                <button
                  onClick={() => actions.onStop(entry)}
                  className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Stop"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                    <rect x="3" y="3" width="10" height="10" rx="1" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={() => actions.onStart(entry)}
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
                    onClick={() => actions.onEdit(entry)}
                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => actions.onDelete(entry.id)}
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
}

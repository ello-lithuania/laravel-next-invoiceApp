import type { TimeEntry } from '@/lib/api'
import { formatDuration } from './format'

// Banner for the entry that is ticking right now, with the Stop flow:
// "Stop" turns into a minutes input + "Save & Stop" while `isStopping`.
export function RunningTimerBanner({ entry, elapsed, isStopping, stopMinutes, onStopMinutesChange, onStop, onConfirmStop, onCancelStop }: {
  entry: TimeEntry
  elapsed: number
  isStopping: boolean
  stopMinutes: string
  onStopMinutesChange: (value: string) => void
  onStop: (entry: TimeEntry) => void
  onConfirmStop: () => void
  onCancelStop: () => void
}) {
  return (
    <div className="rounded-xl border p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      style={{ backgroundColor: 'var(--t-accent-soft)', borderColor: 'var(--t-accent)' }}>
      <div className="flex items-center gap-4">
        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
        <div>
          <p className="font-semibold text-gray-800 dark:text-gray-100">{entry.description}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{entry.client?.name}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <span className="text-2xl font-mono font-bold block" style={{ color: 'var(--t-accent)' }}>
            {formatDuration(elapsed)}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
            total: {formatDuration((entry.duration_seconds || 0) + elapsed)}
          </span>
        </div>
        {isStopping ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-600 dark:text-gray-300">Add:</span>
            <input
              type="number"
              min="1"
              value={stopMinutes}
              onChange={e => onStopMinutesChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') onConfirmStop(); if (e.key === 'Escape') onCancelStop() }}
              autoFocus
              className="w-20 px-3 py-2 text-sm font-mono rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-center"
            />
            <span className="text-sm text-gray-500 dark:text-gray-400">min.</span>
            <button
              onClick={onConfirmStop}
              className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium text-sm transition-colors"
            >
              Save & Stop
            </button>
            <button
              onClick={onCancelStop}
              className="px-3 py-2 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => onStop(entry)}
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
  )
}

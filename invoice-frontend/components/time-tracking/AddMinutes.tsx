import type { AddMinutesControls } from './types'

const PRESET_MINUTES = [5, 15, 30]

// Quick "+5 / +15 / +30 / +min" buttons for the desktop table; "+min" swaps
// them for a small input with confirm / cancel icons.
export function AddMinutes({ entryId, controls }: { entryId: number; controls: AddMinutesControls }) {
  const { state, onValueChange, onOpen, onClose, onSubmit, onPreset } = controls

  if (state.entryId === entryId) {
    return (
      <span className="inline-flex items-center gap-1 ml-1">
        <input
          type="number"
          min="1"
          value={state.value}
          onChange={e => onValueChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSubmit(entryId); if (e.key === 'Escape') onClose() }}
          placeholder="min"
          autoFocus
          className="w-16 px-1.5 py-0.5 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
        />
        <button
          onClick={() => onSubmit(entryId)}
          className="p-0.5 rounded text-green-500 hover:bg-green-500/10 transition-colors"
          title="Add"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </button>
        <button
          onClick={onClose}
          className="p-0.5 rounded text-gray-400 hover:bg-gray-500/10 transition-colors"
          title="Cancel"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1">
      {PRESET_MINUTES.map(m => (
        <button
          key={m}
          onClick={() => onPreset(entryId, m)}
          className="px-1.5 py-0.5 text-xs rounded border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          title={`Add ${m} minutes`}
        >
          +{m}
        </button>
      ))}
      <button
        onClick={() => onOpen(entryId)}
        className="px-1.5 py-0.5 text-xs rounded border border-dashed border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-500 dark:hover:text-gray-400 transition-colors"
        title="Add custom minutes"
      >
        +min
      </button>
    </span>
  )
}

// Same controls, text-button styling for the mobile card.
export function AddMinutesCompact({ entryId, controls }: { entryId: number; controls: AddMinutesControls }) {
  const { state, onValueChange, onOpen, onClose, onSubmit, onPreset } = controls

  if (state.entryId === entryId) {
    return (
      <span className="inline-flex items-center gap-1">
        <input
          type="number"
          min="1"
          value={state.value}
          onChange={e => onValueChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSubmit(entryId); if (e.key === 'Escape') onClose() }}
          placeholder="min"
          autoFocus
          className="w-16 px-1.5 py-0.5 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
        />
        <button onClick={() => onSubmit(entryId)} className="text-green-500 text-sm font-medium">✓</button>
        <button onClick={onClose} className="text-gray-400 text-sm">✕</button>
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1">
      {PRESET_MINUTES.map(m => (
        <button
          key={m}
          onClick={() => onPreset(entryId, m)}
          className="text-xs text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-600 px-1.5 py-0.5 rounded hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          +{m}
        </button>
      ))}
      <button
        onClick={() => onOpen(entryId)}
        className="text-xs text-gray-400 dark:text-gray-500 border border-dashed border-gray-300 dark:border-gray-600 px-1.5 py-0.5 rounded hover:text-gray-500 dark:hover:text-gray-400 transition-colors"
      >
        +min
      </button>
    </span>
  )
}

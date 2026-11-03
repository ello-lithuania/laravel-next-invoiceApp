import type { EntryGroup, GroupActions } from './types'
import { formatHours } from './format'
import { isSelectable } from './entryHelpers'

// Header row above a group in the desktop table. The ungrouped bucket gets a
// plain divider band instead (no confusing label).
export function GroupHeaderRow({ group, actions }: { group: EntryGroup; actions: GroupActions }) {
  if (group.key === '') {
    return (
      <tr aria-hidden="true">
        <td colSpan={8} className="p-0">
          <div className="h-7 border-y border-gray-200 dark:border-gray-700" style={{ background: 'var(--t-bg-elevated)' }} />
        </td>
      </tr>
    )
  }

  return (
    <tr style={{ background: 'var(--t-accent-soft)', borderTop: '3px solid var(--t-accent)', borderBottom: '1px solid var(--t-border)' }}>
      <td colSpan={8} className="px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--t-accent)' }}>{group.label}</span>
            {group.entries.some(isSelectable) && (
              <button
                onClick={() => actions.onInvoice(group.key)}
                className="text-[11px] font-semibold px-2.5 py-1 rounded text-white transition-colors"
                style={{ background: 'var(--t-accent)' }}
                title="Create an invoice from this group's entries"
              >
                Invoice
              </button>
            )}
            <button
              onClick={() => actions.onUngroup(group.key)}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-300 hover:text-red-500 hover:border-red-400 dark:hover:border-red-500 transition-colors"
              title="Remove this group from its entries"
            >
              Ungroup
            </button>
          </div>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-100 tabular-nums">
            {group.entries.length} entr{group.entries.length === 1 ? 'y' : 'ies'} · {formatHours(group.seconds)} · €{group.money.toFixed(2)}
          </span>
        </div>
      </td>
    </tr>
  )
}

// Same header for the mobile card list.
export function GroupHeaderCard({ group, actions }: { group: EntryGroup; actions: GroupActions }) {
  if (group.key === '') {
    return <div aria-hidden="true" className="h-6 border-y border-gray-200 dark:border-gray-700" style={{ background: 'var(--t-bg-elevated)' }} />
  }

  return (
    <div className="px-4 py-3" style={{ background: 'var(--t-accent-soft)', borderTop: '3px solid var(--t-accent)', borderBottom: '1px solid var(--t-border)' }}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--t-accent)' }}>{group.label}</span>
          {group.entries.some(isSelectable) && (
            <button onClick={() => actions.onInvoice(group.key)} className="text-[11px] font-semibold px-2.5 py-1 rounded text-white transition-colors" style={{ background: 'var(--t-accent)' }}>Invoice</button>
          )}
          <button onClick={() => actions.onUngroup(group.key)} className="text-[11px] font-semibold px-2.5 py-1 rounded-full border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-300 hover:text-red-500 hover:border-red-400 transition-colors">Ungroup</button>
        </div>
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-100 tabular-nums">{formatHours(group.seconds)} · €{group.money.toFixed(2)}</span>
      </div>
    </div>
  )
}

import { Fragment } from 'react'
import type { EntryListProps } from './types'
import { groupStartingAt, isSelectable } from './entryHelpers'
import { GroupHeaderRow } from './GroupHeader'
import { EntryTableRow } from './EntryTableRow'

// Desktop list: a table with optional group header rows.
export function EntriesTable({ entries, groups, showGroups, selectedIds, filtersActive, onResetFilters, onToggleAll, groupActions, ...rowProps }: EntryListProps & {
  onToggleAll: () => void
}) {
  const selectable = entries.filter(isSelectable)
  const allSelected = selectable.length > 0 && selectable.every(e => selectedIds.includes(e.id))

  return (
    <table className="w-full">
      <thead className="sticky top-0 z-10 text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700">
        <tr className="border-b border-gray-100 dark:border-gray-700/60">
          <th className="px-4 py-3.5 text-left w-10">
            {selectable.length > 0 && (
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleAll}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
                style={{ accentColor: 'var(--t-accent)' }}
              />
            )}
          </th>
          <th className="px-4 py-3.5 text-left text-xs font-medium uppercase tracking-wider">Client</th>
          <th className="px-4 py-3.5 text-left text-xs font-medium uppercase tracking-wider">Description</th>
          <th className="px-4 py-3.5 text-left text-xs font-medium uppercase tracking-wider">Rate</th>
          <th className="px-4 py-3.5 text-left text-xs font-medium uppercase tracking-wider">Duration</th>
          <th className="px-4 py-3.5 text-left text-xs font-medium uppercase tracking-wider">Total</th>
          <th className="px-4 py-3.5 text-left text-xs font-medium uppercase tracking-wider">Status</th>
          <th className="px-4 py-3.5 text-right text-xs font-medium uppercase tracking-wider">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
        {entries.length === 0 ? (
          <tr>
            <td colSpan={8} className="px-6 py-16 text-center">
              <div className="text-gray-400 dark:text-gray-500">
                <svg className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="font-medium">{filtersActive ? 'No entries match the current filters' : 'No time entries yet'}</p>
                {filtersActive ? (
                  <button onClick={onResetFilters} className="text-sm mt-1 font-medium" style={{ color: 'var(--t-accent)' }}>Clear filters</button>
                ) : (
                  <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">Create your first time entry to start tracking</p>
                )}
              </div>
            </td>
          </tr>
        ) : (
          entries.map((entry, i) => {
            const group = groupStartingAt(entries, i, showGroups, groups)
            return (
              <Fragment key={entry.id}>
                {group && <GroupHeaderRow group={group} actions={groupActions} />}
                <EntryTableRow entry={entry} selected={selectedIds.includes(entry.id)} {...rowProps} />
              </Fragment>
            )
          })
        )}
      </tbody>
    </table>
  )
}

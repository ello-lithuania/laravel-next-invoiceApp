import { Fragment } from 'react'
import type { EntryListProps } from './types'
import { groupStartingAt } from './entryHelpers'
import { GroupHeaderCard } from './GroupHeader'
import { EntryCard } from './EntryCard'

// Mobile list: one card per entry with optional group headers.
export function EntryCardList({ entries, groups, showGroups, selectedIds, filtersActive, onResetFilters, groupActions, ...cardProps }: EntryListProps) {
  if (entries.length === 0) {
    return (
      <div className="px-6 py-12 text-center">
        <div className="text-gray-400 dark:text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>{filtersActive ? 'No entries match the current filters' : 'No time entries yet'}</p>
          {filtersActive && <button onClick={onResetFilters} className="text-sm mt-1 font-medium" style={{ color: 'var(--t-accent)' }}>Clear filters</button>}
        </div>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
      {entries.map((entry, i) => {
        const group = groupStartingAt(entries, i, showGroups, groups)
        return (
          <Fragment key={entry.id}>
            {group && <GroupHeaderCard group={group} actions={groupActions} />}
            <EntryCard entry={entry} selected={selectedIds.includes(entry.id)} {...cardProps} />
          </Fragment>
        )
      })}
    </div>
  )
}

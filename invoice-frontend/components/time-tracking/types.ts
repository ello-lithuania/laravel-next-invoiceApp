import type { TimeEntry, TrackableInvoice } from '@/lib/api'

// Prepaid invoices keyed by id, for O(1) lookup while rendering rows.
export type TrackableMap = Record<number, TrackableInvoice>

// A section of the list: all entries sharing one group_name ('' = ungrouped).
export interface EntryGroup {
  key: string
  label: string
  entries: TimeEntry[]
  seconds: number
  money: number
}

// The running timer as the rows see it: which entry ticks and how many seconds
// of the current session have passed.
export interface LiveTimer {
  runningId: number | null
  elapsed: number
}

// The inline "+min" input is open for at most one entry at a time.
export interface AddMinutesState {
  entryId: number | null
  value: string
}

export interface AddMinutesControls {
  state: AddMinutesState
  onValueChange: (value: string) => void
  onOpen: (entryId: number) => void
  onClose: () => void
  onSubmit: (entryId: number) => void
  onPreset: (entryId: number, minutes: number) => void
}

// What a row can do to an entry. Implemented once by the page, passed down.
export interface EntryActions {
  onTimeline: (entry: TimeEntry) => void
  onStart: (entry: TimeEntry) => void
  onStop: (entry: TimeEntry) => void
  onEdit: (entry: TimeEntry) => void
  onDelete: (id: number) => void
}

export interface GroupActions {
  onInvoice: (groupKey: string) => void
  onUngroup: (groupKey: string) => void
}

// Everything the desktop table and the mobile card list share.
export interface EntryListProps {
  entries: TimeEntry[] // already ordered so same-group rows are adjacent
  groups: EntryGroup[]
  showGroups: boolean
  selectedIds: number[]
  showDates: boolean
  trackableMap: TrackableMap
  live: LiveTimer
  filtersActive: boolean
  onResetFilters: () => void
  onToggleSelect: (id: number) => void
  addMinutes: AddMinutesControls
  actions: EntryActions
  groupActions: GroupActions
}

// What a single row / card needs for one entry.
export interface EntryItemProps {
  entry: TimeEntry
  selected: boolean
  showDates: boolean
  trackableMap: TrackableMap
  live: LiveTimer
  onToggleSelect: (id: number) => void
  addMinutes: AddMinutesControls
  actions: EntryActions
}

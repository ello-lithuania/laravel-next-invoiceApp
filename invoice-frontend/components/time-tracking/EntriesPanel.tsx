import { useState } from 'react'
import type { AddMinutesControls, AddMinutesState, EntryListProps } from './types'
import { EntriesTable } from './EntriesTable'
import { EntryCardList } from './EntryCardList'

const CLOSED: AddMinutesState = { entryId: null, value: '' }

// The card around the entries: desktop table from `md` up, card list below.
// Owns the inline "+min" input state, which both layouts share.
export function EntriesPanel({ onAddMinutes, onToggleAll, ...listProps }: Omit<EntryListProps, 'addMinutes'> & {
  // Resolves true when the minutes were saved (the input then closes).
  onAddMinutes: (entryId: number, minutes: number) => Promise<boolean>
  onToggleAll: () => void
}) {
  const [addMinutesState, setAddMinutesState] = useState<AddMinutesState>(CLOSED)

  const addMinutes: AddMinutesControls = {
    state: addMinutesState,
    onValueChange: value => setAddMinutesState(s => ({ ...s, value })),
    onOpen: entryId => setAddMinutesState({ entryId, value: '' }),
    onClose: () => setAddMinutesState(CLOSED),
    onSubmit: async entryId => {
      const minutes = parseInt(addMinutesState.value)
      if (!minutes || minutes <= 0) return
      if (await onAddMinutes(entryId, minutes)) setAddMinutesState(CLOSED)
    },
    onPreset: (entryId, minutes) => { onAddMinutes(entryId, minutes) },
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl border border-gray-200 dark:border-gray-700/60 overflow-hidden">
      <div className="hidden md:block">
        <EntriesTable {...listProps} addMinutes={addMinutes} onToggleAll={onToggleAll} />
      </div>
      <div className="md:hidden">
        <EntryCardList {...listProps} addMinutes={addMinutes} />
      </div>
    </div>
  )
}

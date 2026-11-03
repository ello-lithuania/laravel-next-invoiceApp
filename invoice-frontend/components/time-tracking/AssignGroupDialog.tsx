import { useState } from 'react'
import { AssignGroupModal } from './TimeTrackingModals'

// Holds the "new group name" text for the assign-to-group modal. Mount it only
// while the modal is open, so the text starts empty every time.
export function AssignGroupDialog({ selectedCount, existingGroups, onApply, onClose }: {
  selectedCount: number
  existingGroups: string[]
  onApply: (group: string | null) => void
  onClose: () => void
}) {
  const [value, setValue] = useState('')

  return (
    <AssignGroupModal
      open
      onClose={onClose}
      selectedCount={selectedCount}
      existingGroups={existingGroups}
      value={value}
      onChange={setValue}
      onApply={onApply}
    />
  )
}

// Buttons that act on the checked entries: assign to a group, convert to an invoice.
export function BulkActions({ selectedCount, canConvert, onAssignGroup, onConvert }: {
  selectedCount: number
  canConvert: boolean
  onAssignGroup: () => void
  onConvert: () => void
}) {
  return (
    <div className="ml-auto flex items-center gap-2">
      <button
        onClick={onAssignGroup}
        className="px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 border"
        style={{ borderColor: 'var(--t-border)', color: 'var(--t-accent)', background: 'var(--t-accent-soft)' }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z" />
        </svg>
        Assign to group ({selectedCount})
      </button>
      <button
        onClick={onConvert}
        disabled={!canConvert}
        className="px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
        style={{ backgroundColor: 'var(--t-accent)', color: '#fff' }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Convert to Invoice ({selectedCount})
      </button>
    </div>
  )
}

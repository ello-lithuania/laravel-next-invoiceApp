import { useCallback, useRef, useState } from 'react'
import type { Client } from '@/lib/api'
import { useClickOutside } from './useClickOutside'

// Searchable client input. While a client is selected the input shows its name;
// typing again clears the selection and goes back to free search text.
export function ClientPicker({ clients, selectedId, onSelect, onClear }: {
  clients: Client[]
  selectedId: string
  onSelect: (client: Client) => void
  onClear: () => void
}) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useClickOutside(ref, close)

  const selected = clients.find(c => String(c.id) === selectedId)
  const text = selected ? selected.name : search
  const filtered = clients.filter(c => !text || c.name.toLowerCase().includes(text.toLowerCase()))

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={text}
        onChange={e => {
          setSearch(e.target.value)
          setOpen(true)
          if (selectedId) onClear()
        }}
        onFocus={() => setOpen(true)}
        required
        placeholder="Search client..."
        autoComplete="off"
        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:border-transparent transition-colors"
        style={{ ['--tw-ring-color' as string]: 'var(--t-accent)' }}
      />
      {open && (
        <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">No clients found</div>
          ) : (
            filtered.map(c => (
              <div
                key={c.id}
                onClick={() => {
                  onSelect(c)
                  setSearch('')
                  setOpen(false)
                }}
                className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
              >
                <span className={c.has_uncollectible ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-800 dark:text-gray-100'}>{c.name}</span>
                {c.has_uncollectible && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500/15 text-red-600 dark:text-red-400 whitespace-nowrap" title="This client doesn't pay (written-off invoice)">Won&apos;t pay</span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

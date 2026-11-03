import { useCallback, useRef, useState } from 'react'
import { useClickOutside } from './useClickOutside'

const MAX_SUGGESTIONS = 8

// Description input that suggests descriptions used before.
export function DescriptionInput({ value, onChange, savedDescriptions }: {
  value: string
  onChange: (value: string) => void
  savedDescriptions: string[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useClickOutside(ref, close)

  const matches = savedDescriptions.filter(d => d.toLowerCase().includes(value.toLowerCase()))

  return (
    <div ref={ref} className="relative">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description / Task *</label>
      <input
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        required
        placeholder="e.g. Website development, Bug fixing..."
        autoComplete="off"
        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:border-transparent transition-colors"
        style={{ ['--tw-ring-color' as string]: 'var(--t-accent)' }}
      />
      {open && matches.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto">
          {matches.slice(0, MAX_SUGGESTIONS).map((desc, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { onChange(desc); setOpen(false) }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {desc}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

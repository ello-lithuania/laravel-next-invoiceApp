import { useState } from 'react'

// Group name input with autocomplete from the groups that already exist.
export function GroupInput({ value, onChange, existingGroups }: {
  value: string
  onChange: (value: string) => void
  existingGroups: string[]
}) {
  const [open, setOpen] = useState(false)
  const matches = existingGroups.filter(g => g.toLowerCase().includes(value.toLowerCase()))

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        // Delay closing so a click on a suggestion still registers.
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="e.g. Marketing…"
        autoComplete="off"
        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:border-transparent transition-colors"
        style={{ ['--tw-ring-color' as string]: 'var(--t-accent)' }}
      />
      {open && matches.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto">
          {matches.map(g => (
            <div
              key={g}
              onMouseDown={() => { onChange(g); setOpen(false) }}
              className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 text-sm"
            >
              {g}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

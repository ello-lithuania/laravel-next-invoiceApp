'use client'
import { useState, useRef, useEffect } from 'react'

interface Option { value: string; label: string }

interface Props {
  value: string
  onChange: (value: string) => void
  options: Option[]
  allLabel?: string      // label for the "no filter" ('') entry at the top
  placeholder?: string   // search box placeholder
}

// A filterable dropdown for long option lists (e.g. clients, months) where a
// native <select> becomes unwieldy. Type to filter; click outside to close.
export default function SearchableSelect({ value, onChange, options, allLabel = 'All', placeholder = 'Search…' }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    if (open) { setQuery(''); setTimeout(() => inputRef.current?.focus(), 20) }
  }, [open])

  const selected = options.find(o => o.value === value)
  const q = query.trim().toLowerCase()
  const filtered = q ? options.filter(o => o.label.toLowerCase().includes(q)) : options

  const choose = (v: string) => { onChange(v); setOpen(false) }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 p-3 bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700/60 rounded-lg text-left text-gray-800 dark:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
      >
        <span className={`truncate ${selected ? '' : 'text-gray-500 dark:text-gray-400'}`}>{selected ? selected.label : allLabel}</span>
        <svg className={`w-3 h-3 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 12 12"><path d="M5.9 8.4L.5 3l1.4-1.4 4 4 4-4L11.3 3z" /></svg>
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-lg shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100 dark:border-gray-700/60">
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700/60 rounded-md text-gray-800 dark:text-gray-100 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => choose('')}
              className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/50 ${value === '' ? 'text-blue-500 font-medium' : 'text-gray-700 dark:text-gray-200'}`}
            >
              {allLabel}
            </button>
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-sm text-gray-400 dark:text-gray-500">No matches</div>
            ) : filtered.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => choose(o.value)}
                className={`w-full text-left px-3 py-2 text-sm truncate transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/50 ${value === o.value ? 'text-blue-500 font-medium' : 'text-gray-700 dark:text-gray-200'}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

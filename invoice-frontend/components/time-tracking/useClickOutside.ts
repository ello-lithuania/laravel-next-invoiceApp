import { RefObject, useEffect } from 'react'

// Calls `onOutside` when the user clicks anywhere outside `ref`'s element
// (used to close suggestion dropdowns). Pass a stable callback (useCallback).
export function useClickOutside(ref: RefObject<HTMLElement | null>, onOutside: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside()
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [ref, onOutside])
}

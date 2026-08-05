'use client'
import { useEffect, useRef } from 'react'

// Calls `onReturn` when the tab becomes visible again after having been hidden
// for at least `minHiddenMs` (default 30s). Lets a page left open overnight
// refresh itself on return instead of showing stale or stuck data. Uses a ref
// so the latest callback is always used without re-subscribing every render.
export function useRefetchOnReturn(onReturn: () => void, minHiddenMs = 30000) {
  const cb = useRef(onReturn)
  cb.current = onReturn

  useEffect(() => {
    let hiddenAt = 0
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now()
        return
      }
      if (hiddenAt && Date.now() - hiddenAt > minHiddenMs) cb.current()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [minHiddenMs])
}

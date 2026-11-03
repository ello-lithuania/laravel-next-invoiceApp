'use client'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { getErrorMessage } from '@/lib/utils'

interface UseApiDataOptions {
  // Toast text when the request fails and the API gave no message of its own.
  errorMessage: string
  // Wait before fetching (e.g. to debounce a search box). Default: no wait.
  delayMs?: number
}

// What the last finished request produced, and which request it answered.
interface Settled<T> {
  fetcher: () => Promise<T>
  reloadCount: number
  data: T | undefined
}

// Loads data for a page. Fetches again whenever `fetcher` changes identity, so
// wrap it in useCallback with the inputs it depends on (page, search, id…).
// Responses for an outdated fetcher, or after unmount, are ignored. On error
// the previous data is kept and a toast is shown.
//
// `loading` is derived (does the last answer match the current request?) rather
// than stored, so no state is set synchronously inside the effect.
export function useApiData<T>(fetcher: () => Promise<T>, { errorMessage, delayMs = 0 }: UseApiDataOptions) {
  const [settled, setSettled] = useState<Settled<T> | null>(null)
  const [reloadCount, setReloadCount] = useState(0)

  useEffect(() => {
    let ignore = false
    const timer = setTimeout(async () => {
      try {
        const data = await fetcher()
        if (!ignore) setSettled({ fetcher, reloadCount, data })
      } catch (e: unknown) {
        if (ignore) return
        toast.error(getErrorMessage(e, errorMessage))
        setSettled(prev => ({ fetcher, reloadCount, data: prev?.data }))
      }
    }, delayMs)
    return () => {
      ignore = true
      clearTimeout(timer)
    }
  }, [fetcher, reloadCount, delayMs, errorMessage])

  const reload = useCallback(() => setReloadCount(count => count + 1), [])

  const loading = settled === null || settled.fetcher !== fetcher || settled.reloadCount !== reloadCount
  return { data: settled?.data, loading, reload }
}

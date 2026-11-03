import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { timeEntries, TimeEntry } from '@/lib/api'
import { getErrorMessage } from '@/lib/utils'

const TICK_MS = 500

// The running timer: which entry is ticking, how long the current session has
// lasted, and the "how many minutes to save?" step that precedes stopping it.
//
// `start` and `confirmStop` return true when the server state changed, so the
// caller knows to reload the list.
export function useRunningTimer() {
  const [runningEntry, setRunningEntry] = useState<TimeEntry | null>(null)
  // The clock the elapsed time is measured against; bumped by the interval below.
  const [now, setNow] = useState(() => Date.now())
  const [stoppingEntry, setStoppingEntry] = useState<TimeEntry | null>(null)
  const [stopMinutes, setStopMinutes] = useState('')

  useEffect(() => {
    if (!runningEntry) return
    const id = setInterval(() => setNow(Date.now()), TICK_MS)
    return () => clearInterval(id)
  }, [runningEntry])

  const startedAt = runningEntry?.started_at ? new Date(runningEntry.started_at).getTime() : null
  const elapsed = startedAt === null ? 0 : Math.floor((now - startedAt) / 1000)

  // Follow one entry (or null when nothing runs) and restart the clock.
  const track = useCallback((entry: TimeEntry | null) => {
    setRunningEntry(entry)
    if (entry) setNow(Date.now())
  }, [])

  // After a (re)load: follow whichever entry the server says is running.
  const syncWithEntries = useCallback(
    (entries: TimeEntry[]) => track(entries.find(e => e.is_running) ?? null),
    [track]
  )

  const start = async (entry: TimeEntry): Promise<boolean> => {
    try {
      track(await timeEntries.start(entry.id))
      return true
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Failed to start timer'))
      return false
    }
  }

  const beginStop = (entry: TimeEntry) => {
    // Calculate current SESSION elapsed minutes (round up)
    const sessionStart = entry.started_at ? new Date(entry.started_at).getTime() : Date.now()
    const sessionSeconds = Math.floor((Date.now() - sessionStart) / 1000)
    setStoppingEntry(entry)
    setStopMinutes(String(Math.max(1, Math.ceil(sessionSeconds / 60))))
  }

  const cancelStop = () => {
    setStoppingEntry(null)
    setStopMinutes('')
  }

  const confirmStop = async (): Promise<boolean> => {
    if (!stoppingEntry) return false
    const minutes = parseInt(stopMinutes)
    if (!minutes || minutes <= 0) { toast.error('Enter valid minutes'); return false }
    try {
      await timeEntries.stop(stoppingEntry.id, minutes)
      setStoppingEntry(null)
      setStopMinutes('')
      track(null)
      toast.success(`Stopped — ${minutes} min. saved`)
      return true
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Failed to stop timer'))
      return false
    }
  }

  return { runningEntry, elapsed, syncWithEntries, start, stoppingEntry, stopMinutes, setStopMinutes, beginStop, cancelStop, confirmStop }
}

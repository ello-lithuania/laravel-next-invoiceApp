import type { TimeEntry } from '@/lib/api'

// Status pill for the desktop table: Running / Prepaid / Invoiced / Not Invoiced.
export function EntryStatusBadge({ entry, activePrepaid }: { entry: TimeEntry; activePrepaid: boolean }) {
  if (entry.is_running) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        Running
      </span>
    )
  }
  if (activePrepaid) {
    return (
      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
        Prepaid
      </span>
    )
  }
  if (entry.is_invoiced) {
    return (
      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400">
        Invoiced
      </span>
    )
  }
  return (
    <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">
      Not Invoiced
    </span>
  )
}

// Smaller variant for the mobile card ("Pending" instead of "Not Invoiced").
export function EntryStatusBadgeCompact({ entry, activePrepaid }: { entry: TimeEntry; activePrepaid: boolean }) {
  if (entry.is_running) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        Running
      </span>
    )
  }
  if (activePrepaid) {
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">Prepaid</span>
  }
  if (entry.is_invoiced) {
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400">Invoiced</span>
  }
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">Pending</span>
}

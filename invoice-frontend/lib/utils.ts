export const statusColors: Record<string, string> = {
  draft: 'bg-gray-500/20 text-gray-600 dark:text-gray-300',
  sent: 'bg-blue-500/15 text-blue-500',
  paid: 'bg-green-500/20 text-green-400',
  // Used as the "won't pay" marker → strong red danger.
  overdue: 'bg-red-500/25 text-red-600 dark:text-red-400 font-semibold',
}

export const statusLabels: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  overdue: "Won't pay",
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' }).format(value)
}

export function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

// Force a file download from a (blob) URL with an explicit filename. Opening a
// blob in a new tab loses the name (the browser saves it as a random blob id),
// so downloads go through an <a download> click instead.
export function triggerDownload(url: string, filename: string): void {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

// Fired after any mutation that changes revenue/paid/unpaid totals so the
// global StatsBar can re-fetch. Pages call refreshStats() after such changes.
export const STATS_REFRESH_EVENT = 'stats:refresh'
export function refreshStats(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(STATS_REFRESH_EVENT))
}

import type { TimeEntry, TrackableInvoice } from '@/lib/api'
import type { EntryGroup, LiveTimer, TrackableMap } from './types'

// Editable = not invoiced, OR invoiced but prepaid (still being worked on)
export const isEditable = (entry: TimeEntry) => !entry.is_invoiced || !!entry.is_prepaid

// Only entries that are not yet billed and not ticking can be picked for an invoice.
export const isSelectable = (entry: TimeEntry) => !entry.is_invoiced && !entry.is_running

export function totalSeconds(entries: TimeEntry[]): number {
  return entries.reduce((sum, e) => sum + e.duration_seconds, 0)
}

export function totalMoney(entries: TimeEntry[]): number {
  return entries.reduce((sum, e) => sum + (e.duration_seconds / 3600) * Number(e.hourly_rate), 0)
}

export function buildTrackableMap(invoices: TrackableInvoice[]): TrackableMap {
  const map: TrackableMap = {}
  invoices.forEach(inv => { map[inv.id] = inv })
  return map
}

// Active prepaid = marked as prepaid AND still has time remaining (or no invoice link).
// When remaining hours hit 0, the entry visually becomes regular "Invoiced".
export function isActivePrepaid(entry: TimeEntry, trackableMap: TrackableMap): boolean {
  if (!entry.is_prepaid) return false
  if (!entry.invoice_id) return true
  const inv = trackableMap[entry.invoice_id]
  if (!inv) return true
  return inv.remaining_hours > 0
}

// Seconds of the current session to add to this row (only the running entry ticks).
export const liveSecondsFor = (entry: TimeEntry, live: LiveTimer) =>
  entry.is_running && entry.id === live.runningId ? live.elapsed : 0

// For active prepaid entries with an invoice link, display COUNTDOWN of remaining
// time/value instead of accumulated worked time.
// liveSeconds = current running session elapsed seconds (so countdown ticks down live).
export function getRowDisplay(entry: TimeEntry, trackableMap: TrackableMap, liveSeconds: number = 0) {
  if (entry.is_prepaid && entry.invoice_id) {
    const inv = trackableMap[entry.invoice_id]
    if (inv && inv.remaining_hours > 0) {
      const remainingSec = Math.max(0, Math.round(inv.remaining_hours * 3600) - liveSeconds)
      return {
        seconds: remainingSec,
        money: (remainingSec / 3600) * Number(entry.hourly_rate),
        isCountdown: true,
      }
    }
  }
  const sec = entry.duration_seconds + liveSeconds
  return {
    seconds: sec,
    money: (sec / 3600) * Number(entry.hourly_rate),
    isCountdown: false,
  }
}

// The group whose header goes right above entries[index]: the first row of each
// group (in the ordered list), and only when headers are shown at all.
export function groupStartingAt(entries: TimeEntry[], index: number, showGroups: boolean, groups: EntryGroup[]): EntryGroup | null {
  if (!showGroups) return null
  const key = entries[index].group_name || ''
  if (index > 0 && (entries[index - 1].group_name || '') === key) return null
  return groups.find(g => g.key === key) ?? null
}

// Distinct existing group/department names — used for the form autocomplete.
export function listGroupNames(entries: TimeEntry[]): string[] {
  return Array.from(new Set(entries.map(e => e.group_name).filter((g): g is string => !!g && g.trim() !== ''))).sort()
}

// Group entries by group_name for the grouped list view; named groups first
// (alphabetical), ungrouped entries in a trailing bucket. Each group carries
// its subtotal (seconds + money).
export function groupEntries(entries: TimeEntry[]): EntryGroup[] {
  const map = new Map<string, TimeEntry[]>()
  for (const e of entries) {
    const key = e.group_name || ''
    const list = map.get(key)
    if (list) list.push(e)
    else map.set(key, [e])
  }
  const groups = Array.from(map.entries()).map(([key, list]) => ({
    key,
    label: key || 'Ungrouped',
    entries: list,
    seconds: totalSeconds(list),
    money: totalMoney(list),
  }))
  groups.sort((a, b) => (a.key === '' ? 1 : b.key === '' ? -1 : a.label.localeCompare(b.label)))
  return groups
}

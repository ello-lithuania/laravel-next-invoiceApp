import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { timeEntries, clients as clientsApi, invoices as invoicesApi, Client, TimeEntry, TrackableInvoice } from '@/lib/api'
import { useRefetchOnReturn } from '@/lib/useRefetchOnReturn'
import { getErrorMessage } from '@/lib/utils'
import { buildTrackableMap, groupEntries, listGroupNames } from './entryHelpers'

interface Options {
  // Called after every successful load with the fresh list (the timer follows it).
  onLoaded: (entries: TimeEntry[]) => void
}

// Server state of the page: the filtered entries, the clients and prepaid
// invoices they refer to, and the mutations that change them. Every mutation
// reloads the list at the end, so the screen always shows what the server has.
export function useTimeEntries({ onLoaded }: Options) {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [trackableInvoices, setTrackableInvoices] = useState<TrackableInvoice[]>([])
  const [loading, setLoading] = useState(true)

  const [filterClient, setFilterClient] = useState('')
  const [filterInvoiced, setFilterInvoiced] = useState('false')

  const reload = useCallback(async () => {
    const params = new URLSearchParams()
    if (filterClient) params.set('client_id', filterClient)
    if (filterInvoiced !== '') params.set('invoiced', filterInvoiced)
    try {
      const [entriesData, clientsData, trackableData] = await Promise.all([
        timeEntries.list(params.toString()),
        clientsApi.list(),
        invoicesApi.trackable(),
      ])
      setEntries(entriesData)
      setClients(clientsData)
      setTrackableInvoices(trackableData)
      onLoaded(entriesData)
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Failed to load data'))
    }
    setLoading(false)
  }, [filterClient, filterInvoiced, onLoaded])

  useEffect(() => {
    reload()
  }, [reload])

  useRefetchOnReturn(reload)

  // An empty list is different from an empty account: a client filter, or any
  // invoiced-filter other than the default "Not invoiced", means results were
  // filtered out — say so instead of "create your first entry".
  const filtersActive = !!filterClient || filterInvoiced !== 'false'
  const resetFilters = () => { setFilterClient(''); setFilterInvoiced('') }

  const groups = useMemo(() => groupEntries(entries), [entries])
  const existingGroups = useMemo(() => listGroupNames(entries), [entries])
  const trackableMap = useMemo(() => buildTrackableMap(trackableInvoices), [trackableInvoices])

  // Only insert group headers when it adds information: more than one group,
  // or a single, explicitly-named group.
  const showGroups = groups.length > 1 || (groups.length === 1 && groups[0].key !== '')

  // Entries ordered so same-group rows are adjacent (matches `groups` order).
  const orderedEntries = useMemo(
    () => (showGroups ? groups.flatMap(g => g.entries) : entries),
    [showGroups, groups, entries]
  )

  const remove = async (id: number) => {
    try {
      await timeEntries.delete(id)
      toast.success('Time entry deleted')
      reload()
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Failed to delete'))
    }
  }

  // Add minutes to an entry. Resolves true on success.
  const addMinutes = async (entryId: number, minutes: number): Promise<boolean> => {
    try {
      await timeEntries.addTime(entryId, minutes)
      toast.success(`+${minutes} min. added`)
      reload()
      return true
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Failed to add time'))
      return false
    }
  }

  // Put entries into a group (or null to remove them from theirs). Regroups
  // local state immediately, then reconciles via reload.
  const changeGroup = async (ids: number[], group: string | null) => {
    await timeEntries.bulkUpdateGroup(ids, group)
    setEntries(prev => prev.map(e => (ids.includes(e.id) ? { ...e, group_name: group } : e)))
  }

  // Assign entries to a group (existing name, a new name, or null to remove).
  // Resolves true on success.
  const assignGroup = async (ids: number[], group: string | null): Promise<boolean> => {
    if (ids.length === 0) return false
    try {
      await changeGroup(ids, group)
      toast.success(group ? `Assigned to "${group}"` : 'Group removed')
      reload()
      return true
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Failed to update group'))
      return false
    }
  }

  // Remove the group from every entry in a section (one click on the header).
  const ungroup = async (groupKey: string) => {
    const ids = entries.filter(e => (e.group_name || '') === groupKey).map(e => e.id)
    if (ids.length === 0) return
    try {
      await changeGroup(ids, null)
      toast.success('Ungrouped')
      reload()
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Failed to ungroup'))
    }
  }

  return {
    entries, clients, trackableInvoices, trackableMap, loading, reload,
    filterClient, setFilterClient, filterInvoiced, setFilterInvoiced, filtersActive, resetFilters,
    groups, existingGroups, showGroups, orderedEntries,
    remove, addMinutes, assignGroup, ungroup,
  }
}

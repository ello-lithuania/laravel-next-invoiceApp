'use client'
import { useState } from 'react'
import { toast } from 'react-toastify'
import { timeEntries, TimeEntry, TimeEntryEvent } from '@/lib/api'
import { getErrorMessage } from '@/lib/utils'
import ConfirmModal from '@/components/ConfirmModal'
import { useTimeEntries } from '@/components/time-tracking/useTimeEntries'
import { useRunningTimer } from '@/components/time-tracking/useRunningTimer'
import { useEntryForm } from '@/components/time-tracking/useEntryForm'
import { isSelectable } from '@/components/time-tracking/entryHelpers'
import { TimeTrackingSkeleton } from '@/components/time-tracking/TimeTrackingSkeleton'
import { RunningTimerBanner } from '@/components/time-tracking/RunningTimerBanner'
import { EntryForm } from '@/components/time-tracking/EntryForm'
import { FilterBar } from '@/components/time-tracking/FilterBar'
import { BulkActions } from '@/components/time-tracking/BulkActions'
import { EntriesPanel } from '@/components/time-tracking/EntriesPanel'
import { SelectionSummary } from '@/components/time-tracking/SelectionSummary'
import { AssignGroupDialog } from '@/components/time-tracking/AssignGroupDialog'
import { ConvertDialog } from '@/components/time-tracking/ConvertDialog'
import { EntryTimelineModal } from '@/components/time-tracking/TimeTrackingModals'

// Entry whose timeline modal is open; `events` is null while they load.
interface Timeline {
  entry: TimeEntry
  events: TimeEntryEvent[] | null
}

export default function TimeTracking() {
  const timer = useRunningTimer()
  const data = useTimeEntries({ onLoaded: timer.syncWithEntries })
  const entryForm = useEntryForm({ trackableInvoices: data.trackableInvoices, onSaved: data.reload })

  const [showDates, setShowDates] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [timeline, setTimeline] = useState<Timeline | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const { entries } = data
  const selectedEntries = entries.filter(e => selectedIds.includes(e.id))
  const selectedClientCount = new Set(selectedEntries.map(e => e.client_id)).size
  const canConvert = selectedIds.length > 0 && selectedClientCount === 1

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]))
  }

  const toggleSelectAll = () => {
    const selectable = entries.filter(isSelectable)
    const allSelected = selectable.every(e => selectedIds.includes(e.id))
    setSelectedIds(allSelected ? [] : selectable.map(e => e.id))
  }

  // Select all billable entries in a group and open the convert-to-invoice
  // modal — one click to invoice a whole group, no manual checkbox picking.
  const invoiceGroup = (groupKey: string) => {
    const billable = entries.filter(e => (e.group_name || '') === groupKey && isSelectable(e))
    if (billable.length === 0) { toast.info('No billable entries in this group'); return }
    const clientIds = new Set(billable.map(e => e.client_id))
    if (clientIds.size > 1) { toast.error('This group has entries from several clients — invoice each client separately'); return }
    setSelectedIds(billable.map(e => e.id))
    setShowConvertModal(true)
  }

  const assignToGroup = async (group: string | null) => {
    if (await data.assignGroup(selectedIds, group)) {
      setShowGroupModal(false)
      setSelectedIds([])
    }
  }

  const openTimeline = async (entry: TimeEntry) => {
    setTimeline({ entry, events: null })
    try {
      const events = await timeEntries.events(entry.id)
      setTimeline(prev => (prev?.entry.id === entry.id ? { entry, events } : prev))
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Failed to load timeline'))
      setTimeline(null)
    }
  }

  const startEntry = async (entry: TimeEntry) => {
    if (await timer.start(entry)) data.reload()
  }

  const confirmStop = async () => {
    if (await timer.confirmStop()) data.reload()
  }

  const confirmDelete = () => {
    if (deleteId !== null) data.remove(deleteId)
    setDeleteId(null)
  }

  if (data.loading) return <TimeTrackingSkeleton />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">Time Tracking</h1>
          <p className="text-gray-500 dark:text-gray-400">Track time and convert to invoices</p>
        </div>
        <button
          onClick={() => entryForm.dispatch({ type: 'toggleNew' })}
          className="w-full sm:w-auto text-center btn-gradient px-6 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 bd-clip-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Entry
        </button>
      </div>

      {timer.runningEntry && (
        <RunningTimerBanner
          entry={timer.runningEntry}
          elapsed={timer.elapsed}
          isStopping={timer.stoppingEntry?.id === timer.runningEntry.id}
          stopMinutes={timer.stopMinutes}
          onStopMinutesChange={timer.setStopMinutes}
          onStop={timer.beginStop}
          onConfirmStop={confirmStop}
          onCancelStop={timer.cancelStop}
        />
      )}

      {entryForm.form.open && (
        <EntryForm
          values={entryForm.form.values}
          editingId={entryForm.form.editingId}
          saving={entryForm.saving}
          clients={data.clients}
          clientInvoices={entryForm.clientInvoices}
          savedRates={entryForm.savedRates}
          savedDescriptions={entryForm.savedDescriptions}
          existingGroups={data.existingGroups}
          onChange={patch => entryForm.dispatch({ type: 'change', patch })}
          onSubmit={entryForm.submit}
          onCancel={() => entryForm.dispatch({ type: 'close' })}
        />
      )}

      <FilterBar
        clients={data.clients}
        filterClient={data.filterClient}
        onFilterClientChange={data.setFilterClient}
        filterInvoiced={data.filterInvoiced}
        onFilterInvoicedChange={data.setFilterInvoiced}
        showDates={showDates}
        onToggleDates={() => setShowDates(v => !v)}
      >
        {selectedIds.length > 0 && (
          <BulkActions
            selectedCount={selectedIds.length}
            canConvert={canConvert}
            onAssignGroup={() => setShowGroupModal(true)}
            onConvert={() => canConvert ? setShowConvertModal(true) : toast.error('Select entries from one client only')}
          />
        )}
      </FilterBar>

      <EntriesPanel
        entries={data.orderedEntries}
        groups={data.groups}
        showGroups={data.showGroups}
        selectedIds={selectedIds}
        showDates={showDates}
        trackableMap={data.trackableMap}
        live={{ runningId: timer.runningEntry?.id ?? null, elapsed: timer.elapsed }}
        filtersActive={data.filtersActive}
        onResetFilters={data.resetFilters}
        onToggleSelect={toggleSelect}
        onToggleAll={toggleSelectAll}
        onAddMinutes={data.addMinutes}
        actions={{
          onTimeline: openTimeline,
          onStart: startEntry,
          onStop: timer.beginStop,
          onEdit: entry => entryForm.dispatch({ type: 'edit', entry }),
          onDelete: setDeleteId,
        }}
        groupActions={{ onInvoice: invoiceGroup, onUngroup: data.ungroup }}
      />

      {selectedIds.length > 0 && (
        <SelectionSummary
          selectedCount={selectedIds.length}
          selectedEntries={selectedEntries}
          canConvert={canConvert}
          clientCount={selectedClientCount}
        />
      )}

      <EntryTimelineModal
        open={timeline !== null}
        onClose={() => setTimeline(null)}
        entry={timeline?.entry ?? null}
        events={timeline?.events ?? null}
      />

      {showGroupModal && (
        <AssignGroupDialog
          selectedCount={selectedIds.length}
          existingGroups={data.existingGroups}
          onApply={assignToGroup}
          onClose={() => setShowGroupModal(false)}
        />
      )}

      <ConvertDialog
        open={showConvertModal}
        selectedIds={selectedIds}
        selectedEntries={selectedEntries}
        onClose={() => setShowConvertModal(false)}
        onConverted={() => { setSelectedIds([]); setShowConvertModal(false) }}
      />

      <ConfirmModal
        open={deleteId !== null}
        title="Delete Time Entry"
        message="Are you sure you want to delete this time entry?"
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}

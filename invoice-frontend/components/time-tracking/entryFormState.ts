import type { TimeEntry, TrackableInvoice } from '@/lib/api'

// Inputs are strings because that is what <input> hands us; they are converted
// to numbers only when the form is submitted.
export interface EntryFormValues {
  client_id: string
  group_name: string
  description: string
  hourly_rate: string
  duration_hours: string
  duration_minutes: string
  is_prepaid: boolean
  invoice_id: string
}

// Visibility, edit target and field values always change together, so they
// live in one reducer instead of three separate useState calls.
export interface EntryFormState {
  open: boolean
  editingId: number | null
  values: EntryFormValues
}

export type EntryFormAction =
  | { type: 'change'; patch: Partial<EntryFormValues> }
  | { type: 'open' }
  | { type: 'toggleNew' }
  | { type: 'close' }
  | { type: 'edit'; entry: TimeEntry }
  | { type: 'trackInvoice'; invoice: TrackableInvoice; savedRate: string }

const emptyValues: EntryFormValues = {
  client_id: '',
  group_name: '',
  description: '',
  hourly_rate: '',
  duration_hours: '',
  duration_minutes: '',
  is_prepaid: false,
  invoice_id: '',
}

export const initialEntryFormState: EntryFormState = { open: false, editingId: null, values: emptyValues }

export function entryFormReducer(state: EntryFormState, action: EntryFormAction): EntryFormState {
  switch (action.type) {
    case 'change':
      return { ...state, values: { ...state.values, ...action.patch } }
    case 'open':
      return { ...state, open: true }
    case 'toggleNew':
      // Same button opens a blank form or, when a form is already open, closes it.
      return { open: !state.open, editingId: null, values: emptyValues }
    case 'close':
      return initialEntryFormState
    case 'edit': {
      const { entry } = action
      return {
        open: true,
        editingId: entry.id,
        values: {
          client_id: String(entry.client_id),
          group_name: entry.group_name || '',
          description: entry.description,
          hourly_rate: String(entry.hourly_rate),
          duration_hours: String(Math.floor(entry.duration_seconds / 3600)),
          duration_minutes: String(Math.floor((entry.duration_seconds % 3600) / 60)),
          is_prepaid: !!entry.is_prepaid,
          invoice_id: entry.invoice_id ? String(entry.invoice_id) : '',
        },
      }
    }
    case 'trackInvoice':
      // Pre-fill the form for tracking time against an already-issued invoice.
      return {
        ...state,
        open: true,
        values: {
          ...state.values,
          client_id: String(action.invoice.client_id),
          hourly_rate: state.values.hourly_rate || action.savedRate,
          is_prepaid: true,
          invoice_id: String(action.invoice.id),
        },
      }
  }
}

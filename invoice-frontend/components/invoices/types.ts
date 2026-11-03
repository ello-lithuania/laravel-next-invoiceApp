import type { invoices } from '@/lib/api'

// The form edits exactly what the API accepts, so derive the shape from
// `invoices.create` instead of re-declaring it. Only two fields differ:
// the client <input> holds the id as a string, and notes are never undefined.
type InvoicePayload = Parameters<typeof invoices.create>[0]

export type InvoiceFormItem = InvoicePayload['items'][number]

export type InvoiceFormValues = Omit<InvoicePayload, 'client_id' | 'notes'> & {
  client_id: string
  notes: string
}

export const emptyItem: InvoiceFormItem = { description: '', unit: 'h', quantity: 1, price: 0 }

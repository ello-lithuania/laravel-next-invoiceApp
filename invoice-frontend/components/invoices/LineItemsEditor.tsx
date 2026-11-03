import type { FocusEvent } from 'react'
import { INVOICE_UNITS } from '@/lib/utils'
import { emptyItem, type InvoiceFormItem } from './types'

const inputClass = 'p-3 bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700/60 rounded-lg text-gray-800 dark:text-gray-100 focus:border-blue-500 focus:outline-hidden transition-colors'

interface LineItemsEditorProps {
  items: InvoiceFormItem[]
  onChange: (items: InvoiceFormItem[]) => void
  /** Suggestions for the description <datalist>. */
  savedDescriptions: string[]
  /** Hide the remove button on the first row, so an invoice always keeps one item. */
  lockFirstItem: boolean
  /** Select the number when a Qty/Price field gets focus, so typing replaces it. */
  selectOnFocus: boolean
  formatMoney: (value: number) => string
}

function UnitOptions({ unit }: { unit: string }) {
  return (
    <>
      {INVOICE_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
      {/* Older invoices may use a unit we no longer offer - keep it selectable. */}
      {unit && !INVOICE_UNITS.includes(unit) && <option value={unit}>{unit}</option>}
    </>
  )
}

function RemoveIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

export default function LineItemsEditor({
  items,
  onChange,
  savedDescriptions,
  lockFirstItem,
  selectOnFocus,
  formatMoney,
}: LineItemsEditorProps) {
  const addItem = () => onChange([...items, { ...emptyItem }])

  const removeItem = (index: number) => onChange(items.filter((_, i) => i !== index))

  const updateItem = <K extends keyof InvoiceFormItem>(index: number, field: K, value: InvoiceFormItem[K]) => {
    onChange(items.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  const handleFocus = selectOnFocus
    ? (e: FocusEvent<HTMLInputElement>) => e.currentTarget.select()
    : undefined

  return (
    <div className="mb-6">
      <label className="block text-gray-500 dark:text-gray-400 text-sm mb-3">Items</label>
      <div className="hidden md:grid grid-cols-12 gap-3 mb-2 text-gray-400 dark:text-gray-500 text-sm">
        <div className="col-span-5">Description</div>
        <div className="col-span-2">Unit</div>
        <div className="col-span-2">Qty</div>
        <div className="col-span-2">Price</div>
        <div className="col-span-1"></div>
      </div>
      <div className="space-y-3">
        {items.map((item, index) => {
          const canRemove = !lockFirstItem || index > 0
          return (
            <div key={index}>
              {/* Desktop row */}
              <div className="hidden md:grid grid-cols-12 gap-3">
                <input
                  type="text"
                  list="descriptions"
                  data-desc-index={index}
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                  className={`col-span-5 ${inputClass}`}
                  required
                />
                <select
                  value={item.unit}
                  onChange={(e) => updateItem(index, 'unit', e.target.value)}
                  className={`col-span-2 ${inputClass}`}
                >
                  <UnitOptions unit={item.unit} />
                </select>
                <input
                  type="number"
                  placeholder="Qty"
                  onFocus={handleFocus}
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                  className={`col-span-2 ${inputClass}`}
                  min="0"
                  step="0.01"
                />
                <input
                  type="number"
                  placeholder="Price"
                  onFocus={handleFocus}
                  value={item.price}
                  onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                  className={`col-span-2 ${inputClass}`}
                  min="0"
                  step="0.01"
                />
                <div className="col-span-1 flex items-center justify-center">
                  {canRemove && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      title="Remove"
                      className="flex items-center justify-center text-red-400 hover:text-red-300 transition-colors"
                    >
                      <RemoveIcon />
                    </button>
                  )}
                </div>
              </div>
              {/* Mobile stacked */}
              <div className="md:hidden bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700/60 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400 text-sm">Item {index + 1}</span>
                  {canRemove && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <RemoveIcon />
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  list="descriptions"
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                  className={`w-full ${inputClass}`}
                  required
                />
                <div className="grid grid-cols-3 gap-3">
                  <select
                    value={item.unit}
                    onChange={(e) => updateItem(index, 'unit', e.target.value)}
                    className={inputClass}
                  >
                    <UnitOptions unit={item.unit} />
                  </select>
                  <input
                    type="number"
                    placeholder="Qty"
                    onFocus={handleFocus}
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                    className={inputClass}
                    min="0"
                    step="0.01"
                  />
                  <input
                    type="number"
                    placeholder="Price"
                    onFocus={handleFocus}
                    value={item.price}
                    onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                    className={inputClass}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="text-right text-gray-600 dark:text-gray-300 text-sm">
                  Subtotal: {formatMoney(item.quantity * item.price)}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-3 flex items-center gap-5 flex-wrap">
        <button
          type="button"
          onClick={addItem}
          className="text-blue-500 hover:text-blue-400 transition-colors flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add item
        </button>
      </div>
      <datalist id="descriptions">
        {savedDescriptions.map((desc, i) => <option key={i} value={desc} />)}
      </datalist>
    </div>
  )
}

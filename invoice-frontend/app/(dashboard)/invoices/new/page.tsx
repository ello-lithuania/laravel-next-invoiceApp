'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { invoices, clients as clientsApi, catalog, CatalogItem, ClientHistory, ClientHistoryItem } from '@/lib/api'
import { toast } from 'react-toastify'
import { statusColors, formatCurrency, refreshStats } from '@/lib/utils'

interface InvoiceItem {
  description: string
  unit: string
  quantity: number
  price: number
}

interface Client {
  id: number
  name: string
}

const emptyItem: InvoiceItem = { description: '', unit: 'h', quantity: 1, price: 0 }

const getDefaultDueDate = () => {
  const date = new Date()
  date.setDate(date.getDate() + 30)
  return date.toISOString().split('T')[0]
}

export default function NewInvoice() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [clientSearch, setClientSearch] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [savedDescriptions, setSavedDescriptions] = useState<string[]>([])
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([])
  const [showCatalog, setShowCatalog] = useState(false)
  const [clientHistory, setClientHistory] = useState<ClientHistory | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [repeating, setRepeating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    client_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: getDefaultDueDate(),
    notes: '',
    items: [{ ...emptyItem }]
  })

  useEffect(() => {
    loadClients()
    catalog.list().then(setCatalogItems).catch(() => {})
    const saved = localStorage.getItem('savedDescriptions')
    if (saved) setSavedDescriptions(JSON.parse(saved))
  }, [])

  // Pull this client's billing history whenever the selected client changes,
  // so we can suggest the exact services + prices used for *them* before.
  useEffect(() => {
    if (!form.client_id) { setClientHistory(null); return }
    let active = true
    setHistoryLoading(true)
    invoices.clientHistory(form.client_id)
      .then(h => { if (active) setClientHistory(h) })
      .catch(() => { if (active) setClientHistory(null) })
      .finally(() => { if (active) setHistoryLoading(false) })
    return () => { active = false }
  }, [form.client_id])

  // One-click "repeat last invoice": pull the client's most recent invoice in
  // full and copy its line items (and notes) into the form — ideal for the
  // same monthly retainer billing.
  const repeatLastInvoice = async () => {
    const last = clientHistory?.invoices?.[0]
    if (!last) return
    setRepeating(true)
    try {
      const full = await invoices.get(last.id)
      const items = (full.items || []).map(it => ({
        description: it.description,
        unit: it.unit || 'h',
        quantity: Number(it.quantity) || 1,
        price: Number(it.price) || 0,
      }))
      setForm(prev => ({
        ...prev,
        items: items.length ? items : prev.items,
        notes: full.notes || prev.notes,
      }))
      toast.success(`Copied items from ${last.series} ${last.number}`)
    } catch (e: any) {
      toast.error(e.message || 'Failed to load that invoice')
    }
    setRepeating(false)
  }

  // Insert a remembered line item (description + unit + the price used for this
  // client) as a new row, reusing the empty trailing row if there is one.
  const insertHistoryItem = (hi: ClientHistoryItem) => {
    setForm(prev => {
      const items = [...prev.items]
      const newItem = { description: hi.description, unit: hi.unit || 'h', quantity: 1, price: Number(hi.price) || 0 }
      const last = items[items.length - 1]
      if (last && !last.description && !last.price) items[items.length - 1] = newItem
      else items.push(newItem)
      return { ...prev, items }
    })
  }

  // Insert a catalog preset as a new item row; if it has a {} placeholder,
  // focus the description and place the caret where the variable goes.
  const insertFromCatalog = (ci: CatalogItem) => {
    const ph = ci.description.indexOf('{}')
    const desc = ph >= 0 ? ci.description.replace('{}', '') : ci.description
    const caret = ph >= 0 ? ph : desc.length
    setForm(prev => {
      const items = [...prev.items]
      const newItem = { description: desc, unit: ci.unit || 'h', quantity: 1, price: Number(ci.price) || 0 }
      const last = items[items.length - 1]
      let target: number
      if (last && !last.description && !last.price) { items[items.length - 1] = newItem; target = items.length - 1 }
      else { items.push(newItem); target = items.length - 1 }
      setTimeout(() => {
        const el = document.querySelector<HTMLInputElement>(`input[data-desc-index="${target}"]`)
        if (el) { el.focus(); el.setSelectionRange(caret, caret) }
      }, 30)
      return { ...prev, items }
    })
    setShowCatalog(false)
  }

  const saveToCatalog = async (item: InvoiceItem) => {
    if (!item.description.trim()) { toast.info('Add a description first'); return }
    try {
      await catalog.create({ description: item.description, unit: item.unit, price: item.price })
      const list = await catalog.list()
      setCatalogItems(list)
      toast.success('Saved to catalog')
    } catch (e: any) {
      toast.error(e.message || 'Failed to save')
    }
  }

  const deleteFromCatalog = async (id: number) => {
    try {
      await catalog.delete(id)
      setCatalogItems(prev => prev.filter(c => c.id !== id))
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete')
    }
  }

  const loadClients = async () => {
    try {
      const data = await clientsApi.list()
      setClients(data)
    } catch (e) {
      toast.error('Failed to load clients')
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const newDescriptions = form.items.map(i => i.description).filter(d => d && !savedDescriptions.includes(d))
      if (newDescriptions.length > 0) {
        const updated = [...new Set([...savedDescriptions, ...newDescriptions])]
        localStorage.setItem('savedDescriptions', JSON.stringify(updated))
      }
      await invoices.create({ ...form, client_id: Number(form.client_id) })
      refreshStats()
      toast.success('Invoice created successfully')
      router.push('/invoices')
    } catch (e: any) {
      toast.error(e.message || 'Failed to create invoice')
    }
    setSaving(false)
  }

  const addItem = () => {
    setForm({ ...form, items: [...form.items, { ...emptyItem }] })
  }

  const removeItem = (index: number) => {
    setForm({ ...form, items: form.items.filter((_, i) => i !== index) })
  }

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const items = [...form.items]
    items[index] = { ...items[index], [field]: value }
    setForm({ ...form, items })
  }

  const getTotal = () => {
    return form.items.reduce((sum, item) => sum + (item.quantity * item.price), 0).toFixed(2)
  }

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  ).slice(0, 10)

  const selectedClient = clients.find(c => c.id === Number(form.client_id))

  if (loading) return <div className="text-gray-800 dark:text-gray-100 p-8">Loading...</div>

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/invoices" className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">New Invoice</h1>
          <p className="text-gray-500 dark:text-gray-400">Create a new invoice</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700/60 prism-card p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-gray-500 dark:text-gray-400 text-sm mb-2">Client *</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search client..."
                  value={showClientDropdown ? clientSearch : (selectedClient?.name || '')}
                  onChange={(e) => {
                    setClientSearch(e.target.value)
                    setShowClientDropdown(true)
                    if (!e.target.value) setForm({ ...form, client_id: '' })
                  }}
                  onFocus={() => setShowClientDropdown(true)}
                  className="w-full p-3 bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700/60 rounded-lg text-gray-800 dark:text-gray-100 focus:border-blue-500 focus:outline-none transition-colors"
                  required={!form.client_id}
                />
                {showClientDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700/60 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredClients.length === 0 ? (
                      <div className="p-3 text-gray-400 dark:text-gray-500">No clients found</div>
                    ) : (
                      filteredClients.map(c => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setForm({ ...form, client_id: String(c.id) })
                            setClientSearch('')
                            setShowClientDropdown(false)
                          }}
                          className="p-3 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer text-gray-800 dark:text-gray-100 transition-colors"
                        >
                          {c.name}
                        </div>
                      ))
                    )}
                  </div>
                )}
                {showClientDropdown && (
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowClientDropdown(false)}
                  />
                )}
              </div>
            </div>
            <div>
              <label className="block text-gray-500 dark:text-gray-400 text-sm mb-2">Invoice Date *</label>
              <input
                type="date"
                value={form.invoice_date}
                onChange={(e) => setForm({ ...form, invoice_date: e.target.value })}
                className="w-full p-3 bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700/60 rounded-lg text-gray-800 dark:text-gray-100 focus:border-blue-500 focus:outline-none transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-gray-500 dark:text-gray-400 text-sm mb-2">Due Date *</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="w-full p-3 bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700/60 rounded-lg text-gray-800 dark:text-gray-100 focus:border-blue-500 focus:outline-none transition-colors"
                required
              />
            </div>
          </div>

          {/* Per-client history — remembers the services & prices used for this
              specific client so they don't have to be re-typed each time. */}
          {form.client_id && (
            <div className="mb-6 rounded-xl overflow-hidden" style={{ background: 'var(--t-bg-elevated)', border: '1px solid var(--t-border-light)' }}>
              <div className="px-4 py-2.5 flex items-center gap-2 flex-wrap" style={{ borderBottom: '1px solid var(--t-border-light)' }}>
                <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--t-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-semibold t-text">History for {selectedClient?.name}</span>
                {clientHistory && clientHistory.invoices.length > 0 && (
                  <span className="text-xs t-text-muted">· {clientHistory.invoices.length} recent invoice{clientHistory.invoices.length === 1 ? '' : 's'}</span>
                )}
                {clientHistory && clientHistory.invoices.length > 0 && (
                  <button
                    type="button"
                    onClick={repeatLastInvoice}
                    disabled={repeating}
                    className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-60"
                    style={{ background: 'var(--t-accent-soft)', color: 'var(--t-accent)' }}
                    title={`Copy all items from ${clientHistory.invoices[0].series} ${clientHistory.invoices[0].number}`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {repeating ? 'Copying…' : 'Repeat last invoice'}
                  </button>
                )}
              </div>

              <div className="p-4 space-y-4">
                {historyLoading ? (
                  <p className="text-sm t-text-muted">Loading history…</p>
                ) : !clientHistory || clientHistory.items.length === 0 ? (
                  <p className="text-sm t-text-muted">No previous invoices for this client yet. Items you bill now will be suggested next time.</p>
                ) : (
                  <>
                    <div>
                      <p className="text-xs uppercase tracking-wider font-medium t-text-muted mb-2">Previously billed — tap to add</p>
                      <div className="flex flex-wrap gap-2">
                        {clientHistory.items.map((hi, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => insertHistoryItem(hi)}
                            title={`Used ${hi.count}× · last ${hi.last_used?.split('T')[0]}`}
                            className="group inline-flex items-center gap-2 pl-3 pr-2.5 py-1.5 rounded-full text-sm transition-all"
                            style={{ background: 'var(--t-bg-card)', border: '1px solid var(--t-border)', color: 'var(--t-text-secondary)' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--t-accent)'; e.currentTarget.style.color = 'var(--t-text)' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--t-border)'; e.currentTarget.style.color = 'var(--t-text-secondary)' }}
                          >
                            <span className="truncate max-w-[220px]">{hi.description}</span>
                            <span className="text-xs font-semibold tabular-nums shrink-0" style={{ color: 'var(--t-accent)' }}>
                              {Number(hi.price).toFixed(2)} €{hi.unit ? `/${hi.unit}` : ''}
                            </span>
                            <svg className="w-3.5 h-3.5 shrink-0 opacity-50 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        ))}
                      </div>
                    </div>

                    {clientHistory.invoices.length > 0 && (
                      <div>
                        <p className="text-xs uppercase tracking-wider font-medium t-text-muted mb-2">Recent invoices</p>
                        <div className="flex flex-wrap gap-2">
                          {clientHistory.invoices.map(inv => (
                            <Link
                              key={inv.id}
                              href={`/invoices/edit?id=${inv.id}`}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors"
                              style={{ background: 'var(--t-bg-card)', border: '1px solid var(--t-border-light)' }}
                            >
                              <span className="font-medium t-text">{inv.series} {inv.number}</span>
                              <span className="t-text-muted">{inv.invoice_date?.split('T')[0]}</span>
                              <span className="font-semibold tabular-nums t-text">{formatCurrency(Number(inv.total))}</span>
                              <span className={`px-2 py-0.5 rounded-full font-medium ${statusColors[inv.status || 'draft']}`}>{inv.status}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

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
              {form.items.map((item, index) => (
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
                      className="col-span-5 p-3 bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700/60 rounded-lg text-gray-800 dark:text-gray-100 focus:border-blue-500 focus:outline-none transition-colors"
                      required
                    />
                    <select
                      value={item.unit}
                      onChange={(e) => updateItem(index, 'unit', e.target.value)}
                      className="col-span-2 p-3 bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700/60 rounded-lg text-gray-800 dark:text-gray-100 focus:border-blue-500 focus:outline-none transition-colors"
                    >
                      <option value="h">h</option>
                      <option value="pcs">pcs</option>
                      <option value="m²">m²</option>
                      <option value="m">m</option>
                      <option value="kg">kg</option>
                    </select>
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="col-span-2 p-3 bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700/60 rounded-lg text-gray-800 dark:text-gray-100 focus:border-blue-500 focus:outline-none transition-colors"
                      min="0"
                      step="0.01"
                    />
                    <input
                      type="number"
                      placeholder="Price"
                      value={item.price}
                      onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                      className="col-span-2 p-3 bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700/60 rounded-lg text-gray-800 dark:text-gray-100 focus:border-blue-500 focus:outline-none transition-colors"
                      min="0"
                      step="0.01"
                    />
                    <div className="col-span-1 flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => saveToCatalog(item)}
                        title="Save to catalog"
                        className="transition-colors"
                        style={{ color: 'var(--t-text-muted)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--t-accent)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--t-text-muted)')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        title="Remove"
                        className="flex items-center justify-center text-red-400 hover:text-red-300 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {/* Mobile stacked */}
                  <div className="md:hidden bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700/60 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 dark:text-gray-400 text-sm">Item {index + 1}</span>
                      <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => saveToCatalog(item)}
                        title="Save to catalog"
                        style={{ color: 'var(--t-text-muted)' }}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      list="descriptions"
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      className="w-full p-3 bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700/60 rounded-lg text-gray-800 dark:text-gray-100 focus:border-blue-500 focus:outline-none transition-colors"
                      required
                    />
                    <div className="grid grid-cols-3 gap-3">
                      <select
                        value={item.unit}
                        onChange={(e) => updateItem(index, 'unit', e.target.value)}
                        className="p-3 bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700/60 rounded-lg text-gray-800 dark:text-gray-100 focus:border-blue-500 focus:outline-none transition-colors"
                      >
                        <option value="h">h</option>
                        <option value="pcs">pcs</option>
                        <option value="m²">m²</option>
                        <option value="m">m</option>
                        <option value="kg">kg</option>
                      </select>
                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        className="p-3 bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700/60 rounded-lg text-gray-800 dark:text-gray-100 focus:border-blue-500 focus:outline-none transition-colors"
                        min="0"
                        step="0.01"
                      />
                      <input
                        type="number"
                        placeholder="Price"
                        value={item.price}
                        onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                        className="p-3 bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700/60 rounded-lg text-gray-800 dark:text-gray-100 focus:border-blue-500 focus:outline-none transition-colors"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="text-right text-gray-600 dark:text-gray-300 text-sm">
                      Subtotal: {formatCurrency(item.quantity * item.price)}
                    </div>
                  </div>
                </div>
              ))}
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

              {/* Service catalog picker */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCatalog(s => !s)}
                  className="flex items-center gap-1.5 text-sm font-medium transition-colors"
                  style={{ color: 'var(--t-text-secondary)' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                  From catalog
                  <svg className={`w-3 h-3 transition-transform ${showCatalog ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 12 12"><path d="M5.9 8.4L.5 3l1.4-1.4 4 4 4-4L11.3 3z" /></svg>
                </button>

                {showCatalog && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowCatalog(false)} />
                    <div className="absolute left-0 mt-2 w-80 max-w-[90vw] z-20 rounded-xl shadow-2xl overflow-hidden"
                      style={{ background: 'var(--t-bg-card)', border: '1px solid var(--t-border)', backdropFilter: 'blur(16px)' }}>
                      <div className="px-3 py-2 text-[11px] uppercase tracking-wider font-bold t-text-muted" style={{ borderBottom: '1px solid var(--t-border-light)' }}>
                        Service catalog
                      </div>
                      <div className="max-h-72 overflow-y-auto">
                        {catalogItems.length === 0 ? (
                          <div className="px-3 py-6 text-center text-sm t-text-muted">
                            No saved services yet.<br />Use the ★ on a row to save one.
                          </div>
                        ) : catalogItems.map(ci => (
                          <div key={ci.id} className="flex items-center gap-2 px-3 py-2 transition-colors"
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--t-bg-elevated)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <button type="button" onClick={() => insertFromCatalog(ci)} className="flex-1 min-w-0 text-left">
                              <span className="block text-sm t-text truncate">{ci.description}</span>
                              <span className="block text-xs t-text-muted">{ci.unit} · {Number(ci.price).toFixed(2)} €</span>
                            </button>
                            <button type="button" onClick={() => deleteFromCatalog(ci.id)} title="Delete from catalog"
                              className="shrink-0 text-red-400 hover:text-red-300 transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="px-3 py-2 text-[11px] t-text-muted" style={{ borderTop: '1px solid var(--t-border-light)', background: 'var(--t-bg-elevated)' }}>
                        Tip: put <code className="px-1 rounded" style={{ background: 'var(--t-bg-card)' }}>{'{}'}</code> in a saved description where the name goes — e.g. <span className="t-text-secondary">Puslapio redagavimo paslaugos „{'{}'}"</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            <datalist id="descriptions">
              {savedDescriptions.map((desc, i) => <option key={i} value={desc} />)}
            </datalist>
          </div>

          <div className="mb-6">
            <label className="block text-gray-500 dark:text-gray-400 text-sm mb-2">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full p-3 bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700/60 rounded-lg text-gray-800 dark:text-gray-100 focus:border-blue-500 focus:outline-none transition-colors"
              rows={2}
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-700/60">
            <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">Total: {formatCurrency(Number(getTotal()))}</div>
            <div className="flex gap-4 w-full sm:w-auto">
              <Link 
                href="/invoices"
                className="flex-1 sm:flex-initial text-center px-8 py-3 rounded-xl font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </Link>
              <button 
                type="submit"
                disabled={saving}
                className="flex-1 sm:flex-initial btn-gradient bd-clip-sm px-8 py-3 font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Create Invoice
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
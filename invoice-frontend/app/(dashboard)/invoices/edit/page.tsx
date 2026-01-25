'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { invoices, clients as clientsApi } from '@/lib/api'

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

function EditInvoiceForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const [clients, setClients] = useState<Client[]>([])
  const [clientSearch, setClientSearch] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [savedDescriptions, setSavedDescriptions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    client_id: '',
    invoice_date: '',
    due_date: '',
    notes: '',
    items: [{ ...emptyItem }]
  })

  useEffect(() => {
    loadData()
    const saved = localStorage.getItem('savedDescriptions')
    if (saved) setSavedDescriptions(JSON.parse(saved))
  }, [id])

  const loadData = async () => {
    try {
      const [cli, inv] = await Promise.all([
        clientsApi.list(),
        id ? invoices.get(Number(id)) : null
      ])
      setClients(cli)
      if (inv) {
        setForm({
          client_id: String(inv.client_id),
          invoice_date: inv.invoice_date.split('T')[0],
          due_date: inv.due_date.split('T')[0],
          notes: inv.notes || '',
          items: inv.items?.map(i => ({
            description: i.description,
            unit: i.unit,
            quantity: i.quantity,
            price: i.price
          })) || [{ ...emptyItem }]
        })
      }
    } catch (e) {}
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
      await invoices.update(Number(id), { ...form, client_id: Number(form.client_id) })
      router.push('/invoices')
    } catch (e) {}
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

  if (loading) return <div className="text-white p-8">Loading...</div>

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/invoices" className="text-slate-400 hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Edit Invoice</h1>
          <p className="text-slate-400">Update invoice details</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-slate-400 text-sm mb-2">Client *</label>
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
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors"
                  required={!form.client_id}
                />
                {showClientDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {filteredClients.length === 0 ? (
                      <div className="p-3 text-slate-500">No clients found</div>
                    ) : (
                      filteredClients.map(c => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setForm({ ...form, client_id: String(c.id) })
                            setClientSearch('')
                            setShowClientDropdown(false)
                          }}
                          className="p-3 hover:bg-slate-700 cursor-pointer text-white transition-colors"
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
              <label className="block text-slate-400 text-sm mb-2">Invoice Date *</label>
              <input
                type="date"
                value={form.invoice_date}
                onChange={(e) => setForm({ ...form, invoice_date: e.target.value })}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-2">Due Date *</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors"
                required
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-slate-400 text-sm mb-3">Items</label>
            <div className="grid grid-cols-12 gap-3 mb-2 text-slate-500 text-sm">
              <div className="col-span-5">Description</div>
              <div className="col-span-2">Unit</div>
              <div className="col-span-2">Qty</div>
              <div className="col-span-2">Price</div>
              <div className="col-span-1"></div>
            </div>
            <div className="space-y-3">
              {form.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-3">
                  <input
                    type="text"
                    list="descriptions"
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    className="col-span-5 p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors"
                    required
                  />
                  <select
                    value={item.unit}
                    onChange={(e) => updateItem(index, 'unit', e.target.value)}
                    className="col-span-2 p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors"
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
                    className="col-span-2 p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors"
                    min="0"
                    step="0.01"
                  />
                  <input
                    type="number"
                    placeholder="Price"
                    value={item.price}
                    onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                    className="col-span-2 p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors"
                    min="0"
                    step="0.01"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="col-span-1 flex items-center justify-center text-red-400 hover:text-red-300 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <button 
              type="button" 
              onClick={addItem} 
              className="mt-3 text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add item
            </button>
            <datalist id="descriptions">
              {savedDescriptions.map((desc, i) => <option key={i} value={desc} />)}
            </datalist>
          </div>

          <div className="mb-6">
            <label className="block text-slate-400 text-sm mb-2">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors"
              rows={2}
            />
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-800">
            <div className="text-2xl font-bold text-white">Total: {getTotal()} EUR</div>
            <div className="flex gap-4">
              <Link 
                href="/invoices"
                className="px-8 py-3 rounded-xl font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </Link>
              <button 
                type="submit"
                disabled={saving}
                className="bg-gradient-to-r from-blue-500 to-cyan-400 text-white px-8 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Update Invoice
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

export default function EditInvoice() {
  return (
    <Suspense fallback={<div className="text-white p-8">Loading...</div>}>
      <EditInvoiceForm />
    </Suspense>
  )
}
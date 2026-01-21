'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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

const getDefaultDueDate = () => {
  const date = new Date()
  date.setMonth(date.getMonth() + 1)
  return date.toISOString().split('T')[0]
}

export default function NewInvoice() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [savedDescriptions, setSavedDescriptions] = useState<string[]>([])
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
    const saved = localStorage.getItem('savedDescriptions')
    if (saved) setSavedDescriptions(JSON.parse(saved))
  }, [])

  const loadClients = async () => {
    try {
      const data = await clientsApi.list()
      setClients(data)
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
      await invoices.create(form)
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
          <h1 className="text-3xl font-bold text-white mb-2">New Invoice</h1>
          <p className="text-slate-400">Create a new invoice</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-slate-400 text-sm mb-2">Client *</label>
              <select
                value={form.client_id}
                onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors"
                required
              >
                <option value="">Select client...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
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
                    <option value="vnt">vnt</option>
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
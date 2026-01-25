'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { clients } from '@/lib/api'

interface ClientForm {
  name: string
  company_code: string
  vat_code: string
  address: string
  phone: string
  email: string
  notes: string
}

function EditClientForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<ClientForm>({ name: '', company_code: '', vat_code: '', address: '', phone: '', email: '', notes: '' })

  useEffect(() => {
    if (id) loadClient()
  }, [id])

  const loadClient = async () => {
    try {
      const data = await clients.get(Number(id))
      setForm({
        name: data.name || '',
        company_code: data.company_code || '',
        vat_code: data.vat_code || '',
        address: data.address || '',
        phone: data.phone || '',
        email: data.email || '',
        notes: data.notes || ''
      })
    } catch (e) {}
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await clients.update(Number(id), form)
      router.push('/clients')
    } catch (e) {}
    setSaving(false)
  }

  if (loading) return <div className="text-white p-8">Loading...</div>

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/clients" className="text-slate-400 hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Edit Client</h1>
          <p className="text-slate-400">Update client information</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-slate-400 text-sm mb-2">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-2">Company Code</label>
              <input
                type="text"
                value={form.company_code}
                onChange={(e) => setForm({ ...form, company_code: e.target.value })}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-2">VAT Code</label>
              <input
                type="text"
                value={form.vat_code}
                onChange={(e) => setForm({ ...form, vat_code: e.target.value })}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-2">Address</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-2">Phone</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-2">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-slate-400 text-sm mb-2">Internal Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors"
                rows={3}
                placeholder="Contact person, FB link, etc. (not shown on invoice)"
              />
              <p className="text-slate-500 text-sm mt-2">This information is for your reference only and will not appear on invoices</p>
            </div>
          </div>
          <div className="mt-6 flex gap-4">
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
                  Update Client
                </>
              )}
            </button>
            <Link 
              href="/clients"
              className="px-8 py-3 rounded-xl font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function EditClient() {
  return (
    <Suspense fallback={<div className="text-white p-8">Loading...</div>}>
      <EditClientForm />
    </Suspense>
  )
}
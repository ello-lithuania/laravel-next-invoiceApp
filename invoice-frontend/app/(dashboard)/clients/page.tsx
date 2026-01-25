'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { clients } from '@/lib/api'

interface Client {
  id: number
  name: string
  company_code?: string
  vat_code?: string
  address?: string
  phone?: string
  email?: string
  notes?: string
}

export default function Clients() {
  const [list, setList] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    try {
      const data = await clients.list()
      setList(data)
    } catch (e) {}
    setLoading(false)
  }

  const handleDelete = async (id: number) => {
    if (confirm('Delete this client?')) {
      await clients.delete(id)
      loadClients()
    }
  }

  if (loading) return <div className="text-white p-8">Loading...</div>

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Clients</h1>
          <p className="text-slate-400">Manage your clients and their details</p>
        </div>
        <Link
          href="/clients/new"
          className="px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-400 text-white hover:opacity-90"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Client
        </Link>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="px-6 py-4 text-left text-slate-400 text-sm font-medium">Name</th>
              <th className="px-6 py-4 text-left text-slate-400 text-sm font-medium">Company Code</th>
              <th className="px-6 py-4 text-left text-slate-400 text-sm font-medium">Address</th>
              <th className="px-6 py-4 text-left text-slate-400 text-sm font-medium">Notes</th>
              <th className="px-6 py-4 text-left text-slate-400 text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <div className="text-slate-500">
                    <svg className="w-12 h-12 mx-auto mb-3 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p>No clients yet</p>
                    <p className="text-sm mt-1">Add your first client to get started</p>
                  </div>
                </td>
              </tr>
            ) : (
              list.map((client) => (
                <tr key={client.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 text-white">{client.name}</td>
                  <td className="px-6 py-4 text-slate-300">{client.company_code}</td>
                  <td className="px-6 py-4 text-slate-300">{client.address}</td>
                  <td className="px-6 py-4 text-slate-400 text-sm max-w-xs truncate">{client.notes}</td>
                  <td className="px-6 py-4">
                    <Link 
                      href={`/clients/edit?id=${client.id}`}
                      className="text-blue-400 hover:text-blue-300 mr-4 transition-colors"
                    >
                      Edit
                    </Link>
                    <button 
                      onClick={() => handleDelete(client.id)} 
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
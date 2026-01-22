'use client'
import { useState, useEffect, useRef } from 'react'
import { profile } from '@/lib/api'

interface User {
  name: string
  email: string
  company_code: string
  vat_code: string
  address: string
  phone: string
  website: string
  bank_name: string
  bank_account: string
  invoice_series: string
  next_invoice_number: number
  signature?: string
  signature_url?: string
}

export default function Profile() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [uploadingSignature, setUploadingSignature] = useState(false)
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const data = await profile.get()
      setUser(data)
    } catch (e) {}
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      const data = await profile.update(user)
      setUser(data)
      setMessage('Profile saved successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (e) {
      setMessage('Error saving profile')
    }
    setSaving(false)
  }

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.includes('png')) {
      setMessage('Only PNG files allowed')
      setTimeout(() => setMessage(''), 3000)
      return
    }
    
    const previewUrl = URL.createObjectURL(file)
    setSignaturePreview(previewUrl)
    
    setUploadingSignature(true)
    try {
      const result = await profile.uploadSignature(file)
      setUser(prev => prev ? { ...prev, signature: result.signature, signature_url: result.signature_url } : null)
      setSignaturePreview(result.signature_url)
      setMessage('Signature uploaded!')
      setTimeout(() => setMessage(''), 3000)
    } catch (e) {
      setMessage('Error uploading signature')
      setSignaturePreview(null)
      setTimeout(() => setMessage(''), 3000)
    }
    setUploadingSignature(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDeleteSignature = async () => {
    if (!confirm('Are you sure you want to delete the signature?')) return
    try {
      await profile.deleteSignature()
      setUser(prev => prev ? { ...prev, signature: undefined, signature_url: undefined } : null)
      setSignaturePreview(null)
      setMessage('Signature deleted')
      setTimeout(() => setMessage(''), 3000)
    } catch (e) {
      setMessage('Error deleting signature')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  if (loading) return <div className="text-white p-8">Loading...</div>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">My Profile</h1>
        <p className="text-slate-400">Manage your seller details and invoice settings</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Seller Details</h2>
            {message && (
              <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 ${message.includes('Error') ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {message.includes('Error') ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  )}
                </svg>
                {message}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-slate-400 text-sm mb-2">Name / Company Name *</label>
                  <input
                    type="text"
                    value={user?.name || ''}
                    onChange={(e) => setUser({ ...user!, name: e.target.value })}
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-sm mb-2">Email</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-sm mb-2">Company Code / Certificate Nr.</label>
                  <input
                    type="text"
                    value={user?.company_code || ''}
                    onChange={(e) => setUser({ ...user!, company_code: e.target.value })}
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors"
                    placeholder="e.g., 1060539"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-sm mb-2">VAT Code</label>
                  <input
                    type="text"
                    value={user?.vat_code || ''}
                    onChange={(e) => setUser({ ...user!, vat_code: e.target.value })}
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors"
                    placeholder="e.g., LT100001234567"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-slate-400 text-sm mb-2">Address</label>
                  <input
                    type="text"
                    value={user?.address || ''}
                    onChange={(e) => setUser({ ...user!, address: e.target.value })}
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors"
                    placeholder="e.g., Gedimino pr. 1, Vilnius"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-sm mb-2">Phone</label>
                  <input
                    type="text"
                    value={user?.phone || ''}
                    onChange={(e) => setUser({ ...user!, phone: e.target.value })}
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors"
                    placeholder="e.g., +370 600 00000"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-sm mb-2">Website</label>
                  <input
                    type="text"
                    value={user?.website || ''}
                    onChange={(e) => setUser({ ...user!, website: e.target.value })}
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors"
                    placeholder="e.g., www.example.com"
                  />
                </div>
              </div>

              <div className="border-t border-slate-800 mt-8 pt-8">
                <h3 className="text-lg font-semibold text-white mb-6">Bank Details</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">Bank Name</label>
                    <input
                      type="text"
                      value={user?.bank_name || ''}
                      onChange={(e) => setUser({ ...user!, bank_name: e.target.value })}
                      className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="e.g., Swedbank"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">Bank Account (IBAN)</label>
                    <input
                      type="text"
                      value={user?.bank_account || ''}
                      onChange={(e) => setUser({ ...user!, bank_account: e.target.value })}
                      className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="e.g., LT737300010120429092"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800 mt-8 pt-8">
                <h3 className="text-lg font-semibold text-white mb-6">Invoice Settings</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">Invoice Series</label>
                    <input
                      type="text"
                      value={user?.invoice_series || ''}
                      onChange={(e) => setUser({ ...user!, invoice_series: e.target.value })}
                      className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="e.g., INV or 2FDP"
                    />
                    <p className="text-slate-500 text-sm mt-2">This prefix will be used for your invoice numbers</p>
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">Next Invoice Number</label>
                    <input
                      type="number"
                      min="1"
                      value={user?.next_invoice_number || 1}
                      onChange={(e) => setUser({ ...user!, next_invoice_number: parseInt(e.target.value) || 1 })}
                      className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="e.g., 1"
                    />
                    <p className="text-slate-500 text-sm mt-2">The number that will be assigned to your next invoice</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800 mt-8 pt-8">
                <h3 className="text-lg font-semibold text-white mb-6">Signature</h3>
                <p className="text-slate-400 text-sm mb-4">Upload your signature PNG file. It will be displayed on invoices.</p>
                <div className="flex items-start gap-6">
                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png"
                      onChange={handleSignatureUpload}
                      className="hidden"
                      id="signature-upload"
                    />
                    <label
                      htmlFor="signature-upload"
                      className={`inline-flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white cursor-pointer hover:bg-slate-700 transition-colors ${uploadingSignature ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {uploadingSignature ? (
                        <>
                          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          Upload Signature (PNG)
                        </>
                      )}
                    </label>
                  </div>
                  {(signaturePreview || user?.signature_url) && (
                    <div className="flex items-center gap-4">
                      <div className="bg-white p-2 rounded-lg">
                        <img
                          src={signaturePreview || user?.signature_url}
                          alt="Signature"
                          className="h-12 w-auto"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleDeleteSignature}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 mt-8">
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
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Profile Preview</h3>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                  {user?.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <div className="text-white font-semibold text-lg">{user?.name || 'Your Name'}</div>
                  <div className="text-slate-400 text-sm">{user?.email}</div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                {user?.company_code && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Code:</span>
                    <span className="text-slate-300">{user.company_code}</span>
                  </div>
                )}
                {user?.vat_code && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">VAT:</span>
                    <span className="text-slate-300">{user.vat_code}</span>
                  </div>
                )}
                {user?.phone && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Phone:</span>
                    <span className="text-slate-300">{user.phone}</span>
                  </div>
                )}
                {user?.website && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Web:</span>
                    <span className="text-slate-300">{user.website}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Tips</h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-slate-300 text-sm">Complete your profile to have all details automatically filled in your invoices.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <p className="text-slate-300 text-sm">Your bank details will appear on invoices for easy payment by clients.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
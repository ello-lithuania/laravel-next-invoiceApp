'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

export default function Settings() {
  const [darkMode, setDarkMode] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [passwords, setPasswords] = useState({
    current_password: '',
    password: '',
    password_confirmation: ''
  })

  useEffect(() => {
    const isDark = localStorage.getItem('dark-mode') !== 'false'
    setDarkMode(isDark)
  }, [])

  const toggleTheme = (mode: boolean) => {
    setDarkMode(mode)
    localStorage.setItem('dark-mode', String(mode))
    if (mode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwords.password !== passwords.password_confirmation) {
      setMessage('Passwords do not match')
      return
    }
    setSaving(true)
    setMessage('')
    try {
      await api('/password', { method: 'PUT', body: JSON.stringify(passwords) })
      setMessage('Password changed successfully!')
      setPasswords({ current_password: '', password: '', password_confirmation: '' })
    } catch (e: any) {
      setMessage(e.message || 'Error changing password')
    }
    setSaving(false)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your account settings</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Appearance */}
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700/60">
          <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">Appearance</h2>
          </header>
          <div className="p-5">
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Theme</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => toggleTheme(true)}
                className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-3 ${
                  darkMode
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-100">Dark</span>
              </button>
              <button
                type="button"
                onClick={() => toggleTheme(false)}
                className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-3 ${
                  !darkMode
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-100">Light</span>
              </button>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700/60">
          <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">Change Password</h2>
          </header>
          <div className="p-5">
            {message && (
              <div className={`p-3 rounded-lg mb-4 text-sm flex items-center gap-2 ${
                message.includes('Error') || message.includes('match') 
                  ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30' 
                  : 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-500/30'
              }`}>
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {message.includes('Error') || message.includes('match') ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  )}
                </svg>
                {message}
              </div>
            )}
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Current Password</label>
                <input
                  type="password"
                  value={passwords.current_password}
                  onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">New Password</label>
                <input
                  type="password"
                  value={passwords.password}
                  onChange={(e) => setPasswords({ ...passwords, password: e.target.value })}
                  className="form-input"
                  required
                  minLength={8}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={passwords.password_confirmation}
                  onChange={(e) => setPasswords({ ...passwords, password_confirmation: e.target.value })}
                  className="form-input"
                  required
                  minLength={8}
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="btn btn-gradient disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <svg className="w-4 h-4 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    Change Password
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

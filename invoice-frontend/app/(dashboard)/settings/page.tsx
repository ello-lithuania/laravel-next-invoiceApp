'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

export default function Settings() {
  const [theme, setThemeState] = useState<'dark' | 'light'>('dark')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [passwords, setPasswords] = useState({
    current_password: '',
    password: '',
    password_confirmation: ''
  })

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'dark' | 'light'
    if (saved) {
      setThemeState(saved)
      document.documentElement.classList.toggle('light', saved === 'light')
    }
  }, [])

  const setTheme = (newTheme: 'dark' | 'light') => {
    setThemeState(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.classList.toggle('light', newTheme === 'light')
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
        <h1 className="text-3xl font-bold text-white dark:text-white light:text-slate-900 mb-2">Settings</h1>
        <p className="text-slate-400 dark:text-slate-400 light:text-slate-600">Manage your account settings</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-slate-900 dark:bg-slate-900 light:bg-white border border-slate-800 dark:border-slate-800 light:border-slate-200 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white dark:text-white light:text-slate-900 mb-6">Appearance</h2>
          <div>
            <label className="block text-slate-400 dark:text-slate-400 light:text-slate-600 text-sm mb-3">Theme</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${
                  theme === 'dark'
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-700 dark:border-slate-700 light:border-slate-200 hover:border-slate-600'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center">
                  <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                </div>
                <span className="text-white dark:text-white light:text-slate-900 font-medium">Dark</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${
                  theme === 'light'
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-700 dark:border-slate-700 light:border-slate-200 hover:border-slate-600'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <span className="text-white dark:text-white light:text-slate-900 font-medium">Light</span>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 dark:bg-slate-900 light:bg-white border border-slate-800 dark:border-slate-800 light:border-slate-200 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white dark:text-white light:text-slate-900 mb-6">Change Password</h2>
          {message && (
            <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 ${
              message.includes('Error') || message.includes('match') 
                ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                : 'bg-green-500/20 text-green-400 border border-green-500/30'
            }`}>
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {message.includes('Error') || message.includes('match') ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                )}
              </svg>
              {message}
            </div>
          )}
          <form onSubmit={handlePasswordChange}>
            <div className="space-y-4">
              <div>
                <label className="block text-slate-400 dark:text-slate-400 light:text-slate-600 text-sm mb-2">Current Password</label>
                <input
                  type="password"
                  value={passwords.current_password}
                  onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })}
                  className="w-full p-3 bg-slate-800 dark:bg-slate-800 light:bg-slate-100 border border-slate-700 dark:border-slate-700 light:border-slate-300 rounded-xl text-white dark:text-white light:text-slate-900 focus:border-blue-500 focus:outline-none transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 dark:text-slate-400 light:text-slate-600 text-sm mb-2">New Password</label>
                <input
                  type="password"
                  value={passwords.password}
                  onChange={(e) => setPasswords({ ...passwords, password: e.target.value })}
                  className="w-full p-3 bg-slate-800 dark:bg-slate-800 light:bg-slate-100 border border-slate-700 dark:border-slate-700 light:border-slate-300 rounded-xl text-white dark:text-white light:text-slate-900 focus:border-blue-500 focus:outline-none transition-colors"
                  required
                  minLength={8}
                />
              </div>
              <div>
                <label className="block text-slate-400 dark:text-slate-400 light:text-slate-600 text-sm mb-2">Confirm New Password</label>
                <input
                  type="password"
                  value={passwords.password_confirmation}
                  onChange={(e) => setPasswords({ ...passwords, password_confirmation: e.target.value })}
                  className="w-full p-3 bg-slate-800 dark:bg-slate-800 light:bg-slate-100 border border-slate-700 dark:border-slate-700 light:border-slate-300 rounded-xl text-white dark:text-white light:text-slate-900 focus:border-blue-500 focus:outline-none transition-colors"
                  required
                  minLength={8}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="mt-6 bg-gradient-to-r from-blue-500 to-cyan-400 text-white px-8 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
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
  )
}
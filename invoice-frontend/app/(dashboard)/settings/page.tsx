'use client'
import { useState } from 'react'
import { api } from '@/lib/api'
import { useTheme, themes } from '@/contexts/ThemeContext'

export default function Settings() {
  const { colorTheme, isDark, setColorTheme, toggleMode } = useTheme()
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [passwords, setPasswords] = useState({
    current_password: '',
    password: '',
    password_confirmation: ''
  })

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
        <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: 'var(--t-text)' }}>Settings</h1>
        <p style={{ color: 'var(--t-text-muted)' }}>Manage your account settings</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Theme Picker */}
        <div className="lg:col-span-2 t-card prism-card rounded-xl overflow-hidden">
          <header className="px-5 py-4" style={{ borderBottom: '1px solid var(--t-border)' }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold" style={{ color: 'var(--t-text)' }}>Themes</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--t-text-muted)' }}>Choose the color scheme for your dashboard</p>
              </div>
              {/* Dark/Light mode toggle */}
              <button
                onClick={toggleMode}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{ background: 'var(--t-bg-elevated)', color: 'var(--t-text-secondary)', border: '1px solid var(--t-border)' }}
              >
                {isDark ? (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M8 0a1 1 0 0 1 1 1v.5a1 1 0 1 1-2 0V1a1 1 0 0 1 1-1Z" />
                      <path d="M12 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm-4 2a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
                      <path d="M13.657 3.757a1 1 0 0 0-1.414-1.414l-.354.354a1 1 0 0 0 1.414 1.414l.354-.354ZM13.5 8a1 1 0 0 1 1-1h.5a1 1 0 1 1 0 2h-.5a1 1 0 0 1-1-1ZM13.303 11.889a1 1 0 0 0-1.414 1.414l.354.354a1 1 0 0 0 1.414-1.414l-.354-.354ZM8 13.5a1 1 0 0 1 1 1v.5a1 1 0 1 1-2 0v-.5a1 1 0 0 1 1-1ZM4.111 13.303a1 1 0 1 0-1.414-1.414l-.354.354a1 1 0 1 0 1.414 1.414l.354-.354ZM0 8a1 1 0 0 1 1-1h.5a1 1 0 0 1 0 2H1a1 1 0 0 1-1-1ZM3.757 2.343a1 1 0 1 0-1.414 1.414l.354.354A1 1 0 1 0 4.11 2.697l-.354-.354Z" />
                    </svg>
                    Light Mode
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M7.019 1.985a1.55 1.55 0 0 0-.483-1.36 1.44 1.44 0 0 0-1.53-.277C2.056 1.553 0 4.5 0 7.9 0 12.352 3.648 16 8.1 16c3.407 0 6.246-2.058 7.51-4.963a1.446 1.446 0 0 0-.25-1.55 1.554 1.554 0 0 0-1.372-.502c-4.01.552-7.539-2.987-6.97-7ZM2 7.9C2 5.64 3.193 3.664 4.961 2.6 4.82 7.245 8.72 11.158 13.36 11.04 12.265 12.822 10.341 14 8.1 14 4.752 14 2 11.248 2 7.9Z" />
                    </svg>
                    Dark Mode
                  </>
                )}
              </button>
            </div>
          </header>
          <div className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setColorTheme(t.id)}
                  className={`relative group rounded-xl overflow-hidden transition-all duration-200 ${
                    colorTheme === t.id
                      ? 'ring-2 ring-offset-2 scale-[1.02]'
                      : 'hover:scale-[1.02]'
                  }`}
style={{
                    '--tw-ring-color': colorTheme === t.id ? 'var(--t-accent)' : undefined,
                    '--tw-ring-offset-color': colorTheme === t.id ? 'var(--t-bg-card)' : undefined,
                  } as React.CSSProperties}
                >
                  <div className={`theme-swatch-${t.id} h-24 sm:h-28 flex items-center justify-center`}>
                    <span className="font-semibold text-sm sm:text-base px-4 py-1.5 rounded-lg backdrop-blur-sm text-white/90 bg-black/25">
                      {t.name}
                    </span>
                  </div>
                  {colorTheme === t.id && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--t-accent)' }}>
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="lg:col-span-2 t-card prism-card rounded-xl overflow-hidden">
          <header className="px-5 py-4" style={{ borderBottom: '1px solid var(--t-border)' }}>
            <h2 className="font-semibold" style={{ color: 'var(--t-text)' }}>Change Password</h2>
          </header>
          <div className="p-5 max-w-lg">
            {message && (
              <div className={`p-3 rounded-lg mb-4 text-sm flex items-center gap-2 ${
                message.includes('Error') || message.includes('match') 
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                  : 'bg-green-500/10 text-green-400 border border-green-500/20'
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
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--t-text-muted)' }}>Current Password</label>
                <input
                  type="password"
                  value={passwords.current_password}
                  onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--t-text-muted)' }}>New Password</label>
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
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--t-text-muted)' }}>Confirm New Password</label>
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
                className="btn btn-gradient disabled:opacity-50 bd-clip-sm"
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

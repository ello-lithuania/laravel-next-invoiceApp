'use client'
import { useState } from 'react'
import Link from 'next/link'
import { auth } from '@/lib/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const data = await auth.forgotPassword({ email })
      setSuccess(data.message || 'Password reset link has been sent to your email.')
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700/60 p-8">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2 text-center">Forgot Password</h1>
          <p className="text-gray-500 dark:text-gray-400 text-center mb-6">Enter your email to receive a reset link</p>
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 text-sm">{error}</div>
          )}
          {success && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-xl mb-6 text-sm">{success}</div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="email" className="block text-gray-600 dark:text-gray-300 text-sm font-medium mb-2">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700/60 rounded-lg text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="you@example.com"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-gradient py-3 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
          <div className="mt-6 text-center">
            <Link href="/login" className="text-blue-500 hover:text-blue-400 font-medium">← Back to Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
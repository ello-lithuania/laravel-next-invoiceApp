'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { auth, setToken } from '@/lib/api'
import { toast } from 'react-toastify'

export default function Register() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await auth.register(form)
      setToken(res.token)
      toast.success('Account created successfully!')
      router.push('/dashboard')
    } catch (e: any) {
      toast.error(e.message || 'Registration failed')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">Create account</h1>
          <p className="text-gray-500 dark:text-gray-400">Start managing your invoices</p>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700/60 p-8">
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-gray-500 dark:text-gray-400 text-sm mb-2">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full p-3 bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700/60 rounded-lg text-gray-800 dark:text-gray-100 focus:border-blue-500 focus:outline-none transition-colors"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-gray-500 dark:text-gray-400 text-sm mb-2">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full p-3 bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700/60 rounded-lg text-gray-800 dark:text-gray-100 focus:border-blue-500 focus:outline-none transition-colors"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-gray-500 dark:text-gray-400 text-sm mb-2">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full p-3 bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700/60 rounded-lg text-gray-800 dark:text-gray-100 focus:border-blue-500 focus:outline-none transition-colors"
                required
                minLength={8}
              />
            </div>

            <div className="mb-6">
              <label className="block text-gray-500 dark:text-gray-400 text-sm mb-2">Confirm Password</label>
              <input
                type="password"
                value={form.password_confirmation}
                onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })}
                className="w-full p-3 bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700/60 rounded-lg text-gray-800 dark:text-gray-100 focus:border-blue-500 focus:outline-none transition-colors"
                required
                minLength={8}
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full btn btn-gradient py-3 disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <div className="mt-6 text-center text-gray-500 dark:text-gray-400 text-sm">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-500 hover:text-blue-400">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
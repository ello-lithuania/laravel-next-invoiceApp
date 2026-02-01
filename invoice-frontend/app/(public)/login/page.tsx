'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { auth, setToken } from '@/lib/api'
import { toast } from 'react-toastify'

export default function Login() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    email: '',
    password: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await auth.login(form)
      setToken(res.token)
      toast.success('Welcome back!')
      router.push('/dashboard')
    } catch (e: any) {
      toast.error(e.message || 'Invalid credentials')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome back</h1>
          <p className="text-slate-400">Sign in to your account</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-slate-400 text-sm mb-2">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-slate-400 text-sm mb-2">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors"
                required
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-400 text-white py-3 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/forgot-password" className="text-blue-400 hover:text-blue-300 text-sm">
              Forgot password?
            </Link>
          </div>

          <div className="mt-4 text-center text-slate-400 text-sm">
            Don't have an account?{' '}
            <Link href="/register" className="text-blue-400 hover:text-blue-300">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
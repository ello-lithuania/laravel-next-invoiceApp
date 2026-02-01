const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null
  return null
}

function setCookie(name: string, value: string, days: number = 7): void {
  if (typeof document === 'undefined') return
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:'
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax${isSecure ? '; Secure' : ''}`
}

function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
}

export function getToken(): string | null {
  return getCookie('token')
}

export function setToken(token: string): void {
  setCookie('token', token, 7)
}

export function removeToken(): void {
  deleteCookie('token')
}

export class ApiError extends Error {
  status: number
  errors?: Record<string, string[]>
  
  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

export async function api<T = unknown>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const token = getToken()
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  }

  const response = await fetch(`${API_URL}${endpoint}`, config)
  
  if (response.status === 401) {
    removeToken()
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    throw new ApiError('Unauthorized', 401)
  }

  const data = await response.json()
  
  if (!response.ok) {
    throw new ApiError(data.message || 'Something went wrong', response.status, data.errors)
  }

  return data
}

export interface User {
  id: number
  name: string
  email: string
  company_code?: string
  vat_code?: string
  address?: string
  phone?: string
  website?: string
  bank_name?: string
  bank_account?: string
  invoice_series?: string
  next_invoice_number?: number
  signature?: string
  signature_url?: string
}

export interface Client {
  id: number
  user_id: number
  name: string
  company_code?: string
  vat_code?: string
  address?: string
  phone?: string
  email?: string
  notes?: string
}

export interface InvoiceItem {
  id?: number
  invoice_id?: number
  description: string
  unit: string
  quantity: number
  price: number
  total: number
}

export interface Invoice {
  id: number
  user_id: number
  client_id: number
  series: string
  number: number
  invoice_date: string
  due_date: string
  notes?: string
  total: number
  client?: Client
  items?: InvoiceItem[]
}

export interface AuthResponse {
  user: User
  token: string
}

export interface StatsData {
  chart: {
    month: string
    count: number
    total: number
  }[]
  summary: {
    total_invoices: number
    total_amount: number
  }
  period: string
}

export interface Session {
  id: number
  name: string
  last_used_at: string | null
  created_at: string
  expires_at: string | null
  is_current: boolean
}

export const auth = {
  register: (data: { name: string; email: string; password: string; password_confirmation: string }) => 
    api<AuthResponse>('/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) => 
    api<AuthResponse>('/login', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => 
    api<{ message: string }>('/logout', { method: 'POST' }),
  logoutAll: () =>
    api<{ message: string }>('/logout-all', { method: 'POST' }),
  user: () => 
    api<User>('/user'),
  forgotPassword: (data: { email: string }) =>
    api<{ message: string }>('/forgot-password', { method: 'POST', body: JSON.stringify(data) }),
  sessions: () =>
    api<Session[]>('/sessions'),
  destroySession: (id: number) =>
    api<{ message: string }>(`/sessions/${id}`, { method: 'DELETE' }),
}

export const profile = {
  get: () => 
    api<User>('/profile'),
  update: (data: Partial<User>) => 
    api<User>('/profile', { method: 'PUT', body: JSON.stringify(data) }),
  uploadSignature: async (file: File) => {
    const token = getToken()
    const formData = new FormData()
    formData.append('signature', file)
    const response = await fetch(`${API_URL}/profile/signature`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: formData,
    })
    if (!response.ok) {
      const data = await response.json()
      throw new ApiError(data.message || 'Upload failed', response.status, data.errors)
    }
    return response.json()
  },
  deleteSignature: () => 
    api<{ message: string }>('/profile/signature', { method: 'DELETE' }),
}

export const clients = {
  list: () => 
    api<Client[]>('/clients'),
  get: (id: number) => 
    api<Client>(`/clients/${id}`),
  create: (data: Omit<Client, 'id' | 'user_id'>) => 
    api<Client>('/clients', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Client>) => 
    api<Client>(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => 
    api<{ message: string }>(`/clients/${id}`, { method: 'DELETE' }),
}

export interface PaginatedResponse<T> {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export const invoices = {
  list: () => 
    api<Invoice[]>('/invoices'),
  listPaginated: (params: string) => 
    api<PaginatedResponse<Invoice>>(`/invoices?${params}`),
  unpaid: () =>
    api<(Invoice & { status?: string })[]>('/invoices/unpaid'),
  months: () =>
    api<string[]>('/invoices/months'),
  get: (id: number) => 
    api<Invoice>(`/invoices/${id}`),
  create: (data: { client_id: number; invoice_date: string; due_date: string; notes?: string; items: Omit<InvoiceItem, 'id' | 'invoice_id' | 'total'>[] }) => 
    api<Invoice>('/invoices', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: { client_id: number; invoice_date: string; due_date: string; notes?: string; items: Omit<InvoiceItem, 'id' | 'invoice_id' | 'total'>[] }) => 
    api<Invoice>(`/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateStatus: (id: number, status: string) =>
    api<Invoice>(`/invoices/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) }),
  delete: (id: number) => 
    api<{ message: string }>(`/invoices/${id}`, { method: 'DELETE' }),
  pdf: (id: number) => 
    `${API_URL}/invoices/${id}/pdf?token=${getToken() || ''}`,
}

export const stats = {
  get: (period: string) => 
    api<StatsData>(`/stats?period=${period}`),
  clientBreakdown: () =>
    api<{ name: string; total: number; count: number }[]>('/stats/clients'),
}

export interface Activity {
  id: number
  type: 'client' | 'invoice'
  title: string
  subtitle?: string
  total?: number
  date: string
}

export const activity = {
  list: () => 
    api<Activity[]>('/activity'),
}

export const password = {
  update: async (data: { current_password: string; password: string; password_confirmation: string }) => {
    const response = await api<{ message: string; token: string }>('/password', { 
      method: 'PUT', 
      body: JSON.stringify(data) 
    })
    if (response.token) {
      setToken(response.token)
    }
    return response
  },
}
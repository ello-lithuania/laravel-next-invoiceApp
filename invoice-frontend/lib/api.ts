const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>
}

export async function api<T = unknown>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  
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
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    throw new Error('Unauthorized')
  }

  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong')
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

export const auth = {
  register: (data: { name: string; email: string; password: string; password_confirmation: string }) => 
    api<AuthResponse>('/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) => 
    api<AuthResponse>('/login', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => 
    api<{ message: string }>('/logout', { method: 'POST' }),
  user: () => 
    api<User>('/user'),
  forgotPassword: (data: { email: string }) =>
    api<{ message: string }>('/forgot-password', { method: 'POST', body: JSON.stringify(data) }),
}

export const profile = {
  get: () => 
    api<User>('/profile'),
  update: (data: Partial<User>) => 
    api<User>('/profile', { method: 'PUT', body: JSON.stringify(data) }),
  uploadSignature: async (file: File) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
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
      throw new Error(data.message || 'Upload failed')
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
    `${API_URL}/invoices/${id}/pdf?token=${typeof window !== 'undefined' ? localStorage.getItem('token') : ''}`,
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
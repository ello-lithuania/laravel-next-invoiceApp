const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    const raw = parts.pop()?.split(';').shift() || null
    return raw ? decodeURIComponent(raw) : null
  }
  return null
}

function setCookie(name: string, value: string, days: number = 7): void {
  if (typeof document === 'undefined') return
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:'
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax${isSecure ? '; Secure' : ''}`
}

function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:'
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax${isSecure ? '; Secure' : ''}`
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

const REQUEST_TIMEOUT_MS = 20000
const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function api<T = unknown>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const token = getToken()
  const method = (options.method || 'GET').toUpperCase()
  // Only retry safe/idempotent requests — never replay a POST/PUT/DELETE (could
  // double-submit). GETs are retried so a transient stall (e.g. after the tab
  // was suspended for a day) recovers on its own instead of hanging forever.
  const maxAttempts = method === 'GET' || method === 'HEAD' ? 3 : 1

  let lastError: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Abort a request that stalls, so it rejects (and the UI's finally/catch
    // runs) instead of leaving a skeleton spinning indefinitely — fetch has no
    // built-in timeout.
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const config: RequestInit = {
        ...options,
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
          ...options.headers,
        },
      }

      const response = await fetch(`${API_URL}${endpoint}`, config)
      clearTimeout(timer)

      if (response.status === 401) {
        removeToken()
        if (typeof window !== 'undefined') window.location.href = '/login'
        throw new ApiError('Unauthorized', 401)
      }

      // Retry once or twice on a transient server error for idempotent requests.
      if (!response.ok && response.status >= 500 && attempt < maxAttempts) {
        lastError = new ApiError('Server error', response.status)
        await delay(attempt * 800)
        continue
      }

      const data = await response.json()
      if (!response.ok) {
        throw new ApiError(data.message || 'Something went wrong', response.status, data.errors)
      }
      return data
    } catch (err) {
      clearTimeout(timer)
      // 401 (auth) is terminal — don't retry, let the redirect happen.
      if (err instanceof ApiError && err.status === 401) throw err
      lastError = err
      // Network error / timeout (abort) → retry idempotent requests with backoff.
      if (attempt < maxAttempts) {
        await delay(attempt * 800)
        continue
      }
      throw err
    }
  }

  throw lastError
}

// Fetch a binary endpoint (e.g. a PDF) with the Authorization header and return
// a short-lived object URL. Keeps the auth token OUT of the URL/query string —
// window.open/iframe-src links used to embed `?token=`, which leaked the token
// into server logs, browser history and the Referer header. Callers should
// URL.revokeObjectURL(url) when done (e.g. when a preview modal closes).
export async function apiBlobUrl(endpoint: string): Promise<string> {
  const token = getToken()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  const response = await fetch(`${API_URL}${endpoint}`, {
    cache: 'no-store',
    signal: controller.signal,
    headers: {
      'Accept': 'application/pdf',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
  }).finally(() => clearTimeout(timer))

  if (response.status === 401) {
    removeToken()
    if (typeof window !== 'undefined') window.location.href = '/login'
    throw new ApiError('Unauthorized', 401)
  }
  if (!response.ok) {
    throw new ApiError('Failed to generate PDF', response.status)
  }

  return URL.createObjectURL(await response.blob())
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
  invoice_template?: string
}

export interface Client {
  id: number
  user_id: number
  name: string
  has_uncollectible?: boolean
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
  status: 'draft' | 'sent' | 'paid' | 'overdue'
  client?: Client
  items?: InvoiceItem[]
}

export interface TrackableInvoice {
  id: number
  series: string
  number: number
  client_id: number
  client?: Client
  status: 'draft' | 'sent' | 'paid' | 'overdue'
  invoice_date: string
  total_hours: number
  worked_hours: number
  remaining_hours: number
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

export interface ClientBreakdown {
  name: string
  total: number
  count: number
  percentage: number
}

export interface ClientBreakdownResponse {
  clients: ClientBreakdown[]
  year: number
  year_total: number
}

export interface YearSummaryMonth {
  month: number
  invoice_count: number
  total: number
  hours: number
  is_best: boolean
  is_worst: boolean
}

export interface YearSummaryClient {
  name: string
  invoice_count: number
  total: number
  hours: number
}

export interface YearSummaryData {
  total_revenue: number
  paid_revenue: number
  unpaid_revenue: number
  total_invoices: number
  total_clients: number
  avg_invoice: number
  avg_monthly: number
  total_hours: number
  avg_hourly_rate: number
  time_tracking_revenue: number
  months: YearSummaryMonth[]
  clients: YearSummaryClient[]
  best_month: YearSummaryMonth | null
  worst_month: YearSummaryMonth | null
  largest_invoice: { series: string; number: number; total: number; client: string } | null
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

export interface PaginatedResponse<T> {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export const clients = {
  list: () => 
    api<Client[]>('/clients'),
  paginated: (params: string) =>
    api<PaginatedResponse<Client>>(`/clients?${params}`),
  get: (id: number) => 
    api<Client>(`/clients/${id}`),
  create: (data: Omit<Client, 'id' | 'user_id'>) => 
    api<Client>('/clients', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Client>) => 
    api<Client>(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => 
    api<{ message: string }>(`/clients/${id}`, { method: 'DELETE' }),
}

export interface ClientHistoryItem {
  description: string
  unit: string
  price: number
  last_used: string
  count: number
}

export interface ClientHistory {
  items: ClientHistoryItem[]
  invoices: Pick<Invoice, 'id' | 'series' | 'number' | 'invoice_date' | 'total' | 'status'>[]
}

export const invoices = {
  list: () =>
    api<Invoice[]>('/invoices'),
  clientHistory: (clientId: number | string) =>
    api<ClientHistory>(`/invoices/client-history?client_id=${clientId}`),
  listPaginated: (params: string) => 
    api<PaginatedResponse<Invoice>>(`/invoices?${params}`),
  unpaid: () =>
    api<Invoice[]>('/invoices/unpaid'),
  trackable: (clientId?: number | string) =>
    api<TrackableInvoice[]>(`/invoices/trackable${clientId ? `?client_id=${clientId}` : ''}`),
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
  pdfBlobUrl: (id: number, opts?: { template?: string; download?: boolean }) => {
    const params = new URLSearchParams()
    if (opts?.template) params.set('template', opts.template)
    if (opts?.download) params.set('download', '1')
    const qs = params.toString()
    return apiBlobUrl(`/invoices/${id}/pdf${qs ? `?${qs}` : ''}`)
  },
  samplePdfBlobUrl: (template: string) =>
    apiBlobUrl(`/sample-invoice-pdf?template=${encodeURIComponent(template)}`),
  bulkDelete: (ids: number[]) =>
    api<{ message: string }>('/invoices/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) }),
  bulkUpdateStatus: (ids: number[], status: string) =>
    api<{ message: string }>('/invoices/bulk-status', { method: 'POST', body: JSON.stringify({ ids, status }) }),
  duplicate: (id: number) =>
    api<Invoice>(`/invoices/${id}/duplicate`, { method: 'POST' }),
}

export interface QuickStats {
  total_revenue: number
  year_revenue: number
  year: number
  total_clients: number
  total_invoices: number
  paid_count: number
  unpaid_count: number
  unpaid_total: number
  revenue_sparkline: number[]
  revenue_trend: number
  paid_ratio_sparkline: number[]
}

export const stats = {
  get: (period: string) =>
    api<StatsData>(`/stats?period=${period}`),
  clientBreakdown: (year?: number) =>
    api<ClientBreakdownResponse>(`/stats/clients${year ? `?year=${year}` : ''}`),
  quickStats: () =>
    api<QuickStats>('/stats/quick'),
  availableYears: () =>
    api<number[]>('/stats/available-years'),
  yearSummary: (year: number) =>
    api<{ year: number; data: YearSummaryData }>(`/stats/year-summary?year=${year}`),
  yearSummaryPdfBlobUrl: (year: number, download = false) =>
    apiBlobUrl(`/stats/year-summary/pdf?year=${year}${download ? '&download=1' : ''}`),
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

export interface AuditLogEntry {
  id: number
  user_id: number | null
  event: string
  category: 'invoice' | 'client' | 'auth' | 'security' | 'general'
  subject_type: string | null
  subject_id: number | null
  description: string | null
  ip_address: string | null
  user_agent: string | null
  meta: Record<string, unknown> | null
  created_at: string
}

export const auditLogs = {
  list: (params?: string) =>
    api<PaginatedResponse<AuditLogEntry>>(`/audit-logs${params ? `?${params}` : ''}`),
}

export interface CatalogItem {
  id: number
  description: string
  unit: string
  price: number
}

export const catalog = {
  list: () =>
    api<CatalogItem[]>('/catalog-items'),
  create: (data: { description: string; unit?: string; price?: number }) =>
    api<CatalogItem>('/catalog-items', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: { description: string; unit?: string; price?: number }) =>
    api<CatalogItem>(`/catalog-items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) =>
    api<{ message: string }>(`/catalog-items/${id}`, { method: 'DELETE' }),
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

export interface TimeEntry {
  id: number
  user_id: number
  client_id: number
  group_name: string | null
  description: string
  hourly_rate: number
  started_at: string | null
  ended_at: string | null
  duration_seconds: number
  is_running: boolean
  is_invoiced: boolean
  is_prepaid: boolean
  invoice_id: number | null
  client?: Client
  invoice?: Invoice
  created_at: string
  updated_at: string
}

export interface TimeEntryPayload {
  client_id: number
  group_name?: string | null
  description: string
  hourly_rate: number
  duration_seconds?: number
  is_prepaid?: boolean
  invoice_id?: number | null
}

export const timeEntries = {
  list: (params?: string) =>
    api<TimeEntry[]>(`/time-entries${params ? `?${params}` : ''}`),
  create: (data: TimeEntryPayload) =>
    api<TimeEntry>('/time-entries', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: TimeEntryPayload) =>
    api<TimeEntry>(`/time-entries/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) =>
    api<{ message: string }>(`/time-entries/${id}`, { method: 'DELETE' }),
  start: (id: number) =>
    api<TimeEntry>(`/time-entries/${id}/start`, { method: 'POST' }),
  stop: (id: number, durationMinutes?: number) =>
    api<TimeEntry>(`/time-entries/${id}/stop`, { method: 'POST', body: JSON.stringify(durationMinutes !== undefined ? { duration_minutes: durationMinutes } : {}) }),
  addTime: (id: number, minutes: number) =>
    api<TimeEntry>(`/time-entries/${id}/add-time`, { method: 'POST', body: JSON.stringify({ minutes }) }),
  running: () =>
    api<TimeEntry | null>('/time-entries/running'),
  convertToInvoice: (data: { time_entry_ids: number[]; invoice_date: string; due_date: string; notes?: string }) =>
    api<Invoice>('/time-entries/convert-to-invoice', { method: 'POST', body: JSON.stringify(data) }),
  bulkDelete: (ids: number[]) =>
    api<{ message: string }>('/time-entries/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) }),
  bulkUpdateGroup: (ids: number[], groupName: string | null) =>
    api<{ message: string; group_name: string | null }>('/time-entries/bulk-group', { method: 'POST', body: JSON.stringify({ ids, group_name: groupName }) }),
}

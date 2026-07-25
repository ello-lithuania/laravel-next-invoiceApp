'use client'
import { useEffect, useState } from 'react'
import { auditLogs, AuditLogEntry } from '@/lib/api'
import { toast } from 'react-toastify'
import { Skeleton } from '@/components/Skeleton'

const filters = [
  { key: '', label: 'All' },
  { key: 'invoice', label: 'Invoices' },
  { key: 'client', label: 'Clients' },
  { key: 'security', label: 'Security' },
]

// Category → dot colour + fallback label. Security-sensitive events are red so
// failed logins / password changes stand out.
const meta: Record<string, { color: string }> = {
  invoice: { color: '#10b981' },
  client: { color: 'var(--t-accent)' },
  security: { color: '#ef4444' },
  auth: { color: '#ef4444' },
  general: { color: 'var(--t-text-muted)' },
}

function label(entry: AuditLogEntry): string {
  if (entry.description) return entry.description
  // Fallback: humanise the event key ("invoice.status_changed" → "Invoice status changed").
  return entry.event.replace(/[._]/g, ' ').replace(/^\w/, c => c.toUpperCase())
}

function when(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('lt-LT', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function ActivityLog() {
  const [category, setCategory] = useState('')
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), per_page: '25' })
    if (category) params.set('category', category)
    auditLogs.list(params.toString())
      .then(res => {
        if (!active) return
        setEntries(res.data)
        setLastPage(res.last_page)
        setTotal(res.total)
      })
      .catch(() => { if (active) toast.error('Failed to load activity log') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [category, page])

  const changeFilter = (key: string) => { setCategory(key); setPage(1) }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold t-text mb-1">Activity Log</h1>
        <p className="t-text-muted text-sm">A record of important actions and security events on your account.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map(f => {
          const isActive = category === f.key
          return (
            <button
              key={f.key}
              onClick={() => changeFilter(f.key)}
              className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
              style={isActive
                ? { background: 'var(--t-accent)', color: '#fff' }
                : { background: 'var(--t-bg-elevated)', color: 'var(--t-text-muted)' }}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--t-border)', background: 'var(--t-bg-elevated)' }}>
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center t-text-muted text-sm">No activity recorded yet.</div>
        ) : (
          <ul className="divide-y" style={{ borderColor: 'var(--t-border)' }}>
            {entries.map(entry => (
              <li key={entry.id} className="flex items-start gap-3 px-4 py-3">
                <span className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ background: (meta[entry.category] ?? meta.general).color }} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm t-text font-medium truncate">{label(entry)}</p>
                  <p className="text-[11px] t-text-muted mt-0.5">
                    {when(entry.created_at)}
                    {entry.ip_address && <span className="ml-2">· {entry.ip_address}</span>}
                    <span className="ml-2 uppercase tracking-wide">· {entry.category}</span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!loading && total > 0 && (
        <div className="flex items-center justify-between text-sm t-text-muted">
          <span>{total} event{total === 1 ? '' : 's'}</span>
          {lastPage > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg disabled:opacity-40 transition-colors"
                style={{ background: 'var(--t-bg-elevated)' }}
              >Previous</button>
              <span>Page {page} / {lastPage}</span>
              <button
                onClick={() => setPage(p => Math.min(lastPage, p + 1))}
                disabled={page >= lastPage}
                className="px-3 py-1.5 rounded-lg disabled:opacity-40 transition-colors"
                style={{ background: 'var(--t-bg-elevated)' }}
              >Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

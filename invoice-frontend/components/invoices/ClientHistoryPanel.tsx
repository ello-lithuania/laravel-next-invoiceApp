import type { ClientHistory, ClientHistoryItem } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import StatusBadge from '@/components/StatusBadge'

interface ClientHistoryPanelProps {
  clientName?: string
  /** null while nothing is loaded (or the request failed). */
  history: ClientHistory | null
  loading: boolean
  /** True while an invoice's items are being fetched to copy. */
  copying: boolean
  onRepeatLast: () => void
  onCopyInvoice: (invoiceId: number, label: string) => void
  onInsertItem: (item: ClientHistoryItem) => void
}

// Per-client history — remembers the services & prices used for this
// specific client so they don't have to be re-typed each time.
export default function ClientHistoryPanel({
  clientName,
  history,
  loading,
  copying,
  onRepeatLast,
  onCopyInvoice,
  onInsertItem,
}: ClientHistoryPanelProps) {
  return (
    <div className="mb-6 rounded-xl overflow-hidden" style={{ background: 'var(--t-bg-elevated)', border: '1px solid var(--t-border-light)' }}>
      <div className="px-4 py-2.5 flex items-center gap-2 flex-wrap" style={{ borderBottom: '1px solid var(--t-border-light)' }}>
        <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--t-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-sm font-semibold t-text">History for {clientName}</span>
        {history && history.invoices.length > 0 && (
          <span className="text-xs t-text-muted">· {history.invoices.length} recent invoice{history.invoices.length === 1 ? '' : 's'}</span>
        )}
        {history && history.invoices.length > 0 && (
          <button
            type="button"
            onClick={onRepeatLast}
            disabled={copying}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-60"
            style={{ background: 'var(--t-accent-soft)', color: 'var(--t-accent)' }}
            title={`Copy all items from ${history.invoices[0].series} ${history.invoices[0].number}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {copying ? 'Copying…' : 'Repeat last invoice'}
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
          <p className="text-sm t-text-muted">Loading history…</p>
        ) : !history || history.items.length === 0 ? (
          <p className="text-sm t-text-muted">No previous invoices for this client yet. Items you bill now will be suggested next time.</p>
        ) : (
          <>
            <div>
              <p className="text-xs uppercase tracking-wider font-medium t-text-muted mb-2">Previously billed — tap to add</p>
              <div className="flex flex-wrap gap-2">
                {history.items.map((hi, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onInsertItem(hi)}
                    title={`Used ${hi.count}× · last ${hi.last_used?.split('T')[0]}`}
                    className="group inline-flex items-center gap-2 pl-3 pr-2.5 py-1.5 rounded-full text-sm transition-all"
                    style={{ background: 'var(--t-bg-card)', border: '1px solid var(--t-border)', color: 'var(--t-text-secondary)' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--t-accent)'; e.currentTarget.style.color = 'var(--t-text)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--t-border)'; e.currentTarget.style.color = 'var(--t-text-secondary)' }}
                  >
                    <span className="truncate max-w-[220px]">{hi.description}</span>
                    <span className="text-xs font-semibold tabular-nums shrink-0" style={{ color: 'var(--t-accent)' }}>
                      {Number(hi.price).toFixed(2)} €{hi.unit ? `/${hi.unit}` : ''}
                    </span>
                    <svg className="w-3.5 h-3.5 shrink-0 opacity-50 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            {history.invoices.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wider font-medium t-text-muted mb-2">Recent invoices</p>
                <p className="text-[11px] t-text-muted mb-2">Tap one to copy its items into this new invoice.</p>
                <div className="flex flex-wrap gap-2">
                  {history.invoices.map(inv => (
                    <button
                      key={inv.id}
                      type="button"
                      onClick={() => onCopyInvoice(inv.id, `${inv.series} ${inv.number}`)}
                      disabled={copying}
                      title={`Copy items from ${inv.series} ${inv.number} into this new invoice`}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors hover:border-(--t-accent) disabled:opacity-50"
                      style={{ background: 'var(--t-bg-card)', border: '1px solid var(--t-border-light)' }}
                    >
                      <span className="font-medium t-text">{inv.series} {inv.number}</span>
                      <span className="t-text-muted">{formatDate(inv.invoice_date)}</span>
                      <span className="font-semibold tabular-nums t-text">{formatCurrency(Number(inv.total))}</span>
                      <StatusBadge status={inv.status} className="px-2 py-0.5" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

import { INVOICE_STATUSES } from '@/lib/api'
import { statusLabels } from '@/lib/utils'

// The <option>s of every invoice-status <select>, built from the one status list.
export default function StatusOptions() {
  return (
    <>
      {INVOICE_STATUSES.map((s) => (
        <option key={s} value={s}>{statusLabels[s]}</option>
      ))}
    </>
  )
}

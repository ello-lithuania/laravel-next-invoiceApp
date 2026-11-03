import { InvoiceStatus } from '@/lib/api'
import { statusColors, statusLabels } from '@/lib/utils'

interface StatusBadgeProps {
  status: InvoiceStatus
  className?: string // size / padding, which differs per place
}

// Read-only status pill with the same colour and label everywhere.
export default function StatusBadge({ status, className = 'px-2 py-0.5 text-xs' }: StatusBadgeProps) {
  return (
    <span className={`rounded-full font-medium ${className} ${statusColors[status]}`}>
      {statusLabels[status]}
    </span>
  )
}

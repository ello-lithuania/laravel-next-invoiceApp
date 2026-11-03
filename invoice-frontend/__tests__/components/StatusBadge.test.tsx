import { render, screen } from '@testing-library/react'
import StatusBadge from '@/components/StatusBadge'
import StatusOptions from '@/components/StatusOptions'
import { INVOICE_STATUSES } from '@/lib/api'
import { statusLabels } from '@/lib/utils'

describe('StatusBadge', () => {
  it.each(INVOICE_STATUSES)('shows the label for "%s"', (status) => {
    render(<StatusBadge status={status} />)
    expect(screen.getByText(statusLabels[status])).toBeInTheDocument()
  })

  it('shows overdue as "Won\'t pay"', () => {
    render(<StatusBadge status="overdue" />)
    expect(screen.getByText("Won't pay")).toBeInTheDocument()
  })

  it('applies a custom size class', () => {
    render(<StatusBadge status="paid" className="px-4 py-2 text-lg" />)
    expect(screen.getByText('Paid')).toHaveClass('text-lg')
  })
})

describe('StatusOptions', () => {
  it('renders one option per status inside a select, with status values', () => {
    render(
      <select aria-label="Status" defaultValue="sent">
        <StatusOptions />
      </select>,
    )

    const options = screen.getAllByRole('option') as HTMLOptionElement[]
    expect(options.map((o) => o.value)).toEqual([...INVOICE_STATUSES])
    expect(options.map((o) => o.textContent)).toEqual(INVOICE_STATUSES.map((s) => statusLabels[s]))
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveValue('sent')
  })
})

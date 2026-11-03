import type { ComponentProps } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ConfirmModal from '@/components/ConfirmModal'

describe('ConfirmModal', () => {
  const setup = (props: Partial<ComponentProps<typeof ConfirmModal>> = {}) => {
    const onConfirm = jest.fn()
    const onCancel = jest.fn()
    render(
      <ConfirmModal
        open
        title="Delete invoice?"
        message="This cannot be undone."
        onConfirm={onConfirm}
        onCancel={onCancel}
        {...props}
      />,
    )
    return { onConfirm, onCancel }
  }

  it('renders nothing when closed', () => {
    setup({ open: false })
    expect(screen.queryByText('Delete invoice?')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows title, message and default button labels when open', () => {
    setup()
    expect(screen.getByText('Delete invoice?')).toBeInTheDocument()
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('uses custom button labels', () => {
    setup({ confirmLabel: 'Delete', cancelLabel: 'Keep' })
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Keep' })).toBeInTheDocument()
  })

  it('calls onConfirm only when confirm is clicked', async () => {
    const { onConfirm, onCancel } = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('calls onCancel only when cancel is clicked', async () => {
    const { onConfirm, onCancel } = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('cancels on Escape', async () => {
    const { onConfirm, onCancel } = setup()
    await userEvent.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('ignores other keys', async () => {
    const { onConfirm, onCancel } = setup()
    await userEvent.keyboard('a')
    expect(onCancel).not.toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('does not react to Escape while closed', async () => {
    const { onCancel } = setup({ open: false })
    await userEvent.keyboard('{Escape}')
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('moves focus to the confirm button after opening', async () => {
    setup()
    const confirm = screen.getByRole('button', { name: 'Confirm' })
    await waitFor(() => expect(confirm).toHaveFocus())
  })
})

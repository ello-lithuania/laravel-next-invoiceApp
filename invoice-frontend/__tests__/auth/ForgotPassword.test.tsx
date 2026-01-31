import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ForgotPassword from '@/app/(public)/forgot-password/page'
import { auth } from '@/lib/api'

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}))

jest.mock('@/lib/api', () => ({
  auth: {
    forgotPassword: jest.fn(),
  },
}))

describe('Forgot Password Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders forgot password form', () => {
    render(<ForgotPassword />)
    
    expect(screen.getByText('Forgot Password')).toBeInTheDocument()
    expect(screen.getByText('Enter your email to receive a reset link')).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument()
  })

  it('renders back to login link', () => {
    render(<ForgotPassword />)
    
    expect(screen.getByText(/back to sign in/i)).toBeInTheDocument()
    expect(screen.getByText(/back to sign in/i)).toHaveAttribute('href', '/login')
  })

  it('allows user to type email', async () => {
    const user = userEvent.setup()
    render(<ForgotPassword />)
    
    const emailInput = screen.getByLabelText(/email/i)
    await user.type(emailInput, 'test@example.com')
    
    expect(emailInput).toHaveValue('test@example.com')
  })

  it('submits form with valid email', async () => {
    const user = userEvent.setup()
    const successMessage = 'Password reset link has been sent to your email.'
    ;(auth.forgotPassword as jest.Mock).mockResolvedValue({ message: successMessage })
    
    render(<ForgotPassword />)
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /send reset link/i }))
    
    await waitFor(() => {
      expect(auth.forgotPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
      })
    })
  })

  it('shows success message after successful submission', async () => {
    const user = userEvent.setup()
    const successMessage = 'Password reset link has been sent to your email.'
    ;(auth.forgotPassword as jest.Mock).mockResolvedValue({ message: successMessage })
    
    render(<ForgotPassword />)
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /send reset link/i }))
    
    await waitFor(() => {
      expect(screen.getByText(successMessage)).toBeInTheDocument()
    })
  })

  it('shows loading state while submitting', async () => {
    const user = userEvent.setup()
    ;(auth.forgotPassword as jest.Mock).mockImplementation(() => new Promise(() => {}))
    
    render(<ForgotPassword />)
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /send reset link/i }))
    
    expect(screen.getByText(/sending/i)).toBeInTheDocument()
  })

  it('displays error message on failure', async () => {
    const user = userEvent.setup()
    const errorMessage = 'User not found'
    ;(auth.forgotPassword as jest.Mock).mockRejectedValue(new Error(errorMessage))
    
    render(<ForgotPassword />)
    
    await user.type(screen.getByLabelText(/email/i), 'nonexistent@example.com')
    await user.click(screen.getByRole('button', { name: /send reset link/i }))
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })

  it('disables submit button while loading', async () => {
    const user = userEvent.setup()
    ;(auth.forgotPassword as jest.Mock).mockImplementation(() => new Promise(() => {}))
    
    render(<ForgotPassword />)
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /send reset link/i }))
    
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('clears error when resubmitting', async () => {
    const user = userEvent.setup()
    ;(auth.forgotPassword as jest.Mock)
      .mockRejectedValueOnce(new Error('First error'))
      .mockResolvedValueOnce({ message: 'Success' })
    
    render(<ForgotPassword />)
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /send reset link/i }))
    
    await waitFor(() => {
      expect(screen.getByText('First error')).toBeInTheDocument()
    })
    
    await user.click(screen.getByRole('button', { name: /send reset link/i }))
    
    await waitFor(() => {
      expect(screen.queryByText('First error')).not.toBeInTheDocument()
    })
  })

  it('clears success message when resubmitting', async () => {
    const user = userEvent.setup()
    ;(auth.forgotPassword as jest.Mock)
      .mockResolvedValueOnce({ message: 'First success' })
      .mockImplementationOnce(() => new Promise(() => {}))
    
    render(<ForgotPassword />)
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /send reset link/i }))
    
    await waitFor(() => {
      expect(screen.getByText('First success')).toBeInTheDocument()
    })
    
    await user.click(screen.getByRole('button', { name: /send reset link/i }))
    
    await waitFor(() => {
      expect(screen.queryByText('First success')).not.toBeInTheDocument()
    })
  })

  it('requires email field', () => {
    render(<ForgotPassword />)
    
    expect(screen.getByLabelText(/email/i)).toBeRequired()
  })

  it('email input has correct type', () => {
    render(<ForgotPassword />)
    
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'email')
  })

  it('shows default success message if API returns empty message', async () => {
    const user = userEvent.setup()
    ;(auth.forgotPassword as jest.Mock).mockResolvedValue({})
    
    render(<ForgotPassword />)
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /send reset link/i }))
    
    await waitFor(() => {
      expect(screen.getByText('Password reset link has been sent to your email.')).toBeInTheDocument()
    })
  })

  it('can submit multiple times after success', async () => {
    const user = userEvent.setup()
    ;(auth.forgotPassword as jest.Mock).mockResolvedValue({ message: 'Link sent' })
    
    render(<ForgotPassword />)
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /send reset link/i }))
    
    await waitFor(() => {
      expect(screen.getByText('Link sent')).toBeInTheDocument()
    })
    
    await user.click(screen.getByRole('button', { name: /send reset link/i }))
    
    await waitFor(() => {
      expect(auth.forgotPassword).toHaveBeenCalledTimes(2)
    })
  })
})
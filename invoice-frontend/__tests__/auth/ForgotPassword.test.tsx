import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ForgotPassword from '@/app/(public)/forgot-password/page'
import { auth } from '@/lib/api'

jest.mock('@/lib/api', () => ({
  auth: {
    forgotPassword: jest.fn(),
  },
}))

describe('ForgotPassword Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders forgot password form', () => {
    render(<ForgotPassword />)
    
    expect(screen.getByText('Forgot Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument()
  })

  it('renders back to login link', () => {
    render(<ForgotPassword />)
    
    expect(screen.getByText(/back to sign in/i)).toBeInTheDocument()
  })

  it('submits form with email', async () => {
    const user = userEvent.setup()
    ;(auth.forgotPassword as jest.Mock).mockResolvedValue({ message: 'Email sent' })
    
    render(<ForgotPassword />)
    
    const emailInput = screen.getByRole('textbox')
    await user.type(emailInput, 'test@example.com')
    await user.click(screen.getByRole('button', { name: /send reset link/i }))
    
    await waitFor(() => {
      expect(auth.forgotPassword).toHaveBeenCalledWith({ email: 'test@example.com' })
    })
    
    await waitFor(() => {
      expect(screen.getByText('Email sent')).toBeInTheDocument()
    })
  })

  it('displays error on failure', async () => {
    const user = userEvent.setup()
    const errorMessage = 'Email not found'
    ;(auth.forgotPassword as jest.Mock).mockRejectedValue(new Error(errorMessage))
    
    render(<ForgotPassword />)
    
    const emailInput = screen.getByRole('textbox')
    await user.type(emailInput, 'notfound@example.com')
    await user.click(screen.getByRole('button', { name: /send reset link/i }))
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })
})
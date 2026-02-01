import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Login from '@/app/(public)/login/page'
import { auth, setToken } from '@/lib/api'
import { toast } from 'react-toastify'

const mockPush = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

jest.mock('@/lib/api', () => ({
  auth: {
    login: jest.fn(),
  },
  setToken: jest.fn(),
}))

jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

describe('Login Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders login form', () => {
    render(<Login />)
    
    expect(screen.getByText('Welcome back')).toBeInTheDocument()
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('renders forgot password link', () => {
    render(<Login />)
    
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument()
  })

  it('renders register link', () => {
    render(<Login />)
    
    expect(screen.getByText(/sign up/i)).toBeInTheDocument()
  })

  it('submits form with valid credentials', async () => {
    const user = userEvent.setup()
    const mockToken = 'test-token-123'
    ;(auth.login as jest.Mock).mockResolvedValue({ token: mockToken, user: { id: 1 } })
    
    render(<Login />)
    
    const emailInput = screen.getByRole('textbox')
    const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement
    
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    await waitFor(() => {
      expect(auth.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })
    
    expect(setToken).toHaveBeenCalledWith(mockToken)
    expect(toast.success).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith('/dashboard')
  })

  it('shows loading state while submitting', async () => {
    const user = userEvent.setup()
    ;(auth.login as jest.Mock).mockImplementation(() => new Promise(() => {}))
    
    render(<Login />)
    
    const emailInput = screen.getByRole('textbox')
    const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement
    
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    expect(screen.getByText(/signing in/i)).toBeInTheDocument()
  })

  it('displays error toast on login failure', async () => {
    const user = userEvent.setup()
    const errorMessage = 'Invalid credentials'
    ;(auth.login as jest.Mock).mockRejectedValue(new Error(errorMessage))
    
    render(<Login />)
    
    const emailInput = screen.getByRole('textbox')
    const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement
    
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errorMessage)
    })
  })

  it('disables submit button while loading', async () => {
    const user = userEvent.setup()
    ;(auth.login as jest.Mock).mockImplementation(() => new Promise(() => {}))
    
    render(<Login />)
    
    const emailInput = screen.getByRole('textbox')
    const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement
    
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
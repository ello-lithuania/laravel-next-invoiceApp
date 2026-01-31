import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Login from '@/app/(public)/login/page'
import { auth } from '@/lib/api'

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
}))

const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage })

describe('Login Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders login form', () => {
    render(<Login />)
    
    expect(screen.getByText('Welcome Back')).toBeInTheDocument()
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('renders forgot password link', () => {
    render(<Login />)
    
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument()
    expect(screen.getByText(/forgot password/i)).toHaveAttribute('href', '/forgot-password')
  })

  it('renders register link', () => {
    render(<Login />)
    
    expect(screen.getByText(/create account/i)).toBeInTheDocument()
    expect(screen.getByText(/create account/i)).toHaveAttribute('href', '/register')
  })

  it('allows user to type email', async () => {
    const user = userEvent.setup()
    render(<Login />)
    
    const emailInput = screen.getByLabelText(/email/i)
    await user.type(emailInput, 'test@example.com')
    
    expect(emailInput).toHaveValue('test@example.com')
  })

  it('allows user to type password', async () => {
    const user = userEvent.setup()
    render(<Login />)
    
    const passwordInput = screen.getByLabelText(/password/i)
    await user.type(passwordInput, 'password123')
    
    expect(passwordInput).toHaveValue('password123')
  })

  it('submits form with valid credentials', async () => {
    const user = userEvent.setup()
    const mockToken = 'test-token-123'
    ;(auth.login as jest.Mock).mockResolvedValue({ token: mockToken, user: { id: 1 } })
    
    render(<Login />)
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    await waitFor(() => {
      expect(auth.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })
    
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('token', mockToken)
    expect(mockPush).toHaveBeenCalledWith('/dashboard')
  })

  it('shows loading state while submitting', async () => {
    const user = userEvent.setup()
    ;(auth.login as jest.Mock).mockImplementation(() => new Promise(() => {}))
    
    render(<Login />)
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    expect(screen.getByText(/signing in/i)).toBeInTheDocument()
  })

  it('displays error message on login failure', async () => {
    const user = userEvent.setup()
    const errorMessage = 'Invalid credentials'
    ;(auth.login as jest.Mock).mockRejectedValue(new Error(errorMessage))
    
    render(<Login />)
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })

  it('disables submit button while loading', async () => {
    const user = userEvent.setup()
    ;(auth.login as jest.Mock).mockImplementation(() => new Promise(() => {}))
    
    render(<Login />)
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('clears error when resubmitting', async () => {
    const user = userEvent.setup()
    ;(auth.login as jest.Mock)
      .mockRejectedValueOnce(new Error('First error'))
      .mockResolvedValueOnce({ token: 'token', user: { id: 1 } })
    
    render(<Login />)
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    await waitFor(() => {
      expect(screen.getByText('First error')).toBeInTheDocument()
    })
    
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    await waitFor(() => {
      expect(screen.queryByText('First error')).not.toBeInTheDocument()
    })
  })

  it('requires email field', () => {
    render(<Login />)
    
    const emailInput = screen.getByLabelText(/email/i)
    expect(emailInput).toBeRequired()
  })

  it('requires password field', () => {
    render(<Login />)
    
    const passwordInput = screen.getByLabelText(/password/i)
    expect(passwordInput).toBeRequired()
  })

  it('email input has correct type', () => {
    render(<Login />)
    
    const emailInput = screen.getByLabelText(/email/i)
    expect(emailInput).toHaveAttribute('type', 'email')
  })

  it('password input has correct type', () => {
    render(<Login />)
    
    const passwordInput = screen.getByLabelText(/password/i)
    expect(passwordInput).toHaveAttribute('type', 'password')
  })
})
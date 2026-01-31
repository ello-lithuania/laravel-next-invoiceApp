import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Register from '@/app/(public)/register/page'
import { auth } from '@/lib/api'

const mockPush = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

jest.mock('@/lib/api', () => ({
  auth: {
    register: jest.fn(),
  },
}))

const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage })

describe('Register Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders register form', () => {
    render(<Register />)
    
    expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument()
    expect(screen.getByText('Start managing your invoices today')).toBeInTheDocument()
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('renders login link', () => {
    render(<Register />)
    
    expect(screen.getByText(/sign in/i)).toBeInTheDocument()
    expect(screen.getByText(/sign in/i)).toHaveAttribute('href', '/login')
  })

  it('allows user to type name', async () => {
    const user = userEvent.setup()
    render(<Register />)
    
    const nameInput = screen.getByLabelText(/full name/i)
    await user.type(nameInput, 'John Doe')
    
    expect(nameInput).toHaveValue('John Doe')
  })

  it('allows user to type email', async () => {
    const user = userEvent.setup()
    render(<Register />)
    
    const emailInput = screen.getByLabelText(/email/i)
    await user.type(emailInput, 'test@example.com')
    
    expect(emailInput).toHaveValue('test@example.com')
  })

  it('allows user to type password', async () => {
    const user = userEvent.setup()
    render(<Register />)
    
    const passwordInput = screen.getByLabelText(/^password$/i)
    await user.type(passwordInput, 'password123')
    
    expect(passwordInput).toHaveValue('password123')
  })

  it('allows user to type password confirmation', async () => {
    const user = userEvent.setup()
    render(<Register />)
    
    const confirmInput = screen.getByLabelText(/confirm password/i)
    await user.type(confirmInput, 'password123')
    
    expect(confirmInput).toHaveValue('password123')
  })

  it('submits form with valid data', async () => {
    const user = userEvent.setup()
    const mockToken = 'test-token-123'
    ;(auth.register as jest.Mock).mockResolvedValue({ token: mockToken, user: { id: 1 } })
    
    render(<Register />)
    
    await user.type(screen.getByLabelText(/full name/i), 'John Doe')
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /create account/i }))
    
    await waitFor(() => {
      expect(auth.register).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'test@example.com',
        password: 'password123',
        password_confirmation: 'password123',
      })
    })
    
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('token', mockToken)
    expect(mockPush).toHaveBeenCalledWith('/dashboard')
  })

  it('shows loading state while submitting', async () => {
    const user = userEvent.setup()
    ;(auth.register as jest.Mock).mockImplementation(() => new Promise(() => {}))
    
    render(<Register />)
    
    await user.type(screen.getByLabelText(/full name/i), 'John Doe')
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /create account/i }))
    
    expect(screen.getByText(/creating account/i)).toBeInTheDocument()
  })

  it('displays error message on registration failure', async () => {
    const user = userEvent.setup()
    const errorMessage = 'Email already exists'
    ;(auth.register as jest.Mock).mockRejectedValue(new Error(errorMessage))
    
    render(<Register />)
    
    await user.type(screen.getByLabelText(/full name/i), 'John Doe')
    await user.type(screen.getByLabelText(/email/i), 'existing@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /create account/i }))
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })

  it('disables submit button while loading', async () => {
    const user = userEvent.setup()
    ;(auth.register as jest.Mock).mockImplementation(() => new Promise(() => {}))
    
    render(<Register />)
    
    await user.type(screen.getByLabelText(/full name/i), 'John Doe')
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /create account/i }))
    
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('clears error when resubmitting', async () => {
    const user = userEvent.setup()
    ;(auth.register as jest.Mock)
      .mockRejectedValueOnce(new Error('First error'))
      .mockResolvedValueOnce({ token: 'token', user: { id: 1 } })
    
    render(<Register />)
    
    await user.type(screen.getByLabelText(/full name/i), 'John Doe')
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /create account/i }))
    
    await waitFor(() => {
      expect(screen.getByText('First error')).toBeInTheDocument()
    })
    
    await user.click(screen.getByRole('button', { name: /create account/i }))
    
    await waitFor(() => {
      expect(screen.queryByText('First error')).not.toBeInTheDocument()
    })
  })

  it('requires all fields', () => {
    render(<Register />)
    
    expect(screen.getByLabelText(/full name/i)).toBeRequired()
    expect(screen.getByLabelText(/email/i)).toBeRequired()
    expect(screen.getByLabelText(/^password$/i)).toBeRequired()
    expect(screen.getByLabelText(/confirm password/i)).toBeRequired()
  })

  it('email input has correct type', () => {
    render(<Register />)
    
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'email')
  })

  it('password inputs have correct type', () => {
    render(<Register />)
    
    expect(screen.getByLabelText(/^password$/i)).toHaveAttribute('type', 'password')
    expect(screen.getByLabelText(/confirm password/i)).toHaveAttribute('type', 'password')
  })

  it('name input has correct type', () => {
    render(<Register />)
    
    expect(screen.getByLabelText(/full name/i)).toHaveAttribute('type', 'text')
  })
})
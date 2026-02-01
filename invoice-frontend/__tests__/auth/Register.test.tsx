import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Register from '@/app/(public)/register/page'
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
    register: jest.fn(),
  },
  setToken: jest.fn(),
}))

jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

describe('Register Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders register form', () => {
    render(<Register />)
    
    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument()
    expect(screen.getByText('Start managing your invoices')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('renders login link', () => {
    render(<Register />)
    
    expect(screen.getByText(/sign in/i)).toBeInTheDocument()
  })

  it('submits form with valid data', async () => {
    const user = userEvent.setup()
    const mockToken = 'test-token-123'
    ;(auth.register as jest.Mock).mockResolvedValue({ token: mockToken, user: { id: 1 } })
    
    render(<Register />)
    
    const textInputs = screen.getAllByRole('textbox')
    const passwordInputs = document.querySelectorAll('input[type="password"]')
    
    await user.type(textInputs[0], 'John Doe')
    await user.type(textInputs[1], 'test@example.com')
    await user.type(passwordInputs[0], 'password123')
    await user.type(passwordInputs[1], 'password123')
    await user.click(screen.getByRole('button', { name: /create account/i }))
    
    await waitFor(() => {
      expect(auth.register).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'test@example.com',
        password: 'password123',
        password_confirmation: 'password123',
      })
    })
    
    expect(setToken).toHaveBeenCalledWith(mockToken)
    expect(toast.success).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith('/dashboard')
  })

  it('shows loading state while submitting', async () => {
    const user = userEvent.setup()
    ;(auth.register as jest.Mock).mockImplementation(() => new Promise(() => {}))
    
    render(<Register />)
    
    const textInputs = screen.getAllByRole('textbox')
    const passwordInputs = document.querySelectorAll('input[type="password"]')
    
    await user.type(textInputs[0], 'John Doe')
    await user.type(textInputs[1], 'test@example.com')
    await user.type(passwordInputs[0], 'password123')
    await user.type(passwordInputs[1], 'password123')
    await user.click(screen.getByRole('button', { name: /create account/i }))
    
    expect(screen.getByText(/creating account/i)).toBeInTheDocument()
  })

  it('displays error toast on registration failure', async () => {
    const user = userEvent.setup()
    const errorMessage = 'Email already exists'
    ;(auth.register as jest.Mock).mockRejectedValue(new Error(errorMessage))
    
    render(<Register />)
    
    const textInputs = screen.getAllByRole('textbox')
    const passwordInputs = document.querySelectorAll('input[type="password"]')
    
    await user.type(textInputs[0], 'John Doe')
    await user.type(textInputs[1], 'existing@example.com')
    await user.type(passwordInputs[0], 'password123')
    await user.type(passwordInputs[1], 'password123')
    await user.click(screen.getByRole('button', { name: /create account/i }))
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errorMessage)
    })
  })

  it('disables submit button while loading', async () => {
    const user = userEvent.setup()
    ;(auth.register as jest.Mock).mockImplementation(() => new Promise(() => {}))
    
    render(<Register />)
    
    const textInputs = screen.getAllByRole('textbox')
    const passwordInputs = document.querySelectorAll('input[type="password"]')
    
    await user.type(textInputs[0], 'John Doe')
    await user.type(textInputs[1], 'test@example.com')
    await user.type(passwordInputs[0], 'password123')
    await user.type(passwordInputs[1], 'password123')
    await user.click(screen.getByRole('button', { name: /create account/i }))
    
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
// Gives TypeScript the types of the jest-dom matchers (toBeInTheDocument,
// toBeDisabled…). jest.setup.js registers them at runtime, but it's a .js file
// outside tsconfig's "include", so the type checker never sees that import.
import '@testing-library/jest-dom'

import { render, screen } from '@testing-library/react'
import App from './App'

test('renders login page', () => {
  render(<App />)
  const loginButton = screen.getByRole('button', { name: /login/i })
  expect(loginButton).toBeInTheDocument()
})

test('renders register link', () => {
  render(<App />)
  const registerLink = screen.getByText(/don't have an account/i)
  expect(registerLink).toBeInTheDocument()
})

test('renders email input', () => {
  render(<App />)
  const emailInput = screen.getByPlaceholderText(/email/i)
  expect(emailInput).toBeInTheDocument()
})

test('renders password input', () => {
  render(<App />)
  const passwordInput = screen.getByPlaceholderText(/password/i)
  expect(passwordInput).toBeInTheDocument()
})

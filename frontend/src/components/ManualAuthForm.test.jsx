import React from 'react'
import { describe, expect, it, jest } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ManualAuthForm, { PASSWORD_GUIDANCE, isStrongPassword } from './ManualAuthForm'
import { EMAIL_GUIDANCE, isValidEmail } from '../auth/emailValidation'

describe('ManualAuthForm', () => {
  it.each([
    ['username', '  test  ', 'test'],
    ['email address', '  Test@Example.com  ', 'Test@Example.com'],
  ])('submits an existing account using its %s', async (_kind, enteredIdentifier, submittedIdentifier) => {
    const onSubmit = jest.fn(() => Promise.resolve())
    const user = userEvent.setup()
    render(<ManualAuthForm busyAction={null} errorMessage="" onBack={jest.fn()} onSubmit={onSubmit} />)

    const identifierInput = screen.getByLabelText('Username or email address')
    expect(identifierInput).toHaveAttribute('autocomplete', 'username')
    expect(identifierInput).toHaveAttribute('maxlength', '254')
    expect(identifierInput).toHaveAccessibleDescription(
      'Use the username or email address associated with your account.',
    )
    await user.type(identifierInput, enteredIdentifier)
    await user.type(screen.getByLabelText('Password'), 'test')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(onSubmit).toHaveBeenCalledWith('login', {
      identifier: submittedIdentifier,
      password: 'test',
    })
  })

  it('requires matching strong passwords before registration reaches the backend', async () => {
    const onSubmit = jest.fn()
    const user = userEvent.setup()
    render(<ManualAuthForm busyAction={null} errorMessage="" onBack={jest.fn()} onSubmit={onSubmit} />)

    await user.click(screen.getByRole('tab', { name: 'Create account' }))
    const usernameInput = screen.getByLabelText('Username')
    expect(usernameInput).toHaveAttribute('maxlength', '32')
    expect(usernameInput).toHaveAttribute('pattern', '[A-Za-z0-9][A-Za-z0-9._-]*')
    await user.type(usernameInput, 'new-player')
    await user.type(screen.getByLabelText('Email address'), 'new-player@example.com')
    await user.type(screen.getByLabelText('Password'), 'StrongPassword1!')
    await user.type(screen.getByLabelText('Enter password again'), 'DifferentPassword1!')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(screen.getByRole('alert')).toHaveTextContent('The two passwords do not match.')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits a valid new account with password confirmation', async () => {
    const onSubmit = jest.fn(() => Promise.resolve())
    const user = userEvent.setup()
    render(<ManualAuthForm busyAction={null} errorMessage="" onBack={jest.fn()} onSubmit={onSubmit} />)

    await user.click(screen.getByRole('tab', { name: 'Create account' }))
    await user.type(screen.getByLabelText('Username'), 'new-player')
    await user.type(screen.getByLabelText('Email address'), ' new-player@example.com ')
    await user.type(screen.getByLabelText('Password'), 'StrongPassword1!')
    await user.type(screen.getByLabelText('Enter password again'), 'StrongPassword1!')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(onSubmit).toHaveBeenCalledWith('register', {
      username: 'new-player',
      email: 'new-player@example.com',
      password: 'StrongPassword1!',
      passwordConfirmation: 'StrongPassword1!',
    })
  })

  it('can switch back to sign-in after opening account creation', async () => {
    const user = userEvent.setup()
    render(<ManualAuthForm busyAction={null} errorMessage="" onBack={jest.fn()} onSubmit={jest.fn()} />)

    await user.click(screen.getByRole('tab', { name: 'Create account' }))
    await user.click(screen.getByRole('tab', { name: 'Sign in' }))

    expect(screen.getByRole('tab', { name: 'Sign in' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText('Username or email address')).toBeVisible()
    expect(screen.queryByLabelText('Email address')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Enter password again')).not.toBeInTheDocument()
  })

  it('validates email addresses before registration reaches the backend', async () => {
    const onSubmit = jest.fn()
    const user = userEvent.setup()
    render(<ManualAuthForm busyAction={null} errorMessage="" onBack={jest.fn()} onSubmit={onSubmit} />)

    await user.click(screen.getByRole('tab', { name: 'Create account' }))
    await user.type(screen.getByLabelText('Username'), 'new-player')
    await user.type(screen.getByLabelText('Email address'), 'player@example')
    await user.type(screen.getByLabelText('Password'), 'StrongPassword1!')
    await user.type(screen.getByLabelText('Enter password again'), 'StrongPassword1!')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(isValidEmail('player@example')).toBe(false)
    expect(EMAIL_GUIDANCE).toMatch(/valid email address/)
  })

  it('uses the same strong-password rule described to the player', () => {
    expect(isStrongPassword('StrongPassword1!')).toBe(true)
    expect(isStrongPassword('weakpassword')).toBe(false)
    expect(PASSWORD_GUIDANCE).toMatch(/12–72 characters/)
    expect(isValidEmail('player.name+scores@example.com')).toBe(true)
    expect(isValidEmail('player..name@example.com')).toBe(false)
    expect(isValidEmail(null)).toBe(false)
  })
})

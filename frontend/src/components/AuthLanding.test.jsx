import React from 'react'
import { describe, expect, it, jest } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AUTH_PROVIDERS } from '../auth/authModel'
import AuthLanding from './AuthLanding'

function defaultProps(overrides = {}) {
  return {
    authConfigured: true,
    busyProvider: null,
    errorMessage: '',
    onGuest: jest.fn(),
    onProviderSignIn: jest.fn(),
    ...overrides,
  }
}

describe('AuthLanding', () => {
  it('introduces the game and offers all three entry choices', () => {
    render(<AuthLanding {...defaultProps()} />)

    expect(screen.getByRole('main')).toHaveAccessibleName('Ready to roll?')
    expect(screen.getByText("Scott's Dice Game")).toBeVisible()
    expect(screen.getByRole('heading', { level: 1, name: 'Ready to roll?' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Choose how to play' })).toBeVisible()
    expect(screen.getByRole('list', { name: 'Game features' })).toHaveTextContent('Hold your best dice')
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Continue with Facebook' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Continue as Guest' })).toBeEnabled()
    expect(screen.queryByText(/Social sign-in needs Firebase setup/)).not.toBeInTheDocument()
  })

  it('passes the selected provider and guest actions to the app', async () => {
    const props = defaultProps()
    const user = userEvent.setup()
    render(<AuthLanding {...props} />)

    await user.click(screen.getByRole('button', { name: 'Continue with Google' }))
    await user.click(screen.getByRole('button', { name: 'Continue with Facebook' }))
    await user.click(screen.getByRole('button', { name: 'Continue as Guest' }))

    expect(props.onProviderSignIn).toHaveBeenNthCalledWith(1, AUTH_PROVIDERS.google)
    expect(props.onProviderSignIn).toHaveBeenNthCalledWith(2, AUTH_PROVIDERS.facebook)
    expect(props.onGuest).toHaveBeenCalledTimes(1)
  })

  it('keeps guest mode available while explaining missing provider configuration', () => {
    render(<AuthLanding {...defaultProps({ authConfigured: false })} />)

    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Continue with Facebook' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Continue as Guest' })).toBeEnabled()
    expect(screen.getByText('Social sign-in needs Firebase setup. Guest play is ready now.')).toBeVisible()
  })

  it.each([
    [AUTH_PROVIDERS.google, 'Connecting to Google…'],
    [AUTH_PROVIDERS.facebook, 'Connecting to Facebook…'],
  ])('shows progress and locks duplicate actions while %s is connecting', (busyProvider, label) => {
    render(<AuthLanding {...defaultProps({
      busyProvider,
      errorMessage: 'A sign-in error occurred.',
    })} />)

    expect(screen.getByRole('button', { name: label })).toBeDisabled()
    expect(screen.getByRole('button', {
      name: busyProvider === AUTH_PROVIDERS.google
        ? 'Continue with Facebook'
        : 'Continue with Google',
    })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Continue as Guest' })).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent('A sign-in error occurred.')
  })
})

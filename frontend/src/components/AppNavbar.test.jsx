import React from 'react'
import { describe, expect, it, jest } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createGuestUser } from '../auth/authModel'
import AppNavbar from './AppNavbar'

describe('AppNavbar', () => {
  it('shows a guest identity and a real link back to sign-in', async () => {
    const onReturnHome = jest.fn((event) => event.preventDefault())
    const onOpenSettings = jest.fn()
    const user = userEvent.setup()
    render(
      <AppNavbar
        sessionKind="guest"
        user={createGuestUser()}
        isSigningOut={false}
        isSettingsOpen={false}
        onReturnHome={onReturnHome}
        onOpenSettings={onOpenSettings}
        onSignOut={jest.fn()}
      />,
    )

    expect(screen.getByRole('navigation', { name: 'Account navigation' })).toBeVisible()
    expect(screen.getByText('Guest Player')).toBeVisible()
    expect(screen.getByText('Local guest session')).toBeVisible()
    expect(screen.getByText('GP')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument()
    const settingsButton = screen.getByRole('button', { name: 'Game settings' })
    expect(settingsButton).toHaveAttribute('aria-pressed', 'false')
    await user.click(settingsButton)
    expect(onOpenSettings).toHaveBeenCalledTimes(1)

    const returnLink = screen.getByRole('link', { name: /Return to sign in/ })
    expect(returnLink).toHaveAttribute('href', '/')
    await user.click(returnLink)
    expect(onReturnHome).toHaveBeenCalledTimes(1)
  })

  it('shows an authenticated profile photo, email, and sign-out action', async () => {
    const onSignOut = jest.fn()
    const user = userEvent.setup()
    const { container } = render(
      <AppNavbar
        sessionKind="authenticated"
        user={{
          id: 'google-user',
          name: 'Ada Lovelace',
          email: 'ada@example.com',
          photoUrl: 'https://example.com/ada.jpg',
          providerId: 'google',
          providerLabel: 'Google',
        }}
        isSigningOut={false}
        isSettingsOpen={false}
        onReturnHome={jest.fn()}
        onOpenSettings={jest.fn()}
        onSignOut={onSignOut}
      />,
    )

    expect(screen.getByText("Scott's Dice Game")).toBeVisible()
    expect(screen.getByText('Ada Lovelace')).toBeVisible()
    expect(screen.getByText('ada@example.com')).toBeVisible()
    expect(container.querySelector('.user-avatar img')).toHaveAttribute(
      'src',
      'https://example.com/ada.jpg',
    )

    await user.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(onSignOut).toHaveBeenCalledTimes(1)
  })

  it('uses initials and the provider label when profile details are absent', () => {
    render(
      <AppNavbar
        sessionKind="authenticated"
        user={{
          id: 'facebook-user',
          name: 'Dice Fan',
          email: '',
          photoUrl: null,
          providerId: 'facebook',
          providerLabel: 'Facebook',
        }}
        isSigningOut
        isSettingsOpen
        onReturnHome={jest.fn()}
        onOpenSettings={jest.fn()}
        onSignOut={jest.fn()}
      />,
    )

    expect(screen.getByText('DF')).toBeVisible()
    expect(screen.getByText('Facebook account')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Game settings' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Game settings' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Signing out…' })).toBeDisabled()
  })
})

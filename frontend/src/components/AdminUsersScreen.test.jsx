import React from 'react'
import { describe, expect, it, jest } from '@jest/globals'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminUsersScreen from './AdminUsersScreen'

const users = [
  {
    id: 'admin-1', name: 'admin', username: 'admin', email: 'admin@admin.com', providerId: 'manual',
    providerLabel: 'Username', admin: true, canChangePassword: true, canChangeEmail: true, canDelete: false,
    createdAt: '2026-08-03T12:00:00Z',
  },
  {
    id: 'manual-1', name: 'Dice Player', username: 'dice-player', email: 'dice@example.com', providerId: 'manual',
    providerLabel: 'Username', admin: false, canChangePassword: true, canChangeEmail: true, canDelete: true,
    createdAt: '2026-08-02T12:00:00Z',
  },
  {
    id: 'google-1', name: 'Social Player', username: null, email: 'social@example.com', providerId: 'google',
    providerLabel: 'Google', admin: false, canChangePassword: false, canChangeEmail: false, canDelete: true,
    createdAt: 'not-a-date',
  },
]

function renderScreen(overrides = {}) {
  const props = {
    loadUsers: jest.fn(() => Promise.resolve(users)),
    deleteUser: jest.fn(() => Promise.resolve()),
    changeEmail: jest.fn(() => Promise.resolve()),
    changePassword: jest.fn(() => Promise.resolve()),
    onEmailChanged: jest.fn(),
    onBack: jest.fn(),
    ...overrides,
  }
  return {
    props,
    user: userEvent.setup(),
    ...render(<div className="game-session"><AdminUsersScreen {...props} /></div>),
  }
}

describe('AdminUsersScreen', () => {
  it('lists login types and limits password controls to manual accounts', async () => {
    renderScreen()

    expect(await screen.findByText('Dice Player')).toBeVisible()
    expect(screen.getByText('Social Player')).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'E-mail address' })).toBeVisible()
    expect(screen.getByText('admin@admin.com')).toBeVisible()
    expect(screen.getByText('dice@example.com')).toBeVisible()
    expect(screen.getByText('Current account')).toBeVisible()
    expect(screen.getAllByRole('button', { name: 'Change password' })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: 'Change email' })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(2)
    expect(screen.getByText('—')).toBeVisible()
  })

  it('changes a manual password and deletes a selected account through confirmations', async () => {
    const { props, user } = renderScreen()
    await screen.findByText('Dice Player')

    const playerRow = screen.getByText('Dice Player').closest('tr')
    await user.click(within(playerRow).getByRole('button', { name: 'Change password' }))
    const passwordDialog = screen.getByRole('dialog', { name: "Change Dice Player's password" })
    expect(passwordDialog.closest('.admin-page')).toBeNull()
    expect(passwordDialog.closest('.game-session')).toBeInTheDocument()
    await user.type(screen.getByLabelText('New password'), 'BetterPassword!2026')
    await user.type(screen.getByLabelText('Confirm new password'), 'BetterPassword!2026')
    await user.click(screen.getByRole('button', { name: 'Update password' }))
    expect(props.changePassword).toHaveBeenCalledWith('manual-1', {
      password: 'BetterPassword!2026',
      passwordConfirmation: 'BetterPassword!2026',
    })

    const socialRow = screen.getByText('Social Player').closest('tr')
    await user.click(within(socialRow).getByRole('button', { name: 'Delete' }))
    const dialog = screen.getByRole('dialog', { name: 'Delete Social Player?' })
    await user.click(within(dialog).getByRole('button', { name: 'Delete user' }))
    expect(props.deleteUser).toHaveBeenCalledWith('google-1')
    expect(screen.queryByText('Social Player')).not.toBeInTheDocument()
  })

  it('validates and changes a manual account email address', async () => {
    const { props, user } = renderScreen()
    await screen.findByText('Dice Player')
    const playerRow = screen.getByText('Dice Player').closest('tr')
    await user.click(within(playerRow).getByRole('button', { name: 'Change email' }))
    const emailDialog = screen.getByRole('dialog', { name: "Change Dice Player's email" })
    expect(emailDialog.closest('.admin-page')).toBeNull()
    expect(emailDialog.closest('.game-session')).toBeInTheDocument()

    const emailInput = screen.getByLabelText('Email address')
    await user.clear(emailInput)
    await user.type(emailInput, 'invalid')
    await user.click(screen.getByRole('button', { name: 'Update email' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a valid email address')
    expect(props.changeEmail).not.toHaveBeenCalled()

    await user.clear(emailInput)
    await user.type(emailInput, 'updated@example.com')
    await user.click(screen.getByRole('button', { name: 'Update email' }))
    expect(props.changeEmail).toHaveBeenCalledWith('manual-1', { email: 'updated@example.com' })
    expect(props.onEmailChanged).toHaveBeenCalledWith('manual-1', 'updated@example.com')
    expect(await screen.findByText('updated@example.com')).toBeVisible()
  })

  it('keeps the password dialog open when the backend rejects a change', async () => {
    const { user } = renderScreen({
      changePassword: jest.fn(() => Promise.reject(new Error('Use a stronger password.'))),
    })
    await screen.findByText('Dice Player')
    const playerRow = screen.getByText('Dice Player').closest('tr')
    await user.click(within(playerRow).getByRole('button', { name: 'Change password' }))
    await user.type(screen.getByLabelText('New password'), 'weak')
    await user.type(screen.getByLabelText('Confirm new password'), 'weak')
    await user.click(screen.getByRole('button', { name: 'Update password' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Use a stronger password.')
    expect(screen.getByRole('dialog')).toBeVisible()
  })

  it('keeps an empty-email dialog open with a safe fallback when an email change fails', async () => {
    const accountWithoutEmail = {
      ...users[1],
      id: 'manual-without-email',
      name: 'No Email Player',
      email: '',
    }
    const { props, user } = renderScreen({
      loadUsers: jest.fn(() => Promise.resolve([...users, accountWithoutEmail])),
      changeEmail: jest.fn(() => Promise.reject({})),
    })
    await screen.findByText('No Email Player')

    const playerRow = screen.getByText('No Email Player').closest('tr')
    await user.click(within(playerRow).getByRole('button', { name: 'Change email' }))
    const emailInput = screen.getByLabelText('Email address')
    expect(emailInput).toHaveValue('')
    await user.type(emailInput, 'player@example.com')
    await user.click(screen.getByRole('button', { name: 'Update email' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The email address could not be changed.',
    )
    expect(screen.getByRole('dialog')).toBeVisible()
    expect(props.changeEmail).toHaveBeenCalledWith('manual-without-email', {
      email: 'player@example.com',
    })
  })

  it('shows fallback errors when loading or deleting users fails', async () => {
    const firstRender = renderScreen({ loadUsers: jest.fn(() => Promise.reject({})) })
    expect(await screen.findByRole('alert')).toHaveTextContent('User accounts could not be loaded.')
    firstRender.unmount()

    const { props, user } = renderScreen({ deleteUser: jest.fn(() => Promise.reject({})) })
    await screen.findByText('Dice Player')
    const playerRow = screen.getByText('Dice Player').closest('tr')
    await user.click(within(playerRow).getByRole('button', { name: 'Delete' }))
    await user.click(screen.getByRole('button', { name: 'Delete user' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('The user account could not be deleted.')
    expect(screen.getByText('Dice Player')).toBeVisible()
    expect(props.deleteUser).toHaveBeenCalledWith('manual-1')
  })

  it('supports canceling account actions and displays users without an identifier', async () => {
    const anonymousProviderUser = {
      id: 'facebook-1', name: 'Mystery Roller', username: null, email: '', providerId: 'facebook',
      providerLabel: 'Facebook', admin: false, canChangePassword: false, canChangeEmail: false, canDelete: true,
      createdAt: '2026-08-01T12:00:00Z',
    }
    const { user } = renderScreen({
      loadUsers: jest.fn(() => Promise.resolve([...users, anonymousProviderUser])),
    })
    expect(await screen.findByText('Not available')).toBeVisible()

    const manualRow = screen.getByText('Dice Player').closest('tr')
    await user.click(within(manualRow).getByRole('button', { name: 'Change password' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    const mysteryRow = screen.getByText('Mystery Roller').closest('tr')
    await user.click(within(mysteryRow).getByRole('button', { name: 'Delete' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByText('Mystery Roller')).toBeVisible()
  })
})

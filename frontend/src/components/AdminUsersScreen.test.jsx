import React from 'react'
import { describe, expect, it, jest } from '@jest/globals'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminUsersScreen from './AdminUsersScreen'

const users = [
  {
    id: 'admin-1', name: 'admin', username: 'admin', email: '', providerId: 'manual',
    providerLabel: 'Username', admin: true, canChangePassword: true, canDelete: false,
    createdAt: '2026-08-03T12:00:00Z',
  },
  {
    id: 'manual-1', name: 'Dice Player', username: 'dice-player', email: '', providerId: 'manual',
    providerLabel: 'Username', admin: false, canChangePassword: true, canDelete: true,
    createdAt: '2026-08-02T12:00:00Z',
  },
  {
    id: 'google-1', name: 'Social Player', username: null, email: 'social@example.com', providerId: 'google',
    providerLabel: 'Google', admin: false, canChangePassword: false, canDelete: true,
    createdAt: 'not-a-date',
  },
]

function renderScreen(overrides = {}) {
  const props = {
    loadUsers: jest.fn(() => Promise.resolve(users)),
    deleteUser: jest.fn(() => Promise.resolve()),
    changePassword: jest.fn(() => Promise.resolve()),
    onBack: jest.fn(),
    ...overrides,
  }
  return { props, user: userEvent.setup(), ...render(<AdminUsersScreen {...props} />) }
}

describe('AdminUsersScreen', () => {
  it('lists login types and limits password controls to manual accounts', async () => {
    renderScreen()

    expect(await screen.findByText('Dice Player')).toBeVisible()
    expect(screen.getByText('Social Player')).toBeVisible()
    expect(screen.getByText('Current account')).toBeVisible()
    expect(screen.getAllByRole('button', { name: 'Change password' })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(2)
    expect(screen.getByText('—')).toBeVisible()
  })

  it('changes a manual password and deletes a selected account through confirmations', async () => {
    const { props, user } = renderScreen()
    await screen.findByText('Dice Player')

    const playerRow = screen.getByText('Dice Player').closest('tr')
    await user.click(within(playerRow).getByRole('button', { name: 'Change password' }))
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
      providerLabel: 'Facebook', admin: false, canChangePassword: false, canDelete: true,
      createdAt: '2026-08-01T12:00:00Z',
    }
    const { user } = renderScreen({
      loadUsers: jest.fn(() => Promise.resolve([...users, anonymousProviderUser])),
    })
    expect(await screen.findByText('No public identifier')).toBeVisible()

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

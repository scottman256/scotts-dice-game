import React from 'react'
import { describe, expect, it, jest } from '@jest/globals'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminUsersScreen from './AdminUsersScreen'

const users = [
  {
    id: 'admin-1', name: 'admin', username: 'admin', email: 'admin@admin.com', providerId: 'manual',
    providerLabel: 'Username', admin: true, canChangePassword: true, canChangeEmail: true, canDelete: false,
    createdAt: '2026-08-03T12:00:00Z', gamesPlayed: 2, lastPlayed: '2026-10-01T12:00:00Z', canChangeRole: false,
  },
  {
    id: 'manual-1', name: 'Dice Player', username: 'dice-player', email: 'dice@example.com', providerId: 'manual',
    providerLabel: 'Username', admin: false, canChangePassword: true, canChangeEmail: true, canDelete: true,
    createdAt: '2026-08-02T12:00:00Z', gamesPlayed: 12, lastPlayed: '2026-10-02T12:00:00Z', canChangeRole: true,
  },
  {
    id: 'google-1', name: 'Social Player', username: null, email: 'social@example.com', providerId: 'google',
    providerLabel: 'Google', admin: false, canChangePassword: false, canChangeEmail: false, canDelete: true,
    createdAt: 'not-a-date', gamesPlayed: 0, lastPlayed: '2026-10-03T12:00:00Z', gameInProgress: true, canChangeRole: true,
  },
]

function renderScreen(overrides = {}) {
  const props = {
    loadUsers: jest.fn(() => Promise.resolve(users)),
    deleteUser: jest.fn(() => Promise.resolve()),
    changeEmail: jest.fn(() => Promise.resolve()),
    changePassword: jest.fn(() => Promise.resolve()),
    changeRole: jest.fn(() => Promise.resolve()),
    loadScores: jest.fn(() => Promise.resolve({ scores: [], page: 0, totalPages: 0, totalScores: 0 })),
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
  it('searches names, usernames and email, and sorts by games, activity, progress and name', async () => {
    const { user } = renderScreen()
    await screen.findByText('Dice Player')
    const names = () => screen.getAllByRole('row').slice(1).map((row) => row.querySelector('strong')?.textContent)
    expect(names()).toEqual(['Dice Player', 'admin', 'Social Player'])
    expect(within(screen.getByText('Dice Player').closest('tr')).getByRole('button', { name: 'View scores for Dice Player' })).toHaveTextContent('12')
    expect(screen.queryByRole('combobox', { name: 'Sort users' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Last played' }))
    expect(names()).toEqual(['Social Player', 'Dice Player', 'admin'])
    await user.click(screen.getByRole('button', { name: 'In progress' }))
    expect(names()[0]).toBe('Social Player')
    await user.click(screen.getByRole('button', { name: 'User' }))
    expect(names()).toEqual(['admin', 'Dice Player', 'Social Player'])
    const search = screen.getByRole('searchbox', { name: 'Search users' })
    for (const term of ['DICE PLAYER', 'dice-player', 'DICE@EXAMPLE.COM']) {
      await user.clear(search)
      await user.type(search, term)
      expect(names()).toEqual(['Dice Player'])
    }
    await user.clear(search)
    await user.type(search, 'nobody')
    expect(screen.getByText('No users match your search.')).toBeVisible()
    await user.clear(search)
    expect(names()).toHaveLength(3)
  })

  it.each([
    ['User', 'ascending', ['admin', 'Dice Player', 'Social Player'], ['Social Player', 'Dice Player', 'admin']],
    ['E-mail address', 'ascending', ['admin', 'Dice Player', 'Social Player'], ['Social Player', 'Dice Player', 'admin']],
    ['Created', 'descending', ['admin', 'Dice Player', 'Social Player'], ['Dice Player', 'admin', 'Social Player']],
    ['Games played', 'ascending', ['Social Player', 'admin', 'Dice Player'], ['Dice Player', 'admin', 'Social Player']],
    ['Last played', 'descending', ['Social Player', 'Dice Player', 'admin'], ['admin', 'Dice Player', 'Social Player']],
    ['In progress', 'descending', ['Social Player', 'admin', 'Dice Player'], ['admin', 'Dice Player', 'Social Player']],
    ['Admin', 'descending', ['admin', 'Dice Player', 'Social Player'], ['Dice Player', 'Social Player', 'admin']],
  ])('sorts %s in both directions and announces only the active column', async (label, direction, first, second) => {
    const { user } = renderScreen()
    await screen.findByText('Dice Player')
    const names = () => screen.getAllByRole('row').slice(1).map((row) => row.querySelector('strong').textContent)
    expect(screen.getByRole('columnheader', { name: 'Games played' })).toHaveAttribute('aria-sort', 'descending')
    const button = screen.getByRole('button', { name: label })
    await user.click(button)
    expect(names()).toEqual(first)
    expect(button.closest('th')).toHaveAttribute('aria-sort', direction)
    expect(document.querySelectorAll('th[aria-sort]')).toHaveLength(1)
    await user.click(button)
    expect(names()).toEqual(second)
    expect(button.closest('th')).toHaveAttribute('aria-sort', direction === 'ascending' ? 'descending' : 'ascending')
    expect(screen.queryByRole('button', { name: 'Sign-in' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Actions' })).not.toBeInTheDocument()
  })

  it('supports Enter and Space and retains sorting through search', async () => {
    const { user } = renderScreen()
    const button = await screen.findByRole('button', { name: 'User' })
    button.focus()
    await user.keyboard('{Enter}')
    expect(button.closest('th')).toHaveAttribute('aria-sort', 'ascending')
    await user.keyboard(' ')
    expect(button.closest('th')).toHaveAttribute('aria-sort', 'descending')
    expect(button).toHaveFocus()
    const search = screen.getByRole('searchbox')
    await user.type(search, 'player')
    expect(screen.getAllByRole('row').slice(1).map((row) => row.querySelector('strong').textContent))
      .toEqual(['Social Player', 'Dice Player'])
    await user.clear(search)
    expect(button.closest('th')).toHaveAttribute('aria-sort', 'descending')
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('Social Player')
  })

  it('sorts text without case sensitivity and keeps missing email and dates last in either direction', async () => {
    const entries = [
      { ...users[0], name: 'Zed', email: 'APPLE@example.com', lastPlayed: null },
      { ...users[1], name: 'ada', email: 'banana@example.com' },
      { ...users[2], name: 'Bee', email: '', lastPlayed: null },
    ]
    const { user } = renderScreen({ loadUsers: jest.fn().mockResolvedValue(entries) })
    await screen.findByText('Zed')
    const names = () => screen.getAllByRole('row').slice(1).map((row) => row.querySelector('strong').textContent)
    await user.click(screen.getByRole('button', { name: 'User' }))
    expect(names()).toEqual(['ada', 'Bee', 'Zed'])
    await user.click(screen.getByRole('button', { name: 'E-mail address' }))
    expect(names()).toEqual(['Zed', 'ada', 'Bee'])
    await user.click(screen.getByRole('button', { name: 'E-mail address' }))
    expect(names()).toEqual(['ada', 'Zed', 'Bee'])
    await user.click(screen.getByRole('button', { name: 'Last played' }))
    expect(names()).toEqual(['ada', 'Bee', 'Zed'])
    await user.click(screen.getByRole('button', { name: 'Last played' }))
    expect(names()).toEqual(['ada', 'Bee', 'Zed'])
  })

  it('opens score history even for a player with zero completed games and returns focus', async () => {
    const { user, props } = renderScreen()
    const trigger = await screen.findByRole('button', { name: 'View scores for Social Player' })
    await user.click(trigger)
    expect(await screen.findByText('No scores recorded yet.')).toBeVisible()
    expect(props.loadScores).toHaveBeenCalledWith('google-1', { page: 0, sort: 'newest' })
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(trigger).toHaveFocus()
  })

  it('confirms promotion and removal, disables self changes, and keeps canceled roles unchanged', async () => {
    const { user, props } = renderScreen()
    expect(await screen.findByRole('switch', { name: 'Make admin admin' })).toBeDisabled()
    const toggle = screen.getByRole('switch', { name: 'Make Social Player admin' })
    await user.click(toggle)
    expect(toggle).not.toBeChecked()
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(props.changeRole).not.toHaveBeenCalled()
    expect(toggle).toHaveFocus()
    await user.click(toggle)
    await user.click(screen.getByRole('button', { name: 'Make admin' }))
    expect(props.changeRole).toHaveBeenCalledWith('google-1', true)
    expect(toggle).toBeChecked()
    await user.click(toggle)
    await user.click(screen.getByRole('button', { name: 'Remove admin access' }))
    expect(props.changeRole).toHaveBeenLastCalledWith('google-1', false)
    expect(toggle).not.toBeChecked()
  })

  it('retains the role on failure and supports retry without duplicate requests', async () => {
    let finish
    const changeRole = jest.fn().mockRejectedValueOnce({}).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
    const { user } = renderScreen({ changeRole })
    const toggle = await screen.findByRole('switch', { name: 'Make Dice Player admin' })
    await user.click(toggle)
    await user.click(screen.getByRole('button', { name: 'Make admin' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('The administrator role could not be changed.')
    expect(toggle).not.toBeChecked()
    await user.dblClick(screen.getByRole('button', { name: 'Make admin' }))
    expect(changeRole).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('button', { name: 'Updating…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    await act(async () => finish())
    expect(toggle).toBeChecked()
  })

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

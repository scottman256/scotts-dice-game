import React, { useEffect, useState } from 'react'
import ConfirmActionModal from './ConfirmActionModal'
import EmailChangeModal from './EmailChangeModal'
import PasswordChangeModal from './PasswordChangeModal'
import AdminDialog from './AdminDialog'
import AdminScoreHistoryModal from './AdminScoreHistoryModal'

function formatCreatedAt(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString()
}

function dateSortValue(value) {
  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? null : timestamp
}

const USER_COLUMNS = [
  { key: 'name', label: 'User', value: (user) => user.name, direction: 'ascending' },
  { key: 'email', label: 'E-mail address', value: (user) => user.email?.trim() || null, direction: 'ascending' },
  { key: 'provider', label: 'Sign-in' },
  { key: 'createdAt', label: 'Created', value: (user) => dateSortValue(user.createdAt), direction: 'descending' },
  { key: 'gamesPlayed', label: 'Games played', value: (user) => user.gamesPlayed ?? 0, direction: 'descending' },
  { key: 'lastPlayed', label: 'Last played', value: (user) => dateSortValue(user.lastPlayed), direction: 'descending' },
  { key: 'gameInProgress', label: 'In progress', value: (user) => Number(Boolean(user.gameInProgress)), direction: 'descending' },
  { key: 'admin', label: 'Admin', value: (user) => Number(user.admin), direction: 'descending' },
  { key: 'actions', label: 'Actions' },
]

export default function AdminUsersScreen({
  loadUsers,
  deleteUser,
  changeEmail,
  changePassword,
  changeRole,
  loadScores,
  onEmailChanged,
  onBack,
}) {
  const [users, setUsers] = useState([])
  const [status, setStatus] = useState('loading')
  const [selectedDelete, setSelectedDelete] = useState(null)
  const [selectedPassword, setSelectedPassword] = useState(null)
  const [selectedEmail, setSelectedEmail] = useState(null)
  const [busy, setBusy] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [modalError, setModalError] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState({ key: 'gamesPlayed', direction: 'descending' })
  const [selectedScores, setSelectedScores] = useState(null)
  const [selectedRole, setSelectedRole] = useState(null)

  const query = search.trim().toLocaleLowerCase()
  const sortColumn = USER_COLUMNS.find(({ key }) => key === sort.key)
  const visibleUsers = users.filter((user) => [user.name, user.username, user.email]
    .some((value) => value?.toLocaleLowerCase().includes(query))).sort((a, b) => {
    const aValue = sortColumn.value(a)
    const bValue = sortColumn.value(b)
    // Keep unavailable values last in either direction; zero games is a real value.
    if (aValue == null && bValue != null) return 1
    if (bValue == null && aValue != null) return -1
    const comparison = typeof aValue === 'string'
      ? aValue.localeCompare(bValue, undefined, { sensitivity: 'base' })
      : (aValue ?? 0) - (bValue ?? 0)
    return (sort.direction === 'ascending' ? comparison : -comparison)
      || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) || a.id.localeCompare(b.id)
  })

  function nextSortDirection(column) {
    return sort.key === column.key
      ? (sort.direction === 'ascending' ? 'descending' : 'ascending')
      : column.direction
  }

  async function handleRoleChange() {
    if (busy) return
    setBusy(true)
    setModalError('')
    try {
      await changeRole(selectedRole.id, !selectedRole.admin)
      setUsers((current) => current.map((user) => user.id === selectedRole.id ? { ...user, admin: !selectedRole.admin } : user))
      setSelectedRole(null)
    } catch (error) {
      setModalError(error?.message || 'The administrator role could not be changed.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    let active = true
    loadUsers()
      .then((entries) => {
        if (!active) return
        setUsers(entries)
        setStatus('ready')
      })
      .catch((error) => {
        if (!active) return
        setStatus('error')
        setErrorMessage(error?.message || 'User accounts could not be loaded.')
      })
    return () => { active = false }
  }, [loadUsers])

  async function handleDelete() {
    setBusy(true)
    setModalError('')
    try {
      await deleteUser(selectedDelete.id)
      setUsers((current) => current.filter(({ id }) => id !== selectedDelete.id))
      setSelectedDelete(null)
    } catch (error) {
      setSelectedDelete(null)
      setErrorMessage(error?.message || 'The user account could not be deleted.')
    } finally {
      setBusy(false)
    }
  }

  async function handlePasswordSave(credentials) {
    setBusy(true)
    setModalError('')
    try {
      await changePassword(selectedPassword.id, credentials)
      setSelectedPassword(null)
    } catch (error) {
      setModalError(error?.message || 'The password could not be changed.')
    } finally {
      setBusy(false)
    }
  }

  async function handleEmailSave(update) {
    setBusy(true)
    setModalError('')
    try {
      await changeEmail(selectedEmail.id, update)
      setUsers((current) => current.map((user) => (
        user.id === selectedEmail.id ? { ...user, email: update.email } : user
      )))
      onEmailChanged?.(selectedEmail.id, update.email)
      setSelectedEmail(null)
    } catch (error) {
      setModalError(error?.message || 'The email address could not be changed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="admin-page admin-users-page" aria-labelledby="admin-users-title">
      <header className="admin-page-heading">
        <div>
          <p className="eyebrow">Administration</p>
          <h1 id="admin-users-title">User Accounts</h1>
          <p>Review players, manage username credentials, or remove an account and its game data.</p>
        </div>
        <button type="button" className="scores-back-button" onClick={onBack}>Back to game</button>
      </header>

      {errorMessage && <p className="admin-inline-error" role="alert">{errorMessage}</p>}
      <div className="admin-user-filters">
        <label className="admin-filter-label">Search users
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, username, or email" />
        </label>
      </div>
      {status === 'ready' && <p role="status">{visibleUsers.length} of {users.length} users</p>}
      <section className="admin-card admin-users-card" aria-live="polite">
        {status === 'loading' && <p className="scores-state" role="status">Loading users…</p>}
        {status === 'ready' && (
          <table className="admin-users-table">
            <caption className="visually-hidden">Registered user accounts. Activate a sortable column heading to sort; activate it again to reverse the order.</caption>
            <thead><tr>{USER_COLUMNS.map((column) => (
              <th key={column.key} scope="col" aria-sort={sort.key === column.key ? sort.direction : undefined}>
                {column.value ? (
                  <button type="button" className="admin-column-sort"
                    title={`Sort ${column.label.toLowerCase()} ${nextSortDirection(column)}`}
                    onClick={() => setSort({ key: column.key, direction: nextSortDirection(column) })}>
                    {column.label}
                    <span aria-hidden="true">{sort.key === column.key ? (sort.direction === 'ascending' ? '↑' : '↓') : '↕'}</span>
                  </button>
                ) : column.label}
              </th>
            ))}</tr></thead>
            <tbody>
              {visibleUsers.length === 0 && <tr><td colSpan="9">No users match your search.</td></tr>}
              {visibleUsers.map((user) => (
                <tr key={user.id}>
                  <td><strong>{user.name}</strong><small>{user.username || 'Social account'}{user.admin ? ' · Admin' : ''}</small></td>
                  <td className="admin-user-email">{user.email || 'Not available'}</td>
                  <td><span className={`admin-provider admin-provider-${user.providerId}`}>{user.providerLabel}</span></td>
                  <td>{formatCreatedAt(user.createdAt)}</td>
                  <td><button type="button" className="admin-score-count" aria-label={`View scores for ${user.name}`} onClick={() => setSelectedScores(user)}>{user.gamesPlayed ?? 0}</button></td>
                  <td>{user.lastPlayed ? <time dateTime={user.lastPlayed}>{new Date(user.lastPlayed).toLocaleString()}</time> : 'Never'}</td>
                  <td>{user.gameInProgress ? 'Yes' : 'No'}</td>
                  <td><input type="checkbox" role="switch" aria-label={`Make ${user.name} admin`} checked={user.admin}
                    disabled={!user.canChangeRole} title={user.canChangeRole ? 'Change administrator access' : 'You cannot change your own role'}
                    onChange={() => { setModalError(''); setSelectedRole(user) }} /></td>
                  <td>
                    <div className="admin-row-actions">
                      {user.canChangePassword && (
                        <button type="button" onClick={() => { setModalError(''); setSelectedPassword(user) }}>Change password</button>
                      )}
                      {user.canChangeEmail && (
                        <button type="button" onClick={() => { setModalError(''); setSelectedEmail(user) }}>Change email</button>
                      )}
                      {user.canDelete && <button type="button" className="admin-delete-link" onClick={() => setSelectedDelete(user)}>Delete</button>}
                      {!user.canDelete && <span>Current account</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {selectedScores && <AdminScoreHistoryModal user={selectedScores} loadScores={loadScores} onClose={() => setSelectedScores(null)} />}
      {selectedRole && <AdminDialog title={selectedRole.admin ? `Remove admin access from ${selectedRole.name}?` : `Make ${selectedRole.name} an admin?`} busy={busy} onClose={() => setSelectedRole(null)}>
        <p>{selectedRole.admin ? 'This player will lose access to administration. Their account and game history will be kept.' : 'Administrators can manage users, change administrator access, and delete accounts and game data. Only grant access to someone you trust.'}</p>
        {modalError && <p className="admin-inline-error" role="alert">{modalError}</p>}
        <div className="admin-modal-actions">
          <button type="button" className="admin-modal-cancel" autoFocus disabled={busy} onClick={() => setSelectedRole(null)}>Cancel</button>
          <button type="button" className="admin-primary-button" disabled={busy} onClick={handleRoleChange}>{busy ? 'Updating…' : selectedRole.admin ? 'Remove admin access' : 'Make admin'}</button>
        </div>
      </AdminDialog>}

      {selectedDelete && (
        <ConfirmActionModal
          title={`Delete ${selectedDelete.name}?`}
          description="The account, its saved game, scores, statistics, and achievements will be permanently deleted."
          confirmLabel="Delete user"
          busyLabel="Deleting…"
          isBusy={busy}
          onCancel={() => setSelectedDelete(null)}
          onConfirm={handleDelete}
        />
      )}
      {selectedPassword && (
        <PasswordChangeModal
          user={selectedPassword}
          isBusy={busy}
          errorMessage={modalError}
          onCancel={() => setSelectedPassword(null)}
          onSave={handlePasswordSave}
        />
      )}
      {selectedEmail && (
        <EmailChangeModal
          user={selectedEmail}
          isBusy={busy}
          errorMessage={modalError}
          onCancel={() => setSelectedEmail(null)}
          onSave={handleEmailSave}
        />
      )}
    </main>
  )
}

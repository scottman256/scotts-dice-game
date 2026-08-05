import React, { useEffect, useState } from 'react'
import ConfirmActionModal from './ConfirmActionModal'
import EmailChangeModal from './EmailChangeModal'
import PasswordChangeModal from './PasswordChangeModal'

function formatCreatedAt(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString()
}

export default function AdminUsersScreen({
  loadUsers,
  deleteUser,
  changeEmail,
  changePassword,
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
    <main className="admin-page" aria-labelledby="admin-users-title">
      <header className="admin-page-heading">
        <div>
          <p className="eyebrow">Administration</p>
          <h1 id="admin-users-title">User Accounts</h1>
          <p>Review players, manage username credentials, or remove an account and its game data.</p>
        </div>
        <button type="button" className="scores-back-button" onClick={onBack}>Back to game</button>
      </header>

      {errorMessage && <p className="admin-inline-error" role="alert">{errorMessage}</p>}
      <section className="admin-card admin-users-card" aria-live="polite">
        {status === 'loading' && <p className="scores-state" role="status">Loading users…</p>}
        {status === 'ready' && (
          <table className="admin-users-table">
            <caption className="visually-hidden">Registered user accounts</caption>
            <thead><tr><th scope="col">User</th><th scope="col">E-mail address</th><th scope="col">Sign-in</th><th scope="col">Created</th><th scope="col">Actions</th></tr></thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td><strong>{user.name}</strong><small>{user.username || 'Social account'}{user.admin ? ' · Admin' : ''}</small></td>
                  <td className="admin-user-email">{user.email || 'Not available'}</td>
                  <td><span className={`admin-provider admin-provider-${user.providerId}`}>{user.providerLabel}</span></td>
                  <td>{formatCreatedAt(user.createdAt)}</td>
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

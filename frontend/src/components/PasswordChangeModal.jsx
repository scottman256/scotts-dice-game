import React, { useEffect, useRef, useState } from 'react'

export default function PasswordChangeModal({ user, isBusy, errorMessage, onCancel, onSave }) {
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const passwordRef = useRef(null)

  useEffect(() => {
    passwordRef.current?.focus()
  }, [])

  function handleSubmit(event) {
    event.preventDefault()
    onSave({ password, passwordConfirmation })
  }

  return (
    <div className="admin-modal-backdrop">
      <section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="password-modal-title">
        <p className="eyebrow">Account security</p>
        <h1 id="password-modal-title">Change {user.name}&apos;s password</h1>
        <p>Use 12–72 characters with uppercase, lowercase, a number, and a symbol.</p>
        {errorMessage && <p className="admin-inline-error" role="alert">{errorMessage}</p>}
        <form className="admin-modal-form" onSubmit={handleSubmit}>
          <label>
            New password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              maxLength="72"
              disabled={isBusy}
              ref={passwordRef}
            />
          </label>
          <label>
            Confirm new password
            <input
              type="password"
              value={passwordConfirmation}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
              autoComplete="new-password"
              maxLength="72"
              disabled={isBusy}
            />
          </label>
          <div className="admin-modal-actions">
            <button type="button" className="admin-modal-cancel" onClick={onCancel} disabled={isBusy}>Cancel</button>
            <button type="submit" className="admin-primary-button" disabled={isBusy || !password || !passwordConfirmation}>
              {isBusy ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

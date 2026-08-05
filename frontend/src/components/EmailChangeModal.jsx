import React, { useEffect, useRef, useState } from 'react'
import {
  EMAIL_GUIDANCE,
  EMAIL_MAX_LENGTH,
  isValidEmail,
} from '../auth/emailValidation'

export default function EmailChangeModal({ user, isBusy, errorMessage, onCancel, onSave }) {
  const [email, setEmail] = useState(user.email || '')
  const [formError, setFormError] = useState('')
  const emailRef = useRef(null)

  useEffect(() => {
    emailRef.current?.focus()
    emailRef.current?.select()
  }, [])

  function handleSubmit(event) {
    event.preventDefault()
    setFormError('')
    if (!isValidEmail(email)) {
      setFormError(EMAIL_GUIDANCE)
      return
    }
    onSave({ email: email.trim() })
  }

  return (
    <div className="admin-modal-backdrop">
      <section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="email-modal-title">
        <p className="eyebrow">Account contact</p>
        <h1 id="email-modal-title">Change {user.name}&apos;s email</h1>
        <p>Enter the address this username account should use.</p>
        {(formError || errorMessage) && (
          <p className="admin-inline-error" role="alert">{formError || errorMessage}</p>
        )}
        <form className="admin-modal-form" onSubmit={handleSubmit} noValidate>
          <label>
            Email address
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              maxLength={EMAIL_MAX_LENGTH}
              required
              disabled={isBusy}
              ref={emailRef}
            />
          </label>
          <div className="admin-modal-actions">
            <button type="button" className="admin-modal-cancel" onClick={onCancel} disabled={isBusy}>Cancel</button>
            <button type="submit" className="admin-primary-button" disabled={isBusy}>
              {isBusy ? 'Updating…' : 'Update email'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

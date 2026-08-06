import React, { useState } from 'react'
import {
  EMAIL_GUIDANCE,
  EMAIL_MAX_LENGTH,
  isValidEmail,
} from '../auth/emailValidation'

export const PASSWORD_GUIDANCE = 'Use 12–72 characters with uppercase, lowercase, a number, and a symbol.'

export function isStrongPassword(password) {
  return typeof password === 'string'
    && password.length >= 12
    && password.length <= 72
    && /[A-Z]/.test(password)
    && /[a-z]/.test(password)
    && /\d/.test(password)
    && /[^A-Za-z0-9]/.test(password)
    && !/\s/.test(password)
}

export default function ManualAuthForm({ busyAction, errorMessage, onBack, onSubmit }) {
  const [mode, setMode] = useState('login')
  const [identifier, setIdentifier] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [formError, setFormError] = useState('')
  const isRegistering = mode === 'register'
  const isBusy = busyAction === `manual-${mode}`

  function changeMode(nextMode) {
    setMode(nextMode)
    setPassword('')
    setPasswordConfirmation('')
    setEmail('')
    setFormError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')

    if (isRegistering && !isValidEmail(email)) {
      setFormError(EMAIL_GUIDANCE)
      return
    }
    if (isRegistering && password !== passwordConfirmation) {
      setFormError('The two passwords do not match.')
      return
    }
    if (isRegistering && !isStrongPassword(password)) {
      setFormError(PASSWORD_GUIDANCE)
      return
    }

    await onSubmit(mode, {
      ...(isRegistering
        ? { username: identifier.trim() }
        : { identifier: identifier.trim() }),
      ...(isRegistering ? { email: email.trim() } : {}),
      password,
      ...(isRegistering ? { passwordConfirmation } : {}),
    })
  }

  return (
    <div className="manual-auth">
      <button type="button" className="manual-back-button" onClick={onBack} disabled={isBusy}>
        <span aria-hidden="true">←</span> All sign-in options
      </button>

      <div className="manual-auth-tabs" role="tablist" aria-label="Account action">
        <button
          type="button"
          role="tab"
          aria-selected={!isRegistering}
          onClick={() => changeMode('login')}
          disabled={isBusy}
        >
          Sign in
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={isRegistering}
          onClick={() => changeMode('register')}
          disabled={isBusy}
        >
          Create account
        </button>
      </div>

      <form className="manual-auth-form" onSubmit={handleSubmit}>
        <div className="manual-auth-field">
          <label htmlFor="manual-account-identifier">
            {isRegistering ? 'Username' : 'Username or email address'}
          </label>
          <input
            id="manual-account-identifier"
            name={isRegistering ? 'username' : 'identifier'}
            type="text"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            minLength={isRegistering ? 3 : undefined}
            maxLength={isRegistering ? 32 : EMAIL_MAX_LENGTH}
            pattern={isRegistering ? '[A-Za-z0-9][A-Za-z0-9._-]*' : undefined}
            aria-describedby={isRegistering ? undefined : 'login-identifier-hint'}
            required
            disabled={isBusy}
          />
          {!isRegistering && (
            <span className="auth-field-hint" id="login-identifier-hint">
              Use the username or email address associated with your account.
            </span>
          )}
        </div>
        {isRegistering && (
          <label>
            Email address
            <input
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              maxLength={EMAIL_MAX_LENGTH}
              required
              disabled={isBusy}
            />
          </label>
        )}
        <label>
          Password
          <input
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={isRegistering ? 'new-password' : 'current-password'}
            maxLength={72}
            required
            disabled={isBusy}
          />
        </label>
        {isRegistering && (
          <label>
            Enter password again
            <input
              name="passwordConfirmation"
              type="password"
              value={passwordConfirmation}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
              autoComplete="new-password"
              maxLength={72}
              required
              disabled={isBusy}
            />
          </label>
        )}
        {isRegistering && <p className="password-guidance">{PASSWORD_GUIDANCE}</p>}
        {(formError || errorMessage) && (
          <p className="auth-message auth-error" role="alert">{formError || errorMessage}</p>
        )}
        <button type="submit" className="manual-submit-button" disabled={isBusy}>
          {isBusy
            ? isRegistering ? 'Creating account…' : 'Signing in…'
            : isRegistering ? 'Create account' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}

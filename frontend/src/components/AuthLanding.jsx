import React, { useState } from 'react'
import { AUTH_PROVIDERS } from '../auth/authModel'
import ManualAuthForm from './ManualAuthForm'

function GoogleMark() {
  return (
    <svg className="provider-mark" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285f4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.3c1.9-1.8 2.9-4.4 2.9-7.4Z" />
      <path fill="#34a853" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.5c-.9.6-2 1-3.4 1a5.9 5.9 0 0 1-5.5-4.1H3.1v2.6A10 10 0 0 0 12 22Z" />
      <path fill="#fbbc05" d="M6.5 14a6 6 0 0 1 0-3.9V7.4H3.1a10 10 0 0 0 0 9.2L6.5 14Z" />
      <path fill="#ea4335" d="M12 6a5.4 5.4 0 0 1 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 12 2a10 10 0 0 0-8.9 5.4L6.5 10A5.9 5.9 0 0 1 12 6Z" />
    </svg>
  )
}

function FacebookMark() {
  return (
    <svg className="provider-mark" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#1877f2" />
      <path fill="#fff" d="M13.6 20v-7h2.3l.4-2.7h-2.7V8.6c0-.8.2-1.3 1.4-1.3h1.5V4.9c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v1.7H8.5V13h2.1v7h3Z" />
    </svg>
  )
}

function UsernameMark() {
  return (
    <svg className="provider-mark" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21c.5-5 3-7.5 7.5-7.5s7 2.5 7.5 7.5" />
    </svg>
  )
}

export default function AuthLanding({
  authConfigured,
  backendAvailable = false,
  manualAuthEnabled = false,
  socialAuthEnabled = false,
  busyProvider,
  errorMessage,
  onGuest,
  onManualAuth,
  onProviderSignIn,
}) {
  const [manualOpen, setManualOpen] = useState(false)
  const isBusy = Boolean(busyProvider)
  const socialAvailable = backendAvailable && socialAuthEnabled && authConfigured

  return (
    <main className="auth-page" aria-labelledby="welcome-title">
      <section className="auth-hero">
        <div className="hero-die" aria-hidden="true">
          <span /><span /><span /><span /><span /><span />
        </div>
        <p className="eyebrow">Scott's Dice Game</p>
        <h1 id="welcome-title">Ready to roll?</h1>
        <p className="auth-hero-copy">
          Chase straights, stack bonuses, and save your best scores. Choose how you want to play to get started.
        </p>
        <ul className="auth-features" aria-label="Game features">
          <li>Hold your best dice</li>
          <li>Three fourth-roll chances</li>
          <li>Big-roll celebrations</li>
        </ul>
      </section>

      <section className="auth-card" aria-labelledby="sign-in-title">
        {manualOpen ? (
          <>
            <div className="auth-card-heading">
              <p className="eyebrow">Player account</p>
              <h2 id="sign-in-title">Use your account</h2>
              <p>Sign in with your username or email address, or create a new account.</p>
            </div>
            <ManualAuthForm
              busyAction={busyProvider}
              errorMessage={errorMessage}
              onBack={() => setManualOpen(false)}
              onSubmit={onManualAuth}
            />
          </>
        ) : (
          <>
            <div className="auth-card-heading">
              <p className="eyebrow">Welcome</p>
              <h2 id="sign-in-title">Choose how to play</h2>
              <p>Sign in to save high scores, or jump straight into a guest game.</p>
            </div>

            <div className="auth-actions">
              {backendAvailable && (
                <>
                  <button
                    type="button"
                    className="provider-button google-button"
                    onClick={() => onProviderSignIn(AUTH_PROVIDERS.google)}
                    disabled={!socialAvailable || isBusy}
                  >
                    <GoogleMark />
                    <span>{busyProvider === AUTH_PROVIDERS.google ? 'Connecting to Google…' : 'Continue with Google'}</span>
                  </button>
                  <button
                    type="button"
                    className="provider-button facebook-button"
                    onClick={() => onProviderSignIn(AUTH_PROVIDERS.facebook)}
                    disabled={!socialAvailable || isBusy}
                  >
                    <FacebookMark />
                    <span>{busyProvider === AUTH_PROVIDERS.facebook ? 'Connecting to Facebook…' : 'Continue with Facebook'}</span>
                  </button>
                  <button
                    type="button"
                    className="provider-button username-button"
                    onClick={() => setManualOpen(true)}
                    disabled={!manualAuthEnabled || isBusy}
                  >
                    <UsernameMark />
                    <span>Continue with username or email</span>
                  </button>
                </>
              )}

              {backendAvailable && <div className="auth-divider"><span>or</span></div>}

              <button
                type="button"
                className="guest-button"
                onClick={onGuest}
                disabled={isBusy}
              >
                Continue as Guest
              </button>
            </div>

            {errorMessage && <p className="auth-message auth-error" role="alert">{errorMessage}</p>}
            {!backendAvailable && (
              <p className="auth-message auth-setup-note">
                The game service is offline. Guest play still works normally.
              </p>
            )}
            {backendAvailable && !socialAvailable && (
              <p className="auth-message auth-setup-note">
                Social sign-in needs matching Firebase setup. Username, email, and guest play are ready.
              </p>
            )}
            <p className="auth-privacy-note">
              Account sign-in unlocks saved scores and leaderboards.
            </p>
          </>
        )}
      </section>
    </main>
  )
}

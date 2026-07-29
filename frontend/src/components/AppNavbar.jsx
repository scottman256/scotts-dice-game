import React from 'react'
import { getUserInitials } from '../auth/authModel'

export default function AppNavbar({
  sessionKind,
  user,
  isSigningOut,
  isSettingsOpen,
  onReturnHome,
  onOpenSettings,
  onSignOut,
  settingsButtonRef,
}) {
  const isGuest = sessionKind === 'guest'
  const accountDetail = isGuest
    ? 'Local guest session'
    : user.email || `${user.providerLabel} account`

  return (
    <nav className="app-navbar" aria-label="Account navigation">
      <div className="nav-leading">
        {isGuest ? (
          <a className="return-home-link" href="/" onClick={onReturnHome}>
            <span aria-hidden="true">←</span>
            Return to sign in
          </a>
        ) : (
          <span className="nav-brand">
            <span className="nav-brand-die" aria-hidden="true">⚄</span>
            Scott's Dice Game
          </span>
        )}
      </div>

      <div className="nav-account">
        <span className="user-avatar" aria-hidden="true">
          {user.photoUrl ? <img src={user.photoUrl} alt="" referrerPolicy="no-referrer" /> : getUserInitials(user.name)}
        </span>
        <span className="user-copy">
          <strong>{user.name}</strong>
          <small>{accountDetail}</small>
        </span>
        <button
          type="button"
          className="settings-icon-button"
          onClick={onOpenSettings}
          disabled={isSigningOut}
          aria-label="Game settings"
          aria-pressed={isSettingsOpen}
          title="Game settings"
          ref={settingsButtonRef}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="3.4" />
            <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" />
          </svg>
        </button>
        {!isGuest && (
          <button
            type="button"
            className="sign-out-button"
            onClick={onSignOut}
            disabled={isSigningOut}
          >
            {isSigningOut ? 'Signing out…' : 'Sign out'}
          </button>
        )}
      </div>
    </nav>
  )
}

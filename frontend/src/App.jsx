import React, { useEffect, useRef, useState } from 'react'
import {
  createGuestUser,
  createUnavailableAuthService,
  getAuthErrorMessage,
} from './auth/authModel'
import AppNavbar from './components/AppNavbar'
import AuthLanding from './components/AuthLanding'
import DiceRoller from './components/DiceRoller'
import SettingsScreen from './components/SettingsScreen'
import {
  DEFAULT_GAME_SETTINGS,
  normalizeGameSettings,
} from './settings/gameThemes'

const unavailableAuthService = createUnavailableAuthService()

function getInitialSession(authService) {
  return {
    kind: authService.isConfigured ? 'checking' : 'signedOut',
    user: null,
  }
}

export default function App({ authService = unavailableAuthService }) {
  const [session, setSession] = useState(() => getInitialSession(authService))
  const [busyAction, setBusyAction] = useState(null)
  const [authError, setAuthError] = useState('')
  const [gameSettings, setGameSettings] = useState(() => ({ ...DEFAULT_GAME_SETTINGS }))
  const [activeScreen, setActiveScreen] = useState('game')
  const settingsButtonRef = useRef(null)
  const shouldRestoreSettingsFocus = useRef(false)

  function resetGamePresentation() {
    setGameSettings({ ...DEFAULT_GAME_SETTINGS })
    setActiveScreen('game')
    shouldRestoreSettingsFocus.current = false
  }

  useEffect(() => {
    if (!authService.isConfigured) {
      setSession({ kind: 'signedOut', user: null })
      resetGamePresentation()
      return undefined
    }

    return authService.subscribe(
      (user) => {
        if (user) {
          setSession({ kind: 'authenticated', user })
        } else {
          setSession({ kind: 'signedOut', user: null })
          resetGamePresentation()
        }
      },
      () => {
        setSession({ kind: 'signedOut', user: null })
        resetGamePresentation()
        setAuthError('We could not restore your saved sign-in. Please sign in again.')
      },
    )
  }, [authService])

  useEffect(() => {
    if (activeScreen === 'game' && shouldRestoreSettingsFocus.current) {
      settingsButtonRef.current?.focus()
      shouldRestoreSettingsFocus.current = false
    }
  }, [activeScreen])

  async function handleProviderSignIn(providerId) {
    setBusyAction(providerId)
    setAuthError('')

    try {
      const user = await authService.signIn(providerId)
      resetGamePresentation()
      setSession({ kind: 'authenticated', user })
    } catch (error) {
      setAuthError(getAuthErrorMessage(error))
    } finally {
      setBusyAction(null)
    }
  }

  function handleGuest() {
    setAuthError('')
    resetGamePresentation()
    setSession({ kind: 'guest', user: createGuestUser() })
  }

  function handleReturnHome(event) {
    event.preventDefault()
    setAuthError('')
    resetGamePresentation()
    setSession({ kind: 'signedOut', user: null })
  }

  async function handleSignOut() {
    setBusyAction('signOut')
    setAuthError('')

    try {
      await authService.signOut()
      resetGamePresentation()
      setSession({ kind: 'signedOut', user: null })
    } catch {
      setAuthError('We could not sign you out. Please try again.')
    } finally {
      setBusyAction(null)
    }
  }

  function handleOpenSettings() {
    setAuthError('')
    setActiveScreen('settings')
  }

  function returnToGame() {
    shouldRestoreSettingsFocus.current = true
    setActiveScreen('game')
  }

  function handleSaveSettings(settings) {
    setGameSettings(normalizeGameSettings(settings))
    returnToGame()
  }

  if (session.kind === 'checking') {
    return (
      <main className="auth-loading" aria-label="Loading account">
        <span className="loading-die" aria-hidden="true">⚄</span>
        <p role="status">Checking your saved sign-in…</p>
      </main>
    )
  }

  if (session.kind === 'signedOut') {
    return (
      <AuthLanding
        authConfigured={authService.isConfigured}
        busyProvider={busyAction}
        errorMessage={authError}
        onGuest={handleGuest}
        onProviderSignIn={handleProviderSignIn}
      />
    )
  }

  return (
    <div className="app-shell game-session" data-game-theme={gameSettings.theme}>
      <AppNavbar
        sessionKind={session.kind}
        user={session.user}
        isSigningOut={busyAction === 'signOut'}
        isSettingsOpen={activeScreen === 'settings'}
        onReturnHome={handleReturnHome}
        onOpenSettings={handleOpenSettings}
        onSignOut={handleSignOut}
        settingsButtonRef={settingsButtonRef}
      />
      {authError && <p className="session-error" role="alert">{authError}</p>}
      <div className="app" hidden={activeScreen !== 'game'}>
        <header className="app-header">
          <h1>Scott's Dice Game</h1>
          <p>Roll up to three times, cash in a category, and spend your three extra chances wisely.</p>
        </header>
        <DiceRoller theme={gameSettings.theme} />
      </div>
      {activeScreen === 'settings' && (
        <SettingsScreen
          currentSettings={gameSettings}
          onCancel={returnToGame}
          onSave={handleSaveSettings}
        />
      )}
    </div>
  )
}

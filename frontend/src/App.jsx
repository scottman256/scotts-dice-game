import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  createUnavailableBackendClient,
  getBackendErrorMessage,
} from './api/backendClient'
import {
  createGuestUser,
  createUnavailableAuthService,
  getAuthErrorMessage,
} from './auth/authModel'
import AppNavbar from './components/AppNavbar'
import AuthLanding from './components/AuthLanding'
import DiceRoller from './components/DiceRoller'
import ResumeGameModal from './components/ResumeGameModal'
import ScoreboardScreen from './components/ScoreboardScreen'
import SettingsScreen from './components/SettingsScreen'
import { getGameViewState, hasGameProgress } from './gameState'
import {
  DEFAULT_GAME_SETTINGS,
  normalizeGameSettings,
} from './settings/gameThemes'

const unavailableAuthService = createUnavailableAuthService()
const unavailableBackendClient = createUnavailableBackendClient()
const OFFLINE_BACKEND = Object.freeze({
  available: false,
  manualAuthEnabled: false,
  socialAuthEnabled: false,
})

function getInitialSession(backendClient) {
  return {
    kind: backendClient.knownUnavailable ? 'signedOut' : 'checking',
    user: null,
  }
}

export default function App({
  authService = unavailableAuthService,
  backendClient = unavailableBackendClient,
}) {
  const [session, setSession] = useState(() => getInitialSession(backendClient))
  const [backendStatus, setBackendStatus] = useState(OFFLINE_BACKEND)
  const [busyAction, setBusyAction] = useState(null)
  const [authError, setAuthError] = useState('')
  const [gameSettings, setGameSettings] = useState(() => ({ ...DEFAULT_GAME_SETTINGS }))
  const [activeScreen, setActiveScreen] = useState('game')
  const [scoreMode, setScoreMode] = useState('personal')
  const [highScoreStatus, setHighScoreStatus] = useState(null)
  const [gamePersistenceStatus, setGamePersistenceStatus] = useState('idle')
  const [savedGameToResume, setSavedGameToResume] = useState(null)
  const [resumeDecisionBusy, setResumeDecisionBusy] = useState(false)
  const [gameBootstrap, setGameBootstrap] = useState({ key: 0, gameId: null, state: null })
  const settingsButtonRef = useRef(null)
  const shouldRestoreSettingsFocus = useRef(false)
  const persistenceQueueRef = useRef(Promise.resolve())
  const persistenceGenerationRef = useRef(0)

  function resetGamePresentation() {
    persistenceGenerationRef.current += 1
    persistenceQueueRef.current = Promise.resolve()
    setGameSettings({ ...DEFAULT_GAME_SETTINGS })
    setActiveScreen('game')
    setHighScoreStatus(null)
    setGamePersistenceStatus('idle')
    setSavedGameToResume(null)
    setResumeDecisionBusy(false)
    setGameBootstrap((current) => ({ key: current.key + 1, gameId: null, state: null }))
    shouldRestoreSettingsFocus.current = false
  }

  const enqueuePersistence = useCallback((operation, errorMessage) => {
    const generation = persistenceGenerationRef.current
    const pending = persistenceQueueRef.current.then(() => {
      if (generation !== persistenceGenerationRef.current) return undefined
      return operation()
    })
    const handled = pending.catch(() => {
      if (generation === persistenceGenerationRef.current) {
        setAuthError(errorMessage)
      }
    })
    persistenceQueueRef.current = handled
    return handled
  }, [])

  useEffect(() => {
    let active = true
    let unsubscribe = () => {}

    if (backendClient.knownUnavailable) {
      setBackendStatus(OFFLINE_BACKEND)
      setSession({ kind: 'signedOut', user: null })
      return undefined
    }

    async function initializeSession() {
      const status = await backendClient.checkAvailability()
      if (!active) return
      setBackendStatus(status)

      if (!status.available) {
        setSession({ kind: 'signedOut', user: null })
        resetGamePresentation()
        return
      }

      try {
        const restoredUser = await backendClient.restoreSession()
        if (!active) return
        if (restoredUser) {
          setSession({ kind: 'authenticated', user: restoredUser })
          return
        }
      } catch {
        if (!active) return
        setAuthError('We could not restore your saved sign-in. Please sign in again.')
      }

      if (!authService.isConfigured || !status.socialAuthEnabled) {
        setSession({ kind: 'signedOut', user: null })
        return
      }

      unsubscribe = authService.subscribe(
        async (firebaseUser) => {
          if (!active) return
          if (!firebaseUser) {
            setSession({ kind: 'signedOut', user: null })
            return
          }

          try {
            const idToken = await authService.getIdToken()
            const user = await backendClient.loginWithFirebase(idToken)
            if (active) setSession({ kind: 'authenticated', user })
          } catch {
            if (!active) return
            setSession({ kind: 'signedOut', user: null })
            setAuthError('We could not restore your saved sign-in. Please sign in again.')
          }
        },
        () => {
          if (!active) return
          setSession({ kind: 'signedOut', user: null })
          resetGamePresentation()
          setAuthError('We could not restore your saved sign-in. Please sign in again.')
        },
      )
    }

    initializeSession()
    return () => {
      active = false
      unsubscribe()
    }
  }, [authService, backendClient])

  useEffect(() => {
    if (session.kind !== 'authenticated') return undefined

    let active = true
    setGamePersistenceStatus('loading')
    setSavedGameToResume(null)

    backendClient.getGameSession()
      .then((gameSession) => {
        if (!active) return
        setGameSettings(normalizeGameSettings({ theme: gameSession?.theme }))
        if (gameSession?.savedGame) {
          setSavedGameToResume(gameSession.savedGame)
          setGamePersistenceStatus('prompting')
          return
        }
        setGameBootstrap((current) => ({ key: current.key + 1, gameId: null, state: null }))
        setGamePersistenceStatus('ready')
      })
      .catch(() => {
        if (!active) return
        setGameBootstrap((current) => ({ key: current.key + 1, gameId: null, state: null }))
        setGamePersistenceStatus('ready')
        setAuthError('Your saved game could not be loaded. A new game was started.')
      })

    return () => {
      active = false
    }
  }, [backendClient, session.kind, session.user?.id])

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
      await authService.signIn(providerId)
      const idToken = await authService.getIdToken(true)
      if (!idToken) throw new Error('Firebase did not provide an ID token.')
      const user = await backendClient.loginWithFirebase(idToken)
      resetGamePresentation()
      setSession({ kind: 'authenticated', user })
    } catch (error) {
      setAuthError(error?.code?.startsWith('auth/')
        ? getAuthErrorMessage(error)
        : getBackendErrorMessage(error))
    } finally {
      setBusyAction(null)
    }
  }

  async function handleManualAuth(mode, credentials) {
    setBusyAction(`manual-${mode}`)
    setAuthError('')

    try {
      const user = mode === 'register'
        ? await backendClient.register(credentials)
        : await backendClient.login(credentials)
      resetGamePresentation()
      setSession({ kind: 'authenticated', user })
    } catch (error) {
      setAuthError(getBackendErrorMessage(error))
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
      await persistenceQueueRef.current
      await Promise.all([
        session.user?.providerId === 'google' || session.user?.providerId === 'facebook'
          ? authService.signOut()
          : Promise.resolve(),
        backendClient.signOut(),
      ])
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

  function handleOpenScores(mode) {
    setAuthError('')
    setScoreMode(mode)
    setActiveScreen('scores')
  }

  function returnToGame() {
    shouldRestoreSettingsFocus.current = activeScreen === 'settings'
    setActiveScreen('game')
  }

  function handleSaveSettings(settings) {
    const normalizedSettings = normalizeGameSettings(settings)
    setGameSettings(normalizedSettings)
    if (session.kind === 'authenticated') {
      enqueuePersistence(
        () => backendClient.saveTheme(normalizedSettings.theme),
        'Your theme could not be saved. Please check the backend service.',
      )
    }
    returnToGame()
  }

  function handleContinueSavedGame() {
    if (!savedGameToResume) return
    setGameBootstrap((current) => ({
      key: current.key + 1,
      gameId: savedGameToResume.gameId,
      state: savedGameToResume,
    }))
    setSavedGameToResume(null)
    setGamePersistenceStatus('ready')
    setActiveScreen('game')
  }

  async function handleStartNewSavedGame() {
    setResumeDecisionBusy(true)
    setAuthError('')
    try {
      await backendClient.deleteSavedGame()
      setGameBootstrap((current) => ({ key: current.key + 1, gameId: null, state: null }))
      setSavedGameToResume(null)
      setGamePersistenceStatus('ready')
      setActiveScreen('game')
    } catch {
      setAuthError('Your previous game could not be cleared. Please try again.')
    } finally {
      setResumeDecisionBusy(false)
    }
  }

  const handleGameStateChange = useCallback(({ gameId, state }) => {
    if (session.kind !== 'authenticated') return
    if (!hasGameProgress(state) || getGameViewState(state).gameComplete) return
    enqueuePersistence(
      () => backendClient.saveGame(gameId, state),
      'Your latest game progress could not be saved. Please check the backend service.',
    )
  }, [backendClient, enqueuePersistence, session.kind])

  const handleNewGame = useCallback(() => {
    setHighScoreStatus(null)
    if (session.kind !== 'authenticated') return
    enqueuePersistence(
      () => backendClient.deleteSavedGame(),
      'Your previous game could not be cleared. Please check the backend service.',
    )
  }, [backendClient, enqueuePersistence, session.kind])

  const handleGameComplete = useCallback(async ({ gameId, score }) => {
    if (session.kind !== 'authenticated') return
    setHighScoreStatus('saving')
    const clearSavedGame = enqueuePersistence(
      () => backendClient.deleteSavedGame(),
      'Your completed game could not be cleared from saved progress.',
    )
    try {
      const result = await backendClient.saveScore(gameId, score)
      setHighScoreStatus(result.newHighScore ? 'new' : 'saved')
    } catch {
      setHighScoreStatus('error')
      setAuthError('Your game is complete, but the score could not be saved. Please check the backend service.')
    }
    await clearSavedGame
  }, [backendClient, enqueuePersistence, session.kind])

  const loadScores = useCallback((mode) => (
    mode === 'personal'
      ? backendClient.getPersonalScores()
      : backendClient.getLeaderboard()
  ), [backendClient])

  if (session.kind === 'checking') {
    return (
      <main className="auth-loading" aria-label="Loading account">
        <span className="loading-die" aria-hidden="true">⚄</span>
        <p role="status">Connecting to the game service…</p>
      </main>
    )
  }

  if (session.kind === 'signedOut') {
    return (
      <AuthLanding
        authConfigured={authService.isConfigured}
        backendAvailable={backendStatus.available}
        manualAuthEnabled={backendStatus.manualAuthEnabled}
        socialAuthEnabled={backendStatus.socialAuthEnabled}
        busyProvider={busyAction}
        errorMessage={authError}
        onGuest={handleGuest}
        onManualAuth={handleManualAuth}
        onProviderSignIn={handleProviderSignIn}
      />
    )
  }

  const gameReady = session.kind === 'guest' || gamePersistenceStatus === 'ready'

  return (
    <div className="app-shell game-session" data-game-theme={gameSettings.theme}>
      <AppNavbar
        sessionKind={session.kind}
        user={session.user}
        isSigningOut={busyAction === 'signOut'}
        isScoresOpen={activeScreen === 'scores'}
        activeScoreMode={activeScreen === 'scores' ? scoreMode : null}
        isSettingsOpen={activeScreen === 'settings'}
        onReturnHome={handleReturnHome}
        onOpenScores={handleOpenScores}
        onOpenSettings={handleOpenSettings}
        onSignOut={handleSignOut}
        settingsButtonRef={settingsButtonRef}
      />
      {authError && <p className="session-error" role="alert">{authError}</p>}
      {session.kind === 'authenticated' && gamePersistenceStatus === 'loading' && (
        <main className="game-persistence-loading" aria-label="Loading saved game">
          <span className="loading-die" aria-hidden="true">⚄</span>
          <p role="status">Checking for saved game progress…</p>
        </main>
      )}
      {session.kind === 'authenticated' && gamePersistenceStatus === 'prompting' && savedGameToResume && (
        <ResumeGameModal
          savedGame={savedGameToResume}
          isStartingNew={resumeDecisionBusy}
          onContinue={handleContinueSavedGame}
          onStartNew={handleStartNewSavedGame}
        />
      )}
      {gameReady && (
        <>
          <div className="app" hidden={activeScreen !== 'game'}>
            <header className="app-header">
              <h1>Scott's Dice Game</h1>
              <p>Roll up to three times, cash in a category, and spend your three extra chances wisely.</p>
            </header>
            <DiceRoller
              key={gameBootstrap.key}
              theme={gameSettings.theme}
              highScoreStatus={highScoreStatus}
              initialGameId={gameBootstrap.gameId}
              initialState={gameBootstrap.state}
              onGameComplete={handleGameComplete}
              onGameStateChange={handleGameStateChange}
              onNewGame={handleNewGame}
            />
          </div>
          {activeScreen === 'settings' && (
            <SettingsScreen
              currentSettings={gameSettings}
              onCancel={returnToGame}
              onSave={handleSaveSettings}
            />
          )}
          {activeScreen === 'scores' && (
            <ScoreboardScreen mode={scoreMode} loadScores={loadScores} onBack={returnToGame} />
          )}
        </>
      )}
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import { GAME_THEMES } from '../settings/gameThemes'
import ConfirmActionModal from './ConfirmActionModal'

function errorText(error, fallback) {
  return error?.message || fallback
}

export default function AdminSettingsScreen({
  loadSettings,
  updateTheme,
  resetGameData,
  onThemeAvailabilityChange,
  onGameDataReset,
  onBack,
}) {
  const [themes, setThemes] = useState([])
  const [status, setStatus] = useState('loading')
  const [busyTheme, setBusyTheme] = useState(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let active = true
    loadSettings()
      .then((response) => {
        if (!active) return
        setThemes(response.themes)
        setStatus('ready')
      })
      .catch((error) => {
        if (!active) return
        setStatus('error')
        setErrorMessage(errorText(error, 'Admin settings could not be loaded.'))
      })
    return () => { active = false }
  }, [loadSettings])

  async function handleThemeChange(themeId, enabled) {
    setBusyTheme(themeId)
    setErrorMessage('')
    setMessage('')
    try {
      const response = await updateTheme(themeId, enabled)
      setThemes(response.themes)
      onThemeAvailabilityChange(response.themes)
    } catch (error) {
      setErrorMessage(errorText(error, 'The theme setting could not be changed.'))
    } finally {
      setBusyTheme(null)
    }
  }

  async function handleReset() {
    setResetting(true)
    setErrorMessage('')
    try {
      await resetGameData()
      setResetOpen(false)
      setMessage('Game data was restored to the original leaderboard state.')
      onGameDataReset()
    } catch (error) {
      setResetOpen(false)
      setErrorMessage(errorText(error, 'Game data could not be reset.'))
    } finally {
      setResetting(false)
    }
  }

  const settingsById = new Map(themes.map((theme) => [theme.id, theme]))

  return (
    <main className="admin-page" aria-labelledby="admin-settings-title">
      <header className="admin-page-heading">
        <div>
          <p className="eyebrow">Administration</p>
          <h1 id="admin-settings-title">Admin Settings</h1>
          <p>Control available game styles and maintain shared game data.</p>
        </div>
        <button type="button" className="scores-back-button" onClick={onBack}>Back to game</button>
      </header>

      {message && <p className="admin-success" role="status">{message}</p>}
      {errorMessage && <p className="admin-inline-error" role="alert">{errorMessage}</p>}
      {status === 'loading' && <p className="scores-state" role="status">Loading admin settings…</p>}

      {status === 'ready' && (
        <div className="admin-settings-grid">
          <section className="admin-card" aria-labelledby="theme-availability-title">
            <div className="admin-card-heading">
              <div>
                <p className="eyebrow">Game styles</p>
                <h2 id="theme-availability-title">Theme availability</h2>
              </div>
              <span>{themes.filter(({ enabled }) => enabled).length}/{GAME_THEMES.length} enabled</span>
            </div>
            <p>Disabled themes disappear from player settings. Existing selections return to Classic.</p>
            <div className="admin-theme-list">
              {GAME_THEMES.map((theme) => {
                const enabled = settingsById.get(theme.id)?.enabled ?? false
                const classic = theme.id === 'classic'
                return (
                  <label className="admin-theme-row" key={theme.id}>
                    <span>
                      <strong>{theme.label}</strong>
                      {classic && <small>Required fallback</small>}
                    </span>
                    <input
                      type="checkbox"
                      role="switch"
                      checked={enabled}
                      disabled={classic || busyTheme !== null}
                      onChange={(event) => handleThemeChange(theme.id, event.target.checked)}
                      aria-label={`${theme.label} theme`}
                    />
                  </label>
                )
              })}
            </div>
          </section>

          <section className="admin-card admin-danger-zone" aria-labelledby="game-data-title">
            <p className="eyebrow">Danger zone</p>
            <h2 id="game-data-title">Restore original game data</h2>
            <p>Delete player scores, statistics, achievements, saved games, and custom system scores. User accounts and the original ten leaderboard scores remain.</p>
            <button type="button" className="admin-danger-button" onClick={() => setResetOpen(true)}>
              Reset all game data
            </button>
          </section>
        </div>
      )}

      {resetOpen && (
        <ConfirmActionModal
          title="Reset all game data?"
          description="This permanently removes player scoring history, achievements, saved games, and custom leaderboard entries. User accounts will not be deleted."
          confirmLabel="Reset game data"
          busyLabel="Resetting…"
          isBusy={resetting}
          onCancel={() => setResetOpen(false)}
          onConfirm={handleReset}
        />
      )}
    </main>
  )
}

import React, { useEffect, useRef, useState } from 'react'
import { getDiceSet } from '../assets/diceSets'
import {
  GAME_SETTING_DEFINITIONS,
  normalizeGameSettings,
} from '../settings/gameThemes'

function ThemePreview({ themeId }) {
  const diceSet = getDiceSet(themeId)

  return (
    <span className="theme-preview" data-preview-theme={themeId} aria-hidden="true">
      <span className="preview-orb" />
      <span className="preview-table">
        <img className="preview-die" src={diceSet.faces[4]} alt="" />
        <span className="preview-action" />
      </span>
    </span>
  )
}

export default function SettingsScreen({ currentSettings, onCancel, onSave }) {
  const [draftSettings, setDraftSettings] = useState(() => (
    normalizeGameSettings(currentSettings)
  ))
  const headingRef = useRef(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  function handleSettingChange(settingId, value) {
    setDraftSettings((current) => ({ ...current, [settingId]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    onSave(normalizeGameSettings(draftSettings))
  }

  return (
    <main className="settings-page" aria-labelledby="settings-title">
      <header className="settings-heading">
        <p className="eyebrow">Preferences</p>
        <h1 id="settings-title" ref={headingRef} tabIndex="-1">Game settings</h1>
        <p>Personalize the table without interrupting your current turn or score.</p>
      </header>

      <form className="settings-form" onSubmit={handleSubmit}>
        <div className="settings-groups">
          {GAME_SETTING_DEFINITIONS.map((setting) => (
            <fieldset
              className="setting-group"
              key={setting.id}
              aria-describedby={`${setting.id}-setting-help`}
            >
              <legend>{setting.label}</legend>
              <p id={`${setting.id}-setting-help`}>{setting.description}</p>
              <div className="theme-options">
                {setting.options.map((option) => {
                  const selected = draftSettings[setting.id] === option.id
                  return (
                    <label
                      className={`theme-option${selected ? ' theme-option-selected' : ''}`}
                      key={option.id}
                    >
                      <input
                        type="radio"
                        name={setting.id}
                        value={option.id}
                        checked={selected}
                        onChange={() => handleSettingChange(setting.id, option.id)}
                      />
                      <ThemePreview themeId={option.id} />
                      <span className="theme-option-copy">
                        <strong>{option.label}</strong>
                        <small>{option.description}</small>
                      </span>
                    </label>
                  )
                })}
              </div>
            </fieldset>
          ))}
        </div>

        <div className="settings-actions">
          <button type="button" className="settings-cancel-button" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="settings-save-button">
            Save style &amp; return to game
          </button>
        </div>
      </form>
    </main>
  )
}

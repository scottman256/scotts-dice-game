import React, { useEffect, useMemo, useState } from 'react'
import { getAchievementBadge } from '../assets/achievementBadges'

const DEFAULT_CAPACITY = 36

export default function AchievementsScreen({ loadAchievements, onBack }) {
  const [collection, setCollection] = useState(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let active = true
    setStatus('loading')

    loadAchievements()
      .then((loadedCollection) => {
        if (!active) return
        setCollection(loadedCollection)
        setStatus('ready')
      })
      .catch(() => {
        if (active) setStatus('error')
      })

    return () => {
      active = false
    }
  }, [loadAchievements])

  const achievements = collection?.achievements || []
  const capacity = Math.max(collection?.capacity || DEFAULT_CAPACITY, achievements.length)
  const slots = useMemo(
    () => Array.from({ length: capacity }, (_, index) => achievements[index] || null),
    [achievements, capacity],
  )
  const rows = useMemo(
    () => Array.from({ length: Math.ceil(capacity / 6) }, (_, rowIndex) => (
      slots.slice(rowIndex * 6, rowIndex * 6 + 6)
    )),
    [capacity, slots],
  )

  return (
    <main className="scores-page achievements-page" aria-labelledby="achievements-title">
      <div className="scores-heading">
        <div>
          <p className="eyebrow">Player collection</p>
          <h1 id="achievements-title">Achievements</h1>
          <p>Every completed-game milestone earns a permanent place in your collection.</p>
        </div>
        <button type="button" className="scores-back-button" onClick={onBack}>Back to game</button>
      </div>

      <section className="achievements-card" aria-live="polite">
        {status === 'loading' && <p className="scores-state" role="status">Loading achievements…</p>}
        {status === 'error' && (
          <p className="scores-state scores-error" role="alert">
            We could not load achievements right now. Please try again.
          </p>
        )}
        {status === 'ready' && (
          <>
            <div className="achievement-progress">
              <span>Collection progress</span>
              <strong>{achievements.length} / {capacity}</strong>
            </div>
            <div className="achievement-grid-wrap">
              <div
                className="achievement-grid"
                role="table"
                aria-label="Achievement collection"
                aria-colcount="6"
                aria-rowcount={rows.length}
              >
                {rows.map((row, rowIndex) => (
                  <div className="achievement-row" role="row" key={`row-${rowIndex}`}>
                    {row.map((achievement, columnIndex) => {
                      const slotIndex = rowIndex * 6 + columnIndex
                      const badge = achievement ? getAchievementBadge(achievement.key) : null
                      if (!achievement) {
                        return (
                          <div
                            className="achievement-slot achievement-slot-locked"
                            role="cell"
                            aria-label={`Locked achievement slot ${slotIndex + 1}`}
                            key={`locked-${slotIndex}`}
                          >
                            <span className="achievement-lock" aria-hidden="true" />
                          </div>
                        )
                      }

                      return (
                        <article className="achievement-slot achievement-slot-earned" role="cell" key={achievement.key}>
                          {badge && <img src={badge} alt="" width="320" height="320" />}
                          <h2>{achievement.title}</h2>
                          <p>{achievement.description}</p>
                        </article>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  )
}

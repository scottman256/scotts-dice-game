import React, { useEffect, useState } from 'react'

const NUMBER_FORMAT = new Intl.NumberFormat()
const DECIMAL_FORMAT = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 })

function formatInteger(value) {
  return value === null || value === undefined ? '—' : NUMBER_FORMAT.format(value)
}

function formatDecimal(value) {
  return value === null || value === undefined ? '—' : DECIMAL_FORMAT.format(value)
}

export default function GameStatsScreen({ loadStats, onBack }) {
  const [stats, setStats] = useState(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let active = true
    setStatus('loading')

    loadStats()
      .then((loadedStats) => {
        if (!active) return
        setStats(loadedStats)
        setStatus('ready')
      })
      .catch(() => {
        if (active) setStatus('error')
      })

    return () => {
      active = false
    }
  }, [loadStats])

  const headlineStats = stats ? [
    { label: 'Games Played', value: formatInteger(stats.gamesPlayed), icon: '⚄' },
    { label: 'High Score', value: formatInteger(stats.highScore), icon: '★' },
    { label: 'Average', value: formatDecimal(stats.averageScore), icon: '∅' },
    { label: 'Total Points', value: formatInteger(stats.totalPoints), icon: 'Σ' },
  ] : []
  const detailStats = stats ? [
    { label: 'Low Score', value: formatInteger(stats.lowScore) },
    { label: 'Median', value: formatDecimal(stats.medianScore) },
    { label: '5Ks Scored', value: formatInteger(stats.fiveOfAKindsScored), help: 'Standard, bonus, and first-roll 5Ks' },
    { label: 'First-Roll 5Ks', value: formatInteger(stats.firstRollFiveOfAKinds) },
    { label: 'Top Bonus I', value: formatInteger(stats.firstTopBonuses) },
    { label: 'Top Bonus II', value: formatInteger(stats.secondTopBonuses) },
    { label: '5K Bonuses', value: formatInteger(stats.fiveOfAKindBonuses) },
  ] : []

  return (
    <main className="scores-page game-stats-page" aria-labelledby="game-stats-title">
      <div className="scores-heading">
        <div>
          <p className="eyebrow">Player record</p>
          <h1 id="game-stats-title">Game Stats</h1>
          <p>Your numbers from completed games since stats tracking began.</p>
        </div>
        <button type="button" className="scores-back-button" onClick={onBack}>Back to game</button>
      </div>

      <section className="stats-card" aria-live="polite">
        {status === 'loading' && <p className="scores-state" role="status">Loading game stats…</p>}
        {status === 'error' && (
          <p className="scores-state scores-error" role="alert">
            We could not load game stats right now. Please try again.
          </p>
        )}
        {status === 'ready' && stats && (
          <>
            {stats.gamesPlayed === 0 && (
              <p className="stats-empty-note">Complete a game to start building your player record.</p>
            )}
            <div className="stats-headline-grid">
              {headlineStats.map((item) => (
                <article className="stat-headline" key={item.label}>
                  <span aria-hidden="true">{item.icon}</span>
                  <small>{item.label}</small>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>
            <div className="stats-detail-grid">
              {detailStats.map((item) => (
                <article className="stat-detail" key={item.label}>
                  <div>
                    <small>{item.label}</small>
                    {item.help && <span>{item.help}</span>}
                  </div>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  )
}

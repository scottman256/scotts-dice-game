import React from 'react'
import { getAchievementBadge } from '../assets/achievementBadges'

function ordinal(value) {
  const lastTwoDigits = value % 100
  const suffix = lastTwoDigits >= 11 && lastTwoDigits <= 13
    ? 'th'
    : ({ 1: 'st', 2: 'nd', 3: 'rd' }[value % 10] || 'th')
  return `${value.toLocaleString('en-US')}${suffix}`
}

export default function GameSummary({ summary, compact = false }) {
  const { status, personalRank, totalGames, tiedRank, unlockedAchievements = [] } = summary
  let message = 'The game is over.'
  if (status === 'saving') {
    message += ' Saving your score and checking achievements…'
  } else if (status === 'error') {
    message += ' Your score could not be saved. Your ranking and new achievements are unavailable.'
  } else if (status === 'ready') {
    message += tiedRank
      ? ` You tied for the ${ordinal(personalRank)} best score`
      : ` You got the ${ordinal(personalRank)} best score`
    message += ` out of the ${totalGames.toLocaleString('en-US')} ${totalGames === 1 ? 'game' : 'games'} you played.`
  }

  return (
    <div className={`game-summary${compact ? ' game-summary-compact' : ''}`}>
      <p className="game-summary-message" role="status">{message}</p>
      {status === 'ready' && unlockedAchievements.length > 0 && (
        <section className="game-summary-achievements" aria-label="Achievements unlocked this game">
          <h3>{unlockedAchievements.length === 1 ? 'Achievement unlocked' : 'Achievements unlocked'}</h3>
          <ul className="game-summary-badges">
            {unlockedAchievements.map((achievement) => {
              const badge = getAchievementBadge(achievement.key)
              return (
                <li key={achievement.key}>
                  {badge && <img src={badge} alt="" width="160" height="160" />}
                  <div>
                    <h4>{achievement.title}</h4>
                    {!compact && <p>{achievement.description}</p>}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}

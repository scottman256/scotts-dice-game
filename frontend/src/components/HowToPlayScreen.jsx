import React from 'react'
import {
  BOTTOM_CATEGORIES,
  CATEGORY_COUNT,
  TOP_BONUS_POINTS,
  TOP_BONUS_THRESHOLD,
  TOP_CATEGORIES,
  TOP_EXTRA_BONUS_POINTS,
  TOP_EXTRA_BONUS_THRESHOLD,
} from '../gameRules'
import { EXTRA_ROLL_LIMIT, NORMAL_ROLL_LIMIT } from '../gameState'

const TURN_STEPS = Object.freeze([
  {
    number: '01',
    title: 'Roll all five dice',
    copy: 'Every turn starts with a fresh roll. Look for matching numbers, runs, pairs, or an all-even or all-odd hand.',
  },
  {
    number: '02',
    title: 'Hold the keepers',
    copy: 'Select any dice you want to protect, then reroll the rest. You may hold or release dice between rolls.',
  },
  {
    number: '03',
    title: 'Cash in one category',
    copy: 'Choose one qualifying score to end the turn. After roll three, an eligible missed category can be scratched for zero.',
  },
])

const MEMBER_FEATURES = Object.freeze([
  ['Resume anywhere', 'Your active game, held dice, scorecard, and selected theme are saved automatically.'],
  ['Track every finish', 'Completed games feed your personal top ten, the global leaderboard, and detailed game statistics.'],
  ['Unlock achievements', 'Milestones celebrate special rolls, scoring feats, game totals, and adventures across themes.'],
])

const ADMIN_FEATURES = Object.freeze([
  ['Control available themes', 'Enable or disable game styles for players while keeping Classic available as the safe default.'],
  ['Manage player accounts', 'Review users, update manual-account emails and passwords, or remove accounts and their game data.'],
  ['Curate the leaderboard', 'Add fictional challengers, remove individual scores, or restore the original game data.'],
])

function CategoryGroup({ eyebrow, title, categories, tone }) {
  return (
    <section className={`guide-score-group guide-score-group-${tone}`} aria-labelledby={`guide-${tone}-title`}>
      <header>
        <p className="eyebrow">{eyebrow}</p>
        <h3 id={`guide-${tone}-title`}>{title}</h3>
        <span>{categories.length} categories</span>
      </header>
      <dl className="guide-score-list">
        {categories.map((category) => (
          <div key={category.id}>
            <dt>{category.label}</dt>
            <dd>{category.description}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function FeatureDeck({ features }) {
  return (
    <div className="guide-feature-deck">
      {features.map(([title, copy], index) => (
        <article key={title}>
          <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
          <h3>{title}</h3>
          <p>{copy}</p>
        </article>
      ))}
    </div>
  )
}

export default function HowToPlayScreen({ sessionKind, user, onBack }) {
  const isAuthenticated = sessionKind === 'authenticated'
  const isAdmin = isAuthenticated && Boolean(user?.admin)
  const backLabel = sessionKind === 'signedOut' ? 'Back to sign in' : 'Back to game'

  return (
    <main className="how-to-play-page" aria-labelledby="how-to-play-title">
      <header className="guide-hero">
        <button type="button" className="guide-back-button" onClick={onBack}>
          <span aria-hidden="true">←</span> {backLabel}
        </button>
        <div className="guide-hero-layout">
          <div className="guide-hero-copy">
            <p className="eyebrow">Official field guide</p>
            <h1 id="how-to-play-title">How to Play</h1>
            <p>
              Build the strongest five-dice combinations you can, fill every scorecard row,
              and turn smart holds into a massive final score.
            </p>
            <div className="guide-game-facts" aria-label="Game overview">
              <span><strong>5</strong> dice</span>
              <span><strong>{NORMAL_ROLL_LIMIT}</strong> rolls per turn</span>
              <span><strong>{CATEGORY_COUNT}</strong> categories</span>
            </div>
          </div>
          <div className="guide-dice-scene" aria-hidden="true">
            <span className="guide-die guide-die-one">⚄</span>
            <span className="guide-die guide-die-two">⚂</span>
            <span className="guide-die guide-die-three">⚅</span>
            <span className="guide-orbit guide-orbit-one" />
            <span className="guide-orbit guide-orbit-two" />
          </div>
        </div>
      </header>

      <section className="guide-section" aria-labelledby="guide-turn-title">
        <div className="guide-section-heading">
          <div>
            <p className="eyebrow">The rhythm of a turn</p>
            <h2 id="guide-turn-title">Roll. Hold. Score.</h2>
          </div>
          <p>You may score a qualifying category early, or use all three normal rolls to improve your hand.</p>
        </div>
        <ol className="guide-turn-steps">
          {TURN_STEPS.map((step) => (
            <li key={step.number}>
              <span>{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </li>
          ))}
        </ol>
        <aside className="guide-fourth-roll" aria-labelledby="fourth-roll-title">
          <div className="guide-fourth-roll-mark" aria-hidden="true">+1</div>
          <div>
            <p className="eyebrow">Strategic reserve</p>
            <h3 id="fourth-roll-title">Three fourth-roll chances per game</h3>
            <p>
              After a turn&apos;s third roll, you may spend one of your {EXTRA_ROLL_LIMIT} shared chances
              for exactly one fourth roll. Use them on near-misses that are worth the gamble—once spent,
              that chance is gone for the rest of the game.
            </p>
          </div>
          <div className="guide-chance-pips" aria-label={`${EXTRA_ROLL_LIMIT} fourth-roll chances`}>
            {Array.from({ length: EXTRA_ROLL_LIMIT }, (_, index) => (
              <span key={index} aria-hidden="true">⚀</span>
            ))}
          </div>
        </aside>
      </section>

      <section className="guide-section guide-scoring-section" aria-labelledby="guide-scoring-title">
        <div className="guide-section-heading">
          <div>
            <p className="eyebrow">Scorecard reference</p>
            <h2 id="guide-scoring-title">Know what every roll is worth</h2>
          </div>
          <p>Fill every category once. Fixed-value combinations award the listed amount; other rows total the matching or complete hand.</p>
        </div>
        <div className="guide-score-grid">
          <CategoryGroup
            eyebrow="Number & hand totals"
            title="Top Section"
            categories={TOP_CATEGORIES}
            tone="top"
          />
          <CategoryGroup
            eyebrow="Patterns & premium rolls"
            title="Bottom Section"
            categories={BOTTOM_CATEGORIES}
            tone="bottom"
          />
        </div>

        <div className="guide-bonus-track" aria-labelledby="guide-bonus-title">
          <div>
            <p className="eyebrow">Top-section bonus track</p>
            <h3 id="guide-bonus-title">Push the subtotal past the markers</h3>
            <p>The bonuses stack, so reaching the second marker earns both awards.</p>
          </div>
          <ol>
            <li>
              <span>{TOP_BONUS_THRESHOLD}</span>
              <div><strong>First marker</strong><small>+{TOP_BONUS_POINTS} points</small></div>
            </li>
            <li>
              <span>{TOP_EXTRA_BONUS_THRESHOLD}</span>
              <div><strong>Second marker</strong><small>+{TOP_EXTRA_BONUS_POINTS} more</small></div>
            </li>
          </ol>
        </div>

        <aside className="guide-score-note">
          <span aria-hidden="true">!</span>
          <p>
            <strong>Scratching and 5 of a Kind:</strong> after the third roll, a missed eligible row may be
            recorded as zero. The 5 of a Kind Bonus scores 150 only after the regular 5 of a Kind has scored 75;
            resolve that bonus row before scratching the regular 5 of a Kind row.
          </p>
        </aside>
      </section>

      {isAuthenticated && (
        <section className="guide-section guide-member-section" aria-labelledby="guide-member-title">
          <div className="guide-section-heading">
            <div>
              <p className="eyebrow">More with an account</p>
              <h2 id="guide-member-title">Your game is ready when you return</h2>
            </div>
            <p>Sign in to keep your progress, favorite style, scores, and achievements ready for next time.</p>
          </div>
          <FeatureDeck features={MEMBER_FEATURES} />
        </section>
      )}

      {isAdmin && (
        <section className="guide-section guide-admin-section" aria-labelledby="guide-admin-title">
          <div className="guide-section-heading">
            <div>
              <p className="eyebrow">Administrator toolkit</p>
              <h2 id="guide-admin-title">Shape the whole game room</h2>
            </div>
            <p>Admin access adds controlled tools for themes, accounts, and shared game data.</p>
          </div>
          <FeatureDeck features={ADMIN_FEATURES} />
        </section>
      )}
    </main>
  )
}

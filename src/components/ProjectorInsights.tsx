import { ArrowDownRight, ArrowUpRight, ChartNoAxesCombined } from 'lucide-react'
import { buildDayBreakdown, type DayTeamBreakdown } from '../lib/analytics'
import type { ScoreboardState, Team } from '../types'

function ReasonList({ reasons, direction }: { reasons: DayTeamBreakdown['gainedReasons']; direction: 'gained' | 'lost' }) {
  if (!reasons.length) return <p className="insight-empty">No {direction === 'gained' ? 'points gained' : 'points deducted'} on this day.</p>
  return (
    <ul className="insight-reason-list">
      {reasons.map((reason) => (
        <li key={reason.label}>
          <span title={reason.label}>{reason.label}</span>
          <small>{reason.events} {reason.events === 1 ? 'event' : 'events'}</small>
          <strong>{direction === 'gained' ? '+' : '−'}{reason.points}</strong>
        </li>
      ))}
    </ul>
  )
}

function TeamPointStory({ team, breakdown }: { team: Team; breakdown: DayTeamBreakdown }) {
  return (
    <article data-team={team.id} style={{ '--team': team.color, '--accent': team.accent, '--tint': team.tint, '--team-ink': team.foreground } as React.CSSProperties}>
      <div className="insight-team-name">
        <i />
        <strong>{team.shortName}</strong>
        <span>{breakdown.net >= 0 ? '+' : '−'}{Math.abs(breakdown.net)} net</span>
      </div>
      <div className="insight-day-flow">
        <section className="insight-flow gained">
          <header><span><ArrowUpRight />Gained</span><strong>+{breakdown.gained}</strong></header>
          <ReasonList reasons={breakdown.gainedReasons} direction="gained" />
        </section>
        <section className="insight-flow deducted">
          <header><span><ArrowDownRight />Deducted</span><strong>−{breakdown.lost}</strong></header>
          <ReasonList reasons={breakdown.lostReasons} direction="lost" />
        </section>
      </div>
    </article>
  )
}

export function ProjectorInsights({ state }: { state: ScoreboardState }) {
  const breakdown = buildDayBreakdown(state.events, state.session.activeDay)
  const rankedTeams = [...state.teams].sort((a, b) => state.scores[b.id] - state.scores[a.id])
  return (
    <section className="projector-insights">
      <a className="insight-dashboard-link" href="#/dashboard" title="Open full data dashboard" aria-label="Open full data dashboard"><ChartNoAxesCombined /></a>
      <div className="insight-team-grid">
        {rankedTeams.map((team) => <TeamPointStory key={team.id} team={team} breakdown={breakdown[team.id]} />)}
      </div>
    </section>
  )
}

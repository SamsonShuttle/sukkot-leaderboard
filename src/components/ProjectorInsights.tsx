import { ArrowDownRight, ArrowUpRight, ChartNoAxesCombined } from 'lucide-react'
import { buildDashboardAnalytics } from '../lib/analytics'
import type { ScoreboardState } from '../types'

export function ProjectorInsights({ state }: { state: ScoreboardState }) {
  const analytics = buildDashboardAnalytics(state.events, 8)
  return (
    <section className="projector-insights">
      <header>
        <div><span>Point story</span><strong>Current event</strong></div>
        <a href="#/dashboard"><ChartNoAxesCombined />Full data dashboard</a>
      </header>
      <div className="insight-team-grid">
        {state.teams.map((team) => {
          const metrics = analytics.teams[team.id]
          const leadingReason = metrics.gainedReasons[0]?.label ?? 'No points recorded'
          return (
            <article key={team.id} data-team={team.id} style={{ '--team': team.color, '--accent': team.accent, '--tint': team.tint, '--team-ink': team.foreground } as React.CSSProperties}>
              <div className="insight-team-name"><i /><strong>{team.shortName}</strong><span>{metrics.net} net</span></div>
              <div className="insight-numbers"><span className="gain"><ArrowUpRight />+{metrics.gained} gained</span><span className="loss"><ArrowDownRight />−{metrics.lost} taken</span></div>
              <p title={leadingReason}>Top source: {leadingReason}</p>
            </article>
          )
        })}
      </div>
    </section>
  )
}

import { ArrowLeft, BarChart3, Settings2, TrendingUp } from 'lucide-react'
import { buildDashboardAnalytics, type DashboardAnalytics } from '../lib/analytics'
import type { ColorTheme, DaySummary, ScoreboardState, Team, TeamId } from '../types'
import { TEAM_IDS, teamById } from '../types'
import { ActivityTicker } from './ActivityTicker'
import { StatusPill } from './StatusPill'
import { ThemeToggle } from './ThemeToggle'

const LINE_COLORS: Record<TeamId, string> = {
  judah: '#D6A92A',
  israel: '#5F7FFF',
  levi: '#D94B78',
}

function ScoreLineChart({ summaries }: { summaries: DaySummary[] }) {
  const width = 820
  const height = 238
  const inset = { top: 18, right: 18, bottom: 32, left: 46 }
  const values = summaries.flatMap((summary) => TEAM_IDS.map((teamId) => summary.closingScores[teamId]))
  const observedMinimum = Math.min(0, ...values)
  const observedMaximum = Math.max(0, ...values)
  const flat = observedMinimum === observedMaximum
  const minimum = flat ? observedMinimum - 5 : observedMinimum
  const maximum = flat ? observedMaximum + 5 : observedMaximum
  const range = Math.max(10, maximum - minimum)
  const x = (index: number) => inset.left + index * ((width - inset.left - inset.right) / Math.max(1, summaries.length - 1))
  const y = (value: number) => inset.top + (maximum - value) / range * (height - inset.top - inset.bottom)
  const gridValues = Array.from({ length: 5 }, (_, index) => Math.round(maximum - range * index / 4))

  return (
    <section className="visual-panel line-chart-panel">
      <header><div><span>Score movement</span><h2>Points over time</h2></div><TrendingUp /></header>
      <div className="line-chart-wrap">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="score-chart-title score-chart-description">
          <title id="score-chart-title">House scores over all eight days</title>
          <desc id="score-chart-description">A line for Judah, Israel, and Levi showing cumulative points after each event day.</desc>
          {gridValues.map((value, index) => (
            <g className="chart-gridline" key={index}>
              <line x1={inset.left} x2={width - inset.right} y1={y(value)} y2={y(value)} />
              <text x={inset.left - 8} y={y(value) + 4}>{value}</text>
            </g>
          ))}
          {summaries.map((summary, index) => <text className="chart-day-label" key={summary.day} x={x(index)} y={height - 7}>D{summary.day}</text>)}
          {TEAM_IDS.map((teamId) => {
            const path = summaries.map((summary, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(summary.closingScores[teamId])}`).join(' ')
            return (
              <g className={`chart-series series-${teamId}`} key={teamId}>
                <path d={path} stroke={LINE_COLORS[teamId]} />
                {summaries.map((summary, index) => <circle key={summary.day} cx={x(index)} cy={y(summary.closingScores[teamId])} r="4" fill={LINE_COLORS[teamId]} />)}
              </g>
            )
          })}
        </svg>
      </div>
      <div className="chart-legend">{TEAM_IDS.map((teamId) => <span key={teamId}><i style={{ background: LINE_COLORS[teamId] }} />{teamById(teamId)?.shortName}</span>)}</div>
    </section>
  )
}

function SourceBarChart({ analytics }: { analytics: DashboardAnalytics }) {
  const maximum = Math.max(1, ...TEAM_IDS.flatMap((teamId) => analytics.teams[teamId].gainedReasons.map((reason) => reason.points)))
  return (
    <section className="visual-panel source-chart-panel">
      <header><div><span>Award sources</span><h2>Where points came from</h2></div><BarChart3 /></header>
      <div className="source-team-groups">
        {TEAM_IDS.map((teamId) => {
          const team = teamById(teamId)
          const reasons = analytics.teams[teamId].gainedReasons.slice(0, 3)
          return (
            <section key={teamId} data-team={teamId} style={{ '--team': team?.color } as React.CSSProperties}>
              <h3><i />{team?.shortName}</h3>
              {reasons.map((reason) => (
                <div className="source-bar" key={reason.label}>
                  <div><span title={reason.label}>{reason.label}</span><strong>{reason.points}</strong></div>
                  <i><b style={{ width: `${Math.max(5, reason.points / maximum * 100)}%` }} /></i>
                </div>
              ))}
              {!reasons.length ? <p>No awarded points yet.</p> : null}
            </section>
          )
        })}
      </div>
    </section>
  )
}

function TeamFlowDonut({ team, score, analytics }: { team: Team; score: number; analytics: DashboardAnalytics }) {
  const metrics = analytics.teams[team.id]
  const totalFlow = metrics.gained + metrics.lost
  const gainAngle = totalFlow ? metrics.gained / totalFlow * 360 : 0
  const donutState = !totalFlow ? ' empty' : !metrics.lost ? ' all-gain' : !metrics.gained ? ' all-loss' : ''
  const topGain = metrics.gainedReasons[0]
  const topLoss = metrics.lostReasons[0]

  return (
    <article className="team-flow-card" data-team={team.id} style={{ '--team': team.color, '--team-ink': team.foreground, '--gain-angle': `${gainAngle}deg` } as React.CSSProperties}>
      <header><img src={team.bannerUrl} alt="" /><div><span>House of</span><h2>{team.shortName}</h2></div></header>
      <div className="flow-visual">
        <div className={`flow-donut${donutState}`} role="img" aria-label={`${team.shortName}: ${metrics.gained} points gained and ${metrics.lost} points taken`}><div><strong>{score}</strong><span>current</span></div></div>
        <div className="flow-legend"><span className="gain"><i />+{metrics.gained}<small>gained</small></span><span className="loss"><i />−{metrics.lost}<small>taken</small></span></div>
      </div>
      <div className="flow-reasons">
        <span><small>Top source</small><strong>{topGain?.label ?? 'No awards yet'}</strong></span>
        <span><small>Top deduction</small><strong>{topLoss?.label ?? 'None recorded'}</strong></span>
      </div>
    </article>
  )
}

export function DataDashboard({ state, status, storageKind, theme, onToggleTheme }: {
  state: ScoreboardState
  status: 'loading' | 'ready' | 'error'
  storageKind?: 'browser-sqlite' | 'tauri-sqlite'
  theme: ColorTheme
  onToggleTheme: () => void
}) {
  const analytics = buildDashboardAnalytics(state.events, 8)

  return (
    <main className="data-dashboard-view compact-dashboard">
      <header className="dashboard-header">
        <div className="dashboard-title"><a href="#/"><ArrowLeft />Leaderboard</a><p>Whole-event data · Scoring on Day {state.session.activeDay}</p><h1>{state.session.name}</h1></div>
        <div className="header-actions"><StatusPill status={status} storageKind={storageKind} compact /><ThemeToggle theme={theme} onToggle={onToggleTheme} /><a className="icon-button" href="#/organizer" title="Organizer controls" aria-label="Organizer controls"><Settings2 /></a></div>
      </header>

      <div className="dashboard-visual-grid">
        <ScoreLineChart summaries={state.daySummaries} />
        <SourceBarChart analytics={analytics} />
      </div>

      <section className="team-flow-grid" aria-label="House inflow and deduction charts">
        {state.teams.map((team) => <TeamFlowDonut key={team.id} team={team} score={state.scores[team.id]} analytics={analytics} />)}
      </section>

      <ActivityTicker events={state.events} />
    </main>
  )
}

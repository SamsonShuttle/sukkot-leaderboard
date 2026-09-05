import { ChartNoAxesCombined, Maximize2, Settings2, TentTree } from 'lucide-react'
import type { ColorTheme, ScoreboardState, ScoreEvent } from '../types'
import { StatusPill } from './StatusPill'
import { TeamCard } from './TeamCard'
import { TransferMoment } from './TransferMoment'
import { ProjectorInsights } from './ProjectorInsights'
import { buildDashboardAnalytics } from '../lib/analytics'
import { formatTime } from '../lib/format'
import { ThemeToggle } from './ThemeToggle'
import { ActivityTicker } from './ActivityTicker'

export function PublicLeaderboard({ state, status, storageKind, latestEvent, theme, onToggleTheme }: {
  state: ScoreboardState
  status: 'loading' | 'ready' | 'error'
  storageKind?: 'browser-sqlite' | 'tauri-sqlite'
  latestEvent?: ScoreEvent
  theme: ColorTheme
  onToggleTheme: () => void
}) {
  const ranked = [...state.teams].sort((a, b) => state.scores[b.id] - state.scores[a.id])
  const analytics = buildDashboardAnalytics(state.events, 8)
  const lastEvent = state.events[0]
  const enterFullscreen = () => document.documentElement.requestFullscreen?.()
  return (
    <main className="projector-view">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <header className="projector-header">
        <div className="event-title">
          <div className="event-mark"><TentTree size={34} /></div>
          <div><p>Scoring Day {state.session.activeDay} · Current event totals</p><h1>{state.session.name}</h1></div>
        </div>
        <div className="event-summary" aria-label="Event summary">
          <span><small>Current round</small><strong>Day {state.session.activeDay} / 8</strong></span>
          <span><small>Points awarded</small><strong>{analytics.newPoints}</strong></span>
          <span><small>Last update</small><strong>{lastEvent ? formatTime(lastEvent.createdAt) : 'Awaiting scores'}</strong></span>
        </div>
        <div className="header-actions">
          <StatusPill status={status} storageKind={storageKind} compact />
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <a className="icon-button" href="#/dashboard" title="Open full data dashboard" aria-label="Open full data dashboard"><ChartNoAxesCombined /></a>
          <button className="icon-button" onClick={enterFullscreen} title="Enter fullscreen" aria-label="Enter fullscreen"><Maximize2 /></button>
          <a className="icon-button" href="#/organizer" title="Organizer controls" aria-label="Organizer controls"><Settings2 /></a>
        </div>
      </header>
      <p className="sr-only" aria-live="polite">Current ranking: {ranked.map((team, index) => `${index + 1}, ${team.name}, ${state.scores[team.id]} points`).join('. ')}</p>
      <section className="leaderboard-grid">
        {ranked.map((team, index) => (
          <TeamCard key={team.id} team={team} score={state.scores[team.id]} rank={index + 1} latestEvent={latestEvent} />
        ))}
      </section>
      <ProjectorInsights state={state} />
      <TransferMoment event={latestEvent} />
      <ActivityTicker events={state.events} />
    </main>
  )
}

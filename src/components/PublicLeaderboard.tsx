import { ChartNoAxesCombined, Maximize2, Settings2, TentTree } from 'lucide-react'
import type { ScoreboardState, ScoreEvent } from '../types'
import { ActivityFeed } from './ActivityFeed'
import { StatusPill } from './StatusPill'
import { TeamCard } from './TeamCard'
import { TransferMoment } from './TransferMoment'
import { ProjectorInsights } from './ProjectorInsights'
import { buildDashboardAnalytics } from '../lib/analytics'
import { formatTime } from '../lib/format'

export function PublicLeaderboard({ state, status, storageKind, latestEvent }: {
  state: ScoreboardState
  status: 'loading' | 'ready' | 'error'
  storageKind?: 'browser-sqlite' | 'tauri-sqlite'
  latestEvent?: ScoreEvent
}) {
  const ranked = [...state.teams].sort((a, b) => state.scores[b.id] - state.scores[a.id])
  const analytics = buildDashboardAnalytics(state.events, state.session.activeDay)
  const lastEvent = state.events.find((event) => event.day <= state.session.activeDay)
  const enterFullscreen = () => document.documentElement.requestFullscreen?.()
  return (
    <main className="projector-view">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <header className="projector-header">
        <div className="event-title">
          <div className="event-mark"><TentTree size={34} /></div>
          <div><p>Day {state.session.activeDay} of 8 · Cumulative scores</p><h1>{state.session.name}</h1></div>
        </div>
        <div className="event-summary" aria-label="Event summary">
          <span><small>Current round</small><strong>Day {state.session.activeDay} / 8</strong></span>
          <span><small>Points awarded</small><strong>{analytics.newPoints}</strong></span>
          <span><small>Last update</small><strong>{lastEvent ? formatTime(lastEvent.createdAt) : 'Awaiting scores'}</strong></span>
        </div>
        <div className="header-actions">
          <StatusPill status={status} storageKind={storageKind} compact />
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
      <section className="projector-activity">
        <div className="section-heading"><span className="live-dot" /><h3>Recent activity</h3></div>
        <ActivityFeed events={state.events.filter((event) => event.day === state.session.activeDay)} limit={5} />
      </section>
      <TransferMoment event={latestEvent} />
      <footer className="projector-footer"><span>SUKKOT CAMP</span><span>Celebrate generously · Lead joyfully</span><span>DAY {state.session.activeDay} / 8</span></footer>
    </main>
  )
}

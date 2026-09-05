import { motion } from 'framer-motion'
import { ArrowDownRight, ArrowLeft, ArrowRightLeft, ArrowUpRight, ClipboardList, Database, Settings2 } from 'lucide-react'
import { buildDashboardAnalytics, type ReasonMetric } from '../lib/analytics'
import { eventLabel, formatTime } from '../lib/format'
import type { ScoreboardState } from '../types'
import { TEAM_IDS, teamById } from '../types'
import { StatusPill } from './StatusPill'

function ReasonBars({ title, metrics, kind }: { title: string; metrics: ReasonMetric[]; kind: 'gain' | 'loss' }) {
  const max = Math.max(1, ...metrics.map((metric) => metric.points))
  return (
    <div className={`reason-breakdown ${kind}`}>
      <h3>{kind === 'gain' ? <ArrowUpRight /> : <ArrowDownRight />}{title}</h3>
      <div className="reason-bars">
        {metrics.slice(0, 6).map((metric) => (
          <div className="reason-bar-row" key={metric.label}>
            <div><span title={metric.label}>{metric.label}</span><small>{metric.events} {metric.events === 1 ? 'event' : 'events'}</small><strong>{metric.points}</strong></div>
            <i><motion.b initial={{ width: 0 }} animate={{ width: `${Math.max(5, metric.points / max * 100)}%` }} transition={{ duration: .55 }} /></i>
          </div>
        ))}
        {!metrics.length ? <p>No {kind === 'gain' ? 'incoming' : 'outgoing'} points yet.</p> : null}
      </div>
    </div>
  )
}

export function DataDashboard({ state, status, storageKind }: {
  state: ScoreboardState
  status: 'loading' | 'ready' | 'error'
  storageKind?: 'browser-sqlite' | 'tauri-sqlite'
}) {
  const analytics = buildDashboardAnalytics(state.events, state.session.activeDay)
  const visibleDays = state.daySummaries.filter((summary) => summary.day <= state.session.activeDay)
  const largestScore = Math.max(1, ...visibleDays.flatMap((summary) => Object.values(summary.closingScores).map(Math.abs)))
  return (
    <main className="data-dashboard-view">
      <header className="dashboard-header">
        <div className="dashboard-title"><a href="#/"><ArrowLeft />Leaderboard</a><p>Live data dashboard · Through Day {state.session.activeDay}</p><h1>{state.session.name}</h1></div>
        <div className="header-actions"><StatusPill status={status} storageKind={storageKind} compact /><a className="icon-button" href="#/organizer" title="Organizer controls"><Settings2 /></a></div>
      </header>

      <section className="dashboard-overview">
        <article><ArrowUpRight /><span>New points awarded</span><strong>{analytics.newPoints}</strong><small>Added to the trip total</small></article>
        <article><ArrowDownRight /><span>Direct deductions</span><strong>{analytics.removedPoints}</strong><small>Removed from the trip total</small></article>
        <article><ArrowRightLeft /><span>Points transferred</span><strong>{analytics.movedPoints}</strong><small>Including tithe & atonement</small></article>
        <article><ClipboardList /><span>Effective events</span><strong>{analytics.eventCount}</strong><small>Undone actions excluded</small></article>
      </section>

      <section className="dashboard-team-grid">
        {state.teams.map((team) => {
          const metrics = analytics.teams[team.id]
          return (
            <article className="dashboard-team-card" key={team.id} style={{ '--team': team.color, '--accent': team.accent } as React.CSSProperties}>
              <header><img src={team.bannerUrl} alt="" /><div><span>House of</span><h2>{team.shortName}</h2></div><strong>{state.scores[team.id]}</strong></header>
              <div className="team-flow-summary"><span className="gain">+{metrics.gained}<small>gross gained</small></span><span className="loss">−{metrics.lost}<small>gross taken</small></span><span>{metrics.net >= 0 ? '+' : ''}{metrics.net}<small>net movement</small></span></div>
              <ReasonBars title="Where points came from" metrics={metrics.gainedReasons} kind="gain" />
              <ReasonBars title="Why points were taken" metrics={metrics.lostReasons} kind="loss" />
            </article>
          )
        })}
      </section>

      <div className="dashboard-lower-grid">
        <section className="dashboard-panel daily-progress">
          <header><div><p>Score progression</p><h2>Day-by-day totals</h2></div><Database /></header>
          <div className="progress-legend">{TEAM_IDS.map((teamId) => <span key={teamId}><i style={{ background: teamById(teamId)?.accent }} />{teamById(teamId)?.shortName}</span>)}</div>
          <div className="day-progress-list">{visibleDays.map((summary) => <div className="day-progress-row" key={summary.day}><strong>Day {summary.day}</strong><div>{TEAM_IDS.map((teamId) => <span key={teamId} title={`${teamById(teamId)?.shortName}: ${summary.closingScores[teamId]}`}><motion.i style={{ background: teamById(teamId)?.accent }} initial={{ width: 0 }} animate={{ width: `${Math.max(2, Math.abs(summary.closingScores[teamId]) / largestScore * 100)}%` }} /><b>{summary.closingScores[teamId]}</b></span>)}</div></div>)}</div>
        </section>
        <section className="dashboard-panel notes-panel">
          <header><div><p>People & context</p><h2>Recent explanatory notes</h2></div><ClipboardList /></header>
          <div className="dashboard-note-list">{analytics.notes.map((event) => <article key={event.id}><span>Day {event.day}</span><div><strong>{eventLabel(event)}</strong><p>{event.note}</p><small>{formatTime(event.createdAt)}{event.operator ? ` · ${event.operator}` : ''}</small></div></article>)}{!analytics.notes.length ? <div className="empty-feed">Notes added during scoring will appear here.</div> : null}</div>
        </section>
      </div>
      <footer className="dashboard-footer"><span>Current analytics are derived from the immutable score ledger.</span><span>Designed to grow with new data points.</span></footer>
    </main>
  )
}

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDownLeft, ArrowRight, ArrowUpRight, RotateCcw, Sparkles } from 'lucide-react'
import type { DaySummary, ScoreEvent, TeamId, TripDay } from '../types'
import { TEAM_IDS, teamById } from '../types'
import { eventLabel, formatTime } from '../lib/format'

const iconFor = (type: ScoreEvent['type']) => {
  if (type === 'undo') return <RotateCcw size={17} />
  if (type === 'tithe' || type === 'atonement') return <Sparkles size={17} />
  if (type === 'transfer') return <ArrowRight size={17} />
  if (type === 'deduct') return <ArrowDownLeft size={17} />
  return <ArrowUpRight size={17} />
}

function EventRow({ event, undone, organizer, onUndo, showDay }: {
  event: ScoreEvent
  undone: boolean
  organizer: boolean
  onUndo?: (event: ScoreEvent) => void
  showDay: boolean
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={`activity-row type-${event.type}`}
    >
      <div className="activity-icon">{iconFor(event.type)}</div>
      <div className="min-w-0 flex-1">
        <div className="activity-label">{showDay ? <span className="event-day-badge">Day {event.day}</span> : null}{eventLabel(event)}</div>
        <div className="activity-meta">
          {formatTime(event.createdAt)}
          {event.reason && event.type !== 'tithe' && event.type !== 'atonement' ? <> · {event.reason}</> : null}
          {event.operator ? <> · {event.operator}</> : null}
          {event.note && event.type !== 'undo' ? <> · {event.note}</> : null}
        </div>
      </div>
      {organizer && onUndo && event.type !== 'undo' && event.type !== 'seed' && !undone ? (
        <button className="undo-button" onClick={() => onUndo(event)} title="Create a compensating event">
          <RotateCcw size={16} /><span>Undo</span>
        </button>
      ) : null}
      {undone ? <span className="undone-label">Undone</span> : null}
    </motion.div>
  )
}

function DayTotals({ summary }: { summary: DaySummary }) {
  return (
    <div className="day-total-scores" aria-label={`Total scores after Day ${summary.day}`}>
      <span className="day-total-label">Total after Day {summary.day}</span>
      {TEAM_IDS.map((teamId: TeamId) => (
        <span className={`day-team-total team-${teamId}`} key={teamId}>
          <i style={{ background: teamById(teamId)?.accent }} />
          {teamById(teamId)?.shortName} <strong>{summary.closingScores[teamId]}</strong>
        </span>
      ))}
    </div>
  )
}

export function ActivityFeed({ events, limit = 8, onUndo, organizer = false, groupedByDay = false, daySummaries, activeDay }: {
  events: ScoreEvent[]
  limit?: number
  onUndo?: (event: ScoreEvent) => void
  organizer?: boolean
  groupedByDay?: boolean
  daySummaries?: DaySummary[]
  activeDay?: TripDay
}) {
  const undoneIds = new Set(events.filter((event) => event.reversesEventId).map((event) => event.reversesEventId))

  if (groupedByDay && daySummaries && activeDay) {
    const visibleDays = daySummaries
      .filter((summary) => summary.day <= activeDay || summary.eventCount > 0)
      .slice()
      .reverse()
    return (
      <div className="activity-list grouped-history">
        {visibleDays.map((summary) => {
          const dayEvents = events.filter((event) => event.day === summary.day).slice(0, limit)
          return (
            <section className={`day-history-group ${summary.day === activeDay ? 'active' : ''}`} key={summary.day}>
              <header className="day-history-header">
                <div><span>Day {summary.day}</span><small>{summary.eventCount} {summary.eventCount === 1 ? 'event' : 'events'}</small></div>
                {summary.day === activeDay ? <strong>Active</strong> : null}
              </header>
              <DayTotals summary={summary} />
              <AnimatePresence initial={false}>
                {dayEvents.map((event) => (
                  <EventRow key={event.id} event={event} undone={undoneIds.has(event.id)} organizer={organizer} onUndo={onUndo} showDay={false} />
                ))}
              </AnimatePresence>
              {!dayEvents.length ? <div className="empty-day">No scoring events recorded.</div> : null}
            </section>
          )
        })}
      </div>
    )
  }

  const visible = events.slice(0, limit)
  return (
    <div className="activity-list">
      <AnimatePresence initial={false}>
        {visible.map((event) => (
          <EventRow key={event.id} event={event} undone={undoneIds.has(event.id)} organizer={organizer} onUndo={onUndo} showDay />
        ))}
      </AnimatePresence>
      {!visible.length ? <div className="empty-feed">Scoring activity will appear here.</div> : null}
    </div>
  )
}

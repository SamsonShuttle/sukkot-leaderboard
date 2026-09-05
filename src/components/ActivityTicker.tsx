import { AnimatePresence, motion } from 'framer-motion'
import { Radio } from 'lucide-react'
import { eventLabel, formatTime } from '../lib/format'
import type { ScoreEvent } from '../types'
import { teamById } from '../types'

export function ActivityTicker({ events, limit = 4 }: { events: ScoreEvent[]; limit?: number }) {
  const visible = events.slice(0, limit)

  return (
    <aside className="activity-ticker" aria-label="Recent scoring activity">
      <div className="ticker-title"><Radio /><span>Recent activity</span></div>
      <div className="ticker-events">
        <AnimatePresence initial={false} mode="popLayout">
          {visible.map((event) => {
            const team = teamById(event.destinationTeam ?? event.sourceTeam)
            return (
              <motion.article
                layout
                key={event.id}
                style={{ '--ticker-team': team?.color ?? '#D6A92A' } as React.CSSProperties}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <i />
                <strong>{eventLabel(event)}</strong>
                <span>Day {event.day} · {formatTime(event.createdAt)}{event.reason ? ` · ${event.reason}` : ''}</span>
              </motion.article>
            )
          })}
        </AnimatePresence>
        {!visible.length ? <p>Scoring activity will appear here.</p> : null}
      </div>
    </aside>
  )
}

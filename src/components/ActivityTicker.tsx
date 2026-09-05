import { motion } from 'framer-motion'
import { Radio } from 'lucide-react'
import { eventLabel, formatTime } from '../lib/format'
import type { ScoreEvent } from '../types'
import { teamById } from '../types'

export function ActivityTicker({ events, limit = 12 }: { events: ScoreEvent[]; limit?: number }) {
  const visible = events.slice(0, limit)
  const base = visible.length ? Array.from({ length: Math.max(8, visible.length) }, (_, index) => visible[index % visible.length]) : []
  const scrolling = [...base, ...base]

  return (
    <aside className="activity-ticker" aria-label="Recent scoring activity">
      <div className="ticker-title"><Radio /><span>Recent activity</span></div>
      <div className="ticker-events">
        {visible.length ? <div className="ticker-track" style={{ '--ticker-duration': `${Math.max(96, base.length * 12)}s` } as React.CSSProperties}>
          {scrolling.map((event, index) => {
            const team = teamById(event.destinationTeam ?? event.sourceTeam)
            return (
              <motion.article
                aria-hidden={index >= visible.length}
                layout
                key={`${event.id}-${index}`}
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
        </div> : null}
        {!visible.length ? <p>Scoring activity will appear here.</p> : null}
      </div>
    </aside>
  )
}

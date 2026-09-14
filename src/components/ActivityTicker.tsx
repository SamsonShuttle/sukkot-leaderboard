import { motion } from 'framer-motion'
import { Radio } from 'lucide-react'
import { eventLabel, formatTime } from '../lib/format'
import type { ScoreEvent } from '../types'
import { teamById } from '../types'
import { atonementOfferingById, atonementOfferingForReason } from '../config'
import { buildEventChains } from '../lib/eventChains'

export function ActivityTicker({ events, limit = 12 }: { events: ScoreEvent[]; limit?: number }) {
  const visible = buildEventChains(events).slice(0, limit)
  const base = visible.length ? Array.from({ length: Math.max(8, visible.length) }, (_, index) => visible[index % visible.length]) : []
  const scrolling = [...base, ...base]

  return (
    <aside className="activity-ticker" aria-label="Recent scoring activity">
      <div className="ticker-title"><Radio /><span>Recent activity</span></div>
      <div className="ticker-events">
        {visible.length ? <div className="ticker-track" style={{ '--ticker-duration': `${Math.max(96, base.length * 12)}s` } as React.CSSProperties}>
          {scrolling.map((chain, index) => {
            const event = chain.root
            const latestReversal = chain.reversals.at(-1)
            const team = teamById(event.destinationTeam ?? event.sourceTeam ?? event.inventoryTeam)
            const offering = event.atonementOffering ? atonementOfferingById(event.atonementOffering) : event.type === 'atonement' ? atonementOfferingForReason(event.reason) : undefined
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
                {offering ? <img className={`ticker-offering-art ${event.inventoryDelta === -1 ? 'used' : ''}`} src={offering.imageUrl} alt="" /> : null}
                <div className={`ticker-copy${chain.active ? '' : ' is-undone'}`}><strong>{eventLabel(event)}</strong><span>Day {event.day} · {formatTime(event.createdAt)}{event.reason ? ` · ${event.reason}` : ''}{latestReversal ? ` · ${chain.active ? 'Restored' : 'Undone'} ${formatTime(latestReversal.createdAt)}` : ''}</span></div>
              </motion.article>
            )
          })}
        </div> : null}
        {!visible.length ? <p>Scoring activity will appear here.</p> : null}
      </div>
    </aside>
  )
}

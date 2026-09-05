import { AnimatePresence, motion } from 'framer-motion'
import { Droplets, HeartHandshake, Repeat2 } from 'lucide-react'
import type { ScoreEvent } from '../types'
import { teamById } from '../types'

export function TransferMoment({ event }: { event?: ScoreEvent }) {
  const visible = event && ['transfer', 'tithe', 'atonement'].includes(event.type)
  if (!visible || !event) return null
  const title = event.type === 'tithe' ? 'Tithe' : event.type === 'atonement' ? 'Atonement' : 'Transfer'
  const Icon = event.type === 'tithe' ? Droplets : event.type === 'atonement' ? HeartHandshake : Repeat2
  return (
    <AnimatePresence>
      <motion.div
        key={event.id}
        className={`transfer-moment transfer-${event.type}`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: [0, 1, 1, 0], scale: [0.9, 1, 1, 0.98] }}
        transition={{ duration: 3.2, times: [0, 0.12, 0.78, 1] }}
      >
        <div className="transfer-source">{teamById(event.sourceTeam)?.shortName}</div>
        <div className="transfer-path">
          <motion.span animate={{ x: [-45, 45], opacity: [0, 1, 0] }} transition={{ duration: 1.25, repeat: 1 }}>
            <Icon size={30} />
          </motion.span>
        </div>
        <div className="transfer-copy"><strong>{title}</strong><span>{event.points} points</span></div>
        <div className="transfer-path">
          <motion.span animate={{ x: [-45, 45], opacity: [0, 1, 0] }} transition={{ duration: 1.25, repeat: 1, delay: 0.18 }}>
            <Icon size={30} />
          </motion.span>
        </div>
        <div className="transfer-source">{teamById(event.destinationTeam)?.shortName}</div>
      </motion.div>
    </AnimatePresence>
  )
}

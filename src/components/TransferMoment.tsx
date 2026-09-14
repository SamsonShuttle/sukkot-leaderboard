import { AnimatePresence, motion } from 'framer-motion'
import { Droplets, Gift, HeartHandshake, Repeat2 } from 'lucide-react'
import type { ScoreEvent } from '../types'
import { teamById } from '../types'
import { atonementOfferingById, atonementOfferingForReason } from '../config'

export function TransferMoment({ event }: { event?: ScoreEvent }) {
  const visible = event && ['transfer', 'tithe', 'atonement', 'atonement_acquire'].includes(event.type)
  if (!visible || !event) return null
  const acquired = event.type === 'atonement_acquire'
  const paidWithOffering = event.type === 'atonement' && event.inventoryDelta === -1 && event.inventoryTeam
  const title = acquired ? 'Atonement found' : event.type === 'tithe' ? 'Tithe' : paidWithOffering ? `${event.reason} offered` : event.type === 'atonement' ? 'Atonement' : 'Transfer'
  const Icon = acquired ? Gift : event.type === 'tithe' ? Droplets : event.type === 'atonement' ? HeartHandshake : Repeat2
  const offering = event.atonementOffering ? atonementOfferingById(event.atonementOffering) : event.type === 'atonement' ? atonementOfferingForReason(event.reason) : undefined
  const source = teamById(event.sourceTeam ?? event.inventoryTeam)?.shortName
  const destination = acquired ? 'Inventory' : teamById(event.destinationTeam)?.shortName
  const detail = acquired
    ? `${event.reason} added to ${source}`
    : paidWithOffering
      ? `${source} keeps its points · Levi +${event.points}`
      : `${event.points} points`
  return (
    <AnimatePresence>
      <motion.div
        key={event.id}
        className={`transfer-moment transfer-${event.type} ${paidWithOffering ? 'paid-with-offering' : ''}`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: [0, 1, 1, 0], scale: [0.9, 1, 1, 0.98] }}
        transition={{ duration: 3.2, times: [0, 0.12, 0.78, 1] }}
      >
        <div className="transfer-source">{source}</div>
        <div className="transfer-path">
          <motion.span animate={{ x: [-45, 45], opacity: [0, 1, 0] }} transition={{ duration: 1.25, repeat: 1 }}>
            <Icon size={30} />
          </motion.span>
        </div>
        <div className="transfer-copy">{offering ? <motion.img className={`transfer-offering-art ${paidWithOffering ? 'used' : ''}`} src={offering.imageUrl} alt="" initial={{ filter: 'grayscale(0)', scale: 1.15 }} animate={{ filter: paidWithOffering ? 'grayscale(1)' : 'grayscale(0)', scale: 1 }} transition={{ delay: .45, duration: .65 }} /> : null}<strong>{title}</strong><span>{detail}</span></div>
        <div className="transfer-path">
          <motion.span animate={{ x: [-45, 45], opacity: [0, 1, 0] }} transition={{ duration: 1.25, repeat: 1, delay: 0.18 }}>
            <Icon size={30} />
          </motion.span>
        </div>
        <div className="transfer-source">{destination}</div>
      </motion.div>
    </AnimatePresence>
  )
}

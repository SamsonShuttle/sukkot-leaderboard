import { AnimatePresence, motion } from 'framer-motion'
import { CircleMinus, CirclePlus, Droplets, Gift, HeartHandshake, Repeat2, Sprout } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { ScoreEvent } from '../types'
import { teamById } from '../types'
import { atonementOfferingById, atonementOfferingForReason, FRUITS_OF_THE_SPIRIT } from '../config'
import { SCORING_CONFIG } from '../config'

export const eventMomentDuration = (event: ScoreEvent) =>
  event.type === 'atonement' || event.type === 'tithe' || event.reason?.startsWith('Fruit of the Spirit ·') || event.points >= SCORING_CONFIG.largeActionConfirmationAt ? 8_500 : 6_400

export function TransferMoment({ event }: { event?: ScoreEvent }) {
  const largeScore = Boolean(event && event.points >= SCORING_CONFIG.largeActionConfirmationAt)
  const fruit = event?.type === 'add' && event.reason?.startsWith('Fruit of the Spirit ·')
  const visible = event && (['transfer', 'tithe', 'atonement', 'atonement_acquire'].includes(event.type) || largeScore || fruit)
  if (!visible || !event) return null
  const acquired = event.type === 'atonement_acquire'
  const paidWithOffering = event.type === 'atonement' && event.inventoryDelta === -1 && event.inventoryTeam
  const dramatic = event.type === 'atonement' || event.type === 'tithe' || largeScore || fruit
  const fruitLabel = fruit ? event.reason?.replace('Fruit of the Spirit · ', '') : null
  const fruitChoice = fruit ? FRUITS_OF_THE_SPIRIT.find((item) => item.label === fruitLabel) : undefined
  const title = acquired ? 'Atonement found' : fruit ? 'Fruit of the Spirit' : event.type === 'tithe' ? 'Tithe' : paidWithOffering ? `${event.reason} offered` : event.type === 'atonement' ? 'Atonement' : event.type === 'add' ? 'Points awarded' : event.type === 'deduct' ? 'Points deducted' : 'Transfer'
  const Icon = acquired ? Gift : fruit ? Sprout : event.type === 'tithe' ? Droplets : event.type === 'atonement' ? HeartHandshake : event.type === 'add' ? CirclePlus : event.type === 'deduct' ? CircleMinus : Repeat2
  const offering = event.atonementOffering ? atonementOfferingById(event.atonementOffering) : event.type === 'atonement' ? atonementOfferingForReason(event.reason) : undefined
  const source = teamById(event.sourceTeam ?? event.inventoryTeam)?.shortName
  const destination = acquired ? 'Inventory' : teamById(event.destinationTeam)?.shortName ?? 'Score desk'
  const detail = acquired
    ? `${event.reason} added to ${source}`
    : paidWithOffering
      ? `${source} keeps its points · Levi +${event.points}`
      : fruit ? `${fruitLabel} · ${destination} +${event.points} points` : `${event.points} points`
  return (
    <AnimatePresence>
      <div className="transfer-moment-frame">
        <motion.div
          key={event.id}
          className={`transfer-moment transfer-${event.type} ${fruit ? 'transfer-fruit' : ''} ${paidWithOffering ? 'paid-with-offering' : ''} ${dramatic ? 'dramatic' : ''}`}
          initial={{ opacity: 0, scale: dramatic ? 0.72 : 0.9 }}
          animate={{ opacity: [0, 1, 1, 0], scale: dramatic ? [0.72, 1.08, 1, 0.96] : [0.9, 1, 1, 0.98] }}
          transition={{ duration: eventMomentDuration(event) / 1000, times: [0, 0.1, 0.82, 1], ease: 'easeOut' }}
        >
          {dramatic ? <span className="transfer-flare" aria-hidden="true" /> : null}
          <div className="transfer-source">{source ?? 'Score desk'}</div>
          <div className="transfer-path">
            <motion.span animate={{ x: [-55, 55], opacity: [0, 1, 0], scale: dramatic ? [0.7, 1.35, .8] : [1, 1, 1] }} transition={{ duration: dramatic ? 1.7 : 2.5, repeat: dramatic ? 2 : 1 }}>
              <Icon size={dramatic ? 38 : 30} />
            </motion.span>
          </div>
          <div className="transfer-copy">{fruitChoice ? <motion.span className="transfer-fruit-art" style={{ '--fruit-position': fruitChoice.spritePosition } as CSSProperties} aria-hidden="true" initial={{ opacity: 0, scale: .5, rotate: -12 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ delay: .35, duration: .7, type: 'spring', bounce: .45 }} /> : offering ? <motion.img className={`transfer-offering-art ${paidWithOffering ? 'used' : ''}`} src={offering.imageUrl} alt="" initial={{ filter: 'grayscale(0)', scale: dramatic ? 1.35 : 1.15 }} animate={{ filter: paidWithOffering ? 'grayscale(1)' : 'grayscale(0)', scale: 1 }} transition={{ delay: .65, duration: 1.3 }} /> : null}<strong>{title}</strong><span>{detail}</span></div>
          <div className="transfer-path">
            <motion.span animate={{ x: [-55, 55], opacity: [0, 1, 0], scale: dramatic ? [0.7, 1.35, .8] : [1, 1, 1] }} transition={{ duration: dramatic ? 1.7 : 2.5, repeat: dramatic ? 2 : 1, delay: .25 }}>
              <Icon size={dramatic ? 38 : 30} />
            </motion.span>
          </div>
          <div className="transfer-source">{destination}</div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

import { AnimatePresence, motion } from 'framer-motion'
import { Crown, Sparkles, TrendingDown, TrendingUp } from 'lucide-react'
import { AnimatedNumber } from './AnimatedNumber'
import type { AtonementInventory, AtonementReceipts, ScoreEvent, Team, TeamId } from '../types'
import { scoreDeltaFor } from '../lib/format'
import { ATONEMENT_OFFERINGS, ATONEMENT_OPTIONS } from '../config'

function TeamAtonements({ inventory, latestEvent }: {
  inventory: AtonementInventory[TeamId]
  latestEvent?: ScoreEvent
}) {
  return <section className="team-atonements" aria-label="Atonements owned">
    <header><span>Atonements</span><small>ready / found</small></header>
    <div className="atonement-wallet-grid">
      {ATONEMENT_OFFERINGS.map((offering) => {
        const tokens = inventory[offering.id]
        const ready = tokens.filter((token) => !token.consumedByEventId).length
        const allUsed = tokens.length > 0 && ready === 0
        const justChanged = tokens.some((token) => token.acquisitionEventId === latestEvent?.id || token.consumedByEventId === latestEvent?.id)
        const justPartlyConsumed = ready > 0 && tokens.some((token) => token.consumedByEventId === latestEvent?.id)
        return <article key={offering.id} className={tokens.length > 0 && ready === 0 ? 'all-used' : ''}>
          <div className="wallet-token-stack">
            <motion.img
              className={allUsed ? 'used' : tokens.length ? '' : 'empty'}
              src={offering.imageUrl}
              alt={tokens.length ? `${offering.label}, ${ready} ready of ${tokens.length} found` : ''}
              initial={justChanged ? { opacity: 0, scale: 1.5, rotate: -8 } : false}
              animate={justPartlyConsumed
                ? { opacity: [1, .42, 1], scale: [1, 1.08, 1], rotate: 0, filter: ['grayscale(0)', 'grayscale(1)', 'grayscale(0)'] }
                : { opacity: allUsed ? .42 : tokens.length ? 1 : .2, scale: 1, rotate: 0, filter: allUsed ? 'grayscale(1)' : tokens.length ? 'grayscale(0)' : 'grayscale(.9)' }}
              transition={{ duration: .55, type: 'spring' }}
            />
          </div>
          <div><strong>{offering.label}</strong><small><b>{ready}</b> / {tokens.length}</small></div>
        </article>
      })}
    </div>
  </section>
}

function LeviAtonementReceipts({ receipts, latestEvent }: {
  receipts: AtonementReceipts
  latestEvent?: ScoreEvent
}) {
  const total = Object.values(receipts).reduce((sum, count) => sum + count, 0)
  return <section className="team-atonements levi-atonement-receipts" aria-label="Atonements received by Levi">
    <header><span>Atonements received</span><small>{total} total · Judah &amp; Israel</small></header>
    <div className="atonement-wallet-grid">
      {ATONEMENT_OPTIONS.map((offering) => {
        const justReceived = latestEvent?.type === 'atonement'
          && latestEvent.destinationTeam === 'levi'
          && (latestEvent.atonementOffering === offering.id || latestEvent.reason === offering.label)
        return <motion.article
          key={offering.id}
          className="receipt-total"
          animate={justReceived ? { scale: [1, 1.09, 1], boxShadow: ['0 0 0 0 rgba(214,169,42,0)', '0 0 0 4px rgba(214,169,42,.32)', '0 0 0 0 rgba(214,169,42,0)'] } : {}}
          transition={{ duration: .85 }}
        >
          <img src={offering.imageUrl} alt="" />
          <div><strong>{offering.label}</strong><small><b>{receipts[offering.id]}</b> received</small></div>
        </motion.article>
      })}
    </div>
  </section>
}

export function TeamCard({ team, score, rank, inventory, receipts, latestEvent }: {
  team: Team
  score: number
  rank: number
  inventory: AtonementInventory[TeamId]
  receipts: AtonementReceipts
  latestEvent?: ScoreEvent
}) {
  const delta = latestEvent ? scoreDeltaFor(latestEvent, team.id as TeamId) : 0
  return (
    <motion.article
      layout
      className={`team-card rank-${rank}`}
      data-team={team.id}
      style={{ '--team': team.color, '--accent': team.accent, '--tint': team.tint, '--team-ink': team.foreground } as React.CSSProperties}
      animate={delta > 0 ? { scale: [1, 1.025, 1] } : delta < 0 ? { x: [0, -4, 4, 0] } : {}}
      transition={{ duration: 0.48 }}
    >
      <div className="rank-badge">{rank === 1 ? <Crown size={22} /> : <strong>#{rank}</strong>}</div>
      <div className="banner-shell">
        <div className="flag-wave">
          <img src={team.bannerUrl} alt={`${team.name} emblem`} />
        </div>
        <div className="flag-sheen" />
      </div>
      <div className="team-card-body">
        <p className="house-label">House of</p>
        <h2>{team.shortName}</h2>
        <span className="house-motif">{team.motif}</span>
        <AnimatedNumber className="score-number" value={score} />
        <p className="points-label">points</p>
        {team.id === 'levi'
          ? <LeviAtonementReceipts receipts={receipts} latestEvent={latestEvent} />
          : <TeamAtonements inventory={inventory} latestEvent={latestEvent} />}
      </div>
      <AnimatePresence>
        {latestEvent && delta !== 0 && (
          <motion.div
            key={`${latestEvent.id}-${team.id}`}
            className={`delta-burst ${delta > 0 ? 'positive' : 'negative'}`}
            initial={{ opacity: 0, y: 14, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.32 }}
          >
            {delta > 0 ? <Sparkles size={20} /> : <TrendingDown size={20} />}
            {delta > 0 ? '+' : ''}{delta}
          </motion.div>
        )}
      </AnimatePresence>
      {rank === 1 && <TrendingUp className="leader-watermark" />}
    </motion.article>
  )
}

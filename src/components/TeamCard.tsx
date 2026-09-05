import { AnimatePresence, motion } from 'framer-motion'
import { Crown, Sparkles, TrendingDown, TrendingUp } from 'lucide-react'
import { AnimatedNumber } from './AnimatedNumber'
import type { ScoreEvent, Team, TeamId } from '../types'
import { scoreDeltaFor } from '../lib/format'

export function TeamCard({ team, score, rank, latestEvent }: {
  team: Team
  score: number
  rank: number
  latestEvent?: ScoreEvent
}) {
  const delta = latestEvent ? scoreDeltaFor(latestEvent, team.id as TeamId) : 0
  return (
    <motion.article
      layout
      className={`team-card rank-${rank}`}
      style={{ '--team': team.color, '--accent': team.accent } as React.CSSProperties}
      animate={delta > 0 ? { scale: [1, 1.025, 1] } : delta < 0 ? { x: [0, -4, 4, 0] } : {}}
      transition={{ duration: 0.48 }}
    >
      <div className="rank-badge">{rank === 1 ? <Crown size={24} /> : `#${rank}`}</div>
      <div className="banner-shell">
        <div className="flag-wave"><img src={team.bannerUrl} alt={`${team.name} banner`} /></div>
        <div className="flag-sheen" />
      </div>
      <div className="team-card-body">
        <p className="house-label">House of</p>
        <h2>{team.shortName}</h2>
        <AnimatedNumber className="score-number" value={score} />
        <p className="points-label">points</p>
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

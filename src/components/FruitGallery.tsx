import { motion } from 'framer-motion'
import { FRUITS_OF_THE_SPIRIT } from '../config'
import { effectiveRootEvents } from '../lib/eventChains'
import type { ScoreEvent } from '../types'
import { teamById } from '../types'

const fruitReasonPrefix = 'Fruit of the Spirit · '

/** Public recognition board derived solely from effective immutable score events. */
export function FruitGallery({ events, latestEvent }: { events: ScoreEvent[]; latestEvent?: ScoreEvent }) {
  const awardsByFruit = new Map(FRUITS_OF_THE_SPIRIT.map((fruit) => [fruit.id, [] as ScoreEvent[]]))

  for (const event of effectiveRootEvents(events)) {
    if (event.type !== 'add' || !event.destinationTeam || !event.reason?.startsWith(fruitReasonPrefix)) continue
    const label = event.reason.slice(fruitReasonPrefix.length)
    const fruit = FRUITS_OF_THE_SPIRIT.find((item) => item.label === label)
    if (fruit) awardsByFruit.get(fruit.id)?.push(event)
  }

  return <section className="fruit-gallery" aria-label="Fruits of the Spirit recognitions">
    <div className="fruit-gallery-grid">
      {FRUITS_OF_THE_SPIRIT.map((fruit) => {
        const awards = awardsByFruit.get(fruit.id) ?? []
        return <article key={fruit.id}>
          <span className="fruit-gallery-art" style={{ '--fruit-position': fruit.spritePosition } as React.CSSProperties} aria-hidden="true" />
          <strong>{fruit.label}</strong>
          <div className={`fruit-gallery-badges${awards.length ? '' : ' empty'}`} aria-label={awards.length ? `${awards.length} ${awards.length === 1 ? 'recognition' : 'recognitions'} for ${fruit.label}` : `No recognitions for ${fruit.label} yet`}>
            {awards.map((event) => {
              const team = teamById(event.destinationTeam)
              if (!team) return null
              const justEarned = latestEvent?.id === event.id
              return <motion.img
                key={event.id}
                className="fruit-team-badge"
                data-team={team.id}
                src={team.bannerUrl}
                alt={`${team.shortName} earned ${fruit.label}`}
                initial={justEarned ? { opacity: 0, scale: .35, rotate: -15 } : false}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 18 }}
              />
            })}
            {!awards.length ? <span aria-hidden="true">—</span> : null}
          </div>
        </article>
      })}
    </div>
  </section>
}

import type { ScoreEvent } from '../types'

export interface EventChain {
  root: ScoreEvent
  reversals: ScoreEvent[]
  active: boolean
}

/**
 * Groups an original ledger event with its append-only compensation chain.
 * A chain alternates the original action on and off: odd compensation depth
 * means the action is currently undone, while an even depth restores it.
 */
export function buildEventChains(events: ScoreEvent[]): EventChain[] {
  const childByParent = new Map<string, ScoreEvent>()
  for (const event of events) {
    if (event.reversesEventId) childByParent.set(event.reversesEventId, event)
  }

  return events
    .filter((event) => !event.reversesEventId)
    .map((root) => {
      const reversals: ScoreEvent[] = []
      const seen = new Set<string>([root.id])
      let current = root
      while (childByParent.has(current.id)) {
        const reversal = childByParent.get(current.id)!
        if (seen.has(reversal.id)) break
        seen.add(reversal.id)
        reversals.push(reversal)
        current = reversal
      }
      return { root, reversals, active: reversals.length % 2 === 0 }
    })
}

export function effectiveRootEvents(events: ScoreEvent[]) {
  return buildEventChains(events)
    .filter((chain) => chain.active)
    .map((chain) => chain.root)
}

export function rootEventFor(events: ScoreEvent[], event: ScoreEvent) {
  let current = event
  const byId = new Map(events.map((item) => [item.id, item]))
  const seen = new Set<string>()
  while (current.reversesEventId && !seen.has(current.id)) {
    seen.add(current.id)
    const parent = byId.get(current.reversesEventId)
    if (!parent) break
    current = parent
  }
  return current
}

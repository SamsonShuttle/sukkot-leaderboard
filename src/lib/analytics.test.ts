import { describe, expect, it } from 'vitest'
import { buildDashboardAnalytics } from './analytics'
import type { ScoreEvent } from '../types'

const makeEvent = (partial: Partial<ScoreEvent>): ScoreEvent => ({
  id: crypto.randomUUID(), sessionId: 'session', createdAt: new Date().toISOString(), type: 'add',
  points: 10, sourceTeam: null, destinationTeam: 'judah', operator: null, note: null,
  reversesEventId: null, day: 1, reason: null, ...partial,
})

describe('buildDashboardAnalytics', () => {
  it('breaks gains and losses down by reason and movement type', () => {
    const analytics = buildDashboardAnalytics([
      makeEvent({ points: 50, destinationTeam: 'judah', reason: 'Team challenge' }),
      makeEvent({ type: 'deduct', points: 5, sourceTeam: 'judah', destinationTeam: null, reason: 'Missed duty' }),
      makeEvent({ type: 'atonement', points: 4, sourceTeam: 'judah', destinationTeam: 'levi', reason: 'Ox' }),
    ], 1)
    expect(analytics.teams.judah).toMatchObject({ gained: 50, lost: 9, net: 41 })
    expect(analytics.teams.judah.lostReasons).toEqual([
      { label: 'Missed duty', points: 5, events: 1 },
      { label: 'Ox', points: 4, events: 1 },
    ])
    expect(analytics.teams.levi.gainedReasons[0]).toEqual({ label: 'Ox', points: 4, events: 1 })
  })

  it('excludes an undone event and its compensating event', () => {
    const original = makeEvent({ id: 'award', points: 30, reason: 'Quiz win' })
    const undo = makeEvent({ type: 'undo', points: 30, sourceTeam: 'judah', destinationTeam: null, reversesEventId: 'award' })
    const analytics = buildDashboardAnalytics([original, undo], 1)
    expect(analytics.teams.judah.net).toBe(0)
    expect(analytics.eventCount).toBe(0)
  })

  it('limits the dashboard to the selected day and earlier', () => {
    const analytics = buildDashboardAnalytics([
      makeEvent({ points: 10, day: 1 }),
      makeEvent({ points: 25, day: 2 }),
    ], 1)
    expect(analytics.newPoints).toBe(10)
  })
})

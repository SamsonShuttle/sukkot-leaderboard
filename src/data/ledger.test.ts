import { describe, expect, it } from 'vitest'
import { calculateDaySummaries, calculateScores } from './ledger'
import type { ScoreEvent } from '../types'

const event = (partial: Partial<ScoreEvent>): ScoreEvent => ({
  id: crypto.randomUUID(), sessionId: 'session', createdAt: new Date().toISOString(), type: 'add',
  points: 10, sourceTeam: null, destinationTeam: 'judah', operator: null, note: null,
  reversesEventId: null, day: 1, reason: null, ...partial,
})

describe('calculateScores', () => {
  it('applies awards, deductions, and transfers as ledger deltas', () => {
    const scores = calculateScores([
      event({ points: 100, destinationTeam: 'judah' }),
      event({ type: 'deduct', points: 15, sourceTeam: 'judah', destinationTeam: null }),
      event({ type: 'transfer', points: 20, sourceTeam: 'judah', destinationTeam: 'israel' }),
    ])
    expect(scores).toEqual({ judah: 65, israel: 20, levi: 0 })
  })

  it('moves tithe and atonement points into Levi without changing the total', () => {
    const scores = calculateScores([
      event({ points: 80, destinationTeam: 'judah' }),
      event({ points: 60, destinationTeam: 'israel' }),
      event({ type: 'tithe', points: 8, sourceTeam: 'judah', destinationTeam: 'levi' }),
      event({ type: 'atonement', points: 12, sourceTeam: 'israel', destinationTeam: 'levi' }),
    ])
    expect(scores).toEqual({ judah: 72, israel: 48, levi: 20 })
    expect(Object.values(scores).reduce((sum, score) => sum + score, 0)).toBe(140)
  })

  it('uses a compensating event to reverse history', () => {
    const original = event({ id: 'award', points: 25, destinationTeam: 'levi' })
    const undo = event({ type: 'undo', points: 25, sourceTeam: 'levi', destinationTeam: null, reversesEventId: original.id })
    expect(calculateScores([original, undo])).toEqual({ judah: 0, israel: 0, levi: 0 })
  })

  it('assigns events to days and calculates cumulative end-of-day totals', () => {
    const summaries = calculateDaySummaries([
      event({ points: 30, destinationTeam: 'judah', day: 1 }),
      event({ points: 10, sourceTeam: 'judah', destinationTeam: 'levi', type: 'tithe', day: 2 }),
      event({ points: 12, destinationTeam: 'israel', day: 2 }),
    ])
    expect(summaries[0]).toMatchObject({ day: 1, eventCount: 1, closingScores: { judah: 30, israel: 0, levi: 0 } })
    expect(summaries[1]).toMatchObject({ day: 2, eventCount: 2, changes: { judah: -10, israel: 12, levi: 10 }, closingScores: { judah: 20, israel: 12, levi: 10 } })
  })

  it('calculates the daily tithe base without re-tithing seed balances or prior tithes', async () => {
    const { calculateDailyTitheStatus } = await import('./ledger')
    const status = calculateDailyTitheStatus([
      event({ type: 'seed', points: 100, destinationTeam: 'judah', day: 1 }),
      event({ type: 'add', points: 60, destinationTeam: 'judah', day: 1 }),
      event({ type: 'deduct', points: 10, sourceTeam: 'judah', destinationTeam: null, day: 1 }),
      event({ type: 'add', points: 40, destinationTeam: 'israel', day: 1 }),
      event({ type: 'tithe', points: 5, sourceTeam: 'judah', destinationTeam: 'levi', day: 1, reason: 'Daily tithe · 10%' }),
    ], 1)
    expect(status.bases).toEqual({ judah: 50, israel: 40 })
    expect(status.appliedRate).toBe(10)
  })
})

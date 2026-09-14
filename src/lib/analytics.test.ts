import { describe, expect, it } from 'vitest'
import { buildDashboardAnalytics, buildDayBreakdown, scoreChartSummaries } from './analytics'
import type { DaySummary, ScoreEvent, TeamId, TripDay } from '../types'

const makeEvent = (partial: Partial<ScoreEvent>): ScoreEvent => ({
  id: crypto.randomUUID(), sessionId: 'session', createdAt: new Date().toISOString(), type: 'add',
  points: 10, sourceTeam: null, destinationTeam: 'judah', operator: null, note: null,
  reversesEventId: null, day: 1, reason: null, atonementOffering: null, inventoryTeam: null, inventoryDelta: 0, ...partial,
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

  it('breaks the selected day into gained and deducted reasons for every house', () => {
    const breakdown = buildDayBreakdown([
      makeEvent({ id: 'prior-day', points: 100, destinationTeam: 'judah', day: 1, reason: 'Earlier day' }),
      makeEvent({ id: 'worship', points: 20, destinationTeam: 'judah', day: 2, reason: 'Morning worship' }),
      makeEvent({ id: 'teaching', points: 50, destinationTeam: 'judah', day: 2, reason: 'Watching the teaching' }),
      makeEvent({ id: 'event', points: 30, destinationTeam: 'judah', day: 2, reason: 'Another event' }),
      makeEvent({ id: 'tithe', type: 'tithe', points: 8, sourceTeam: 'judah', destinationTeam: 'levi', day: 2, reason: 'Daily tithe · 10%' }),
      makeEvent({ id: 'atonement', type: 'atonement', points: 20, sourceTeam: 'judah', destinationTeam: 'levi', day: 2, reason: 'Ox' }),
    ], 2)

    expect(breakdown.judah).toMatchObject({ gained: 100, lost: 28, net: 72 })
    expect(breakdown.judah.gainedReasons.map((reason) => [reason.label, reason.points])).toEqual([
      ['Watching the teaching', 50],
      ['Another event', 30],
      ['Morning worship', 20],
    ])
    expect(breakdown.judah.lostReasons.map((reason) => [reason.label, reason.points])).toEqual([
      ['Atonement · Ox', 20],
      ['Daily tithe · 10%', 8],
    ])
    expect(breakdown.levi.gainedReasons.map((reason) => [reason.label, reason.points])).toEqual([
      ['Atonement · Ox', 20],
      ['Daily tithe · 10%', 8],
    ])
    expect(breakdown.israel.net).toBe(0)
  })
})

const emptyChanges = { judah: 0, israel: 0, levi: 0 }
const summary = (day: TripDay, eventCount: number, closingScores: Record<TeamId, number> = emptyChanges): DaySummary => ({
  day, eventCount, changes: emptyChanges, closingScores,
})

describe('scoreChartSummaries', () => {
  const eightDays = Array.from({ length: 8 }, (_, index) => summary((index + 1) as TripDay, 0))

  it('stops at the last day that has recorded events', () => {
    const summaries = eightDays.map((item, index) => index < 3 ? { ...item, eventCount: index === 1 ? 0 : 1 } : item)
    summaries[0] = { ...summaries[0], eventCount: 1, closingScores: { judah: 10, israel: 0, levi: 0 } }
    summaries[2] = { ...summaries[2], eventCount: 1, closingScores: { judah: 10, israel: 5, levi: 0 } }
    expect(scoreChartSummaries(summaries).map((item) => item.day)).toEqual([1, 2, 3])
  })

  it('keeps empty days that fall before the latest data', () => {
    const summaries = eightDays.map((item, index) => index === 4 ? { ...item, eventCount: 2 } : item)
    expect(scoreChartSummaries(summaries).map((item) => item.day)).toEqual([1, 2, 3, 4, 5])
  })

  it('shows only day 1 when the ledger is still empty', () => {
    expect(scoreChartSummaries(eightDays).map((item) => item.day)).toEqual([1])
  })
})

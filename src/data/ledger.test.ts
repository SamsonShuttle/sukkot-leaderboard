import { describe, expect, it } from 'vitest'
import { applyReasonAnnotations, calculateAtonementInventory, calculateAtonementReceipts, calculateDaySummaries, calculateScores, validateBackup } from './ledger'
import type { ScoreEvent, ScoreEventReasonAnnotation } from '../types'
import { buildEventChains } from '../lib/eventChains'

const event = (partial: Partial<ScoreEvent>): ScoreEvent => ({
  id: crypto.randomUUID(), sessionId: 'session', createdAt: new Date().toISOString(), type: 'add',
  points: 10, sourceTeam: null, destinationTeam: 'judah', operator: null, note: null,
  reversesEventId: null, day: 1, reason: null, atonementOffering: null, inventoryTeam: null, inventoryDelta: 0, ...partial,
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

  it('gives Levi points without charging a house when an owned Atonement is offered', () => {
    const scores = calculateScores([
      event({ points: 40, destinationTeam: 'judah' }),
      event({ type: 'atonement_acquire', points: 4, destinationTeam: null, atonementOffering: 'ox', inventoryTeam: 'judah', inventoryDelta: 1 }),
      event({ type: 'atonement', points: 4, destinationTeam: 'levi', atonementOffering: 'ox', inventoryTeam: 'judah', inventoryDelta: -1, reason: 'Ox' }),
    ])
    expect(scores).toEqual({ judah: 40, israel: 0, levi: 4 })
  })

  it('uses a compensating event to reverse history', () => {
    const original = event({ id: 'award', points: 25, destinationTeam: 'levi' })
    const undo = event({ type: 'undo', points: 25, sourceTeam: 'levi', destinationTeam: null, reversesEventId: original.id })
    expect(calculateScores([original, undo])).toEqual({ judah: 0, israel: 0, levi: 0 })
  })

  it('restores the original action when an undo is itself undone', () => {
    const original = event({ id: 'award', points: 25, destinationTeam: 'judah' })
    const undo = event({ id: 'undo-award', type: 'undo', points: 25, sourceTeam: 'judah', destinationTeam: null, reversesEventId: original.id })
    const restore = event({ id: 'restore-award', type: 'undo', points: 25, sourceTeam: null, destinationTeam: 'judah', reversesEventId: undo.id })
    const [chain] = buildEventChains([restore, undo, original])

    expect(chain).toMatchObject({ root: original, active: true })
    expect(chain.reversals.map((item) => item.id)).toEqual(['undo-award', 'restore-award'])
    expect(calculateScores([original, undo, restore])).toEqual({ judah: 25, israel: 0, levi: 0 })
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

describe('event reason annotations', () => {
  it('uses the latest annotation without changing the original event object', () => {
    const original = event({ id: 'award', reason: null })
    const annotations: ScoreEventReasonAnnotation[] = [
      { id: 'first', eventId: 'award', reason: 'Earlier reason', operator: null, createdAt: '2026-09-06T10:00:00.000Z' },
      { id: 'latest', eventId: 'award', reason: 'Morning worship', operator: 'Sam', createdAt: '2026-09-06T11:00:00.000Z' },
    ]

    expect(applyReasonAnnotations([original], annotations)[0].reason).toBe('Morning worship')
    expect(original.reason).toBeNull()
  })
})

describe('Atonement inventory', () => {
  it('keeps a spent offering in the inventory as a greyable used token', () => {
    const found = event({ id: 'found-ox', createdAt: '2026-09-06T10:00:00.000Z', type: 'atonement_acquire', points: 4, destinationTeam: null, atonementOffering: 'ox', inventoryTeam: 'judah', inventoryDelta: 1, reason: 'Ox' })
    const spent = event({ id: 'spent-ox', createdAt: '2026-09-06T11:00:00.000Z', type: 'atonement', points: 4, destinationTeam: 'levi', atonementOffering: 'ox', inventoryTeam: 'judah', inventoryDelta: -1, reason: 'Ox' })
    const inventory = calculateAtonementInventory([spent, found])
    expect(inventory.judah.ox).toEqual([expect.objectContaining({ acquisitionEventId: 'found-ox', consumedByEventId: 'spent-ox' })])
  })

  it('makes the offering ready again when its spend is undone', () => {
    const found = event({ id: 'found-ram', createdAt: '2026-09-06T10:00:00.000Z', type: 'atonement_acquire', points: 3, destinationTeam: null, atonementOffering: 'ram', inventoryTeam: 'israel', inventoryDelta: 1, reason: 'Ram' })
    const spent = event({ id: 'spent-ram', createdAt: '2026-09-06T11:00:00.000Z', type: 'atonement', points: 3, destinationTeam: 'levi', atonementOffering: 'ram', inventoryTeam: 'israel', inventoryDelta: -1, reason: 'Ram' })
    const undo = event({ id: 'undo-spend', createdAt: '2026-09-06T12:00:00.000Z', type: 'undo', points: 3, sourceTeam: 'levi', destinationTeam: null, reversesEventId: 'spent-ram', atonementOffering: 'ram', inventoryTeam: 'israel', inventoryDelta: 1 })
    const [token] = calculateAtonementInventory([undo, spent, found]).israel.ram
    expect(token.consumedByEventId).toBeNull()
  })

  it('keeps an acquired offering when its undo is undone', () => {
    const found = event({ id: 'found-ox', type: 'atonement_acquire', points: 4, destinationTeam: null, atonementOffering: 'ox', inventoryTeam: 'judah', inventoryDelta: 1, reason: 'Ox' })
    const undoFound = event({ id: 'undo-found-ox', type: 'undo', points: 4, reversesEventId: found.id, atonementOffering: 'ox', inventoryTeam: 'judah', inventoryDelta: -1 })
    const restoreFound = event({ id: 'restore-found-ox', type: 'undo', points: 4, reversesEventId: undoFound.id, atonementOffering: 'ox', inventoryTeam: 'judah', inventoryDelta: 1 })
    expect(calculateAtonementInventory([restoreFound, undoFound, found]).judah.ox).toEqual([
      expect.objectContaining({ acquisitionEventId: 'found-ox', consumedByEventId: null }),
    ])
  })

  it('holds and spends a 10% Tithe token while protecting the owning house points', () => {
    const seed = event({ id: 'judah-score', points: 70, destinationTeam: 'judah' })
    const found = event({ id: 'found-tithe', createdAt: '2026-09-06T10:00:00.000Z', type: 'atonement_acquire', points: 10, destinationTeam: null, atonementOffering: 'tithe-10', inventoryTeam: 'judah', inventoryDelta: 1, reason: '10% Tithe' })
    const spent = event({ id: 'spent-tithe', createdAt: '2026-09-06T11:00:00.000Z', type: 'atonement', points: 7, destinationTeam: 'levi', atonementOffering: 'tithe-10', inventoryTeam: 'judah', inventoryDelta: -1, reason: '10% Tithe' })
    const inventory = calculateAtonementInventory([spent, found, seed])

    expect(inventory.judah['tithe-10']).toEqual([expect.objectContaining({ acquisitionEventId: 'found-tithe', consumedByEventId: 'spent-tithe' })])
    expect(calculateScores([spent, found, seed])).toEqual({ judah: 70, israel: 0, levi: 7 })
  })
})

describe('Levi Atonement receipts', () => {
  it('counts fixed offerings and 10% Tithe Atonements received from Judah and Israel', () => {
    const inventoryOx = event({ id: 'token-ox', type: 'atonement', points: 4, destinationTeam: 'levi', reason: 'Ox', atonementOffering: 'ox', inventoryTeam: 'judah', inventoryDelta: -1 })
    const pointsRam = event({ id: 'points-ram', type: 'atonement', points: 3, sourceTeam: 'israel', destinationTeam: 'levi', reason: 'Ram', atonementOffering: 'ram' })
    const legacyDove = event({ id: 'legacy-dove', type: 'atonement', points: 2, sourceTeam: 'judah', destinationTeam: 'levi', reason: 'Turtle Dove' })
    const titheAtonement = event({ id: 'tithe-atonement', type: 'atonement', points: 8, destinationTeam: 'levi', reason: '10% Tithe', atonementOffering: 'tithe-10', inventoryTeam: 'israel', inventoryDelta: -1 })
    expect(calculateAtonementReceipts([inventoryOx, pointsRam, legacyDove, titheAtonement])).toEqual({ 'turtle-dove': 1, ram: 1, ox: 1, 'tithe-10': 1 })
  })

  it('does not count an undone receipt', () => {
    const original = event({ id: 'received-ox', type: 'atonement', points: 4, sourceTeam: 'judah', destinationTeam: 'levi', reason: 'Ox', atonementOffering: 'ox' })
    const undo = event({ type: 'undo', points: 4, sourceTeam: 'levi', destinationTeam: 'judah', reversesEventId: original.id, reason: 'Undo: Ox', atonementOffering: 'ox' })
    expect(calculateAtonementReceipts([undo, original]).ox).toBe(0)
  })

  it('counts a receipt again when its undo is undone', () => {
    const original = event({ id: 'received-ox', type: 'atonement', points: 4, sourceTeam: 'judah', destinationTeam: 'levi', reason: 'Ox', atonementOffering: 'ox' })
    const undo = event({ id: 'undo-received-ox', type: 'undo', points: 4, sourceTeam: 'levi', destinationTeam: 'judah', reversesEventId: original.id, reason: 'Undo: Ox', atonementOffering: 'ox' })
    const restore = event({ id: 'restore-received-ox', type: 'undo', points: 4, sourceTeam: 'judah', destinationTeam: 'levi', reversesEventId: undo.id, reason: 'Undo: Undo: Ox', atonementOffering: 'ox' })
    expect(calculateAtonementReceipts([restore, undo, original]).ox).toBe(1)
  })
})

describe('backup validation', () => {
  const validBackup = {
    version: 1,
    exportedAt: '2026-09-05T12:00:00.000Z',
    teams: [
      { id: 'judah' },
      { id: 'israel' },
      { id: 'levi' },
    ],
    sessions: [{ id: 'session-1', name: 'Sukkot Camp', created_at: '2026-09-05T12:00:00.000Z', active_day: 1 }],
    events: [],
    settings: [{ key: 'active_session_id', value: 'session-1' }],
    reasons: [],
  }

  it('accepts a complete version-one backup', () => {
    expect(() => validateBackup(validBackup)).not.toThrow()
  })

  it('rejects a backup before replacement when its active session is invalid', () => {
    expect(() => validateBackup({ ...validBackup, settings: [{ key: 'active_session_id', value: 'missing' }] }))
      .toThrow('valid active scoring event')
  })

  it('rejects incomplete table data before replacement', () => {
    expect(() => validateBackup({ ...validBackup, teams: undefined })).toThrow('valid teams table')
  })

  it('rejects an annotation that points to a missing event', () => {
    expect(() => validateBackup({ ...validBackup, reasonAnnotations: [{ id: 'annotation', event_id: 'missing', reason: 'Morning worship', created_at: '2026-09-05T13:00:00.000Z' }] }))
      .toThrow('event-reason annotation with an invalid event')
  })
})

import { createDatabase, migrateDatabase, type DatabaseAdapter } from './database'
import {
  TEAM_IDS,
  TEAMS,
  ATONEMENT_OFFERING_IDS,
  type AddAtonementInput,
  type ApplyAtonementInput,
  type AtonementInventory,
  type AtonementOfferingId,
  type AtonementReceipts,
  type BackupData,
  type DailyTitheStatus,
  type DaySummary,
  type NewScoreEvent,
  type ScoreboardState,
  type ScoreEvent,
  type ScoreEventReasonAnnotation,
  type Certificate,
  type ScoringSession,
  type ScoreReason,
  type TeamId,
  type TitheRate,
  type TripDay,
  type WheelOutcomeId,
  type WheelWeights,
} from '../types'
import { ATONEMENT_OFFERINGS, ATONEMENT_OPTIONS, DEFAULT_WHEEL_WEIGHTS } from '../config'
import { buildEventChains, effectiveRootEvents } from '../lib/eventChains'

const WHEEL_WEIGHTS_KEY = 'wheel_weights'

const defaultWheelWeights = (): WheelWeights => ({ ...DEFAULT_WHEEL_WEIGHTS })

const wheelWeightsFromValue = (value?: string): WheelWeights => {
  if (!value) return defaultWheelWeights()
  try {
    const parsed = JSON.parse(value) as Partial<Record<WheelOutcomeId, unknown>>
    const defaults = defaultWheelWeights()
    const parsedWeights = Object.fromEntries(Object.keys(defaults).map((key) => {
      const id = key as WheelOutcomeId
      const candidate = parsed[id]
      return [id, typeof candidate === 'number' && Number.isInteger(candidate) && candidate >= 0 && candidate <= 5 ? candidate : defaults[id]]
    })) as WheelWeights
    return Object.values(parsedWeights).some((weight) => weight > 0) ? parsedWeights : defaults
  } catch {
    return defaultWheelWeights()
  }
}

interface RawEvent extends Record<string, unknown> {
  id: string
  session_id: string
  created_at: string
  event_type: ScoreEvent['type']
  points: number
  source_team: TeamId | null
  destination_team: TeamId | null
  operator: string | null
  note: string | null
  reverses_event_id: string | null
  day_number: TripDay
  reason: string | null
  atonement_offering: AtonementOfferingId | null
  inventory_team: TeamId | null
  inventory_delta: -1 | 0 | 1
}

interface RawReason extends Record<string, unknown> {
  id: string
  label: string
  applies_to: ScoreReason['appliesTo']
  active: number
  created_at: string
}

interface RawReasonAnnotation extends Record<string, unknown> {
  id: string
  event_id: string
  reason: string
  operator: string | null
  created_at: string
}

const eventFromRow = (row: RawEvent): ScoreEvent => ({
  id: row.id,
  sessionId: row.session_id,
  createdAt: row.created_at,
  type: row.event_type,
  points: Number(row.points),
  sourceTeam: row.source_team,
  destinationTeam: row.destination_team,
  operator: row.operator,
  note: row.note,
  reversesEventId: row.reverses_event_id,
  day: Number(row.day_number) as TripDay,
  reason: row.reason,
  atonementOffering: row.atonement_offering ?? null,
  inventoryTeam: row.inventory_team ?? null,
  inventoryDelta: Number(row.inventory_delta ?? 0) as -1 | 0 | 1,
})

const reasonFromRow = (row: RawReason): ScoreReason => ({
  id: row.id,
  label: row.label,
  appliesTo: row.applies_to,
  active: Boolean(row.active),
  createdAt: row.created_at,
})

const reasonAnnotationFromRow = (row: RawReasonAnnotation): ScoreEventReasonAnnotation => ({
  id: row.id,
  eventId: row.event_id,
  reason: row.reason,
  operator: row.operator,
  createdAt: row.created_at,
})

export function applyReasonAnnotations(events: ScoreEvent[], annotations: ScoreEventReasonAnnotation[]): ScoreEvent[] {
  const latestReason = new Map<string, string>()
  for (const annotation of [...annotations].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))) {
    if (!latestReason.has(annotation.eventId)) latestReason.set(annotation.eventId, annotation.reason)
  }
  return events.map((event) => {
    const reason = latestReason.get(event.id)
    return reason ? { ...event, reason } : event
  })
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

const requireRecordArray = (backup: Record<string, unknown>, key: string) => {
  const value = backup[key]
  if (!Array.isArray(value) || !value.every(isRecord)) throw new Error(`Backup is missing a valid ${key} table.`)
  return value
}

export function validateBackup(value: unknown): asserts value is BackupData {
  if (!isRecord(value) || value.version !== 1) throw new Error('This is not a supported Sukkot Leaderboard backup.')
  const teams = requireRecordArray(value, 'teams')
  const sessions = requireRecordArray(value, 'sessions')
  const events = requireRecordArray(value, 'events')
  const settings = requireRecordArray(value, 'settings')
  if (value.reasons !== undefined && (!Array.isArray(value.reasons) || !value.reasons.every(isRecord))) {
    throw new Error('Backup has an invalid saved-reasons table.')
  }
  if (value.reasonAnnotations !== undefined && (!Array.isArray(value.reasonAnnotations) || !value.reasonAnnotations.every(isRecord))) {
    throw new Error('Backup has an invalid event-reason annotations table.')
  }

  const teamIds = new Set(teams.map((team) => team.id))
  if (!TEAM_IDS.every((id) => teamIds.has(id))) throw new Error('Backup does not contain all three houses.')
  const sessionIds = new Set(sessions.map((session) => session.id).filter((id): id is string => typeof id === 'string' && Boolean(id)))
  if (!sessionIds.size) throw new Error('Backup does not contain a scoring event.')
  const activeSession = settings.find((setting) => setting.key === 'active_session_id')?.value
  if (typeof activeSession !== 'string' || !sessionIds.has(activeSession)) throw new Error('Backup does not identify a valid active scoring event.')

  const eventTypes = new Set<ScoreEvent['type']>(['seed', 'add', 'deduct', 'transfer', 'tithe', 'atonement', 'atonement_acquire', 'undo'])
  for (const event of events) {
    const day = event.day_number ?? 1
    if (typeof event.id !== 'string' || typeof event.session_id !== 'string' || !sessionIds.has(event.session_id)) throw new Error('Backup contains an event with an invalid session.')
    if (!eventTypes.has(event.event_type as ScoreEvent['type'])) throw new Error('Backup contains an unknown score-event type.')
    if (!Number.isSafeInteger(event.points) || Number(event.points) <= 0) throw new Error('Backup contains an invalid point value.')
    if (!Number.isInteger(day) || Number(day) < 1 || Number(day) > 8) throw new Error('Backup contains an invalid trip day.')
    for (const team of [event.source_team, event.destination_team]) {
      if (team !== null && team !== undefined && !TEAM_IDS.includes(team as TeamId)) throw new Error('Backup contains an unknown house reference.')
    }
    const inventoryDelta = Number(event.inventory_delta ?? 0)
    if (![0, 1, -1].includes(inventoryDelta)) throw new Error('Backup contains an invalid Atonement inventory change.')
    if (event.inventory_team !== null && event.inventory_team !== undefined && !TEAM_IDS.includes(event.inventory_team as TeamId)) {
      throw new Error('Backup contains an unknown Atonement inventory house.')
    }
    if (event.atonement_offering !== null && event.atonement_offering !== undefined && !ATONEMENT_OFFERING_IDS.includes(event.atonement_offering as AtonementOfferingId)) {
      throw new Error('Backup contains an unknown Atonement offering.')
    }
    if (inventoryDelta !== 0 && (!event.inventory_team || !event.atonement_offering)) {
      throw new Error('Backup contains an incomplete Atonement inventory event.')
    }
  }
  const eventIds = new Set(events.map((event) => event.id).filter((id): id is string => typeof id === 'string' && Boolean(id)))
  for (const annotation of (value.reasonAnnotations ?? []) as Array<Record<string, unknown>>) {
    if (typeof annotation.id !== 'string' || typeof annotation.event_id !== 'string' || !eventIds.has(annotation.event_id)) {
      throw new Error('Backup contains an event-reason annotation with an invalid event.')
    }
    if (typeof annotation.reason !== 'string' || !annotation.reason.trim() || annotation.reason.length > 100) {
      throw new Error('Backup contains an invalid event-reason annotation.')
    }
    if (annotation.operator !== null && annotation.operator !== undefined && typeof annotation.operator !== 'string') {
      throw new Error('Backup contains an invalid event-reason annotation operator.')
    }
    if (typeof annotation.created_at !== 'string' || !annotation.created_at) {
      throw new Error('Backup contains an invalid event-reason annotation timestamp.')
    }
  }
}

export function calculateScores(events: ScoreEvent[]): Record<TeamId, number> {
  const scores = Object.fromEntries(TEAM_IDS.map((id) => [id, 0])) as Record<TeamId, number>
  for (const event of events) {
    if (event.sourceTeam) scores[event.sourceTeam] -= event.points
    if (event.destinationTeam) scores[event.destinationTeam] += event.points
  }
  return scores
}

export function calculateDaySummaries(events: ScoreEvent[]): DaySummary[] {
  const cumulative = Object.fromEntries(TEAM_IDS.map((id) => [id, 0])) as Record<TeamId, number>
  return Array.from({ length: 8 }, (_, index) => {
    const day = (index + 1) as TripDay
    const dayEvents = events.filter((event) => event.day === day)
    const changes = calculateScores(dayEvents)
    for (const teamId of TEAM_IDS) cumulative[teamId] += changes[teamId]
    return { day, eventCount: dayEvents.length, changes, closingScores: { ...cumulative } }
  })
}

const emptyAtonementInventory = (): AtonementInventory => {
  const emptyOfferings = () => ({ 'turtle-dove': [], ram: [], ox: [], 'tithe-10': [] })
  return { judah: emptyOfferings(), israel: emptyOfferings(), levi: emptyOfferings() }
}

/** Derive every acquired token and its spent state from the immutable event stream. */
export function calculateAtonementInventory(events: ScoreEvent[]): AtonementInventory {
  const inventory = emptyAtonementInventory()
  const effective = effectiveRootEvents(events)
    .filter((event) => event.inventoryTeam && event.atonementOffering && event.inventoryDelta !== 0)
    .map((event, index) => ({ event, index }))
    .sort((a, b) => a.event.createdAt.localeCompare(b.event.createdAt) || b.index - a.index)
    .map(({ event }) => event)

  for (const event of effective) {
    const tokens = inventory[event.inventoryTeam!][event.atonementOffering!]
    if (event.inventoryDelta === 1) {
      tokens.push({
        acquisitionEventId: event.id,
        offeringId: event.atonementOffering!,
        acquiredAt: event.createdAt,
        consumedByEventId: null,
        consumedAt: null,
      })
      continue
    }
    const available = tokens.find((token) => !token.consumedByEventId)
    if (available) {
      available.consumedByEventId = event.id
      available.consumedAt = event.createdAt
    }
  }
  return inventory
}

/** Count offerings Levi has effectively received from Judah and Israel. */
export function calculateAtonementReceipts(events: ScoreEvent[]): AtonementReceipts {
  const receipts: AtonementReceipts = { 'turtle-dove': 0, ram: 0, ox: 0, 'tithe-10': 0 }
  for (const event of effectiveRootEvents(events)) {
    if (event.type !== 'atonement' || event.destinationTeam !== 'levi') continue
    const origin = event.inventoryTeam ?? event.sourceTeam
    if (origin !== 'judah' && origin !== 'israel') continue
    const offeringId = event.atonementOffering
      ?? ATONEMENT_OPTIONS.find((offering) => offering.label === event.reason)?.id
    if (offeringId) receipts[offeringId] += 1
  }
  return receipts
}

export function calculateDailyTitheStatus(events: ScoreEvent[], day: TripDay): DailyTitheStatus {
  const effectiveTithes = effectiveRootEvents(events).filter((event) => event.type === 'tithe')
  const titheChainEventIds = new Set(buildEventChains(events)
    .filter((chain) => chain.root.type === 'tithe')
    .flatMap((chain) => [chain.root.id, ...chain.reversals.map((event) => event.id)]))
  const eligibleEvents = events.filter((event) => {
    if (event.day !== day || event.type === 'seed' || titheChainEventIds.has(event.id)) return false
    return true
  })
  const dailyScores = calculateScores(eligibleEvents)
  const activeTithe = effectiveTithes.find((event) => event.day === day)
  const match = activeTithe?.reason?.match(/(5|10)%/)
  return {
    day,
    bases: { judah: Math.max(0, dailyScores.judah), israel: Math.max(0, dailyScores.israel) },
    appliedRate: match ? Number(match[1]) as TitheRate : activeTithe ? 10 : null,
  }
}

export class ScoreLedger {
  private constructor(private readonly database: DatabaseAdapter) {}

  static async open(databaseId?: string) {
    const database = await createDatabase(databaseId)
    await migrateDatabase(database)
    const ledger = new ScoreLedger(database)
    await ledger.seedTeams()
    await ledger.ensureSession()
    await ledger.normalizeLegacySessionName()
    return ledger
  }

  get storageKind() {
    return this.database.kind
  }

  async reload() {
    await this.database.reload()
  }

  async close() {
    await this.database.close()
  }

  private async seedTeams() {
    for (const team of TEAMS) {
      await this.database.execute(
        `INSERT OR IGNORE INTO teams (id, name, short_name, color, accent, banner_url)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [team.id, team.name, team.shortName, team.color, team.accent, team.bannerUrl],
      )
    }
  }

  private async ensureSession() {
    const active = await this.database.select<{ value: string }>(
      `SELECT value FROM settings WHERE key = 'active_session_id'`,
    )
    if (!active.length) await this.startNewEvent('Sukkot Camp')
  }

  private async normalizeLegacySessionName() {
    await this.database.execute(
      `UPDATE scoring_sessions SET name = 'Sukkot Camp' WHERE name = 'Sukkot Camp — Day 1'`,
    )
  }

  private async activeSessionId() {
    const rows = await this.database.select<{ value: string }>(
      `SELECT value FROM settings WHERE key = 'active_session_id'`,
    )
    if (!rows[0]) throw new Error('No active scoring event')
    return rows[0].value
  }

  async getState(): Promise<ScoreboardState> {
    const sessionId = await this.activeSessionId()
    const sessions = await this.database.select<Record<string, unknown>>(
      `SELECT id, name, created_at, active_day FROM scoring_sessions WHERE id = ?`,
      [sessionId],
    )
    const row = sessions[0]
    if (!row) throw new Error('The active event could not be loaded')
    const session: ScoringSession = {
      id: String(row.id),
      name: String(row.name),
      createdAt: String(row.created_at),
      activeDay: Number(row.active_day) as TripDay,
    }
    const rawEvents = await this.database.select<RawEvent>(
      `SELECT * FROM score_events WHERE session_id = ? ORDER BY created_at DESC, rowid DESC`,
      [sessionId],
    )
    const rawAnnotations = await this.database.select<RawReasonAnnotation>(
      `SELECT * FROM score_event_reason_annotations WHERE event_id IN (SELECT id FROM score_events WHERE session_id = ?) ORDER BY created_at DESC, rowid DESC`,
      [sessionId],
    )
    const events = applyReasonAnnotations(rawEvents.map(eventFromRow), rawAnnotations.map(reasonAnnotationFromRow))
    const scores = calculateScores(events)
    const daySummaries = calculateDaySummaries(events)
    const reasonRows = await this.database.select<RawReason>('SELECT * FROM score_reasons ORDER BY active DESC, label COLLATE NOCASE')
    const reasons = reasonRows.map(reasonFromRow)
    const titheStatus = calculateDailyTitheStatus(events, session.activeDay)
    const wheelSettings = await this.database.select<{ value: string }>('SELECT value FROM settings WHERE key = ?', [WHEEL_WEIGHTS_KEY])
    const wheelWeights = wheelWeightsFromValue(wheelSettings[0]?.value)
    const atonementInventory = calculateAtonementInventory(events)
    const atonementReceipts = calculateAtonementReceipts(events)
    const certificates = await this.database.select<Record<string, unknown>>('SELECT * FROM certificates ORDER BY created_at, rowid')
    return { session, teams: TEAMS, scores, events, daySummaries, reasons, titheStatus, wheelWeights, atonementInventory, atonementReceipts, certificates: certificates.map((row) => ({ id: String(row.id), title: String(row.title), winner: row.winner ? String(row.winner) : null, citation: row.citation ? String(row.citation) : null, createdAt: String(row.created_at), updatedAt: String(row.updated_at) })) }
  }

  async addCertificate(title: string, winner?: string, citation?: string): Promise<Certificate> {
    const cleanTitle = title.trim()
    if (!cleanTitle) throw new Error('Enter a certificate title')
    const now = new Date().toISOString()
    const certificate: Certificate = { id: crypto.randomUUID(), title: cleanTitle, winner: winner?.trim() || null, citation: citation?.trim() || null, createdAt: now, updatedAt: now }
    await this.database.execute('INSERT INTO certificates (id, title, winner, citation, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', [certificate.id, certificate.title, certificate.winner, certificate.citation, now, now])
    return certificate
  }

  async updateCertificate(id: string, title: string, winner?: string, citation?: string) {
    const cleanTitle = title.trim()
    if (!cleanTitle) throw new Error('Enter a certificate title')
    await this.database.execute('UPDATE certificates SET title = ?, winner = ?, citation = ?, updated_at = ? WHERE id = ?', [cleanTitle, winner?.trim() || null, citation?.trim() || null, new Date().toISOString(), id])
  }

  async deleteCertificate(id: string) {
    await this.database.execute('DELETE FROM certificates WHERE id = ?', [id])
  }

  async setActiveDay(day: TripDay) {
    if (!Number.isInteger(day) || day < 1 || day > 8) throw new Error('Day must be between 1 and 8')
    await this.database.execute(
      'UPDATE scoring_sessions SET active_day = ? WHERE id = ?',
      [day, await this.activeSessionId()],
    )
  }

  async record(input: NewScoreEvent): Promise<ScoreEvent> {
    if (!Number.isSafeInteger(input.points) || input.points <= 0) {
      throw new Error('Points must be a positive whole number')
    }
    if (input.sourceTeam && !TEAM_IDS.includes(input.sourceTeam)) throw new Error('Unknown source team')
    if (input.destinationTeam && !TEAM_IDS.includes(input.destinationTeam)) throw new Error('Unknown destination team')
    if (input.sourceTeam && input.sourceTeam === input.destinationTeam) {
      throw new Error('Source and destination must be different teams')
    }
    if (input.type === 'add' && (!input.destinationTeam || input.sourceTeam)) throw new Error('Add needs one destination')
    if (input.type === 'deduct' && (!input.sourceTeam || input.destinationTeam)) throw new Error('Deduct needs one source')
    if (['transfer', 'tithe', 'atonement'].includes(input.type) && (!input.sourceTeam || !input.destinationTeam)) {
      throw new Error('Transfer needs a source and destination')
    }
    if (['tithe', 'atonement'].includes(input.type) && (input.destinationTeam !== 'levi' || input.sourceTeam === 'levi')) {
      throw new Error(`${input.type} must flow from Judah or Israel to Levi`)
    }

    const event: ScoreEvent = {
      id: crypto.randomUUID(),
      sessionId: await this.activeSessionId(),
      createdAt: new Date().toISOString(),
      type: input.type,
      points: input.points,
      sourceTeam: input.sourceTeam ?? null,
      destinationTeam: input.destinationTeam ?? null,
      operator: input.operator?.trim() || null,
      note: input.note?.trim() || null,
      reversesEventId: null,
      day: await this.activeDay(),
      reason: input.reason?.trim() || null,
      atonementOffering: null,
      inventoryTeam: null,
      inventoryDelta: 0,
    }
    await this.insertEvent(event)
    return event
  }

  private async insertEvent(event: ScoreEvent) {
    await this.database.execute(
      `INSERT INTO score_events
      (id, session_id, created_at, event_type, points, source_team, destination_team, operator, note, reverses_event_id, day_number, reason, atonement_offering, inventory_team, inventory_delta)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [event.id, event.sessionId, event.createdAt, event.type, event.points, event.sourceTeam,
        event.destinationTeam, event.operator, event.note, event.reversesEventId, event.day, event.reason,
        event.atonementOffering, event.inventoryTeam, event.inventoryDelta],
    )
  }

  private async activeDay(): Promise<TripDay> {
    const rows = await this.database.select<{ active_day: number }>(
      'SELECT active_day FROM scoring_sessions WHERE id = ?',
      [await this.activeSessionId()],
    )
    return Number(rows[0]?.active_day ?? 1) as TripDay
  }

  async undo(eventId: string, operator?: string): Promise<ScoreEvent> {
    const rows = await this.database.select<RawEvent>(`SELECT * FROM score_events WHERE id = ?`, [eventId])
    const original = rows[0] ? eventFromRow(rows[0]) : null
    if (!original || original.sessionId !== await this.activeSessionId()) throw new Error('Event not found')
    const alreadyUndone = await this.database.select<{ id: string }>(
      `SELECT id FROM score_events WHERE reverses_event_id = ?`,
      [eventId],
    )
    if (alreadyUndone.length) throw new Error('This event has already been undone')
    if (original.type === 'atonement_acquire' && original.inventoryTeam && original.atonementOffering) {
      const state = await this.getState()
      const token = state.atonementInventory[original.inventoryTeam][original.atonementOffering]
        .find((item) => item.acquisitionEventId === original.id)
      if (token?.consumedByEventId) throw new Error('Undo the Atonement that used this offering before removing it from the team.')
    }

    const compensation: ScoreEvent = {
      id: crypto.randomUUID(),
      sessionId: original.sessionId,
      createdAt: new Date().toISOString(),
      type: 'undo',
      points: original.points,
      sourceTeam: original.destinationTeam,
      destinationTeam: original.sourceTeam,
      operator: operator?.trim() || null,
      note: `Undo ${original.type}${original.note ? `: ${original.note}` : ''}`,
      reversesEventId: original.id,
      day: await this.activeDay(),
      reason: original.reason ? `Undo: ${original.reason}` : null,
      atonementOffering: original.atonementOffering,
      inventoryTeam: original.inventoryTeam,
      inventoryDelta: (original.inventoryDelta * -1) as -1 | 0 | 1,
    }
    await this.insertEvent(compensation)
    return compensation
  }

  async startNewEvent(name: string, seeds: Partial<Record<TeamId, number>> = {}) {
    const id = crypto.randomUUID()
    const createdAt = new Date().toISOString()
    const steps: Array<{ sql: string; params?: unknown[] }> = [
      {
        sql: `INSERT INTO scoring_sessions (id, name, created_at, active_day) VALUES (?, ?, ?, 1)`,
        params: [id, name.trim() || 'New Sukkot Event', createdAt],
      },
      {
        sql: `INSERT INTO settings (key, value) VALUES ('active_session_id', ?)
              ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        params: [id],
      },
    ]
    for (const teamId of TEAM_IDS) {
      const points = seeds[teamId] ?? 0
      if (points > 0) {
        steps.push({
          sql: `INSERT INTO score_events
                (id, session_id, created_at, event_type, points, source_team, destination_team, operator, note, reverses_event_id, day_number, reason, atonement_offering, inventory_team, inventory_delta)
                VALUES (?, ?, ?, 'seed', ?, NULL, ?, NULL, 'Opening balance', NULL, 1, 'Opening balance', NULL, NULL, 0)`,
          params: [crypto.randomUUID(), id, createdAt, points, teamId],
        })
      }
    }
    await this.database.transaction(steps)
  }

  async exportBackup(): Promise<BackupData> {
    const [teams, sessions, events, reasonAnnotations, settings, reasons] = await Promise.all([
      this.database.select<Record<string, unknown>>('SELECT * FROM teams ORDER BY id'),
      this.database.select<Record<string, unknown>>('SELECT * FROM scoring_sessions ORDER BY created_at'),
      this.database.select<Record<string, unknown>>('SELECT * FROM score_events ORDER BY created_at, rowid'),
      this.database.select<Record<string, unknown>>('SELECT * FROM score_event_reason_annotations ORDER BY created_at, rowid'),
      this.database.select<Record<string, unknown>>('SELECT * FROM settings ORDER BY key'),
      this.database.select<Record<string, unknown>>('SELECT * FROM score_reasons ORDER BY created_at'),
    ])
    return { version: 1, exportedAt: new Date().toISOString(), teams, sessions, events, reasonAnnotations, settings, reasons }
  }

  async exportDatabase(): Promise<Uint8Array> {
    const bytes = await this.database.exportBytes()
    if (!bytes) throw new Error('The native app already stores SQLite as a file on disk.')
    return bytes
  }

  async importBackup(backup: unknown) {
    validateBackup(backup)
    const steps: Array<{ sql: string; params?: unknown[] }> = [
      { sql: 'DELETE FROM score_event_reason_annotations' },
      { sql: 'DELETE FROM score_events' },
      { sql: 'DELETE FROM scoring_sessions' },
      { sql: 'DELETE FROM settings' },
      { sql: 'DELETE FROM score_reasons' },
      { sql: 'DELETE FROM teams' },
    ]
    for (const team of backup.teams) {
      steps.push({ sql: `INSERT INTO teams VALUES (?, ?, ?, ?, ?, ?)`, params: [team.id, team.name, team.short_name, team.color, team.accent, team.banner_url] })
    }
    for (const session of backup.sessions) {
      steps.push({ sql: `INSERT INTO scoring_sessions (id, name, created_at, active_day) VALUES (?, ?, ?, ?)`, params: [session.id, session.name, session.created_at, session.active_day ?? 1] })
    }
    for (const event of backup.events) {
      steps.push({ sql: `INSERT INTO score_events (id, session_id, created_at, event_type, points, source_team, destination_team, operator, note, reverses_event_id, day_number, reason, atonement_offering, inventory_team, inventory_delta) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, params: [event.id, event.session_id, event.created_at, event.event_type, event.points, event.source_team, event.destination_team, event.operator, event.note, event.reverses_event_id, event.day_number ?? 1, event.reason ?? null, event.atonement_offering ?? null, event.inventory_team ?? null, event.inventory_delta ?? 0] })
    }
    for (const annotation of backup.reasonAnnotations ?? []) {
      steps.push({ sql: `INSERT INTO score_event_reason_annotations (id, event_id, reason, operator, created_at) VALUES (?, ?, ?, ?, ?)`, params: [annotation.id, annotation.event_id, annotation.reason, annotation.operator ?? null, annotation.created_at] })
    }
    for (const setting of backup.settings) {
      steps.push({ sql: `INSERT INTO settings VALUES (?, ?)`, params: [setting.key, setting.value] })
    }
    for (const reason of backup.reasons ?? []) {
      steps.push({ sql: `INSERT INTO score_reasons (id, label, applies_to, active, created_at) VALUES (?, ?, ?, ?, ?)`, params: [reason.id, reason.label, reason.applies_to, reason.active, reason.created_at] })
    }
    await this.database.transaction(steps)
  }

  async addReason(label: string): Promise<ScoreReason> {
    const cleanLabel = label.trim()
    if (!cleanLabel) throw new Error('Enter a reason label')
    if (cleanLabel.length > 100) throw new Error('Keep reason labels to 100 characters or fewer')
    const existing = await this.database.select<{ id: string }>(
      'SELECT id FROM score_reasons WHERE label = ? COLLATE NOCASE',
      [cleanLabel],
    )
    if (existing.length) throw new Error('That reason already exists. Restore it if it is hidden.')
    const reason: ScoreReason = {
      id: crypto.randomUUID(),
      label: cleanLabel,
      appliesTo: 'both',
      active: true,
      createdAt: new Date().toISOString(),
    }
    await this.database.execute(
      `INSERT INTO score_reasons (id, label, applies_to, active, created_at) VALUES (?, ?, ?, 1, ?)`,
      [reason.id, reason.label, reason.appliesTo, reason.createdAt],
    )
    return reason
  }

  async addEventReason(eventId: string, reason: string, operator?: string): Promise<ScoreEventReasonAnnotation> {
    const cleanReason = reason.trim()
    if (!cleanReason) throw new Error('Choose or enter a reason')
    if (cleanReason.length > 100) throw new Error('Keep reason labels to 100 characters or fewer')
    const rows = await this.database.select<{ id: string }>(
      `SELECT id FROM score_events WHERE id = ? AND session_id = ?`,
      [eventId, await this.activeSessionId()],
    )
    if (!rows.length) throw new Error('Event not found')
    const annotation: ScoreEventReasonAnnotation = {
      id: crypto.randomUUID(),
      eventId,
      reason: cleanReason,
      operator: operator?.trim() || null,
      createdAt: new Date().toISOString(),
    }
    await this.database.execute(
      `INSERT INTO score_event_reason_annotations (id, event_id, reason, operator, created_at) VALUES (?, ?, ?, ?, ?)`,
      [annotation.id, annotation.eventId, annotation.reason, annotation.operator, annotation.createdAt],
    )
    return annotation
  }

  async setReasonActive(id: string, active: boolean) {
    await this.database.execute('UPDATE score_reasons SET active = ? WHERE id = ?', [active ? 1 : 0, id])
  }

  async setWheelWeights(weights: WheelWeights) {
    if (!Object.values(weights).some((weight) => weight > 0)) throw new Error('Keep at least one wheel outcome enabled')
    const candidate = wheelWeightsFromValue(JSON.stringify(weights))
    await this.database.execute(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      [WHEEL_WEIGHTS_KEY, JSON.stringify(candidate)],
    )
  }

  async addAtonement(input: AddAtonementInput): Promise<ScoreEvent> {
    if (input.team !== 'judah' && input.team !== 'israel') throw new Error('Only Judah or Israel can find an Atonement offering')
    const offering = ATONEMENT_OFFERINGS.find((item) => item.id === input.offeringId)
    if (!offering) throw new Error('Choose a valid Atonement offering')
    const event: ScoreEvent = {
      id: crypto.randomUUID(),
      sessionId: await this.activeSessionId(),
      createdAt: new Date().toISOString(),
      type: 'atonement_acquire',
      points: 'rate' in offering ? offering.rate : offering.points,
      sourceTeam: null,
      destinationTeam: null,
      operator: input.operator?.trim() || null,
      note: input.note?.trim() || null,
      reversesEventId: null,
      day: await this.activeDay(),
      reason: offering.label,
      atonementOffering: offering.id,
      inventoryTeam: input.team,
      inventoryDelta: 1,
    }
    await this.insertEvent(event)
    return event
  }

  async applyAtonement(input: ApplyAtonementInput): Promise<ScoreEvent> {
    if (input.sourceTeam !== 'judah' && input.sourceTeam !== 'israel') {
      throw new Error('Atonement must come from Judah or Israel')
    }
    const option = ATONEMENT_OPTIONS.find((item) => item.id === input.offeringId)
    if (!option) throw new Error('Choose a valid Atonement offering')
    const state = await this.getState()
    const ownedTokens = state.atonementInventory[input.sourceTeam][option.id]
    const usesOwnedOffering = ownedTokens.some((token) => !token.consumedByEventId)
    const points = 'rate' in option
      ? Math.round(Math.max(0, state.scores[input.sourceTeam]) * option.rate / 100)
      : option.points
    if (points <= 0) throw new Error(`10% of ${input.sourceTeam === 'judah' ? 'Judah' : 'Israel'} is currently 0 points.`)

    const event: ScoreEvent = {
      id: crypto.randomUUID(),
      sessionId: state.session.id,
      createdAt: new Date().toISOString(),
      type: 'atonement',
      points,
      sourceTeam: usesOwnedOffering ? null : input.sourceTeam,
      destinationTeam: 'levi',
      operator: input.operator?.trim() || null,
      note: input.note?.trim() || null,
      reversesEventId: null,
      day: state.session.activeDay,
      reason: option.label,
      atonementOffering: option.id,
      inventoryTeam: usesOwnedOffering ? input.sourceTeam : null,
      inventoryDelta: usesOwnedOffering ? -1 : 0,
    }
    await this.insertEvent(event)
    return event
  }

  async applyDailyTithe(rate: TitheRate, operator?: string, note?: string): Promise<ScoreEvent[]> {
    if (rate !== 5 && rate !== 10) throw new Error('Tithe rate must be 5% or 10%')
    const state = await this.getState()
    const status = calculateDailyTitheStatus(state.events, state.session.activeDay)
    if (status.appliedRate) throw new Error(`A ${status.appliedRate}% tithe is already active for Day ${status.day}. Undo it before applying another.`)

    const createdAt = new Date().toISOString()
    const events: ScoreEvent[] = (['judah', 'israel'] as const).flatMap((sourceTeam) => {
      const points = Math.round(status.bases[sourceTeam] * rate / 100)
      if (points <= 0) return []
      return [{
        id: crypto.randomUUID(),
        sessionId: state.session.id,
        createdAt,
        type: 'tithe' as const,
        points,
        sourceTeam,
        destinationTeam: 'levi' as const,
        operator: operator?.trim() || null,
        note: note?.trim() || null,
        reversesEventId: null,
        day: state.session.activeDay,
        reason: `Daily tithe · ${rate}%`,
        atonementOffering: null,
        inventoryTeam: null,
        inventoryDelta: 0 as const,
      }]
    })
    if (!events.length) throw new Error(`Judah and Israel have no eligible Day ${status.day} points to tithe.`)
    await this.database.transaction(events.map((event) => ({
      sql: `INSERT INTO score_events
            (id, session_id, created_at, event_type, points, source_team, destination_team, operator, note, reverses_event_id, day_number, reason, atonement_offering, inventory_team, inventory_delta)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [event.id, event.sessionId, event.createdAt, event.type, event.points, event.sourceTeam,
        event.destinationTeam, event.operator, event.note, event.reversesEventId, event.day, event.reason,
        event.atonementOffering, event.inventoryTeam, event.inventoryDelta],
    })))
    return events
  }
}

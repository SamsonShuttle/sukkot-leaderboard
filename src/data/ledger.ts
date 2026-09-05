import { createDatabase, migrateDatabase, type DatabaseAdapter } from './database'
import {
  TEAM_IDS,
  TEAMS,
  type BackupData,
  type DailyTitheStatus,
  type DaySummary,
  type NewScoreEvent,
  type ScoreboardState,
  type ScoreEvent,
  type ScoringSession,
  type ScoreReason,
  type TeamId,
  type TitheRate,
  type TripDay,
} from '../types'

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
}

interface RawReason extends Record<string, unknown> {
  id: string
  label: string
  applies_to: ScoreReason['appliesTo']
  active: number
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
})

const reasonFromRow = (row: RawReason): ScoreReason => ({
  id: row.id,
  label: row.label,
  appliesTo: row.applies_to,
  active: Boolean(row.active),
  createdAt: row.created_at,
})

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

export function calculateDailyTitheStatus(events: ScoreEvent[], day: TripDay): DailyTitheStatus {
  const byId = new Map(events.map((event) => [event.id, event]))
  const undoneIds = new Set(events.filter((event) => event.reversesEventId).map((event) => event.reversesEventId))
  const eligibleEvents = events.filter((event) => {
    if (event.day !== day || event.type === 'seed' || event.type === 'tithe') return false
    if (event.type !== 'undo') return true
    return byId.get(event.reversesEventId ?? '')?.type !== 'tithe'
  })
  const dailyScores = calculateScores(eligibleEvents)
  const activeTithe = events.find((event) => event.day === day && event.type === 'tithe' && !undoneIds.has(event.id))
  const match = activeTithe?.reason?.match(/(5|10)%/)
  return {
    day,
    bases: { judah: Math.max(0, dailyScores.judah), israel: Math.max(0, dailyScores.israel) },
    appliedRate: match ? Number(match[1]) as TitheRate : activeTithe ? 10 : null,
  }
}

export class ScoreLedger {
  private constructor(private readonly database: DatabaseAdapter) {}

  static async open() {
    const database = await createDatabase()
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
    const events = rawEvents.map(eventFromRow)
    const scores = calculateScores(events.filter((event) => event.day <= session.activeDay))
    const daySummaries = calculateDaySummaries(events)
    const reasonRows = await this.database.select<RawReason>('SELECT * FROM score_reasons ORDER BY active DESC, label COLLATE NOCASE')
    const reasons = reasonRows.map(reasonFromRow)
    const titheStatus = calculateDailyTitheStatus(events, session.activeDay)
    return { session, teams: TEAMS, scores, events, daySummaries, reasons, titheStatus }
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
    }
    await this.insertEvent(event)
    return event
  }

  private async insertEvent(event: ScoreEvent) {
    await this.database.execute(
      `INSERT INTO score_events
       (id, session_id, created_at, event_type, points, source_team, destination_team, operator, note, reverses_event_id, day_number, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [event.id, event.sessionId, event.createdAt, event.type, event.points, event.sourceTeam,
        event.destinationTeam, event.operator, event.note, event.reversesEventId, event.day, event.reason],
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
    if (original.type === 'undo') throw new Error('Undo events cannot be undone')
    const alreadyUndone = await this.database.select<{ id: string }>(
      `SELECT id FROM score_events WHERE reverses_event_id = ?`,
      [eventId],
    )
    if (alreadyUndone.length) throw new Error('This event has already been undone')

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
                (id, session_id, created_at, event_type, points, source_team, destination_team, operator, note, reverses_event_id, day_number, reason)
                VALUES (?, ?, ?, 'seed', ?, NULL, ?, NULL, 'Opening balance', NULL, 1, 'Opening balance')`,
          params: [crypto.randomUUID(), id, createdAt, points, teamId],
        })
      }
    }
    await this.database.transaction(steps)
  }

  async exportBackup(): Promise<BackupData> {
    const [teams, sessions, events, settings, reasons] = await Promise.all([
      this.database.select<Record<string, unknown>>('SELECT * FROM teams ORDER BY id'),
      this.database.select<Record<string, unknown>>('SELECT * FROM scoring_sessions ORDER BY created_at'),
      this.database.select<Record<string, unknown>>('SELECT * FROM score_events ORDER BY created_at, rowid'),
      this.database.select<Record<string, unknown>>('SELECT * FROM settings ORDER BY key'),
      this.database.select<Record<string, unknown>>('SELECT * FROM score_reasons ORDER BY created_at'),
    ])
    return { version: 1, exportedAt: new Date().toISOString(), teams, sessions, events, settings, reasons }
  }

  async importBackup(backup: BackupData) {
    if (backup.version !== 1 || !Array.isArray(backup.events) || !Array.isArray(backup.sessions)) {
      throw new Error('This is not a supported Sukkot Leaderboard backup')
    }
    const steps: Array<{ sql: string; params?: unknown[] }> = [
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
      steps.push({ sql: `INSERT INTO score_events (id, session_id, created_at, event_type, points, source_team, destination_team, operator, note, reverses_event_id, day_number, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, params: [event.id, event.session_id, event.created_at, event.event_type, event.points, event.source_team, event.destination_team, event.operator, event.note, event.reverses_event_id, event.day_number ?? 1, event.reason ?? null] })
    }
    for (const setting of backup.settings) {
      steps.push({ sql: `INSERT INTO settings VALUES (?, ?)`, params: [setting.key, setting.value] })
    }
    for (const reason of backup.reasons ?? []) {
      steps.push({ sql: `INSERT INTO score_reasons (id, label, applies_to, active, created_at) VALUES (?, ?, ?, ?, ?)`, params: [reason.id, reason.label, reason.applies_to, reason.active, reason.created_at] })
    }
    await this.database.transaction(steps)
  }

  async addReason(label: string, appliesTo: ScoreReason['appliesTo']): Promise<ScoreReason> {
    const cleanLabel = label.trim()
    if (!cleanLabel) throw new Error('Enter a reason label')
    if (cleanLabel.length > 100) throw new Error('Keep reason labels to 100 characters or fewer')
    if (!['add', 'deduct', 'both'].includes(appliesTo)) throw new Error('Choose where this reason applies')
    const existing = await this.database.select<{ id: string }>(
      'SELECT id FROM score_reasons WHERE label = ? COLLATE NOCASE',
      [cleanLabel],
    )
    if (existing.length) throw new Error('That reason already exists. Restore it if it is hidden.')
    const reason: ScoreReason = {
      id: crypto.randomUUID(),
      label: cleanLabel,
      appliesTo,
      active: true,
      createdAt: new Date().toISOString(),
    }
    await this.database.execute(
      `INSERT INTO score_reasons (id, label, applies_to, active, created_at) VALUES (?, ?, ?, 1, ?)`,
      [reason.id, reason.label, reason.appliesTo, reason.createdAt],
    )
    return reason
  }

  async setReasonActive(id: string, active: boolean) {
    await this.database.execute('UPDATE score_reasons SET active = ? WHERE id = ?', [active ? 1 : 0, id])
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
      }]
    })
    if (!events.length) throw new Error(`Judah and Israel have no eligible Day ${status.day} points to tithe.`)
    await this.database.transaction(events.map((event) => ({
      sql: `INSERT INTO score_events
            (id, session_id, created_at, event_type, points, source_team, destination_team, operator, note, reverses_event_id, day_number, reason)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [event.id, event.sessionId, event.createdAt, event.type, event.points, event.sourceTeam,
        event.destinationTeam, event.operator, event.note, event.reversesEventId, event.day, event.reason],
    })))
    return events
  }
}

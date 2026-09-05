export const TEAM_IDS = ['judah', 'israel', 'levi'] as const
export type TeamId = (typeof TEAM_IDS)[number]
export const TRIP_DAYS = [1, 2, 3, 4, 5, 6, 7, 8] as const
export type TripDay = (typeof TRIP_DAYS)[number]
export type ReasonAppliesTo = 'add' | 'deduct' | 'both'
export type TitheRate = 5 | 10
export type ColorTheme = 'light' | 'dark'

export type EventType =
  | 'seed'
  | 'add'
  | 'deduct'
  | 'transfer'
  | 'tithe'
  | 'atonement'
  | 'undo'

export interface Team {
  id: TeamId
  name: string
  shortName: string
  color: string
  accent: string
  tint: string
  foreground: string
  motif: string
  bannerUrl: string
}

export interface ScoreEvent {
  id: string
  sessionId: string
  createdAt: string
  type: EventType
  points: number
  sourceTeam: TeamId | null
  destinationTeam: TeamId | null
  operator: string | null
  note: string | null
  reversesEventId: string | null
  day: TripDay
  reason: string | null
}

export interface ScoreReason {
  id: string
  label: string
  appliesTo: ReasonAppliesTo
  active: boolean
  createdAt: string
}

export interface ScoringSession {
  id: string
  name: string
  createdAt: string
  activeDay: TripDay
}

export interface DaySummary {
  day: TripDay
  eventCount: number
  changes: Record<TeamId, number>
  closingScores: Record<TeamId, number>
}

export interface DailyTitheStatus {
  day: TripDay
  bases: Record<'judah' | 'israel', number>
  appliedRate: TitheRate | null
}

export interface ScoreboardState {
  session: ScoringSession
  teams: Team[]
  scores: Record<TeamId, number>
  events: ScoreEvent[]
  daySummaries: DaySummary[]
  reasons: ScoreReason[]
  titheStatus: DailyTitheStatus
}

export interface NewScoreEvent {
  type: Exclude<EventType, 'seed' | 'undo'>
  points: number
  sourceTeam?: TeamId | null
  destinationTeam?: TeamId | null
  operator?: string
  note?: string
  reason?: string
}

export interface BackupData {
  version: 1
  exportedAt: string
  teams: Array<Record<string, unknown>>
  sessions: Array<Record<string, unknown>>
  events: Array<Record<string, unknown>>
  settings: Array<Record<string, unknown>>
  reasons?: Array<Record<string, unknown>>
}

export const TEAMS: Team[] = [
  {
    id: 'judah',
    name: 'House of Judah',
    shortName: 'Judah',
    color: '#E9D5A6',
    accent: '#9D7412',
    tint: '#FFF1CF',
    foreground: '#18233B',
    motif: 'Lion',
    bannerUrl: '/banners/judah.svg',
  },
  {
    id: 'israel',
    name: 'House of Israel',
    shortName: 'Israel',
    color: '#08247D',
    accent: '#D6A92A',
    tint: '#DCE5FF',
    foreground: '#FFFFFF',
    motif: 'Menorah',
    bannerUrl: '/banners/israel.svg',
  },
  {
    id: 'levi',
    name: 'House of Levi',
    shortName: 'Levi',
    color: '#9B0032',
    accent: '#D6A92A',
    tint: '#F7DCE4',
    foreground: '#FFFFFF',
    motif: 'Priestly service',
    bannerUrl: '/banners/levi.svg',
  },
]

export const teamById = (id: TeamId | null) => TEAMS.find((team) => team.id === id)

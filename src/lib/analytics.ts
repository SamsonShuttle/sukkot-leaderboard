import type { EventType, ScoreEvent, TeamId, TripDay } from '../types'
import { TEAM_IDS, teamById } from '../types'

export interface ReasonMetric {
  label: string
  points: number
  events: number
}

export interface TypeMetric {
  gained: number
  lost: number
  events: number
}

export interface TeamAnalytics {
  teamId: TeamId
  gained: number
  lost: number
  net: number
  eventCount: number
  gainedReasons: ReasonMetric[]
  lostReasons: ReasonMetric[]
  byType: Record<EventType, TypeMetric>
}

export interface DashboardAnalytics {
  throughDay: TripDay
  eventCount: number
  newPoints: number
  removedPoints: number
  movedPoints: number
  teams: Record<TeamId, TeamAnalytics>
  notes: ScoreEvent[]
}

const EVENT_TYPES: EventType[] = ['seed', 'add', 'deduct', 'transfer', 'tithe', 'atonement', 'undo']

function reasonLabel(event: ScoreEvent, direction: 'gained' | 'lost') {
  const source = teamById(event.sourceTeam)?.shortName
  const destination = teamById(event.destinationTeam)?.shortName
  if (event.reason) return event.reason
  if (event.type === 'seed') return 'Opening balance'
  if (event.type === 'add') return 'Unspecified award'
  if (event.type === 'deduct') return 'Unspecified deduction'
  if (event.type === 'transfer') return direction === 'gained' ? `Transfer from ${source}` : `Transfer to ${destination}`
  if (event.type === 'tithe') return 'Daily tithe'
  if (event.type === 'atonement') return 'Atonement'
  return 'Adjustment'
}

function addReason(metrics: Map<string, ReasonMetric>, label: string, points: number) {
  const current = metrics.get(label)
  if (current) {
    current.points += points
    current.events += 1
  } else {
    metrics.set(label, { label, points, events: 1 })
  }
}

const emptyTypeMetrics = () => Object.fromEntries(EVENT_TYPES.map((type) => [type, { gained: 0, lost: 0, events: 0 }])) as Record<EventType, TypeMetric>

const emptyTeamAnalytics = (teamId: TeamId): TeamAnalytics => ({
  teamId,
  gained: 0,
  lost: 0,
  net: 0,
  eventCount: 0,
  gainedReasons: [],
  lostReasons: [],
  byType: emptyTypeMetrics(),
})

export function effectiveEvents(events: ScoreEvent[]) {
  const undoneIds = new Set(events.filter((event) => event.reversesEventId).map((event) => event.reversesEventId))
  return events.filter((event) => event.type !== 'undo' && !undoneIds.has(event.id))
}

export function buildDashboardAnalytics(events: ScoreEvent[], throughDay: TripDay): DashboardAnalytics {
  const included = effectiveEvents(events).filter((event) => event.day <= throughDay)
  const reasonMaps = Object.fromEntries(TEAM_IDS.map((teamId) => [teamId, {
    gained: new Map<string, ReasonMetric>(),
    lost: new Map<string, ReasonMetric>(),
  }])) as Record<TeamId, { gained: Map<string, ReasonMetric>; lost: Map<string, ReasonMetric> }>
  const teams: Record<TeamId, TeamAnalytics> = {
    judah: emptyTeamAnalytics('judah'),
    israel: emptyTeamAnalytics('israel'),
    levi: emptyTeamAnalytics('levi'),
  }

  let newPoints = 0
  let removedPoints = 0
  let movedPoints = 0
  for (const event of included) {
    if (event.destinationTeam) {
      const team = teams[event.destinationTeam]
      team.gained += event.points
      team.net += event.points
      team.eventCount += 1
      team.byType[event.type].gained += event.points
      team.byType[event.type].events += 1
      addReason(reasonMaps[event.destinationTeam].gained, reasonLabel(event, 'gained'), event.points)
    }
    if (event.sourceTeam) {
      const team = teams[event.sourceTeam]
      team.lost += event.points
      team.net -= event.points
      team.eventCount += 1
      team.byType[event.type].lost += event.points
      team.byType[event.type].events += 1
      addReason(reasonMaps[event.sourceTeam].lost, reasonLabel(event, 'lost'), event.points)
    }
    if (event.destinationTeam && !event.sourceTeam) newPoints += event.points
    if (event.sourceTeam && !event.destinationTeam) removedPoints += event.points
    if (event.sourceTeam && event.destinationTeam) movedPoints += event.points
  }

  for (const teamId of TEAM_IDS) {
    teams[teamId].gainedReasons = [...reasonMaps[teamId].gained.values()].sort((a, b) => b.points - a.points)
    teams[teamId].lostReasons = [...reasonMaps[teamId].lost.values()].sort((a, b) => b.points - a.points)
  }

  return {
    throughDay,
    eventCount: included.length,
    newPoints,
    removedPoints,
    movedPoints,
    teams,
    notes: included.filter((event) => event.note).slice(0, 10),
  }
}

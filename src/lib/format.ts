import type { ScoreEvent, TeamId } from '../types'
import { teamById } from '../types'

export function eventLabel(event: ScoreEvent) {
  const source = teamById(event.sourceTeam)?.shortName
  const destination = teamById(event.destinationTeam)?.shortName
  switch (event.type) {
    case 'seed': return `${destination} opened with ${event.points}`
    case 'add': return `${destination} gained ${event.points}`
    case 'deduct': return `${source} lost ${event.points}`
    case 'transfer': return `${event.points} transferred ${source} → ${destination}`
    case 'tithe': return `${event.reason ?? 'Daily tithe'}: ${event.points} from ${source} → Levi`
    case 'atonement': return event.inventoryDelta === -1 && event.inventoryTeam
      ? `${teamById(event.inventoryTeam)?.shortName} offered an owned ${event.reason ?? 'Atonement'} · Levi gained ${event.points}`
      : `${event.reason ?? 'Atonement'}: ${event.points} from ${source} → Levi`
    case 'atonement_acquire': return `${teamById(event.inventoryTeam)?.shortName} found ${event.reason ?? 'an Atonement offering'}`
    case 'undo': return event.note || `Reversed ${event.points} points`
  }
}

export const formatTime = (iso: string) => new Intl.DateTimeFormat(undefined, {
  hour: 'numeric', minute: '2-digit',
}).format(new Date(iso))

export function scoreDeltaFor(event: ScoreEvent, teamId: TeamId) {
  return (event.destinationTeam === teamId ? event.points : 0) - (event.sourceTeam === teamId ? event.points : 0)
}

export function eventsToCsv(events: ScoreEvent[]) {
  const escape = (value: string | number | null) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const headers = ['id', 'day', 'timestamp', 'event_type', 'points', 'source_team', 'destination_team', 'reason', 'atonement_offering', 'inventory_team', 'inventory_delta', 'operator', 'note', 'reverses_event_id']
  const rows = events.map((event) => [event.id, event.day, event.createdAt, event.type, event.points, event.sourceTeam,
    event.destinationTeam, event.reason, event.atonementOffering, event.inventoryTeam, event.inventoryDelta, event.operator, event.note, event.reversesEventId].map(escape).join(','))
  return [headers.join(','), ...rows].join('\n')
}

export function downloadFile(contents: BlobPart, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  // WebKit may not begin reading the blob until after the click task ends.
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

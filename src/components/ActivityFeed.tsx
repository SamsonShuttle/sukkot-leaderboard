import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Gift, RotateCcw, Sparkles } from 'lucide-react'
import { useState } from 'react'
import type { DaySummary, ScoreEvent, ScoreReason, TripDay } from '../types'
import { eventLabel, formatTime } from '../lib/format'
import { atonementOfferingForReason } from '../config'
import { atonementOfferingById } from '../config'
import { calculateAtonementInventory } from '../data/ledger'
import { buildEventChains, type EventChain } from '../lib/eventChains'

const iconFor = (type: ScoreEvent['type']) => {
  if (type === 'undo') return <RotateCcw size={17} />
  if (type === 'atonement_acquire') return <Gift size={17} />
  if (type === 'tithe' || type === 'atonement') return <Sparkles size={17} />
  if (type === 'transfer') return <ArrowRight size={17} />
  if (type === 'deduct') return <ArrowDownLeft size={17} />
  return <ArrowUpRight size={17} />
}

const supportsReasonAnnotation = (event: ScoreEvent) => ['seed', 'add', 'deduct', 'transfer'].includes(event.type)

function EventReasonEditor({ event, reasons, onAddReason, onSave }: {
  event: ScoreEvent
  reasons: ScoreReason[]
  onAddReason: (label: string) => Promise<void>
  onSave: (eventId: string, reason: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [draftReason, setDraftReason] = useState(event.reason ?? '')
  const [newReason, setNewReason] = useState('')
  const [addingReason, setAddingReason] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const availableReasons = reasons.filter((reason) => reason.active || reason.label === event.reason)

  const close = (nextReason = event.reason ?? '') => {
    setOpen(false)
    setAddingReason(false)
    setNewReason('')
    setError('')
    setDraftReason(nextReason)
  }

  const saveNewReason = async () => {
    const cleanReason = newReason.trim()
    if (!cleanReason) return
    setBusy(true)
    setError('')
    try {
      await onAddReason(cleanReason)
      setDraftReason(cleanReason)
      setNewReason('')
      setAddingReason(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The reason could not be saved.')
    } finally { setBusy(false) }
  }

  const saveReason = async () => {
    if (!draftReason.trim()) {
      setError('Choose or enter a reason before saving.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await onSave(event.id, draftReason.trim())
      close(draftReason.trim())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The event reason could not be saved.')
    } finally { setBusy(false) }
  }

  if (!open) return <button className="ledger-reason-trigger" type="button" onClick={() => setOpen(true)}>{event.reason ? 'Change reason' : '＋ Add reason'}</button>

  return <div className="ledger-reason-editor">
    <div className="ledger-reason-row">
      <select aria-label={`${event.reason ? 'Change' : 'Add'} reason`} value={addingReason ? '__new__' : draftReason} onChange={(change) => { if (change.target.value === '__new__') { setAddingReason(true); return } setAddingReason(false); setDraftReason(change.target.value) }} disabled={busy}>
        <option value="">Choose a saved reason…</option>
        {availableReasons.map((reason) => <option value={reason.label} key={reason.id}>{reason.label}</option>)}
        <option value="__new__">＋ Add a new saved reason…</option>
      </select>
      <button type="button" onClick={() => void saveReason()} disabled={busy}>Save</button>
      <button type="button" onClick={() => close()} disabled={busy}>Cancel</button>
    </div>
    {addingReason ? <div className="ledger-new-reason-row"><input autoFocus maxLength={100} value={newReason} onChange={(change) => setNewReason(change.target.value)} placeholder="New saved reason" disabled={busy} /><button type="button" onClick={() => void saveNewReason()} disabled={busy || !newReason.trim()}>Add</button></div> : null}
    {error ? <p className="ledger-reason-error" role="alert">{error}</p> : null}
  </div>
}

function EventRow({ chain, locked, organizer, onUndo, showDay, reasons, onAddReason, onAddEventReason }: {
  chain: EventChain
  locked: boolean
  organizer: boolean
  onUndo?: (event: ScoreEvent) => void
  showDay: boolean
  reasons: ScoreReason[]
  onAddReason?: (label: string) => Promise<void>
  onAddEventReason?: (eventId: string, reason: string) => Promise<void>
}) {
  const { root: event, reversals, active } = chain
  const latestReversal = reversals.at(-1)
  const undone = !active
  const offering = event.type === 'atonement' ? atonementOfferingForReason(event.reason) : undefined
  const inventoryOffering = event.atonementOffering ? atonementOfferingById(event.atonementOffering) : offering
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={`activity-row type-${event.type}${undone ? ' is-undone' : ''}`}
    >
      <div className="activity-icon">{iconFor(event.type)}</div>
      {inventoryOffering ? <img className={`event-offering-art ${event.inventoryDelta === -1 ? 'used' : ''}`} src={inventoryOffering.imageUrl} alt="" /> : null}
      <div className="min-w-0 flex-1">
        <div className="activity-label">{showDay ? <span className="event-day-badge">Day {event.day}</span> : null}<span className="activity-original-text">{eventLabel(event)}</span></div>
        <div className="activity-meta">
          <span className="activity-original-text">
            {formatTime(event.createdAt)}
            {event.reason && event.type !== 'tithe' && event.type !== 'atonement' ? <> · {event.reason}</> : null}
            {event.operator ? <> · {event.operator}</> : null}
            {event.note ? <> · {event.note}</> : null}
          </span>
        </div>
        {organizer && onAddEventReason && onAddReason && supportsReasonAnnotation(event) ? <EventReasonEditor event={event} reasons={reasons} onAddReason={onAddReason} onSave={onAddEventReason} /> : null}
        {latestReversal ? <div className={`activity-undo-meta ${undone ? 'is-undone' : 'is-restored'}`}><RotateCcw size={13} aria-hidden="true" />{undone ? 'Undone' : 'Restored'} {formatTime(latestReversal.createdAt)}{latestReversal.day !== event.day ? <> · recorded on Day {latestReversal.day}</> : null}</div> : null}
      </div>
      {organizer && onUndo && event.type !== 'seed' && !locked ? (
        <button className="undo-button" onClick={() => onUndo(latestReversal ?? event)} title={undone ? 'Undo the latest undo and restore this action' : 'Create a compensating event'}>
          <RotateCcw size={16} /><span>{undone ? 'Undo undo' : 'Undo'}</span>
        </button>
      ) : null}
      {locked ? <span className="undone-label">Used</span> : null}
      {undone ? <span className="undone-label">Undone</span> : null}
    </motion.div>
  )
}

export function ActivityFeed({ events, limit = 8, onUndo, organizer = false, groupedByDay = false, daySummaries, activeDay, reasons = [], onAddReason, onAddEventReason }: {
  events: ScoreEvent[]
  limit?: number
  onUndo?: (event: ScoreEvent) => void
  organizer?: boolean
  groupedByDay?: boolean
  daySummaries?: DaySummary[]
  activeDay?: TripDay
  reasons?: ScoreReason[]
  onAddReason?: (label: string) => Promise<void>
  onAddEventReason?: (eventId: string, reason: string) => Promise<void>
}) {
  const chains = buildEventChains(events)
  const inventory = calculateAtonementInventory(events)
  const consumedAcquisitionIds = new Set(Object.values(inventory).flatMap((byOffering) => Object.values(byOffering).flatMap((tokens) => tokens.filter((token) => token.consumedByEventId).map((token) => token.acquisitionEventId))))

  if (groupedByDay && daySummaries && activeDay) {
    const dayActionChains = chains.filter((chain) => chain.root.day === activeDay)
    const dayEvents = dayActionChains.slice(0, limit)
    return (
      <div className="activity-list grouped-history">
        <section className="day-history-group active">
          <header className="day-history-header">
            <div><span>Day {activeDay}</span><small>{dayActionChains.length} {dayActionChains.length === 1 ? 'action' : 'actions'}</small></div>
            <strong>Active</strong>
          </header>
          <AnimatePresence initial={false}>
            {dayEvents.map((chain) => (
              <EventRow key={chain.root.id} chain={chain} locked={consumedAcquisitionIds.has(chain.root.id)} organizer={organizer} onUndo={onUndo} showDay={false} reasons={reasons} onAddReason={onAddReason} onAddEventReason={onAddEventReason} />
            ))}
          </AnimatePresence>
          {!dayEvents.length ? <div className="empty-day">No scoring events recorded for Day {activeDay}.</div> : null}
        </section>
      </div>
    )
  }

  const visible = chains.slice(0, limit)
  return (
    <div className="activity-list">
      <AnimatePresence initial={false}>
        {visible.map((chain) => (
          <EventRow key={chain.root.id} chain={chain} locked={consumedAcquisitionIds.has(chain.root.id)} organizer={organizer} onUndo={onUndo} showDay reasons={reasons} onAddReason={onAddReason} onAddEventReason={onAddEventReason} />
        ))}
      </AnimatePresence>
      {!visible.length ? <div className="empty-feed">Scoring activity will appear here.</div> : null}
    </div>
  )
}

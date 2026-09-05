import { useRef, useState } from 'react'
import {
  ArrowLeftRight, ChevronLeft, CircleMinus, CirclePlus, DatabaseBackup, Download,
  Droplets, FileDown, HeartHandshake, History, RotateCcw, Save, Settings2, Upload,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { SCORING_CONFIG } from '../config'
import { downloadFile, eventsToCsv } from '../lib/format'
import type { BackupData, EventType, NewScoreEvent, ReasonAppliesTo, ScoreboardState, ScoreEvent, TeamId, TitheRate, TripDay } from '../types'
import { TEAM_IDS, teamById } from '../types'
import { ActivityFeed } from './ActivityFeed'
import { AnimatedNumber } from './AnimatedNumber'
import { StatusPill } from './StatusPill'
import { DaySwitcher } from './DaySwitcher'
import { ReasonManager } from './ReasonManager'

type ActionMode = 'add' | 'deduct' | 'transfer' | 'tithe' | 'atonement'

const modeInfo: Record<ActionMode, { label: string; icon: typeof CirclePlus; helper: string }> = {
  add: { label: 'Add', icon: CirclePlus, helper: 'Award points to one house' },
  deduct: { label: 'Deduct', icon: CircleMinus, helper: 'Remove points from one house' },
  transfer: { label: 'Transfer', icon: ArrowLeftRight, helper: 'Move points between houses' },
  tithe: { label: SCORING_CONFIG.specialActions.tithe.label, icon: Droplets, helper: SCORING_CONFIG.specialActions.tithe.helper },
  atonement: { label: SCORING_CONFIG.specialActions.atonement.label, icon: HeartHandshake, helper: SCORING_CONFIG.specialActions.atonement.helper },
}

function ScoreForm({ state, onRecord, onApplyTithe }: {
  state: ScoreboardState
  onRecord: (input: NewScoreEvent) => Promise<void>
  onApplyTithe: (rate: TitheRate, operator?: string, note?: string) => Promise<void>
}) {
  const [mode, setMode] = useState<ActionMode>('add')
  const [team, setTeam] = useState<TeamId>('judah')
  const [destination, setDestination] = useState<TeamId>('israel')
  const [points, setPoints] = useState(10)
  const [operator, setOperator] = useState(() => localStorage.getItem('sukkot-operator') ?? '')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [reason, setReason] = useState('')
  const [atonementIndex, setAtonementIndex] = useState(0)
  const [titheRate, setTitheRate] = useState<TitheRate>(10)
  const atonement = SCORING_CONFIG.specialActions.atonement.options[atonementIndex]
  const special = mode === 'atonement'
  const InfoIcon = modeInfo[mode].icon

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    if (mode === 'tithe') {
      setBusy(true)
      try {
        localStorage.setItem('sukkot-operator', operator)
        await onApplyTithe(titheRate, operator, note)
        setNote('')
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Could not apply the daily tithe.')
      } finally { setBusy(false) }
      return
    }
    if (!Number.isSafeInteger(points) || points <= 0) return setError('Enter a positive whole number.')
    const needsConfirmation = points >= SCORING_CONFIG.largeActionConfirmationAt && mode !== 'add'
    if (needsConfirmation && !window.confirm(`Confirm ${modeInfo[mode].label.toLowerCase()} of ${points} points?`)) return
    const sourceTeam = mode === 'deduct' || mode === 'transfer' || special ? team : null
    const destinationTeam = mode === 'add' ? team : special ? 'levi' : mode === 'transfer' ? destination : null
    if (sourceTeam && sourceTeam === destinationTeam) return setError('Choose two different houses.')
    setBusy(true)
    try {
      localStorage.setItem('sukkot-operator', operator)
      const selectedReason = mode === 'atonement' ? atonement.label : reason
      await onRecord({ type: mode as Exclude<EventType, 'seed' | 'undo'>, points, sourceTeam, destinationTeam, operator, note, reason: selectedReason })
      setNote('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the score event.')
    } finally { setBusy(false) }
  }

  const selectMode = (next: ActionMode) => {
    setMode(next)
    setError('')
    setReason('')
    if (next === 'atonement') setPoints(SCORING_CONFIG.specialActions.atonement.options[0].points)
    if ((next === 'tithe' || next === 'atonement') && team === 'levi') setTeam('judah')
  }

  return (
    <div className="control-card score-control-card">
      <div className="control-card-heading"><div><p className="eyebrow">Score desk</p><h2>Record points</h2></div><Settings2 /></div>
      <div className="action-tabs" role="tablist">
        {(Object.keys(modeInfo) as ActionMode[]).map((key) => {
          const Icon = modeInfo[key].icon
          return <button key={key} role="tab" aria-selected={mode === key} className={mode === key ? 'active' : ''} onClick={() => selectMode(key)} type="button"><Icon /><span>{modeInfo[key].label}</span></button>
        })}
      </div>
      <motion.form role="tabpanel" key={mode} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} onSubmit={submit} className="score-form">
        <div className={`mode-callout mode-${mode}`}><InfoIcon /><div><strong>{modeInfo[mode].label}</strong><span>{modeInfo[mode].helper}</span></div></div>
        {mode !== 'tithe' ? <>
          <label className="field-label">{mode === 'add' ? 'Award to' : special ? 'Give from' : mode === 'deduct' ? 'Deduct from' : 'From'}</label>
          <div className="team-selector">
            {TEAM_IDS.filter((id) => !special || id !== 'levi').map((id) => (
              <button type="button" key={id} onClick={() => setTeam(id)} className={team === id ? 'active' : ''} style={{ '--team': teamById(id)?.color } as React.CSSProperties}>
                <img src={teamById(id)?.bannerUrl} alt="" /><span>{teamById(id)?.shortName}</span><small>{state.scores[id]} pts</small>
              </button>
            ))}
          </div>
        </> : null}
        {mode === 'transfer' && <><label className="field-label">To</label><div className="team-selector compact">
          {TEAM_IDS.map((id) => <button type="button" key={id} disabled={id === team} onClick={() => setDestination(id)} className={destination === id ? 'active' : ''} style={{ '--team': teamById(id)?.color } as React.CSSProperties}><span>{teamById(id)?.shortName}</span></button>)}
        </div></>}
        {special ? <div className={`levi-destination ${mode}`}><span>Flows to</span><img src={teamById('levi')?.bannerUrl} alt="" /><strong>House of Levi</strong></div> : null}
        {mode === 'add' || mode === 'deduct' ? <label className="select-field">Saved reason <span>optional</span><select value={reason} onChange={(event) => setReason(event.target.value)}><option value="">Choose a reason…</option>{state.reasons.filter((item) => item.active && (item.appliesTo === mode || item.appliesTo === 'both')).map((item) => <option value={item.label} key={item.id}>{item.label}</option>)}</select></label> : null}
        {mode === 'atonement' ? <label className="select-field">Atonement offering<select value={atonementIndex} onChange={(event) => { const index = Number(event.target.value); setAtonementIndex(index); setPoints(SCORING_CONFIG.specialActions.atonement.options[index].points) }}>{SCORING_CONFIG.specialActions.atonement.options.map((option, index) => <option value={index} key={option.label}>{option.label} — {option.points} points</option>)}</select></label> : null}
        {mode === 'tithe' ? <div className="tithe-panel">
          <div className="tithe-rate-picker" aria-label="Daily tithe percentage">{SCORING_CONFIG.specialActions.tithe.rates.map((rate) => <button type="button" className={titheRate === rate ? 'active' : ''} onClick={() => setTitheRate(rate)} key={rate}>{rate}%</button>)}</div>
          <p>Based on eligible net points earned on Day {state.session.activeDay}, before tithe:</p>
          <div className="tithe-preview"><span><strong>Judah</strong><small>{state.titheStatus.bases.judah} eligible</small><b>−{Math.round(state.titheStatus.bases.judah * titheRate / 100)}</b></span><span><strong>Israel</strong><small>{state.titheStatus.bases.israel} eligible</small><b>−{Math.round(state.titheStatus.bases.israel * titheRate / 100)}</b></span><span className="levi"><strong>Levi receives</strong><small>from both houses</small><b>+{Math.round(state.titheStatus.bases.judah * titheRate / 100) + Math.round(state.titheStatus.bases.israel * titheRate / 100)}</b></span></div>
          {state.titheStatus.appliedRate ? <div className="tithe-applied">A {state.titheStatus.appliedRate}% tithe has already been applied to Day {state.session.activeDay}. Undo its ledger events before applying another.</div> : null}
        </div> : <>
          {mode !== 'atonement' ? <><label className="field-label" htmlFor="points">Points</label><div className="points-entry"><button type="button" onClick={() => setPoints(Math.max(1, points - 1))}>−</button><input id="points" type="number" min="1" step="1" value={points} onChange={(event) => setPoints(Number(event.target.value))} /><button type="button" onClick={() => setPoints(points + 1)}>+</button></div><div className="quick-points">{SCORING_CONFIG.quickPointValues.map((value) => <button type="button" className={points === value ? 'active' : ''} key={value} onClick={() => setPoints(value)}>{value}</button>)}</div></> : <div className="fixed-points"><span>{atonement.label}</span><strong>{atonement.points} points</strong></div>}
        </>}
        <div className="form-pair"><label>Operator <span>optional</span><input value={operator} onChange={(event) => setOperator(event.target.value)} placeholder="Your name" /></label><label>{mode === 'atonement' ? 'Names / behaviour reason' : 'Note'} <span>optional</span><input value={note} onChange={(event) => setNote(event.target.value)} placeholder={mode === 'atonement' ? 'Who, and what duty or behaviour?' : 'Extra context'} /></label></div>
        {error && <p className="form-error">{error}</p>}
        <button className={`primary-action action-${mode}`} disabled={busy || (mode === 'tithe' && Boolean(state.titheStatus.appliedRate))}><Save />{busy ? 'Saving…' : mode === 'tithe' ? `Apply ${titheRate}% tithe to Judah & Israel` : `${modeInfo[mode].label} ${points} points`}</button>
        {points >= SCORING_CONFIG.largeActionConfirmationAt && mode !== 'add' && mode !== 'tithe' ? <p className="confirmation-hint">You’ll be asked to confirm this larger action.</p> : null}
      </motion.form>
    </div>
  )
}

function DataTools({ state, onNewEvent, onImport }: {
  state: ScoreboardState
  onNewEvent: (name: string, seeds: Partial<Record<TeamId, number>>) => Promise<void>
  onImport: (backup: BackupData) => Promise<void>
}) {
  const [showReset, setShowReset] = useState(false)
  const [name, setName] = useState('Sukkot Camp')
  const [seeds, setSeeds] = useState<Record<TeamId, number>>({ judah: 0, israel: 0, levi: 0 })
  const inputRef = useRef<HTMLInputElement>(null)

  const backup = async () => {
    window.dispatchEvent(new CustomEvent('request-backup'))
  }
  const importFile = async (file?: File) => {
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text()) as BackupData
      if (!window.confirm('Importing will replace all local leaderboard data. Continue?')) return
      await onImport(parsed)
    } catch (error) { window.alert(error instanceof Error ? error.message : 'Backup could not be imported.') }
    finally { if (inputRef.current) inputRef.current.value = '' }
  }
  return (
    <div className="control-card data-card">
      <div className="control-card-heading"><div><p className="eyebrow">Event data</p><h2>Backup & reset</h2></div><DatabaseBackup /></div>
      <div className="data-actions">
        <button onClick={backup}><Download />Backup JSON</button>
        <button onClick={() => downloadFile(eventsToCsv([...state.events].reverse()), `sukkot-events-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv')}><FileDown />History CSV</button>
        <button onClick={() => inputRef.current?.click()}><Upload />Import backup</button>
        <input ref={inputRef} hidden type="file" accept="application/json,.json" onChange={(event) => importFile(event.target.files?.[0])} />
        <button className="reset-trigger" onClick={() => setShowReset(!showReset)}><RotateCcw />Start new event</button>
      </div>
      {showReset && <form className="reset-form" onSubmit={async (event) => { event.preventDefault(); if (!window.confirm('Start a new event? The current event stays in backup history.')) return; await onNewEvent(name, seeds); setShowReset(false) }}>
        <h3>New event / reset scores</h3><p>This creates a fresh ledger. Previous sessions remain in the database.</p>
        <label>Event name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <div className="seed-grid">{TEAM_IDS.map((id) => <label key={id}>{teamById(id)?.shortName} seed<input type="number" min="0" step="1" value={seeds[id]} onChange={(event) => setSeeds({ ...seeds, [id]: Math.max(0, Number(event.target.value)) })} /></label>)}</div>
        <div className="reset-actions"><button type="button" onClick={() => setShowReset(false)}>Cancel</button><button type="submit">Start fresh ledger</button></div>
      </form>}
    </div>
  )
}

export function OrganizerView({ state, status, storageKind, onRecord, onApplyTithe, onUndo, onNewEvent, onImport, onSetDay, onAddReason, onSetReasonActive }: {
  state: ScoreboardState
  status: 'loading' | 'ready' | 'error'
  storageKind?: 'browser-sqlite' | 'tauri-sqlite'
  onRecord: (input: NewScoreEvent) => Promise<void>
  onApplyTithe: (rate: TitheRate, operator?: string, note?: string) => Promise<void>
  onUndo: (event: ScoreEvent) => Promise<void>
  onNewEvent: (name: string, seeds: Partial<Record<TeamId, number>>) => Promise<void>
  onImport: (backup: BackupData) => Promise<void>
  onSetDay: (day: TripDay) => Promise<void>
  onAddReason: (label: string, appliesTo: ReasonAppliesTo) => Promise<void>
  onSetReasonActive: (id: string, active: boolean) => Promise<void>
}) {
  return <main className="organizer-view">
    <header className="organizer-header"><div><a href="#/" className="back-link"><ChevronLeft />Projector view</a><p className="eyebrow">Organizer control</p><h1>{state.session.name}</h1></div><StatusPill status={status} storageKind={storageKind} /></header>
    <DaySwitcher activeDay={state.session.activeDay} summaries={state.daySummaries} onSelect={onSetDay} />
    <div className="score-context-label">Cumulative scores through Day {state.session.activeDay}</div>
    <section className="mini-scoreboard">{state.teams.map((team) => <div key={team.id} style={{ '--team': team.color, '--accent': team.accent } as React.CSSProperties}><img src={team.bannerUrl} alt="" /><span>{team.shortName}</span><AnimatedNumber value={state.scores[team.id]} /></div>)}</section>
    <div className="organizer-grid"><ScoreForm state={state} onRecord={onRecord} onApplyTithe={onApplyTithe} /><aside className="organizer-side"><div className="control-card history-card"><div className="control-card-heading"><div><p className="eyebrow">Immutable ledger</p><h2>History by day</h2></div><History /></div><ActivityFeed events={state.events} limit={50} organizer groupedByDay daySummaries={state.daySummaries} activeDay={state.session.activeDay} onUndo={(event) => void onUndo(event)} /></div><ReasonManager reasons={state.reasons} onAdd={onAddReason} onSetActive={onSetReasonActive} /><DataTools state={state} onNewEvent={onNewEvent} onImport={onImport} /></aside></div>
  </main>
}

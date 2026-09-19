import { useRef, useState } from 'react'
import {
  ArrowLeftRight, ChevronLeft, CircleMinus, CirclePlus, DatabaseBackup, Download,
  Droplets, FileDown, Gift, HardDriveDownload, HeartHandshake, History, RotateCcw, Save, Settings2, Sprout, Upload,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { ATONEMENT_OFFERINGS, ATONEMENT_OPTIONS, FRUITS_OF_THE_SPIRIT, SCORING_CONFIG } from '../config'
import { downloadFile, eventsToCsv } from '../lib/format'
import type { AddAtonementInput, ApplyAtonementInput, BackupData, ColorTheme, EventType, NewScoreEvent, ScoreboardState, ScoreEvent, TeamId, TitheRate, TripDay, WheelOutcomeId, WheelWeights } from '../types'
import { TEAM_IDS, teamById } from '../types'
import { ActivityFeed } from './ActivityFeed'
import { AnimatedNumber } from './AnimatedNumber'
import { StatusPill } from './StatusPill'
import { DaySwitcher } from './DaySwitcher'
import { ThemeToggle } from './ThemeToggle'
import { WHEEL_OUTCOMES } from '../config'
import { validateBackup } from '../data/ledger'

type ActionMode = 'add' | 'deduct' | 'transfer' | 'tithe' | 'atonement' | 'fruit' | 'inventory'

const modeInfo: Record<ActionMode, { label: string; icon: typeof CirclePlus; helper: string }> = {
  add: { label: 'Add', icon: CirclePlus, helper: 'Award points to one house' },
  deduct: { label: 'Deduct', icon: CircleMinus, helper: 'Remove points from one house' },
  transfer: { label: 'Transfer', icon: ArrowLeftRight, helper: 'Move points between houses' },
  tithe: { label: SCORING_CONFIG.specialActions.tithe.label, icon: Droplets, helper: SCORING_CONFIG.specialActions.tithe.helper },
  atonement: { label: SCORING_CONFIG.specialActions.atonement.label, icon: HeartHandshake, helper: SCORING_CONFIG.specialActions.atonement.helper },
  fruit: { label: 'Fruit of the Spirit', icon: Sprout, helper: SCORING_CONFIG.specialActions.fruit.helper },
  inventory: { label: 'Add Atonement', icon: Gift, helper: 'Add a found Atonement to Judah or Israel' },
}

function ScoreForm({ state, onRecord, onApplyTithe, onApplyAtonement, onAddAtonement, onAddReason }: {
  state: ScoreboardState
  onRecord: (input: NewScoreEvent) => Promise<void>
  onApplyTithe: (rate: TitheRate, operator?: string, note?: string) => Promise<void>
  onApplyAtonement: (input: ApplyAtonementInput) => Promise<void>
  onAddAtonement: (input: AddAtonementInput) => Promise<void>
  onAddReason: (label: string) => Promise<void>
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
  const [newReason, setNewReason] = useState('')
  const [addingReason, setAddingReason] = useState(false)
  const [reasonError, setReasonError] = useState('')
  const [atonementIndex, setAtonementIndex] = useState(0)
  const [titheRate, setTitheRate] = useState<TitheRate>(10)
  const [fruitId, setFruitId] = useState<(typeof FRUITS_OF_THE_SPIRIT)[number]['id']>('love')
  const atonement = SCORING_CONFIG.specialActions.atonement.options[atonementIndex]
  const fruit = FRUITS_OF_THE_SPIRIT.find((item) => item.id === fruitId)!
  const atonementPoints = 'rate' in atonement ? Math.max(0, Math.round(Math.max(0, state.scores[team]) * atonement.rate / 100)) : atonement.points
  const ownedAtonementCount = team === 'levi'
    ? 0
    : state.atonementInventory[team][atonement.id].filter((token) => !token.consumedByEventId).length
  const usesOwnedAtonement = mode === 'atonement' && ownedAtonementCount > 0
  const special = mode === 'atonement'
  const InfoIcon = modeInfo[mode].icon

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    if (mode === 'inventory') return
    if (mode === 'fruit') {
      setBusy(true)
      try {
        localStorage.setItem('sukkot-operator', operator)
        await onRecord({ type: 'add', points: SCORING_CONFIG.specialActions.fruit.points, destinationTeam: team, operator, note, reason: `Fruit of the Spirit · ${fruit.label}` })
        setNote('')
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Could not award the Fruit of the Spirit.')
      } finally { setBusy(false) }
      return
    }
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
    const submittedPoints = mode === 'atonement' ? atonementPoints : points
    if (!Number.isSafeInteger(submittedPoints) || submittedPoints <= 0) return setError(mode === 'atonement' && 'rate' in atonement ? `10% of ${teamById(team)?.shortName} is currently 0 points.` : 'Enter a positive whole number.')
    const needsConfirmation = submittedPoints >= SCORING_CONFIG.largeActionConfirmationAt && mode !== 'add'
    if (needsConfirmation && !window.confirm(`Confirm ${modeInfo[mode].label.toLowerCase()} of ${submittedPoints} points?`)) return
    const sourceTeam = mode === 'deduct' || mode === 'transfer' || special ? team : null
    const destinationTeam = mode === 'add' ? team : special ? 'levi' : mode === 'transfer' ? destination : null
    if (sourceTeam && sourceTeam === destinationTeam) return setError('Choose two different houses.')
    setBusy(true)
    try {
      localStorage.setItem('sukkot-operator', operator)
      if (mode === 'atonement') {
        await onApplyAtonement({ sourceTeam: team as ApplyAtonementInput['sourceTeam'], offeringId: atonement.id, operator, note })
      } else {
        await onRecord({ type: mode as Exclude<EventType, 'seed' | 'undo' | 'atonement_acquire'>, points: submittedPoints, sourceTeam, destinationTeam, operator, note, reason })
      }
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
    if ((next === 'tithe' || next === 'atonement' || next === 'inventory') && team === 'levi') setTeam('judah')
  }

  const saveReason = async () => {
    if (!newReason.trim()) return
    setReasonError('')
    try {
      await onAddReason(newReason)
      setReason(newReason.trim())
      setNewReason('')
      setAddingReason(false)
    } catch (cause) {
      setReasonError(cause instanceof Error ? cause.message : 'The reason could not be saved.')
    }
  }

  return (
    <div className="control-card score-control-card">
      <div className="control-card-heading"><div><p className="eyebrow">Score desk</p><h2>Record points</h2></div><Settings2 /></div>
      <div className="action-tabs" role="tablist">
        {(Object.keys(modeInfo) as ActionMode[]).map((key) => {
          const Icon = modeInfo[key].icon
          return <button key={key} data-mode={key} role="tab" aria-selected={mode === key} className={mode === key ? 'active' : ''} onClick={() => selectMode(key)} type="button"><Icon /><span>{modeInfo[key].label}</span></button>
        })}
      </div>
      <motion.form role="tabpanel" key={mode} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} onSubmit={submit} className="score-form">
        <div className={`mode-callout mode-${mode}`}><InfoIcon /><div><strong>{modeInfo[mode].label}</strong><span>{modeInfo[mode].helper}</span></div></div>
        {mode === 'inventory' ? <AtonementInventoryPanel state={state} onAddAtonement={onAddAtonement} /> : <>
        {mode !== 'tithe' ? <>
          <label className="field-label">{mode === 'add' || mode === 'fruit' ? 'Award to' : special ? 'Give from' : mode === 'deduct' ? 'Deduct from' : 'From'}</label>
          <div className="team-selector">
            {TEAM_IDS.filter((id) => !special || id !== 'levi').map((id) => (
              <button type="button" key={id} data-team={id} onClick={() => setTeam(id)} className={team === id ? 'active' : ''} style={{ '--team': teamById(id)?.color, '--tint': teamById(id)?.tint, '--accent': teamById(id)?.accent } as React.CSSProperties}>
                <span className="team-icon"><img src={teamById(id)?.bannerUrl} alt="" /></span><span className="team-option-name">{teamById(id)?.shortName}</span><small>{state.scores[id]} pts</small>
              </button>
            ))}
          </div>
        </> : null}
        {mode === 'transfer' && <><label className="field-label">To</label><div className="team-selector compact">
          {TEAM_IDS.map((id) => <button type="button" key={id} data-team={id} disabled={id === team} onClick={() => setDestination(id)} className={destination === id ? 'active' : ''} style={{ '--team': teamById(id)?.color, '--tint': teamById(id)?.tint, '--accent': teamById(id)?.accent } as React.CSSProperties}><span className="team-icon"><img src={teamById(id)?.bannerUrl} alt="" /></span><span className="team-option-name">{teamById(id)?.shortName}</span></button>)}
        </div></>}
        {special ? <div className={`levi-destination ${mode}`}><span>Flows to</span><img src={teamById('levi')?.bannerUrl} alt="" /><strong>House of Levi</strong></div> : null}
        {mode === 'add' || mode === 'deduct' ? <div className="saved-reason-control"><label className="select-field">Saved reason <span>optional</span><select value={reason} onChange={(event) => { if (event.target.value === '__new__') { setAddingReason(true); return } setReason(event.target.value) }}><option value="">Choose a reason…</option>{state.reasons.filter((item) => item.active).map((item) => <option value={item.label} key={item.id}>{item.label}</option>)}<option value="__new__">＋ Add a new saved reason…</option></select></label>{addingReason ? <div className="inline-reason-add"><input autoFocus maxLength={100} value={newReason} onChange={(event) => setNewReason(event.target.value)} placeholder="New reason" /><button type="button" onClick={() => void saveReason()} disabled={!newReason.trim()}>Add</button></div> : null}{reasonError ? <p className="form-error">{reasonError}</p> : null}</div> : null}
        {mode === 'fruit' ? <fieldset className="fruit-picker"><legend><strong>Fruit of the Spirit</strong><small>Galatians 5:22–23 · +5 points</small></legend><div>{FRUITS_OF_THE_SPIRIT.map((item) => <button type="button" key={item.id} className={fruitId === item.id ? 'active' : ''} aria-pressed={fruitId === item.id} onClick={() => setFruitId(item.id)}><span className="fruit-option-art" style={{ '--fruit-position': item.spritePosition } as React.CSSProperties} aria-hidden="true" /><span><strong>{item.label}</strong><small>{item.helper}</small></span></button>)}</div></fieldset> : null}
        {mode === 'atonement' ? <fieldset className="atonement-offering-picker"><legend>Atonement offering</legend><div>{SCORING_CONFIG.specialActions.atonement.options.map((option, index) => {
          const available = state.atonementInventory[team][option.id].filter((token) => !token.consumedByEventId).length
          const previewPoints = 'rate' in option ? Math.max(0, Math.round(Math.max(0, state.scores[team]) * option.rate / 100)) : option.points
          return <button type="button" key={option.id} aria-pressed={atonementIndex === index} className={atonementIndex === index ? 'active' : ''} onClick={() => { setAtonementIndex(index); if (!('rate' in option)) setPoints(option.points) }}><img src={option.imageUrl} alt="" /><span><strong>{option.label}</strong><small>{'rate' in option ? `${previewPoints} ${previewPoints === 1 ? 'point' : 'points'} · ${available} owned · ${option.rate}%` : `${option.points} points · ${available} owned`}</small></span></button>
        })}</div></fieldset> : null}
        {mode === 'tithe' ? <div className="tithe-panel">
          <div className="tithe-rate-picker" aria-label="Daily tithe percentage">{SCORING_CONFIG.specialActions.tithe.rates.map((rate) => <button type="button" className={titheRate === rate ? 'active' : ''} onClick={() => setTitheRate(rate)} key={rate}>{rate}%</button>)}</div>
          <p>Based on eligible net points earned on Day {state.session.activeDay}, before tithe:</p>
          <div className="tithe-preview"><span><strong>Judah</strong><small>{state.titheStatus.bases.judah} eligible</small><b>−{Math.round(state.titheStatus.bases.judah * titheRate / 100)}</b></span><span><strong>Israel</strong><small>{state.titheStatus.bases.israel} eligible</small><b>−{Math.round(state.titheStatus.bases.israel * titheRate / 100)}</b></span><span className="levi"><strong>Levi receives</strong><small>from both houses</small><b>+{Math.round(state.titheStatus.bases.judah * titheRate / 100) + Math.round(state.titheStatus.bases.israel * titheRate / 100)}</b></span></div>
          {state.titheStatus.appliedRate ? <div className="tithe-applied">A {state.titheStatus.appliedRate}% tithe has already been applied to Day {state.session.activeDay}. Undo its ledger events before applying another.</div> : null}
        </div> : <>
          {mode !== 'atonement' && mode !== 'fruit' ? <><label className="field-label" htmlFor="points">Points</label><div className="points-entry"><button type="button" onClick={() => setPoints(Math.max(1, points - 1))}>−</button><input id="points" type="number" min="1" step="1" value={points} onChange={(event) => setPoints(Number(event.target.value))} /><button type="button" onClick={() => setPoints(points + 1)}>+</button></div><div className="quick-points">{SCORING_CONFIG.quickPointValues.map((value) => <button type="button" className={points === value ? 'active' : ''} key={value} onClick={() => setPoints(value)}>{value}</button>)}</div></> : mode === 'fruit' ? <div className="fixed-points fruit-event-card"><span className="fruit-option-art" style={{ '--fruit-position': fruit.spritePosition } as React.CSSProperties} aria-hidden="true" /><div><span>Fruit of the Spirit · {fruit.label}</span><strong>+{SCORING_CONFIG.specialActions.fruit.points} points to {teamById(team)?.shortName}</strong><small>The fruit is saved permanently with this score event.</small></div></div> : <div className={`fixed-points atonement-event-card ${usesOwnedAtonement ? 'uses-owned' : ''}`}><img src={atonement.imageUrl} alt="" /><div><span>{atonement.label}</span><strong>{usesOwnedAtonement ? `Uses 1 owned ${atonement.label} · ${teamById(team)?.shortName} keeps its points` : 'rate' in atonement ? `${atonementPoints} points · ${atonement.rate}% of ${teamById(team)?.shortName}` : `${atonement.points} points taken from ${teamById(team)?.shortName}`}</strong>{usesOwnedAtonement ? <small>Levi still receives +{atonementPoints} points</small> : null}</div></div>}
        </>}
        <div className="form-pair"><label>Operator <span>optional</span><input value={operator} onChange={(event) => setOperator(event.target.value)} placeholder="Your name" /></label><label>{mode === 'atonement' ? 'Names / behaviour reason' : mode === 'fruit' ? 'Camp leader callout' : 'Note'} <span>optional</span><input value={note} onChange={(event) => setNote(event.target.value)} placeholder={mode === 'atonement' ? 'Who, and what duty or behaviour?' : mode === 'fruit' ? 'Who showed this fruit, and how?' : 'Extra context'} /></label></div>
        {error && <p className="form-error">{error}</p>}
        <button className={`primary-action action-${mode}`} disabled={busy || (mode === 'tithe' && Boolean(state.titheStatus.appliedRate)) || (mode === 'atonement' && atonementPoints <= 0)}><Save />{busy ? 'Saving…' : mode === 'tithe' ? `Apply ${titheRate}% tithe to Judah & Israel` : mode === 'fruit' ? `Award ${fruit.label} · +${SCORING_CONFIG.specialActions.fruit.points} points` : usesOwnedAtonement ? `Offer owned ${atonement.label} · Levi +${atonementPoints}` : `${modeInfo[mode].label} ${mode === 'atonement' ? atonementPoints : points} points`}</button>
        {(mode === 'atonement' ? atonementPoints : points) >= SCORING_CONFIG.largeActionConfirmationAt && mode !== 'add' && mode !== 'tithe' ? <p className="confirmation-hint">You’ll be asked to confirm this larger action.</p> : null}
        </>}
      </motion.form>
    </div>
  )
}

function AtonementInventoryPanel({ state, onAddAtonement }: {
  state: ScoreboardState
  onAddAtonement: (input: AddAtonementInput) => Promise<void>
}) {
  const [team, setTeam] = useState<AddAtonementInput['team']>('judah')
  const [offeringId, setOfferingId] = useState<AddAtonementInput['offeringId']>('turtle-dove')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const offering = ATONEMENT_OFFERINGS.find((item) => item.id === offeringId)!
  const leviReceiptTotal = Object.values(state.atonementReceipts).reduce((sum, count) => sum + count, 0)

  const add = async () => {
    setBusy(true)
    setFeedback('')
    try {
      await onAddAtonement({ team, offeringId, operator: localStorage.getItem('sukkot-operator') ?? undefined })
      setFeedback(`${offering.label} added to ${teamById(team)?.shortName}.`)
    } catch (cause) {
      setFeedback(cause instanceof Error ? cause.message : 'Could not add the Atonement offering.')
    } finally { setBusy(false) }
  }

  return <section className="atonement-inventory-panel">
    <p className="inventory-control-help">Judah and Israel can find offerings around camp. Levi receives them only when an Atonement is paid.</p>
    <div className="inventory-team-pills" aria-label="Team that found the Atonement">
      {(['judah', 'israel'] as const).map((id) => <button type="button" key={id} data-team={id} className={team === id ? 'active' : ''} onClick={() => setTeam(id)}><span style={{ background: teamById(id)?.color }} />{teamById(id)?.shortName}</button>)}
    </div>
    <div className="inventory-offering-picker" aria-label="Atonement offering">
      {ATONEMENT_OFFERINGS.map((item) => {
        const tokens = state.atonementInventory[team][item.id]
        const available = tokens.filter((token) => !token.consumedByEventId).length
        return <button type="button" key={item.id} className={offeringId === item.id ? 'active' : ''} aria-pressed={offeringId === item.id} onClick={() => setOfferingId(item.id)}><img src={item.imageUrl} alt="" /><span><strong>{item.label}</strong><small>{available} ready · {tokens.length} found</small></span></button>
      })}
    </div>
    <motion.button whileTap={{ scale: .98 }} className="inventory-add-button" type="button" disabled={busy} onClick={() => void add()}><Gift />{busy ? 'Adding…' : `Add ${offering.label} to ${teamById(team)?.shortName}`}</motion.button>
    {feedback ? <p className="inventory-feedback" role="status">{feedback}</p> : null}
    <div className="levi-receipt-summary">
      <header><span>Levi has received</span><small>{leviReceiptTotal} total · effective from both houses</small></header>
      <div>{ATONEMENT_OPTIONS.map((item) => <article key={item.id}><img src={item.imageUrl} alt="" /><span><strong>{item.label}</strong><b>{state.atonementReceipts[item.id]}</b></span></article>)}</div>
    </div>
  </section>
}

function DataTools({ state, storageKind, onNewEvent, onExportBackup, onExportDatabase, onImport }: {
  state: ScoreboardState
  storageKind?: 'browser-sqlite' | 'tauri-sqlite'
  onNewEvent: (name: string, seeds: Partial<Record<TeamId, number>>) => Promise<void>
  onExportBackup: () => Promise<BackupData>
  onExportDatabase: () => Promise<Uint8Array>
  onImport: (backup: unknown) => Promise<void>
}) {
  const [showReset, setShowReset] = useState(false)
  const [name, setName] = useState('Sukkot Camp')
  const [seeds, setSeeds] = useState<Record<TeamId, number>>({ judah: 0, israel: 0, levi: 0 })
  const [feedback, setFeedback] = useState<{ kind: 'busy' | 'success' | 'error'; message: string }>()
  const inputRef = useRef<HTMLInputElement>(null)

  const backup = async () => {
    setFeedback({ kind: 'busy', message: 'Preparing JSON backup…' })
    try {
      const data = await onExportBackup()
      downloadFile(JSON.stringify(data, null, 2), `sukkot-leaderboard-${new Date().toISOString().slice(0, 10)}.json`, 'application/json')
      setFeedback({ kind: 'success', message: 'JSON backup downloaded.' })
    } catch (error) { setFeedback({ kind: 'error', message: error instanceof Error ? error.message : 'Backup could not be created.' }) }
  }
  const exportCsv = () => {
    try {
      downloadFile(eventsToCsv([...state.events].reverse()), `sukkot-events-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8')
      setFeedback({ kind: 'success', message: 'History CSV downloaded.' })
    } catch (error) { setFeedback({ kind: 'error', message: error instanceof Error ? error.message : 'CSV could not be created.' }) }
  }
  const exportSqlite = async () => {
    setFeedback({ kind: 'busy', message: 'Preparing SQLite database…' })
    try {
      const bytes = await onExportDatabase()
      downloadFile(new Uint8Array(bytes), `sukkot-leaderboard-${new Date().toISOString().slice(0, 10)}.sqlite3`, 'application/vnd.sqlite3')
      setFeedback({ kind: 'success', message: 'SQLite database downloaded for inspection.' })
    } catch (error) { setFeedback({ kind: 'error', message: error instanceof Error ? error.message : 'SQLite database could not be exported.' }) }
  }
  const importFile = async (file?: File) => {
    if (!file) return
    try {
      setFeedback({ kind: 'busy', message: 'Checking backup…' })
      const parsed: unknown = JSON.parse(await file.text())
      validateBackup(parsed)
      if (!window.confirm('Importing will replace all local leaderboard data. Continue?')) {
        setFeedback({ kind: 'success', message: 'Import cancelled; local data was not changed.' })
        return
      }
      await onImport(parsed)
      setFeedback({ kind: 'success', message: 'Backup imported and database reloaded.' })
    } catch (error) { setFeedback({ kind: 'error', message: error instanceof Error ? error.message : 'Backup could not be imported.' }) }
    finally { if (inputRef.current) inputRef.current.value = '' }
  }
  return (
    <div className="settings-data-tools">
      <div className="data-actions">
        <button type="button" onClick={() => void backup()}><Download />Backup JSON</button>
        <button type="button" onClick={exportCsv}><FileDown />History CSV</button>
        {storageKind === 'browser-sqlite' ? <button type="button" onClick={() => void exportSqlite()}><HardDriveDownload />SQLite DB</button> : null}
        <button type="button" onClick={() => inputRef.current?.click()}><Upload />Import backup</button>
        <input ref={inputRef} hidden type="file" accept="application/json,.json" onChange={(event) => importFile(event.target.files?.[0])} />
        <button className="reset-trigger" type="button" onClick={() => setShowReset(!showReset)}><RotateCcw />Start new event</button>
      </div>
      {feedback ? <p className={`data-feedback ${feedback.kind}`} role="status">{feedback.message}</p> : null}
      {showReset && <form className="reset-form" onSubmit={async (event) => { event.preventDefault(); if (!window.confirm('Start a new event? The current event stays in backup history.')) return; await onNewEvent(name, seeds); setShowReset(false) }}>
        <h3>New event / reset scores</h3><p>This creates a fresh ledger. Previous sessions remain in the database.</p>
        <label>Event name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <div className="seed-grid">{TEAM_IDS.map((id) => <label key={id}>{teamById(id)?.shortName} seed<input type="number" min="0" step="1" value={seeds[id]} onChange={(event) => setSeeds({ ...seeds, [id]: Math.max(0, Number(event.target.value)) })} /></label>)}</div>
        <div className="reset-actions"><button type="button" onClick={() => setShowReset(false)}>Cancel</button><button type="submit">Start fresh ledger</button></div>
      </form>}
    </div>
  )
}

function OrganizerSettings({ state, storageKind, onNewEvent, onExportBackup, onExportDatabase, onImport, onSetWheelWeights }: {
  state: ScoreboardState
  storageKind?: 'browser-sqlite' | 'tauri-sqlite'
  onNewEvent: (name: string, seeds: Partial<Record<TeamId, number>>) => Promise<void>
  onExportBackup: () => Promise<BackupData>
  onExportDatabase: () => Promise<Uint8Array>
  onImport: (backup: unknown) => Promise<void>
  onSetWheelWeights: (weights: WheelWeights) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState<WheelOutcomeId>()
  const updateWeight = async (id: WheelOutcomeId, weight: number) => {
    setSaving(id)
    try { await onSetWheelWeights({ ...state.wheelWeights, [id]: weight }) }
    finally { setSaving(undefined) }
  }
  return <div className="organizer-settings">
    <button className="icon-button" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="organizer-settings-menu" title="Organizer settings" aria-label="Organizer settings"><Settings2 /></button>
    {open ? <section id="organizer-settings-menu" className="settings-menu" aria-label="Organizer settings">
      <header><div><p className="eyebrow">Organizer settings</p><h2>Wheel odds & event data</h2></div><DatabaseBackup /></header>
      <p className="settings-help">Higher weights make an outcome more likely. “Off” removes it from the wheel.</p>
      <div className="wheel-weight-list">
        {WHEEL_OUTCOMES.map((outcome) => <label key={outcome.id}>{outcome.imageUrl ? <img className="wheel-weight-art" src={outcome.imageUrl} alt="" /> : null}<span><strong>{outcome.label}</strong><small>{outcome.detail}</small></span><select value={state.wheelWeights[outcome.id]} disabled={saving === outcome.id} onChange={(event) => void updateWeight(outcome.id, Number(event.target.value))}><option value="0">Off</option><option value="1">Rare</option><option value="2">Low</option><option value="3">Standard</option><option value="4">Likely</option><option value="5">Favoured</option></select></label>)}
      </div>
      <div className="settings-event-data"><p className="eyebrow">Event data</p><DataTools state={state} storageKind={storageKind} onNewEvent={onNewEvent} onExportBackup={onExportBackup} onExportDatabase={onExportDatabase} onImport={onImport} /></div>
    </section> : null}
  </div>
}

export function OrganizerView({ state, status, storageKind, theme, onToggleTheme, onRecord, onApplyTithe, onApplyAtonement, onAddAtonement, onUndo, onNewEvent, onExportBackup, onExportDatabase, onImport, onSetDay, onAddReason, onAddEventReason, onSetWheelWeights }: {
  state: ScoreboardState
  status: 'loading' | 'ready' | 'error'
  storageKind?: 'browser-sqlite' | 'tauri-sqlite'
  theme: ColorTheme
  onToggleTheme: () => void
  onRecord: (input: NewScoreEvent) => Promise<void>
  onApplyTithe: (rate: TitheRate, operator?: string, note?: string) => Promise<void>
  onApplyAtonement: (input: ApplyAtonementInput) => Promise<void>
  onAddAtonement: (input: AddAtonementInput) => Promise<void>
  onUndo: (event: ScoreEvent) => Promise<void>
  onNewEvent: (name: string, seeds: Partial<Record<TeamId, number>>) => Promise<void>
  onExportBackup: () => Promise<BackupData>
  onExportDatabase: () => Promise<Uint8Array>
  onImport: (backup: unknown) => Promise<void>
  onSetDay: (day: TripDay) => Promise<void>
  onAddReason: (label: string) => Promise<void>
  onAddEventReason: (eventId: string, reason: string) => Promise<void>
  onSetWheelWeights: (weights: WheelWeights) => Promise<void>
}) {
  return <main className="organizer-view">
    <header className="organizer-header"><a href="#/" className="back-link"><ChevronLeft />Control centre</a><section className="mini-scoreboard" aria-label="Current event totals">{state.teams.map((team) => <div key={team.id} data-team={team.id} style={{ '--team': team.color, '--accent': team.accent, '--tint': team.tint, '--team-ink': team.foreground } as React.CSSProperties}><img src={team.bannerUrl} alt="" /><span>{team.shortName}</span><AnimatedNumber value={state.scores[team.id]} /></div>)}</section><div className="header-actions"><StatusPill status={status} storageKind={storageKind} compact /><ThemeToggle theme={theme} onToggle={onToggleTheme} /><OrganizerSettings state={state} storageKind={storageKind} onNewEvent={onNewEvent} onExportBackup={onExportBackup} onExportDatabase={onExportDatabase} onImport={onImport} onSetWheelWeights={onSetWheelWeights} /></div></header>
    <DaySwitcher activeDay={state.session.activeDay} summaries={state.daySummaries} onSelect={onSetDay} />
    <div className="score-context-label">Current event totals · New entries and undos are tagged Day {state.session.activeDay}</div>
    <div className="organizer-grid"><ScoreForm state={state} onRecord={onRecord} onApplyTithe={onApplyTithe} onApplyAtonement={onApplyAtonement} onAddAtonement={onAddAtonement} onAddReason={onAddReason} /><aside className="organizer-side"><div className="control-card history-card"><div className="control-card-heading"><div><p className="eyebrow">Immutable ledger</p><h2>Day {state.session.activeDay} activity</h2></div><History /></div><ActivityFeed events={state.events} limit={50} organizer groupedByDay daySummaries={state.daySummaries} activeDay={state.session.activeDay} reasons={state.reasons} onAddReason={onAddReason} onAddEventReason={onAddEventReason} onUndo={(event) => void onUndo(event)} /></div></aside></div>
  </main>
}

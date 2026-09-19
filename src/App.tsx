import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, LoaderCircle } from 'lucide-react'
import { ScoreLedger } from './data/ledger'
import { createDatabaseProfile, deleteDatabaseProfile, getDatabaseCatalog, selectDatabaseProfile, type DatabaseCatalog } from './data/database'
import type { AddAtonementInput, ApplyAtonementInput, ColorTheme, NewScoreEvent, ScoreboardState, ScoreEvent, TeamId, TitheRate, TripDay, WheelWeights } from './types'
import { TEAMS } from './types'
import { PublicLeaderboard } from './components/PublicLeaderboard'
import { OrganizerView } from './components/OrganizerView'
import { DataDashboard } from './components/DataDashboard'
import { CertificatesView } from './components/CertificatesView'
import { HomeView } from './components/HomeView'
import { eventMomentDuration } from './components/TransferMoment'

const updates = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('sukkot-leaderboard-updates')
const THEME_STORAGE_KEY = 'sukkot-color-theme'

const initialTheme = (): ColorTheme => {
  const documentTheme = document.documentElement.dataset.theme
  if (documentTheme === 'light' || documentTheme === 'dark') return documentTheme
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
  return 'light'
}

const emptyState: ScoreboardState = {
  session: { id: '', name: 'Sukkot Camp Leaderboard', createdAt: '', activeDay: 1 },
  teams: TEAMS,
  scores: { judah: 0, israel: 0, levi: 0 },
  events: [],
  daySummaries: Array.from({ length: 8 }, (_, index) => ({
    day: (index + 1) as TripDay,
    eventCount: 0,
    changes: { judah: 0, israel: 0, levi: 0 },
    closingScores: { judah: 0, israel: 0, levi: 0 },
  })),
  reasons: [],
  titheStatus: { day: 1, bases: { judah: 0, israel: 0 }, appliedRate: null },
  wheelWeights: { 'tithe-10': 2, 'turtle-dove': 3, ram: 2, ox: 1, 'free-pass': 2, 'spin-again': 1 },
  atonementInventory: {
    judah: { 'turtle-dove': [], ram: [], ox: [], 'tithe-10': [] },
    israel: { 'turtle-dove': [], ram: [], ox: [], 'tithe-10': [] },
    levi: { 'turtle-dove': [], ram: [], ox: [], 'tithe-10': [] },
  },
  atonementReceipts: { 'turtle-dove': 0, ram: 0, ox: 0, 'tithe-10': 0 },
  certificates: [],
}

export default function App() {
  const [ledger, setLedger] = useState<ScoreLedger>()
  const [catalog, setCatalog] = useState<DatabaseCatalog>(() => getDatabaseCatalog())
  const [state, setState] = useState<ScoreboardState>(emptyState)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [latestEvent, setLatestEvent] = useState<ScoreEvent>()
  const [route, setRoute] = useState(window.location.hash)
  const [theme, setTheme] = useState<ColorTheme>(initialTheme)
  const activeDatabase = catalog.databases.find((database) => database.id === catalog.activeId) ?? catalog.databases[0]

  const refresh = useCallback(async (activeLedger: ScoreLedger) => setState(await activeLedger.getState()), [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#081327' : '#F3E8CE')
    try { localStorage.setItem(THEME_STORAGE_KEY, theme) } catch { /* Keep the in-memory preference. */ }
  }, [theme])

  useEffect(() => {
    const syncTheme = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY && (event.newValue === 'light' || event.newValue === 'dark')) setTheme(event.newValue)
    }
    window.addEventListener('storage', syncTheme)
    return () => window.removeEventListener('storage', syncTheme)
  }, [])

  useEffect(() => {
    const hashChange = () => setRoute(window.location.hash)
    window.addEventListener('hashchange', hashChange)
    return () => window.removeEventListener('hashchange', hashChange)
  }, [])

  useEffect(() => {
    let mounted = true
    let opened: ScoreLedger | undefined
    setLedger(undefined)
    setStatus('loading')
    setError('')
    ScoreLedger.open(activeDatabase.id).then(async (nextLedger) => {
      opened = nextLedger
      if (!mounted) { await nextLedger.close(); return }
      setLedger(nextLedger)
      await refresh(nextLedger)
      setStatus('ready')
    }).catch((cause) => {
      if (!mounted) return
      setError(cause instanceof Error ? cause.message : 'The local database could not be opened.')
      setStatus('error')
    })
    return () => { mounted = false; if (opened) void opened.close() }
  }, [activeDatabase.id, refresh])

  useEffect(() => {
    if (!ledger || !updates) return
    const receiveUpdate = async (message?: MessageEvent<{ type?: string; event?: ScoreEvent; databaseId?: string }>) => {
      if (message?.data?.type === 'database-library-changed') {
        setCatalog(getDatabaseCatalog())
        return
      }
      if (message?.data?.databaseId && message.data.databaseId !== activeDatabase.id) {
        setCatalog(getDatabaseCatalog())
        return
      }
      await ledger.reload()
      await refresh(ledger)
      const event = message?.data?.event
      if (event) {
        setLatestEvent(event)
        window.setTimeout(() => setLatestEvent((current) => current?.id === event.id ? undefined : current), eventMomentDuration(event))
      }
    }
    updates.addEventListener('message', receiveUpdate)
    const checkWhenVisible = () => { if (document.visibilityState === 'visible') void receiveUpdate() }
    document.addEventListener('visibilitychange', checkWhenVisible)
    return () => {
      updates.removeEventListener('message', receiveUpdate)
      document.removeEventListener('visibilitychange', checkWhenVisible)
    }
  }, [activeDatabase.id, ledger, refresh])

  if (status === 'loading') return <div className="app-loading"><LoaderCircle className="animate-spin" /><h1>Opening the score ledger…</h1><p>Preparing local SQLite storage</p></div>
  if (status === 'error' || !ledger) return <div className="app-error"><AlertTriangle /><h1>Database unavailable</h1><p>{error}</p><button onClick={() => window.location.reload()}>Try again</button></div>

  const record = async (input: NewScoreEvent) => {
    const event = await ledger.record(input)
    await refresh(ledger)
    setLatestEvent(event)
    updates?.postMessage({ type: 'scores-changed', event })
    window.setTimeout(() => setLatestEvent((current) => current?.id === event.id ? undefined : current), eventMomentDuration(event))
  }
  const undo = async (event: ScoreEvent) => {
    const compensation = await ledger.undo(event.id, localStorage.getItem('sukkot-operator') ?? undefined)
    await refresh(ledger)
    setLatestEvent(compensation)
    updates?.postMessage({ type: 'scores-changed', event: compensation })
    window.setTimeout(() => setLatestEvent((current) => current?.id === compensation.id ? undefined : current), eventMomentDuration(compensation))
  }
  const newEvent = async (name: string, seeds: Partial<Record<TeamId, number>>) => { await ledger.startNewEvent(name, seeds); await refresh(ledger); setLatestEvent(undefined); updates?.postMessage({ type: 'scores-changed' }) }
  const exportBackup = () => ledger.exportBackup()
  const exportDatabase = () => ledger.exportDatabase()
  const importBackup = async (backup: unknown) => { await ledger.importBackup(backup); await refresh(ledger); setLatestEvent(undefined); updates?.postMessage({ type: 'scores-changed' }) }
  const setActiveDay = async (day: TripDay) => { await ledger.setActiveDay(day); await refresh(ledger); setLatestEvent(undefined); updates?.postMessage({ type: 'scores-changed' }) }
  const addReason = async (label: string) => { await ledger.addReason(label); await refresh(ledger); updates?.postMessage({ type: 'scores-changed' }) }
  const addEventReason = async (eventId: string, reason: string) => { await ledger.addEventReason(eventId, reason, localStorage.getItem('sukkot-operator') ?? undefined); await refresh(ledger); updates?.postMessage({ type: 'scores-changed' }) }
  const setWheelWeights = async (weights: WheelWeights) => { await ledger.setWheelWeights(weights); await refresh(ledger); updates?.postMessage({ type: 'scores-changed' }) }
  const selectDatabase = async (id: string) => {
    const next = selectDatabaseProfile(id)
    setCatalog(next)
    setLatestEvent(undefined)
    updates?.postMessage({ type: 'database-changed', databaseId: id })
  }
  const createDatabase = async (name: string) => {
    const next = createDatabaseProfile(name)
    setCatalog(next)
    setLatestEvent(undefined)
    updates?.postMessage({ type: 'database-changed', databaseId: next.activeId })
  }
  const deleteDatabase = async (id: string) => {
    const next = await deleteDatabaseProfile(id, ledger.storageKind)
    setCatalog(next)
    updates?.postMessage({ type: 'database-library-changed', databaseId: next.activeId })
  }
  const addCertificate = async (title: string, winner?: string, citation?: string) => { await ledger.addCertificate(title, winner, citation); await refresh(ledger); updates?.postMessage({ type: 'scores-changed' }) }
  const updateCertificate = async (id: string, title: string, winner?: string, citation?: string) => { await ledger.updateCertificate(id, title, winner, citation); await refresh(ledger); updates?.postMessage({ type: 'scores-changed' }) }
  const deleteCertificate = async (id: string) => { await ledger.deleteCertificate(id); await refresh(ledger); updates?.postMessage({ type: 'scores-changed' }) }
  const applyDailyTithe = async (rate: TitheRate, operator?: string, note?: string) => {
    const events = await ledger.applyDailyTithe(rate, operator, note)
    await refresh(ledger)
    const event = events.at(-1)
    setLatestEvent(event)
    updates?.postMessage({ type: 'scores-changed', event })
    if (event) window.setTimeout(() => setLatestEvent((current) => current?.id === event.id ? undefined : current), eventMomentDuration(event))
  }
  const addAtonement = async (input: AddAtonementInput) => {
    const event = await ledger.addAtonement(input)
    await refresh(ledger)
    setLatestEvent(event)
    updates?.postMessage({ type: 'scores-changed', event })
    window.setTimeout(() => setLatestEvent((current) => current?.id === event.id ? undefined : current), eventMomentDuration(event))
  }
  const applyAtonement = async (input: ApplyAtonementInput) => {
    const event = await ledger.applyAtonement(input)
    await refresh(ledger)
    setLatestEvent(event)
    updates?.postMessage({ type: 'scores-changed', event })
    window.setTimeout(() => setLatestEvent((current) => current?.id === event.id ? undefined : current), eventMomentDuration(event))
  }
  const organizer = route.startsWith('#/organizer')
  const dashboard = route.startsWith('#/dashboard')
  const certificates = route.startsWith('#/certificates')
  const projector = route.startsWith('#/projector')
  const toggleTheme = () => setTheme((current) => current === 'light' ? 'dark' : 'light')

  if (organizer) return <OrganizerView state={state} status={status} storageKind={ledger.storageKind} theme={theme} onToggleTheme={toggleTheme} onRecord={record} onApplyTithe={applyDailyTithe} onApplyAtonement={applyAtonement} onAddAtonement={addAtonement} onUndo={undo} onNewEvent={newEvent} onExportBackup={exportBackup} onExportDatabase={exportDatabase} onImport={importBackup} onSetDay={setActiveDay} onAddReason={addReason} onAddEventReason={addEventReason} onSetWheelWeights={setWheelWeights} />
  if (dashboard) return <DataDashboard state={state} status={status} storageKind={ledger.storageKind} theme={theme} onToggleTheme={toggleTheme} />
  if (certificates) return <CertificatesView state={state} status={status} storageKind={ledger.storageKind} theme={theme} onToggleTheme={toggleTheme} onAdd={addCertificate} onUpdate={updateCertificate} onDelete={deleteCertificate} admin={route.startsWith('#/certificates-admin')} />
  if (projector) return <PublicLeaderboard state={state} status={status} storageKind={ledger.storageKind} latestEvent={latestEvent} theme={theme} onToggleTheme={toggleTheme} />
  return <HomeView state={state} status={status} storageKind={ledger.storageKind} theme={theme} onToggleTheme={toggleTheme} activeDatabase={activeDatabase} databases={catalog.databases} onSelectDatabase={selectDatabase} onCreateDatabase={createDatabase} onDeleteDatabase={deleteDatabase} />
}

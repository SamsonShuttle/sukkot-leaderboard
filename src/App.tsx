import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, LoaderCircle } from 'lucide-react'
import { ScoreLedger } from './data/ledger'
import type { BackupData, ColorTheme, NewScoreEvent, ReasonAppliesTo, ScoreboardState, ScoreEvent, TeamId, TitheRate, TripDay } from './types'
import { TEAMS } from './types'
import { PublicLeaderboard } from './components/PublicLeaderboard'
import { OrganizerView } from './components/OrganizerView'
import { downloadFile } from './lib/format'
import { DataDashboard } from './components/DataDashboard'

let openLedgerPromise: Promise<ScoreLedger> | undefined
const openLedger = () => openLedgerPromise ??= ScoreLedger.open()
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
}

export default function App() {
  const [ledger, setLedger] = useState<ScoreLedger>()
  const [state, setState] = useState<ScoreboardState>(emptyState)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [latestEvent, setLatestEvent] = useState<ScoreEvent>()
  const [route, setRoute] = useState(window.location.hash)
  const [theme, setTheme] = useState<ColorTheme>(initialTheme)

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
    openLedger().then(async (opened) => {
      if (!mounted) return
      setLedger(opened)
      await refresh(opened)
      setStatus('ready')
    }).catch((cause) => {
      setError(cause instanceof Error ? cause.message : 'The local database could not be opened.')
      setStatus('error')
    })
    return () => { mounted = false }
  }, [refresh])

  useEffect(() => {
    if (!ledger || !updates) return
    const receiveUpdate = async (message?: MessageEvent<{ event?: ScoreEvent }>) => {
      await ledger.reload()
      await refresh(ledger)
      const event = message?.data?.event
      if (event) {
        setLatestEvent(event)
        window.setTimeout(() => setLatestEvent((current) => current?.id === event.id ? undefined : current), 3400)
      }
    }
    updates.addEventListener('message', receiveUpdate)
    const checkWhenVisible = () => { if (document.visibilityState === 'visible') void receiveUpdate() }
    document.addEventListener('visibilitychange', checkWhenVisible)
    return () => {
      updates.removeEventListener('message', receiveUpdate)
      document.removeEventListener('visibilitychange', checkWhenVisible)
    }
  }, [ledger, refresh])

  useEffect(() => {
    const handler = async () => {
      if (!ledger) return
      const data = await ledger.exportBackup()
      downloadFile(JSON.stringify(data, null, 2), `sukkot-leaderboard-${new Date().toISOString().slice(0, 10)}.json`, 'application/json')
    }
    window.addEventListener('request-backup', handler)
    return () => window.removeEventListener('request-backup', handler)
  }, [ledger])

  if (status === 'loading') return <div className="app-loading"><LoaderCircle className="animate-spin" /><h1>Opening the score ledger…</h1><p>Preparing local SQLite storage</p></div>
  if (status === 'error' || !ledger) return <div className="app-error"><AlertTriangle /><h1>Database unavailable</h1><p>{error}</p><button onClick={() => window.location.reload()}>Try again</button></div>

  const record = async (input: NewScoreEvent) => {
    const event = await ledger.record(input)
    await refresh(ledger)
    setLatestEvent(event)
    updates?.postMessage({ type: 'scores-changed', event })
    window.setTimeout(() => setLatestEvent((current) => current?.id === event.id ? undefined : current), 3400)
  }
  const undo = async (event: ScoreEvent) => {
    const compensation = await ledger.undo(event.id, localStorage.getItem('sukkot-operator') ?? undefined)
    await refresh(ledger)
    setLatestEvent(compensation)
    updates?.postMessage({ type: 'scores-changed', event: compensation })
  }
  const newEvent = async (name: string, seeds: Partial<Record<TeamId, number>>) => { await ledger.startNewEvent(name, seeds); await refresh(ledger); setLatestEvent(undefined); updates?.postMessage({ type: 'scores-changed' }) }
  const importBackup = async (backup: BackupData) => { await ledger.importBackup(backup); await refresh(ledger); setLatestEvent(undefined); updates?.postMessage({ type: 'scores-changed' }) }
  const setActiveDay = async (day: TripDay) => { await ledger.setActiveDay(day); await refresh(ledger); setLatestEvent(undefined); updates?.postMessage({ type: 'scores-changed' }) }
  const addReason = async (label: string, appliesTo: ReasonAppliesTo) => { await ledger.addReason(label, appliesTo); await refresh(ledger); updates?.postMessage({ type: 'scores-changed' }) }
  const setReasonActive = async (id: string, active: boolean) => { await ledger.setReasonActive(id, active); await refresh(ledger); updates?.postMessage({ type: 'scores-changed' }) }
  const applyDailyTithe = async (rate: TitheRate, operator?: string, note?: string) => {
    const events = await ledger.applyDailyTithe(rate, operator, note)
    await refresh(ledger)
    const event = events.at(-1)
    setLatestEvent(event)
    updates?.postMessage({ type: 'scores-changed', event })
  }
  const organizer = route.startsWith('#/organizer')
  const dashboard = route.startsWith('#/dashboard')
  const toggleTheme = () => setTheme((current) => current === 'light' ? 'dark' : 'light')

  if (organizer) return <OrganizerView state={state} status={status} storageKind={ledger.storageKind} theme={theme} onToggleTheme={toggleTheme} onRecord={record} onApplyTithe={applyDailyTithe} onUndo={undo} onNewEvent={newEvent} onImport={importBackup} onSetDay={setActiveDay} onAddReason={addReason} onSetReasonActive={setReasonActive} />
  if (dashboard) return <DataDashboard state={state} status={status} storageKind={ledger.storageKind} theme={theme} onToggleTheme={toggleTheme} />
  return <PublicLeaderboard state={state} status={status} storageKind={ledger.storageKind} latestEvent={latestEvent} theme={theme} onToggleTheme={toggleTheme} />
}

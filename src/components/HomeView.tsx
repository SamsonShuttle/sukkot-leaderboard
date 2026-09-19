import { Award, ChartNoAxesCombined, Database, MonitorPlay, Plus, Settings2, TentTree, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { DatabaseProfile } from '../data/database'
import type { ColorTheme, ScoreboardState } from '../types'
import { StatusPill } from './StatusPill'
import { ThemeToggle } from './ThemeToggle'

type Destination = {
  href: string
  title: string
  description: string
  label: string
  icon: typeof MonitorPlay
  tone: 'projector' | 'organizer' | 'dashboard' | 'certificates' | 'studio'
}

const destinations: Destination[] = [
  {
    href: '#/projector',
    title: 'Projector board',
    description: 'The large, public live leaderboard for the room display.',
    label: 'Open projector',
    icon: MonitorPlay,
    tone: 'projector',
  },
  {
    href: '#/organizer',
    title: 'Organizer desk',
    description: 'Record scores, manage the active day, and access backups and settings.',
    label: 'Open organizer',
    icon: Settings2,
    tone: 'organizer',
  },
  {
    href: '#/dashboard',
    title: 'Data dashboard',
    description: 'Show whole-event score movement, point sources, and team flow.',
    label: 'Open dashboard',
    icon: ChartNoAxesCombined,
    tone: 'dashboard',
  },
  {
    href: '#/certificates',
    title: 'Awards gallery',
    description: 'Reveal awards-night certificates when the room is ready.',
    label: 'Open gallery',
    icon: Award,
    tone: 'certificates',
  },
  {
    href: '#/certificates-admin',
    title: 'Certificate studio',
    description: 'Create and prepare awards, winners, and citations locally.',
    label: 'Open studio',
    icon: Award,
    tone: 'studio',
  },
]

export function HomeView({ state, status, storageKind, theme, onToggleTheme, activeDatabase, databases, onSelectDatabase, onCreateDatabase, onDeleteDatabase }: {
  state: ScoreboardState
  status: 'loading' | 'ready' | 'error'
  storageKind?: 'browser-sqlite' | 'tauri-sqlite'
  theme: ColorTheme
  onToggleTheme: () => void
  activeDatabase: DatabaseProfile
  databases: DatabaseProfile[]
  onSelectDatabase: (id: string) => Promise<void>
  onCreateDatabase: (name: string) => Promise<void>
  onDeleteDatabase: (id: string) => Promise<void>
}) {
  const [newDatabaseName, setNewDatabaseName] = useState('')
  const [busy, setBusy] = useState(false)
  const [libraryError, setLibraryError] = useState('')

  const createDatabase = async (event: React.FormEvent) => {
    event.preventDefault()
    setLibraryError('')
    setBusy(true)
    try {
      await onCreateDatabase(newDatabaseName)
      setNewDatabaseName('')
    } catch (cause) {
      setLibraryError(cause instanceof Error ? cause.message : 'Could not create the database.')
    } finally { setBusy(false) }
  }

  const deleteDatabase = async (database: DatabaseProfile) => {
    if (!window.confirm(`Delete “${database.name}”? This permanently removes that SQLite database and all of its local score history. Export a backup first if you may need it.`)) return
    setLibraryError('')
    setBusy(true)
    try {
      await onDeleteDatabase(database.id)
    } catch (cause) {
      setLibraryError(cause instanceof Error ? cause.message : 'Could not delete the database.')
    } finally { setBusy(false) }
  }

  return (
    <main className="home-view">
      <header className="home-header">
        <div className="home-title">
          <span className="home-mark"><TentTree /></span>
          <div><p>Camp control centre</p><h1>{state.session.name}</h1></div>
        </div>
        <div className="header-actions"><StatusPill status={status} storageKind={storageKind} compact /><ThemeToggle theme={theme} onToggle={onToggleTheme} /></div>
      </header>

      <section className="database-library" aria-labelledby="database-library-heading">
        <div className="database-library-heading"><div><p className="eyebrow">SQLite database library</p><h2 id="database-library-heading">Choose the active database</h2><p>Every screen follows this selection. Organizer backups, imports, CSV, and SQLite exports apply to the active database only.</p></div><Database /></div>
        <div className="database-list" role="list" aria-label="Available databases">
          {databases.map((database) => <div className={database.id === activeDatabase.id ? 'active' : ''} key={database.id} role="listitem"><button className="database-choice" type="button" disabled={busy || database.id === activeDatabase.id} onClick={() => void onSelectDatabase(database.id)}><span><strong>{database.name}</strong><small>{database.id === activeDatabase.id ? 'Active on every open tab' : 'Select this database'}</small></span>{database.id === activeDatabase.id ? <b>Active</b> : null}</button><button className="database-delete" type="button" disabled={busy || database.id === activeDatabase.id || databases.length <= 1} onClick={() => void deleteDatabase(database)} title={database.id === activeDatabase.id ? 'Select another database before deleting this one' : 'Delete this database'} aria-label={`Delete ${database.name}`}><Trash2 /></button></div>)}
        </div>
        <form className="database-create" onSubmit={createDatabase}><label htmlFor="new-database-name">New database<input id="new-database-name" maxLength={80} value={newDatabaseName} onChange={(event) => setNewDatabaseName(event.target.value)} placeholder="e.g. Sukkot 2027" required /></label><button type="submit" disabled={busy || !newDatabaseName.trim()}><Plus />{busy ? 'Working…' : 'Create and use database'}</button></form>
        {libraryError ? <p className="database-library-error" role="alert">{libraryError}</p> : null}
      </section>

      <section className="home-intro" aria-labelledby="home-heading">
        <p className="eyebrow">Choose a screen</p>
        <h2 id="home-heading">Open the right view for each part of camp.</h2>
        <p>Use this page as the starting point, then open each workspace in its own tab or display.</p>
        <div className="home-event-facts" aria-label="Active event details">
          <span><small>Recording day</small><strong>Day {state.session.activeDay} / 8</strong></span>
          <span><small>Ledger entries</small><strong>{state.events.length}</strong></span>
          <span><small>Stored locally</small><strong>Ready offline</strong></span>
        </div>
      </section>

      <nav className="home-destination-grid" aria-label="Choose a workspace">
        {destinations.map((destination) => {
          const Icon = destination.icon
          return <a className="home-destination" data-tone={destination.tone} href={destination.href} key={destination.href}>
            <span className="home-destination-icon"><Icon /></span>
            <span className="home-destination-copy"><strong>{destination.title}</strong><small>{destination.description}</small></span>
            <span className="home-destination-action">{destination.label} <span aria-hidden="true">→</span></span>
          </a>
        })}
      </nav>
    </main>
  )
}

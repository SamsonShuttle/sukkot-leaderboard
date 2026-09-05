import { CheckCircle2, Database, LoaderCircle, TriangleAlert } from 'lucide-react'

interface Props {
  status: 'loading' | 'ready' | 'error'
  storageKind?: 'browser-sqlite' | 'tauri-sqlite'
  compact?: boolean
}

export function StatusPill({ status, storageKind, compact = false }: Props) {
  const ready = status === 'ready'
  return (
    <div className={`status-pill ${status}`} title={ready ? `Connected to ${storageKind}` : undefined}>
      {status === 'loading' && <LoaderCircle className="animate-spin" size={16} />}
      {status === 'ready' && (compact ? <CheckCircle2 size={16} /> : <Database size={16} />)}
      {status === 'error' && <TriangleAlert size={16} />}
      {!compact && <span>{status === 'loading' ? 'Loading database' : status === 'ready' ? 'Database ready' : 'Database error'}</span>}
    </div>
  )
}

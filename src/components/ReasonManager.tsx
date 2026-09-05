import { useState } from 'react'
import { Eye, EyeOff, ListPlus, Plus } from 'lucide-react'
import type { ReasonAppliesTo, ScoreReason } from '../types'

const appliesLabels: Record<ReasonAppliesTo, string> = {
  add: 'Points gained',
  deduct: 'Points deducted',
  both: 'Both',
}

export function ReasonManager({ reasons, onAdd, onSetActive }: {
  reasons: ScoreReason[]
  onAdd: (label: string, appliesTo: ReasonAppliesTo) => Promise<void>
  onSetActive: (id: string, active: boolean) => Promise<void>
}) {
  const [label, setLabel] = useState('')
  const [appliesTo, setAppliesTo] = useState<ReasonAppliesTo>('both')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      await onAdd(label, appliesTo)
      setLabel('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The reason could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="control-card reason-card">
      <div className="control-card-heading"><div><p className="eyebrow">Saved dropdown options</p><h2>Point reasons</h2></div><ListPlus /></div>
      <form className="reason-form" onSubmit={submit}>
        <label>Reason label<input maxLength={100} value={label} onChange={(event) => setLabel(event.target.value)} placeholder="e.g. Won the team challenge" /></label>
        <label>Show for<select value={appliesTo} onChange={(event) => setAppliesTo(event.target.value as ReasonAppliesTo)}><option value="both">Gained & deducted</option><option value="add">Points gained</option><option value="deduct">Points deducted</option></select></label>
        <button disabled={busy || !label.trim()}><Plus />{busy ? 'Saving…' : 'Add reason'}</button>
      </form>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="reason-list">
        {reasons.map((reason) => (
          <div className={!reason.active ? 'inactive' : ''} key={reason.id}>
            <span><strong>{reason.label}</strong><small>{appliesLabels[reason.appliesTo]} · {reason.active ? 'Active' : 'Hidden'}</small></span>
            <button onClick={() => void onSetActive(reason.id, !reason.active)} title={reason.active ? 'Hide from dropdowns' : 'Restore to dropdowns'}>
              {reason.active ? <EyeOff /> : <Eye />}{reason.active ? 'Hide' : 'Restore'}
            </button>
          </div>
        ))}
        {!reasons.length ? <p>No saved reasons yet. Add one above and it will appear in the scoring dropdown.</p> : null}
      </div>
    </div>
  )
}

import { AnimatePresence, motion } from 'framer-motion'
import { RotateCw, Sparkles, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { WHEEL_OUTCOMES } from '../config'
import type { WheelOutcomeId, WheelWeights } from '../types'

const wheelColours = ['#D6A92A', '#9B0032', '#596B49', '#08247D', '#E9D5A6', '#657086']

type WheelOutcome = (typeof WHEEL_OUTCOMES)[number]

function weightedPick(weights: WheelWeights): WheelOutcome {
  const enabled = WHEEL_OUTCOMES.filter((outcome) => weights[outcome.id] > 0)
  const total = enabled.reduce((sum, outcome) => sum + weights[outcome.id], 0)
  let cursor = Math.random() * total
  for (const outcome of enabled) {
    cursor -= weights[outcome.id]
    if (cursor <= 0) return outcome
  }
  return enabled[enabled.length - 1]
}

export function AtonementWheel({ weights }: { weights: WheelWeights }) {
  const [open, setOpen] = useState(false)
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [result, setResult] = useState<WheelOutcome>()
  const enabled = useMemo(() => WHEEL_OUTCOMES.filter((outcome) => weights[outcome.id] > 0), [weights])
  const totalWeight = enabled.reduce((sum, outcome) => sum + weights[outcome.id], 0)
  const slices = useMemo(() => {
    let cursor = 0
    return enabled.map((outcome, index) => {
      const size = weights[outcome.id] / totalWeight * 360
      const slice = { outcome, start: cursor, size, middle: cursor + size / 2, colour: wheelColours[index % wheelColours.length] }
      cursor += size
      return slice
    })
  }, [enabled, totalWeight, weights])
  const background = `conic-gradient(${slices.map((slice) => `${slice.colour} ${slice.start}deg ${slice.start + slice.size}deg`).join(', ')})`

  const spin = () => {
    if (!enabled.length || spinning) return
    const next = weightedPick(weights)
    const slice = slices.find((item) => item.outcome.id === next.id)
    if (!slice) return
    setResult(undefined)
    setSpinning(true)
    // The marker sits at 12 o'clock; land the selected slice centre beneath it.
    setRotation((current) => current + 1440 + (360 - slice.middle - (current % 360)))
    window.setTimeout(() => {
      setResult(next)
      setSpinning(false)
    }, 2500)
  }

  return <>
    <button className="wheel-launcher" type="button" onClick={() => setOpen(true)} aria-haspopup="dialog"><Sparkles /><span>Spin the wheel</span></button>
    <AnimatePresence>
      {open ? <motion.section className="wheel-overlay" role="dialog" aria-modal="true" aria-label="Atonement decision wheel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="wheel-dialog" initial={{ scale: .94, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .94, y: 24 }}>
          <button className="wheel-close" type="button" onClick={() => setOpen(false)} aria-label="Close the wheel"><X /></button>
          <p className="eyebrow">Atonement call</p><h2>Spin the wheel</h2>
          <p className="wheel-intro">The result is a prompt only. Record any points manually at the score desk.</p>
          <div className="wheel-stage">
            <i className="wheel-pointer" aria-hidden="true" />
            <motion.div className="wheel-disc" style={{ background }} animate={{ rotate: rotation }} transition={{ duration: 2.45, ease: [0.12, 0.73, 0.2, 1] }}>
              {slices.map((slice) => {
                const angle = slice.middle - 90
                return <span key={slice.outcome.id} style={{ '--wheel-angle': `${angle}deg` } as React.CSSProperties}>{slice.outcome.label}</span>
              })}
              <b>✦</b>
            </motion.div>
          </div>
          <div className="wheel-result" aria-live="polite">
            {spinning ? <span>Choosing…</span> : result ? <><strong>{result.label}</strong><span>{result.detail}</span></> : <span>Ready when you are.</span>}
          </div>
          <button className="wheel-spin-button" type="button" onClick={spin} disabled={spinning || !enabled.length}><RotateCw className={spinning ? 'spin-icon' : ''} />{spinning ? 'Spinning…' : result?.id === 'spin-again' ? 'Spin again' : 'Spin the wheel'}</button>
          <p className="wheel-odds-note">Odds are set in Organizer settings.</p>
        </motion.div>
      </motion.section> : null}
    </AnimatePresence>
  </>
}

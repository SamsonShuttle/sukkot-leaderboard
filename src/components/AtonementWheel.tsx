import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from 'framer-motion'
import { CircleStop, RotateCw, Sparkles, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { WHEEL_OUTCOMES } from '../config'
import { buildWheelTickets, pickWheelTicketIndex, targetRotationForTicket, WHEEL_COLOURS, WHEEL_LABEL_COLOURS, type WheelTicket } from '../lib/wheel'
import type { WheelWeights } from '../types'

type SpinPhase = 'idle' | 'spinning' | 'stopping'

export function AtonementWheel({ weights }: { weights: WheelWeights }) {
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<SpinPhase>('idle')
  const [result, setResult] = useState<WheelTicket['outcome']>()
  const reduceMotion = useReducedMotion()
  const rotation = useMotionValue(0)
  const animation = useRef<ReturnType<typeof animate> | null>(null)
  const tickets = useMemo(() => buildWheelTickets(weights), [weights])
  const sliceSize = tickets.length ? 360 / tickets.length : 360
  const colourStops = tickets.map((ticket, index) => `${ticket.colour} ${index * sliceSize}deg ${(index + 1) * sliceSize}deg`).join(', ')
  const dividerStart = Math.max(.1, sliceSize - .65)
  const calloutSize = Math.max(9, Math.min(18, 27 - tickets.length * .72))
  const dividers = `repeating-conic-gradient(from 0deg, transparent 0 ${dividerStart}deg, rgb(255 255 255 / .78) ${dividerStart}deg ${sliceSize}deg)`
  const background = tickets.length ? `${dividers}, conic-gradient(${colourStops})` : '#334155'

  useEffect(() => () => animation.current?.stop(), [])

  const close = () => {
    animation.current?.stop()
    setPhase('idle')
    setOpen(false)
  }

  const start = () => {
    if (!tickets.length || phase !== 'idle') return
    setResult(undefined)
    setPhase('spinning')
    const current = rotation.get()
    animation.current?.stop()
    if (!reduceMotion) animation.current = animate(rotation, current + 360, { duration: .82, ease: 'linear', repeat: Infinity })
  }

  const stop = () => {
    if (phase !== 'spinning') return
    animation.current?.stop()
    const selectedIndex = pickWheelTicketIndex(tickets.length)
    const selected = tickets[selectedIndex]
    const target = targetRotationForTicket(rotation.get(), selectedIndex, tickets.length)
    setPhase('stopping')
    animation.current = animate(rotation, target, {
      duration: reduceMotion ? .01 : 1.85,
      ease: [0.12, 0.72, 0.18, 1],
      onComplete: () => {
        setResult(selected.outcome)
        setPhase('idle')
      },
    })
  }

  return <>
    <button className="icon-button wheel-launcher" type="button" onClick={() => setOpen(true)} title="Spin the wheel" aria-label="Spin the wheel" aria-haspopup="dialog"><Sparkles /><span>Spin the wheel</span></button>
    <AnimatePresence>
      {open ? <motion.section className="wheel-overlay" role="dialog" aria-modal="true" aria-label="Atonement decision wheel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="wheel-dialog" data-result={result?.id ?? ''} initial={{ scale: .94, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .94, y: 24 }}>
          <button className="wheel-close" type="button" onClick={close} aria-label="Close the wheel"><X /></button>
          <p className="eyebrow">Atonement call</p><h2>Spin the wheel</h2>
          <p className="wheel-intro">Spin for as long as you like, then press Stop. Record any resulting points manually.</p>
          <div className="wheel-legend" aria-label="Wheel colour legend">
            {WHEEL_OUTCOMES.filter((outcome) => weights[outcome.id] > 0).map((outcome) => <span key={outcome.id}><i style={{ background: WHEEL_COLOURS[outcome.id] }} /><strong>{outcome.label}</strong></span>)}
          </div>
          <div className={`wheel-stage ${phase}${result && phase === 'idle' ? ' has-result' : ''}`}>
            <i className="wheel-pointer" aria-hidden="true" />
            <div className={`wheel-fx ${phase}`} aria-hidden="true"><span className="friction-ring ring-one" /><span className="friction-ring ring-two" />{Array.from({ length: 18 }, (_, index) => <i className="wheel-spark" key={index} style={{ '--spark-angle': `${index * 20}deg`, '--spark-delay': `${-(index % 7) * .11}s`, '--spark-size': `${3 + index % 4}px` } as React.CSSProperties} />)}</div>
            <motion.div className="wheel-disc" data-tickets={tickets.map((ticket) => ticket.outcome.id).join(',')} style={{ background, rotate: rotation }}>
              {tickets.map((ticket, index) => <span className="wheel-ticket-label" key={ticket.id} style={{ '--ticket-angle': `${index * sliceSize + sliceSize / 2 - 90}deg`, color: WHEEL_LABEL_COLOURS[ticket.outcome.id], fontSize: `${calloutSize}px` } as React.CSSProperties}>{ticket.outcome.imageUrl ? <img className="wheel-ticket-art" src={ticket.outcome.imageUrl} alt="" /> : null}<strong>{ticket.outcome.callout}</strong></span>)}
              <b>✦</b>
            </motion.div>
          </div>
          <div className="wheel-result" aria-live="polite">
            <AnimatePresence mode="wait">
              <motion.div className={result && phase === 'idle' ? 'result-callout' : 'result-status'} key={phase === 'idle' && result ? result.id : phase} initial={{ opacity: 0, scale: result ? .35 : .92, rotate: result ? -5 : 0 }} animate={{ opacity: 1, scale: result ? [1, 1.16, 1] : 1, rotate: 0 }} exit={{ opacity: 0, scale: .85 }} transition={{ duration: result ? .7 : .2, ease: 'easeOut' }}>
                {phase === 'spinning' ? <span>Spinning—press Stop when ready.</span> : phase === 'stopping' ? <span>Coming to a stop…</span> : result ? <>{result.imageUrl ? <img className="wheel-result-art" src={result.imageUrl} alt="" /> : null}<strong style={{ color: WHEEL_COLOURS[result.id] }}>{result.label}</strong><span>{result.detail}</span></> : <span>Ready when you are.</span>}
              </motion.div>
            </AnimatePresence>
          </div>
          <button className={`wheel-spin-button ${phase === 'spinning' ? 'stop' : ''}`} type="button" onClick={phase === 'spinning' ? stop : start} disabled={phase === 'stopping' || !tickets.length}>{phase === 'spinning' ? <CircleStop /> : <RotateCw />}{phase === 'spinning' ? 'Stop' : phase === 'stopping' ? 'Stopping…' : result?.id === 'spin-again' ? 'Spin again' : 'Spin the wheel'}</button>
          <p className="wheel-odds-note">Every visible block is one chance. Odds are set in Organizer settings.</p>
        </motion.div>
      </motion.section> : null}
    </AnimatePresence>
  </>
}

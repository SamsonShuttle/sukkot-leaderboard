import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { useEffect } from 'react'

export function AnimatedNumber({ value, className = '' }: { value: number; className?: string }) {
  const motionValue = useMotionValue(value)
  const rounded = useTransform(motionValue, (latest) => Math.round(latest).toLocaleString())

  useEffect(() => {
    const controls = animate(motionValue, value, { duration: 0.55, ease: [0.22, 1, 0.36, 1] })
    return controls.stop
  }, [motionValue, value])

  return <motion.span className={className}>{rounded}</motion.span>
}

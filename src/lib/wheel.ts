import { WHEEL_OUTCOMES } from '../config'
import type { WheelOutcomeId, WheelWeights } from '../types'

export const WHEEL_COLOURS: Record<WheelOutcomeId, string> = {
  'tithe-10': '#FFB000',
  'turtle-dove': '#00A6A6',
  ram: '#7C3AED',
  ox: '#E63946',
  'free-pass': '#2AA876',
  'spin-again': '#2563EB',
}

export const WHEEL_LABEL_COLOURS: Record<WheelOutcomeId, string> = {
  'tithe-10': '#14213D',
  'turtle-dove': '#FFFFFF',
  ram: '#FFFFFF',
  ox: '#FFFFFF',
  'free-pass': '#FFFFFF',
  'spin-again': '#FFFFFF',
}

export type WheelTicket = {
  id: string
  outcome: (typeof WHEEL_OUTCOMES)[number]
  colour: string
}

export function buildWheelTickets(weights: WheelWeights): WheelTicket[] {
  const remaining = new Map(WHEEL_OUTCOMES.map((outcome) => [outcome.id, weights[outcome.id]]))
  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0)
  const tickets: WheelTicket[] = []
  let previousId: WheelOutcomeId | undefined

  // Always take the most common remaining colour that differs from the last.
  // This preserves exact probability while separating repeats whenever the
  // configured weights make that mathematically possible.
  for (let index = 0; index < total; index += 1) {
    const available = WHEEL_OUTCOMES
      .filter((outcome) => (remaining.get(outcome.id) ?? 0) > 0)
      .sort((left, right) => (remaining.get(right.id) ?? 0) - (remaining.get(left.id) ?? 0))
    const outcome = available.find((candidate) => candidate.id !== previousId) ?? available[0]
    tickets.push({ id: `${outcome.id}-${weights[outcome.id] - (remaining.get(outcome.id) ?? 0)}`, outcome, colour: WHEEL_COLOURS[outcome.id] })
    remaining.set(outcome.id, (remaining.get(outcome.id) ?? 0) - 1)
    previousId = outcome.id
  }
  return tickets
}

export function pickWheelTicketIndex(ticketCount: number, random = Math.random): number {
  if (ticketCount <= 0) throw new Error('The wheel needs at least one enabled outcome')
  return Math.min(ticketCount - 1, Math.floor(random() * ticketCount))
}

export function targetRotationForTicket(currentRotation: number, ticketIndex: number, ticketCount: number): number {
  const sliceSize = 360 / ticketCount
  const selectedMiddle = ticketIndex * sliceSize + sliceSize / 2
  const normalizedCurrent = ((currentRotation % 360) + 360) % 360
  const adjustment = (360 - selectedMiddle - normalizedCurrent + 360) % 360
  return currentRotation + 720 + adjustment
}

export function ticketIndexAtPointer(rotation: number, ticketCount: number): number {
  const sliceSize = 360 / ticketCount
  const sourceAngleAtPointer = ((-rotation % 360) + 360) % 360
  return Math.min(ticketCount - 1, Math.floor(sourceAngleAtPointer / sliceSize))
}

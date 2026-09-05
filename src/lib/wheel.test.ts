import { describe, expect, it } from 'vitest'
import { buildWheelTickets, pickWheelTicketIndex, targetRotationForTicket, ticketIndexAtPointer, WHEEL_COLOURS } from './wheel'
import type { WheelWeights } from '../types'

const weights: WheelWeights = { 'tithe-10': 5, 'turtle-dove': 3, ram: 2, ox: 1, 'free-pass': 2, 'spin-again': 1 }

describe('atonement wheel geometry', () => {
  it('creates one equally likely ticket per weight and spreads repeated outcomes', () => {
    const tickets = buildWheelTickets(weights)
    expect(tickets).toHaveLength(14)
    expect(tickets.filter((ticket) => ticket.outcome.id === 'tithe-10')).toHaveLength(5)
    expect(new Set(tickets.map((ticket) => ticket.colour))).toEqual(new Set(Object.values(WHEEL_COLOURS)))
    expect(tickets.every((ticket, index) => index === 0 || ticket.outcome.id !== tickets[index - 1].outcome.id)).toBe(true)
  })

  it('announces the exact ticket that stops beneath the pointer from any starting angle', () => {
    const count = buildWheelTickets(weights).length
    for (const current of [0, 37, 359, 721.25, 4289]) {
      for (let selected = 0; selected < count; selected += 1) {
        const finalRotation = targetRotationForTicket(current, selected, count)
        expect(ticketIndexAtPointer(finalRotation, count)).toBe(selected)
      }
    }
  })

  it('uses the supplied random sample to choose an equal-sized ticket', () => {
    expect(pickWheelTicketIndex(14, () => 0)).toBe(0)
    expect(pickWheelTicketIndex(14, () => .5)).toBe(7)
    expect(pickWheelTicketIndex(14, () => .999999)).toBe(13)
  })
})

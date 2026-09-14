import type { AtonementOfferingId } from './types'

export const ATONEMENT_OFFERINGS = [
  { id: 'turtle-dove', label: 'Turtle Dove', points: 2, imageUrl: '/assets/wheel/two-turtle-doves.png' },
  { id: 'ram', label: 'Ram', points: 3, imageUrl: '/assets/wheel/three-rams.png' },
  { id: 'ox', label: 'Ox', points: 4, imageUrl: '/assets/wheel/four-oxen.png' },
  { id: 'tithe-10', label: '10% Tithe', points: 0, rate: 10, imageUrl: '/assets/wheel/tithe-10-percent.png' },
] as const

export const ATONEMENT_OPTIONS = ATONEMENT_OFFERINGS

export const atonementOfferingForReason = (reason: string | null | undefined) =>
  ATONEMENT_OPTIONS.find((offering) => offering.label === reason)

export const atonementOfferingById = (id: AtonementOfferingId | null | undefined) =>
  ATONEMENT_OFFERINGS.find((offering) => offering.id === id)

// Event leaders can adjust these defaults without changing the ledger or database schema.
export const SCORING_CONFIG = {
  largeActionConfirmationAt: 50,
  quickPointValues: [5, 10, 25, 50],
  specialActions: {
    tithe: { label: 'Daily Tithe', helper: 'Transfer 5% or 10% of today’s eligible points from Judah and Israel to Levi', rates: [5, 10] },
    atonement: {
      label: 'Atonement',
      helper: 'A behaviour or missed-duty consequence paid to Levi',
      options: ATONEMENT_OPTIONS,
    },
  },
} as const

export const WHEEL_OUTCOMES = [
  { id: 'tithe-10', label: '10% Tithe', callout: '10%', detail: 'Apply manually if called', imageUrl: '/assets/wheel/tithe-10-percent.png' },
  { id: 'turtle-dove', label: 'Turtle Dove', callout: '2', detail: '2-point Atonement', imageUrl: ATONEMENT_OFFERINGS[0].imageUrl },
  { id: 'ram', label: 'Ram', callout: '3', detail: '3-point Atonement', imageUrl: ATONEMENT_OFFERINGS[1].imageUrl },
  { id: 'ox', label: 'Ox', callout: '4', detail: '4-point Atonement', imageUrl: ATONEMENT_OFFERINGS[2].imageUrl },
  { id: 'free-pass', label: 'Free pass', callout: 'PASS', detail: 'No points applied', imageUrl: null },
  { id: 'spin-again', label: 'Spin again', callout: '↻', detail: 'Spin once more', imageUrl: null },
] as const

export const DEFAULT_WHEEL_WEIGHTS = {
  'tithe-10': 2,
  'turtle-dove': 3,
  ram: 2,
  ox: 1,
  'free-pass': 2,
  'spin-again': 1,
} as const

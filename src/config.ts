// Event leaders can adjust these defaults without changing the ledger or database schema.
export const SCORING_CONFIG = {
  largeActionConfirmationAt: 50,
  quickPointValues: [5, 10, 25, 50],
  specialActions: {
    tithe: { label: 'Daily Tithe', helper: 'Transfer 5% or 10% of today’s eligible points from Judah and Israel to Levi', rates: [5, 10] },
    atonement: {
      label: 'Atonement',
      helper: 'A behaviour or missed-duty consequence paid to Levi',
      options: [
        { label: 'Turtle Dove', points: 2 },
        { label: 'Ram', points: 3 },
        { label: 'Ox', points: 4 },
      ],
    },
  },
} as const

export const WHEEL_OUTCOMES = [
  { id: 'tithe-10', label: '10% Tithe', detail: 'Apply manually if called' },
  { id: 'turtle-dove', label: 'Turtle Dove', detail: '2-point Atonement' },
  { id: 'ram', label: 'Ram', detail: '3-point Atonement' },
  { id: 'ox', label: 'Ox', detail: '4-point Atonement' },
  { id: 'free-pass', label: 'Free pass', detail: 'No points applied' },
  { id: 'spin-again', label: 'Spin again', detail: 'Spin once more' },
] as const

export const DEFAULT_WHEEL_WEIGHTS = {
  'tithe-10': 2,
  'turtle-dove': 3,
  ram: 2,
  ox: 1,
  'free-pass': 2,
  'spin-again': 1,
} as const

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

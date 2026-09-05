import { CalendarDays, Check } from 'lucide-react'
import { TRIP_DAYS, type DaySummary, type TripDay } from '../types'

export function DaySwitcher({ activeDay, summaries, onSelect }: {
  activeDay: TripDay
  summaries: DaySummary[]
  onSelect: (day: TripDay) => Promise<void>
}) {
  return (
    <section className="day-switcher" aria-label="Active scoring day">
      <div className="day-switcher-title">
        <CalendarDays />
        <div><span>Active scoring day</span><strong>Day {activeDay} of 8</strong></div>
      </div>
      <div className="day-buttons">
        {TRIP_DAYS.map((day) => {
          const summary = summaries[day - 1]
          const hasEvents = summary.eventCount > 0
          return (
            <button
              type="button"
              key={day}
              className={activeDay === day ? 'active' : ''}
              aria-current={activeDay === day ? 'step' : undefined}
              aria-label={`Switch scoring to Day ${day}${hasEvents ? `, ${summary.eventCount} events recorded` : ''}`}
              onClick={() => void onSelect(day)}
            >
              <span>Day</span><strong>{day}</strong>{hasEvents ? <Check /> : <i />}
            </button>
          )
        })}
      </div>
      <p>New score actions and undos will be recorded under Day {activeDay}.</p>
    </section>
  )
}

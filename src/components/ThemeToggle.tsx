import { MoonStar, Sun } from 'lucide-react'
import type { ColorTheme } from '../types'

export function ThemeToggle({ theme, onToggle }: { theme: ColorTheme; onToggle: () => void }) {
  const dark = theme === 'dark'
  const label = dark ? 'Switch to light mode' : 'Switch to dark mode'

  return (
    <button
      type="button"
      className="icon-button theme-toggle"
      onClick={onToggle}
      aria-label={label}
      aria-pressed={dark}
      title={label}
    >
      {dark ? <Sun /> : <MoonStar />}
    </button>
  )
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--color-canvas)',
        surface: 'var(--color-surface)',
        'surface-dark': 'var(--color-surface-dark)',
        ink: 'var(--color-ink)',
        muted: 'var(--color-muted)',
        gold: 'var(--color-gold)',
        'gold-dark': 'var(--color-gold-dark)',
        green: 'var(--color-green)',
        israel: 'var(--color-israel)',
        'israel-light': 'var(--color-israel-light)',
        judah: 'var(--color-judah)',
        'judah-light': 'var(--color-judah-light)',
        levi: 'var(--color-levi)',
        'levi-light': 'var(--color-levi-light)',
        success: 'var(--color-success)',
        danger: 'var(--color-danger)',
      },
      fontFamily: {
        display: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 40px rgb(250 204 21 / 0.16)',
      },
    },
  },
  plugins: [],
}

import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ghs: {
          bg:       '#070d0b',
          surface:  '#080e0c',
          teal:     '#1B4D47',
          green:    '#72D946',
          border:   'rgba(255,255,255,0.07)',
          text:     '#e2e8e4',
          muted:    'rgba(255,255,255,0.35)',
          dim:      'rgba(255,255,255,0.15)',
        },
        cat1: '#f59e0b',
        cat2: '#72D946',
        cat3: '#38bdf8',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config

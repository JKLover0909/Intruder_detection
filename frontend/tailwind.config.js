/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        soc: {
          950: '#05070f',
          900: '#0a0e1a',
          800: '#0f1629',
          700: '#151d36',
          600: '#1c2847',
          500: '#243058',
          400: '#36415f',
        },
        // Professional Security Dark Mode
        alert: {
          critical: '#ef4444', // red-500
          high: '#f97316',     // orange-500
          medium: '#eab308',   // yellow-500
          low: '#22c55e',      // green-500
          info: '#3b82f6',     // blue-500
        },
        // Per alert type colors (subtle)
        type: {
          intrusion: '#dc2626',
          climbing: '#c026ff',
          'line-crossing': '#a855f7',
          loitering: '#f59e0b',
          'after-hours': '#0ea5e9',
        }
      },
      fontSize: {
        '2xs': '0.625rem',
      },
      animation: {
        'pulse-red': 'pulse-red 1s ease-in-out infinite',
        'pulse-critical': 'pulse-critical 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'pulse-red': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(239,68,68,0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(239,68,68,0)' },
        },
        'pulse-critical': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.6 },
        }
      }
    }
  },
  plugins: []
}

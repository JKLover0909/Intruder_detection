/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Factory Perimeter SOC — Dark OLED ops (ui-ux-pro-max)
        soc: {
          950: '#020617',
          900: '#0a1224',
          800: '#111827',
          700: '#1e293b',
          600: '#334155',
          500: '#475569',
          400: '#64748b',
        },
        alert: {
          critical: '#ef4444',
          high: '#f97316',
          medium: '#eab308',
          low: '#22c55e',
          info: '#38bdf8',
        },
        type: {
          intrusion: '#ef4444',
          climbing: '#f59e0b',
          'line-crossing': '#38bdf8',
          loitering: '#eab308',
          'after-hours': '#94a3b8',
        },
      },
      fontFamily: {
        sans: ['"Fira Sans"', 'system-ui', 'sans-serif'],
        mono: ['"Fira Code"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': '0.625rem',
      },
      transitionDuration: {
        DEFAULT: '180ms',
      },
      animation: {
        'pulse-red': 'pulse-red 1.4s ease-in-out infinite',
        'pulse-critical': 'pulse-critical 1.4s ease-in-out infinite',
        'status-dot': 'status-dot 2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-red': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(239,68,68,0.35)' },
          '50%': { boxShadow: '0 0 0 6px rgba(239,68,68,0)' },
        },
        'pulse-critical': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'status-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
      },
    },
  },
  plugins: [],
}

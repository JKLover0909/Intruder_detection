/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        soc: {
          900: '#0a0e1a',
          800: '#0f1629',
          700: '#151d36',
          600: '#1c2847',
          500: '#243058',
        }
      },
      animation: {
        'pulse-red': 'pulse-red 1s ease-in-out infinite',
      },
      keyframes: {
        'pulse-red': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(239,68,68,0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(239,68,68,0)' },
        }
      }
    }
  },
  plugins: []
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Rajdhani', 'sans-serif'],
      },
      colors: {
        wtech: {
          black: '#0A0A0A',
          gold: '#D4AF37',
          red: '#E60000',
          gray: '#1A1A1A',
          light: '#F5F5F5',
          dark: '#050505',
          // Semantic admin aliases (apontam para as CSS vars)
          'surface':    'var(--admin-surface-1)',
          'surface-2':  'var(--admin-surface-2)',
          'surface-3':  'var(--admin-surface-3)',
          'border':     'var(--admin-border)',
          'text-base':  'var(--admin-text-primary)',
          'text-muted': 'var(--admin-text-secondary)',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

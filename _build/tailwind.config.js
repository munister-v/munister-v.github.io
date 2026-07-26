/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    '../index.html',
    '../assets/*.js',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        serif: ['Cormorant Garamond', 'serif'],
      },
      colors: {
        neutral: {
          850: '#1f1f1f',
          900: '#171717',
          925: '#121212',
          950: '#0a0a0a',
        },
        sand: {
          DEFAULT: '#d4c4b5',
          50: '#f7f6f4',
          100: '#efede8',
          200: '#dfd9cf',
          300: '#c5b9a8',
          400: '#a89883',
        }
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(to right, #262626 1px, transparent 1px), linear-gradient(to bottom, #262626 1px, transparent 1px)",
      },
      animation: {
        'marquee': 'marquee 25s linear infinite',
        'marquee-reverse': 'marquee-reverse 25s linear infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        'marquee-reverse': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0%)' },
        },
      }
    }
  },
  plugins: [],
}

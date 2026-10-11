/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#f1f7f3',
          100: '#dfede3',
          200: '#c0dcc9',
          300: '#95c2a6',
          400: '#67a37e',
          500: '#46865f',
          600: '#346b4b',
          700: '#2a553c',
          800: '#234431',
          900: '#1b3828',
          950: '#0e1f16',
        },
        moss: {
          50: '#f5f7f2',
          100: '#e8ece1',
          200: '#d1dbc6',
          300: '#b1c3a2',
          400: '#91aa7f',
          500: '#738f61',
          600: '#59724a',
          700: '#46593a',
          800: '#394830',
          900: '#313d2a',
        },
        parchment: {
          50: '#fcfbf8',
          100: '#f8f5ed',
          200: '#f0ebd9',
          300: '#e5dcbf',
          400: '#d7c79e',
          500: '#c8b27f',
          600: '#b69b67',
          700: '#977d51',
          800: '#7b6544',
          900: '#65533a',
          950: '#382d1e',
        },
        brass: {
          400: '#e0c068',
          500: '#d4af37',
          600: '#b89428',
        },
        charcoal: {
          800: '#242b26',
          900: '#1a1f1c',
          950: '#121613',
        }
      },
      fontFamily: {
        serif: ['"Newsreader"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'field': '0 2px 10px rgba(18, 31, 22, 0.08), 0 1px 3px rgba(18, 31, 22, 0.05)',
        'elevated': '0 10px 30px rgba(18, 31, 22, 0.12), 0 4px 8px rgba(18, 31, 22, 0.06)',
      }
    },
  },
  plugins: [],
}

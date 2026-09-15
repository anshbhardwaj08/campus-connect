/** @type {import('tailwindcss').Config} */

// Same Comic Noir tokens as /client — see client/tailwind.config.js and
// docs/design-system.md. Kept in sync by hand; there is no shared package.
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0B0D11',
        paper: {
          DEFAULT: '#E7E3D8',
          2: '#D3CEC1',
          3: '#F2EFE7',
        },
        crimson: '#C0353A',
        slate: '#1B2536',
        ice: '#AFC4D8',
        steel: '#5A6B80',
      },
      fontFamily: {
        display: ['Bangers', 'Impact', 'cursive'],
        sans: ['"Work Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        hard: '4px 4px 0 #0B0D11',
        'hard-sm': '3px 3px 0 #0B0D11',
        'hard-lg': '6px 6px 0 #0B0D11',
        'hard-crimson': '3px 3px 0 #C0353A',
      },
      borderRadius: {
        bubble: '18px',
      },
    },
  },
  plugins: [],
}

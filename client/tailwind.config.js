/** @type {import('tailwindcss').Config} */

// Comic Noir design tokens. These are the ONLY colours in the system.
// There is no second accent, no orange, no gold, no gradient anywhere.
// See docs/design-system.md before adding anything here.
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0B0D11',      // borders, text, gutters. True black, never tinted grey
        paper: {
          DEFAULT: '#E7E3D8', // page background. Cool newsprint, NOT cream
          2: '#D3CEC1',       // caption boxes
          3: '#F2EFE7',       // panel interiors, input fields
        },
        crimson: '#C0353A',  // THE ONLY ACCENT
        slate: '#1B2536',    // night panels, dark splash areas
        ice: '#AFC4D8',      // cold panels, incoming bubbles, avatars
        steel: '#5A6B80',    // secondary and meta text
      },
      fontFamily: {
        // Bangers is for the wordmark, splash headlines, price slabs and
        // button labels ONLY. Never body text, never a full sentence.
        display: ['Bangers', 'Impact', 'cursive'],
        sans: ['"Work Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        // Hard offsets only. Never a blur value anywhere in this system.
        hard: '4px 4px 0 #0B0D11',
        'hard-sm': '3px 3px 0 #0B0D11',
        'hard-lg': '6px 6px 0 #0B0D11',
        'hard-crimson': '3px 3px 0 #C0353A',
      },
      borderRadius: {
        // Nothing in this system rounds past 4px except speech bubbles.
        bubble: '18px',
      },
      // Motion lives in src/lib/motion.js (GSAP). Nothing here.
    },
  },
  plugins: [],
}

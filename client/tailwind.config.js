/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)',
        'brand-gradient-soft': 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 50%, #fdf4ff 100%)',
      },
      boxShadow: {
        soft: '0 2px 10px rgba(15, 23, 42, 0.06)',
        'soft-lg': '0 12px 40px rgba(76, 29, 149, 0.12)',
        glow: '0 0 0 4px rgba(139, 92, 246, 0.15)',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'fade-in-up': {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        drift: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(6%, -8%) scale(1.08)' },
          '66%': { transform: 'translate(-5%, 6%) scale(0.95)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: 0.6 },
          '50%': { opacity: 1 },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        'fade-in-up': 'fade-in-up 0.4s ease-out',
        'drift-slow': 'drift 18s ease-in-out infinite',
        'drift-slower': 'drift 26s ease-in-out infinite reverse',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

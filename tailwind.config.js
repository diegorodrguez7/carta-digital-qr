import forms from '@tailwindcss/forms';

export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        heading: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui'],
        body: ['"Manrope"', 'ui-sans-serif', 'system-ui'],
      },
      colors: {
        brand: {
          50: '#fff4ec',
          100: '#ffe3d1',
          200: '#ffc19c',
          300: '#ffa067',
          400: '#ff7f3d',
          500: '#f85c1b',
          600: '#d74911',
          700: '#b1380f',
          800: '#8b2c0f',
          900: '#6f230e',
        },
        ink: '#1f1729',
      },
      boxShadow: {
        glow: '0 20px 60px -20px rgba(248, 92, 27, 0.35)',
      },
    },
  },
  plugins: [forms],
};

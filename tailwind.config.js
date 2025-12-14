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
          50: '#edfffb',
          100: '#c6fff2',
          200: '#8cfee4',
          300: '#4af4d0',
          400: '#14ddb7',
          500: '#06c2a1',
          600: '#00a485',
          700: '#04846b',
          800: '#0a6756',
          900: '#0d5448',
        },
        ink: '#0f172a',
      },
      boxShadow: {
        glow: '0 20px 60px -20px rgba(16, 185, 129, 0.35)',
      },
    },
  },
  plugins: [forms],
};

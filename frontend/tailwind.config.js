/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: '#E2E8F0',
        input: '#E2E8F0',
        ring: '#00A896',
        background: '#F4FBF9',
        foreground: '#131E3A',
        // CarePulse Official Identity
        cp: {
          teal: '#00A896',
          cyan: '#00D2C4',
          darkteal: '#067A6E',
          navy: '#131E3A',
          mint: '#E6F7F5',
          subtle: '#F4FBF9',
          border: '#CCFBF1',
        },
        cream: {
          DEFAULT: '#F4FBF9',
          subtle: '#E6F7F5',
          dark: '#E2E8F0',
        },
        primary: {
          DEFAULT: '#00A896',
          hover: '#067A6E',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#E6F7F5',
          foreground: '#067A6E',
        },
        accent: {
          DEFAULT: '#111111',
          foreground: '#FFFFFF',
        },
        muted: {
          DEFAULT: '#EFECE4',
          foreground: '#6B7280',
        },
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#111111',
        },
        popover: {
          DEFAULT: '#FFFFFF',
          foreground: '#111111',
        },
        // Clinical semantic indicators
        'risk-low': '#16A34A',
        'risk-medium': '#D97706',
        'risk-high': '#DC2626',
        'sqi-high': '#111111',
        'sqi-medium': '#D97706',
        'sqi-low': '#DC2626',
      },
      borderRadius: {
        '3xl': '1.5rem',
        '2xl': '1rem',
        xl: '0.75rem',
        lg: '0.5rem',
      },
    },
  },
  plugins: [],
};

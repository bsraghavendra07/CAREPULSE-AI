/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Enterprise Dark Healthcare Palette
        cp: {
          bg: '#080B10',
          sidebar: '#10151C',
          card: '#141A23',
          elevated: '#1A222D',
          border: '#252D38',
          'border-subtle': '#1B222C',
          teal: {
            DEFAULT: '#20C997',
            hover: '#1BAF83',
            light: '#48D5AA',
            dark: '#148060',
            subtle: 'rgba(32, 201, 151, 0.12)',
            glow: 'rgba(32, 201, 151, 0.25)',
          },
          blue: {
            DEFAULT: '#36BFFA',
            hover: '#1FA8E3',
            subtle: 'rgba(54, 191, 250, 0.12)',
            glow: 'rgba(54, 191, 250, 0.25)',
          },
          success: {
            DEFAULT: '#10B981',
            subtle: 'rgba(16, 185, 129, 0.12)',
            border: 'rgba(16, 185, 129, 0.30)',
          },
          warning: {
            DEFAULT: '#F59E0B',
            subtle: 'rgba(245, 158, 11, 0.12)',
            border: 'rgba(245, 158, 11, 0.30)',
          },
          urgent: {
            DEFAULT: '#EF4444',
            subtle: 'rgba(239, 68, 68, 0.12)',
            border: 'rgba(239, 68, 68, 0.30)',
          },
          text: {
            primary: '#F8FAFC',
            secondary: '#94A3B8',
            muted: '#64748B',
          }
        },
        // Preserved semantic mappings for existing component compatibility
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#20C997', // Seamlessly aliased to primary teal
          600: '#0369a1',
          700: '#075985',
          800: '#0c4a6e',
          900: '#082f49',
        },
        watch: {
          bg: 'rgba(16, 185, 129, 0.12)',
          border: '#10B981',
          text: '#10B981'
        },
        review: {
          bg: 'rgba(245, 158, 11, 0.12)',
          border: '#F59E0B',
          text: '#F59E0B'
        },
        urgent: {
          bg: 'rgba(239, 68, 68, 0.12)',
          border: '#EF4444',
          text: '#EF4444'
        },
        sensor: {
          bg: 'rgba(139, 92, 246, 0.12)',
          border: '#8B5CF6',
          text: '#A78BFA'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'cp-card': '0 4px 20px -2px rgba(0, 0, 0, 0.45)',
        'cp-elevated': '0 8px 30px -4px rgba(0, 0, 0, 0.65)',
        'cp-teal': '0 0 20px -3px rgba(32, 201, 151, 0.22)',
        'cp-urgent': '0 0 25px -4px rgba(239, 68, 68, 0.25)',
      },
      borderColor: {
        DEFAULT: '#252D38',
      }
    },
  },
  plugins: [],
}

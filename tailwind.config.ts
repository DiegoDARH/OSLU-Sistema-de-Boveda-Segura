import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ─── Sidebar (dark navy extraído de image.png / Nexus) ───────────────
        sidebar: {
          bg:          '#0F172A',   // slate-900 — fondo base
          hover:       '#1E293B',   // slate-800 — hover / item activo
          active:      '#1E293B',
          border:      '#1E293B',
          text:        '#94A3B8',   // slate-400 — texto inactivo
          'text-active': '#F8FAFC', // slate-50  — texto activo
          'text-muted':  '#475569', // slate-600 — headers de sección
        },

        // ─── Superficies (contenido principal) ───────────────────────────────
        surface: {
          DEFAULT: '#F8FAFC',       // slate-50  — fondo de página
          card:    '#FFFFFF',
          hover:   '#F1F5F9',       // slate-100
          border:  '#E2E8F0',       // slate-200
        },

        // ─── Marca primaria (índigo — sensación de seguridad) ─────────────────
        brand: {
          50:  '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          400: '#818CF8',
          500: '#6366F1',           // principal
          600: '#4F46E5',
          700: '#4338CA',
          900: '#312E81',
        },

        // ─── Estados / Badges (extraídos de image.png) ───────────────────────
        status: {
          active:       '#16A34A',
          'active-bg':  '#DCFCE7',
          inactive:     '#64748B',
          'inactive-bg':'#F1F5F9',
          pending:      '#D97706',
          'pending-bg': '#FEF3C7',
          danger:       '#DC2626',
          'danger-bg':  '#FEE2E2',
          info:         '#2563EB',
          'info-bg':    '#DBEAFE',
        },
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },

      boxShadow: {
        card:       '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08)',
        'card-hover':'0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        modal:      '0 20px 25px -5px rgb(0 0 0 / 0.15), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        'inner-sm': 'inset 0 1px 2px 0 rgb(0 0 0 / 0.05)',
      },

      borderRadius: {
        xl:  '0.75rem',
        '2xl': '1rem',
      },

      animation: {
        'fade-in':   'fadeIn 0.2s ease-out',
        'slide-up':  'slideUp 0.25s ease-out',
        'spin-slow': 'spin 2s linear infinite',
      },

      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}

export default config

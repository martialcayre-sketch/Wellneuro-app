import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        surface: {
          DEFAULT: 'var(--surface)',
          foreground: 'var(--surface-foreground)',
          elevated: 'var(--color-surface-elevated)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        border: 'var(--border)',
        primary: {
          DEFAULT: 'rgb(var(--color-primary-rgb) / <alpha-value>)',
          foreground: 'var(--color-primary-foreground)',
        },
        accent: {
          DEFAULT: 'rgb(var(--color-accent-rgb) / <alpha-value>)',
          foreground: 'var(--color-accent-foreground)',
        },
        // Rail de navigation praticien — toujours sombre, indépendant de
        // data-theme (cf. docs/design-system-d1.md, section « Rail de navigation »).
        rail: {
          DEFAULT: 'var(--rail-background)',
          surface: 'var(--rail-surface)',
          foreground: 'var(--rail-foreground)',
          muted: 'var(--rail-muted)',
          'muted-foreground': 'var(--rail-muted-foreground)',
          border: 'var(--rail-border)',
          primary: {
            DEFAULT: 'rgb(var(--rail-primary-rgb) / <alpha-value>)',
            foreground: 'var(--rail-primary-foreground)',
          },
          accent: 'var(--rail-accent)',
          'focus-ring': 'var(--rail-focus-ring)',
        },
        // Palette de marque brute, disponible pour des usages ponctuels
        // en dehors des rôles sémantiques ci-dessus.
        teal: {
          950: 'var(--teal-950)',
          900: 'var(--teal-900)',
          700: 'var(--teal-700)',
          500: 'var(--teal-500)',
          200: 'var(--teal-200)',
        },
        gold: {
          600: 'var(--gold-600)',
          500: 'var(--gold-500)',
          300: 'var(--gold-300)',
        },
        violet: {
          600: 'var(--violet-600)',
          300: 'var(--violet-300)',
        },
        // Palette « la Spirale » (A5-R1) — cf. docs/design-system-d1.md §8.
        night: {
          950: 'var(--night-950)',
          900: 'var(--night-900)',
          800: 'var(--night-800)',
        },
        indigo: {
          600: 'rgb(var(--indigo-600-rgb) / <alpha-value>)',
        },
        mint: {
          600: 'rgb(var(--mint-600-rgb) / <alpha-value>)',
        },
        solar: {
          500: 'rgb(var(--solar-500-rgb) / <alpha-value>)',
          ink: 'var(--solar-ink)',
        },
        forest: {
          600: 'rgb(var(--forest-600-rgb) / <alpha-value>)',
        },
        copper: {
          500: 'rgb(var(--copper-500-rgb) / <alpha-value>)',
          ink: 'var(--copper-ink)',
        },
        // Trio catégoriel Corps/Ancrage/Esprit — fixe, indépendant des thèmes.
        viz: {
          corps: 'var(--viz-corps)',
          ancrage: 'var(--viz-ancrage)',
          esprit: 'var(--viz-esprit)',
        },
        status: {
          success: 'rgb(var(--color-status-success-rgb) / <alpha-value>)',
          warning: 'rgb(var(--color-status-warning-rgb) / <alpha-value>)',
          danger: 'rgb(var(--color-status-danger-rgb) / <alpha-value>)',
          info: 'rgb(var(--color-status-info-rgb) / <alpha-value>)',
        },
        focus: {
          ring: 'var(--color-focus-ring)',
        },
      },
      fontFamily: {
        // Rôles typographiques A5-R1 : les valeurs de --font-body /
        // --font-display / --font-mono sont attribuées par thème dans
        // globals.css (praticien : Sora/Instrument Sans/Plex Mono ;
        // patient : Bricolage Grotesque/Albert Sans/Plex Mono).
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius)',
        lg: 'var(--radius-lg)',
      },
    },
  },
  plugins: [],
};
export default config;

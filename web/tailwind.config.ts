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
        status: {
          success: 'var(--color-status-success)',
          warning: 'var(--color-status-warning)',
          danger: 'var(--color-status-danger)',
          info: 'var(--color-status-info)',
        },
        focus: {
          ring: 'var(--color-focus-ring)',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-lora)', 'serif'],
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

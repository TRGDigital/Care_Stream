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
        // §14.2 — CareStreamAI brand palette
        teal: {
          DEFAULT: '#0D6E6E',
          light: '#E6F4F4',
          dark: '#0A5858',
        },
        amber: {
          brand: '#E8850A',
        },
        neutral: {
          dark: '#1C2B2B',
          mid: '#5C7070',
          light: '#F4F8F8',
        },
        status: {
          success: '#1A8754',
          warning: '#C96B00',
          error: '#C0392B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      spacing: {
        // Base unit 8px (§14.4)
      },
      maxWidth: {
        content: '1200px',
      },
      borderRadius: {
        card: '12px',
        btn: '8px',
        pill: '9999px',
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.05)',
        'card-hover': '0 16px 48px rgba(0,0,0,0.14), 0 4px 12px rgba(0,0,0,0.08)',
        elevated: '0 6px 24px rgba(0,0,0,0.10)',
        'teal-glow': '0 4px 24px rgba(13,110,110,0.35)',
        'amber-glow': '0 4px 24px rgba(232,133,10,0.35)',
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #062F2F 0%, #0A4848 40%, #0D6E6E 100%)',
        'section-gradient': 'linear-gradient(180deg, #F4F8F8 0%, #FFFFFF 100%)',
        'teal-gradient': 'linear-gradient(135deg, #0D6E6E 0%, #0A5858 100%)',
        'amber-gradient': 'linear-gradient(135deg, #E8850A 0%, #C96B00 100%)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 9s ease-in-out infinite',
        'fade-up': 'fadeUp 0.6s ease-out forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config

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
        card: '8px',
        btn: '6px',
      },
      boxShadow: {
        card: '0 1px 4px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
}

export default config

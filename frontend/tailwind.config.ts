/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          900: 'var(--brand-900)',
          800: 'var(--brand-800)',
          600: 'var(--brand-600)',
          500: 'var(--brand-500)',
            DEFAULT: 'var(--brand-500)',
          400: 'var(--brand-400)',
          300: 'var(--brand-300)',
        },
      },
    },
  },
  plugins: [],
}
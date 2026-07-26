/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        inter: ['var(--font-inter)', 'Inter', 'sans-serif'],
      },
      maxWidth: {
        '9xl': '96rem',
      },
      // Sharp / tech-dashboard radii: crisp 2–4px corners instead of the soft
      // 8–12px defaults. Pills (rounded-full) stay round for status chips/avatars.
      borderRadius: {
        sm: '2px',
        DEFAULT: '2px',
        md: '3px',
        lg: '3px',
        xl: '4px',
        '2xl': '6px',
        '3xl': '8px',
      },
    },
  },
  plugins: [],
}

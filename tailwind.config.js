/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: '#1A312C',
        sage: '#428475',
        mint: '#89D7B7',
        cream: '#FFF4E1',
      }
    },
  },
  plugins: [],
}

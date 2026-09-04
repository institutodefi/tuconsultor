/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        /* Orbita.PMTools · identidad v4.0: navy profundo + verde órbita */
        navy: { 50:'#EAF4F7', 100:'#D2E6EC', 200:'#A6CBD6', 300:'#6FA6B7', 400:'#3F7D93',
                500:'#2A607A', 600:'#1E5C72', 700:'#10394A', 800:'#0A2B3A', 900:'#061F2B' },
        brand: { orange:'#F99001', orangeDark:'#DB7F00', verde:'#1FA1A6', verdeTexto:'#4FD9DE',
                 cream:'#F6FAFB', ink:'#EAF4F7', muted:'#7FA7B4', lateral:'#061F2B', superficie:'#10394A' },
      },
      fontFamily: { sans: ['Manrope','system-ui','sans-serif'], orbita: ['Manrope','system-ui','sans-serif'] },
    },
  },
  plugins: [],
};

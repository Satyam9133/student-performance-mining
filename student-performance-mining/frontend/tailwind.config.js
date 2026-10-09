/** Design tokens: slate paper, ink-navy chrome, one cobalt accent, one colour per class. */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"Public Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        paper: '#EDF1F6', ink: '#0E1B2C', navy: '#0F1B33', line: '#D6DEE8', muted: '#5B6B80',
        cobalt: { DEFAULT: '#2F4BD0', soft: '#E6EBFB', dark: '#2237A3' },
        mint: '#5EEAD4',
        cls: { excellent: '#1B7F5C', good: '#2F6FDB', average: '#D99A00', poor: '#CC4458' },
      },
      borderRadius: { card: '8px' },
    },
  },
  plugins: [],
}

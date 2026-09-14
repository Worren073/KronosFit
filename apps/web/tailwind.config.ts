import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          400: '#D4AF37',
          500: '#B8972B',
          600: '#9A7D22',
        },
      },
      backgroundColor: {
        'glass': 'rgba(0, 0, 0, 0.3)',
      },
      backdropBlur: {
        'glass': '12px',
      },
      borderColor: {
        'glass': 'rgba(212, 175, 55, 0.3)',
      },
    },
  },
  plugins: [],
};
export default config;
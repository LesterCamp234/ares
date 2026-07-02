/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx,css,md,mdx,html,json,scss}',
  ],
  theme: {
    extend: {
      colors: {
        base0: "var(--color-base0)",
        base1: "var(--color-base1)",
        base1a: "var(--color-base1a)",
        base2: "var(--color-base2)",
        base3: "var(--color-base3)",
        base4: "var(--color-base4)",
        green0: "var(--color-green0)",
        red: "var(--color-red)",
        orange: "var(--color-orange)",
        bgorange0: "var(--color-bgorange0)",
        bgorange: "var(--color-bgorange)",
        bgorange2: "var(--color-bgorange2)",
        green: "var(--color-green)",
        lightblue: "var(--color-lightblue)",
        blue: "var(--color-blue)",
        purp: "var(--color-purp)",
        bgpurp: "var(--color-bgpurp)",
        bggreen: "var(--color-bggreen)",
        testred: "var(--color-testred)",
        testgreen: "var(--color-testgreen)"
      },
    },
  },
  plugins: [],
}


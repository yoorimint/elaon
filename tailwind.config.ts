import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#f7931a",
          dark: "#b36e14",
        },
      },
    },
  },
  plugins: [],
};
export default config;

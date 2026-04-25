import type { Config } from "tailwindcss";

const config: Config = {
  // 'class' 전략 — <html> 에 'dark' 클래스 붙이면 다크모드.
  // OS 설정 자동 추종 + 유저 수동 토글 둘 다 지원하기 위함.
  darkMode: "class",
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

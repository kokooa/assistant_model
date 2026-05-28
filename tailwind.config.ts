import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  // 포팅한 assistant 디자인 시스템(자체 reset 포함)을 보존하려고 preflight 끔.
  // 유틸리티 클래스만 새 UI에서 추가로 사용.
  corePlugins: { preflight: false },
  theme: { extend: {} },
  plugins: [],
} satisfies Config;

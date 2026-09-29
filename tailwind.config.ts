import type { Config } from "tailwindcss";

// Every color is a CSS variable (defined in globals.css) so the whole app
// switches between light and dark automatically with the device setting.
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: token("paper"),
        surface: token("surface"),
        ink: token("ink"),
        line: token("line"),
        amber: { DEFAULT: token("amber"), soft: token("amber-soft") },
        overdue: token("overdue"),
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Text"',
          "Inter",
          '"Segoe UI"',
          "sans-serif",
        ],
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
      },
    },
  },
  plugins: [],
};

export default config;

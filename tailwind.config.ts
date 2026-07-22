import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: { colors: { border: "hsl(var(--border))", background: "hsl(var(--background))", foreground: "hsl(var(--foreground))", muted: "hsl(var(--muted))", "muted-foreground": "hsl(var(--muted-foreground))", primary: "hsl(var(--primary))" } } },
  plugins: [],
} satisfies Config;

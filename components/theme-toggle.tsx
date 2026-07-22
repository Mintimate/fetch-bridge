"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type ThemeMode = "system" | "light" | "dark";

function savedTheme(): ThemeMode {
  const saved = localStorage.getItem("fetch-bridge-theme");
  return saved === "light" || saved === "dark" ? saved : "system";
}

function applyTheme(theme: ThemeMode) {
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
}

const options = [
  { mode: "system", label: "跟随系统", Icon: Monitor },
  { mode: "light", label: "亮色模式", Icon: Sun },
  { mode: "dark", label: "暗色模式", Icon: Moon },
] as const;

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("system");

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      const next = savedTheme();
      setTheme(next);
      applyTheme(next);
    };
    sync();
    const followSystem = () => {
      if (savedTheme() === "system") sync();
    };
    media.addEventListener("change", followSystem);
    return () => media.removeEventListener("change", followSystem);
  }, []);

  function selectTheme(next: ThemeMode) {
    localStorage.setItem("fetch-bridge-theme", next);
    setTheme(next);
    applyTheme(next);
  }

  return (
    <div
      className="inline-flex h-9 items-center rounded-md border bg-background p-0.5"
      role="group"
      aria-label="颜色主题"
    >
      {options.map(({ mode, label, Icon }) => (
        <button
          key={mode}
          type="button"
          title={label}
          aria-label={label}
          aria-pressed={theme === mode}
          onClick={() => selectTheme(mode)}
          className={`grid h-7 w-8 place-items-center rounded transition-colors ${theme === mode ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}

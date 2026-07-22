"use client";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  function toggle() { const next = !dark; document.documentElement.classList.toggle("dark", next); localStorage.setItem("fetch-bridge-theme", next ? "dark" : "light"); setDark(next); }
  return <button onClick={toggle} className="inline-flex h-9 w-9 items-center justify-center rounded-md border text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="切换颜色主题">{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>;
}

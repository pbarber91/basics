"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function ModeToggle() {
  const { setTheme, theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Avoid hydration mismatch
  const current = theme === "system" ? systemTheme : theme;
  const isDark = current === "dark";

  if (!mounted) {
    return (
      <Button variant="outline" size="sm" className="w-9 px-0" aria-label="Toggle theme" />
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="w-9 px-0"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={isDark ? "Switch to Light" : "Switch to Dark"}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

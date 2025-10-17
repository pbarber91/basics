"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"           // toggles 'dark' class on <html>
      defaultTheme="system"       // follow OS by default
      enableSystem
      disableTransitionOnChange   // avoid flashy transitions
    >
      {children}
    </NextThemesProvider>
  );
}
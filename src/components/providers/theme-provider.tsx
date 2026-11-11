"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ThemeProviderProps } from "next-themes"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      {...props}
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange={false}
      storageKey="getpidief-theme"
      themes={["light", "dark", "system"]}
    >
      {children}
    </NextThemesProvider>
  )
}

// Theme script for SSR to prevent flash
export function ThemeScript() {
  return (
    <script
      suppressHydrationWarning
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            function getInitialTheme() {
              const storedTheme = localStorage.getItem('getpidief-theme');
              if (storedTheme) {
                return storedTheme;
              }
              return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }
            
            const theme = getInitialTheme();
            document.documentElement.classList.toggle('dark', theme === 'dark');
          })();
        `,
      }}
    />
  );
}

"use client";

import { useEffect } from "react";
import { useUIStore } from "@/stores/index";

/**
 * Convenience hook for the ⌘K command palette.
 * Handles keyboard shortcut registration automatically when mounted.
 */
export function useCommandPalette() {
  const isOpen = useUIStore((s) => s.commandPaletteOpen);
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen);

  // Register ⌘K / Ctrl+K globally
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [setOpen]);

  return {
    isOpen,
    open:  () => setOpen(true),
    close: () => setOpen(false),
    toggle:() => setOpen(!isOpen),
  };
}
"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils/cn";

interface AutocompleteItem {
  type:   string;
  label:  string;
  sublabel?: string;
  href?:  string;
}

interface SearchBarProps {
  defaultValue?: string;
  placeholder?:  string;
  size?:         "md" | "lg";
  className?:    string;
  onSearch?:     (q: string) => void;
}

export function SearchBar({
  defaultValue = "",
  placeholder  = "Search by title, course, keyword, institution…",
  size         = "md",
  className,
  onSearch,
}: SearchBarProps) {
  const router = useRouter();
  const [query,       setQuery]       = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<AutocompleteItem[]>([]);
  const [showDrop,    setShowDrop]    = useState(false);
  const [cursor,      setCursor]      = useState(-1);
  const [isPending,   startTransition]= useTransition();
  const inputRef   = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debouncedQ = useDebounce(query, 250);

  // Fetch autocomplete
  useEffect(() => {
    if (debouncedQ.length < 2) {
      setSuggestions([]);
      setShowDrop(false);
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch(`/api/search/autocomplete?q=${encodeURIComponent(debouncedQ)}`);
        const json = await res.json();
        setSuggestions(json.data ?? []);
        setShowDrop(true);
        setCursor(-1);
      } catch {
        setSuggestions([]);
      }
    });
  }, [debouncedQ]);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDrop(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function submit(q: string = query) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setShowDrop(false);
    if (onSearch) {
      onSearch(trimmed);
    } else {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDrop) {
      if (e.key === "Enter") submit();
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setCursor((c) => Math.min(c + 1, suggestions.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setCursor((c) => Math.max(c - 1, -1));
        break;
      case "Enter":
        e.preventDefault();
        if (cursor >= 0 && suggestions[cursor]) {
          const item = suggestions[cursor]!;
          if (item.href) router.push(item.href);
          else submit(item.label);
        } else {
          submit();
        }
        setShowDrop(false);
        break;
      case "Escape":
        setShowDrop(false);
        break;
    }
  }

  const isLg = size === "lg";

  return (
    <div ref={wrapperRef} className={cn("relative w-full", className)}>
      <div
        className={cn(
          "flex items-center gap-2 bg-secondary border border-border rounded-xl",
          "transition-all duration-150",
          "focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20",
          isLg ? "h-14 px-4 gap-3" : "h-10 px-3"
        )}
      >
        {/* Search icon */}
        <svg
          width={isLg ? 18 : 15}
          height={isLg ? 18 : 15}
          viewBox="0 0 18 18"
          fill="none"
          className="text-muted-foreground shrink-0"
          aria-hidden
        >
          <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M12 12L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>

        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowDrop(true)}
          placeholder={placeholder}
          className={cn(
            "flex-1 bg-transparent text-foreground placeholder:text-muted-foreground",
            "outline-none border-none",
            isLg ? "text-base" : "text-sm"
          )}
          autoComplete="off"
          spellCheck={false}
          aria-label="Search"
          aria-autocomplete="list"
          aria-expanded={showDrop}
        />

        {/* Clear button */}
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(""); setSuggestions([]); setShowDrop(false); inputRef.current?.focus(); }}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
            aria-label="Clear search"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        )}

        {/* Filter icon button (for search page) */}
        {isLg && (
          <div className="w-px h-6 bg-border" />
        )}

        {/* Submit */}
        <button
          type="button"
          onClick={() => submit()}
          className={cn(
            "shrink-0 bg-primary text-primary-foreground font-medium rounded-lg",
            "hover:bg-primary/90 active:scale-95 transition-all duration-150",
            isLg ? "px-5 py-2 text-sm" : "px-3 py-1.5 text-xs"
          )}
          aria-label="Search"
        >
          {isPending ? (
            <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" aria-hidden>
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
              <path d="M7 2a5 5 0 015 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          ) : "Search"}
        </button>
      </div>

      {/* Autocomplete dropdown */}
      {showDrop && suggestions.length > 0 && (
        <div
          role="listbox"
          className="absolute top-full left-0 right-0 mt-2 z-50
                     bg-popover border border-border rounded-xl shadow-lg overflow-hidden"
        >
          {suggestions.slice(0, 8).map((item, idx) => (
            <button
              key={`${item.type}-${item.label}`}
              role="option"
              aria-selected={cursor === idx}
              onClick={() => {
                if (item.href) router.push(item.href);
                else { setQuery(item.label); submit(item.label); }
                setShowDrop(false);
              }}
              onMouseEnter={() => setCursor(idx)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm",
                "transition-colors duration-100",
                cursor === idx ? "bg-secondary" : "hover:bg-secondary/50"
              )}
            >
              <TypeIcon type={item.type} />
              <span className="flex-1 min-w-0">
                <span className="text-foreground block truncate">{item.label}</span>
                {item.sublabel && (
                  <span className="text-xs text-muted-foreground">{item.sublabel}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TypeIcon({ type }: { type: string }) {
  return (
    <span className="text-muted-foreground shrink-0">
      {type === "recent" && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
          <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M6 3.5V6l2 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      )}
      {type === "popular" && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path d="M1 9L4 6l2.5 2L10 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
      {type === "document" && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
          <rect x="2" y="1" width="8" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M4 4h4M4 6.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      )}
      {type === "category" && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
          <rect x="1" y="1" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
          <rect x="7" y="1" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
          <rect x="1" y="7" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
          <rect x="7" y="7" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
        </svg>
      )}
    </span>
  );
}
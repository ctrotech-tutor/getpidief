"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils/cn";

interface Tag { id: string; name: string; slug: string; }

interface TagInputProps {
  value:          Tag[];
  onChange:       (tags: Tag[]) => void;
  maxTags?:       number;
  placeholder?:   string;
  className?:     string;
  error?:         string;
}

export function TagInput({
  value      = [],
  onChange,
  maxTags    = 10,
  placeholder= "Add a tag…",
  className,
  error,
}: TagInputProps) {
  const [query,       setQuery]       = useState("");
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [showDrop,    setShowDrop]    = useState(false);
  const [cursor,      setCursor]      = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef  = useRef<HTMLDivElement>(null);
  const debouncedQ = useDebounce(query, 220);

  // Fetch tag suggestions
  useEffect(() => {
    if (!debouncedQ.trim() || debouncedQ.length < 2) {
      setSuggestions([]);
      setShowDrop(false);
      return;
    }
    setLoading(true);
    fetch(`/api/tags?q=${encodeURIComponent(debouncedQ)}&limit=8`)
      .then((r) => r.json())
      .then((json) => {
        const existing = new Set(value.map((t) => t.id));
        setSuggestions((json.data ?? []).filter((t: Tag) => !existing.has(t.id)));
        setShowDrop(true);
        setCursor(-1);
      })
      .catch(() => setSuggestions([]))
      .finally(() => setLoading(false));
  }, [debouncedQ, value]);

  // Close on outside click
  useEffect(() => {
    function h(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShowDrop(false);
      }
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const addTag = useCallback((tag: Tag) => {
    if (value.length >= maxTags || value.some((t) => t.id === tag.id)) return;
    onChange([...value, tag]);
    setQuery("");
    setSuggestions([]);
    setShowDrop(false);
    inputRef.current?.focus();
  }, [value, maxTags, onChange]);

  const removeTag = useCallback((id: string) => {
    onChange(value.filter((t) => t.id !== id));
  }, [value, onChange]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !query && value.length > 0) {
      removeTag(value[value.length - 1]!.id);
      return;
    }
    if (e.key === "Enter" && query.trim()) {
      e.preventDefault();
      if (cursor >= 0 && suggestions[cursor]) {
        addTag(suggestions[cursor]!);
      } else if (query.trim().length >= 2) {
        // Create new tag inline — temporary ID, server resolves
        addTag({
          id:   `new:${query.trim().toLowerCase().replace(/\s+/g, "-")}`,
          name: query.trim(),
          slug: query.trim().toLowerCase().replace(/\s+/g, "-"),
        });
      }
      return;
    }
    if (!showDrop) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, suggestions.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setCursor((c) => Math.max(c - 1, -1)); }
    if (e.key === "Escape")    { setShowDrop(false); }
  }

  const atMax = value.length >= maxTags;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div
        ref={wrapRef}
        className={cn(
          "relative min-h-[44px] flex flex-wrap items-center gap-1.5 px-3 py-2",
          "bg-secondary border rounded-xl transition-all cursor-text",
          error ? "border-destructive" : "border-border hover:border-ring/40",
          "focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20"
        )}
        onClick={() => inputRef.current?.focus()}
        role="group"
        aria-label="Tag input"
      >
        {/* Existing tags */}
        {value.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 rounded-full
                       bg-primary/10 border border-primary/20 text-xs font-medium text-primary"
          >
            {tag.name}
            <button
              type="button"
              onClick={() => removeTag(tag.id)}
              className="w-4 h-4 rounded-full flex items-center justify-center
                         hover:bg-primary/20 transition-colors"
              aria-label={`Remove tag ${tag.name}`}
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden>
                <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </button>
          </span>
        ))}

        {/* Input */}
        {!atMax && (
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setShowDrop(true)}
            placeholder={value.length === 0 ? placeholder : ""}
            className="flex-1 min-w-[120px] bg-transparent text-sm text-foreground
                       placeholder:text-muted-foreground outline-none border-none py-0.5"
            aria-label="Add tag"
            aria-autocomplete="list"
            aria-expanded={showDrop}
          />
        )}

        {/* Loading spinner */}
        {loading && (
          <svg className="animate-spin w-3.5 h-3.5 text-muted-foreground shrink-0" viewBox="0 0 14 14" fill="none" aria-hidden>
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
            <path d="M7 2a5 5 0 015 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        )}

        {/* Autocomplete dropdown */}
        {showDrop && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 z-50
                          bg-popover border border-border rounded-xl shadow-lg overflow-hidden">
            {suggestions.map((tag, idx) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => addTag(tag)}
                onMouseEnter={() => setCursor(idx)}
                className={cn(
                  "w-full px-4 py-2.5 text-left text-sm text-foreground transition-colors",
                  cursor === idx ? "bg-secondary" : "hover:bg-secondary/50"
                )}
              >
                {tag.name}
              </button>
            ))}
            {/* Create new option */}
            {query.trim().length >= 2 && (
              <button
                type="button"
                onClick={() => addTag({
                  id:   `new:${query.trim().toLowerCase().replace(/\s+/g, "-")}`,
                  name: query.trim(),
                  slug: query.trim().toLowerCase().replace(/\s+/g, "-"),
                })}
                className="w-full px-4 py-2.5 text-left text-sm text-primary border-t border-border
                           hover:bg-secondary/50 transition-colors flex items-center gap-2"
              >
                <span className="text-base">+</span>
                Create &ldquo;{query.trim()}&rdquo;
              </button>
            )}
          </div>
        )}
      </div>

      {/* Count + error */}
      <div className="flex items-center justify-between">
        {error && <p className="text-xs text-destructive">{error}</p>}
        <p className={cn("text-xs ml-auto", atMax ? "text-[var(--gold)]" : "text-muted-foreground")}>
          {value.length}/{maxTags} tags{atMax ? " (max)" : ""}
        </p>
      </div>
    </div>
  );
}

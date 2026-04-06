"use client";

import { useActionState, useState, useRef, useEffect, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { saveOnboardingStep1, searchInstitutions } from "@/lib/auth/onboardingActions";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils/cn";
import type { ActionResult } from "@/lib/utils/api";

type Institution = {
  id: string;
  name: string;
  slug: string;
  country: string;
  countryCode: string;
  type: string;
  logoUrl: string | null;
  documentCount: number;
};

interface Props {
  popularInstitutions: Institution[];
}

const initialState: ActionResult<{ next: string }> = { success: false, error: "" } as any;

export function InstitutionSearchStep({ popularInstitutions }: Props) {
  const router  = useRouter();
  const [state, action] = useActionState(
    async (prev: ActionResult<{ next: string }>, formData: FormData) => {
      const result = await saveOnboardingStep1(prev, formData);
      if (result.success) router.push((result as any).data.next);
      return result;
    },
    initialState
  );

  const [query,     setQuery]     = useState("");
  const [results,   setResults]   = useState<Institution[]>([]);
  const [selected,  setSelected]  = useState<Institution | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, startSearch]  = useTransition();
  const debouncedQuery            = useDebounce(query, 280);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    startSearch(async () => {
      const rows = await searchInstitutions(debouncedQuery);
      setResults(rows as Institution[]);
      setShowDropdown(true);
    });
  }, [debouncedQuery]);

  function selectInstitution(inst: Institution) {
    setSelected(inst);
    setQuery(inst.name);
    setShowDropdown(false);
    inputRef.current?.blur();
  }

  function clearSelection() {
    setSelected(null);
    setQuery("");
    setResults([]);
    inputRef.current?.focus();
  }

  const typeLabels: Record<string, string> = {
    university: "University", college: "College",
    institute: "Institute",   polytechnic: "Polytechnic",
  };

  return (
    <form action={action} className="space-y-6">
      {!state.success && state.error && (
        <p role="alert" className="text-sm text-destructive">{state.error}</p>
      )}

      {/* Hidden field carries the selected institution ID */}
      <input type="hidden" name="institutionId" value={selected?.id ?? ""} />

      {/* Search input */}
      <div className="relative">
        <label htmlFor="institution-search" className="text-sm font-medium text-foreground block mb-1.5">
          Search your university or college
        </label>

        <div className="relative">
          {/* Search icon */}
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </div>

          <input
            ref={inputRef}
            id="institution-search"
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
            placeholder="Search your university or college…"
            autoComplete="off"
            className={cn(
              "w-full h-12 pl-10 pr-10 rounded-xl bg-secondary border border-border",
              "text-sm placeholder:text-muted-foreground",
              "transition-all hover:border-ring/40",
              "focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/20",
              selected && "border-primary/50 bg-primary/5"
            )}
          />

          {/* Clear button */}
          {query && (
            <button
              type="button"
              onClick={clearSelection}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear selection"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>

        {/* Dropdown results */}
        {showDropdown && results.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1.5
                          bg-popover border border-border rounded-xl shadow-lg overflow-hidden">
            {results.map((inst) => (
              <button
                key={inst.id}
                type="button"
                onClick={() => selectInstitution(inst)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left
                           hover:bg-secondary transition-colors first:rounded-t-xl last:rounded-b-xl"
              >
                {/* Logo or initials */}
                <div className="w-8 h-8 rounded-lg bg-secondary border border-border
                                flex items-center justify-center shrink-0 overflow-hidden">
                  {inst.logoUrl ? (
                    <img src={inst.logoUrl} alt="" className="w-full h-full object-contain p-1"/>
                  ) : (
                    <span className="text-xs font-bold text-muted-foreground">
                      {inst.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{inst.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {inst.country} · {typeLabels[inst.type] ?? inst.type}
                    {inst.documentCount > 0 && ` · ${inst.documentCount.toLocaleString()} docs`}
                  </p>
                </div>
                <span className="text-lg" aria-hidden>{getFlagEmoji(inst.countryCode)}</span>
              </button>
            ))}
          </div>
        )}

        {/* Searching indicator */}
        {searching && (
          <p className="absolute top-full mt-2 left-0 text-xs text-muted-foreground">Searching…</p>
        )}
      </div>

      {/* Selected institution chip */}
      {selected && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
            {selected.logoUrl ? (
              <img src={selected.logoUrl} alt="" className="w-5 h-5 object-contain"/>
            ) : (
              <span className="text-xs font-bold text-primary">{selected.name.slice(0, 1)}</span>
            )}
          </div>
          <p className="text-sm font-medium text-foreground flex-1 truncate">{selected.name}</p>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-primary shrink-0" aria-hidden>
            <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M4 7l2 2L10 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}

      {/* Popular quick-picks */}
      {!selected && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-3">Popular institutions</p>
          <div className="flex flex-wrap gap-2">
            {popularInstitutions.map((inst) => (
              <button
                key={inst.id}
                type="button"
                onClick={() => selectInstitution(inst)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs
                           bg-secondary border border-border text-foreground
                           hover:border-primary/40 hover:bg-primary/5 transition-all duration-150"
              >
                <span aria-hidden>{getFlagEmoji(inst.countryCode)}</span>
                {inst.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Can't find it */}
      <p className="text-xs text-muted-foreground">
        Can't find your institution?{" "}
        <button type="button" className="text-primary hover:underline">
          Request it be added →
        </button>
      </p>

      <SubmitButton disabled={!selected} />
    </form>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={cn(
        "w-full h-11 rounded-xl font-medium text-sm",
        "bg-primary text-primary-foreground",
        "transition-all hover:bg-primary/90 active:scale-[0.98]",
        "disabled:opacity-40 disabled:cursor-not-allowed"
      )}
    >
      {pending ? "Saving…" : "Continue →"}
    </button>
  );
}

function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return "🏛️";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
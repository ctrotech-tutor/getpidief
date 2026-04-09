"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { cn } from "@/lib/utils/cn";

interface ActiveFiltersProps {
  filters: {
    q?:          string;
    category?:   string;
    institution?:string;
    type?:       string;
    yearFrom?:   number;
    yearTo?:     number;
    verified?:   boolean;
    language?:   string;
  };
  activeCategory?:    { id: string; name: string } | null;
  activeInstitution?: { id: string; name: string } | null;
}

const TYPE_LABELS: Record<string, string> = {
  past_exam:        "Past Exam",
  lecture_notes:    "Lecture Notes",
  research_paper:   "Research Paper",
  textbook_summary: "Textbook Summary",
  assignment:       "Assignment",
  tutorial_sheet:   "Tutorial Sheet",
  thesis:           "Thesis",
  dissertation:     "Dissertation",
  other:            "Other",
};

const LANG_LABELS: Record<string, string> = {
  en: "English", fr: "French", ar: "Arabic",
  es: "Spanish", pt: "Portuguese", sw: "Swahili",
};

export function ActiveFilters({
  filters,
  activeCategory,
  activeInstitution,
}: ActiveFiltersProps) {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const removeFilter = useCallback(
    (key: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete(key);
      params.set("page", "1");
      router.push(`/search?${params.toString()}`);
    },
    [router, searchParams]
  );

  const chips: { key: string; label: string }[] = [];

  if (filters.category && activeCategory) {
    chips.push({ key: "category", label: activeCategory.name });
  }
  if (filters.institution && activeInstitution) {
    chips.push({ key: "institution", label: activeInstitution.name });
  }
  if (filters.type) {
    chips.push({ key: "type", label: TYPE_LABELS[filters.type] ?? filters.type });
  }
  if (filters.yearFrom) {
    chips.push({ key: "yearFrom", label: `From ${filters.yearFrom}` });
  }
  if (filters.yearTo) {
    chips.push({ key: "yearTo", label: `To ${filters.yearTo}` });
  }
  if (filters.verified) {
    chips.push({ key: "verified", label: "Verified only" });
  }
  if (filters.language) {
    chips.push({ key: "language", label: LANG_LABELS[filters.language] ?? filters.language });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap" aria-label="Active filters">
      <span className="text-xs text-muted-foreground">Filters:</span>
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                     bg-primary/10 border border-primary/20 text-xs font-medium text-primary"
        >
          {chip.label}
          <button
            onClick={() => removeFilter(chip.key)}
            className="hover:text-foreground transition-colors"
            aria-label={`Remove ${chip.label} filter`}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
              <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </button>
        </span>
      ))}

      <button
        onClick={() => {
          const q = searchParams.get("q");
          router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
        }}
        className="text-xs text-muted-foreground hover:text-destructive transition-colors ml-1"
      >
        Clear all
      </button>
    </div>
  );
}
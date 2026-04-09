"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { cn } from "@/lib/utils/cn";

interface Category {
  id:           string;
  name:         string;
  color:        string;
  documentCount:number;
}

const RESOURCE_TYPES = [
  { value: "past_exam",        label: "Past Exam",          count: null },
  { value: "lecture_notes",    label: "Lecture Notes",      count: null },
  { value: "research_paper",   label: "Research Paper",     count: null },
  { value: "textbook_summary", label: "Textbook Summary",   count: null },
  { value: "assignment",       label: "Assignment",         count: null },
  { value: "tutorial_sheet",   label: "Tutorial Sheet",     count: null },
  { value: "thesis",           label: "Thesis",             count: null },
  { value: "dissertation",     label: "Dissertation",       count: null },
  { value: "other",            label: "Other",              count: null },
] as const;

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 2009 }, (_, i) => CURRENT_YEAR - i);

interface FilterSidebarProps {
  categories:     Category[];
  currentFilters: {
    category?:    string;
    type?:        string;
    yearFrom?:    number;
    yearTo?:      number;
    verified?:    boolean;
    language?:    string;
  };
}

export function FilterSidebar({ categories, currentFilters }: FilterSidebarProps) {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      params.set("page", "1"); // reset to first page
      router.push(`/search?${params.toString()}`);
    },
    [router, searchParams]
  );

  const clearAll = useCallback(() => {
    const q = searchParams.get("q");
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  }, [router, searchParams]);

  const hasAnyFilter = !!(
    currentFilters.category ||
    currentFilters.type ||
    currentFilters.yearFrom ||
    currentFilters.yearTo ||
    currentFilters.verified
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Filter Results</h3>
        {hasAnyFilter && (
          <button
            onClick={clearAll}
            className="text-xs text-primary hover:text-primary/80 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Category */}
      <FilterSection title="Category">
        <div className="space-y-1">
          {categories.map((cat) => (
            <FilterCheckbox
              key={cat.id}
              label={cat.name}
              count={cat.documentCount}
              checked={currentFilters.category === cat.id}
              accentColor={cat.color}
              onChange={(checked) =>
                updateFilter("category", checked ? cat.id : null)
              }
            />
          ))}
        </div>
      </FilterSection>

      {/* Resource Type */}
      <FilterSection title="Resource Type">
        <div className="space-y-1">
          {RESOURCE_TYPES.map((rt) => (
            <FilterCheckbox
              key={rt.value}
              label={rt.label}
              checked={currentFilters.type === rt.value}
              onChange={(checked) =>
                updateFilter("type", checked ? rt.value : null)
              }
            />
          ))}
        </div>
      </FilterSection>

      {/* Academic Year */}
      <FilterSection title="Academic Year">
        <div className="flex items-center gap-2">
          <select
            value={currentFilters.yearFrom ?? ""}
            onChange={(e) => updateFilter("yearFrom", e.target.value || null)}
            className="flex-1 h-9 px-2 text-sm bg-secondary border border-border rounded-lg
                       text-foreground outline-none hover:border-ring/40
                       focus:border-ring focus:ring-1 focus:ring-ring/20"
          >
            <option value="">From</option>
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <span className="text-muted-foreground text-xs">–</span>
          <select
            value={currentFilters.yearTo ?? ""}
            onChange={(e) => updateFilter("yearTo", e.target.value || null)}
            className="flex-1 h-9 px-2 text-sm bg-secondary border border-border rounded-lg
                       text-foreground outline-none hover:border-ring/40
                       focus:border-ring focus:ring-1 focus:ring-ring/20"
          >
            <option value="">To</option>
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </FilterSection>

      {/* Verified Only */}
      <FilterSection title="Quality">
        <FilterCheckbox
          label="Verified only"
          sublabel="Reviewed by moderators"
          checked={!!currentFilters.verified}
          onChange={(checked) => updateFilter("verified", checked ? "true" : null)}
          accentColor="#F59E0B"
        />
      </FilterSection>

      {/* Language */}
      <FilterSection title="Language">
        <select
          value={currentFilters.language ?? ""}
          onChange={(e) => updateFilter("language", e.target.value || null)}
          className="w-full h-9 px-2 text-sm bg-secondary border border-border rounded-lg
                     text-foreground outline-none hover:border-ring/40
                     focus:border-ring focus:ring-1 focus:ring-ring/20"
        >
          <option value="">All languages</option>
          <option value="en">English</option>
          <option value="fr">French</option>
          <option value="ar">Arabic</option>
          <option value="es">Spanish</option>
          <option value="pt">Portuguese</option>
          <option value="sw">Swahili</option>
          <option value="zu">Zulu</option>
          <option value="yo">Yoruba</option>
          <option value="ha">Hausa</option>
        </select>
      </FilterSection>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FilterSection({
  title,
  children,
}: {
  title:    string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {title}
      </p>
      {children}
    </div>
  );
}

function FilterCheckbox({
  label,
  sublabel,
  count,
  checked,
  accentColor,
  onChange,
}: {
  label:        string;
  sublabel?:    string;
  count?:       number | null;
  checked:      boolean;
  accentColor?: string;
  onChange:     (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group py-0.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-3.5 h-3.5 rounded border-border bg-secondary cursor-pointer"
        style={{ accentColor: accentColor ?? "var(--color-primary)" }}
      />
      <span className={cn(
        "text-sm flex-1 leading-snug transition-colors",
        checked ? "text-foreground font-medium" : "text-muted-foreground group-hover:text-foreground"
      )}>
        {label}
        {sublabel && (
          <span className="block text-xs text-muted-foreground font-normal">{sublabel}</span>
        )}
      </span>
      {count != null && (
        <span className="text-xs text-muted-foreground">{count.toLocaleString()}</span>
      )}
    </label>
  );
}
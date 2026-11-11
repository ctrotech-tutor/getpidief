"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type SortControlsProps = {
  currentSort: string;
};

const options = [
  { value: "relevance", label: "Most Relevant" },
  { value: "recent", label: "Most Recent" },
  { value: "downloads", label: "Most Downloaded" },
  { value: "likes", label: "Highest Rated" },
  { value: "discussed", label: "Most Discussed" },
];

export function SortControls({ currentSort }: SortControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort-select" className="text-xs text-muted-foreground whitespace-nowrap">
        Sort by:
      </label>
      <select
        id="sort-select"
        defaultValue={currentSort}
        className="text-sm bg-secondary border border-border rounded-lg px-2 py-1.5
                   text-foreground cursor-pointer outline-none
                   hover:border-ring/40 focus:border-ring focus:ring-2 focus:ring-ring/20"
        onChange={(e) => {
          const next = new URLSearchParams(searchParams.toString());
          next.set("sort", e.target.value);
          next.set("page", "1");
          router.push(`${pathname}?${next.toString()}`);
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

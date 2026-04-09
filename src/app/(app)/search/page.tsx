import type { Metadata } from "next";
import { Suspense } from "react";
import { searchDocuments } from "@/lib/search/search";
import { auth } from "@/lib/auth/auth";
import { searchQuerySchema } from "@/lib/validations/schemas";
import { SearchBar } from "@/components/features/search/SearchBar";
import { FilterSidebar } from "@/components/features/search/FilterSidebar";
import { SearchResults } from "@/components/features/search/SearchResults";
import { ActiveFilters } from "@/components/features/search/ActiveFilters";
import { SearchPagination } from "@/components/features/search/SearchPagination";
import { db } from "@/lib/db/client";
import { categories, institutions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const metadata: Metadata = {
  title: "Search — getpidief",
  description: "Search millions of verified academic resources.",
};

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;

  // Parse + validate all query params
  const parsed = searchQuerySchema.safeParse({
    q:         params.q    ?? "",
    category:  params.category,
    institution: params.institution,
    type:      params.type,
    yearFrom:  params.yearFrom,
    yearTo:    params.yearTo,
    verified:  params.verified,
    language:  params.language,
    sort:      params.sort ?? "relevance",
    page:      params.page  ?? "1",
    limit:     params.limit ?? "25",
  });

  const filters = parsed.success ? parsed.data : searchQuerySchema.parse({});

  // Auth (for institution-scoped visibility)
  const session = await auth();
  const user    = session?.user as any;

  // Execute search (server-side — no JS needed for initial render)
  const [searchResult, allCategories, activeCategory, activeInstitution] = await Promise.all([
    searchDocuments(
      {
        query:          filters.q,
        categoryIds:    filters.category ? [filters.category] : undefined,
        institutionIds: filters.institution ? [filters.institution] : undefined,
        resourceTypes:  filters.type ? [filters.type] : undefined,
        yearFrom:       filters.yearFrom,
        yearTo:         filters.yearTo,
        verifiedOnly:   filters.verified,
        language:       filters.language,
        sort:           filters.sort,
        page:           filters.page,
        limit:          filters.limit,
        institutionScoped: user?.institutionId ?? undefined,
      },
      user?.id
    ),
    db
      .select({ id: categories.id, name: categories.name, color: categories.color, documentCount: categories.documentCount })
      .from(categories)
      .where(eq(categories.isActive, true))
      .limit(20),
    filters.category
      ? db.select({ id: categories.id, name: categories.name })
          .from(categories).where(eq(categories.id, filters.category)).limit(1)
          .then((r) => r[0] ?? null)
      : null,
    filters.institution
      ? db.select({ id: institutions.id, name: institutions.name })
          .from(institutions).where(eq(institutions.id, filters.institution)).limit(1)
          .then((r) => r[0] ?? null)
      : null,
  ]);

  const hasQuery  = !!filters.q.trim();
  const hasFilter = !!(filters.category || filters.institution || filters.type || filters.yearFrom);

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
      {/* Search bar */}
      <div className="mb-6">
        <SearchBar
          defaultValue={filters.q}
          size="lg"
          placeholder="Search by title, course, keyword, institution…"
        />
      </div>

      <div className="flex gap-6">
        {/* ── Filter Sidebar (desktop) ─────────────────────────────────── */}
        <aside className="hidden lg:block w-64 shrink-0">
          <FilterSidebar
            categories={allCategories}
            currentFilters={filters}
          />
        </aside>

        {/* ── Main results area ─────────────────────────────────────────── */}
        <main className="flex-1 min-w-0 space-y-4">
          {/* Results header */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm text-muted-foreground">
                {hasQuery || hasFilter ? (
                  <>
                    Showing{" "}
                    <span className="font-medium text-foreground">
                      {searchResult.total.toLocaleString()}
                    </span>
                    {" "}results
                    {hasQuery && (
                      <> for <span className="font-medium text-foreground">"{filters.q}"</span></>
                    )}
                    <span className="text-xs ml-2 text-muted-foreground/60">
                      ({searchResult.queryTimeMs}ms)
                    </span>
                  </>
                ) : (
                  `${searchResult.total.toLocaleString()} documents in the archive`
                )}
              </p>
            </div>

            <SortControls currentSort={filters.sort} />
          </div>

          {/* Active filter chips */}
          <ActiveFilters
            filters={filters}
            activeCategory={activeCategory}
            activeInstitution={activeInstitution}
          />

          {/* Results */}
          <SearchResults
            results={searchResult.results}
            total={searchResult.total}
            query={filters.q}
          />

          {/* Pagination */}
          {searchResult.totalPages > 1 && (
            <SearchPagination
              currentPage={filters.page}
              totalPages={searchResult.totalPages}
              total={searchResult.total}
              limit={filters.limit}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function SortControls({ currentSort }: { currentSort: string }) {
  const options = [
    { value: "relevance", label: "Most Relevant" },
    { value: "recent",    label: "Most Recent"   },
    { value: "downloads", label: "Most Downloaded"},
    { value: "likes",     label: "Highest Rated" },
    { value: "discussed", label: "Most Discussed" },
  ];

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
          const url = new URL(window.location.href);
          url.searchParams.set("sort", e.target.value);
          url.searchParams.set("page", "1");
          window.location.href = url.toString();
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
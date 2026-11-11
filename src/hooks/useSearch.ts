"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

export type SearchSort = "relevance" | "recent" | "downloads" | "likes" | "discussed";

export interface SearchFilters {
  q?:           string;
  category?:    string;
  institution?: string;
  type?:        string;
  yearFrom?:    string;
  yearTo?:      string;
  verified?:    string;
  language?:    string;
  sort?:        SearchSort;
  page?:        string;
}

/**
 * URL-driven search state hook.
 * All filter state lives in URL params — shareable, SSR-compatible.
 */
export function useSearch() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [isPending, start] = useTransition();

  const filters: SearchFilters = {
    q:           searchParams.get("q")           ?? "",
    category:    searchParams.get("category")    ?? undefined,
    institution: searchParams.get("institution") ?? undefined,
    type:        searchParams.get("type")        ?? undefined,
    yearFrom:    searchParams.get("yearFrom")    ?? undefined,
    yearTo:      searchParams.get("yearTo")      ?? undefined,
    verified:    searchParams.get("verified")    ?? undefined,
    language:    searchParams.get("language")    ?? undefined,
    sort:       (searchParams.get("sort")        ?? "relevance") as SearchSort,
    page:        searchParams.get("page")        ?? "1",
  };

  const setFilter = useCallback(
    (key: keyof SearchFilters, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
      params.set("page", "1");
      start(() => router.push(`/search?${params.toString()}`));
    },
    [router, searchParams]
  );

  const setQuery = useCallback(
    (q: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (q.trim()) params.set("q", q.trim());
      else params.delete("q");
      params.set("page", "1");
      start(() => router.push(`/search?${params.toString()}`));
    },
    [router, searchParams]
  );

  const clearAll = useCallback(() => {
    const q = searchParams.get("q");
    start(() => router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search"));
  }, [router, searchParams]);

  const hasFilters = !!(
    filters.category || filters.institution || filters.type ||
    filters.yearFrom  || filters.yearTo     || filters.verified
  );

  return { filters, setFilter, setQuery, clearAll, hasFilters, isPending };
}
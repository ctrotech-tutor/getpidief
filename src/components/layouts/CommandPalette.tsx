"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useUIStore } from "@/stores/index"
import { useDebounce } from "@/hooks/useDebounce"

// shadcn UI Components
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { DialogTitle, DialogDescription } from "@/components/ui/dialog"

// Icons
import { MagnifyingGlass as Search, Clock, TrendUp as TrendingUp, FileText, SquaresFour as LayoutGrid, ArrowRight, CircleNotch as Loader2, House as Home, User, UploadSimple as Upload, GearSix as Settings, BookOpen } from "@phosphor-icons/react"

type ResultType = "recent" | "popular" | "document" | "category" | "navigate"

interface Result {
  type: ResultType
  label: string
  sublabel?: string
  href: string
  categoryId?: string
  documentSlug?: string
}

/** Payload items from `/api/search/autocomplete` */
interface AutocompleteApiItem {
  type: string
  label: string
  sublabel?: string
  href?: string
  documentSlug?: string
  categoryId?: string
}

const STATIC_ITEMS: Result[] = [
  { type: "navigate", label: "Explore Archive", href: "/explore", sublabel: "Homepage" },
  { type: "navigate", label: "Search Documents", href: "/search", sublabel: "Find resources" },
  { type: "navigate", label: "My Dashboard", href: "/dashboard", sublabel: "Your profile" },
  { type: "navigate", label: "Upload Document", href: "/dashboard/uploads", sublabel: "Contribute" },
  { type: "navigate", label: "My Library", href: "/dashboard/library", sublabel: "Saved resources" },
  { type: "navigate", label: "Settings", href: "/settings", sublabel: "Account & preferences" },
]

const TYPE_ICONS: Record<ResultType, React.ReactNode> = {
  recent: <Clock className="h-4 w-4" />,
  popular: <TrendingUp className="h-4 w-4" />,
  document: <FileText className="h-4 w-4" />,
  category: <LayoutGrid className="h-4 w-4" />,
  navigate: <ArrowRight className="h-4 w-4" />,
}

const TYPE_LABELS: Record<ResultType, string> = {
  recent: "Recent",
  popular: "Popular",
  document: "Documents",
  category: "Categories",
  navigate: "Navigation",
}

export function CommandPalette() {
  const router = useRouter()
  const open = useUIStore((s) => s.commandPaletteOpen)
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const debouncedQuery = useDebounce(query, 200)

  const handleClose = useCallback(() => setOpen(false), [setOpen])

  const handleSelect = useCallback(
    (href: string) => {
      router.push(href)
      handleClose()
    },
    [router, handleClose]
  )

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery("")
      setResults([])
      setLoading(false)
    }
  }, [open])

  // Fetch results when query changes
  useEffect(() => {
    if (!open || !debouncedQuery.trim()) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    fetch(`/api/search/autocomplete?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json() as Promise<{ data?: AutocompleteApiItem[] }>)
      .then((json) => {
        const items: Result[] = (json.data ?? []).map((item) => ({
          type: item.type as ResultType,
          label: item.label,
          sublabel: item.sublabel,
          href: item.href ?? `/search?q=${encodeURIComponent(item.label)}`,
          documentSlug: item.documentSlug,
          categoryId: item.categoryId,
        }))

        // Add search option
        items.push({
          type: "navigate",
          label: `Search for "${debouncedQuery}"`,
          sublabel: "View all results",
          href: `/search?q=${encodeURIComponent(debouncedQuery)}`,
        })

        setResults(items)
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false))
  }, [debouncedQuery, open])

  // Keyboard shortcut: ⌘K to open
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen(true)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [setOpen])

  // Group results by type
  const grouped = groupResults(results)

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <DialogTitle className="sr-only">Command Palette</DialogTitle>
      <DialogDescription className="sr-only">
        Search for documents, navigate the app, or run commands
      </DialogDescription>

      <CommandInput
        placeholder="Search documents, navigate, upload..."
        value={query}
        onValueChange={setQuery}
      />

      <CommandList>
        <CommandEmpty>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Searching...</span>
            </div>
          ) : (
            <div className="py-8 text-center">
              <Search className="mx-auto h-8 w-8 mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No results found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Try searching for documents, courses, or topics
              </p>
            </div>
          )}
        </CommandEmpty>

        {/* Show static items when no query */}
        {!query.trim() && (
          <CommandGroup heading="Quick Navigation">
            {STATIC_ITEMS.map((item) => (
              <CommandItem
                key={item.href}
                value={item.label}
                onSelect={() => handleSelect(item.href)}
                className="flex items-center gap-3"
              >
                <span className="text-muted-foreground">{TYPE_ICONS[item.type]}</span>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="truncate">{item.label}</span>
                  {item.sublabel && (
                    <span className="text-xs text-muted-foreground truncate">
                      {item.sublabel}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Show search results when query exists */}
        {query.trim() && grouped.map(({ type, items }) => (
          <CommandGroup key={type} heading={TYPE_LABELS[type]}>
            {items.map((item) => (
              <CommandItem
                key={`${item.type}-${item.href}`}
                value={`${item.label} ${item.sublabel || ""}`}
                onSelect={() => handleSelect(item.href)}
                className="flex items-center gap-3"
              >
                <span className="text-muted-foreground">{TYPE_ICONS[item.type]}</span>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="truncate">{item.label}</span>
                  {item.sublabel && (
                    <span className="text-xs text-muted-foreground truncate">
                      {item.sublabel}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>

      <CommandSeparator />

      {/* Footer */}
      <div className="px-4 py-2.5 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <kbd className="font-mono bg-muted px-1 rounded">↑↓</kbd>
            <span>navigate</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="font-mono bg-muted px-1 rounded">↵</kbd>
            <span>select</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="font-mono bg-muted px-1 rounded">Esc</kbd>
            <span>close</span>
          </span>
        </div>
        {loading && (
          <span className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Searching...</span>
          </span>
        )}
      </div>
    </CommandDialog>
  )
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function groupResults(results: Result[]) {
  const groups: { type: ResultType; items: Result[] }[] = []

  const byType = results.reduce<Record<ResultType, Result[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = []
    acc[r.type]!.push(r)
    return acc
  }, {} as Record<ResultType, Result[]>)

  const ORDER: ResultType[] = ["recent", "popular", "document", "category", "navigate"]

  for (const type of ORDER) {
    if (byType[type]?.length) {
      groups.push({ type, items: byType[type]! })
    }
  }

  return groups
}

"use client"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils/cn"
import { MagnifyingGlass as Search } from "@phosphor-icons/react"

interface TopNavSearchProps {
  onClick: () => void
}

export function TopNavSearch({ onClick }: TopNavSearchProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          onClick={onClick}
          className={cn(
            "w-full justify-start rounded-full bg-muted/50 text-sm font-normal text-muted-foreground shadow-none",
            "hover:bg-accent hover:text-accent-foreground",
            "focus-visible:ring-1 focus-visible:ring-ring"
          )}
        >
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <span className="flex-1 text-left truncate">
            Search resources, courses, institutions...
          </span>
          <kbd className="pointer-events-none ml-auto hidden lg:flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">Search (⌘K)</TooltipContent>
    </Tooltip>
  )
}

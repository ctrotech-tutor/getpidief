"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils/cn"

const LEVEL_COLORS: Record<string, string> = {
  scholar: "text-muted-foreground",
  analyst: "text-primary",
  archivist: "text-purple-500",
  senior_contributor: "text-amber-500",
  distinguished_scholar: "text-destructive",
}

interface TopNavReputationBadgeProps {
  level?: string
  score?: number
}

export function TopNavReputationBadge({ level, score }: TopNavReputationBadgeProps) {
  const color = LEVEL_COLORS[level ?? "scholar"] ?? LEVEL_COLORS.scholar
  const label = (level ?? "scholar").replace(/_/g, " ")
  return (
    <Badge variant="outline" className={cn("text-[10px] font-medium capitalize", color)}>
      ⭐ {score ?? 0} · {label}
    </Badge>
  )
}

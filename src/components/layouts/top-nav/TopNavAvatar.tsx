"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { SessionUser } from "@/hooks/useSession"
import { getInitials } from "@/lib/utils/format"

interface TopNavAvatarProps {
  user: SessionUser | null
  isLoading: boolean
}

export function TopNavAvatar({ user, isLoading }: TopNavAvatarProps) {
  if (isLoading) {
    return (
      <Avatar className="h-8 w-8">
        <AvatarFallback className="bg-secondary animate-pulse" />
      </Avatar>
    )
  }

  const initials = getInitials(user?.displayName || user?.name || "S")

  return (
    <Avatar className="h-8 w-8">
      <AvatarImage src={user?.avatarUrl || ""} alt={user?.displayName || "User avatar"} />
      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}

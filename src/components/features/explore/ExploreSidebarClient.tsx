"use client"

import { useSession } from "@/hooks/useSession"
import { ExploreSidebar } from "./ExploreSidebar"

interface SessionUser {
  id?: string;
  displayName?: string | null;
  name?: string | null;
  username?: string;
  avatarUrl?: string | null;
  reputationScore?: number;
  reputationLevel?: string;
  institutionId?: string | null;
  institutionName?: string;
  role?: string;
  uploadCount?: number;
  followerCount?: number;
  followingCount?: number;
}

interface ExploreSidebarClientProps {
  serverUser: SessionUser | null
}

export function ExploreSidebarClient({ serverUser }: ExploreSidebarClientProps) {
  const { user: clientUser, isLoading } = useSession()
  // Use client user if available (more up-to-date), fallback to server user
  const user = clientUser || serverUser
  return <ExploreSidebar user={user} isLoading={isLoading} />
}

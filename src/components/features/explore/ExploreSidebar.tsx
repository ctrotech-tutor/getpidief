"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils/cn"
import type { SessionUser } from "@/hooks/useSession"
import {
  Compass,
  Library,
  Upload,
  Bookmark,
  TrendingUp,
  Users,
  FileText,
  Award,
  GraduationCap,
  Settings,
  Sparkles,
  Plus,
} from "lucide-react"

interface ExploreSidebarProps {
  user: SessionUser | null
  isLoading: boolean
}

// Extended user properties that may be added to session
interface ExtendedUser extends SessionUser {
  uploadCount?: number
  followerCount?: number
  followingCount?: number
  institutionName?: string
}

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  badge?: string
  active?: boolean
}

export function ExploreSidebar({ user, isLoading }: ExploreSidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === "/explore") return pathname === "/explore"
    return pathname.startsWith(href)
  }

  const mainNav: NavItem[] = [
    { href: "/explore", label: "Explore", icon: <Compass className="h-4 w-4" /> },
    { href: "/dashboard/library", label: "My Library", icon: <Library className="h-4 w-4" /> },
    { href: "/dashboard/uploads", label: "My Uploads", icon: <FileText className="h-4 w-4" /> },
    { href: "/dashboard", label: "Dashboard", icon: <TrendingUp className="h-4 w-4" /> },
  ]

  const savedNav: NavItem[] = [
    { href: "/dashboard/bookmarks", label: "Bookmarks", icon: <Bookmark className="h-4 w-4" /> },
  ]

  const stats = [
    { label: "Uploads", value: (user as ExtendedUser)?.uploadCount ?? 0, icon: <FileText className="h-3 w-3" /> },
    { label: "Followers", value: (user as ExtendedUser)?.followerCount ?? 0, icon: <Users className="h-3 w-3" /> },
    { label: "Following", value: (user as ExtendedUser)?.followingCount ?? 0, icon: <Users className="h-3 w-3" /> },
  ]

  const reputationProgress = Math.min(((user?.reputationScore ?? 0) / 1000) * 100, 100)

  if (isLoading) {
    return (
      <div className="w-64 shrink-0">
        <div className="sticky top-20 space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-muted rounded-xl" />
            <div className="h-48 bg-muted rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <aside className="hidden lg:block w-64 shrink-0">
      <div className="sticky top-20 space-y-6">
        {/* User Profile Card */}
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 ring-2 ring-primary/10">
              <AvatarImage src={user?.avatarUrl || ""} alt={user?.displayName || "User"} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                {getInitials(user?.displayName || user?.name || "S")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">
                {user?.displayName || user?.name || "Scholar"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                @{user?.username}
              </p>
            </div>
          </div>

          {/* Institution */}
          {(user as ExtendedUser)?.institutionName && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <GraduationCap className="h-3.5 w-3.5" />
              <span className="truncate">{(user as ExtendedUser)?.institutionName}</span>
            </div>
          )}

          {/* Reputation */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Award className="h-3.5 w-3.5" />
                Reputation
              </span>
              <span className="font-medium">{user?.reputationScore ?? 0}</span>
            </div>
            <Progress value={reputationProgress} className="h-1.5" />
            <p className="text-[10px] text-muted-foreground capitalize">
              {user?.reputationLevel?.replace(/_/g, " ") || "Scholar"}
            </p>
          </div>

          {/* Stats */}
          <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-2">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="font-semibold text-sm">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Upload Button */}
        <Link href="/dashboard/uploads">
          <Button className="w-full gap-2 font-medium" size="lg">
            <Plus className="h-4 w-4" />
            Upload Document
          </Button>
        </Link>

        {/* Main Navigation */}
        <nav className="space-y-1">
          <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Menu
          </p>
          {mainNav.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive(item.href) ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 font-normal",
                  isActive(item.href) && "bg-secondary/80 font-medium"
                )}
              >
                <span className={cn("text-muted-foreground", isActive(item.href) && "text-foreground")}>
                  {item.icon}
                </span>
                {item.label}
                {isActive(item.href) && (
                  <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0 h-4">
                    Active
                  </Badge>
                )}
              </Button>
            </Link>
          ))}
        </nav>

        {/* Saved Section */}
        <nav className="space-y-1">
          <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Saved
          </p>
          {savedNav.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive(item.href) ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 font-normal",
                  isActive(item.href) && "bg-secondary/80 font-medium"
                )}
              >
                <span className={cn("text-muted-foreground", isActive(item.href) && "text-foreground")}>
                  {item.icon}
                </span>
                {item.label}
              </Button>
            </Link>
          ))}
        </nav>

        {/* Admin/Moderator Links */}
        {(user?.role === "admin" || user?.role === "super_admin" || user?.role === "moderator") && (
          <nav className="space-y-1">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Admin
            </p>
            <Link href="/admin">
              <Button
                variant={isActive("/admin") ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 font-normal",
                  isActive("/admin") && "bg-secondary/80 font-medium"
                )}
              >
                <Sparkles className={cn("h-4 w-4", isActive("/admin") ? "text-primary" : "text-muted-foreground")} />
                Admin Panel
              </Button>
            </Link>
          </nav>
        )}

        {/* Footer */}
        <div className="pt-4 border-t">
          <Link href="/settings">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </Link>
        </div>
      </div>
    </aside>
  )
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

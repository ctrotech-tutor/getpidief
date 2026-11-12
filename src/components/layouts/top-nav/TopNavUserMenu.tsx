"use client"

import Link from "next/link"
import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { SessionUser } from "@/hooks/useSession"
import { TopNavAvatar } from "./TopNavAvatar"
import { TopNavReputationBadge } from "./TopNavReputationBadge"
import { SquaresFour as LayoutGrid, User, UploadSimple as Upload, GearSix as Settings, SignOut as LogOut, BookmarkSimple as Bookmark, BookOpenText as Sparkles, Shield, Command } from "@phosphor-icons/react"

interface TopNavUserMenuProps {
  user: SessionUser | null
  isLoading: boolean
}

export function TopNavUserMenu({ user, isLoading }: TopNavUserMenuProps) {
  const isAdmin = user?.role === "admin" || user?.role === "super_admin"
  const isModerator = user?.role === "moderator" || isAdmin

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
              <TopNavAvatar user={user} isLoading={isLoading} />
              {isAdmin && (
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
              )}
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Account</TooltipContent>
      </Tooltip>

      <DropdownMenuContent className="w-64" align="end" forceMount>
        {/* User Header */}
        <DropdownMenuLabel className="p-3">
          <div className="flex items-start gap-3">
            <TopNavAvatar user={user} isLoading={isLoading} />
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold leading-none truncate">
                  {user?.displayName || user?.name || "Scholar"}
                </span>
                {isAdmin && (
                  <Shield className="h-3 w-3 text-primary flex-shrink-0" />
                )}
              </div>
              <span className="text-xs text-muted-foreground mt-1 truncate">
                @{user?.username}
              </span>
              <div className="mt-2">
                <TopNavReputationBadge
                  level={user?.reputationLevel}
                  score={user?.reputationScore}
                />
              </div>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Main Navigation */}
        <DropdownMenuGroup>
          <Link href="/dashboard">
            <DropdownMenuItem className="cursor-pointer gap-3 px-3">
              <LayoutGrid className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1">Dashboard</span>
              <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-70">
                ⌘D
              </kbd>
            </DropdownMenuItem>
          </Link>

          <Link href={`/u/${user?.username}`}>
            <DropdownMenuItem className="cursor-pointer gap-3 px-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1">Profile</span>
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-normal">
                Public
              </Badge>
            </DropdownMenuItem>
          </Link>

          <Link href="/dashboard/library">
            <DropdownMenuItem className="cursor-pointer gap-3 px-3">
              <Bookmark className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1">Saved Library</span>
            </DropdownMenuItem>
          </Link>

          <Link href="/dashboard/uploads">
            <DropdownMenuItem className="cursor-pointer gap-3 px-3">
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1">My Uploads</span>
              <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-70">
                ⌘U
              </kbd>
            </DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Tools & Settings */}
        <DropdownMenuGroup>
          <Link href="/settings">
            <DropdownMenuItem className="cursor-pointer gap-3 px-3">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1">Settings</span>
              <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-70">
                ⌘,
              </kbd>
            </DropdownMenuItem>
          </Link>

          <DropdownMenuItem
            className="cursor-pointer gap-3 px-3"
            onClick={() => {
              // Trigger command palette via store
              const event = new KeyboardEvent("keydown", {
                key: "k",
                metaKey: true,
              })
              document.dispatchEvent(event)
            }}
          >
            <Command className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1">Command Palette</span>
            <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-70">
              ⌘K
            </kbd>
          </DropdownMenuItem>

          {isModerator && (
            <Link href="/admin">
              <DropdownMenuItem className="cursor-pointer gap-3 px-3">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="flex-1">Admin Panel</span>
                <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal text-primary">
                  {user?.role === "super_admin" ? "Super" : "Mod"}
                </Badge>
              </DropdownMenuItem>
            </Link>
          )}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Sign Out */}
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="cursor-pointer gap-3 px-3 text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          <span className="flex-1">Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

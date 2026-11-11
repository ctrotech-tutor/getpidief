"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useSession } from "@/hooks/useSession"
import { useUIStore } from "@/stores/index"
import { useNotificationStore } from "@/stores/index"
import {
  TopNavLogo,
  TopNavSearch,
  TopNavNotifications,
  TopNavUserMenu,
} from "./top-nav"
import { Search, Command } from "lucide-react"

export function TopNav() {
  const { user, isLoading } = useSession()
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen)
  const unreadCount = useNotificationStore((s) => s.unreadCount)

  return (
    <TooltipProvider delayDuration={300}>
      <header className="fixed top-0 left-0 right-0 z-[300] h-14 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border-b border-border/40">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left: Logo */}
          <div className="flex items-center gap-4">
            <Link href="/home" className="flex items-center gap-2 group">
              <TopNavLogo />
              <span className="hidden font-bold text-lg lg:inline-block group-hover:text-primary transition-colors">
                getpidief
              </span>
            </Link>
          </div>

          {/* Center: Search */}
          <div className="hidden sm:flex flex-1 max-w-md mx-4">
            <TopNavSearch onClick={() => setCommandPaletteOpen(true)} />
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1">
            {/* Mobile Search */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="sm:hidden h-9 w-9"
                  onClick={() => setCommandPaletteOpen(true)}
                >
                  <Search className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Search</TooltipContent>
            </Tooltip>

            {/* Command Palette */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden md:flex h-9 w-9"
                  onClick={() => setCommandPaletteOpen(true)}
                >
                  <Command className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Command Palette (⌘K)</TooltipContent>
            </Tooltip>

            {/* Notifications */}
            <TopNavNotifications unreadCount={unreadCount} />

            {/* User Menu */}
            <TopNavUserMenu user={user} isLoading={isLoading} />
          </div>
        </div>
      </header>
    </TooltipProvider>
  )
}

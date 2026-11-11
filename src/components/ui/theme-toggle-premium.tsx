"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Moon, Sun, Monitor, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils/cn"

export function ThemeTogglePremium() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="animate-pulse">
        <div className="h-4 w-4 rounded-full bg-muted" />
      </Button>
    )
  }

  const getThemeIcon = () => {
    switch (theme) {
      case "light":
        return <Sun className="h-4 w-4" />
      case "dark":
        return <Moon className="h-4 w-4" />
      default:
        return <Monitor className="h-4 w-4" />
    }
  }

  const getThemeLabel = () => {
    switch (theme) {
      case "light":
        return "Light"
      case "dark":
        return "Dark"
      default:
        return "System"
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-9 gap-2 px-3 hover:bg-surface-elevated transition-all duration-200"
        >
          {getThemeIcon()}
          <span className="hidden sm:inline text-sm font-medium">
            {getThemeLabel()}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">Theme</p>
            <p className="text-xs leading-none text-muted-foreground">
              Current: {getThemeLabel()}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={() => setTheme("light")}
          className={cn(
            "cursor-pointer gap-2",
            theme === "light" && "bg-accent text-accent-foreground"
          )}
        >
          <Sun className="h-4 w-4" />
          <span>Light</span>
          {theme === "light" && (
            <div className="ml-auto h-2 w-2 rounded-full bg-primary" />
          )}
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => setTheme("dark")}
          className={cn(
            "cursor-pointer gap-2",
            theme === "dark" && "bg-accent text-accent-foreground"
          )}
        >
          <Moon className="h-4 w-4" />
          <span>Dark</span>
          {theme === "dark" && (
            <div className="ml-auto h-2 w-2 rounded-full bg-primary" />
          )}
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => setTheme("system")}
          className={cn(
            "cursor-pointer gap-2",
            theme === "system" && "bg-accent text-accent-foreground"
          )}
        >
          <Monitor className="h-4 w-4" />
          <span>System</span>
          {theme === "system" && (
            <div className="ml-auto h-2 w-2 rounded-full bg-primary" />
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2">
            <Palette className="h-4 w-4" />
            <span>Preview</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48">
            <div className="p-2 space-y-2">
              <div className="text-xs font-medium text-muted-foreground mb-2">
                Color Palette
              </div>
              <div className="grid grid-cols-5 gap-1">
                <div className="h-6 w-6 rounded bg-primary" title="Primary" />
                <div className="h-6 w-6 rounded bg-secondary" title="Secondary" />
                <div className="h-6 w-6 rounded bg-accent" title="Accent" />
                <div className="h-6 w-6 rounded bg-success" title="Success" />
                <div className="h-6 w-6 rounded bg-warning" title="Warning" />
                <div className="h-6 w-6 rounded bg-error" title="Error" />
                <div className="h-6 w-6 rounded bg-info" title="Info" />
                <div className="h-6 w-6 rounded bg-muted" title="Muted" />
                <div className="h-6 w-6 rounded bg-border border" title="Border" />
                <div className="h-6 w-6 rounded bg-foreground" title="Foreground" />
              </div>
              <div className="text-xs text-muted-foreground pt-1">
                Active: {resolvedTheme === "dark" ? "🌙 Dark" : "☀️ Light"}
              </div>
            </div>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

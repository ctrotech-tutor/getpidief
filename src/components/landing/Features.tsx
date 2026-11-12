"use client"

import * as React from "react"
import { MagnifyingGlass as Search, FileText, Pulse as Activity, Trophy, ShieldCheck, DeviceMobile as Smartphone, Stack as Layers } from "@phosphor-icons/react"
import { cn } from "@/lib/utils/cn"

export function Features() {
  const features = [
    {
      icon: Search,
      title: "Intelligent Search Engine",
      description: "Full-text search powered by PostgreSQL FTS with typo tolerance. Filter by institution, course code, year, resource type, and verification status. Results in under 80ms.",
      size: "large" as const,
      visual: "search"
    },
    {
      icon: FileText,
      title: "PDF Scholar's Workstation",
      description: "Read PDFs directly in-browser with our custom viewer. Zoom, paginate, bookmark pages, enter fullscreen. No download required.",
      size: "tall" as const,
      visual: "pdf"
    },
    {
      icon: Activity,
      title: "Academic Pulse Feed",
      description: "Real-time activity feed powered by WebSockets — see what's being uploaded, downloaded, and discussed at your university right now.",
      size: "small" as const,
      visual: "pulse"
    },
    {
      icon: Trophy,
      title: "Reputation & Badges",
      description: "Earn points for every upload, download, and helpful comment. Unlock Scholar → Analyst → Archivist → Distinguished Scholar levels.",
      size: "small" as const,
      visual: "badges"
    },
    {
      icon: ShieldCheck,
      title: "Verified Quality",
      description: "Every document passes a human moderation pipeline before publication. Metadata accuracy, copyright compliance, legibility checks.",
      size: "small" as const,
      visual: "verified"
    },
    {
      icon: Smartphone,
      title: "Works Offline — PWA",
      description: "Install getpidief on any device. Recently viewed documents cached for offline access. Add to home screen on iOS and Android.",
      size: "medium" as const,
      visual: "pwa"
    },
    {
      icon: Layers,
      title: "50+ Resource Types",
      description: "Past Exams, Lecture Notes, Research Papers, Dissertations, Tutorial Sheets, Theses, Assignments, Textbook Summaries and more.",
      size: "medium" as const,
      visual: "types"
    }
  ]

  return (
    <section id="features" className="py-24 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/40 bg-primary/10 text-primary text-sm font-medium mb-6">
            Core Features
          </div>
          <h2 className="font-heading font-black text-foreground tracking-tight mb-4" style={{ fontSize: "clamp(36px, 5vw, 56px)" }}>
            Everything scholars need. Nothing they don't.
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Purpose-built for higher education. Every feature exists to help you find, understand, and contribute academic knowledge faster.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[200px]">
          {/* Large Card - 2/3 width */}
          <div className="md:col-span-2 md:row-span-2">
            <FeatureCard {...features[0]} />
          </div>

          {/* Tall Card - 1/3 width */}
          <div className="md:row-span-2">
            <FeatureCard {...features[1]} />
          </div>

          {/* Small Cards */}
          {features.slice(2, 5).map((feature, index) => (
            <div key={index}>
              <FeatureCard {...feature} />
            </div>
          ))}

          {/* Medium Cards */}
          {features.slice(5).map((feature, index) => (
            <div key={index} className="md:col-span-1">
              <FeatureCard {...feature} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FeatureCard({ 
  icon: Icon, 
  title, 
  description, 
  size, 
  visual 
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  size: "small" | "medium" | "large" | "tall"
  visual: string
}) {
  const sizeClasses = {
    small: "p-6",
    medium: "p-8",
    large: "p-8",
    tall: "p-8"
  }

  return (
    <div className={cn(
      "glass-card border border-border/50 bg-surface/60 backdrop-blur-20 rounded-2xl",
      "hover:border-primary/30 hover:-translate-y-1 transition-all duration-300",
      "group cursor-pointer",
      sizeClasses[size]
    )}>
      <div className="h-full flex flex-col">
        {/* Icon */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <Icon className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-heading font-bold text-foreground text-lg">
            {title}
          </h3>
        </div>

        {/* Description */}
        <p className="text-muted-foreground text-sm leading-relaxed mb-6 flex-1">
          {description}
        </p>

        {/* Visual Element */}
        <div className="mt-auto">
          <FeatureVisual type={visual} />
        </div>
      </div>
    </div>
  )
}

function FeatureVisual({ type }: { type: string }) {
  switch (type) {
    case "search":
      return <SearchVisual />
    case "pdf":
      return <PDFVisual />
    case "pulse":
      return <PulseVisual />
    case "badges":
      return <BadgesVisual />
    case "verified":
      return <VerifiedVisual />
    case "pwa":
      return <PWAVisual />
    case "types":
      return <TypesVisual />
    default:
      return null
  }
}

function SearchVisual() {
  const [currentSearch, setCurrentSearch] = React.useState(0)
  const searches = [
    "CS201 data structures...",
    "LAW 301 contract law...",
    "CHEM past exam 2023..."
  ]

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSearch((prev) => (prev + 1) % searches.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="bg-surface-elevated border border-border rounded-lg p-3">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-primary/20 rounded-full animate-pulse" />
        <span className="text-xs text-muted-foreground font-mono">
          {searches[currentSearch]}
        </span>
      </div>
    </div>
  )
}

function PDFVisual() {
  return (
    <div className="bg-surface-elevated border border-border rounded-lg p-3">
      <div className="space-y-2">
        <div className="h-1 bg-primary/30 rounded w-full" />
        <div className="h-1 bg-primary/20 rounded w-4/5" />
        <div className="h-1 bg-primary/20 rounded w-3/4" />
        <div className="flex justify-between mt-2">
          <div className="w-6 h-6 bg-primary/20 rounded" />
          <div className="w-6 h-6 bg-primary/20 rounded" />
        </div>
      </div>
    </div>
  )
}

function PulseVisual() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-surface-elevated border border-border rounded-lg p-2 animate-slide-in"
          style={{ animationDelay: `${i * 0.1}s` }}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <div className="h-1 bg-primary/20 rounded w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

function BadgesVisual() {
  const badges = [
    { name: "Scholar", color: "bg-blue-500" },
    { name: "Analyst", color: "bg-purple-500" },
    { name: "Archivist", color: "bg-emerald-500" },
    { name: "Distinguished", color: "bg-yellow-500" }
  ]

  return (
    <div className="flex gap-2">
      {badges.map((badge, i) => (
        <div
          key={i}
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold",
            badge.color,
            "animate-fade-in"
          )}
          style={{ animationDelay: `${i * 0.1}s` }}
        >
          {badge.name[0]}
        </div>
      ))}
    </div>
  )
}

function VerifiedVisual() {
  return (
    <div className="flex items-center gap-2">
      {["Metadata", "Copyright", "Quality"].map((step, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs">✓</span>
          </div>
          <span className="text-xs text-muted-foreground">{step}</span>
        </div>
      ))}
    </div>
  )
}

function PWAVisual() {
  return (
    <div className="relative">
      <div className="w-16 h-16 bg-surface-elevated border border-border rounded-2xl mx-auto">
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-8 h-8 bg-primary rounded-lg" />
        </div>
      </div>
      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full animate-pulse" />
    </div>
  )
}

function TypesVisual() {
  const types = ["EXAM", "NOTES", "PAPER", "THESIS"]
  
  return (
    <div className="overflow-hidden">
      <div className="flex animate-marquee-left gap-2">
        {[...types, ...types].map((type, i) => (
          <span
            key={i}
            className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-full font-medium whitespace-nowrap"
          >
            {type}
          </span>
        ))}
      </div>
    </div>
  )
}

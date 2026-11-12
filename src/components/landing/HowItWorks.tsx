"use client"

import * as React from "react"
import { User, MagnifyingGlass as Search, ChatCircle as MessageCircle } from "@phosphor-icons/react"
import { cn } from "@/lib/utils/cn"

export function HowItWorks() {
  const steps = [
    {
      number: "01",
      icon: User,
      title: "Create Your Scholar Profile",
      description: "Sign up with your institutional email or Google. Set your faculty, major, and interests. 90 seconds. Done.",
      visual: "onboarding"
    },
    {
      number: "02", 
      icon: Search,
      title: "Discover or Contribute",
      description: "Search 50,000+ documents by keyword, course code, or institution. Or upload your own notes and past papers to earn reputation points.",
      visual: "search-upload"
    },
    {
      number: "03",
      icon: MessageCircle,
      title: "Learn and Collaborate",
      description: "Read directly in-browser, comment, ask questions, mark answers helpful. Follow top contributors in your field. Build your academic network.",
      visual: "collaboration"
    }
  ]

  return (
    <section id="how-it-works" className="py-24 px-4 bg-surface/30 border-y border-border">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="font-heading font-black text-foreground tracking-tight mb-4" style={{ fontSize: "clamp(36px, 5vw, 56px)" }}>
            From sign-up to first discovery in under 2 minutes.
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            No setup, no complexity. Just knowledge, instantly.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={step.title} className="relative">
              <StepCard {...step} index={index} />
              
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-full w-full h-px border-t-2 border-dashed border-border/50" 
                     style={{ width: "calc(100% - 2rem)" }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function StepCard({ 
  number, 
  icon: Icon, 
  title, 
  description, 
  visual, 
  index 
}: {
  number: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  visual: string
  index: number
}) {
  return (
    <div className="glass-card border border-border/50 bg-surface/60 backdrop-blur-20 rounded-2xl p-8 text-center space-y-6 hover:border-primary/30 transition-all duration-300">
      {/* Step Number */}
      <div className="relative mx-auto w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
        <span className="font-heading font-black text-primary text-2xl">
          {number}
        </span>
        <div className="absolute -inset-1 bg-primary/20 rounded-2xl blur-md opacity-50" />
      </div>

      {/* Icon */}
      <div className="w-12 h-12 mx-auto rounded-xl bg-primary/20 flex items-center justify-center">
        <Icon className="w-6 h-6 text-primary" />
      </div>

      {/* Content */}
      <div className="space-y-4">
        <h3 className="font-heading font-bold text-foreground text-xl">
          {title}
        </h3>
        <p className="text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>

      {/* Visual */}
      <div className="mt-6">
        <StepVisual type={visual} />
      </div>
    </div>
  )
}

function StepVisual({ type }: { type: string }) {
  switch (type) {
    case "onboarding":
      return <OnboardingVisual />
    case "search-upload":
      return <SearchUploadVisual />
    case "collaboration":
      return <CollaborationVisual />
    default:
      return null
  }
}

function OnboardingVisual() {
  const [currentField, setCurrentField] = React.useState(0)
  const fields = ["Email", "University", "Faculty", "Interests"]

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentField((prev) => (prev + 1) % fields.length)
    }, 800)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="bg-surface-elevated border border-border rounded-lg p-4 space-y-3">
      {fields.map((field, i) => (
        <div key={field} className="space-y-2">
          <label className="text-xs text-muted-foreground">{field}</label>
          <div className="h-2 bg-background border border-border rounded">
            {i === currentField && (
              <div className="h-full bg-primary rounded animate-pulse" style={{ width: "60%" }} />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function SearchUploadVisual() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-surface-elevated border border-border rounded-lg p-3">
        <div className="text-xs text-muted-foreground mb-2">Search</div>
        <div className="space-y-1">
          <div className="h-1 bg-primary/30 rounded w-full" />
          <div className="h-1 bg-primary/20 rounded w-4/5" />
        </div>
      </div>
      <div className="bg-surface-elevated border border-border rounded-lg p-3">
        <div className="text-xs text-muted-foreground mb-2">Upload</div>
        <div className="h-8 bg-primary/20 rounded border-2 border-dashed border-primary/40 flex items-center justify-center">
          <span className="text-primary text-xs">+</span>
        </div>
      </div>
    </div>
  )
}

function CollaborationVisual() {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <div className="w-6 h-6 bg-primary/20 rounded-full flex-shrink-0" />
        <div className="flex-1">
          <div className="h-1 bg-primary/30 rounded w-3/4 mb-1" />
          <div className="h-1 bg-primary/20 rounded w-full" />
        </div>
      </div>
      <div className="flex items-start gap-2">
        <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex-shrink-0" />
        <div className="flex-1">
          <div className="h-1 bg-emerald-500/30 rounded w-2/3" />
        </div>
      </div>
    </div>
  )
}

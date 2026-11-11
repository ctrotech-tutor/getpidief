"use client"

import * as React from "react"
import { 
  FileText, 
  BookOpen, 
  Search, 
  Book, 
  PenTool, 
  FileQuestion, 
  GraduationCap, 
  Award, 
  Compass 
} from "lucide-react"
import { cn } from "@/lib/utils/cn"

export function ResourceTypes() {
  const resourceTypes = [
    {
      icon: FileText,
      name: "Past Exams",
      description: "Practice with real exam papers from previous years",
      color: "bg-blue-500",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/30",
      count: "15,234"
    },
    {
      icon: BookOpen,
      name: "Lecture Notes",
      description: "Comprehensive notes from students who aced the course",
      color: "bg-purple-500",
      bgColor: "bg-purple-500/10", 
      borderColor: "border-purple-500/30",
      count: "12,891"
    },
    {
      icon: Search,
      name: "Research Papers",
      description: "Peer-reviewed and student research publications",
      color: "bg-emerald-500",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/30",
      count: "8,456"
    },
    {
      icon: Book,
      name: "Textbook Summaries",
      description: "Condensed chapter summaries for faster revision",
      color: "bg-yellow-500",
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/30",
      count: "6,789"
    },
    {
      icon: PenTool,
      name: "Assignments",
      description: "Graded assignments with model answers",
      color: "bg-pink-500",
      bgColor: "bg-pink-500/10",
      borderColor: "border-pink-500/30",
      count: "4,234"
    },
    {
      icon: FileQuestion,
      name: "Tutorial Sheets",
      description: "Practice problems and worked solutions",
      color: "bg-indigo-500",
      bgColor: "bg-indigo-500/10",
      borderColor: "border-indigo-500/30",
      count: "3,456"
    },
    {
      icon: GraduationCap,
      name: "Dissertations",
      description: "Final year and postgraduate dissertations",
      color: "bg-red-500",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/30",
      count: "2,345"
    },
    {
      icon: Award,
      name: "Theses",
      description: "Masters and PhD thesis documents",
      color: "bg-teal-500",
      bgColor: "bg-teal-500/10",
      borderColor: "border-teal-500/30",
      count: "1,789"
    },
    {
      icon: Compass,
      name: "Course Guides",
      description: "Module outlines, reading lists, study plans",
      color: "bg-orange-500",
      bgColor: "bg-orange-500/10",
      borderColor: "border-orange-500/30",
      count: "2,156"
    }
  ]

  return (
    <section className="py-24 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="font-heading font-black text-foreground tracking-tight mb-4" style={{ fontSize: "clamp(36px, 5vw, 56px)" }}>
            Every resource type. Every faculty. Every level.
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            From first-year notes to doctoral dissertations — getpidief covers the entire academic journey.
          </p>
        </div>

        {/* Resource Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resourceTypes.map((resource, index) => (
            <ResourceCard key={resource.name} {...resource} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}

function ResourceCard({ 
  icon: Icon, 
  name, 
  description, 
  color, 
  bgColor, 
  borderColor, 
  count, 
  index 
}: {
  icon: React.ComponentType<{ className?: string }>
  name: string
  description: string
  color: string
  bgColor: string
  borderColor: string
  count: string
  index: number
}) {
  return (
    <div 
      className={cn(
        "glass-card border border-border/50 bg-surface/60 backdrop-blur-20 rounded-2xl p-6",
        "hover:border-primary/30 hover:-translate-y-1 transition-all duration-300",
        "group cursor-pointer",
        `hover:${borderColor} hover:shadow-lg hover:shadow-current/10`
      )}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
          bgColor,
          "group-hover:scale-110 transition-transform duration-300"
        )}>
          <Icon className={cn("w-6 h-6", color.replace("bg-", "text-"))} />
        </div>

        {/* Content */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-foreground text-lg">
              {name}
            </h3>
            <span className="text-xs text-muted-foreground font-mono">
              {count}
            </span>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      {/* Hover effect */}
      <div className={cn(
        "absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300",
        "pointer-events-none",
        bgColor,
        "mix-blend-multiply"
      )} />
    </div>
  )
}

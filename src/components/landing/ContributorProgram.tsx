"use client"

import * as React from "react"
import Link from "next/link"
import { Trophy, BookOpen, MagnifyingGlass as Search, Archive, Star, Crown } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils/cn"

export function ContributorProgram() {
  const levels = [
    {
      name: "Scholar",
      points: "0-99",
      icon: BookOpen,
      color: "bg-blue-500",
      glow: "shadow-blue-500/25"
    },
    {
      name: "Analyst", 
      points: "100-499",
      icon: Search,
      color: "bg-purple-500",
      glow: "shadow-purple-500/25"
    },
    {
      name: "Archivist",
      points: "500-1999",
      icon: Archive,
      color: "bg-emerald-500",
      glow: "shadow-emerald-500/25"
    },
    {
      name: "Senior Contributor",
      points: "2000-4999",
      icon: Star,
      color: "bg-yellow-500",
      glow: "shadow-yellow-500/25"
    },
    {
      name: "Distinguished Scholar",
      points: "5000+",
      icon: Crown,
      color: "bg-orange-500",
      glow: "shadow-orange-500/25"
    }
  ]

  const benefits = [
    "Earn points per download, like, and helpful comment",
    "Unlock 8 achievement badges from First Upload to Distinguished Scholar",
    "Build a public scholar profile with your contributions",
    "Appear on your institution's contributor leaderboard",
    "Get notified when scholars comment or benefit from your work"
  ]

  return (
    <section className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 text-yellow-500 text-sm font-semibold">
              <Trophy className="w-4 h-4" />
              Contributor Program
            </div>

            {/* Headline */}
            <h2 className="font-heading font-black text-foreground tracking-tight" style={{ fontSize: "clamp(32px, 4vw, 48px)" }}>
              Upload once. Impact thousands.
            </h2>

            {/* Description */}
            <p className="text-muted-foreground text-lg leading-relaxed">
              Every document you upload earns you reputation points, unlocks contributor badges, 
              and builds a verifiable academic portfolio that exists long after graduation.
            </p>

            {/* Benefits List */}
            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                  </div>
                  <span className="text-foreground">{benefit}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <Button size="lg" className="group bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-8 py-4 rounded-xl shadow-lg shadow-yellow-500/25 hover:shadow-yellow-500/40 transition-all duration-300" asChild>
              <Link href="/register" className="flex items-center gap-2">
                Become a Contributor
                <Trophy className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </Button>
          </div>

          {/* Right Visual */}
          <div className="relative">
            <div className="glass-card border border-yellow-500/20 bg-surface/60 backdrop-blur-20 rounded-3xl p-8">
              {/* Progress Bar */}
              <div className="mb-8">
                <div className="h-2 bg-background border border-border rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full animate-pulse" style={{ width: "65%" }} />
                </div>
                <p className="text-center text-sm text-muted-foreground mt-2">Your Journey to Excellence</p>
              </div>

              {/* Levels */}
              <div className="space-y-4">
                {levels.map((level, index) => (
                  <div
                    key={level.name}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl border transition-all duration-300",
                      index === 2 ? "border-yellow-500/50 bg-yellow-500/5" : "border-border/50 bg-background/50"
                    )}
                  >
                    {/* Icon */}
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      level.color,
                      index === 2 && "animate-pulse"
                    )}>
                      <level.icon className="w-6 h-6 text-white" />
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-foreground">{level.name}</h3>
                        <span className="text-sm text-muted-foreground font-mono">{level.points} pts</span>
                      </div>
                      <div className="mt-1 h-1 bg-background border border-border rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-1000",
                            level.color
                          )}
                          style={{ 
                            width: index <= 2 ? "100%" : "0%",
                            animationDelay: `${index * 200}ms`
                          }}
                        />
                      </div>
                    </div>

                    {/* Glow effect for active level */}
                    {index === 2 && (
                      <div className={cn(
                        "absolute -inset-1 rounded-xl blur-md opacity-50",
                        level.glow
                      )} />
                    )}
                  </div>
                ))}
              </div>

              {/* Floating badges */}
              <div className="absolute -top-4 -right-4 w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/25 animate-bounce">
                <Trophy className="w-8 h-8 text-black" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight, EnvelopeSimple as Mail } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils/cn"

interface FinalCTAProps {
  stats: {
    documents: number
    users: number
    institutions: number
  }
}

export function FinalCTA({ stats }: FinalCTAProps) {
  const [email, setEmail] = React.useState("")
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const formatStatNum = (n: number): string => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M+`
    if (n >= 1_000) return `${Math.floor(n / 1_000)}K+`
    return `${n}+`
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle email submission
    console.log("Email submitted:", email)
    setEmail("")
  }

  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Background with glow effect */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 100% 60% at 50% 50%, rgba(37,99,235,0.15) 0%, transparent 70%),
            linear-gradient(135deg, oklch(0.45 0.18 260 / 0.20) 0%, transparent 70%)
          `
        }}
      />
      
      {/* Glowing orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />

      <div className="relative max-w-4xl mx-auto text-center">
        {/* Headline */}
        <h2 className="font-heading font-black text-foreground tracking-tight mb-6" style={{ fontSize: "clamp(40px, 6vw, 72px)" }}>
          Your academic future
          <br />
          starts in the archive.
        </h2>

        {/* Sub-headline */}
        <p className="text-muted-foreground text-xl mb-12 max-w-2xl mx-auto">
          {formatStatNum(stats.documents)} documents. {formatStatNum(stats.users)} scholars. One search away.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12">
          <Button 
            size="lg"
            className="bg-background hover:bg-background/90 text-foreground border border-border font-bold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            asChild
          >
            <Link href="/register" className="flex items-center gap-2.5">
              Get Started — It's Free
              <ArrowRight className="w-5 h-5" />
            </Link>
          </Button>
          
          <Button 
            variant="outline"
            size="lg"
            className="border-border text-foreground hover:bg-background/10 px-8 py-4 rounded-xl font-semibold transition-all duration-300 hover:-translate-y-1"
            asChild
          >
            <Link href="/explore" className="flex items-center gap-2">
              Browse Documents
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>

        {/* Email Capture */}
        {mounted && (
          <form onSubmit={handleSubmit} className="max-w-md mx-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@university.edu"
                className="flex-1 px-4 py-3 bg-background/50 border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                required
              />
              <Button 
                type="submit"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-3 rounded-xl transition-all duration-300"
              >
                Join the Archive →
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              No spam. Just knowledge. Unsubscribe anytime.
            </p>
          </form>
        )}
      </div>
    </section>
  )
}

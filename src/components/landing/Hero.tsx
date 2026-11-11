"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight, Search, Upload, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils/cn"

interface HeroProps {
  stats: {
    documents: number
    users: number
    institutions: number
  }
}

export function Hero({ stats }: HeroProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (!mounted || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    // Particle system
    interface Particle {
      x: number
      y: number
      size: number
      speedY: number
      opacity: number
      color: string
    }

    const particles: Particle[] = []
    const particleCount = 30
    const colors = ["#2563EB", "#8B5CF6", "#ffffff"]

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height + canvas.height,
        size: Math.random() * 2 + 1,
        speedY: Math.random() * 0.5 + 0.2,
        opacity: Math.random() * 0.15 + 0.05,
        color: colors[Math.floor(Math.random() * colors.length)]
      })
    }

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach(particle => {
        // Update position
        particle.y -= particle.speedY

        // Wrap around when particle goes off screen
        if (particle.y < -10) {
          particle.y = canvas.height + 10
          particle.x = Math.random() * canvas.width
        }

        // Draw particle
        ctx.globalAlpha = particle.opacity
        ctx.fillStyle = particle.color
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fill()
      })

      requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [mounted])

  const formatStatNum = (n: number): string => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M+`
    if (n >= 1_000) return `${Math.floor(n / 1_000)}K+`
    return `${n}+`
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 pt-20 pb-16 text-center overflow-hidden">
      {/* Canvas for particles */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        aria-hidden
      />

      {/* Background gradients */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% 0%, rgba(37,99,235,0.22) 0%, transparent 70%),
            radial-gradient(ellipse 50% 40% at 80% 50%, rgba(139,92,246,0.10) 0%, transparent 70%)
          `,
        }}
      />

      {/* Grid background pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-5"
        aria-hidden
        style={{
          backgroundImage: `
            radial-gradient(circle, var(--border) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px"
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Badge */}
        <div className="mt-16"/>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/40 bg-primary/10 text-primary text-sm font-medium mb-8 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          The Academic Resource Network
          <span className="ml-2 text-xs opacity-75">Live — {formatStatNum(stats.institutions)} Universities</span>
        </div>

        {/* Headline */}
        <h1 className="font-heading font-black text-foreground leading-[0.95] tracking-[-0.04em] mb-6 animate-fade-in-up">
          <div style={{ fontSize: "clamp(52px, 7.5vw, 96px)" }}>
            The Academic Archive
          </div>
          <div
            className="bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent animate-shimmer"
            style={{ fontSize: "clamp(52px, 7.5vw, 96px)" }}
          >
            That Thinks For You.
          </div>
        </h1>

        {/* Sub-headline */}
        <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10 animate-fade-in-up" style={{ fontSize: "clamp(17px, 2.2vw, 21px)" }}>
          Discover millions of verified past exams, lecture notes, and research papers from universities across Africa and beyond. Contribute. Collaborate. Excel.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8 animate-fade-in-up">
          <Button
            size="lg"
            className="group bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-xl font-bold text-base shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 hover:-translate-y-0.5"
            asChild
          >
            <Link href="/register" className="flex items-center gap-2.5">
              Start for Free — No Credit Card
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            className="border-border bg-background/5 hover:bg-background/10 text-foreground px-8 py-4 rounded-xl font-semibold text-base transition-all duration-300 hover:-translate-y-0.5"
            asChild
          >
            <Link href="/explore" className="flex items-center gap-2">
              Browse Archive
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>

        {/* Social Proof */}
        <p className="text-xs text-muted-foreground mb-16 animate-fade-in-up">
          🔒 No credit card · Free forever for students · {formatStatNum(stats.documents)} documents
        </p>

        {/* Stats Ticker */}
        <div className="glass-card border border-border/50 bg-surface/60 backdrop-blur-20 rounded-2xl p-6 sm:p-8 mb-16 animate-fade-in-up">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
            {[
              { n: formatStatNum(stats.documents), label: "Documents" },
              { n: formatStatNum(stats.users), label: "Scholars" },
              { n: formatStatNum(stats.institutions), label: "Universities" },
              { n: "100%", label: "Free Access" }
            ].map((stat, index) => (
              <div key={stat.label} className="text-center">
                <div 
                  className="font-heading font-black text-foreground tracking-tight animate-count-up"
                  style={{ fontSize: "clamp(28px, 4vw, 42px)" }}
                  data-target={stat.n}
                >
                  {stat.n}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Browser Mockup */}
        <div className="relative max-w-4xl mx-auto animate-fade-in-up">
          <BrowserMockup />
        </div>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-muted-foreground/40">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
          <path d="M10 3v14M5 13l5 5 5-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </section>
  )
}

function BrowserMockup() {
  return (
    <div className="relative bg-surface border border-border rounded-2xl shadow-2xl shadow-primary/10 overflow-hidden">
      {/* Browser Chrome */}
      <div className="bg-surface-elevated border-b border-border px-4 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <div className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-muted-foreground">
          getpidief.me/explore
        </div>
      </div>

      {/* App Interface */}
      <div className="bg-background p-6">
        {/* Search Bar */}
        <div className="bg-surface border border-border rounded-xl p-4 mb-6 flex items-center gap-3">
          <Search className="w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search for documents, courses, institutions..."
            className="flex-1 bg-transparent border-none outline-none text-foreground placeholder-muted-foreground"
            readOnly
          />
          <Button size="sm">Search</Button>
        </div>

        {/* Document Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: "CS201 Data Structures Past Exam",
              type: "EXAM",
              institution: "University of Lagos",
              author: "Amara O.",
              downloads: "2.3k",
              likes: "89"
            },
            {
              title: "LAW 301 Contract Law Notes",
              type: "NOTES",
              institution: "University of Cape Town",
              author: "David M.",
              downloads: "1.8k",
              likes: "67"
            },
            {
              title: "CHEM 202 Organic Chemistry Lab Report",
              type: "PAPER",
              institution: "KNUST",
              author: "Fatima A.",
              downloads: "945",
              likes: "42"
            }
          ].map((doc, index) => (
            <div key={index} className="bg-surface border border-border rounded-lg p-4 hover:border-primary/30 transition-colors">
              {/* Thumbnail */}
              <div className="h-24 bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg mb-3" />
              
              {/* Content */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-full font-medium">
                    {doc.type}
                  </span>
                </div>
                <h3 className="font-semibold text-sm text-foreground line-clamp-2">
                  {doc.title}
                </h3>
                <p className="text-xs text-muted-foreground">{doc.institution}</p>
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-primary/20 rounded-full" />
                    <span className="text-xs text-muted-foreground">{doc.author}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span>↓</span> {doc.downloads}
                    </span>
                    <span className="flex items-center gap-1">
                      <span>♥</span> {doc.likes}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Glow effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -inset-1 bg-primary/20 rounded-2xl blur-xl opacity-50" />
      </div>
    </div>)
}

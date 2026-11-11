"use client"

import * as React from "react"
import { Star, TrendingUp, Clock, Users } from "lucide-react"
import { cn } from "@/lib/utils/cn"

export function LiveMetrics() {
  const [mounted, setMounted] = React.useState(false)
  const [counters, setCounters] = React.useState({
    documents: 0,
    scholars: 0,
    rating: 0,
    latency: 0
  })

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (!mounted) return

    const targetValues = {
      documents: 50247,
      scholars: 12891,
      rating: 4.9,
      latency: 80
    }

    const duration = 2000
    const steps = 60
    const increment = {
      documents: targetValues.documents / steps,
      scholars: targetValues.scholars / steps,
      rating: targetValues.rating / steps,
      latency: targetValues.latency / steps
    }

    let currentStep = 0
    const interval = setInterval(() => {
      currentStep++
      setCounters({
        documents: Math.min(Math.floor(increment.documents * currentStep), targetValues.documents),
        scholars: Math.min(Math.floor(increment.scholars * currentStep), targetValues.scholars),
        rating: Math.min(increment.rating * currentStep, targetValues.rating),
        latency: Math.min(Math.floor(increment.latency * currentStep), targetValues.latency)
      })

      if (currentStep >= steps) {
        clearInterval(interval)
      }
    }, duration / steps)

    return () => clearInterval(interval)
  }, [mounted])

  const testimonials = [
    {
      quote: "getpidief saved my semester. Found CS301 past papers I couldn't find anywhere else. The PDF viewer is incredible — no more downloading sketchy files.",
      author: "Amara O.",
      university: "3rd Year Computer Science, University of Lagos",
      rating: 5
    },
    {
      quote: "I uploaded my dissertation and got 400 downloads in the first week. The reputation system actually motivates you to contribute more.",
      author: "David M.",
      university: "Postgraduate, University of Cape Town",
      rating: 5
    },
    {
      quote: "The search is insanely fast. I type a course code and instantly see every relevant document from my university. Life-changing for revision.",
      author: "Fatima A.",
      university: "2nd Year Law, Ahmadu Bello University",
      rating: 5
    }
  ]

  return (
    <section className="py-24 px-4 bg-surface/30 border-y border-border">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="font-heading font-black text-foreground tracking-tight mb-4" style={{ fontSize: "clamp(36px, 5vw, 56px)" }}>
            The numbers don't lie.
          </h2>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {[
            {
              value: counters.documents.toLocaleString(),
              label: "Documents in archive",
              subtext: "and growing daily",
              icon: TrendingUp
            },
            {
              value: counters.scholars.toLocaleString(),
              label: "Active scholars",
              subtext: "from 280+ universities",
              icon: Users
            },
            {
              value: `${counters.rating}/5`,
              label: "Average rating",
              subtext: "from verified reviews",
              icon: Star
            },
            {
              value: `<${counters.latency}ms`,
              label: "Search latency",
              subtext: "powered by PostgreSQL FTS",
              icon: Clock
            }
          ].map((metric, index) => (
            <div key={metric.label} className="text-center">
              <div className="flex items-center justify-center mb-3">
                <metric.icon className="w-6 h-6 text-primary" />
              </div>
              <div className="font-heading font-black text-foreground text-3xl lg:text-4xl mb-2">
                {metric.value}
              </div>
              <div className="font-semibold text-foreground mb-1">
                {metric.label}
              </div>
              <div className="text-sm text-muted-foreground">
                {metric.subtext}
              </div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="relative">
          <div className="flex overflow-hidden">
            <div className="flex animate-marquee-left gap-6 py-4">
              {[...testimonials, ...testimonials].map((testimonial, index) => (
                <TestimonialCard key={index} {...testimonial} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function TestimonialCard({ quote, author, university, rating }: {
  quote: string
  author: string
  university: string
  rating: number
}) {
  return (
    <div className="glass-card border border-border/50 bg-surface/60 backdrop-blur-20 rounded-2xl p-6 min-w-[350px] max-w-[350px]">
      {/* Rating */}
      <div className="flex items-center gap-1 mb-4">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={cn(
              "w-4 h-4",
              i < rating ? "text-yellow-400 fill-yellow-400" : "text-border"
            )}
          />
        ))}
      </div>

      {/* Quote */}
      <blockquote className="text-foreground mb-4 leading-relaxed">
        "{quote}"
      </blockquote>

      {/* Author */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold">
          {author.split(' ').map(n => n[0]).join('')}
        </div>
        <div>
          <div className="font-semibold text-foreground">{author}</div>
          <div className="text-sm text-muted-foreground">{university}</div>
        </div>
      </div>
    </div>
  )
}

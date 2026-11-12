"use client"

import * as React from "react"
import Link from "next/link"
import { Check } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils/cn"

export function Pricing() {
  const features = [
    "Unlimited document access",
    "Full PDF viewer in browser",  
    "Download all documents",
    "Upload up to 50MB per document",
    "Comment and discuss",
    "Follow contributors",
    "Personal library and collections",
    "Mobile app (PWA)",
    "Real-time Academic Pulse",
    "Reputation and badges",
    "Email notifications",
    "Priority moderation for contributors"
  ]

  return (
    <section id="pricing" className="py-24 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="font-heading font-black text-foreground tracking-tight mb-4" style={{ fontSize: "clamp(36px, 5vw, 56px)" }}>
            Free. Forever. For students.
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            No paywalls. No premium tiers. No subscription. 
            Great academic resources should be accessible to everyone.
          </p>
        </div>

        {/* Pricing Card */}
        <div className="relative">
          <div className="glass-card border border-primary/30 bg-surface/60 backdrop-blur-20 rounded-3xl p-8 md:p-12 shadow-2xl shadow-primary/10">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-xl opacity-30 -z-10" />
            
            {/* Price */}
            <div className="text-center mb-8">
              <div className="inline-block">
                <div className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-heading font-black text-6xl md:text-7xl">
                  FREE
                </div>
                <div className="text-muted-foreground text-lg mt-2">
                  For all students and researchers
                </div>
              </div>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
              {features.map((feature, index) => (
                <div key={feature} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-emerald-500" />
                  </div>
                  <span className="text-foreground">{feature}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="text-center">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-12 py-4 rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300" asChild>
                <Link href="/register">
                  Create Free Account →
                </Link>
              </Button>
              
              <p className="text-sm text-muted-foreground mt-6 max-w-md mx-auto">
                getpidief is free because knowledge should be free. 
                We're supported by institutional partnerships.
              </p>
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap justify-center gap-6 mt-12">
          {[
            "No Credit Card Required",
            "Cancel Anytime", 
            "No Hidden Fees",
            "Student-Focused"
          ].map((badge) => (
            <div key={badge} className="px-4 py-2 rounded-full border border-border/50 bg-surface/50 text-sm text-muted-foreground">
              {badge}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

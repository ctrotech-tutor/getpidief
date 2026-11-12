"use client"

import * as React from "react"
import Image from "next/image"
import { MapPin, UsersThree as Users, FileText, GlobeHemisphereWest as Globe, ArrowRight } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const institutions = [
  { name: "University of Lagos", docs: 2341, coords: { x: 48, y: 55 } },
  { name: "University of Cape Town", docs: 1892, coords: { x: 52, y: 78 } },
  { name: "KNUST", docs: 1456, coords: { x: 47, y: 58 } },
  { name: "University of Nairobi", docs: 1234, coords: { x: 53, y: 60 } },
  { name: "Stellenbosch University", docs: 987, coords: { x: 51, y: 77 } },
  { name: "University of Ghana", docs: 876, coords: { x: 46, y: 59 } },
  { name: "Makerere University", docs: 765, coords: { x: 51, y: 62 } },
  { name: "University of Ibadan", docs: 654, coords: { x: 47, y: 56 } },
  { name: "University of Edinburgh", docs: 543, coords: { x: 47, y: 35 } },
  { name: "Imperial College London", docs: 432, coords: { x: 46, y: 36 } },
  { name: "University of Pretoria", docs: 321, coords: { x: 50, y: 76 } },
  { name: "Obafemi Awolowo University", docs: 298, coords: { x: 46, y: 57 } },
  { name: "University of Benin", docs: 276, coords: { x: 48, y: 56 } },
  { name: "Cairo University", docs: 254, coords: { x: 54, y: 52 } },
  { name: "University of Dar es Salaam", docs: 232, coords: { x: 52, y: 64 } }
]

const additionalInstitutions = [
  "Ahmadu Bello University", "University of Warwick", "University of Manchester",
  "Rhodes University", "University of Zimbabwe", "University of Botswana",
  "University of Namibia", "University of Malawi", "University of Rwanda",
  "University of Zambia", "University of Mozambique", "University of Angola",
  "University of Ethiopia", "University of Sudan", "University of Tanzania",
  "University of Cameroon", "University of Senegal", "University of Ivory Coast",
  "University of Burkina Faso"
]

export function InstitutionsMap() {
  return (
    <section id="institutions"  className="py-24 px-4 bg-surface/30 border-y border-border">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="font-heading font-black text-foreground tracking-tight mb-4" style={{ fontSize: "clamp(36px, 5vw, 56px)" }}>
            Covering every major university in Africa and beyond.
          </h2>
        </div>

        {/* Map Container */}
        <div className="relative mb-16">
          <div className="glass-card border border-border/50 bg-surface/60 backdrop-blur-20 rounded-3xl p-8 overflow-hidden">
            {/* World Map Background */}
            <div className="relative w-full h-96 md:h-[500px]">
              <Image
                alt="Global connectivity map"
                className="absolute inset-0 w-full h-full object-cover opacity-20 grayscale"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCwZzWNZtO6H379Co1u9eP2oqNtawNJHPNZINueK6y6msrYKRss3IcjYu2j0KFh3n9bd0pHBzWAuJyTp-6Y1_smLs3V6UBZH4y5PK6eO7dRtFjYWMXxvLpEXfmVzgfmNnRK9VOlulhaiJo-sGRohRtyoY0GH01WGC5CNC2Fd-vwSRU_SQj1efDUxYUoU8UcfEpZ11jdT6aa01TMklISZ3eZCUWm8GC3p1guTwlLp7LBZkSlTJ4AT-k8JVTcBj3KgoHzNtLHtJRB9igf"
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
              
              {/* Institution dots overlay */}
              {/* <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
                {institutions.map((inst) => (
                  <g key={inst.name}>
                    <circle
                      cx={inst.coords.x}
                      cy={inst.coords.y}
                      r="1.5"
                      fill="rgba(37, 99, 235, 0.8)"
                      className="animate-pulse"
                    />
                    <circle
                      cx={inst.coords.x}
                      cy={inst.coords.y}
                      r="3"
                      fill="none"
                      stroke="rgba(37, 99, 235, 0.4)"
                      strokeWidth="0.5"
                      className="animate-ping"
                    />
                  </g>
                ))}
              </svg> */}
            </div>
          </div>
        </div>

        {/* Institution Grid */}
        <div className="text-center">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
            {institutions.slice(0, 20).map((inst) => (
              <div key={inst.name} className="text-muted-foreground text-sm font-medium hover:text-foreground transition-colors">
                {inst.name}
              </div>
            ))}
          </div>
          
          <div className="text-muted-foreground mb-6">
            + {additionalInstitutions.length} more universities
          </div>
          
          <Link href="/institutions">
            <Button size="lg" className="group">
              View Interactive Map
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}

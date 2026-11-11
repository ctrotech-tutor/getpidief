"use client"

import * as React from "react"

export function SocialProof() {
  const universities = [
    "University of Lagos",
    "University of Cape Town", 
    "KNUST",
    "University of Nairobi",
    "Stellenbosch University",
    "University of Ghana",
    "Makerere University",
    "University of Ibadan",
    "University of Edinburgh",
    "Imperial College London",
    "University of Pretoria",
    "Obafemi Awolowo University",
    "University of Benin",
    "Cairo University",
    "University of Dar es Salaam",
    "Ahmadu Bello University",
    "University of Warwick",
    "University of Manchester",
    "University of Nairobi",
    "Rhodes University",
    "University of Zimbabwe",
    "University of Botswana",
    "University of Namibia",
    "University of Malawi",
    "University of Rwanda"
  ]

  return (
    <section className="py-16 px-4 bg-surface/30 border-y border-border overflow-hidden">
      <div className="max-w-7xl mx-auto text-center mb-12">
        <h2 className="font-heading font-bold text-foreground text-2xl mb-2">
          Trusted by scholars at 280+ universities across Africa and beyond
        </h2>
      </div>

      {/* Marquee Container */}
      <div className="relative">
        {/* First Row - Left to Right */}
        <div className="flex overflow-hidden">
          <div className="flex animate-marquee-left whitespace-nowrap">
            {[...universities, ...universities].map((university, index) => (
              <span
                key={`left-${index}`}
                className="text-muted-foreground mx-8 text-lg font-medium"
              >
                {university}
              </span>
            ))}
          </div>
        </div>

        {/* Second Row - Right to Left */}
        <div className="flex overflow-hidden mt-6">
          <div className="flex animate-marquee-right whitespace-nowrap">
            {[...universities.reverse(), ...universities.reverse()].map((university, index) => (
              <span
                key={`right-${index}`}
                className="text-muted-foreground mx-8 text-lg font-medium"
              >
                {university}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

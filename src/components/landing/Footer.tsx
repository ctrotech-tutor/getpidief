"use client"

import * as React from "react"
import Link from "next/link"
import { MessageCircle, Users, Code, Image } from "lucide-react"
import { cn } from "@/lib/utils/cn"

export function Footer() {
  const currentYear = new Date().getFullYear()

  const footerLinks = {
    brand: {
      logo: "getpidief",
      tagline: "The Archive That Thinks.",
      description: "The Academic Resource Network for higher education. Discover, share, and excel with millions of verified academic resources.",
      social: [
        { icon: MessageCircle, href: "https://twitter.com/getpidief", label: "Twitter" },
        { icon: Users, href: "https://linkedin.com/company/getpidief", label: "LinkedIn" },
        { icon: Code, href: "https://github.com/getpidief", label: "GitHub" },
        { icon: Image, href: "https://instagram.com/getpidief", label: "Instagram" }
      ]
    },
    platform: [
      { href: "/explore", label: "Explore Archive" },
      { href: "/search", label: "Search Documents" },
      { href: "/upload", label: "Upload Resource" },
      { href: "/dashboard", label: "My Dashboard" },
      { href: "/library", label: "My Library" },
      { href: "/notifications", label: "Notifications" }
    ],
    community: [
      { href: "/blog", label: "Blog" },
      { href: "/changelog", label: "Changelog" },
      // { href: "/contributors", label: "Contributors" },
      { href: "/institutions", label: "Institutions" },
      // { href: "/leaderboard", label: "Leaderboard" },
      // { href: "/badges", label: "Badges" }
    ],
    company: [
      { href: "/about", label: "About Us" },
      { href: "/contact", label: "Contact" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Service" },
      { href: "/cookies", label: "Cookie Policy" }
    ]
  }

  const countryFlags = ["🇳🇬", "🇿🇦", "🇬🇭", "🇰🇪", "🇺🇬", "🇬🇧", "🇺🇸"]

  return (
    <footer className="bg-surface/50 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Column 1 - Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Logo />
              <span className="font-heading font-black text-xl tracking-[-0.06em] text-foreground">
                {footerLinks.brand.logo}
              </span>
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              {footerLinks.brand.tagline}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {footerLinks.brand.description}
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              Built with <span className="text-red-500">♥</span> by Ctrotech
            </div>
            {/* Social Links */}
            <div className="flex items-center gap-3 pt-2">
              {footerLinks.brand.social.map((social) => (
                <Link
                  key={social.label}
                  href={social.href}
                  className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="w-4 h-4" />
                </Link>
              ))}
            </div>
          </div>

          {/* Column 2 - Platform */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Platform</h3>
            <ul className="space-y-2">
              {footerLinks.platform.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 - Community */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Community</h3>
            <ul className="space-y-2">
              {footerLinks.community.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4 - Company */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Company</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              © {currentYear} getpidief. All rights reserved.
            </div>
            <div className="text-sm text-muted-foreground">
              The Academic Resource Network for higher education.
            </div>
            <div className="flex items-center gap-2">
              {countryFlags.map((flag, index) => (
                <span key={index} className="text-lg">
                  {flag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

function Logo() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 drop-shadow-sm"
    >
      <rect x="2" y="4" width="20" height="24" rx="4" className="fill-primary" />
      <rect 
        x="10" 
        y="8" 
        width="20" 
        height="20" 
        rx="4" 
        className="fill-blue-400 mix-blend-multiply dark:mix-blend-screen opacity-90" 
      />
      <circle cx="20" cy="18" r="4" fill="white" />
    </svg>
  )
}

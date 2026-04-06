import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: { template: "%s — getpidief", default: "Sign In" },
};

interface AuthLayoutProps {
  children: React.ReactNode;
  /** Right panel visual slot — optional, passed from each auth page */
  panel?: React.ReactNode;
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-background">
      {/* ── LEFT PANEL — Auth forms ──────────────────────────────────────── */}
      <div className="flex flex-col w-full lg:w-1/2 min-h-screen px-6 py-8 lg:px-12 xl:px-16">
        {/* Logo */}
        <div className="mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 group"
          >
            <span
              className="font-heading font-black text-xl tracking-tight text-foreground
                         group-hover:text-primary transition-colors duration-200"
            >
              getpidief
            </span>
          </Link>
        </div>

        {/* Auth form content (from each page) */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-[400px]">
            {children}
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-xs text-muted-foreground text-center">
          © {new Date().getFullYear()} getpidief. All rights reserved. &nbsp;·&nbsp;
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          &nbsp;·&nbsp;
          <Link href="/terms"   className="hover:text-foreground transition-colors">Terms</Link>
        </p>
      </div>

      {/* ── RIGHT PANEL — Immersive visual (hidden on mobile) ───────────── */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden
                   bg-[oklch(0.09_0.018_265)] border-l border-border"
      >
        {/* Background gradient mesh */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 60% 50% at 20% 20%, oklch(0.51 0.22 264 / 0.15) 0%, transparent 70%),
              radial-gradient(ellipse 50% 40% at 80% 80%, oklch(0.77 0.18 82 / 0.08) 0%, transparent 60%),
              radial-gradient(ellipse 40% 60% at 50% 50%, oklch(0.51 0.22 264 / 0.04) 0%, transparent 80%)
            `,
          }}
        />

        {/* Floating document cards illustration */}
        <div className="relative z-10 flex flex-col justify-between w-full p-12">
          {/* Top: Stats */}
          <div className="flex gap-4">
            <StatPill value="2.4M+" label="Documents" />
            <StatPill value="850+"  label="Institutions" />
            <StatPill value="180K+" label="Scholars" />
          </div>

          {/* Center: Hero message */}
          <div className="space-y-4 max-w-md">
            <p
              className="font-heading font-bold leading-tight text-white"
              style={{ fontSize: "clamp(28px, 4vw, 42px)", letterSpacing: "-0.04em" }}
            >
              The Archive That Thinks.
            </p>
            <p className="text-[oklch(0.70_0.02_265)] text-base leading-relaxed">
              Millions of verified academic resources — curated by students,
              trusted by scholars. Discover, share, and study smarter.
            </p>
          </div>

          {/* Bottom: Testimonial */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5">
            <p className="text-[oklch(0.85_0.01_265)] text-sm leading-relaxed italic mb-3">
              "getpidief saved me weeks of searching. Every past paper for my
              entire course, organised and searchable."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center text-xs font-bold text-primary">
                AM
              </div>
              <div>
                <p className="text-white text-sm font-medium">Amara M.</p>
                <p className="text-[oklch(0.55_0.02_265)] text-xs">Computer Science · UCT</p>
              </div>
              <div className="ml-auto flex gap-0.5">
                {[1,2,3,4,5].map((i) => (
                  <svg key={i} width="12" height="12" viewBox="0 0 12 12" fill="#F59E0B">
                    <path d="M6 1l1.3 2.6L10 4.1l-2 2 .5 2.9L6 7.7 3.5 9l.5-2.9-2-2 2.7-.5z"/>
                  </svg>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Vertical accent line separator */}
        <div className="absolute left-0 top-0 bottom-0 w-px bg-linear-to-b from-transparent via-white/10 to-transparent" />
      </div>
    </div>
  );
}

function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-full px-4 py-2">
      <span className="text-white font-bold text-sm">{value}</span>
      <span className="text-[oklch(0.60_0.02_265)] text-xs ml-1.5">{label}</span>
    </div>
  );
}
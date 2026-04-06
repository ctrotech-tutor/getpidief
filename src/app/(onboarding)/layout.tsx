import type { Metadata } from "next";
import Link from "next/link";
import { OnboardingStepperClient } from "@/components/features/auth/OnboardingStepperClient";

export const metadata: Metadata = { title: "Setup your Scholar Profile — getpidief" };

const STEPS = [
  { number: 1, label: "Institution"    },
  { number: 2, label: "Academic Focus" },
  { number: 3, label: "Interests"      },
] as const;

interface OnboardingLayoutProps {
  children: React.ReactNode;
}

export default function OnboardingLayout({ children }: OnboardingLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="h-14 flex items-center justify-between px-6 border-b border-border">
        <Link href="/" className="font-heading font-black text-lg tracking-tight text-foreground">
          getpidief
        </Link>
        <Link
          href="/explore"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip setup →
        </Link>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* Stepper */}
        <div className="w-full max-w-lg mb-10">
          <OnboardingStepper />
        </div>

        {/* Card */}
        <div className="w-full max-w-lg bg-card border border-border rounded-2xl p-8 shadow-sm">
          {children}
        </div>
      </main>
    </div>
  );
}

// ── Stepper — reads active step from URL pattern ──────────────────────────────
// We use a client component for this since we need pathname

function OnboardingStepper() {
  return <OnboardingStepperClient steps={STEPS} />;
}
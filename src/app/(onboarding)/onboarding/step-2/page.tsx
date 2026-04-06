import type { Metadata } from "next";
import { AcademicFocusStep } from "@/components/features/auth/AcademicFocusStep";

export const metadata: Metadata = { title: "Step 2 — Academic Focus" };

const FACULTIES = [
  "Engineering & Technology",
  "Computer Science & IT",
  "Medicine & Health Sciences",
  "Law",
  "Business & Economics",
  "Natural Sciences",
  "Humanities & Social Sciences",
  "Architecture & Design",
  "Education",
  "Agriculture & Environment",
  "Pharmacy",
  "Mathematics & Statistics",
  "Other",
] as const;

const LEVELS = [
  { value: "undergraduate",  label: "Undergraduate" },
  { value: "postgraduate",   label: "Postgraduate"  },
  { value: "doctorate",      label: "Doctorate"     },
  { value: "professional",   label: "Professional"  },
] as const;

export default function OnboardingStep2Page() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Step 2 of 3
        </p>
        <h2 className="font-heading font-bold text-foreground text-2xl tracking-tight">
          What are you studying?
        </h2>
        <p className="text-sm text-muted-foreground">
          Help us surface the most relevant materials for you.
        </p>
      </div>
      <AcademicFocusStep faculties={FACULTIES} levels={LEVELS} />
    </div>
  );
}
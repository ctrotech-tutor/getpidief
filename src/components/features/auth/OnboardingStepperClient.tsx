"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

interface Step {
  number: number;
  label: string;
}

interface OnboardingStepperClientProps {
  steps: readonly Step[];
}

export function OnboardingStepperClient({ steps }: OnboardingStepperClientProps) {
  const pathname = usePathname();

  // Extract step number from path: /onboarding/step-2 → 2
  const match      = pathname.match(/step-(\d)/);
  const activeStep = match ? parseInt(match[1]!, 10) : 1;

  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => {
        const isCompleted = step.number < activeStep;
        const isActive    = step.number === activeStep;

        return (
          <div key={step.number} className="flex items-center flex-1 last:flex-none">
            {/* Step indicator */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  "text-xs font-semibold transition-all duration-300",
                  isCompleted && "bg-primary text-primary-foreground",
                  isActive    && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                  !isCompleted && !isActive && "bg-secondary border border-border text-muted-foreground"
                )}
                aria-current={isActive ? "step" : undefined}
              >
                {isCompleted ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                    <path d="M2.5 7l3 3L11.5 4" stroke="currentColor" strokeWidth="2"
                          strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  step.number
                )}
              </div>
              <span
                className={cn(
                  "text-xs whitespace-nowrap transition-colors",
                  isActive     ? "text-foreground font-medium" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-px mx-3 mb-5 transition-colors duration-300",
                  isCompleted ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
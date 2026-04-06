"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { saveOnboardingStep2 } from "@/lib/auth/onboardingActions";
import { cn } from "@/lib/utils/cn";
import type { ActionResult } from "@/lib/utils/api";

interface Level { value: string; label: string; }

interface Props {
  faculties: readonly string[];
  levels:    readonly Level[];
}

const initialState: ActionResult<{ next: string }> = { success: false, error: "" } as any;

export function AcademicFocusStep({ faculties, levels }: Props) {
  const router = useRouter();
  const [activeLevel, setActiveLevel] = useState("undergraduate");
  const [isContributor, setIsContributor] = useState(false);

  const [state, action] = useActionState(
    async (prev: ActionResult<{ next: string }>, formData: FormData) => {
      const result = await saveOnboardingStep2(prev, formData);
      if (result.success) router.push((result as any).data.next);
      return result;
    },
    initialState
  );

  return (
    <form action={action} className="space-y-5">
      {!state.success && state.error && (
        <p role="alert" className="text-sm text-destructive bg-destructive/10
                                    border border-destructive/20 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      {/* Faculty / School */}
      <div className="space-y-1.5">
        <label htmlFor="faculty" className="text-sm font-medium text-foreground">
          Faculty / School
        </label>
        <select
          id="faculty"
          name="faculty"
          required
          defaultValue=""
          className={cn(
            "w-full h-11 px-3.5 rounded-xl bg-secondary border border-border",
            "text-sm text-foreground appearance-none cursor-pointer",
            "transition-all hover:border-ring/40",
            "focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          )}
        >
          <option value="" disabled>Select your faculty…</option>
          {faculties.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      {/* Major / Programme */}
      <div className="space-y-1.5">
        <label htmlFor="major" className="text-sm font-medium text-foreground">
          Major / Programme
        </label>
        <input
          id="major"
          name="major"
          type="text"
          required
          placeholder="e.g. Computer Science, Law, Medicine…"
          className={cn(
            "w-full h-11 px-3.5 rounded-xl bg-secondary border border-border",
            "text-sm placeholder:text-muted-foreground",
            "transition-all hover:border-ring/40",
            "focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          )}
        />
      </div>

      {/* Academic Level — segmented control */}
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-foreground">Academic Level</p>
        <input type="hidden" name="academicLevel" value={activeLevel} />
        <div className="grid grid-cols-4 gap-1.5 p-1 bg-secondary rounded-xl border border-border">
          {levels.map((level) => (
            <button
              key={level.value}
              type="button"
              onClick={() => setActiveLevel(level.value)}
              className={cn(
                "py-2 rounded-lg text-xs font-medium transition-all duration-150",
                activeLevel === level.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-pressed={activeLevel === level.value}
            >
              {level.label}
            </button>
          ))}
        </div>
      </div>

      {/* Year */}
      <div className="space-y-1.5">
        <label htmlFor="academicYear" className="text-sm font-medium text-foreground">
          Current Year
          <span className="text-muted-foreground font-normal ml-1">(optional)</span>
        </label>
        <select
          id="academicYear"
          name="academicYear"
          defaultValue=""
          className={cn(
            "w-full h-11 px-3.5 rounded-xl bg-secondary border border-border",
            "text-sm appearance-none cursor-pointer",
            "transition-all hover:border-ring/40",
            "focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          )}
        >
          <option value="">Select year…</option>
          {[1, 2, 3, 4, 5, 6].map((y) => (
            <option key={y} value={y}>Year {y}</option>
          ))}
        </select>
      </div>

      {/* Contributor toggle */}
      <label className="flex items-center gap-3 p-4 rounded-xl border border-border
                        bg-secondary cursor-pointer group hover:border-primary/30 transition-colors">
        <input
          name="isContributor"
          type="checkbox"
          checked={isContributor}
          onChange={(e) => setIsContributor(e.target.checked)}
          className="w-4 h-4 accent-primary rounded cursor-pointer"
        />
        <div>
          <p className="text-sm font-medium text-foreground">I also contribute materials</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Enable contributor features — upload docs, earn reputation badges.
          </p>
        </div>
      </label>

      <div className="flex gap-3">
        <a
          href="/onboarding/step-1"
          className={cn(
            "flex-1 h-11 rounded-xl text-sm font-medium text-center leading-[44px]",
            "bg-secondary border border-border text-foreground",
            "hover:bg-secondary/80 transition-colors"
          )}
        >
          ← Back
        </a>
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "flex-1 h-11 rounded-xl font-medium text-sm",
        "bg-primary text-primary-foreground",
        "transition-all hover:bg-primary/90 active:scale-[0.98]",
        "disabled:opacity-60 disabled:cursor-not-allowed"
      )}
    >
      {pending ? "Saving…" : "Continue →"}
    </button>
  );
}
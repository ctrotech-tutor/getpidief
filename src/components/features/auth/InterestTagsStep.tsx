"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { saveOnboardingStep3 } from "@/lib/auth/onboardingActions";
import { cn } from "@/lib/utils/cn";
import type { ActionResult } from "@/lib/utils/api";

interface Tag { id: string; name: string; slug: string; }

interface Props {
  allTags:         Tag[];
  trendingTags:    Tag[];
  institutionName: string;
}

const MIN_TAGS = 3;
const MAX_TAGS = 20;
const initialState: ActionResult<{ next: string }> = { success: false, error: "" } as any;

export function InterestTagsStep({ allTags, trendingTags, institutionName }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [state, action] = useActionState(
    async (prev: ActionResult<{ next: string }>, formData: FormData) => {
      const result = await saveOnboardingStep3(prev, formData);
      if (result.success) router.push((result as any).data.next);
      return result;
    },
    initialState
  );

  function toggleTag(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_TAGS) {
        next.add(id);
      }
      return next;
    });
  }

  const count      = selected.size;
  const meetsMin   = count >= MIN_TAGS;
  const counterMsg = meetsMin
    ? `${count} selected${count >= MAX_TAGS ? " (max)" : ""}`
    : `${count} / ${MIN_TAGS} minimum`;

  return (
    <form action={action} className="space-y-6">
      {/* Hidden inputs for each selected tag */}
      {[...selected].map((id) => (
        <input key={id} type="hidden" name="tagIds" value={id} />
      ))}

      {!state.success && state.error && (
        <p role="alert" className="text-sm text-destructive bg-destructive/10
                                    border border-destructive/20 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      {/* Counter */}
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-xs font-medium transition-colors",
            meetsMin ? "text-(--emerald)" : "text-muted-foreground"
          )}
        >
          {meetsMin ? "✓ " : ""}{counterMsg}
        </span>
        {selected.size > 0 && (
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Trending section */}
      {trendingTags.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="text-(--gold)">★</span>
            Trending at {institutionName}
          </p>
          <div className="flex flex-wrap gap-2">
            {trendingTags.map((tag) => (
              <TagChip
                key={tag.id}
                tag={tag}
                isSelected={selected.has(tag.id)}
                isTrending
                onToggle={toggleTag}
              />
            ))}
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="h-px bg-border" />

      {/* All tags grid */}
      <div className="flex flex-wrap gap-2 max-h-72 overflow-y-auto pr-1">
        {allTags.map((tag) => (
          <TagChip
            key={tag.id}
            tag={tag}
            isSelected={selected.has(tag.id)}
            onToggle={toggleTag}
          />
        ))}
      </div>

      {/* Nav buttons */}
      <div className="flex gap-3 pt-2">
        <a
          href="/onboarding/step-2"
          className={cn(
            "flex-1 h-11 rounded-xl text-sm font-medium text-center leading-[44px]",
            "bg-secondary border border-border text-foreground hover:bg-secondary/80 transition-colors"
          )}
        >
          ← Back
        </a>
        <SubmitButton disabled={!meetsMin} />
      </div>
    </form>
  );
}

function TagChip({
  tag,
  isSelected,
  isTrending = false,
  onToggle,
}: {
  tag: Tag;
  isSelected: boolean;
  isTrending?: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(tag.id)}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
        "border transition-all duration-150",
        isSelected
          ? "bg-primary text-primary-foreground border-primary"
          : isTrending
          ? "bg-(--gold-subtle) border-(--gold)/30 text-(--gold) hover:border-(--gold)/60"
          : "bg-secondary border-border text-foreground hover:border-ring/40 hover:bg-secondary/60"
      )}
      aria-pressed={isSelected}
    >
      {isSelected && (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
          <path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
      {tag.name}
    </button>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={cn(
        "flex-2 h-11 rounded-xl font-medium text-sm",
        "bg-primary text-primary-foreground",
        "transition-all hover:bg-primary/90 active:scale-[0.98]",
        "disabled:opacity-40 disabled:cursor-not-allowed"
      )}
    >
      {pending ? "Setting up…" : "Enter the Archive →"}
    </button>
  );
}
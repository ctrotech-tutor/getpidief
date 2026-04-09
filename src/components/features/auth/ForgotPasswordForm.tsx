"use client";

import { useActionState, useState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/auth/actions";
import { cn } from "@/lib/utils/cn";
import type { ActionResult } from "@/lib/utils/api";

const initialState: ActionResult<{ message: string }> = {
  success: false,
  error: "",
};

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, initialState);
  const [cooldown, setCooldown] = useState(0);

  // Start 60s cooldown after successful submission
  useEffect(() => {
    if (state.success) {
      setCooldown(60);
      const interval = setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) { clearInterval(interval); return 0; }
          return c - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [state.success]);

  // ── Sent state ────────────────────────────────────────────────────────────
  if (state.success) {
    return (
      <div className="space-y-6 text-center">
        {/* Animated envelope */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20
                        flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
            <rect x="3" y="6" width="22" height="16" rx="2" stroke="currentColor"
                  strokeWidth="1.6" className="text-primary"/>
            <path d="M3 9l11 8 11-8" stroke="currentColor" strokeWidth="1.6"
                  strokeLinejoin="round" className="text-primary"/>
          </svg>
        </div>

        <div className="space-y-2">
          <h2 className="font-heading font-semibold text-foreground text-xl">
            Check your inbox.
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We sent a reset link to your email address. It expires in{" "}
            <span className="text-foreground font-medium">15 minutes</span>.
          </p>
          <p className="text-xs text-muted-foreground">
            Didn't receive it? Check your spam folder.
          </p>
        </div>

        {/* Resend with cooldown */}
        <form action={action}>
          <button
            type="submit"
            disabled={cooldown > 0}
            className={cn(
              "text-sm font-medium transition-colors",
              cooldown > 0
                ? "text-muted-foreground cursor-not-allowed"
                : "text-primary hover:text-primary/80"
            )}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email →"}
          </button>
        </form>

        <BackLink />
      </div>
    );
  }

  // ── Request form ──────────────────────────────────────────────────────────
  return (
    <form action={action} className="space-y-5" noValidate>
      {!state.success && state.error && (
        <div role="alert" className="text-sm text-destructive bg-destructive/10
                                      border border-destructive/20 rounded-lg px-3 py-2.5">
          {state.error}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Institutional Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@university.edu"
          className={cn(
            "w-full h-11 px-3.5 rounded-xl bg-secondary border border-border",
            "text-sm placeholder:text-muted-foreground",
            "transition-all hover:border-ring/40",
            "focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          )}
        />
      </div>

      <SubmitButton />
      <BackLink />
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
        "w-full h-11 rounded-xl font-medium text-sm",
        "bg-primary text-primary-foreground",
        "transition-all hover:bg-primary/90 active:scale-[0.98]",
        "disabled:opacity-60 disabled:cursor-not-allowed"
      )}
    >
      {pending ? "Sending…" : "Send Reset Link"}
    </button>
  );
}

function BackLink() {
  return (
    <p className="text-center">
      <Link
        href="/login"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← Back to Sign In
      </Link>
    </p>
  );
}

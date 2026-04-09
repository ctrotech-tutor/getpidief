"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";
import { resetPassword } from "@/lib/auth/actions";
import { cn } from "@/lib/utils/cn";
import type { ActionResult } from "@/lib/utils/api";

const initialState: ActionResult<{ message: string }> = {
  success: false,
  error: "",
};

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [state, action] = useActionState(
    async (prev: ActionResult<{ message: string }>, formData: FormData) => {
      const result = await resetPassword(prev, formData);
      if (result.success) {
        setTimeout(() => router.push("/login?reset=1"), 1800);
      }
      return result;
    },
    initialState
  );

  if (state.success) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-[var(--emerald-subtle)] border border-[var(--emerald)]/20
                        flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
            <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth="1.6"
                    className="text-[var(--emerald)]"/>
            <path d="M9 14l3.5 3.5L19 10" stroke="currentColor" strokeWidth="1.8"
                  strokeLinecap="round" strokeLinejoin="round" className="text-[var(--emerald)]"/>
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="font-heading font-semibold text-foreground text-xl">Password updated!</h2>
          <p className="text-sm text-muted-foreground">Redirecting you to sign in…</p>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="token" value={token} />

      {!state.success && state.error && (
        <div role="alert" className="text-sm text-destructive bg-destructive/10
                                      border border-destructive/20 rounded-lg px-3 py-2.5">
          {state.error}
        </div>
      )}

      {/* New Password */}
      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          New Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            placeholder="Create a strong new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={cn(
              "w-full h-11 px-3.5 pr-10 rounded-xl bg-secondary border border-border",
              "text-sm placeholder:text-muted-foreground",
              "transition-all hover:border-ring/40",
              "focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            )}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? "Hide" : "Show"}
          >
            {showPassword ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M2 2l12 12M6.5 6.6A2 2 0 009.4 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.4"/>
                <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/>
              </svg>
            )}
          </button>
        </div>
        <PasswordStrengthMeter password={password} />
      </div>

      {/* Confirm */}
      <div className="space-y-1.5">
        <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
          Confirm New Password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          placeholder="Repeat your new password"
          className={cn(
            "w-full h-11 px-3.5 rounded-xl bg-secondary border border-border",
            "text-sm placeholder:text-muted-foreground",
            "transition-all hover:border-ring/40",
            "focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          )}
        />
      </div>

      <SubmitButton />
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
      {pending ? "Updating…" : "Reset & Sign In"}
    </button>
  );
}

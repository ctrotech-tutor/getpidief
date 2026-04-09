"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { z } from "zod";
import { GoogleOAuthButton } from "./GoogleOAuthButton";
import { cn } from "@/lib/utils/cn";
import { useUIStore } from "@/stores/index";

// ── Form schema (client-side, mirrors server loginSchema) ────────────────────
const loginFormSchema = z.object({
  email:      z.string().email("Please enter a valid email address"),
  password:   z.string().min(8, "Password must be at least 8 characters"),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

// ── OAuth error messages ──────────────────────────────────────────────────────
const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked:
    "This email is already registered with a password. Please sign in with email instead.",
  OAuthCallbackError: "Google sign-in failed. Please try again.",
  EmailSignin:        "Could not send verification email. Please try again.",
  CredentialsSignin:  "Invalid email or password.",
  SessionRequired:    "Please sign in to access this page.",
  account_suspended:  "Your account has been suspended. Please contact support.",
  default:            "Something went wrong. Please try again.",
};

export function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const addToast     = useUIStore((s) => s.addToast);
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);

  // Read OAuth error from URL (?error=OAuthAccountNotLinked etc.)
  const urlError   = searchParams.get("error");
  const registered = searchParams.get("registered");
  const reset      = searchParams.get("reset");

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  const isLoading = isSubmitting || isPending;

  async function onSubmit(values: LoginFormValues) {
    startTransition(async () => {
      const result = await signIn("credentials", {
        email:    values.email.toLowerCase(),
        password: values.password,
        redirect: false,
      });

      if (!result) {
        setError("root", { message: "Something went wrong. Please try again." });
        return;
      }

      if (result.error) {
        const message = OAUTH_ERROR_MESSAGES[result.error] ?? OAUTH_ERROR_MESSAGES.default;
        setError("root", { message });
        return;
      }

      // Success — navigate
      const callbackUrl = searchParams.get("callbackUrl") ?? "/explore";
      router.push(callbackUrl);
      router.refresh(); // revalidate server components with new session
    });
  }

  return (
    <div className="space-y-6">
      {/* Success banners from other flows */}
      {registered && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl
                        bg-[var(--emerald-subtle)] border border-[var(--emerald)]/20
                        text-[var(--emerald)] text-sm">
          <CheckCircleIcon />
          Account created! Check your email to verify your address.
        </div>
      )}
      {reset && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl
                        bg-[var(--emerald-subtle)] border border-[var(--emerald)]/20
                        text-[var(--emerald)] text-sm">
          <CheckCircleIcon />
          Password updated successfully. Please sign in.
        </div>
      )}

      {/* OAuth error banner */}
      {urlError && (
        <div role="alert" className="flex items-start gap-2 px-3 py-2.5 rounded-xl
                                      bg-destructive/10 border border-destructive/20
                                      text-destructive text-sm">
          <AlertIcon />
          {OAUTH_ERROR_MESSAGES[urlError] ?? OAUTH_ERROR_MESSAGES.default}
        </div>
      )}

      {/* Google OAuth */}
      <GoogleOAuthButton label="Continue with Google" />

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground select-none">or continue with email</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {/* Root error */}
        {errors.root && (
          <div role="alert" className="flex items-start gap-2 px-3 py-2.5 rounded-xl
                                        bg-destructive/10 border border-destructive/20
                                        text-destructive text-sm">
            <AlertIcon />
            {errors.root.message}
          </div>
        )}

        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="login-email" className="text-sm font-medium text-foreground">
            Institutional Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="you@university.edu"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "login-email-error" : undefined}
            {...register("email")}
            className={cn(
              "w-full h-11 px-3.5 rounded-xl bg-secondary border",
              "text-sm text-foreground placeholder:text-muted-foreground",
              "transition-all duration-150 hover:border-ring/40 outline-none",
              "focus:border-ring focus:ring-2 focus:ring-ring/20",
              errors.email
                ? "border-destructive focus:ring-destructive/20"
                : "border-border"
            )}
          />
          {errors.email && (
            <p id="login-email-error" role="alert" className="text-xs text-destructive mt-1">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="login-password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "login-password-error" : undefined}
              {...register("password")}
              className={cn(
                "w-full h-11 px-3.5 pr-10 rounded-xl bg-secondary border",
                "text-sm text-foreground placeholder:text-muted-foreground",
                "transition-all duration-150 hover:border-ring/40 outline-none",
                "focus:border-ring focus:ring-2 focus:ring-ring/20",
                errors.password
                  ? "border-destructive focus:ring-destructive/20"
                  : "border-border"
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2
                         text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          {errors.password && (
            <p id="login-password-error" role="alert" className="text-xs text-destructive mt-1">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Remember me */}
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            {...register("rememberMe")}
            className="w-4 h-4 rounded accent-primary cursor-pointer"
          />
          <span className="text-sm text-muted-foreground">Remember me for 30 days</span>
        </label>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className={cn(
            "w-full h-11 rounded-xl font-medium text-sm",
            "bg-primary text-primary-foreground",
            "transition-all duration-150 hover:bg-primary/90 active:scale-[0.98]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:opacity-60 disabled:cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <SpinnerIcon />
              Signing in…
            </span>
          ) : (
            "Sign In to Archive"
          )}
        </button>

        <p className="text-center text-sm text-muted-foreground">
          New to getpidief?{" "}
          <Link
            href="/register"
            className="font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Create your scholar profile →
          </Link>
        </p>
      </form>

      {/* Security note */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <LockIcon />
        <span>Secured with 256-bit encryption · SOC 2 compliant</span>
      </div>
    </div>
  );
}

// ── Inline icons ──────────────────────────────────────────────────────────────
function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.4"/>
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  );
}
function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M2 2l12 12M6.5 6.6A2 2 0 009.4 9.5M5 4.4C3.3 5.5 2 7 2 7s2.5 5 6 5c1 0 2-.3 2.8-.7M9 3.2C12 4.2 14 7 14 7s-.6 1.2-1.5 2.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}
function AlertIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 shrink-0" aria-hidden>
      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M7 4v3.5M7 9.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
function CheckCircleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0" aria-hidden>
      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M4 7l2 2L10 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <rect x="2" y="5" width="8" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M4 5V3.5a2 2 0 014 0V5" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  );
}
function SpinnerIcon() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
      <path d="M8 2a6 6 0 016 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

"use client";

import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { GoogleOAuthButton } from "./GoogleOAuthButton";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";
import { registerWithCredentials } from "@/lib/auth/actions";
import { cn } from "@/lib/utils/cn";

// ── Client form schema (matches server registerSchema) ────────────────────────
const registerFormSchema = z
  .object({
    firstName:            z.string().min(1, "First name is required").max(50).trim(),
    lastName:             z.string().min(1, "Last name is required").max(50).trim(),
    email:                z.string().email("Please enter a valid email").max(255),
    password: z
      .string()
      .min(8,  "Minimum 8 characters")
      .max(72, "Maximum 72 characters")
      .regex(/[A-Z]/,        "Must include an uppercase letter")
      .regex(/[0-9]/,        "Must include a number")
      .regex(/[^A-Za-z0-9]/, "Must include a special character"),
    confirmPassword:      z.string(),
    acceptTerms:          z.boolean().refine((v) => v, "You must accept the terms"),
    isAcademicResearcher: z.boolean().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path:    ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerFormSchema>;

export function RegisterForm() {
  const router     = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition]    = useTransition();
  const [serverError, setServerError]   = useState<string | null>(null);
  const [successMsg, setSuccessMsg]     = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      firstName: "", lastName: "", email: "",
      password: "", confirmPassword: "",
      acceptTerms: false, isAcademicResearcher: false,
    },
  });

  const passwordValue = watch("password");
  const isLoading     = isSubmitting || isPending;

  async function onSubmit(values: RegisterFormValues) {
    setServerError(null);
    startTransition(async () => {
      // Build FormData to pass to server action (keeps it server-compatible)
      const fd = new FormData();
      fd.append("firstName",           values.firstName);
      fd.append("lastName",            values.lastName);
      fd.append("email",               values.email);
      fd.append("password",            values.password);
      fd.append("confirmPassword",     values.confirmPassword);
      if (values.acceptTerms)          fd.append("acceptTerms", "on");
      if (values.isAcademicResearcher) fd.append("isAcademicResearcher", "on");

      const result = await registerWithCredentials({ success: false, error: "" }, fd);

      if (!result.success) {
        if (result.field === "email") {
          setError("email", { message: result.error });
        } else {
          setServerError(result.error);
        }
        return;
      }

      setSuccessMsg((result as any).data?.message ?? "Account created! Check your email.");
      setTimeout(() => router.push("/login?registered=1"), 1800);
    });
  }

  // Domain hint — detects edu/ac/uni domains
  const emailValue    = watch("email");
  const isEduEmail    = /\.(edu|ac\.|university|uni\.)/.test(emailValue);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1
          className="font-heading font-bold text-foreground"
          style={{ fontSize: "clamp(24px, 3.5vw, 30px)", letterSpacing: "-0.03em" }}
        >
          Create your Scholar Profile
        </h1>
        <p className="text-muted-foreground text-sm">Join the network. Contribute. Discover.</p>
      </div>

      <GoogleOAuthButton label="Sign up with Google" />

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground select-none">or continue with email</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Success */}
      {successMsg && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl
                        bg-[var(--emerald-subtle)] border border-[var(--emerald)]/20
                        text-[var(--emerald)] text-sm">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0" aria-hidden>
            <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M4 7l2 2L10 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {successMsg}
        </div>
      )}

      {/* Server error */}
      {serverError && (
        <div role="alert" className="flex items-start gap-2 px-3 py-2.5 rounded-xl
                                      bg-destructive/10 border border-destructive/20
                                      text-destructive text-sm">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 shrink-0" aria-hidden>
            <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M7 4v3.5M7 9.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {/* Name row */}
        <div className="grid grid-cols-2 gap-3">
          <FormField
            id="firstName"
            label="First Name"
            placeholder="Ada"
            autoComplete="given-name"
            error={errors.firstName?.message}
            registration={register("firstName")}
          />
          <FormField
            id="lastName"
            label="Last Name"
            placeholder="Lovelace"
            autoComplete="family-name"
            error={errors.lastName?.message}
            registration={register("lastName")}
          />
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="reg-email" className="text-sm font-medium text-foreground">
            Institutional Email
          </label>
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            placeholder="you@university.edu"
            aria-invalid={!!errors.email}
            {...register("email")}
            className={cn(
              "w-full h-11 px-3.5 rounded-xl bg-secondary border",
              "text-sm placeholder:text-muted-foreground",
              "transition-all duration-150 hover:border-ring/40 outline-none",
              "focus:border-ring focus:ring-2 focus:ring-ring/20",
              errors.email ? "border-destructive focus:ring-destructive/20" : "border-border"
            )}
          />
          {/* Real-time domain validation hint */}
          {emailValue.length > 5 && !errors.email && (
            <p className={cn(
              "text-xs transition-colors",
              isEduEmail ? "text-[var(--emerald)]" : "text-muted-foreground"
            )}>
              {isEduEmail
                ? "🎓 Recognised institutional email domain"
                : "Tip: use your university email for faster verification"}
            </p>
          )}
          {errors.email && (
            <p role="alert" className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label htmlFor="reg-password" className="text-sm font-medium text-foreground">
            Password
          </label>
          <div className="relative">
            <input
              id="reg-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Create a strong password"
              aria-invalid={!!errors.password}
              {...register("password")}
              className={cn(
                "w-full h-11 px-3.5 pr-10 rounded-xl bg-secondary border",
                "text-sm placeholder:text-muted-foreground",
                "transition-all duration-150 hover:border-ring/40 outline-none",
                "focus:border-ring focus:ring-2 focus:ring-ring/20",
                errors.password ? "border-destructive focus:ring-destructive/20" : "border-border"
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword
                ? <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path d="M2 2l12 12M6.5 6.6A2 2 0 009.4 9.5M5 4.4C3.3 5.5 2 7 2 7s2.5 5 6 5c1 0 2-.3 2.8-.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                : <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.4"/>
                    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/>
                  </svg>
              }
            </button>
          </div>
          {/* Real-time strength meter */}
          <PasswordStrengthMeter password={passwordValue} />
          {errors.password && (
            <p role="alert" className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        {/* Confirm password */}
        <FormField
          id="confirmPassword"
          label="Confirm Password"
          type="password"
          placeholder="Repeat your password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          registration={register("confirmPassword")}
        />

        {/* Checkboxes */}
        <div className="space-y-3 pt-1">
          <label htmlFor="acceptTerms" className="flex items-start gap-2.5 cursor-pointer group">
            <input
              id="acceptTerms"
              type="checkbox"
              {...register("acceptTerms")}
              className="mt-0.5 w-4 h-4 rounded accent-primary cursor-pointer shrink-0"
            />
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors leading-snug">
              I agree to the{" "}
              <Link href="/terms" target="_blank" className="text-primary hover:underline">Terms of Service</Link>
              {" "}and{" "}
              <Link href="/privacy" target="_blank" className="text-primary hover:underline">Privacy Policy</Link>
            </span>
          </label>
          {errors.acceptTerms && (
            <p role="alert" className="text-xs text-destructive -mt-1">{errors.acceptTerms.message}</p>
          )}

          <label htmlFor="isAcademic" className="flex items-start gap-2.5 cursor-pointer group">
            <input
              id="isAcademic"
              type="checkbox"
              {...register("isAcademicResearcher")}
              className="mt-0.5 w-4 h-4 rounded accent-primary cursor-pointer shrink-0"
            />
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors leading-snug">
              I'm a verified student or academic researcher
            </span>
          </label>
        </div>

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
              <svg className="animate-spin w-4 h-4" viewBox="0 0 16 16" fill="none" aria-hidden>
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
                <path d="M8 2a6 6 0 016 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Creating account…
            </span>
          ) : "Create Scholar Account"}
        </button>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:text-primary/80 transition-colors">
            Sign In →
          </Link>
        </p>
      </form>
    </div>
  );
}

// ── Reusable field ────────────────────────────────────────────────────────────
interface FormFieldProps {
  id:           string;
  label:        string;
  type?:        string;
  placeholder?: string;
  autoComplete?:string;
  error?:       string;
  registration: UseFormRegisterReturn;
}
function FormField({ id, label, type = "text", placeholder, autoComplete, error, registration }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">{label}</label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={!!error}
        {...registration}
        className={cn(
          "w-full h-11 px-3.5 rounded-xl bg-secondary border",
          "text-sm placeholder:text-muted-foreground",
          "transition-all duration-150 hover:border-ring/40 outline-none",
          "focus:border-ring focus:ring-2 focus:ring-ring/20",
          error ? "border-destructive focus:ring-destructive/20" : "border-border"
        )}
      />
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

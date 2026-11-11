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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Eye, EyeOff, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

// ── Form schema (client-side, mirrors server loginSchema) ────────────────────
const loginFormSchema = z.object({
  email:      z.string().email("Please enter a valid email address"),
  password:   z.string().min(8, "Password must be at least 8 characters"),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

// ── OAuth error messages ──────────────────────────────────────────────────────
const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked:
    "This email is already registered with a password. Please sign in with email instead.",
  OAuthCallbackError: "Google sign-in failed. Please try again.",
  EmailSignin:        "Could not send verification email. Please try again.",
  CredentialsSignin:  "Invalid email or password.",
  EmailNotVerified:    "Please verify your email address. Check your inbox or resend verification.",
  SessionRequired:    "Please sign in to access this page.",
  account_suspended:  "Your account has been suspended. Please contact support.",
  default:            "Something went wrong. Please try again.",
};

export function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Read OAuth error from URL (?error=OAuthAccountNotLinked etc.)
  const urlError   = searchParams.get("error");
  const registered = searchParams.get("registered");
  const reset      = searchParams.get("reset");

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "" },
  });

  const {
    handleSubmit,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = form;

  const isLoading = isSubmitting || isPending;

  async function handleResendVerification() {
    const email = getValues("email");
    if (!email) {
      setError("root", { message: "Please enter your email address first." });
      return;
    }

    setIsResending(true);
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase() }),
      });
      
      if (response.ok) {
        setError("root", { 
          message: "Verification email sent! Please check your inbox." 
        });
      } else {
        const data = await response.json();
        setError("root", { 
          message: data.error || "Failed to resend verification email." 
        });
      }
    } catch {
      setError("root", { 
        message: "Something went wrong. Please try again." 
      });
    } finally {
      setIsResending(false);
    }
  }

  async function onSubmit(values: LoginFormValues) {
    startTransition(async () => {
      let result;
      try { result = await signIn("credentials", {
        email:    values.email.toLowerCase(),
        password: values.password,
        redirect: false,
      }); } catch { setError("root", { message: "Could not sign in right now. Please try again." }); return; }

      if (!result) {
        setError("root", { message: "Something went wrong. Please try again." });
        return;
      }

      if (result.error) {
        const message = OAUTH_ERROR_MESSAGES[result.error] ?? OAUTH_ERROR_MESSAGES.default;
        setError("root", { message });
        return;
      }

      // Success - check if email is verified
      const requested = searchParams.get("callbackUrl");
      const callbackUrl = requested?.startsWith("/") && !requested.startsWith("//") && !requested.includes("\\") ? requested : "/explore";
      
      // Check if user needs email verification
      if (result.url?.includes("/verify-email")) {
        // User needs to verify email - show message and redirect
        setError("root", { 
          message: "Please verify your email address. Check your inbox or resend verification below." 
        });
        // Don't redirect automatically - let user see the message
        return;
      }
      
      router.push(callbackUrl);
      router.refresh(); // revalidate server components with new session
    });
  }

  return (
    <div className="space-y-6">
      {/* Success banners from other flows */}
      {registered && (
        <Alert className="border-emerald-200/50 bg-emerald-50/80 text-emerald-900">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Account created! Check your email to verify your address.
          </AlertDescription>
        </Alert>
      )}
      {reset && (
        <Alert className="border-emerald-200/50 bg-emerald-50/80 text-emerald-900">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Password updated successfully. Please sign in.
          </AlertDescription>
        </Alert>
      )}

      {/* OAuth error banner */}
      {urlError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {OAUTH_ERROR_MESSAGES[urlError] ?? OAUTH_ERROR_MESSAGES.default}
          </AlertDescription>
        </Alert>
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
      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {/* Root error */}
          {errors.root && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {errors.root.message}
                {errors.root.message?.includes("verify your email") && (
                  <button
                    type="button"
                    onClick={() => handleResendVerification()}
                    disabled={isResending}
                    className="mt-2 text-xs underline hover:no-underline disabled:opacity-50"
                  >
                    {isResending ? "Sending..." : "Resend verification email"}
                  </button>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Email */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email address</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Password */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Password</FormLabel>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      {...field}
                      className={cn("pr-10")}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Submit */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              "Log in"
            )}
          </Button>
        </form>
      </Form>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-primary hover:text-primary/80 transition-colors">
          Create an account →
        </Link>
      </p>
    </div>
  );
}


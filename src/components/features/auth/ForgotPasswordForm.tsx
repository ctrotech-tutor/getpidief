"use client";

import { useActionState, useState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/auth/actions";
import { cn } from "@/lib/utils/cn";
import type { ActionResult } from "@/lib/utils/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Mail, Loader2 } from "lucide-react";

// Form schema
const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

const initialState: ActionResult<{ message: string }> = {
  success: false,
  error: "",
};

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, initialState);
  const [cooldown, setCooldown] = useState(0);

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  // Start 60s cooldown after successful submission
  useEffect(() => {
    if (state.success) {
      const startTimer = setTimeout(() => setCooldown(60), 0);
      const interval = setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) { clearInterval(interval); return 0; }
          return c - 1;
        });
      }, 1000);
      return () => {
        clearTimeout(startTimer);
        clearInterval(interval);
      };
    }
  }, [state.success]);

  // ── Sent state ────────────────────────────────────────────────────────────
  if (state.success) {
    return (
      <div className="space-y-6 text-center">
        {/* Animated envelope */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20
                        flex items-center justify-center">
          <Mail className="w-7 h-7 text-primary" />
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
            Didn&apos;t receive it? Check your spam folder.
          </p>
        </div>

        {/* Resend with cooldown */}
        <form action={action}>
          <Button
            type="submit"
            variant="ghost"
            disabled={cooldown > 0}
            className={cn(
              "text-sm font-medium",
              cooldown > 0
                ? "text-muted-foreground cursor-not-allowed"
                : "text-primary hover:text-primary/80"
            )}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email →"}
          </Button>
        </form>

        <BackLink />
      </div>
    );
  }

  // ── Request form ──────────────────────────────────────────────────────────
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => {
        // Convert to FormData for server action
        const formData = new FormData();
        formData.append("email", data.email);
        action(formData);
      })} className="space-y-5" noValidate>
        {!state.success && state.error && (
          <Alert variant="destructive">
            <AlertDescription>
              {state.error}
            </AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Institutional Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="you@university.edu"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <SubmitButton />
        <BackLink />
      </form>
    </Form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full"
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Sending…
        </>
      ) : (
        "Send Reset Link"
      )}
    </Button>
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

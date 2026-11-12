"use client";

import { useActionState, useState, useEffect, startTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/auth/actions";
import { cn } from "@/lib/utils/cn";
import type { ActionResult } from "@/lib/utils/api";
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
import { EnvelopeSimple as Mail, CircleNotch as Loader2 } from "@phosphor-icons/react";

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
  const [state, action, pending] = useActionState(requestPasswordReset, initialState);
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
  }, [state]);

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
            If an account exists for that email, a reset link will be sent. It expires in{" "}
            <span className="text-foreground font-medium">15 minutes</span>.
          </p>
          <p className="text-xs text-muted-foreground">
            Didn&apos;t receive it? Check your spam folder.
          </p>
        </div>

        {/* Resend with cooldown */}
        <form action={action}>
          <input type="hidden" name="email" value={form.getValues("email")} />
          <Button
            type="submit"
            variant="ghost"
            disabled={cooldown > 0 || pending}
            className={cn(
              "text-sm font-medium",
              cooldown > 0
                ? "text-muted-foreground cursor-not-allowed"
                : "text-primary hover:text-primary/80"
            )}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
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
        startTransition(() => action(formData));
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

        <SubmitButton pending={pending} />
        <BackLink />
      </form>
    </Form>
  );
}

function SubmitButton({ pending }: { pending: boolean }) {
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
        Back to sign in
      </Link>
    </p>
  );
}

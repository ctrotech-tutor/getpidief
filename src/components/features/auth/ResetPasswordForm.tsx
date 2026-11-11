"use client";

import { useActionState, useState, startTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";
import { resetPassword } from "@/lib/auth/actions";
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
import { CheckCircle, Eye, EyeOff, Loader2 } from "lucide-react";

// Form schema
const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Minimum 8 characters")
    .max(72, "Maximum 72 characters")
    .regex(/[A-Z]/, "Must include an uppercase letter")
    .regex(/[0-9]/, "Must include a number")
    .regex(/[^A-Za-z0-9]/, "Must include a special character"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

const initialState: ActionResult<{ message: string }> = {
  success: false,
  error: "",
};

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const passwordValue = form.watch("password");

  const [state, action, pending] = useActionState(
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
        <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200
                        flex items-center justify-center">
          <CheckCircle className="w-7 h-7 text-emerald-600" />
        </div>
        <div className="space-y-2">
          <h2 className="font-heading font-semibold text-foreground text-xl">Password updated!</h2>
          <p className="text-sm text-muted-foreground">Redirecting you to sign in…</p>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => {
        // Convert to FormData for server action
        const formData = new FormData();
        formData.append("token", token);
        formData.append("password", data.password);
        formData.append("confirmPassword", data.confirmPassword);
        startTransition(() => action(formData));
      })} className="space-y-5" noValidate>
        {!state.success && state.error && (
          <Alert variant="destructive">
            <AlertDescription>
              {state.error}
            </AlertDescription>
          </Alert>
        )}

        {/* New Password */}
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Create a strong new password"
                    {...field}
                    className="pr-10"
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
              {passwordValue && <PasswordStrengthMeter password={passwordValue} />}
            </FormItem>
          )}
        />

        {/* Confirm Password */}
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm New Password</FormLabel>
              <FormControl>
                <Input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Repeat your new password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <SubmitButton pending={pending} />
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
          Updating…
        </>
      ) : (
        "Update password"
      )}
    </Button>
  );
}

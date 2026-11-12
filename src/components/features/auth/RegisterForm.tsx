"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import Link from "next/link";
import { z } from "zod";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";
import { registerWithCredentials } from "@/lib/auth/actions";
import { cn } from "@/lib/utils/cn";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Eye, EyeSlash as EyeOff, WarningCircle as AlertCircle, CircleNotch as Loader2 } from "@phosphor-icons/react";

// ── Client form schema (matches server registerSchema) ────────────────────────
const registerFormSchema = z
  .object({
    firstName:            z.string().trim().min(1, "First name is required").max(50),
    lastName:             z.string().trim().min(1, "Last name is required").max(50),
    email:                z.string().email("Please enter a valid email").max(255),
    password: z
      .string()
      .min(8,  "Minimum 8 characters")
      .max(72, "Maximum 72 characters")
      .regex(/[A-Z]/,        "Must include an uppercase letter")
      .regex(/[0-9]/,        "Must include a number")
      .regex(/[^A-Za-z0-9]/, "Must include a special character")
      .refine((value) => new TextEncoder().encode(value).length <= 72, "Password must be at most 72 UTF-8 bytes"),
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isPending, startTransition]    = useTransition();
  const [serverError, setServerError]   = useState<string | null>(null);
  const [successMsg, setSuccessMsg]     = useState<string | null>(null);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      firstName: "", lastName: "", email: "",
      password: "", confirmPassword: "",
      acceptTerms: false, isAcademicResearcher: false,
    },
  });

  const {
    handleSubmit,
    watch,
    setError,
    formState: { isSubmitting },
  } = form;

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

      let result;
      try { result = await registerWithCredentials({ success: false, error: "" }, fd); }
      catch { setServerError("We couldn't create your account right now. Please try again."); return; }

      if (!result.success) {
        if (result.field === "email") {
          setError("email", { message: result.error });
        } else {
          setServerError(result.error);
        }
        return;
      }

      setSuccessMsg(result.data.message ?? "Account created! Check your email.");

    });
  }

  if (successMsg) return <div className="space-y-5"><h1 className="font-heading text-2xl font-bold">Your account is created.</h1><p role="status" className="text-sm text-muted-foreground leading-relaxed">{successMsg}</p><Link href="/login" className="inline-block text-sm font-medium text-primary underline">Go to sign in</Link></div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-1">
        <h1
          className="font-heading font-bold text-foreground"
          style={{ fontSize: "clamp(24px, 3.5vw, 30px)", letterSpacing: "-0.03em" }}
        >
          Make yourself at home.
        </h1>
        <p className="text-muted-foreground text-sm">A little curiosity goes a long way. Create your account to get started.</p>
      </div>

      {/* Server error */}
      {serverError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {serverError}
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ada"
                      autoComplete="given-name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Lovelace"
                      autoComplete="family-name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

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
                <FormLabel>Password</FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Create a strong password"
                      {...field}
                      className={cn("pr-12")}
                    />
                  </FormControl>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 h-11 w-11"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
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
                <FormLabel>Confirm password</FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input type={showConfirmation ? "text" : "password"} autoComplete="new-password" placeholder="Repeat your password" className="pr-12" {...field} />
                  </FormControl>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setShowConfirmation(v => !v)} className="absolute right-0 top-1/2 -translate-y-1/2 h-11 w-11" aria-label={showConfirmation ? "Hide confirmation password" : "Show confirmation password"} aria-pressed={showConfirmation}>
                    {showConfirmation ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Checkboxes */}
          <div className="space-y-3">
            <FormField
              control={form.control}
              name="acceptTerms"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-normal">
                      I agree to the{" "}
                      <Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Privacy Policy
                      </Link>
                    </FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isAcademicResearcher"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-normal">
                      I am a student or academic researcher (optional)
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Account…
              </>
            ) : (
              "Create account"
            )}
          </Button>
        </form>
      </Form>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:text-primary/80 transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}

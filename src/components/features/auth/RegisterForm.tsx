"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { GoogleOAuthButton } from "./GoogleOAuthButton";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Eye, EyeOff, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

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
    formState: { errors, isSubmitting },
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

      const result = await registerWithCredentials({ success: false, error: "" }, fd);

      if (!result.success) {
        if (result.field === "email") {
          setError("email", { message: result.error });
        } else {
          setServerError(result.error);
        }
        return;
      }

      setSuccessMsg(result.data.message ?? "Account created! Check your email.");
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
        <Alert className="border-emerald-200/50 bg-emerald-50/80 text-emerald-900">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            {successMsg}
          </AlertDescription>
        </Alert>
      )}

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
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
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

          {/* Password */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Create a strong password"
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
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <Input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Confirm your password"
                    {...field}
                  />
                </FormControl>
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
                      <Link href="/terms" className="text-primary hover:underline">
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link href="/privacy" className="text-primary hover:underline">
                        Privacy Policy
                      </Link>
                    </FormLabel>
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
                      I am an academic researcher or student
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
              "Create Scholar Profile"
            )}
          </Button>
        </form>
      </Form>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:text-primary/80 transition-colors">
          Sign In →
        </Link>
      </p>
    </div>
  );
}

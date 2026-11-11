import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/features/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot Password - getpidief",
  description: "Reset your getpidief password. Enter your email address and we'll send you a secure reset link to regain access to your account.",
  keywords: ["forgot password", "reset password", "password recovery", "getpidief"],
  openGraph: {
    title: "Forgot Password - getpidief",
    description: "Reset your getpidief password and regain access to your account.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Forgot Password - getpidief",
    description: "Reset your getpidief password and regain access to your account.",
  },
};

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1
          className="font-heading font-black text-foreground tracking-tight"
          style={{ fontSize: "clamp(28px, 4vw, 36px)", letterSpacing: "-0.02em" }}
        >
          Forgot your password?
        </h1>
        <p className="text-muted-foreground text-base leading-relaxed">
          Enter your email address and we&apos;ll help you get back into your account.
        </p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}

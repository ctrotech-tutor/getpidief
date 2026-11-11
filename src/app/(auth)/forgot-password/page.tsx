import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/features/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot Password - getpidief",
  description: "Reset your getpidief password. Enter your institutional email and we'll send you a secure reset link to regain access to your academic archive.",
  keywords: ["forgot password", "reset password", "password recovery", "getpidief"],
  openGraph: {
    title: "Forgot Password - getpidief",
    description: "Reset your getpidief password and regain access to your academic archive.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Forgot Password - getpidief",
    description: "Reset your getpidief password and regain access to your academic archive.",
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
          Enter your institutional email and we&apos;ll send a secure reset link to help you regain access to your academic archive.
        </p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}

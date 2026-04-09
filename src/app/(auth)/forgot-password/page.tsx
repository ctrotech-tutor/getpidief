import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/features/auth/ForgotPasswordForm";

export const metadata: Metadata = { title: "Forgot Password" };

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1
          className="font-heading font-bold text-foreground"
          style={{ fontSize: "clamp(24px, 3.5vw, 30px)", letterSpacing: "-0.03em" }}
        >
          Forgot your password?
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Enter your institutional email and we'll send a secure reset link.
        </p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}

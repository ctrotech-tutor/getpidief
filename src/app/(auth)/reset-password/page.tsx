import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/features/auth/ResetPasswordForm";
import { redis, KEYS } from "@/lib/redis/client";
import crypto from "crypto";
import Link from "next/link";

export const metadata: Metadata = { title: "Reset Password" };

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token } = await searchParams;

  // Validate token server-side before rendering the form
  if (!token) {
    return <InvalidToken reason="missing" />;
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const userId    = await redis.get<string>(KEYS.passwordResetToken(tokenHash));

  if (!userId) {
    return <InvalidToken reason="expired" />;
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1
          className="font-heading font-bold text-foreground"
          style={{ fontSize: "clamp(24px, 3.5vw, 30px)", letterSpacing: "-0.03em" }}
        >
          Reset your password.
        </h1>
        <p className="text-muted-foreground text-sm">
          Create a new strong password for your account.
        </p>
      </div>
      <ResetPasswordForm token={token} />
    </div>
  );
}

function InvalidToken({ reason }: { reason: "missing" | "expired" }) {
  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20
                      flex items-center justify-center">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
          <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth="1.6"
                  className="text-destructive"/>
          <path d="M14 9v6M14 17v2" stroke="currentColor" strokeWidth="1.6"
                strokeLinecap="round" className="text-destructive"/>
        </svg>
      </div>
      <div className="space-y-2">
        <h2 className="font-heading font-semibold text-foreground text-xl">
          {reason === "expired" ? "Link expired." : "Invalid link."}
        </h2>
        <p className="text-sm text-muted-foreground">
          {reason === "expired"
            ? "This password reset link has expired or already been used."
            : "This reset link is invalid."}
        </p>
      </div>
      <Link
        href="/forgot-password"
        className="inline-flex items-center justify-center w-full h-11 rounded-xl
                   bg-primary text-primary-foreground text-sm font-medium
                   hover:bg-primary/90 transition-colors"
      >
        Request a new reset link
      </Link>
      <Link href="/login" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← Back to Sign In
      </Link>
    </div>
  );
}

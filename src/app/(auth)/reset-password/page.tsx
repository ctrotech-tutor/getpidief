import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/features/auth/ResetPasswordForm";
import { redis, KEYS } from "@/lib/redis/client";
import crypto from "crypto";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WarningCircle as AlertCircle } from "@phosphor-icons/react/ssr";

export const metadata: Metadata = {
  title: "Reset Password - getpidief",
  description: "Create a new password for your getpidief account. Secure your account with a strong password.",
  keywords: ["reset password", "new password", "account security", "getpidief"],
  openGraph: {
    title: "Reset Password - getpidief",
    description: "Create a new password for your getpidief account.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Reset Password - getpidief",
    description: "Create a new password for your getpidief account.",
  },
};

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token } = await searchParams;

  // Validate token server-side before rendering the form
  if (!token) {
    return <InvalidToken reason="missing" />;
  }

  if (!redis) return <UnavailableState />;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  let userId: string | null;
  try { userId = await redis.get<string>(KEYS.passwordResetToken(tokenHash)); }
  catch { return <UnavailableState />; }

  if (!userId) {
    return <InvalidToken reason="expired" />;
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1
          className="font-heading font-black text-foreground tracking-tight"
          style={{ fontSize: "clamp(28px, 4vw, 36px)", letterSpacing: "-0.02em" }}
        >
          Reset your password.
        </h1>
        <p className="text-muted-foreground text-base leading-relaxed">
          Choose a new password to get back to your account.
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
        <AlertCircle className="w-7 h-7 text-destructive" />
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
      <Button asChild className="w-full">
        <Link href="/forgot-password">
          Request a new reset link
        </Link>
      </Button>
      <Link href="/login" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
        Back to sign in
      </Link>
    </div>
  );
}

function UnavailableState() {
  return <div className="space-y-5"><h1 className="font-heading text-2xl font-semibold">We can&apos;t check this link right now.</h1><p className="text-sm text-muted-foreground">Please try again later.</p><Link href="/login" className="text-sm text-primary underline">Back to log in</Link></div>;
}

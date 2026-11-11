import type { Metadata } from "next";
import { redis, KEYS } from "@/lib/redis/client";
import { db } from "@/lib/db/client";
import { authUsers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Verify Email - getpidief",
  description: "Verify your email address to activate your getpidief account and get started.",
  keywords: ["verify email", "email verification", "account activation", "getpidief"],
  openGraph: {
    title: "Verify Email - getpidief",
    description: "Verify your email address to activate your getpidief account.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Verify Email - getpidief",
    description: "Verify your email address to activate your getpidief account.",
  },
};

interface VerifyEmailPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const { token } = await searchParams;

  // No token — show "check your email" state
  if (!token) {
    return <CheckInboxState />;
  }

  // A missing or unreachable token store is not evidence that a link expired.
  if (!redis) return <UnavailableState />;
  let stored: string | null;
  try { stored = await redis.get<string>(KEYS.emailVerifyToken(token)); }
  catch { return <UnavailableState />; }
  if (!stored) {
    return <ExpiredState />;
  }

  let userId: string;
  let email: string;
  try {
    const parsed = JSON.parse(stored);
    userId = parsed.userId;
    email  = parsed.email;
  } catch {
    return <ExpiredState />;
  }

  // Mark email as verified
  await db
    .update(authUsers)
    .set({ emailVerified: new Date() })
    .where(eq(authUsers.id, userId));

  // Consume token
  if (redis) {
    await redis.del(KEYS.emailVerifyToken(token));
  }

  return <SuccessState email={email} />;
}

// ── States ────────────────────────────────────────────────────────────────────

function CheckInboxState() {
  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20
                      flex items-center justify-center">
        <Mail className="w-7 h-7 text-primary" />
      </div>
      <div className="space-y-2">
        <h1 className="font-heading font-black text-foreground text-2xl tracking-tight">Check your email.</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          If you recently signed up, check your inbox for a verification link.
        </p>
        <p className="text-xs text-muted-foreground">
          The link expires in 24 hours. Check your spam folder if you don&apos;t see it.
        </p>
      </div>
      <Link href="/login" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← Back to Sign In
      </Link>
    </div>
  );
}

function SuccessState({ email }: { email: string }) {
  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200
                      flex items-center justify-center">
        <CheckCircle className="w-7 h-7 text-emerald-600" />
      </div>
      <div className="space-y-2">
        <h1 className="font-heading font-black text-foreground text-2xl tracking-tight">Email verified!</h1>
        <p className="text-sm text-muted-foreground">
          <span className="text-foreground font-medium">{email}</span> is now verified.
          Your account is active.
        </p>
      </div>
      <Button asChild className="w-full">
        <Link href="/login">
          Log in
        </Link>
      </Button>
    </div>
  );
}

function ExpiredState() {
  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20
                      flex items-center justify-center">
        <Clock className="w-7 h-7 text-destructive" />
      </div>
      <div className="space-y-2">
        <h1 className="font-heading font-black text-foreground text-2xl tracking-tight">Link expired.</h1>
        <p className="text-sm text-muted-foreground">
          This verification link has expired or already been used.
        </p>
      </div>
      <Link href="/login" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← Back to Sign In
      </Link>
    </div>
  );
}

function UnavailableState() {
  return <div className="space-y-5"><h1 className="font-heading text-2xl font-semibold">We can&apos;t verify this link right now.</h1><p className="text-sm text-muted-foreground">Please try again later.</p><Link href="/login" className="text-sm text-primary underline">Back to log in</Link></div>;
}

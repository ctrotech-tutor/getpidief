import type { Metadata } from "next";
import { redis, KEYS } from "@/lib/redis/client";
import { db } from "@/lib/db/client";
import { authUsers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";

export const metadata: Metadata = { title: "Verify Email" };

interface VerifyEmailPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const { token } = await searchParams;

  // No token — show "check your email" state
  if (!token) {
    return <CheckInboxState />;
  }

  // Validate token
  const stored = await redis.get<string>(KEYS.emailVerifyToken(token));
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
  await redis.del(KEYS.emailVerifyToken(token));

  return <SuccessState email={email} />;
}

// ── States ────────────────────────────────────────────────────────────────────

function CheckInboxState() {
  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20
                      flex items-center justify-center">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-primary" aria-hidden>
          <rect x="3" y="6" width="22" height="16" rx="2" stroke="currentColor" strokeWidth="1.6"/>
          <path d="M3 9l11 8 11-8" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
        </svg>
      </div>
      <div className="space-y-2">
        <h1 className="font-heading font-bold text-foreground text-2xl">Check your email.</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We sent a verification link to your email. Click it to activate your account.
        </p>
        <p className="text-xs text-muted-foreground">
          The link expires in 24 hours. Check your spam folder if you don't see it.
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
      <div className="mx-auto w-16 h-16 rounded-2xl bg-[var(--emerald-subtle)] border border-[var(--emerald)]/20
                      flex items-center justify-center">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-[var(--emerald)]" aria-hidden>
          <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth="1.6"/>
          <path d="M9 14l3.5 3.5L19 10" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div className="space-y-2">
        <h1 className="font-heading font-bold text-foreground text-2xl">Email verified!</h1>
        <p className="text-sm text-muted-foreground">
          <span className="text-foreground font-medium">{email}</span> is now verified.
          Your account is active.
        </p>
      </div>
      <Link
        href="/login"
        className="inline-flex items-center justify-center w-full h-11 rounded-xl
                   bg-primary text-primary-foreground text-sm font-medium
                   hover:bg-primary/90 transition-colors"
      >
        Sign In to the Archive
      </Link>
    </div>
  );
}

function ExpiredState() {
  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20
                      flex items-center justify-center">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-destructive" aria-hidden>
          <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth="1.6"/>
          <path d="M14 9v6M14 17v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
      </div>
      <div className="space-y-2">
        <h1 className="font-heading font-bold text-foreground text-2xl">Link expired.</h1>
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

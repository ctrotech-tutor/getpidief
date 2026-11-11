import type { Metadata } from "next";
import Link from "next/link";
import { VerifyEmailForm } from "@/components/features/auth/VerifyEmailForm";
export const metadata: Metadata = { title: "Verify email" };
export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  // GET never changes account state: email security scanners may open the link.
  if (token) return <VerifyEmailForm token={token} />;
  return <div className="space-y-5"><h1 className="font-heading text-2xl font-semibold">Check your email.</h1><p className="text-sm text-muted-foreground">If you recently signed up, check your inbox for a verification link. You can request another on the sign-in page.</p><Link href="/login" className="block text-sm text-primary underline">Back to sign in</Link></div>;
}

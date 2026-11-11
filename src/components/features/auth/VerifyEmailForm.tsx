"use client";
import { useActionState } from "react";
import Link from "next/link";
import { verifyEmailAddress } from "@/lib/auth/actions";
import type { ActionResult } from "@/lib/utils/api";
import { Button } from "@/components/ui/button";

const initial: ActionResult<{ message: string }> = { success: false, error: "" };
export function VerifyEmailForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(verifyEmailAddress, initial);
  if (state.success) return <div className="space-y-5"><h1 className="font-heading text-2xl font-semibold">Email verified.</h1><p role="status" className="text-sm text-muted-foreground">{state.data.message}</p><Button asChild className="w-full"><Link href="/login">Sign in</Link></Button></div>;
  return <div className="space-y-5"><h1 className="font-heading text-2xl font-semibold">Verify your email.</h1><p className="text-sm text-muted-foreground">Confirm this email address to activate your account.</p>{state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}<form action={action}><input type="hidden" name="token" value={token} /><Button className="w-full" disabled={pending}>{pending ? "Verifying…" : "Verify email"}</Button></form><Link href="/login" className="block text-sm text-primary underline">Back to sign in</Link></div>;
}

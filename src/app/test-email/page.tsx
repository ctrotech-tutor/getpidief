import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Email diagnostics", robots: { index: false, follow: false } };

export default function TestEmailPage() {
  return (
    <main className="mx-auto max-w-lg px-6 py-20 space-y-4">
      <h1 className="text-2xl font-semibold">Email diagnostics unavailable</h1>
      <p className="text-muted-foreground">The public test sender has been disabled while a secure diagnostic is designed.</p>
      <Link href="/" className="text-primary underline">Back to getpidief</Link>
    </main>
  );
}

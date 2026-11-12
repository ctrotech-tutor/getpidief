import { redirectSignedInFromAuth } from "@/lib/auth/redirect-signed-in";
import type { Metadata } from "next";
import { LoginForm } from "@/components/features/auth/LoginForm";

export const metadata: Metadata = { title: "Sign In" };

export default async function LoginPage() {
  await redirectSignedInFromAuth();
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1
          className="font-heading font-bold text-foreground"
          style={{ fontSize: "clamp(26px, 4vw, 32px)", letterSpacing: "-0.03em" }}
        >
          Good to see you again.
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Pick up where your curiosity left off.
        </p>
      </div>

      <LoginForm />
    </div>
  );
}

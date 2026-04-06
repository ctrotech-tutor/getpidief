import type { Metadata } from "next";
// import { LoginForm } from "@/components/features/auth/LoginForm";

export const metadata: Metadata = { title: "Sign In" };

export default function LoginPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1
          className="font-heading font-bold text-foreground"
          style={{ fontSize: "clamp(26px, 4vw, 32px)", letterSpacing: "-0.03em" }}
        >
          Welcome back, Scholar.
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Access your institutional archive and continue your research.
        </p>
      </div>

      {/* <LoginForm /> */}
      <div className="div">HELLO TODAY</div>
    </div>
  );
}
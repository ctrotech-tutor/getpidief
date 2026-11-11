import { NextResponse } from "next/server";
import { saveOnboardingStep3 } from "@/lib/auth/onboardingActions";

// Retained for older clients. Use the same idempotent completion path as the flow.
export async function POST() {
  try {
    const data = new FormData();
    data.set("skip", "yes");
    const result = await saveOnboardingStep3(null, data);
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ message: "Onboarding completed" });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "You must be logged in" }, { status: 401 });
    }
    console.error("Skip onboarding error:", error);
    return NextResponse.json({ error: "Could not complete onboarding" }, { status: 500 });
  }
}

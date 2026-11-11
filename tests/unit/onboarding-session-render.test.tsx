import { describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { render, screen } from "@testing-library/react";
import { InterestTagsStep } from "@/components/features/auth/InterestTagsStep";

vi.mock("@/lib/auth/onboardingActions", () => ({ saveOnboardingStep3: vi.fn(), saveInterestSettings: vi.fn() }));

describe("interest pages without session context", () => {
  it("server-renders onboarding without a session provider", () => {
    expect(renderToString(<InterestTagsStep allTags={[]} />)).toContain("Go to your feed");
  });
  it("renders interest settings without a session provider", () => {
    render(<InterestTagsStep allTags={[]} settings />);
    expect(screen.getByRole("button", { name: "Save interests" })).toBeEnabled();
  });
});

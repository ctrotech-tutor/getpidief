import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { InstitutionSearchStep } from "@/components/features/auth/Institutionsearchstep";
import { AcademicFocusStep } from "@/components/features/auth/AcademicFocusStep";
import { searchInstitutions } from "@/lib/auth/onboardingActions";
import { InterestTagsStep } from "@/components/features/auth/InterestTagsStep";
vi.mock("@/lib/auth/onboardingActions", () => ({ saveOnboardingStep1: vi.fn(), saveOnboardingStep2: vi.fn(), saveOnboardingStep3: vi.fn(), searchInstitutions: vi.fn() }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ update: vi.fn() }) }));
describe("onboarding for an empty database", () => {
  it("offers a real institution skip when there are no institutions", () => {
    render(<InstitutionSearchStep popularInstitutions={[]} initialInstitution={null} />);
    expect(screen.getByText(/Search the global directory above/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue without an institution" })).toHaveAttribute("name", "skip");
  });
  it("shows institution results without internal provider labels", async () => {
    vi.mocked(searchInstitutions).mockResolvedValue({ items: [{ id: "ror:05rk03822", name: "University of Lagos", country: "Nigeria", countryCode: "NG", source: "ror" }], directoryAvailable: true });
    render(<InstitutionSearchStep popularInstitutions={[]} initialInstitution={null} />);
    fireEvent.change(screen.getByLabelText("Find your institution"), { target: { value: "Lagos" } });
    await waitFor(() => expect(screen.getByRole("button", { name: /University of Lagos/ })).toBeInTheDocument());
    expect(screen.queryByText(/ROR|Research Organization Registry/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /University of Lagos/ }));
    expect(screen.getByText("Selected: University of Lagos")).toBeInTheDocument();
  });
  it("offers a skip that bypasses academic form validation", () => {
    render(<AcademicFocusStep faculties={["Law"]} levels={[{ value: "other", label: "Other" }]} profile={null} />);
    expect(screen.getByRole("button", { name: "Skip for now" })).toHaveAttribute("formnovalidate");
  });
  it("can finish without topic data", () => {
    render(<InterestTagsStep allTags={[]} />);
    expect(screen.getByRole("button", { name: "Go to your feed" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Continue without topics" })).toHaveAttribute("name", "skip");
  });
  it("tracks topic selection accessibly without a minimum", () => {
    const tags = ["Law", "Science", "Art"].map((name, i) => ({ name, id: String(i), slug: name }));
    render(<InterestTagsStep allTags={tags} />);
    const finish = screen.getByRole("button", { name: "Go to your feed" });
    expect(finish).toBeEnabled();
    for (const name of ["Law", "Science", "Art"]) fireEvent.click(screen.getByRole("button", { name: `+ ${name}` }));
    expect(finish).toBeEnabled();
    expect(screen.getByRole("button", { name: "✓ Law" })).toHaveAttribute("aria-pressed", "true");
  });
});

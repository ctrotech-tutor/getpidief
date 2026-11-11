import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AcademicFocusStep } from "@/components/features/auth/AcademicFocusStep";
import { saveOnboardingStep2 } from "@/lib/auth/onboardingActions";

vi.mock("@/lib/auth/onboardingActions", () => ({ saveOnboardingStep2: vi.fn() }));
const levels = [{ value: "other", label: "Other / independent" }, { value: "undergraduate", label: "Undergraduate" }];
afterEach(() => vi.clearAllMocks());
describe("study selections", () => {
  it("restores a previously saved area outside the suggested list", () => {
    render(<AcademicFocusStep faculties={["Law"]} levels={levels} profile={{ faculty: "Marine Biology", major: "Ocean Life", academicLevel: "undergraduate", academicYear: 2 }} />);
    expect(screen.getByLabelText("Your area of study")).toHaveValue("Marine Biology");
    expect(screen.getByLabelText("Subject or programme")).toHaveValue("Ocean Life");
    expect(screen.getByRole("combobox", { name: "Learning stage" })).toHaveTextContent("Undergraduate");
    expect(screen.getByRole("combobox", { name: /Year/ })).toHaveTextContent("Year 2");
  });
  it("submits the displayed values, including a custom area and optional year", async () => {
    vi.mocked(saveOnboardingStep2).mockResolvedValue({ success: false, error: "Test result" });
    const { container } = render(<AcademicFocusStep faculties={["Law"]} levels={levels} profile={{ faculty: "Marine Biology", major: "Ocean Life", academicLevel: "undergraduate", academicYear: 2 }} />);
    fireEvent.change(screen.getByLabelText("Your area of study"), { target: { value: "Marine Ecology" } });
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => expect(saveOnboardingStep2).toHaveBeenCalledOnce());
    const submitted = vi.mocked(saveOnboardingStep2).mock.calls[0][1];
    expect(Object.fromEntries(submitted.entries())).toMatchObject({ faculty: "Marine Ecology", major: "Ocean Life", academicLevel: "undergraduate", academicYear: "2" });
  });
  it("offers keyboard-operable area options and a write-in choice", async () => {
    render(<AcademicFocusStep faculties={["Law"]} levels={levels} profile={null} />);
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
    const select = screen.getByRole("combobox", { name: "Area of study" });
    fireEvent.keyDown(select, { key: "ArrowDown" });
    const options = document.querySelectorAll('[data-slot="select-item"]');
    expect([...options].some(option => option.textContent === "Law")).toBe(true);
    const custom = [...options].find(option => option.textContent === "Something else")!;
    fireEvent.keyDown(custom, { key: "Enter" });
    expect(screen.getByLabelText("Your area of study")).toBeInTheDocument();
  });
});

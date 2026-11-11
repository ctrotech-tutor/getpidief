import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
const mocked = vi.hoisted(() => ({ register: vi.fn() }));
vi.mock("@/lib/auth/actions", () => ({ registerWithCredentials: mocked.register }));
import { RegisterForm } from "@/components/features/auth/RegisterForm";

afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe("registration form", () => {
  it("labels the password fields and toggles them independently", () => {
    render(<RegisterForm />);
    const password = screen.getByLabelText("Password");
    const confirm = screen.getByLabelText("Confirm password");
    expect(password).toHaveAttribute("type", "password");
    expect(confirm).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");
    expect(confirm).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Show confirmation password" }));
    expect(confirm).toHaveAttribute("type", "text");
  });
  it("requires agreement and submits the optional learner self-description", async () => {
    mocked.register.mockResolvedValue({ success: true, data: { message: "Account created." } });
    render(<RegisterForm />);
    fireEvent.change(screen.getByLabelText("First Name"), { target: { value: "Ada" } });
    fireEvent.change(screen.getByLabelText("Last Name"), { target: { value: "Lovelace" } });
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "ada@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Password1!" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "Password1!" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("You must accept the terms")).toBeInTheDocument();
    expect(mocked.register).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I agree to the/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /student or academic researcher/i }));
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(mocked.register).toHaveBeenCalledOnce());
    const data = mocked.register.mock.calls[0][1] as FormData;
    expect(data.get("acceptTerms")).toBe("on");
    expect(data.get("isAcademicResearcher")).toBe("on");
    expect(await screen.findByRole("status")).toHaveTextContent("Account created.");
  });
});

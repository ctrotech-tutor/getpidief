import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const actions = vi.hoisted(() => ({ request: vi.fn(), google: vi.fn() }));
vi.mock("@/lib/auth/actions", () => ({ requestPasswordReset: actions.request, signInWithGoogle: actions.google }));
import HomePage from "@/app/LandingPage";
import AuthLayout from "@/app/(auth)/layout";
import { ForgotPasswordForm } from "@/components/features/auth/ForgotPasswordForm";
import { GoogleOAuthButton } from "@/components/features/auth/GoogleOAuthButton";

afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe("landing and account experience", () => {
  it("links the landing page to real entry points and labels its sample", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: /learning is better together/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /get started/i })).toHaveAttribute("href", "/register");
    expect(screen.getByRole("link", { name: /take a look around/i })).toHaveAttribute("href", "/feed-preview");
    expect(screen.getByText(/not a live feed/i)).toBeInTheDocument();
  });
  it("shares the original brand across account pages without invented statistics", () => {
    render(<AuthLayout><h1>Account page</h1></AuthLayout>);
    expect(screen.getByRole("link", { name: "getpidief home" })).toHaveAttribute("href", "/");
    expect(screen.queryByText("2.4M+")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Account page" })).toBeInTheDocument();
  });
  it("submits the password-reset email and shows a non-enumerating confirmation", async () => {
    actions.request.mockResolvedValue({ success: true, data: { message: "If an account exists" } });
    render(<ForgotPasswordForm />);
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "learner@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send Reset Link" }));
    await waitFor(() => expect(actions.request).toHaveBeenCalled());
    expect(actions.request.mock.calls[0][1].get("email")).toBe("learner@example.com");
    expect(await screen.findByText(/if an account exists/i)).toBeInTheDocument();
    expect(document.querySelector('input[name="email"]')).toHaveValue("learner@example.com");
  });
  it("shows a useful error when Google sign-in fails", async () => {
    actions.google.mockRejectedValue(new Error("offline"));
    render(<GoogleOAuthButton />);
    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Google sign-in is unavailable");
  });
});

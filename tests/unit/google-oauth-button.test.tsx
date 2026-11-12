import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const { startGoogle } = vi.hoisted(() => ({ startGoogle: vi.fn() }));
vi.mock("@/lib/auth/actions", () => ({ signInWithGoogle: startGoogle }));
import { GoogleOAuthButton } from "@/components/features/auth/GoogleOAuthButton";

afterEach(() => { cleanup(); vi.resetAllMocks(); });

describe("Google sign-in button", () => {
  it("stays in the redirecting state without displaying a false error", async () => {
    startGoogle.mockImplementation(() => new Promise(() => {}));
    render(<GoogleOAuthButton />);
    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    expect(await screen.findByText("Redirecting…")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(startGoogle).toHaveBeenCalledOnce();
  });
  it("shows a retry message when starting the flow actually fails", async () => {
    startGoogle.mockRejectedValue(new Error("network"));
    render(<GoogleOAuthButton />);
    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Google sign-in is unavailable");
    await waitFor(() => expect(screen.getByRole("button", { name: "Continue with Google" })).toBeEnabled());
  });
});

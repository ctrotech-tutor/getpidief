import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
const auth = vi.hoisted(() => ({ signOut: vi.fn() }));
vi.mock("next-auth/react", () => ({ signOut: auth.signOut }));
import { FeedMoreMenu } from "@/components/features/feed/FeedMoreMenu";

describe("feed more menu", () => {
  it("opens from the keyboard and offers working secondary destinations", async () => {
    render(<FeedMoreMenu />);
    const trigger = screen.getByRole("button", { name: "More" });
    fireEvent.keyDown(trigger, { key: "Enter" });
    expect(await screen.findByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Saved posts" })).toHaveAttribute("href", "/?view=saved");
    expect(screen.getByRole("menuitem", { name: "Settings" })).toHaveAttribute("href", "/settings");
    expect(screen.getByRole("menuitem", { name: "Contact" })).toHaveAttribute("href", "/contact");
    for (const name of ["About", "Privacy", "Terms"]) expect(screen.getByRole("menuitem", { name })).toHaveAttribute("href", `/${name.toLowerCase()}`);
    expect(screen.queryByRole("menuitem", { name: "Moderation" })).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });
  it("exposes moderation to permitted roles and signs out", async () => {
    render(<FeedMoreMenu canModerate />);
    fireEvent.keyDown(screen.getByRole("button", { name: "More" }), { key: "Enter" });
    expect(await screen.findByRole("menuitem", { name: "Moderation" })).toHaveAttribute("href", "/admin");
    fireEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));
    expect(auth.signOut).toHaveBeenCalledWith({ redirectTo: "/login" });
  });
});

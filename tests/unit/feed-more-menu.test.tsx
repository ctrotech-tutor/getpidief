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
    expect(screen.queryByRole("menuitem", { name: "Saved posts" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Dashboard" })).not.toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Settings" })).toHaveAttribute("href", "/settings");
    expect(screen.getByRole("menuitem", { name: "Contact" })).toHaveAttribute("href", "/contact");
    expect(screen.getByRole("menuitem", { name: "Settings" }).querySelector("svg")).toBeNull();
    expect(screen.getByRole("menuitem", { name: "Contact" }).querySelector("svg")).toBeNull();
    for (const name of ["About", "Privacy", "Terms"]) expect(screen.getByRole("menuitem", { name })).toHaveAttribute("href", `/${name.toLowerCase()}`);
    expect(screen.queryByRole("menuitem", { name: "Moderation" })).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });
  it("signs out from the menu", async () => {
    render(<FeedMoreMenu />);
    fireEvent.keyDown(screen.getByRole("button", { name: "More" }), { key: "Enter" });
    await screen.findByRole("menuitem", { name: "Sign out" });
    fireEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));
    expect(auth.signOut).toHaveBeenCalledWith({ redirectTo: "/login" });
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ refresh: vi.fn(), push: vi.fn(), authenticated: true }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh, push: mocks.push }) }));
vi.mock("@/hooks/useSession", () => ({ useSession: () => ({ isAuthenticated: mocks.authenticated }) }));
import { FollowButton } from "@/components/features/profile/FollowButton";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); mocks.refresh.mockReset(); mocks.push.mockReset(); mocks.authenticated = true; });
describe("follow button", () => {
  it("rolls back a failed request and gives an error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    render(<FollowButton followingId="other" isFollowing={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Follow" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not update following");
    expect(screen.getByRole("button", { name: "Follow" })).toHaveAttribute("aria-pressed", "false");
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
  it("updates and refreshes after success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    render(<FollowButton followingId="other" isFollowing={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Follow" }));
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledOnce());
    expect(screen.getByRole("button", { name: "Following" })).toHaveAttribute("aria-pressed", "true");
  });
  it("directs signed-out visitors to login", () => {
    mocks.authenticated = false; const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    render(<FollowButton followingId="other" isFollowing={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Follow" }));
    expect(mocks.push).toHaveBeenCalledWith("/login"); expect(fetcher).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FollowSuggestion } from "@/components/features/feed/FollowSuggestion";
const mocks = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
describe("follow suggestion", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllGlobals());
  it("follows through the real API without refreshing the page", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true }); vi.stubGlobal("fetch", fetchMock);
    render(<FollowSuggestion id="user-id" name="Ada" />);
    fireEvent.click(screen.getByRole("button", { name: "Follow Ada" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Following Ada" })).toBeDisabled());
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith('/api/follows', expect.objectContaining({ method: 'POST', body: JSON.stringify({ followingId: 'user-id' }) }));
    expect(screen.getByRole("button", { name: "Following Ada" })).toBeDisabled();
  });
  it("shows an error and lets the user retry on failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    render(<FollowSuggestion id="user-id" name="Ada" />);
    fireEvent.click(screen.getByRole("button", { name: "Follow Ada" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not follow");
    expect(screen.getByRole("button", { name: "Follow Ada" })).toBeEnabled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});

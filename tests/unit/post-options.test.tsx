import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ refresh: vi.fn(), save: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/app/(app)/home/actions", () => ({ toggleSave: mocks.save }));
import { PostOptions } from "@/components/features/feed/PostOptions";
const base = { postId: "12345678-1234-1234-1234-123456789abc", authorId: "23456789-1234-1234-1234-123456789abc", author: "Ada", ownPost: false, initiallyFollowing: false, initiallySaved: false };
function openMenu() { fireEvent.keyDown(screen.getByRole("button", { name: "More options for post by Ada" }), { key: "Enter" }); }
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
describe("post options", () => {
  it("offers real actions and a report link while not pretending block or repost exists", async () => {
    render(<PostOptions {...base} />); openMenu();
    expect(await screen.findByRole("menuitem", { name: "Follow" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Save post" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Report post" })).toHaveAttribute("href", `/home/post/${base.postId}#report-post`);
    for (const label of ["Copy link", "Follow", "Save post", "Report post"]) {
      expect(screen.getByRole("menuitem", { name: label }).querySelector('svg[aria-hidden="true"]')).toBeInTheDocument();
    }
    expect(screen.queryByRole("menuitem", { name: /block/i })).not.toBeInTheDocument();
  });
  it("follows through the real API and refreshes the feed", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true }); vi.stubGlobal("fetch", fetchMock);
    render(<PostOptions {...base} />);
    fireEvent.click(screen.getByRole("button", { name: "Follow Ada" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/follows", expect.objectContaining({ method: "POST", body: JSON.stringify({ followingId: base.authorId }) })));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Follow Ada" })).not.toBeInTheDocument());
    openMenu(); expect(await screen.findByRole("menuitem", { name: "Unfollow" })).toBeInTheDocument();
    expect(mocks.refresh).toHaveBeenCalled();
  });
  it("reports a failed follow without pretending it succeeded", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    render(<PostOptions {...base} />); fireEvent.click(screen.getByRole("button", { name: "Follow Ada" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Could not update follow");
    expect(screen.getByRole("button", { name: "Follow Ada" })).toBeInTheDocument();
  });
  it("saves with the existing server action and changes menu state", async () => {
    mocks.save.mockResolvedValue(undefined);
    render(<PostOptions {...base} />); openMenu(); fireEvent.click(await screen.findByRole("menuitem", { name: "Save post" }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalled());
    const form = mocks.save.mock.calls[0][0] as FormData;
    expect(form.get("postId")).toBe(base.postId); expect(form.get("active")).toBe("false");
    openMenu(); expect(await screen.findByRole("menuitem", { name: "Remove from saved posts" })).toBeInTheDocument();
  });
  it("updates save immediately, rolls back failures, and does not refresh the timeline", async () => {
    let reject!: (reason: Error) => void;
    mocks.save.mockReturnValueOnce(new Promise((_, fail) => { reject = fail; }));
    render(<PostOptions {...base} />); openMenu();
    fireEvent.click(await screen.findByRole("menuitem", { name: "Save post" }));
    openMenu(); expect(await screen.findByRole("menuitem", { name: "Remove from saved posts" })).toHaveAttribute("data-disabled");
    await act(async () => reject(new Error("offline")));
    expect(screen.getByRole("status", { hidden: true })).toHaveTextContent("Could not update saved post");
    expect(screen.getByRole("menuitem", { name: "Save post" })).toBeInTheDocument();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
  it("shows follow immediately and restores it if the request fails", async () => {
    let resolve!: (response: { ok: boolean }) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise(r => { resolve = r; })));
    render(<PostOptions {...base} />);
    fireEvent.click(screen.getByRole("button", { name: "Follow Ada" }));
    expect(screen.queryByRole("button", { name: "Follow Ada" })).not.toBeInTheDocument();
    openMenu(); expect(await screen.findByRole("menuitem", { name: "Unfollow" })).toHaveAttribute("data-disabled");
    await act(async () => resolve({ ok: false }));
    expect(screen.getByRole("menuitem", { name: "Follow" })).toBeInTheDocument();
    expect(screen.getByRole("status", { hidden: true })).toHaveTextContent("Could not update follow");
  });
  it("clears successful copy feedback after a short delay", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<PostOptions {...base} />); openMenu();
    fireEvent.click(await screen.findByRole("menuitem", { name: "Copy link" }));
    expect(await screen.findByText("Link copied")).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/home/post/${base.postId}`);
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 3100)); });
    expect(screen.queryByText("Link copied")).not.toBeInTheDocument();
  });
  it("keeps the manual copy fallback available when clipboard access fails", async () => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    render(<PostOptions {...base} />); openMenu();
    fireEvent.click(await screen.findByRole("menuitem", { name: "Copy link" }));
    expect(await screen.findByLabelText("Post link to copy")).toHaveValue(`${window.location.origin}/home/post/${base.postId}`);
    expect(screen.getByText("Copy the link below")).toBeInTheDocument();
  });
  it("does not offer follow or report for your own post", async () => {
    render(<PostOptions {...base} ownPost />); openMenu();
    expect(await screen.findByRole("menuitem", { name: "Save post" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /follow/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /report/i })).not.toBeInTheDocument();
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FeedStream } from "@/components/features/feed/FeedStream";
import { startFollow, finishFollow } from "@/components/features/feed/follow-updates";
import type { FeedItem } from "@/lib/feed/read";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/app/(app)/home/actions", () => ({ toggleLike: vi.fn(), deletePost: vi.fn(), toggleSave: vi.fn(), setRepost: vi.fn() }));
const item = (id: string): FeedItem => ({ eventId: id, actorId: "author", eventKind: "post", eventAt: "2026-01-01T00:00:00.123456Z", id, authorId: "author", body: `Post ${id}`, kind: "thought", createdAt: "2026-01-01T00:00:00.123Z", name: "Ada", username: "ada", avatarUrl: null, likeCount: 0, liked: false, saved: false, following: false, replyCount: 0, reposted: false, repostCount: 0, reposterName: null, reposterUsername: null, replies: [] });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe("feed stream", () => {
  it("appends without removing the first page and exposes a working link fallback", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [item("two")], hasMore: false }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<FeedStream initial={{ items: [item("one")], hasMore: true }} view="following" userId="reader" now="2026-01-02T00:00:00.000Z" />);
    const link = screen.getByRole("link", { name: "Load more" });
    expect(link).toHaveAttribute("href", expect.stringContaining("view=following"));
    expect(link).toHaveAttribute("href", expect.stringContaining("beforeAt=2026"));
    fireEvent.click(link);
    expect(await screen.findByText("Post two")).toBeInTheDocument();
    expect(screen.getByText("Post one")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Post two").closest("article")).toHaveFocus());
    expect(screen.getByText("1 more post loaded.")).toBeInTheDocument();
    expect(screen.getByText("You’re all caught up.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("retains the existing page and offers retry on failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    render(<FeedStream initial={{ items: [item("one")], hasMore: true }} view="latest" userId="reader" now="2026-01-02T00:00:00.000Z" />);
    fireEvent.click(screen.getByRole("link", { name: "Load more" }));
    expect(await screen.findByText(/Couldn’t load posts/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Try again" })).toBeInTheDocument();
    expect(screen.getByText("Post one")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn’t load posts");
  });
  it("automatically fetches when the sentinel intersects and can be paused", async () => {
    let callback: IntersectionObserverCallback | undefined;
    class Observer {
      constructor(cb: IntersectionObserverCallback) { callback = cb; }
      observe() {} disconnect() {} unobserve() {} takeRecords() { return []; }
    }
    vi.stubGlobal("IntersectionObserver", Observer);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [item("two")], hasMore: false }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<FeedStream initial={{ items: [item("one")], hasMore: true }} view="latest" userId="reader" now="2026-01-02T00:00:00.000Z" />);
    expect(screen.getByRole("button", { name: "Pause automatic loading" })).toBeInTheDocument();
    act(() => callback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(await screen.findByText("Post two")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Post two").closest("article")).not.toHaveFocus();
  });
  it("preserves eligible appended posts and removes unavailable ones on refresh", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [item("two"), item("three")], hasMore: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [{ ...item("two"), liked: true }], hasMore: false }) });
    vi.stubGlobal("fetch", fetchMock);
    const { rerender } = render(<FeedStream initial={{ items: [item("one")], hasMore: true }} view="latest" userId="reader" now="2026-01-02T00:00:00.000Z" />);
    fireEvent.click(screen.getByRole("link", { name: "Load more" }));
    expect(await screen.findByText("Post three")).toBeInTheDocument();
    rerender(<FeedStream initial={{ items: [item("new")], hasMore: true }} view="latest" userId="reader" now="2026-01-02T00:00:00.000Z" />);
    await waitFor(() => expect(screen.queryByText("Post three")).not.toBeInTheDocument());
    expect(screen.getByText("Post two")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Unlike post by Ada" })).toBeInTheDocument();
    expect(fetchMock.mock.calls[1][0]).toContain("events=");
  });
  it("removes only events by an unfollowed actor without a feed refresh", async () => {
    const original = item("one");
    const repost = { ...item("two"), eventKind: "repost" as const, actorId: "another", reposterName: "Lin", reposterUsername: "lin" };
    render(<FeedStream initial={{ items: [original, repost], hasMore: false }} view="following" userId="reader" now="2026-01-02T00:00:00.000Z" />);
    act(() => { startFollow("author", false); finishFollow("author", false); });
    expect(screen.queryByText("Post one")).not.toBeInTheDocument();
    expect(screen.getByText("Post two")).toBeInTheDocument();
    act(() => { startFollow("author", true); finishFollow("author", true); });
    expect(screen.queryByText("Post one")).not.toBeInTheDocument();
  });
  it("shows an accessible loading announcement and decorative post skeletons while fetching", async () => {
    let complete!: (value: { ok: boolean; json: () => Promise<{ items: FeedItem[]; hasMore: boolean }> }) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise(resolve => { complete = resolve; })));
    const { container } = render(<FeedStream initial={{ items: [item("one")], hasMore: true }} view="latest" userId="reader" now="2026-01-02T00:00:00.000Z" />);
    fireEvent.click(screen.getByRole("link", { name: "Load more" }));
    expect(screen.getByText("Loading posts…")).toHaveAttribute("role", "status");
    expect(container.querySelector("[data-feed-skeleton]")).toHaveAttribute("aria-hidden", "true");
    await act(async () => complete({ ok: true, json: async () => ({ items: [item("two")], hasMore: false }) }));
    expect(container.querySelector("[data-feed-skeleton]")).not.toBeInTheDocument();
  });

});

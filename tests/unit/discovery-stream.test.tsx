import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { DiscoveryStream } from "@/components/features/feed/DiscoveryStream";
import type { FeedItem } from "@/lib/feed/read";
import type { DiscoveryCandidate } from "@/lib/feed/discovery-ranking";
import { readSeen, recordSeen } from "@/lib/feed/seen-posts";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/app/(app)/home/actions", () => ({ toggleLike: vi.fn(), deletePost: vi.fn(), toggleSave: vi.fn(), setRepost: vi.fn() }));
const ids = ["12345678-1234-1234-1234-123456789abc", "23456789-1234-1234-1234-123456789abc"];
const candidate = (id: string): DiscoveryCandidate => ({ id, authorId: id, createdAt: "2026-01-01T00:00:00.000Z", following: false, replyCount: 0 });
const post = (id: string): FeedItem => ({ eventId: id, eventKind: "post", eventAt: "2026-01-01T00:00:00.123456Z", id, authorId: id, body: `Post ${id}`, kind: "thought", createdAt: "2026-01-01T00:00:00.123Z", name: "Ada", username: "ada", avatarUrl: null, likeCount: 0, liked: false, saved: false, following: false, replyCount: 0, reposted: false, repostCount: 0, reposterName: null, reposterUsername: null, replies: [] });
const seed = { candidates: ids.map(candidate), items: ids.map(post) };
beforeEach(() => localStorage.clear());
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });
describe("discovery feed", () => {
  it("moves previously viewed posts behind unseen posts on a new visit", async () => {
    recordSeen("reader", ids[0]);
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: ids.map(post) }) }); vi.stubGlobal("fetch", fetcher);
    render(<DiscoveryStream userId="reader" now="2026-01-02T00:00:00.000Z" seed={seed} />);
    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    await waitFor(() => expect(screen.getAllByRole("article")[0]).toHaveTextContent(`Post ${ids[1]}`));
    expect(screen.getByText(/Viewed posts on this device/)).toBeInTheDocument();
  });
  it("records a post only after sustained visibility, not merely when loaded", async () => {
    const callbacks: IntersectionObserverCallback[] = [];
    class Observer { constructor(cb: IntersectionObserverCallback) { callbacks.push(cb); } observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
    vi.stubGlobal("IntersectionObserver", Observer);
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    vi.useFakeTimers();
    render(<DiscoveryStream userId="reader" now="2026-01-02T00:00:00.000Z" seed={seed} />);
    expect(readSeen("reader")).toHaveLength(0);
    const target = document.getElementById(`feed-post-${ids[0]}`)!;
    const observerCallback = callbacks.at(-1)!;
    act(() => observerCallback([{ target, isIntersecting: true, intersectionRatio: 0.5 } as unknown as IntersectionObserverEntry], {} as IntersectionObserver));
    act(() => { vi.advanceTimersByTime(1499); });
    expect(readSeen("reader")).toHaveLength(0);
    act(() => { vi.advanceTimersByTime(1); });
    expect(readSeen("reader").map(entry => entry.id)).toEqual([ids[0]]);
  });  it("rechecks the snapshot and inserts a newly published own post on refresh", async () => {
    const ownId = "34567890-1234-1234-1234-123456789abc";
    const ownCandidate = { ...candidate(ownId), authorId: "reader" };
    const ownPost = { ...post(ownId), authorId: "reader" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [post(ids[0]), post(ids[1]), ownPost] }) }));
    const { rerender } = render(<DiscoveryStream userId="reader" now="2026-01-02T00:00:00.000Z" seed={seed} />);
    rerender(<DiscoveryStream userId="reader" now="2026-01-02T00:01:00.000Z" seed={{ candidates: [ownCandidate, ...seed.candidates], items: [ownPost, ...seed.items] }} />);
    expect(await screen.findByText(`Post ${ownId}`)).toBeInTheDocument();
    expect(screen.getAllByRole("article")[0]).toHaveTextContent(`Post ${ownId}`);
  });

});

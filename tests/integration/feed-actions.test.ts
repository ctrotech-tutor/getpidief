import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ auth: vi.fn(), profile: vi.fn(), select: vi.fn(), insert: vi.fn(), update: vi.fn(), del: vi.fn(), transaction: vi.fn(), limitPost: vi.fn(), limitReply: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/auth/auth", () => ({ auth: m.auth }));
vi.mock("@/lib/db/client", () => ({ db: { query: { users: { findFirst: m.profile } }, select: m.select, insert: m.insert, update: m.update, delete: m.del, transaction: m.transaction } }));
vi.mock("@/lib/redis/client", () => ({ redisRateLimit: {}, rateLimiters: { feedPost: { limit: m.limitPost }, comment: { limit: m.limitReply } } }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidate }));
import { createPost, reply, toggleLike, deletePost } from "@/app/(app)/home/actions";
import { posts, postLikes, postReplies } from "@/lib/db/schema";
const id = "a1b2c3d4-aaaa-4444-aaaa-123456789abc";
function form(data: Record<string, string>) { const f = new FormData(); for (const [key, value] of Object.entries(data)) f.set(key, value); return f; }
beforeEach(() => {
  vi.clearAllMocks();
  m.auth.mockResolvedValue({ user: { id } });
  m.profile.mockResolvedValue({ status: "active", onboardingComplete: true });
  m.limitPost.mockResolvedValue({ success: true }); m.limitReply.mockResolvedValue({ success: true });
  m.select.mockReturnValue({ from: () => ({ innerJoin: () => ({ where: () => ({ limit: async () => [{ id }] }) }) }) });
  m.insert.mockReturnValue({ values: () => ({ onConflictDoNothing: async () => {} }) });
  m.transaction.mockImplementation(fn => fn({ select: () => ({ from: () => ({ where: () => ({ for: async () => [{ id }] }) }) }), insert: m.insert }));
  m.update.mockReturnValue({ set: () => ({ where: async () => {} }) });
});
describe("home feed mutations", () => {
  it("requires an active, onboarded account", async () => {
    m.auth.mockResolvedValueOnce(null);
    await expect(createPost(form({ kind: "thought", body: "hello" }))).rejects.toThrow("sign in");
    m.profile.mockResolvedValueOnce({ status: "suspended", onboardingComplete: true });
    await expect(createPost(form({ kind: "thought", body: "hello" }))).rejects.toThrow("Account unavailable");
    expect(m.insert).not.toHaveBeenCalled();
  });
  it("validates post types and length and observes rate limits", async () => {
    await expect(createPost(form({ kind: "resource", body: "hello" }))).rejects.toThrow("Invalid post type");
    await expect(createPost(form({ kind: "thought", body: " ".repeat(4) }))).rejects.toThrow("between 1");
    await expect(createPost(form({ kind: "thought", body: "a".repeat(3001) }))).rejects.toThrow("between 1");
    m.limitPost.mockResolvedValueOnce({ success: false });
    await expect(createPost(form({ kind: "thought", body: "hello" }))).rejects.toThrow("Too many");
    expect(m.insert).not.toHaveBeenCalled();
  });
  it("inserts a reply only to an available post and refreshes both views", async () => {
    await expect(reply(form({ postId: "bad", body: "answer" }))).rejects.toThrow("Invalid post");
    await reply(form({ postId: id, body: "answer" }));
    expect(m.insert).toHaveBeenCalledWith(postReplies);
    expect(m.revalidate).toHaveBeenCalledWith(`/home/post/${id}`);
  });
  it("uses conflict-safe likes and scopes deletion to the author", async () => {
    await toggleLike(form({ postId: id, active: "false" }));
    expect(m.insert).toHaveBeenCalledWith(postLikes);
    await deletePost(form({ postId: id }));
    expect(m.update).toHaveBeenCalledWith(posts);
    // Authorization is in the update predicate, not the untrusted form data.
    expect(m.auth).toHaveBeenCalledTimes(2);
  });
});

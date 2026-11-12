import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
const mocks = vi.hoisted(() => ({ execute: vi.fn(), findUser: vi.fn(), limit: vi.fn(), invalidate: vi.fn(), cached: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ db: { execute: mocks.execute, transaction: async (fn: (tx: { execute: typeof mocks.execute }) => Promise<unknown>) => fn({ execute: mocks.execute }), query: { users: { findFirst: mocks.findUser } }, select: () => ({ from: () => ({ where: () => ({ limit: mocks.limit }) }) }) } }));
vi.mock("@/lib/redis/client", () => ({ KEYS: { followerCount: (id: string) => id, userFollowingList: (id: string) => id, userProfile: (id: string) => id }, invalidateCache: mocks.invalidate, getCache: mocks.cached }));
import { usersRepository } from "@/lib/db/repositories/users";
const a = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", b = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const statement = () => new PgDialect().sqlToQuery(mocks.execute.mock.calls[0][0]);
beforeEach(() => { vi.resetAllMocks(); mocks.invalidate.mockResolvedValue(undefined); });
describe("follow repository", () => {
  it("serializes active-user follows and only updates counts for new relationships", async () => {
    mocks.execute.mockResolvedValueOnce({ rows: [{ id: a, status: "active", deleted_at: null }, { id: b, status: "active", deleted_at: null }] }).mockResolvedValueOnce({ rows: [{ blocked: false }] }).mockResolvedValueOnce({ rows: [{ changed: false }] });
    expect(await usersRepository.follow(a, b)).toEqual({ changed: false });
    const sql = statement().sql;
    expect(sql).toContain("ORDER BY id FOR UPDATE");
    const insert = new PgDialect().sqlToQuery(mocks.execute.mock.calls[2][0]).sql;
    expect(insert).toContain("ON CONFLICT (follower_id, following_id) DO NOTHING");
    expect(insert).toContain("EXISTS (SELECT 1 FROM inserted)");
    expect(mocks.invalidate).not.toHaveBeenCalled();
  });
  it("refuses inactive or missing targets and supports idempotent removal", async () => {
    mocks.execute.mockResolvedValueOnce({ rows: [] });
    await expect(usersRepository.follow(a, b)).rejects.toThrow("NOT_FOUND");
    mocks.execute.mockClear(); mocks.execute.mockResolvedValueOnce({ rows: [] });
    await usersRepository.unfollow(a, b);
    expect(statement().sql).toContain("EXISTS (SELECT 1 FROM removed)");
    expect(statement().sql).toContain("GREATEST(0");
  });
  it("does not reuse another viewer's cached relationship state", async () => {
    mocks.findUser.mockResolvedValue({ id: b, username: "person" });
    mocks.limit.mockResolvedValueOnce([{ id: "follow" }]).mockResolvedValueOnce([]);
    expect(await usersRepository.getPublicProfile("person", a)).toMatchObject({ isFollowing: true });
    mocks.limit.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    expect(await usersRepository.getPublicProfile("person", "cccccccc-cccc-4ccc-8ccc-cccccccccccc")).toMatchObject({ isFollowing: false });
    expect(mocks.cached).not.toHaveBeenCalled();
  });
});

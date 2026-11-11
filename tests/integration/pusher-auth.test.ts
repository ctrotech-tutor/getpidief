import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), user: vi.fn(), document: vi.fn(), authorize: vi.fn(() => ({ auth: "signed" })) }));
vi.mock("@/lib/auth/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db/client", () => ({ db: { query: { users: { findFirst: mocks.user }, documents: { findFirst: mocks.document } } } }));
vi.mock("@/lib/pusher/server", () => ({ pusherServer: { authorizeChannel: mocks.authorize } }));
import { POST } from "@/app/api/pusher/auth/route";

const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const docId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const request = (channel: string, socket = "123.456") => new NextRequest("http://localhost/api/pusher/auth", {
  method: "POST", body: new URLSearchParams({ channel_name: channel, socket_id: socket }),
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id, name: "Student" } });
  mocks.user.mockResolvedValue({ id, status: "active", role: "student", institutionId: null });
  mocks.document.mockResolvedValue({ authorId: "other", status: "approved", visibility: "public", institutionId: null, deletedAt: null });
});

describe("POST /api/pusher/auth", () => {
  it("rejects missing sessions, invalid sockets and unknown channels", async () => {
    mocks.auth.mockResolvedValueOnce(null);
    expect((await POST(request(`private-user-${id}`))).status).toBe(401);
    expect((await POST(request(`private-user-${id}`, "bad"))).status).toBe(400);
    expect((await POST(request("private-other"))).status).toBe(403);
    expect(mocks.authorize).not.toHaveBeenCalled();
  });
  it("enforces current role and status for admin presence", async () => {
    expect((await POST(request("presence-admin"))).status).toBe(403);
    mocks.user.mockResolvedValueOnce({ id, status: "suspended", role: "admin", institutionId: null });
    expect((await POST(request("presence-admin"))).status).toBe(403);
    mocks.user.mockResolvedValueOnce({ id, status: "active", role: "admin", institutionId: null });
    expect((await POST(request("presence-admin"))).status).toBe(200);
  });
  it("checks document visibility before signing", async () => {
    mocks.document.mockResolvedValueOnce({ authorId: "other", status: "approved", visibility: "private", institutionId: null, deletedAt: null });
    expect((await POST(request(`private-document-${docId}`))).status).toBe(403);
    expect(mocks.authorize).not.toHaveBeenCalled();
    expect((await POST(request(`presence-document-${docId}`))).status).toBe(200);
  });
});

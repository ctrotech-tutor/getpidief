import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePulse } from "@/hooks/usePulse";

const pusher = vi.hoisted(() => {
  const handlers: Record<string, (payload?: unknown) => void> = {};
  return { handlers, bind: vi.fn((event: string, fn: (payload?: unknown) => void) => { handlers[event] = fn; }), unsubscribe: vi.fn() };
});
vi.mock("@/lib/pusher/server", () => ({
  CHANNELS: { EXPLORE: "public-explore" }, EVENTS: { DOCUMENT_PUBLISHED: "document:published", PULSE_ACTIVITY: "pulse:activity" },
  getPusherClient: () => ({ subscribe: () => ({ bind: pusher.bind }), unsubscribe: pusher.unsubscribe }),
}));
const item = (id: string) => ({ id, type: "published", timestamp: "2026-01-01T00:00:00Z", documentId: id, slug: id, title: id, authorId: id });
const response = (items: unknown[]) => ({ ok: true, json: async () => ({ data: { items } }) });

describe("Pulse refresh signals", () => {
  beforeEach(() => { vi.clearAllMocks(); Object.keys(pusher.handlers).forEach(key => delete pusher.handlers[key]); });
  afterEach(() => { vi.unstubAllGlobals(); });
  it("ignores event payloads and replaces stale items with filtered API data", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response([item("old")])).mockResolvedValueOnce(response([item("new")]));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => usePulse());
    await waitFor(() => expect(result.current.items.map(i => i.id)).toEqual(["old"]));
    await act(async () => { pusher.handlers["pulse:activity"]({ actorName: "untrusted blocked sender" }); });
    await waitFor(() => expect(result.current.items.map(i => i.id)).toEqual(["new"]));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("uses the latest callback without resubscribing to realtime events", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response([item("old")])).mockResolvedValueOnce(response([item("new")]));
    vi.stubGlobal("fetch", fetchMock);
    const first = vi.fn(); const latest = vi.fn();
    const { rerender, result } = renderHook(({ callback }) => usePulse({ onNewItem: callback }), { initialProps: { callback: first } });
    await waitFor(() => expect(result.current.items.map(i => i.id)).toEqual(["old"]));
    await waitFor(() => expect(pusher.bind).toHaveBeenCalledTimes(4));
    rerender({ callback: latest });
    await act(async () => { pusher.handlers["pulse:activity"](); });
    await waitFor(() => expect(latest).toHaveBeenCalledWith(expect.objectContaining({ id: "new" })));
    expect(first).not.toHaveBeenCalled();
    expect(pusher.bind).toHaveBeenCalledTimes(4);
  });
  it("does not let an older response overwrite a newer one", async () => {
    let resolveOld!: (value: unknown) => void;
    const fetchMock = vi.fn().mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; })).mockResolvedValueOnce(response([item("new")]));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => usePulse());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await act(async () => { pusher.handlers["document:published"](); });
    await waitFor(() => expect(result.current.items.map(i => i.id)).toEqual(["new"]));
    await act(async () => { resolveOld(response([item("old")])); });
    expect(result.current.items.map(i => i.id)).toEqual(["new"]);
  });
});

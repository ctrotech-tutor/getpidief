import { FEED_UUID } from "./cursor";
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 300;
type Entry = { id: string; at: number };
const keyFor = (userId: string) => `feed-seen-v1:${userId}`;
export function readSeen(userId: string, now = Date.now()): Entry[] {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw || raw.length > 40_000) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e): e is Entry => !!e && typeof e.id === "string" && FEED_UUID.test(e.id) && typeof e.at === "number" && Number.isFinite(e.at) && e.at <= now && e.at >= now - MAX_AGE).slice(-MAX_ENTRIES);
  } catch { return []; }
}
export function recordSeen(userId: string, id: string, now = Date.now()): void {
  if (!FEED_UUID.test(id)) return;
  try { localStorage.setItem(keyFor(userId), JSON.stringify([...readSeen(userId, now).filter(entry => entry.id !== id), { id, at: now }].slice(-MAX_ENTRIES))); } catch { /* Storage is optional. */ }
}
export function clearSeen(userId: string): void {
  try { localStorage.removeItem(keyFor(userId)); } catch { /* Storage is optional. */ }
}

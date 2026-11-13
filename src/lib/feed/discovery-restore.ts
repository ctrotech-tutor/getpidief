import { FEED_UUID } from "./cursor";
const TTL = 15 * 60_000;
const key = (userId: string) => `feed-return-v1:${userId}`;
export type DiscoveryReturn = { candidates: string[]; loaded: string[]; offset: number; scrollY: number; savedAt: number };
export function saveDiscoveryReturn(userId: string, snapshot: DiscoveryReturn): void {
  try { sessionStorage.setItem(key(userId), JSON.stringify(snapshot)); } catch { /* Optional browser storage. */ }
}
export function takeDiscoveryReturn(userId: string, now = Date.now()): DiscoveryReturn | null {
  try {
    const raw = sessionStorage.getItem(key(userId)); sessionStorage.removeItem(key(userId));
    if (!raw || raw.length > 20_000) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const v = value as Partial<DiscoveryReturn>;
    if (!Array.isArray(v.candidates) || v.candidates.length > 125 || !Array.isArray(v.loaded) || v.loaded.length > 125 ||
      !v.candidates.every(id => typeof id === "string" && FEED_UUID.test(id)) || !v.loaded.every(id => typeof id === "string" && FEED_UUID.test(id)) ||
      new Set(v.candidates).size !== v.candidates.length || new Set(v.loaded).size !== v.loaded.length ||
      !v.loaded.every(id => v.candidates!.includes(id)) || !Number.isInteger(v.offset) || v.offset! < 0 || v.offset! > v.candidates.length ||
      v.loaded.some(id => v.candidates!.indexOf(id) >= v.offset!) || typeof v.scrollY !== "number" || !Number.isFinite(v.scrollY) || v.scrollY < 0 || v.scrollY > 10_000_000 ||
      typeof v.savedAt !== "number" || v.savedAt > now || v.savedAt < now - TTL) return null;
    return v as DiscoveryReturn;
  } catch { return null; }
}

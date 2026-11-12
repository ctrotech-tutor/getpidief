/** A small, explainable candidate ranking; it is not a learned recommendation model. */
export type DiscoveryCandidate = { id: string; authorId: string; createdAt: string; following: boolean; replyCount: number };
export function rankDiscovery(candidates: DiscoveryCandidate[], now = Date.now()): DiscoveryCandidate[] {
  const scored = candidates.map(item => {
    const ageDays = Math.max(0, now - new Date(item.createdAt).getTime()) / 86_400_000;
    const freshness = 6 / (1 + ageDays / 3);
    const relationship = item.following ? 1.5 : 0;
    const discussion = Math.min(Math.log2(1 + Math.max(0, item.replyCount)) * 0.2, 0.8);
    return { item, score: freshness + relationship + discussion };
  }).sort((a, b) => b.score - a.score || b.item.createdAt.localeCompare(a.item.createdAt) || b.item.id.localeCompare(a.item.id));
  return scored.map(x => x.item);
}
/** Prefer unseen posts, but retain seen ones as a fallback. Spread adjacent authors where possible. */
export function arrangeDiscovery(candidates: DiscoveryCandidate[], seen: ReadonlySet<string>): DiscoveryCandidate[] {
  const pending = [...candidates.filter(item => !seen.has(item.id)), ...candidates.filter(item => seen.has(item.id))];
  const result: DiscoveryCandidate[] = [];
  while (pending.length) {
    let index = 0;
    if (result.length && pending[0].authorId === result[result.length - 1].authorId) {
      // Never put a seen item ahead of unseen items simply to vary the author.
      const firstSeen = seen.has(pending[0].id);
      const alternative = pending.findIndex((item, i) => i < 8 && seen.has(item.id) === firstSeen && item.authorId !== result[result.length - 1].authorId);
      if (alternative >= 0) index = alternative;
    }
    result.push(pending.splice(index, 1)[0]);
  }
  return result;
}

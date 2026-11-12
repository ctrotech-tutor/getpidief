/** Compact, server-rendered feed timestamps. Dates use UTC for consistent output. */
export function formatPostTime(date: Date, now: Date = new Date()): string {
  const elapsed = Math.max(0, now.getTime() - date.getTime());
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (elapsed < minute) return "just now";
  if (elapsed < hour) return `${Math.floor(elapsed / minute)}m`;
  if (elapsed < day) return `${Math.floor(elapsed / hour)}h`;
  if (elapsed < 7 * day) return `${Math.floor(elapsed / day)}d`;
  // Calendar anniversaries, including leap years, determine the year count.
  let years = now.getUTCFullYear() - date.getUTCFullYear();
  const anniversary = new Date(date);
  anniversary.setUTCFullYear(date.getUTCFullYear() + years);
  if (anniversary.getTime() > now.getTime()) years--;
  if (years >= 1) return `${years}y`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

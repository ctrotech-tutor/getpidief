import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// ─────────────────────────────────────────────────────────────────────────────
// REDIS CLIENTS
// Two separate databases:
//   REDIS_URL          — cache + pub-sub + sorted sets (main)
//   REDIS_RATE_LIMIT_URL — rate limiting only (separate to avoid eviction conflicts)
// ─────────────────────────────────────────────────────────────────────────────

// Check if Redis environment variables are available
const hasRedisConfig = !!(
  process.env.UPSTASH_REDIS_REST_URL && 
  process.env.UPSTASH_REDIS_REST_TOKEN
);

const hasRateLimitRedisConfig = !!(
  process.env.UPSTASH_REDIS_RATE_LIMIT_REST_URL && 
  process.env.UPSTASH_REDIS_RATE_LIMIT_REST_TOKEN
);

// Create Redis clients with error handling
const createRedisClient = (url: string, token: string, name: string) => {
  try {
    return new Redis({
      url,
      token,
    });
  } catch (error) {
    console.error(`[Redis] Failed to create ${name} client:`, error);
    return null;
  }
};

// Main Redis client with fallback
export const redis = hasRedisConfig 
  ? createRedisClient(
      process.env.UPSTASH_REDIS_REST_URL!,
      process.env.UPSTASH_REDIS_REST_TOKEN!,
      "main"
    )
  : null;

// Rate limit Redis client with fallback
export const redisRateLimit = hasRateLimitRedisConfig
  ? createRedisClient(
      process.env.UPSTASH_REDIS_RATE_LIMIT_REST_URL!,
      process.env.UPSTASH_REDIS_RATE_LIMIT_REST_TOKEN!,
      "rate-limit"
    )
  : null;

// Redis availability check
export const isRedisAvailable = redis !== null && redisRateLimit !== null;

// ─────────────────────────────────────────────────────────────────────────────
// REDIS KEY REGISTRY
// Single source of truth for ALL keys. Every key goes here — never hardcode.
// Pattern: namespace:entity_type:id:sub_key
// ─────────────────────────────────────────────────────────────────────────────

export const KEYS = {
  // ── CACHE ──────────────────────────────────────────────────────────────────

  /** Serialized full document object with all relations */
  document: (slug: string) => `cache:document:${slug}`,

  /** Serialized public user profile */
  userProfile: (username: string) => `cache:user:${username}`,

  /** All active categories (for sidebar, filters, onboarding) */
  categories: () => `cache:categories:all`,

  /** All active tags (for onboarding tag selection) */
  tagsAll: () => `cache:tags:all`,

  /** Top tags sorted by usage count */
  tagsPopular: (limit: number = 50) => `cache:tags:popular:${limit}`,

  /** Popular institutions for onboarding quick-pick */
  institutionsPopular: () => `cache:institutions:popular`,

  /** Institution by slug */
  institution: (slug: string) => `cache:institution:${slug}`,

  /** Unread notification count per user */
  unreadNotifCount: (userId: string) => `cache:notif_count:${userId}`,

  /** User's follower count */
  followerCount: (userId: string) => `cache:followers:${userId}`,

  /** User's following list (first 100) for sidebar */
  userFollowingList: (userId: string) => `cache:following_list:${userId}`,

  /** Course codes for an institution */
  courseCodes: (institutionId: string) => `cache:course_codes:${institutionId}`,

  /** Search autocomplete suggestions */
  autocomplete: (prefix: string) => `cache:autocomplete:${prefix.toLowerCase()}`,

  /** Homepage recommended docs for a user */
  recommended: (userId: string) => `cache:recommended:${userId}`,

  /** System settings (admin-configurable) */
  systemSettings: () => `cache:system_settings`,

  // ── TRENDING SORTED SETS (score = trending_score float) ───────────────────

  /** Global trending documents: ZSET { documentId: score } */
  trendingGlobal: () => `trending:documents:global`,

  /** Trending by category: ZSET { documentId: score } */
  trendingByCategory: (categoryId: string) => `trending:documents:cat:${categoryId}`,

  /** Trending by institution: ZSET { documentId: score } */
  trendingByInstitution: (institutionId: string) =>
    `trending:documents:inst:${institutionId}`,

  /** Trending tags: ZSET { tagId: score } */
  trendingTags: () => `trending:tags:global`,

  /** Top contributors by reputation: ZSET { userId: score } */
  topContributors: () => `trending:contributors:global`,

  /** Institution activity leaderboard: ZSET { institutionId: doc_count } */
  institutionLeaderboard: () => `trending:institutions:leaderboard`,

  // ── POPULAR SEARCHES ──────────────────────────────────────────────────────

  /** Global popular searches: ZSET { query: count } */
  popularSearches: () => `search:popular:global`,

  /** Popular searches by institution: ZSET { query: count } */
  popularSearchesByInstitution: (institutionId: string) =>
    `search:popular:inst:${institutionId}`,

  // ── RECENTLY VIEWED (per user, ZSET scored by timestamp) ─────────────────

  /** User's recently viewed documents: ZSET { documentId: timestamp } */
  recentlyViewed: (userId: string) => `recent:viewed:${userId}`,

  /** User's recently searched queries: ZSET { query: timestamp } */
  recentSearches: (userId: string) => `recent:searches:${userId}`,

  // ── ENGAGEMENT COUNTERS (buffered — flushed to DB by worker) ─────────────

  /** Buffered view count delta for a document (INCR every view) */
  viewCountBuffer: (documentId: string) => `buffer:views:${documentId}`,

  /** Buffered download count delta */
  downloadCountBuffer: (documentId: string) => `buffer:downloads:${documentId}`,

  /** Buffered like count delta */
  likeCountBuffer: (documentId: string) => `buffer:likes:${documentId}`,

  /** Set of document IDs with pending counter updates */
  pendingCounterFlush: () => `buffer:pending_flush`,

  // ── PRESENCE / LIVE FEATURES ──────────────────────────────────────────────

  /** Users currently viewing a document: SET { userId } */
  documentViewers: (documentId: string) => `presence:doc:${documentId}`,

  /** Online users count (global, updated by Pusher presence) */
  onlineCount: () => `presence:online_count`,

  // ── RATE LIMITING KEYS (stored in rate-limit Redis DB) ────────────────────

  /** Login attempts per IP */
  rlLogin: (ip: string) => `rl:login:${ip}`,

  /** Register per IP */
  rlRegister: (ip: string) => `rl:register:${ip}`,

  /** Password reset per email */
  rlPasswordReset: (email: string) => `rl:pwd_reset:${email}`,

  /** Upload per user */
  rlUpload: (userId: string) => `rl:upload:${userId}`,

  /** API per user */
  rlApi: (userId: string) => `rl:api:${userId}`,

  /** Search per user */
  rlSearch: (userId: string) => `rl:search:${userId}`,

  // ── SESSIONS / TOKENS (short-lived) ──────────────────────────────────────

  /** Password reset token (raw token → userId) */
  passwordResetToken: (token: string) => `token:pwd_reset:${token}`,

  /** Email verification token */
  emailVerifyToken: (token: string) => `token:email_verify:${token}`,

  /** Onboarding state (userId → partial state JSON) */
  onboardingState: (userId: string) => `onboarding:state:${userId}`,

  // ── INNGEST / WORKER COORDINATION ─────────────────────────────────────────

  /** Lock key for trending recalculation (prevent duplicate runs) */
  trendingLock: () => `lock:trending_calc`,

  /** Last time analytics snapshot was taken */
  lastAnalyticsSnapshot: () => `worker:last_snapshot`,

  /** Documents queued for search vector rebuild */
  searchVectorRebuildQueue: () => `worker:search_vector_queue`,

  // ── FEATURE FLAGS (fallback if PostHog is unavailable) ───────────────────

  /** Feature flag value */
  featureFlag: (flag: string) => `flags:${flag}`,

} as const;

// ─────────────────────────────────────────────────────────────────────────────
// TTL REGISTRY (seconds) — all cache durations in one place
// ─────────────────────────────────────────────────────────────────────────────

export const TTL = {
  document: 300,               // 5 min — revalidated on like/comment/approve
  userProfile: 120,            // 2 min
  categories: 3600,            // 1 hour — changes rarely
  tagsAll: 3600,               // 1 hour
  tagsPopular: 1800,           // 30 min
  institutionsPopular: 3600,   // 1 hour
  institution: 3600,           // 1 hour
  unreadNotifCount: 30,        // 30 sec — very fresh
  followerCount: 120,          // 2 min
  userFollowingList: 300,      // 5 min
  courseCodes: 3600,           // 1 hour
  autocomplete: 600,           // 10 min
  recommended: 1800,           // 30 min
  systemSettings: 300,         // 5 min
  recentlyViewed: 86400 * 30,  // 30 days
  recentSearches: 86400 * 7,   // 7 days
  passwordResetToken: 900,     // 15 min
  emailVerifyToken: 86400,     // 24 hours
  onboardingState: 86400 * 7,  // 7 days
  trendingLock: 900,           // 15 min (matches recalc interval)
  featureFlag: 60,             // 1 min
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// RATE LIMITERS
// ─────────────────────────────────────────────────────────────────────────────
// RATE LIMITERS - with fallback to no-op when Redis is unavailable
const createRateLimiter = (identifier: string, windowMs: number, max: number) => {
  if (!redisRateLimit) {
    // Return a no-op rate limiter that always succeeds
    return {
      limit: async () => ({ success: true, remaining: max, reset: Date.now() + 1000 }),
    };
  }
  
  return new Ratelimit({
    redis: redisRateLimit,
    limiter: Ratelimit.slidingWindow(max, `${windowMs} ms`),
    prefix: `rl:${identifier}`,
  });
};

export const rateLimiters = {
  /** Login: 5 requests per minute per IP */
  login: createRateLimiter("login", 60 * 1000, 5),

  /** Register: 3 requests per 10 minutes per IP */
  register: createRateLimiter("register", 10 * 60 * 1000, 3),

  verificationResend: createRateLimiter("verification_resend", 15 * 60 * 1000, 5),

  /** Password reset: 3 per 15 minutes per email */
  passwordReset: createRateLimiter("pwd_reset", 15 * 60 * 1000, 3),

  /** Upload: 10 per hour per user */
  upload: createRateLimiter("upload", 60 * 60 * 1000, 10),

  /** Search: 60 per minute per user */
  search: createRateLimiter("search", 60 * 1000, 60),

  /** General API: 120 per minute per user */
  api: createRateLimiter("api", 60 * 1000, 120),

  /** Reports: 10 per hour per user */
  report: createRateLimiter("report", 60 * 60 * 1000, 10),

  /** Feed posts: 10 per 10 minutes per user */
  feedPost: createRateLimiter("feed_post", 10 * 60 * 1000, 10),

  /** Comment post: 10 per 5 minutes per user */
  comment: createRateLimiter("comment", 5 * 60 * 1000, 10),
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// REDIS HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Get cached JSON value with type safety */
export async function getCache<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const value = await redis.get<T>(key);
    return value;
  } catch {
    return null;
  }
}

/** Set JSON value with optional TTL */
export async function setCache<T>(
  key: string,
  value: T,
  ttlSeconds?: number
): Promise<void> {
  if (!redis) return;
  try {
    if (ttlSeconds) {
      await redis.setex(key, ttlSeconds, value);
    } else {
      await redis.set(key, value);
    }
  } catch (e) {
    console.error("[Redis] setCache failed", { key, error: e });
  }
}

/** Delete cache key(s) */
export async function invalidateCache(...keys: string[]): Promise<void> {
  if (keys.length === 0 || !redis) return;
  try {
    await redis.del(...keys);
  } catch (e) {
    console.error("[Redis] invalidateCache failed", { keys, error: e });
  }
}

/** Increment a counter, return new value */
export async function incrCounter(key: string, by: number = 1): Promise<number> {
  if (!redis) return 0;
  try {
    return await redis.incrby(key, by);
  } catch {
    return 0;
  }
}

/** Add to sorted set */
export async function zaddScore(
  key: string,
  score: number,
  member: string
): Promise<void> {
  if (!redis) return;
  try {
    await redis.zadd(key, { score, member });
  } catch (e) {
    console.error("[Redis] zaddScore failed", { key, error: e });
  }
}

/** Get top N members from sorted set (high → low) */
export async function zgetTop(
  key: string,
  count: number = 10
): Promise<string[]> {
  if (!redis) return [];
  try {
    const result = await redis.zrange(key, 0, count - 1, { rev: true });
    return result as string[];
  } catch {
    return [];
  }
}

/** Increment member score in sorted set */
export async function zincrby(
  key: string,
  increment: number,
  member: string
): Promise<void> {
  if (!redis) return;
  try {
    await redis.zincrby(key, increment, member);
  } catch (e) {
    console.error("[Redis] zincrby failed", { key, error: e });
  }
}

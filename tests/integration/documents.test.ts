import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the DB client and Redis before importing the repository
vi.mock("@/lib/db/client", () => ({
  db: {
    query: {
      documents: {
        findFirst: vi.fn(),
        findMany:  vi.fn(),
      },
    },
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => []),
          })),
        })),
      })),
    })),
    execute: vi.fn(() => ({ rows: [] })),
  },
  withTransaction: vi.fn(),
}));

vi.mock("@/lib/redis/client", () => ({
  redis:          { get: vi.fn(() => null), setex: vi.fn(), zadd: vi.fn(), zrange: vi.fn(() => []) },
  KEYS:           { document: (s: string) => `cache:document:${s}`, recommended: (id: string) => `cache:recommended:${id}`, trendingGlobal: () => "trending:documents:global" },
  TTL:            { document: 300, recommended: 1800 },
  getCache:       vi.fn(() => null),
  setCache:       vi.fn(),
  invalidateCache:vi.fn(),
  zgetTop:        vi.fn(() => []),
}));

import { documentsRepository } from "@/lib/db/repositories/documents";

describe("documentsRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getBySlug", () => {
    it("returns null when document not found", async () => {
      const { db } = await import("@/lib/db/client");
      (db.query.documents.findFirst as any).mockResolvedValue(null);

      const result = await documentsRepository.getBySlug("nonexistent-slug");
      expect(result).toBeNull();
    });

    it("returns cached result when available", async () => {
      const { getCache } = await import("@/lib/redis/client");
      const cachedDoc = { id: "1", slug: "test-doc", title: "Test" };
      (getCache as any).mockResolvedValue(cachedDoc);

      const result = await documentsRepository.getBySlug("test-doc");
      expect(result).toEqual(cachedDoc);
    });
  });

  describe("getTrending", () => {
    it("falls back to getRecent when Redis is empty", async () => {
      const { zgetTop } = await import("@/lib/redis/client");
      (zgetTop as any).mockResolvedValue([]);

      const { db } = await import("@/lib/db/client");
      (db.query.documents.findMany as any).mockResolvedValue([]);

      const result = await documentsRepository.getTrending({ limit: 6 });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getByIds", () => {
    it("returns empty array for empty ids", async () => {
      const result = await documentsRepository.getByIds([]);
      expect(result).toEqual([]);
    });
  });
});
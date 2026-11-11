import { describe, expect, it, vi } from "vitest";

// Registration must not depend on a live database connection.
vi.mock("@/lib/db/client", () => ({ db: {} }));
vi.mock("@/lib/storage/private-pdf", () => ({}));

import { functions, sendEmailVerification } from "@/lib/inngest/functions";

describe("Inngest function registration", () => {
  it("serves the verification email worker exactly once", () => {
    expect(functions.filter((fn) => fn === sendEmailVerification)).toHaveLength(1);
  });
});

import { describe, expect, it } from "vitest";
import { authConfig } from "@/lib/auth/auth.config";
import { NextRequest } from "next/server";

describe("public route authorization", () => {
  it.each(["/", "/about", "/contact", "/privacy", "/terms", "/cookies", "/blog", "/changelog", "/institutions", "/d/example", "/u/learner", "/api/inngest"])("allows anonymous access to %s", async path => {
    const authorized = authConfig.callbacks!.authorized!;
    const response = await authorized({ auth: null, request: new NextRequest(`http://localhost${path}`) });
    expect(response).toBe(true);
  });
  it("does not expose private dashboard paths", async () => {
    const response = await authConfig.callbacks!.authorized!({ auth: null, request: new NextRequest("http://localhost/dashboard") });
    expect(response).toBe(false);
  });
});

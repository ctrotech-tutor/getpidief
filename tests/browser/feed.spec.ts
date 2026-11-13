import { test, expect, type Page } from "@playwright/test";

// These are known-password *fictional* seed accounts. Never run this suite
// against a shared or hosted database. Each case signs in independently.
async function signIn(page: Page) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill("learner01@example.test");
  await page.locator('input[name="password"]').fill("Password123!");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
  await expect(page.getByRole("navigation", { name: "Feed views" })).toBeVisible();
  await expect(page.locator('article[id^="feed-"]').first()).toBeVisible();
}
test.beforeEach(async ({ page }) => { await signIn(page); });

test("feed shell survives navigation and back without horizontal overflow", async ({ page }) => {
  await expect(page.getByRole("button", { name: /what.s on your mind/i })).toBeVisible();
  const navigation = page.getByRole("navigation", { name: "Feed views" });
  await navigation.getByRole("link", { name: "Following", exact: true }).click();
  await expect(navigation.getByRole("link", { name: "Following", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("button", { name: /what.s on your mind/i })).toBeVisible();
  await page.goBack();
  await expect(navigation.getByRole("link", { name: "For you", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.locator('article[id^="feed-"]').first()).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("like responds optimistically during slow request and rolls back on failure", async ({ page }) => {
  const card = page.locator('article[id^="feed-"]').first();
  const button = card.locator('button[aria-label^="Like post"], button[aria-label^="Unlike post"]').first();
  const initial = await button.getAttribute("aria-pressed");
  const inverted = initial === "true" ? "false" : "true";
  let release!: () => void;
  let requestSeen!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const seen = new Promise<void>(resolve => { requestSeen = resolve; });
  await page.route("**/*", async route => {
    if (route.request().method() === "POST" && route.request().headers()["next-action"]) {
      requestSeen(); await gate; await route.abort("failed");
    } else await route.continue();
  });
  try {
    await button.click();
    await seen;
    await expect(button).toHaveAttribute("aria-pressed", inverted);
    await expect(button).toHaveAttribute("aria-disabled", "true");
  } finally { release(); }
  await expect(button).toHaveAttribute("aria-pressed", initial!);
  await expect(card.getByRole("alert")).toContainText("Could not update like");
  await expect(page.getByRole("navigation", { name: "Feed views" })).toBeVisible();
});

test("post menu remains readable on hover and keyboard highlight", async ({ page }, testInfo) => {
  const trigger = page.locator('article[id^="feed-"]').first().getByRole("button", { name: /more options for post by/i });
  await trigger.click();
  const item = page.getByRole("menuitem", { name: "Copy link" });
  await expect(item).toBeVisible();
  if (testInfo.project.name === "desktop") await item.hover();
  else { await page.keyboard.press("ArrowDown"); await expect(item).toBeFocused(); }
  const colors = await item.evaluate(el => {
    const style = getComputedStyle(el); const icon = el.querySelector("svg");
    return { text: style.color, bg: style.backgroundColor, icon: icon ? getComputedStyle(icon).color : "" };
  });
  const rgb = (value: string) => (value.match(/\d+(?:\.\d+)?/g) ?? []).slice(0,3).map(Number);
  const luminance = (value: string) => rgb(value).map(v => v/255).map(v => v <= 0.04045 ? v/12.92 : ((v+0.055)/1.055)**2.4).reduce((sum,v,i) => sum+v*[0.2126,0.7152,0.0722][i],0);
  const contrast = (a: string,b: string) => { const x=luminance(a),y=luminance(b); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); };
  expect(contrast(colors.text, colors.bg)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(colors.icon, colors.bg)).toBeGreaterThanOrEqual(3);
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("failed follow rolls back without navigating or replacing the feed", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "The people rail is desktop-only.");
  const rail = page.getByRole("region", { name: "Who to follow" });
  const button = rail.getByRole("button", { name: /^Follow / }).first();
  await expect(button).toBeVisible();
  await page.evaluate(() => { (window as unknown as { feedMarker: string }).feedMarker = "stable"; });
  await page.route("**/api/follows", async route => { await new Promise(resolve => setTimeout(resolve, 500)); await route.fulfill({ status: 503, body: "offline" }); });
  await button.click();
  await expect(rail.getByRole("alert").first()).toContainText("Could not follow");
  await expect(button).toBeEnabled();
  expect(await page.evaluate(() => (window as unknown as { feedMarker: string }).feedMarker)).toBe("stable");
  await expect(page.locator('article[id^="feed-"]').first()).toBeVisible();
});

test("manual pagination keeps the feed visible and announces slow loading", async ({ page }) => {
  // Exercise the accessible fallback when automatic loading is unavailable.
  await page.addInitScript(() => { Reflect.deleteProperty(window, "IntersectionObserver"); });
  await page.reload();
  const cards = page.locator('article[id^="feed-"]');
  await expect(cards.first()).toBeVisible();
  const load = page.getByRole("button", { name: "Load more", exact: true });
  await expect(load).toBeVisible();
  const before = await cards.count();
  let release!: () => void, requestSeen!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const seen = new Promise<void>(resolve => { requestSeen = resolve; });
  await page.route("**/api/feed?**", async route => { requestSeen(); await gate; await route.continue(); });
  try {
    await load.click(); await seen;
    await expect(page.locator("[data-feed-skeleton]").first()).toHaveAttribute("aria-hidden", "true");
    await expect(page.getByRole("status").filter({ hasText: "Loading posts" })).toBeAttached();
    expect(await cards.count()).toBe(before);
    await expect(page.getByRole("navigation", { name: "Feed views" })).toBeAttached();
  } finally { release(); }
  await expect.poll(() => cards.count()).toBeGreaterThan(before);
  await expect(page.getByRole("status").filter({ hasText: /more posts? loaded/i })).toBeAttached();
  await expect(cards.nth(before)).toBeFocused();
});

test("successful follow refreshes the people rail without replacing the feed", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "The people rail is desktop-only.");
  const rail = page.getByRole("region", { name: "Who to follow" });
  const button = rail.getByRole("button", { name: /^Follow / }).first();
  await expect(button).toBeVisible();
  const name = (await button.getAttribute("aria-label"))!.replace(/^Follow /, "");
  await page.evaluate(() => { (window as unknown as { feedMarker: string }).feedMarker = "stable"; });
  const result = page.waitForResponse(response => response.url().endsWith("/api/follows") && response.request().method() === "POST");
  await button.click();
  const response = await result;
  const followingId = response.request().postDataJSON().followingId as string;
  try {
    expect(response.ok()).toBe(true);
    await expect(page.getByRole("region", { name: "Following", exact: true }).getByText(name, { exact: true })).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { feedMarker: string }).feedMarker)).toBe("stable");
    await expect(page.locator('article[id^="feed-"]').first()).toBeVisible();
  } finally {
    const undone = await page.request.delete("/api/follows", { data: { followingId } });
    expect(undone.ok()).toBe(true);
  }
});

test("successful like and repost update immediately and persist without refreshing", async ({ page }) => {
  const card = page.locator('article[id^="feed-post-"]').first();
  const postId = (await card.getAttribute("id"))!.replace(/^feed-post-/, "");
  await page.evaluate(() => { (window as unknown as { feedMarker: string }).feedMarker = "stable"; });
  for (const [kind, selector] of [
    ["liked", 'button[aria-label^="Like post"],button[aria-label^="Unlike post"]'],
    ["reposted", 'button[aria-label^="Repost post"],button[aria-label^="Undo repost of"]'],
  ] as const) {
    const button = card.locator(selector).first();
    const initial = await button.getAttribute("aria-pressed");
    const next = initial === "true" ? "false" : "true";
    let release!: () => void, requestSeen!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const seen = new Promise<void>(resolve => { requestSeen = resolve; });
    const handler = async (route: import("@playwright/test").Route) => {
      if (route.request().method() === "POST" && route.request().headers()["next-action"]) { requestSeen(); await gate; await route.continue(); }
      else await route.continue();
    };
    await page.route("**/*", handler);
    try {
      await button.click(); await seen;
      await expect(button).toHaveAttribute("aria-pressed", next);
      await expect(button).toHaveAttribute("aria-disabled", "true");
    } finally { release(); }
    await expect(button).toHaveAttribute("aria-disabled", "false");
    await expect(button).toHaveAttribute("aria-pressed", next);
    await page.unroute("**/*", handler);
    try {
      const response = await page.request.get(`/api/feed?view=latest&events=post:${postId}`);
      expect(response.ok()).toBe(true);
      const body = await response.json();
      expect(body.items.find((item: { id: string }) => item.id === postId)?.[kind]).toBe(next === "true");
      expect(await page.evaluate(() => (window as unknown as { feedMarker: string }).feedMarker)).toBe("stable");
    } finally {
      await button.click();
      await expect(button).toHaveAttribute("aria-disabled", "false");
      await expect(button).toHaveAttribute("aria-pressed", initial!);
    }
  }
});

test("reload shows no provisional posts while viewed-history order is loading", async ({ page }) => {
  const initialIds = await page.locator('article[id^="feed-post-"]').evaluateAll(nodes => nodes.map(node => node.id.replace(/^feed-post-/, "")));
  expect(initialIds.length).toBeGreaterThan(0);
  await page.evaluate(async ids => {
    const session = await (await fetch("/api/auth/session")).json();
    if (!session.user?.id) throw new Error("No local test session");
    localStorage.setItem(`feed-seen-v1:${session.user.id}`, JSON.stringify(ids.map(id => ({ id, at: Date.now() }))));
    sessionStorage.removeItem(`feed-return-v1:${session.user.id}`);
  }, initialIds);
  let release!: () => void, requestSeen!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const seen = new Promise<void>(resolve => { requestSeen = resolve; });
  await page.route("**/api/feed?**", async route => { requestSeen(); await gate; await route.continue(); });
  try {
    await page.reload({ waitUntil: "domcontentloaded" });
    await seen;
    await expect(page.getByRole("navigation", { name: "Feed views" })).toBeVisible();
    await expect(page.getByRole("button", { name: /what.s on your mind/i })).toBeVisible();
    await expect(page.locator("[data-feed-skeleton]").first()).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "Loading posts" })).toBeAttached();
    expect(await page.locator('article[id^="feed-"]').count()).toBe(0);
  } finally { release(); }
  const first = page.locator('article[id^="feed-post-"]').first();
  await expect(first).toBeVisible();
  const revealed = await first.getAttribute("id");
  expect(initialIds).not.toContain(revealed!.replace(/^feed-post-/, ""));
  await page.waitForTimeout(750);
  await expect(page.locator('article[id^="feed-post-"]').first()).toHaveAttribute("id", revealed!);
});

test("returning from a post revalidates the saved order before showing it", async ({ page }) => {
  const first = page.locator('article[id^="feed-post-"]').first();
  const firstId = await first.getAttribute("id");
  await first.getByRole("link", { name: /^Open post by / }).click();
  await expect(page).toHaveURL(/\/home\/post\//);
  let release!: () => void, requestSeen!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const seen = new Promise<void>(resolve => { requestSeen = resolve; });
  await page.route("**/api/feed?**", async route => { requestSeen(); await gate; await route.continue(); });
  try {
    const navigation = page.goBack({ waitUntil: "domcontentloaded" });
    await seen; await navigation;
    await expect(page.getByRole("navigation", { name: "Feed views" })).toBeVisible();
    await expect(page.locator("[data-feed-skeleton]").first()).toBeVisible();
    expect(await page.locator('article[id^="feed-"]').count()).toBe(0);
  } finally { release(); }
  await expect(page.locator('article[id^="feed-post-"]').first()).toHaveAttribute("id", firstId!);
  await expect(page.getByRole("status").filter({ hasText: "Returned to your place in the feed" })).toBeAttached();
});

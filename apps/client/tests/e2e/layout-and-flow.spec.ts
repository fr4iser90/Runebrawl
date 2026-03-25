import { expect, test, type Page } from "@playwright/test";

async function assertNoHorizontalOverflow(page: Page): Promise<void> {
  const hasOverflow = await page.evaluate(() => {
    const html = document.documentElement;
    const body = document.body;
    return html.scrollWidth > window.innerWidth + 1 || body.scrollWidth > window.innerWidth + 1;
  });
  expect(hasOverflow).toBeFalsy();
}

async function enterPrivateLobby(page: Page): Promise<void> {
  await page.goto("/");
  const menu = page.locator(".menu-screen");
  await expect(menu).toBeVisible();

  await menu.locator("select").first().selectOption("createPrivate");
  await menu.locator("input").nth(0).fill(`pw-${Date.now().toString(36)}`);
  await menu.locator("input").nth(1).fill("EU");
  await menu.locator("input").nth(2).fill("1000");
  await menu.locator("input").nth(3).fill("2");
  await menu.locator("button").first().click();

  await expect(page.locator(".lobby-screen")).toBeVisible({ timeout: 20_000 });
}

test("menu screen renders on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await expect(page.locator(".menu-screen")).toBeVisible();
});

test("no horizontal overflow on phone 375x812", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(page.locator(".menu-screen")).toBeVisible();
  await assertNoHorizontalOverflow(page);
});

test("no horizontal overflow on phone 390x844", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".menu-screen")).toBeVisible();
  await assertNoHorizontalOverflow(page);
});

test("no horizontal overflow on landscape phone 667x375", async ({ page }) => {
  await page.setViewportSize({ width: 667, height: 375 });
  await page.goto("/");
  await expect(page.locator(".menu-screen")).toBeVisible();
  await assertNoHorizontalOverflow(page);
});

test("create private lobby reaches lobby screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enterPrivateLobby(page);
  await assertNoHorizontalOverflow(page);
});

test("lobby controls and player list are visible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enterPrivateLobby(page);
  await expect(page.locator(".lobby-screen .player-list")).toBeVisible();
  await expect(page.locator(".lobby-screen .actions button").first()).toBeVisible();
});

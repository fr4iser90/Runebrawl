import { expect, test, type Page } from "@playwright/test";

async function openPrivateLobby(page: Page): Promise<void> {
  const menu = page.locator(".menu-screen");
  await expect(menu).toBeVisible();
  await menu.locator(".menu-identity input").fill("visual-test");
  await menu.getByRole("button", { name: /Create Private|Private Lobby erstellen/i }).click();
  await expect(page.locator(".lobby-screen")).toBeVisible({ timeout: 20_000 });
}

test.describe("visual snapshots", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
  });

  test("menu desktop snapshot", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator(".app")).toHaveScreenshot("menu-desktop.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.02
    });
  });

  test("menu mobile snapshot", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator(".app")).toHaveScreenshot("menu-mobile-390x844.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.02
    });
  });

  test("lobby mobile snapshot", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openPrivateLobby(page);
    await expect(page.locator(".game-scene")).toHaveScreenshot("lobby-mobile-390x844.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.03
    });
  });

  test("combat mobile snapshot (dev mock)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/?rb_mock=1&rb_phase=COMBAT");
    await expect(page.locator(".combat-screen")).toBeVisible();
    await expect(page.locator(".game-scene")).toHaveScreenshot("combat-mobile-390x844.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.03
    });
  });

  test("finished mobile snapshot (dev mock)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/?rb_mock=1&rb_phase=FINISHED");
    await expect(page.locator(".match-end-screen")).toBeVisible();
    await expect(page.locator(".game-scene")).toHaveScreenshot("finished-mobile-390x844.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.03
    });
  });
});

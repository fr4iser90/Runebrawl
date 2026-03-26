import { expect, test, type Page } from "@playwright/test";

type MockPhase = "LOBBY" | "HERO_SELECTION" | "TAVERN" | "POSITIONING" | "COMBAT" | "FINISHED";

interface ViewportCase {
  label: string;
  width: number;
  height: number;
}

const VIEWPORTS: ViewportCase[] = [
  { label: "1280x720", width: 1280, height: 720 },
  { label: "1366x768", width: 1366, height: 768 },
  { label: "1600x900", width: 1600, height: 900 },
  { label: "1920x1080", width: 1920, height: 1080 },
  { label: "2560x1440", width: 2560, height: 1440 },
  { label: "3440x1440", width: 3440, height: 1440 },
  { label: "1280x640", width: 1280, height: 640 },
  { label: "1180x560", width: 1180, height: 560 },
  { label: "1024x560", width: 1024, height: 560 }
];

async function assertNoViewportOverflow(page: Page): Promise<void> {
  const hasOverflow = await page.evaluate(() => {
    const html = document.documentElement;
    const body = document.body;
    const vertical = html.scrollHeight > window.innerHeight + 1 || body.scrollHeight > window.innerHeight + 1;
    const horizontal = html.scrollWidth > window.innerWidth + 1 || body.scrollWidth > window.innerWidth + 1;
    return vertical || horizontal;
  });
  expect(hasOverflow).toBeFalsy();
}

async function assertFullyInViewport(page: Page, selector: string): Promise<void> {
  const result = await page.evaluate((target) => {
    const el = document.querySelector<HTMLElement>(target);
    if (!el) return { exists: false };
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") {
      return { exists: true, hidden: true };
    }
    const r = el.getBoundingClientRect();
    return {
      exists: true,
      hidden: false,
      top: r.top,
      left: r.left,
      right: r.right,
      bottom: r.bottom,
      width: r.width,
      height: r.height,
      viewportW: window.innerWidth,
      viewportH: window.innerHeight,
      overflowY: el.scrollHeight - el.clientHeight,
      overflowX: el.scrollWidth - el.clientWidth
    };
  }, selector);

  expect(result.exists, `missing selector ${selector}`).toBeTruthy();
  if (!result.exists) return;
  if (result.hidden) return;

  expect(result.top, `${selector} top out of viewport`).toBeGreaterThanOrEqual(-1);
  expect(result.left, `${selector} left out of viewport`).toBeGreaterThanOrEqual(-1);
  expect(result.right, `${selector} right out of viewport`).toBeLessThanOrEqual((result.viewportW ?? 0) + 1);
  expect(result.bottom, `${selector} bottom out of viewport`).toBeLessThanOrEqual((result.viewportH ?? 0) + 1);
  expect(result.width, `${selector} has zero width`).toBeGreaterThan(0);
  expect(result.height, `${selector} has zero height`).toBeGreaterThan(0);
}

async function assertNoInternalOverflow(page: Page, selector: string): Promise<void> {
  const result = await page.evaluate((target) => {
    const el = document.querySelector<HTMLElement>(target);
    if (!el) return { exists: false };
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") {
      return { exists: true, hidden: true };
    }
    return {
      exists: true,
      hidden: false,
      overflowY: el.scrollHeight - el.clientHeight,
      overflowX: el.scrollWidth - el.clientWidth
    };
  }, selector);

  expect(result.exists, `missing selector ${selector}`).toBeTruthy();
  if (!result.exists || result.hidden) return;
  // 2px tolerance avoids false positives from fractional layout rounding.
  expect(result.overflowY, `${selector} has vertical clipping`).toBeLessThanOrEqual(2);
  expect(result.overflowX, `${selector} has horizontal clipping`).toBeLessThanOrEqual(2);
}

async function assertChildInside(page: Page, parentSelector: string, childSelector: string): Promise<void> {
  const result = await page.evaluate(
    ({ parent, child }) => {
      const parentEl = document.querySelector<HTMLElement>(parent);
      const childEl = document.querySelector<HTMLElement>(child);
      if (!parentEl || !childEl) return { exists: false };
      const p = parentEl.getBoundingClientRect();
      const c = childEl.getBoundingClientRect();
      return {
        exists: true,
        childTop: c.top,
        childBottom: c.bottom,
        parentTop: p.top,
        parentBottom: p.bottom
      };
    },
    { parent: parentSelector, child: childSelector }
  );
  expect(result.exists, `missing parent/child ${parentSelector} / ${childSelector}`).toBeTruthy();
  if (!result.exists) return;
  expect(result.childTop, `${childSelector} starts above ${parentSelector}`).toBeGreaterThanOrEqual((result.parentTop ?? 0) - 1);
  expect(result.childBottom, `${childSelector} exceeds ${parentSelector}`).toBeLessThanOrEqual((result.parentBottom ?? 0) + 1);
}

function mockUrl(phase: MockPhase): string {
  const shop = phase === "TAVERN" || phase === "POSITIONING" ? 12 : 3;
  const bench = phase === "TAVERN" || phase === "POSITIONING" ? 24 : 6;
  const board = phase === "TAVERN" || phase === "POSITIONING" ? 18 : 6;
  return `/?rb_mock=1&rb_phase=${phase}&rb_shop=${shop}&rb_bench=${bench}&rb_board=${board}`;
}

test.describe("layout responsiveness matrix", () => {
  const phases: MockPhase[] = ["LOBBY", "HERO_SELECTION", "TAVERN", "POSITIONING", "COMBAT", "FINISHED"];

  for (const phase of phases) {
    for (const vp of VIEWPORTS) {
      test(`${phase} fits viewport at ${vp.label}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(mockUrl(phase));
        await expect(page.locator(".game-scene")).toBeVisible();
        await assertNoViewportOverflow(page);

        if (phase === "TAVERN" || phase === "POSITIONING") {
          await assertFullyInViewport(page, ".game-shell-top");
          await assertFullyInViewport(page, ".game-shell-bottom");
          await assertFullyInViewport(page, ".game-shell-main");
          await assertFullyInViewport(page, ".tavern.tavern-bottom-only .shop-row");
          await assertFullyInViewport(page, ".board-zone");
          await assertFullyInViewport(page, ".bench-zone");
          await assertFullyInViewport(page, ".game-shell-right .sidebar");
          await assertNoInternalOverflow(page, ".game-shell-bottom");
          await assertNoInternalOverflow(page, ".tavern.tavern-bottom-only .shop-row");
          await assertNoInternalOverflow(page, ".bench-zone");
          await assertChildInside(page, ".bench-zone", ".bench-zone .bench-row");
        }

        if (phase === "COMBAT") {
          await assertFullyInViewport(page, ".combat-screen");
          await assertFullyInViewport(page, ".game-shell-right .sidebar");
        }

        if (phase === "HERO_SELECTION") {
          await assertFullyInViewport(page, ".hero-select-grid");
          await assertNoInternalOverflow(page, ".hero-select-grid");
        }
      });
    }
  }
});

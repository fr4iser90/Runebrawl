import { getGameContentManifest, getThemeOrDefault } from "@runebrawl/game-content";
import type { ThemeBackgroundAssets } from "@runebrawl/game-content";

const BG_KEYS: (keyof ThemeBackgroundAssets)[] = ["recruitment", "heroSelection", "lobby", "combat", "finished"];

const CSS_VAR_BY_ASSET: Record<keyof ThemeBackgroundAssets, string> = {
  recruitment: "--rb-scene-bg-recruitment",
  heroSelection: "--rb-scene-bg-hero-selection",
  lobby: "--rb-scene-bg-lobby",
  combat: "--rb-scene-bg-combat",
  finished: "--rb-scene-bg-finished"
};

function buildFilenameToUrl(): Record<string, string> {
  const modules = import.meta.glob<string>("../assets/backgrounds/*", {
    eager: true,
    query: "?url",
    import: "default"
  });
  const map: Record<string, string> = {};
  for (const [path, url] of Object.entries(modules)) {
    const base = path.split("/").pop();
    if (base) map[base] = url;
  }
  return map;
}

let cachedMap: Record<string, string> | null = null;

function filenameToUrl(): Record<string, string> {
  cachedMap ??= buildFilenameToUrl();
  return cachedMap;
}

function toCssUrl(href: string): string {
  return `url(${JSON.stringify(href)})`;
}

/**
 * Sets CSS variables on `:root` so `.scene-backdrop` layers use the themed image
 * (last background layer). Filenames come from `packages/game-content` manifest.
 */
export function applySceneTheme(themeKey?: string): void {
  const manifest = getGameContentManifest();
  const theme = getThemeOrDefault(themeKey);
  const defaultTheme = manifest.themes[manifest.defaultThemeKey];
  if (!defaultTheme) return;

  const urls = filenameToUrl();
  const root = document.documentElement;

  for (const key of BG_KEYS) {
    const fname = theme.assets[key];
    const fallbackName = defaultTheme.assets[key];
    const href = urls[fname] ?? urls[fallbackName];
    if (!href) continue;
    root.style.setProperty(CSS_VAR_BY_ASSET[key], toCssUrl(href));
  }
}

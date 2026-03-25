import manifest from "./manifest.json" with { type: "json" };
import type { ContentTheme, GameContentManifest } from "./types.js";

export type {
  ContentTheme,
  GameContentManifest,
  GamePhaseBackgroundKey,
  LocalizedLabel,
  ThemeBackgroundAssets
} from "./types.js";

const parsed = manifest as GameContentManifest;

export function getGameContentManifest(): GameContentManifest {
  return parsed;
}

export function getThemeOrDefault(themeKey?: string): ContentTheme {
  const key = themeKey?.trim() || parsed.defaultThemeKey;
  return parsed.themes[key] ?? parsed.themes[parsed.defaultThemeKey];
}

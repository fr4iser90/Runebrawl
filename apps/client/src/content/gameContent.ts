/**
 * Shared game content manifest (themes, background asset keys).
 * Server exposes the same payload at GET /content/manifest for hot-swap / tooling later.
 */
export { getGameContentManifest, getThemeOrDefault } from "@runebrawl/game-content";
export { applySceneTheme } from "./applySceneTheme";
export type {
  ContentTheme,
  GameContentManifest,
  GamePhaseBackgroundKey,
  ThemeBackgroundAssets
} from "@runebrawl/game-content";

export type GamePhaseBackgroundKey =
  | "recruitment"
  | "heroSelection"
  | "lobby"
  | "combat"
  | "finished";

export interface LocalizedLabel {
  en: string;
  de: string;
}

export interface ThemeBackgroundAssets {
  /** Filenames under `apps/client/src/assets/optimized/backgrounds/` */
  recruitment: string;
  heroSelection: string;
  lobby: string;
  combat: string;
  finished: string;
}

export interface ContentTheme {
  id: string;
  label: LocalizedLabel;
  /** Maps phase background slots to asset filenames (see ThemeBackgroundAssets). */
  assets: ThemeBackgroundAssets;
}

export interface GameContentManifest {
  id: string;
  version: string;
  defaultThemeKey: string;
  themes: Record<string, ContentTheme>;
}

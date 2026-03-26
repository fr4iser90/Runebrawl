import type { AbilityKey, GamePhase, HeroDefinition, SynergyKey, UnitDefinition, UnitInstance } from "@runebrawl/shared";

export type PhaseView = "SHOP" | "COMBAT" | "LOBBY" | "HERO_SELECT" | "FINISHED";
export type Side = "me" | "enemy";
export type SlotState = "empty" | "alive" | "dead";
export type BottomKind = "shop" | "combat";

export interface HudVm {
  phaseView: PhaseView;
  phaseLabel: string;
  round: number;
  gold: number;
  health: number;
  tavernTier: number;
  xp: number;
  secondsLeft: number;
}

export interface BattlefieldSlotVm {
  key: string;
  side: Side;
  slotIndex: number;
  state: SlotState;
  unit: UnitInstance | null;
  label: string;
  portraitSrc: string | null;
  backplateSrc: string | null;
  hpPct: number | null;
  damageText: string | null;
  highlightClass: string | null;
}

export interface BattlefieldVm {
  mode: "shop" | "combat";
  myLabel: string;
  enemyLabel: string | null;
  mySlots: BattlefieldSlotVm[];
  enemySlots: BattlefieldSlotVm[];
  targetLine: { source: string; target: string; isHit: boolean } | null;
  activeLine: string;
}

export interface PlayerRailVm {
  playerId: string;
  name: string;
  health: number;
  isMe: boolean;
  isBot: boolean;
  badgeClass: string;
  iconSrc: string;
}

export interface LogLineVm {
  line: string;
  hint?: string;
}

export interface RightRailVm {
  players: PlayerRailVm[];
  logLines: LogLineVm[];
  logCollapsedByDefault: boolean;
}

export interface BenchSlotVm {
  key: string;
  slotIndex: number;
  unit: UnitInstance | null;
  portraitSrc: string | null;
  backplateSrc: string | null;
  quickMeta: string;
}

export interface ShopOfferVm {
  key: string;
  shopIndex: number;
  unit: UnitDefinition | null;
  portraitSrc: string | null;
  backplateSrc: string | null;
  tierClass: string;
  roleIconSrc: string | null;
  abilityIconSrc: string | null;
  abilityLabel: string;
  abilityDescription: string;
  synergyKeys: SynergyKey[];
}

export interface HeroPowerVm {
  powerType: HeroDefinition["powerType"];
  powerKey: HeroDefinition["powerKey"];
  powerCost: number;
  iconSrc: string | null;
  label: string;
  description: string;
}

export interface HeroCardVm {
  hero: HeroDefinition;
  portraitSrc: string | null;
  backplateSrc: string | null;
  frameId: string;
  power: HeroPowerVm;
}

export interface ShopBottomVm {
  kind: "shop";
  bench: BenchSlotVm[];
  shop: ShopOfferVm[];
  heroOptions: HeroCardVm[];
}

export interface CombatBottomVm {
  kind: "combat";
  speed: "slow" | "normal" | "fast";
  paused: boolean;
  canSkip: boolean;
  autoCam: boolean;
}

export type BottomVm = ShopBottomVm | CombatBottomVm;

export interface CapabilitiesVm {
  canBuy: boolean;
  canReroll: boolean;
  canUpgrade: boolean;
  canLockShop: boolean;
  canReady: boolean;
  canUseHeroPower: boolean;
  canDragReposition: boolean;
}

export interface FrameDefaultsVm {
  unitDefaultFrameId: string;
  heroDefaultFrameId: string;
}

export interface GameViewModel {
  hud: HudVm;
  battlefield: BattlefieldVm;
  rightRail: RightRailVm;
  bottom: BottomVm;
  frames: FrameDefaultsVm;
  capabilities: CapabilitiesVm;
}

export function mapGamePhaseToPhaseView(phase: GamePhase): PhaseView {
  switch (phase) {
    case "LOBBY":
      return "LOBBY";
    case "HERO_SELECTION":
      return "HERO_SELECT";
    case "COMBAT":
    case "ROUND_END":
      return "COMBAT";
    case "FINISHED":
      return "FINISHED";
    case "TAVERN":
    case "POSITIONING":
    default:
      return "SHOP";
  }
}

export function defaultBottomKind(phase: GamePhase): BottomKind {
  return mapGamePhaseToPhaseView(phase) === "COMBAT" ? "combat" : "shop";
}

export function safeAbilityKey(ability: UnitDefinition["ability"] | UnitInstance["ability"]): AbilityKey {
  return ability;
}

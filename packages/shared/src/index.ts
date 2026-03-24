export type GamePhase = "LOBBY" | "HERO_SELECTION" | "TAVERN" | "POSITIONING" | "COMBAT" | "ROUND_END" | "FINISHED";

export type UnitRole = "Tank" | "Melee" | "Ranged" | "Support";
export type AbilityKey = "NONE" | "DEATH_BURST" | "TAUNT" | "BLOODLUST";
export type HeroPowerType = "PASSIVE" | "ACTIVE";
export type HeroPowerKey = "BONUS_GOLD" | "WAR_DRUM" | "RECRUITER" | "FORTIFY";

export interface HeroDefinition {
  id: string;
  name: string;
  description: string;
  powerType: HeroPowerType;
  powerKey: HeroPowerKey;
  powerCost: number;
}

export interface UnitDefinition {
  id: string;
  name: string;
  role: UnitRole;
  tier: number;
  attack: number;
  hp: number;
  speed: number;
  ability: AbilityKey;
}

export interface UnitInstance {
  instanceId: string;
  unitId: string;
  level: number;
  attack: number;
  hp: number;
  maxHp: number;
  speed: number;
  ability: AbilityKey;
  role: UnitRole;
  name: string;
}

export interface PlayerPublicState {
  playerId: string;
  name: string;
  health: number;
  gold: number;
  xp: number;
  tavernTier: number;
  lockedShop: boolean;
  ready: boolean;
  hero: HeroDefinition | null;
  heroSelected: boolean;
  heroPowerUsedThisTurn: boolean;
  heroOptions: HeroDefinition[];
  shop: (UnitDefinition | null)[];
  bench: (UnitInstance | null)[];
  board: (UnitInstance | null)[];
}

export interface MatchPublicState {
  matchId: string;
  sequence: number;
  maxPlayers: number;
  isPrivate: boolean;
  inviteCode?: string;
  creatorPlayerId?: string;
  round: number;
  phase: GamePhase;
  phaseEndsAt: number;
  players: PlayerPublicState[];
  yourPlayerId?: string;
  combatLog: string[];
  combatEvents: CombatReplayEvent[];
}

export interface CombatReplayEvent {
  round: number;
  duelId: string;
  aPlayerId: string;
  aPlayerName: string;
  bPlayerId: string;
  bPlayerName: string;
  type: "ATTACK" | "UNIT_DIED" | "ABILITY_TRIGGERED" | "DUEL_RESULT";
  sourceOwnerId?: "A" | "B";
  sourceSlotIndex?: number;
  sourceUnitName?: string;
  targetOwnerId?: "A" | "B";
  targetSlotIndex?: number;
  targetUnitName?: string;
  message: string;
}

export interface LobbySummary {
  matchId: string;
  phase: GamePhase;
  currentPlayers: number;
  maxPlayers: number;
  isPrivate: boolean;
  region: string;
  mmrBucket: string;
}

export interface MatchEvent {
  sequence: number;
  at: number;
  round: number;
  type: string;
  message: string;
}

export type ClientIntent =
  | { type: "JOIN_MATCH"; name: string; region?: string; mmr?: number } // Alias for QUICK_MATCH
  | { type: "QUICK_MATCH"; name: string; region?: string; mmr?: number }
  | { type: "JOIN_LOBBY"; name: string; matchId: string }
  | { type: "CREATE_PRIVATE_MATCH"; name: string; maxPlayers?: number; region?: string; mmr?: number }
  | { type: "JOIN_PRIVATE_MATCH"; name: string; inviteCode: string }
  | { type: "RECONNECT"; playerId: string; matchId?: string; name?: string }
  | { type: "READY_LOBBY"; ready: boolean }
  | { type: "ADD_BOT_TO_LOBBY" }
  | { type: "KICK_PLAYER"; targetPlayerId: string }
  | { type: "FORCE_START" }
  | { type: "SELECT_HERO"; heroId: string }
  | { type: "USE_HERO_POWER" }
  | { type: "BUY_UNIT"; shopIndex: number }
  | { type: "REROLL_SHOP" }
  | { type: "LOCK_SHOP"; locked: boolean }
  | { type: "UPGRADE_TAVERN" }
  | { type: "SELL_UNIT"; zone: "bench" | "board"; index: number }
  | { type: "MOVE_UNIT"; from: "bench" | "board"; fromIndex: number; to: "bench" | "board"; toIndex: number }
  | { type: "READY_FOR_COMBAT" };

export type ServerMessage =
  | { type: "CONNECTED"; playerId: string; matchId: string; inviteCode?: string }
  | { type: "LOBBY_LIST"; lobbies: LobbySummary[] }
  | { type: "MATCH_STATE"; state: MatchPublicState }
  | { type: "ERROR"; message: string };

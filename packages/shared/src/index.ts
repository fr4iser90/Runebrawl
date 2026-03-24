export type GamePhase = "TAVERN" | "POSITIONING" | "COMBAT" | "ROUND_END" | "FINISHED";

export type UnitRole = "Tank" | "Melee" | "Ranged" | "Support";
export type AbilityKey = "NONE" | "DEATH_BURST" | "TAUNT" | "BLOODLUST";

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
  shop: (UnitDefinition | null)[];
  bench: (UnitInstance | null)[];
  board: (UnitInstance | null)[];
}

export interface MatchPublicState {
  matchId: string;
  round: number;
  phase: GamePhase;
  phaseEndsAt: number;
  players: PlayerPublicState[];
  yourPlayerId?: string;
  combatLog: string[];
}

export type ClientIntent =
  | { type: "JOIN_MATCH"; name: string }
  | { type: "BUY_UNIT"; shopIndex: number }
  | { type: "REROLL_SHOP" }
  | { type: "LOCK_SHOP"; locked: boolean }
  | { type: "UPGRADE_TAVERN" }
  | { type: "SELL_UNIT"; zone: "bench" | "board"; index: number }
  | { type: "MOVE_UNIT"; from: "bench" | "board"; fromIndex: number; to: "bench" | "board"; toIndex: number }
  | { type: "READY_FOR_COMBAT" };

export type ServerMessage =
  | { type: "CONNECTED"; playerId: string }
  | { type: "MATCH_STATE"; state: MatchPublicState }
  | { type: "ERROR"; message: string };

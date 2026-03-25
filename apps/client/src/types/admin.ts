import type { HeroDefinition, UnitDefinition } from "@runebrawl/shared";

export interface AdminMetrics {
  totalMatches: number;
  activeMatches: number;
  finishedMatches: number;
  openPublicLobbies: number;
  openPrivateLobbies: number;
  connectedHumans: number;
  bots: number;
  averageFillMs: number;
  startedMatches: number;
  startReasons: Record<string, number>;
  unitBuys: Record<string, number>;
  unitBuyLabels: Record<string, string>;
  synergyTriggers: Record<string, number>;
}

export interface AdminContentSnapshot {
  units: UnitDefinition[];
  heroes: HeroDefinition[];
  version: number;
  updatedAt: number;
}

export interface AdminContentDraftResponse {
  hasDraft: boolean;
  snapshot: AdminContentSnapshot;
}

export interface AdminContentValidationResult {
  ok: boolean;
  errors: string[];
}

export interface AdminUnitPoolEntry {
  unitId: string;
  unitName: string;
  tier: number;
  initialCopies: number;
  availableCopies: number;
  inShop: number;
  onBoard: number;
  onBench: number;
  consumedCopies: number;
  availablePct: number;
}

export interface AdminUnitPoolSnapshot {
  matchId: string;
  phase: string;
  round: number;
  units: AdminUnitPoolEntry[];
}

export interface AdminLobbySnapshot {
  matchId: string;
  phase: string;
  sequence: number;
  round: number;
  region: string;
  mmrBucket: string;
  isPrivate: boolean;
  inviteCode?: string;
  creatorPlayerId?: string;
  currentPlayers: number;
  maxPlayers: number;
  connectedHumans: number;
  bots: number;
  readyPlayers: number;
  lobbyRemainingMs: number;
  createdAt: number;
}

export interface AdminLobbyDetail {
  matchId: string;
  phase: string;
  sequence: number;
  round: number;
  region: string;
  mmrBucket: string;
  isPrivate: boolean;
  inviteCode?: string;
  creatorPlayerId?: string;
  maxPlayers: number;
  players: Array<{
    playerId: string;
    name: string;
    isBot: boolean;
    connected: boolean;
    ready: boolean;
    eliminated: boolean;
    health: number;
    gold: number;
    tavernTier: number;
    xp: number;
    boardUnits: number;
    benchUnits: number;
  }>;
  recentEvents: Array<{
    sequence: number;
    at: number;
    round: number;
    type: string;
    message: string;
  }>;
}

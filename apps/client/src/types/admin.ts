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

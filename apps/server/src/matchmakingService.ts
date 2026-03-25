import type { ClientIntent, LobbySummary } from "@runebrawl/shared";
import { nanoid } from "nanoid";
import { BALANCE } from "./data/balance.js";
import { UNIT_POOL } from "./data/units.js";
import { MatchInstance } from "./matchInstance.js";

interface SocketLike {
  send: (data: string) => void;
}

export class MatchmakingService {
  private matches = new Map<string, MatchInstance>();
  private playerToMatch = new Map<string, string>();
  private quickLobbyIds = new Set<string>();
  private inviteCodeToMatch = new Map<string, string>();

  joinQuick(name: string, socket: SocketLike, region = "EU", mmr = 1000): string {
    const lobby = this.findOrCreateQuickLobby(region, mmr);
    const playerId = lobby.joinHuman(name, socket);
    this.playerToMatch.set(playerId, lobby.getMatchId());
    if (!lobby.isJoinable()) {
      this.quickLobbyIds.delete(lobby.getMatchId());
    }
    return playerId;
  }

  createPrivate(name: string, socket: SocketLike, maxPlayers?: number, region = "EU", mmr = 1000): string {
    const inviteCode = nanoid(6).toUpperCase();
    const lobby = new MatchInstance({
      maxPlayers: maxPlayers ?? 4,
      isPrivate: true,
      inviteCode,
      fillBotsOnStart: false,
      timeoutFillBotsStart: false,
      lobbyTimeoutMs: BALANCE.privateLobbyTimeoutMs,
      region,
      mmr
    });
    this.matches.set(lobby.getMatchId(), lobby);
    this.inviteCodeToMatch.set(inviteCode, lobby.getMatchId());
    const playerId = lobby.joinHuman(name, socket);
    this.playerToMatch.set(playerId, lobby.getMatchId());
    return playerId;
  }

  joinPrivate(name: string, inviteCode: string, socket: SocketLike): string {
    const matchId = this.inviteCodeToMatch.get(inviteCode.toUpperCase());
    if (!matchId) {
      throw new Error("Private lobby not found");
    }
    const match = this.matches.get(matchId);
    if (!match || !match.isJoinable()) {
      throw new Error("Private lobby is full or already started");
    }
    const playerId = match.joinHuman(name, socket);
    this.playerToMatch.set(playerId, matchId);
    return playerId;
  }

  joinLobby(name: string, matchId: string, socket: SocketLike): string {
    const match = this.matches.get(matchId);
    if (!match || !match.isJoinable() || match.isPrivateMatch()) {
      throw new Error("Lobby not joinable");
    }
    const playerId = match.joinHuman(name, socket);
    this.playerToMatch.set(playerId, matchId);
    if (!match.isJoinable()) this.quickLobbyIds.delete(matchId);
    return playerId;
  }

  reconnect(playerId: string, socket: SocketLike, name?: string, matchId?: string): boolean {
    const resolvedMatchId = matchId ?? this.playerToMatch.get(playerId);
    if (!resolvedMatchId) return false;
    const match = this.matches.get(resolvedMatchId);
    if (!match) return false;
    const ok = match.reconnect(playerId, socket, name);
    if (ok) this.playerToMatch.set(playerId, resolvedMatchId);
    return ok;
  }

  disconnect(playerId: string): void {
    const matchId = this.playerToMatch.get(playerId);
    if (!matchId) return;
    const match = this.matches.get(matchId);
    match?.disconnect(playerId);
  }

  handleIntent(playerId: string, intent: ClientIntent): void {
    const matchId = this.playerToMatch.get(playerId);
    if (!matchId) return;
    const match = this.matches.get(matchId);
    if (!match) return;
    match.handleIntent(playerId, intent);
  }

  getMatchHistory(matchId: string) {
    return this.matches.get(matchId)?.getMatchHistory() ?? null;
  }

  getReplayEvents(matchId: string, fromSequence = 0) {
    return this.matches.get(matchId)?.getReplayEvents(fromSequence) ?? [];
  }

  listOpenLobbies(): LobbySummary[] {
    const result: LobbySummary[] = [];
    for (const match of this.matches.values()) {
      const s = match.getSummary();
      if (s.phase === "LOBBY" && !s.isPrivate && s.currentPlayers < s.maxPlayers) {
        result.push(s);
      }
    }
    return result.sort((a, b) => a.currentPlayers - b.currentPlayers);
  }

  listAdminLobbies(filters?: {
    phase?: string;
    region?: string;
    visibility?: "public" | "private" | "all";
  }): Array<ReturnType<MatchInstance["getAdminSnapshot"]>> {
    const visibility = filters?.visibility ?? "all";
    const phase = filters?.phase;
    const region = filters?.region;

    return Array.from(this.matches.values())
      .map((m) => m.getAdminSnapshot())
      .filter((s) => {
        if (visibility === "public" && s.isPrivate) return false;
        if (visibility === "private" && !s.isPrivate) return false;
        if (phase && s.phase !== phase) return false;
        if (region && s.region.toUpperCase() !== region.toUpperCase()) return false;
        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  getAdminLobbyDetail(matchId: string, eventsLimit = 50) {
    const match = this.matches.get(matchId);
    if (!match) return null;
    return match.getAdminDetail(eventsLimit);
  }

  getAdminUnitPool(matchId: string) {
    const match = this.matches.get(matchId);
    if (!match) return null;
    return match.getUnitPoolSnapshot();
  }

  listAdminUnitPools() {
    return Array.from(this.matches.values()).map((match) => match.getUnitPoolSnapshot());
  }

  getTelemetryMetrics(): {
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
  } {
    const snapshots = this.listAdminLobbies();
    const lifecycles = Array.from(this.matches.values()).map((m) => m.getLifecycleStats());

    const totalMatches = snapshots.length;
    const finishedMatches = snapshots.filter((s) => s.phase === "FINISHED").length;
    const activeMatches = totalMatches - finishedMatches;
    const openPublicLobbies = snapshots.filter((s) => s.phase === "LOBBY" && !s.isPrivate).length;
    const openPrivateLobbies = snapshots.filter((s) => s.phase === "LOBBY" && s.isPrivate).length;
    const connectedHumans = snapshots.reduce((acc, s) => acc + s.connectedHumans, 0);
    const bots = snapshots.reduce((acc, s) => acc + s.bots, 0);

    const started = lifecycles.filter((l) => !!l.startedAt);
    const fillDurations = started.map((l) => (l.startedAt as number) - l.createdAt);
    const averageFillMs =
      fillDurations.length > 0
        ? Math.round(fillDurations.reduce((a, b) => a + b, 0) / fillDurations.length)
        : 0;

    const startReasons: Record<string, number> = {
      force: 0,
      full: 0,
      all_ready: 0,
      timeout: 0
    };
    for (const l of started) {
      if (l.startReason) startReasons[l.startReason] = (startReasons[l.startReason] ?? 0) + 1;
    }
    const unitBuys: Record<string, number> = {};
    const synergyTriggers: Record<string, number> = {};
    for (const match of this.matches.values()) {
      const telemetry = match.getBalanceTelemetry();
      for (const [unitId, count] of Object.entries(telemetry.unitBuys)) {
        unitBuys[unitId] = (unitBuys[unitId] ?? 0) + count;
      }
      for (const [synergyKey, count] of Object.entries(telemetry.synergyTriggers)) {
        synergyTriggers[synergyKey] = (synergyTriggers[synergyKey] ?? 0) + count;
      }
    }
    const unitBuyLabels: Record<string, string> = {};
    for (const unit of UNIT_POOL) {
      unitBuyLabels[unit.id] = unit.name;
    }

    return {
      totalMatches,
      activeMatches,
      finishedMatches,
      openPublicLobbies,
      openPrivateLobbies,
      connectedHumans,
      bots,
      averageFillMs,
      startedMatches: started.length,
      startReasons,
      unitBuys,
      unitBuyLabels,
      synergyTriggers
    };
  }

  private findOrCreateQuickLobby(region: string, mmr: number): MatchInstance {
    const bucket = mmr < 900 ? "low" : mmr < 1300 ? "mid" : "high";
    for (const matchId of this.quickLobbyIds) {
      const match = this.matches.get(matchId);
      if (match && match.isJoinable() && match.getRegion() === region && match.getMmrBucket() === bucket) {
        return match;
      }
      this.quickLobbyIds.delete(matchId);
    }
    const lobby = new MatchInstance({
      maxPlayers: BALANCE.maxPlayers,
      isPrivate: false,
      fillBotsOnStart: true,
      timeoutFillBotsStart: BALANCE.quickStartOnTimeoutFillBots,
      lobbyTimeoutMs: BALANCE.quickLobbyTimeoutMs,
      region,
      mmr
    });
    this.matches.set(lobby.getMatchId(), lobby);
    this.quickLobbyIds.add(lobby.getMatchId());
    return lobby;
  }
}

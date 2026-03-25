import type {
  ClientIntent,
  CombatReplayEvent,
  GamePhase,
  HeroDefinition,
  LobbySummary,
  MatchEvent,
  MatchPublicState,
  PlayerPublicState,
  ServerMessage,
  UnitDefinition,
  UnitInstance
} from "@runebrawl/shared";
import { nanoid } from "nanoid";
import { BALANCE } from "./data/balance.js";
import { findHeroById, randomHeroOptions } from "./data/heroes.js";
import { unitsForTier } from "./data/units.js";
import { simulateCombat } from "./engine/combat.js";
import { SeededRng } from "./engine/rng.js";
import { applyEffect } from "./rules/effectRegistry.js";

interface SocketLike {
  send: (data: string) => void;
}

interface PlayerInternal {
  playerId: string;
  name: string;
  isBot: boolean;
  socket?: SocketLike;
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
  eliminated: boolean;
}

interface MatchInternal {
  matchId: string;
  sequence: number;
  maxPlayers: number;
  isPrivate: boolean;
  inviteCode?: string;
  creatorPlayerId?: string;
  round: number;
  phase: GamePhase;
  phaseEndsAt: number;
  lobbyEndsAt: number;
  forceStart: boolean;
  timeoutFillBotsStart: boolean;
  players: PlayerInternal[];
  combatLog: string[];
  combatEvents: CombatReplayEvent[];
  events: MatchEvent[];
  seed: number;
  fillBotsOnStart: boolean;
  region: string;
  mmrBucket: string;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  startReason?: "force" | "full" | "all_ready" | "timeout";
}

interface MatchOptions {
  maxPlayers: number;
  isPrivate: boolean;
  inviteCode?: string;
  creatorPlayerId?: string;
  lobbyTimeoutMs?: number;
  fillBotsOnStart?: boolean;
  timeoutFillBotsStart?: boolean;
  region?: string;
  mmr?: number;
}

function now(): number {
  return Date.now();
}

function mmrBucket(mmr: number): string {
  if (mmr < 900) return "low";
  if (mmr < 1300) return "mid";
  return "high";
}

function firstEmpty<T>(arr: (T | null)[]): number {
  return arr.findIndex((v) => v === null);
}

function cloneUnitFromDef(def: UnitDefinition): UnitInstance {
  return {
    instanceId: nanoid(12),
    unitId: def.id,
    name: def.name,
    role: def.role,
    level: 1,
    attack: def.attack,
    hp: def.hp,
    maxHp: def.hp,
    speed: def.speed,
    ability: def.ability
  };
}

function playerPublicState(p: PlayerInternal): PlayerPublicState {
  return {
    playerId: p.playerId,
    name: p.name,
    health: p.health,
    gold: p.gold,
    xp: p.xp,
    tavernTier: p.tavernTier,
    lockedShop: p.lockedShop,
    ready: p.ready,
    hero: p.hero,
    heroSelected: p.heroSelected,
    heroPowerUsedThisTurn: p.heroPowerUsedThisTurn,
    heroOptions: p.heroOptions,
    shop: p.shop,
    bench: p.bench,
    board: p.board
  };
}

export class MatchInstance {
  private match: MatchInternal;
  private tickTimer: NodeJS.Timeout;

  constructor(options: MatchOptions) {
    const boundedMaxPlayers = Math.max(2, Math.min(BALANCE.maxPlayers, options.maxPlayers));
    this.match = {
      matchId: nanoid(10),
      sequence: 0,
      maxPlayers: boundedMaxPlayers,
      isPrivate: options.isPrivate,
      inviteCode: options.inviteCode,
      creatorPlayerId: options.creatorPlayerId,
      round: 0,
      phase: "LOBBY",
      phaseEndsAt: now() + (options.lobbyTimeoutMs ?? 30_000),
      lobbyEndsAt: now() + (options.lobbyTimeoutMs ?? 30_000),
      forceStart: false,
      timeoutFillBotsStart: options.timeoutFillBotsStart ?? false,
      players: [],
      combatLog: ["Lobby open."],
      combatEvents: [],
      events: [],
      seed: Math.floor(Math.random() * 100000),
      fillBotsOnStart: options.fillBotsOnStart ?? false
      ,
      region: options.region ?? "EU",
      mmrBucket: mmrBucket(options.mmr ?? 1000),
      createdAt: now()
    };
    this.tickTimer = setInterval(() => this.tick(), 1000);
  }

  getMatchId(): string {
    return this.match.matchId;
  }

  getInviteCode(): string | undefined {
    return this.match.inviteCode;
  }

  isPrivateMatch(): boolean {
    return this.match.isPrivate;
  }

  isJoinable(): boolean {
    if (this.match.phase !== "LOBBY") return false;
    return this.match.players.filter((p) => !p.eliminated).length < this.match.maxPlayers;
  }

  getSummary(): LobbySummary {
    return {
      matchId: this.match.matchId,
      phase: this.match.phase,
      currentPlayers: this.match.players.filter((p) => !p.eliminated).length,
      maxPlayers: this.match.maxPlayers,
      isPrivate: this.match.isPrivate,
      region: this.match.region,
      mmrBucket: this.match.mmrBucket
    };
  }

  getRegion(): string {
    return this.match.region;
  }

  getMmrBucket(): string {
    return this.match.mmrBucket;
  }

  isFinished(): boolean {
    return this.match.phase === "FINISHED";
  }

  getAdminSnapshot(): {
    matchId: string;
    phase: GamePhase;
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
    startedAt?: number;
    finishedAt?: number;
    startReason?: "force" | "full" | "all_ready" | "timeout";
  } {
    const activePlayers = this.match.players.filter((p) => !p.eliminated);
    return {
      matchId: this.match.matchId,
      phase: this.match.phase,
      sequence: this.match.sequence,
      round: this.match.round,
      region: this.match.region,
      mmrBucket: this.match.mmrBucket,
      isPrivate: this.match.isPrivate,
      inviteCode: this.match.inviteCode,
      creatorPlayerId: this.match.creatorPlayerId,
      currentPlayers: activePlayers.length,
      maxPlayers: this.match.maxPlayers,
      connectedHumans: activePlayers.filter((p) => !p.isBot && !!p.socket).length,
      bots: activePlayers.filter((p) => p.isBot).length,
      readyPlayers: activePlayers.filter((p) => p.ready).length,
      lobbyRemainingMs: this.match.phase === "LOBBY" ? Math.max(0, this.match.lobbyEndsAt - now()) : 0,
      createdAt: this.match.createdAt,
      startedAt: this.match.startedAt,
      finishedAt: this.match.finishedAt,
      startReason: this.match.startReason
    };
  }

  getAdminDetail(limitEvents = 50): {
    matchId: string;
    phase: GamePhase;
    sequence: number;
    round: number;
    region: string;
    mmrBucket: string;
    isPrivate: boolean;
    inviteCode?: string;
    creatorPlayerId?: string;
    maxPlayers: number;
    createdAt: number;
    startedAt?: number;
    finishedAt?: number;
    startReason?: "force" | "full" | "all_ready" | "timeout";
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
    recentEvents: MatchEvent[];
  } {
    const recentEvents = this.match.events.slice(-Math.max(1, limitEvents));
    return {
      matchId: this.match.matchId,
      phase: this.match.phase,
      sequence: this.match.sequence,
      round: this.match.round,
      region: this.match.region,
      mmrBucket: this.match.mmrBucket,
      isPrivate: this.match.isPrivate,
      inviteCode: this.match.inviteCode,
      creatorPlayerId: this.match.creatorPlayerId,
      maxPlayers: this.match.maxPlayers,
      createdAt: this.match.createdAt,
      startedAt: this.match.startedAt,
      finishedAt: this.match.finishedAt,
      startReason: this.match.startReason,
      players: this.match.players.map((p) => ({
        playerId: p.playerId,
        name: p.name,
        isBot: p.isBot,
        connected: !!p.socket,
        ready: p.ready,
        eliminated: p.eliminated,
        health: p.health,
        gold: p.gold,
        tavernTier: p.tavernTier,
        xp: p.xp,
        boardUnits: p.board.filter((u) => !!u).length,
        benchUnits: p.bench.filter((u) => !!u).length
      })),
      recentEvents
    };
  }

  getLifecycleStats(): {
    createdAt: number;
    startedAt?: number;
    finishedAt?: number;
    startReason?: "force" | "full" | "all_ready" | "timeout";
    phase: GamePhase;
  } {
    return {
      createdAt: this.match.createdAt,
      startedAt: this.match.startedAt,
      finishedAt: this.match.finishedAt,
      startReason: this.match.startReason,
      phase: this.match.phase
    };
  }

  joinHuman(name: string, socket: SocketLike): string {
    if (!this.isJoinable()) {
      throw new Error("Match is full or already started");
    }
    const playerId = nanoid(10);
    const player: PlayerInternal = {
      playerId,
      name: name.trim() || `Player-${playerId.slice(0, 4)}`,
      isBot: false,
      socket,
      health: BALANCE.startingHealth,
      gold: 0,
      xp: 0,
      tavernTier: 1,
      lockedShop: false,
      ready: false,
      hero: null,
      heroSelected: false,
      heroPowerUsedThisTurn: false,
      heroOptions: [],
      shop: Array.from({ length: BALANCE.shopSlots }, () => null),
      bench: Array.from({ length: BALANCE.benchSlots }, () => null),
      board: Array.from({ length: BALANCE.boardSlots }, () => null),
      eliminated: false
    };
    this.match.players.push(player);
    if (!this.match.creatorPlayerId) {
      this.match.creatorPlayerId = playerId;
    }
    this.bumpSequence("PLAYER_JOINED", `${player.name} joined the lobby.`);
    this.send(socket, {
      type: "CONNECTED",
      playerId,
      matchId: this.match.matchId,
      inviteCode: this.match.inviteCode
    });
    this.broadcast();
    return playerId;
  }

  reconnect(playerId: string, socket: SocketLike, name?: string): boolean {
    const player = this.match.players.find((p) => p.playerId === playerId);
    if (!player || player.eliminated) return false;

    player.socket = socket;
    player.isBot = false;
    if (name?.trim()) player.name = name.trim();
    if (player.name.endsWith(" (Bot)")) {
      player.name = player.name.slice(0, -6);
    }
    this.send(socket, {
      type: "CONNECTED",
      playerId,
      matchId: this.match.matchId,
      inviteCode: this.match.inviteCode
    });
    this.bumpSequence("PLAYER_RECONNECTED", `${player.name} reconnected.`);
    this.broadcast();
    return true;
  }

  disconnect(playerId: string): void {
    const player = this.match.players.find((p) => p.playerId === playerId);
    if (!player) return;
    player.socket = undefined;
    if (!player.isBot) {
      player.isBot = true;
      player.name = `${player.name} (Bot)`;
      this.bumpSequence("PLAYER_DISCONNECTED", `${player.name} disconnected.`);
      this.broadcast();
    }
  }

  addBot(requestedByPlayerId: string): boolean {
    if (this.match.phase !== "LOBBY") return false;
    if (this.match.creatorPlayerId !== requestedByPlayerId) return false;
    if (!this.isJoinable()) return false;
    const id = nanoid(10);
    this.match.players.push({
      playerId: id,
      name: `Bot-${id.slice(0, 4)}`,
      isBot: true,
      health: BALANCE.startingHealth,
      gold: 0,
      xp: 0,
      tavernTier: 1,
      lockedShop: false,
      ready: true,
      hero: null,
      heroSelected: false,
      heroPowerUsedThisTurn: false,
      heroOptions: [],
      shop: Array.from({ length: BALANCE.shopSlots }, () => null),
      bench: Array.from({ length: BALANCE.benchSlots }, () => null),
      board: Array.from({ length: BALANCE.boardSlots }, () => null),
      eliminated: false
    });
    this.bumpSequence("BOT_ADDED", `Bot added by lobby admin.`);
    this.broadcast();
    return true;
  }

  forceStart(requestedByPlayerId: string): boolean {
    if (!this.match.isPrivate) return false;
    if (this.match.creatorPlayerId !== requestedByPlayerId) return false;
    if (this.match.phase !== "LOBBY") return false;
    this.match.forceStart = true;
    this.bumpSequence("LOBBY_FORCE_START", "Lobby force-start requested.");
    this.broadcast();
    return true;
  }

  handleIntent(playerId: string, intent: ClientIntent): void {
    const player = this.match.players.find((p) => p.playerId === playerId && !p.eliminated);
    if (!player) return;

    if (intent.type === "READY_LOBBY") {
      if (this.match.phase === "LOBBY") {
        player.ready = intent.ready;
        this.bumpSequence("LOBBY_READY", `${player.name} is ${intent.ready ? "ready" : "not ready"}.`);
        this.broadcast();
      }
      return;
    }
    if (intent.type === "SELECT_HERO") {
      this.selectHero(player, intent.heroId);
      return;
    }
    if (intent.type === "USE_HERO_POWER") {
      this.useHeroPower(player);
      return;
    }
    if (intent.type === "ADD_BOT_TO_LOBBY") {
      this.addBot(playerId);
      return;
    }
    if (intent.type === "KICK_PLAYER") {
      this.kickPlayer(playerId, intent.targetPlayerId);
      return;
    }
    if (intent.type === "FORCE_START") {
      this.forceStart(playerId);
      return;
    }

    if (this.match.phase === "LOBBY" || this.match.phase === "FINISHED") return;
    if (this.match.phase === "HERO_SELECTION") return;

    let actionLabel: string | null = null;
    switch (intent.type) {
      case "BUY_UNIT":
        this.buyUnit(player, intent.shopIndex);
        actionLabel = `${player.name} bought from shop slot ${intent.shopIndex + 1}.`;
        break;
      case "REROLL_SHOP":
        this.reroll(player);
        actionLabel = `${player.name} rerolled the shop.`;
        break;
      case "LOCK_SHOP":
        if (this.match.phase === "TAVERN" || this.match.phase === "POSITIONING") {
          player.lockedShop = intent.locked;
          actionLabel = `${player.name} ${intent.locked ? "locked" : "unlocked"} the shop.`;
        }
        break;
      case "UPGRADE_TAVERN":
        this.upgradeTavern(player);
        actionLabel = `${player.name} tried to upgrade tavern tier.`;
        break;
      case "SELL_UNIT":
        this.sellUnit(player, intent.zone, intent.index);
        actionLabel = `${player.name} sold a unit from ${intent.zone} slot ${intent.index + 1}.`;
        break;
      case "MOVE_UNIT":
        this.moveUnit(player, intent.from, intent.fromIndex, intent.to, intent.toIndex);
        actionLabel = `${player.name} moved ${intent.from}[${intent.fromIndex + 1}] -> ${intent.to}[${intent.toIndex + 1}].`;
        break;
      case "READY_FOR_COMBAT":
        if (this.match.phase === "TAVERN" || this.match.phase === "POSITIONING") {
          player.ready = true;
          actionLabel = `${player.name} is ready.`;
        }
        break;
      default:
        break;
    }
    if (actionLabel) this.bumpSequence("INTENT_APPLIED", actionLabel);
    this.broadcast();
  }

  getMatchHistory():
    | {
        matchId: string;
        round: number;
        phase: GamePhase;
        sequence: number;
        players: Array<{ playerId: string; name: string; health: number; eliminated: boolean }>;
      }
    | null {
    if (!this.match) return null;
    return {
      matchId: this.match.matchId,
      round: this.match.round,
      phase: this.match.phase,
      sequence: this.match.sequence,
      players: this.match.players.map((p) => ({
        playerId: p.playerId,
        name: p.name,
        health: p.health,
        eliminated: p.eliminated
      }))
    };
  }

  getReplayEvents(fromSequence = 0): MatchEvent[] {
    return this.match.events.filter((event) => event.sequence >= fromSequence);
  }

  private send(socket: SocketLike, message: ServerMessage): void {
    socket.send(JSON.stringify(message));
  }

  private bumpSequence(type: string, message: string): void {
    this.match.sequence += 1;
    const event: MatchEvent = {
      sequence: this.match.sequence,
      at: now(),
      round: this.match.round,
      type,
      message
    };
    this.match.events.push(event);
    if (this.match.events.length > 2000) {
      this.match.events = this.match.events.slice(-2000);
    }
  }

  private broadcast(): void {
    const stateBase: Omit<MatchPublicState, "yourPlayerId"> = {
      matchId: this.match.matchId,
      sequence: this.match.sequence,
      maxPlayers: this.match.maxPlayers,
      isPrivate: this.match.isPrivate,
      inviteCode: this.match.inviteCode,
      creatorPlayerId: this.match.creatorPlayerId,
      round: this.match.round,
      phase: this.match.phase,
      phaseEndsAt: this.match.phaseEndsAt,
      players: this.match.players.map(playerPublicState),
      combatLog: this.match.combatLog.slice(-80),
      combatEvents: this.match.combatEvents.slice(-200)
    };
    for (const p of this.match.players) {
      if (!p.socket) continue;
      this.send(p.socket, { type: "MATCH_STATE", state: { ...stateBase, yourPlayerId: p.playerId } });
    }
  }

  private tick(): void {
    const alive = this.match.players.filter((p) => !p.eliminated);
    if (alive.length === 0) return;

    if (this.match.phase === "LOBBY") {
      let reason: "force" | "full" | "all_ready" | "timeout" | null = null;
      if (this.match.isPrivate) {
        // Private lobbies start ONLY when leader triggered force start and all players are ready.
        if (this.match.forceStart && alive.length >= 2 && alive.every((p) => p.ready)) {
          reason = "force";
        }
      } else {
        // Quick lobbies start when full, or optionally on timeout by filling bots.
        if (alive.length >= this.match.maxPlayers) {
          reason = "full";
        } else if (this.match.timeoutFillBotsStart && alive.length >= 1 && now() >= this.match.lobbyEndsAt) {
          reason = "timeout";
        }
      }
      if (reason) {
        this.startMatch(reason);
      }
      return;
    }

    if (this.match.phase === "HERO_SELECTION") {
      if (this.allHeroesSelected() || now() >= this.match.phaseEndsAt) {
        this.ensureHeroSelections();
        this.startTavernPhase();
      }
      return;
    }

    if (alive.length === 1 && this.match.round > 0 && this.match.phase !== "FINISHED") {
      this.match.phase = "FINISHED";
      this.match.phaseEndsAt = now() + 999999999;
      this.match.finishedAt = now();
      this.match.combatLog.push(`${alive[0].name} wins the match.`);
      this.bumpSequence("MATCH_FINISHED", `${alive[0].name} wins the match.`);
      this.broadcast();
      return;
    }

    if (this.match.phase === "ROUND_END" && now() >= this.match.phaseEndsAt) {
      this.startTavernPhase();
      return;
    }

    if (
      (this.match.phase === "TAVERN" || this.match.phase === "POSITIONING") &&
      (now() >= this.match.phaseEndsAt || this.allReady())
    ) {
      this.startCombatPhase();
    }
  }

  private startMatch(reason: "force" | "full" | "all_ready" | "timeout"): void {
    if (this.match.fillBotsOnStart) {
      this.ensureBots();
    }
    if (this.match.players.filter((p) => !p.eliminated).length < 2) return;
    if (!this.match.startedAt) {
      this.match.startedAt = now();
      this.match.startReason = reason;
    }
    this.bumpSequence("MATCH_STARTED", `Match started from lobby (${reason}).`);
    this.startHeroSelectionPhase();
  }

  private allReady(): boolean {
    const alive = this.match.players.filter((p) => !p.eliminated);
    return alive.length > 0 && alive.every((p) => p.ready);
  }

  private ensureBots(): void {
    while (this.match.players.length < this.match.maxPlayers) {
      const id = nanoid(10);
      this.match.players.push({
        playerId: id,
        name: `Bot-${id.slice(0, 4)}`,
        isBot: true,
        health: BALANCE.startingHealth,
        gold: 0,
        xp: 0,
        tavernTier: 1,
        lockedShop: false,
        ready: true,
        hero: null,
        heroSelected: false,
        heroPowerUsedThisTurn: false,
        heroOptions: [],
        shop: Array.from({ length: BALANCE.shopSlots }, () => null),
        bench: Array.from({ length: BALANCE.benchSlots }, () => null),
        board: Array.from({ length: BALANCE.boardSlots }, () => null),
        eliminated: false
      });
    }
  }

  private kickPlayer(requestedByPlayerId: string, targetPlayerId: string): boolean {
    if (this.match.phase !== "LOBBY") return false;
    if (this.match.creatorPlayerId !== requestedByPlayerId) return false;
    if (requestedByPlayerId === targetPlayerId) return false;

    const idx = this.match.players.findIndex((p) => p.playerId === targetPlayerId);
    if (idx < 0) return false;
    const target = this.match.players[idx];
    if (target.socket) {
      this.send(target.socket, { type: "ERROR", message: "You were removed from the lobby by admin." });
    }
    this.match.players.splice(idx, 1);
    this.bumpSequence("PLAYER_KICKED", `${target.name} was removed from lobby.`);
    this.broadcast();
    return true;
  }

  private startTavernPhase(): void {
    this.match.round += 1;
    this.match.phase = "TAVERN";
    this.match.phaseEndsAt = now() + BALANCE.tavernPhaseMs;
    this.match.combatLog = [`Round ${this.match.round} started.`];
    this.match.combatEvents = [];
    this.bumpSequence("ROUND_STARTED", `Round ${this.match.round} started.`);

    for (const p of this.match.players) {
      if (p.eliminated) continue;
      p.ready = false;
      p.heroPowerUsedThisTurn = false;
      p.gold = Math.min(BALANCE.maxGold, BALANCE.baseGoldPerRound + this.match.round);
      this.applyPassiveHeroPower(p);
      p.xp += 1;
      if (!p.lockedShop) {
        p.shop = this.rollShop(p.tavernTier, this.match.seed + this.match.round + p.gold);
      }
      this.resetBoardHealth(p);
    }
    this.runBots();
    this.broadcast();
  }

  private runBots(): void {
    for (const p of this.match.players) {
      if (p.eliminated || !p.isBot) continue;
      let loops = 20;
      while (loops > 0) {
        loops -= 1;
        if (p.gold >= BALANCE.buyCost) {
          const buyable = p.shop.findIndex((u) => !!u);
          if (buyable >= 0) {
            this.buyUnit(p, buyable);
          } else if (p.gold >= BALANCE.rerollCost) {
            this.reroll(p);
          } else {
            break;
          }
        } else {
          break;
        }
      }
      this.autoPlaceBoard(p);
      p.ready = true;
    }
  }

  private startHeroSelectionPhase(): void {
    this.match.phase = "HERO_SELECTION";
    this.match.phaseEndsAt = now() + BALANCE.heroSelectionMs;
    this.match.combatLog = ["Hero selection started."];
    this.bumpSequence("HERO_SELECTION_STARTED", "Hero selection phase started.");

    for (const p of this.match.players) {
      if (p.eliminated) continue;
      p.ready = false;
      p.hero = null;
      p.heroSelected = false;
      p.heroPowerUsedThisTurn = false;
      p.heroOptions = randomHeroOptions(this.match.seed + this.match.sequence + p.playerId.length, 3);
    }

    // Bots auto-pick instantly to keep flow smooth.
    for (const p of this.match.players) {
      if (!p.isBot || p.eliminated) continue;
      if (p.heroOptions.length > 0) {
        this.selectHero(p, p.heroOptions[0].id, true);
      }
    }

    this.broadcast();
  }

  private allHeroesSelected(): boolean {
    const alive = this.match.players.filter((p) => !p.eliminated);
    return alive.length > 0 && alive.every((p) => p.heroSelected);
  }

  private ensureHeroSelections(): void {
    for (const p of this.match.players) {
      if (p.eliminated || p.heroSelected) continue;
      if (p.heroOptions.length === 0) {
        p.heroOptions = randomHeroOptions(this.match.seed + this.match.sequence + p.playerId.length + 5, 3);
      }
      if (p.heroOptions.length > 0) {
        this.selectHero(p, p.heroOptions[0].id, true);
      }
    }
  }

  private selectHero(player: PlayerInternal, heroId: string, silent = false): void {
    if (this.match.phase !== "HERO_SELECTION" || player.eliminated) return;
    if (player.heroSelected) return;
    const fromOptions = player.heroOptions.find((h) => h.id === heroId);
    const chosen = fromOptions ?? findHeroById(heroId);
    if (!chosen) return;
    player.hero = chosen;
    player.heroSelected = true;
    if (!silent) {
      this.bumpSequence("HERO_SELECTED", `${player.name} selected ${chosen.name}.`);
      this.broadcast();
    }
  }

  private applyPassiveHeroPower(player: PlayerInternal): void {
    if (!player.hero) return;
    if (player.hero.powerType !== "PASSIVE") return;
    if (player.hero.powerKey === "BONUS_GOLD") {
      applyEffect(
        "GAIN_GOLD",
        { type: "ROUND_START", round: this.match.round, playerId: player.playerId },
        { player, maxGold: BALANCE.maxGold },
        { amount: 1 }
      );
    }
  }

  private useHeroPower(player: PlayerInternal): void {
    if (player.eliminated) return;
    if (this.match.phase !== "TAVERN" && this.match.phase !== "POSITIONING") return;
    if (!player.hero || player.hero.powerType !== "ACTIVE") return;
    if (player.heroPowerUsedThisTurn) return;
    if (player.gold < player.hero.powerCost) return;

    const rng = new SeededRng(this.match.seed + this.match.sequence + this.match.round + player.playerId.length);
    const friendlyUnits = [...player.board, ...player.bench].filter((u): u is UnitInstance => !!u);

    let applied = false;
    if (player.hero.powerKey === "WAR_DRUM") {
      if (friendlyUnits.length > 0) {
        const target = friendlyUnits[rng.int(friendlyUnits.length)];
        target.attack += 1;
        target.hp += 1;
        target.maxHp += 1;
        applied = true;
      }
    } else if (player.hero.powerKey === "RECRUITER") {
      const benchIndex = firstEmpty(player.bench);
      if (benchIndex >= 0) {
        const pool = unitsForTier(player.tavernTier);
        if (pool.length > 0) {
          const def = pool[rng.int(pool.length)];
          player.bench[benchIndex] = cloneUnitFromDef(def);
          applied = true;
        }
      }
    } else if (player.hero.powerKey === "FORTIFY") {
      if (friendlyUnits.length > 0) {
        const target = friendlyUnits[rng.int(friendlyUnits.length)];
        target.hp += 2;
        target.maxHp += 2;
        applied = true;
      }
    }

    if (!applied) return;
    player.gold -= player.hero.powerCost;
    player.heroPowerUsedThisTurn = true;
    this.bumpSequence("HERO_POWER_USED", `${player.name} used hero power (${player.hero.name}).`);
    this.broadcast();
  }

  private startCombatPhase(): void {
    this.match.phase = "COMBAT";
    this.match.combatLog = [`Combat starts for round ${this.match.round}.`];
    this.match.combatEvents = [];
    this.bumpSequence("COMBAT_STARTED", `Combat started for round ${this.match.round}.`);

    const alive = this.match.players.filter((p) => !p.eliminated);
    const rng = new SeededRng(this.match.seed + this.match.round * 173);
    const shuffled = [...alive].sort(() => rng.next() - 0.5);
    const pairs: Array<[PlayerInternal, PlayerInternal | null]> = [];
    for (let i = 0; i < shuffled.length; i += 2) {
      pairs.push([shuffled[i], shuffled[i + 1] ?? null]);
    }

    for (const [a, b] of pairs) {
      if (!b) {
        this.match.combatLog.push(`${a.name} has no opponent and takes no damage.`);
        continue;
      }
      this.resolveFight(a, b, rng);
    }

    for (const p of this.match.players) {
      if (p.health <= 0) p.eliminated = true;
    }

    this.match.phase = "ROUND_END";
    this.match.phaseEndsAt = now() + BALANCE.roundEndMs;
    this.bumpSequence("ROUND_ENDED", `Round ${this.match.round} ended.`);
    this.broadcast();
  }

  private resolveFight(a: PlayerInternal, b: PlayerInternal, rng: SeededRng): void {
    const boardA = a.board.filter((u): u is UnitInstance => !!u).map((u) => ({ ...u, hp: u.maxHp }));
    const boardB = b.board.filter((u): u is UnitInstance => !!u).map((u) => ({ ...u, hp: u.maxHp }));
    const result = simulateCombat(boardA, boardB, Math.floor(rng.next() * 1000000));
    const duelId = `${a.playerId}:${b.playerId}:${this.match.round}`;

    this.match.combatLog.push(`${a.name} vs ${b.name}: ${result.winner}`);
    for (const line of result.log.slice(0, 12)) this.match.combatLog.push(line);
    if (result.log.length > 12) this.match.combatLog.push("... (combat log truncated)");
    for (const event of result.events) {
      this.match.combatEvents.push({
        round: this.match.round,
        duelId,
        aPlayerId: a.playerId,
        aPlayerName: a.name,
        bPlayerId: b.playerId,
        bPlayerName: b.name,
        type: event.type,
        sourceOwnerId: event.sourceOwnerId,
        sourceSlotIndex: event.sourceSlotIndex,
        sourceUnitName: event.sourceUnitName,
        targetOwnerId: event.targetOwnerId,
        targetSlotIndex: event.targetSlotIndex,
        targetUnitName: event.targetUnitName,
        abilityKey: event.abilityKey,
        message: event.message
      });
    }

    if (result.winner === "A") {
      const damage = Math.max(1, result.survivorsA + a.tavernTier);
      b.health -= damage;
      this.match.combatLog.push(`${a.name} wins and deals ${damage} damage to ${b.name}.`);
      this.match.combatEvents.push({
        round: this.match.round,
        duelId,
        aPlayerId: a.playerId,
        aPlayerName: a.name,
        bPlayerId: b.playerId,
        bPlayerName: b.name,
        type: "DUEL_RESULT",
        message: `${a.name} wins and deals ${damage} damage to ${b.name}.`
      });
      this.bumpSequence("COMBAT_RESULT", `${a.name} defeated ${b.name} for ${damage} damage.`);
    } else if (result.winner === "B") {
      const damage = Math.max(1, result.survivorsB + b.tavernTier);
      a.health -= damage;
      this.match.combatLog.push(`${b.name} wins and deals ${damage} damage to ${a.name}.`);
      this.match.combatEvents.push({
        round: this.match.round,
        duelId,
        aPlayerId: a.playerId,
        aPlayerName: a.name,
        bPlayerId: b.playerId,
        bPlayerName: b.name,
        type: "DUEL_RESULT",
        message: `${b.name} wins and deals ${damage} damage to ${a.name}.`
      });
      this.bumpSequence("COMBAT_RESULT", `${b.name} defeated ${a.name} for ${damage} damage.`);
    } else {
      this.match.combatLog.push("Draw round. No damage dealt.");
      this.match.combatEvents.push({
        round: this.match.round,
        duelId,
        aPlayerId: a.playerId,
        aPlayerName: a.name,
        bPlayerId: b.playerId,
        bPlayerName: b.name,
        type: "DUEL_RESULT",
        message: "Draw round. No damage dealt."
      });
      this.bumpSequence("COMBAT_RESULT", `${a.name} and ${b.name} drew.`);
    }
  }

  private rollShop(tier: number, seed: number): (UnitDefinition | null)[] {
    const rng = new SeededRng(seed);
    const pool = unitsForTier(tier);
    if (pool.length === 0) return Array.from({ length: BALANCE.shopSlots }, () => null);
    return Array.from({ length: BALANCE.shopSlots }, () => pool[rng.int(pool.length)]);
  }

  private buyUnit(player: PlayerInternal, shopIndex: number): void {
    if (this.match.phase === "COMBAT" || player.eliminated) return;
    if (shopIndex < 0 || shopIndex >= player.shop.length) return;
    const unit = player.shop[shopIndex];
    if (!unit) return;
    if (player.gold < BALANCE.buyCost) return;

    const benchSlot = firstEmpty(player.bench);
    const boardSlot = firstEmpty(player.board);
    if (benchSlot < 0 && boardSlot < 0) return;

    player.gold -= BALANCE.buyCost;
    const instance = cloneUnitFromDef(unit);
    if (benchSlot >= 0) player.bench[benchSlot] = instance;
    else player.board[boardSlot] = instance;
    player.shop[shopIndex] = null;
    this.mergeDuplicates(player, unit.id);
  }

  private mergeDuplicates(player: PlayerInternal, unitId: string): void {
    const all = [...player.board, ...player.bench];
    const matches = all.filter((u): u is UnitInstance => !!u && u.unitId === unitId && u.level === 1);
    if (matches.length < BALANCE.mergeCopiesRequired) return;

    const consumedIds = matches.slice(0, BALANCE.mergeCopiesRequired).map((u) => u.instanceId);
    const upgradedFrom = matches[0];
    const upgraded: UnitInstance = {
      ...upgradedFrom,
      instanceId: nanoid(12),
      level: 2,
      attack: upgradedFrom.attack + 2,
      hp: upgradedFrom.hp + 3,
      maxHp: upgradedFrom.maxHp + 3
    };

    for (const arr of [player.board, player.bench]) {
      for (let i = 0; i < arr.length; i += 1) {
        const unit = arr[i];
        if (unit && consumedIds.includes(unit.instanceId)) arr[i] = null;
      }
    }

    for (const arr of [player.board, player.bench]) {
      const idx = firstEmpty(arr);
      if (idx >= 0) {
        arr[idx] = upgraded;
        break;
      }
    }
  }

  private reroll(player: PlayerInternal): void {
    if (this.match.phase === "COMBAT" || player.eliminated) return;
    if (player.gold < BALANCE.rerollCost) return;
    player.gold -= BALANCE.rerollCost;
    player.shop = this.rollShop(player.tavernTier, this.match.seed + this.match.round + player.gold + player.xp);
  }

  private upgradeTavern(player: PlayerInternal): void {
    if (this.match.phase === "COMBAT" || player.eliminated) return;
    const cost = BALANCE.tavernUpgradeBaseCost + player.tavernTier * BALANCE.tavernUpgradeStepCost;
    if (player.tavernTier >= BALANCE.maxTavernTier || player.gold < cost) return;
    player.gold -= cost;
    player.tavernTier += 1;
  }

  private sellUnit(player: PlayerInternal, zone: "bench" | "board", index: number): void {
    if (this.match.phase === "COMBAT" || player.eliminated) return;
    const arr = zone === "bench" ? player.bench : player.board;
    if (index < 0 || index >= arr.length || !arr[index]) return;
    arr[index] = null;
    player.gold += BALANCE.sellRefund;
  }

  private moveUnit(
    player: PlayerInternal,
    from: "bench" | "board",
    fromIndex: number,
    to: "bench" | "board",
    toIndex: number
  ): void {
    if (this.match.phase === "COMBAT" || player.eliminated) return;
    const fromArr = from === "bench" ? player.bench : player.board;
    const toArr = to === "bench" ? player.bench : player.board;
    if (fromIndex < 0 || fromIndex >= fromArr.length || toIndex < 0 || toIndex >= toArr.length) return;
    const fromUnit = fromArr[fromIndex];
    if (!fromUnit) return;
    const targetUnit = toArr[toIndex];
    fromArr[fromIndex] = targetUnit ?? null;
    toArr[toIndex] = fromUnit;
  }

  private autoPlaceBoard(player: PlayerInternal): void {
    for (let i = 0; i < player.board.length; i += 1) {
      if (player.board[i] !== null) continue;
      const benchIndex = player.bench.findIndex((u) => u !== null);
      if (benchIndex < 0) return;
      player.board[i] = player.bench[benchIndex];
      player.bench[benchIndex] = null;
    }
  }

  private resetBoardHealth(player: PlayerInternal): void {
    for (const arr of [player.board, player.bench]) {
      for (let i = 0; i < arr.length; i += 1) {
        const unit = arr[i];
        if (!unit) continue;
        arr[i] = { ...unit, hp: unit.maxHp };
      }
    }
  }
}

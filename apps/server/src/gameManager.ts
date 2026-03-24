import type {
  ClientIntent,
  GamePhase,
  MatchPublicState,
  PlayerPublicState,
  ServerMessage,
  UnitDefinition,
  UnitInstance
} from "@runebrawl/shared";
import { nanoid } from "nanoid";
import { simulateCombat } from "./engine/combat.js";
import { SeededRng } from "./engine/rng.js";
import { unitsForTier } from "./data/units.js";

const SHOP_SLOTS = 3;
const BENCH_SLOTS = 6;
const BOARD_SLOTS = 6;
const MAX_PLAYERS = 4;
const STARTING_HEALTH = 30;
const TAVERN_PHASE_MS = 45_000;
const ROUND_END_MS = 5_000;

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
  shop: (UnitDefinition | null)[];
  bench: (UnitInstance | null)[];
  board: (UnitInstance | null)[];
  eliminated: boolean;
}

interface MatchInternal {
  matchId: string;
  round: number;
  phase: GamePhase;
  phaseEndsAt: number;
  players: PlayerInternal[];
  combatLog: string[];
  seed: number;
}

function now(): number {
  return Date.now();
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
    shop: p.shop,
    bench: p.bench,
    board: p.board
  };
}

export class GameManager {
  private match: MatchInternal | null = null;
  private tickTimer: NodeJS.Timeout;

  constructor() {
    this.tickTimer = setInterval(() => this.tick(), 1000);
  }

  join(name: string, socket: SocketLike): string {
    if (!this.match || this.match.phase === "FINISHED") {
      this.match = this.createMatch();
    }
    const match = this.match;
    if (!match) throw new Error("No match");

    if (match.players.filter((p) => !p.eliminated).length >= MAX_PLAYERS) {
      throw new Error("Match is full");
    }

    const playerId = nanoid(10);
    const player: PlayerInternal = {
      playerId,
      name: name.trim() || `Player-${playerId.slice(0, 4)}`,
      isBot: false,
      socket,
      health: STARTING_HEALTH,
      gold: 0,
      xp: 0,
      tavernTier: 1,
      lockedShop: false,
      ready: false,
      shop: Array.from({ length: SHOP_SLOTS }, () => null),
      bench: Array.from({ length: BENCH_SLOTS }, () => null),
      board: Array.from({ length: BOARD_SLOTS }, () => null),
      eliminated: false
    };

    match.players.push(player);
    this.send(socket, { type: "CONNECTED", playerId });

    // Start the first real round as soon as first human joins.
    if (match.round === 0 && match.phase === "ROUND_END") {
      this.startTavernPhase();
    }

    this.broadcast();
    return playerId;
  }

  disconnect(playerId: string): void {
    const player = this.match?.players.find((p) => p.playerId === playerId);
    if (!player) return;
    player.socket = undefined;
    if (!player.isBot) {
      player.isBot = true;
      player.name = `${player.name} (Bot)`;
    }
  }

  handleIntent(playerId: string, intent: ClientIntent): void {
    const match = this.match;
    if (!match || match.phase === "FINISHED") return;
    const player = match.players.find((p) => p.playerId === playerId && !p.eliminated);
    if (!player) return;

    switch (intent.type) {
      case "BUY_UNIT":
        this.buyUnit(player, intent.shopIndex);
        break;
      case "REROLL_SHOP":
        this.reroll(player);
        break;
      case "LOCK_SHOP":
        if (match.phase === "TAVERN" || match.phase === "POSITIONING") {
          player.lockedShop = intent.locked;
        }
        break;
      case "UPGRADE_TAVERN":
        this.upgradeTavern(player);
        break;
      case "SELL_UNIT":
        this.sellUnit(player, intent.zone, intent.index);
        break;
      case "MOVE_UNIT":
        this.moveUnit(player, intent.from, intent.fromIndex, intent.to, intent.toIndex);
        break;
      case "READY_FOR_COMBAT":
        if (match.phase === "TAVERN" || match.phase === "POSITIONING") {
          player.ready = true;
        }
        break;
      default:
        break;
    }
    this.broadcast();
  }

  private createMatch(): MatchInternal {
    return {
      matchId: nanoid(10),
      round: 0,
      phase: "ROUND_END",
      phaseEndsAt: now() + 500,
      players: [],
      combatLog: [],
      seed: Math.floor(Math.random() * 100000)
    };
  }

  private send(socket: SocketLike, message: ServerMessage): void {
    socket.send(JSON.stringify(message));
  }

  private broadcast(): void {
    const match = this.match;
    if (!match) return;
    for (const p of match.players) {
      if (!p.socket) continue;
      const state: MatchPublicState = {
        matchId: match.matchId,
        round: match.round,
        phase: match.phase,
        phaseEndsAt: match.phaseEndsAt,
        players: match.players.map(playerPublicState),
        yourPlayerId: p.playerId,
        combatLog: match.combatLog.slice(-80)
      };
      this.send(p.socket, { type: "MATCH_STATE", state });
    }
  }

  private tick(): void {
    const match = this.match;
    if (!match) return;
    const alive = match.players.filter((p) => !p.eliminated);
    if (alive.length === 0) return;

    if (alive.length === 1 && match.round > 0 && match.phase !== "FINISHED") {
      match.phase = "FINISHED";
      match.phaseEndsAt = now() + 999999999;
      match.combatLog.push(`${alive[0].name} wins the match.`);
      this.broadcast();
      return;
    }

    if (match.phase === "ROUND_END" && now() >= match.phaseEndsAt) {
      this.startTavernPhase();
      return;
    }

    if ((match.phase === "TAVERN" || match.phase === "POSITIONING") && (now() >= match.phaseEndsAt || this.allReady())) {
      this.startCombatPhase();
      return;
    }
  }

  private allReady(): boolean {
    const match = this.match;
    if (!match) return false;
    const alive = match.players.filter((p) => !p.eliminated);
    return alive.length > 0 && alive.every((p) => p.ready);
  }

  private ensureBots(): void {
    const match = this.match;
    if (!match) return;
    while (match.players.length < MAX_PLAYERS) {
      const id = nanoid(10);
      match.players.push({
        playerId: id,
        name: `Bot-${id.slice(0, 4)}`,
        isBot: true,
        health: STARTING_HEALTH,
        gold: 0,
        xp: 0,
        tavernTier: 1,
        lockedShop: false,
        ready: false,
        shop: Array.from({ length: SHOP_SLOTS }, () => null),
        bench: Array.from({ length: BENCH_SLOTS }, () => null),
        board: Array.from({ length: BOARD_SLOTS }, () => null),
        eliminated: false
      });
    }
  }

  private startTavernPhase(): void {
    const match = this.match;
    if (!match) return;
    this.ensureBots();
    match.round += 1;
    match.phase = "TAVERN";
    match.phaseEndsAt = now() + TAVERN_PHASE_MS;
    match.combatLog = [`Round ${match.round} started.`];

    for (const p of match.players) {
      if (p.eliminated) continue;
      p.ready = false;
      p.gold = Math.min(10, 3 + match.round);
      p.xp += 1;
      if (!p.lockedShop) {
        p.shop = this.rollShop(p.tavernTier, match.seed + match.round + p.gold);
      }
      this.resetBoardHealth(p);
    }

    this.runBots();
    this.broadcast();
  }

  private runBots(): void {
    const match = this.match;
    if (!match) return;
    for (const p of match.players) {
      if (p.eliminated || !p.isBot) continue;
      let loops = 20;
      while (loops > 0) {
        loops -= 1;
        if (p.gold >= 3) {
          const buyable = p.shop.findIndex((u) => !!u);
          if (buyable >= 0) {
            this.buyUnit(p, buyable);
          } else if (p.gold >= 1) {
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

  private startCombatPhase(): void {
    const match = this.match;
    if (!match) return;
    match.phase = "COMBAT";
    match.combatLog = [`Combat starts for round ${match.round}.`];

    const alive = match.players.filter((p) => !p.eliminated);
    const rng = new SeededRng(match.seed + match.round * 173);
    const shuffled = [...alive].sort(() => rng.next() - 0.5);
    const pairs: Array<[PlayerInternal, PlayerInternal | null]> = [];

    for (let i = 0; i < shuffled.length; i += 2) {
      pairs.push([shuffled[i], shuffled[i + 1] ?? null]);
    }

    for (const [a, b] of pairs) {
      if (!b) {
        match.combatLog.push(`${a.name} has no opponent and takes no damage.`);
        continue;
      }
      this.resolveFight(a, b, rng);
    }

    for (const p of match.players) {
      if (p.health <= 0) p.eliminated = true;
    }

    match.phase = "ROUND_END";
    match.phaseEndsAt = now() + ROUND_END_MS;
    this.broadcast();
  }

  private resolveFight(a: PlayerInternal, b: PlayerInternal, rng: SeededRng): void {
    const match = this.match;
    if (!match) return;
    const boardA = a.board.filter((u): u is UnitInstance => !!u).map((u) => ({ ...u, hp: u.maxHp }));
    const boardB = b.board.filter((u): u is UnitInstance => !!u).map((u) => ({ ...u, hp: u.maxHp }));
    const result = simulateCombat(boardA, boardB, Math.floor(rng.next() * 1000000));

    match.combatLog.push(`${a.name} vs ${b.name}: ${result.winner}`);
    for (const line of result.log.slice(0, 12)) match.combatLog.push(line);
    if (result.log.length > 12) {
      match.combatLog.push("... (combat log truncated)");
    }

    if (result.winner === "A") {
      const damage = Math.max(1, result.survivorsA + a.tavernTier);
      b.health -= damage;
      match.combatLog.push(`${a.name} wins and deals ${damage} damage to ${b.name}.`);
    } else if (result.winner === "B") {
      const damage = Math.max(1, result.survivorsB + b.tavernTier);
      a.health -= damage;
      match.combatLog.push(`${b.name} wins and deals ${damage} damage to ${a.name}.`);
    } else {
      match.combatLog.push("Draw round. No damage dealt.");
    }
  }

  private rollShop(tier: number, seed: number): (UnitDefinition | null)[] {
    const rng = new SeededRng(seed);
    const pool = unitsForTier(tier);
    if (pool.length === 0) return Array.from({ length: SHOP_SLOTS }, () => null);
    return Array.from({ length: SHOP_SLOTS }, () => pool[rng.int(pool.length)]);
  }

  private buyUnit(player: PlayerInternal, shopIndex: number): void {
    const match = this.match;
    if (!match || match.phase === "COMBAT" || player.eliminated) return;
    if (shopIndex < 0 || shopIndex >= player.shop.length) return;
    const unit = player.shop[shopIndex];
    if (!unit) return;
    if (player.gold < 3) return;

    const benchSlot = firstEmpty(player.bench);
    const boardSlot = firstEmpty(player.board);
    if (benchSlot < 0 && boardSlot < 0) return;

    player.gold -= 3;
    const instance = cloneUnitFromDef(unit);
    if (benchSlot >= 0) {
      player.bench[benchSlot] = instance;
    } else {
      player.board[boardSlot] = instance;
    }
    player.shop[shopIndex] = null;
    this.mergeDuplicates(player, unit.id);
  }

  private mergeDuplicates(player: PlayerInternal, unitId: string): void {
    const all = [...player.board, ...player.bench];
    const matches = all.filter((u): u is UnitInstance => !!u && u.unitId === unitId && u.level === 1);
    if (matches.length < 3) return;

    const consumedIds = matches.slice(0, 3).map((u) => u.instanceId);
    const upgradedFrom = matches[0];
    const upgraded: UnitInstance = {
      ...upgradedFrom,
      instanceId: nanoid(12),
      level: 2,
      attack: upgradedFrom.attack + 2,
      hp: upgradedFrom.hp + 3,
      maxHp: upgradedFrom.maxHp + 3
    };

    const zones: Array<{ zone: "board" | "bench"; arr: (UnitInstance | null)[] }> = [
      { zone: "board", arr: player.board },
      { zone: "bench", arr: player.bench }
    ];

    let placed = false;
    for (const z of zones) {
      for (let i = 0; i < z.arr.length; i += 1) {
        const unit = z.arr[i];
        if (unit && consumedIds.includes(unit.instanceId)) {
          z.arr[i] = null;
        }
      }
    }

    for (const z of zones) {
      const idx = firstEmpty(z.arr);
      if (idx >= 0 && !placed) {
        z.arr[idx] = upgraded;
        placed = true;
      }
    }
  }

  private reroll(player: PlayerInternal): void {
    const match = this.match;
    if (!match || match.phase === "COMBAT" || player.eliminated) return;
    if (player.gold < 1) return;
    player.gold -= 1;
    player.shop = this.rollShop(player.tavernTier, match.seed + match.round + player.gold + player.xp);
  }

  private upgradeTavern(player: PlayerInternal): void {
    const match = this.match;
    if (!match || match.phase === "COMBAT" || player.eliminated) return;
    const cost = 4 + player.tavernTier * 2;
    if (player.tavernTier >= 6 || player.gold < cost) return;
    player.gold -= cost;
    player.tavernTier += 1;
  }

  private sellUnit(player: PlayerInternal, zone: "bench" | "board", index: number): void {
    const match = this.match;
    if (!match || match.phase === "COMBAT" || player.eliminated) return;
    const arr = zone === "bench" ? player.bench : player.board;
    if (index < 0 || index >= arr.length || !arr[index]) return;
    arr[index] = null;
    player.gold += 1;
  }

  private moveUnit(
    player: PlayerInternal,
    from: "bench" | "board",
    fromIndex: number,
    to: "bench" | "board",
    toIndex: number
  ): void {
    const match = this.match;
    if (!match || match.phase === "COMBAT" || player.eliminated) return;
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

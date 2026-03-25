import { describe, expect, it, vi } from "vitest";
import type { UnitInstance } from "@runebrawl/shared";
import { MatchInstance } from "../matchInstance.js";

function makeSocket() {
  return {
    send: vi.fn<(data: string) => void>()
  };
}

function makeUnit(overrides: Partial<UnitInstance> = {}): UnitInstance {
  return {
    instanceId: "u1",
    unitId: "u1",
    name: "Unit",
    role: "Melee",
    level: 1,
    attack: 4,
    hp: 6,
    maxHp: 6,
    speed: 4,
    ability: "NONE",
    ...overrides
  };
}

function stopMatchTimer(match: MatchInstance): void {
  clearInterval((match as unknown as { tickTimer: NodeJS.Timeout }).tickTimer);
}

describe("match instance flow guards", () => {
  it("does not start private lobby when ready count is odd", () => {
    const match = new MatchInstance({
      maxPlayers: 5,
      isPrivate: true,
      fillBotsOnStart: false,
      timeoutFillBotsStart: false
    });
    try {
      match.joinHuman("A", makeSocket());
      match.joinHuman("B", makeSocket());
      match.joinHuman("C", makeSocket());

      const internal = match as unknown as {
        match: {
          phase: string;
          forceStart: boolean;
          players: Array<{ ready: boolean; eliminated: boolean }>;
        };
        tick: () => void;
      };
      internal.match.forceStart = true;
      for (const player of internal.match.players) {
        if (!player.eliminated) player.ready = true;
      }

      internal.tick();
      expect(internal.match.phase).toBe("LOBBY");
    } finally {
      stopMatchTimer(match);
    }
  });

  it("creates a ghost duel when one alive player has no direct pair", () => {
    const match = new MatchInstance({
      maxPlayers: 4,
      isPrivate: false,
      fillBotsOnStart: false,
      timeoutFillBotsStart: false
    });
    try {
      match.joinHuman("Alive", makeSocket());
      match.joinHuman("Dead", makeSocket());

      const internal = match as unknown as {
        match: {
          round: number;
          combatEvents: Array<{ type: string; bPlayerName?: string; message: string }>;
          players: Array<{
            name: string;
            playerId: string;
            eliminated: boolean;
            health: number;
            tavernTier: number;
            board: (UnitInstance | null)[];
            ghostBoardSnapshot: (UnitInstance | null)[] | null;
          }>;
        };
        startCombatPhase: () => void;
      };

      const alive = internal.match.players.find((p) => p.name === "Alive");
      const dead = internal.match.players.find((p) => p.name === "Dead");
      if (!alive || !dead) throw new Error("test setup failed");

      alive.eliminated = false;
      alive.health = 30;
      alive.tavernTier = 2;
      alive.board = [makeUnit({ instanceId: "alive-1", unitId: "alive-1", name: "Alive Unit" }), null, null, null, null, null];

      dead.eliminated = true;
      dead.health = 0;
      dead.tavernTier = 2;
      dead.board = Array.from({ length: 6 }, () => null);
      dead.ghostBoardSnapshot = null;

      internal.match.round = 3;
      internal.startCombatPhase();

      const duelResult = internal.match.combatEvents.find((e) => e.type === "DUEL_RESULT");
      expect(duelResult).toBeTruthy();
      expect(duelResult?.bPlayerName).toContain("(Ghost)");
    } finally {
      stopMatchTimer(match);
    }
  });

  it("reroll preserves pool accounting invariants when no buy happens", () => {
    const match = new MatchInstance({
      maxPlayers: 2,
      isPrivate: false,
      fillBotsOnStart: false,
      timeoutFillBotsStart: false
    });
    try {
      const playerId = match.joinHuman("Player", makeSocket());
      const internal = match as unknown as {
        match: {
          phase: string;
          players: Array<{ playerId: string; gold: number; tavernTier: number; eliminated: boolean }>;
        };
        startTavernPhase: () => void;
        reroll: (player: { gold: number; tavernTier: number; eliminated: boolean }) => void;
      };

      internal.startTavernPhase();
      const player = internal.match.players.find((p) => p.playerId === playerId);
      if (!player) throw new Error("test setup failed");
      player.gold = 10;

      const before = match.getUnitPoolSnapshot();
      const totalBefore = before.units.reduce((sum, unit) => sum + unit.initialCopies, 0);
      const accountedBefore = before.units.reduce(
        (sum, unit) => sum + unit.availableCopies + unit.inShop + unit.onBoard + unit.onBench + unit.consumedCopies,
        0
      );
      expect(accountedBefore).toBe(totalBefore);

      internal.reroll(player);

      const after = match.getUnitPoolSnapshot();
      const totalAfter = after.units.reduce((sum, unit) => sum + unit.initialCopies, 0);
      const accountedAfter = after.units.reduce(
        (sum, unit) => sum + unit.availableCopies + unit.inShop + unit.onBoard + unit.onBench + unit.consumedCopies,
        0
      );
      expect(accountedAfter).toBe(totalAfter);
      expect(after.units.reduce((sum, unit) => sum + unit.consumedCopies, 0)).toBe(0);
    } finally {
      stopMatchTimer(match);
    }
  });

  it("keeps rating identity stable across reconnect rename within one match", () => {
    const match = new MatchInstance({
      maxPlayers: 2,
      isPrivate: false,
      fillBotsOnStart: false,
      timeoutFillBotsStart: false
    });
    try {
      const playerId = match.joinHuman("Original Name", makeSocket());
      match.joinHuman("Other Human", makeSocket());

      const reconnected = match.reconnect(playerId, makeSocket(), "Renamed Mid Match");
      expect(reconnected).toBe(true);

      const internal = match as unknown as {
        match: { phase: string };
      };
      internal.match.phase = "FINISHED";

      const input = match.getRatingUpdateInput();
      expect(input).toBeTruthy();
      const identitySet = new Set((input?.placements ?? []).map((p) => p.playerId));
      expect(identitySet.has("name:original name")).toBe(true);
      expect(identitySet.has("name:renamed mid match")).toBe(false);
    } finally {
      stopMatchTimer(match);
    }
  });
});


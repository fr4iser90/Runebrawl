<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { ClientIntent, CombatReplayEvent, LobbySummary, MatchPublicState, ServerMessage, UnitInstance } from "@runebrawl/shared";

const name = ref("");
const connected = ref(false);
const error = ref("");
const state = ref<MatchPublicState | null>(null);
const ws = ref<WebSocket | null>(null);
const nowTs = ref(Date.now());
const storedPlayerId = ref<string | null>(localStorage.getItem("runebrawl.playerId"));
const storedMatchId = ref<string | null>(localStorage.getItem("runebrawl.matchId"));
const joinMode = ref<"quick" | "createPrivate" | "joinPrivate">("quick");
const inviteCodeInput = ref("");
const privateMaxPlayers = ref(4);
const region = ref("EU");
const mmr = ref(1000);
const openLobbies = ref<LobbySummary[]>([]);
const selectedOpenLobby = ref("");
let clock: number | null = null;
let combatReplayTimer: number | null = null;
let fadeCleanupTimer: number | null = null;

const dragging = ref<{ zone: "bench" | "board"; index: number } | null>(null);

const me = computed(() => {
  if (!state.value?.yourPlayerId) return null;
  return state.value.players.find((p) => p.playerId === state.value?.yourPlayerId) ?? null;
});

const isBuyPhase = computed(() => state.value?.phase === "TAVERN" || state.value?.phase === "POSITIONING");
const isLobby = computed(() => state.value?.phase === "LOBBY");
const isHeroSelection = computed(() => state.value?.phase === "HERO_SELECTION");
const isCombat = computed(() => state.value?.phase === "COMBAT");
const isCombatView = computed(() => {
  if (!state.value) return false;
  return state.value.phase === "COMBAT" || (state.value.phase === "ROUND_END" && state.value.combatEvents.length > 0);
});
const isPrivateLobby = computed(() => isLobby.value && !!state.value?.isPrivate);
const isCreator = computed(() => !!state.value && !!me.value && state.value.creatorPlayerId === me.value.playerId);
const activePlayersCount = computed(() => state.value?.players.length ?? 0);
const readyPlayersCount = computed(() => state.value?.players.filter((p) => p.ready).length ?? 0);
const allReady = computed(() => activePlayersCount.value > 0 && readyPlayersCount.value === activePlayersCount.value);
const secondsLeft = computed(() => {
  if (!state.value) return 0;
  const delta = Math.max(0, state.value.phaseEndsAt - nowTs.value);
  return Math.ceil(delta / 1000);
});
const lobbyStatusText = computed(() => {
  if (!isLobby.value || !state.value) return "";
  if (isPrivateLobby.value) {
    if (!allReady.value) {
      return `Waiting: all players ready (${readyPlayersCount.value}/${activePlayersCount.value}).`;
    }
    if (isCreator.value) {
      return "All players are ready. Leader can start now.";
    }
    return "All players are ready. Waiting for leader to start.";
  }
  if (activePlayersCount.value >= state.value.maxPlayers) {
    return "Lobby is full. Match starting...";
  }
  return `Waiting for full quick lobby (${activePlayersCount.value}/${state.value.maxPlayers}). Timeout in ${secondsLeft.value}s.`;
});

const myCombatEvents = computed<CombatReplayEvent[]>(() => {
  if (!state.value || !me.value) return [];
  const forMe = state.value.combatEvents.filter((e) => e.aPlayerId === me.value?.playerId || e.bPlayerId === me.value?.playerId);
  if (forMe.length === 0) return [];
  const duelId = forMe[forMe.length - 1].duelId;
  return forMe.filter((e) => e.duelId === duelId);
});

const myDuelMeta = computed(() => {
  if (!me.value || myCombatEvents.value.length === 0) return null;
  const first = myCombatEvents.value[0];
  const meIsA = first.aPlayerId === me.value.playerId;
  return {
    meIsA,
    meName: meIsA ? first.aPlayerName : first.bPlayerName,
    opponentName: meIsA ? first.bPlayerName : first.aPlayerName,
    opponentPlayerId: meIsA ? first.bPlayerId : first.aPlayerId
  };
});

const myCombatOpponent = computed(() => {
  if (!state.value || !myDuelMeta.value) return null;
  return state.value.players.find((p) => p.playerId === myDuelMeta.value?.opponentPlayerId) ?? null;
});

const combatReplayStep = ref(0);
const activeCombatEvent = computed(() => {
  if (!myCombatEvents.value.length) return null;
  return myCombatEvents.value[Math.min(combatReplayStep.value, myCombatEvents.value.length - 1)] ?? null;
});

const activeCombatLine = computed(() => {
  return activeCombatEvent.value?.message ?? "";
});

interface ReplayUnit extends UnitInstance {
  isDead?: boolean;
}

const replayMyBoard = ref<(ReplayUnit | null)[]>([]);
const replayEnemyBoard = ref<(ReplayUnit | null)[]>([]);
const recentDamageBySlot = ref<Record<string, string>>({});
const deadSlots = ref<Record<string, boolean>>({});
const replayDuelId = ref<string | null>(null);

function connect(): void {
  if (!name.value.trim() && !storedPlayerId.value) {
    error.value = "Enter a name first.";
    return;
  }
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  const socket = new WebSocket(`${protocol}://${location.hostname}:3001/ws`);
  ws.value = socket;

  socket.onopen = () => {
    connected.value = true;
    if (storedPlayerId.value && storedMatchId.value) {
      send({
        type: "RECONNECT",
        playerId: storedPlayerId.value,
        matchId: storedMatchId.value,
        name: name.value.trim() || undefined
      });
    } else {
      if (joinMode.value === "createPrivate") {
        const maxPlayers = Number.isFinite(privateMaxPlayers.value) ? Math.max(2, Math.min(8, privateMaxPlayers.value)) : 4;
        send({ type: "CREATE_PRIVATE_MATCH", name: name.value.trim(), maxPlayers, region: region.value, mmr: mmr.value });
      } else if (joinMode.value === "joinPrivate") {
        if (!inviteCodeInput.value.trim()) {
          error.value = "Invite code required.";
          socket.close();
          return;
        }
        send({ type: "JOIN_PRIVATE_MATCH", name: name.value.trim(), inviteCode: inviteCodeInput.value.trim().toUpperCase() });
      } else {
        send({ type: "QUICK_MATCH", name: name.value.trim(), region: region.value, mmr: mmr.value });
      }
    }
  };

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data as string) as ServerMessage;
    if (message.type === "ERROR") {
      error.value = message.message;
      if (message.message.toLowerCase().includes("reconnect")) {
        storedPlayerId.value = null;
        storedMatchId.value = null;
        localStorage.removeItem("runebrawl.playerId");
        localStorage.removeItem("runebrawl.matchId");
      }
    } else if (message.type === "CONNECTED") {
      storedPlayerId.value = message.playerId;
      storedMatchId.value = message.matchId;
      localStorage.setItem("runebrawl.playerId", message.playerId);
      localStorage.setItem("runebrawl.matchId", message.matchId);
    } else if (message.type === "MATCH_STATE") {
      state.value = message.state;
    }
  };

  socket.onerror = () => {
    error.value = "Connection failed.";
  };

  socket.onclose = () => {
    connected.value = false;
  };
}

function send(intent: ClientIntent): void {
  if (!ws.value || ws.value.readyState !== WebSocket.OPEN) return;
  ws.value.send(JSON.stringify(intent));
}

function buy(shopIndex: number): void {
  send({ type: "BUY_UNIT", shopIndex });
}

function reroll(): void {
  send({ type: "REROLL_SHOP" });
}

function lockToggle(): void {
  if (!me.value) return;
  send({ type: "LOCK_SHOP", locked: !me.value.lockedShop });
}

function upgrade(): void {
  send({ type: "UPGRADE_TAVERN" });
}

function ready(): void {
  send({ type: "READY_FOR_COMBAT" });
}

function selectHero(heroId: string): void {
  send({ type: "SELECT_HERO", heroId });
}

function useHeroPower(): void {
  send({ type: "USE_HERO_POWER" });
}

function readyLobbyToggle(): void {
  if (!me.value) return;
  send({ type: "READY_LOBBY", ready: !me.value.ready });
}

function addBotToLobby(): void {
  send({ type: "ADD_BOT_TO_LOBBY" });
}

function forceStartLobby(): void {
  send({ type: "FORCE_START" });
}

function kickPlayer(targetPlayerId: string): void {
  send({ type: "KICK_PLAYER", targetPlayerId });
}

async function loadOpenLobbies(): Promise<void> {
  try {
    const response = await fetch(`http://${location.hostname}:3001/lobbies`);
    const payload = (await response.json()) as { lobbies: LobbySummary[] };
    openLobbies.value = payload.lobbies ?? [];
  } catch {
    openLobbies.value = [];
  }
}

function joinOpenLobby(matchId: string): void {
  if (!name.value.trim()) {
    error.value = "Enter a name first.";
    return;
  }
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  const socket = new WebSocket(`${protocol}://${location.hostname}:3001/ws`);
  ws.value = socket;
  socket.onopen = () => {
    connected.value = true;
    send({ type: "JOIN_LOBBY", name: name.value.trim(), matchId });
  };
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data as string) as ServerMessage;
    if (message.type === "ERROR") error.value = message.message;
    else if (message.type === "CONNECTED") {
      storedPlayerId.value = message.playerId;
      storedMatchId.value = message.matchId;
      localStorage.setItem("runebrawl.playerId", message.playerId);
      localStorage.setItem("runebrawl.matchId", message.matchId);
    } else if (message.type === "MATCH_STATE") {
      state.value = message.state;
    }
  };
  socket.onclose = () => {
    connected.value = false;
  };
}

function joinSelectedOpenLobby(): void {
  if (!selectedOpenLobby.value) return;
  joinOpenLobby(selectedOpenLobby.value);
}

function sell(zone: "bench" | "board", index: number): void {
  send({ type: "SELL_UNIT", zone, index });
}

function onDragStart(zone: "bench" | "board", index: number): void {
  dragging.value = { zone, index };
}

function onDrop(toZone: "bench" | "board", toIndex: number): void {
  if (!dragging.value) return;
  send({
    type: "MOVE_UNIT",
    from: dragging.value.zone,
    fromIndex: dragging.value.index,
    to: toZone,
    toIndex
  });
  dragging.value = null;
}

function unitLabel(unit: UnitInstance | null): string {
  if (!unit) return "Empty";
  return `${unit.name} [${unit.attack}/${unit.hp}] L${unit.level}`;
}

function unitLabelReplay(unit: ReplayUnit | null): string {
  if (!unit) return "Empty";
  return `${unit.name} [${unit.attack}/${Math.max(0, unit.hp)}] L${unit.level}`;
}

function unitHpPercent(unit: ReplayUnit | null): number {
  if (!unit || unit.maxHp <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((Math.max(0, unit.hp) / unit.maxHp) * 100)));
}

function slotKey(side: "me" | "enemy", idx: number): string {
  return `${side}:${idx}`;
}

function showDamage(side: "me" | "enemy", idx: number, amount: number): void {
  if (amount <= 0) return;
  const key = slotKey(side, idx);
  recentDamageBySlot.value = {
    ...recentDamageBySlot.value,
    [key]: `-${amount}`
  };
  window.setTimeout(() => {
    const next = { ...recentDamageBySlot.value };
    delete next[key];
    recentDamageBySlot.value = next;
  }, 520);
}

function markDead(side: "me" | "enemy", idx: number): void {
  deadSlots.value = {
    ...deadSlots.value,
    [slotKey(side, idx)]: true
  };
  if (fadeCleanupTimer !== null) {
    window.clearTimeout(fadeCleanupTimer);
  }
  fadeCleanupTimer = window.setTimeout(() => {
    deadSlots.value = {};
    fadeCleanupTimer = null;
  }, 900);
}

function sideFromOwner(owner: "A" | "B"): "me" | "enemy" {
  if (!myDuelMeta.value) return "me";
  if (myDuelMeta.value.meIsA) {
    return owner === "A" ? "me" : "enemy";
  }
  return owner === "B" ? "me" : "enemy";
}

function applyCombatEvent(event: CombatReplayEvent): void {
  if (event.type === "ATTACK") {
    if (event.sourceOwnerId === undefined || event.sourceSlotIndex === undefined) return;
    if (event.targetOwnerId === undefined || event.targetSlotIndex === undefined) return;
    const attackerSide = sideFromOwner(event.sourceOwnerId);
    const defenderSide = sideFromOwner(event.targetOwnerId);
    const attackerBoard = attackerSide === "me" ? replayMyBoard.value : replayEnemyBoard.value;
    const defenderBoard = defenderSide === "me" ? replayMyBoard.value : replayEnemyBoard.value;
    const attacker = attackerBoard[event.sourceSlotIndex];
    const defender = defenderBoard[event.targetSlotIndex];
    if (!attacker || !defender) return;
    defender.hp -= attacker.attack;
    attacker.hp -= defender.attack;
    showDamage(defenderSide, event.targetSlotIndex, attacker.attack);
    showDamage(attackerSide, event.sourceSlotIndex, defender.attack);
    return;
  }
  if (event.type === "UNIT_DIED") {
    if (event.sourceOwnerId === undefined || event.sourceSlotIndex === undefined) return;
    const side = sideFromOwner(event.sourceOwnerId);
    const board = side === "me" ? replayMyBoard.value : replayEnemyBoard.value;
    const unit = board[event.sourceSlotIndex];
    if (!unit) return;
    unit.hp = 0;
    unit.isDead = true;
    markDead(side, event.sourceSlotIndex);
    return;
  }
  if (event.type === "ABILITY_TRIGGERED") {
    // MVP: no stat mutation needed for visual correctness yet.
    return;
  }
}

function initializeReplayBoards(): void {
  if (!me.value || !myCombatOpponent.value) return;
  replayMyBoard.value = me.value.board.map((u) => (u ? { ...u } : null));
  replayEnemyBoard.value = myCombatOpponent.value.board.map((u) => (u ? { ...u } : null));
  recentDamageBySlot.value = {};
  deadSlots.value = {};
  combatReplayStep.value = -1;
}

function unitPulseClass(unit: UnitInstance | null, side: "me" | "enemy", slotIndex: number): string {
  if (!unit || !activeCombatEvent.value || activeCombatEvent.value.type !== "ATTACK" || !myDuelMeta.value) return "";
  const expectedOwner: "A" | "B" = side === "me" ? (myDuelMeta.value.meIsA ? "A" : "B") : myDuelMeta.value.meIsA ? "B" : "A";
  const isAttacker =
    activeCombatEvent.value.sourceOwnerId === expectedOwner &&
    activeCombatEvent.value.sourceSlotIndex === slotIndex &&
    unit.name === activeCombatEvent.value.sourceUnitName;
  const isDefender =
    activeCombatEvent.value.targetOwnerId === expectedOwner &&
    activeCombatEvent.value.targetSlotIndex === slotIndex &&
    unit.name === activeCombatEvent.value.targetUnitName;
  if (isAttacker) return "pulse-attack";
  if (isDefender) return "pulse-hit";
  return "";
}

function slotAnimationClass(side: "me" | "enemy", idx: number): string {
  return deadSlots.value[slotKey(side, idx)] ? "dead-fade" : "";
}

watch(
  () => [isCombatView.value, state.value?.sequence, myCombatEvents.value.length, myCombatEvents.value[0]?.duelId],
  () => {
    if (!isCombatView.value) {
      if (combatReplayTimer !== null) {
        window.clearInterval(combatReplayTimer);
        combatReplayTimer = null;
      }
      combatReplayStep.value = 0;
      return;
    }
    if (myCombatEvents.value.length === 0) return;
    const duelId = myCombatEvents.value[0].duelId;
    if (replayDuelId.value !== duelId) {
      replayDuelId.value = duelId;
      initializeReplayBoards();
    }
    if (combatReplayTimer !== null) return;
    combatReplayTimer = window.setInterval(() => {
      const next = combatReplayStep.value + 1;
      if (next >= myCombatEvents.value.length) {
        if (combatReplayTimer !== null) {
          window.clearInterval(combatReplayTimer);
          combatReplayTimer = null;
        }
        return;
      }
      combatReplayStep.value = next;
      const event = myCombatEvents.value[next];
      if (event) applyCombatEvent(event);
    }, 700);
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  if (clock !== null) window.clearInterval(clock);
  if (combatReplayTimer !== null) window.clearInterval(combatReplayTimer);
  if (fadeCleanupTimer !== null) window.clearTimeout(fadeCleanupTimer);
  ws.value?.close();
});

onMounted(() => {
  clock = window.setInterval(() => {
    nowTs.value = Date.now();
  }, 250);

  if (storedPlayerId.value) {
    connect();
  } else {
    void loadOpenLobbies();
  }
});
</script>

<template>
  <div class="app">
    <header class="header">
      <h1>Runebrawl MVP</h1>
      <div v-if="state" class="round">
        Match {{ state.matchId }} | Round {{ state.round }} | Phase: {{ state.phase }} | Seq {{ state.sequence }} | {{ secondsLeft }}s
      </div>
    </header>

    <div v-if="!connected" class="join-card">
      <select v-model="joinMode">
        <option value="quick">Quick Match</option>
        <option value="createPrivate">Create Private</option>
        <option value="joinPrivate">Join Private</option>
      </select>
      <input v-model="name" placeholder="Your name" />
      <input
        v-if="joinMode !== 'joinPrivate'"
        v-model="region"
        placeholder="Region (e.g. EU)"
      />
      <input
        v-if="joinMode !== 'joinPrivate'"
        v-model.number="mmr"
        type="number"
        min="1"
        placeholder="MMR"
      />
      <input
        v-if="joinMode === 'joinPrivate'"
        v-model="inviteCodeInput"
        placeholder="Invite code"
      />
      <input
        v-if="joinMode === 'createPrivate'"
        v-model.number="privateMaxPlayers"
        type="number"
        min="2"
        max="8"
        placeholder="Max players"
      />
      <button @click="connect">{{ storedPlayerId && storedMatchId ? "Reconnect / Join" : "Enter Lobby" }}</button>
      <button @click="loadOpenLobbies">Refresh Lobbies</button>
    </div>

    <div v-if="!connected && openLobbies.length > 0" class="join-card">
      <select v-model="selectedOpenLobby">
        <option value="">Join Open Lobby...</option>
        <option v-for="lobby in openLobbies" :key="lobby.matchId" :value="lobby.matchId">
          {{ lobby.matchId }} | {{ lobby.currentPlayers }}/{{ lobby.maxPlayers }} | {{ lobby.region }} | {{ lobby.mmrBucket }}
        </option>
      </select>
      <button @click="joinSelectedOpenLobby">Join Selected Lobby</button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="state && me" class="layout">
      <section class="tavern">
        <h2>Tavern / Shop</h2>
        <div v-if="state" class="stats">
          <span>Players: {{ state.players.length }} / {{ state.maxPlayers }}</span>
          <span v-if="state.isPrivate && state.inviteCode">Code: {{ state.inviteCode }}</span>
        </div>
        <p v-if="isLobby" class="slot-title">{{ lobbyStatusText }}</p>
        <p v-if="isHeroSelection && !me.heroSelected" class="slot-title">Choose your hero before round 1 starts.</p>
        <p v-if="isHeroSelection && me.heroSelected && me.hero" class="slot-title">
          Hero locked: {{ me.hero.name }}.
        </p>
        <div class="stats">
          <span>Gold: {{ me.gold }}</span>
          <span>Health: {{ me.health }}</span>
          <span>Tier: {{ me.tavernTier }}</span>
          <span>XP: {{ me.xp }}</span>
        </div>
        <div v-if="isHeroSelection" class="shop-row">
          <div v-for="hero in me.heroOptions" :key="hero.id" class="shop-card">
            <div class="unit-name">{{ hero.name }}</div>
            <div class="unit-meta">{{ hero.description }}</div>
            <button :disabled="me.heroSelected" @click="selectHero(hero.id)">
              {{ me.heroSelected ? "Selected" : "Select Hero" }}
            </button>
          </div>
        </div>
        <div v-if="!isHeroSelection" class="shop-row">
          <div v-for="(unit, idx) in me.shop" :key="idx" class="shop-card">
            <div class="unit-name">{{ unit?.name ?? "Sold out" }}</div>
            <div v-if="unit" class="unit-meta">
              {{ unit.role }} | {{ unit.attack }}/{{ unit.hp }} | SPD {{ unit.speed }}
            </div>
            <button :disabled="!isBuyPhase || !unit" @click="buy(idx)">Buy (3)</button>
          </div>
        </div>
        <div v-if="me.hero" class="slot-title">
          Hero: {{ me.hero.name }} - {{ me.hero.description }}
        </div>
        <div class="actions">
          <button v-if="isLobby && isCreator" @click="addBotToLobby">Add Bot</button>
          <button v-if="isPrivateLobby && isCreator" @click="forceStartLobby">Force Start (Leader)</button>
          <button v-if="isPrivateLobby" @click="readyLobbyToggle">{{ me.ready ? "Unready Lobby" : "Ready Lobby" }}</button>
          <button
            v-if="me.hero && me.hero.powerType === 'ACTIVE'"
            :disabled="!isBuyPhase || me.heroPowerUsedThisTurn || me.gold < me.hero.powerCost"
            @click="useHeroPower"
          >
            Hero Power ({{ me.hero.powerCost }}) {{ me.heroPowerUsedThisTurn ? "- Used" : "" }}
          </button>
          <button :disabled="!isBuyPhase" @click="reroll">Reroll (1)</button>
          <button :disabled="!isBuyPhase" @click="upgrade">Upgrade Tavern</button>
          <button :disabled="!isBuyPhase" @click="lockToggle">
            {{ me.lockedShop ? "Unlock Shop" : "Lock Shop" }}
          </button>
          <button :disabled="!isBuyPhase || me.ready" @click="ready">Ready</button>
        </div>
      </section>

      <section v-if="!isCombatView" class="board">
        <h2>Battlefield</h2>
        <div class="slot-row">
          <div
            v-for="(unit, idx) in me.board"
            :key="`board-${idx}`"
            class="slot"
            draggable="true"
            @dragstart="onDragStart('board', idx)"
            @dragover.prevent
            @drop="onDrop('board', idx)"
          >
            <div class="slot-title">Board {{ idx + 1 }}</div>
            <div class="slot-unit">{{ unitLabel(unit) }}</div>
            <button v-if="unit && isBuyPhase" @click="sell('board', idx)">Sell (+1)</button>
          </div>
        </div>

        <h2>Bench</h2>
        <div class="slot-row">
          <div
            v-for="(unit, idx) in me.bench"
            :key="`bench-${idx}`"
            class="slot bench-slot"
            draggable="true"
            @dragstart="onDragStart('bench', idx)"
            @dragover.prevent
            @drop="onDrop('bench', idx)"
          >
            <div class="slot-title">Bench {{ idx + 1 }}</div>
            <div class="slot-unit">{{ unitLabel(unit) }}</div>
            <button v-if="unit && isBuyPhase" @click="sell('bench', idx)">Sell (+1)</button>
          </div>
        </div>
      </section>
      <section v-else class="board combat-board">
        <h2>Combat View</h2>
        <div class="combat-subtitle">
          <span v-if="myDuelMeta">{{ myDuelMeta.meName }} vs {{ myDuelMeta.opponentName }}</span>
          <span v-else>Waiting for your duel...</span>
        </div>
        <div class="combat-arena" v-if="myCombatOpponent">
          <div class="combat-side">
            <h3>{{ me.name }}</h3>
            <div class="slot-row">
              <div
                v-for="(unit, idx) in me.board"
                :key="`combat-me-${idx}`"
                class="slot"
                :class="[unitPulseClass(unit, 'me', idx), slotAnimationClass('me', idx)]"
              >
                <div class="slot-title">Slot {{ idx + 1 }}</div>
                <div class="slot-unit">{{ unitLabelReplay(replayMyBoard[idx] ?? null) }}</div>
                <div class="hp-track" v-if="replayMyBoard[idx]">
                  <div class="hp-fill" :style="{ width: `${unitHpPercent(replayMyBoard[idx])}%` }"></div>
                </div>
                <div class="damage-pop" v-if="recentDamageBySlot[slotKey('me', idx)]">
                  {{ recentDamageBySlot[slotKey("me", idx)] }}
                </div>
              </div>
            </div>
          </div>
          <div class="combat-side">
            <h3>{{ myCombatOpponent.name }}</h3>
            <div class="slot-row">
              <div
                v-for="(unit, idx) in myCombatOpponent.board"
                :key="`combat-opp-${idx}`"
                class="slot"
                :class="[unitPulseClass(unit, 'enemy', idx), slotAnimationClass('enemy', idx)]"
              >
                <div class="slot-title">Slot {{ idx + 1 }}</div>
                <div class="slot-unit">{{ unitLabelReplay(replayEnemyBoard[idx] ?? null) }}</div>
                <div class="hp-track" v-if="replayEnemyBoard[idx]">
                  <div class="hp-fill" :style="{ width: `${unitHpPercent(replayEnemyBoard[idx])}%` }"></div>
                </div>
                <div class="damage-pop" v-if="recentDamageBySlot[slotKey('enemy', idx)]">
                  {{ recentDamageBySlot[slotKey("enemy", idx)] }}
                </div>
              </div>
            </div>
          </div>
        </div>
        <p class="slot-title" v-if="activeCombatLine">Replay: {{ activeCombatLine }}</p>
      </section>

      <aside class="sidebar">
        <h3>Players</h3>
        <ul>
          <li v-for="p in state.players" :key="p.playerId">
            {{ p.name }} - HP {{ p.health }} - {{ p.hero ? p.hero.name : "No Hero" }} - {{ p.ready ? "Ready" : "Thinking" }}
            <button v-if="isLobby && isCreator && p.playerId !== me.playerId" @click="kickPlayer(p.playerId)">Kick</button>
          </li>
        </ul>

        <h3>Combat Log</h3>
        <div class="log">
          <div v-for="(line, idx) in state.combatLog" :key="idx">
            {{ line }}
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

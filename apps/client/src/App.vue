<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import type { ClientIntent, MatchPublicState, ServerMessage, UnitInstance } from "@runebrawl/shared";

const name = ref("");
const connected = ref(false);
const error = ref("");
const state = ref<MatchPublicState | null>(null);
const ws = ref<WebSocket | null>(null);
const nowTs = ref(Date.now());
let clock: number | null = null;

const dragging = ref<{ zone: "bench" | "board"; index: number } | null>(null);

const me = computed(() => {
  if (!state.value?.yourPlayerId) return null;
  return state.value.players.find((p) => p.playerId === state.value?.yourPlayerId) ?? null;
});

const isBuyPhase = computed(() => state.value?.phase === "TAVERN" || state.value?.phase === "POSITIONING");
const secondsLeft = computed(() => {
  if (!state.value) return 0;
  const delta = Math.max(0, state.value.phaseEndsAt - nowTs.value);
  return Math.ceil(delta / 1000);
});

function connect(): void {
  if (!name.value.trim()) {
    error.value = "Enter a name first.";
    return;
  }
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  const socket = new WebSocket(`${protocol}://${location.hostname}:3001/ws`);
  ws.value = socket;

  socket.onopen = () => {
    connected.value = true;
    send({ type: "JOIN_MATCH", name: name.value.trim() });
  };

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data as string) as ServerMessage;
    if (message.type === "ERROR") {
      error.value = message.message;
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

onBeforeUnmount(() => {
  if (clock !== null) window.clearInterval(clock);
  ws.value?.close();
});

onMounted(() => {
  clock = window.setInterval(() => {
    nowTs.value = Date.now();
  }, 250);
});
</script>

<template>
  <div class="app">
    <header class="header">
      <h1>Runebrawl MVP</h1>
      <div v-if="state" class="round">
        Round {{ state.round }} | Phase: {{ state.phase }} | {{ secondsLeft }}s
      </div>
    </header>

    <div v-if="!connected" class="join-card">
      <input v-model="name" placeholder="Your name" />
      <button @click="connect">Join Match</button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="state && me" class="layout">
      <section class="tavern">
        <h2>Tavern / Shop</h2>
        <div class="stats">
          <span>Gold: {{ me.gold }}</span>
          <span>Health: {{ me.health }}</span>
          <span>Tier: {{ me.tavernTier }}</span>
          <span>XP: {{ me.xp }}</span>
        </div>
        <div class="shop-row">
          <div v-for="(unit, idx) in me.shop" :key="idx" class="shop-card">
            <div class="unit-name">{{ unit?.name ?? "Sold out" }}</div>
            <div v-if="unit" class="unit-meta">
              {{ unit.role }} | {{ unit.attack }}/{{ unit.hp }} | SPD {{ unit.speed }}
            </div>
            <button :disabled="!isBuyPhase || !unit" @click="buy(idx)">Buy (3)</button>
          </div>
        </div>
        <div class="actions">
          <button :disabled="!isBuyPhase" @click="reroll">Reroll (1)</button>
          <button :disabled="!isBuyPhase" @click="upgrade">Upgrade Tavern</button>
          <button :disabled="!isBuyPhase" @click="lockToggle">
            {{ me.lockedShop ? "Unlock Shop" : "Lock Shop" }}
          </button>
          <button :disabled="!isBuyPhase || me.ready" @click="ready">Ready</button>
        </div>
      </section>

      <section class="board">
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

      <aside class="sidebar">
        <h3>Players</h3>
        <ul>
          <li v-for="p in state.players" :key="p.playerId">
            {{ p.name }} - HP {{ p.health }} - {{ p.ready ? "Ready" : "Thinking" }}
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

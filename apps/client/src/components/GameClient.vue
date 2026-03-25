<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type {
  AbilityKey,
  ClientIntent,
  CombatReplayEvent,
  ErrorCode,
  LobbySummary,
  MatchPublicState,
  ServerMessage,
  SynergyKey,
  UnitDefinition,
  UnitInstance,
  UnitRole
} from "@runebrawl/shared";
import roleTankIcon from "../assets/icons/role-tank.svg";
import roleMeleeIcon from "../assets/icons/role-melee.svg";
import roleRangedIcon from "../assets/icons/role-ranged.svg";
import roleSupportIcon from "../assets/icons/role-support.svg";
import abilityTauntIcon from "../assets/icons/ability-taunt.svg";
import abilityDeathBurstIcon from "../assets/icons/ability-death-burst.svg";
import abilityBloodlustIcon from "../assets/icons/ability-bloodlust.svg";
import abilityLifestealIcon from "../assets/icons/ability-lifesteal.svg";
import abilityNoneIcon from "../assets/icons/ability-none.svg";
import statGoldIcon from "../assets/icons/stat-gold.svg";
import statHealthIcon from "../assets/icons/stat-health.svg";
import statPlayersIcon from "../assets/icons/stat-players.svg";
import playerHumanIcon from "../assets/icons/player-human.svg";
import playerBotIcon from "../assets/icons/player-bot.svg";
import { useI18n } from "../i18n/useI18n";

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
let combatPlaybackTimer: number | null = null;
let fadeCleanupTimer: number | null = null;
let combatPlaybackRunId = 0;

const dragging = ref<{ zone: "bench" | "board"; index: number } | null>(null);
const { t } = useI18n();

const ERROR_CODE_TO_KEY: Partial<Record<ErrorCode, string>> = {
  RECONNECT_FAILED: "error.RECONNECT_FAILED",
  JOIN_FIRST_REQUIRED: "error.JOIN_FIRST_REQUIRED",
  INVALID_MESSAGE_FORMAT: "error.INVALID_MESSAGE_FORMAT",
  PRIVATE_LOBBY_NOT_FOUND: "error.PRIVATE_LOBBY_NOT_FOUND",
  PRIVATE_LOBBY_NOT_JOINABLE: "error.PRIVATE_LOBBY_NOT_JOINABLE",
  LOBBY_NOT_JOINABLE: "error.LOBBY_NOT_JOINABLE",
  MATCH_NOT_JOINABLE: "error.MATCH_NOT_JOINABLE",
  PLAYER_KICKED_FROM_LOBBY: "error.PLAYER_KICKED_FROM_LOBBY"
};

function mapServerError(message: string, errorCode?: ErrorCode): string {
  if (errorCode) {
    const key = ERROR_CODE_TO_KEY[errorCode];
    if (key) return t(key);
  }
  return message;
}

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
      return t("game.lobby.waitReady", { ready: readyPlayersCount.value, total: activePlayersCount.value });
    }
    if (isCreator.value) {
      return t("game.lobby.creatorCanStart");
    }
    return t("game.lobby.waitLeader");
  }
  if (activePlayersCount.value >= state.value.maxPlayers) {
    return t("game.lobby.fullStarting");
  }
  return t("game.lobby.waitFull", { current: activePlayersCount.value, max: state.value.maxPlayers, seconds: secondsLeft.value });
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

type AnimationPhase = "IDLE" | "WINDUP" | "HIT" | "RECOVER" | "ABILITY" | "DEATH" | "CLEANUP" | "RESULT";
interface AnimationStep {
  phase: AnimationPhase;
  durationMs: number;
  applyEvent?: boolean;
}

const EVENT_ANIMATION_MAP: Record<CombatReplayEvent["type"], AnimationStep[]> = {
  ATTACK: [
    { phase: "WINDUP", durationMs: 100 },
    { phase: "HIT", durationMs: 150, applyEvent: true },
    { phase: "RECOVER", durationMs: 140 }
  ],
  ABILITY_TRIGGERED: [{ phase: "ABILITY", durationMs: 180, applyEvent: true }],
  UNIT_DIED: [
    { phase: "DEATH", durationMs: 250, applyEvent: true },
    { phase: "CLEANUP", durationMs: 120 }
  ],
  DUEL_RESULT: [{ phase: "RESULT", durationMs: 260, applyEvent: true }]
};

const combatReplayStep = ref(-1);
const activeAnimatedEvent = ref<CombatReplayEvent | null>(null);
const replayAnimationPhase = ref<AnimationPhase>("IDLE");

const activeCombatEvent = computed(() => activeAnimatedEvent.value);
const animationPhaseLabel = computed(() => {
  switch (replayAnimationPhase.value) {
    case "WINDUP":
      return t("anim.WINDUP");
    case "HIT":
      return t("anim.HIT");
    case "RECOVER":
      return t("anim.RECOVER");
    case "ABILITY":
      return t("anim.ABILITY");
    case "DEATH":
      return t("anim.DEATH");
    case "CLEANUP":
      return t("anim.CLEANUP");
    case "RESULT":
      return t("anim.RESULT");
    default:
      return "";
  }
});

const activeCombatLine = computed(() => {
  if (!activeCombatEvent.value) return "";
  const phase = animationPhaseLabel.value ? `${animationPhaseLabel.value}: ` : "";
  return `${phase}${activeCombatEvent.value.message}`;
});

const activeTargetLine = computed(() => {
  const event = activeCombatEvent.value;
  if (!event || event.type !== "ATTACK") return null;
  if (replayAnimationPhase.value !== "WINDUP" && replayAnimationPhase.value !== "HIT") return null;
  const source = event.sourceUnitName ?? t("game.unknown");
  const target = event.targetUnitName ?? t("game.unknown");
  return {
    source,
    target,
    isHit: replayAnimationPhase.value === "HIT"
  };
});

interface ReplayUnit extends UnitInstance {
  isDead?: boolean;
}

const replayMyBoard = ref<(ReplayUnit | null)[]>([]);
const replayEnemyBoard = ref<(ReplayUnit | null)[]>([]);
const recentDamageBySlot = ref<Record<string, string>>({});
const deadSlots = ref<Record<string, boolean>>({});
const replayDuelId = ref<string | null>(null);

const ABILITY_ICON_PATHS: Record<AbilityKey, string> = {
  NONE: abilityNoneIcon,
  TAUNT: abilityTauntIcon,
  DEATH_BURST: abilityDeathBurstIcon,
  BLOODLUST: abilityBloodlustIcon,
  LIFESTEAL: abilityLifestealIcon
};

function connect(): void {
  if (!name.value.trim() && !storedPlayerId.value) {
    error.value = t("game.error.enterName");
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
          error.value = t("game.error.inviteRequired");
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
      error.value = mapServerError(message.message, message.errorCode);
      if (message.errorCode === "RECONNECT_FAILED") {
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
    error.value = t("game.error.connectionFailed");
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
    error.value = t("game.error.enterName");
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
    if (message.type === "ERROR") error.value = mapServerError(message.message, message.errorCode);
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
  if (!unit) return t("game.empty");
  return `${unit.name} [${unit.attack}/${unit.hp}] L${unit.level}`;
}

function roleIconPath(role: UnitRole): string {
  switch (role) {
    case "Tank":
      return roleTankIcon;
    case "Melee":
      return roleMeleeIcon;
    case "Ranged":
      return roleRangedIcon;
    case "Support":
      return roleSupportIcon;
    default:
      return roleSupportIcon;
  }
}

function abilityIconPath(ability: AbilityKey): string {
  return ABILITY_ICON_PATHS[ability];
}

function abilityLabel(ability: AbilityKey): string {
  return t(`ability.${ability}.label`);
}

function abilityDescription(ability: AbilityKey): string {
  return t(`ability.${ability}.desc`);
}

function synergyLabel(synergy: SynergyKey): string {
  return t(`synergy.${synergy}.label`);
}

function synergyDescription(synergy: SynergyKey): string {
  return t(`synergy.${synergy}.desc`);
}

function isBotPlayerName(name: string): boolean {
  return name.startsWith("Bot-") || name.endsWith(" (Bot)");
}

function botDifficultyFromName(name: string): "EASY" | "NORMAL" | "HARD" | null {
  const match = name.match(/^Bot-(EASY|NORMAL|HARD)-/);
  if (!match) return null;
  return match[1] as "EASY" | "NORMAL" | "HARD";
}

function playerTypeIconPath(name: string): string {
  return isBotPlayerName(name) ? playerBotIcon : playerHumanIcon;
}

function playerTypeLabel(name: string): string {
  if (!isBotPlayerName(name)) return t("game.human");
  const difficulty = botDifficultyFromName(name);
  return difficulty ? t("game.botDiff", { difficulty }) : t("game.bot");
}

function displayPlayerName(name: string): string {
  const match = name.match(/^Bot-(?:EASY|NORMAL|HARD)-([a-zA-Z0-9]+)/);
  if (match) return `Bot ${match[1]}`;
  return name.replace(/\s+\(Bot\)$/, "");
}

function playerTypeBadgeClass(name: string): string {
  if (!isBotPlayerName(name)) return "badge-human";
  const difficulty = botDifficultyFromName(name);
  if (difficulty === "EASY") return "badge-bot-easy";
  if (difficulty === "HARD") return "badge-bot-hard";
  return "badge-bot-normal";
}

interface TriggerHintMeta {
  abilityKey?: AbilityKey;
  synergyKey?: SynergyKey;
}

const triggerHintByLogMessage = computed(() => {
  const buckets: Record<string, TriggerHintMeta[]> = {};
  for (const event of state.value?.combatEvents ?? []) {
    if (event.type !== "ABILITY_TRIGGERED" || (!event.abilityKey && !event.synergyKey)) continue;
    if (!buckets[event.message]) buckets[event.message] = [];
    buckets[event.message].push({ abilityKey: event.abilityKey, synergyKey: event.synergyKey });
  }
  return buckets;
});

const enrichedCombatLog = computed(() => {
  const lines = state.value?.combatLog ?? [];
  const consumedPerMessage: Record<string, number> = {};
  return lines.map((line) => {
    const bucket = triggerHintByLogMessage.value[line] ?? [];
    const offset = consumedPerMessage[line] ?? 0;
    consumedPerMessage[line] = offset + 1;
    const triggerMeta = bucket[offset] ?? null;
    if (!triggerMeta) {
      return { line, hint: "" };
    }
    if (triggerMeta.synergyKey) {
      return {
        line,
        hint: `${t("game.hint")}: ${synergyLabel(triggerMeta.synergyKey)} - ${synergyDescription(triggerMeta.synergyKey)}`
      };
    }
    const ability = triggerMeta.abilityKey;
    if (!ability) return { line, hint: "" };
    return {
      line,
      hint: `${t("game.hint")}: ${abilityLabel(ability)} - ${abilityDescription(ability)}`
    };
  });
});

function unitTierClass(unit: UnitDefinition | null): string {
  if (!unit) return "";
  if (unit.tier <= 2) return "tier-low";
  if (unit.tier <= 4) return "tier-mid";
  return "tier-high";
}

function unitQuickMeta(unit: UnitInstance | null): string {
  if (!unit) return t("game.empty");
  return `${unit.name} [${unit.attack}/${unit.hp}]`;
}

function unitLabelReplay(unit: ReplayUnit | null): string {
  if (!unit) return t("game.empty");
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

function phaseLabel(phase: string): string {
  return t(`phase.${phase}`);
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
  activeAnimatedEvent.value = null;
  replayAnimationPhase.value = "IDLE";
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
  if (replayAnimationPhase.value === "WINDUP" && isAttacker) return "pulse-windup";
  if (replayAnimationPhase.value === "HIT" && isAttacker) return "pulse-attack";
  if (replayAnimationPhase.value === "HIT" && isDefender) return "pulse-hit";
  if (replayAnimationPhase.value === "RECOVER" && isAttacker) return "pulse-recover";
  return "";
}

function slotAnimationClass(side: "me" | "enemy", idx: number): string {
  return deadSlots.value[slotKey(side, idx)] ? "dead-fade" : "";
}

function clearCombatPlaybackTimer(): void {
  if (combatPlaybackTimer !== null) {
    window.clearTimeout(combatPlaybackTimer);
    combatPlaybackTimer = null;
  }
}

function stopCombatPlayback(): void {
  combatPlaybackRunId += 1;
  clearCombatPlaybackTimer();
  replayAnimationPhase.value = "IDLE";
  activeAnimatedEvent.value = null;
}

function playAnimationSteps(
  event: CombatReplayEvent,
  steps: AnimationStep[],
  stepIndex: number,
  runId: number,
  onDone: () => void
): void {
  if (runId !== combatPlaybackRunId) return;
  if (stepIndex >= steps.length) {
    onDone();
    return;
  }
  const step = steps[stepIndex];
  replayAnimationPhase.value = step.phase;
  if (step.applyEvent) {
    applyCombatEvent(event);
  }
  combatPlaybackTimer = window.setTimeout(() => {
    playAnimationSteps(event, steps, stepIndex + 1, runId, onDone);
  }, step.durationMs);
}

function playCombatQueue(nextIndex: number, runId: number): void {
  if (runId !== combatPlaybackRunId) return;
  const next = nextIndex + 1;
  if (next >= myCombatEvents.value.length) {
    replayAnimationPhase.value = "IDLE";
    clearCombatPlaybackTimer();
    return;
  }
  const event = myCombatEvents.value[next];
  combatReplayStep.value = next;
  activeAnimatedEvent.value = event;
  const steps = EVENT_ANIMATION_MAP[event.type] ?? [{ phase: "RESULT", durationMs: 200, applyEvent: true }];
  playAnimationSteps(event, steps, 0, runId, () => playCombatQueue(next, runId));
}

function startCombatPlayback(): void {
  stopCombatPlayback();
  combatReplayStep.value = -1;
  const runId = combatPlaybackRunId;
  playCombatQueue(-1, runId);
}

const replaySignature = computed(() => {
  if (!isCombatView.value || myCombatEvents.value.length === 0) return "";
  const duelId = myCombatEvents.value[0].duelId;
  return `${duelId}:${myCombatEvents.value.length}`;
});

watch(
  () => replaySignature.value,
  (signature) => {
    if (!signature) {
      stopCombatPlayback();
      return;
    }
    const duelId = myCombatEvents.value[0]?.duelId;
    if (!duelId) return;
    replayDuelId.value = duelId;
    initializeReplayBoards();
    startCombatPlayback();
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  if (clock !== null) window.clearInterval(clock);
  stopCombatPlayback();
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
      <h1>{{ t("game.title") }}</h1>
      <div v-if="state" class="round">
        {{ t("game.matchHeader", { matchId: state.matchId, round: state.round, phase: phaseLabel(state.phase), sequence: state.sequence, seconds: secondsLeft }) }}
      </div>
    </header>

    <div v-if="!connected" class="join-card">
      <select v-model="joinMode">
        <option value="quick">{{ t("game.join.quick") }}</option>
        <option value="createPrivate">{{ t("game.join.createPrivate") }}</option>
        <option value="joinPrivate">{{ t("game.join.joinPrivate") }}</option>
      </select>
      <input v-model="name" :placeholder="t('game.join.yourName')" />
      <input
        v-if="joinMode !== 'joinPrivate'"
        v-model="region"
        :placeholder="t('game.join.regionPlaceholder')"
      />
      <input
        v-if="joinMode !== 'joinPrivate'"
        v-model.number="mmr"
        type="number"
        min="1"
        :placeholder="t('game.join.mmr')"
      />
      <input
        v-if="joinMode === 'joinPrivate'"
        v-model="inviteCodeInput"
        :placeholder="t('game.join.inviteCode')"
      />
      <input
        v-if="joinMode === 'createPrivate'"
        v-model.number="privateMaxPlayers"
        type="number"
        min="2"
        max="8"
        :placeholder="t('game.join.maxPlayers')"
      />
      <button @click="connect">{{ storedPlayerId && storedMatchId ? t("game.join.reconnect") : t("game.join.enterLobby") }}</button>
      <button @click="loadOpenLobbies">{{ t("game.join.refreshLobbies") }}</button>
    </div>

    <div v-if="!connected && openLobbies.length > 0" class="join-card">
      <select v-model="selectedOpenLobby">
        <option value="">{{ t("game.join.openLobbyPlaceholder") }}</option>
        <option v-for="lobby in openLobbies" :key="lobby.matchId" :value="lobby.matchId">
          {{ lobby.matchId }} | {{ lobby.currentPlayers }}/{{ lobby.maxPlayers }} | {{ lobby.region }} | {{ lobby.mmrBucket }}
        </option>
      </select>
      <button @click="joinSelectedOpenLobby">{{ t("game.join.selectedLobby") }}</button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="state && me" class="layout">
      <section class="tavern">
        <h2>{{ t("game.tavernShop") }}</h2>
        <div v-if="state" class="stats">
          <span class="stat-pill">
            <img class="chip-icon" :src="statPlayersIcon" alt="" />
            {{ t("game.players") }}: {{ state.players.length }} / {{ state.maxPlayers }}
          </span>
          <span v-if="state.isPrivate && state.inviteCode">{{ t("game.code") }}: {{ state.inviteCode }}</span>
        </div>
        <p v-if="isLobby" class="slot-title">{{ lobbyStatusText }}</p>
        <p v-if="isHeroSelection && !me.heroSelected" class="slot-title">{{ t("game.chooseHero") }}</p>
        <p v-if="isHeroSelection && me.heroSelected && me.hero" class="slot-title">
          {{ t("game.heroLocked", { hero: me.hero.name }) }}
        </p>
        <div class="stats">
          <span class="stat-pill">
            <img class="chip-icon" :src="statGoldIcon" alt="" />
            {{ t("game.gold") }}: {{ me.gold }}
          </span>
          <span class="stat-pill">
            <img class="chip-icon" :src="statHealthIcon" alt="" />
            {{ t("game.health") }}: {{ me.health }}
          </span>
          <span>{{ t("game.tier") }}: {{ me.tavernTier }}</span>
          <span>{{ t("game.xp") }}: {{ me.xp }}</span>
        </div>
        <div v-if="isHeroSelection" class="shop-row">
          <div v-for="hero in me.heroOptions" :key="hero.id" class="shop-card">
            <div class="unit-name">{{ hero.name }}</div>
            <div class="unit-meta">{{ hero.description }}</div>
            <button :disabled="me.heroSelected" @click="selectHero(hero.id)">
              {{ me.heroSelected ? t("game.heroSelected") : t("game.selectHero") }}
            </button>
          </div>
        </div>
        <div v-if="!isHeroSelection" class="shop-row">
          <div v-for="(unit, idx) in me.shop" :key="idx" class="shop-card" :class="unitTierClass(unit)">
            <div class="unit-name" v-if="unit">
              <img class="unit-icon" :src="roleIconPath(unit.role)" alt="" />
              <span>{{ unit.name }}</span>
            </div>
            <div class="unit-name" v-else>{{ t("game.soldOut") }}</div>
            <div v-if="unit" class="unit-meta">
              <span class="meta-chip">T{{ unit.tier }}</span>
              <span class="meta-chip">
                <img class="chip-icon" :src="roleIconPath(unit.role)" alt="" />
                {{ unit.role }}
              </span>
              <span class="meta-chip" :title="`${abilityLabel(unit.ability)}: ${abilityDescription(unit.ability)}`">
                <img class="chip-icon" :src="abilityIconPath(unit.ability)" alt="" />
                {{ abilityLabel(unit.ability) }}
              </span>
              <span
                v-for="tag in unit.tags ?? []"
                :key="`shop-tag-${unit.id}-${tag}`"
                class="meta-chip tag-chip"
                :title="`${synergyLabel(tag)}: ${synergyDescription(tag)}`"
              >
                {{ synergyLabel(tag) }}
              </span>
              <div class="unit-meta-line">{{ t("game.unitMeta", { attack: unit.attack, hp: unit.hp, speed: unit.speed }) }}</div>
            </div>
            <button :disabled="!isBuyPhase || !unit" @click="buy(idx)">{{ t("game.buy3") }}</button>
          </div>
        </div>
        <div v-if="me.hero" class="slot-title">
          {{ t("game.heroLine", { name: me.hero.name, description: me.hero.description }) }}
        </div>
        <div class="actions">
          <button v-if="isLobby && isCreator" @click="addBotToLobby">{{ t("game.addBot") }}</button>
          <button v-if="isPrivateLobby && isCreator" @click="forceStartLobby">{{ t("game.forceStart") }}</button>
          <button v-if="isPrivateLobby" @click="readyLobbyToggle">{{ me.ready ? t("game.unreadyLobby") : t("game.readyLobby") }}</button>
          <button
            v-if="me.hero && me.hero.powerType === 'ACTIVE'"
            :disabled="!isBuyPhase || me.heroPowerUsedThisTurn || me.gold < me.hero.powerCost"
            @click="useHeroPower"
          >
            {{ t("game.heroPower", { cost: me.hero.powerCost }) }} {{ me.heroPowerUsedThisTurn ? t("game.heroPowerUsed") : "" }}
          </button>
          <button :disabled="!isBuyPhase" @click="reroll">{{ t("game.reroll1") }}</button>
          <button :disabled="!isBuyPhase" @click="upgrade">{{ t("game.upgradeTavern") }}</button>
          <button :disabled="!isBuyPhase" @click="lockToggle">
            {{ me.lockedShop ? t("game.unlockShop") : t("game.lockShop") }}
          </button>
          <button :disabled="!isBuyPhase || me.ready" @click="ready">{{ t("game.ready") }}</button>
        </div>
      </section>

      <section v-if="!isCombatView" class="board">
        <h2>{{ t("game.battlefield") }}</h2>
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
            <div class="slot-title">{{ t("game.boardSlot", { index: idx + 1 }) }}</div>
            <div class="slot-unit">{{ unitQuickMeta(unit) }}</div>
            <div
              v-if="unit"
              class="slot-mini-meta"
              :title="`${abilityLabel(unit.ability)}: ${abilityDescription(unit.ability)}`"
            >
              <img class="chip-icon" :src="abilityIconPath(unit.ability)" alt="" />
              {{ abilityLabel(unit.ability) }}
            </div>
            <div v-if="unit && (unit.tags?.length ?? 0) > 0" class="slot-mini-meta">
              {{ (unit.tags ?? []).map((t) => synergyLabel(t)).join(" • ") }}
            </div>
            <button v-if="unit && isBuyPhase" @click="sell('board', idx)">{{ t("game.sell1") }}</button>
          </div>
        </div>

        <h2>{{ t("game.bench") }}</h2>
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
            <div class="slot-title">{{ t("game.benchSlot", { index: idx + 1 }) }}</div>
            <div class="slot-unit">{{ unitQuickMeta(unit) }}</div>
            <div
              v-if="unit"
              class="slot-mini-meta"
              :title="`${abilityLabel(unit.ability)}: ${abilityDescription(unit.ability)}`"
            >
              <img class="chip-icon" :src="abilityIconPath(unit.ability)" alt="" />
              {{ abilityLabel(unit.ability) }}
            </div>
            <div v-if="unit && (unit.tags?.length ?? 0) > 0" class="slot-mini-meta">
              {{ (unit.tags ?? []).map((t) => synergyLabel(t)).join(" • ") }}
            </div>
            <button v-if="unit && isBuyPhase" @click="sell('bench', idx)">{{ t("game.sell1") }}</button>
          </div>
        </div>
      </section>
      <section v-else class="board combat-board">
        <h2>{{ t("game.combatView") }}</h2>
        <div class="combat-subtitle">
          <span v-if="myDuelMeta">{{ myDuelMeta.meName }} {{ t("game.vs") }} {{ myDuelMeta.opponentName }}</span>
          <span v-else>{{ t("game.waitingDuel") }}</span>
        </div>
        <div v-if="activeTargetLine" class="target-line" :class="{ hit: activeTargetLine.isHit }">
          <span class="target-name">{{ activeTargetLine.source }}</span>
          <span class="target-arrow">→</span>
          <span class="target-name">{{ activeTargetLine.target }}</span>
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
                <div class="slot-title">{{ t("game.slot", { index: idx + 1 }) }}</div>
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
                <div class="slot-title">{{ t("game.slot", { index: idx + 1 }) }}</div>
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
        <p class="slot-title" v-if="activeCombatLine">{{ t("game.replay") }}: {{ activeCombatLine }}</p>
      </section>

      <aside class="sidebar">
        <h3>{{ t("game.players") }}</h3>
        <ul>
          <li v-for="p in state.players" :key="p.playerId">
            <img class="chip-icon" :src="playerTypeIconPath(p.name)" alt="" />
            {{ displayPlayerName(p.name) }} - <span class="player-badge" :class="playerTypeBadgeClass(p.name)">{{ playerTypeLabel(p.name) }}</span> -
            <img class="chip-icon" :src="statHealthIcon" alt="" /> {{ p.health }} {{ t("game.hpShort") }} -
            {{ p.hero ? p.hero.name : t("game.noHero") }} - {{ p.ready ? t("game.ready") : t("game.thinking") }}
            <button v-if="isLobby && isCreator && p.playerId !== me.playerId" @click="kickPlayer(p.playerId)">{{ t("game.kick") }}</button>
          </li>
        </ul>

        <h3>{{ t("game.combatLog") }}</h3>
        <div class="log">
          <div v-for="(entry, idx) in enrichedCombatLog" :key="idx" class="log-entry">
            <div>{{ entry.line }}</div>
            <div v-if="entry.hint" class="log-hint">{{ entry.hint }}</div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

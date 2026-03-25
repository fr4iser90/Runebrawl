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
import { heroPortraitPath, unitPortraitPath } from "../assets/portraits/loader";
import { useI18n } from "../i18n/useI18n";
import MenuScreen from "./game/MenuScreen.vue";
import RecruitmentHallView from "./game/RecruitmentHallView.vue";
import HeroSelectionView from "./game/HeroSelectionView.vue";
import LobbyView from "./game/LobbyView.vue";
import SettingsModal from "./game/SettingsModal.vue";
import BoardBenchView from "./game/BoardBenchView.vue";
import CombatView from "./game/CombatView.vue";
import RoundResultOverlay from "./game/RoundResultOverlay.vue";
import MatchEndView from "./game/MatchEndView.vue";
import PlayersSidebar from "./game/PlayersSidebar.vue";

const name = ref("");
const connected = ref(false);
const error = ref("");
const state = ref<MatchPublicState | null>(null);
const ws = ref<WebSocket | null>(null);
const nowTs = ref(Date.now());
const storedPlayerId = ref<string | null>(localStorage.getItem("runebrawl.playerId"));
const storedMatchId = ref<string | null>(localStorage.getItem("runebrawl.matchId"));
const storedAccountId = ref<string | null>(localStorage.getItem("runebrawl.accountId"));
const joinMode = ref<"quick" | "createPrivate" | "joinPrivate">("quick");
const inviteCodeInput = ref("");
const privateMaxPlayers = ref(4);
const region = ref("EU");
const mmr = ref(1000);
const openLobbies = ref<LobbySummary[]>([]);
const selectedOpenLobby = ref("");
const animatingShopIndex = ref<number | null>(null);
const showSettings = ref(false);
const animationSpeed = ref<"slow" | "normal" | "fast">(
  (localStorage.getItem("runebrawl.ui.animationSpeed") as "slow" | "normal" | "fast" | null) ?? "normal"
);
const reducedMotion = ref(localStorage.getItem("runebrawl.ui.reducedMotion") === "1");
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

function ensureAccountId(): string {
  if (storedAccountId.value && storedAccountId.value.trim()) {
    return storedAccountId.value;
  }
  const generated =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `acct-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  storedAccountId.value = generated;
  localStorage.setItem("runebrawl.accountId", generated);
  return generated;
}

async function ensurePlayerSession(): Promise<string> {
  const localAccountId = ensureAccountId();
  try {
    const response = await fetch(`http://${location.hostname}:3001/auth/player/session`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ accountId: localAccountId })
    });
    if (!response.ok) {
      return localAccountId;
    }
    const payload = (await response.json()) as { accountId?: string };
    const resolved = payload.accountId?.trim() || localAccountId;
    storedAccountId.value = resolved;
    localStorage.setItem("runebrawl.accountId", resolved);
    return resolved;
  } catch {
    return localAccountId;
  }
}

const me = computed(() => {
  if (!state.value?.yourPlayerId) return null;
  return state.value.players.find((p) => p.playerId === state.value?.yourPlayerId) ?? null;
});

const isBuyPhase = computed(() => state.value?.phase === "TAVERN" || state.value?.phase === "POSITIONING");
const isLobby = computed(() => state.value?.phase === "LOBBY");
const isHeroSelection = computed(() => state.value?.phase === "HERO_SELECTION");
const isRoundEnd = computed(() => state.value?.phase === "ROUND_END");
const isFinished = computed(() => state.value?.phase === "FINISHED");
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

const hasNoDuelThisRound = computed(() => {
  if (!state.value) return false;
  if (!isCombatView.value) return false;
  return (state.value.phase === "COMBAT" || state.value.phase === "ROUND_END") && myCombatEvents.value.length === 0;
});

const myDuelResultEvent = computed<CombatReplayEvent | null>(() => {
  for (let idx = myCombatEvents.value.length - 1; idx >= 0; idx -= 1) {
    const event = myCombatEvents.value[idx];
    if (event.type === "DUEL_RESULT") return event;
  }
  return null;
});

const parsedRoundResult = computed(() => {
  const rawMessage = myDuelResultEvent.value?.message ?? "";
  const meName = me.value?.name ?? "";
  const match = rawMessage.match(/^(.*) wins and deals (\d+) damage to (.*)\.$/);
  if (!match) {
    if (rawMessage.toLowerCase().startsWith("draw round")) {
      return {
        tone: "draw" as const,
        label: t("game.roundResult.draw"),
        summary: t("game.roundResult.summaryDraw"),
        detail: rawMessage
      };
    }
    return {
      tone: "neutral" as const,
      label: t("game.roundResult.pending"),
      summary: rawMessage || t("game.roundResult.summaryPending"),
      detail: rawMessage
    };
  }

  const winner = match[1]?.trim();
  const damage = Number.parseInt(match[2] ?? "0", 10) || 0;
  const loser = match[3]?.trim();
  if (winner === meName) {
    return {
      tone: "win" as const,
      label: t("game.roundResult.win"),
      summary: t("game.roundResult.summaryWin", { damage })
    };
  }
  if (loser === meName) {
    return {
      tone: "loss" as const,
      label: t("game.roundResult.loss"),
      summary: t("game.roundResult.summaryLoss", { damage })
    };
  }
  return {
    tone: "neutral" as const,
    label: t("game.roundResult.pending"),
    summary: rawMessage || t("game.roundResult.summaryPending"),
    detail: rawMessage
  };
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

async function connect(): Promise<void> {
  if (!name.value.trim() && !storedPlayerId.value) {
    error.value = t("game.error.enterName");
    return;
  }
  const sessionAccountId = await ensurePlayerSession();
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
        accountId: sessionAccountId,
        name: name.value.trim() || undefined
      });
    } else {
      if (joinMode.value === "createPrivate") {
        const maxPlayers = Number.isFinite(privateMaxPlayers.value) ? Math.max(2, Math.min(8, privateMaxPlayers.value)) : 4;
        send({
          type: "CREATE_PRIVATE_MATCH",
          name: name.value.trim(),
          accountId: sessionAccountId,
          maxPlayers,
          region: region.value,
          mmr: mmr.value
        });
      } else if (joinMode.value === "joinPrivate") {
        if (!inviteCodeInput.value.trim()) {
          error.value = t("game.error.inviteRequired");
          socket.close();
          return;
        }
        send({
          type: "JOIN_PRIVATE_MATCH",
          name: name.value.trim(),
          accountId: sessionAccountId,
          inviteCode: inviteCodeInput.value.trim().toUpperCase()
        });
      } else {
        send({ type: "QUICK_MATCH", name: name.value.trim(), accountId: sessionAccountId, region: region.value, mmr: mmr.value });
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

function resetActiveSession(): void {
  storedPlayerId.value = null;
  storedMatchId.value = null;
  localStorage.removeItem("runebrawl.playerId");
  localStorage.removeItem("runebrawl.matchId");
  state.value = null;
  connected.value = false;
  ws.value?.close();
  ws.value = null;
}

function backToMenu(): void {
  resetActiveSession();
}

async function playAgain(): Promise<void> {
  const fallbackName = name.value.trim() || me.value?.name || "";
  name.value = fallbackName;
  error.value = "";
  joinMode.value = "quick";
  resetActiveSession();
  if (!name.value.trim()) {
    error.value = t("game.error.enterName");
    return;
  }
  await connect();
}

function buy(shopIndex: number): void {
  animatingShopIndex.value = shopIndex;
  window.setTimeout(() => {
    if (animatingShopIndex.value === shopIndex) {
      animatingShopIndex.value = null;
    }
  }, 260);
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

async function joinOpenLobby(matchId: string): Promise<void> {
  if (!name.value.trim()) {
    error.value = t("game.error.enterName");
    return;
  }
  const sessionAccountId = await ensurePlayerSession();
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  const socket = new WebSocket(`${protocol}://${location.hostname}:3001/ws`);
  ws.value = socket;
  socket.onopen = () => {
    connected.value = true;
    send({ type: "JOIN_LOBBY", name: name.value.trim(), accountId: sessionAccountId, matchId });
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
  void joinOpenLobby(selectedOpenLobby.value);
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

function animationSpeedMultiplier(): number {
  if (reducedMotion.value) return 0.65;
  if (animationSpeed.value === "slow") return 1.25;
  if (animationSpeed.value === "fast") return 0.8;
  return 1;
}

function animationDurationMs(baseMs: number): number {
  return Math.max(60, Math.round(baseMs * animationSpeedMultiplier()));
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

function slotHitClass(side: "me" | "enemy", idx: number): string {
  return recentDamageBySlot.value[slotKey(side, idx)] ? "slot-hit-shake" : "";
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
  }, animationDurationMs(step.durationMs));
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

watch(animationSpeed, (next) => {
  localStorage.setItem("runebrawl.ui.animationSpeed", next);
});

watch(reducedMotion, (next) => {
  localStorage.setItem("runebrawl.ui.reducedMotion", next ? "1" : "0");
});

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
    void connect();
  } else {
    void loadOpenLobbies();
  }
});
</script>

<template>
  <div class="app">
    <header class="header">
      <h1>{{ t("game.title") }}</h1>
      <div class="actions">
        <div v-if="state" class="round">
          {{ t("game.matchHeader", { matchId: state.matchId, round: state.round, phase: phaseLabel(state.phase), sequence: state.sequence, seconds: secondsLeft }) }}
        </div>
        <button @click="showSettings = true">{{ t("game.settings.open") }}</button>
      </div>
    </header>

    <MenuScreen
      :connected="connected"
      :join-mode="joinMode"
      :name="name"
      :region="region"
      :mmr="mmr"
      :invite-code-input="inviteCodeInput"
      :private-max-players="privateMaxPlayers"
      :open-lobbies="openLobbies"
      :selected-open-lobby="selectedOpenLobby"
      :stored-player-id="storedPlayerId"
      :stored-match-id="storedMatchId"
      @update:join-mode="joinMode = $event"
      @update:name="name = $event"
      @update:region="region = $event"
      @update:mmr="mmr = $event"
      @update:invite-code-input="inviteCodeInput = $event"
      @update:private-max-players="privateMaxPlayers = $event"
      @update:selected-open-lobby="selectedOpenLobby = $event"
      @connect="connect"
      @refresh-lobbies="loadOpenLobbies"
      @join-selected-open-lobby="joinSelectedOpenLobby"
    />

    <p v-if="error" class="error">{{ error }}</p>

    <SettingsModal
      :visible="showSettings"
      :animation-speed="animationSpeed"
      :reduced-motion="reducedMotion"
      @close="showSettings = false"
      @update:animation-speed="animationSpeed = $event"
      @update:reduced-motion="reducedMotion = $event"
    />

    <div v-if="state && me" class="game-scene" :class="`scene-${state.phase.toLowerCase()}`">
      <div class="scene-backdrop" aria-hidden="true"></div>
      <div class="scene-vignette" aria-hidden="true"></div>
      <div class="scene-ornament scene-ornament-top" aria-hidden="true"></div>
      <div class="scene-ornament scene-ornament-bottom" aria-hidden="true"></div>
      <div class="scene-content">
        <Transition name="phase-screen" mode="out-in">
          <div :key="state.phase" class="phase-shell">
            <LobbyView
              v-if="isLobby"
              :state="state"
              :me="me"
              :is-creator="isCreator"
              :is-private-lobby="isPrivateLobby"
              :lobby-status-text="lobbyStatusText"
              :stat-players-icon="statPlayersIcon"
              :stat-health-icon="statHealthIcon"
              :player-type-icon-path="playerTypeIconPath"
              :display-player-name="displayPlayerName"
              :player-type-badge-class="playerTypeBadgeClass"
              :player-type-label="playerTypeLabel"
              @add-bot-to-lobby="addBotToLobby"
              @force-start-lobby="forceStartLobby"
              @ready-lobby-toggle="readyLobbyToggle"
              @kick-player="kickPlayer"
            />

            <HeroSelectionView
              v-else-if="isHeroSelection"
              :state="state"
              :me="me"
              :stat-players-icon="statPlayersIcon"
              :stat-gold-icon="statGoldIcon"
              :stat-health-icon="statHealthIcon"
              :hero-portrait-path="heroPortraitPath"
              @select-hero="selectHero"
            />

            <MatchEndView
              v-else-if="isFinished"
              :state="state"
              :me-player-id="me.playerId"
              @play-again="playAgain"
              @back-to-menu="backToMenu"
            />

            <div v-else class="layout" :class="[isCombatView ? 'layout-combat' : '', `phase-${state.phase.toLowerCase()}`]">
              <template v-if="isCombatView">
                <CombatView
                  :me="me"
                  :my-combat-opponent="myCombatOpponent"
                  :my-duel-meta="myDuelMeta"
                  :has-no-duel-this-round="hasNoDuelThisRound"
                  :active-target-line="activeTargetLine"
                  :active-combat-line="activeCombatLine"
                  :replay-my-board="replayMyBoard"
                  :replay-enemy-board="replayEnemyBoard"
                  :recent-damage-by-slot="recentDamageBySlot"
                  :unit-portrait-path="unitPortraitPath"
                  :unit-label-replay="unitLabelReplay"
                  :unit-hp-percent="unitHpPercent"
                  :unit-pulse-class="unitPulseClass"
                  :slot-animation-class="slotAnimationClass"
                  :slot-hit-class="slotHitClass"
                  :slot-key="slotKey"
                />
                <PlayersSidebar
                  :state="state"
                  :is-lobby="isLobby"
                  :is-creator="isCreator"
                  :me-player-id="me.playerId"
                  :enriched-combat-log="enrichedCombatLog"
                  :player-type-icon-path="playerTypeIconPath"
                  :display-player-name="displayPlayerName"
                  :player-type-badge-class="playerTypeBadgeClass"
                  :player-type-label="playerTypeLabel"
                  :stat-health-icon="statHealthIcon"
                  @kick-player="kickPlayer"
                />
              </template>
              <template v-else>
                <RecruitmentHallView
                  :state="state"
                  :me="me"
                  :is-lobby="isLobby"
                  :is-hero-selection="isHeroSelection"
                  :is-private-lobby="isPrivateLobby"
                  :is-creator="isCreator"
                  :is-buy-phase="isBuyPhase"
                  :lobby-status-text="lobbyStatusText"
                  :animating-shop-index="animatingShopIndex"
                  :stat-players-icon="statPlayersIcon"
                  :stat-gold-icon="statGoldIcon"
                  :stat-health-icon="statHealthIcon"
                  :unit-tier-class="unitTierClass"
                  :role-icon-path="roleIconPath"
                  :ability-icon-path="abilityIconPath"
                  :ability-label="abilityLabel"
                  :ability-description="abilityDescription"
                  :synergy-label="synergyLabel"
                  :synergy-description="synergyDescription"
                  :hero-portrait-path="heroPortraitPath"
                  :unit-portrait-path="unitPortraitPath"
                  @select-hero="selectHero"
                  @buy="buy"
                  @add-bot-to-lobby="addBotToLobby"
                  @force-start-lobby="forceStartLobby"
                  @ready-lobby-toggle="readyLobbyToggle"
                  @use-hero-power="useHeroPower"
                  @reroll="reroll"
                  @upgrade="upgrade"
                  @lock-toggle="lockToggle"
                  @ready="ready"
                />

                <BoardBenchView
                  :me="me"
                  :is-buy-phase="isBuyPhase"
                  :unit-portrait-path="unitPortraitPath"
                  :unit-quick-meta="unitQuickMeta"
                  :ability-label="abilityLabel"
                  :ability-description="abilityDescription"
                  :ability-icon-path="abilityIconPath"
                  :synergy-label="synergyLabel"
                  @sell="sell"
                  @dragstart="onDragStart"
                  @drop="onDrop"
                />

                <PlayersSidebar
                  :state="state"
                  :is-lobby="isLobby"
                  :is-creator="isCreator"
                  :me-player-id="me.playerId"
                  :enriched-combat-log="enrichedCombatLog"
                  :player-type-icon-path="playerTypeIconPath"
                  :display-player-name="displayPlayerName"
                  :player-type-badge-class="playerTypeBadgeClass"
                  :player-type-label="playerTypeLabel"
                  :stat-health-icon="statHealthIcon"
                  @kick-player="kickPlayer"
                />
              </template>
            </div>
          </div>
        </Transition>
      </div>
      <RoundResultOverlay
        v-if="isRoundEnd"
        :round="state.round"
        :result-label="parsedRoundResult.label"
        :summary="hasNoDuelThisRound ? t('game.roundResult.summaryNoDuel') : parsedRoundResult.summary"
        :detail="hasNoDuelThisRound ? '' : parsedRoundResult.detail ?? ''"
        :no-duel="hasNoDuelThisRound"
      />
    </div>
  </div>
</template>

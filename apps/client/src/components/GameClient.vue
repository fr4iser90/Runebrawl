<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type {
  AbilityKey,
  BotDifficulty,
  ClientIntent,
  CombatReplayEvent,
  ErrorCode,
  GamePhase,
  LobbySummary,
  MatchPublicState,
  ServerMessage,
  SynergyKey,
  UnitDefinition,
  UnitInstance,
  UnitRole
} from "@runebrawl/shared";
import roleTankIcon from "../assets/optimized/icons/role-tank.svg";
import roleMeleeIcon from "../assets/optimized/icons/role-melee.svg";
import roleRangedIcon from "../assets/optimized/icons/role-ranged.svg";
import roleSupportIcon from "../assets/optimized/icons/role-support.svg";
import abilityTauntIcon from "../assets/optimized/icons/ability-taunt.svg";
import abilityDeathBurstIcon from "../assets/optimized/icons/ability-death-burst.svg";
import abilityBloodlustIcon from "../assets/optimized/icons/ability-bloodlust.svg";
import abilityLifestealIcon from "../assets/optimized/icons/ability-lifesteal.svg";
import abilityNoneIcon from "../assets/optimized/icons/ability-none.svg";
import statGoldIcon from "../assets/optimized/icons/stat-gold.svg";
import statHealthIcon from "../assets/optimized/icons/stat-health.svg";
import statPlayersIcon from "../assets/optimized/icons/stat-players.svg";
import playerHumanIcon from "../assets/optimized/icons/player-human.svg";
import playerBotIcon from "../assets/optimized/icons/player-bot.svg";
import {
  heroPortraitBackplatePath,
  heroPortraitPath,
  unitPortraitBackplatePath,
  unitPortraitPath
} from "../assets/optimized/portraits/loader";
import { useI18n } from "../i18n/useI18n";
import MenuScreen from "./game/MenuScreen.vue";
import RecruitmentHallView from "./game/views/RecruitmentHallView.vue";
import HeroSelectionView from "./game/views/HeroSelectionView.vue";
import LobbyView from "./game/views/LobbyView.vue";
import SettingsModal from "./game/modals/SettingsModal.vue";
import BoardBenchView from "./game/BoardBenchView.vue";
import {
  attackArchetypeFromRole,
  resolveMagicSpellProjectileId,
  resolveReplayAbilitySlotClasses,
  resolveReplayAttackOverlayId,
  resolveReplayAttackSlotClasses,
  resolveReplayDeathSlotClasses,
  type CombatFxOverlayId,
  type MagicProjectileFlight,
  type RangedProjectileFlight
} from "./game/combat/combatFxRegistry";
import CombatView from "./game/views/CombatView.vue";
import RoundResultOverlay from "./game/overlays/RoundResultOverlay.vue";
import MatchEndView from "./game/views/MatchEndView.vue";
import PlayersSidebar from "./game/sidebar/PlayersSidebar.vue";
import TutorialOverlay from "./game/overlays/TutorialOverlay.vue";
import { applySceneTheme, getGameContentManifest } from "../content/gameContent";

const name = ref(localStorage.getItem("runebrawl.playerName") ?? "");
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
/** Used only when connecting (create private / solo practice); not shown in menu. */
const privateMaxPlayers = ref(4);
const DEFAULT_REGION = "EU";
const DEFAULT_MMR = 1000;
const openLobbies = ref<LobbySummary[]>([]);
const soloPracticeDifficulty = ref<BotDifficulty | null>(null);
const profileSyncState = ref<"idle" | "saving" | "saved" | "error">("idle");
const animatingShopIndex = ref<number | null>(null);
const showSettings = ref(false);
const animationSpeed = ref<"slow" | "normal" | "fast">(
  (localStorage.getItem("runebrawl.ui.animationSpeed") as "slow" | "normal" | "fast" | null) ?? "slow"
);
const reducedMotion = ref(localStorage.getItem("runebrawl.ui.reducedMotion") === "1");
type PerspectiveMode = "bottom_top" | "left_right" | "right_left" | "corner";
function normalizePerspectiveMode(raw: string | null): PerspectiveMode {
  if (raw === "left_right" || raw === "horizontal") return "left_right";
  if (raw === "right_left" || raw === "mirrored") return "right_left";
  if (raw === "corner" || raw === "corner_to_corner") return "corner";
  return "bottom_top";
}
const perspectiveMode = ref<PerspectiveMode>(normalizePerspectiveMode(localStorage.getItem("runebrawl.ui.perspectiveMode")));
const tutorialDismissed = ref(localStorage.getItem("runebrawl.tutorial.dismissed") === "1");
let clock: number | null = null;
let combatPlaybackTimer: number | null = null;
let fadeCleanupTimer: number | null = null;
let profileSyncTimer: number | null = null;
let combatPlaybackRunId = 0;

type DraggingState =
  | { kind: "shop"; shopIndex: number }
  | { kind: "unit"; zone: "bench" | "board"; index: number };
const dragging = ref<DraggingState | null>(null);
const { t, locale } = useI18n();

const uiThemeKey = ref(localStorage.getItem("runebrawl.ui.theme")?.trim() || getGameContentManifest().defaultThemeKey);

const themeSelectOptions = computed(() => {
  const m = getGameContentManifest();
  const loc = locale.value === "de" ? "de" : "en";
  return Object.values(m.themes).map((th) => ({
    value: th.id,
    label: th.label[loc] ?? th.label.en
  }));
});
const apiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || `http://${location.hostname}:3001`;
const wsUrl = (() => {
  const configured = (import.meta.env.VITE_WS_URL as string | undefined)?.trim();
  if (configured) return configured;
  try {
    const url = new URL(apiBaseUrl);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/ws";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    const protocol = location.protocol === "https:" ? "wss" : "ws";
    return `${protocol}://${location.hostname}:3001/ws`;
  }
})();

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
    const response = await fetch(`${apiBaseUrl}/auth/player/session`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ accountId: localAccountId, displayName: name.value.trim() || undefined })
    });
    if (!response.ok) {
      return localAccountId;
    }
    const payload = (await response.json()) as { accountId?: string; displayName?: string };
    const resolved = payload.accountId?.trim() || localAccountId;
    const resolvedDisplayName = payload.displayName?.trim() ?? "";
    storedAccountId.value = resolved;
    localStorage.setItem("runebrawl.accountId", resolved);
    if (!name.value.trim() && resolvedDisplayName) {
      name.value = resolvedDisplayName;
    }
    if (resolvedDisplayName) {
      profileSyncState.value = "saved";
    }
    return resolved;
  } catch {
    return localAccountId;
  }
}

async function syncPlayerProfile(force = false): Promise<void> {
  if (!name.value.trim()) return;
  if (!force && profileSyncState.value === "saving") return;
  profileSyncState.value = "saving";
  try {
    const response = await fetch(`${apiBaseUrl}/auth/player/profile`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ displayName: name.value.trim() })
    });
    profileSyncState.value = response.ok ? "saved" : "error";
  } catch {
    profileSyncState.value = "error";
  }
}

function saveProfileNow(): void {
  if (profileSyncTimer !== null) {
    window.clearTimeout(profileSyncTimer);
    profileSyncTimer = null;
  }
  void syncPlayerProfile(true);
}

const me = computed(() => {
  if (!state.value?.yourPlayerId) return null;
  return state.value.players.find((p) => p.playerId === state.value?.yourPlayerId) ?? null;
});
const heroPortraitUrl = computed(() => {
  if (!me.value?.hero?.id) return "";
  return heroPortraitPath(me.value.hero.id);
});
const heroAbilityLabel = computed(() => {
  const key = me.value?.hero?.powerKey;
  if (!key) return t("game.heroPower");
  return key.toLowerCase().replaceAll("_", " ");
});
const heroAbilityDescription = computed(() => me.value?.hero?.description ?? t("game.noAbility"));
const heroPassiveText = computed(() => (me.value?.hero?.powerType === "PASSIVE" ? heroAbilityLabel.value : "None"));
const heroActiveText = computed(() =>
  me.value?.hero?.powerType === "ACTIVE" ? `${heroAbilityLabel.value} (${me.value.hero.powerCost}g)` : "None"
);
const canUseTopHeroPower = computed(
  () =>
    !!me.value?.hero &&
    me.value.hero.powerType === "ACTIVE" &&
    isBuyPhase.value &&
    !me.value.heroPowerUsedThisTurn &&
    me.value.gold >= me.value.hero.powerCost
);
const topHeroPowerTitle = computed(() => {
  if (!me.value?.hero || me.value.hero.powerType !== "ACTIVE") return "No active hero power";
  if (!isBuyPhase.value) return "Only usable during tavern/positioning";
  if (me.value.heroPowerUsedThisTurn) return "Already used this turn";
  if (me.value.gold < me.value.hero.powerCost) return `Need ${me.value.hero.powerCost} gold`;
  return heroAbilityDescription.value;
});
const perspectiveLabel = computed(() => {
  if (perspectiveMode.value === "left_right") return "LEFT_RIGHT";
  if (perspectiveMode.value === "right_left") return "RIGHT_LEFT";
  if (perspectiveMode.value === "corner") return "CORNER";
  return "BOTTOM_TOP";
});

const isBuyPhase = computed(() => state.value?.phase === "TAVERN" || state.value?.phase === "POSITIONING");
const isLobby = computed(() => state.value?.phase === "LOBBY");
const isHeroSelection = computed(() => state.value?.phase === "HERO_SELECTION");
const isRoundEnd = computed(() => state.value?.phase === "ROUND_END");
const isFinished = computed(() => state.value?.phase === "FINISHED");
const meEliminated = computed(() => (me.value?.health ?? 1) <= 0);
type DuelMeta = {
  meIsA: boolean;
  meName: string;
  opponentName: string;
  opponentPlayerId: string;
};
type ReplaySideView = {
  name: string;
  board: (UnitInstance | null)[];
};
const replayEvents = ref<CombatReplayEvent[]>([]);
const replayDuelMetaSnapshot = ref<DuelMeta | null>(null);
const replayMeSnapshot = ref<ReplaySideView | null>(null);
const replayOpponentSnapshot = ref<ReplaySideView | null>(null);
const replayLockActive = ref(false);

const isCombatView = computed(() => {
  if (replayLockActive.value) return true;
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

const myDuelMeta = computed<DuelMeta | null>(() => {
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

const activeDuelMeta = computed<DuelMeta | null>(() => myDuelMeta.value ?? replayDuelMetaSnapshot.value);
const activeReplayEvents = computed<CombatReplayEvent[]>(() => (myCombatEvents.value.length > 0 ? myCombatEvents.value : replayEvents.value));

const myCombatOpponent = computed(() => {
  if (!state.value || !myDuelMeta.value) return null;
  return state.value.players.find((p) => p.playerId === myDuelMeta.value?.opponentPlayerId) ?? null;
});

const combatMeView = computed<ReplaySideView>(() => {
  if (replayLockActive.value && replayMeSnapshot.value) return replayMeSnapshot.value;
  return { name: me.value?.name ?? "", board: me.value?.board ?? [] };
});

const combatOpponentView = computed<ReplaySideView | null>(() => {
  if (replayLockActive.value && replayOpponentSnapshot.value) return replayOpponentSnapshot.value;
  if (!myCombatOpponent.value) return null;
  return { name: myCombatOpponent.value.name, board: myCombatOpponent.value.board };
});

const hasNoDuelThisRound = computed(() => {
  if (!state.value) return false;
  if (!isCombatView.value) return false;
  return (state.value.phase === "COMBAT" || state.value.phase === "ROUND_END") && myCombatEvents.value.length === 0;
});

type TutorialStepKey = "hero" | "buy" | "move" | "ready" | "watch";

const tutorialStepKey = computed<TutorialStepKey | null>(() => {
  if (!state.value || !me.value || tutorialDismissed.value) return null;
  if (state.value.phase === "FINISHED") return null;
  if (state.value.phase === "HERO_SELECTION" && !me.value.heroSelected) return "hero";

  if (state.value.phase === "TAVERN" || state.value.phase === "POSITIONING") {
    const hasBoardUnit = me.value.board.some((u) => !!u);
    const hasBenchUnit = me.value.bench.some((u) => !!u);
    const hasShopOffer = me.value.shop.some((u) => !!u);

    if (!hasBoardUnit && !hasBenchUnit && hasShopOffer) return "buy";
    if (!hasBoardUnit && hasBenchUnit) return "move";
    if (!me.value.ready) return "ready";
  }

  if (state.value.phase === "COMBAT" || state.value.phase === "ROUND_END") return "watch";
  return null;
});

const showTutorialOverlay = computed(() => !!tutorialStepKey.value);
const tutorialText = computed(() => (tutorialStepKey.value ? t(`game.tutorial.step.${tutorialStepKey.value}`) : ""));

const myDuelResultEvent = computed<CombatReplayEvent | null>(() => {
  for (let idx = activeReplayEvents.value.length - 1; idx >= 0; idx -= 1) {
    const event = activeReplayEvents.value[idx];
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
    { phase: "WINDUP", durationMs: 130 },
    { phase: "HIT", durationMs: 190, applyEvent: true },
    { phase: "RECOVER", durationMs: 175 }
  ],
  ABILITY_TRIGGERED: [{ phase: "ABILITY", durationMs: 230, applyEvent: true }],
  UNIT_DIED: [
    { phase: "DEATH", durationMs: 320, applyEvent: true },
    { phase: "CLEANUP", durationMs: 150 }
  ],
  DUEL_RESULT: [{ phase: "RESULT", durationMs: 320, applyEvent: true }]
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

interface ActiveAttackCue {
  attackerSide: "me" | "enemy";
  attackerSlot: number;
  targetSide: "me" | "enemy";
  targetSlot: number;
  isHit: boolean;
}

interface NextAttackCue {
  source: string;
  target: string;
  attackerSide: "me" | "enemy";
  attackerSlot: number;
  targetSide: "me" | "enemy";
  targetSlot: number;
  isCurrent: boolean;
}

const activeAttackCue = computed<ActiveAttackCue | null>(() => {
  const event = activeCombatEvent.value;
  if (!event || event.type !== "ATTACK") return null;
  if (replayAnimationPhase.value !== "WINDUP" && replayAnimationPhase.value !== "HIT") return null;
  if (
    event.sourceOwnerId === undefined ||
    event.targetOwnerId === undefined ||
    event.sourceSlotIndex === undefined ||
    event.targetSlotIndex === undefined
  ) {
    return null;
  }
  return {
    attackerSide: sideFromOwner(event.sourceOwnerId),
    attackerSlot: event.sourceSlotIndex,
    targetSide: sideFromOwner(event.targetOwnerId),
    targetSlot: event.targetSlotIndex,
    isHit: replayAnimationPhase.value === "HIT"
  };
});

const nextAttackQueue = computed<NextAttackCue[]>(() => {
  const out: NextAttackCue[] = [];
  const maxItems = 5;
  const pushAttack = (event: CombatReplayEvent, isCurrent: boolean): void => {
    if (event.type !== "ATTACK") return;
    if (
      event.sourceOwnerId === undefined ||
      event.targetOwnerId === undefined ||
      event.sourceSlotIndex === undefined ||
      event.targetSlotIndex === undefined
    ) {
      return;
    }
    out.push({
      source: event.sourceUnitName ?? t("game.unknown"),
      target: event.targetUnitName ?? t("game.unknown"),
      attackerSide: sideFromOwner(event.sourceOwnerId),
      attackerSlot: event.sourceSlotIndex,
      targetSide: sideFromOwner(event.targetOwnerId),
      targetSlot: event.targetSlotIndex,
      isCurrent
    });
  };

  if (activeCombatEvent.value?.type === "ATTACK" && out.length < maxItems) {
    pushAttack(activeCombatEvent.value, true);
  }

  const startIdx = Math.max(0, combatReplayStep.value + 1);
  for (let i = startIdx; i < activeReplayEvents.value.length && out.length < maxItems; i += 1) {
    const ev = activeReplayEvents.value[i];
    if (ev === activeCombatEvent.value) continue;
    pushAttack(ev, false);
  }

  return out;
});

interface ReplayUnit extends UnitInstance {
  isDead?: boolean;
}

const replayMyBoard = ref<(ReplayUnit | null)[]>([]);
const replayEnemyBoard = ref<(ReplayUnit | null)[]>([]);
const recentDamageBySlot = ref<Record<string, string>>({});
const deadSlots = ref<Record<string, boolean>>({});
const replayDuelId = ref<string | null>(null);
const devMockPhase = ref<GamePhase | null>(null);

const ABILITY_ICON_PATHS: Record<AbilityKey, string> = {
  NONE: abilityNoneIcon,
  TAUNT: abilityTauntIcon,
  DEATH_BURST: abilityDeathBurstIcon,
  BLOODLUST: abilityBloodlustIcon,
  LIFESTEAL: abilityLifestealIcon,
};

function mockUnit(seed: number, name: string, role: UnitRole, ability: AbilityKey): UnitInstance {
  return {
    instanceId: `mock-${seed}`,
    unitId: `mock_unit_${seed}`,
    level: 1,
    tier: 1,
    attack: 2 + (seed % 3),
    hp: 4 + (seed % 4),
    maxHp: 4 + (seed % 4),
    ability,
    role,
    name
  };
}

function clampMockCount(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(100, parsed));
}

function fillMockSlots(size: number, factory: (idx: number) => UnitInstance): (UnitInstance | null)[] {
  return Array.from({ length: size }, (_, idx) => factory(idx));
}

function buildMockState(
  phase: GamePhase,
  counts: { shopSlots: number; benchSlots: number; boardSlots: number } = { shopSlots: 3, benchSlots: 6, boardSlots: 6 }
): MatchPublicState {
  const now = Date.now();
  const meId = "mock-me";
  const enemyId = "mock-enemy";
  const meBoard = fillMockSlots(counts.boardSlots, (idx) =>
    mockUnit(100 + idx, idx % 2 === 0 ? "Stoneguard" : "Flame Archer", idx % 2 === 0 ? "Tank" : "Ranged", idx % 2 === 0 ? "TAUNT" : "BLOODLUST")
  );
  const enemyBoard = fillMockSlots(counts.boardSlots, (idx) =>
    mockUnit(200 + idx, idx % 2 === 0 ? "Bone Medic" : "Iron Ravager", idx % 2 === 0 ? "Support" : "Melee", idx % 2 === 0 ? "NONE" : "DEATH_BURST")
  );
  const mockUnitCatalog: UnitDefinition[] = [
    { id: "stone_guard", name: "Stone Guard", role: "Tank", tier: 1, attack: 2, hp: 8, ability: "TAUNT", shopWeight: 1 },
    { id: "alley_blade", name: "Alley Blade", role: "Melee", tier: 1, attack: 4, hp: 5, ability: "NONE", shopWeight: 1 },
    { id: "ember_archer", name: "Ember Archer", role: "Ranged", tier: 1, attack: 3, hp: 4, ability: "NONE", shopWeight: 1 },
    { id: "wild_shaman", name: "Wild Shaman", role: "Support", tier: 2, attack: 2, hp: 6, ability: "BLOODLUST", shopWeight: 1 },
    { id: "grave_imp", name: "Grave Imp", role: "Melee", tier: 2, attack: 5, hp: 5, ability: "DEATH_BURST", shopWeight: 1 },
    { id: "soul_reaver", name: "Soul Reaver", role: "Melee", tier: 2, attack: 4, hp: 6, ability: "LIFESTEAL", shopWeight: 1 },
    { id: "iron_bulwark", name: "Iron Bulwark", role: "Tank", tier: 3, attack: 4, hp: 11, ability: "TAUNT", shopWeight: 1 },
    { id: "sky_sniper", name: "Sky Sniper", role: "Ranged", tier: 3, attack: 6, hp: 5, ability: "NONE", shopWeight: 1 },
    { id: "war_drummer", name: "War Drummer", role: "Support", tier: 4, attack: 4, hp: 8, ability: "BLOODLUST", shopWeight: 1 }
  ];
  const mockShop: (UnitDefinition | null)[] = Array.from({ length: counts.shopSlots }, (_, idx) => {
    const source = mockUnitCatalog[idx % mockUnitCatalog.length];
    const tier = Math.min(6, source.tier + Math.floor(idx / mockUnitCatalog.length) % 3);
    return {
      ...source,
      id: source.id,
      name: `${source.name} ${idx + 1}`,
      tier,
      attack: source.attack + (idx % 2),
      hp: source.hp + (idx % 3),
      shopWeight: 1
    };
  });

  const combatEvents: CombatReplayEvent[] =
    phase === "COMBAT" || phase === "ROUND_END"
      ? [
          {
            round: 4,
            duelId: "mock-duel-1",
            aPlayerId: meId,
            aPlayerName: "You",
            bPlayerId: enemyId,
            bPlayerName: "Bot-Vex",
            type: "ATTACK",
            sourceOwnerId: "A",
            sourceSlotIndex: 0,
            sourceUnitName: "Stoneguard",
            targetOwnerId: "B",
            targetSlotIndex: 1,
            targetUnitName: "Iron Ravager",
            message: "Stoneguard attacks Iron Ravager."
          },
          {
            round: 4,
            duelId: "mock-duel-1",
            aPlayerId: meId,
            aPlayerName: "You",
            bPlayerId: enemyId,
            bPlayerName: "Bot-Vex",
            type: "DUEL_RESULT",
            message: "You wins and deals 4 damage to Bot-Vex."
          }
        ]
      : [];

  return {
    matchId: "mock-match",
    sequence: 1,
    maxPlayers: 2,
    isPrivate: true,
    inviteCode: "MOCK42",
    creatorPlayerId: meId,
    round: 4,
    phase,
    phaseEndsAt: now + 30_000,
    yourPlayerId: meId,
    combatLog: combatEvents.map((e) => e.message),
    combatEvents,
    players: [
      {
        playerId: meId,
        name: "You",
        health: phase === "FINISHED" ? 18 : 24,
        gold: 8,
        xp: 2,
        tavernTier: 2,
        lockedShop: false,
        ready: true,
        hero: {
          id: "mock-hero-a",
          name: "Aria",
          description: "Active (1): Buff a random ally this recruitment hall phase.",
          powerType: "ACTIVE",
          powerKey: "WAR_DRUM",
          powerCost: 1
        },
        heroSelected: true,
        heroPowerUsedThisTurn: false,
        heroOptions: [],
        shop: mockShop,
        bench: fillMockSlots(counts.benchSlots, (idx) => mockUnit(300 + idx, `Scout ${idx + 1}`, "Melee", "NONE")),
        board: meBoard
      },
      {
        playerId: enemyId,
        name: "Bot-Vex",
        health: phase === "FINISHED" ? 0 : 12,
        gold: 0,
        xp: 0,
        tavernTier: 2,
        lockedShop: false,
        ready: true,
        hero: {
          id: "mock-hero-b",
          name: "Matron",
          description: "Passive: First unit gets +1/+1 each round.",
          powerType: "PASSIVE",
          powerKey: "FORTIFY",
          powerCost: 0
        },
        heroSelected: true,
        heroPowerUsedThisTurn: false,
        heroOptions: [],
        shop: Array.from({ length: counts.shopSlots }, () => null),
        bench: Array.from({ length: counts.benchSlots }, () => null),
        board: enemyBoard
      }
    ]
  };
}

async function connect(): Promise<void> {
  if (!name.value.trim() && !storedPlayerId.value) {
    error.value = t("game.error.enterName");
    return;
  }
  const sessionAccountId = await ensurePlayerSession();
  const socket = new WebSocket(wsUrl);
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
          region: DEFAULT_REGION,
          mmr: DEFAULT_MMR
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
        send({
          type: "QUICK_MATCH",
          name: name.value.trim(),
          accountId: sessionAccountId,
          region: DEFAULT_REGION,
          mmr: DEFAULT_MMR
        });
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
      handleSoloPracticeLobbyAutomation(message.state);
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

function handleSoloPracticeLobbyAutomation(currentState: MatchPublicState): void {
  if (!soloPracticeDifficulty.value) return;
  if (currentState.phase !== "LOBBY") return;
  if (!currentState.yourPlayerId || currentState.creatorPlayerId !== currentState.yourPlayerId) return;

  const targetPlayers = Math.max(2, Math.min(8, currentState.maxPlayers));
  const missingBots = Math.max(0, targetPlayers - currentState.players.length);
  if (missingBots > 0) {
    send({ type: "ADD_BOT_TO_LOBBY", difficulty: soloPracticeDifficulty.value });
    return;
  }

  const meState = currentState.players.find((p) => p.playerId === currentState.yourPlayerId);
  if (meState && !meState.ready) {
    send({ type: "READY_LOBBY", ready: true });
    return;
  }

  const allReady = currentState.players.length > 0 && currentState.players.every((p) => p.ready);
  if (allReady) {
    send({ type: "FORCE_START" });
    soloPracticeDifficulty.value = null;
  }
}

function resetActiveSession(): void {
  storedPlayerId.value = null;
  storedMatchId.value = null;
  localStorage.removeItem("runebrawl.playerId");
  localStorage.removeItem("runebrawl.matchId");
  enrichedCombatLogHistory.value = [];
  activeCombatLogMatchId.value = null;
  lastRoundLogged.value = null;
  processedDuelId.value = null;
  processedDuelEventCount.value = 0;
  state.value = null;
  connected.value = false;
  ws.value?.close();
  ws.value = null;
}

function backToMenu(): void {
  resetActiveSession();
}

function dismissTutorial(): void {
  tutorialDismissed.value = true;
  localStorage.setItem("runebrawl.tutorial.dismissed", "1");
}

function cyclePerspectiveMode(): void {
  perspectiveMode.value =
    perspectiveMode.value === "bottom_top"
      ? "left_right"
      : perspectiveMode.value === "left_right"
        ? "right_left"
        : perspectiveMode.value === "right_left"
          ? "corner"
          : "bottom_top";
}

function leaveMatchNow(): void {
  send({ type: "LEAVE_MATCH" });
  // Give websocket a short moment to flush intent.
  window.setTimeout(() => {
    backToMenu();
  }, 80);
}

function confirmLeaveMatch(): void {
  if (!window.confirm(t("game.leaveConfirmRisk"))) return;
  leaveMatchNow();
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
    const response = await fetch(`${apiBaseUrl}/lobbies`);
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
  const socket = new WebSocket(wsUrl);
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
      handleSoloPracticeLobbyAutomation(message.state);
    }
  };
  socket.onclose = () => {
    connected.value = false;
  };
}

function joinLobbyFromMenu(matchId: string): void {
  if (!matchId.trim()) return;
  void joinOpenLobby(matchId.trim());
}

function startQuickFromMenu(): void {
  joinMode.value = "quick";
  soloPracticeDifficulty.value = null;
  void connect();
}

function startCreatePrivateFromMenu(): void {
  joinMode.value = "createPrivate";
  soloPracticeDifficulty.value = null;
  privateMaxPlayers.value = 4;
  void connect();
}

function startJoinPrivateFromMenu(): void {
  joinMode.value = "joinPrivate";
  soloPracticeDifficulty.value = null;
  void connect();
}

function reconnectFromMenu(): void {
  soloPracticeDifficulty.value = null;
  void connect();
}

function openSettingsFromMenu(): void {
  showSettings.value = true;
}

function handleGlobalOpenSettings(): void {
  showSettings.value = true;
}

function startSoloPractice(difficulty: BotDifficulty): void {
  joinMode.value = "createPrivate";
  privateMaxPlayers.value = 8;
  soloPracticeDifficulty.value = difficulty;
  void connect();
}

function sell(zone: "bench" | "board", index: number): void {
  send({ type: "SELL_UNIT", zone, index });
}

function onDragStart(zone: "bench" | "board", index: number): void {
  dragging.value = { kind: "unit", zone, index };
}

function onShopDragStart(shopIndex: number): void {
  dragging.value = { kind: "shop", shopIndex };
}

function clearDrag(): void {
  dragging.value = null;
}

function onDrop(toZone: "bench" | "board", toIndex: number): void {
  const d = dragging.value;
  if (!d) return;
  if (d.kind === "shop") {
    animatingShopIndex.value = d.shopIndex;
    window.setTimeout(() => {
      if (animatingShopIndex.value === d.shopIndex) {
        animatingShopIndex.value = null;
      }
    }, 260);
    send({
      type: "BUY_UNIT",
      shopIndex: d.shopIndex,
      place: { zone: toZone, index: toIndex }
    });
    dragging.value = null;
    return;
  }
  send({
    type: "MOVE_UNIT",
    from: d.zone,
    fromIndex: d.index,
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

interface EnrichedLogEntry {
  line: string;
  hint: string;
}

const enrichedCombatLogHistory = ref<EnrichedLogEntry[]>([]);
const activeCombatLogMatchId = ref<string | null>(null);
const lastRoundLogged = ref<number | null>(null);
const processedDuelId = ref<string | null>(null);
const processedDuelEventCount = ref(0);

function hintFromEvent(event: CombatReplayEvent): string {
  if (event.type !== "ABILITY_TRIGGERED") return "";
  if (event.synergyKey) {
    return `${t("game.hint")}: ${synergyLabel(event.synergyKey)} - ${synergyDescription(event.synergyKey)}`;
  }
  if (event.abilityKey) {
    return `${t("game.hint")}: ${abilityLabel(event.abilityKey)} - ${abilityDescription(event.abilityKey)}`;
  }
  return "";
}

function ownerLabel(owner: "A" | "B" | undefined): string {
  if (!owner) return t("game.unknown");
  if (!activeDuelMeta.value) return owner;
  const side = sideFromOwner(owner);
  return side === "me" ? activeDuelMeta.value.meName : activeDuelMeta.value.opponentName;
}

function eventLineWithContext(event: CombatReplayEvent): string {
  if (event.type === "ATTACK") {
    const srcOwner = ownerLabel(event.sourceOwnerId);
    const tgtOwner = ownerLabel(event.targetOwnerId);
    const srcUnit = event.sourceUnitName ?? t("game.unknown");
    const tgtUnit = event.targetUnitName ?? t("game.unknown");
    return `[${srcOwner}] ${srcUnit} attacks [${tgtOwner}] ${tgtUnit}.`;
  }

  if (event.type === "UNIT_DIED") {
    const owner = ownerLabel(event.sourceOwnerId);
    const unit = event.sourceUnitName ?? t("game.unknown");
    return `[${owner}] ${unit} dies.`;
  }

  if (event.type === "DUEL_RESULT") {
    return `[RESULT] ${event.message}`;
  }

  if (event.sourceOwnerId !== undefined) {
    return `[${ownerLabel(event.sourceOwnerId)}] ${event.message}`;
  }
  return event.message;
}

function ingestCombatLog(stateNow: MatchPublicState): void {
  if (activeCombatLogMatchId.value !== stateNow.matchId) {
    activeCombatLogMatchId.value = stateNow.matchId;
    enrichedCombatLogHistory.value = [];
    lastRoundLogged.value = null;
    processedDuelId.value = null;
    processedDuelEventCount.value = 0;
  }

  if (lastRoundLogged.value !== stateNow.round) {
    lastRoundLogged.value = stateNow.round;
    enrichedCombatLogHistory.value = [...enrichedCombatLogHistory.value, { line: `Round ${stateNow.round} started.`, hint: "" }];
  }

  const events = myCombatEvents.value;
  const duelId = events[0]?.duelId ?? null;
  if (!duelId) return;

  if (processedDuelId.value !== duelId) {
    processedDuelId.value = duelId;
    processedDuelEventCount.value = 0;
  }

  const fresh = events.slice(processedDuelEventCount.value);
  if (fresh.length === 0) return;
  processedDuelEventCount.value = events.length;

  const appended: EnrichedLogEntry[] = fresh
    .filter((event) => event.message && !event.message.includes("(combat log truncated)"))
    .map((event) => ({ line: eventLineWithContext(event), hint: hintFromEvent(event) }));
  if (appended.length === 0) return;
  enrichedCombatLogHistory.value = [...enrichedCombatLogHistory.value, ...appended];
}

const enrichedCombatLog = computed(() => enrichedCombatLogHistory.value);

function unitTierClass(unit: UnitDefinition | null): "" | "tier-low" | "tier-mid" | "tier-high" {
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
  if (!activeDuelMeta.value) return "me";
  if (activeDuelMeta.value.meIsA) {
    return owner === "A" ? "me" : "enemy";
  }
  return owner === "B" ? "me" : "enemy";
}

const rangedProjectileFlight = computed((): RangedProjectileFlight | null => {
  if (reducedMotion.value) return null;
  const e = activeCombatEvent.value;
  if (!e || e.type !== "ATTACK" || replayAnimationPhase.value !== "HIT" || !activeDuelMeta.value) return null;
  const si = e.sourceSlotIndex;
  const ti = e.targetSlotIndex;
  if (si === undefined || ti === undefined || e.sourceOwnerId === undefined || e.targetOwnerId === undefined) {
    return null;
  }
  const attackerSide = sideFromOwner(e.sourceOwnerId);
  const board = attackerSide === "me" ? replayMyBoard.value : replayEnemyBoard.value;
  const u = board[si];
  if (!u || attackArchetypeFromRole(u.role) !== "ranged") return null;
  return {
    from: { side: attackerSide, slot: si },
    to: { side: sideFromOwner(e.targetOwnerId), slot: ti }
  };
});

const magicProjectileFlight = computed((): MagicProjectileFlight | null => {
  if (reducedMotion.value) return null;
  const e = activeCombatEvent.value;
  if (!e || e.type !== "ATTACK" || replayAnimationPhase.value !== "HIT" || !activeDuelMeta.value) return null;
  const si = e.sourceSlotIndex;
  const ti = e.targetSlotIndex;
  if (si === undefined || ti === undefined || e.sourceOwnerId === undefined || e.targetOwnerId === undefined) {
    return null;
  }
  const attackerSide = sideFromOwner(e.sourceOwnerId);
  const board = attackerSide === "me" ? replayMyBoard.value : replayEnemyBoard.value;
  const u = board[si];
  if (!u || attackArchetypeFromRole(u.role) !== "magic") return null;
  return {
    from: { side: attackerSide, slot: si },
    to: { side: sideFromOwner(e.targetOwnerId), slot: ti },
    spell: resolveMagicSpellProjectileId(u)
  };
});

function phaseLabel(phase: string): string {
  return t(`phase.${phase}`);
}

function animationSpeedMultiplier(): number {
  if (reducedMotion.value) return 0.65;
  if (animationSpeed.value === "slow") return 1.45;
  if (animationSpeed.value === "fast") return 0.95;
  return 1.15;
}

function animationDurationMs(baseMs: number): number {
  return Math.max(80, Math.round(baseMs * animationSpeedMultiplier()));
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
  if (!unit || !activeCombatEvent.value || !activeDuelMeta.value) return "";
  const expectedOwner: "A" | "B" = side === "me" ? (activeDuelMeta.value.meIsA ? "A" : "B") : activeDuelMeta.value.meIsA ? "B" : "A";
  const ev = activeCombatEvent.value;
  if (ev.type === "ATTACK") {
    return resolveReplayAttackSlotClasses({
      phase: replayAnimationPhase.value,
      event: ev,
      unit,
      side,
      slotIndex,
      expectedOwnerForSide: expectedOwner
    });
  }
  if (ev.type === "ABILITY_TRIGGERED") {
    return resolveReplayAbilitySlotClasses({
      phase: replayAnimationPhase.value,
      event: ev,
      unit,
      side,
      slotIndex,
      expectedOwnerForSide: expectedOwner
    });
  }
  if (ev.type === "UNIT_DIED") {
    return resolveReplayDeathSlotClasses({
      phase: replayAnimationPhase.value,
      event: ev,
      unit,
      side,
      slotIndex,
      expectedOwnerForSide: expectedOwner
    });
  }
  return "";
}

function attackFxOverlayId(side: "me" | "enemy", slotIndex: number): CombatFxOverlayId | null {
  if (!activeDuelMeta.value) return null;
  const expectedOwner: "A" | "B" = side === "me" ? (activeDuelMeta.value.meIsA ? "A" : "B") : activeDuelMeta.value.meIsA ? "B" : "A";
  const board = side === "me" ? replayMyBoard.value : replayEnemyBoard.value;
  const u = board[slotIndex] ?? null;
  return resolveReplayAttackOverlayId(
    {
      phase: replayAnimationPhase.value,
      event: activeCombatEvent.value,
      unit: u,
      side,
      slotIndex,
      expectedOwnerForSide: expectedOwner
    },
    { reducedMotion: reducedMotion.value }
  );
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
  replayLockActive.value = false;
  replayEvents.value = [];
  replayDuelMetaSnapshot.value = null;
  replayMeSnapshot.value = null;
  replayOpponentSnapshot.value = null;
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
  if (next >= activeReplayEvents.value.length) {
    replayAnimationPhase.value = "IDLE";
    clearCombatPlaybackTimer();
    replayLockActive.value = false;
    replayEvents.value = [];
    replayDuelMetaSnapshot.value = null;
    replayMeSnapshot.value = null;
    replayOpponentSnapshot.value = null;
    return;
  }
  const event = activeReplayEvents.value[next];
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
  if (!state.value) return "";
  const inServerCombatPhase = state.value.phase === "COMBAT" || state.value.phase === "ROUND_END";
  if (!inServerCombatPhase || myCombatEvents.value.length === 0) return "";
  const duelId = myCombatEvents.value[0].duelId;
  return `${duelId}:${myCombatEvents.value.length}`;
});

const combatReplayComplete = computed(() => {
  if (activeReplayEvents.value.length === 0) return true;
  const lastIndex = activeReplayEvents.value.length - 1;
  return combatReplayStep.value >= lastIndex && replayAnimationPhase.value === "IDLE";
});

watch(
  () => replaySignature.value,
  (signature) => {
    if (!signature) {
      if (!replayLockActive.value) {
        stopCombatPlayback();
      }
      return;
    }
    const duelId = myCombatEvents.value[0]?.duelId;
    if (!duelId || !myDuelMeta.value || !me.value || !myCombatOpponent.value) return;
    replayLockActive.value = true;
    replayEvents.value = myCombatEvents.value.map((event) => ({ ...event }));
    replayDuelMetaSnapshot.value = { ...myDuelMeta.value };
    replayMeSnapshot.value = { name: me.value.name, board: me.value.board.map((u) => (u ? { ...u } : null)) };
    replayOpponentSnapshot.value = { name: myCombatOpponent.value.name, board: myCombatOpponent.value.board.map((u) => (u ? { ...u } : null)) };
    replayDuelId.value = duelId;
    initializeReplayBoards();
    startCombatPlayback();
  },
  { immediate: true }
);

watch(
  () => state.value,
  (next) => {
    if (!next) return;
    ingestCombatLog(next);
  },
  { deep: false }
);

watch(animationSpeed, (next) => {
  localStorage.setItem("runebrawl.ui.animationSpeed", next);
});

watch(reducedMotion, (next) => {
  localStorage.setItem("runebrawl.ui.reducedMotion", next ? "1" : "0");
});

watch(perspectiveMode, (next) => {
  localStorage.setItem("runebrawl.ui.perspectiveMode", next);
});

watch(name, (next) => {
  localStorage.setItem("runebrawl.playerName", next);
  profileSyncState.value = "idle";
  if (profileSyncTimer !== null) {
    window.clearTimeout(profileSyncTimer);
  }
  profileSyncTimer = window.setTimeout(() => {
    void syncPlayerProfile();
  }, 350);
});

onBeforeUnmount(() => {
  if (clock !== null) window.clearInterval(clock);
  stopCombatPlayback();
  if (fadeCleanupTimer !== null) window.clearTimeout(fadeCleanupTimer);
  if (profileSyncTimer !== null) window.clearTimeout(profileSyncTimer);
  window.removeEventListener("runebrawl:open-settings", handleGlobalOpenSettings as EventListener);
  ws.value?.close();
});

watch(uiThemeKey, (next) => {
  localStorage.setItem("runebrawl.ui.theme", next);
  applySceneTheme(next);
});

onMounted(() => {
  applySceneTheme(uiThemeKey.value);
  window.addEventListener("runebrawl:open-settings", handleGlobalOpenSettings as EventListener);
  const params = new URLSearchParams(window.location.search);
  const invite = params.get("invite")?.trim().toUpperCase();
  if (invite) {
    inviteCodeInput.value = invite;
    joinMode.value = "joinPrivate";
  }
  if (import.meta.env.DEV && params.get("rb_mock") === "1") {
    const requestedPhase = params.get("rb_phase")?.toUpperCase() as GamePhase | undefined;
    const phase: GamePhase = requestedPhase && ["LOBBY", "HERO_SELECTION", "TAVERN", "POSITIONING", "COMBAT", "ROUND_END", "FINISHED"].includes(requestedPhase) ? requestedPhase : "LOBBY";
    const shopSlots = clampMockCount(params.get("rb_shop"), 3);
    const benchSlots = clampMockCount(params.get("rb_bench"), 6);
    const boardSlots = clampMockCount(params.get("rb_board"), 6);
    devMockPhase.value = phase;
    connected.value = true;
    state.value = buildMockState(phase, { shopSlots, benchSlots, boardSlots });
  }

  clock = window.setInterval(() => {
    nowTs.value = Date.now();
  }, 250);

  if (devMockPhase.value) {
    return;
  }
  if (storedPlayerId.value) {
    void connect();
  } else {
    void (async () => {
      await ensurePlayerSession();
      if (invite && name.value.trim()) {
        joinMode.value = "joinPrivate";
        params.delete("invite");
        const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}${window.location.hash}`;
        window.history.replaceState({}, "", next);
        void connect();
        return;
      }
      void loadOpenLobbies();
    })();
  }
});
</script>

<template>
  <div class="app">
    <MenuScreen
      :connected="connected"
      :name="name"
      :profile-sync-state="profileSyncState"
      :invite-code-input="inviteCodeInput"
      :open-lobbies="openLobbies"
      :stored-player-id="storedPlayerId"
      :stored-match-id="storedMatchId"
      @update:name="name = $event"
      @update:invite-code-input="inviteCodeInput = $event"
      @save-profile="saveProfileNow"
      @start-quick="startQuickFromMenu"
      @start-create-private="startCreatePrivateFromMenu"
      @start-join-private="startJoinPrivateFromMenu"
      @start-solo="startSoloPractice"
      @reconnect="reconnectFromMenu"
      @open-settings="openSettingsFromMenu"
      @refresh-lobbies="loadOpenLobbies"
      @join-lobby="joinLobbyFromMenu"
    />

    <p v-if="error" class="error">{{ error }}</p>

    <SettingsModal
      :visible="showSettings"
      :animation-speed="animationSpeed"
      :reduced-motion="reducedMotion"
      :theme-key="uiThemeKey"
      :theme-options="themeSelectOptions"
      @close="showSettings = false"
      @update:animation-speed="animationSpeed = $event"
      @update:reduced-motion="reducedMotion = $event"
      @update:theme-key="uiThemeKey = $event"
    />

    <div v-if="state && me" class="game-scene" :class="`scene-${state.phase.toLowerCase()}`">
      <div class="scene-backdrop" aria-hidden="true"></div>
      <div class="scene-vignette" aria-hidden="true"></div>
      <div class="scene-ornament scene-ornament-top" aria-hidden="true"></div>
      <div class="scene-ornament scene-ornament-bottom" aria-hidden="true"></div>
      <div class="scene-content">
        <TutorialOverlay
          :visible="showTutorialOverlay"
          :title="t('game.tutorial.title')"
          :text="tutorialText"
          :dismiss-label="t('game.tutorial.dismiss')"
          @dismiss="dismissTutorial"
        />
        <div v-if="!isFinished && meEliminated" class="actions">
          <button @click="leaveMatchNow">{{ t("game.leaveMatchNow") }}</button>
        </div>
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
              :seconds-left="secondsLeft"
              :stat-players-icon="statPlayersIcon"
              :stat-gold-icon="statGoldIcon"
              :stat-health-icon="statHealthIcon"
              :hero-portrait-path="heroPortraitPath"
              :hero-backplate-path="heroPortraitBackplatePath"
              @select-hero="selectHero"
            />

            <MatchEndView
              v-else-if="isFinished"
              :state="state"
              :me-player-id="me.playerId"
              @play-again="playAgain"
              @back-to-menu="backToMenu"
            />

            <div
              v-else
              class="game-shell"
              :class="[
                isCombatView ? 'game-shell--combat' : 'game-shell--shop',
                `phase-${state.phase.toLowerCase()}`,
                `perspective-${perspectiveMode}`,
                { 'anim-reduced': reducedMotion }
              ]"
            >
              <header class="game-shell-top">
                <div class="game-shell-top-left">
                  <section class="hero-container">
                    <div class="hero-identity">
                      <div class="hero-hud-portrait">
                        <img v-if="heroPortraitUrl" :src="heroPortraitUrl" :alt="me.hero?.name ?? 'Hero'" loading="lazy" />
                        <span v-else>?</span>
                      </div>
                      <div class="hero-hud-meta">
                        <div class="hero-hud-name">{{ me.hero?.name ?? t("game.noHero") }}</div>
                        <div class="hero-hud-ability" :title="heroAbilityDescription">
                          <span class="hero-hud-ability-icon" aria-hidden="true">◎</span>
                          <span>{{ heroAbilityLabel }}</span>
                        </div>
                      </div>
                    </div>
                    <div class="hero-ability-section">
                      <div class="hero-ability-pill hero-ability-pill--passive" :title="heroAbilityDescription">
                        <span class="hero-ability-key">Passive</span>
                        <span>{{ heroPassiveText }}</span>
                      </div>
                      <button
                        class="hero-ability-pill hero-ability-pill--active"
                        :class="{ 'hero-ability-pill--disabled': !canUseTopHeroPower }"
                        :title="topHeroPowerTitle"
                        :disabled="!canUseTopHeroPower"
                        @click="useHeroPower"
                      >
                        <span class="hero-ability-key">Active</span>
                        <span>{{ heroActiveText }}</span>
                      </button>
                    </div>
                  </section>
                  <div class="stats">
                    <span class="stat-pill"><img class="chip-icon" :src="statGoldIcon" alt="" />{{ t("game.gold") }}: {{ me.gold }}</span>
                    <span class="stat-pill"><img class="chip-icon" :src="statHealthIcon" alt="" />{{ t("game.health") }}: {{ me.health }}</span>
                    <span class="stat-pill">{{ t("game.tier") }}: {{ me.tavernTier }}</span>
                    <span class="stat-pill">{{ t("game.xp") }}: {{ me.xp }}</span>
                    <span class="stat-pill">{{ phaseLabel(state.phase) }}</span>
                    <span class="stat-pill">{{ secondsLeft }}s</span>
                  </div>
                </div>
                <div class="game-shell-top-actions">
                  <button class="danger-ghost" @click="cyclePerspectiveMode">View: {{ perspectiveLabel }}</button>
                  <button class="danger-ghost" @click="confirmLeaveMatch">{{ t("game.leaveMatchNow") }}</button>
                </div>
              </header>

              <main class="game-shell-main">
                <section class="game-shell-center">
                  <CombatView
                    v-if="isCombatView"
                    :me="combatMeView"
                    :my-combat-opponent="combatOpponentView"
                    :my-duel-meta="activeDuelMeta"
                    :has-no-duel-this-round="hasNoDuelThisRound"
                    :active-target-line="activeTargetLine"
                    :active-attack-cue="activeAttackCue"
                    :next-attack-queue="nextAttackQueue"
                    :active-combat-line="activeCombatLine"
                    :replay-my-board="replayMyBoard"
                    :replay-enemy-board="replayEnemyBoard"
                    :recent-damage-by-slot="recentDamageBySlot"
                    :unit-portrait-path="unitPortraitPath"
                    :unit-backplate-path="unitPortraitBackplatePath"
                    :unit-label-replay="unitLabelReplay"
                    :unit-pulse-class="unitPulseClass"
                    :attack-fx-overlay-id="attackFxOverlayId"
                    :ranged-projectile-flight="rangedProjectileFlight"
                    :magic-projectile-flight="magicProjectileFlight"
                    :slot-animation-class="slotAnimationClass"
                    :slot-hit-class="slotHitClass"
                    :slot-key="slotKey"
                    :ability-icon-path="abilityIconPath"
                    :ability-label="abilityLabel"
                    :ability-description="abilityDescription"
                    :reduced-motion="reducedMotion"
                  />
                  <BoardBenchView
                    v-else
                    :me="me"
                    :is-buy-phase="isBuyPhase"
                    :tutorial-step-key="tutorialStepKey"
                    :stat-gold-icon="statGoldIcon"
                    :unit-portrait-path="unitPortraitPath"
                    :unit-backplate-path="unitPortraitBackplatePath"
                    :unit-quick-meta="unitQuickMeta"
                    :ability-label="abilityLabel"
                    :ability-description="abilityDescription"
                    :ability-icon-path="abilityIconPath"
                    :synergy-label="synergyLabel"
                    @sell="sell"
                    @dragstart="onDragStart"
                    @dragend="clearDrag"
                    @drop="onDrop"
                  />
                </section>

              </main>

              <footer class="game-shell-bottom">
                <div v-if="isCombatView" class="game-shell-combat-controls">
                  <span class="slot-title">{{ t("game.replay") }}</span>
                  <button @click="animationSpeed = 'slow'">0.75x</button>
                  <button @click="animationSpeed = 'normal'">1x</button>
                  <button @click="animationSpeed = 'fast'">1.25x</button>
                  <button @click="reducedMotion = !reducedMotion">
                    {{ reducedMotion ? "Unpause FX" : "Pause FX" }}
                  </button>
                </div>
                <RecruitmentHallView
                  v-else
                  :state="state"
                  :me="me"
                  :bottom-only="true"
                  :is-lobby="isLobby"
                  :is-hero-selection="isHeroSelection"
                  :is-private-lobby="isPrivateLobby"
                  :is-creator="isCreator"
                  :is-buy-phase="isBuyPhase"
                  :tutorial-step-key="tutorialStepKey"
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
                  :hero-backplate-path="heroPortraitBackplatePath"
                  :unit-portrait-path="unitPortraitPath"
                  :unit-backplate-path="unitPortraitBackplatePath"
                  @select-hero="selectHero"
                  @buy="buy"
                  @shop-drag-start="onShopDragStart"
                  @shop-drag-end="clearDrag"
                  @add-bot-to-lobby="addBotToLobby"
                  @force-start-lobby="forceStartLobby"
                  @ready-lobby-toggle="readyLobbyToggle"
                  @use-hero-power="useHeroPower"
                  @reroll="reroll"
                  @upgrade="upgrade"
                  @lock-toggle="lockToggle"
                  @ready="ready"
                />
              </footer>

              <aside class="game-shell-right">
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
                  :hero-portrait-path="heroPortraitPath"
                  :hero-backplate-path="heroPortraitBackplatePath"
                  @kick-player="kickPlayer"
                />
              </aside>
            </div>
          </div>
        </Transition>
      </div>
      <RoundResultOverlay
        v-if="isRoundEnd && (hasNoDuelThisRound || combatReplayComplete)"
        :round="state.round"
        :result-label="parsedRoundResult.label"
        :summary="hasNoDuelThisRound ? t('game.roundResult.summaryNoDuel') : parsedRoundResult.summary"
        :detail="hasNoDuelThisRound ? '' : parsedRoundResult.detail ?? ''"
        :no-duel="hasNoDuelThisRound"
      />
    </div>
  </div>
</template>

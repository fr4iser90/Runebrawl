<script setup lang="ts">
import type { AbilityKey } from "@runebrawl/shared";
import type { UnitInstance } from "@runebrawl/shared";
import { nextTick, ref, watch, type ComponentPublicInstance } from "vue";
import { useI18n } from "../../../i18n/useI18n";
import PortraitFrameSvg from "../../shared/PortraitFrameSvg.vue";
import type {
  CombatFxOverlayId,
  MagicProjectileFlight,
  MagicSpellVisualId,
  RangedProjectileFlight
} from "../combat/combatFxRegistry";
import MagicSpellProjectile from "../combat/fx/MagicSpellProjectile.vue";
import RangedArrowProjectile from "../combat/fx/RangedArrowProjectile.vue";
import UnitCardFrameCorners from "../cards/UnitCardFrameCorners.vue";

interface DuelMetaView {
  meName: string;
  opponentName: string;
}

interface TargetLineView {
  source: string;
  target: string;
  isHit: boolean;
}

interface ActiveAttackCueView {
  attackerSide: "me" | "enemy";
  attackerSlot: number;
  targetSide: "me" | "enemy";
  targetSlot: number;
  isHit: boolean;
}

interface NextAttackCueView {
  source: string;
  target: string;
  attackerSide: "me" | "enemy";
  attackerSlot: number;
  targetSide: "me" | "enemy";
  targetSlot: number;
  isCurrent: boolean;
}

interface ReplayUnit extends UnitInstance {
  isDead?: boolean;
}

interface OpponentView {
  name: string;
  board: (UnitInstance | null)[];
}

interface MeView {
  name: string;
  board: (UnitInstance | null)[];
}

const props = defineProps<{
  me: MeView;
  myCombatOpponent: OpponentView | null;
  myDuelMeta: DuelMetaView | null;
  hasNoDuelThisRound: boolean;
  activeTargetLine: TargetLineView | null;
  activeAttackCue: ActiveAttackCueView | null;
  nextAttackQueue: NextAttackCueView[];
  activeCombatLine: string;
  replayMyBoard: (ReplayUnit | null)[];
  replayEnemyBoard: (ReplayUnit | null)[];
  recentDamageBySlot: Record<string, string>;
  unitPortraitPath: (unitId: string) => string;
  unitBackplatePath: (unitId: string) => string | null;
  unitLabelReplay: (unit: ReplayUnit | null) => string;
  tempoPercent: (side: "me" | "enemy", slotIndex: number) => number;
  unitPulseClass: (unit: UnitInstance | null, side: "me" | "enemy", slotIndex: number) => string;
  attackFxOverlayId: (side: "me" | "enemy", idx: number) => CombatFxOverlayId | null;
  rangedProjectileFlight: RangedProjectileFlight | null;
  magicProjectileFlight: MagicProjectileFlight | null;
  slotAnimationClass: (side: "me" | "enemy", idx: number) => string;
  slotHitClass: (side: "me" | "enemy", idx: number) => string;
  slotKey: (side: "me" | "enemy", idx: number) => string;
  abilityIconPath: (ability: AbilityKey) => string;
  abilityLabel: (ability: AbilityKey) => string;
  abilityDescription: (ability: AbilityKey) => string;
  /** In-game "Pause FX" — passed through to ranged/magic projectiles */
  reducedMotion?: boolean;
}>();

function backplateStyle(url: string | null): Record<string, string> | undefined {
  if (!url) return undefined;
  return {
    backgroundImage: `url("${url}")`,
    backgroundSize: "cover",
    backgroundPosition: "center center",
    backgroundRepeat: "no-repeat"
  };
}

const { t } = useI18n();

function overlayId(side: "me" | "enemy", idx: number): CombatFxOverlayId | null {
  return props.attackFxOverlayId(side, idx);
}

const slotEls = ref<Record<string, HTMLElement | null>>({});

function setSlotRef(side: "me" | "enemy", idx: number, el: Element | ComponentPublicInstance | null) {
  const key = `${side}-${idx}`;
  if (!el) {
    delete slotEls.value[key];
    return;
  }
  const node = el instanceof HTMLElement ? el : (el as ComponentPublicInstance).$el;
  if (node instanceof HTMLElement) slotEls.value[key] = node;
}

type ProjectileKind = "ranged" | "magic";
type ProjectileState =
  | { kind: "ranged"; x1: number; y1: number; x2: number; y2: number; key: number }
  | { kind: "magic"; spell: MagicSpellVisualId; x1: number; y1: number; x2: number; y2: number; key: number };

function magicProjectileHideMs(spell: MagicSpellVisualId): number {
  switch (spell) {
    case "ice_storm":
      return 340;
    case "fireball":
      return 300;
    case "arcane_missile":
    default:
      return 280;
  }
}
const projectileState = ref<ProjectileState | null>(null);
const projectileSeq = ref(0);
let projectileHideTimer: number | null = null;

watch(
  () => [props.rangedProjectileFlight, props.magicProjectileFlight] as const,
  async ([ranged, magic]) => {
    if (projectileHideTimer !== null) {
      window.clearTimeout(projectileHideTimer);
      projectileHideTimer = null;
    }
    projectileState.value = null;
    const flight = ranged ?? magic;
    const kind: ProjectileKind | null = ranged ? "ranged" : magic ? "magic" : null;
    if (!flight || !kind) return;
    await nextTick();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const fromEl = slotEls.value[`${flight.from.side}-${flight.from.slot}`];
    const toEl = slotEls.value[`${flight.to.side}-${flight.to.slot}`];
    if (!fromEl || !toEl) return;
    const a = fromEl.getBoundingClientRect();
    const b = toEl.getBoundingClientRect();
    const x1 = a.left + a.width / 2;
    const y1 = a.top + a.height / 2;
    const x2 = b.left + b.width / 2;
    const y2 = b.top + b.height / 2;
    projectileSeq.value += 1;
    if (kind === "magic" && magic) {
      projectileState.value = {
        kind: "magic",
        spell: magic.spell,
        x1,
        y1,
        x2,
        y2,
        key: projectileSeq.value
      };
    } else {
      projectileState.value = { kind: "ranged", x1, y1, x2, y2, key: projectileSeq.value };
    }
    const hideMs = kind === "magic" && magic ? magicProjectileHideMs(magic.spell) : 220;
    projectileHideTimer = window.setTimeout(() => {
      projectileState.value = null;
      projectileHideTimer = null;
    }, hideMs);
  },
  { flush: "post" }
);

function frameTierClass(unit: ReplayUnit | null): "tier-low" | "tier-mid" | "tier-high" {
  const level = unit?.level ?? 1;
  if (level <= 2) return "tier-low";
  if (level <= 4) return "tier-mid";
  return "tier-high";
}

function isAttackerSlot(side: "me" | "enemy", idx: number): boolean {
  return !!props.activeAttackCue && props.activeAttackCue.attackerSide === side && props.activeAttackCue.attackerSlot === idx;
}

function isTargetSlot(side: "me" | "enemy", idx: number): boolean {
  return !!props.activeAttackCue && props.activeAttackCue.targetSide === side && props.activeAttackCue.targetSlot === idx;
}

function countAlive(units: (ReplayUnit | null)[]): number {
  return units.filter((u) => !!u && !u.isDead && u.hp > 0).length;
}

function winnerName(): string {
  const myAlive = countAlive(props.replayMyBoard);
  const enemyAlive = countAlive(props.replayEnemyBoard);
  if (myAlive === 0 && enemyAlive === 0) return "";
  if (myAlive > 0 && enemyAlive === 0) return props.me.name;
  if (enemyAlive > 0 && myAlive === 0) return props.myCombatOpponent?.name ?? "";
  return "";
}
</script>

<template>
  <section class="combat-screen combat-board portrait-frame-live-svg portrait-frame-variant portrait-frame-variant--ornate">
    <h2>{{ t("game.combatView") }}</h2>
    <div class="combat-info-bar">
      <div class="combat-subtitle">
        <span v-if="props.myDuelMeta">{{ props.myDuelMeta.meName }} {{ t("game.vs") }} {{ props.myDuelMeta.opponentName }}</span>
        <span v-else-if="props.hasNoDuelThisRound">{{ t("game.noDuelThisRound") }}</span>
        <span v-else>{{ t("game.waitingDuel") }}</span>
      </div>
      <div v-if="props.activeTargetLine" class="target-line" :class="{ hit: props.activeTargetLine.isHit }">
        <span class="target-name">{{ props.activeTargetLine.source }}</span>
        <span class="target-arrow">→</span>
        <span class="target-name">{{ props.activeTargetLine.target }}</span>
      </div>
    </div>
    <div v-if="props.nextAttackQueue.length" class="combat-nextup">
      <span
        v-for="(item, idx) in props.nextAttackQueue"
        :key="`${item.attackerSide}-${item.attackerSlot}-${item.targetSide}-${item.targetSlot}-${idx}`"
        class="nextup-chip"
        :class="{ current: item.isCurrent }"
      >
        {{ item.source }} → {{ item.target }}
      </span>
    </div>
    <div v-if="winnerName()" class="combat-winner">
      <span class="combat-winner__badge">WINNER</span>
      <span class="combat-winner__name">{{ winnerName() }}</span>
    </div>
    <div class="combat-arena" v-if="props.myCombatOpponent">
      <div class="combat-side">
        <h3>{{ props.me.name }}</h3>
        <div class="slot-row">
          <div
            v-for="(unit, idx) in props.me.board"
            :key="`combat-me-${idx}`"
            class="slot"
            :ref="(el) => setSlotRef('me', idx, el)"
            :class="[
              { 'slot--filled': !!props.replayMyBoard[idx] },
              { 'slot--active-attacker': isAttackerSlot('me', idx) },
              { 'slot--active-target': isTargetSlot('me', idx) },
              { 'slot--target-hit': isTargetSlot('me', idx) && !!props.activeAttackCue?.isHit },
              props.unitPulseClass(unit, 'me', idx),
              props.slotAnimationClass('me', idx),
              props.slotHitClass('me', idx)
            ]"
          >
            <div class="slot-title">{{ t("game.slot", { index: idx + 1 }) }}</div>
            <div v-if="props.replayMyBoard[idx]" class="unit-card-chrome slot-card-chrome" :class="{ 'dead-fade': !!props.replayMyBoard[idx]?.isDead }">
              <div v-if="isAttackerSlot('me', idx)" class="combat-focus-badge combat-focus-badge--attacker">ATK</div>
              <div v-else-if="isTargetSlot('me', idx)" class="combat-focus-badge combat-focus-badge--target">TGT</div>
              <div class="unit-card-chrome__content slot-card-content">
                <div
                  class="portrait-slot portrait-slot-mini portrait-slot--svg-frame"
                  :style="backplateStyle(props.unitBackplatePath((props.replayMyBoard[idx] ?? null)?.unitId ?? ''))"
                >
                  <img
                    class="portrait-image"
                    :src="props.unitPortraitPath((props.replayMyBoard[idx] ?? null)?.unitId ?? '')"
                    :alt="(props.replayMyBoard[idx] ?? null)?.name ?? ''"
                    loading="lazy"
                  />
                </div>
              </div>
              <UnitCardFrameCorners
                :tier="(props.replayMyBoard[idx]?.level ?? 1)"
                :atk="(props.replayMyBoard[idx]?.attack ?? 0)"
                :hp="(props.replayMyBoard[idx]?.hp ?? 0)"
                :speed="(props.replayMyBoard[idx]?.speed ?? 0)"
                :ability-icon-url="props.abilityIconPath((props.replayMyBoard[idx]?.ability ?? 'NONE') as AbilityKey)"
                :ability-title="`${props.abilityLabel((props.replayMyBoard[idx]?.ability ?? 'NONE') as AbilityKey)}: ${props.abilityDescription((props.replayMyBoard[idx]?.ability ?? 'NONE') as AbilityKey)}`"
              />
              <PortraitFrameSvg
                frame-id="ornate"
                :tier-class="frameTierClass(props.replayMyBoard[idx] ?? null)"
                scope="unitShopCard"
                :hide-ornate-corner-studs="true"
              />
              <svg
                v-if="overlayId('me', idx) === 'melee_sword'"
                class="melee-sword-fx"
                viewBox="0 0 100 100"
                aria-hidden="true"
              >
                <path
                  class="melee-sword-fx__blade"
                  d="M82 14 L24 58 L30 66 L88 22 Z"
                />
                <path
                  class="melee-sword-fx__edge"
                  fill="none"
                  stroke="rgba(255, 252, 240, 0.95)"
                  stroke-width="1.2"
                  stroke-linecap="round"
                  d="M78 18 L28 58"
                />
              </svg>
            </div>
            <div class="tempo-track" v-if="props.replayMyBoard[idx]">
              <div class="tempo-fill" :style="{ width: `${props.tempoPercent('me', idx)}%` }"></div>
            </div>
            <div class="damage-pop" v-if="props.recentDamageBySlot[props.slotKey('me', idx)]">
              {{ props.recentDamageBySlot[props.slotKey("me", idx)] }}
            </div>
          </div>
        </div>
      </div>
      <div class="combat-side">
        <h3>{{ props.myCombatOpponent.name }}</h3>
        <div class="slot-row">
          <div
            v-for="(unit, idx) in props.myCombatOpponent.board"
            :key="`combat-opp-${idx}`"
            class="slot"
            :ref="(el) => setSlotRef('enemy', idx, el)"
            :class="[
              { 'slot--filled': !!props.replayEnemyBoard[idx] },
              { 'slot--active-attacker': isAttackerSlot('enemy', idx) },
              { 'slot--active-target': isTargetSlot('enemy', idx) },
              { 'slot--target-hit': isTargetSlot('enemy', idx) && !!props.activeAttackCue?.isHit },
              props.unitPulseClass(unit, 'enemy', idx),
              props.slotAnimationClass('enemy', idx),
              props.slotHitClass('enemy', idx)
            ]"
          >
            <div class="slot-title">{{ t("game.slot", { index: idx + 1 }) }}</div>
            <div v-if="props.replayEnemyBoard[idx]" class="unit-card-chrome slot-card-chrome" :class="{ 'dead-fade': !!props.replayEnemyBoard[idx]?.isDead }">
              <div v-if="isAttackerSlot('enemy', idx)" class="combat-focus-badge combat-focus-badge--attacker">ATK</div>
              <div v-else-if="isTargetSlot('enemy', idx)" class="combat-focus-badge combat-focus-badge--target">TGT</div>
              <div class="unit-card-chrome__content slot-card-content">
                <div
                  class="portrait-slot portrait-slot-mini portrait-slot--svg-frame"
                  :style="backplateStyle(props.unitBackplatePath((props.replayEnemyBoard[idx] ?? null)?.unitId ?? ''))"
                >
                  <img
                    class="portrait-image"
                    :src="props.unitPortraitPath((props.replayEnemyBoard[idx] ?? null)?.unitId ?? '')"
                    :alt="(props.replayEnemyBoard[idx] ?? null)?.name ?? ''"
                    loading="lazy"
                  />
                </div>
              </div>
              <UnitCardFrameCorners
                :tier="(props.replayEnemyBoard[idx]?.level ?? 1)"
                :atk="(props.replayEnemyBoard[idx]?.attack ?? 0)"
                :hp="(props.replayEnemyBoard[idx]?.hp ?? 0)"
                :speed="(props.replayEnemyBoard[idx]?.speed ?? 0)"
                :ability-icon-url="props.abilityIconPath((props.replayEnemyBoard[idx]?.ability ?? 'NONE') as AbilityKey)"
                :ability-title="`${props.abilityLabel((props.replayEnemyBoard[idx]?.ability ?? 'NONE') as AbilityKey)}: ${props.abilityDescription((props.replayEnemyBoard[idx]?.ability ?? 'NONE') as AbilityKey)}`"
              />
              <PortraitFrameSvg
                frame-id="ornate"
                :tier-class="frameTierClass(props.replayEnemyBoard[idx] ?? null)"
                scope="unitShopCard"
                :hide-ornate-corner-studs="true"
              />
              <svg
                v-if="overlayId('enemy', idx) === 'melee_sword'"
                class="melee-sword-fx melee-sword-fx--mirror"
                viewBox="0 0 100 100"
                aria-hidden="true"
              >
                <path
                  class="melee-sword-fx__blade"
                  d="M82 14 L24 58 L30 66 L88 22 Z"
                />
                <path
                  class="melee-sword-fx__edge"
                  fill="none"
                  stroke="rgba(255, 252, 240, 0.95)"
                  stroke-width="1.2"
                  stroke-linecap="round"
                  d="M78 18 L28 58"
                />
              </svg>
            </div>
            <div class="tempo-track" v-if="props.replayEnemyBoard[idx]">
              <div class="tempo-fill" :style="{ width: `${props.tempoPercent('enemy', idx)}%` }"></div>
            </div>
            <div class="damage-pop" v-if="props.recentDamageBySlot[props.slotKey('enemy', idx)]">
              {{ props.recentDamageBySlot[props.slotKey("enemy", idx)] }}
            </div>
          </div>
        </div>
      </div>
    </div>
    <p class="slot-title" v-if="props.activeCombatLine">{{ t("game.replay") }}: {{ props.activeCombatLine }}</p>
    <RangedArrowProjectile
      v-if="projectileState?.kind === 'ranged'"
      :x1="projectileState.x1"
      :y1="projectileState.y1"
      :x2="projectileState.x2"
      :y2="projectileState.y2"
      :anim-key="projectileState.key"
      :reduced-motion="!!props.reducedMotion"
    />
    <MagicSpellProjectile
      v-if="projectileState?.kind === 'magic'"
      :spell="projectileState.spell"
      :x1="projectileState.x1"
      :y1="projectileState.y1"
      :x2="projectileState.x2"
      :y2="projectileState.y2"
      :anim-key="projectileState.key"
      :reduced-motion="!!props.reducedMotion"
    />
  </section>
</template>

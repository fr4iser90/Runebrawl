<script setup lang="ts">
import type { UnitInstance } from "@runebrawl/shared";
import { useI18n } from "../../../i18n/useI18n";

interface DuelMetaView {
  meName: string;
  opponentName: string;
}

interface TargetLineView {
  source: string;
  target: string;
  isHit: boolean;
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
  activeCombatLine: string;
  replayMyBoard: (ReplayUnit | null)[];
  replayEnemyBoard: (ReplayUnit | null)[];
  recentDamageBySlot: Record<string, string>;
  unitPortraitPath: (unitId: string) => string;
  unitBackplatePath: (unitId: string) => string | null;
  unitLabelReplay: (unit: ReplayUnit | null) => string;
  unitHpPercent: (unit: ReplayUnit | null) => number;
  unitPulseClass: (unit: UnitInstance | null, side: "me" | "enemy", slotIndex: number) => string;
  slotAnimationClass: (side: "me" | "enemy", idx: number) => string;
  slotHitClass: (side: "me" | "enemy", idx: number) => string;
  slotKey: (side: "me" | "enemy", idx: number) => string;
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
</script>

<template>
  <section class="combat-screen combat-board">
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
    <div class="combat-arena" v-if="props.myCombatOpponent">
      <div class="combat-side">
        <h3>{{ props.me.name }}</h3>
        <div class="slot-row">
          <div
            v-for="(unit, idx) in props.me.board"
            :key="`combat-me-${idx}`"
            class="slot"
            :class="[props.unitPulseClass(unit, 'me', idx), props.slotAnimationClass('me', idx), props.slotHitClass('me', idx)]"
          >
            <div class="slot-title">{{ t("game.slot", { index: idx + 1 }) }}</div>
            <div
              v-if="props.replayMyBoard[idx]"
              class="portrait-slot portrait-slot-mini"
              :class="{ dead: props.replayMyBoard[idx]?.isDead }"
              :style="backplateStyle(props.unitBackplatePath((props.replayMyBoard[idx] ?? null)?.unitId ?? ''))"
            >
              <img
                class="portrait-image"
                :src="props.unitPortraitPath((props.replayMyBoard[idx] ?? null)?.unitId ?? '')"
                :alt="(props.replayMyBoard[idx] ?? null)?.name ?? ''"
                loading="lazy"
              />
            </div>
            <div class="slot-unit">{{ props.unitLabelReplay(props.replayMyBoard[idx] ?? null) }}</div>
            <div class="hp-track" v-if="props.replayMyBoard[idx]">
              <div class="hp-fill" :style="{ width: `${props.unitHpPercent(props.replayMyBoard[idx])}%` }"></div>
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
            :class="[props.unitPulseClass(unit, 'enemy', idx), props.slotAnimationClass('enemy', idx), props.slotHitClass('enemy', idx)]"
          >
            <div class="slot-title">{{ t("game.slot", { index: idx + 1 }) }}</div>
            <div
              v-if="props.replayEnemyBoard[idx]"
              class="portrait-slot portrait-slot-mini"
              :class="{ dead: props.replayEnemyBoard[idx]?.isDead }"
              :style="backplateStyle(props.unitBackplatePath((props.replayEnemyBoard[idx] ?? null)?.unitId ?? ''))"
            >
              <img
                class="portrait-image"
                :src="props.unitPortraitPath((props.replayEnemyBoard[idx] ?? null)?.unitId ?? '')"
                :alt="(props.replayEnemyBoard[idx] ?? null)?.name ?? ''"
                loading="lazy"
              />
            </div>
            <div class="slot-unit">{{ props.unitLabelReplay(props.replayEnemyBoard[idx] ?? null) }}</div>
            <div class="hp-track" v-if="props.replayEnemyBoard[idx]">
              <div class="hp-fill" :style="{ width: `${props.unitHpPercent(props.replayEnemyBoard[idx])}%` }"></div>
            </div>
            <div class="damage-pop" v-if="props.recentDamageBySlot[props.slotKey('enemy', idx)]">
              {{ props.recentDamageBySlot[props.slotKey("enemy", idx)] }}
            </div>
          </div>
        </div>
      </div>
    </div>
    <p class="slot-title" v-if="props.activeCombatLine">{{ t("game.replay") }}: {{ props.activeCombatLine }}</p>
  </section>
</template>

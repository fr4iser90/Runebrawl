<script setup lang="ts">
import type { AbilityKey } from "@runebrawl/shared";
import type { UnitInstance } from "@runebrawl/shared";
import { useI18n } from "../../../i18n/useI18n";
import PortraitFrameSvg from "../../shared/PortraitFrameSvg.vue";
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
  abilityIconPath: (ability: AbilityKey) => string;
  abilityLabel: (ability: AbilityKey) => string;
  abilityDescription: (ability: AbilityKey) => string;
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

function frameTierClass(unit: ReplayUnit | null): "tier-low" | "tier-mid" | "tier-high" {
  const level = unit?.level ?? 1;
  if (level <= 2) return "tier-low";
  if (level <= 4) return "tier-mid";
  return "tier-high";
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
    <div class="combat-arena" v-if="props.myCombatOpponent">
      <div class="combat-side">
        <h3>{{ props.me.name }}</h3>
        <div class="slot-row">
          <div
            v-for="(unit, idx) in props.me.board"
            :key="`combat-me-${idx}`"
            class="slot"
            :class="[
              { 'slot--filled': !!props.replayMyBoard[idx] },
              props.unitPulseClass(unit, 'me', idx),
              props.slotAnimationClass('me', idx),
              props.slotHitClass('me', idx)
            ]"
          >
            <div class="slot-title">{{ t("game.slot", { index: idx + 1 }) }}</div>
            <div v-if="props.replayMyBoard[idx]" class="unit-card-chrome slot-card-chrome" :class="{ 'dead-fade': !!props.replayMyBoard[idx]?.isDead }">
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
            </div>
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
            :class="[
              { 'slot--filled': !!props.replayEnemyBoard[idx] },
              props.unitPulseClass(unit, 'enemy', idx),
              props.slotAnimationClass('enemy', idx),
              props.slotHitClass('enemy', idx)
            ]"
          >
            <div class="slot-title">{{ t("game.slot", { index: idx + 1 }) }}</div>
            <div v-if="props.replayEnemyBoard[idx]" class="unit-card-chrome slot-card-chrome" :class="{ 'dead-fade': !!props.replayEnemyBoard[idx]?.isDead }">
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
            </div>
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

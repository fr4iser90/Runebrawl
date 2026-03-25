<script setup lang="ts">
import type { SynergyKey, UnitInstance } from "@runebrawl/shared";
import { useI18n } from "../../i18n/useI18n";

interface MeView {
  board: (UnitInstance | null)[];
  bench: (UnitInstance | null)[];
}

const props = defineProps<{
  me: MeView;
  isBuyPhase: boolean;
  tutorialStepKey: "hero" | "buy" | "move" | "ready" | "watch" | null;
  unitPortraitPath: (unitId: string) => string;
  unitQuickMeta: (unit: UnitInstance | null) => string;
  abilityLabel: (ability: UnitInstance["ability"]) => string;
  abilityDescription: (ability: UnitInstance["ability"]) => string;
  abilityIconPath: (ability: UnitInstance["ability"]) => string;
  synergyLabel: (synergy: SynergyKey) => string;
}>();

const emit = defineEmits<{
  (e: "sell", zone: "bench" | "board", index: number): void;
  (e: "dragstart", zone: "bench" | "board", index: number): void;
  (e: "drop", zone: "bench" | "board", index: number): void;
}>();

const { t } = useI18n();
</script>

<template>
  <section class="board" :class="{ 'tutorial-move-highlight': props.tutorialStepKey === 'move' }">
    <h2>{{ t("game.battlefield") }}</h2>
    <div class="slot-row">
      <div
        v-for="(unit, idx) in props.me.board"
        :key="`board-${idx}`"
        class="slot"
        draggable="true"
        @dragstart="emit('dragstart', 'board', idx)"
        @dragover.prevent
        @drop="emit('drop', 'board', idx)"
      >
        <div class="slot-title">{{ t("game.boardSlot", { index: idx + 1 }) }}</div>
        <div v-if="unit" class="portrait-slot portrait-slot-mini">
          <img class="portrait-image" :src="props.unitPortraitPath(unit.unitId)" :alt="unit.name" loading="lazy" />
        </div>
        <div class="slot-unit">{{ props.unitQuickMeta(unit) }}</div>
        <div
          v-if="unit"
          class="slot-mini-meta"
          :title="`${props.abilityLabel(unit.ability)}: ${props.abilityDescription(unit.ability)}`"
        >
          <img class="chip-icon" :src="props.abilityIconPath(unit.ability)" alt="" />
          {{ props.abilityLabel(unit.ability) }}
        </div>
        <div v-if="unit && (unit.tags?.length ?? 0) > 0" class="slot-mini-meta">
          {{ (unit.tags ?? []).map((s) => props.synergyLabel(s)).join(" • ") }}
        </div>
        <button v-if="unit && props.isBuyPhase" @click="emit('sell', 'board', idx)">{{ t("game.sell1") }}</button>
      </div>
    </div>

    <h2>{{ t("game.bench") }}</h2>
    <div class="slot-row">
      <div
        v-for="(unit, idx) in props.me.bench"
        :key="`bench-${idx}`"
        class="slot bench-slot"
        draggable="true"
        @dragstart="emit('dragstart', 'bench', idx)"
        @dragover.prevent
        @drop="emit('drop', 'bench', idx)"
      >
        <div class="slot-title">{{ t("game.benchSlot", { index: idx + 1 }) }}</div>
        <div v-if="unit" class="portrait-slot portrait-slot-mini">
          <img class="portrait-image" :src="props.unitPortraitPath(unit.unitId)" :alt="unit.name" loading="lazy" />
        </div>
        <div class="slot-unit">{{ props.unitQuickMeta(unit) }}</div>
        <div
          v-if="unit"
          class="slot-mini-meta"
          :title="`${props.abilityLabel(unit.ability)}: ${props.abilityDescription(unit.ability)}`"
        >
          <img class="chip-icon" :src="props.abilityIconPath(unit.ability)" alt="" />
          {{ props.abilityLabel(unit.ability) }}
        </div>
        <div v-if="unit && (unit.tags?.length ?? 0) > 0" class="slot-mini-meta">
          {{ (unit.tags ?? []).map((s) => props.synergyLabel(s)).join(" • ") }}
        </div>
        <button v-if="unit && props.isBuyPhase" @click="emit('sell', 'bench', idx)">{{ t("game.sell1") }}</button>
      </div>
    </div>
  </section>
</template>

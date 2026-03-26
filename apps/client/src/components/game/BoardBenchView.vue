<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import type { SynergyKey, UnitInstance } from "@runebrawl/shared";
import { useI18n } from "../../i18n/useI18n";
import { benchDensityClass as densityClassForBench } from "./layoutDensity";
import PortraitFrameSvg from "../shared/PortraitFrameSvg.vue";
import { unitCardFromInstance } from "./cards/unitCardVm";
import UnitCardFrameCorners from "./cards/UnitCardFrameCorners.vue";

interface MeView {
  board: (UnitInstance | null)[];
  bench: (UnitInstance | null)[];
}

const props = defineProps<{
  me: MeView;
  isBuyPhase: boolean;
  tutorialStepKey: "hero" | "buy" | "move" | "ready" | "watch" | null;
  statGoldIcon: string;
  unitPortraitPath: (unitId: string) => string;
  unitBackplatePath: (unitId: string) => string | null;
  unitQuickMeta: (unit: UnitInstance | null) => string;
  abilityLabel: (ability: UnitInstance["ability"]) => string;
  abilityDescription: (ability: UnitInstance["ability"]) => string;
  abilityIconPath: (ability: UnitInstance["ability"]) => string;
  synergyLabel: (synergy: SynergyKey) => string;
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

const emit = defineEmits<{
  (e: "sell", zone: "bench" | "board", index: number): void;
  (e: "dragstart", zone: "bench" | "board", index: number): void;
  (e: "drop", zone: "bench" | "board", index: number): void;
}>();

const { t } = useI18n();
const benchDensityClass = computed(() => densityClassForBench(props.me.bench.length));
const boardCards = computed(() => props.me.board.map((unit) => (unit ? unitCardFromInstance(unit, "board", { canSell: props.isBuyPhase, canDrag: true }) : null)));
const benchCards = computed(() => props.me.bench.map((unit) => (unit ? unitCardFromInstance(unit, "bench", { canSell: props.isBuyPhase, canDrag: true }) : null)));
const hoveredUnit = ref<UnitInstance | null>(null);
const hoverCursor = ref<{ x: number; y: number } | null>(null);
let hoverTimer: number | null = null;

const boardPreviewStyle = computed<Record<string, string> | undefined>(() => {
  if (!hoverCursor.value || typeof window === "undefined") return undefined;
  const panelWidth = 260;
  const panelHeight = 320;
  const offset = 14;
  const pad = 8;
  const placeRight = hoverCursor.value.x + offset + panelWidth <= window.innerWidth - pad;
  const placeBelow = hoverCursor.value.y + offset + panelHeight <= window.innerHeight - pad;

  const desiredLeft = placeRight ? hoverCursor.value.x + offset : hoverCursor.value.x - panelWidth - offset;
  const desiredTop = placeBelow ? hoverCursor.value.y + offset : hoverCursor.value.y - panelHeight - offset;

  const left = Math.min(window.innerWidth - panelWidth - pad, Math.max(pad, desiredLeft));
  const top = Math.min(window.innerHeight - panelHeight - pad, Math.max(pad, desiredTop));
  return { left: `${left}px`, top: `${top}px` };
});

function shortSynergyLabel(synergy: SynergyKey): string {
  return props.synergyLabel(synergy).slice(0, 3).toUpperCase();
}

function frameTierClass(unit: UnitInstance): "tier-low" | "tier-mid" | "tier-high" {
  if (unit.level <= 2) return "tier-low";
  if (unit.level <= 4) return "tier-mid";
  return "tier-high";
}

function onSlotHover(unit: UnitInstance | null, event?: Event): void {
  if (!unit) return;
  if (event instanceof MouseEvent) {
    hoverCursor.value = { x: event.clientX, y: event.clientY };
  }
  if (hoverTimer !== null) window.clearTimeout(hoverTimer);
  hoverTimer = window.setTimeout(() => {
    hoveredUnit.value = unit;
    hoverTimer = null;
  }, 140);
}

function onSlotLeave(): void {
  if (hoverTimer !== null) {
    window.clearTimeout(hoverTimer);
    hoverTimer = null;
  }
  hoveredUnit.value = null;
  hoverCursor.value = null;
}

onBeforeUnmount(() => {
  if (hoverTimer !== null) {
    window.clearTimeout(hoverTimer);
    hoverTimer = null;
  }
});
</script>

<template>
  <section class="board" :class="{ 'tutorial-move-highlight': props.tutorialStepKey === 'move' }">
    <section class="board-zone">
      <header class="zone-header">
        <h2>{{ t("game.battlefield") }}</h2>
      </header>
      <div class="slot-row board-row">
        <div
          v-for="(card, idx) in boardCards"
          :key="`board-${idx}`"
          class="slot"
          draggable="true"
          @dragstart="emit('dragstart', 'board', idx)"
          @dragover.prevent
          @drop="emit('drop', 'board', idx)"
          @mouseenter="onSlotHover(props.me.board[idx], $event)"
          @mousemove="onSlotHover(props.me.board[idx], $event)"
          @focusin="onSlotHover(props.me.board[idx], $event)"
          @mouseleave="onSlotLeave"
        >
          <div v-if="!card" class="slot-title">{{ t("game.boardSlot", { index: idx + 1 }) }}</div>
          <button
            v-if="card && props.isBuyPhase"
            class="slot-sell-icon"
            :title="t('game.sell1')"
            :aria-label="t('game.sell1')"
            @click="emit('sell', 'board', idx)"
          >
            <img class="chip-icon" :src="props.statGoldIcon" alt="" />
            +1
          </button>
          <div v-if="card" class="unit-card-chrome slot-card-chrome">
            <div class="unit-card-chrome__content slot-card-content">
              <div class="portrait-slot portrait-slot-mini portrait-slot--svg-frame" :style="backplateStyle(props.unitBackplatePath(card.portraitUnitId))">
                <img class="portrait-image" :src="props.unitPortraitPath(card.portraitUnitId)" :alt="card.name" loading="lazy" />
              </div>
            </div>
            <UnitCardFrameCorners
              :tier="card.tier"
              :atk="card.stats.atk"
              :hp="card.stats.hp"
              :speed="card.stats.speed ?? 0"
              :ability-icon-url="props.abilityIconPath(card.ability)"
              :ability-title="`${props.abilityLabel(card.ability)}: ${props.abilityDescription(card.ability)}`"
            />
            <PortraitFrameSvg
              frame-id="ornate"
              :tier-class="frameTierClass(props.me.board[idx] as UnitInstance)"
              scope="unitShopCard"
              :hide-ornate-corner-studs="true"
            />
          </div>
          <div class="slot-unit" v-else>{{ props.unitQuickMeta(props.me.board[idx]) }}</div>
          <div v-if="card && (card.tags.length ?? 0) > 0" class="slot-badge-row">
            <span v-for="tag in card.tags.slice(0, 2)" :key="`board-tag-${idx}-${tag}`" class="slot-badge tag">
              {{ shortSynergyLabel(tag) }}
            </span>
          </div>
        </div>
      </div>
    </section>

    <section class="bench-zone" :class="benchDensityClass">
      <header class="zone-header">
        <h2>{{ t("game.bench") }}</h2>
      </header>
      <div class="slot-row bench-row">
        <div
          v-for="(card, idx) in benchCards"
          :key="`bench-${idx}`"
          class="slot bench-slot"
          draggable="true"
          @dragstart="emit('dragstart', 'bench', idx)"
          @dragover.prevent
          @drop="emit('drop', 'bench', idx)"
          @mouseenter="onSlotHover(props.me.bench[idx], $event)"
          @mousemove="onSlotHover(props.me.bench[idx], $event)"
          @focusin="onSlotHover(props.me.bench[idx], $event)"
          @mouseleave="onSlotLeave"
        >
          <div v-if="!card" class="slot-title">{{ t("game.benchSlot", { index: idx + 1 }) }}</div>
          <button
            v-if="card && props.isBuyPhase"
            class="slot-sell-icon"
            :title="t('game.sell1')"
            :aria-label="t('game.sell1')"
            @click="emit('sell', 'bench', idx)"
          >
            <img class="chip-icon" :src="props.statGoldIcon" alt="" />
            +1
          </button>
          <div v-if="card" class="unit-card-chrome slot-card-chrome">
            <div class="unit-card-chrome__content slot-card-content">
              <div class="portrait-slot portrait-slot-mini portrait-slot--svg-frame" :style="backplateStyle(props.unitBackplatePath(card.portraitUnitId))">
                <img class="portrait-image" :src="props.unitPortraitPath(card.portraitUnitId)" :alt="card.name" loading="lazy" />
              </div>
            </div>
            <UnitCardFrameCorners
              :tier="card.tier"
              :atk="card.stats.atk"
              :hp="card.stats.hp"
              :speed="card.stats.speed ?? 0"
              :ability-icon-url="props.abilityIconPath(card.ability)"
              :ability-title="`${props.abilityLabel(card.ability)}: ${props.abilityDescription(card.ability)}`"
            />
            <PortraitFrameSvg
              frame-id="ornate"
              :tier-class="frameTierClass(props.me.bench[idx] as UnitInstance)"
              scope="unitShopCard"
              :hide-ornate-corner-studs="true"
            />
          </div>
          <div class="slot-unit" v-else>{{ props.unitQuickMeta(props.me.bench[idx]) }}</div>
          <div v-if="card && (card.tags.length ?? 0) > 0" class="slot-badge-row">
            <span v-for="tag in card.tags.slice(0, 2)" :key="`bench-tag-${idx}-${tag}`" class="slot-badge tag">
              {{ shortSynergyLabel(tag) }}
            </span>
          </div>
        </div>
      </div>
    </section>
    <aside v-if="hoveredUnit" class="board-hover-preview" :style="boardPreviewStyle">
      <div class="board-hover-preview-title">{{ hoveredUnit.name }}</div>
      <div class="board-hover-preview-portrait" :style="backplateStyle(props.unitBackplatePath(hoveredUnit.unitId))">
        <img class="portrait-image portrait-image-contain" :src="props.unitPortraitPath(hoveredUnit.unitId)" :alt="hoveredUnit.name" loading="lazy" />
      </div>
      <div class="board-hover-preview-meta">
        <span class="meta-chip">{{ props.unitQuickMeta(hoveredUnit) }}</span>
      </div>
      <div class="board-hover-preview-ability">
        <img class="chip-icon" :src="props.abilityIconPath(hoveredUnit.ability)" alt="" />
        <span>{{ props.abilityLabel(hoveredUnit.ability) }}</span>
      </div>
      <div v-if="(hoveredUnit.tags?.length ?? 0) > 0" class="board-hover-preview-tags">
        <span v-for="tag in hoveredUnit.tags ?? []" :key="`hover-tag-${tag}`" class="meta-chip tag-chip">{{ props.synergyLabel(tag) }}</span>
      </div>
    </aside>
  </section>
</template>

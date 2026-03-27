<script setup lang="ts">
import { computed } from "vue";
import {
  ORNATE_BOTTOM_CENTER_ABILITY,
  studBadgeBoxStyle,
  studByCorner,
  studCenterStyle
} from "./unitCardFrameGeometry";

const props = defineProps<{
  tier: number;
  atk: number;
  hp: number;
  abilityIconUrl: string;
  abilityTitle?: string;
  tierAriaLabel?: string;
}>();

const tl = studByCorner("tl");
const bl = studByCorner("bl");
const br = studByCorner("br");
const bm = ORNATE_BOTTOM_CENTER_ABILITY;

const tierStyle = computed(() => ({
  ...studCenterStyle(tl.cx, tl.cy),
  ...studBadgeBoxStyle(tl.r)
}));

const atkStyle = computed(() => ({
  ...studCenterStyle(bl.cx, bl.cy),
  ...studBadgeBoxStyle(bl.r)
}));

const hpStyle = computed(() => ({
  ...studCenterStyle(br.cx, br.cy),
  ...studBadgeBoxStyle(br.r)
}));

const abilityStyle = computed(() => ({
  ...studCenterStyle(bm.cx, bm.cy),
  ...studBadgeBoxStyle(bm.r)
}));
</script>

<template>
  <div class="unit-card-frame-corners">
    <!-- TL: Tier -->
    <div class="unit-card-frame-corners__hitbox" :style="tierStyle">
      <span class="unit-card-frame-corners__tier" :aria-label="props.tierAriaLabel ?? `Tier ${props.tier}`">T{{ props.tier }}</span>
    </div>
    <!-- BL: Attack -->
    <div class="unit-card-frame-corners__hitbox" :style="atkStyle">
      <span class="unit-card-frame-corners__stat unit-card-frame-corners__stat--atk" :aria-label="`Attack ${props.atk}`">{{ props.atk }}</span>
    </div>
    <!-- Bottom center: Ability -->
    <div class="unit-card-frame-corners__hitbox" :style="abilityStyle" aria-hidden="true">
      <img
        class="unit-card-frame-corners__ability"
        :src="props.abilityIconUrl"
        alt=""
        :title="props.abilityTitle"
      />
    </div>
    <!-- BR: Health -->
    <div class="unit-card-frame-corners__hitbox" :style="hpStyle">
      <span class="unit-card-frame-corners__stat unit-card-frame-corners__stat--hp" :aria-label="`Health ${props.hp}`">{{ props.hp }}</span>
    </div>
  </div>
</template>

<style scoped>
.unit-card-frame-corners {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}

.unit-card-frame-corners,
.unit-card-frame-corners * {
  pointer-events: none;
}

.unit-card-frame-corners__hitbox {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  container-type: size;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, #f4d888 0%, #c9a050 52%, #7a5520 100%);
  box-shadow:
    inset 0 0 0 0.1em rgba(40, 28, 8, 0.55),
    0 0.06em 0.12em rgba(0, 0, 0, 0.45);
}

.unit-card-frame-corners__tier,
.unit-card-frame-corners__stat {
  font-weight: 800;
  line-height: 1;
  text-align: center;
  font-size: min(0.78rem, 88cqmin);
  max-width: 100%;
  overflow: hidden;
  text-overflow: clip;
}

.unit-card-frame-corners__tier {
  color: #1a1208;
}

.unit-card-frame-corners__stat--atk {
  color: #f0c8a8;
  text-shadow: 0 0 0.12em rgba(0, 0, 0, 0.95);
}

.unit-card-frame-corners__stat--hp {
  color: #a8f0c0;
  text-shadow: 0 0 0.12em rgba(0, 0, 0, 0.95);
}

.unit-card-frame-corners__ability {
  width: 78%;
  height: 78%;
  object-fit: contain;
  filter: drop-shadow(0 0 0.14em rgba(0, 0, 0, 0.9));
}
</style>

<script setup lang="ts">
import { computed, useId } from "vue";
import type { MagicSpellVisualId } from "@runebrawl/shared";

const props = withDefaults(
  defineProps<{
    spell: MagicSpellVisualId;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    animKey: number;
    reducedMotion?: boolean;
  }>(),
  { reducedMotion: false }
);

const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");

const len = computed(() => Math.hypot(props.x2 - props.x1, props.y2 - props.y1));

const lineDashStyle = computed(() => ({
  "--spell-len": `${Math.max(28, len.value)}px`
}));

/** Arcane: secondary missiles along the path */
const arcaneShards = computed(() => {
  const { x1, y1, x2, y2 } = props;
  const dx = x2 - x1;
  const dy = y2 - y1;
  return [0.18, 0.42, 0.68].map((t, i) => ({
    x: x1 + dx * t,
    y: y1 + dy * t,
    delay: i * 28,
    key: i
  }));
});

/** Ice: perpendicular offset for multi-streak “storm” */
const iceNormal = computed(() => {
  const dx = props.x2 - props.x1;
  const dy = props.y2 - props.y1;
  const L = Math.hypot(dx, dy) || 1;
  return { nx: (-dy / L) * 4, ny: (dx / L) * 4 };
});

const iceFlakes = computed(() => {
  const { x1, y1, x2, y2 } = props;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const { nx, ny } = iceNormal.value;
  const jitter = [1, -0.7, 0.5, -1.1, 0.8];
  return [0.12, 0.32, 0.52, 0.72, 0.88].map((t, i) => ({
    x: x1 + dx * t + nx * jitter[i]! * 0.35,
    y: y1 + dy * t + ny * jitter[i]! * 0.35,
    r: 2.2 + (i % 3) * 0.6,
    key: i
  }));
});

const gradArcane = `ms-arc-${uid}`;
const gradFire = `ms-fire-${uid}`;
const gradIce = `ms-ice-${uid}`;
const filterFire = `ms-fire-glow-${uid}`;
</script>

<template>
  <Teleport to="body">
    <div
      class="magic-spell-projectile"
      :class="[`magic-spell-projectile--${spell}`, { 'magic-spell-projectile--reduced': props.reducedMotion }]"
      :key="animKey"
      aria-hidden="true"
    >
      <!-- Arcane Missile: violet arcane streak + secondary missiles -->
      <svg
        v-if="spell === 'arcane_missile'"
        class="magic-spell-projectile__svg"
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
      >
        <defs>
          <linearGradient :id="gradArcane" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#fdf4ff" />
            <stop offset="35%" stop-color="#d8b4fe" />
            <stop offset="100%" stop-color="#6b21a8" />
          </linearGradient>
        </defs>
        <line
          class="magic-spell-projectile__anim arcane-missile__beam"
          :x1="x1"
          :y1="y1"
          :x2="x2"
          :y2="y2"
          :stroke="`url(#${gradArcane})`"
          stroke-width="2.8"
          stroke-linecap="round"
          :style="lineDashStyle"
        />
        <g v-for="s in arcaneShards" :key="s.key">
          <circle
            class="magic-spell-projectile__anim--fade arcane-missile__orb"
            :cx="s.x"
            :cy="s.y"
            r="5"
            :stroke="`url(#${gradArcane})`"
            fill="rgba(250, 245, 255, 0.35)"
            stroke-width="1.2"
            :style="{ animationDelay: `${s.delay}ms` }"
          />
        </g>
      </svg>

      <!-- Fireball: roaring flame trail -->
      <svg
        v-else-if="spell === 'fireball'"
        class="magic-spell-projectile__svg"
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
      >
        <defs>
          <linearGradient :id="gradFire" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#fffbeb" />
            <stop offset="25%" stop-color="#fcd34d" />
            <stop offset="55%" stop-color="#f97316" />
            <stop offset="100%" stop-color="#9a3412" />
          </linearGradient>
          <filter :id="filterFire" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <line
          class="magic-spell-projectile__anim fireball__core"
          :x1="x1"
          :y1="y1"
          :x2="x2"
          :y2="y2"
          :stroke="`url(#${gradFire})`"
          stroke-width="6"
          stroke-linecap="round"
          :filter="`url(#${filterFire})`"
          :style="lineDashStyle"
        />
        <line
          class="magic-spell-projectile__anim fireball__ember"
          :x1="x1"
          :y1="y1"
          :x2="x2"
          :y2="y2"
          :stroke="`url(#${gradFire})`"
          stroke-width="2.2"
          stroke-linecap="round"
          opacity="0.95"
          :style="lineDashStyle"
        />
      </svg>

      <!-- Ice Storm: frost streaks + flakes -->
      <svg
        v-else-if="spell === 'ice_storm'"
        class="magic-spell-projectile__svg"
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
      >
        <defs>
          <linearGradient :id="gradIce" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#f0f9ff" />
            <stop offset="50%" stop-color="#7dd3fc" />
            <stop offset="100%" stop-color="#0369a1" />
          </linearGradient>
        </defs>
        <line
          class="magic-spell-projectile__anim ice-storm__main"
          :x1="x1"
          :y1="y1"
          :x2="x2"
          :y2="y2"
          :stroke="`url(#${gradIce})`"
          stroke-width="3.2"
          stroke-linecap="round"
          :style="lineDashStyle"
        />
        <line
          class="magic-spell-projectile__anim ice-storm__side"
          :x1="x1 + iceNormal.nx"
          :y1="y1 + iceNormal.ny"
          :x2="x2 + iceNormal.nx"
          :y2="y2 + iceNormal.ny"
          :stroke="`url(#${gradIce})`"
          stroke-width="1.6"
          stroke-linecap="round"
          opacity="0.85"
          :style="lineDashStyle"
        />
        <line
          class="magic-spell-projectile__anim ice-storm__side"
          :x1="x1 - iceNormal.nx"
          :y1="y1 - iceNormal.ny"
          :x2="x2 - iceNormal.nx"
          :y2="y2 - iceNormal.ny"
          :stroke="`url(#${gradIce})`"
          stroke-width="1.6"
          stroke-linecap="round"
          opacity="0.85"
          :style="lineDashStyle"
        />
        <circle
          v-for="f in iceFlakes"
          :key="f.key"
          class="magic-spell-projectile__anim--fade ice-storm__flake"
          :cx="f.x"
          :cy="f.y"
          :r="f.r"
          fill="rgba(240, 249, 255, 0.95)"
          stroke="#bae6fd"
          stroke-width="0.5"
          :style="{ animationDelay: `${f.key * 40}ms` }"
        />
      </svg>
    </div>
  </Teleport>
</template>

<style scoped>
.magic-spell-projectile {
  position: fixed;
  inset: 0;
  z-index: 10050;
  pointer-events: none;
}

.magic-spell-projectile__svg {
  position: fixed;
  left: 0;
  top: 0;
  width: 100vw;
  height: 100dvh;
  max-height: 100vh;
  overflow: visible;
}

.magic-spell-projectile__anim {
  stroke-dasharray: var(--spell-len);
  stroke-dashoffset: var(--spell-len);
}

.magic-spell-projectile--arcane_missile .arcane-missile__beam {
  filter: drop-shadow(0 0 5px rgba(192, 132, 252, 0.95)) drop-shadow(0 0 2px rgba(233, 213, 255, 0.9));
  animation: magic-spell-reveal 0.18s ease-out forwards;
}

.magic-spell-projectile--arcane_missile .arcane-missile__orb {
  animation: arcane-orb-pop 0.2s ease-out forwards;
  opacity: 0;
}

.magic-spell-projectile--fireball .fireball__core {
  animation: magic-spell-reveal 0.22s ease-out forwards;
}

.magic-spell-projectile--fireball .fireball__ember {
  animation: magic-spell-reveal 0.22s ease-out forwards;
}

.magic-spell-projectile--ice_storm .ice-storm__main,
.magic-spell-projectile--ice_storm .ice-storm__side {
  filter: drop-shadow(0 0 4px rgba(125, 211, 252, 0.85));
  animation: magic-spell-reveal 0.26s ease-out forwards;
}

.magic-spell-projectile--ice_storm .ice-storm__side {
  animation-delay: 0.02s;
}

.magic-spell-projectile--ice_storm .ice-storm__side + .ice-storm__side {
  animation-delay: 0.04s;
}

.magic-spell-projectile__anim--fade.ice-storm__flake {
  animation: ice-flake-twinkle 0.32s ease-out forwards;
  opacity: 0;
}

@keyframes magic-spell-reveal {
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes arcane-orb-pop {
  0% {
    opacity: 0;
    transform: scale(0.4);
  }
  45% {
    opacity: 1;
  }
  100% {
    opacity: 0.85;
    transform: scale(1);
  }
}

@keyframes ice-flake-twinkle {
  0% {
    opacity: 0;
    transform: scale(0.3);
  }
  40% {
    opacity: 1;
  }
  100% {
    opacity: 0.65;
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .magic-spell-projectile__anim {
    animation: none !important;
    stroke-dashoffset: 0 !important;
  }

  .arcane-missile__orb,
  .ice-storm__flake {
    animation: none !important;
    opacity: 0.85;
  }
}

.magic-spell-projectile--reduced .magic-spell-projectile__anim {
  animation: none !important;
  stroke-dashoffset: 0 !important;
}

.magic-spell-projectile--reduced .arcane-missile__orb,
.magic-spell-projectile--reduced .ice-storm__flake {
  animation: none !important;
  opacity: 0.9;
}
</style>

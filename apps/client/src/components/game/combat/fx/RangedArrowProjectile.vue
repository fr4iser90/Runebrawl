<script setup lang="ts">
import { computed, useId } from "vue";

const props = withDefaults(
  defineProps<{
    /** Client / viewport coordinates (getBoundingClientRect space) */
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    /** Bump to restart CSS animation */
    animKey: number;
    /** In-game "Pause FX" — disables stroke animation (same as prefers-reduced-motion) */
    reducedMotion?: boolean;
  }>(),
  { reducedMotion: false }
);

const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
const markerId = `arrowhead-${uid}`;
const gradId = `ranged-arrow-grad-${uid}`;

const len = computed(() => Math.hypot(props.x2 - props.x1, props.y2 - props.y1));

const lineStyle = computed(() => ({
  "--arrow-len": `${Math.max(24, len.value)}px`
}));

const strokePaint = computed(() => `url(#${gradId})`);
const markerEnd = computed(() => `url(#${markerId})`);
</script>

<template>
  <Teleport to="body">
    <div
      class="ranged-arrow-projectile"
      :class="{ 'ranged-arrow-projectile--reduced': props.reducedMotion }"
      :key="animKey"
      aria-hidden="true"
    >
      <svg
        class="ranged-arrow-projectile__svg"
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
      >
        <defs>
          <linearGradient :id="gradId" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#fff8e8" />
            <stop offset="100%" stop-color="#c9a050" />
          </linearGradient>
          <marker
            :id="markerId"
            marker-width="10"
            marker-height="10"
            :refX="9"
            :refY="3"
            orient="auto"
            marker-units="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill="#f0d080" stroke="#8b6220" stroke-width="0.4" />
          </marker>
        </defs>
        <line
          class="ranged-arrow-projectile__line"
          :x1="x1"
          :y1="y1"
          :x2="x2"
          :y2="y2"
          :stroke="strokePaint"
          :marker-end="markerEnd"
          stroke-width="2.5"
          stroke-linecap="round"
          :style="lineStyle"
        />
      </svg>
    </div>
  </Teleport>
</template>

<style scoped>
.ranged-arrow-projectile {
  position: fixed;
  inset: 0;
  z-index: 10050;
  pointer-events: none;
}

.ranged-arrow-projectile__svg {
  position: fixed;
  left: 0;
  top: 0;
  width: 100vw;
  height: 100dvh;
  max-height: 100vh;
  overflow: visible;
}

.ranged-arrow-projectile__line {
  stroke-dasharray: var(--arrow-len);
  stroke-dashoffset: var(--arrow-len);
  filter: drop-shadow(0 0 4px rgba(255, 200, 80, 0.95));
  animation: ranged-arrow-shoot 0.15s ease-out forwards;
}

@keyframes ranged-arrow-shoot {
  to {
    stroke-dashoffset: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ranged-arrow-projectile__line {
    animation: none;
    stroke-dashoffset: 0;
  }
}

.ranged-arrow-projectile--reduced .ranged-arrow-projectile__line {
  animation: none;
  stroke-dashoffset: 0;
}
</style>

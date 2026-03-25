<script setup lang="ts">
import { computed, useId } from "vue";
import type { PortraitFrameId } from "../content/portraitFrameStyles";

const props = defineProps<{
  frameId: PortraitFrameId;
  tierClass: "tier-low" | "tier-mid" | "tier-high";
}>();

const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");

const accent = computed(() => {
  switch (props.tierClass) {
    case "tier-mid":
      return { stroke: "#a78ee8", glow: "#6b4fb8", soft: "#c9b6f5" };
    case "tier-high":
      return { stroke: "#e8c060", glow: "#a07020", soft: "#fff0b8" };
    default:
      return { stroke: "#7a9ad8", glow: "#3d5a8a", soft: "#b8cef5" };
  }
});
</script>

<template>
  <svg
    class="portrait-frame-svg-root"
    viewBox="0 0 100 128"
    preserveAspectRatio="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <defs>
      <linearGradient :id="`pf-orn-${uid}`" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f0d080" />
        <stop offset="35%" stop-color="#c9a050" />
        <stop offset="70%" stop-color="#8b6220" />
        <stop offset="100%" stop-color="#d4a85a" />
      </linearGradient>
      <linearGradient :id="`pf-orn-hi-${uid}`" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#fff8e0" stop-opacity="0.95" />
        <stop offset="50%" stop-color="#ffe8a0" stop-opacity="0.35" />
        <stop offset="100%" stop-color="#ffd060" stop-opacity="0" />
      </linearGradient>
      <filter :id="`pf-rim-${uid}`" x="-35%" y="-35%" width="170%" height="170%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
        <feColorMatrix
          in="blur"
          type="matrix"
          values="0.5 0.7 1 0 0  0.4 0.65 1 0 0  0.3 0.55 1 0 0  0 0 0 0.55 0"
          result="glow"
        />
        <feMerge>
          <feMergeNode in="glow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <mask :id="`pf-orn-mask-${uid}`" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="128">
        <rect x="0" y="0" width="100" height="128" fill="white" />
        <rect x="8" y="10" width="84" height="108" rx="2.5" ry="2.5" fill="black" />
      </mask>
    </defs>

    <!-- shop_tier: cut-corner tactical frame, tier-colored -->
    <g v-if="props.frameId === 'shop_tier'" class="pf-layer" fill="none" :stroke="accent.stroke" stroke-linejoin="miter">
      <path
        stroke-width="2.4"
        :d="`M 6 3 L 94 3 L 99 8 L 99 120 L 94 125 L 6 125 L 1 120 L 1 8 Z`"
      />
      <path stroke-width="0.9" stroke-opacity="0.45" :d="`M 10 7 L 90 7 L 94 11 L 94 117 L 90 121 L 10 121 L 6 117 L 6 11 Z`" />
    </g>

    <!-- minimal: thin double line, cool neutral -->
    <g v-else-if="props.frameId === 'minimal'" class="pf-layer" fill="none">
      <rect x="2.5" y="2.5" width="95" height="123" rx="7" stroke="#5a6e9e" stroke-width="1.1" />
      <rect x="5" y="5" width="90" height="118" rx="5" stroke="#3d4d78" stroke-width="0.75" stroke-opacity="0.85" />
    </g>

    <!-- ornate: gold ring (mask) + studs + highlight strokes -->
    <g v-else-if="props.frameId === 'ornate'" class="pf-layer">
      <rect
        x="0"
        y="0"
        width="100"
        height="128"
        :fill="`url(#pf-orn-${uid})`"
        :mask="`url(#pf-orn-mask-${uid})`"
      />
      <path
        fill="none"
        stroke="#2a1a08"
        stroke-width="0.85"
        d="M 6 7 L 94 7 L 97 10 L 97 118 L 94 121 L 6 121 L 3 118 L 3 10 Z"
      />
      <path
        fill="none"
        :stroke="`url(#pf-orn-hi-${uid})`"
        stroke-width="0.9"
        d="M 5 6 L 95 6 L 98.5 9.5 L 98.5 118.5 L 95 122 L 5 122 L 1.5 118.5 L 1.5 9.5 Z"
      />
      <g fill="#e8c070" stroke="#5c4018" stroke-width="0.25">
        <circle cx="6.5" cy="7.5" r="2.4" />
        <circle cx="93.5" cy="7.5" r="2.4" />
        <circle cx="93.5" cy="120.5" r="2.4" />
        <circle cx="6.5" cy="120.5" r="2.4" />
      </g>
    </g>

    <!-- rim: outer glow + tier accent stroke -->
    <g v-else class="pf-layer" :filter="`url(#pf-rim-${uid})`" fill="none">
      <rect
        x="3"
        y="3"
        width="94"
        height="122"
        rx="9"
        :stroke="accent.stroke"
        stroke-width="2.8"
        stroke-opacity="0.35"
      />
      <rect
        x="4.5"
        y="4.5"
        width="91"
        height="119"
        rx="7.5"
        :stroke="accent.soft"
        stroke-width="1.2"
        stroke-opacity="0.9"
      />
      <rect
        x="6"
        y="6"
        width="88"
        height="116"
        rx="6"
        :stroke="accent.glow"
        stroke-width="0.85"
      />
    </g>
  </svg>
</template>

<style scoped>
.portrait-frame-svg-root {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>

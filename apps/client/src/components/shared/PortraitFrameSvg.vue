<script setup lang="ts">
import { computed, useId } from "vue";
import type { PortraitFrameId } from "../../content/portraitFrameStyles";

/**
 * Unit shop card chrome (preview / tooling):
 *
 * unitShopCard scope — one visual “card” = frame around everything players read:
 *   1. PortraitRegion — art (object-fit cover), top ~65% of inner area
 *   2. TitleRow — unit name (bold)
 *   3. StatRow — tier chip, role chip (and later: ability, synergy dots, etc.)
 *
 * SVG sits above HTML (z-index 1); strokes sit on the perimeter + optional divider;
 * interior is transparent so text stays readable (content z-index 0, can raise if needed).
 *
 * portraitOnly scope — legacy: frame around the portrait slot only (narrower viewBox).
 */
type ShopCardFrameScope = "unitShopCard" | "portraitOnly";

const props = withDefaults(
  defineProps<{
    frameId: PortraitFrameId;
    tierClass: "tier-low" | "tier-mid" | "tier-high";
    /** unitShopCard: frame around portrait + name + chips (admin / suggest). */
    scope?: ShopCardFrameScope;
    /**
     * When true, ornate frame does not draw the four gold stud circles (replaced by HTML in
     * `UnitCardFrameCorners` — see `cards/unitCardFrameGeometry.ts`).
     */
    hideOrnateCornerStuds?: boolean;
  }>(),
  { scope: "unitShopCard", hideOrnateCornerStuds: false }
);

const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");

const viewBox = computed(() =>
  props.scope === "unitShopCard" ? "0 0 100 172" : "0 0 100 128"
);

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
    :viewBox="viewBox"
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

    <!-- ——— Full unit shop card (portrait + title + stats inside frame) ——— -->
    <template v-if="props.scope === 'unitShopCard'">
      <!-- shop_tier -->
      <g v-if="props.frameId === 'shop_tier'" fill="none" :stroke="accent.stroke" stroke-linejoin="miter">
        <path
          stroke-width="2.35"
          d="M 6 3 L 94 3 L 99 8 L 99 164 L 94 169 L 6 169 L 1 164 L 1 8 Z"
        />
        <path
          stroke-width="0.85"
          stroke-opacity="0.45"
          d="M 10 7 L 90 7 L 94 11 L 94 161 L 90 165 L 10 165 L 6 161 L 6 11 Z"
        />
        <path stroke-width="0.55" stroke-opacity="0.5" d="M 8 108 L 92 108" />
      </g>

      <!-- minimal -->
      <g v-else-if="props.frameId === 'minimal'" fill="none">
        <rect x="2.5" y="2.5" width="95" height="167" rx="8" stroke="#5a6e9e" stroke-width="1.1" />
        <rect x="5.5" y="5.5" width="89" height="161" rx="6" stroke="#3d4d78" stroke-width="0.75" stroke-opacity="0.85" />
        <line x1="8" y1="107" x2="92" y2="107" stroke="#4a5a82" stroke-width="0.6" stroke-opacity="0.75" />
      </g>

      <!-- ornate: stroke-led frame (fill would cover text); gold stroke + studs -->
      <g v-else-if="props.frameId === 'ornate'" fill="none">
        <path
          :stroke="`url(#pf-orn-${uid})`"
          stroke-width="2.6"
          stroke-linejoin="miter"
          d="M 5 4 L 95 4 L 99 9 L 99 163 L 95 168 L 5 168 L 1 163 L 1 9 Z"
        />
        <path stroke="#1a1006" stroke-width="0.9" d="M 5 4 L 95 4 L 99 9 L 99 163 L 95 168 L 5 168 L 1 163 L 1 9 Z" />
        <path
          :stroke="`url(#pf-orn-hi-${uid})`"
          stroke-width="0.55"
          stroke-opacity="0.85"
          d="M 4 3 L 96 3 L 100.5 8 L 100.5 164 L 96 169 L 4 169 L -0.5 164 L -0.5 8 Z"
        />
        <line x1="10" y1="106" x2="90" y2="106" stroke="#8b6220" stroke-width="0.65" stroke-opacity="0.9" />
        <line x1="10" y1="107.5" x2="90" y2="107.5" stroke="#f0d080" stroke-width="0.35" stroke-opacity="0.5" />
        <g v-if="!props.hideOrnateCornerStuds" fill="#e8c070" stroke="#5c4018" stroke-width="0.22">
          <circle cx="5.5" cy="5" r="2.3" />
          <circle cx="94.5" cy="5" r="2.3" />
          <circle cx="94.5" cy="167" r="2.3" />
          <circle cx="5.5" cy="167" r="2.3" />
        </g>
      </g>

      <!-- rim -->
      <g v-else :filter="`url(#pf-rim-${uid})`" fill="none">
        <rect
          x="3"
          y="3"
          width="94"
          height="166"
          rx="10"
          :stroke="accent.stroke"
          stroke-width="2.6"
          stroke-opacity="0.35"
        />
        <rect
          x="4.5"
          y="4.5"
          width="91"
          height="163"
          rx="8.5"
          :stroke="accent.soft"
          stroke-width="1.15"
          stroke-opacity="0.9"
        />
        <rect x="6" y="6" width="88" height="160" rx="7" :stroke="accent.glow" stroke-width="0.8" />
        <path stroke="#6a9ee8" stroke-width="0.5" stroke-opacity="0.45" d="M 8 106 L 92 106" />
      </g>
    </template>

    <!-- ——— Portrait slot only (narrow) ——— -->
    <template v-else>
      <g v-if="props.frameId === 'shop_tier'" class="pf-layer" fill="none" :stroke="accent.stroke" stroke-linejoin="miter">
        <path stroke-width="2.4" d="M 6 3 L 94 3 L 99 8 L 99 120 L 94 125 L 6 125 L 1 120 L 1 8 Z" />
        <path
          stroke-width="0.9"
          stroke-opacity="0.45"
          d="M 10 7 L 90 7 L 94 11 L 94 117 L 90 121 L 10 121 L 6 117 L 6 11 Z"
        />
      </g>

      <g v-else-if="props.frameId === 'minimal'" class="pf-layer" fill="none">
        <rect x="2.5" y="2.5" width="95" height="123" rx="7" stroke="#5a6e9e" stroke-width="1.1" />
        <rect x="5" y="5" width="90" height="118" rx="5" stroke="#3d4d78" stroke-width="0.75" stroke-opacity="0.85" />
      </g>

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
        <rect x="6" y="6" width="88" height="116" rx="6" :stroke="accent.glow" stroke-width="0.85" />
      </g>
    </template>
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

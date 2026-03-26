<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import type { HeroDefinition, MatchPublicState } from "@runebrawl/shared";
import { useI18n } from "../../i18n/useI18n";

interface PlayerView {
  gold: number;
  health: number;
  tavernTier: number;
  xp: number;
  hero: HeroDefinition | null;
  heroSelected: boolean;
  heroOptions: HeroDefinition[];
}

const props = defineProps<{
  state: MatchPublicState;
  me: PlayerView;
  secondsLeft: number;
  statPlayersIcon: string;
  statGoldIcon: string;
  statHealthIcon: string;
  heroPortraitPath: (heroId: string) => string;
  heroBackplatePath: (heroId: string) => string | null;
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
  (e: "selectHero", heroId: string): void;
}>();

const { t } = useI18n();

const canSelect = computed(() => !props.me.heroSelected);
const isUrgent = computed(() => canSelect.value && props.secondsLeft > 0 && props.secondsLeft <= 10);
const selectingHeroId = ref<string | null>(null);
let selectFxTimer: number | null = null;

function heroPowerLine(hero: HeroDefinition): string {
  if (hero.powerType === "PASSIVE") return t("game.heroSelect.passive");
  return t("game.heroSelect.activeCost", { cost: hero.powerCost });
}

function onSelectHero(heroId: string): void {
  if (!canSelect.value) return;
  selectingHeroId.value = heroId;
  if (selectFxTimer !== null) {
    window.clearTimeout(selectFxTimer);
  }
  selectFxTimer = window.setTimeout(() => {
    selectingHeroId.value = null;
    selectFxTimer = null;
  }, 420);
  emit("selectHero", heroId);
}

const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
};

const onKeydown = (event: KeyboardEvent): void => {
  if (!canSelect.value || isTypingTarget(event.target)) return;

  const digit = Number.parseInt(event.key, 10);
  if (!Number.isNaN(digit) && digit >= 1 && digit <= 3) {
    const hero = props.me.heroOptions[digit - 1];
    if (hero) {
      event.preventDefault();
      emit("selectHero", hero.id);
    }
    return;
  }

  if (event.key === "Enter" && props.me.heroOptions[0]) {
    event.preventDefault();
    emit("selectHero", props.me.heroOptions[0].id);
  }
};

onMounted(() => {
  window.addEventListener("keydown", onKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown);
  if (selectFxTimer !== null) {
    window.clearTimeout(selectFxTimer);
  }
});
</script>

<template>
  <section class="hero-select-screen">
    <header class="hero-select-header">
      <div>
        <h2>{{ t("game.heroSelect.title") }}</h2>
        <p class="slot-title">{{ t("game.heroSelect.subtitle") }}</p>
      </div>
      <span class="hero-select-timer" :class="{ urgent: isUrgent }">{{ t("game.heroSelect.secondsLeft", { seconds: props.secondsLeft }) }}</span>
      <div class="stats">
        <span class="stat-pill">
          <img class="chip-icon" :src="props.statPlayersIcon" alt="" />
          {{ t("game.players") }}: {{ props.state.players.length }} / {{ props.state.maxPlayers }}
        </span>
        <span class="stat-pill">
          <img class="chip-icon" :src="props.statGoldIcon" alt="" />
          {{ t("game.gold") }}: {{ props.me.gold }}
        </span>
        <span class="stat-pill">
          <img class="chip-icon" :src="props.statHealthIcon" alt="" />
          {{ t("game.health") }}: {{ props.me.health }}
        </span>
        <span class="stat-pill">{{ t("game.tier") }}: {{ props.me.tavernTier }}</span>
      </div>
    </header>

    <div class="hero-select-grid">
      <article
        v-for="(hero, heroIdx) in props.me.heroOptions"
        :key="hero.id"
        class="shop-card hero-card hero-select-card anim-stagger-in"
        :class="[
          hero.powerType === 'PASSIVE' ? 'hero-variant-passive' : 'hero-variant-active',
          selectingHeroId === hero.id ? 'hero-selected-pulse' : ''
        ]"
        :style="{ '--stagger-index': heroIdx }"
      >
        <div class="portrait-slot portrait-slot-hero hero-select-portrait" :style="backplateStyle(props.heroBackplatePath(hero.id))">
          <img class="portrait-image portrait-image-contain" :src="props.heroPortraitPath(hero.id)" :alt="hero.name" loading="lazy" />
        </div>
        <h3 class="hero-select-name">{{ hero.name }}</h3>
        <div class="hero-select-meta">
          <span class="meta-chip hero-power-chip" :class="{ 'hero-power-passive': hero.powerType === 'PASSIVE', 'hero-power-active': hero.powerType === 'ACTIVE' }">
            {{ heroPowerLine(hero) }}
          </span>
        </div>
        <p class="hero-select-desc">{{ hero.description }}</p>
        <button class="cta-primary cta-with-hint" :class="{ 'cta-next': canSelect }" :disabled="!canSelect" @click="onSelectHero(hero.id)">
          <span>{{ canSelect ? t("game.heroSelect.pickCta") : t("game.heroSelect.lockedCta") }}</span>
          <span v-if="canSelect" class="hotkey-hint">{{ heroIdx + 1 }}</span>
        </button>
      </article>
    </div>

    <footer class="hero-select-footer">
      <p v-if="props.me.heroSelected && props.me.hero" class="slot-title">{{ t("game.heroLocked", { hero: props.me.hero.name }) }}</p>
      <p v-else class="slot-title">{{ t("game.heroSelect.hotkeysHint") }}</p>
    </footer>
  </section>
</template>

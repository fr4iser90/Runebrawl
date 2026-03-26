<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import type { AbilityKey, HeroDefinition, MatchPublicState, SynergyKey, UnitDefinition } from "@runebrawl/shared";
import { useI18n } from "../../../i18n/useI18n";
import PortraitFrameSvg from "../../shared/PortraitFrameSvg.vue";

interface PlayerView {
  gold: number;
  health: number;
  tavernTier: number;
  xp: number;
  ready: boolean;
  tavernUpgradeCost?: number;
  tavernUpgradeDiscount?: number;
  hero: HeroDefinition | null;
  heroSelected: boolean;
  heroPowerUsedThisTurn: boolean;
  heroOptions: HeroDefinition[];
  shop: (UnitDefinition | null)[];
  lockedShop: boolean;
}

interface HoverPreviewUnit {
  id: string;
  name: string;
  role: UnitDefinition["role"];
  tier: number;
  attack: number;
  hp: number;
  speed: number;
  ability: AbilityKey;
}

const props = defineProps<{
  state: MatchPublicState;
  me: PlayerView;
  isLobby: boolean;
  isHeroSelection: boolean;
  isPrivateLobby: boolean;
  isCreator: boolean;
  isBuyPhase: boolean;
  tutorialStepKey: "hero" | "buy" | "move" | "ready" | "watch" | null;
  lobbyStatusText: string;
  animatingShopIndex: number | null;
  statPlayersIcon: string;
  statGoldIcon: string;
  statHealthIcon: string;
  unitTierClass: (unit: UnitDefinition | null) => "" | "tier-low" | "tier-mid" | "tier-high";
  roleIconPath: (role: UnitDefinition["role"]) => string;
  abilityIconPath: (ability: AbilityKey) => string;
  abilityLabel: (ability: AbilityKey) => string;
  abilityDescription: (ability: AbilityKey) => string;
  synergyLabel: (synergy: SynergyKey) => string;
  synergyDescription: (synergy: SynergyKey) => string;
  heroPortraitPath: (heroId: string) => string;
  heroBackplatePath: (heroId: string) => string | null;
  unitPortraitPath: (unitId: string) => string;
  unitBackplatePath: (unitId: string) => string | null;
  bottomOnly?: boolean;
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
  (e: "buy", shopIndex: number): void;
  (e: "addBotToLobby"): void;
  (e: "forceStartLobby"): void;
  (e: "readyLobbyToggle"): void;
  (e: "useHeroPower"): void;
  (e: "reroll"): void;
  (e: "upgrade"): void;
  (e: "lockToggle"): void;
  (e: "ready"): void;
}>();

const { t } = useI18n();

const highlightHeroSelect = computed(() => props.isHeroSelection && !props.me.heroSelected);
const highlightReady = computed(
  () => props.isBuyPhase && !props.isHeroSelection && !props.me.ready && props.tutorialStepKey === "ready"
);
const firstBuyableShopIndex = computed(() => props.me.shop.findIndex((unit) => !!unit));
const bottomShopDensityClass = computed(() => {
  const slots = props.me.shop.length;
  if (slots >= 11) return "tavern-density-stacked";
  if (slots >= 5) return "tavern-density-dense";
  if (slots <= 3) return "tavern-density-roomy";
  return "tavern-density-balanced";
});
const upgradeButtonText = computed(() => {
  const cost = props.me.tavernUpgradeCost ?? 0;
  const discount = props.me.tavernUpgradeDiscount ?? 0;
  if (cost <= 0) return t("game.upgradeTavernMax");
  if (discount > 0) {
    return t("game.upgradeTavernCostReduced", { cost, reduction: discount });
  }
  return t("game.upgradeTavernCost", { cost });
});

const hoveredShopUnitId = ref<string | null>(null);
const lockedShopUnitId = ref<string | null>(null);

const hoveredShopUnit = computed<HoverPreviewUnit | null>(() => {
  const activeId = lockedShopUnitId.value ?? hoveredShopUnitId.value;
  const explicit = activeId
    ? props.me.shop.find((u): u is UnitDefinition => !!u && u.id === activeId) ?? null
    : null;
  const unit = explicit ?? (props.me.shop.find((u): u is UnitDefinition => !!u) ?? null);
  if (!unit) return null;
  return {
    id: unit.id,
    name: unit.name,
    role: unit.role,
    tier: unit.tier,
    attack: unit.attack,
    hp: unit.hp,
    speed: unit.speed,
    ability: unit.ability
  };
});
const isPreviewLocked = computed(() => !!lockedShopUnitId.value && lockedShopUnitId.value === hoveredShopUnit.value?.id);

function onShopCardHover(unit: UnitDefinition | null): void {
  if (!unit || lockedShopUnitId.value) return;
  hoveredShopUnitId.value = unit.id;
}

function onShopCardLeave(): void {
  if (lockedShopUnitId.value) return;
  hoveredShopUnitId.value = null;
}

function onShopCardInspect(unit: UnitDefinition | null, event: MouseEvent): void {
  if (!props.bottomOnly || !unit) return;
  const target = event.target as HTMLElement | null;
  if (target?.closest("button")) return;
  lockedShopUnitId.value = lockedShopUnitId.value === unit.id ? null : unit.id;
  hoveredShopUnitId.value = unit.id;
}

function clearLockedPreview(): void {
  lockedShopUnitId.value = null;
}

function frameTierClass(unit: UnitDefinition): "tier-low" | "tier-mid" | "tier-high" {
  const tierClass = props.unitTierClass(unit);
  return tierClass === "" ? "tier-low" : tierClass;
}

const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
};

const onKeydown = (event: KeyboardEvent): void => {
  if (isTypingTarget(event.target) || !props.isBuyPhase) return;

  const key = event.key.toLowerCase();
  if (key === "q") {
    event.preventDefault();
    emit("reroll");
    return;
  }
  if (key === "w") {
    event.preventDefault();
    emit("upgrade");
    return;
  }
  if (key === "e") {
    event.preventDefault();
    emit("lockToggle");
    return;
  }
  if (!props.me.ready && (key === "enter" || key === "r")) {
    event.preventDefault();
    emit("ready");
  }
};

onMounted(() => {
  window.addEventListener("keydown", onKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <section
    class="tavern portrait-frame-live-svg portrait-frame-variant portrait-frame-variant--ornate"
    :class="{
      'tavern-bottom-only': !!props.bottomOnly,
      [bottomShopDensityClass]: !!props.bottomOnly
    }"
  >
    <div v-if="!props.bottomOnly" class="hall-header">
      <h2>{{ t("game.tavernShop") }}</h2>
      <div class="stats">
        <span class="stat-pill">
          <img class="chip-icon" :src="props.statPlayersIcon" alt="" />
          {{ t("game.players") }}: {{ props.state.players.length }} / {{ props.state.maxPlayers }}
        </span>
        <span v-if="props.state.isPrivate && props.state.inviteCode" class="stat-pill">{{ t("game.code") }}: {{ props.state.inviteCode }}</span>
      </div>
    </div>
    <div v-if="!props.bottomOnly" class="hall-status">
      <p v-if="props.isLobby" class="slot-title">{{ props.lobbyStatusText }}</p>
      <p v-if="props.isHeroSelection && !props.me.heroSelected" class="slot-title">{{ t("game.chooseHero") }}</p>
      <p v-if="props.isHeroSelection && props.me.heroSelected && props.me.hero" class="slot-title">
        {{ t("game.heroLocked", { hero: props.me.hero.name }) }}
      </p>
    </div>
    <div v-if="!props.bottomOnly" class="stats hall-economy">
      <span class="stat-pill">
        <img class="chip-icon" :src="props.statGoldIcon" alt="" />
        {{ t("game.gold") }}: {{ props.me.gold }}
      </span>
      <span class="stat-pill">
        <img class="chip-icon" :src="props.statHealthIcon" alt="" />
        {{ t("game.health") }}: {{ props.me.health }}
      </span>
      <span class="stat-pill">{{ t("game.tier") }}: {{ props.me.tavernTier }}</span>
      <span class="stat-pill">{{ t("game.xp") }}: {{ props.me.xp }}</span>
    </div>
    <div v-if="props.isHeroSelection" class="shop-row hero-row">
      <div v-for="(hero, heroIdx) in props.me.heroOptions" :key="hero.id" class="shop-card hero-card">
        <div class="portrait-slot portrait-slot-hero" :style="backplateStyle(props.heroBackplatePath(hero.id))">
          <img class="portrait-image portrait-image-contain" :src="props.heroPortraitPath(hero.id)" :alt="hero.name" loading="lazy" />
        </div>
        <div class="unit-name">{{ hero.name }}</div>
        <div class="unit-meta">{{ hero.description }}</div>
        <button class="cta-primary cta-with-hint" :class="{ 'cta-next': highlightHeroSelect }" :disabled="props.me.heroSelected" @click="emit('selectHero', hero.id)">
          <span>{{ props.me.heroSelected ? t("game.heroSelected") : t("game.selectHero") }}</span>
          <span v-if="!props.me.heroSelected" class="hotkey-hint">{{ heroIdx + 1 }}</span>
        </button>
      </div>
    </div>
    <div v-if="!props.isHeroSelection" class="shop-row">
      <div
        v-for="(unit, idx) in props.me.shop"
        :key="idx"
        class="shop-card"
        :class="[props.unitTierClass(unit), { 'anim-buy-pop': props.animatingShopIndex === idx }]"
        @mouseenter="onShopCardHover(unit)"
        @focusin="onShopCardHover(unit)"
        @mouseleave="onShopCardLeave"
        @click="onShopCardInspect(unit, $event)"
      >
        <div v-if="unit" class="unit-card-chrome">
          <div class="unit-card-chrome__content">
            <div class="portrait-slot portrait-slot-unit portrait-slot--svg-frame" :style="backplateStyle(props.unitBackplatePath(unit.id))">
              <img class="portrait-image portrait-image-contain" :src="props.unitPortraitPath(unit.id)" :alt="unit.name" loading="lazy" />
            </div>
            <div class="unit-name">
              <img class="unit-icon" :src="props.roleIconPath(unit.role)" alt="" />
              <span>{{ unit.name }}</span>
            </div>
            <div class="unit-meta">
              <span class="meta-chip">T{{ unit.tier }}</span>
              <span class="meta-chip">
                <img class="chip-icon" :src="props.roleIconPath(unit.role)" alt="" />
                {{ unit.role }}
              </span>
              <span
                v-if="!props.bottomOnly"
                class="meta-chip"
                :title="`${props.abilityLabel(unit.ability)}: ${props.abilityDescription(unit.ability)}`"
              >
                <img class="chip-icon" :src="props.abilityIconPath(unit.ability)" alt="" />
                {{ props.abilityLabel(unit.ability) }}
              </span>
              <span
                v-if="!props.bottomOnly"
                v-for="tag in unit.tags ?? []"
                :key="`shop-tag-${unit.id}-${tag}`"
                class="meta-chip tag-chip"
                :title="`${props.synergyLabel(tag)}: ${props.synergyDescription(tag)}`"
              >
                {{ props.synergyLabel(tag) }}
              </span>
              <div v-if="!props.bottomOnly" class="unit-meta-line">{{ t("game.unitMeta", { attack: unit.attack, hp: unit.hp, speed: unit.speed }) }}</div>
            </div>
          </div>
          <PortraitFrameSvg frame-id="ornate" :tier-class="frameTierClass(unit)" scope="unitShopCard" />
        </div>
        <div class="unit-name" v-else>{{ t("game.soldOut") }}</div>
        <button
          class="cta-primary"
          :class="{ 'cta-next': props.tutorialStepKey === 'buy' && idx === firstBuyableShopIndex }"
          :disabled="!props.isBuyPhase || !unit"
          @click="emit('buy', idx)"
        >
          {{ t("game.buy3") }}
        </button>
      </div>
    </div>
    <aside v-if="props.bottomOnly && hoveredShopUnit" class="shop-hover-preview">
      <button v-if="isPreviewLocked" class="shop-hover-preview-close" @click="clearLockedPreview">x</button>
      <div class="shop-hover-preview-title">{{ hoveredShopUnit.name }}</div>
      <div class="shop-hover-preview-portrait" :style="backplateStyle(props.unitBackplatePath(hoveredShopUnit.id))">
        <img
          class="portrait-image portrait-image-contain"
          :src="props.unitPortraitPath(hoveredShopUnit.id)"
          :alt="hoveredShopUnit.name"
          loading="lazy"
        />
      </div>
      <div class="shop-hover-preview-meta">
        <span class="meta-chip">T{{ hoveredShopUnit.tier }}</span>
        <span class="meta-chip">
          <img class="chip-icon" :src="props.roleIconPath(hoveredShopUnit.role)" alt="" />
          {{ hoveredShopUnit.role }}
        </span>
      </div>
      <div class="shop-hover-preview-stats">{{ t("game.unitMeta", { attack: hoveredShopUnit.attack, hp: hoveredShopUnit.hp, speed: hoveredShopUnit.speed }) }}</div>
      <div class="shop-hover-preview-ability">
        <img class="chip-icon" :src="props.abilityIconPath(hoveredShopUnit.ability)" alt="" />
        <span>{{ props.abilityLabel(hoveredShopUnit.ability) }}</span>
      </div>
    </aside>
    <div v-if="props.me.hero && !props.bottomOnly" class="slot-title">
      {{ t("game.heroLine", { name: props.me.hero.name, description: props.me.hero.description }) }}
    </div>
    <div class="actions hall-actions">
      <button v-if="props.isLobby && props.isCreator" @click="emit('addBotToLobby')">{{ t("game.addBot") }}</button>
      <button v-if="props.isPrivateLobby && props.isCreator" @click="emit('forceStartLobby')">{{ t("game.forceStart") }}</button>
      <button v-if="props.isPrivateLobby" @click="emit('readyLobbyToggle')">{{ props.me.ready ? t("game.unreadyLobby") : t("game.readyLobby") }}</button>
      <button
        v-if="props.me.hero && props.me.hero.powerType === 'ACTIVE'"
        :disabled="!props.isBuyPhase || props.me.heroPowerUsedThisTurn || props.me.gold < props.me.hero.powerCost"
        @click="emit('useHeroPower')"
      >
        {{ t("game.heroPower", { cost: props.me.hero.powerCost }) }} {{ props.me.heroPowerUsedThisTurn ? t("game.heroPowerUsed") : "" }}
      </button>
      <button class="cta-with-hint" :disabled="!props.isBuyPhase" @click="emit('reroll')">
        <span>{{ t("game.reroll1") }}</span>
        <span v-if="props.isBuyPhase" class="hotkey-hint">Q</span>
      </button>
      <button class="cta-with-hint" :disabled="!props.isBuyPhase" @click="emit('upgrade')">
        <span>{{ upgradeButtonText }}</span>
        <span v-if="props.isBuyPhase" class="hotkey-hint">W</span>
      </button>
      <button class="cta-with-hint" :disabled="!props.isBuyPhase" @click="emit('lockToggle')">
        <span>{{ props.me.lockedShop ? t("game.unlockShop") : t("game.lockShop") }}</span>
        <span v-if="props.isBuyPhase" class="hotkey-hint">E</span>
      </button>
      <button class="cta-with-hint" :class="{ 'cta-next': highlightReady }" :disabled="!props.isBuyPhase || props.me.ready" @click="emit('ready')">
        <span>{{ t("game.ready") }}</span>
        <span v-if="props.isBuyPhase && !props.me.ready" class="hotkey-hint">Enter / R</span>
      </button>
    </div>
  </section>
</template>

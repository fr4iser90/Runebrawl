<script setup lang="ts">
import { useI18n } from "../../i18n/useI18n";

const props = defineProps<{
  visible: boolean;
  animationSpeed: "slow" | "normal" | "fast";
  reducedMotion: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "update:animationSpeed", value: "slow" | "normal" | "fast"): void;
  (e: "update:reducedMotion", value: boolean): void;
}>();

const { t } = useI18n();
</script>

<template>
  <div v-if="props.visible" class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-card">
      <div class="modal-header">
        <h3>{{ t("game.settings.title") }}</h3>
        <button @click="emit('close')">{{ t("game.settings.close") }}</button>
      </div>

      <label class="settings-row">
        <span>{{ t("game.settings.animationSpeed") }}</span>
        <select
          :value="props.animationSpeed"
          @change="emit('update:animationSpeed', ($event.target as HTMLSelectElement).value as 'slow' | 'normal' | 'fast')"
        >
          <option value="slow">{{ t("game.settings.speedSlow") }}</option>
          <option value="normal">{{ t("game.settings.speedNormal") }}</option>
          <option value="fast">{{ t("game.settings.speedFast") }}</option>
        </select>
      </label>

      <label class="settings-row">
        <span>{{ t("game.settings.reducedMotion") }}</span>
        <input
          type="checkbox"
          :checked="props.reducedMotion"
          @change="emit('update:reducedMotion', ($event.target as HTMLInputElement).checked)"
        />
      </label>
    </div>
  </div>
</template>

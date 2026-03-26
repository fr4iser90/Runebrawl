<script setup lang="ts">
defineProps<{
  visible: boolean;
  title: string;
  text: string;
  dismissLabel: string;
}>();

const emit = defineEmits<{
  (e: "dismiss"): void;
}>();
</script>

<template>
  <div v-if="visible" class="tutorial-overlay" role="status" aria-live="polite">
    <div class="tutorial-card">
      <div class="tutorial-title">{{ title }}</div>
      <p class="tutorial-text">{{ text }}</p>
      <button class="tutorial-dismiss" @click="emit('dismiss')">{{ dismissLabel }}</button>
    </div>
  </div>
</template>

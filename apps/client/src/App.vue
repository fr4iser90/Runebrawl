<script setup lang="ts">
import { computed } from "vue";
import AdminPanel from "./components/AdminPanel.vue";
import GameClient from "./components/GameClient.vue";

const pathname = computed(() => window.location.pathname);
const isAdminRoute = computed(() => pathname.value.startsWith("/admin"));
</script>

<template>
  <div>
    <header class="header top-nav">
      <h1>Runebrawl</h1>
      <div class="actions">
        <a href="/" class="nav-link">Game</a>
        <a href="/admin" class="nav-link">Admin</a>
      </div>
    </header>
    <AdminPanel v-if="isAdminRoute" />
    <GameClient v-else />
  </div>
</template>

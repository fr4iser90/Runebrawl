<script setup lang="ts">
import { useI18n } from "../../i18n/useI18n";

defineProps<{
  variant: "login" | "register";
}>();

const { t } = useI18n();
</script>

<template>
  <main class="account-stub app">
    <h1>{{ variant === "login" ? t("accountStub.loginTitle") : t("accountStub.registerTitle") }}</h1>
    <p class="account-stub-lead">
      {{ variant === "login" ? t("accountStub.loginBody") : t("accountStub.registerBody") }}
    </p>
    <p class="account-stub-hint">{{ t("accountStub.sessionHint") }}</p>
    <p class="account-stub-actions">
      <a href="/" class="account-stub-primary">{{ t("accountStub.backToGame") }}</a>
    </p>
    <p class="account-stub-operator">
      <a href="/admin">{{ t("accountStub.operatorLink") }}</a>
    </p>
  </main>
</template>

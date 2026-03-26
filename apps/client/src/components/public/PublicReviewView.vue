<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "../../i18n/useI18n";

const { t } = useI18n();

function apiErrorMessage(data: { error?: string; errorCode?: string }, fallback: string): string {
  if (data.errorCode === "PUBLIC_SUBMISSIONS_DISABLED") return t("review.disabled");
  if (data.errorCode === "PUBLIC_SUBMISSION_NOT_FOUND") return t("review.notFound");
  return data.error ?? fallback;
}

const apiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || `http://${location.hostname}:3001`;

interface SubmissionListItem {
  id: string;
  packId: string;
  status: string;
  authorDisplay: string;
  title: string;
  description: string;
  validationOk: boolean;
  voteScore: number;
  voteCount: number;
  createdAt: number;
}

interface SubmissionMetadata {
  packId: string;
  title: string;
  author: string;
  version: string;
  description: string;
  targetGameVersion: string;
  tags: string[];
  notes?: string;
}

interface SubmissionDetail extends SubmissionListItem {
  metadata: SubmissionMetadata;
  units: unknown[];
  heroes: unknown[];
  validationErrors: string[];
}

const submissions = ref<SubmissionListItem[]>([]);
const detail = ref<SubmissionDetail | null>(null);
/** Unit ids with uploaded WebP (from GET detail). */
const portraitUnitIds = ref<string[]>([]);
const selectedId = ref<string | null>(null);
const validOnly = ref(false);
const loadingList = ref(false);
const loadingDetail = ref(false);
const voting = ref(false);
const listError = ref("");
const detailError = ref("");
const voteError = ref("");

const selectedFromUrl = (): string | null => {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
};

function setUrlId(id: string | null): void {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("id", id);
  else url.searchParams.delete("id");
  window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
}

async function loadList(): Promise<void> {
  listError.value = "";
  loadingList.value = true;
  try {
    const q = validOnly.value ? "?validOnly=1&limit=80" : "?limit=80";
    const res = await fetch(`${apiBaseUrl}/public/submissions${q}`, { credentials: "include" });
    const data = (await res.json()) as { submissions?: SubmissionListItem[]; error?: string; errorCode?: string };
    if (!res.ok) {
      listError.value = apiErrorMessage(data, t("review.errorLoadList"));
      submissions.value = [];
      return;
    }
    submissions.value = data.submissions ?? [];
  } catch {
    listError.value = t("review.errorNetwork");
    submissions.value = [];
  } finally {
    loadingList.value = false;
  }
}

async function loadDetail(id: string): Promise<void> {
  detailError.value = "";
  loadingDetail.value = true;
  detail.value = null;
  portraitUnitIds.value = [];
  try {
    const res = await fetch(`${apiBaseUrl}/public/submissions/${encodeURIComponent(id)}`, { credentials: "include" });
    const data = (await res.json()) as {
      submission?: SubmissionDetail;
      portraitUnitIds?: string[];
      error?: string;
      errorCode?: string;
    };
    if (!res.ok) {
      detailError.value = apiErrorMessage(data, t("review.errorLoadDetail"));
      return;
    }
    detail.value = data.submission ?? null;
    portraitUnitIds.value = Array.isArray(data.portraitUnitIds) ? data.portraitUnitIds : [];
  } catch {
    detailError.value = t("review.errorNetwork");
  } finally {
    loadingDetail.value = false;
  }
}

function selectSubmission(id: string): void {
  selectedId.value = id;
  setUrlId(id);
  void loadDetail(id);
}

function clearSelection(): void {
  selectedId.value = null;
  detail.value = null;
  portraitUnitIds.value = [];
  setUrlId(null);
}

async function onVote(value: 1 | -1): Promise<void> {
  if (!selectedId.value || voting.value) return;
  voteError.value = "";
  voting.value = true;
  try {
    const res = await fetch(`${apiBaseUrl}/public/submissions/${encodeURIComponent(selectedId.value)}/vote`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value })
    });
    const data = (await res.json()) as { ok?: boolean; error?: string; errorCode?: string; voteScore?: number; voteCount?: number };
    if (!res.ok) {
      voteError.value = apiErrorMessage(data, t("review.errorVote"));
      return;
    }
    if (detail.value && typeof data.voteScore === "number") {
      detail.value = {
        ...detail.value,
        voteScore: data.voteScore,
        voteCount: typeof data.voteCount === "number" ? data.voteCount : detail.value.voteCount
      };
    }
    await loadList();
  } catch {
    voteError.value = t("review.errorNetwork");
  } finally {
    voting.value = false;
  }
}

const disclaimer = computed(() => t("review.disclaimer"));

onMounted(async () => {
  const id = selectedFromUrl();
  if (id) selectedId.value = id;
  await loadList();
  if (selectedId.value) await loadDetail(selectedId.value);
});

watch(validOnly, () => {
  void loadList();
});

function formatDate(ts: number): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "";
  }
}
</script>

<template>
  <div class="public-review app">
    <section class="review-hero">
      <h2>{{ t("review.title") }}</h2>
      <p class="review-lead">{{ t("review.subtitle") }}</p>
      <p class="review-disclaimer">{{ disclaimer }}</p>
    </section>

    <div class="review-layout">
      <aside class="review-list-panel">
        <div class="review-toolbar">
          <label class="review-checkbox">
            <input v-model="validOnly" type="checkbox" />
            {{ t("review.validOnly") }}
          </label>
          <button type="button" class="review-refresh" :disabled="loadingList" @click="loadList">
            {{ loadingList ? t("review.loading") : t("review.refresh") }}
          </button>
        </div>
        <p v-if="listError" class="review-error">{{ listError }}</p>
        <ul v-else class="review-list">
          <li v-if="!loadingList && submissions.length === 0" class="review-empty">{{ t("review.empty") }}</li>
          <li
            v-for="s in submissions"
            :key="s.id"
            class="review-list-item"
            :class="{ active: s.id === selectedId }"
            @click="selectSubmission(s.id)"
          >
            <div class="review-list-item-head">
              <span class="review-list-title">{{ s.title || s.packId }}</span>
              <span class="review-vote-pill" :title="t('review.voteCount', { n: s.voteCount })">
                {{ s.voteScore > 0 ? "+" : "" }}{{ s.voteScore }}
              </span>
            </div>
            <div class="review-list-meta">
              <span v-if="!s.validationOk" class="badge badge-warn">{{ t("review.invalid") }}</span>
              <span v-else class="badge badge-ok">{{ t("review.valid") }}</span>
              <span class="muted">{{ s.packId }}</span>
            </div>
          </li>
        </ul>
      </aside>

      <main class="review-detail-panel">
        <template v-if="!selectedId">
          <p class="review-placeholder">{{ t("review.pickOne") }}</p>
        </template>
        <template v-else>
          <button type="button" class="review-back" @click="clearSelection">{{ t("review.backList") }}</button>
          <p v-if="detailError" class="review-error">{{ detailError }}</p>
          <p v-else-if="loadingDetail" class="muted">{{ t("review.loadingDetail") }}</p>
          <template v-else-if="detail">
            <header class="review-detail-head">
              <h3>{{ detail.title || detail.packId }}</h3>
              <p class="muted">{{ detail.description }}</p>
            </header>

            <div class="review-vote-bar">
              <button type="button" class="vote-btn vote-up" :disabled="voting" @click="onVote(1)">+1</button>
              <button type="button" class="vote-btn vote-down" :disabled="voting" @click="onVote(-1)">−1</button>
              <span class="review-score">{{ t("review.score", { score: detail.voteScore, count: detail.voteCount }) }}</span>
            </div>
            <p v-if="voteError" class="review-error">{{ voteError }}</p>

            <div v-if="portraitUnitIds.length && selectedId" class="review-portraits">
              <strong>{{ t("review.portraits") }}</strong>
              <div class="review-portrait-row">
                <figure v-for="uid in portraitUnitIds" :key="uid" class="review-portrait-fig">
                  <img
                    :src="`${apiBaseUrl}/public/submissions/${encodeURIComponent(selectedId)}/portraits/${encodeURIComponent(uid)}`"
                    :alt="uid"
                    loading="lazy"
                  />
                  <figcaption>{{ uid }}</figcaption>
                </figure>
              </div>
            </div>

            <dl class="review-meta-dl">
              <dt>{{ t("review.packId") }}</dt>
              <dd>{{ detail.packId }}</dd>
              <dt>{{ t("review.author") }}</dt>
              <dd>{{ detail.authorDisplay }}</dd>
              <dt>{{ t("review.status") }}</dt>
              <dd>{{ detail.status }}</dd>
              <dt>{{ t("review.submitted") }}</dt>
              <dd>{{ formatDate(detail.createdAt) }}</dd>
              <dt>{{ t("review.validation") }}</dt>
              <dd>
                <span v-if="detail.validationOk" class="badge badge-ok">{{ t("review.valid") }}</span>
                <span v-else class="badge badge-warn">{{ t("review.invalid") }}</span>
              </dd>
            </dl>

            <div v-if="detail.validationErrors?.length" class="review-validation-errors">
              <strong>{{ t("review.validationErrors") }}</strong>
              <ul>
                <li v-for="(err, i) in detail.validationErrors" :key="i">{{ err }}</li>
              </ul>
            </div>

            <details class="review-json">
              <summary>{{ t("review.rawJson") }}</summary>
              <pre>{{ JSON.stringify({ metadata: detail.metadata, units: detail.units, heroes: detail.heroes }, null, 2) }}</pre>
            </details>
          </template>
        </template>
      </main>
    </div>
  </div>
</template>

<style scoped src="../../styles/public/public-review.css"></style>

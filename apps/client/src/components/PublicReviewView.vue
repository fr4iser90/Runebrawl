<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "../i18n/useI18n";

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

<style scoped>
.public-review {
  max-width: 1100px;
  margin: 0 auto;
}

.review-hero {
  margin-bottom: 1.25rem;
}

.review-hero h2 {
  margin: 0 0 0.35rem;
  font-size: 1.35rem;
}

.review-lead {
  margin: 0;
  color: var(--rb-text-muted);
}

.review-disclaimer {
  margin: 0.75rem 0 0;
  font-size: 0.9rem;
  color: var(--rb-text-muted);
  border-left: 3px solid var(--rb-border-strong);
  padding-left: 0.75rem;
}

.review-layout {
  display: grid;
  grid-template-columns: minmax(240px, 320px) 1fr;
  gap: 1.25rem;
  align-items: start;
}

@media (max-width: 720px) {
  .review-layout {
    grid-template-columns: 1fr;
  }
}

.review-list-panel,
.review-detail-panel {
  background: var(--rb-surface-1);
  border: 1px solid var(--rb-border);
  border-radius: var(--rb-radius);
  padding: 1rem;
  box-shadow: var(--rb-shadow-card);
}

.review-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 0.75rem;
}

.review-checkbox {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.9rem;
  color: var(--rb-text-muted);
  cursor: pointer;
}

.review-refresh {
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  border: 1px solid var(--rb-border-strong);
  background: var(--rb-surface-2);
  color: var(--rb-text);
  cursor: pointer;
}

.review-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.review-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: min(60vh, 520px);
  overflow-y: auto;
}

.review-empty {
  padding: 1rem;
  color: var(--rb-text-muted);
  font-size: 0.95rem;
}

.review-list-item {
  padding: 0.65rem 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
}

.review-list-item:hover {
  background: var(--rb-surface-2);
}

.review-list-item.active {
  border-color: var(--rb-accent);
  background: var(--rb-surface-2);
}

.review-list-item-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.review-list-title {
  font-weight: 600;
  font-size: 0.95rem;
}

.review-vote-pill {
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
  color: var(--rb-accent);
}

.review-list-meta {
  margin-top: 0.25rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  align-items: center;
  font-size: 0.8rem;
}

.muted {
  color: var(--rb-text-muted);
}

.badge {
  font-size: 0.72rem;
  padding: 0.12rem 0.4rem;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.badge-ok {
  background: rgba(80, 160, 120, 0.25);
  color: #9dffc8;
}

.badge-warn {
  background: rgba(200, 120, 80, 0.25);
  color: #ffc49d;
}

.review-error {
  color: var(--rb-danger);
  font-size: 0.9rem;
  margin: 0 0 0.5rem;
}

.review-placeholder {
  color: var(--rb-text-muted);
  margin: 0;
}

.review-back {
  margin-bottom: 0.75rem;
  padding: 0.25rem 0.6rem;
  font-size: 0.85rem;
  border-radius: 6px;
  border: 1px solid var(--rb-border);
  background: transparent;
  color: var(--rb-text-muted);
  cursor: pointer;
}

.review-detail-head h3 {
  margin: 0 0 0.35rem;
}

.review-vote-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin: 1rem 0;
}

.vote-btn {
  min-width: 2.5rem;
  padding: 0.4rem 0.65rem;
  border-radius: 6px;
  border: 1px solid var(--rb-border-strong);
  font-weight: 700;
  cursor: pointer;
  color: var(--rb-text);
  background: var(--rb-surface-2);
}

.vote-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.vote-up:hover:not(:disabled) {
  border-color: #5a9e7a;
}

.vote-down:hover:not(:disabled) {
  border-color: #c07070;
}

.review-score {
  font-size: 0.9rem;
  color: var(--rb-text-muted);
}

.review-portraits {
  margin-bottom: 1rem;
}

.review-portraits strong {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.review-portrait-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.review-portrait-fig {
  margin: 0;
  text-align: center;
  max-width: 96px;
}

.review-portrait-fig img {
  width: 72px;
  height: 72px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--rb-border);
}

.review-portrait-fig figcaption {
  margin-top: 0.25rem;
  font-size: 0.65rem;
  color: var(--rb-text-muted);
  word-break: break-all;
}

.review-meta-dl {
  display: grid;
  grid-template-columns: 8rem 1fr;
  gap: 0.35rem 0.75rem;
  font-size: 0.9rem;
  margin: 0 0 1rem;
}

.review-meta-dl dt {
  margin: 0;
  color: var(--rb-text-muted);
}

.review-meta-dl dd {
  margin: 0;
}

.review-validation-errors {
  font-size: 0.85rem;
  margin-bottom: 1rem;
  padding: 0.65rem;
  background: rgba(255, 100, 100, 0.08);
  border-radius: 6px;
  border: 1px solid rgba(255, 100, 100, 0.25);
}

.review-validation-errors ul {
  margin: 0.35rem 0 0;
  padding-left: 1.1rem;
}

.review-json summary {
  cursor: pointer;
  color: var(--rb-text-muted);
  font-size: 0.9rem;
}

.review-json pre {
  margin: 0.5rem 0 0;
  padding: 0.75rem;
  background: var(--rb-bg);
  border-radius: 6px;
  overflow: auto;
  font-size: 0.72rem;
  max-height: 320px;
}
</style>

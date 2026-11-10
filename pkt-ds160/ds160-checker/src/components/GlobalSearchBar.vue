<template>
  <div class="gsb-wrap">
    <input
      type="text"
      class="gsb-input"
      placeholder="🔎 Tìm kiếm tổng hợp theo MSHS / Số ID / Email / Tên (tất cả hồ sơ)..."
      v-model="query"
      @input="onInput"
      @focus="isFocused = true"
      @blur="onBlur"
    />

    <div v-if="isFocused && query.trim()" class="gsb-dropdown">
      <div v-if="loading" class="gsb-status">Đang tìm kiếm...</div>
      <template v-else>
        <div v-if="results.reviews.length === 0 && results.submissions.length === 0" class="gsb-status">
          Không tìm thấy kết quả nào phù hợp.
        </div>

        <template v-if="results.reviews.length">
          <div class="gsb-group-title">Hàng đợi kiểm tra ({{ results.reviews.length }})</div>
          <div
            v-for="r in results.reviews"
            :key="'review-' + r.id"
            class="gsb-item gsb-item-clickable"
            @click="selectReview(r)"
          >
            <div class="gsb-item-main">
              <span class="gsb-item-name">{{ r.customerName || 'N/A' }}</span>
              <span :class="['gsb-badge', r.status === 'completed' ? 'completed' : 'pending']">
                {{ r.status === 'completed' ? 'Đã kiểm tra' : 'Chờ kiểm tra' }}
              </span>
            </div>
            <div class="gsb-item-sub">
              {{ r.formLabel || r.formType }}
              <span v-if="r.mshs"> · MSHS: {{ r.mshs }}</span>
              <span v-if="r.idNumber"> · ID: {{ r.idNumber }}</span>
              <span v-if="r.email"> · {{ r.email }}</span>
            </div>
          </div>
        </template>

        <template v-if="results.submissions.length">
          <div class="gsb-group-title">Hồ sơ điền đơn ({{ results.submissions.length }})</div>
          <div
            v-for="s in results.submissions"
            :key="'submission-' + s.id"
            class="gsb-item gsb-item-clickable"
            @click="selectSubmission(s)"
          >
            <div class="gsb-item-main">
              <span class="gsb-item-name">{{ s.fullName || 'N/A' }}</span>
            </div>
            <div class="gsb-item-sub">
              {{ s.formSlug }}
              <span v-if="s.idNumber"> · ID: {{ s.idNumber }}</span>
              <span v-if="s.email"> · {{ s.email }}</span>
            </div>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import * as api from '../api/index.js'

const emit = defineEmits(['open-review', 'open-submission'])

const query = ref('')
const results = ref({ reviews: [], submissions: [] })
const loading = ref(false)
const isFocused = ref(false)
let debounceTimer = null

function onInput() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(runSearch, 300)
}

async function runSearch() {
  const q = query.value.trim()
  if (!q) {
    results.value = { reviews: [], submissions: [] }
    return
  }
  loading.value = true
  try {
    results.value = await api.searchGlobal(q)
  } finally {
    loading.value = false
  }
}

function onBlur() {
  setTimeout(() => { isFocused.value = false }, 150)
}

function reset() {
  query.value = ''
  results.value = { reviews: [], submissions: [] }
  isFocused.value = false
}

function selectReview(review) {
  emit('open-review', review)
  reset()
}

function selectSubmission(submission) {
  emit('open-submission', submission)
  reset()
}
</script>

<style scoped>
.gsb-wrap {
  position: relative;
  margin-bottom: 16px;
}
.gsb-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 14px;
  color: #334155;
  background: #fff;
  outline: none;
  box-sizing: border-box;
}
.gsb-input:focus { border-color: #6366f1; }

.gsb-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  max-height: 420px;
  overflow-y: auto;
  z-index: 30;
}
.gsb-status {
  padding: 14px;
  font-size: 13px;
  color: #94a3b8;
  text-align: center;
}
.gsb-group-title {
  padding: 8px 14px;
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}
.gsb-item {
  padding: 8px 14px;
  border-bottom: 1px solid #f1f5f9;
}
.gsb-item:last-child { border-bottom: none; }
.gsb-item-clickable {
  cursor: pointer;
  transition: background .15s;
}
.gsb-item-clickable:hover {
  background: #f0f4ff;
}
.gsb-item-main {
  display: flex;
  align-items: center;
  gap: 8px;
}
.gsb-item-name {
  font-weight: 600;
  color: #0f172a;
  font-size: 13px;
}
.gsb-item-sub {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
}
.gsb-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.gsb-badge.pending {
  background: #fef3c7;
  color: #92400e;
}
.gsb-badge.completed {
  background: #e0e7ff;
  color: #4f46e5;
}
</style>

<template>
  <div class="check-log-page" :class="{ 'printing-final': printingFinal }">
    <div class="check-log-card">
      <div class="check-log-header">
        <div>
          <div class="eyebrow">Dành riêng cho tài khoản ittest</div>
          <h1>Check log phiếu kiểm tra</h1>
          <p>
            Bấm <b>Xem chi tiết</b> để thấy ngay bảng đối chiếu từng ô: ô nào, thuộc mục nào, cột Xử lý hay Tư vấn,
            <b>data gốc</b> là gì, <b>trước khi sửa</b> là gì, <b>sau khi sửa</b> là gì và thao tác là thêm / sửa / xóa.
            Phiếu gốc chỉ tải khi bạn bấm mở để đối chiếu layout, và khi mở thì nhảy thẳng tới ô đã sửa.
            Data gốc màu nâu tự đổ vào phiếu sẽ không ghi log.
          </p>
        </div>
        <button class="btn-primary" :disabled="loading" @click="loadLogs">
          {{ loading ? 'Đang tải...' : 'Tải lại log' }}
        </button>
      </div>

      <div class="filters">
        <label>
          Submission ID
          <input v-model.trim="filters.submissionId" placeholder="VD: 95" @keyup.enter="loadLogs" />
        </label>
        <label>
          Review ID
          <input v-model.trim="filters.reviewId" placeholder="ID dòng ĐGHT" @keyup.enter="loadLogs" />
        </label>
        <label>
          Nhân viên
          <select v-model="filters.actor" @change="loadLogs">
            <option value="">Tất cả nhân viên</option>
            <option v-for="actor in actorOptions" :key="actor.value" :value="actor.value">
              {{ actor.label }}
            </option>
          </select>
        </label>
        <label>
          Hành động
          <select v-model="filters.action" @change="loadLogs">
            <option value="">Tất cả</option>
            <option value="fill_draft_save">Lưu draft xử lý</option>
            <option value="fill_submit">Submit xử lý</option>
            <option value="review_draft_save">Lưu draft tư vấn</option>
            <option value="review_complete">Hoàn tất tư vấn</option>
            <option value="review_reopen">Mở lại phiếu đã giao</option>
            <option value="draft_delete">Xóa draft</option>
          </select>
        </label>
      </div>

      <div class="quick-summary">
        <div class="summary-card">
          <span>Tổng log</span>
          <strong>{{ logs.length }}</strong>
        </div>
        <div class="summary-card">
          <span>Tổng field đã sửa</span>
          <strong>{{ totalChangedFields }}</strong>
        </div>
        <div class="summary-card">
          <span>Submission đang lọc</span>
          <strong>{{ filters.submissionId || 'Tất cả' }}</strong>
        </div>
      </div>

      <div v-if="error" class="error-box">{{ error }}</div>

      <!-- ===== BẢN TỔNG HỢP CUỐI (FINAL) CỦA 1 PHIẾU ===== -->
      <section v-if="finalReport || finalLoading" ref="finalPanelRef" class="selected-log-panel final-panel">
        <div class="selected-log-header">
          <div>
            <span class="form-pill final-pill">BẢN TỔNG HỢP CUỐI</span>
            <h2>{{ finalReport?.review?.customerName || 'Đang tải...' }}</h2>
            <div v-if="finalReport" class="case-sub">
              <span>Phiếu: <b>{{ finalReport.review.formLabel || finalReport.review.formType || 'N/A' }}</b></span>
              <span>Review ID: <b>{{ finalReport.review.id || 'N/A' }}</b></span>
              <span>Submission ID: <b>{{ finalReport.review.submissionId || 'N/A' }}</b></span>
              <span>MS: <b>{{ finalReport.review.mshs || 'N/A' }}</b></span>
              <span>Xử lý: <b>{{ finalReport.review.fillerName || 'N/A' }}</b></span>
              <span>Tư vấn: <b>{{ finalReport.review.reviewerName || 'N/A' }}</b></span>
              <span>Trạng thái: <b>{{ finalReport.review.status || 'N/A' }}</b></span>
              <span>Submit: <b>{{ finalReport.review.submittedAt || 'N/A' }}</b></span>
            </div>
          </div>
          <div class="final-header-actions">
            <button
              v-if="finalReport?.review?.id"
              class="btn-row"
              type="button"
              @click="openFinalInNewTab(finalReport.review.id)"
            >↗ Mở tab mới</button>
            <button class="btn-row" type="button" @click="downloadFinalCsv">⬇ Tải file CSV</button>
            <button class="btn-row" type="button" @click="printFinalReport">🖨 In / Lưu PDF</button>
            <button class="btn-secondary" type="button" @click="closeFinalReport">Đóng</button>
          </div>
        </div>

        <div v-if="finalLoading" class="empty-state">Đang tổng hợp toàn bộ lịch sử của phiếu này...</div>
        <div v-else-if="finalError" class="error-box">{{ finalError }}</div>

        <template v-else-if="finalReport">
          <div v-if="finalReport.review.reopenCount" class="selected-note lifecycle-note">
            ↺ Phiếu này đã bị mở lại {{ finalReport.review.reopenCount }} lần
            <template v-if="finalReport.review.reopenedByName">(gần nhất: {{ finalReport.review.reopenedByName }}<template v-if="finalReport.review.reopenedAt"> lúc {{ finalReport.review.reopenedAt }}</template>)</template>
            và giao lại {{ finalReport.review.resubmitCount || 0 }} lần.
          </div>

          <div class="quick-summary final-summary">
            <div class="summary-card"><span>Tổng ô có thay đổi</span><strong>{{ finalReport.summary.totalRows }}</strong></div>
            <div class="summary-card"><span>Ô người xử lý điền</span><strong>{{ finalReport.summary.fillerCells }}</strong></div>
            <div class="summary-card"><span>Ô tư vấn sửa</span><strong>{{ finalReport.summary.reviewerCells }}</strong></div>
            <div class="summary-card"><span>Tổng lượt save đã ghi log</span><strong>{{ finalReport.summary.totalLogs }}</strong></div>
          </div>

          <div class="selected-note">
            <b>Nguồn số liệu:</b> cột <b>NGƯỜI XỬ LÝ ĐIỀN</b> và <b>TƯ VẤN SỬA</b> lấy thẳng từ dữ liệu đã submit của phiếu
            (<code>filler_changes</code> / <code>review_changes</code>) nên luôn đúng bằng những gì nhân viên chốt lại;
            <b>DATA GỐC</b> và lịch sử từng lần save lấy từ nhật ký thao tác.
            Phiếu DS-260 / I-130A / I-129F làm trước ngày sửa log sẽ không có DATA GỐC trong nhật ký cũ,
            cột đó hiện "Trống" — không có nghĩa là khách hàng bỏ trống.
          </div>

          <div class="final-filter-row">
            <label><input v-model="finalOnlyReviewer" type="checkbox" /> Chỉ xem ô tư vấn đã sửa</label>
            <label><input v-model="finalShowHistory" type="checkbox" /> Hiện lịch sử từng lần save</label>
            <input v-model.trim="finalSearch" class="final-search" placeholder="🔎 Lọc theo nhãn ô / giá trị..." />
            <span class="final-count">{{ filteredFinalRows.length }} / {{ finalReport.rows.length }} ô</span>
          </div>

          <div class="diff-table-wrap">
            <table class="diff-table final-table">
              <thead>
                <tr>
                  <th style="width:44px">#</th>
                  <th style="width:180px">Mục trên phiếu</th>
                  <th>Ô (câu hỏi)</th>
                  <th style="width:170px">DATA GỐC (khách khai)</th>
                  <th style="width:170px">NGƯỜI XỬ LÝ ĐIỀN</th>
                  <th style="width:170px">TƯ VẤN SỬA</th>
                  <th style="width:170px">GIÁ TRỊ CUỐI</th>
                  <th style="width:110px">Kết luận</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="(row, index) in filteredFinalRows" :key="row.key">
                  <tr>
                    <td class="diff-index">{{ index + 1 }}</td>
                    <td>
                      <div class="diff-section">{{ row.section || '—' }}</div>
                      <div v-if="row.item" class="diff-group">Mục {{ row.item }}</div>
                    </td>
                    <td>
                      <div class="diff-label">{{ row.label }}</div>
                      <code class="diff-cell-id">{{ row.key }}</code>
                    </td>
                    <td :class="['diff-value base', valueClass(row.baseValue)]">{{ displayValue(row.baseValue) }}</td>
                    <td :class="['diff-value filler', row.fillerTouched ? '' : 'untouched']">
                      {{ row.fillerTouched ? displayValue(row.fillerValue) : 'Không đụng' }}
                    </td>
                    <td :class="['diff-value reviewer', row.reviewerTouched ? '' : 'untouched']">
                      {{ row.reviewerTouched ? displayValue(row.reviewerValue) : 'Không đụng' }}
                    </td>
                    <td :class="['diff-value new', valueClass(row.finalValue)]">{{ displayValue(row.finalValue) }}</td>
                    <td>
                      <span class="diff-type-pill" :class="`type-${row.changeType}`">{{ changeTypeLabel(row.changeType) }}</span>
                      <div class="final-touch">{{ row.touchCount }} lượt · {{ row.actors.join(', ') || '—' }}</div>
                    </td>
                  </tr>
                  <tr v-if="finalShowHistory && row.history.length" class="final-history-row">
                    <td></td>
                    <td colspan="7">
                      <div v-for="(step, stepIndex) in row.history" :key="stepIndex" class="final-history-step">
                        <span class="hist-time">{{ step.at || '—' }}</span>
                        <span class="hist-actor">{{ step.actorName || 'N/A' }}</span>
                        <span class="hist-action">{{ actionLabel(step.action) }}</span>
                        <span class="hist-col">{{ step.column }}</span>
                        <span class="hist-old">{{ displayValue(step.oldValue) }}</span>
                        <span class="hist-arrow">→</span>
                        <span class="hist-new">{{ displayValue(step.newValue) }}</span>
                        <span class="diff-type-pill" :class="`type-${step.changeType}`">{{ changeTypeLabel(step.changeType) }}</span>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>

          <div v-if="!filteredFinalRows.length" class="empty-state">Không có ô nào khớp bộ lọc.</div>
        </template>
      </section>

      <section v-if="selectedLog" ref="detailPanelRef" class="selected-log-panel">
        <div class="selected-log-header">
          <div>
            <span class="form-pill">{{ selectedLog.formLabel || selectedLog.form_label || formLabelFromType(selectedLog.formType || selectedLog.form_type) }}</span>
            <h2>{{ selectedLog.customerName || selectedLog.customer_name || selectedLog.applicantName || 'Chưa lấy được tên đương đơn' }}</h2>
            <div class="case-sub">
              <span>Giai đoạn: <b>{{ selectedLog.stageLabel || selectedLog.stage_label || stageLabel(selectedLog.action) }}</b></span>
              <span>Submission ID: <b>{{ selectedLog.submissionId || 'N/A' }}</b></span>
              <span>Review ID: <b>{{ selectedLog.reviewId || 'N/A' }}</b></span>
              <span>Người thao tác: <b>{{ selectedLog.actorName || selectedLog.actorUsername || 'N/A' }}</b></span>
              <span>Thời gian: <b>{{ selectedLog.createdAt || 'N/A' }}</b></span>
              <span>Field sửa: <b>{{ getFieldChanges(selectedLog).length }}</b></span>
            </div>
          </div>
          <div class="final-header-actions">
            <button
              v-if="selectedLog.reviewId || selectedLog.submissionId"
              class="btn-row"
              type="button"
              @click="openFinalReport(selectedLog.reviewId, selectedLog.submissionId)"
            >📋 Bản tổng hợp cuối của phiếu này</button>
            <button class="btn-row" type="button" @click="openLogInNewTab(selectedLog)">↗ Mở tab mới</button>
            <button class="btn-secondary" type="button" @click="closeLog()">Đóng phiếu</button>
          </div>
        </div>

        <div v-if="selectedLog.note" class="selected-note lifecycle-note">{{ selectedLog.note }}</div>

        <div v-if="selectedChanges.length" class="diff-block">
          <div class="diff-title-row">
            <h3>Chi tiết từng ô đã đụng vào ({{ selectedChanges.length }} ô)</h3>
            <span class="diff-summary">{{ changeTypeSummary(selectedLog) }}</span>
          </div>
          <div class="diff-table-wrap">
            <table class="diff-table">
              <thead>
                <tr>
                  <th style="width:46px">#</th>
                  <th style="width:190px">Mục trên phiếu</th>
                  <th>Ô (câu hỏi)</th>
                  <th style="width:92px">Cột</th>
                  <th style="width:180px">DATA GỐC</th>
                  <th style="width:180px">TRƯỚC KHI SỬA</th>
                  <th style="width:180px">SAU KHI SỬA</th>
                  <th style="width:116px">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(change, index) in selectedChanges" :key="change.field">
                  <td class="diff-index">{{ index + 1 }}</td>
                  <td>
                    <div class="diff-section">{{ change.section || '—' }}</div>
                    <div v-if="change.group" class="diff-group">{{ change.group }}</div>
                  </td>
                  <td>
                    <div class="diff-label">{{ change.label || change.field }}</div>
                    <code class="diff-cell-id">{{ change.field }}</code>
                  </td>
                  <td>
                    <span class="diff-column-pill" :class="change.column === 'TƯ VẤN' ? 'col-reviewer' : 'col-filler'">
                      {{ change.column || '—' }}
                    </span>
                  </td>
                  <td :class="['diff-value base', valueClass(change.base_value)]">{{ displayValue(change.base_value) }}</td>
                  <td :class="['diff-value old', valueClass(change.old_value)]">{{ displayValue(change.old_value) }}</td>
                  <td :class="['diff-value new', valueClass(change.new_value)]">{{ displayValue(change.new_value) }}</td>
                  <td>
                    <span class="diff-type-pill" :class="`type-${change.changeType}`">{{ changeTypeLabel(change.changeType) }}</span>
                    <button class="diff-goto-btn" type="button" @click="openPaperAtCell(index)">Xem trên phiếu →</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div v-else class="empty-state">Log này không sửa ô nào (chỉ là thao tác trên phiếu).</div>

        <div v-if="selectedChanges.length" class="paper-toggle-row">
          <button class="btn-secondary" type="button" @click="togglePaperPreview">
            {{ showPaperPreview ? 'Ẩn phiếu gốc' : 'Mở phiếu gốc để đối chiếu' }}
          </button>
          <template v-if="showPaperPreview">
            <button class="btn-row" type="button" @click="focusChangedCell(activeCellIndex - 1)">← Ô đã sửa trước</button>
            <span class="cell-position">Ô {{ Math.min(activeCellIndex + 1, selectedChanges.length) }}/{{ selectedChanges.length }}</span>
            <button class="btn-row" type="button" @click="focusChangedCell(activeCellIndex + 1)">Ô đã sửa sau →</button>
          </template>
          <span class="paper-toggle-note">
            Phiếu chỉ tải khi bạn cần đối chiếu layout. Mọi ô đã sửa được tô vàng, bấm mũi tên để nhảy thẳng tới ô — không phải cuộn tìm.
          </span>
        </div>

        <div v-if="showPaperPreview && selectedChanges.length" ref="previewRef" class="full-pkt-preview">
          <component
            :is="getLogPaperComponent(selectedLog)"
            mode="view"
            :formType="getLogFormType(selectedLog)"
            :customerData="getLogComparisonData(selectedLog)"
            :currentUser="currentUser"
            :reviewers="[]"
            :logCompare="true"
          />
        </div>

        <details class="technical-details">
          <summary>Xem JSON kỹ thuật của log này</summary>
          <pre>{{ pretty(selectedLog) }}</pre>
        </details>
      </section>

      <div class="section-block">
        <div class="section-title-row">
          <h2>Nhật ký thao tác</h2>
          <span class="count-pill">{{ logs.length }} log</span>
        </div>

        <div v-if="!loading && logs.length === 0" class="empty-state">
          Chưa có log phù hợp. Log chỉ xuất hiện khi có field được sửa thật.
        </div>

        <div v-else class="log-table-wrap">
          <table class="log-list-table">
            <thead>
              <tr>
                <th>Phiếu / Đương đơn</th>
                <th>Submission</th>
                <th>Hành động</th>
                <th>Nhân viên</th>
                <th>Thời gian</th>
                <th style="width:70px">Ô sửa</th>
                <th style="width:230px">Thêm / Sửa / Xóa</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in logs" :key="log.id" :class="{ active: openedLogId === log.id }">
                <td>
                  <div class="row-form-label">{{ log.formLabel || log.form_label || formLabelFromType(log.formType || log.form_type) }}</div>
                  <div class="row-customer-name">{{ log.customerName || log.customer_name || log.applicantName || 'Chưa lấy được tên đương đơn' }}</div>
                </td>
                <td>
                  <div><b>{{ log.submissionId || 'N/A' }}</b></div>
                  <small>Review: {{ log.reviewId || 'N/A' }}</small>
                </td>
                <td>{{ actionLabel(log.action) }}</td>
                <td>{{ log.actorName || log.actorUsername || 'N/A' }}</td>
                <td>{{ log.createdAt || 'N/A' }}</td>
                <td><b>{{ getFieldChanges(log).length }}</b></td>
                <td class="summary-cell">{{ changeTypeSummary(log) || log.note || '—' }}</td>
                <td class="action-cell">
                  <button class="btn-row" type="button" @click="openLog(log.id)">
                    {{ openedLogId === log.id ? 'Đang xem' : 'Xem chi tiết' }}
                  </button>
                  <button class="btn-link" type="button" title="Mở chi tiết log này ở tab mới" @click="openLogInNewTab(log)">↗ Tab mới</button>
                  <button
                    v-if="log.reviewId || log.submissionId"
                    class="btn-link"
                    type="button"
                    title="Bản tổng hợp cuối của cả phiếu này"
                    @click="openFinalReport(log.reviewId, log.submissionId)"
                  >📋 Tổng hợp cuối</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, onMounted, nextTick, watch } from 'vue'
import * as api from '../api/index.js'
import { getCheckLogs } from '../api/index.js'
import WordPaper from './WordPaper.vue'
import I130AWordPaper from './I130AWordPaper.vue'
import I129FWordPaper from './I129FWordPaper.vue'
import DS260WordPaper from './DS260WordPaper.vue'
import I90WordPaper from './I90WordPaper.vue'
import N600WordPaper from './N600WordPaper.vue'

const props = defineProps({
  currentUser: { type: Object, default: null },
  employees: { type: Array, default: () => [] }
})

const filters = reactive({
  submissionId: '',
  reviewId: '',
  actor: '',
  action: ''
})
const loading = ref(false)
const error = ref('')
const logs = ref([])
const actorOptions = ref([])
const openedLogId = ref(null)

const previewRef = ref(null)
const detailPanelRef = ref(null)
const finalPanelRef = ref(null)
const showPaperPreview = ref(false)
const activeCellIndex = ref(0)

// Bản tổng hợp cuối của 1 phiếu
const finalReport = ref(null)
const finalLoading = ref(false)
const finalError = ref('')
const finalOnlyReviewer = ref(false)
const finalShowHistory = ref(false)
const finalSearch = ref('')
const printingFinal = ref(false)

const filteredFinalRows = computed(() => {
  const rows = finalReport.value?.rows || []
  const keyword = finalSearch.value.trim().toLowerCase()
  return rows.filter(row => {
    if (finalOnlyReviewer.value && !row.reviewerTouched) return false
    if (keyword && !matchesFinalSearch(row, keyword)) return false
    return true
  })
})

const totalChangedFields = computed(() => logs.value.reduce((sum, log) => sum + getFieldChanges(log).length, 0))
const selectedLog = computed(() => logs.value.find(item => item.id === openedLogId.value) || null)
const selectedChanges = computed(() => (selectedLog.value ? getFieldChanges(selectedLog.value) : []))

function openLog(id) {
  openedLogId.value = id
  // Mỗi lần mở log khác là đóng phiếu gốc lại: bảng đối chiếu ở trên đã đủ dùng,
  // phiếu chỉ tải khi thực sự cần nhìn layout nên mở log không còn phải chờ.
  showPaperPreview.value = false
  activeCellIndex.value = 0
  // Bảng chi tiết nằm phía trên danh sách log, nên bấm từ dòng log phải tự cuộn lên,
  // nếu không người xem tưởng bấm xong không có gì hiện ra.
  scrollToPanel(detailPanelRef)
}

function closeLog() {
  openedLogId.value = null
  showPaperPreview.value = false
  activeCellIndex.value = 0
}

function scrollToPanel(panelRef) {
  nextTick(() => {
    panelRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

function buildCheckLogUrl(params = {}) {
  const url = new URL(window.location.href)
  url.searchParams.set('view', 'checklog')
  url.searchParams.delete('log')
  url.searchParams.delete('final')
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value)
  }
  return url.toString()
}

// Mang theo review/submission để tab mới lọc đúng phiếu rồi mới mở log — log cũ
// nằm ngoài 200 dòng mới nhất vẫn mở được.
function openLogInNewTab(log) {
  window.open(buildCheckLogUrl({
    log: log?.id,
    review: log?.reviewId,
    submission: log?.submissionId
  }), '_blank', 'noopener')
}

function openFinalInNewTab(reviewId) {
  window.open(buildCheckLogUrl({ final: reviewId }), '_blank', 'noopener')
}

// ===== BẢN TỔNG HỢP CUỐI =====
async function openFinalReport(reviewId, submissionId) {
  finalError.value = ''
  finalLoading.value = true
  finalReport.value = null
  scrollToPanel(finalPanelRef)
  try {
    finalReport.value = await api.getFinalReport({
      username: props.currentUser?.username,
      reviewId,
      submissionId
    })
    scrollToPanel(finalPanelRef)
  } catch (err) {
    finalError.value = err.message || 'Không lấy được bản tổng hợp cuối'
  } finally {
    finalLoading.value = false
  }
}

function closeFinalReport() {
  finalReport.value = null
  finalError.value = ''
}

function matchesFinalSearch(row, keyword) {
  return [row.label, row.key, row.section, row.baseValue, row.fillerValue, row.reviewerValue, row.finalValue]
    .join(' ')
    .toLowerCase()
    .includes(keyword)
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

// Xuất ra file để lưu/gửi: đúng các cột đang nhìn thấy trên bảng tổng hợp.
function downloadFinalCsv() {
  const report = finalReport.value
  if (!report) return

  const review = report.review || {}
  const header = ['STT', 'Mục trên phiếu', 'Số hạng mục', 'Mã ô', 'Ô (câu hỏi)', 'DATA GỐC', 'NGƯỜI XỬ LÝ ĐIỀN', 'TƯ VẤN SỬA', 'GIÁ TRỊ CUỐI', 'Kết luận', 'Số lượt chạm', 'Người thao tác']
  const lines = [
    [`Bản tổng hợp cuối - ${review.customerName || ''}`],
    [`Phiếu: ${review.formLabel || review.formType || ''}`, `Review ID: ${review.id || ''}`, `Submission ID: ${review.submissionId || ''}`],
    [`Xử lý: ${review.fillerName || ''}`, `Tư vấn: ${review.reviewerName || ''}`, `Submit: ${review.submittedAt || ''}`],
    [`Mở lại: ${review.reopenCount || 0} lần`, `Giao lại: ${review.resubmitCount || 0} lần`],
    [],
    header
  ].map(cols => cols.map(csvCell).join(','))

  filteredFinalRows.value.forEach((row, index) => {
    lines.push([
      index + 1,
      row.section,
      row.item,
      row.key,
      row.label,
      row.baseValue,
      row.fillerTouched ? row.fillerValue : 'Không đụng',
      row.reviewerTouched ? row.reviewerValue : 'Không đụng',
      row.finalValue,
      changeTypeLabel(row.changeType),
      row.touchCount,
      row.actors.join(' / ')
    ].map(csvCell).join(','))
  })

  // BOM để Excel mở đúng tiếng Việt.
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `tong-hop-cuoi-${review.id || review.submissionId || 'phieu'}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

// Khi in bản tổng hợp thì ẩn hết phần còn lại của màn hình, để bản in / PDF
// chỉ có đúng bảng tổng hợp cuối của phiếu đang xem.
function printFinalReport() {
  printingFinal.value = true
  nextTick(() => {
    window.print()
    printingFinal.value = false
  })
}

function togglePaperPreview() {
  showPaperPreview.value = !showPaperPreview.value
  if (showPaperPreview.value) focusChangedCell(activeCellIndex.value)
}

// Mở phiếu gốc và nhảy thẳng tới đúng ô của dòng vừa bấm.
function openPaperAtCell(index) {
  showPaperPreview.value = true
  focusChangedCell(index)
}

// Phiếu tải HTML + tự đổ data nên ô chưa có ngay; thử lại vài nhịp rồi mới bỏ cuộc.
function focusChangedCell(index, attempt = 0) {
  const total = selectedChanges.value.length
  if (!total) return

  const nextIndex = ((index % total) + total) % total
  activeCellIndex.value = nextIndex

  nextTick(() => {
    const root = previewRef.value
    if (!root) {
      if (attempt < 20) setTimeout(() => focusChangedCell(nextIndex, attempt + 1), 300)
      return
    }

    highlightChangedCells(root)

    const target = findCellElement(root, selectedChanges.value[nextIndex]?.field)
    if (!target) {
      if (attempt < 20) setTimeout(() => focusChangedCell(nextIndex, attempt + 1), 300)
      return
    }

    root.querySelectorAll('.log-cell-focus').forEach(el => el.classList.remove('log-cell-focus'))
    target.classList.add('log-cell-focus')
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}

function findCellElement(root, field) {
  if (!field) return null
  const noteId = convertDataCellToNoteCell(field)
  return root.querySelector(`[data-cell-id="${CSS.escape(noteId)}"]`)
    || root.querySelector(`[data-cell-id="${CSS.escape(field)}"]`)
}

function highlightChangedCells(root) {
  root.querySelectorAll('.log-cell-hit').forEach(el => el.classList.remove('log-cell-hit'))
  for (const change of selectedChanges.value) {
    const cell = findCellElement(root, change.field)
    if (cell) cell.classList.add('log-cell-hit')
  }
}

function toggleLog(id) {
  openedLogId.value = openedLogId.value === id ? null : id
}

function pretty(value) {
  if (value === undefined || value === null || value === '') return 'N/A'
  if (typeof value === 'string') return value
  return JSON.stringify(value, null, 2)
}

function actionLabel(action) {
  const map = {
    fill_draft_save: 'Lưu draft xử lý',
    fill_submit: 'Submit xử lý',
    review_draft_save: 'Lưu draft tư vấn',
    review_complete: 'Hoàn tất tư vấn',
    review_reopen: 'Mở lại phiếu đã giao',
    draft_delete: 'Xóa draft'
  }
  return map[action] || action || 'Không rõ'
}

function stageLabel(action) {
  if (action === 'review_draft_save' || action === 'review_complete') return 'Tư vấn / kiểm tra'
  if (action === 'draft_delete') return 'Xóa bản nháp'
  if (action === 'review_reopen') return 'Mở lại phiếu đã giao'
  return 'Xử lý / điền phiếu'
}

function formLabelFromType(value) {
  const raw = String(value || '').toLowerCase()
  if (raw === 'ds160' || raw === 'ds-160') return 'Phiếu kiểm tra DS-160'
  if (raw === 'ds260' || raw === 'ds-260') return 'Phiếu kiểm tra DS-260'
  if (raw === 'i90' || raw === 'i-90') return 'Phiếu kiểm tra I-90'
  if (raw === 'n600' || raw === 'n-600') return 'Phiếu kiểm tra N-600'
  if (raw.includes('i130a') || raw.includes('i-130a') || raw === 'i130' || raw === 'i-130' || raw === 'bao-lanh' || raw === 'ndbl') return 'Phiếu kiểm tra I-130A'
  if (raw.includes('i129f') || raw.includes('i-129f')) return 'Phiếu kiểm tra I-129F'
  return raw ? `Phiếu kiểm tra ${String(value).toUpperCase()}` : 'Chưa xác định phiếu'
}

function normalizeDisplay(value) {
  if (value === undefined || value === null) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value).trim()
}

function displayValue(value) {
  const text = normalizeDisplay(value)
  return text === '' ? 'Trống' : text
}

function valueClass(value) {
  return normalizeDisplay(value) === '' ? 'empty-value' : ''
}

function getLogFormType(log = {}) {
  const raw = String(log.formType || log.form_type || log.formSlug || log.form_slug || 'ds160').toLowerCase()
  if (raw === 'ds-160' || raw === 'ds160') return 'ds160'
  if (raw === 'ds-260' || raw === 'ds260') return 'ds-260'
  if (raw === 'i90' || raw === 'i-90') return 'i-90'
  if (raw === 'n600' || raw === 'n-600') return 'n-600'

  // Giữ đúng biến thể I-130A để phiếu log render giống phiếu kiểm tra thật.
  // Ví dụ: i130a-final cần giữ nguyên để I130AWordPaper sắp xếp/hiển thị đủ NBL + NDBL.
  if (raw.includes('i130a-final') || raw.includes('i-130a-final')) return 'i130a-final'
  if (raw.includes('i130a-nbl') || raw.includes('bao-lanh')) return 'i130a-nbl'
  if (raw.includes('i130a-ndbl') || raw.includes('ndbl')) return 'i130a-ndbl'
  if (raw.includes('i130a') || raw.includes('i-130a') || raw === 'i130' || raw === 'i-130') return 'i130a'

  if (raw.includes('i129f') || raw.includes('i-129f')) return 'i-129f'
  return raw || 'ds160'
}

function isI130Log(log = {}) {
  return String(getLogFormType(log) || '').startsWith('i130a')
}

function isI129FLog(log = {}) {
  return String(getLogFormType(log) || '').toLowerCase().includes('i129f') || String(getLogFormType(log) || '').toLowerCase().includes('i-129f')
}

function isDS260Log(log = {}) {
  const type = String(getLogFormType(log) || '').toLowerCase()
  return type === 'ds260' || type === 'ds-260'
}

function isI90Log(log = {}) {
  const type = String(getLogFormType(log) || '').toLowerCase()
  return type === 'i90' || type === 'i-90'
}

function isN600Log(log = {}) {
  const type = String(getLogFormType(log) || '').toLowerCase()
  return type === 'n600' || type === 'n-600'
}

function getLogPaperComponent(log = {}) {
  if (isI130Log(log)) return I130AWordPaper
  if (isI129FLog(log)) return I129FWordPaper
  if (isDS260Log(log)) return DS260WordPaper
  if (isI90Log(log)) return I90WordPaper
  if (isN600Log(log)) return N600WordPaper
  return WordPaper
}

function convertDataCellToNoteCell(cellId) {
  const key = String(cellId || '')
  if (key.startsWith('data_')) return key.replace(/^data_/, 'note_')
  return key
}

function escapeLogHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function normalizeLogCompareValue(value) {
  if (value === '__CLEARED__') return ''
  return String(value ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildClearedDisplay(field = {}) {
  const oldValue = normalizeLogCompareValue(field.old_value ?? field.oldValue ?? '')
  const baseValue = normalizeLogCompareValue(field.base_value ?? field.baseValue ?? '')
  const previousText = oldValue && oldValue !== baseValue ? oldValue : ''
  const previousLine = previousText
    ? `<div style="margin-top:4px;font-size:11px;line-height:1.25;color:#64748b;font-weight:600;">Trước khi save: ${escapeLogHtml(previousText)}</div>`
    : ''
  return `<span style="display:inline-block;padding:3px 8px;border-radius:999px;background:#fee2e2;color:#b91c1c;font-weight:700;">ĐÃ XÓA / ĐỂ TRỐNG</span>${previousLine}`
}

function buildLogEditedColumn(log = {}) {
  const output = {}
  for (const field of getFieldChanges(log)) {
    const targetCellId = convertDataCellToNoteCell(field.field)
    if (!targetCellId) continue

    const newValue = field.new_value ?? field.newValue ?? ''
    const oldValue = field.old_value ?? field.oldValue ?? ''
    const normalizedNew = normalizeLogCompareValue(newValue)
    const normalizedOld = normalizeLogCompareValue(oldValue)

    // Nếu lần log là thao tác xóa/clear, không được để cột ĐÃ SỬA trống
    // vì nhìn sẽ giống như không có log. Hiển thị rõ trạng thái đã xóa.
    if (newValue === '__CLEARED__' || (!normalizedNew && normalizedOld)) {
      output[targetCellId] = buildClearedDisplay(field)
    } else {
      output[targetCellId] = newValue ?? ''
    }
  }
  return output
}

function getLogComparisonData(log = {}) {
  const base = log.customerData || log.customer_data || {}
  const customerName = log.customerName || log.customer_name || log.applicantName || log.applicant_name || base.customerName || base.fullName || ''
  return {
    ...base,
    id: log.submissionId || log.submission_id || base.id,
    customerName,
    fullName: customerName,
    fillerName: log.actorName || log.actor_name || base.fillerName || '',
    reviewerName: 'Check log',
    _isLogCompare: true,
    _logChangedFields: getFieldChanges(log),
    _fillerChanges: {},
    _reviewChanges: buildLogEditedColumn(log)
  }
}

const FIELD_SUFFIX_LABELS = {
  employer: 'Tên công ty / nơi làm việc',
  country: 'Quốc gia',
  line1: 'Địa chỉ dòng 1',
  line2: 'Địa chỉ dòng 2',
  city: 'Thành phố',
  state: 'Tiểu bang / Tỉnh',
  province: 'Tỉnh / Bang',
  zip: 'Mã ZIP / Postal code',
  occupation: 'Nghề nghiệp / chức danh',
  from: 'Ngày bắt đầu',
  to: 'Ngày kết thúc',
  name: 'Họ tên',
  surname: 'Họ',
  given_name: 'Tên',
  given_names: 'Tên',
  date: 'Ngày',
  date_of_birth: 'Ngày sinh',
  birth_date: 'Ngày sinh',
  place: 'Nơi',
  address: 'Địa chỉ',
  phone: 'Số điện thoại',
  email: 'Email',
  passport: 'Hộ chiếu',
  passport_number: 'Số hộ chiếu',
  issue_date: 'Ngày cấp',
  expiry_date: 'Ngày hết hạn',
  yes_no: 'Có / Không'
}

const FIELD_PREFIX_MAP = [
  { re: /^data_i130a_employment_(\d+)_(.+)$/i, section: 'VIỆC LÀM TRONG 5 NĂM QUA', group: n => `Công việc ${n}` },
  { re: /^data_i130a_address_(\d+)_(.+)$/i, section: 'ĐỊA CHỈ Ở TRONG 5 NĂM QUA', group: n => `Địa chỉ ${n}` },
  { re: /^data_i130a_spouse_(\d+)_(.+)$/i, section: 'THÔNG TIN HÔN NHÂN', group: n => `Hôn phối ${n}` },
  { re: /^data_i130a_children_(\d+)_(.+)$/i, section: 'THÔNG TIN CON CÁI', group: n => `Người con ${n}` },
  { re: /^data_i130a_parent_(father|mother)_(.+)$/i, section: 'THÔNG TIN CHA/MẸ', group: n => n === 'father' ? 'Thông tin cha' : 'Thông tin mẹ' },
  { re: /^data_i130a_(.+)$/i, section: 'THÔNG TIN I-130A', group: () => '' },
  { re: /^data_ds160_(.+)$/i, section: 'PHIẾU KIỂM TRA DS-160', group: () => '' },
  { re: /^data_(\d+)_(.+)$/i, section: 'PHIẾU KIỂM TRA DS-160', group: n => `Mục ${n}` }
]

const EXACT_FIELD_LABELS = {
  surnames: ['THÔNG TIN CÁ NHÂN', '', 'Surnames / Họ'],
  given_names: ['THÔNG TIN CÁ NHÂN', '', 'Given Names / Tên'],
  full_name_native: ['THÔNG TIN CÁ NHÂN', '', 'Full Name in Native Language / Họ tên tiếng Việt'],
  sex: ['THÔNG TIN CÁ NHÂN', '', 'Giới tính'],
  current_marital_status: ['THÔNG TIN CÁ NHÂN', '', 'Tình trạng hôn nhân hiện tại'],
  date_of_birth: ['THÔNG TIN CÁ NHÂN', '', 'Ngày sinh'],
  city_of_birth: ['THÔNG TIN CÁ NHÂN', '', 'Thành phố nơi sinh'],
  state_of_birth: ['THÔNG TIN CÁ NHÂN', '', 'Tỉnh/Bang nơi sinh'],
  country_of_birth: ['THÔNG TIN CÁ NHÂN', '', 'Quốc gia nơi sinh'],
  passport_number: ['THÔNG TIN HỘ CHIẾU', '', 'Số hộ chiếu'],
  national_id: ['THÔNG TIN CÁ NHÂN', '', 'Số ID / National ID'],
  ssn: ['THÔNG TIN CÁ NHÂN', '', 'Số SSN'],
  phone: ['THÔNG TIN LIÊN HỆ', '', 'Số điện thoại'],
  email: ['THÔNG TIN LIÊN HỆ', '', 'Email']
}

function humanizeToken(token) {
  const key = String(token || '').toLowerCase()
  if (FIELD_SUFFIX_LABELS[key]) return FIELD_SUFFIX_LABELS[key]
  return key
    .replace(/^data_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

function friendlyFieldInfo(rawField, rawLabel) {
  const field = String(rawField || '').trim()
  const label = String(rawLabel || '').trim()

  if (label && label !== field && !/^data[_-]/i.test(label)) {
    return { section: 'Theo nhãn trên phiếu', group: '', label }
  }

  const lower = field.toLowerCase()
  if (EXACT_FIELD_LABELS[lower]) {
    const [section, group, niceLabel] = EXACT_FIELD_LABELS[lower]
    return { section, group, label: niceLabel }
  }

  for (const item of FIELD_PREFIX_MAP) {
    const match = field.match(item.re)
    if (match) {
      const indexOrRest = match[1]
      const suffix = match[2] || match[1]
      return {
        section: item.section,
        group: typeof item.group === 'function' ? item.group(indexOrRest) : item.group,
        label: humanizeToken(suffix)
      }
    }
  }

  return {
    section: 'Chưa xác định phần trong phiếu',
    group: 'Cần bổ sung mapping nhãn cho field này',
    label: label && label !== field ? label : humanizeToken(field)
  }
}

function getFieldChanges(log) {
  const values = log?.changedFields?.values || log?.changed_fields?.values || {}
  const fields = log?.changedFields?.fields || log?.changed_fields?.fields || Object.keys(values)
  if (!Array.isArray(fields)) return []

  const isInternalField = (fieldName) => [
    '__ds160_hidden_placeholders__',
    '__ds260_hidden_placeholders__'
  ].includes(String(fieldName || ''))

  return fields.filter(fieldName => !isInternalField(fieldName)).map(fieldName => {
    const item = values[fieldName]
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const info = friendlyFieldInfo(item.field || fieldName, item.label || fieldName)
      const oldValue = item.old_value ?? item.oldValue ?? ''
      const newValue = item.new_value ?? item.newValue ?? ''
      const baseValue = item.base_value ?? item.baseValue ?? ''
      return {
        field: item.field || fieldName,
        // Mục / số hạng mục / cột lấy thẳng từ snapshot của phiếu lúc ghi log.
        // Log cũ (trước khi phiếu gửi kèm các field này) thì fallback về suy đoán từ mã ô.
        section: item.section || info.section,
        group: item.item ? `Mục ${item.item}` : info.group,
        column: item.column || columnFromFieldName(item.field || fieldName),
        label: item.label && item.label !== (item.field || fieldName) ? item.label : info.label,
        changeType: item.change_type || item.changeType || inferChangeType(baseValue, oldValue, newValue),
        old_value: oldValue,
        new_value: newValue,
        base_value: baseValue
      }
    }
    const info = friendlyFieldInfo(fieldName, fieldName)
    return {
      field: fieldName,
      section: info.section,
      group: info.group,
      column: columnFromFieldName(fieldName),
      label: info.label,
      changeType: inferChangeType('', '', item),
      old_value: '',
      new_value: item,
      base_value: ''
    }
  })
}

function columnFromFieldName(field) {
  const id = String(field || '')
  if (id.startsWith('note_')) return 'TƯ VẤN'
  if (id.startsWith('data_')) return 'XỬ LÝ'
  if (id.startsWith('header_')) return 'ĐẦU PHIẾU'
  return ''
}

// Log cũ không có change_type thì suy ra từ 3 giá trị đã lưu.
function inferChangeType(baseValue, oldValue, newValue) {
  const base = normalizeLogCompareValue(baseValue)
  const prev = normalizeLogCompareValue(oldValue)
  const next = normalizeLogCompareValue(newValue)
  if (!next && prev) return 'delete'
  if (!prev && next) return 'add'
  if (next && next === base && prev !== base) return 'restore'
  return 'edit'
}

const CHANGE_TYPE_LABELS = {
  add: 'Điền thêm',
  edit: 'Sửa lại',
  delete: 'Xóa trắng',
  restore: 'Trả về data gốc'
}

function changeTypeLabel(type) {
  return CHANGE_TYPE_LABELS[type] || 'Sửa lại'
}

// Đếm theo loại thao tác để nhìn 1 dòng log là biết nhân viên đã thêm / sửa / xóa bao nhiêu ô.
function changeTypeSummary(log) {
  const counts = { add: 0, edit: 0, delete: 0, restore: 0 }
  for (const change of getFieldChanges(log)) {
    counts[change.changeType] = (counts[change.changeType] || 0) + 1
  }
  return Object.entries(counts)
    .filter(([, total]) => total > 0)
    .map(([type, total]) => `${CHANGE_TYPE_LABELS[type]}: ${total}`)
    .join(' · ')
}

function groupedFieldChanges(log) {
  const groups = new Map()
  for (const field of getFieldChanges(log)) {
    const key = field.section || 'KHÁC'
    if (!groups.has(key)) groups.set(key, { key, section: key, items: [] })
    groups.get(key).items.push(field)
  }
  return Array.from(groups.values())
}

function normalizeActorOptions(logActors = [], employees = []) {
  const map = new Map()

  const addOption = (item = {}) => {
    const name = item.actorName || item.actor_name || item.name || item.display_name || ''
    const username = item.actorUsername || item.actor_username || item.username || item.user_login || ''
    const value = username || name
    if (!value) return
    const label = name && username && name !== username ? `${name} (${username})` : (name || username)
    map.set(value, { value, label })
  }

  ;(Array.isArray(employees) ? employees : []).forEach(addOption)
  ;(Array.isArray(logActors) ? logActors : []).forEach(addOption)

  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, 'vi'))
}

async function loadLogs() {
  error.value = ''
  loading.value = true
  try {
    const data = await getCheckLogs({
      userId: props.currentUser?.id,
      username: props.currentUser?.username,
      submissionId: filters.submissionId,
      reviewId: filters.reviewId,
      actor: filters.actor,
      action: filters.action,
      limit: 200
    })
    logs.value = data.logs || []
    actorOptions.value = normalizeActorOptions(data.actors || data.actorOptions || logs.value, props.employees)
    if (openedLogId.value && !logs.value.some(item => item.id === openedLogId.value)) openedLogId.value = null
  } catch (err) {
    error.value = err.message || 'Không thể tải check log'
  } finally {
    loading.value = false
  }
}

watch(() => props.employees, (list) => {
  actorOptions.value = normalizeActorOptions(actorOptions.value, list)
}, { deep: true })

// Link "mở tab mới": tab mới bật lên là vào thẳng đúng log / đúng bản tổng hợp,
// không bắt người xem lọc lại từ đầu.
async function applyDeepLink() {
  const params = new URLSearchParams(window.location.search)
  const finalId = params.get('final')
  const logId = params.get('log')

  if (finalId) {
    await openFinalReport(parseInt(finalId, 10), null)
    return
  }
  if (logId) {
    const targetId = parseInt(logId, 10)
    if (!logs.value.some(item => item.id === targetId)) {
      // Log cũ không nằm trong 200 dòng mới nhất: lọc theo đúng phiếu rồi tải lại.
      filters.reviewId = params.get('review') || ''
      filters.submissionId = params.get('submission') || ''
      filters.actor = ''
      filters.action = ''
      await loadLogs()
    }
    if (logs.value.some(item => item.id === targetId)) openLog(targetId)
    else error.value = `Không tìm thấy log #${targetId} trong danh sách hiện tại.`
  }
}

onMounted(async () => {
  await loadLogs()
  await applyDeepLink()
})
</script>

<style scoped>
.check-log-page {
  padding: 24px;
  background: #f3f6fb;
  min-height: 100vh;
  color: #0f172a;
}
.check-log-card {
  max-width: 1220px;
  margin: 0 auto;
  background: #fff;
  border-radius: 16px;
  padding: 22px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, .08);
}
.check-log-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 18px;
}
.eyebrow {
  display: inline-flex;
  margin-bottom: 8px;
  padding: 5px 10px;
  border-radius: 999px;
  background: #eef3ff;
  color: #133985;
  font-size: 12px;
  font-weight: 700;
}
h1 {
  margin: 0 0 6px;
  font-size: 26px;
  color: #0f172a;
}
p {
  margin: 0;
  color: #64748b;
  line-height: 1.45;
}
.filters {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin: 18px 0;
}
label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-weight: 700;
  font-size: 13px;
  color: #1e293b;
}
input,
select {
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 10px 11px;
  font-size: 14px;
  color: #0f172a;
  background: #fff;
}
input:focus,
select:focus {
  border-color: #133985;
  outline: 3px solid rgba(19, 57, 133, .12);
}
.btn-primary {
  background: #133985;
  color: white;
  border: 0;
  border-radius: 10px;
  padding: 11px 17px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}
.btn-primary:disabled { opacity: .6; cursor: not-allowed; }
.quick-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 4px 0 20px;
}
.summary-card {
  border: 1px solid #dbe3ef;
  background: #f8fbff;
  border-radius: 14px;
  padding: 14px 16px;
}
.summary-card span {
  display: block;
  color: #64748b;
  font-size: 13px;
  margin-bottom: 5px;
}
.summary-card strong {
  font-size: 24px;
  color: #133985;
}
.error-box {
  background: #fee2e2;
  color: #991b1b;
  padding: 11px 13px;
  border-radius: 10px;
  margin-bottom: 16px;
}
.section-block { margin-top: 24px; }
.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}
h2 { margin: 0; font-size: 19px; color: #0f172a; }
h3 { margin: 10px 0 6px; font-size: 14px; }
.count-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 9px;
  background: #eef2f7;
  color: #475569;
  font-size: 12px;
  font-weight: 700;
}
.log-card {
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 12px;
  margin-bottom: 12px;
  background: #fff;
}
.log-summary {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(280px, 1fr) minmax(520px, 1.25fr) auto;
  gap: 14px;
  align-items: stretch;
  border: 1px solid #dbeafe;
  border-radius: 14px;
  background: linear-gradient(135deg, #f8fbff 0%, #eef4ff 100%);
  padding: 14px;
  cursor: pointer;
  text-align: left;
}
.log-summary:hover { border-color: #133985; }
.form-pill {
  display: inline-flex;
  align-items: center;
  padding: 5px 10px;
  margin-bottom: 8px;
  border-radius: 999px;
  background: #133985;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}
.log-summary-main h3 {
  margin: 0 0 8px;
  font-size: 20px;
  color: #0f172a;
}
.case-sub {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  color: #475569;
  font-size: 13px;
}
.case-sub b { color: #0f172a; }
.log-summary-side {
  display: grid;
  grid-template-columns: repeat(4, minmax(96px, 1fr));
  gap: 8px;
}
.log-summary-side div {
  background: rgba(255,255,255,.9);
  border: 1px solid #dbe3ef;
  border-radius: 10px;
  padding: 9px 10px;
}
.log-summary-side span {
  display: block;
  color: #64748b;
  font-size: 11px;
  margin-bottom: 4px;
}
.log-summary-side strong {
  display: block;
  color: #0f172a;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.expand-indicator {
  align-self: center;
  justify-self: end;
  border-radius: 999px;
  padding: 8px 12px;
  background: #133985;
  color: #fff;
  font-weight: 700;
  white-space: nowrap;
}
.comparison-sheet {
  margin-top: 14px;
  border: 1px solid #111827;
  background: white;
  padding: 16px;
  border-radius: 4px;
  color: #111827;
}
.sheet-title {
  display: grid;
  grid-template-columns: 190px 1fr;
  border: 1px solid #111827;
  margin-bottom: 8px;
}
.brand-box {
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: 1px solid #111827;
  color: #133985;
  font-size: 25px;
  font-weight: 700;
}
.sheet-title > div:last-child {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 8px;
}
.sheet-title h2 {
  font-size: 17px;
  margin: 0 0 4px;
}
.sheet-title p {
  margin: 0;
  color: #111827;
  font-weight: 700;
  font-size: 13px;
}
.info-table,
.pkt-table {
  width: 100%;
  border-collapse: collapse;
}
.info-table th,
.info-table td,
.pkt-table th,
.pkt-table td {
  border: 1px solid #111827;
  padding: 7px 8px;
  vertical-align: top;
}
.info-table th {
  background: #f1f5f9;
  text-align: left;
  width: 18%;
}
.info-table td { width: 32%; }
.two-column-note {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 10px 0;
  color: #334155;
  font-size: 13px;
}
.two-column-note div {
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  padding: 8px 10px;
  background: #f8fafc;
}
.pkt-table-wrap { overflow-x: auto; }
.pkt-table { min-width: 860px; font-size: 13px; }
.pkt-table th {
  background: #eef2ff;
  text-align: center;
  color: #0f172a;
}
.section-row td {
  background: #f3f4f6;
  color: #0f172a;
  font-weight: 700;
  text-transform: uppercase;
}
.center { text-align: center; }
.field-label { font-weight: 700; color: #0f172a; margin-bottom: 3px; }
.field-group { color: #64748b; font-size: 12px; font-weight: 600; }
.new-value { color: #166534; font-weight: 700; }
.empty-value { color: #94a3b8 !important; font-style: italic; font-weight: 500; }
.technical-details { margin-top: 12px; }
summary { cursor: pointer; color: #133985; font-weight: 700; }
pre {
  white-space: pre-wrap;
  word-break: break-word;
  background: #0f172a;
  color: #e2e8f0;
  border-radius: 10px;
  padding: 10px;
  max-height: 320px;
  overflow: auto;
  font-size: 12px;
}

.selected-log-panel {
  border: 1px solid #133985;
  border-radius: 16px;
  background: #ffffff;
  padding: 16px;
  margin: 18px 0 24px;
  box-shadow: 0 10px 24px rgba(19, 57, 133, .12);
}
.selected-log-header {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
  padding-bottom: 12px;
  border-bottom: 1px solid #dbe3ef;
}
.selected-log-header h2 {
  margin: 2px 0 8px;
  font-size: 24px;
}
.btn-secondary {
  background: #fff;
  color: #133985;
  border: 1px solid #133985;
  border-radius: 10px;
  padding: 10px 14px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}
.selected-note {
  margin: 12px 0;
  padding: 10px 12px;
  border: 1px solid #dbe3ef;
  border-radius: 10px;
  background: #f8fafc;
  color: #334155;
  font-size: 13px;
  line-height: 1.45;
}
.selected-note code {
  background: #eef2ff;
  padding: 2px 5px;
  border-radius: 5px;
  color: #133985;
}
.log-table-wrap {
  border: 1px solid #dbe3ef;
  border-radius: 14px;
  overflow: auto;
  background: #fff;
}
.log-list-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 980px;
  font-size: 14px;
}
.log-list-table th,
.log-list-table td {
  border-bottom: 1px solid #e5e7eb;
  padding: 11px 12px;
  text-align: left;
  vertical-align: middle;
}
.log-list-table th {
  background: #eef3ff;
  color: #0f172a;
  font-weight: 700;
  white-space: nowrap;
}
.log-list-table tbody tr:hover { background: #f8fbff; }
.log-list-table tbody tr.active {
  background: #eff6ff;
  outline: 2px solid #133985;
  outline-offset: -2px;
}
.row-form-label {
  display: inline-flex;
  padding: 4px 9px;
  border-radius: 999px;
  background: #133985;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 5px;
}
.row-customer-name {
  font-weight: 700;
  color: #0f172a;
  font-size: 15px;
}
.log-list-table small { color: #64748b; }
.action-cell { text-align: right !important; }
.btn-row {
  border: 0;
  border-radius: 999px;
  padding: 8px 12px;
  background: #133985;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

.empty-state {
  color: #64748b;
  padding: 22px;
  text-align: center;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  background: #f8fafc;
}

.full-pkt-preview {
  margin-top: 12px;
  padding: 14px;
  border: 1px solid #dbe3ef;
  border-radius: 12px;
  background: #f8fafc;
  overflow-x: auto;
}
.full-pkt-preview :deep(.word-paper-container) {
  min-width: 1120px;
  background: #ffffff;
}
.full-pkt-preview :deep(.pkt-header-actions),
.full-pkt-preview :deep(.manual-save-button),
.full-pkt-preview :deep(button) {
  display: none !important;
}
.full-pkt-preview :deep(.color-customer) {
  color: #9a3b0c !important;
  font-weight: 700 !important;
}
.full-pkt-preview :deep(.color-reviewer) {
  color: #166534 !important;
  font-weight: 700 !important;
}
.full-pkt-preview :deep([contenteditable="true"]) {
  outline: none !important;
}

@media (max-width: 1100px) {
  .filters,
  .quick-summary,
  .two-column-note { grid-template-columns: 1fr; }
  .check-log-header { flex-direction: column; }
  .log-summary { grid-template-columns: 1fr; }
  .log-summary-side { grid-template-columns: 1fr 1fr; }
  .expand-indicator { justify-self: stretch; text-align: center; }
}

/* ===== Bảng đối chiếu từng ô (thay cho việc phải mở phiếu rồi dò tay) ===== */
.diff-block {
  margin-top: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
}
.diff-title-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px 14px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}
.diff-title-row h3 {
  margin: 0;
  font-size: 15px;
  color: #0f172a;
}
.diff-summary {
  font-size: 12px;
  font-weight: 700;
  color: #475569;
}
.diff-table-wrap {
  overflow-x: auto;
  max-height: 620px;
  overflow-y: auto;
}
.diff-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}
.diff-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #eef2ff;
  color: #1e293b;
  text-align: left;
  padding: 9px 10px;
  border-bottom: 1px solid #c7d2fe;
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: .3px;
}
.diff-table td {
  padding: 9px 10px;
  border-bottom: 1px solid #eef2f7;
  vertical-align: top;
}
.diff-table tbody tr:hover { background: #f8fafc; }
.diff-index { color: #94a3b8; font-weight: 700; }
.diff-section { font-weight: 700; color: #334155; font-size: 12px; }
.diff-group { color: #64748b; font-size: 11.5px; }
.diff-label { font-weight: 700; color: #0f172a; }
.diff-cell-id { display: inline-block; margin-top: 3px; font-size: 10.5px; color: #94a3b8; }
.diff-column-pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 800;
}
.diff-column-pill.col-filler { background: #e0f2fe; color: #0369a1; }
.diff-column-pill.col-reviewer { background: #ede9fe; color: #6d28d9; }
.diff-value { white-space: pre-wrap; word-break: break-word; }
.diff-value.base { color: #92400e; }
.diff-value.old { color: #64748b; text-decoration: line-through; }
.diff-value.new { color: #065f46; font-weight: 700; }
.diff-value.empty-value { color: #cbd5e1; font-style: italic; text-decoration: none; }
.diff-type-pill {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
}
.diff-type-pill.type-add { background: #dcfce7; color: #15803d; }
.diff-type-pill.type-edit { background: #dbeafe; color: #1d4ed8; }
.diff-type-pill.type-delete { background: #fee2e2; color: #b91c1c; }
.diff-type-pill.type-restore { background: #fef3c7; color: #b45309; }
.diff-goto-btn {
  display: block;
  margin-top: 6px;
  padding: 0;
  border: 0;
  background: none;
  color: #1d4ed8;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
}

.paper-toggle-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin: 14px 0 6px;
}
.cell-position { font-size: 12px; font-weight: 700; color: #334155; }
.paper-toggle-note { flex: 1 1 260px; font-size: 11.5px; color: #64748b; }

.lifecycle-note {
  border-left: 4px solid #f59e0b;
  background: #fffbeb;
  color: #92400e;
}

.summary-cell { font-size: 12px; color: #475569; }

/* Ô đã sửa trong phiếu gốc: tô vàng toàn bộ, ô đang nhảy tới thì viền xanh đậm. */
.full-pkt-preview :deep(.log-cell-hit) {
  background: #fef9c3 !important;
  outline: 2px solid #facc15;
}
.full-pkt-preview :deep(.log-cell-focus) {
  background: #dbeafe !important;
  outline: 3px solid #2563eb;
}


/* ===== Bản tổng hợp cuối (final) ===== */
.final-panel {
  border: 2px solid #1d4ed8;
}
.final-pill {
  background: #1d4ed8 !important;
  color: #fff !important;
}
.final-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.final-summary { margin-top: 12px; }
.final-filter-row {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  margin: 12px 0 8px;
  font-size: 12.5px;
  color: #334155;
}
.final-filter-row label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  cursor: pointer;
}
.final-search {
  flex: 1 1 220px;
  min-width: 180px;
  padding: 7px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  font-size: 13px;
}
.final-count {
  font-weight: 700;
  color: #475569;
}
.final-table th { background: #dbeafe; border-bottom-color: #93c5fd; }
.diff-value.filler { color: #1d4ed8; font-weight: 700; }
.diff-value.reviewer { color: #6d28d9; font-weight: 700; }
.diff-value.untouched { color: #cbd5e1; font-weight: 400; font-style: italic; }
.final-touch {
  margin-top: 5px;
  font-size: 10.5px;
  color: #94a3b8;
}
.final-history-row td {
  background: #f8fafc;
  padding-top: 4px;
  padding-bottom: 8px;
}
.final-history-step {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 4px 0;
  font-size: 11.5px;
  border-top: 1px dashed #e2e8f0;
}
.hist-time { color: #64748b; min-width: 140px; }
.hist-actor { font-weight: 800; color: #0f172a; }
.hist-action { color: #475569; }
.hist-col { color: #94a3b8; }
.hist-old { color: #94a3b8; text-decoration: line-through; }
.hist-arrow { color: #94a3b8; }
.hist-new { color: #065f46; font-weight: 700; }

.btn-link {
  margin-top: 5px;
  padding: 0;
  border: 0;
  background: none;
  color: #1d4ed8;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  display: block;
}
.btn-link:hover { text-decoration: underline; }

@media print {
  .filters,
  .quick-summary,
  .check-log-header .btn-primary,
  .section-title-row,
  .log-summary,
  .technical-details { display: none !important; }
  .check-log-page, .check-log-card { padding: 0; box-shadow: none; background: white; }
  .comparison-sheet { display: block !important; border: none; }

  /* In bản tổng hợp cuối: chỉ in đúng bảng tổng hợp, bỏ hết phần còn lại của màn hình. */
  .printing-final .check-log-header,
  .printing-final .error-box,
  .printing-final .section-block,
  .printing-final .final-filter-row,
  .printing-final .final-header-actions,
  .printing-final .selected-log-panel:not(.final-panel) { display: none !important; }
  .printing-final .final-summary { display: flex !important; }
  .printing-final .final-panel { border: 0; }
  .printing-final .diff-table-wrap { max-height: none; overflow: visible; }
  .printing-final .diff-table { font-size: 10px; }
  .printing-final .diff-table th { position: static; }
}
</style>

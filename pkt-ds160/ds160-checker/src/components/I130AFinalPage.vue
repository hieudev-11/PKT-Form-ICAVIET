<template>
  <div class="customer-list-container">
    <!-- Header + Filter -->
    <div class="cl-toolbar">
      <h2>
        <template v-if="mode === 'reviewer'">
          {{ reviewerView === 'pending' ? '🔍 Hàng đợi duyệt phiếu Final' : '✅ Phiếu Final đã hoàn tất' }}
        </template>
        <template v-else>
          🤝 Ghép Cặp I-130 (Người Bảo Lãnh & Người Được Bảo Lãnh)
        </template>
      </h2>

      <div class="cl-toolbar-right">
        <select v-if="mode === 'filler'" class="cl-filter" :value="formTypeFilter || ''" @change="$emit('change-form-type', $event.target.value)">
          <option value="">Tất cả loại phiếu</option>
          <option v-for="ft in formTypes" :key="ft.value" :value="ft.value">{{ ft.label }}</option>
        </select>
        <span class="cl-count" v-if="mode === 'reviewer'">{{ displayItems.length }} phiếu</span>
      </div>
    </div>

    <!-- Bộ lọc diện bảo lãnh cho phiếu tổng hợp -->
    <div v-if="mode === 'filler'" class="case-type-panel">
      <div class="case-type-title">Chọn diện bảo lãnh cần ghép phiếu</div>
      <div class="case-type-tabs">
        <button
          v-for="item in relationCategories"
          :key="item.value"
          type="button"
          class="case-type-tab"
          :class="{ active: selectedRelation === item.value }"
          @click="selectedRelation = item.value"
        >
          {{ item.label }}
        </button>
      </div>
      <div class="case-type-note">
        Đang lọc: <strong>{{ selectedRelationLabel }}</strong>. Danh sách NBL và NDBL bên dưới chỉ hiện hồ sơ cùng diện để tránh ghép nhầm.
      </div>
    </div>

    <!-- REVIEWER: Bảng danh sách hàng đợi duyệt giống hệt I130ACustomerList -->
    <template v-if="mode === 'reviewer'">
      <table class="cl-table">
        <thead>
          <tr>
            <th style="width:60px">ID</th>
            <th>Khách hàng (NBL / NDBL)</th>
            <th style="width:150px">Loại phiếu</th>
            <th style="width:150px">Người giao</th>
            <th style="width:150px">Người check</th>
            <th style="width:130px">Ngày giao</th>
            <th style="width:120px">Trạng thái</th>
            <th v-if="reviewerView === 'completed'" style="width:90px">Tải về</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in displayItems"
            :key="item.id"
            @click="$emit('select-review', item)"
            class="review-row"
          >
            <td class="td-id">{{ item.customerId }}</td>
            <td class="td-name">{{ item.customerName }}</td>
            <td>{{ displayFormLabel(item.formLabel) }}</td>
            <td>{{ item.fillerName }}</td>
            <td>{{ item.reviewerName || '-' }}</td>
            <td>{{ item.submittedAt }}</td>
            <td>
              <span v-if="reviewerView === 'pending'" class="cl-badge pending">Chờ kiểm tra</span>
              <span v-else class="cl-badge completed">Đã kiểm tra</span>
            </td>
            <td v-if="reviewerView === 'completed'">
              <button
                class="cl-download-btn"
                :disabled="downloadingId === item.id"
                @click.stop="handleDownload(item)"
              >
                <template v-if="downloadingId === item.id">⏳</template>
                <template v-else>📥 PDF</template>
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="displayItems.length === 0" class="cl-empty">
        <div class="cl-empty-icon">🎉</div>
        <div>Không có phiếu Final nào trong danh sách.</div>
      </div>
    </template>

    <!-- FILLER: Giao diện ghép cặp NBL và NDBL thủ công -->
    <template v-else>
      <div class="pairing-card">
        <div class="card-body">
          <div class="pairing-grid">
            <!-- Cột Người Bảo Lãnh -->
            <div class="pairing-column">
              <label class="pairing-label">🧑‍⚖️ 1. Người Bảo Lãnh - {{ selectedRelationLabel }}</label>
              
              <!-- Search box NBL -->
              <div class="search-wrapper">
                <input
                  v-model="nblSearch"
                  type="text"
                  placeholder="🔍 Nhập ID, Tên hoặc SĐT để lọc..."
                  class="search-input"
                />
              </div>

              <!-- List NBL -->
              <div class="selection-box">
                <div
                  v-for="nbl in filteredNBLList"
                  :key="nbl.id"
                  class="selection-item"
                  :class="{ selected: selectedNblId === nbl.id, disabled: isReviewLocked(nbl) }"
                  @click="handleSelectNbl(nbl)"
                >
                  <div class="item-id">ID: {{ nbl.id }}</div>
                  <div class="item-text">{{ nbl.label.replace(/\[ID \d+\]\s*/, '') }}</div>
                  <div class="item-relation">{{ getRelationLabel(nbl) }}</div>
                  <div v-if="isReviewLocked(nbl)" class="item-status">
                    {{ getReviewStatusLabel(nbl) }}
                  </div>
                  <button
                    v-if="canReopen(nbl)"
                    class="item-reopen-btn"
                    type="button"
                    title="Mở lại phiếu đã giao để sửa, giữ nguyên những gì đã điền"
                    @click.stop="handleReopen(nbl)"
                  >↺ Mở lại để sửa</button>
                </div>
                <div v-if="filteredNBLList.length === 0" class="selection-empty">
                  Không tìm thấy người bảo lãnh nào trong diện đang chọn.
                </div>
              </div>
            </div>

            <!-- Icon Mũi tên kết hợp -->
            <div class="pairing-connector">
              <div class="connector-arrow">➕</div>
            </div>

            <!-- Cột Người Được Bảo Lãnh -->
            <div class="pairing-column">
              <label class="pairing-label">👤 2. Người Được Bảo Lãnh - {{ selectedRelationLabel }}</label>

              <!-- Search box NDBL -->
              <div class="search-wrapper">
                <input
                  v-model="ndblSearch"
                  type="text"
                  placeholder="🔍 Nhập ID, Tên hoặc SĐT để lọc..."
                  class="search-input"
                />
              </div>

              <!-- List NDBL -->
              <div class="selection-box">
                <div
                  v-for="ndbl in filteredNDBLList"
                  :key="ndbl.id"
                  class="selection-item"
                  :class="{ selected: selectedNdblId === ndbl.id, disabled: isReviewLocked(ndbl) }"
                  @click="handleSelectNdbl(ndbl)"
                >
                  <div class="item-id">ID: {{ ndbl.id }}</div>
                  <div class="item-text">{{ ndbl.label.replace(/\[ID \d+\]\s*/, '') }}</div>
                  <div class="item-relation">{{ getRelationLabel(ndbl) }}</div>
                  <div v-if="isReviewLocked(ndbl)" class="item-status">
                    {{ getReviewStatusLabel(ndbl) }}
                  </div>
                  <button
                    v-if="canReopen(ndbl)"
                    class="item-reopen-btn"
                    type="button"
                    title="Mở lại phiếu đã giao để sửa, giữ nguyên những gì đã điền"
                    @click.stop="handleReopen(ndbl)"
                  >↺ Mở lại để sửa</button>
                  <div v-if="selectedNblInfo" class="match-line" :class="{ ok: getPairingMatch(selectedNblInfo, ndbl)?.passed, bad: getPairingMatch(selectedNblInfo, ndbl)?.enabled && !getPairingMatch(selectedNblInfo, ndbl)?.passed }">
                    {{ getPairingMatch(selectedNblInfo, ndbl)?.label }}
                    <span v-if="getPairingMatch(selectedNblInfo, ndbl)?.enabled">
                      · Tên: {{ getPairingMatch(selectedNblInfo, ndbl)?.nameMatch ? 'khớp' : 'không' }}
                      · NS: {{ getPairingMatch(selectedNblInfo, ndbl)?.dobMatch ? 'khớp' : 'không' }}
                      · SĐT: {{ getPairingMatch(selectedNblInfo, ndbl)?.phoneMatch ? 'khớp' : 'không' }}
                    </span>
                  </div>
                </div>
                <div v-if="filteredNDBLList.length === 0" class="selection-empty">
                  Không tìm thấy người được bảo lãnh nào trong diện đang chọn.
                </div>
              </div>
            </div>
          </div>

          <!-- Alert thông tin ghép cặp hiện tại -->
          <div v-if="selectedNblInfo || selectedNdblInfo" class="pairing-preview">
            <span class="preview-title">🔄 Hồ sơ ghép cặp hiện tại:</span>
            <div class="preview-detail">
              <span>Người Bảo Lãnh: <strong>{{ selectedNblInfo ? selectedNblInfo.fullName : 'Chưa chọn' }}</strong></span>
              <span class="preview-separator">↔</span>
              <span>Người Được Bảo Lãnh: <strong>{{ selectedNdblInfo ? selectedNdblInfo.fullName : 'Chưa chọn' }}</strong></span>
            </div>
            <div v-if="currentPairingMatch" class="pairing-match-summary" :class="{ ok: currentPairingMatch.passed, bad: currentPairingMatch.enabled && !currentPairingMatch.passed }">
              {{ currentPairingMatch.label }}
              <span v-if="currentPairingMatch.enabled">
                · Tên: {{ currentPairingMatch.nameMatch ? 'khớp' : 'không khớp' }}
                · Ngày sinh: {{ currentPairingMatch.dobMatch ? 'khớp' : 'không khớp' }}
                · SĐT: {{ currentPairingMatch.phoneMatch ? 'khớp' : 'không khớp' }}
              </span>
            </div>
          </div>

          <!-- Nút load phiếu -->
          <div class="action-footer">
            <button
              @click="handleLoadCombined"
              :disabled="!selectedNblId || !selectedNdblId || loading || currentSelectionLocked || (currentPairingMatch?.enabled && !currentPairingMatch?.passed)"
              class="btn-load-combined"
            >
              <span v-if="loading">⏳ Đang xử lý...</span>
              <span v-else>📝 Bắt đầu kiểm tra phiếu tổng hợp</span>
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import * as i130aApi from '../api/i130a-api.js'
import { reopenReview } from '../api/index.js'

function displayFormLabel(label) {
  const text = String(label || '').trim()
  if (/^I-130A\s*[—-]\s*Final$/i.test(text)) return 'I-130 — Final'
  return label || '-'
}

const props = defineProps({
  mode: String,
  reviewerView: { type: String, default: 'pending' },
  customers: Array,
  pendingReviews: Array,
  completedReviews: Array,
  formTypes: Array,
  formTypeFilter: String,
  currentUser: { type: Object, default: null },
})

const emit = defineEmits(['select-customer', 'select-review', 'change-form-type', 'download-review'])

const downloadingId = ref(null)
const loading = ref(false)

const relationCategories = [
  { value: 'vo-chong', label: 'Bảo lãnh vợ chồng' },
  { value: 'con-gai', label: 'Bảo lãnh con cái' },
  { value: 'anh-chi-em', label: 'Bảo lãnh anh chị em' },
  { value: 'cha-me', label: 'Bảo lãnh cha mẹ' },
  { value: 'hon-phu', label: 'Bảo lãnh hôn phu hôn thê' }
]

const selectedRelation = ref('vo-chong')
const selectedRelationLabel = computed(() => relationCategories.find(item => item.value === selectedRelation.value)?.label || '')

watch(() => props.formTypeFilter, (newFilter) => {
  if (newFilter === 'i129f-final') {
    selectedRelation.value = 'hon-phu'
  } else if (newFilter === 'i130a-final') {
    selectedRelation.value = 'vo-chong'
  }
}, { immediate: true })

// Data lists
const nblList = ref([])
const ndblList = ref([])

// Selection
const selectedNblId = ref(null)
const selectedNdblId = ref(null)

// Search query
const nblSearch = ref('')
const ndblSearch = ref('')

watch(selectedRelation, () => {
  selectedNblId.value = null
  selectedNdblId.value = null
  nblSearch.value = ''
  ndblSearch.value = ''
})

async function loadPairingLists() {
  loading.value = true
  try {
    const [nblRes, ndblRes] = await Promise.all([
      i130aApi.getNBLList(),
      i130aApi.getNDBLList()
    ])
    nblList.value = nblRes || []
    ndblList.value = ndblRes || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (props.mode === 'filler') await loadPairingLists()
})

// Mở lại phiếu I-130 Final đã giao là quyền riêng của ittest, dùng để truy lỗi.
// Nhân viên không được tự mở lại phiếu đã giao cho tư vấn.
function canReopen(item = {}) {
  if (props.currentUser?.username !== 'ittest') return false
  const status = item.reviewStatus || item.review_status
  return (status === 'pending' || status === 'completed') && !!(item.reviewId || item.review_id)
}

async function handleReopen(item) {
  const reviewId = item.reviewId || item.review_id
  if (!reviewId) return
  const result = await reopenReview(reviewId, props.currentUser || {})
  window.alert(result.message || (result.success ? 'Đã mở lại phiếu.' : 'Không mở lại được phiếu.'))
  if (result.success) await loadPairingLists()
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}


function normalizeNameKey(value) {
  return normalizeText(value).replace(/\s+/g, '')
}

function normalizePhoneKey(value) {
  let digits = String(value || '').replace(/\D+/g, '')
  if (digits.startsWith('84') && digits.length >= 11) digits = '0' + digits.slice(2)
  return digits
}

function normalizeDateCandidates(value) {
  const raw = String(value || '').trim()
  const candidates = new Set()
  if (!raw) return candidates
  const parts = raw.split(/[^0-9]+/).filter(Boolean)
  if (parts.length === 3) {
    const [a, b, c] = parts
    if (a.length === 4) {
      candidates.add(`${a}${String(b).padStart(2, '0')}${String(c).padStart(2, '0')}`)
    } else if (c.length === 4) {
      const mm = String(a).padStart(2, '0')
      const dd = String(b).padStart(2, '0')
      candidates.add(`${c}${mm}${dd}`)
      candidates.add(`${c}${dd}${mm}`)
    }
  }
  const compact = raw.replace(/\D+/g, '')
  if (compact.length === 8) candidates.add(compact)
  return candidates
}

function datesMatch(a, b) {
  const aSet = normalizeDateCandidates(a)
  const bSet = normalizeDateCandidates(b)
  if (!aSet.size || !bSet.size) return false
  for (const value of aSet) if (bSet.has(value)) return true
  return false
}

function getExpectedBeneficiary(item = {}) {
  return item.expectedBeneficiary || {
    name: item.beneficiaryExpectedName || item.expectedBeneficiaryName || '',
    dob: item.beneficiaryExpectedDob || item.beneficiaryExpectedBirthDate || '',
    phone: item.beneficiaryExpectedPhone || item.expectedBeneficiaryPhone || ''
  }
}

function getBeneficiaryIdentity(item = {}) {
  return item.identity || {
    name: item.fullName || '',
    dob: item.birthDate || '',
    phone: item.contactPrimary || ''
  }
}

function getPairingMatch(nbl, ndbl) {
  if (!nbl || !ndbl) return null
  const expected = getExpectedBeneficiary(nbl)
  const actual = getBeneficiaryIdentity(ndbl)
  const enabled = !!(expected.name || expected.dob || expected.phone)
  if (!enabled) return { enabled: false, passed: true, score: 0, label: 'Chưa có dữ liệu đối chiếu' }

  const expectedName = normalizeNameKey(expected.name)
  const actualName = normalizeNameKey(actual.name)
  const nameMatch = !!expectedName && !!actualName && (expectedName === actualName || expectedName.includes(actualName) || actualName.includes(expectedName))
  const dobMatch = datesMatch(expected.dob, actual.dob)
  const expectedPhone = normalizePhoneKey(expected.phone)
  const actualPhone = normalizePhoneKey(actual.phone)
  const phoneMatch = !!expectedPhone && !!actualPhone && (expectedPhone === actualPhone || expectedPhone.endsWith(actualPhone) || actualPhone.endsWith(expectedPhone))
  const score = (nameMatch ? 10 : 0) + (dobMatch ? 10 : 0) + (phoneMatch ? 80 : 0)
  const passed = score >= 80
  return { enabled, passed, score, nameMatch, dobMatch, phoneMatch, expected, actual, label: passed ? `Khớp ${score}%` : `Không khớp ${score}%` }
}

function detectRelationCategory(item = {}) {
  const raw = [
    item.relationCategory,
    item.loaiHoSoBaoLanh,
    item.dienBaoLanh,
    item.relationship,
    item.relationshipToPetitioner,
    item.label
  ].join(' ')

  const compact = normalizeText(raw).replace(/\s+/g, '-')
  const text = normalizeText(raw)

  if (compact.includes('vo-chong') || text.includes('vo chong') || text.includes('spouse') || text.includes('cr1') || text.includes('ir1')) return 'vo-chong'
  if (compact.includes('con-gai') || compact.includes('con-cai') || text.includes('con cai') || text.includes('child') || text.includes('children')) return 'con-gai'
  if (compact.includes('anh-chi-em') || text.includes('anh chi em') || text.includes('sibling') || text.includes('brother') || text.includes('sister')) return 'anh-chi-em'
  if (compact.includes('cha-me') || text.includes('cha me') || text.includes('parent') || text.includes('father') || text.includes('mother')) return 'cha-me'
  if (compact.includes('hon-phu') || compact.includes('hon-the') || text.includes('hon phu') || text.includes('hon the') || text.includes('fiance')) return 'hon-phu'
  return ''
}

function getRelationLabel(item = {}) {
  const category = item.relationCategory || detectRelationCategory(item)
  return item.relationLabel || relationCategories.find(c => c.value === category)?.label || 'Chưa xác định diện'
}

function isReviewLocked(item = {}) {
  if (!item) return false
  const status = item.reviewStatus || item.review_status
  // 'reopened' = người xử lý đã chủ động mở lại phiếu để sửa, nên hồ sơ phải chọn lại được
  // để ghép và giao lại. Chỉ phiếu đang chờ/đang/đã kiểm tra mới thật sự khóa.
  if (status === 'reopened') return false
  return !!status
}

function getReviewStatusLabelLegacy(item = {}) {
  const status = item.reviewStatus || item.review_status
  const reviewer = item.reviewReviewerName || item.review_reviewer_name || item.reviewerName || ''
  const reviewerText = reviewer ? ` - ${reviewer}` : ''
  if (status === 'pending') return `Chá» check${reviewerText}`
  if (status === 'in_review') return `Äang check${reviewerText}`
  if (status === 'completed') return `ÄÃ£ xong${reviewerText}`
  return `ÄÃ£ giao${reviewerText}`
}

function getReviewStatusLabel(item = {}) {
  const status = item.reviewStatus || item.review_status
  const reviewer = item.reviewReviewerName || item.review_reviewer_name || item.reviewerName || ''
  const reviewerText = reviewer ? ` - ${reviewer}` : ''
  if (status === 'pending') return `Cho check${reviewerText}`
  if (status === 'in_review') return `Dang check${reviewerText}`
  if (status === 'completed') return `Da xong${reviewerText}`
  return `Da giao${reviewerText}`
}

function handleSelectNbl(nbl) {
  if (isReviewLocked(nbl)) return
  selectedNblId.value = nbl.id
}

function handleSelectNdbl(ndbl) {
  if (isReviewLocked(ndbl)) return
  selectedNdblId.value = ndbl.id
}

function filterByRelationAndSearch(list, search) {
  const q = normalizeText(search)
  return (list || [])
    .filter(item => (item.relationCategory || detectRelationCategory(item)) === selectedRelation.value)
    .filter(item => {
      if (!q) return true
      return String(item.id).includes(q) || normalizeText(item.label).includes(q)
    })
}

// Filtered Lists
const filteredNBLList = computed(() => filterByRelationAndSearch(nblList.value, nblSearch.value))
const filteredNDBLList = computed(() => {
  const list = filterByRelationAndSearch(ndblList.value, ndblSearch.value)
  const nbl = selectedNblInfo.value
  if (!nbl) return list
  return [...list].sort((a, b) => (getPairingMatch(nbl, b)?.score || 0) - (getPairingMatch(nbl, a)?.score || 0))
})

// Selected Infos
const selectedNblInfo = computed(() => {
  return nblList.value.find(item => item.id === selectedNblId.value) || null
})

const selectedNdblInfo = computed(() => {
  return ndblList.value.find(item => item.id === selectedNdblId.value) || null
})

const currentPairingMatch = computed(() => getPairingMatch(selectedNblInfo.value, selectedNdblInfo.value))
const currentSelectionLocked = computed(() => isReviewLocked(selectedNblInfo.value) || isReviewLocked(selectedNdblInfo.value))

watch(selectedNblId, () => {
  selectedNdblId.value = null
  const nbl = selectedNblInfo.value
  if (!nbl) return
  const candidates = filterByRelationAndSearch(ndblList.value, '')
    .map(item => ({ item, match: getPairingMatch(nbl, item) }))
    .filter(row => !isReviewLocked(row.item) && row.match && row.match.passed)
    .sort((a, b) => b.match.score - a.match.score)
  if (candidates[0]) selectedNdblId.value = candidates[0].item.id
})

// Review items to display
const displayItems = computed(() => {
  const allReviews = props.reviewerView === 'pending' ? props.pendingReviews || [] : props.completedReviews || []
  // Chỉ hiện những phiếu review có form_type là i130a-final
  return allReviews.filter(r => r.formType === 'i130a-final' || r.form_type === 'i130a-final')
})

async function handleLoadCombined() {
  if (!selectedNblId.value || !selectedNdblId.value || currentSelectionLocked.value) return
  loading.value = true
  try {
    const combinedData = await i130aApi.getCombinedI130A(selectedNblId.value, selectedNdblId.value || '')
    // Gắn thêm các Submission IDs cho submit payload sau này
    combinedData.nblSubmissionId = selectedNblId.value
    combinedData.ndblSubmissionId = selectedNdblId.value
    combinedData.loaiHoSoBaoLanh = combinedData.loaiHoSoBaoLanh || selectedRelation.value
    combinedData.relationCategory = combinedData.relationCategory || selectedRelation.value
    combinedData.relationLabel = combinedData.relationLabel || selectedRelationLabel.value
    emit('select-customer', combinedData)
  } catch (e) {
    alert(e.message || 'Lỗi khi tải phiếu tổng hợp')
  } finally {
    loading.value = false
  }
}

function handleDownload(item) {
  downloadingId.value = item.id
  emit('download-review', item, () => {
    downloadingId.value = null
  })
}
</script>

<style scoped>
.customer-list-container {
  max-width: 1400px;
  margin: 0 auto;
}

.cl-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 10px;
}
.cl-toolbar h2 {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}
.cl-toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.cl-filter {
  padding: 8px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 13px;
  color: #334155;
  background: #fff;
  outline: none;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}
.cl-filter:focus { border-color: #6366f1; }
.cl-count {
  font-size: 12px;
  color: #64748b;
  background: #f1f5f9;
  padding: 4px 12px;
  border-radius: 20px;
  font-weight: 600;
  white-space: nowrap;
}


.match-line {
  margin-top: 6px;
  font-size: 12px;
  color: #64748b;
  line-height: 1.4;
}
.match-line.ok {
  color: #047857;
  font-weight: 600;
}
.match-line.bad {
  color: #b91c1c;
  font-weight: 600;
}
.pairing-match-summary {
  margin-top: 10px;
  padding: 9px 12px;
  border-radius: 8px;
  background: #f8fafc;
  color: #475569;
  font-size: 13px;
  font-weight: 600;
}
.pairing-match-summary.ok {
  background: #ecfdf5;
  color: #047857;
  border: 1px solid #a7f3d0;
}
.pairing-match-summary.bad {
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}

/* Reviewer table styles matching I130ACustomerList */
.cl-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
  margin-bottom: 30px;
}
.cl-table th {
  background: #f8fafc;
  padding: 14px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
}
.cl-table td {
  padding: 14px 16px;
  font-size: 13px;
  color: #334155;
  border-bottom: 1px solid #f1f5f9;
}
.review-row {
  cursor: pointer;
  transition: all 0.2s ease;
}
.review-row:hover {
  background-color: #f8fafc;
}
.td-id {
  font-weight: 600;
  color: #6366f1;
}
.td-name {
  font-weight: 600;
  color: #0f172a;
}
.cl-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
}
.cl-badge.pending {
  background: #fef3c7;
  color: #d97706;
}
.cl-badge.completed {
  background: #d1fae5;
  color: #059669;
}
.cl-download-btn {
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.cl-download-btn:hover {
  background: #4f46e5;
}
.cl-download-btn:disabled {
  background: #94a3b8;
  cursor: not-allowed;
}

.cl-empty {
  text-align: center;
  padding: 60px 20px;
  color: #64748b;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
}
.cl-empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}


.case-type-panel {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 14px 16px;
  margin-bottom: 16px;
  box-shadow: 0 4px 10px -6px rgba(15,23,42,0.25);
}
.case-type-title {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 10px;
}
.case-type-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.case-type-tab {
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #334155;
  border-radius: 999px;
  padding: 8px 13px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all .2s;
}
.case-type-tab:hover {
  background: #eef2ff;
  border-color: #818cf8;
  color: #3730a3;
}
.case-type-tab.active {
  background: #3730a3;
  border-color: #3730a3;
  color: #fff;
}
.case-type-note {
  margin-top: 9px;
  font-size: 12px;
  color: #64748b;
}
.item-relation {
  display: inline-flex;
  width: fit-content;
  margin-top: 2px;
  padding: 2px 7px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
  font-size: 11px;
  font-weight: 700;
}

/* Pairing interface styles */
.pairing-card {
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05);
  border: 1px solid #f1f5f9;
  overflow: hidden;
  margin-top: 10px;
}
.card-body {
  padding: 24px;
}
.pairing-grid {
  display: flex;
  gap: 20px;
  align-items: stretch;
  margin-bottom: 24px;
}
.pairing-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  min-width: 0;
}
.pairing-label {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 12px;
}
.search-wrapper {
  margin-bottom: 12px;
}
.search-input {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 13px;
  outline: none;
  transition: all 0.2s;
  background: #fff;
}
.search-input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

.selection-box {
  flex: 1;
  height: 350px;
  overflow-y: auto;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
}
.selection-item {
  padding: 12px 14px;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.selection-item:last-child {
  border-bottom: none;
}
.selection-item:hover {
  background-color: #f1f5f9;
}
.selection-item.selected {
  background-color: #e0e7ff;
  border-left: 4px solid #6366f1;
  padding-left: 10px;
}
.selection-item.disabled {
  opacity: 0.58;
  cursor: not-allowed;
  background: #f8fafc;
}
.selection-item.disabled:hover {
  background: #f8fafc;
}
.item-id {
  font-size: 11px;
  font-weight: 700;
  color: #6366f1;
}
.item-text {
  font-size: 13px;
  font-weight: 500;
  color: #334155;
  line-height: 1.4;
}
.item-status {
  width: fit-content;
  margin-top: 2px;
  padding: 3px 8px;
  border-radius: 4px;
  background: #f1f5f9;
  color: #64748b;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.selection-empty {
  text-align: center;
  padding: 40px 10px;
  font-size: 13px;
  color: #94a3b8;
}

.pairing-connector {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 10px;
}
.connector-arrow {
  font-size: 24px;
  color: #6366f1;
  background: #e0e7ff;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
}

.pairing-preview {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
}
.preview-title {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: #166534;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}
.preview-detail {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 14px;
  color: #14532d;
}
.preview-separator {
  color: #86efac;
  font-weight: bold;
}

.action-footer {
  display: flex;
  justify-content: flex-end;
}
.btn-load-combined {
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.2);
}
.btn-load-combined:hover:not(:disabled) {
  background: #4f46e5;
  transform: translateY(-1px);
  box-shadow: 0 6px 8px -1px rgba(99, 102, 241, 0.3);
}
.btn-load-combined:disabled {
  background: #94a3b8;
  cursor: not-allowed;
  box-shadow: none;
}

.item-reopen-btn {
  margin-top: 6px;
  padding: 4px 9px;
  border: 1px solid #f59e0b;
  border-radius: 6px;
  background: #fffbeb;
  color: #b45309;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
}
.item-reopen-btn:hover { background: #fef3c7; }
</style>

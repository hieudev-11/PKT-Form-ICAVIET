<template>
  <div v-if="!currentUser" id="app-login">
    <Login @login-success="onLoginSuccess" />
  </div>
  <div v-else id="app-layout">
    <AppSidebar
      :currentRole="currentRole"
      :currentUser="currentUser"
      :reviewerView="reviewerView"
      :selectedCustomer="selectedCustomer"
      :activeReviewId="activeReviewId"
      :formTypes="formTypes"
      :formTypeFilter="selectedFormType"
      @logout="onLogout"
      @switch-role="onSwitchRole"
      @set-reviewer-view="onSetReviewerView"
      @back-to-list="onBackToList"
      @change-form-type="onChangeFormType"
      @open-check-log="onOpenCheckLog"
      @open-user-admin="onOpenUserAdmin"
    />

    <div id="app-content">
      <GlobalSearchBar @open-review="onOpenGlobalReview" @open-submission="onOpenGlobalSubmission" />

      <CheckLogPanel
        v-if="currentRole === 'log'"
        :currentUser="currentUser"
        :employees="allEmployees"
      />

      <UserAdminPanel
        v-else-if="currentRole === 'users'"
        :currentUser="currentUser"
      />

      <!-- Khi đã chọn chi tiết 1 hồ sơ -> hiện WordPaper -->
      <template v-else-if="selectedFormType && (selectedCustomer || activeReviewId)">
        <div v-if="reopenedNotice" class="reopen-notice">↺ {{ reopenedNotice }}</div>

        <div v-if="showManualSaveButton" class="manual-save-toolbar">
          <button
            type="button"
            class="manual-save-button"
            :disabled="manualSaveLoading"
            @click="manualSaveActiveDraft"
          >
            {{ manualSaveLoading ? 'Đang lưu...' : 'Save' }}
          </button>
          <span v-if="manualSaveStatus" :class="['manual-save-status', manualSaveStatusType]">
            {{ manualSaveStatus }}
          </span>
          <span class="manual-save-note">Auto save vẫn hoạt động song song</span>
        </div>

        <!-- key theo hồ sơ: đổi khách hàng thì dựng lại phiếu từ đầu, không kế thừa DOM (thứ tự
             khối lặp, số "(N)" đã bị sắp xếp lại...) của hồ sơ trước. -->
        <component
          :is="activeWordPaperComponent"
          :key="activeWordPaperKey"
          ref="wordPaperRef"
          :mode="mode"
          :formType="selectedFormType"
          :customerData="selectedCustomer"
          :currentUser="currentUser"
          :reviewers="reviewers"
          :selectedReviewer="selectedReviewer"
          :signatures="reviewSignatures"
          @change="onPaperChange"
          @submit-form="onWordPaperSubmit"
          @manual-save="manualSaveActiveDraft"
          @update:selectedReviewer="onSelectedReviewerChange"
        />

        <ReviewCommentLayer
          :reviewId="activeReviewId"
          :currentUser="currentUser"
          :enabled="showReviewComments"
        />

        <!-- 2 ô ký điện tử ở cuối phiếu, chỉ mở trong mục "Đã kiểm tra" -->
        <PaperSignatures
          v-if="showPaperSignatures"
          :modelValue="reviewSignatures"
          :currentUser="currentUser"
          :saving="signaturesSaving"
          @save="onSaveSignatures"
        />
      </template>
      <component
        :is="activeCustomerListComponent"
        v-else
        :mode="currentRole === 'reviewer' ? 'reviewer' : 'filler'"
        :currentUser="currentUser"
        :reviewerView="reviewerView"
        :customers="customers"
        :pendingReviews="myPendingReviews"
        :completedReviews="myCompletedReviews"
        :formTypes="formTypes"
        :formTypeFilter="selectedFormType"
        :searchQuery="searchQuery"
        @select-customer="onSelectCustomer"
        @reopen-customer="onReopenCustomer"
        @select-review="onSelectReview"
        @change-form-type="onChangeFormType"
        @download-review="onDownloadReview"
        @search="onSearchInput"
      />
    </div>
  </div>

  <!-- HIDDEN WORDPAPER FOR BACKGROUND PDF EXPORT -->
  <div v-if="downloadPdfData" style="position:absolute;left:-10000px;top:0;width:1500px;opacity:0;pointer-events:none;z-index:-1;">
    <component
      :is="downloadWordPaperComponent"
      ref="downloadWordPaperRef"
      mode="view"
      :formType="downloadPdfData.formType"
      :customerData="downloadPdfData.customerData"
      :currentUser="currentUser"
      :reviewers="reviewers"
      :signatures="downloadPdfData.signatures"
      :comments="downloadPdfData.comments"
    />
  </div>

  <!-- TOAST NOTIFICATIONS -->
  <div class="toast-container">
    <div v-for="toast in toasts" :key="toast.id" :class="['toast', toast.type]">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, nextTick } from 'vue'
import AppSidebar from './components/AppSidebar.vue'
import GlobalSearchBar from './components/GlobalSearchBar.vue'
import WordPaper from './components/WordPaper.vue'
import DS260WordPaper from './components/DS260WordPaper.vue'
import UserAdminPanel from './components/UserAdminPanel.vue'
import ReviewCommentLayer from './components/ReviewCommentLayer.vue'
import I130AWordPaper from './components/I130AWordPaper.vue'
import I129FWordPaper from './components/I129FWordPaper.vue'
import I90WordPaper from './components/I90WordPaper.vue'
import N600WordPaper from './components/N600WordPaper.vue'
import N400WordPaper from './components/N400WordPaper.vue'
import CustomerList from './components/CustomerList.vue'
import I130ACustomerList from './components/I130ACustomerList.vue'
import I130AFinalPage from './components/I130AFinalPage.vue'
import Login from './components/Login.vue'
import CheckLogPanel from './components/CheckLogPanel.vue'
import PaperSignatures from './components/PaperSignatures.vue'
import * as api from './api/index.js'
import * as i130aApi from './api/i130a-api.js'

// State
const currentUser = ref(null)
const currentRole = ref('filler') // 'filler' | 'reviewer'
const reviewerView = ref('pending') // 'pending' | 'completed'
const mode = ref('create')        // 'create' | 'review' | 'view'
const customers = ref([])
const allEmployees = ref([])
const formTypes = ref([])
const pendingReviews = ref([])
const completedReviews = ref([])
const searchQuery = ref('')
let searchDebounceTimer = null
const selectedFormType = ref('')
const customerData = ref(null)
const selectedCustomer = ref(null)
const activeReviewId = ref(null)
// Phiếu trong hàng đợi kiểm tra gắn với hồ sơ người xử lý đang mở (nếu đã từng submit).
const activeQueueReview = ref(null)
const reviewSignatures = ref(null)
const signaturesSaving = ref(false)
const selectedReviewer = ref('')
const manualSaveLoading = ref(false)
const manualSaveStatus = ref('')
const manualSaveStatusType = ref('success')
const wordPaperRef = ref(null)
const downloadWordPaperRef = ref(null)
const downloadPdfData = ref(null)
const changes = reactive({})

// Toast State
const toasts = ref([])
let toastIdCounter = 0
const AUTOSAVE_PREFIX = 'icaviet_ds160_checker_draft_v1'
const SERVER_DRAFT_DEBOUNCE_MS = 800
const draftSaveTimers = new Map()
const lastLoggedChangesByDraftKey = new Map()

function isI130AFormType(formType) {
  return ['i130a', 'i-130a', 'i-130-a', 'bao-lanh', 'i130a-nbl', 'i130a-ndbl', 'i130a-final'].includes(String(formType || '').toLowerCase())
}

function isDS260FormType(formType) {
  return ['ds260', 'ds-260'].includes(String(formType || '').toLowerCase())
}

function isI90FormType(formType) {
  return ['i90', 'i-90'].includes(String(formType || '').toLowerCase())
}

function isN600FormType(formType) {
  return ['n600', 'n-600'].includes(String(formType || '').toLowerCase())
}

function isN400FormType(formType) {
  return ['n400', 'n-400'].includes(String(formType || '').toLowerCase())
}

function checkIsK1Case(customerData) {
  if (!customerData) return false
  if (customerData.relationCategory === 'hon-phu') return true
  
  const raw = [
    customerData.relationCategory,
    customerData.loaiHoSoBaoLanh,
    customerData.dienBaoLanh,
    customerData.relationship,
    customerData.relationshipToPetitioner,
    customerData.label
  ].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase()
  
  if (raw.includes('hon phu') || raw.includes('hon the') || raw.includes('fiance') || raw.includes('k1') || raw.includes('k-1')) {
    return true
  }
  return false
}

function getDataApi(formType = selectedFormType.value) {
  return isI130AFormType(formType) ? i130aApi : api
}

const activeWordPaperComponent = computed(() => {
  const ft = selectedFormType.value
  if (isI130AFormType(ft)) {
    if (checkIsK1Case(selectedCustomer.value)) {
      return I129FWordPaper
    }
    return I130AWordPaper
  }
  if (isDS260FormType(ft)) return DS260WordPaper
  if (isI90FormType(ft)) return I90WordPaper
  if (isN400FormType(ft)) return N400WordPaper
  if (isN600FormType(ft)) return N600WordPaper
  return WordPaper
})
// Không đưa `mode` vào key: filler -> reviewer trên cùng một hồ sơ vẫn giữ nguyên instance như cũ.
// Chỉ đổi hồ sơ (hoặc đổi loại phiếu) mới dựng lại phiếu.
// Comment mở cho MỌI loại phiếu, nhưng chỉ trong mục "Đã kiểm tra" (mode view).
// Điều kiện activeReviewId để comment luôn gắn vào một phiếu đã hoàn tất cụ thể —
// bảng icaviet_review_comments khóa theo review_id.
// Lưu ý khi thêm loại phiếu mới: bản getCellPrintableValue() của component đó phải
// bóc '.pkt-ui-widget' ra khỏi nội dung ô, nếu không nút comment sẽ bị đếm thành
// một lỗi tư vấn và làm sai "Tổng sửa".
const showReviewComments = computed(() => {
  return mode.value === 'view' && !!activeReviewId.value
})

const activeWordPaperKey = computed(() => {
  const customerId = selectedCustomer.value?.id ?? selectedCustomer.value?.submission_id ?? ''
  return `${selectedFormType.value || ''}:${customerId}`
})
const downloadWordPaperComponent = computed(() => {
  const ft = downloadPdfData.value?.formType
  if (isI130AFormType(ft)) {
    if (checkIsK1Case(downloadPdfData.value?.customerData)) {
      return I129FWordPaper
    }
    return I130AWordPaper
  }
  if (isDS260FormType(ft)) return DS260WordPaper
  if (isI90FormType(ft)) return I90WordPaper
  if (isN400FormType(ft)) return N400WordPaper
  if (isN600FormType(ft)) return N600WordPaper
  return WordPaper
})
const activeCustomerListComponent = computed(() => {
  const ft = selectedFormType.value
  if (ft === 'i130a-final') return I130AFinalPage
  return isI130AFormType(ft) ? I130ACustomerList : CustomerList
})

const showManualSaveButton = computed(() => {
  return mode.value !== 'view' && !!selectedFormType.value && !!(selectedCustomer.value || activeReviewId.value)
})


function onOpenCheckLog() {
  resetManualSaveStatus()
  if (currentUser.value?.username !== 'ittest') {
    addToast('Chỉ tài khoản ittest được xem Check log.', 'error')
    return
  }
  selectedCustomer.value = null
  clearActiveReviewId()
  customerData.value = null
  currentRole.value = 'log'
  reviewerView.value = 'pending'
}

function onOpenUserAdmin() {
  resetManualSaveStatus()
  // Chặn ở client cho gọn UI; backend vẫn tự kiểm tra username của requester_id
  // nên không thể gọi thẳng API để tạo tài khoản.
  if (currentUser.value?.username !== 'ittest') {
    addToast('Chỉ tài khoản ittest được tạo tài khoản.', 'error')
    return
  }
  selectedCustomer.value = null
  clearActiveReviewId()
  customerData.value = null
  currentRole.value = 'users'
  reviewerView.value = 'pending'
}

function addToast(message, type = 'success') {
  const id = toastIdCounter++
  toasts.value.push({ id, message, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, 4000)
}

function hasSavedChanges(changeMap) {
  return changeMap && Object.keys(changeMap).length > 0
}

function getFillerDraftKey(customerId = selectedCustomer.value?.id, formType = selectedFormType.value) {
  if (!currentUser.value?.id || !customerId || !formType) return ''
  return `${AUTOSAVE_PREFIX}:fill:${currentUser.value.id}:${formType}:${customerId}`
}

function getReviewDraftKey(reviewId = activeReviewId.value) {
  if (!currentUser.value?.id || !reviewId) return ''
  return `${AUTOSAVE_PREFIX}:review:${currentUser.value.id}:${reviewId}`
}

function isI130AFinalFormType(formType) {
  return String(formType || '').toLowerCase() === 'i130a-final'
}

// Phiếu i130a-final được ghép từ 2 submission rời (NBL + NDBL) cộng với diện bảo lãnh do
// trang ghép chọn. "id" của phiếu luôn là id hồ sơ NBL, nên riêng id thì không dựng lại
// được hồ sơ: phải giữ kèm id NDBL + diện bảo lãnh thì mới mở lại đúng như lúc đang làm.
function getCasePairing(data) {
  if (!data) return { nblId: '', ndblId: '', relation: '' }
  return {
    nblId: normalizeId(data.nblSubmissionId ?? data.nbl_submission_id ?? data.petitionerSubmissionId ?? data.id),
    ndblId: normalizeId(data.ndblSubmissionId ?? data.ndbl_submission_id ?? data.beneficiarySubmissionId),
    relation: String(data.relationCategory ?? data.loaiHoSoBaoLanh ?? '').trim()
  }
}

// getCustomerDetail của i130a-final chỉ đọc bản ghi form_slug = 'bao-lanh' và dựng case data
// với beneficiary = null, tức mất sạch phần Người được bảo lãnh. Khi biết cặp NBL/NDBL thì
// phải ghép lại bằng chính endpoint mà trang ghép dùng.
async function loadFillerCaseDetail(customerId, formType, pairing = {}) {
  if (!isI130AFinalFormType(formType) || !pairing.ndblId) {
    return getDataApi(formType).getCustomerDetail(customerId, formType)
  }

  try {
    // allow_assigned: khoá 409 của /combine là để chặn mở mới một hồ sơ đã giao kiểm tra.
    // Ở đây chỉ là mở lại đúng hồ sơ mình đang làm dở nên không áp khoá đó.
    const combined = await i130aApi.getCombinedI130A(customerId, pairing.ndblId, { allowAssigned: true })
    combined.nblSubmissionId = customerId
    combined.ndblSubmissionId = pairing.ndblId
    if (pairing.relation) {
      combined.loaiHoSoBaoLanh = combined.loaiHoSoBaoLanh || pairing.relation
      combined.relationCategory = combined.relationCategory || pairing.relation
    }
    return combined
  } catch (err) {
    // Hồ sơ NDBL đã bị xoá/không truy cập được: vẫn mở phần NBL để không mất phiên làm việc,
    // nhưng báo rõ là phiếu đang thiếu nửa Người được bảo lãnh.
    console.error('Không ghép lại được hồ sơ i130a-final, dùng dữ liệu NBL:', err)
    addToast('⚠️ Không tải được hồ sơ Người được bảo lãnh đã ghép. Phiếu đang thiếu phần NDBL.', 'error')
    return getDataApi(formType).getCustomerDetail(customerId, formType)
  }
}

function setUrlReviewId(id, options = {}) {
  const url = new URL(window.location.href)
  if (id) {
    url.searchParams.set('id', id)
    // "mode"/"type" chỉ dùng cho luồng filler (điền đơn) - để khi tải lại cả trang (F5),
    // app biết cần khôi phục đúng khách hàng + đúng loại phiếu (formType), tránh rơi về
    // mặc định "ds160" khiến bản nháp đã lưu (khoá theo formType) bị "mồ côi", coi như mất.
    if (options.mode) url.searchParams.set('mode', options.mode)
    else url.searchParams.delete('mode')
    if (options.formType) url.searchParams.set('type', options.formType)
    else url.searchParams.delete('type')
    // Hồ sơ i130a-final là bản ghép NBL + NDBL, chỉ "id" (= id hồ sơ NBL) thì không dựng
    // lại được: thiếu ndbl thì toàn bộ phần Người được bảo lãnh trống, kéo theo cell-id của
    // các block động lệch và bản nháp đã lưu không khớp ô nào. Diện bảo lãnh cũng chỉ do
    // trang ghép gắn ở client nên phải mang theo, nếu không phiếu rơi về mẫu vợ chồng.
    if (options.ndblId) url.searchParams.set('ndbl', options.ndblId)
    else url.searchParams.delete('ndbl')
    if (options.relation) url.searchParams.set('relation', options.relation)
    else url.searchParams.delete('relation')
  } else {
    url.searchParams.delete('id')
    url.searchParams.delete('mode')
    url.searchParams.delete('type')
    url.searchParams.delete('ndbl')
    url.searchParams.delete('relation')
  }
  window.history.replaceState({}, document.title, url.pathname + url.search + url.hash)
}

function clearActiveReviewId() {
  activeReviewId.value = null
  activeQueueReview.value = null
  reviewSignatures.value = null
  setUrlReviewId(null)
}

// Chỉ ký ở phiếu đã kiểm tra (mode view) vì chữ ký gắn với 1 phiếu trong hàng đợi.
const showPaperSignatures = computed(() => mode.value === 'view' && !!activeReviewId.value)

async function loadReviewSignatures(reviewId) {
  reviewSignatures.value = reviewId ? await api.getReviewSignatures(reviewId) : null
}

async function onSaveSignatures(signatures) {
  if (!activeReviewId.value) return
  signaturesSaving.value = true
  try {
    const result = await api.saveReviewSignatures(activeReviewId.value, signatures)
    if (result.success) {
      reviewSignatures.value = signatures
      addToast('✅ Đã lưu chữ ký!', 'success')
    } else {
      addToast(result.message || '❌ Không lưu được chữ ký!', 'error')
    }
  } finally {
    signaturesSaving.value = false
  }
}

let deepLinkChecked = false
async function tryRestoreReviewFromUrl() {
  if (deepLinkChecked) return
  deepLinkChecked = true

  const urlParams = new URLSearchParams(window.location.search)

  // view=checklog: link "mở tab mới" từ màn Check log. Tab mới vào thẳng Check log,
  // CheckLogPanel tự đọc tiếp tham số log=/final= để mở đúng dòng.
  if (urlParams.get('view') === 'checklog') {
    if (currentUser.value?.username === 'ittest') {
      currentRole.value = 'log'
      return
    }
    addToast('Chỉ tài khoản ittest được xem Check log.', 'error')
    return
  }

  const targetId = urlParams.get('id')
  if (!targetId) return

  // mode=fill: deep-link vào luồng điền đơn (filler), không phải luồng reviewer.
  // selectedFormType đã được khôi phục sớm ở loadInitialData() trước khi tới đây.
  if (urlParams.get('mode') === 'fill') {
    currentRole.value = 'filler'
    await onSelectCustomer(targetId, {
      // Hồ sơ ghép i130a-final: mang theo cặp NDBL + diện bảo lãnh để dựng lại đúng phiếu.
      ndblId: urlParams.get('ndbl') || '',
      relation: urlParams.get('relation') || '',
      // Danh sách khách chỉ tải 100 hồ sơ mới nhất; deep-link tới hồ sơ cũ hơn vẫn phải mở được.
      allowMissingFromList: true
    })
    if (!selectedCustomer.value) setUrlReviewId(null) // id không hợp lệ -> dọn URL
    return
  }

  const pending = pendingReviews.value.find(r => String(r.id) === String(targetId))
  const review = pending || completedReviews.value.find(r => String(r.id) === String(targetId))

  if (!review) {
    setUrlReviewId(null) // id không hợp lệ / không có quyền xem -> dọn URL
    return
  }

  currentRole.value = 'reviewer'
  reviewerView.value = pending ? 'pending' : 'completed'
  await onSelectReview(review)
}

// Phiếu trong hàng đợi kiểm tra ứng với hồ sơ đang mở (nếu có). Submit xong là bản nháp
// bị xóa, nên nếu chỉ đọc bản nháp thì mở lại hồ sơ sẽ ra phiếu trắng và người xử lý
// phải điền lại từ đầu. Đây là chỗ lấy lại đúng những gì đã submit.
async function resolveFillerDraft(customerId, formType, draft) {
  activeQueueReview.value = null
  if (!customerId) return draft

  const queued = await api.getReviewBySubmission(customerId, formType)
  activeQueueReview.value = queued

  // Bản nháp đang làm dở luôn ưu tiên hơn bản đã submit.
  if (draftHasContent(draft)) return draft
  // Phiếu đã giao: chỉ ittest mới được thấy lại nội dung đã submit để truy lỗi.
  if (isQueueLockedForCurrentUser(queued)) return draft
  if (!queued || !hasSavedChanges(queued.fillerChanges)) return draft

  return normalizeDraftPayload({
    ...(draft || {}),
    changes: queued.fillerChanges,
    selectedReviewer: normalizeId(queued.reviewerId),
    // Phiếu ghép I-130 Final: mang theo cặp NBL/NDBL đã giao, nếu không mở lại sẽ
    // mất nửa Người được bảo lãnh và các ô động lệch hết so với lúc submit.
    nblSubmissionId: normalizeId(queued.nblSubmissionId) || normalizeId(draft?.nblSubmissionId),
    ndblSubmissionId: normalizeId(queued.ndblSubmissionId) || normalizeId(draft?.ndblSubmissionId)
  })
}

const reopenedNotice = computed(() => {
  const queued = activeQueueReview.value
  if (!queued || mode.value !== 'create') return ''
  if (queued.status === 'reopened') {
    return `Phiếu này đã được ittest mở lại để sửa (đã giao cho ${queued.reviewerName || 'tư vấn'}). Sửa xong bấm Submit để giao lại — phiếu cũ được ghi đè, không tạo phiếu trùng.`
  }
  return ''
})

// Hồ sơ đã nằm trong hàng đợi của tư vấn thì nhân viên không được mở ra sửa, kể cả
// khi vào bằng link cũ. Chỉ ittest mới mở được, để truy lỗi.
function isQueueLockedForCurrentUser(queued) {
  if (!queued) return false
  if (currentUser.value?.username === 'ittest') return false
  return queued.status === 'pending' || queued.status === 'in_review' || queued.status === 'completed'
}

// Đóng phiếu lại và báo lý do khi hồ sơ đã giao mà người đang mở không phải ittest.
// Trả về true nếu đã chặn, để nơi gọi dừng luôn việc dựng phiếu.
function rejectLockedCase() {
  const queued = activeQueueReview.value
  if (!isQueueLockedForCurrentUser(queued)) return false

  const who = queued.reviewerName || 'tư vấn'
  addToast(
    queued.status === 'completed'
      ? `Hồ sơ này đã kiểm tra xong. Chỉ ittest mới mở lại được.`
      : `Hồ sơ này đã giao cho ${who} kiểm tra. Chỉ ittest mới mở lại được — vui lòng báo ittest nếu cần sửa.`,
    'error'
  )
  selectedCustomer.value = null
  clearActiveReviewId()
  return true
}

async function onReopenCustomer(customer) {
  // Backend vẫn tự kiểm tra lại quyền; chặn ở đây chỉ để báo lỗi cho gọn.
  if (currentUser.value?.username !== 'ittest') {
    addToast('Chỉ tài khoản ittest được mở lại phiếu đã giao.', 'error')
    return
  }

  const queued = await api.getReviewBySubmission(customer?.id, selectedFormType.value || customer?.formType || 'ds160')
  if (!queued) {
    addToast('Không tìm thấy phiếu đã giao của hồ sơ này.', 'error')
    return
  }

  const result = await api.reopenReview(queued.id, currentUser.value || {})
  if (!result.success) {
    addToast(result.message || '❌ Không mở lại được phiếu.', 'error')
    return
  }

  addToast(result.message || '✅ Đã mở lại phiếu để sửa.', 'success')
  await onSelectCustomer(customer.id, { allowMissingFromList: true })
  // Danh sách hồ sơ phải đổi trạng thái ngay, nếu không bấm Back ra vẫn thấy "Chờ check".
  customers.value = await getDataApi(selectedFormType.value || 'ds160').getCustomers(searchQuery.value, selectedFormType.value || 'ds160')
}

function getActiveDraftKey() {
  if (mode.value === 'view') return ''
  if (mode.value === 'review') return getReviewDraftKey()
  return getFillerDraftKey()
}

function normalizeDraftPayload(draft = {}) {
  return {
    changes: draft?.changes || {},
    selectedReviewer: draft?.selectedReviewer || '',
    // Cặp NBL/NDBL + diện bảo lãnh của hồ sơ ghép i130a-final được lưu kèm bản nháp, để
    // link cũ (chưa có tham số ndbl trên URL) mở lại vẫn dựng được đúng hồ sơ ghép.
    nblSubmissionId: normalizeId(draft?.nblSubmissionId ?? draft?.nbl_submission_id),
    ndblSubmissionId: normalizeId(draft?.ndblSubmissionId ?? draft?.ndbl_submission_id),
    relationCategory: String(draft?.relationCategory ?? '').trim(),
    updatedAt: draft?.updatedAt || new Date().toISOString()
  }
}

function draftHasContent(draft) {
  return hasSavedChanges(draft?.changes) || !!draft?.selectedReviewer
}

function normalizeAuditValue(value) {
  if (value === '__CLEARED__') return ''
  const div = document.createElement('div')
  div.innerHTML = String(value ?? '')
  div.querySelectorAll('.diff-old, script, style').forEach(node => node.remove())
  return (div.textContent || div.innerText || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isInternalChangeField(field) {
  return [
    '__ds160_hidden_placeholders__',
    '__ds260_hidden_placeholders__'
  ].includes(String(field || ''))
}

function cloneChangesMap(source = {}) {
  return JSON.parse(JSON.stringify(source || {}))
}

function setLoggedBaseline(key, changeMap = {}) {
  if (!key) return
  lastLoggedChangesByDraftKey.set(key, cloneChangesMap(changeMap))
}

function getFieldSnapshot() {
  try {
    return wordPaperRef.value?.getAuditSnapshot?.() || {}
  } catch {
    return {}
  }
}

// Phân loại thao tác để log trả lời thẳng câu "nhân viên đã làm gì với ô này".
// - delete: ô đang có dữ liệu -> bị xóa trắng
// - add: ô đang trống -> được điền thêm
// - restore: ô từng bị xóa/sửa -> gõ lại đúng bằng data gốc
// - edit: sửa từ giá trị này sang giá trị khác
function resolveChangeType(baseValue = '', oldValue = '', newValue = '') {
  if (!newValue && oldValue) return 'delete'
  if (!oldValue && newValue) return 'add'
  if (newValue && newValue === baseValue && oldValue !== baseValue) return 'restore'
  return 'edit'
}

function buildChangedFields(previousChanges = {}, nextChanges = {}, snapshot = {}, options = {}) {
  const forceAll = !!options.forceAll
  const fields = new Set([
    ...Object.keys(previousChanges || {}),
    ...Object.keys(nextChanges || {})
  ])
  const values = {}
  const changedFields = []

  fields.forEach(field => {
    if (isInternalChangeField(field)) return

    const fieldSnapshot = snapshot[field] || {}
    const hadPrevious = Object.prototype.hasOwnProperty.call(previousChanges || {}, field)
    const hasNext = Object.prototype.hasOwnProperty.call(nextChanges || {}, field)
    const baseValue = normalizeAuditValue(fieldSnapshot.base_value ?? '')
    const oldRaw = hadPrevious ? previousChanges[field] : baseValue
    const newRaw = hasNext ? nextChanges[field] : baseValue
    const oldValue = normalizeAuditValue(oldRaw)
    const newValue = normalizeAuditValue(newRaw)

    if (!forceAll && oldValue === newValue) return
    if (forceAll && !hasNext) return
    if (forceAll && oldValue === newValue && newValue === baseValue) return

    changedFields.push(field)
    values[field] = {
      field,
      label: fieldSnapshot.label || field,
      // Mục / số hạng mục / cột trên phiếu: để màn Check log nói được
      // "ô nào, thuộc mục nào, cột Xử lý hay Tư vấn" mà không phải mở phiếu ra dò.
      section: fieldSnapshot.section || '',
      item: fieldSnapshot.item || '',
      column: fieldSnapshot.column || '',
      change_type: resolveChangeType(baseValue, oldValue, newValue),
      old_value: oldValue,
      new_value: newValue,
      base_value: baseValue
    }
  })

  return {
    fields: changedFields,
    values
  }
}

function getAuditContext() {
  const name = selectedCustomer.value?.fullName
    || selectedCustomer.value?.customerName
    || selectedCustomer.value?.beneficiaryFullName
    || selectedCustomer.value?.beneficiaryName
    || selectedCustomer.value?.i130aDisplayName
    || selectedCustomer.value?.name
    || ''

  const formType = selectedFormType.value || ''
  const formLabel = formType === 'ds160' || formType === 'ds-160'
    ? 'Phiếu kiểm tra DS-160'
    : (String(formType).includes('i130a') ? 'Phiếu kiểm tra I-130A' : `Phiếu kiểm tra ${String(formType || '').toUpperCase()}`)

  return {
    actor_id: currentUser.value?.id || null,
    actor_name: currentUser.value?.name || '',
    actor_username: currentUser.value?.username || '',
    form_type: formType,
    form_label: formLabel,
    submission_id: selectedCustomer.value?.id || null,
    customer_name: name,
    review_id: activeReviewId.value || null
  }
}

async function writeAuditLog(action, changedFields, extra = {}) {
  if (!changedFields?.fields?.length) return false
  return api.createAuditLog({
    ...getAuditContext(),
    ...extra,
    action,
    changed_count: changedFields.fields.length,
    changed_fields: changedFields
  })
}

async function auditDraftSave(key, nextChanges, options = {}) {
  if (!key) return false

  const snapshot = getFieldSnapshot()

  // Manual Save tạo 1 record audit duy nhất bằng cách so sánh với mốc audit gần nhất.
  // Không chỉ so với data gốc, vì cần bắt cả trường hợp:
  // - người dùng thêm dữ liệu rồi Save
  // - sau đó xóa dữ liệu vừa thêm rồi Save
  // - xóa dữ liệu gốc đang có sẵn rồi Save
  const previousLoggedChanges = cloneChangesMap(lastLoggedChangesByDraftKey.get(key) || {})
  const changedFields = buildChangedFields(previousLoggedChanges, nextChanges || {}, snapshot)

  if (!changedFields.fields.length) {
    setLoggedBaseline(key, nextChanges || {})
    return false
  }

  await writeAuditLog(mode.value === 'review' ? 'review_draft_save' : 'fill_draft_save', changedFields, {
    save_type: options.saveType || 'manual'
  })
  setLoggedBaseline(key, nextChanges || {})
  return true
}

function getDraftTimestamp(draft) {
  const time = Date.parse(draft?.updatedAt || draft?.updated_at || '')
  return Number.isFinite(time) ? time : 0
}

function readLocalDraft(key) {
  // Không còn restore bản nháp từ trình duyệt để tránh dính cache cũ.
  return null
}

function persistLocalDraft(key, draft) {
  // Không còn lưu bản nháp vào trình duyệt. Bản nháp chỉ lưu trên database.
}

function getDraftServerMeta(key) {
  const isReviewDraft = String(key || '').includes(':review:')
  return {
    draftType: isReviewDraft ? 'review' : 'fill',
    formType: selectedFormType.value || '',
    customerId: selectedCustomer.value?.id || null,
    reviewId: isReviewDraft ? activeReviewId.value : null
  }
}

async function readDraft(key) {
  if (!key) return null
  const serverDraft = await api.getDraft(key, currentUser.value?.id)
  return serverDraft ? normalizeDraftPayload(serverDraft) : null
}

function scheduleServerDraftSave(key, draft) {
  if (!key || !currentUser.value?.id) return
  if (draftSaveTimers.has(key)) clearTimeout(draftSaveTimers.get(key))

  const payload = normalizeDraftPayload(draft)
  draftSaveTimers.set(key, setTimeout(async () => {
    draftSaveTimers.delete(key)
    if (!draftHasContent(payload)) {
      await api.deleteDraft(key, currentUser.value?.id)
      return
    }

    const saved = await api.saveDraft({
      draftKey: key,
      userId: currentUser.value?.id,
      ...getDraftServerMeta(key),
      draftData: payload
    })

    if (saved) {
      // Auto save chỉ cập nhật draft server. Không ghi audit log và
      // không cập nhật mốc audit. Nếu cập nhật mốc ở đây thì khi người dùng
      // xóa giá trị rồi bấm Save thủ công, hệ thống sẽ tưởng như không có gì đổi.
    }
  }, SERVER_DRAFT_DEBOUNCE_MS))
}

function writeDraft(key, draft) {
  if (!key) return
  const payload = normalizeDraftPayload({
    ...draft,
    updatedAt: new Date().toISOString()
  })

  if (!draftHasContent(payload)) {
    scheduleServerDraftSave(key, payload)
    return
  }

  scheduleServerDraftSave(key, payload)
}

function clearDraft(key) {
  if (!key) return
  if (draftSaveTimers.has(key)) {
    clearTimeout(draftSaveTimers.get(key))
    draftSaveTimers.delete(key)
  }
  api.deleteDraft(key, currentUser.value?.id)
}

function setChanges(nextChanges = {}) {
  Object.keys(changes).forEach(k => delete changes[k])
  Object.assign(changes, nextChanges)
}

function resetManualSaveStatus() {
  manualSaveLoading.value = false
  manualSaveStatus.value = ''
  manualSaveStatusType.value = 'success'
}

function applyDraftToCustomer(customer, draft, draftType) {
  if (!customer || !draft || !hasSavedChanges(draft.changes)) return customer
  if (draftType === 'review') {
    return {
      ...customer,
      _reviewChanges: {
        ...(customer._reviewChanges || {}),
        ...draft.changes
      }
    }
  }

  return {
    ...customer,
    _fillerChanges: {
      ...(customer._fillerChanges || {}),
      ...draft.changes
    }
  }
}

function getActiveDraftPayload() {
  // Chỉ i130a-final mới cần cặp NBL/NDBL; các loại phiếu khác mở lại chỉ bằng id là đủ.
  const pairing = isI130AFinalFormType(selectedFormType.value)
    ? getCasePairing(selectedCustomer.value)
    : { nblId: '', ndblId: '', relation: '' }
  return normalizeDraftPayload({
    changes: { ...changes },
    selectedReviewer: mode.value === 'create' ? selectedReviewer.value : '',
    nblSubmissionId: pairing.nblId,
    ndblSubmissionId: pairing.ndblId,
    relationCategory: pairing.relation,
    updatedAt: new Date().toISOString()
  })
}

function saveActiveDraft() {
  const key = getActiveDraftKey()
  if (!key) return
  writeDraft(key, getActiveDraftPayload())
}

async function manualSaveActiveDraft() {
  const key = getActiveDraftKey()
  if (!key) {
    addToast('Không tìm thấy bản nháp đang mở để lưu.', 'error')
    return
  }

  const payload = getActiveDraftPayload()

  if (draftSaveTimers.has(key)) {
    clearTimeout(draftSaveTimers.get(key))
    draftSaveTimers.delete(key)
  }

  manualSaveLoading.value = true
  manualSaveStatus.value = 'Đang lưu nháp...'
  manualSaveStatusType.value = 'info'

  try {
    if (!draftHasContent(payload)) {
      const deleted = await api.deleteDraft(key, currentUser.value?.id)
      manualSaveStatus.value = deleted ? 'Không có thay đổi để lưu' : 'Không có thay đổi mới'
      manualSaveStatusType.value = 'success'
      addToast('Không có thay đổi để lưu.', 'info')
      return
    }

    const saved = await api.saveDraft({
      draftKey: key,
      userId: currentUser.value?.id,
      ...getDraftServerMeta(key),
      draftData: payload
    })
    if (saved) {
      const hasAuditLog = await auditDraftSave(key, payload.changes || {}, { saveType: 'manual' })
      const savedAt = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      manualSaveStatus.value = hasAuditLog
        ? `Đã lưu lúc ${savedAt}`
        : `Đã lưu nháp lúc ${savedAt} - không có thay đổi mới để ghi log`
      manualSaveStatusType.value = 'success'
      addToast(hasAuditLog ? '✅ Đã lưu nháp và ghi 1 dòng log!' : '✅ Đã lưu nháp, không có thay đổi mới cần ghi log.', 'success')
    } else {
      manualSaveStatus.value = 'Lưu nháp thất bại, vui lòng kiểm tra kết nối server'
      manualSaveStatusType.value = 'error'
      addToast('⚠️ Không lưu được bản nháp lên server. Vui lòng kiểm tra kết nối rồi lưu lại.', 'error')
    }
  } catch (err) {
    console.error('Manual save draft failed:', err)
    manualSaveStatus.value = 'Lưu nháp thất bại'
    manualSaveStatusType.value = 'error'
    addToast('❌ Lưu nháp thất bại!', 'error')
  } finally {
    manualSaveLoading.value = false
  }
}

function onSelectedReviewerChange(val) {
  selectedReviewer.value = val
  saveActiveDraft()
}

function normalizeId(value) {
  return String(value ?? '').trim()
}

function getPersonName(person) {
  return String(
    person?.name ??
    person?.display_name ??
    person?.displayName ??
    person?.full_name ??
    person?.fullName ??
    person?.username ??
    person?.user_login ??
    person?.email ??
    ''
  ).trim()
}

function getPersonId(person) {
  return normalizeId(
    person?.id ??
    person?.user_id ??
    person?.userId ??
    person?.reviewer_id ??
    person?.reviewerId ??
    person?.employee_b_id ??
    person?.employeeBId ??
    person?.ID
  )
}

function findEmployeeById(id) {
  const targetId = normalizeId(id)
  if (!targetId) return null
  return allEmployees.value.find(e => getPersonId(e) === targetId) || null
}

function getReviewReviewerId(review = {}) {
  return normalizeId(
    review.reviewerId ??
    review.reviewer_id ??
    review.employee_b_id ??
    review.employeeBId ??
    review.checkerId ??
    review.checker_id
  )
}

function getReviewReviewerName(review = {}) {
  const directName = String(
    review.reviewerName ??
    review.reviewer_name ??
    review.reviewer_full_name ??
    review.reviewerFullName ??
    review.checkerName ??
    review.checker_name ??
    review.employee_b_name ??
    review.employeeBName ??
    ''
  ).trim()

  if (directName) return directName

  return getPersonName(findEmployeeById(getReviewReviewerId(review)))
}

function getReviewFillerName(review = {}) {
  return String(
    review.fillerName ??
    review.filler_name ??
    review.filler_full_name ??
    review.fillerFullName ??
    review.employee_a_name ??
    review.employeeAName ??
    ''
  ).trim()
}

const reviewers = computed(() => {
  // Chỉ hiện nhân viên ICAVIET khác chính mình (phương án 3)
  return allEmployees.value.filter(e =>
    e.phong_ban === 'ICAVIET' && normalizeId(e.id) !== normalizeId(currentUser.value?.id)
  )
})

const myPendingReviews = computed(() => {
  if (searchQuery.value.trim()) return pendingReviews.value
  return pendingReviews.value.filter(r => normalizeId(r.reviewerId || r.reviewer_id) === normalizeId(currentUser.value?.id))
})

const myCompletedReviews = computed(() => completedReviews.value)


function purgeBrowserDraftCache() {
  // Xóa các bản nháp cũ đã từng lưu trên trình duyệt.
  // Chỉ giữ lại localStorage đăng nhập icaviet_user.
  try {
    Object.keys(localStorage).forEach((key) => {
      const lowerKey = String(key || '').toLowerCase()
      if (lowerKey.includes('draft') || lowerKey.includes('pkt_draft') || lowerKey.includes('review_draft')) {
        localStorage.removeItem(key)
      }
    })
  } catch (err) {
    console.warn('Cannot clear browser draft cache:', err)
  }
}

onMounted(async () => {
  // 1. Kiểm tra đăng nhập tự động qua iFrame URL (SSO token từ ICAwiki)
  const urlParams = new URLSearchParams(window.location.search)
  const ssoToken = urlParams.get('sso_token')

  if (ssoToken) {
    try {
      const res = await api.ssoTokenLogin(ssoToken)
      if (res.success) {
        onLoginSuccess(res.user)

        // Xóa token khỏi thanh địa chỉ sau khi đăng nhập để tránh copy/chia sẻ nhầm.
        urlParams.delete('sso_token')
        const cleanQuery = urlParams.toString()
        const cleanUrl = `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ''}${window.location.hash}`
        window.history.replaceState({}, document.title, cleanUrl)
        return // Đã đăng nhập tự động thành công
      }
    } catch (e) {
      console.error('SSO token failed:', e)
    }
  }

  // 2. Fallback check localStorage
  const savedUser = localStorage.getItem('icaviet_user')
  if (savedUser) {
    onLoginSuccess(JSON.parse(savedUser))
  }

  // 3. Polling kiểm tra dữ liệu mới mỗi 10 giây
  setInterval(pollData, 10000)
})

async function pollData() {
  if (!currentUser.value) return
  if (searchQuery.value.trim()) return
  try {
    // Lưu lại số lượng trước khi fetch
    const oldPendingLength = pendingReviews.value.length
    const oldCustomersLength = customers.value.length

    const newPending = await api.getPendingReviews(currentUser.value.id)
    const newCompleted = await api.getAllCompletedReviews()
    const newCustomers = await getDataApi(selectedFormType.value || 'ds160').getCustomers('', selectedFormType.value || 'ds160')

    // Báo có phiếu review mới
    if (newPending.length > oldPendingLength) {
      addToast('🔔 Bạn có phiếu kiểm tra mới cần duyệt!', 'info')
    }
    // Báo có hồ sơ điền đơn mới (tùy chọn, ở đây check role filler)
    if (currentRole.value === 'filler' && newCustomers.length > oldCustomersLength) {
      addToast('📝 Có hồ sơ khách hàng mới vừa được nộp!', 'info')
    }

    pendingReviews.value = newPending
    completedReviews.value = newCompleted
    customers.value = newCustomers
  } catch (e) {
    // Bỏ qua lỗi mạng khi polling
  }
}

async function loadInitialData() {
  // Khôi phục loại phiếu (formType) từ URL TRƯỚC khi tải danh sách khách hàng, để không tải
  // nhầm danh sách theo mặc định "ds160" rồi không tìm thấy khách hàng cần mở lại (mode=fill).
  const urlFormType = new URLSearchParams(window.location.search).get('type')
  if (urlFormType) selectedFormType.value = urlFormType

  customers.value = await getDataApi(selectedFormType.value || 'ds160').getCustomers('', selectedFormType.value || 'ds160')
  allEmployees.value = await api.getEmployees()
  formTypes.value = await api.getFormTypes()
  pendingReviews.value = await api.getPendingReviews(currentUser.value?.id)
  completedReviews.value = await api.getAllCompletedReviews() // Tất cả phiếu đã xong
  await tryRestoreReviewFromUrl()
}

function onLoginSuccess(user) {
  currentUser.value = user
  currentRole.value = user.role || 'filler'
  mode.value = currentRole.value === 'reviewer' ? 'review' : 'create'
  localStorage.setItem('icaviet_user', JSON.stringify(user))
  loadInitialData()
}

function onSwitchRole(newRole) {
  resetManualSaveStatus()
  currentRole.value = newRole
  mode.value = newRole === 'reviewer' ? 'review' : 'create'
  // Reset trạng thái khi chuyển chế độ
  selectedCustomer.value = null
  clearActiveReviewId()
  selectedFormType.value = ''
  searchQuery.value = ''
  Object.keys(changes).forEach(k => delete changes[k])

  if (newRole === 'reviewer') {
    reviewerView.value = 'pending'
    loadPendingReviews()
  }
}

function onSetReviewerView(view) {
  resetManualSaveStatus()
  reviewerView.value = view
  selectedCustomer.value = null
  clearActiveReviewId()
  Object.keys(changes).forEach(k => delete changes[k])
}

async function loadPendingReviews() {
  pendingReviews.value = await api.getPendingReviews(currentUser.value?.id)
}

function onSearchInput(value) {
  searchQuery.value = value
  clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(runSearch, 300)
}

async function runSearch() {
  if (currentRole.value === 'filler') {
    customers.value = await getDataApi(selectedFormType.value || 'ds160')
      .getCustomers(searchQuery.value, selectedFormType.value || 'ds160')
    return
  }
  const q = searchQuery.value.trim()
  if (q) {
    const results = await api.searchReviews(q)
    pendingReviews.value = results.filter(r => r.status === 'pending')
    completedReviews.value = results.filter(r => r.status === 'completed')
  } else {
    pendingReviews.value = await api.getPendingReviews(currentUser.value?.id)
    completedReviews.value = await api.getAllCompletedReviews()
  }
}

function onLogout() {
  resetManualSaveStatus()
  draftSaveTimers.forEach(timer => clearTimeout(timer))
  draftSaveTimers.clear()
  currentUser.value = null
  localStorage.removeItem('icaviet_user')
  selectedCustomer.value = null
  clearActiveReviewId()
  selectedFormType.value = ''
  Object.keys(changes).forEach(k => delete changes[k])
}

function onBackToList() {
  resetManualSaveStatus()
  selectedCustomer.value = null
  clearActiveReviewId()
  Object.keys(changes).forEach(k => delete changes[k])
}

async function onChangeFormType(type) {
  selectedFormType.value = type
  // Chỉ reset khi đang ở danh sách, không reset khi đang xem chi tiết
  if (!selectedCustomer.value) {
    Object.keys(changes).forEach(k => delete changes[k])
    searchQuery.value = ''
    customers.value = await getDataApi(selectedFormType.value || 'ds160').getCustomers('', selectedFormType.value || 'ds160')
  }
}

async function onSelectCustomer(customerId, options = {}) {
  resetManualSaveStatus()
  setUrlReviewId(null)
  setChanges({})
  selectedReviewer.value = ''

  if (typeof customerId === 'object' && customerId !== null) {
    const fullData = customerId
    selectedFormType.value = selectedFormType.value || 'ds160'
    const draftKey = getFillerDraftKey(fullData.id, selectedFormType.value)
    const draft = await resolveFillerDraft(fullData.id, selectedFormType.value, await readDraft(draftKey))
    if (rejectLockedCase()) return
    setLoggedBaseline(draftKey, draft?.changes || {})
    if (draft) {
      setChanges(draft.changes || {})
      selectedReviewer.value = draft.selectedReviewer || ''
    }
    selectedCustomer.value = applyDraftToCustomer(fullData, draft, 'fill')
    activeReviewId.value = null
    mode.value = 'create'
    if (fullData.id) {
      const pairing = getCasePairing(selectedCustomer.value)
      setUrlReviewId(fullData.id, {
        mode: 'fill',
        formType: selectedFormType.value,
        ndblId: pairing.ndblId,
        relation: pairing.relation
      })
      // Hồ sơ ghép đã có bản nháp thì ghi bổ sung cặp NBL/NDBL vào đó ngay, để lần mở lại
      // sau không phụ thuộc vào tham số trên URL nữa.
      if (isI130AFinalFormType(selectedFormType.value) && pairing.ndblId && hasSavedChanges(changes)) {
        saveActiveDraft()
      }
    }
    return
  }

  const numericId = parseInt(customerId)
  let basicCustomer = customers.value.find(c => c.id === numericId) || null
  // Danh sách khách chỉ tải 100 hồ sơ mới nhất nên hồ sơ cũ không có trong đó. Với deep-link
  // thì vẫn phải mở được: dùng bản tóm tắt rỗng, dữ liệu đầy đủ lấy từ API chi tiết bên dưới.
  const usingStubCustomer = !basicCustomer && options.allowMissingFromList && Number.isFinite(numericId)
  if (usingStubCustomer) basicCustomer = { id: numericId }
  if (!basicCustomer) {
    selectedCustomer.value = null
    activeReviewId.value = null
    return
  }
  // Giữ loại phiếu người dùng đang chọn; nếu chưa chọn thì mặc định DS-160
  selectedFormType.value = selectedFormType.value || 'ds160'
  const draftKey = getFillerDraftKey(basicCustomer.id, selectedFormType.value)
  const draft = await resolveFillerDraft(basicCustomer.id, selectedFormType.value, await readDraft(draftKey))
  if (rejectLockedCase()) return
  setLoggedBaseline(draftKey, draft?.changes || {})
  if (draft) {
    setChanges(draft.changes || {})
    selectedReviewer.value = draft.selectedReviewer || ''
  }

  // Cặp NBL/NDBL lấy từ URL trước, không có thì lấy từ bản nháp đã lưu (link cũ).
  const pairing = {
    ndblId: normalizeId(options.ndblId) || normalizeId(draft?.ndblSubmissionId),
    relation: String(options.relation || draft?.relationCategory || '').trim()
  }

  // GÁN NGAY data tóm tắt để WordPaper hiện ra lập tức
  selectedCustomer.value = applyDraftToCustomer(basicCustomer, draft, 'fill')

  if (currentRole.value === 'reviewer') {
    activeReviewId.value = basicCustomer.id
    mode.value = 'review'
    setUrlReviewId(basicCustomer.id)
  } else {
    mode.value = 'create'
    setUrlReviewId(basicCustomer.id, {
      mode: 'fill',
      formType: selectedFormType.value,
      ndblId: pairing.ndblId,
      relation: pairing.relation
    })
  }

  // Sau đó gọi API lấy TOÀN BỘ data chi tiết (nâng cấp)
  try {
    const fullData = await loadFillerCaseDetail(basicCustomer.id, selectedFormType.value, pairing)
    selectedCustomer.value = applyDraftToCustomer(fullData, draft, 'fill')
  } catch (err) {
    console.error('Lỗi lấy chi tiết, dùng data tóm tắt:', err)
    if (usingStubCustomer) {
      // Không có cả bản tóm tắt lẫn data chi tiết thì không dựng được phiếu -> về danh sách.
      selectedCustomer.value = null
      activeReviewId.value = null
      setUrlReviewId(null)
      addToast('Không mở lại được hồ sơ từ đường dẫn. Vui lòng chọn lại trong danh sách.', 'error')
    }
    // Ngược lại: giữ nguyên basicCustomer đã gán ở trên
  }
}

async function onWordPaperSubmit(payload) {
  if (payload.complete) {
    await onCompleteReview()
  } else {
    await onSubmitForm(payload)
  }
}

async function onSubmitForm(payload) {
  const reviewerId = normalizeId(payload.reviewerId || payload.reviewer_id || selectedReviewer.value)

  if (!reviewerId) {
    addToast('Vui lòng chọn Người Kiểm tra trước khi Submit!', 'error')
    return
  }

  const reviewer = reviewers.value.find(e => getPersonId(e) === reviewerId) || findEmployeeById(reviewerId)
  const reviewerName = String(
    payload.reviewerName ||
    payload.reviewer_name ||
    getPersonName(reviewer) ||
    'Người kiểm tra'
  ).trim()

  const draftKey = getFillerDraftKey(selectedCustomer.value?.id, selectedFormType.value)

  const result = await getDataApi(selectedFormType.value).submitRecord({
    formType: selectedFormType.value,
    customerId: selectedCustomer.value?.id,
    customerData: selectedCustomer.value,
    fillerId: currentUser.value.id,
    fillerName: currentUser.value.name,
    reviewerId,
    reviewer_id: reviewerId,
    reviewerName,
    reviewer_name: reviewerName,
    fillerChanges: { ...changes }, // ← Lưu changes của Filler vào DB
    nblSubmissionId: selectedCustomer.value?.petitionerSubmissionId || selectedCustomer.value?.nblSubmissionId,
    ndblSubmissionId: selectedCustomer.value?.beneficiarySubmissionId || selectedCustomer.value?.ndblSubmissionId
  })
  if (result.success) {
    const submitChangedFields = buildChangedFields({}, { ...changes }, getFieldSnapshot(), { forceAll: true })
    await writeAuditLog('fill_submit', submitChangedFields, { review_id: result.id || null })
    addToast(result.message || '✅ Đã giao phiếu thành công!', 'success')
    loadInitialData()
    selectedCustomer.value = null
    activeQueueReview.value = null
    selectedReviewer.value = ''
    clearDraft(draftKey)
    setChanges({})
  } else {
    console.error('Submit form failed:', result)
    const failureMessage = result.message || '❌ Giao phiếu thất bại!'
    addToast(failureMessage, 'error')

    const normalizedMessage = String(failureMessage)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/gi, 'd')
      .toLowerCase()

    if (
      selectedFormType.value === 'i130a-final' &&
      (
        normalizedMessage.includes('da duoc ghep') ||
        normalizedMessage.includes('da duoc giao') ||
        normalizedMessage.includes('dang cho kiem tra')
      )
    ) {
      selectedCustomer.value = null
      clearActiveReviewId()
      selectedReviewer.value = ''
      setChanges({})
      await loadInitialData()
    }
  }
}

async function onSelectReview(review) {
  resetManualSaveStatus()
  activeReviewId.value = review.id
  setUrlReviewId(review.id)
  selectedFormType.value = review.formType || review.form_type || 'ds-160'
  // Nếu đang xem completed → mode view (read-only), không cho sửa
  mode.value = reviewerView.value === 'completed' ? 'view' : 'review'

  const reviewerId = getReviewReviewerId(review)
  const reviewerName = getReviewReviewerName(review)
  const fillerName = getReviewFillerName(review)
  const customerId = review.customerId || review.customer_id || review.submission_id

  reviewSignatures.value = null
  if (mode.value === 'view') loadReviewSignatures(review.id)

  const reviewDraftKey = getReviewDraftKey(review.id)
  const draft = mode.value === 'review' ? await readDraft(reviewDraftKey) : null
  setLoggedBaseline(reviewDraftKey, draft?.changes || (review.reviewChanges || review.review_changes || {}))
  const reviewChanges = draft && hasSavedChanges(draft.changes)
    ? draft.changes
    : (review.reviewChanges || review.review_changes || {})
  setChanges(reviewChanges || {})

  const attachReviewInfo = (customer) => ({
    ...customer,
    fillerName,
    filler_name: fillerName,
    reviewerId,
    reviewer_id: reviewerId,
    reviewerName,
    reviewer_name: reviewerName,
    _fillerChanges: review.fillerChanges || review.filler_changes || {},
    _reviewChanges: reviewChanges
  })

  // Load full data của customer
  try {
    let fullData
    if (selectedFormType.value === 'i130a-final') {
      const nblId = review.nblSubmissionId || review.nbl_submission_id
      const ndblId = review.ndblSubmissionId || review.ndbl_submission_id
      fullData = await i130aApi.getCombinedI130A(nblId, ndblId, { allowAssigned: true })
    } else {
      fullData = await getDataApi(selectedFormType.value).getCustomerDetail(customerId, selectedFormType.value)
    }
    selectedCustomer.value = attachReviewInfo(fullData)
  } catch (err) {
    const fallback = customers.value.find(c => String(c.id) === String(customerId)) || null
    selectedCustomer.value = fallback ? attachReviewInfo(fallback) : null
  }
}

async function onOpenGlobalReview(review) {
  resetManualSaveStatus()
  currentRole.value = 'reviewer'
  reviewerView.value = review.status === 'completed' ? 'completed' : 'pending'
  selectedCustomer.value = null
  clearActiveReviewId()
  Object.keys(changes).forEach(k => delete changes[k])
  await onSelectReview(review)
}

async function onOpenGlobalSubmission(item) {
  resetManualSaveStatus()
  currentRole.value = 'filler'
  mode.value = 'create'
  selectedCustomer.value = null
  clearActiveReviewId()
  selectedReviewer.value = ''
  Object.keys(changes).forEach(k => delete changes[k])
  selectedFormType.value = item.formType

  try {
    const fullData = await getDataApi(item.formType).getCustomerDetail(item.id, item.formType)
    await onSelectCustomer(fullData)
  } catch (err) {
    console.error('Lỗi khi mở hồ sơ từ tìm kiếm tổng hợp:', err)
    addToast('❌ Không thể mở hồ sơ này.', 'error')
  }
}

async function onCompleteReview() {
  const draftKey = getReviewDraftKey(activeReviewId.value)
  const result = await getDataApi(selectedFormType.value).completeReview(activeReviewId.value, { ...changes }, selectedFormType.value)
  if (result.success) {
    const reviewChangedFields = buildChangedFields({}, { ...changes }, getFieldSnapshot(), { forceAll: true })
    await writeAuditLog('review_complete', reviewChangedFields)
    addToast(result.message || '✅ Đã hoàn tất kiểm tra!', 'success')
    const exported = await wordPaperRef.value?.exportPdf?.()
    if (!exported) addToast('KhÃ´ng xuáº¥t Ä‘Æ°á»£c PDF tá»± Ä‘á»™ng, vui lÃ²ng thá»­ láº¡i.', 'error')
    pendingReviews.value = pendingReviews.value.filter(r => r.id !== activeReviewId.value)
    try {
      pendingReviews.value = await api.getPendingReviews(currentUser.value?.id)
      completedReviews.value = await api.getAllCompletedReviews()
    } catch {
      // Polling will refresh the lists if this immediate refresh fails.
    }
    clearActiveReviewId()
    selectedCustomer.value = null
    selectedFormType.value = ''
    clearDraft(draftKey)
    setChanges({})
  } else {
    addToast('❌ Có lỗi khi hoàn tất kiểm tra!', 'error')
  }
}

function onPaperChange(newChanges) {
  setChanges(newChanges)
  saveActiveDraft()
}

async function onDownloadReview(review, doneCallback) {
  const reviewerId = getReviewReviewerId(review)
  const reviewerName = getReviewReviewerName(review)
  const fillerName = getReviewFillerName(review)
  const customerId = review.customerId || review.customer_id || review.submission_id
  const formType = review.formType || review.form_type || 'ds-160'
  const reviewChanges = review.reviewChanges || review.review_changes || {}

  const attachReviewInfo = (customer) => ({
    ...customer,
    fillerName,
    filler_name: fillerName,
    reviewerId,
    reviewer_id: reviewerId,
    reviewerName,
    reviewer_name: reviewerName,
    _fillerChanges: review.fillerChanges || review.filler_changes || {},
    _reviewChanges: reviewChanges
  })

  try {
    // Load full customer data
    let customerData
    try {
      let fullData
      if (formType === 'i130a-final') {
        const nblId = review.nblSubmissionId || review.nbl_submission_id
        const ndblId = review.ndblSubmissionId || review.ndbl_submission_id
        fullData = await i130aApi.getCombinedI130A(nblId, ndblId, { allowAssigned: true })
      } else {
        fullData = await getDataApi(formType).getCustomerDetail(customerId, formType)
      }
      customerData = attachReviewInfo(fullData)
    } catch {
      const fallback = customers.value.find(c => String(c.id) === String(customerId)) || null
      customerData = fallback ? attachReviewInfo(fallback) : null
    }

    if (!customerData) {
      addToast('❌ Không tìm thấy dữ liệu khách hàng!', 'error')
      doneCallback?.()
      return
    }

    // Set data for hidden WordPaper
    const signatures = await api.getReviewSignatures(review.id)
    // Lỗi tải comment không được chặn việc xuất PDF.
    const comments = await api.getReviewComments(review.id, currentUser.value?.id)
      .then(result => result.comments)
      .catch(err => {
        console.warn('[PDF] Không tải được comment:', err.message)
        return []
      })
    downloadPdfData.value = { formType, customerData, signatures, comments }

    // Wait for WordPaper to render
    await nextTick()
    // Give more time for the form HTML to load and data to populate
    await new Promise(resolve => setTimeout(resolve, 2000))
    await nextTick()

    // Trigger PDF export
    const exported = await downloadWordPaperRef.value?.exportPdf?.()
    if (exported) {
      addToast('✅ Đã tải PDF thành công!', 'success')
    } else {
      addToast('❌ Không xuất được PDF. Vui lòng thử mở hồ sơ và tải trực tiếp.', 'error')
    }
  } catch (err) {
    console.error('Download PDF failed:', err)
    addToast('❌ Lỗi khi tải PDF!', 'error')
  } finally {
    downloadPdfData.value = null
    doneCallback?.()
  }
}
</script>

<style scoped>
.reopen-notice {
  margin: 0 0 10px;
  padding: 10px 14px;
  border: 1px solid #fcd34d;
  border-left: 4px solid #f59e0b;
  border-radius: 8px;
  background: #fffbeb;
  color: #92400e;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.5;
}

.manual-save-toolbar {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  margin: 0 0 12px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
}

.manual-save-button {
  border: 0;
  border-radius: 8px;
  padding: 8px 18px;
  background: #133985;
  color: #ffffff;
  font-weight: 700;
  cursor: pointer;
}

.manual-save-button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.manual-save-status {
  font-size: 13px;
  font-weight: 700;
}

.manual-save-status.success {
  color: #047857;
}

.manual-save-status.error {
  color: #b91c1c;
}

.manual-save-status.info {
  color: #1d4ed8;
}

.manual-save-note {
  margin-left: auto;
  color: #6b7280;
  font-size: 12px;
}
</style>

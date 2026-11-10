<template>
  <!-- Popover được teleport ra body: KHÔNG nằm trong .word-paper-container nên
       bản clone lúc xuất PDF không bao giờ chứa nó. -->
  <Teleport to="body">
    <div
      v-if="activeCell"
      ref="popoverRef"
      class="pkt-comment-popover"
      :style="{ top: popoverPos.top + 'px', left: popoverPos.left + 'px' }"
    >
      <div class="pc-header">
        <div class="pc-title">
          <span class="pc-badge">💬 Comment</span>
          <span class="pc-row-label">{{ activeCell.rowLabel || 'Dòng không có nhãn' }}</span>
        </div>
        <button type="button" class="pc-close" @click="closePopover">✕</button>
      </div>

      <div class="pc-list">
        <p v-if="!activeComments.length" class="pc-empty">Chưa có comment nào cho dòng này.</p>
        <div v-for="comment in activeComments" :key="comment.id" class="pc-item">
          <div class="pc-item-head">
            <b>{{ comment.userName || 'Không rõ' }}</b>
            <span class="pc-time">{{ formatTime(comment.createdAt) }}</span>
            <button
              v-if="comment.canDelete"
              type="button"
              class="pc-delete"
              title="Xóa comment"
              @click="removeComment(comment)"
            >Xóa</button>
          </div>
          <div class="pc-content">{{ comment.content }}</div>
        </div>
      </div>

      <div v-if="canComment" class="pc-form">
        <textarea
          ref="inputRef"
          v-model="draft"
          rows="3"
          placeholder="Nhập comment cho dòng này..."
          :disabled="sending"
          @keydown.ctrl.enter.prevent="submitComment"
        ></textarea>
        <div class="pc-form-actions">
          <span class="pc-hint">Ctrl + Enter để gửi</span>
          <button type="button" class="pc-send" :disabled="sending || !draft.trim()" @click="submitComment">
            {{ sending ? 'Đang gửi...' : 'Gửi' }}
          </button>
        </div>
      </div>
      <p v-else class="pc-readonly">Tài khoản của bạn chỉ xem được comment, không được viết.</p>

      <p v-if="errorMessage" class="pc-error">{{ errorMessage }}</p>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as api from '../api/index.js'

const props = defineProps({
  reviewId: [Number, String],
  currentUser: Object,
  // Chỉ bật ở phiếu "Đã kiểm tra" (mode view). Cha quyết định, đây không tự đoán.
  enabled: { type: Boolean, default: false }
})

// Ô TƯ VẤN nằm trong phiếu đang hiển thị. Phiếu ẩn dùng để xuất PDF nằm NGOÀI
// #app-content nên selector này không bao giờ chạm tới nó.
const PAPER_SELECTOR = '#app-content .word-paper-container'
// Chỉ theo dõi vùng nội dung, không theo dõi cả document.body: popover được teleport
// ra body, toast cũng nằm ngoài — nghe cả body là tự làm mình bận vô ích.
const OBSERVE_SELECTOR = '#app-content'
const BUTTON_CLASS = 'pkt-comment-btn'
// Class chung để getCellPrintableValue() bỏ qua widget do app chèn vào ô,
// nếu không nút này sẽ bị tính là "nội dung tư vấn" và làm sai "Tổng sửa".
const WIDGET_CLASS = 'pkt-ui-widget'

const comments = ref([])
const canComment = ref(false)
const activeCell = ref(null)
const draft = ref('')
const sending = ref(false)
const errorMessage = ref('')
const popoverRef = ref(null)
const inputRef = ref(null)
const popoverPos = reactive({ top: 0, left: 0 })

let observer = null
let retryTimer = null
let retryCount = 0
let rafPending = false

const commentsByCell = computed(() => {
  const map = new Map()
  comments.value.forEach(comment => {
    if (!map.has(comment.cellId)) map.set(comment.cellId, [])
    map.get(comment.cellId).push(comment)
  })
  return map
})

const activeComments = computed(() => {
  if (!activeCell.value) return []
  return commentsByCell.value.get(activeCell.value.cellId) || []
})

function formatTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('vi-VN', {
    hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
  })
}

function getRowLabel(cell) {
  const row = cell?.closest?.('tr')
  if (!row) return ''
  return Array.from(row.children)
    .filter(td => !td.classList.contains('data-cell') && !td.classList.contains('note-cell'))
    .map(td => td.textContent || '')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200)
}

function getPaperEl() {
  return document.querySelector(PAPER_SELECTOR)
}

// Mọi thao tác DOM của lớp này phải chạy khi observer đang TẮT, nếu không
// chính nó sẽ nghe thấy thay đổi của mình và gọi lại vô tận.
function getObserveTarget() {
  return document.querySelector(OBSERVE_SELECTOR) || document.body
}

function withObserverPaused(fn) {
  if (observer) observer.disconnect()
  try {
    return fn()
  } finally {
    if (observer && props.enabled) {
      observer.observe(getObserveTarget(), { childList: true, subtree: true })
    }
  }
}

function decorateCells() {
  const paper = getPaperEl()
  if (!paper) return false

  const noteCells = paper.querySelectorAll('.note-cell[data-cell-id]')
  if (!noteCells.length) return false

  noteCells.forEach(cell => {
    let button = cell.querySelector(`.${BUTTON_CLASS}`)
    if (!button) {
      button = document.createElement('button')
      button.type = 'button'
      button.className = `${BUTTON_CLASS} ${WIDGET_CLASS}`
      button.dataset.pktCommentFor = cell.dataset.cellId
      button.addEventListener('mousedown', event => {
        // mousedown + preventDefault: tránh ô contenteditable ăn mất focus/blur
        // rồi kích hoạt luồng ghi changes của phiếu.
        event.preventDefault()
        event.stopPropagation()
        openPopover(cell)
      })
      cell.style.position = cell.style.position || 'relative'
      cell.appendChild(button)
    }
    refreshButton(button, cell.dataset.cellId)
  })

  return true
}

function refreshButton(button, cellId) {
  const count = (commentsByCell.value.get(cellId) || []).length
  const label = count ? `💬 ${count}` : '💬'
  const title = count ? `${count} comment` : 'Thêm comment cho dòng này'

  // Gán textContent luôn thay mới text node -> sinh mutation childList kể cả khi
  // nội dung y hệt. Observer đang nghe childList nên ghi vô điều kiện = vòng lặp
  // vô tận, treo luôn trang. Chỉ ghi khi giá trị thật sự khác.
  if (button.textContent !== label) button.textContent = label
  if (button.title !== title) button.title = title
  button.classList.toggle('has-comment', count > 0)
}

function refreshAllButtons() {
  const paper = getPaperEl()
  if (!paper) return
  withObserverPaused(() => {
    paper.querySelectorAll(`.${BUTTON_CLASS}`).forEach(button => {
      refreshButton(button, button.dataset.pktCommentFor)
    })
  })
}

function removeAllButtons() {
  withObserverPaused(() => {
    document.querySelectorAll(`.${BUTTON_CLASS}`).forEach(button => button.remove())
  })
}

function positionPopover(cell) {
  const rect = cell.getBoundingClientRect()
  const width = 340
  const left = Math.min(
    Math.max(8, rect.right - width),
    Math.max(8, window.innerWidth - width - 8)
  )
  popoverPos.top = rect.bottom + window.scrollY + 6
  popoverPos.left = left + window.scrollX
}

function openPopover(cell) {
  errorMessage.value = ''
  draft.value = ''
  activeCell.value = {
    cellId: cell.dataset.cellId,
    rowLabel: getRowLabel(cell)
  }
  positionPopover(cell)
  nextTick(() => inputRef.value?.focus())
}

function closePopover() {
  activeCell.value = null
  draft.value = ''
  errorMessage.value = ''
}

async function loadComments() {
  if (!props.enabled || !props.reviewId) {
    comments.value = []
    canComment.value = false
    return
  }

  try {
    const result = await api.getReviewComments(props.reviewId, props.currentUser?.id)
    comments.value = result.comments
    canComment.value = result.canComment
  } catch (err) {
    console.warn('[Comment] Không tải được comment:', err.message)
    comments.value = []
    canComment.value = false
  }
  refreshAllButtons()
}

async function submitComment() {
  const content = draft.value.trim()
  if (!content || sending.value || !activeCell.value) return

  sending.value = true
  errorMessage.value = ''
  try {
    const created = await api.addReviewComment(props.reviewId, {
      userId: props.currentUser?.id,
      cellId: activeCell.value.cellId,
      rowLabel: activeCell.value.rowLabel,
      content
    })
    comments.value = [...comments.value, created]
    draft.value = ''
    refreshAllButtons()
  } catch (err) {
    errorMessage.value = err.message || 'Gửi comment thất bại'
  } finally {
    sending.value = false
  }
}

async function removeComment(comment) {
  try {
    await api.deleteReviewComment(comment.id, props.currentUser?.id)
    comments.value = comments.value.filter(item => item.id !== comment.id)
    refreshAllButtons()
  } catch (err) {
    errorMessage.value = err.message || 'Xóa comment thất bại'
  }
}

function handleOutsideClick(event) {
  if (!activeCell.value) return
  if (popoverRef.value?.contains(event.target)) return
  if (event.target.closest?.(`.${BUTTON_CLASS}`)) return
  closePopover()
}

function handleEscape(event) {
  if (event.key === 'Escape') closePopover()
}

// Phiếu được dựng lại nhiều lần (hydrate, sort khối, thêm dòng...) nên phải
// theo dõi DOM để gắn lại nút, thay vì chỉ gắn một lần lúc mounted.
function syncButtons() {
  return withObserverPaused(() => {
    const decorated = decorateCells()
    if (decorated) {
      const paper = getPaperEl()
      paper?.querySelectorAll(`.${BUTTON_CLASS}`).forEach(button => {
        refreshButton(button, button.dataset.pktCommentFor)
      })
    }
    return decorated
  })
}

function startObserving() {
  stopObserving()
  if (!props.enabled) return

  observer = new MutationObserver(() => {
    // Gộp cả burst mutation của một lần render phiếu vào 1 lần chạy.
    if (rafPending) return
    rafPending = true
    requestAnimationFrame(() => {
      rafPending = false
      if (props.enabled) syncButtons()
    })
  })
  observer.observe(getObserveTarget(), { childList: true, subtree: true })

  // Phiếu tải HTML bất đồng bộ nên lần đầu có thể chưa có ô nào; thử lại có giới hạn
  // thay vì để interval chạy mãi.
  retryCount = 0
  if (!syncButtons()) {
    retryTimer = setInterval(() => {
      retryCount += 1
      if (syncButtons() || retryCount > 50) {
        clearInterval(retryTimer)
        retryTimer = null
      }
    }, 400)
  }
}

function stopObserving() {
  if (observer) {
    observer.disconnect()
    observer = null
  }
  if (retryTimer) {
    clearInterval(retryTimer)
    retryTimer = null
  }
  rafPending = false
  retryCount = 0
}

watch(() => [props.enabled, props.reviewId], async () => {
  closePopover()
  stopObserving()
  removeAllButtons()
  if (!props.enabled) {
    comments.value = []
    canComment.value = false
    return
  }
  await loadComments()
  startObserving()
}, { immediate: true })

onMounted(() => {
  document.addEventListener('mousedown', handleOutsideClick)
  document.addEventListener('keydown', handleEscape)
  window.addEventListener('resize', closePopover)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleOutsideClick)
  document.removeEventListener('keydown', handleEscape)
  window.removeEventListener('resize', closePopover)
  stopObserving()
  removeAllButtons()
})
</script>

<style>
/* Không dùng scoped: nút được chèn thẳng vào DOM của phiếu (v-html) nên
   không mang data-attribute của scoped style. */
.pkt-comment-btn {
  position: absolute;
  top: 1px;
  right: 1px;
  z-index: 3;
  padding: 0 5px;
  height: 17px;
  line-height: 15px;
  border: 1px solid #cbd5f5;
  border-radius: 4px;
  background: #f8fafc;
  color: #64748b;
  font-size: 10px;
  font-weight: 700;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  cursor: pointer;
  opacity: .35;
  transition: opacity .15s, background .15s;
}
.pkt-comment-btn:hover {
  opacity: 1;
  background: #eef2ff;
  border-color: #6366f1;
  color: #4338ca;
}
.pkt-comment-btn.has-comment {
  opacity: 1;
  background: #fef3c7;
  border-color: #f59e0b;
  color: #b45309;
}
.pkt-comment-popover {
  position: absolute;
  z-index: 9999;
  width: 340px;
  max-height: 420px;
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid #dbe3f4;
  border-radius: 10px;
  box-shadow: 0 12px 32px rgba(15, 23, 42, .18);
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  font-size: 13px;
  color: #0f172a;
}
.pkt-comment-popover .pc-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid #eef2f7;
}
.pkt-comment-popover .pc-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  background: #eef3ff;
  color: #133985;
  font-size: 11px;
  font-weight: 700;
}
.pkt-comment-popover .pc-row-label {
  display: block;
  margin-top: 5px;
  color: #64748b;
  font-size: 11px;
  line-height: 1.35;
}
.pkt-comment-popover .pc-close {
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 14px;
  cursor: pointer;
  line-height: 1;
  padding: 2px 4px;
}
.pkt-comment-popover .pc-close:hover { color: #ef4444; }
.pkt-comment-popover .pc-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px;
  max-height: 200px;
}
.pkt-comment-popover .pc-empty {
  margin: 0;
  color: #94a3b8;
  font-size: 12px;
  font-style: italic;
}
.pkt-comment-popover .pc-item + .pc-item {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #e5e7eb;
}
.pkt-comment-popover .pc-item-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #475569;
}
.pkt-comment-popover .pc-time { color: #94a3b8; }
.pkt-comment-popover .pc-delete {
  margin-left: auto;
  border: none;
  background: transparent;
  color: #ef4444;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
}
.pkt-comment-popover .pc-content {
  margin-top: 3px;
  white-space: pre-wrap;
  line-height: 1.45;
}
.pkt-comment-popover .pc-form {
  padding: 10px 12px;
  border-top: 1px solid #eef2f7;
}
.pkt-comment-popover textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 7px 9px;
  border: 1px solid #cbd5f5;
  border-radius: 7px;
  font: inherit;
  font-size: 12px;
  resize: vertical;
}
.pkt-comment-popover textarea:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, .15);
}
.pkt-comment-popover .pc-form-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 7px;
}
.pkt-comment-popover .pc-hint { color: #94a3b8; font-size: 11px; }
.pkt-comment-popover .pc-send {
  padding: 6px 14px;
  border: none;
  border-radius: 7px;
  background: #4f46e5;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.pkt-comment-popover .pc-send:disabled { opacity: .5; cursor: not-allowed; }
.pkt-comment-popover .pc-readonly {
  margin: 0;
  padding: 10px 12px;
  border-top: 1px solid #eef2f7;
  color: #94a3b8;
  font-size: 12px;
  font-style: italic;
}
.pkt-comment-popover .pc-error {
  margin: 0;
  padding: 0 12px 10px;
  color: #dc2626;
  font-size: 12px;
  font-weight: 700;
}
</style>

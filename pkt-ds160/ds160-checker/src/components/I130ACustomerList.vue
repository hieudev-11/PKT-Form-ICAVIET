<template>
  <div class="customer-list-container">
    <!-- Header + Filter -->
    <div class="cl-toolbar">
      <h2 v-if="mode === 'filler'">📝 Danh Sách Hồ Sơ I-130A</h2>
      <h2 v-else-if="reviewerView === 'pending'">🔍 Danh Sách Kiểm Tra Đang Chờ</h2>
      <h2 v-else>✅ Danh Sách Đã Kiểm Tra</h2>

      <div class="cl-toolbar-right">
        <select v-if="mode === 'filler'" class="cl-filter" :value="formTypeFilter || ''" @change="$emit('change-form-type', $event.target.value)">
          <option value="">Tất cả loại phiếu</option>
          <option v-for="ft in formTypes" :key="ft.value" :value="ft.value">{{ ft.label }}</option>
        </select>
        <input
          type="text"
          class="cl-search"
          placeholder="🔎 Tìm theo MSHS / Số ID / Email / Tên..."
          :value="searchQuery"
          @input="$emit('search', $event.target.value)"
        />
        <span class="cl-count">{{ displayItems.length }} hồ sơ</span>
      </div>
    </div>

    <!-- FILLER: Bảng danh sách -->
    <template v-if="mode === 'filler'">
      <table class="cl-table">
        <thead>
          <tr>
            <th style="width:60px">ID</th>
            <th>Họ và Tên</th>
            <th style="width:140px">Hộ chiếu</th>
            <th style="width:120px">Ngày sinh</th>
            <th style="width:200px">Email</th>
            <th style="width:110px">Ngày nộp</th>
            <th style="width:120px">Trạng thái</th>
            <th style="width:150px"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="c in displayItems"
            :key="c.id"
            :class="{ disabled: isLockedCustomer(c) }"
            @click="handleClickCustomer(c)"
          >
            <td class="td-id">{{ c.id }}</td>
            <td class="td-name">{{ c.fullName || 'N/A' }}</td>
            <td>{{ c.passportNumberVN || '-' }}</td>
            <td>{{ c.birthDate || '-' }}</td>
            <td class="td-email">{{ c.email || '-' }}</td>
            <td>{{ formatDate(c.submittedAt) }}</td>
            <td>
              <span v-if="c.reviewStatus === 'completed'" class="cl-badge completed">Đã xong</span>
              <span v-else-if="c.reviewStatus === 'pending'" class="cl-badge submitted">Chờ check</span>
              <span v-else class="cl-badge available">Chờ xử lý</span>
            </td>
            <td class="td-reopen">
              <button
                v-if="canReopen(c)"
                class="cl-reopen-btn"
                title="Chỉ ittest: mở lại phiếu đã giao để truy lỗi, giữ nguyên những gì đã điền"
                @click.stop="emit('reopen-customer', c)"
              >↺ Mở lại để sửa</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="displayItems.length === 0" class="cl-empty">
        <div class="cl-empty-icon">📂</div>
        <div>Không có hồ sơ I-130A nào.</div>
      </div>
    </template>

    <!-- REVIEWER: Bảng phiếu kiểm tra -->
    <template v-else>
      <table class="cl-table">
        <thead>
          <tr>
            <th style="width:60px">ID</th>
            <th>Khách hàng</th>
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
          >
            <td class="td-id">{{ item.customerId }}</td>
            <td class="td-name">{{ item.customerName }}</td>
            <td>{{ item.formLabel }}</td>
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
        <div>Không có phiếu nào được giao cho bạn.</div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  mode: String,
  reviewerView: { type: String, default: 'pending' },
  customers: Array,
  pendingReviews: Array,
  completedReviews: Array,
  formTypes: Array,
  formTypeFilter: String,
  searchQuery: { type: String, default: '' },
  currentUser: { type: Object, default: null },
})

const emit = defineEmits(['select-customer', 'reopen-customer', 'select-review', 'change-form-type', 'download-review', 'search'])

const reviewerTab = ref('pending')
const downloadingId = ref(null)

const displayItems = computed(() => {
  if (props.mode === 'filler') return props.customers || []
  return props.reviewerView === 'pending' ? props.pendingReviews || [] : props.completedReviews || []
})

// Hồ sơ đã giao kiểm tra thì nhân viên không mở thẳng được nữa.
function isLockedCustomer(c) {
  return c.reviewStatus === 'completed' || c.reviewStatus === 'pending'
}

// Mở lại phiếu đã giao là quyền riêng của ittest, dùng để truy lỗi. Nhân viên không
// được tự mở lại: phiếu đã giao là mốc đối chiếu trách nhiệm.
function canReopen(c) {
  if (props.currentUser?.username !== 'ittest') return false
  return c.reviewStatus === 'pending' || c.reviewStatus === 'completed'
}

function handleClickCustomer(c) {
  if (isLockedCustomer(c)) return
  emit('select-customer', c.id)
}

function handleDownload(item) {
  downloadingId.value = item.id
  emit('download-review', item, () => {
    downloadingId.value = null
  })
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('vi-VN')
  } catch { return dateStr }
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
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 10px;
}
.cl-toolbar h2 {
  font-size: 18px;
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
  padding: 7px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 13px;
  color: #334155;
  background: #fff;
  outline: none;
  cursor: pointer;
}
.cl-filter:focus { border-color: #6366f1; }
.cl-search {
  padding: 7px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 13px;
  color: #334155;
  background: #fff;
  outline: none;
  min-width: 220px;
}
.cl-search:focus { border-color: #6366f1; }
.cl-count {
  font-size: 12px;
  color: #64748b;
  background: #f1f5f9;
  padding: 4px 10px;
  border-radius: 12px;
  font-weight: 600;
  white-space: nowrap;
}

/* ===== TABLE ===== */
.cl-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.cl-table thead {
  background: #f8fafc;
}
.cl-table th {
  text-align: left;
  padding: 10px 14px;
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  border-bottom: 2px solid #e2e8f0;
}
.cl-table tbody tr {
  cursor: pointer;
  transition: background .15s;
  border-bottom: 1px solid #f1f5f9;
}
.cl-table tbody tr:hover {
  background: #f0f4ff;
}
.cl-table tbody tr:last-child {
  border-bottom: none;
}
.cl-table tbody tr.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}
/* Dòng hồ sơ đã giao bị khóa click, nhưng nút "Mở lại để sửa" thì vẫn phải bấm được. */
.cl-table tbody tr.disabled .td-reopen {
  pointer-events: auto;
  opacity: 1;
}
.cl-table td {
  padding: 11px 14px;
  font-size: 13px;
  color: #334155;
}
.td-id {
  font-weight: 700;
  color: #6366f1;
}
.td-name {
  font-weight: 600;
  color: #0f172a;
}
.td-email {
  font-size: 12px;
  color: #64748b;
}

/* ===== BADGES ===== */
.cl-badge {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.cl-badge.available {
  background: #dcfce7;
  color: #166534;
}
.cl-badge.submitted {
  background: #f1f5f9;
  color: #64748b;
}
.cl-badge.pending {
  background: #fef3c7;
  color: #92400e;
}
.cl-badge.completed {
  background: #e0e7ff;
  color: #4f46e5;
}

/* ===== DOWNLOAD BUTTON ===== */
.cl-download-btn {
  padding: 5px 12px;
  background: linear-gradient(135deg, #6366f1, #818cf8);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: all .2s;
  letter-spacing: 0.3px;
}
.cl-download-btn:hover {
  background: linear-gradient(135deg, #4f46e5, #6366f1);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(99,102,241,0.3);
}
.cl-download-btn:active {
  transform: translateY(0);
}
.cl-download-btn:disabled {
  background: #94a3b8;
  cursor: wait;
  transform: none;
  box-shadow: none;
}

/* ===== EMPTY ===== */
.cl-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 40vh;
  color: #94a3b8;
  font-size: 15px;
}
.cl-empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

/* ===== REVIEWER TABS ===== */
.reviewer-tabs {
  display: flex;
  gap: 8px;
  align-items: center;
}
.reviewer-tabs button {
  padding: 7px 18px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all .15s;
}
.reviewer-tabs button:hover {
  border-color: #6366f1;
  color: #6366f1;
}
.reviewer-tabs button.active {
  background: #6366f1;
  border-color: #6366f1;
  color: #fff;
}

.td-reopen {
  text-align: right;
  white-space: nowrap;
}
.cl-reopen-btn {
  padding: 5px 10px;
  border: 1px solid #f59e0b;
  border-radius: 6px;
  background: #fffbeb;
  color: #b45309;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.cl-reopen-btn:hover {
  background: #fef3c7;
}
</style>

<template>
  <aside id="app-sidebar">
    <div class="sb-header">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span>📋 ICAVIET PKT</span>
        <button @click="$emit('logout')" style="background:transparent; border:none; color:#ef4444; cursor:pointer; font-size:12px;">Đăng xuất</button>
      </div>
      <div style="font-size: 11px; font-weight:normal; color:#94a3b8; margin-top: 5px;">
        Xin chào, {{ currentUser?.name }}
      </div>
    </div>

    <!-- Menu điều hướng dạng text -->
    <nav class="sb-nav">
      <a
        class="sb-nav-item"
        :class="{ active: currentRole === 'filler' }"
        @click="handleFillerMenuClick"
      >
        <span>📝 Danh sách điền đơn</span>
        <span class="sb-nav-caret">{{ isFillerMenuOpen ? '▾' : '▸' }}</span>
      </a>
      <div v-if="isFillerMenuOpen" class="sb-submenu">
        <button
          type="button"
          class="sb-submenu-item"
          :class="{ active: !formTypeFilter }"
          @click="handleSelectFormType('')"
        >
          Tất cả loại phiếu
        </button>

        <!-- Render DS-160 -->
        <button
          v-if="getFormTypeObj('ds160')"
          type="button"
          class="sb-submenu-item"
          :class="{ active: formTypeFilter === 'ds160' }"
          @click="handleSelectFormType('ds160')"
        >
          {{ getFormTypeObj('ds160').label }}
        </button>

        <!-- Collapsible I-130 -->
        <div class="nested-menu">
          <button
            type="button"
            class="sb-submenu-item has-nested"
            :class="{ active: isI130Active }"
            @click="toggleI130Menu"
          >
            <span>📋 Phiếu kiểm tra I-130</span>
            <span class="nested-caret">{{ isI130MenuOpen ? '▾' : '▸' }}</span>
          </button>
          
          <div v-if="isI130MenuOpen" class="nested-submenu">
            <button
              type="button"
              class="nested-submenu-item"
              :class="{ active: formTypeFilter === 'i130a-nbl' }"
              @click="handleSelectFormType('i130a-nbl')"
            >
              • Người Bảo Lãnh
            </button>
            <button
              type="button"
              class="nested-submenu-item"
              :class="{ active: formTypeFilter === 'i130a-ndbl' }"
              @click="handleSelectFormType('i130a-ndbl')"
            >
              • Người Được Bảo Lãnh
            </button>
            <button
              type="button"
              class="nested-submenu-item"
              :class="{ active: formTypeFilter === 'i130a-final' }"
              @click="handleSelectFormType('i130a-final')"
            >
              • Phiếu Tổng Hợp
            </button>
          </div>
        </div>



        <!-- Render remaining visa types -->
        <template v-for="ft in otherFormTypes" :key="ft.value">
          <button
            type="button"
            class="sb-submenu-item"
            :class="{ active: formTypeFilter === ft.value }"
            @click="handleSelectFormType(ft.value)"
          >
            {{ ft.label }}
          </button>
        </template>
      </div>

      <a
        class="sb-nav-item"
        :class="{ active: currentRole === 'reviewer' && reviewerView === 'pending' }"
        @click="handleReviewerPendingClick"
      >🔍 Danh sách kiểm tra</a>
      <a
        class="sb-nav-item"
        :class="{ active: currentRole === 'reviewer' && reviewerView === 'completed' }"
        @click="handleReviewerCompletedClick"
      >✅ Đã kiểm tra</a>
      <a
        v-if="currentUser?.username === 'ittest'"
        class="sb-nav-item"
        :class="{ active: currentRole === 'log' }"
        @click="handleCheckLogClick"
      >🧾 Check log</a>
      <a
        v-if="currentUser?.username === 'ittest'"
        class="sb-nav-item"
        :class="{ active: currentRole === 'users' }"
        @click="handleUserAdminClick"
      >👤 Tạo tài khoản</a>
    </nav>

    <!-- Nút quay lại khi đang xem chi tiết -->
    <div v-if="selectedCustomer || activeReviewId" class="sb-section" style="border-bottom:none; margin-top: auto;">
      <button class="sb-btn back-btn" @click="$emit('back-to-list')">← Quay lại danh sách</button>
    </div>
  </aside>
</template>

<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  currentUser: Object,
  currentRole: String,
  reviewerView: String,
  selectedCustomer: Object,
  activeReviewId: Number,
  formTypes: { type: Array, default: () => [] },
  formTypeFilter: String,
})

const emit = defineEmits(['logout', 'switch-role', 'set-reviewer-view', 'back-to-list', 'change-form-type', 'open-check-log', 'open-user-admin'])

const isFillerMenuOpen = ref(false)
const isI130MenuOpen = ref(false)

watch(() => props.currentRole, (role) => {
  if (role !== 'filler') isFillerMenuOpen.value = false
})

watch(() => props.formTypeFilter, (newFilter) => {
  if (['i130a-nbl', 'i130a-ndbl', 'i130a-final'].includes(newFilter)) {
    isI130MenuOpen.value = true
  }
}, { immediate: true })

const isI130Active = computed(() => {
  return ['i130a-nbl', 'i130a-ndbl', 'i130a-final'].includes(props.formTypeFilter)
})

const otherFormTypes = computed(() => {
  return props.formTypes.filter(ft => !['ds160', 'i130a-nbl', 'i130a-ndbl', 'i130a-final'].includes(ft.value))
})

function getFormTypeObj(val) {
  return props.formTypes.find(ft => ft.value === val)
}

function toggleI130Menu() {
  isI130MenuOpen.value = !isI130MenuOpen.value
}

function handleFillerMenuClick() {
  if (props.currentRole !== 'filler') {
    emit('switch-role', 'filler')
    isFillerMenuOpen.value = true
    return
  }
  isFillerMenuOpen.value = !isFillerMenuOpen.value
}

function handleSelectFormType(type) {
  if (props.currentRole !== 'filler') emit('switch-role', 'filler')
  if (props.selectedCustomer || props.activeReviewId) emit('back-to-list')
  emit('change-form-type', type)
  isFillerMenuOpen.value = true
}

function handleReviewerPendingClick() {
  isFillerMenuOpen.value = false
  emit('switch-role', 'reviewer')
  emit('set-reviewer-view', 'pending')
}

function handleReviewerCompletedClick() {
  isFillerMenuOpen.value = false
  emit('switch-role', 'reviewer')
  emit('set-reviewer-view', 'completed')
}

function handleCheckLogClick() {
  isFillerMenuOpen.value = false
  emit('open-check-log')
}

function handleUserAdminClick() {
  isFillerMenuOpen.value = false
  emit('open-user-admin')
}
</script>

<style scoped>
.has-nested {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.nested-caret {
  font-size: 10px;
  color: #64748b;
  line-height: 1;
}
.nested-submenu {
  padding-left: 12px;
  margin-top: 2px;
  margin-bottom: 4px;
  border-left: 1px dashed rgba(255, 255, 255, 0.12);
}
.nested-submenu-item {
  display: block;
  width: 100%;
  padding: 6px 10px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #94a3b8;
  font: inherit;
  font-size: 11px;
  text-align: left;
  cursor: pointer;
  transition: all .15s;
}
.nested-submenu-item:hover {
  color: #e2e8f0;
  background: rgba(255, 255, 255, 0.04);
}
.nested-submenu-item.active {
  color: #fff;
  background: rgba(99, 102, 241, 0.18);
  font-weight: 700;
}
</style>

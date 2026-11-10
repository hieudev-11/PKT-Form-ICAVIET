<template>
  <div class="paper-signatures">
    <div class="ps-title">CHỮ KÝ ĐIỆN TỬ</div>
    <div class="ps-grid">
      <div v-for="slot in SIGNATURE_SLOTS" :key="slot.key" class="ps-box">
        <input
          v-model="local[slot.key].label"
          class="ps-label"
          type="text"
          :placeholder="SIGNATURE_LABEL_PLACEHOLDER"
          :disabled="readonly"
          @change="onLabelChange(slot.key)"
        />

        <div class="ps-area">
          <SignaturePad
            v-show="isEditing(slot.key)"
            :ref="el => setPadRef(slot.key, el)"
            @change="onPadChange(slot.key, $event)"
          />
          <div v-if="!isEditing(slot.key)" class="ps-preview">
            <img v-if="local[slot.key].image" :src="local[slot.key].image" alt="Chữ ký" />
            <span v-else class="ps-empty">Chưa có chữ ký</span>
          </div>
        </div>

        <div class="ps-meta">
          <span v-if="local[slot.key].signedBy || local[slot.key].signedAt">
            {{ [local[slot.key].signedBy, formatSignedAt(local[slot.key].signedAt)].filter(Boolean).join(' · ') }}
          </span>
        </div>

        <div v-if="!readonly" class="ps-actions">
          <template v-if="isEditing(slot.key)">
            <button type="button" class="ps-btn" :disabled="saving" @click="clearPad(slot.key)">Xóa nét</button>
            <button type="button" class="ps-btn primary" :disabled="saving || padEmpty[slot.key]" @click="saveSlot(slot.key)">
              {{ saving ? 'Đang lưu...' : 'Lưu chữ ký' }}
            </button>
            <button v-if="local[slot.key].image" type="button" class="ps-btn" :disabled="saving" @click="cancelEdit(slot.key)">Hủy</button>
          </template>
          <template v-else>
            <button type="button" class="ps-btn" :disabled="saving" @click="startEdit(slot.key)">Ký lại</button>
            <button type="button" class="ps-btn danger" :disabled="saving" @click="removeSlot(slot.key)">Xóa chữ ký</button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, watch, nextTick } from 'vue'
import SignaturePad from './SignaturePad.vue'
import {
  SIGNATURE_SLOTS,
  SIGNATURE_LABEL_PLACEHOLDER,
  normalizeSignatures,
  formatSignedAt
} from '../lib/signatures.js'

const props = defineProps({
  modelValue: { type: Object, default: null },
  currentUser: { type: Object, default: null },
  readonly: { type: Boolean, default: false },
  saving: { type: Boolean, default: false }
})

const emit = defineEmits(['save'])

const local = reactive(normalizeSignatures(props.modelValue))
const editing = reactive({})
const padEmpty = reactive({})
const pads = {}

for (const slot of SIGNATURE_SLOTS) {
  editing[slot.key] = !local[slot.key].image
  padEmpty[slot.key] = true
}

watch(() => props.modelValue, (value) => {
  const data = normalizeSignatures(value)
  for (const slot of SIGNATURE_SLOTS) {
    Object.assign(local[slot.key], data[slot.key])
    if (!editing[slot.key] || data[slot.key].image) {
      editing[slot.key] = !data[slot.key].image
    }
  }
}, { deep: true })

function setPadRef(key, el) {
  if (el) pads[key] = el
  else delete pads[key]
}

const isEditing = (key) => !props.readonly && editing[key]

function onPadChange(key, empty) {
  padEmpty[key] = empty
}

function clearPad(key) {
  pads[key]?.clear()
  padEmpty[key] = true
}

function startEdit(key) {
  editing[key] = true
  padEmpty[key] = true
  nextTick(() => pads[key]?.resize())
}

function cancelEdit(key) {
  editing[key] = false
  padEmpty[key] = true
}

function snapshot() {
  const data = {}
  for (const slot of SIGNATURE_SLOTS) {
    data[slot.key] = { ...local[slot.key] }
  }
  return data
}

function signerName() {
  return props.currentUser?.fullName || props.currentUser?.full_name || props.currentUser?.name || props.currentUser?.username || ''
}

function saveSlot(key) {
  const image = pads[key]?.toDataURL() || ''
  if (!image) return
  local[key].image = image
  local[key].signedBy = signerName()
  local[key].signedAt = new Date().toISOString()
  editing[key] = false
  emit('save', snapshot())
}

function removeSlot(key) {
  local[key].image = ''
  local[key].signedBy = ''
  local[key].signedAt = ''
  editing[key] = true
  padEmpty[key] = true
  nextTick(() => pads[key]?.resize())
  emit('save', snapshot())
}

// Sửa nhãn xong là lưu luôn, khỏi phải ký lại chỉ để đổi chữ.
function onLabelChange() {
  emit('save', snapshot())
}
</script>

<style scoped>
.paper-signatures {
  margin: 14px 0 30px;
  font-family: "Times New Roman", Times, serif;
}

.ps-title {
  font-family: Arial, sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: #475569;
  letter-spacing: 0.4px;
  margin-bottom: 6px;
}

.ps-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.ps-box {
  border: 1px solid #000;
  border-radius: 4px;
  padding: 10px 12px 12px;
  background: #fff;
}

.ps-label {
  width: 100%;
  border: 0;
  border-bottom: 1px solid #cbd5f5;
  padding: 2px 0 4px;
  margin-bottom: 8px;
  font-family: "Times New Roman", Times, serif;
  font-size: 17px;
  font-weight: 700;
  text-align: center;
  text-transform: uppercase;
  color: #111827;
  background: transparent;
}

.ps-label::placeholder {
  font-family: Arial, sans-serif;
  font-size: 12px;
  font-weight: 400;
  text-transform: none;
  color: #94a3b8;
}

.ps-label:disabled {
  border-bottom-color: transparent;
  color: #111827;
  -webkit-text-fill-color: #111827;
  opacity: 1;
}

.ps-area {
  min-height: 120px;
}

.ps-preview {
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ps-preview img {
  max-width: 100%;
  max-height: 118px;
  object-fit: contain;
}

.ps-empty {
  font-family: Arial, sans-serif;
  font-size: 13px;
  color: #94a3b8;
}

.ps-meta {
  min-height: 18px;
  font-family: Arial, sans-serif;
  font-size: 12px;
  color: #475569;
  text-align: center;
}

.ps-actions {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 8px;
}

.ps-btn {
  font-family: Arial, sans-serif;
  font-size: 12px;
  font-weight: 700;
  padding: 5px 12px;
  border: 1px solid #cbd5f5;
  border-radius: 6px;
  background: #f8fafc;
  color: #1f2937;
  cursor: pointer;
}

.ps-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.ps-btn.primary {
  border-color: #1d4ed8;
  background: #dbeafe;
  color: #1d4ed8;
}

.ps-btn.danger {
  border-color: #fecaca;
  background: #fee2e2;
  color: #b91c1c;
}
</style>

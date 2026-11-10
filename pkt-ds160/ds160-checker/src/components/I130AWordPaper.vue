<template>
  <component
    :is="activeComponent"
    ref="activePaperRef"
    :mode="mode"
    :form-type="formType"
    :customer-data="customerData"
    :current-user="currentUser"
    :reviewers="reviewers"
    :selected-reviewer="selectedReviewer"
    :signatures="signatures"
    :comments="comments"
    :log-compare="logCompare"
    @change="$emit('change', $event)"
    @submit-form="$emit('submit-form', $event)"
    @update:selectedReviewer="$emit('update:selectedReviewer', $event)"
  />
</template>

<script setup>
import { computed, ref } from 'vue'
import { resolveI130CaseType } from '../forms/i130/relationship-resolver.js'

import SpouseI130AWordPaper from './i130/cases/spouse/I130AWordPaper.vue'
import ChildI130AWordPaper from './i130/cases/child/I130AWordPaper.vue'
import ParentI130AWordPaper from './i130/cases/parent/I130AWordPaper.vue'
import SiblingI130AWordPaper from './i130/cases/sibling/I130AWordPaper.vue'
import FianceI130AWordPaper from './i130/cases/fiance/I130AWordPaper.vue'

const props = defineProps({
  mode: String,
  formType: String,
  customerData: Object,
  currentUser: Object,
  reviewers: Array,
  selectedReviewer: [String, Number],
  logCompare: Boolean,
  signatures: { type: Object, default: null },
  comments: { type: Array, default: () => [] }
})

defineEmits(['change', 'submit-form', 'update:selectedReviewer'])

const activePaperRef = ref(null)

const componentMap = {
  spouse: SpouseI130AWordPaper,
  child: ChildI130AWordPaper,
  parent: ParentI130AWordPaper,
  sibling: SiblingI130AWordPaper,
  fiance: FianceI130AWordPaper
}

const activeCaseType = computed(() => resolveI130CaseType(props.customerData || {}))
const activeComponent = computed(() => componentMap[activeCaseType.value] || SpouseI130AWordPaper)

function exportPdf(...args) {
  return activePaperRef.value?.exportPdf?.(...args)
}

// App.vue hỏi snapshot qua lớp bọc này, nên phải chuyển tiếp xuống đúng phiếu
// theo diện (vợ chồng / con / cha mẹ / anh chị em / hôn phu) đang mở.
function getAuditSnapshot() {
  return activePaperRef.value?.getAuditSnapshot?.() || {}
}

defineExpose({
  exportPdf,
  getAuditSnapshot,
  activeCaseType
})
</script>

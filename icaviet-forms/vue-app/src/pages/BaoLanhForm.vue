<script setup lang="ts">
import { ref, computed, provide } from 'vue'

// Import các form con
import BaoLanhHonPhuForm from './BaoLanhHonPhuForm.vue'
import BaoLanhVoChongForm from './BaoLanhVoChongForm.vue'
import BaoLanhConCaiForm from './BaoLanhConCaiForm.vue'
import BaoLanhChaMeForm from './BaoLanhChaMeForm.vue'
import BaoLanhAnhChiEmForm from './BaoLanhAnhChiEmForm.vue'

import { useFormI18nProvider } from '@/composables/useFormI18n'
import { useFormApi } from '@/composables/useFormApi'

// Khởi tạo i18n
const { locale, t, toggleLocale } = useFormI18nProvider('vi')

// Provide flag cho các component con biết đang ở form bảo lãnh
provide('isBaoLanhForm', true)
provide('dateSelectOrder', 'mdy')

// Định nghĩa các loại danh mục
const categories = computed(() => [
  { id: 'anh-chi-em', label: t('Mở hồ sơ bảo lãnh anh chị em', 'Open a sibling sponsorship case'), component: BaoLanhAnhChiEmForm },
  { id: 'cha-me', label: t('Mở hồ sơ bảo lãnh cha mẹ', 'Open a parent sponsorship case'), component: BaoLanhChaMeForm },
  { id: 'vo-chong', label: t('Mở hồ sơ bảo lãnh vợ chồng', 'Open a spousal sponsorship case'), component: BaoLanhVoChongForm },
  { id: 'hon-phu', label: t('Mở hồ sơ bảo lãnh hôn phu - hôn thê', 'Open a fiancé(e) sponsorship case'), component: BaoLanhHonPhuForm },
  { id: 'con-gai', label: t('Mở hồ sơ bảo lãnh con cái', 'Open a child sponsorship case'), component: BaoLanhConCaiForm }
])

// State lưu trữ lựa chọn của người dùng
const selectedCategoryId = ref<string | null>(null)

// Computed property để lấy component được chọn
const selectedComponent = computed(() => {
  const category = categories.value.find(c => c.id === selectedCategoryId.value)
  return category ? category.component : null
})

// Trạng thái hiển thị danh mục hay hiển thị form
const showForm = ref(false)

// Xử lý khi nhấn nút "Tiếp tục"
const handleContinue = () => {
  if (selectedCategoryId.value) {
    showForm.value = true
  } else {
    alert(t('Vui lòng chọn một mục đích điền đơn.', 'Please select a purpose of application.'))
  }
}

// Xử lý khi nhấn nút "Quay lại" từ trong form
const handleBack = () => {
  showForm.value = false
  // Giữ nguyên selectedCategoryId để người dùng biết mình đã chọn gì trước đó
}

// API client
const { submitForm } = useFormApi()

// Submission state
const isSubmitting = ref(false)

const setAddressParts = (target: any, field: string, parts: any) => {
  if (!target || !field || !parts) return
  const normalized = {
    street: String(parts.street || '').trim(),
    city: String(parts.city || '').trim(),
    province: String(parts.province || '').trim(),
    zip: String(parts.zip || '').trim(),
    country: String(parts.country || '').trim(),
  }

  target[`${field}Street`] = normalized.street
  target[`${field}Line1`] = normalized.street
  target[`${field}City`] = normalized.city
  target[`${field}Province`] = normalized.province
  target[`${field}State`] = normalized.province
  target[`${field}Zip`] = normalized.zip
  target[`${field}ZipCode`] = normalized.zip
  target[`${field}Country`] = normalized.country
  target[`${field}Parts`] = normalized
}

const setPlaceBirthParts = (target: any, field: string, parts: any) => {
  if (!target || !field || !parts) return
  const normalized = {
    city: String(parts.city || '').trim(),
    province: String(parts.province || '').trim(),
    country: String(parts.country || '').trim(),
  }

  target[`${field}City`] = normalized.city
  target[`${field}Province`] = normalized.province
  target[`${field}State`] = normalized.province
  target[`${field}Country`] = normalized.country
  target[`${field}Parts`] = normalized
}

const showThankYouModal = ref(false)

// Xử lý submit
const handleFormSubmit = async (formData: any) => {
  if (isSubmitting.value) return
  isSubmitting.value = true

  try {
    // Gọi API lưu dữ liệu (slug 'ndbl')
    await submitForm('bao-lanh', {
      ...formData,
      loaiHoSoBaoLanh: selectedCategoryId.value
    })
    
    // Thành công
    showThankYouModal.value = true
    showForm.value = false
  } catch (error: any) {
    console.error('Submit error:', error)
    alert(t('Có lỗi xảy ra khi gửi dữ liệu: ', 'An error occurred while submitting data: ') + (error.message || t('Lỗi không xác định', 'Unknown error')))
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="icaviet-forms-root ndbl-wrapper">
    <!-- Nút đổi ngôn ngữ -->
    <div class="max-w-4xl mx-auto px-4 flex justify-end mb-4">
      <button 
        @click="toggleLocale" 
        class="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
      >
        <span class="text-xl leading-none">{{ locale === 'vi' ? '🇺🇸' : '🇻🇳' }}</span>
        <span class="text-sm font-medium text-gray-700">{{ locale === 'vi' ? 'English' : 'Tiếng Việt' }}</span>
      </button>
    </div>

    <!-- BƯỚC 1: CHỌN DANH MỤC -->
    <div v-if="!showForm" class="category-selection max-w-3xl mx-auto bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-100">
      <h2 class="text-xl md:text-2xl font-bold mb-6 text-gray-800">{{ t('Chọn mối quan hệ với người bảo lãnh:', 'Select your relationship with the petitioner:') }} <span class="text-red-500">*</span></h2>
      
      <div class="space-y-4">
        <label 
          v-for="category in categories" 
          :key="category.id"
          class="flex items-center p-4 border rounded-lg cursor-pointer transition-all duration-200"
          :class="selectedCategoryId === category.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'"
        >
          <input 
            type="radio" 
            name="purpose" 
            :value="category.id" 
            v-model="selectedCategoryId"
            class="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
          >
          <span class="ml-3 text-gray-700 text-lg">{{ category.label }}</span>
        </label>
      </div>

      <div class="mt-8 pt-6 border-t border-gray-100 flex justify-end">
        <button 
          @click="handleContinue" 
          class="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!selectedCategoryId"
        >
          {{ t('Tiếp tục', 'Continue') }}
        </button>
      </div>
    </div>

    <!-- BƯỚC 2: HIỂN THỊ FORM CON TƯƠNG ỨNG -->
    <div v-else class="dynamic-form-container">
      <div class="mb-4 max-w-4xl mx-auto px-4">
        <button 
          @click="handleBack" 
          class="inline-flex items-center text-gray-600 hover:text-blue-600 font-medium transition-colors"
        >
          <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
          {{ t('Quay lại chọn danh mục khác', 'Back to category selection') }}
        </button>
      </div>

      <!-- Render component form tương ứng -->
      <component 
        :is="selectedComponent" 
        @submit="handleFormSubmit"
      />
      
      <!-- Loading Overlay -->
      <div v-if="isSubmitting" class="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50">
        <div class="bg-white p-6 rounded-xl shadow-xl flex flex-col items-center">
          <svg class="animate-spin -ml-1 mr-3 h-10 w-10 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="text-gray-700 font-medium">{{ t('Đang xử lý dữ liệu...', 'Processing data...') }}</p>
        </div>
      </div>
    </div>
    
    <!-- Modal cảm ơn -->
    <div v-if="showThankYouModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 transition-opacity">
      <div class="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl transform transition-all text-center">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <h3 class="text-2xl font-bold text-gray-900 mb-2">{{ t('Gửi thành công!', 'Submitted successfully!') }}</h3>
        <p class="text-gray-600 mb-6">{{ t('Hồ sơ của bạn đã được tiếp nhận. Chúng tôi sẽ xử lý và liên hệ lại với bạn trong thời gian sớm nhất.', 'Your application has been received. We will process it and contact you as soon as possible.') }}</p>
        <button 
          @click="showThankYouModal = false"
          class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
        >
          {{ t('Đóng', 'Close') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ndbl-wrapper {
  padding-top: 2rem;
  padding-bottom: 2rem;
}
</style>
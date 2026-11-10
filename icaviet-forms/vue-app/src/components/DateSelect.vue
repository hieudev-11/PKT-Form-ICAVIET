<template>
  <div class="flex gap-2 w-full">
    <template v-if="useMonthDayYearOrder">
      <select
        v-model="month"
        @change="updateDate"
        :required="required"
        :class="baseClass"
        class="flex-1 bg-white"
        @focus="$emit('focus')"
        @blur="$emit('blur')"
      >
        <option value="">{{ activeLocale === 'vi' ? 'Tháng' : 'Month' }}</option>
        <option v-for="m in 12" :key="'m'+m" :value="String(m).padStart(2, '0')">{{ String(m).padStart(2, '0') }}</option>
      </select>
      <select
        v-model="day"
        @change="updateDate"
        :required="required"
        :class="baseClass"
        class="flex-1 bg-white"
        @focus="$emit('focus')"
        @blur="$emit('blur')"
      >
        <option value="">{{ activeLocale === 'vi' ? 'Ngày' : 'Day' }}</option>
        <option v-for="d in 31" :key="'d'+d" :value="String(d).padStart(2, '0')">{{ String(d).padStart(2, '0') }}</option>
      </select>
      <select
        v-model="year"
        @change="updateDate"
        :required="required"
        :class="baseClass"
        class="flex-1 bg-white"
        @focus="$emit('focus')"
        @blur="$emit('blur')"
      >
        <option value="">{{ activeLocale === 'vi' ? 'Năm' : 'Year' }}</option>
        <option v-for="y in years" :key="'y'+y" :value="String(y)">{{ y }}</option>
      </select>
    </template>

    <template v-else>
      <select
        v-model="day"
        @change="updateDate"
        :required="required"
        :class="baseClass"
        class="flex-1 bg-white"
        @focus="$emit('focus')"
        @blur="$emit('blur')"
      >
        <option value="">{{ activeLocale === 'vi' ? 'Ngày' : 'Day' }}</option>
        <option v-for="d in 31" :key="'d'+d" :value="String(d).padStart(2, '0')">{{ String(d).padStart(2, '0') }}</option>
      </select>
      <select
        v-model="month"
        @change="updateDate"
        :required="required"
        :class="baseClass"
        class="flex-1 bg-white"
        @focus="$emit('focus')"
        @blur="$emit('blur')"
      >
        <option value="">{{ activeLocale === 'vi' ? 'Tháng' : 'Month' }}</option>
        <option v-for="m in 12" :key="'m'+m" :value="String(m).padStart(2, '0')">{{ String(m).padStart(2, '0') }}</option>
      </select>
      <select
        v-model="year"
        @change="updateDate"
        :required="required"
        :class="baseClass"
        class="flex-1 bg-white"
        @focus="$emit('focus')"
        @blur="$emit('blur')"
      >
        <option value="">{{ activeLocale === 'vi' ? 'Năm' : 'Year' }}</option>
        <option v-for="y in years" :key="'y'+y" :value="String(y)">{{ y }}</option>
      </select>
    </template>
  </div>
</template>

<script setup>
import { ref, watch, computed, inject } from 'vue';
import { useFormI18n } from '@/composables/useFormI18n';

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  locale: {
    type: String,
    default: ''
  },
  baseClass: {
    type: String,
    default: 'border rounded px-3 py-2'
  },
  required: {
    type: Boolean,
    default: false
  },
  isBirthDate: {
    type: Boolean,
    default: false
  },
  allowFutureYears: {
    type: Boolean,
    default: false
  },
  order: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:modelValue', 'focus', 'blur']);
const { locale: globalLocale } = useFormI18n();
const activeLocale = computed(() => props.locale || globalLocale.value || 'vi');

const isBaoLanhForm = inject('isBaoLanhForm', false);
const limitDateYearsToCurrent = inject('limitDateYearsToCurrent', false);
const injectedDateOrder = inject('dateSelectOrder', '');
const useMonthDayYearOrder = computed(() => (props.order || injectedDateOrder) === 'mdy');

const day = ref('');
const month = ref('');
const year = ref('');

// Generate years: limited forms use current year down to 1915. Other forms allow future dates.
const years = computed(() => {
  const currentYear = new Date().getFullYear();
  const arr = [];
  const restrictYear = props.isBirthDate || isBaoLanhForm || limitDateYearsToCurrent;
  const startYear = restrictYear && !props.allowFutureYears ? currentYear : currentYear + 20;
  const endYear = restrictYear || props.allowFutureYears ? 1915 : 1900;
  for (let y = startYear; y >= endYear; y--) {
    arr.push(y);
  }
  return arr;
});

let isUpdatingFromProp = false;

// Sync from modelValue (format: YYYY-MM-DD, DD/MM/YYYY, MM/YYYY, or YYYY)
watch(() => props.modelValue, (newVal) => {
  if (isUpdatingFromProp) return;
  isUpdatingFromProp = true;
  
  if (!newVal) {
    day.value = '';
    month.value = '';
    year.value = '';
  } else {
    // parse YYYY-MM-DD
    let match = newVal.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      year.value = match[1];
      month.value = match[2];
      day.value = match[3];
    } else {
      // parse DD/MM/YYYY or DD-MM-YYYY (stored value remains day/month/year for backwards compatibility)
      match = newVal.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (match) {
        day.value = String(match[1]).padStart(2, '0');
        month.value = String(match[2]).padStart(2, '0');
        year.value = match[3];
      } else {
        // parse MM/YYYY or MM-YYYY
        match = newVal.match(/^(\d{1,2})[\/\-](\d{4})$/);
        if (match) {
          day.value = '';
          month.value = String(match[1]).padStart(2, '0');
          year.value = match[2];
        } else {
          // parse YYYY only
          match = newVal.match(/^(\d{4})$/);
          if (match) {
            day.value = '';
            month.value = '';
            year.value = match[1];
          }
        }
      }
    }
  }
  
  // setTimeout to allow the values to settle before next prop update is considered external
  setTimeout(() => {
    isUpdatingFromProp = false;
  }, 0);
}, { immediate: true });

const updateDate = () => {
  isUpdatingFromProp = true;

  // Lưu cả trường hợp chỉ biết năm sinh. Một số mục DS-160 cho phép
  // khách không nhớ ngày/tháng, nhưng vẫn cần lưu năm để phiếu kiểm tra hiển thị.
  // Lưu định dạng cũ DD/MM/YYYY để không làm lệch dữ liệu đã có và phiếu kiểm tra hiện tại.
  if (day.value && month.value && year.value) {
    emit('update:modelValue', `${day.value}/${month.value}/${year.value}`);
  } else if (month.value && year.value) {
    emit('update:modelValue', `${month.value}/${year.value}`);
  } else if (year.value) {
    emit('update:modelValue', `${year.value}`);
  } else {
    emit('update:modelValue', '');
  }

  setTimeout(() => {
    isUpdatingFromProp = false;
  }, 0);
};
</script>

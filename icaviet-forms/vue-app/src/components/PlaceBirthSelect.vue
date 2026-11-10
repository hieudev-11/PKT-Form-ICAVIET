<template>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
    <div>
      <label class="block text-xs text-gray-500 font-semibold mb-1">{{ activeLocale === 'vi' ? 'Huyện/Thành phố' : 'District/City' }}</label>
      <input
        v-model="city"
        @input="updateValue"
        :required="required"
        :class="baseClass"
        :placeholder="activeLocale === 'vi' ? 'Huyện/Thành phố' : 'District/City'"
        @focus="$emit('focus')"
        @blur="$emit('blur')"
      />
    </div>

    <div>
      <label class="block text-xs text-gray-500 font-semibold mb-1">{{ activeLocale === 'vi' ? 'Tỉnh/Bang' : 'Province/State' }}</label>
      <input
        v-model="province"
        @input="updateValue"
        :required="required"
        :class="baseClass"
        :placeholder="activeLocale === 'vi' ? 'Tỉnh/Bang' : 'Province/State'"
        @focus="$emit('focus')"
        @blur="$emit('blur')"
      />
    </div>

    <div>
      <label class="block text-xs text-gray-500 font-semibold mb-1">{{ activeLocale === 'vi' ? 'Quốc gia' : 'Country' }}</label>
      <input
        v-model="country"
        @input="updateValue"
        :required="required"
        :class="baseClass"
        :placeholder="activeLocale === 'vi' ? 'Quốc gia' : 'Country'"
        @focus="$emit('focus')"
        @blur="$emit('blur')"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useFormI18n } from '@/composables/useFormI18n'

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
  noCountry: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'update:partsValue', 'parts-change', 'focus', 'blur'])
const { locale: globalLocale } = useFormI18n()
const activeLocale = computed(() => props.locale || globalLocale.value || 'vi')

const city = ref('')
const province = ref('')
const country = ref('')

const knownCountries = new Set([
  'United States', 'USA', 'US', 'Việt Nam', 'Vietnam', 'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Belarus', 'Belgium', 'Brazil', 'Brunei', 'Bulgaria', 'Cambodia', 'Canada', 'Chile', 'China', 'Colombia', 'Cuba', 'Czech Republic', 'Denmark', 'Egypt', 'France', 'Germany', 'Greece', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Japan', 'Laos', 'Malaysia', 'Mexico', 'Myanmar', 'Netherlands', 'New Zealand', 'Norway', 'Pakistan', 'Philippines', 'Poland', 'Portugal', 'Russia', 'Singapore', 'South Korea', 'Spain', 'Sweden', 'Switzerland', 'Taiwan', 'Thailand', 'Turkey', 'Ukraine', 'United Arab Emirates', 'United Kingdom'
])

let isUpdatingFromProp = false

watch(() => props.modelValue, (newVal) => {
  if (isUpdatingFromProp) return
  isUpdatingFromProp = true

  if (!newVal) {
    city.value = ''
    province.value = ''
    country.value = ''
  } else {
    const parts = String(newVal).split(',').map(p => p.trim()).filter(Boolean)

    // New format: Huyện/Thành phố, Tỉnh, Quốc gia
    const lastPartIsCountry = parts.length >= 2 && knownCountries.has(parts[parts.length - 1])
    // Old format used in this project: Quốc gia, Tỉnh, Thành phố
    const firstPartIsCountry = parts.length >= 2 && knownCountries.has(parts[0])

    if (firstPartIsCountry) {
      country.value = parts[0] || ''
      province.value = parts[1] || ''
      city.value = parts.slice(2).join(', ') || ''
    } else if (lastPartIsCountry) {
      city.value = parts.slice(0, Math.max(parts.length - 2, 1)).join(', ') || ''
      province.value = parts.length >= 2 ? parts[parts.length - 2] : ''
      country.value = parts[parts.length - 1] || ''
    } else {
      city.value = parts[0] || ''
      province.value = parts[1] || ''
      country.value = parts.slice(2).join(', ') || ''
    }
  }

  setTimeout(() => {
    isUpdatingFromProp = false
  }, 0)
}, { immediate: true })

const buildParts = () => ({
  city: String(city.value || '').trim(),
  province: String(province.value || '').trim(),
  country: String(country.value || '').trim(),
})

const updateValue = () => {
  isUpdatingFromProp = true
  const parts = buildParts()
  const value = [parts.city, parts.province, parts.country]
    .filter(Boolean)
    .join(', ')
  emit('update:modelValue', value)
  emit('update:partsValue', parts)
  emit('parts-change', parts)
  setTimeout(() => {
    isUpdatingFromProp = false
  }, 0)
}
</script>

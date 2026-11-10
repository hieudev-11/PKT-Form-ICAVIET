<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-2 w-full">
    <input
      :id="`${inputIdPrefix}-street`"
      v-model="street"
      @input="updateValue"
      :required="required"
      :class="baseClass"
      :placeholder="activeLocale === 'vi' ? 'Số nhà/đường/xã/phường/quận' : 'Street/Ward/District'"
      @focus="$emit('focus')"
      @blur="$emit('blur')"
    />

    <input
      :id="`${inputIdPrefix}-city`"
      v-model="city"
      @input="updateValue"
      :required="required"
      :class="baseClass"
      :placeholder="activeLocale === 'vi' ? 'Huyện/Thành phố' : 'District/City'"
      @focus="$emit('focus')"
      @blur="$emit('blur')"
    />

    <input
      :id="`${inputIdPrefix}-province`"
      v-model="province"
      @input="updateValue"
      :required="required"
      :class="baseClass"
      :placeholder="activeLocale === 'vi' ? 'Tỉnh/Bang' : 'Province/State'"
      @focus="$emit('focus')"
      @blur="$emit('blur')"
    />

    <input
      :id="`${inputIdPrefix}-zip`"
      v-model="zip"
      @input="updateValue"
      :required="false"
      :class="baseClass"
      :placeholder="activeLocale === 'vi' ? 'Mã Zip' : 'ZIP Code'"
      @focus="$emit('focus')"
      @blur="$emit('blur')"
    />

    <input
      :id="`${inputIdPrefix}-country`"
      v-model="country"
      @input="updateValue"
      :required="required"
      :class="baseClass"
      :placeholder="activeLocale === 'vi' ? 'Quốc gia' : 'Country'"
      @focus="$emit('focus')"
      @blur="$emit('blur')"
    />
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useFormI18n } from '@/composables/useFormI18n'

const props = defineProps({
  // modelValue is kept only for backward compatibility with old templates.
  // AddressSelect no longer parses or stores a comma-separated address string.
  modelValue: {
    type: String,
    default: ''
  },
  streetValue: {
    type: String,
    default: ''
  },
  cityValue: {
    type: String,
    default: ''
  },
  provinceValue: {
    type: String,
    default: ''
  },
  zipValue: {
    type: String,
    default: ''
  },
  countryValue: {
    type: String,
    default: ''
  },
  idPrefix: {
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
  isUs: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'update:modelValue',
  'update:streetValue',
  'update:cityValue',
  'update:provinceValue',
  'update:zipValue',
  'update:countryValue',
  'update:partsValue',
  'parts-change',
  'focus',
  'blur'
])

const { locale: globalLocale } = useFormI18n()
const activeLocale = computed(() => props.locale || globalLocale.value || 'vi')
const inputIdPrefix = `address-${Math.random().toString(36).slice(2, 10)}`

const street = ref('')
const city = ref('')
const province = ref('')
const zip = ref('')
const country = ref('')

let isSyncingFromProps = false

const normalize = value => String(value || '').trim()

const syncFromFieldProps = () => {
  isSyncingFromProps = true
  street.value = normalize(props.streetValue)
  city.value = normalize(props.cityValue)
  province.value = normalize(props.provinceValue)
  zip.value = normalize(props.zipValue)
  country.value = normalize(props.countryValue)
  setTimeout(() => {
    isSyncingFromProps = false
  }, 0)
}

watch(
  () => [props.streetValue, props.cityValue, props.provinceValue, props.zipValue, props.countryValue],
  syncFromFieldProps,
  { immediate: true }
)

const buildParts = () => ({
  street: normalize(street.value),
  city: normalize(city.value),
  province: normalize(province.value),
  zip: normalize(zip.value),
  country: normalize(country.value),
})

const updateValue = () => {
  if (isSyncingFromProps) return
  const parts = buildParts()

  // Do not join the address into one comma-separated string anymore.
  // Each input is stored in its own field by the parent form.
  emit('update:modelValue', '')
  emit('update:streetValue', parts.street)
  emit('update:cityValue', parts.city)
  emit('update:provinceValue', parts.province)
  emit('update:zipValue', parts.zip)
  emit('update:countryValue', parts.country)
  emit('update:partsValue', parts)
  emit('parts-change', parts)
}
</script>

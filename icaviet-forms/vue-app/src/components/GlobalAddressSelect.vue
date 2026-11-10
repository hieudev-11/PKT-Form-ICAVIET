<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-2 w-full">
    <!-- Row 1: Quốc gia | Tỉnh -->
    <select
      v-model="country"
      @change="updateValue"
      :required="required"
      :class="baseClass"
      class="bg-white"
      @focus="$emit('focus')"
      @blur="$emit('blur')"
    >
      <option value="">{{ activeLocale === 'vi' ? 'Chọn quốc gia' : 'Select country' }}</option>
      <option v-for="c in countries" :key="c" :value="c">{{ c }}</option>
    </select>
    <input
      v-model="state"
      @input="updateValue"
      :required="required"
      :class="baseClass"
      :placeholder="activeLocale === 'vi' ? (isUS ? 'Bang' : (isVietnam ? 'Tỉnh' : 'Tỉnh/Thành phố')) : (isUS ? 'State' : 'Province')"
      @focus="$emit('focus')"
      @blur="$emit('blur')"
    />

    <!-- Row 2: Huyện/Thành phố | Số nhà -->
    <input
      v-model="city"
      @input="updateValue"
      :required="required"
      :class="baseClass"
      :placeholder="activeLocale === 'vi' ? (isVietnam ? 'Huyện/Thành phố' : (isUS ? 'Thành phố' : 'Thành phố')) : (isVietnam ? 'District/City' : 'City')"
      @focus="$emit('focus')"
      @blur="$emit('blur')"
    />
    <input
      v-model="street"
      @input="updateValue"
      :required="required"
      :class="baseClass"
      :placeholder="activeLocale === 'vi' ? (isVietnam ? 'Số nhà, đường, phường, quận' : 'Số nhà, tên đường, căn hộ') : (isVietnam ? 'Street, ward, district' : 'Street Address')"
      @focus="$emit('focus')"
      @blur="$emit('blur')"
    />

    <!-- Row 3: ZIP (US only) -->
    <input
      v-if="isUS"
      v-model="zip"
      @input="updateValue"
      :required="false"
      :class="baseClass"
      class="md:col-span-2"
      :placeholder="activeLocale === 'vi' ? 'Mã bưu điện (Zip Code)' : 'ZIP Code'"
      @focus="$emit('focus')"
      @blur="$emit('blur')"
    />
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
    default: 'w-full border rounded px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500'
  },
  required: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'focus', 'blur'])
const { locale: globalLocale } = useFormI18n()
const activeLocale = computed(() => props.locale || globalLocale.value || 'vi')

const country = ref('')
const state = ref('')
const zip = ref('')
const city = ref('')
const street = ref('')

const isVietnam = computed(() => country.value === 'Việt Nam' || country.value === 'Vietnam')
const isUS = computed(() => country.value === 'United States')

const countries = [
  "United States", "Việt Nam", "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kosovo", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Yemen", "Zambia", "Zimbabwe"
]

let isUpdatingFromProp = false

watch(() => props.modelValue, (newVal) => {
  if (isUpdatingFromProp) return
  isUpdatingFromProp = true
  
  if (!newVal) {
    country.value = ''
    state.value = ''
    zip.value = ''
    city.value = ''
    street.value = ''
  } else {
    // When reading existing data, if it was generated by AddressSelect, it's:
    // Street, City, State, Country
    // But since we are generating new data as:
    // Country, State, Zip, City, Street (or Country, State, City, Street for VN)
    // To support parsing the new format backwards:
    const parts = String(newVal).split(',').map(p => p.trim()).filter(Boolean)
    
    // We assume the first part is Country because it's a known format for this component.
    // If it's old data, the last part is usually the country. We can do a quick check.
    const firstPartIsCountry = countries.includes(parts[0])
    const lastPartIsCountry = countries.includes(parts[parts.length - 1])
    
    if (firstPartIsCountry) {
      // New format
      country.value = parts[0] || ''
      state.value = parts[1] || ''
      if (country.value === 'Việt Nam' || country.value === 'Vietnam') {
        zip.value = ''
        city.value = parts[2] || ''
        street.value = parts.slice(3).join(', ') || ''
      } else {
        zip.value = parts[2] || ''
        city.value = parts[3] || ''
        street.value = parts.slice(4).join(', ') || ''
      }
    } else if (lastPartIsCountry) {
      // Old format: Street, City, State, Country
      country.value = parts[parts.length - 1] || ''
      state.value = parts[parts.length - 2] || ''
      if (country.value === 'Việt Nam' || country.value === 'Vietnam') {
        zip.value = ''
        city.value = parts[parts.length - 3] || ''
        street.value = parts.slice(0, parts.length - 3).join(', ') || ''
      } else {
        // Zip wasn't present in old format, map backwards
        city.value = parts[parts.length - 3] || ''
        street.value = parts.slice(0, parts.length - 3).join(', ') || ''
        zip.value = '' 
      }
    } else {
      // Unknown format, just dump into street
      country.value = ''
      state.value = ''
      zip.value = ''
      city.value = ''
      street.value = newVal
    }
  }
  
  setTimeout(() => {
    isUpdatingFromProp = false
  }, 0)
}, { immediate: true })

const updateValue = () => {
  isUpdatingFromProp = true
  
  let parts = []
  if (isVietnam.value) {
    parts = [country.value, state.value, city.value, street.value]
  } else {
    parts = [country.value, state.value, zip.value, city.value, street.value]
  }
  
  const value = parts
    .map(part => String(part || '').trim())
    .filter(Boolean)
    .join(', ')
    
  emit('update:modelValue', value)
  
  setTimeout(() => {
    isUpdatingFromProp = false
  }, 0)
}
</script>

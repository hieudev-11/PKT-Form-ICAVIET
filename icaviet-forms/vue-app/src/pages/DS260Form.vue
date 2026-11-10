<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useFormApi } from '@/composables/useFormApi'
import { useFormPersistence } from '@/composables/useFormPersistence'
import { useAssetUrl } from '@/composables/useAssetUrl'

const { getAssetUrl } = useAssetUrl()

// Schema state - s? du?c load t? API
const schema = ref<any>(null)

// Form values state - luu t?t c? gi� tr? ngu?i d�ng nh?p v�o form
const formValues = reactive<Record<string, any>>({})

// Locale state - ng�n ng? hi?n t?i c?a form ('vi' ho?c 'en')
const locale = ref<'vi' | 'en'>('vi')

// Loading state - tr?ng th�i dang load schema t? API
const loadingSchema = ref<boolean>(false)

// Error state - luu th�ng b�o l?i khi load schema th?t b?i
const schemaError = ref<string | null>(null)

// API client - s? d?ng composable d? g?i API
const { getForm, submitForm } = useFormApi()

// Form persistence - s? d?ng composable d? luu/load form data
const { saveFormData, loadFormData, clearFormData } = useFormPersistence()

// Normalize schema t? API v? format gi?ng schema tinh
// Chuy?n d?i t? format { title_en, title_vi } sang { title: { en, vi } }
const normalizeSchema = (apiSchema: any): any => {
  console.log('normalizeSchema called with:', apiSchema)
  
  if (!apiSchema) {
    console.warn('normalizeSchema: apiSchema is null or undefined')
    return null
  }

  // Ki?m tra xem c� sections kh�ng
  if (!apiSchema.sections || !Array.isArray(apiSchema.sections)) {
    console.warn('normalizeSchema: apiSchema.sections is not an array or missing')
    return null
  }

  // N?u schema d� c� format d�ng (title: { en, vi }), return lu�n
  if (apiSchema.sections.length > 0) {
    const firstSection = apiSchema.sections[0]
    if (firstSection.title && typeof firstSection.title === 'object' && ('en' in firstSection.title || 'vi' in firstSection.title)) {
      console.log('normalizeSchema: Schema d� d�ng format, return as is')
      return apiSchema
    }
  }

  // Normalize sections - filter out null/undefined sections
  const normalizedSections = apiSchema.sections
    ?.filter((section: any) => section != null) // Lo?i b? null/undefined
    ?.map((section: any) => {
      const normalizedSection: any = {
        ...section,
        title: section.title_en || section.title_vi 
          ? { en: section.title_en || '', vi: section.title_vi || '' }
          : section.title || ''
      }

      // Normalize groups - filter out null/undefined groups
      normalizedSection.groups = section.groups
        ?.filter((group: any) => group != null) // Lo?i b? null/undefined
        ?.map((group: any) => {
          const normalizedGroup: any = {
            ...group,
            title: group.title_en || group.title_vi
              ? { en: group.title_en || '', vi: group.title_vi || '' }
              : group.title || ''
          }

          // Normalize fields - filter out null/undefined fields
          normalizedGroup.fields = group.fields
            ?.filter((field: any) => field != null) // Lo?i b? null/undefined
            ?.map((field: any) => {
        const normalizedField: any = { ...field }
        
        // Normalize label
        if (field.label_en || field.label_vi) {
          normalizedField.label = {
            en: field.label_en || '',
            vi: field.label_vi || ''
          }
        }
        
        // Normalize placeholder
        if (field.placeholder_en || field.placeholder_vi) {
          normalizedField.placeholder = {
            en: field.placeholder_en || '',
            vi: field.placeholder_vi || ''
          }
        }
        
        // Normalize options
        if (field.options && Array.isArray(field.options)) {
          normalizedField.options = field.options.map((option: any) => {
            if (typeof option === 'object' && (option.label_en || option.label_vi)) {
              return {
                ...option,
                label: {
                  en: option.label_en || option.label || '',
                  vi: option.label_vi || option.label || ''
                }
              }
            }
            return option
          })
        }
        
        // Normalize fields_template (for residence_period_table and similar repeatable fields)
        if (field.fields_template && Array.isArray(field.fields_template)) {
          normalizedField.fields_template = field.fields_template.map((templateField: any) => {
            const normalizedTemplateField: any = { ...templateField }
            
            // Normalize label for template field
            if (templateField.label_en || templateField.label_vi) {
              normalizedTemplateField.label = {
                en: templateField.label_en || '',
                vi: templateField.label_vi || ''
              }
            } else if (!templateField.label || typeof templateField.label === 'string') {
              // N?u label l� string ho?c chua c�, gi? nguy�n ho?c t?o object
              if (templateField.label && typeof templateField.label === 'string') {
                normalizedTemplateField.label = {
                  en: templateField.label,
                  vi: templateField.label
                }
              }
            }
            
            return normalizedTemplateField
          })
        }
        
        // �?m b?o is_repeatable ho?c isRepeatable du?c gi? l?i
        if (field.is_repeatable !== undefined) {
          normalizedField.is_repeatable = field.is_repeatable
        }
        if (field.isRepeatable !== undefined) {
          normalizedField.isRepeatable = field.isRepeatable
        }
        
              return normalizedField
            }) || []
          return normalizedGroup
        }) || []
      return normalizedSection
    }) || []

  return {
    ...apiSchema,
    sections: normalizedSections
  }
}

// Fetch schema from API v?i slug 'DS-260'
const fetchSchema = async () => {
  console.log('fetchSchema called')
  loadingSchema.value = true
  schemaError.value = null

  try {
    console.log('Calling getForm with slug: DS-260, locale:', locale.value)
    // G?i API d? l?y schema v?i slug 'DS-260' v� locale hi?n t?i
    const data = await getForm('DS-260', locale.value)
    console.log('API response received:', data)
    
    // Ki?m tra data c� t?n t?i kh�ng
    if (!data) {
      throw new Error('API trả về dữ liệu rỗng')
    }
    
    // Normalize schema v? format d�ng
    const normalizedData = normalizeSchema(data)
    console.log('Schema sau normalize:', normalizedData)
    console.log('Schema c� sections?', normalizedData?.sections?.length)
    
    // Debug: Ki?m tra fields_template trong residence_period_table
    if (normalizedData?.sections) {
      normalizedData.sections.forEach((section: any) => {
        section.groups?.forEach((group: any) => {
          group.fields?.forEach((field: any) => {
            if (field.type === 'residence_period_table') {
              console.log('Found residence_period_table field:', field.name)
              console.log('fields_template:', field.fields_template)
              console.log('is_repeatable:', field.is_repeatable)
              console.log('isRepeatable:', field.isRepeatable)
            }
          })
        })
      })
    }
    
    // Ki?m tra normalizedData c� h?p l? kh�ng
    if (!normalizedData || !normalizedData.sections || normalizedData.sections.length === 0) {
      throw new Error('Schema không hợp lệ hoặc không có sections')
    }
    
    // Luu schema v�o state
    schema.value = normalizedData
    console.log('Schema d� du?c luu v�o state, schema.value:', schema.value)
  } catch (error: any) {
    console.error('Failed to fetch schema from API:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      error: error
    })
    schemaError.value = error.message || 'Không thể tải schema từ API'
    
    // Clear schema khi c� l?i
    schema.value = null
  } finally {
    console.log('Setting loadingSchema to false')
    loadingSchema.value = false
    console.log('loadingSchema.value:', loadingSchema.value)
  }
}

// Helper function d? check conditional cho field
// Uu ti�n d�ng conditional_logic t? API; fallback sang show_if (legacy)
const shouldShowField = (field: any): boolean => {
  if (!field) return true

  // New conditional_logic t? API
  const logic = field.conditional_logic?.show

  if (logic) {
    const depFieldName = logic.field
    const operator = logic.operator || 'equals'
    const value = logic.value

    const depValue = formValues[depFieldName]

    if (operator === 'contains') {
      // D�ng cho checkbox_group: depValue l� array
      if (!Array.isArray(depValue)) return false
      return depValue.includes(value)
    }

    if (operator === 'equals') {
      return depValue === value
    }

    // Fallback an to�n n?u operator kh�ng h? tr?
    return true
  }

  // Legacy: fallback sang show_if n?u v?n c�n d�ng
  if (field.show_if) {
    const conditions = field.show_if

    for (const [key, value] of Object.entries(conditions)) {
      const fieldValue = formValues[key]

      if (Array.isArray(value)) {
        if (!value.includes(fieldValue)) return false
      } else {
        if (fieldValue !== value) return false
      }
    }
  }

  // Kh�ng c� di?u ki?n ho?c t?t c? di?u ki?n d?u th?a m�n
  return true
}

// Helper function d? check conditional cho section
// Uu ti�n d�ng conditional_logic t? API; fallback sang show_if (legacy)
const shouldShowSection = (section: any): boolean => {
  if (!section) return true

  // New conditional_logic t? API
  const logic = section.conditional_logic?.show

  if (logic) {
    const depFieldName = logic.field
    const operator = logic.operator || 'equals'
    const value = logic.value

    const depValue = formValues[depFieldName]

    // N?u field chua c� gi� tr? (undefined/null/empty), ?n section
    if (depValue === undefined || depValue === null || depValue === '') {
      return false
    }

    switch (operator) {
      case 'equals':
        return depValue === value

      case 'not_equals':
        return depValue !== value

      case 'in':
        // Ki?m tra depValue c� trong array value kh�ng
        if (!Array.isArray(value)) {
          console.warn(`Operator 'in' requires array value, got:`, typeof value)
          return false
        }
        return value.includes(depValue)

      case 'contains':
        // D�ng cho checkbox_group: depValue l� array, ki?m tra c� ch?a value kh�ng
        if (!Array.isArray(depValue)) {
          return false
        }
        if (Array.isArray(value)) {
          // N?u value l� array, ki?m tra c� �t nh?t m?t ph?n t? trong depValue
          return value.some(v => depValue.includes(v))
        }
        return depValue.includes(value)

      default:
        console.warn(`Unknown operator: ${operator}, defaulting to show`)
        return true
    }
  }

  // Legacy: fallback sang show_if n?u v?n c�n d�ng
  if (section.show_if) {
    const conditions = section.show_if

    for (const [key, value] of Object.entries(conditions)) {
      const fieldValue = formValues[key]

      if (Array.isArray(value)) {
        if (!value.includes(fieldValue)) return false
      } else {
        if (fieldValue !== value) return false
      }
    }
  }

  // Kh�ng c� di?u ki?n ho?c t?t c? di?u ki?n d?u th?a m�n
  return true
}

// Helper function d? check conditional cho group
// Uu ti�n d�ng conditional_logic t? API; fallback sang show_if (legacy)
const shouldShowGroup = (group: any): boolean => {
  if (!group) return true

  // Custom logic for ds-260: current_spouse & previous_spouse
  if (group.id === 'current_spouse') {
    const maritalStatus = formValues['maritalStatus']
    return maritalStatus === 'Kết hôn'
  }

  if (group.id === 'previous_spouse') {
    const maritalStatus = formValues['maritalStatus']
    const marriageCount = parseInt(formValues['marriageCount'] || '0', 10)
    
    if (maritalStatus === 'Độc thân (chưa kết hôn lần nào)') {
      return false
    }
    if (maritalStatus === 'Kết hôn') {
      return marriageCount >= 2 && previousMarriagesCount.value >= 1
    }
    if (maritalStatus === 'Góa' || maritalStatus === 'Ly hôn') {
      return previousMarriagesCount.value >= 1
    }
    return false
  }

  if (group.id === 'previous_spouse_2') {
    const maritalStatus = formValues['maritalStatus']
    const marriageCount = parseInt(formValues['marriageCount'] || '0', 10)
    
    if (maritalStatus === 'Độc thân (chưa kết hôn lần nào)') {
      return false
    }
    if (maritalStatus === 'Kết hôn') {
      return marriageCount >= 2 && previousMarriagesCount.value >= 2
    }
    if (maritalStatus === 'Góa' || maritalStatus === 'Ly hôn') {
      return previousMarriagesCount.value >= 2
    }
    return false
  }

  if (group.id === 'previous_spouse_3') {
    const maritalStatus = formValues['maritalStatus']
    const marriageCount = parseInt(formValues['marriageCount'] || '0', 10)
    
    if (maritalStatus === 'Độc thân (chưa kết hôn lần nào)') {
      return false
    }
    if (maritalStatus === 'Kết hôn') {
      return marriageCount >= 2 && previousMarriagesCount.value >= 3
    }
    if (maritalStatus === 'Góa' || maritalStatus === 'Ly hôn') {
      return previousMarriagesCount.value >= 3
    }
    return false
  }

  // New conditional_logic t? API
  const logic = group.conditional_logic?.show

  if (logic) {
    const depFieldName = logic.field
    const operator = logic.operator || 'equals'
    const value = logic.value

    const depValue = formValues[depFieldName]

    if (operator === 'contains') {
      // D�ng cho checkbox_group: depValue l� array
      if (!Array.isArray(depValue)) return false
      return depValue.includes(value)
    }

    if (operator === 'equals') {
      return depValue === value
    }

    // Fallback an to�n n?u operator kh�ng h? tr?
    return true
  }

  // Legacy: fallback sang show_if n?u v?n c�n d�ng
  if (group.show_if) {
    const conditions = group.show_if

    for (const [key, value] of Object.entries(conditions)) {
      const fieldValue = formValues[key]

      if (Array.isArray(value)) {
        if (!value.includes(fieldValue)) return false
      } else {
        if (fieldValue !== value) return false
      }
    }
  }

  // Kh�ng c� di?u ki?n ho?c t?t c? di?u ki?n d?u th?a m�n
  return true
}

// Helper function d? l?y label/text an to�n theo locale
const getLocalizedText = (obj: any, currentLocale: 'vi' | 'en' = locale.value): string => {
  if (!obj) return ''
  
  // N?u l� object c� en/vi
  if (typeof obj === 'object' && ('en' in obj || 'vi' in obj)) {
    return obj[currentLocale] || obj.en || obj.vi || ''
  }
  
  // N?u l� string, return lu�n
  if (typeof obj === 'string') {
    return obj
  }
  
  return ''
}

// Security box translations
const securityBoxTranslations = {
  vi: {
    title: 'Cam kết bảo mật thông tin',
    point1: 'Thông tin bạn cung cấp được mã hóa và lưu trữ an toàn.',
    point2: 'Chỉ chuyên viên ICAVIET phụ trách hồ sơ được quyền truy cập.',
    point3: 'ICAVIET không chia sẻ cho bên thứ ba khi chưa có sự đồng ý của bạn.',
    privacyLink: 'Xem Chính sách bảo mật'
  },
  en: {
    title: 'Privacy & Security Commitment',
    point1: 'Your information is encrypted and stored securely.',
    point2: 'Only ICAVIET specialists assigned to your case have access.',
    point3: 'ICAVIET does not share with third parties without your consent.',
    privacyLink: 'View Privacy Policy'
  }
}

// Track focused input field
const focusedInput = ref<string | null>(null)

// Handle input focus
const handleInputFocus = (fieldName: string) => {
  focusedInput.value = fieldName
}

// Handle input blur
const handleInputBlur = () => {
  focusedInput.value = null
}

// Get input classes with focus highlight, filled state, and error state
const getInputClasses = (fieldName: string, baseClasses: string = 'border rounded px-3 py-2', fieldValue?: any) => {
  const isFocused = focusedInput.value === fieldName
  const hasValue = fieldValue !== undefined && fieldValue !== null && fieldValue !== ''
  
  // Dynamic softening of boxy inputs
  let classes = baseClasses
    .replace('rounded-lg', 'rounded-[5px]')
    .replace('rounded', 'rounded-[5px]')
    .replace('border-gray-300', 'border-[#aabdd7]')
    .replace('border-gray-200', 'border-[#aabdd7]')
    .replace('px-3', 'px-4')
    .replace('py-2', 'py-2.5')
  
  if (!classes.includes('shadow-sm')) classes += ' shadow-sm'
  if (!classes.includes('text-')) classes += ' text-gray-700'
  if (!classes.includes('focus:')) classes += ' focus:outline-none'

  if (isFocused) {
    const strippedClasses = classes.replace('border-[#aabdd7]', '')
    return `${strippedClasses} transition-all bg-blue-50/20 border-blue-500 ring-4 ring-blue-100/50`
  }
  if (hasValue) {
    return `${classes} transition-all bg-blue-50/5 border-[#aabdd7]`
  }
  return `${classes} transition-all bg-white border-[#aabdd7]`
}

const dateDays = Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, '0'))
const dateMonths = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'))
const dateYears = Array.from({ length: new Date().getFullYear() - 1899 }, (_, index) => String(new Date().getFullYear() - index))

type DatePart = 'day' | 'month' | 'year'

const parseDateParts = (value: any): Record<DatePart, string> => {
  const text = String(value || '').trim()
  const emptyParts = { day: '', month: '', year: '' }

  if (!text) return emptyParts

  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (match) {
    return {
      day: String(match[3]).padStart(2, '0'),
      month: String(match[2]).padStart(2, '0'),
      year: match[1]
    }
  }

  match = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (match) {
    return {
      day: String(match[1]).padStart(2, '0'),
      month: String(match[2]).padStart(2, '0'),
      year: match[3]
    }
  }

  const parts = text.split('/').map(part => part.trim())
  return {
    day: parts[0] || '',
    month: parts[1] || '',
    year: parts[2] || ''
  }
}

const formatDateParts = (parts: Record<DatePart, string>) => {
  if (!parts.day && !parts.month && !parts.year) return ''
  return [parts.day, parts.month, parts.year].join('/')
}

const getDatePart = (value: any, part: DatePart) => parseDateParts(value)[part]

const setDatePart = (fieldName: string, part: DatePart, value: string) => {
  const parts = parseDateParts(formValues[fieldName])
  parts[part] = value
  formValues[fieldName] = formatDateParts(parts)
}

const setPeriodDatePart = (period: any, fieldName: string, part: DatePart, value: string) => {
  const parts = parseDateParts(period[fieldName])
  parts[part] = value
  period[fieldName] = formatDateParts(parts)
}

const splitCompositeValue = (value: any, length: number) => {
  const parts = String(value || '')
    .split(',')
    .map(part => part.trim())

  const normalized = Array.from({ length }, (_, index) => parts[index] || '')
  if (parts.length > length) {
    normalized[length - 1] = parts.slice(length - 1).join(', ')
  }
  return normalized
}

const getCompositePart = (value: any, index: number, length: number) => {
  return splitCompositeValue(value, length)[index] || ''
}

const setCompositePart = (fieldName: string, index: number, length: number, value: string) => {
  const parts = splitCompositeValue(formValues[fieldName], length)
  parts[index] = value
  const trimmedParts = parts.map(part => String(part || '').trim())
  while (trimmedParts.length && !trimmedParts[trimmedParts.length - 1]) {
    trimmedParts.pop()
  }
  formValues[fieldName] = trimmedParts.join(', ')
}

const getBirthPlacePartLabel = (index: number) => {
  const labels = locale.value === 'vi'
    ? ['Huyện/thành phố', 'Tỉnh', 'Quốc gia']
    : ['District/City', 'Province/State', 'Country']
  return labels[index] || ''
}

const usAddressFieldNames = ['plannedAddressUS', 'greenCardAddressUS', 'sponsorAddress']

const getAddressPartSuffixes = (fieldName: string) => {
  return usAddressFieldNames.includes(fieldName)
    ? ['Street', 'City', 'State', 'Zip', 'Country']
    : ['Street', 'City', 'Province', 'Zip', 'Country']
}

const getAddressPartFieldName = (fieldName: string, index: number) => {
  return `${fieldName}${getAddressPartSuffixes(fieldName)[index] || ''}`
}

const isRequiredAddressPart = (field: any, index: number) => {
  if (!field?.required) return false

  const suffix = getAddressPartSuffixes(field.name)[index]

  // Rieng dia chi hien tai DS-260: chi bat buoc Quoc gia.
  // Cac o con lai van giu dau * do o tieu de cum dia chi de nguoi dung chu y,
  // nhung khong chan submit neu bo trong.
  if (field.name === 'currentAddressVN') {
    return suffix === 'Country'
  }

  return suffix !== 'Zip'
}

const getAddressPartLabel = (fieldName: string, index: number) => {
  const isUSAddress = usAddressFieldNames.includes(fieldName)
  const labels = locale.value === 'vi'
    ? (isUSAddress
      ? ['Số nhà/đường', 'Huyện/thành phố', 'Tỉnh/bang', 'Mã zip', 'Quốc gia']
      : ['Số nhà/đường/xã/phường/quận', 'Huyện/thành phố', 'Tỉnh', 'Mã zip', 'Quốc gia'])
    : (isUSAddress
      ? ['Street Address', 'City', 'State', 'Zip Code', 'Country']
      : ['Street/Ward/District', 'District/City', 'Province/State', 'Zip Code', 'Country'])
  return labels[index] || ''
}

const getAddressPartValue = (fieldName: string, index: number) => {
  const partFieldName = getAddressPartFieldName(fieldName, index)
  const directValue = formValues[partFieldName]
  if (directValue !== undefined && directValue !== null && String(directValue).trim() !== '') {
    return directValue
  }

  // Fallback only for old saved data that was stored as one comma-separated address string.
  // New submissions are saved into individual fields and do not update the old combined field.
  const legacyLength = usAddressFieldNames.includes(fieldName) ? 5 : 4
  const legacyParts = splitCompositeValue(formValues[fieldName], legacyLength)
  if (legacyLength === 4) {
    if (index === 3) return ''
    if (index === 4) return legacyParts[3] || ''
  }
  return legacyParts[index] || ''
}

const setAddressPartValue = (fieldName: string, index: number, value: string) => {
  formValues[getAddressPartFieldName(fieldName, index)] = value
}

const isCompleteCompositeField = (field: any) => {
  if (!field?.required) return true
  if (field.type === 'date_parts') {
    const parts = parseDateParts(formValues[field.name])
    return Boolean(parts.day && parts.month && parts.year)
  }
  if (field.type === 'birth_place_parts') {
    return splitCompositeValue(formValues[field.name], 3).every(Boolean)
  }
  if (field.type === 'address_parts') {
    return getAddressPartSuffixes(field.name).every((suffix, index) => {
      if (field.name === 'currentAddressVN') {
        return suffix === 'Country'
          ? Boolean(String(getAddressPartValue(field.name, index) || '').trim())
          : true
      }

      if (suffix === 'Zip') return true
      return Boolean(String(getAddressPartValue(field.name, index) || '').trim())
    })
  }
  return formValues[field.name] !== undefined && formValues[field.name] !== null && String(formValues[field.name]).trim() !== ''
}

const getMissingAddressPartLabels = (field: any) => {
  if (!field || field.type !== 'address_parts') return []

  return getAddressPartSuffixes(field.name)
    .map((suffix, index) => {
      if (field.name === 'currentAddressVN' && suffix !== 'Country') return ''
      if (suffix === 'Zip') return ''
      const value = String(getAddressPartValue(field.name, index) || '').trim()
      return value ? '' : getAddressPartLabel(field.name, index)
    })
    .filter(Boolean)
}

const getRequiredFieldErrors = () => {
  const errors: string[] = []

  if (!schema.value?.sections) return errors

  for (const section of schema.value.sections || []) {
    if (!shouldShowSection(section)) continue
    for (const group of section.groups || []) {
      if (!shouldShowGroup(group)) continue
      for (const field of group.fields || []) {
        if (!field?.required || !shouldShowField(field) || isCompleteCompositeField(field)) continue
        const label = getLocalizedText(field.label, locale.value) || field.name

        if (field.type === 'address_parts') {
          const missingParts = getMissingAddressPartLabels(field)
          const missingText = missingParts.join(', ')
          errors.push(locale.value === 'vi'
            ? `${label} còn thiếu: ${missingText}. Mã zip/mã bưu điện không bắt buộc.`
            : `${label} is missing: ${missingText}. Zip code is optional.`)
          continue
        }

        errors.push(locale.value === 'vi' ? `Vui lòng điền đầy đủ: ${label}` : `Please complete: ${label}`)
      }
    }
  }

  return errors
}

// ===== Checkbox Group Functions =====
// Ki?m tra checkbox c� du?c ch?n kh�ng
const isCheckboxSelected = (fieldName: string, value: string): boolean => {
  const fieldValue = formValues[fieldName]
  if (Array.isArray(fieldValue)) {
    return fieldValue.includes(value)
  }
  return false
}

// Toggle checkbox (th�m/x�a gi� tr? trong array)
const toggleCheckbox = (fieldName: string, value: string) => {
  if (!formValues[fieldName]) {
    formValues[fieldName] = []
  }
  const currentValues = formValues[fieldName] || []
  const index = currentValues.indexOf(value)
  
  if (index > -1) {
    // N?u d� c�, x�a kh?i array
    currentValues.splice(index, 1)
  } else {
    // N?u chua c�, th�m v�o array
    currentValues.push(value)
  }
  
  // T?o array m?i d? trigger reactivity
  formValues[fieldName] = [...currentValues]
}

// ===== Residence Period Table Functions =====
// T�m field theo t�n trong schema
const findFieldByName = (fieldName: string): any => {
  if (!schema.value) return null
  
  for (const section of schema.value.sections || []) {
    for (const group of section.groups || []) {
      for (const field of group.fields || []) {
        if (field.name === fieldName) {
          return field
        }
      }
    }
  }
  return null
}

// Th�m residence period m?i
const addResidencePeriod = (fieldName: string) => {
  if (!formValues[fieldName]) {
    formValues[fieldName] = []
  }
  
  const field = findFieldByName(fieldName)
  if (!field || !field.fields_template) return
  
  // T?o object m?i v?i c�c field t? template
  const newPeriod: Record<string, any> = {}
  field.fields_template.forEach((templateField: any) => {
    newPeriod[templateField.name] = ''
  })
  
  formValues[fieldName].push(newPeriod)
}

// X�a residence period
const removeResidencePeriod = (fieldName: string, index: number) => {
  if (formValues[fieldName] && Array.isArray(formValues[fieldName])) {
    formValues[fieldName].splice(index, 1)
  }
}

// ===== Previous Spouse Dynamic Buttons Functions =====
const previousMarriagesCount = ref(1)

const isPreviousSpouseGroup = (id: string): boolean => {
  return ['previous_spouse', 'previous_spouse_2', 'previous_spouse_3'].includes(id)
}

const getActiveLastPreviousSpouseGroupId = (): string => {
  if (previousMarriagesCount.value === 1) return 'previous_spouse'
  if (previousMarriagesCount.value === 2) return 'previous_spouse_2'
  return 'previous_spouse_3'
}

const canAddPreviousSpouse = (id: string): boolean => {
  return id === getActiveLastPreviousSpouseGroupId() && previousMarriagesCount.value < 3
}

const canDeletePreviousSpouse = (id: string): boolean => {
  return id === getActiveLastPreviousSpouseGroupId() && previousMarriagesCount.value > 1
}

const addPreviousMarriage = () => {
  if (previousMarriagesCount.value < 3) {
    previousMarriagesCount.value++
  }
}

const deleteLastPreviousMarriage = () => {
  if (previousMarriagesCount.value > 1) {
    const lastIndex = previousMarriagesCount.value
    // Clear values of the last group being removed
    const suffix = lastIndex === 2 ? '_2' : '_3'
    const fieldsToClear = [
      `previousSpouseLastName${suffix}`,
      `previousSpouseMiddleName${suffix}`,
      `previousSpouseFirstName${suffix}`,
      `previousSpouseBirthDate${suffix}`,
      `previousSpouseBirthPlace${suffix}`,
      `previousMarriageDate${suffix}`,
      `divorceDate${suffix}`,
      `previousMarriagePlace${suffix}`,
      `divorcePlace${suffix}`
    ]
    fieldsToClear.forEach(field => {
      delete formValues[field]
    })
    previousMarriagesCount.value--
  }
}

// ===== Signature Functions =====
// Signature canvas state
const isDrawing = ref(false)

// Initialize signature canvas
const initSignatureCanvas = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
}

// Handle signature mouse down
const handleSignatureMouseDown = (event: MouseEvent, canvas: HTMLCanvasElement) => {
  isDrawing.value = true
  const rect = canvas.getBoundingClientRect()
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  ctx.beginPath()
  ctx.moveTo((event.clientX - rect.left) * scaleX, (event.clientY - rect.top) * scaleY)
}

// Handle signature mouse move
const handleSignatureMouseMove = (event: MouseEvent, canvas: HTMLCanvasElement) => {
  if (!isDrawing.value) return
  
  const rect = canvas.getBoundingClientRect()
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  ctx.lineTo((event.clientX - rect.left) * scaleX, (event.clientY - rect.top) * scaleY)
  ctx.stroke()
}

// Handle signature mouse up
const handleSignatureMouseUp = (canvas: HTMLCanvasElement, fieldName: string) => {
  if (!isDrawing.value) return
  isDrawing.value = false
  
  // Save signature as base64
  const dataURL = canvas.toDataURL('image/png')
  formValues[fieldName] = dataURL
  formValues['declarantSignature'] = dataURL
}

// Handle signature touch start (for mobile)
const handleSignatureTouchStart = (event: TouchEvent, canvas: HTMLCanvasElement) => {
  event.preventDefault() // Prevent scrolling when drawing
  isDrawing.value = true
  const rect = canvas.getBoundingClientRect()
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  const touch = event.touches[0]
  if (!touch) return
  
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  ctx.beginPath()
  ctx.moveTo((touch.clientX - rect.left) * scaleX, (touch.clientY - rect.top) * scaleY)
}

// Handle signature touch move (for mobile)
const handleSignatureTouchMove = (event: TouchEvent, canvas: HTMLCanvasElement) => {
  event.preventDefault() // Prevent scrolling when drawing
  if (!isDrawing.value) return
  
  const rect = canvas.getBoundingClientRect()
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  const touch = event.touches[0]
  if (!touch) return
  
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  ctx.lineTo((touch.clientX - rect.left) * scaleX, (touch.clientY - rect.top) * scaleY)
  ctx.stroke()
}

// Handle signature touch end (for mobile)
const handleSignatureTouchEnd = (event: TouchEvent, canvas: HTMLCanvasElement, fieldName: string) => {
  event.preventDefault()
  if (!isDrawing.value) return
  isDrawing.value = false
  
  // Save signature as base64
  const dataURL = canvas.toDataURL('image/png')
  formValues[fieldName] = dataURL
  formValues['declarantSignature'] = dataURL
}

// Clear signature
const clearSignature = (fieldName: string) => {
  if (typeof window === 'undefined') return
  const canvas = window.document.getElementById(`signature-${fieldName}`) as HTMLCanvasElement
  if (!canvas) return
  
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  formValues[fieldName] = ''
  if (fieldName === 'applicantSignature') {
    formValues['declarantSignature'] = ''
  }
}

const handleInputValidation = (field: any, templateField: any, period: any, event: Event) => {
  if (field.name === 'countriesVisited5YearsList' && templateField.name === 'countryName') {
    const input = event.target as HTMLInputElement
    const val = input.value
    if (val.includes(',') || val.includes('.')) {
      alert(locale.value === 'vi' ? 'Mỗi ô chỉ được điền một quốc gia' : 'Each box can only enter one country')
      period[templateField.name] = val.replace(/[,.]/g, '')
    }
  }
}

// ===== Grid layout helpers =====
// T�nh CSS variables cho group, d�ng cho grid tr�n PC (desktop)
const getGroupGridStyle = (group: any) => {
  const colsRaw = group?.grid_cols
  const colsNumber = typeof colsRaw === 'number' ? colsRaw : parseInt(colsRaw ?? '0', 10)
  const cols = colsNumber && colsNumber > 0 ? colsNumber : 1

  return {
    '--group-cols': cols
  }
}

// T�nh CSS variables cho field, d�ng cho grid-column tr�n PC
const getFieldGridStyle = (field: any) => {
  const spanRaw = field?.col_span
  const spanNumber = typeof spanRaw === 'number' ? spanRaw : parseInt(spanRaw ?? '0', 10)
  const span = spanNumber && spanNumber > 0 ? spanNumber : 1

  return {
    '--field-span': span
  }
}

// Flag d? tr�nh watch(locale) trigger khi dang restore d? li?u
const isRestoringData = ref(false)

// Load d? li?u d� luu v� fetch schema khi component mounts
onMounted(async () => {
  // Load d? li?u d� luu t? localStorage v?i formSlug 'DS-260' (n?u c�)
  const savedData = loadFormData('DS-260')
  if (savedData) {
    console.log('Restoring saved data:', savedData)
    isRestoringData.value = true
    
    // Restore locale (watch s? kh�ng trigger v� isRestoringData = true)
    locale.value = savedData.locale
    
    // Restore form values
    Object.assign(formValues, savedData.formValues)
    
    // Restore previousPhonesList from saved formValues
    if (formValues.previousPhones) {
      previousPhonesList.value = String(formValues.previousPhones)
        .split(',')
        .map(p => p.trim())
        .filter(Boolean)
      if (previousPhonesList.value.length === 0) {
        previousPhonesList.value = ['']
      }
    }
    
    // Restore previousEmailsList from saved formValues
    if (formValues.previousEmails) {
      previousEmailsList.value = String(formValues.previousEmails)
        .split(',')
        .map(e => e.trim())
        .filter(Boolean)
      if (previousEmailsList.value.length === 0) {
        previousEmailsList.value = ['']
      }
    }

    // Restore socialNetworksList from saved formValues.listSocialNetworks
    if (formValues.listSocialNetworks) {
      const items = String(formValues.listSocialNetworks).split(',').map(i => i.trim()).filter(Boolean)
      const parsed = items.map(item => {
        const parts = item.split(':')
        if (parts.length >= 2) {
          return { platform: parts[0].trim(), link: parts.slice(1).join(':').trim() }
        }
        return { platform: item, link: '' }
      })
      socialNetworksList.value = parsed.length ? parsed : [{ platform: '', link: '' }]
    }

    // Restore foreignCountriesList from saved formValues.foreignCountriesList
    if (formValues.foreignCountriesList) {
      foreignCountriesList.value = String(formValues.foreignCountriesList)
        .split(',')
        .map(c => c.trim())
        .filter(Boolean)
      if (foreignCountriesList.value.length === 0) {
        foreignCountriesList.value = ['']
      }
    }

    // Restore childrenList from saved structured data first.
    // childrenInfo / childrenInfoJson is the new stable format for PKT mapping.
    // listChildrenInfo is only kept as legacy display/fallback text.
    childrenList.value = getRestoredChildrenList()

    // Restore usArrivalsList from saved formValues.usArrivalsList
    if (formValues.usArrivalsList) {
      const lines = String(formValues.usArrivalsList)
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
      
      const parsed = lines.map(line => {
        const parts = line.split(' - ').map(p => p.trim())
        if (parts.length >= 2) {
          const datePart = parts.find(p => p.startsWith('Ngày đến:'))
          const arrivalDate = datePart ? datePart.replace('Ngày đến:', '').trim() : ''
          
          const durPart = parts.find(p => p.startsWith('Thời gian ở:'))
          let stayDurationVal = ''
          let stayDurationUnit = 'Ngày'
          if (durPart) {
            const durStr = durPart.replace('Thời gian ở:', '').trim()
            const match = durStr.match(/^(\d+)\s+(.+)$/)
            if (match) {
              stayDurationVal = match[1]
              stayDurationUnit = match[2]
            } else {
              stayDurationVal = durStr
            }
          }
          
          return { arrivalDate, stayDurationVal, stayDurationUnit }
        } else {
          return {
            arrivalDate: '',
            stayDurationVal: '',
            stayDurationUnit: 'Ngày'
          }
        }
      })
      
      usArrivalsList.value = parsed.length ? parsed : [{ arrivalDate: '', stayDurationVal: '', stayDurationUnit: 'Ngày' }]
    } else {
      usArrivalsList.value = [{ arrivalDate: '', stayDurationVal: '', stayDurationUnit: 'Ngày' }]
    }

    // Auto-detect fatherIsAlive and motherIsAlive based on existing draft values
    if (formValues.fatherCurrentAddress) {
      formValues.fatherIsAlive = 'Còn sống'
    } else if (formValues.fatherDeathYear) {
      formValues.fatherIsAlive = 'Đã mất'
    }

    if (formValues.motherCurrentAddress) {
      formValues.motherIsAlive = 'Còn sống'
    } else if (formValues.motherDeathYear) {
      formValues.motherIsAlive = 'Đã mất'
    }

    // Restore fatherFullName split parts
    if (formValues.fatherFullName) {
      const words = String(formValues.fatherFullName).split(/\s+/).filter(Boolean)
      if (words.length === 1) {
        fatherNameParts.lastName = words[0]
      } else if (words.length === 2) {
        fatherNameParts.lastName = words[0]
        fatherNameParts.firstName = words[1]
      } else if (words.length > 2) {
        fatherNameParts.lastName = words[0]
        fatherNameParts.middleName = words.slice(1, -1).join(' ')
        fatherNameParts.firstName = words[words.length - 1]
      }
    }

    // Restore motherFullName split parts
    if (formValues.motherFullName) {
      const words = String(formValues.motherFullName).split(/\s+/).filter(Boolean)
      if (words.length === 1) {
        motherNameParts.lastName = words[0]
      } else if (words.length === 2) {
        motherNameParts.lastName = words[0]
        motherNameParts.firstName = words[1]
      } else if (words.length > 2) {
        motherNameParts.lastName = words[0]
        motherNameParts.middleName = words.slice(1, -1).join(' ')
        motherNameParts.firstName = words[words.length - 1]
      }
    }

    // Restore sponsorFullName split parts
    if (formValues.sponsorFullName) {
      const words = String(formValues.sponsorFullName).split(/\s+/).filter(Boolean)
      if (words.length === 1) {
        sponsorNameParts.lastName = words[0]
      } else if (words.length === 2) {
        sponsorNameParts.lastName = words[0]
        sponsorNameParts.firstName = words[1]
      } else if (words.length > 2) {
        sponsorNameParts.lastName = words[0]
        sponsorNameParts.middleName = words.slice(1, -1).join(' ')
        sponsorNameParts.firstName = words[words.length - 1]
      }
    }

    // Restore contactNameUS split parts
    if (formValues.contactNameUS) {
      const words = String(formValues.contactNameUS).split(/\s+/).filter(Boolean)
      if (words.length === 1) {
        contactNameParts.lastName = words[0]
      } else if (words.length === 2) {
        contactNameParts.lastName = words[0]
        contactNameParts.firstName = words[1]
      } else if (words.length > 2) {
        contactNameParts.lastName = words[0]
        contactNameParts.middleName = words.slice(1, -1).join(' ')
        contactNameParts.firstName = words[words.length - 1]
      }
    }

    // Restore alternateContactNameUS split parts
    if (formValues.alternateContactNameUS) {
      const words = String(formValues.alternateContactNameUS).split(/\s+/).filter(Boolean)
      if (words.length === 1) {
        alternateContactNameParts.lastName = words[0]
      } else if (words.length === 2) {
        alternateContactNameParts.lastName = words[0]
        alternateContactNameParts.firstName = words[1]
      } else if (words.length > 2) {
        alternateContactNameParts.lastName = words[0]
        alternateContactNameParts.middleName = words.slice(1, -1).join(' ')
        alternateContactNameParts.firstName = words[words.length - 1]
      }
    }

    // Restore applicantFullName split parts
    if (formValues.applicantFullName) {
      const words = String(formValues.applicantFullName).split(/\s+/).filter(Boolean)
      if (words.length === 1) {
        applicantSignNameParts.lastName = words[0]
      } else if (words.length === 2) {
        applicantSignNameParts.lastName = words[0]
        applicantSignNameParts.firstName = words[1]
      } else if (words.length > 2) {
        applicantSignNameParts.lastName = words[0]
        applicantSignNameParts.middleName = words.slice(1, -1).join(' ')
        applicantSignNameParts.firstName = words[words.length - 1]
      }
    }

    // Auto-detect previousMarriagesCount based on saved form values
    let restoredCount = 1
    const p3Fields = [
      'previousSpouseLastName_3', 'previousSpouseMiddleName_3', 'previousSpouseFirstName_3',
      'previousSpouseBirthDate_3', 'previousSpouseBirthPlace_3', 'previousMarriageDate_3',
      'divorceDate_3', 'previousMarriagePlace_3', 'divorcePlace_3'
    ]
    const p2Fields = [
      'previousSpouseLastName_2', 'previousSpouseMiddleName_2', 'previousSpouseFirstName_2',
      'previousSpouseBirthDate_2', 'previousSpouseBirthPlace_2', 'previousMarriageDate_2',
      'divorceDate_2', 'previousMarriagePlace_2', 'divorcePlace_2'
    ]
    if (p3Fields.some(field => formValues[field])) {
      restoredCount = 3
    } else if (p2Fields.some(field => formValues[field])) {
      restoredCount = 2
    }
    previousMarriagesCount.value = restoredCount

    console.log('Form values after restore:', { ...formValues })
    
    // Fetch schema sau khi restore d? li?u
    await fetchSchema()
    
    console.log('Form values after fetchSchema:', { ...formValues })
    isRestoringData.value = false
  } else {
    // Khng c d? li?u d luu, kh?i t?o m?i
    await fetchSchema()
  }

  if (formValues.isMailingSameAsCurrent === undefined) {
    formValues.isMailingSameAsCurrent = 'Có'
  }

  if (formValues.isGreenCardAddressSameAsPlanned === undefined) {
    formValues.isGreenCardAddressSameAsPlanned = 'Có'
  }

  if (formValues.hasVisitedOtherCountries5Years === undefined) {
    formValues.hasVisitedOtherCountries5Years = 'Chưa từng'
  }

  // Khởi tạo mặc định 1 dòng cho residenceHistory nếu chưa có dữ liệu hoặc danh sách rỗng
  if (!formValues.residenceHistory || !Array.isArray(formValues.residenceHistory) || formValues.residenceHistory.length === 0) {
    addResidencePeriod('residenceHistory')
  }

  // Khởi tạo mặc định 1 dòng cho jobsTenYears nếu chưa có dữ liệu hoặc danh sách rỗng
  if (!formValues.jobsTenYears || !Array.isArray(formValues.jobsTenYears) || formValues.jobsTenYears.length === 0) {
    addResidencePeriod('jobsTenYears')
  }

  if (formValues.hasPreviousJobs === undefined) {
    formValues.hasPreviousJobs = 'Không'
  }

  if (formValues.hasPreviousJobs === 'Có') {
    if (!formValues.previousJobs || !Array.isArray(formValues.previousJobs) || formValues.previousJobs.length === 0) {
      addResidencePeriod('previousJobs')
    }
  }

  // Khởi tạo mặc định 1 dòng cho schoolList nếu chưa có dữ liệu hoặc danh sách rỗng
  if (!formValues.schoolList || !Array.isArray(formValues.schoolList) || formValues.schoolList.length === 0) {
    addResidencePeriod('schoolList')
  }
})

// Luu form data khi locale thay d?i
watch(locale, () => {
  // B? qua n?u dang restore d? li?u
  if (isRestoringData.value) return
  
  // Reload schema v?i locale m?i
  fetchSchema()
  
  // Luu ngay khi d?i locale (kh�ng debounce)
  saveFormData(formValues, locale.value, 'DS-260')
})

// Auto-save form values to localStorage v?i debounce khi user nh?p
let saveTimeout: ReturnType<typeof setTimeout> | null = null
let isInitialMount = true

watch(
  () => formValues,
  () => {
    // B? qua l?n d?u mount (khi formValues du?c kh?i t?o)
    if (isInitialMount) {
      isInitialMount = false
      console.log('Skipping save: initial mount')
      return
    }
    
    // B? qua n?u dang restore d? li?u
    if (isRestoringData.value) {
      console.log('Skipping save: currently restoring data')
      return
    }
    
    // Clear timeout cu n?u c�
    if (saveTimeout) {
      clearTimeout(saveTimeout)
    }
    
    // Debounce: ch? luu sau 500ms khi user ng?ng nh?p
    saveTimeout = setTimeout(() => {
      console.log('Auto-saving form data to localStorage', {
        formValuesKeys: Object.keys(formValues),
        hasData: Object.keys(formValues).length > 0
      })
      saveFormData(formValues, locale.value, 'DS-260')
    }, 500)
  },
  { deep: true, flush: 'post' }
)

// Watch name parts to construct fullName
watch(
  () => [formValues.lastName, formValues.middleName, formValues.firstName],
  ([last, middle, first]) => {
    const lastName = String(last || '').trim()
    const middleName = String(middle || '').trim()
    const firstName = String(first || '').trim()
    formValues.fullName = [lastName, middleName, firstName].filter(Boolean).join(' ')
  }
)

watch(
  () => formValues.hasVisitedOtherCountries5Years,
  (val) => {
    if (val === 'Đã từng') {
      if (!formValues.countriesVisited5YearsList || !Array.isArray(formValues.countriesVisited5YearsList) || formValues.countriesVisited5YearsList.length === 0) {
        addResidencePeriod('countriesVisited5YearsList')
      }
    }
  }
)

// Chon "Co" thi hien luon 1 dong nhap trong, khong bat nguoi dung bam "+ Them" truoc
watch(
  () => formValues.hasSiblings,
  (val) => {
    if (val === 'Có') {
      if (!formValues.siblingsList || !Array.isArray(formValues.siblingsList) || formValues.siblingsList.length === 0) {
        addResidencePeriod('siblingsList')
      }
    }
  }
)

watch(
  () => formValues.hasOtherPassports15Years,
  (val) => {
    if (val === 'Có') {
      if (!formValues.otherPassports15YearsList || !Array.isArray(formValues.otherPassports15YearsList) || formValues.otherPassports15YearsList.length === 0) {
        addResidencePeriod('otherPassports15YearsList')
      }
    }
  }
)

watch(
  () => formValues.enteredUSBefore,
  (val) => {
    if (val === 'Chưa từng') {
      formValues.hasANumber = ''
      formValues.aNumber = ''
      usArrivalsList.value = [{ arrivalDate: '', stayDurationVal: '', stayDurationUnit: 'Ngày' }]
      syncUsArrivals()
    }
  }
)

watch(
  () => formValues.hasANumber,
  (val) => {
    if (val === 'Chưa từng') {
      formValues.aNumber = ''
      usArrivalsList.value = [{ arrivalDate: '', stayDurationVal: '', stayDurationUnit: 'Ngày' }]
      syncUsArrivals()
    } else if (val === 'Đã từng') {
      if (!usArrivalsList.value || usArrivalsList.value.length === 0) {
        usArrivalsList.value = [{ arrivalDate: '', stayDurationVal: '', stayDurationUnit: 'Ngày' }]
      }
      syncUsArrivals()
    }
  }
)

watch(
  () => formValues.hasBeenIssuedUSVisa,
  (val) => {
    if (val === 'Chưa từng') {
      formValues.issuedUSVisaNumber = ''
      formValues.issuedUSVisaClass = ''
      formValues.issuedUSVisaDate = ''
    }
  }
)

watch(
  () => formValues.hasPreviousJobs,
  (val) => {
    if (val === 'Có') {
      if (!formValues.previousJobs || !Array.isArray(formValues.previousJobs) || formValues.previousJobs.length === 0) {
        addResidencePeriod('previousJobs')
      }
    } else if (val === 'Không') {
      formValues.previousJobs = []
    }
  }
)

watch(
  () => formValues.communistPartyMember,
  (val) => {
    if (val === 'Không') {
      formValues.partyJoinDate = ''
      formValues.partyLeaveDate = ''
      formValues.partyRole = ''
      formValues.partyLeaveReason = ''
    }
  }
)

const isNameField = (name: string) => ['lastName', 'middleName', 'firstName', 'otherLastName', 'otherMiddleName', 'otherFirstName'].includes(name)

const getLocalizedNameLabel = (fieldName: string): string => {
  const viLabels: Record<string, string> = {
    lastName: 'Họ',
    middleName: 'Tên lót',
    firstName: 'Tên',
    otherLastName: 'Họ',
    otherMiddleName: 'Tên lót',
    otherFirstName: 'Tên'
  }
  const enLabels: Record<string, string> = {
    lastName: 'Last Name',
    middleName: 'Middle Name',
    firstName: 'First Name',
    otherLastName: 'Other Last Name',
    otherMiddleName: 'Other Middle Name',
    otherFirstName: 'Other First Name'
  }
  return locale.value === 'vi' ? viLabels[fieldName] : enLabels[fieldName]
}

const previousPhonesList = ref<string[]>([''])

const socialNetworksList = ref<{ platform: string, link: string }[]>([{ platform: '', link: '' }])

const syncSocialNetworks = () => {
  const filtered = socialNetworksList.value
    .filter(item => item.platform.trim() || item.link.trim())
  formValues.listSocialNetworks = filtered
    .map(item => {
      const plat = item.platform.trim()
      const lnk = item.link.trim()
      if (plat && lnk) return `${plat}: ${lnk}`
      return plat || lnk
    })
    .join(', ')
}

const addSocialNetwork = () => {
  socialNetworksList.value.push({ platform: '', link: '' })
  syncSocialNetworks()
}

const removeSocialNetwork = (index: number) => {
  if (socialNetworksList.value.length > 1) {
    socialNetworksList.value.splice(index, 1)
    syncSocialNetworks()
  }
}

const foreignCountriesList = ref<string[]>([''])

const syncForeignCountries = () => {
  const filtered = foreignCountriesList.value
    .map(c => c.trim())
    .filter(Boolean)
  formValues.foreignCountriesList = filtered.join(', ')
}

const addForeignCountry = () => {
  foreignCountriesList.value.push('')
  syncForeignCountries()
}

const removeForeignCountry = (index: number) => {
  if (foreignCountriesList.value.length > 1) {
    foreignCountriesList.value.splice(index, 1)
    syncForeignCountries()
  }
}

const syncPreviousPhones = () => {
  const filtered = previousPhonesList.value
    .map(p => p.trim())
    .filter(Boolean)
  formValues.previousPhones = filtered.join(', ')
}

const handlePrevPhoneInput = (pIndex: number, event: Event) => {
  const inputEl = event.target as HTMLInputElement
  let value = inputEl.value
  
  // Keep only digits
  const digits = value.replace(/\D/g, '')
  
  if (digits.length >= 15) {
    alert(locale.value === 'vi' 
      ? 'Vui lòng click vào nút thêm số điện thoại bên dưới' 
      : 'Please click the add phone number button below'
    )
    previousPhonesList.value[pIndex] = digits.slice(0, 14)
    inputEl.value = digits.slice(0, 14)
  } else {
    previousPhonesList.value[pIndex] = digits
    inputEl.value = digits
  }
  
  syncPreviousPhones()
}

const addPrevPhone = () => {
  previousPhonesList.value.push('')
  syncPreviousPhones()
}

const removePrevPhone = (index: number) => {
  if (previousPhonesList.value.length > 1) {
    previousPhonesList.value.splice(index, 1)
    syncPreviousPhones()
  }
}

const previousEmailsList = ref<string[]>([''])

const syncPreviousEmails = () => {
  const filtered = previousEmailsList.value
    .map(e => e.trim())
    .filter(Boolean)
  formValues.previousEmails = filtered.join(', ')
}

const addPrevEmail = () => {
  previousEmailsList.value.push('')
  syncPreviousEmails()
}

const removePrevEmail = (index: number) => {
  if (previousEmailsList.value.length > 1) {
    previousEmailsList.value.splice(index, 1)
    syncPreviousEmails()
  }
}

// ===== Children Info Custom State & Methods =====
const childrenList = ref<{
  lastName: string,
  middleName: string,
  firstName: string,
  birthDate: string,
  city: string,
  province: string,
  country: string,
  isLivingWithYou: string,
  addressStreet: string,
  addressCity: string,
  addressProvince: string,
  addressZipCode: string,
  addressCountry: string,
  isImmigratingWithYou: string,
  isImmigratingLater: string
}[]>([
  { 
    lastName: '', middleName: '', firstName: '', birthDate: '', city: '', province: '', country: '', 
    isLivingWithYou: '', addressStreet: '', addressCity: '', addressProvince: '', addressZipCode: '', addressCountry: '',
    isImmigratingWithYou: '', isImmigratingLater: ''
  }
])

const createEmptyChildInfo = () => ({
  lastName: '',
  middleName: '',
  firstName: '',
  birthDate: '',
  city: '',
  province: '',
  country: '',
  isLivingWithYou: '',
  addressStreet: '',
  addressCity: '',
  addressProvince: '',
  addressZipCode: '',
  addressCountry: '',
  isImmigratingWithYou: '',
  isImmigratingLater: ''
})

const splitChildFullName = (fullName: string) => {
  const words = String(fullName || '').split(/\s+/).filter(Boolean)
  if (words.length === 1) return { lastName: words[0], middleName: '', firstName: '' }
  if (words.length === 2) return { lastName: words[0], middleName: '', firstName: words[1] }
  if (words.length > 2) {
    return {
      lastName: words[0],
      middleName: words.slice(1, -1).join(' '),
      firstName: words[words.length - 1]
    }
  }
  return { lastName: '', middleName: '', firstName: '' }
}

const normalizeChildInfoRecord = (raw: any) => {
  const item = raw && typeof raw === 'object' ? raw : {}
  const nameParts = splitChildFullName(item.fullName || item.childFullName || item.name || '')
  const birthPlace = item.birthPlace || item.childBirthPlace || {}
  const address = item.address || item.currentAddress || item.childCurrentAddress || {}

  return {
    lastName: String(item.lastName || item.childLastName || item.surname || nameParts.lastName || '').trim(),
    middleName: String(item.middleName || item.childMiddleName || item.middle || nameParts.middleName || '').trim(),
    firstName: String(item.firstName || item.childFirstName || item.givenName || item.given || nameParts.firstName || '').trim(),
    birthDate: String(item.birthDate || item.childBirthDate || '').trim(),
    city: String(item.city || item.birthCity || item.childBirthCity || birthPlace.city || birthPlace.town || '').trim(),
    province: String(item.province || item.state || item.birthProvince || item.childBirthProvince || birthPlace.province || birthPlace.state || '').trim(),
    country: String(item.country || item.birthCountry || item.childBirthCountry || birthPlace.country || '').trim(),
    isLivingWithYou: String(item.isLivingWithYou || item.livesWithYou || item.childLivesWithYou || '').trim(),
    addressStreet: String(item.addressStreet || item.childCurrentAddressStreet || address.street || address.line1 || address.addressLine1 || '').trim(),
    addressCity: String(item.addressCity || item.childCurrentAddressCity || address.city || address.town || '').trim(),
    addressProvince: String(item.addressProvince || item.addressState || item.childCurrentAddressProvince || item.childCurrentAddressState || address.province || address.state || '').trim(),
    addressZipCode: String(item.addressZipCode || item.addressZip || item.childCurrentAddressZip || item.childCurrentAddressPostalCode || address.zip || address.postalCode || '').trim(),
    addressCountry: String(item.addressCountry || item.childCurrentAddressCountry || address.country || '').trim(),
    isImmigratingWithYou: String(item.isImmigratingWithYou || item.immigratingWithYou || item.childImmigratingWithYou || '').trim(),
    isImmigratingLater: String(item.isImmigratingLater || item.immigratingLater || item.childImmigratingLater || '').trim()
  }
}

const childRecordHasData = (child: ReturnType<typeof createEmptyChildInfo>) => {
  return Object.values(child).some(value => String(value || '').trim() !== '')
}

const parseChildrenInfoJsonValue = (value: any) => {
  if (Array.isArray(value)) {
    return value.map(normalizeChildInfoRecord).filter(childRecordHasData)
  }

  if (value && typeof value === 'object') {
    return [normalizeChildInfoRecord(value)].filter(childRecordHasData)
  }

  const text = String(value || '').trim()
  if (!text) return []

  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) return parsed.map(normalizeChildInfoRecord).filter(childRecordHasData)
    if (parsed && typeof parsed === 'object') return [normalizeChildInfoRecord(parsed)].filter(childRecordHasData)
  } catch (error) {
    console.warn('Cannot parse childrenInfoJson, fallback to legacy listChildrenInfo:', error)
  }

  return []
}

const parseLegacyChildrenInfoText = (value: any) => {
  return String(value || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const parts = line.split(' - ').map(p => p.trim())
      if (parts.length < 2) {
        return normalizeChildInfoRecord({ firstName: line })
      }

      const nonCustomParts = parts.filter(p => !p.startsWith('Sống cùng:') && !p.startsWith('Địa chỉ con:') && !p.startsWith('Nhập cư cùng:') && !p.startsWith('Nhập cư sau:'))
      const hasIndex = /^\d+$/.test(nonCustomParts[0] || '')
      const offset = hasIndex ? 1 : 0
      const fullName = nonCustomParts[offset] || ''
      const birthDate = nonCustomParts[offset + 1] || ''
      const birthPlaceStr = nonCustomParts[offset + 2] || ''
      const nameParts = splitChildFullName(fullName)
      const placeParts = birthPlaceStr.split(',').map(p => p.trim())

      const livingStatusPart = parts.find(p => p.startsWith('Sống cùng:'))
      const isLivingWithYou = livingStatusPart ? livingStatusPart.replace('Sống cùng:', '').trim() : ''

      const addrPart = parts.find(p => p.startsWith('Địa chỉ con:'))
      let addressStreet = ''
      let addressCity = ''
      let addressProvince = ''
      let addressZipCode = ''
      let addressCountry = ''
      if (addrPart) {
        const addrStr = addrPart.replace('Địa chỉ con:', '').trim()
        const addrParts = addrStr.split(',').map(p => p.trim()).filter(Boolean)
        addressStreet = addrParts.length > 4 ? addrParts.slice(0, -4).join(', ') : (addrParts[0] || '')
        addressCity = addrParts.length >= 4 ? addrParts[addrParts.length - 4] : (addrParts[1] || '')
        addressProvince = addrParts.length >= 3 ? addrParts[addrParts.length - 3] : (addrParts[2] || '')
        addressZipCode = addrParts.length >= 2 ? addrParts[addrParts.length - 2] : ''
        addressCountry = addrParts.length >= 1 ? addrParts[addrParts.length - 1] : ''
      }

      const immigrateWithYouPart = parts.find(p => p.startsWith('Nhập cư cùng:'))
      const immigrateLaterPart = parts.find(p => p.startsWith('Nhập cư sau:'))

      return normalizeChildInfoRecord({
        ...nameParts,
        birthDate,
        city: placeParts[0] || '',
        province: placeParts[1] || '',
        country: placeParts[2] || '',
        isLivingWithYou,
        addressStreet,
        addressCity,
        addressProvince,
        addressZipCode,
        addressCountry,
        isImmigratingWithYou: immigrateWithYouPart ? immigrateWithYouPart.replace('Nhập cư cùng:', '').trim() : '',
        isImmigratingLater: immigrateLaterPart ? immigrateLaterPart.replace('Nhập cư sau:', '').trim() : ''
      })
    })
    .filter(childRecordHasData)
}

const getRestoredChildrenList = () => {
  const structured = parseChildrenInfoJsonValue(formValues.childrenInfo)
  if (structured.length) return structured

  const jsonStructured = parseChildrenInfoJsonValue(formValues.childrenInfoJson)
  if (jsonStructured.length) return jsonStructured

  const legacy = parseLegacyChildrenInfoText(formValues.listChildrenInfo)
  return legacy.length ? legacy : [createEmptyChildInfo()]
}

const buildStructuredChildrenInfo = (children: typeof childrenList.value) => {
  return children.map(child => {
    const fullName = [child.lastName.trim(), child.middleName.trim(), child.firstName.trim()].filter(Boolean).join(' ')
    const birthPlace = {
      city: child.city.trim(),
      province: child.province.trim(),
      country: child.country.trim()
    }
    const currentAddress = {
      street: child.addressStreet.trim(),
      city: child.addressCity.trim(),
      province: child.addressProvince.trim(),
      zip: child.addressZipCode.trim(),
      country: child.addressCountry.trim()
    }

    return {
      lastName: child.lastName.trim(),
      middleName: child.middleName.trim(),
      firstName: child.firstName.trim(),
      fullName,
      birthDate: child.birthDate,
      birthPlace,
      birthCity: birthPlace.city,
      birthProvince: birthPlace.province,
      birthCountry: birthPlace.country,
      isLivingWithYou: child.isLivingWithYou,
      livesWithYou: child.isLivingWithYou,
      currentAddress,
      address: currentAddress,
      addressStreet: currentAddress.street,
      addressCity: currentAddress.city,
      addressProvince: currentAddress.province,
      addressZipCode: currentAddress.zip,
      addressCountry: currentAddress.country,
      isImmigratingWithYou: child.isImmigratingWithYou,
      isImmigratingLater: child.isImmigratingLater
    }
  })
}

const syncChildrenInfo = () => {
  const filtered = childrenList.value
    .filter(c => c.lastName.trim() || c.middleName.trim() || c.firstName.trim() || c.birthDate || c.city.trim() || c.province.trim() || c.country.trim() || c.isLivingWithYou || c.isImmigratingWithYou || c.isImmigratingLater)
  
  const structuredChildrenInfo = buildStructuredChildrenInfo(filtered)
  formValues.childrenInfo = structuredChildrenInfo
  formValues.childrenInfoJson = JSON.stringify(structuredChildrenInfo)

  // Legacy text field is kept only for admin quick view and old submissions fallback.
  formValues.listChildrenInfo = filtered
    .map((c, idx) => {
      const idxStr = String(idx + 1).padStart(2, '0')
      const fullName = [c.lastName.trim(), c.middleName.trim(), c.firstName.trim()].filter(Boolean).join(' ')
      const bDate = c.birthDate
      const placeParts = [c.city.trim(), c.province.trim(), c.country.trim()].filter(Boolean).join(', ')
      
      const parts = [idxStr]
      if (fullName) parts.push(fullName)
      if (bDate) parts.push(bDate)
      if (placeParts) parts.push(placeParts)
      
      const livingStatus = c.isLivingWithYou ? `Sống cùng: ${c.isLivingWithYou}` : ''
      if (livingStatus) parts.push(livingStatus)
      
      if (c.isLivingWithYou === 'Không') {
        const addrParts = [c.addressStreet.trim(), c.addressCity.trim(), c.addressProvince.trim(), c.addressZipCode.trim(), c.addressCountry.trim()].filter(Boolean).join(', ')
        if (addrParts) parts.push(`Địa chỉ con: ${addrParts}`)
      }
      
      const immigrateWithYou = c.isImmigratingWithYou ? `Nhập cư cùng: ${c.isImmigratingWithYou}` : ''
      if (immigrateWithYou) parts.push(immigrateWithYou)
      
      if (c.isImmigratingWithYou === 'Không') {
        const immigrateLater = c.isImmigratingLater ? `Nhập cư sau: ${c.isImmigratingLater}` : ''
        if (immigrateLater) parts.push(immigrateLater)
      }
      
      return parts.join(' - ')
    })
    .join('\n')
}

const addChild = () => {
  childrenList.value.push({ 
    lastName: '', middleName: '', firstName: '', birthDate: '', city: '', province: '', country: '', 
    isLivingWithYou: '', addressStreet: '', addressCity: '', addressProvince: '', addressZipCode: '', addressCountry: '',
    isImmigratingWithYou: '', isImmigratingLater: ''
  })
  syncChildrenInfo()
}

const removeChild = (index: number) => {
  if (childrenList.value.length > 1) {
    childrenList.value.splice(index, 1)
    syncChildrenInfo()
  }
}

const syncImmigrationQuestions = (childIndex: number) => {
  if (childrenList.value[childIndex].isImmigratingWithYou === 'Có') {
    childrenList.value[childIndex].isImmigratingLater = ''
  }
  syncChildrenInfo()
}

const setChildDatePart = (index: number, part: DatePart, value: string) => {
  const child = childrenList.value[index]
  const parts = parseDateParts(child.birthDate)
  parts[part] = value
  child.birthDate = formatDateParts(parts)
  syncChildrenInfo()
}

// ===== U.S. Arrivals Info Custom State & Methods =====
const usArrivalsList = ref<{
  arrivalDate: string,
  stayDurationVal: string,
  stayDurationUnit: string
}[]>([
  { arrivalDate: '', stayDurationVal: '', stayDurationUnit: 'Ngày' }
])

const syncUsArrivals = () => {
  const filtered = usArrivalsList.value
    .filter(a => a.arrivalDate || a.stayDurationVal.trim())
  
  formValues.usArrivalsList = filtered
    .map((a, idx) => {
      const idxStr = String(idx + 1).padStart(2, '0')
      const arrDate = a.arrivalDate
      const duration = a.stayDurationVal.trim() ? `${a.stayDurationVal.trim()} ${a.stayDurationUnit}` : ''
      
      const parts = [idxStr]
      if (arrDate) parts.push(`Ngày đến: ${arrDate}`)
      if (duration) parts.push(`Thời gian ở: ${duration}`)
      
      return parts.join(' - ')
    })
    .join('\n')
}

const addUsArrival = () => {
  usArrivalsList.value.push({ arrivalDate: '', stayDurationVal: '', stayDurationUnit: 'Ngày' })
  syncUsArrivals()
}

const removeUsArrival = (index: number) => {
  if (usArrivalsList.value.length > 1) {
    usArrivalsList.value.splice(index, 1)
    syncUsArrivals()
  }
}

const setUsArrivalDatePart = (index: number, part: DatePart, value: string) => {
  const item = usArrivalsList.value[index]
  const parts = parseDateParts(item.arrivalDate)
  parts[part] = value
  item.arrivalDate = formatDateParts(parts)
  syncUsArrivals()
}

// ===== Father & Mother & Sponsor Name Split Custom State & Methods =====
const fatherNameParts = reactive({ lastName: '', middleName: '', firstName: '' })
const motherNameParts = reactive({ lastName: '', middleName: '', firstName: '' })
const sponsorNameParts = reactive({ lastName: '', middleName: '', firstName: '' })
const contactNameParts = reactive({ lastName: '', middleName: '', firstName: '' })
const alternateContactNameParts = reactive({ lastName: '', middleName: '', firstName: '' })
const applicantSignNameParts = reactive({ lastName: '', middleName: '', firstName: '' })

const syncFatherFullName = () => {
  formValues.fatherFullName = [
    fatherNameParts.lastName.trim(),
    fatherNameParts.middleName.trim(),
    fatherNameParts.firstName.trim()
  ].filter(Boolean).join(' ')
}

const syncMotherFullName = () => {
  formValues.motherFullName = [
    motherNameParts.lastName.trim(),
    motherNameParts.middleName.trim(),
    motherNameParts.firstName.trim()
  ].filter(Boolean).join(' ')
}

const syncSponsorFullName = () => {
  formValues.sponsorFullName = [
    sponsorNameParts.lastName.trim(),
    sponsorNameParts.middleName.trim(),
    sponsorNameParts.firstName.trim()
  ].filter(Boolean).join(' ')
}

const syncContactNameUS = () => {
  formValues.contactNameUS = [
    contactNameParts.lastName.trim(),
    contactNameParts.middleName.trim(),
    contactNameParts.firstName.trim()
  ].filter(Boolean).join(' ')
}

const syncAlternateContactNameUS = () => {
  formValues.alternateContactNameUS = [
    alternateContactNameParts.lastName.trim(),
    alternateContactNameParts.middleName.trim(),
    alternateContactNameParts.firstName.trim()
  ].filter(Boolean).join(' ')
}

const syncApplicantFullName = () => {
  formValues.applicantFullName = [
    applicantSignNameParts.lastName.trim(),
    applicantSignNameParts.middleName.trim(),
    applicantSignNameParts.firstName.trim()
  ].filter(Boolean).join(' ')
}


// ===== Submit Functions =====
// Submit state
const isSubmitting = ref(false)
const submitError = ref<string | null>(null)

// Thank you modal state
const showThankYouModal = ref(false)
const submissionId = ref<string | null>(null)

// Handle form submit
const handleSubmit = async () => {
  // Ensure fullName is updated on submit
  const lastName = String(formValues.lastName || '').trim()
  const middleName = String(formValues.middleName || '').trim()
  const firstName = String(formValues.firstName || '').trim()
  formValues.fullName = [lastName, middleName, firstName].filter(Boolean).join(' ')

  // Validate required fields
  const requiredFieldErrors = getRequiredFieldErrors()
  if (requiredFieldErrors.length) {
    alert(requiredFieldErrors.join('\n'))
    return
  }

  const applicantFullNameValue = formValues['applicantFullName'] || formValues['declarantFullName'] || ''
  const applicantSignatureValue = formValues['applicantSignature'] || formValues['declarantSignature'] || ''

  if (!applicantFullNameValue) {
    const message = locale.value === 'vi' 
      ? 'Vui lòng điền họ và tên của người điền đơn'
      : 'Please enter the full name of the applicant'
    alert(message)
    return
  }
  
  if (!applicantSignatureValue) {
    const message = locale.value === 'vi'
      ? 'Vui lòng ký tên'
      : 'Please sign your name'
    alert(message)
    return
  }

  // Reset error
  submitError.value = null
  isSubmitting.value = true

  try {
    // Prepare data to send
    // Backend expects required fields at top level for validation
    const applicantFullName = formValues['applicantFullName'] || formValues['declarantFullName'] || ''
    const applicantSignature = formValues['applicantSignature'] || formValues['declarantSignature'] || ''
    
    // Validate again before sending (double check)
    if (!applicantFullName || applicantFullName.trim() === '') {
      throw new Error(locale.value === 'vi' 
        ? 'Vui lòng điền họ và tên của người điền đơn'
        : 'Please enter the full name of the applicant')
    }
    
    if (!applicantSignature || applicantSignature.trim() === '') {
      throw new Error(locale.value === 'vi'
        ? 'Vui lòng ký tên'
        : 'Please sign your name')
    }
    
    const submitData = {
      language: locale.value,
      customer_name: applicantFullName || formValues['customer_name'] || '',
      customer_email: formValues['email'] || formValues['customer_email'] || '',
      customer_phone: formValues['phone'] || formValues['customer_phone'] || '',
      // Required fields at top level for backend validation
      applicantFullName,
      applicantSignature,
      applicant_signature: applicantSignature,
      declarantFullName: applicantFullName,
      declarantSignature: applicantSignature,
      // All form data (includes all fields including declarantFullName and declarantSignature)
      form_data: formValues,
      submitted_at: new Date().toISOString()
    }

    console.log('Submitting DS-260 form data:', {
      declarantFullName: submitData.declarantFullName,
      declarantFullName_length: submitData.declarantFullName?.length || 0,
      declarantSignature: submitData.declarantSignature ? `Present (${submitData.declarantSignature.substring(0, 50)}...)` : 'Missing',
      declarantSignature_length: submitData.declarantSignature?.length || 0,
      form_data_has_declarantFullName: 'declarantFullName' in formValues,
      form_data_has_declarantSignature: 'declarantSignature' in formValues,
      form_data_keys: Object.keys(submitData.form_data)
    })

    // Call API
    const response = await submitForm('DS-260', submitData)

    if (response.success) {
      // Clear saved form data sau khi submit thnh cng
      clearFormData('DS-260')
      previousPhonesList.value = ['']
      previousEmailsList.value = ['']
      socialNetworksList.value = [{ platform: '', link: '' }]
      foreignCountriesList.value = ['']
      childrenList.value = [{ 
        lastName: '', middleName: '', firstName: '', birthDate: '', city: '', province: '', country: '', 
        isLivingWithYou: '', addressStreet: '', addressCity: '', addressProvince: '', addressZipCode: '', addressCountry: '',
        isImmigratingWithYou: '', isImmigratingLater: ''
      }]
      fatherNameParts.lastName = ''
      fatherNameParts.middleName = ''
      fatherNameParts.firstName = ''
      motherNameParts.lastName = ''
      motherNameParts.middleName = ''
      motherNameParts.firstName = ''
      sponsorNameParts.lastName = ''
      sponsorNameParts.middleName = ''
      sponsorNameParts.firstName = ''
      
      // Success - show thank you modal
      submissionId.value = response.data?.id || response.data?.submission_id || 'unknown'
      showThankYouModal.value = true
    } else {
      throw new Error(response.message || 'Failed to submit form')
    }
  } catch (error: any) {
    console.error('Submit error:', error)
    
    // Handle validation errors from API
    if (error.data?.errors || error.response?.data?.errors) {
      const errors = error.data?.errors || error.response?.data?.errors
      
      const errorMessages = Object.entries(errors)
        .map(([field, messages]: [string, any]) => {
          // Handle array of messages or single message
          const messageList = Array.isArray(messages) ? messages : [messages]
          return messageList.join(', ')
        })
        .join('\n')
      
      submitError.value = errorMessages
      
      alert(locale.value === 'vi' 
        ? `Có lỗi xảy ra:\n${errorMessages}`
        : `Errors occurred:\n${errorMessages}`
      )
    } else {
      submitError.value = error.message || error.data?.message || (locale.value === 'vi' 
        ? 'Không thể gửi form. Vui lòng thử lại sau.'
        : 'Failed to submit form. Please try again later.')
      
      console.error('Submit error:', error)
      alert(submitError.value)
    }
  } finally {
    isSubmitting.value = false
  }
}

// Navigation function for thank you modal
const goHome = () => {
  window.location.href = 'https://icaviet.com'
}
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-6 sm:p-6">
    <h1 class="text-3xl font-bold mb-6">
      {{ locale === 'vi' ? 'Biểu mẫu DS-260 từ ICAVIET' : 'DS-260 Form from ICAVIET' }}
    </h1>

    <!-- Box cam k?t b?o m?t th�ng tin -->
    <div class="mb-6 p-4 md:p-6 bg-white border border-blue-200 rounded-xl shadow-sm">
      <div class="flex flex-col md:flex-row items-center md:items-center gap-4 md:gap-6">
        <!-- Shield icon on the left -->
        <div class="flex-shrink-0 flex items-center justify-center">
          <img :src="getAssetUrl('/images/Khien_logo.png')" alt="ICAVIET Shield" class="w-24 h-24 md:w-40 md:h-40 object-contain" />
        </div>
        
        <!-- Content on the right -->
        <div class="flex-1 w-full md:w-auto">
          <h2 class="text-lg md:text-xl font-bold text-blue-900 mb-3 md:mb-4 text-left">
            {{ securityBoxTranslations[locale].title }}
          </h2>
          <div class="space-y-2 md:space-y-3 text-sm md:text-base text-gray-700 mb-3 md:mb-4">
            <p class="flex items-start gap-2">
              <span class="text-gray-600 mt-1"><img :src="getAssetUrl('/Icon_1.svg')" alt="Icon 1" class="w-4 h-4" /></span>
              <span>{{ securityBoxTranslations[locale].point1 }}</span>
            </p>
            <p class="flex items-start gap-2">
              <span class="text-gray-600 mt-1"><img :src="getAssetUrl('/Icon_2.svg')" alt="Icon 2" class="w-4 h-4" /></span>
              <span>{{ securityBoxTranslations[locale].point2 }}</span>
            </p>
            <p class="flex items-start gap-2">
              <span class="text-gray-600 mt-1"><img :src="getAssetUrl('/Icon_3.svg')" alt="Icon 3" class="w-4 h-4" /></span>
              <span>{{ securityBoxTranslations[locale].point3 }}</span>
            </p>
          </div>
          <div class="mt-3 md:mt-4 text-left">
            <a href="https://icaviet.com/chinh-sach-bao-mat/" target="_blank" rel="noopener noreferrer" class="text-sm md:text-base font-semibold text-blue-700 hover:text-blue-900 flex items-center justify-start gap-2 transition-colors">
              {{ securityBoxTranslations[locale].privacyLink }}
              <span class="text-blue-700">-&gt;</span>
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- Chuyển ngôn ngữ -->
    <div class="flex gap-2 mb-6">
      <button
        class="px-3 py-1 border rounded flex items-center gap-2"
        :class="locale === 'vi' ? 'bg-gray-200' : ''"
        @click="locale = 'vi'"
      >
        <span>Tiếng Việt</span>
      </button>
      <button
        class="px-3 py-1 border rounded flex items-center gap-2"
        :class="locale === 'en' ? 'bg-gray-200' : ''"
        @click="locale = 'en'"
      >
        <span>English</span>
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loadingSchema" class="mb-10 p-8 bg-white rounded-lg shadow-md">
      <div class="flex flex-col items-center justify-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p class="text-gray-700 text-lg">
          {{ locale === 'vi' ? 'Đang tải form...' : 'Loading form...' }}
        </p>
      </div>
    </div>

    <!-- Error State -->
    <div v-if="schemaError && !loadingSchema" class="mb-10 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div class="flex items-start">
        <div class="flex-shrink-0">
          <svg class="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div class="ml-3">
          <h3 class="text-lg font-medium text-yellow-800 mb-2">
            {{ locale === 'vi' ? 'Cảnh báo' : 'Warning' }}
          </h3>
          <p class="text-yellow-700">{{ schemaError }}</p>
        </div>
      </div>
    </div>

    <!-- Render to�n b? schema -->
    <div
      v-if="schema && schema.sections && !loadingSchema"
      class="space-y-10"
    >
      <template
        v-for="(section, sectionIndex) in ((schema.sections || []) as any[])"
        :key="section?.id || `section-${sectionIndex}`"
      >
        <div
          v-if="section && shouldShowSection(section)"
          class="mb-10"
        >
        <h2 v-if="section" class="text-2xl font-semibold mb-4 uppercase">
          {{ getLocalizedText(section.title, locale) || section.id || `Section ${sectionIndex + 1}` }}
        </h2>

        <template
          v-for="(group, groupIndex) in ((section?.groups || []) as any[])"
          :key="group?.id || `group-${sectionIndex}-${groupIndex}`"
        >
          <div
            v-if="group && shouldShowGroup(group)"
            class="mb-6 p-4 border rounded bg-white"
          >
          <!-- Group title: ch? hi?n th? khi c title, khng fallback sang order/id -->
          <h3 
            v-if="group && getLocalizedText(group.title, locale)" 
            class="text-xl font-semibold mb-4 pb-2 border-b border-gray-200 text-gray-800"
          >
            {{ getLocalizedText(group.title, locale) }}
          </h3>

          <!-- Grid container cho cc field trong group -->
          <div
            class="group-grid grid gap-4"
            :style="getGroupGridStyle(group)"
          >
            <!-- Render fields -->
            <template
              v-for="(field, fieldIndex) in ((group?.fields || []) as any[])"
              :key="field?.id || field?.name || `field-${sectionIndex}-${groupIndex}-${fieldIndex}`"
            >
              <!-- Render special full-width headers for names -->
              <div 
                v-if="field && shouldShowField(field) && field.name === 'lastName'" 
                class="col-span-full text-base font-bold text-gray-800 mb-1" 
              >
                {{ locale === 'vi' ? 'Tên trên giấy tờ:' : 'Name on documents:' }} <span class="text-red-500">*</span>
              </div>
              <div 
                v-if="field && shouldShowField(field) && field.name === 'otherLastName'" 
                class="col-span-full text-base font-bold text-gray-800 mb-1 mt-2" 
              >
                {{ locale === 'vi' ? 'Tên gọi khác:' : 'Other names:' }}
              </div>

              <!-- Field v?i conditional - ch? render n?u shouldShowField = true -->
              <div
                v-if="field && shouldShowField(field)"
                class="field-grid-item mb-4"
                :style="getFieldGridStyle(field)"
              >
              <!-- Checkbox Group -->
              <div v-if="field.type === 'checkbox_group'" class="mb-6">
                <label class="text-base font-medium mb-2 block">
                  {{ getLocalizedText(field.label, locale) }}
                  <span v-if="field.required" class="text-red-500">*</span>
                </label>
                <div class="flex flex-col gap-2">
                  <label
                    v-for="option in (field.options || [])"
                    :key="option.value"
                    class="flex items-center gap-2 cursor-pointer text-gray-700"
                  >
                    <input
                      type="checkbox"
                      :value="option.value"
                      :checked="isCheckboxSelected(field.name, option.value)"
                      @change="toggleCheckbox(field.name, option.value)"
                      class="cursor-pointer h-4 w-4 rounded border-[#aabdd7] text-blue-600 focus:ring-blue-500"
                    />
                    <span>{{ getLocalizedText(option.label, locale) }}</span>
                  </label>
                </div>
              </div>

              <!-- Section Heading -->
              <div v-else-if="field.type === 'section_heading'" class="border-b border-blue-200 pb-2 mb-4 mt-6">
                <h3 class="text-lg font-bold text-blue-700 uppercase tracking-wide">
                  {{ getLocalizedText(field.label, locale) }}
                </h3>
              </div>

              <!-- Residence Period Table -->
              <div v-else-if="field.type === 'residence_period_table'" class="mb-6">
                <div class="space-y-2 mb-4">
                  <p class="text-base font-semibold text-gray-800">
                    {{ getLocalizedText(field.label, locale) }}
                    <span v-if="field.required" class="text-red-500">*</span>
                  </p>
                </div>

                <!-- Debug info (ch? trong dev mode) -->
                <div v-if="!field.fields_template || field.fields_template.length === 0" class="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                  ?? Warning: fields_template is missing or empty for field "{{ field.name }}"
                </div>

                <!-- Render c�c period rows -->
                <div
                  v-for="(period, periodIndex) in ((formValues[field.name] || []) as any[])"
                  :key="`period-${periodIndex}`"
                  class="mb-4 border border-gray-200 rounded-lg p-4 bg-white"
                >
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <template
                      v-for="templateField in (field.fields_template || [])"
                      :key="templateField.id || templateField.name"
                    >
                      <!-- Render section header for "ĐỊA CHỈ" before 'street' in residenceHistory, jobsTenYears, previousJobs and schoolList -->
                      <div
                        v-if="['residenceHistory', 'jobsTenYears', 'previousJobs', 'schoolList'].includes(field.name) && templateField.name === 'street'"
                        class="col-span-full font-bold text-gray-800 text-xs mb-1 uppercase tracking-wider mt-2"
                      >
                        {{ locale === 'vi' ? 'Địa chỉ' : 'Address' }}
                      </div>

                      <div
                        class="flex flex-col"
                        :style="['residenceHistory', 'jobsTenYears', 'previousJobs', 'schoolList'].includes(field.name) && templateField.name === 'dateFrom' ? 'grid-column-start: 1;' : ''"
                      >
                        <!-- Hide labels for address inputs of residenceHistory, jobsTenYears, previousJobs and schoolList -->
                        <label
                          v-if="!(['residenceHistory', 'jobsTenYears', 'previousJobs', 'schoolList'].includes(field.name) && ['street', 'city', 'province', 'zipCode', 'country'].includes(templateField.name))"
                          class="text-sm font-medium mb-1 uppercase"
                        >
                          {{ getLocalizedText(templateField.label, locale) }}
                          <span v-if="templateField.required" class="text-red-500">*</span>
                        </label>

                        <!-- Date parts inside periods -->
                        <div v-if="templateField.type === 'date_parts'" class="grid grid-cols-3 gap-2">
                          <select
                            :value="getDatePart(period[templateField.name], 'month')"
                            :required="templateField.required"
                            :class="getInputClasses(`${field.name}_${periodIndex}_${templateField.name}_month`, 'border rounded px-3 py-2', getDatePart(period[templateField.name], 'month'))"
                            @change="(event) => setPeriodDatePart(period, templateField.name, 'month', (event.target as HTMLSelectElement).value)"
                            @focus="handleInputFocus(`${field.name}_${periodIndex}_${templateField.name}_month`)"
                            @blur="handleInputBlur"
                          >
                            <option value="">{{ locale === 'vi' ? 'Tháng' : 'Month' }}</option>
                            <option v-for="month in dateMonths" :key="`${field.name}-${periodIndex}-${templateField.name}-month-${month}`" :value="month">{{ month }}</option>
                          </select>
                          <select
                            :value="getDatePart(period[templateField.name], 'day')"
                            :required="templateField.required"
                            :class="getInputClasses(`${field.name}_${periodIndex}_${templateField.name}_day`, 'border rounded px-3 py-2', getDatePart(period[templateField.name], 'day'))"
                            @change="(event) => setPeriodDatePart(period, templateField.name, 'day', (event.target as HTMLSelectElement).value)"
                            @focus="handleInputFocus(`${field.name}_${periodIndex}_${templateField.name}_day`)"
                            @blur="handleInputBlur"
                          >
                            <option value="">{{ locale === 'vi' ? 'Ngày' : 'Day' }}</option>
                            <option v-for="day in dateDays" :key="`${field.name}-${periodIndex}-${templateField.name}-day-${day}`" :value="day">{{ day }}</option>
                          </select>
                          <select
                            :value="getDatePart(period[templateField.name], 'year')"
                            :required="templateField.required"
                            :class="getInputClasses(`${field.name}_${periodIndex}_${templateField.name}_year`, 'border rounded px-3 py-2', getDatePart(period[templateField.name], 'year'))"
                            @change="(event) => setPeriodDatePart(period, templateField.name, 'year', (event.target as HTMLSelectElement).value)"
                            @focus="handleInputFocus(`${field.name}_${periodIndex}_${templateField.name}_year`)"
                            @blur="handleInputBlur"
                          >
                            <option value="">{{ locale === 'vi' ? 'Năm' : 'Year' }}</option>
                            <option v-for="year in dateYears" :key="`${field.name}-${periodIndex}-${templateField.name}-year-${year}`" :value="year">{{ year }}</option>
                          </select>
                        </div>

                        <!-- Date input -->
                        <input
                          v-else-if="templateField.type === 'date'"
                          v-model="period[templateField.name]"
                          type="date"
                          :class="getInputClasses(`${field.name}_${periodIndex}_${templateField.name}`, 'border rounded px-3 py-2', period[templateField.name])"
                          @focus="handleInputFocus(`${field.name}_${periodIndex}_${templateField.name}`)"
                          @blur="handleInputBlur"
                        />

                        <!-- Select trong period (vd: nguoi chi tra chuyen di) -->
                        <select
                          v-else-if="templateField.type === 'select'"
                          v-model="period[templateField.name]"
                          :required="templateField.required"
                          :class="getInputClasses(`${field.name}_${periodIndex}_${templateField.name}`, 'border rounded px-3 py-2', period[templateField.name])"
                          @focus="handleInputFocus(`${field.name}_${periodIndex}_${templateField.name}`)"
                          @blur="handleInputBlur"
                        >
                          <option value="">{{ getLocalizedText(templateField.placeholder, locale) || (locale === 'vi' ? '-- Chọn --' : '-- Select --') }}</option>
                          <option
                            v-for="option in (templateField.options || [])"
                            :key="`${field.name}-${periodIndex}-${templateField.name}-${option.value || option}`"
                            :value="option.value !== undefined ? option.value : option"
                          >
                            {{ getLocalizedText(option.label, locale) || option.value || option }}
                          </option>
                        </select>

                        <!-- Text input (default) -->
                        <input
                          v-else
                          v-model="period[templateField.name]"
                          :type="templateField.type || 'text'"
                          :placeholder="getLocalizedText(templateField.placeholder, locale)"
                          :class="getInputClasses(`${field.name}_${periodIndex}_${templateField.name}`, 'w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500', period[templateField.name])"
                          @focus="handleInputFocus(`${field.name}_${periodIndex}_${templateField.name}`)"
                          @blur="handleInputBlur"
                          @input="(event) => handleInputValidation(field, templateField, period, event)"
                        />

                        <!-- Sub-label helper text for countriesVisited5YearsList -->
                        <p
                          v-if="field.name === 'countriesVisited5YearsList' && templateField.name === 'countryName'"
                          class="text-xs text-blue-600 mt-1 font-medium"
                        >
                          {{ locale === 'vi' ? 'Mỗi ô chỉ điền 1 quốc gia' : 'Each box only enters 1 country' }}
                        </p>

                        <!-- Sub-label helper text under dateTo in residenceHistory, jobsTenYears and schoolList -->
                        <span
                          v-if="field.name === 'residenceHistory' && templateField.name === 'dateTo'"
                          class="text-xs text-gray-500 mt-1 italic block animate-pulse-subtle"
                        >
                          {{ locale === 'vi' ? 'Để trống nếu đang ở đây' : 'Leave blank if currently residing here' }}
                        </span>
                        <span
                          v-if="['jobsTenYears', 'previousJobs'].includes(field.name) && templateField.name === 'dateTo'"
                          class="text-xs text-gray-500 mt-1 italic block animate-pulse-subtle"
                        >
                          {{ locale === 'vi' ? 'Để trống nếu đang làm việc' : 'Leave blank if currently working' }}
                        </span>
                        <span
                          v-if="field.name === 'schoolList' && templateField.name === 'dateTo'"
                          class="text-xs text-gray-500 mt-1 italic block animate-pulse-subtle"
                        >
                          {{ locale === 'vi' ? 'Để trống nếu đang học ở đây' : 'Leave blank if currently studying here' }}
                        </span>
                      </div>
                    </template>
                  </div>

                  <!-- Button xa period (ch? hi?n th? n?u is_repeatable = true) -->
                  <div v-if="field.is_repeatable || field.isRepeatable" class="mt-4 flex justify-end">
                    <button
                      type="button"
                      class="px-4 py-1.5 text-sm border rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                      @click="removeResidencePeriod(field.name, periodIndex)"
                    >
                      {{ locale === 'vi' ? 'Xóa' : 'Remove' }}
                    </button>
                  </div>
                </div>

                <!-- Button thm period -->
                <!-- Hi?n th? n?u: is_repeatable = true HO?C chua c period no (d? thm period d?u tin) -->
                <button
                  v-if="(field.is_repeatable || field.isRepeatable) || (!formValues[field.name] || formValues[field.name].length === 0)"
                  type="button"
                  @click="addResidencePeriod(field.name)"
                  class="mt-2 px-5 py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <span>+</span>
                  <span>{{ locale === 'vi' ? 'Thêm' : 'Add' }}</span>
                </button>
              </div>

              <!-- Date parts: day / month / year -->
              <div v-else-if="field.type === 'date_parts'" class="flex flex-col mb-4">
                <label class="text-base font-medium mt-2 mb-1">
                  {{ getLocalizedText(field.label, locale) }}
                  <span v-if="field.required" class="text-red-500">*</span>
                </label>
                <div class="grid grid-cols-3 gap-2">
                  <select
                    :value="getDatePart(formValues[field.name], 'day')"
                    :required="field.required"
                    :class="getInputClasses(`${field.name}_day`, 'border rounded px-3 py-2', getDatePart(formValues[field.name], 'day'))"
                    @change="(event) => setDatePart(field.name, 'day', (event.target as HTMLSelectElement).value)"
                    @focus="handleInputFocus(`${field.name}_day`)"
                    @blur="handleInputBlur"
                  >
                    <option value="">{{ locale === 'vi' ? 'Ngày' : 'Day' }}</option>
                    <option v-for="day in dateDays" :key="`${field.name}-day-${day}`" :value="day">{{ day }}</option>
                  </select>
                  <select
                    :value="getDatePart(formValues[field.name], 'month')"
                    :required="field.required"
                    :class="getInputClasses(`${field.name}_month`, 'border rounded px-3 py-2', getDatePart(formValues[field.name], 'month'))"
                    @change="(event) => setDatePart(field.name, 'month', (event.target as HTMLSelectElement).value)"
                    @focus="handleInputFocus(`${field.name}_month`)"
                    @blur="handleInputBlur"
                  >
                    <option value="">{{ locale === 'vi' ? 'Tháng' : 'Month' }}</option>
                    <option v-for="month in dateMonths" :key="`${field.name}-month-${month}`" :value="month">{{ month }}</option>
                  </select>
                  <select
                    :value="getDatePart(formValues[field.name], 'year')"
                    :required="field.required"
                    :class="getInputClasses(`${field.name}_year`, 'border rounded px-3 py-2', getDatePart(formValues[field.name], 'year'))"
                    @change="(event) => setDatePart(field.name, 'year', (event.target as HTMLSelectElement).value)"
                    @focus="handleInputFocus(`${field.name}_year`)"
                    @blur="handleInputBlur"
                  >
                    <option value="">{{ locale === 'vi' ? 'Năm' : 'Year' }}</option>
                    <option v-for="year in dateYears" :key="`${field.name}-year-${year}`" :value="year">{{ year }}</option>
                  </select>
                </div>
              </div>

              <!-- Birth place parts: district/city / province / country -->
              <div v-else-if="field.type === 'birth_place_parts'" class="flex flex-col mb-4">
                <label class="text-base font-medium mt-2 mb-1">
                  {{ getLocalizedText(field.label, locale) }}
                  <span v-if="field.required" class="text-red-500">*</span>
                </label>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div v-for="index in 3" :key="`${field.name}-birth-place-${index}`">
                    <label class="block text-xs text-gray-500 font-semibold mb-1">
                      {{ getBirthPlacePartLabel(index - 1) }}
                    </label>
                    <input
                      :value="getCompositePart(formValues[field.name], index - 1, 3)"
                      type="text"
                      :required="field.required"
                      :placeholder="getBirthPlacePartLabel(index - 1)"
                      :class="getInputClasses(`${field.name}_${index}`, 'border rounded px-3 py-2 w-full', getCompositePart(formValues[field.name], index - 1, 3))"
                      @input="(event) => setCompositePart(field.name, index - 1, 3, (event.target as HTMLInputElement).value)"
                      @focus="handleInputFocus(`${field.name}_${index}`)"
                      @blur="handleInputBlur"
                    />
                  </div>
                </div>
              </div>

              <!-- Address parts: save every address input into its own field instead of one combined string -->
              <div v-else-if="field.type === 'address_parts'" class="flex flex-col mb-4">
                <label class="text-base font-medium mt-2 mb-1">
                  {{ getLocalizedText(field.label, locale) }}
                  <span v-if="field.required" class="text-red-500">*</span>
                </label>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div v-for="index in 5" :key="`${field.name}-address-${index}`">
                    <label class="block text-xs text-gray-500 font-semibold mb-1">
                      {{ getAddressPartLabel(field.name, index - 1) }}
                      <span v-if="isRequiredAddressPart(field, index - 1)" class="text-red-500">*</span>
                    </label>
                    <input
                      :value="getAddressPartValue(field.name, index - 1)"
                      type="text"
                      :required="isRequiredAddressPart(field, index - 1)"
                      :placeholder="getAddressPartLabel(field.name, index - 1)"
                      :class="getInputClasses(`${field.name}_${index}`, 'border rounded px-3 py-2 w-full', getAddressPartValue(field.name, index - 1))"
                      @input="(event) => setAddressPartValue(field.name, index - 1, (event.target as HTMLInputElement).value)"
                      @focus="handleInputFocus(`${field.name}_${index}`)"
                      @blur="handleInputBlur"
                    />
                  </div>
                </div>
              </div>

              <!-- Select field -->
              <div v-else-if="field.type === 'select'" class="flex flex-col mb-4">
                <label class="text-base font-medium mt-2 mb-1">
                  {{ getLocalizedText(field.label, locale) }}
                  <span v-if="field.required" class="text-red-500">*</span>
                </label>
                <select
                  v-model="formValues[field.name]"
                  :class="getInputClasses(field.name, 'border rounded px-3 py-2', formValues[field.name])"
                  @focus="handleInputFocus(field.name)"
                  @blur="handleInputBlur"
                >
                  <option value="">{{ locale === 'vi' ? 'Chọn...' : 'Please Select...' }}</option>
                  <option
                    v-for="option in (field.options || [])"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ getLocalizedText(option.label, locale) || option.value }}
                  </option>
                </select>
              </div>

              <!-- Date field -->
              <div v-else-if="field.type === 'date'" class="flex flex-col mb-4">
                <label class="text-base font-medium mt-2 mb-1">
                  {{ getLocalizedText(field.label, locale) }}
                  <span v-if="field.required" class="text-red-500">*</span>
                </label>
                <input
                  v-model="formValues[field.name]"
                  type="date"
                  :class="getInputClasses(field.name, 'border rounded px-3 py-2', formValues[field.name])"
                  @focus="handleInputFocus(field.name)"
                  @blur="handleInputBlur"
                />
              </div>

              <!-- Signature field -->
              <div v-else-if="field.type === 'signature'" class="flex flex-col mb-4">
                <label class="text-base font-medium mt-2 mb-1">
                  {{ getLocalizedText(field.label, locale) }}
                  <span v-if="field.required" class="text-red-500">*</span>
                </label>
                <div class="signature-container">
                  <canvas
                    :id="`signature-${field.name}`"
                    width="600"
                    height="200"
                    class="border-2 border-dashed border-[#aabdd7] rounded-[5px] bg-white cursor-crosshair w-full max-w-full touch-none"
                    @mousedown="(e) => { const canvas = e.target as HTMLCanvasElement; initSignatureCanvas(canvas); handleSignatureMouseDown(e, canvas); }"
                    @mousemove="(e) => handleSignatureMouseMove(e, e.target as HTMLCanvasElement)"
                    @mouseup="(e) => handleSignatureMouseUp(e.target as HTMLCanvasElement, field.name)"
                    @mouseleave="(e) => handleSignatureMouseUp(e.target as HTMLCanvasElement, field.name)"
                    @touchstart="(e) => { const canvas = e.target as HTMLCanvasElement; initSignatureCanvas(canvas); handleSignatureTouchStart(e, canvas); }"
                    @touchmove="(e) => handleSignatureTouchMove(e, e.target as HTMLCanvasElement)"
                    @touchend="(e) => handleSignatureTouchEnd(e, e.target as HTMLCanvasElement, field.name)"
                    @touchcancel="(e) => handleSignatureTouchEnd(e, e.target as HTMLCanvasElement, field.name)"
                  ></canvas>
                  <div class="mt-2 flex gap-2">
                    <button
                      type="button"
                      @click="clearSignature(field.name)"
                      class="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                    >
                      {{ locale === 'vi' ? 'Xóa chữ ký' : 'Clear Signature' }}
                    </button>
                  </div>
                  <p v-if="formValues[field.name]" class="mt-2 text-sm text-gray-600">
                    {{ locale === 'vi' ? 'Chữ ký đã được lưu' : 'Signature saved' }}
                  </p>
                </div>
              </div>

              <!-- Radio buttons -->
              <div v-else-if="field.type === 'radio' && field.options" class="flex flex-col mb-4">
                <label class="text-base font-medium mt-2 mb-1">
                  {{ getLocalizedText(field.label, locale) }}
                  <span v-if="field.required" class="text-red-500">*</span>
                </label>
                <div :class="field.inline ? 'flex flex-row flex-wrap gap-6 mt-1' : 'flex flex-col gap-2 mt-1'">
                  <label
                    v-for="option in field.options"
                    :key="option.value"
                    class="flex items-center gap-2 cursor-pointer text-gray-700"
                  >
                    <input
                      type="radio"
                      :name="field.name"
                      :value="option.value"
                      v-model="formValues[field.name]"
                      class="cursor-pointer h-4 w-4 border-[#aabdd7] text-blue-600 focus:ring-blue-500"
                    />
                    <span>{{ getLocalizedText(option.label, locale) }}</span>
                  </label>
                </div>
              </div>

              <!-- Textarea -->
              <div v-else-if="field.type === 'textarea'" class="flex flex-col mb-4">
                <label class="text-base font-medium mt-2 mb-1">
                  {{ getLocalizedText(field.label, locale) }}
                  <span v-if="field.required" class="text-red-500">*</span>
                </label>
                
                <!-- Custom previousPhones dynamic input list -->
                <div v-if="field.name === 'previousPhones'" class="space-y-3">
                  <div 
                    v-for="(phone, pIndex) in previousPhonesList" 
                    :key="`prev-phone-${pIndex}`"
                    class="flex items-center gap-2"
                  >
                    <input
                      type="text"
                      v-model="previousPhonesList[pIndex]"
                      :placeholder="locale === 'vi' ? 'Nhập số điện thoại...' : 'Enter phone number...'"
                      :class="getInputClasses(`previousPhones_${pIndex}`, 'w-full border rounded px-3 py-2', previousPhonesList[pIndex])"
                      @input="(e) => handlePrevPhoneInput(pIndex, e)"
                      @focus="handleInputFocus(`previousPhones_${pIndex}`)"
                      @blur="handleInputBlur"
                    />
                    <button
                      v-if="previousPhonesList.length > 1"
                      type="button"
                      class="px-3 py-2 border rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-sm"
                      @click="removePrevPhone(pIndex)"
                    >
                      {{ locale === 'vi' ? 'Xóa' : 'Remove' }}
                    </button>
                  </div>
                  <button
                    type="button"
                    class="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg flex items-center gap-2 transition-colors text-sm font-semibold mt-1"
                    @click="addPrevPhone"
                  >
                    <span>+</span>
                    <span>{{ locale === 'vi' ? 'Thêm số điện thoại' : 'Add phone number' }}</span>
                  </button>
                </div>

                <!-- Custom previousEmails dynamic input list -->
                <div v-else-if="field.name === 'previousEmails'" class="space-y-3">
                  <div 
                    v-for="(emailVal, eIndex) in previousEmailsList" 
                    :key="`prev-email-${eIndex}`"
                    class="flex items-center gap-2"
                  >
                    <input
                      type="email"
                      v-model="previousEmailsList[eIndex]"
                      :placeholder="locale === 'vi' ? 'Nhập email...' : 'Enter email...'"
                      :class="getInputClasses(`previousEmails_${eIndex}`, 'w-full border rounded px-3 py-2', previousEmailsList[eIndex])"
                      @input="syncPreviousEmails"
                      @focus="handleInputFocus(`previousEmails_${eIndex}`)"
                      @blur="handleInputBlur"
                    />
                    <button
                      v-if="previousEmailsList.length > 1"
                      type="button"
                      class="px-3 py-2 border rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-sm"
                      @click="removePrevEmail(eIndex)"
                    >
                      {{ locale === 'vi' ? 'Xóa' : 'Remove' }}
                    </button>
                  </div>
                  <button
                    type="button"
                    class="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg flex items-center gap-2 transition-colors text-sm font-semibold mt-1"
                    @click="addPrevEmail"
                  >
                    <span>+</span>
                    <span>{{ locale === 'vi' ? 'Thêm email' : 'Add email' }}</span>
                  </button>
                </div>

                <!-- Custom listSocialNetworks dynamic input list (Name & Link) -->
                <div v-else-if="field.name === 'listSocialNetworks'" class="space-y-3">
                  <div 
                    v-for="(network, netIndex) in socialNetworksList" 
                    :key="`social-${netIndex}`"
                    class="flex flex-col md:flex-row md:items-center gap-2"
                  >
                    <input
                      type="text"
                      v-model="socialNetworksList[netIndex].platform"
                      :placeholder="locale === 'vi' ? 'Tên mạng xã hội (e.g. Facebook)...' : 'Social media platform...'"
                      :class="getInputClasses(`listSocialNetworks_platform_${netIndex}`, 'flex-1 border rounded px-3 py-2', socialNetworksList[netIndex].platform)"
                      @input="syncSocialNetworks"
                      @focus="handleInputFocus(`listSocialNetworks_platform_${netIndex}`)"
                      @blur="handleInputBlur"
                    />
                    <input
                      type="text"
                      v-model="socialNetworksList[netIndex].link"
                      :placeholder="locale === 'vi' ? 'Đường dẫn/Link (e.g. facebook.com/username)...' : 'Link/handle...'"
                      :class="getInputClasses(`listSocialNetworks_link_${netIndex}`, 'flex-1 border rounded px-3 py-2', socialNetworksList[netIndex].link)"
                      @input="syncSocialNetworks"
                      @focus="handleInputFocus(`listSocialNetworks_link_${netIndex}`)"
                      @blur="handleInputBlur"
                    />
                    <button
                      v-if="socialNetworksList.length > 1"
                      type="button"
                      class="px-3 py-2 border rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-sm"
                      @click="removeSocialNetwork(netIndex)"
                    >
                      {{ locale === 'vi' ? 'Xóa' : 'Remove' }}
                    </button>
                  </div>
                  <button
                    type="button"
                    class="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg flex items-center gap-2 transition-colors text-sm font-semibold mt-1"
                    @click="addSocialNetwork"
                  >
                    <span>+</span>
                    <span>{{ locale === 'vi' ? 'Thêm mạng xã hội' : 'Add social media' }}</span>
                  </button>
                </div>

                <!-- Custom foreignCountriesList dynamic input list -->
                <div v-else-if="field.name === 'foreignCountriesList'" class="space-y-3">
                  <div 
                    v-for="(country, cIndex) in foreignCountriesList" 
                    :key="`foreign-country-${cIndex}`"
                    class="flex items-center gap-2"
                  >
                    <input
                      type="text"
                      v-model="foreignCountriesList[cIndex]"
                      :placeholder="locale === 'vi' ? 'Nhập tên quốc gia...' : 'Enter country name...'"
                      :class="getInputClasses(`foreignCountriesList_${cIndex}`, 'w-full border rounded px-3 py-2', foreignCountriesList[cIndex])"
                      @input="syncForeignCountries"
                      @focus="handleInputFocus(`foreignCountriesList_${cIndex}`)"
                      @blur="handleInputBlur"
                    />
                    <button
                      v-if="foreignCountriesList.length > 1"
                      type="button"
                      class="px-3 py-2 border rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-sm"
                      @click="removeForeignCountry(cIndex)"
                    >
                      {{ locale === 'vi' ? 'Xóa' : 'Remove' }}
                    </button>
                  </div>
                  <button
                    type="button"
                    class="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg flex items-center gap-2 transition-colors text-sm font-semibold mt-1"
                    @click="addForeignCountry"
                  >
                    <span>+</span>
                    <span>{{ locale === 'vi' ? 'Thêm quốc gia' : 'Add country' }}</span>
                  </button>
                </div>

                <!-- Custom usArrivalsList dynamic list (Ngày nhập cảnh + Thời gian ở) -->
                <div v-else-if="field.name === 'usArrivalsList'" class="space-y-4 w-full">
                  <div 
                    v-for="(arrival, arrIndex) in usArrivalsList" 
                    :key="`arrival-${arrIndex}`"
                    class="p-4 border border-gray-200 rounded-xl bg-gray-50/50 space-y-4 relative w-full"
                  >
                    <!-- Header with index and Remove button -->
                    <div class="flex justify-between items-center pb-2 border-b border-gray-200/60">
                      <span class="font-semibold text-gray-700">
                        {{ locale === 'vi' ? `Lần nhập cảnh thứ ${arrIndex + 1}` : `Arrival #${arrIndex + 1}` }}
                      </span>
                      <button
                        v-if="usArrivalsList.length > 1"
                        type="button"
                        class="text-sm font-semibold text-red-600 hover:text-red-800 transition-colors"
                        @click="removeUsArrival(arrIndex)"
                      >
                        {{ locale === 'vi' ? 'Xóa lần này' : 'Remove this arrival' }}
                      </button>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <!-- Ngày nhập cảnh (dropdowns) -->
                      <div class="flex flex-col">
                        <label class="text-sm font-semibold text-gray-700 mb-1">
                          {{ locale === 'vi' ? 'Ngày nhập cảnh Mỹ:' : 'Date of Arrival:' }}
                        </label>
                        <div class="grid grid-cols-3 gap-2">
                          <!-- Day -->
                          <select
                            :value="getDatePart(usArrivalsList[arrIndex].arrivalDate, 'day')"
                            :class="getInputClasses(`usArrivalsList_date_${arrIndex}_day`, 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500', getDatePart(usArrivalsList[arrIndex].arrivalDate, 'day'))"
                            @change="(event) => setUsArrivalDatePart(arrIndex, 'day', (event.target as HTMLSelectElement).value)"
                            @focus="handleInputFocus(`usArrivalsList_date_${arrIndex}_day`)"
                            @blur="handleInputBlur"
                          >
                            <option value="">{{ locale === 'vi' ? 'Ngày' : 'Day' }}</option>
                            <option v-for="day in dateDays" :key="`arrival-${arrIndex}-day-${day}`" :value="day">{{ day }}</option>
                          </select>

                          <!-- Month -->
                          <select
                            :value="getDatePart(usArrivalsList[arrIndex].arrivalDate, 'month')"
                            :class="getInputClasses(`usArrivalsList_date_${arrIndex}_month`, 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500', getDatePart(usArrivalsList[arrIndex].arrivalDate, 'month'))"
                            @change="(event) => setUsArrivalDatePart(arrIndex, 'month', (event.target as HTMLSelectElement).value)"
                            @focus="handleInputFocus(`usArrivalsList_date_${arrIndex}_month`)"
                            @blur="handleInputBlur"
                          >
                            <option value="">{{ locale === 'vi' ? 'Tháng' : 'Month' }}</option>
                            <option v-for="month in dateMonths" :key="`arrival-${arrIndex}-month-${month}`" :value="month">{{ month }}</option>
                          </select>

                          <!-- Year -->
                          <select
                            :value="getDatePart(usArrivalsList[arrIndex].arrivalDate, 'year')"
                            :class="getInputClasses(`usArrivalsList_date_${arrIndex}_year`, 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500', getDatePart(usArrivalsList[arrIndex].arrivalDate, 'year'))"
                            @change="(event) => setUsArrivalDatePart(arrIndex, 'year', (event.target as HTMLSelectElement).value)"
                            @focus="handleInputFocus(`usArrivalsList_date_${arrIndex}_year`)"
                            @blur="handleInputBlur"
                          >
                            <option value="">{{ locale === 'vi' ? 'Năm' : 'Year' }}</option>
                            <option v-for="year in dateYears" :key="`arrival-${arrIndex}-year-${year}`" :value="year">{{ year }}</option>
                          </select>
                        </div>
                      </div>

                      <!-- Thời gian ở -->
                      <div class="flex flex-col">
                        <label class="text-sm font-semibold text-gray-700 mb-1">
                          {{ locale === 'vi' ? 'Thời gian ở:' : 'Length of Stay:' }}
                        </label>
                        <div class="flex gap-2">
                          <input
                            type="text"
                            v-model="usArrivalsList[arrIndex].stayDurationVal"
                            placeholder="e.g. 15, 3..."
                            :class="getInputClasses(`usArrivalsList_duration_${arrIndex}`, 'flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500', usArrivalsList[arrIndex].stayDurationVal)"
                            @input="syncUsArrivals"
                            @focus="handleInputFocus(`usArrivalsList_duration_${arrIndex}`)"
                            @blur="handleInputBlur"
                          />
                          <select
                            v-model="usArrivalsList[arrIndex].stayDurationUnit"
                            :class="getInputClasses(`usArrivalsList_unit_${arrIndex}`, 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500', usArrivalsList[arrIndex].stayDurationUnit)"
                            @change="syncUsArrivals"
                            @focus="handleInputFocus(`usArrivalsList_unit_${arrIndex}`)"
                            @blur="handleInputBlur"
                          >
                            <option value="Ngày">{{ locale === 'vi' ? 'Ngày' : 'Days' }}</option>
                            <option value="Tuần">{{ locale === 'vi' ? 'Tuần' : 'Weeks' }}</option>
                            <option value="Tháng">{{ locale === 'vi' ? 'Tháng' : 'Months' }}</option>
                            <option value="Năm">{{ locale === 'vi' ? 'Năm' : 'Years' }}</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Button thêm lần nhập cảnh -->
                  <button
                    type="button"
                    class="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg flex items-center gap-2 transition-colors text-sm font-semibold mt-1"
                    @click="addUsArrival"
                  >
                    <span>+</span>
                    <span>{{ locale === 'vi' ? 'Thêm lần nhập cảnh' : 'Add U.S. Arrival' }}</span>
                  </button>
                </div>

                <!-- Custom listChildrenInfo dynamic input list (Họ, Tên lót, Tên, Ngày sinh [Ngày/Tháng/Năm], Nơi sinh [Huyện/Tỉnh/Quốc gia]) -->
                <div v-else-if="field.name === 'listChildrenInfo'" class="space-y-4 w-full">
                  <div 
                    v-for="(child, childIndex) in childrenList" 
                    :key="`child-${childIndex}`"
                    class="p-4 border border-gray-200 rounded-xl bg-gray-50/50 space-y-4 relative w-full"
                  >
                    <!-- Header with index and Remove button -->
                    <div class="flex justify-between items-center pb-2 border-b border-gray-200/60">
                      <span class="font-semibold text-gray-700">
                        {{ locale === 'vi' ? `Con thứ ${childIndex + 1}` : `Child #${childIndex + 1}` }}
                      </span>
                      <button
                        v-if="childrenList.length > 1"
                        type="button"
                        class="text-sm font-semibold text-red-600 hover:text-red-800 transition-colors"
                        @click="removeChild(childIndex)"
                      >
                        {{ locale === 'vi' ? 'Xóa con' : 'Remove child' }}
                      </button>
                    </div>

                    <!-- Row 1: Họ, Tên lót, Tên -->
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <!-- Họ con -->
                      <div class="flex flex-col">
                        <label class="text-xs text-gray-500 font-semibold mb-1">
                          {{ locale === 'vi' ? 'Họ' : 'Last Name' }}
                        </label>
                        <input
                          type="text"
                          v-model="childrenList[childIndex].lastName"
                          :placeholder="locale === 'vi' ? 'Họ con...' : 'Last name...'"
                          :class="getInputClasses(`child_lastName_${childIndex}`, 'w-full border border-gray-300 rounded-lg shadow-sm px-3 py-2 focus:border-blue-500 focus:ring-blue-500 text-sm', childrenList[childIndex].lastName)"
                          @input="syncChildrenInfo"
                          @focus="handleInputFocus(`child_lastName_${childIndex}`)"
                          @blur="handleInputBlur"
                        />
                      </div>

                      <!-- Tên lót con -->
                      <div class="flex flex-col">
                        <label class="text-xs text-gray-500 font-semibold mb-1">
                          {{ locale === 'vi' ? 'Tên lót' : 'Middle Name' }}
                        </label>
                        <input
                          type="text"
                          v-model="childrenList[childIndex].middleName"
                          :placeholder="locale === 'vi' ? 'Tên lót con...' : 'Middle name...'"
                          :class="getInputClasses(`child_middleName_${childIndex}`, 'w-full border border-gray-300 rounded-lg shadow-sm px-3 py-2 focus:border-blue-500 focus:ring-blue-500 text-sm', childrenList[childIndex].middleName)"
                          @input="syncChildrenInfo"
                          @focus="handleInputFocus(`child_middleName_${childIndex}`)"
                          @blur="handleInputBlur"
                        />
                      </div>

                      <!-- Tên con -->
                      <div class="flex flex-col">
                        <label class="text-xs text-gray-500 font-semibold mb-1">
                          {{ locale === 'vi' ? 'Tên' : 'First Name' }}
                        </label>
                        <input
                          type="text"
                          v-model="childrenList[childIndex].firstName"
                          :placeholder="locale === 'vi' ? 'Tên con...' : 'First name...'"
                          :class="getInputClasses(`child_firstName_${childIndex}`, 'w-full border border-gray-300 rounded-lg shadow-sm px-3 py-2 focus:border-blue-500 focus:ring-blue-500 text-sm', childrenList[childIndex].firstName)"
                          @input="syncChildrenInfo"
                          @focus="handleInputFocus(`child_firstName_${childIndex}`)"
                          @blur="handleInputBlur"
                        />
                      </div>
                    </div>

                    <!-- Row 2: Ngày sinh -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <!-- Ngày sinh dropdowns (Ngày - Tháng - Năm) -->
                      <div class="flex flex-col">
                        <label class="text-sm font-semibold text-gray-700 mb-1">
                          {{ locale === 'vi' ? 'Ngày sinh:' : 'Date of Birth:' }}
                        </label>
                        <div class="grid grid-cols-3 gap-2">
                          <!-- Day -->
                          <select
                            :value="getDatePart(childrenList[childIndex].birthDate, 'day')"
                            :class="getInputClasses(`child_birthDate_${childIndex}_day`, 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500', getDatePart(childrenList[childIndex].birthDate, 'day'))"
                            @change="(event) => setChildDatePart(childIndex, 'day', (event.target as HTMLSelectElement).value)"
                            @focus="handleInputFocus(`child_birthDate_${childIndex}_day`)"
                            @blur="handleInputBlur"
                          >
                            <option value="">{{ locale === 'vi' ? 'Ngày' : 'Day' }}</option>
                            <option v-for="day in dateDays" :key="`child-${childIndex}-day-${day}`" :value="day">{{ day }}</option>
                          </select>

                          <!-- Month -->
                          <select
                            :value="getDatePart(childrenList[childIndex].birthDate, 'month')"
                            :class="getInputClasses(`child_birthDate_${childIndex}_month`, 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500', getDatePart(childrenList[childIndex].birthDate, 'month'))"
                            @change="(event) => setChildDatePart(childIndex, 'month', (event.target as HTMLSelectElement).value)"
                            @focus="handleInputFocus(`child_birthDate_${childIndex}_month`)"
                            @blur="handleInputBlur"
                          >
                            <option value="">{{ locale === 'vi' ? 'Tháng' : 'Month' }}</option>
                            <option v-for="month in dateMonths" :key="`child-${childIndex}-month-${month}`" :value="month">{{ month }}</option>
                          </select>

                          <!-- Year -->
                          <select
                            :value="getDatePart(childrenList[childIndex].birthDate, 'year')"
                            :class="getInputClasses(`child_birthDate_${childIndex}_year`, 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500', getDatePart(childrenList[childIndex].birthDate, 'year'))"
                            @change="(event) => setChildDatePart(childIndex, 'year', (event.target as HTMLSelectElement).value)"
                            @focus="handleInputFocus(`child_birthDate_${childIndex}_year`)"
                            @blur="handleInputBlur"
                          >
                            <option value="">{{ locale === 'vi' ? 'Năm' : 'Year' }}</option>
                            <option v-for="year in dateYears" :key="`child-${childIndex}-year-${year}`" :value="year">{{ year }}</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <!-- Row 3: Nơi sinh -->
                    <div class="flex flex-col">
                      <label class="text-sm font-semibold text-gray-700 mb-1">
                        {{ locale === 'vi' ? 'Nơi sinh:' : 'Place of Birth:' }}
                      </label>
                      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <!-- Huyện/Thành phố -->
                        <input
                          type="text"
                          v-model="childrenList[childIndex].city"
                          :placeholder="locale === 'vi' ? 'Huyện/Thành phố' : 'City'"
                          :class="getInputClasses(`child_city_${childIndex}`, 'w-full border border-gray-300 rounded-lg shadow-sm px-3 py-2 focus:border-blue-500 focus:ring-blue-500 text-sm', childrenList[childIndex].city)"
                          @input="syncChildrenInfo"
                          @focus="handleInputFocus(`child_city_${childIndex}`)"
                          @blur="handleInputBlur"
                        />
                        <!-- Tỉnh/Bang -->
                        <input
                          type="text"
                          v-model="childrenList[childIndex].province"
                          :placeholder="locale === 'vi' ? 'Tỉnh/Bang' : 'Province'"
                          :class="getInputClasses(`child_province_${childIndex}`, 'w-full border border-gray-300 rounded-lg shadow-sm px-3 py-2 focus:border-blue-500 focus:ring-blue-500 text-sm', childrenList[childIndex].province)"
                          @input="syncChildrenInfo"
                          @focus="handleInputFocus(`child_province_${childIndex}`)"
                          @blur="handleInputBlur"
                        />
                        <!-- Quốc gia -->
                        <input
                          type="text"
                          v-model="childrenList[childIndex].country"
                          :placeholder="locale === 'vi' ? 'Quốc gia' : 'Country'"
                          :class="getInputClasses(`child_country_${childIndex}`, 'w-full border border-gray-300 rounded-lg shadow-sm px-3 py-2 focus:border-blue-500 focus:ring-blue-500 text-sm', childrenList[childIndex].country)"
                          @input="syncChildrenInfo"
                          @focus="handleInputFocus(`child_country_${childIndex}`)"
                          @blur="handleInputBlur"
                        />
                      </div>
                    </div>

                    <!-- Row 4: Con có đang sống với bạn không? -->
                    <div class="flex flex-col">
                      <label class="text-sm font-semibold text-gray-700 mb-1">
                        {{ locale === 'vi' ? 'Con có đang sống với bạn không?' : 'Does the child live with you?' }}
                        <span class="text-red-500">*</span>
                      </label>
                      <div class="flex flex-row flex-wrap gap-6 mt-1">
                        <label class="flex items-center gap-2 cursor-pointer text-gray-700">
                          <input
                            type="radio"
                            :name="`child_isLivingWithYou_${childIndex}`"
                            value="Có"
                            v-model="childrenList[childIndex].isLivingWithYou"
                            class="cursor-pointer h-4 w-4 border-[#aabdd7] text-blue-600 focus:ring-blue-500"
                            @change="syncChildrenInfo"
                          />
                          <span>{{ locale === 'vi' ? 'Có' : 'Yes' }}</span>
                        </label>
                        <label class="flex items-center gap-2 cursor-pointer text-gray-700">
                          <input
                            type="radio"
                            :name="`child_isLivingWithYou_${childIndex}`"
                            value="Không"
                            v-model="childrenList[childIndex].isLivingWithYou"
                            class="cursor-pointer h-4 w-4 border-[#aabdd7] text-blue-600 focus:ring-blue-500"
                            @change="syncChildrenInfo"
                          />
                          <span>{{ locale === 'vi' ? 'Không' : 'No' }}</span>
                        </label>
                      </div>
                    </div>

                    <!-- Đứa con này có nhập cư vào Mỹ cùng bạn không? -->
                    <div class="flex flex-col mt-2">
                      <label class="text-sm font-semibold text-gray-700 mb-1">
                        {{ locale === 'vi' ? 'Đứa con này có nhập cư vào Mỹ cùng bạn không?' : 'Is this child immigrating to the U.S. with you?' }}
                        <span class="text-red-500">*</span>
                      </label>
                      <div class="flex flex-row flex-wrap gap-6 mt-1">
                        <label class="flex items-center gap-2 cursor-pointer text-gray-700">
                          <input
                            type="radio"
                            :name="`child_isImmigratingWithYou_${childIndex}`"
                            value="Có"
                            v-model="childrenList[childIndex].isImmigratingWithYou"
                            class="cursor-pointer h-4 w-4 border-[#aabdd7] text-blue-600 focus:ring-blue-500"
                            @change="syncImmigrationQuestions(childIndex)"
                          />
                          <span>{{ locale === 'vi' ? 'Có' : 'Yes' }}</span>
                        </label>
                        <label class="flex items-center gap-2 cursor-pointer text-gray-700">
                          <input
                            type="radio"
                            :name="`child_isImmigratingWithYou_${childIndex}`"
                            value="Không"
                            v-model="childrenList[childIndex].isImmigratingWithYou"
                            class="cursor-pointer h-4 w-4 border-[#aabdd7] text-blue-600 focus:ring-blue-500"
                            @change="syncImmigrationQuestions(childIndex)"
                          />
                          <span>{{ locale === 'vi' ? 'Không' : 'No' }}</span>
                        </label>
                      </div>
                    </div>

                    <!-- Đứa con này có nhập cư vào Mỹ vào một thời điểm sau này để đoàn tụ với bạn không? -->
                    <div v-if="childrenList[childIndex].isImmigratingWithYou === 'Không'" class="flex flex-col mt-2">
                      <label class="text-sm font-semibold text-gray-700 mb-1">
                        {{ locale === 'vi' ? 'Đứa con này có nhập cư vào Mỹ vào một thời điểm sau này để đoàn tụ với bạn không?' : 'Is this child immigrating to the U.S. at a later time to reunite with you?' }}
                        <span class="text-red-500">*</span>
                      </label>
                      <div class="flex flex-row flex-wrap gap-6 mt-1">
                        <label class="flex items-center gap-2 cursor-pointer text-gray-700">
                          <input
                            type="radio"
                            :name="`child_isImmigratingLater_${childIndex}`"
                            value="Có"
                            v-model="childrenList[childIndex].isImmigratingLater"
                            class="cursor-pointer h-4 w-4 border-[#aabdd7] text-blue-600 focus:ring-blue-500"
                            @change="syncChildrenInfo"
                          />
                          <span>{{ locale === 'vi' ? 'Có' : 'Yes' }}</span>
                        </label>
                        <label class="flex items-center gap-2 cursor-pointer text-gray-700">
                          <input
                            type="radio"
                            :name="`child_isImmigratingLater_${childIndex}`"
                            value="Không"
                            v-model="childrenList[childIndex].isImmigratingLater"
                            class="cursor-pointer h-4 w-4 border-[#aabdd7] text-blue-600 focus:ring-blue-500"
                            @change="syncChildrenInfo"
                          />
                          <span>{{ locale === 'vi' ? 'Không' : 'No' }}</span>
                        </label>
                      </div>
                    </div>

                    <!-- Row 5: Địa chỉ của con (nếu không sống cùng) -->
                    <div v-if="childrenList[childIndex].isLivingWithYou === 'Không'" class="space-y-4 pt-4 border-t border-gray-200/60">
                      <div class="font-bold text-gray-800 text-xs uppercase tracking-wider">
                        {{ locale === 'vi' ? 'Địa chỉ hiện tại của con' : 'Child\'s Current Address' }}
                      </div>
                      
                      <!-- Số nhà/đường/xã/phường/quận -->
                      <div class="flex flex-col">
                        <label class="text-xs text-gray-500 font-semibold mb-1">
                          {{ locale === 'vi' ? 'Số nhà/đường/xã/phường/quận' : 'Street/ward/district' }}
                          <span class="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          v-model="childrenList[childIndex].addressStreet"
                          :placeholder="locale === 'vi' ? 'Số nhà/đường/xã/phường/quận' : 'Street/ward/district'"
                          :class="getInputClasses(`child_addressStreet_${childIndex}`, 'w-full border border-gray-300 rounded-lg shadow-sm px-3 py-2 focus:border-blue-500 focus:ring-blue-500 text-sm', childrenList[childIndex].addressStreet)"
                          @input="syncChildrenInfo"
                          @focus="handleInputFocus(`child_addressStreet_${childIndex}`)"
                          @blur="handleInputBlur"
                        />
                      </div>

                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <!-- Huyện/Thành phố -->
                        <div class="flex flex-col">
                          <label class="text-xs text-gray-500 font-semibold mb-1">
                            {{ locale === 'vi' ? 'Huyện/Thành phố' : 'City/District' }}
                            <span class="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            v-model="childrenList[childIndex].addressCity"
                            :placeholder="locale === 'vi' ? 'Huyện/Thành phố' : 'City/District'"
                            :class="getInputClasses(`child_addressCity_${childIndex}`, 'w-full border border-gray-300 rounded-lg shadow-sm px-3 py-2 focus:border-blue-500 focus:ring-blue-500 text-sm', childrenList[childIndex].addressCity)"
                            @input="syncChildrenInfo"
                            @focus="handleInputFocus(`child_addressCity_${childIndex}`)"
                            @blur="handleInputBlur"
                          />
                        </div>

                        <!-- Tỉnh/Bang -->
                        <div class="flex flex-col">
                          <label class="text-xs text-gray-500 font-semibold mb-1">
                            {{ locale === 'vi' ? 'Tỉnh/Bang' : 'State/Province' }}
                            <span class="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            v-model="childrenList[childIndex].addressProvince"
                            :placeholder="locale === 'vi' ? 'Tỉnh/Bang' : 'State/Province'"
                            :class="getInputClasses(`child_addressProvince_${childIndex}`, 'w-full border border-gray-300 rounded-lg shadow-sm px-3 py-2 focus:border-blue-500 focus:ring-blue-500 text-sm', childrenList[childIndex].addressProvince)"
                            @input="syncChildrenInfo"
                            @focus="handleInputFocus(`child_addressProvince_${childIndex}`)"
                            @blur="handleInputBlur"
                          />
                        </div>

                        <!-- Mã zip -->
                        <div class="flex flex-col">
                          <label class="text-xs text-gray-500 font-semibold mb-1">
                            {{ locale === 'vi' ? 'Mã Zip' : 'Zip Code' }}
                          </label>
                          <input
                            type="text"
                            v-model="childrenList[childIndex].addressZipCode"
                            :placeholder="locale === 'vi' ? 'Mã Zip' : 'Zip Code'"
                            :class="getInputClasses(`child_addressZipCode_${childIndex}`, 'w-full border border-gray-300 rounded-lg shadow-sm px-3 py-2 focus:border-blue-500 focus:ring-blue-500 text-sm', childrenList[childIndex].addressZipCode)"
                            @input="syncChildrenInfo"
                            @focus="handleInputFocus(`child_addressZipCode_${childIndex}`)"
                            @blur="handleInputBlur"
                          />
                        </div>

                        <!-- Quốc gia -->
                        <div class="flex flex-col">
                          <label class="text-xs text-gray-500 font-semibold mb-1">
                            {{ locale === 'vi' ? 'Quốc gia' : 'Country' }}
                            <span class="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            v-model="childrenList[childIndex].addressCountry"
                            :placeholder="locale === 'vi' ? 'Quốc gia' : 'Country'"
                            :class="getInputClasses(`child_addressCountry_${childIndex}`, 'w-full border border-gray-300 rounded-lg shadow-sm px-3 py-2 focus:border-blue-500 focus:ring-blue-500 text-sm', childrenList[childIndex].addressCountry)"
                            @input="syncChildrenInfo"
                            @focus="handleInputFocus(`child_addressCountry_${childIndex}`)"
                            @blur="handleInputBlur"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Button thêm con -->
                  <button
                    type="button"
                    class="px-5 py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg flex items-center gap-2 transition-colors text-sm font-semibold"
                    @click="addChild"
                  >
                    <span>+</span>
                    <span>{{ locale === 'vi' ? 'Thêm con' : 'Add Child' }}</span>
                  </button>
                </div>

                <textarea
                  v-else
                  v-model="formValues[field.name]"
                  rows="3"
                  :placeholder="getLocalizedText(field.placeholder, locale)"
                  :class="getInputClasses(field.name, 'border rounded px-3 py-2 resize-y', formValues[field.name])"
                  @focus="handleInputFocus(field.name)"
                  @blur="handleInputBlur"
                ></textarea>
              </div>

              <!-- Text input (default) -->
              <div v-else-if="field.name === 'fatherFullName'" class="col-span-full mb-4">
                <label class="block text-base font-bold text-gray-800 mb-2">
                  {{ locale === 'vi' ? 'Họ và tên cha:' : 'Father\'s Full Name:' }}
                  <span v-if="field.required" class="text-red-500">*</span>
                </label>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label class="block text-xs text-gray-500 font-semibold mb-1">
                      {{ locale === 'vi' ? 'Họ' : 'Last Name' }}
                    </label>
                    <input
                      type="text"
                      v-model="fatherNameParts.lastName"
                      :placeholder="locale === 'vi' ? 'Họ cha...' : 'Last name...'"
                      :class="getInputClasses('father_lastName', 'w-full border border-gray-300 rounded-lg shadow-sm px-3 py-2 focus:border-blue-500 focus:ring-blue-500 text-sm', fatherNameParts.lastName)"
                      @input="syncFatherFullName"
                      @focus="handleInputFocus('father_lastName')"
                      @blur="handleInputBlur"
                    />
                  </div>
                  <div>
                    <label class="block text-xs text-gray-500 font-semibold mb-1">
                      {{ locale === 'vi' ? 'Tên lót' : 'Middle Name' }}
                    </label>
                    <input
                      type="text"
                      v-model="fatherNameParts.middleName"
                      :placeholder="locale === 'vi' ? 'Tên lót cha...' : 'Middle name...'"
                      :class="getInputClasses('father_middleName', 'w-full border border-gray-300 rounded-lg shadow-sm px-3 py-2 focus:border-blue-500 focus:ring-blue-500 text-sm', fatherNameParts.middleName)"
                      @input="syncFatherFullName"
                      @focus="handleInputFocus('father_middleName')"
                      @blur="handleInputBlur"
                    />
                  </div>
                  <div>
                    <label class="block text-xs text-gray-500 font-semibold mb-1">
                      {{ locale === 'vi' ? 'Tên' : 'First Name' }}
                    </label>
                    <input
                      type="text"
                      v-model="fatherNameParts.firstName"
                      :placeholder="locale === 'vi' ? 'Tên cha...' : 'First name...'"
                      :class="getInputClasses('father_firstName', 'w-full border border-gray-300 rounded-lg shadow-sm px-3 py-2 focus:border-blue-500 focus:ring-blue-500 text-sm', fatherNameParts.firstName)"
                      @input="syncFatherFullName"
                      @focus="handleInputFocus('father_firstName')"
                      @blur="handleInputBlur"
                    />
                  </div>
                </div>
              </div>

              <div v-else-if="field.name === 'motherFullName'" class="col-span-full mb-4">
                <label class="block text-base font-bold text-gray-800 mb-2">
                  {{ locale === 'vi' ? 'Họ và tên mẹ:' : 'Mother\'s Full Name:' }}
                  <span v-if="field.required" class="text-red-500">*</span>
                </label>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label class="block text-xs text-gray-500 font-semibold mb-1">
                      {{ locale === 'vi' ? 'Họ' : 'Last Name' }}
                    </label>
                    <input
                      type="text"
                      v-model="motherNameParts.lastName"
                      :placeholder="locale === 'vi' ? 'Họ mẹ...' : 'Last name...'"
                      :class="getInputClasses('mother_lastName', 'w-full border border-gray-300 rounded-lg shadow-sm px-3 py-2 focus:border-blue-500 focus:ring-blue-500 text-sm', motherNameParts.lastName)"
                      @input="syncMotherFullName"
                      @focus="handleInputFocus('mother_lastName')"
                      @blur="handleInputBlur"
                    />
                  </div>
                  <div>
                    <label class="block text-xs text-gray-500 font-semibold mb-1">
                      {{ locale === 'vi' ? 'Tên lót' : 'Middle Name' }}
                    </label>
                    <input
                      type="text"
                      v-model="motherNameParts.middleName"
                      :placeholder="locale === 'vi' ? 'Tên lót mẹ...' : 'Middle name...'"
                      :class="getInputClasses('mother_middleName', 'w-full border border-gray-300 rounded-lg shadow-sm px-3 py-2 focus:border-blue-500 focus:ring-blue-500 text-sm', motherNameParts.middleName)"
                      @input="syncMotherFullName"
                      @focus="handleInputFocus('mother_middleName')"
                      @blur="handleInputBlur"
                    />
                  </div>
                  <div>
                    <label class="block text-xs text-gray-500 font-semibold mb-1">
                      {{ locale === 'vi' ? 'Tên' : 'First Name' }}
                    </label>
                    <input
                      type="text"
                      v-model="motherNameParts.firstName"
                      :placeholder="locale === 'vi' ? 'Tên mẹ...' : 'First name...'"
                      :class="getInputClasses('mother_firstName', 'w-full border border-gray-300 rounded-lg shadow-sm px-3 py-2 focus:border-blue-500 focus:ring-blue-500 text-sm', motherNameParts.firstName)"
                      @input="syncMotherFullName"
                      @focus="handleInputFocus('mother_firstName')"
                      @blur="handleInputBlur"
                    />
                  </div>
                </div>
              </div>

              <div v-else-if="field.name === 'sponsorFullName'" class="col-span-full mb-4">
                <label class="block text-base font-bold text-gray-800 mb-2">
                  {{ locale === 'vi' ? 'Họ và tên người bảo lãnh:' : 'Sponsor\'s Full Name:' }}
                  <span v-if="field.required" class="text-red-500">*</span>
                </label>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label class="block text-xs text-gray-500 font-semibold mb-1">
                      {{ locale === 'vi' ? 'Họ' : 'Last Name' }}
                    </label>
                    <input
                      type="text"
                      v-model="sponsorNameParts.lastName"
                      :placeholder="locale === 'vi' ? 'Họ...' : 'Last name...'"
                      :class="getInputClasses('sponsor_lastName', 'w-full border border-gray-300 rounded-lg shadow-sm px-3 py-2 focus:border-blue-500 focus:ring-blue-500 text-sm', sponsorNameParts.lastName)"
                      @input="syncSponsorFullName"
                      @focus="handleInputFocus('sponsor_lastName')"
                      @blur="handleInputBlur"
                    />
                  </div>
                  <div>
                    <label class="block text-xs text-gray-500 font-semibold mb-1">
                      {{ locale === 'vi' ? 'Tên lót' : 'Middle Name' }}
                    </label>
                    <input
                      type="text"
                      v-model="sponsorNameParts.middleName"
                      :placeholder="locale === 'vi' ? 'Tên lót...' : 'Middle name...'"
                      :class="getInputClasses('sponsor_middleName', 'w-full border border-gray-300 rounded-lg shadow-sm px-3 py-2 focus:border-blue-500 focus:ring-blue-500 text-sm', sponsorNameParts.middleName)"
                      @input="syncSponsorFullName"
                      @focus="handleInputFocus('sponsor_middleName')"
                      @blur="handleInputBlur"
                    />
                  </div>
                  <div>
                    <label class="block text-xs text-gray-500 font-semibold mb-1">
                      {{ locale === 'vi' ? 'Tên' : 'First Name' }}
                    </label>
                    <input
                      type="text"
                      v-model="sponsorNameParts.firstName"
                      :placeholder="locale === 'vi' ? 'Tên...' : 'First name...'"
                      :class="getInputClasses('sponsor_firstName', 'w-full border border-gray-300 rounded-lg shadow-sm px-3 py-2 focus:border-blue-500 focus:ring-blue-500 text-sm', sponsorNameParts.firstName)"
                      @input="syncSponsorFullName"
                      @focus="handleInputFocus('sponsor_firstName')"
                      @blur="handleInputBlur"
                    />
                  </div>
                </div>
              </div>

              <div v-else-if="field.name === 'contactNameUS'" class="col-span-full mb-4">
                <label class="block text-base font-bold text-gray-800 mb-2">
                  {{ locale === 'vi' ? 'Người liên hệ:' : 'U.S. Contact Name:' }}
                  <span v-if="field.required" class="text-red-500">*</span>
                </label>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label class="block text-xs text-gray-500 font-semibold mb-1">
                      {{ locale === 'vi' ? 'Họ' : 'Last Name' }}
                    </label>
                    <input
                      type="text"
                      v-model="contactNameParts.lastName"
                      :placeholder="locale === 'vi' ? 'Họ...' : 'Last name...'"
                      :class="getInputClasses('contact_lastName', 'w-full border border-gray-300 rounded-lg shadow-sm px-3 py-2 focus:border-blue-500 focus:ring-blue-500 text-sm', contactNameParts.lastName)"
                      @input="syncContactNameUS"
                      @focus="handleInputFocus('contact_lastName')"
                      @blur="handleInputBlur"
                    />
                  </div>
                  <div>
                    <label class="block text-xs text-gray-500 font-semibold mb-1">
                      {{ locale === 'vi' ? 'Tên lót' : 'Middle Name' }}
                    </label>
                    <input
                      type="text"
                      v-model="contactNameParts.middleName"
                      :placeholder="locale === 'vi' ? 'Tên lót...' : 'Middle name...'"
                      :class="getInputClasses('contact_middleName', 'w-full border border-gray-300 rounded-lg shadow-sm px-3 py-2 focus:border-blue-500 focus:ring-blue-500 text-sm', contactNameParts.middleName)"
                      @input="syncContactNameUS"
                      @focus="handleInputFocus('contact_middleName')"
                      @blur="handleInputBlur"
                    />
                  </div>
                  <div>
                    <label class="block text-xs text-gray-500 font-semibold mb-1">
                      {{ locale === 'vi' ? 'Tên' : 'First Name' }}
                    </label>
                    <input
                      type="text"
                      v-model="contactNameParts.firstName"
                      :placeholder="locale === 'vi' ? 'Tên...' : 'First name...'"
                      :class="getInputClasses('contact_firstName', 'w-full border border-gray-300 rounded-lg shadow-sm px-3 py-2 focus:border-blue-500 focus:ring-blue-500 text-sm', contactNameParts.firstName)"
                      @input="syncContactNameUS"
                      @focus="handleInputFocus('contact_firstName')"
                      @blur="handleInputBlur"
                    />
                  </div>
                </div>
              </div>

              <div v-else-if="field.name === 'alternateContactNameUS'" class="col-span-full mb-4">
                <label class="block text-base font-bold text-gray-800 mb-2">
                  {{ locale === 'vi' ? 'Người liên hệ (Dự phòng):' : 'Alternate U.S. Contact Name:' }}
                  <span v-if="field.required" class="text-red-500">*</span>
                </label>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label class="block text-xs text-gray-500 font-semibold mb-1">
                      {{ locale === 'vi' ? 'Họ' : 'Last Name' }}
                    </label>
                    <input
                      type="text"
                      v-model="alternateContactNameParts.lastName"
                      :placeholder="locale === 'vi' ? 'Họ...' : 'Last name...'"
                      :class="getInputClasses('alternateContact_lastName', 'w-full border border-gray-300 rounded-lg shadow-sm px-3 py-2 focus:border-blue-500 focus:ring-blue-500 text-sm', alternateContactNameParts.lastName)"
                      @input="syncAlternateContactNameUS"
                      @focus="handleInputFocus('alternateContact_lastName')"
                      @blur="handleInputBlur"
                    />
                  </div>
                  <div>
                    <label class="block text-xs text-gray-500 font-semibold mb-1">
                      {{ locale === 'vi' ? 'Tên lót' : 'Middle Name' }}
                    </label>
                    <input
                      type="text"
                      v-model="alternateContactNameParts.middleName"
                      :placeholder="locale === 'vi' ? 'Tên lót...' : 'Middle name...'"
                      :class="getInputClasses('alternateContact_middleName', 'w-full border border-gray-300 rounded-lg shadow-sm px-3 py-2 focus:border-blue-500 focus:ring-blue-500 text-sm', alternateContactNameParts.middleName)"
                      @input="syncAlternateContactNameUS"
                      @focus="handleInputFocus('alternateContact_middleName')"
                      @blur="handleInputBlur"
                    />
                  </div>
                  <div>
                    <label class="block text-xs text-gray-500 font-semibold mb-1">
                      {{ locale === 'vi' ? 'Tên' : 'First Name' }}
                    </label>
                    <input
                      type="text"
                      v-model="alternateContactNameParts.firstName"
                      :placeholder="locale === 'vi' ? 'Tên...' : 'First name...'"
                      :class="getInputClasses('alternateContact_firstName', 'w-full border border-gray-300 rounded-lg shadow-sm px-3 py-2 focus:border-blue-500 focus:ring-blue-500 text-sm', alternateContactNameParts.firstName)"
                      @input="syncAlternateContactNameUS"
                      @focus="handleInputFocus('alternateContact_firstName')"
                      @blur="handleInputBlur"
                    />
                  </div>
                </div>
              </div>

              <div v-else-if="field.name === 'applicantFullName'" class="col-span-full mb-4">
                <label class="block text-base font-bold text-gray-800 mb-2">
                  {{ locale === 'vi' ? 'Họ và tên người điền đơn:' : 'Applicant Full Name:' }}
                  <span v-if="field.required" class="text-red-500">*</span>
                </label>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label class="block text-xs text-gray-500 font-semibold mb-1">
                      {{ locale === 'vi' ? 'Họ' : 'Last Name' }}
                    </label>
                    <input
                      type="text"
                      v-model="applicantSignNameParts.lastName"
                      :placeholder="locale === 'vi' ? 'Họ...' : 'Last name...'"
                      :class="getInputClasses('applicantSign_lastName', 'w-full border border-gray-300 rounded-lg shadow-sm px-3 py-2 focus:border-blue-500 focus:ring-blue-500 text-sm', applicantSignNameParts.lastName)"
                      @input="syncApplicantFullName"
                      @focus="handleInputFocus('applicantSign_lastName')"
                      @blur="handleInputBlur"
                    />
                  </div>
                  <div>
                    <label class="block text-xs text-gray-500 font-semibold mb-1">
                      {{ locale === 'vi' ? 'Tên lót' : 'Middle Name' }}
                    </label>
                    <input
                      type="text"
                      v-model="applicantSignNameParts.middleName"
                      :placeholder="locale === 'vi' ? 'Tên lót...' : 'Middle name...'"
                      :class="getInputClasses('applicantSign_middleName', 'w-full border border-gray-300 rounded-lg shadow-sm px-3 py-2 focus:border-blue-500 focus:ring-blue-500 text-sm', applicantSignNameParts.middleName)"
                      @input="syncApplicantFullName"
                      @focus="handleInputFocus('applicantSign_middleName')"
                      @blur="handleInputBlur"
                    />
                  </div>
                  <div>
                    <label class="block text-xs text-gray-500 font-semibold mb-1">
                      {{ locale === 'vi' ? 'Tên' : 'First Name' }}
                    </label>
                    <input
                      type="text"
                      v-model="applicantSignNameParts.firstName"
                      :placeholder="locale === 'vi' ? 'Tên...' : 'First name...'"
                      :class="getInputClasses('applicantSign_firstName', 'w-full border border-gray-300 rounded-lg shadow-sm px-3 py-2 focus:border-blue-500 focus:ring-blue-500 text-sm', applicantSignNameParts.firstName)"
                      @input="syncApplicantFullName"
                      @focus="handleInputFocus('applicantSign_firstName')"
                      @blur="handleInputBlur"
                    />
                  </div>
                </div>
              </div>

              <!-- Text input (default) -->
              <div v-else class="flex flex-col mb-4">
                <label 
                  :class="isNameField(field.name) 
                    ? 'text-sm text-gray-500 font-normal mb-1' 
                    : 'text-base font-medium mt-2 mb-1'"
                >
                  <template v-if="isNameField(field.name)">
                    {{ getLocalizedNameLabel(field.name) }}
                    <span v-if="field.required" class="text-red-500"> *</span>
                  </template>
                  <template v-else>
                    {{ getLocalizedText(field.label, locale) }}
                    <span v-if="field.required" class="text-red-500">*</span>
                  </template>
                </label>
                <input
                  v-model="formValues[field.name]"
                  type="text"
                  :placeholder="getLocalizedText(field.placeholder, locale)"
                  :class="getInputClasses(field.name, 'border rounded px-3 py-2', formValues[field.name])"
                  @focus="handleInputFocus(field.name)"
                  @blur="handleInputBlur"
                />
              </div>
            </div>
            </template>
          </div>
          </div>
          <!-- Nút thêm/xóa cuộc hôn nhân cũ -->
          <div 
            v-if="isPreviousSpouseGroup(group.id) && shouldShowGroup(group)"
            class="mb-6 flex gap-3"
          >
            <button
              v-if="canAddPreviousSpouse(group.id)"
              type="button"
              class="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg flex items-center gap-2 transition-colors text-sm font-semibold"
              @click="addPreviousMarriage"
            >
              <span>+</span>
              <span>{{ locale === 'vi' ? 'Thêm thông tin cuộc hôn nhân cũ' : 'Add previous marriage info' }}</span>
            </button>
            <button
              v-if="canDeletePreviousSpouse(group.id)"
              type="button"
              class="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg flex items-center gap-2 transition-colors text-sm font-semibold"
              @click="deleteLastPreviousMarriage"
            >
              <span>-</span>
              <span>{{ locale === 'vi' ? 'Xóa cuộc hôn nhân cũ này' : 'Remove this previous marriage info' }}</span>
            </button>
          </div>
        </template>
        </div>
      </template>
    </div>

    <!-- Submit button -->
    <div class="mt-8 mb-6">
      <!-- Submit Error Display -->
      <div v-if="submitError" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
        <div class="flex items-start">
          <div class="flex-shrink-0">
            <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-lg font-medium text-red-800 mb-2">
              {{ locale === 'vi' ? 'Lỗi khi gửi form' : 'Submit Error' }}
            </h3>
            <p class="text-red-700 text-sm whitespace-pre-line">{{ submitError }}</p>
          </div>
        </div>
      </div>

      <div class="flex justify-center">
        <button
          type="button"
          @click="handleSubmit"
          :disabled="isSubmitting || loadingSchema"
          class="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <span v-if="isSubmitting" class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
          <span v-if="isSubmitting">
            {{ locale === 'vi' ? 'Đang gửi...' : 'Submitting...' }}
          </span>
          <span v-else>
            {{ locale === 'vi' ? 'Gửi' : 'Submit' }}
          </span>
        </button>
      </div>
    </div>

    <!-- Thank You Modal -->
    <Teleport to="body">
      <div
        v-if="showThankYouModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
        @click.self="showThankYouModal = false"
      >
        <div class="bg-white rounded-lg shadow-lg p-6 sm:p-8 text-center max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <!-- Success Icon -->
          <div class="mb-6 flex justify-center">
            <div class="rounded-full bg-green-500 p-4">
              <svg class="h-16 w-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          <!-- Title -->
          <h1 class="text-3xl font-bold text-gray-900 mb-4">
            {{ locale === 'vi' ? 'Xác nhận thành công' : 'Confirmation Successful' }}
          </h1>

          <!-- Message -->
          <p class="text-lg text-gray-700 mb-8">
            <template v-if="locale === 'vi'">
              <span class="font-bold text-blue-600">ICA</span><span class="font-bold text-red-600">VIET</span><span class="text-gray-700"> đã nhận được thông tin của bạn</span>
            </template>
            <template v-else>
              <span class="font-bold text-blue-600">ICA</span><span class="font-bold text-red-600">VIET</span><span class="text-gray-700"> has received your information</span>
            </template>
          </p>

          <!-- Actions -->
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              @click="showThankYouModal = false"
              class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-colors"
            >
              {{ locale === 'vi' ? 'Đóng' : 'Close' }}
            </button>
            <button
              @click="goHome"
              class="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg shadow-md transition-colors"
            >
              {{ locale === 'vi' ? 'Về trang chủ' : 'Go to Home' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.signature-container {
  position: relative;
}

/* Mobile: lu�n 1 c?t, b? qua grid_cols/col_span */
.group-grid {
  grid-template-columns: minmax(0, 1fr);
}

.col-span-full {
  grid-column: 1 / -1 !important;
}

/* PC (md+): �p d?ng grid_cols v� col_span */
@media (min-width: 640px) {
  .group-grid {
    grid-template-columns: repeat(var(--group-cols, 1), minmax(0, 1fr));
  }

  .field-grid-item {
    grid-column: span var(--field-span, 1) / span var(--field-span, 1);
  }
}

/* Force 5px border-radius and #aabdd7 border-color on form inputs */
input[type="text"],
input[type="date"],
input[type="email"],
input[type="tel"],
select,
textarea {
  border-color: #aabdd7 !important;
  border-radius: 5px !important;
}

input[type="text"]:focus,
input[type="date"]:focus,
input[type="email"]:focus,
input[type="tel"]:focus,
select:focus,
textarea:focus {
  border-color: #3b82f6 !important;
  box-shadow: 0 0 0 4px rgba(219, 234, 254, 0.5) !important;
}

/* Custom checkbox and radio input border styling */
input[type="checkbox"] {
  border-color: #aabdd7 !important;
  border-radius: 3px !important;
}
input[type="radio"] {
  border-color: #aabdd7 !important;
  border-radius: 50% !important;
}

/* Signature canvas border styling */
.signature-container canvas {
  border-color: #aabdd7 !important;
  border-radius: 5px !important;
}
</style>

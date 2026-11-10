<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useFormApi } from '@/composables/useFormApi'
import { useFormPersistence } from '@/composables/useFormPersistence'
import { useAssetUrl } from '@/composables/useAssetUrl'

const { getAssetUrl } = useAssetUrl()

// Schema state - sẽ được load từ API
const schema = ref<any>(null)

// Form values state - lưu tất cả giá trị người dùng nhập vào form
const formValues = reactive<Record<string, any>>({})

// Locale state - ngôn ngữ hiện tại của form ('vi' hoặc 'en')
const locale = ref<'vi' | 'en'>('vi')

// Loading state - trạng thái đang load schema từ API
const loadingSchema = ref<boolean>(false)

// Error state - lưu thông báo lỗi khi load schema thất bại
const schemaError = ref<string | null>(null)

// API client - sử dụng composable để gọi API
const { getForm, submitForm } = useFormApi()

// Form persistence - sử dụng composable để lưu/load form data
const { saveFormData, loadFormData, clearFormData } = useFormPersistence()

// Normalize schema từ API về format giống schema tĩnh
// Chuyển đổi từ format { title_en, title_vi } sang { title: { en, vi } }
const normalizeSchema = (apiSchema: any): any => {
  console.log('normalizeSchema called with:', apiSchema)
  
  if (!apiSchema) {
    console.warn('normalizeSchema: apiSchema is null or undefined')
    return null
  }

  // Kiểm tra xem có sections không
  if (!apiSchema.sections || !Array.isArray(apiSchema.sections)) {
    console.warn('normalizeSchema: apiSchema.sections is not an array or missing')
    return null
  }

  // Nếu schema đã có format đúng (title: { en, vi }), return luôn
  if (apiSchema.sections.length > 0) {
    const firstSection = apiSchema.sections[0]
    if (firstSection.title && typeof firstSection.title === 'object' && ('en' in firstSection.title || 'vi' in firstSection.title)) {
      console.log('normalizeSchema: Schema đã đúng format, return as is')
      return apiSchema
    }
  }

  // Normalize sections - filter out null/undefined sections
  const normalizedSections = apiSchema.sections
    ?.filter((section: any) => section != null) // Loại bỏ null/undefined
    ?.map((section: any) => {
      const normalizedSection: any = {
        ...section,
        title: section.title_en || section.title_vi 
          ? { en: section.title_en || '', vi: section.title_vi || '' }
          : section.title || ''
      }

      // Normalize groups - filter out null/undefined groups
      normalizedSection.groups = section.groups
        ?.filter((group: any) => group != null) // Loại bỏ null/undefined
        ?.map((group: any) => {
          const normalizedGroup: any = {
            ...group,
            title: group.title_en || group.title_vi
              ? { en: group.title_en || '', vi: group.title_vi || '' }
              : group.title || ''
          }

          // Normalize fields - filter out null/undefined fields
          normalizedGroup.fields = group.fields
            ?.filter((field: any) => field != null) // Loại bỏ null/undefined
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
              // Nếu label là string hoặc chưa có, giữ nguyên hoặc tạo object
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
        
        // Đảm bảo is_repeatable hoặc isRepeatable được giữ lại
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


// Khởi tạo giá trị rỗng cho select để option placeholder (MM/DD/YYYY...) hiển thị ngay từ đầu
const initEmptySelectValues = (sections: any[] = []) => {
  sections.forEach((section: any) => {
    section.groups?.forEach((group: any) => {
      group.fields?.forEach((field: any) => {
        if (field?.type === 'select' && field.name && formValues[field.name] === undefined) {
          formValues[field.name] = ''
        }
      })
    })
  })
}



const monthOptions = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
const dayOptions = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'))
const yearOptions = Array.from({ length: 127 }, (_, i) => String(new Date().getFullYear() - i))

const splitDateParts = (value: any) => {
  if (!value || typeof value !== 'string') return { month: '', day: '', year: '' }

  const normalizedValue = String(value).trim()

  // Hỗ trợ cả YYYY-MM-DD từ input date cũ và MM/DD/YYYY mới
  const isoMatch = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) {
    return { year: isoMatch[1], month: isoMatch[2], day: isoMatch[3] }
  }

  // Hỗ trợ ngày đã chọn chưa đủ 3 phần, ví dụ: 01//, 01/15/, //2024.
  // Nếu chỉ nhận full MM/DD/YYYY thì khi chọn từng select, giá trị partial sẽ bị parse về rỗng
  // làm dropdown vừa chọn xong tự mất.
  if (normalizedValue.includes('/')) {
    const [month = '', day = '', year = ''] = normalizedValue.split('/')
    return { month, day, year }
  }

  return { month: '', day: '', year: '' }
}

const getDatePart = (value: any, part: 'month' | 'day' | 'year') => splitDateParts(value)[part]

const buildDateValue = (currentValue: any, part: 'month' | 'day' | 'year', newValue: string) => {
  const parts = splitDateParts(currentValue)
  parts[part] = newValue
  if (!parts.month && !parts.day && !parts.year) return ''
  return `${parts.month || ''}/${parts.day || ''}/${parts.year || ''}`
}

const setDatePart = (fieldName: string, part: 'month' | 'day' | 'year', value: string) => {
  formValues[fieldName] = buildDateValue(formValues[fieldName], part, value)
}

const setPeriodDatePart = (period: Record<string, any>, fieldName: string, part: 'month' | 'day' | 'year', value: string) => {
  period[fieldName] = buildDateValue(period[fieldName], part, value)
}

// Fetch schema from API với slug 'n-600'
const fetchSchema = async () => {
  console.log('fetchSchema called')
  loadingSchema.value = true
  schemaError.value = null

  try {
    console.log('Calling getForm with slug: n-600, locale:', locale.value)
    // Gọi API để lấy schema với slug 'n-600' và locale hiện tại
    const data = await getForm('n-600', locale.value)
    console.log('API response received:', data)
    
    // Kiểm tra data có tồn tại không
    if (!data) {
      throw new Error('API trả về dữ liệu rỗng')
    }
    
    // Normalize schema về format đúng
    const normalizedData = normalizeSchema(data)
    console.log('Schema sau normalize:', normalizedData)
    console.log('Schema có sections?', normalizedData?.sections?.length)
    
    // Debug: Kiểm tra fields_template trong residence_period_table
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
    
    // Kiểm tra normalizedData có hợp lệ không
    if (!normalizedData || !normalizedData.sections || normalizedData.sections.length === 0) {
      throw new Error('Schema không hợp lệ hoặc không có sections')
    }
    
    // Lưu schema vào state
    schema.value = normalizedData
    initEmptySelectValues(normalizedData.sections)
    console.log('Schema đã được lưu vào state, schema.value:', schema.value)
  } catch (error: any) {
    console.error('Failed to fetch schema from API:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      error: error
    })
    schemaError.value = error.message || 'Không thể tải schema từ API'
    
    // Clear schema khi có lỗi
    schema.value = null
  } finally {
    console.log('Setting loadingSchema to false')
    loadingSchema.value = false
    console.log('loadingSchema.value:', loadingSchema.value)
  }
}

// Helper function để check conditional cho field
// Ưu tiên dùng conditional_logic từ API; fallback sang show_if (legacy)
const shouldShowField = (field: any): boolean => {
  if (!field) return true

  // New conditional_logic từ API
  const logic = field.conditional_logic?.show

  if (logic) {
    const depFieldName = logic.field
    const operator = logic.operator || 'equals'
    const value = logic.value

    const depValue = formValues[depFieldName]

    if (operator === 'contains') {
      // Dùng cho checkbox_group: depValue là array
      if (!Array.isArray(depValue)) return false
      return depValue.includes(value)
    }

    if (operator === 'equals') {
      return depValue === value
    }

    // Fallback an toàn nếu operator không hỗ trợ
    return true
  }

  // Legacy: fallback sang show_if nếu vẫn còn dùng
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

  // Không có điều kiện hoặc tất cả điều kiện đều thỏa mãn
  return true
}

// Helper function để check conditional cho section
// Ưu tiên dùng conditional_logic từ API; fallback sang show_if (legacy)
const shouldShowSection = (section: any): boolean => {
  if (!section) return true

  // New conditional_logic từ API
  const logic = section.conditional_logic?.show

  if (logic) {
    const depFieldName = logic.field
    const operator = logic.operator || 'equals'
    const value = logic.value

    const depValue = formValues[depFieldName]

    // Nếu field chưa có giá trị (undefined/null/empty), ẩn section
    if (depValue === undefined || depValue === null || depValue === '') {
      return false
    }

    switch (operator) {
      case 'equals':
        return depValue === value

      case 'not_equals':
        return depValue !== value

      case 'in':
        // Kiểm tra depValue có trong array value không
        if (!Array.isArray(value)) {
          console.warn(`Operator 'in' requires array value, got:`, typeof value)
          return false
        }
        return value.includes(depValue)

      case 'contains':
        // Dùng cho checkbox_group: depValue là array, kiểm tra có chứa value không
        if (!Array.isArray(depValue)) {
          return false
        }
        if (Array.isArray(value)) {
          // Nếu value là array, kiểm tra có ít nhất một phần tử trong depValue
          return value.some(v => depValue.includes(v))
        }
        return depValue.includes(value)

      default:
        console.warn(`Unknown operator: ${operator}, defaulting to show`)
        return true
    }
  }

  // Legacy: fallback sang show_if nếu vẫn còn dùng
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

  // Không có điều kiện hoặc tất cả điều kiện đều thỏa mãn
  return true
}

// Helper function để check conditional cho group
// Ưu tiên dùng conditional_logic từ API; fallback sang show_if (legacy)
const shouldShowGroup = (group: any): boolean => {
  if (!group) return true

  // New conditional_logic từ API
  const logic = group.conditional_logic?.show

  if (logic) {
    const depFieldName = logic.field
    const operator = logic.operator || 'equals'
    const value = logic.value

    const depValue = formValues[depFieldName]

    if (operator === 'contains') {
      // Dùng cho checkbox_group: depValue là array
      if (!Array.isArray(depValue)) return false
      return depValue.includes(value)
    }

    if (operator === 'equals') {
      return depValue === value
    }

    // Fallback an toàn nếu operator không hỗ trợ
    return true
  }

  // Legacy: fallback sang show_if nếu vẫn còn dùng
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

  // Không có điều kiện hoặc tất cả điều kiện đều thỏa mãn
  return true
}

// Helper function để lấy label/text an toàn theo locale
const getLocalizedText = (obj: any, currentLocale: 'vi' | 'en' = locale.value): string => {
  if (!obj) return ''
  
  // Nếu là object có en/vi
  if (typeof obj === 'object' && ('en' in obj || 'vi' in obj)) {
    return obj[currentLocale] || obj.en || obj.vi || ''
  }
  
  // Nếu là string, return luôn
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
  
  if (isFocused) {
    return `${baseClasses} transition-colors bg-blue-50 border-2 border-blue-400`
  }
  if (hasValue) {
    return `${baseClasses} transition-colors bg-blue-50 border-gray-300`
  }
  return `${baseClasses} transition-colors bg-white border-gray-300`
}

// ===== Checkbox Group Functions =====
// Kiểm tra checkbox có được chọn không
const isCheckboxSelected = (fieldName: string, value: string): boolean => {
  const fieldValue = formValues[fieldName]
  if (Array.isArray(fieldValue)) {
    return fieldValue.includes(value)
  }
  return false
}

// Toggle checkbox (thêm/xóa giá trị trong array)
const toggleCheckbox = (fieldName: string, value: string) => {
  if (!formValues[fieldName]) {
    formValues[fieldName] = []
  }
  const currentValues = formValues[fieldName] || []
  const index = currentValues.indexOf(value)
  
  if (index > -1) {
    // Nếu đã có, xóa khỏi array
    currentValues.splice(index, 1)
  } else {
    // Nếu chưa có, thêm vào array
    currentValues.push(value)
  }
  
  // Tạo array mới để trigger reactivity
  formValues[fieldName] = [...currentValues]
}

// ===== Residence Period Table Functions =====
// Tìm field theo tên trong schema
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

// Thêm residence period mới
const addResidencePeriod = (fieldName: string) => {
  if (!formValues[fieldName]) {
    formValues[fieldName] = []
  }
  
  const field = findFieldByName(fieldName)
  if (!field || !field.fields_template) return
  
  // Tạo object mới với các field từ template
  const newPeriod: Record<string, any> = {}
  field.fields_template.forEach((templateField: any) => {
    newPeriod[templateField.name] = ''
  })
  
  formValues[fieldName].push(newPeriod)
}

// Xóa residence period
const removeResidencePeriod = (fieldName: string, index: number) => {
  if (formValues[fieldName] && Array.isArray(formValues[fieldName])) {
    formValues[fieldName].splice(index, 1)
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
  
  ctx.beginPath()
  ctx.moveTo(event.clientX - rect.left, event.clientY - rect.top)
}

// Handle signature mouse move
const handleSignatureMouseMove = (event: MouseEvent, canvas: HTMLCanvasElement) => {
  if (!isDrawing.value) return
  
  const rect = canvas.getBoundingClientRect()
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  ctx.lineTo(event.clientX - rect.left, event.clientY - rect.top)
  ctx.stroke()
}

// Handle signature mouse up
const handleSignatureMouseUp = (canvas: HTMLCanvasElement) => {
  if (!isDrawing.value) return
  isDrawing.value = false
  
  // Save signature as base64
  const dataURL = canvas.toDataURL('image/png')
  formValues['applicant_signature'] = dataURL
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
  ctx.beginPath()
  ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top)
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
  ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top)
  ctx.stroke()
}

// Handle signature touch end (for mobile)
const handleSignatureTouchEnd = (event: TouchEvent, canvas: HTMLCanvasElement) => {
  event.preventDefault()
  if (!isDrawing.value) return
  isDrawing.value = false
  
  // Save signature as base64
  const dataURL = canvas.toDataURL('image/png')
  formValues['applicant_signature'] = dataURL
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
}

// ===== Grid layout helpers =====
// Tính CSS variables cho group, dùng cho grid trên PC (desktop)
const getGroupGridStyle = (group: any) => {
  const colsRaw = group?.grid_cols ?? group?.gridCols
  const colsNumber = typeof colsRaw === 'number' ? colsRaw : parseInt(colsRaw ?? '0', 10)
  const cols = colsNumber && colsNumber > 0 ? colsNumber : 1

  return {
    '--group-cols': cols
  }
}

// Tính CSS variables cho field, dùng cho grid-column trên PC
const getFieldGridStyle = (field: any) => {
  const spanRaw = field?.col_span ?? field?.colSpan
  const spanNumber = typeof spanRaw === 'number' ? spanRaw : parseInt(spanRaw ?? '0', 10)
  const span = spanNumber && spanNumber > 0 ? spanNumber : 1

  return {
    '--field-span': span
  }
}

// Flag để tránh watch(locale) trigger khi đang restore dữ liệu
const isRestoringData = ref(false)

// Load dữ liệu đã lưu và fetch schema khi component mounts
onMounted(async () => {
  // Load dữ liệu đã lưu từ localStorage với formSlug 'n-600' (nếu có)
  const savedData = loadFormData('n-600')
  if (savedData) {
    console.log('Restoring saved data:', savedData)
    isRestoringData.value = true
    
    // Restore locale (watch sẽ không trigger vì isRestoringData = true)
    locale.value = savedData.locale
    
    // Restore form values
    Object.assign(formValues, savedData.formValues)
    console.log('Form values after restore:', { ...formValues })
    
    // Fetch schema sau khi restore dữ liệu
    await fetchSchema()
    
    console.log('Form values after fetchSchema:', { ...formValues })
    isRestoringData.value = false
  } else {
    // Không có dữ liệu đã lưu, khởi tạo mới
    await fetchSchema()
  }
})

// Lưu form data khi locale thay đổi
watch(locale, () => {
  // Bỏ qua nếu đang restore dữ liệu
  if (isRestoringData.value) return
  
  // Reload schema với locale mới
  fetchSchema()
  
  // Lưu ngay khi đổi locale (không debounce)
  saveFormData(formValues, locale.value, 'n-600')
})

// Auto-save form values to localStorage với debounce khi user nhập
let saveTimeout: ReturnType<typeof setTimeout> | null = null
let isInitialMount = true

watch(
  () => formValues,
  () => {
    // Bỏ qua lần đầu mount (khi formValues được khởi tạo)
    if (isInitialMount) {
      isInitialMount = false
      console.log('Skipping save: initial mount')
      return
    }
    
    // Bỏ qua nếu đang restore dữ liệu
    if (isRestoringData.value) {
      console.log('Skipping save: currently restoring data')
      return
    }
    
    // Clear timeout cũ nếu có
    if (saveTimeout) {
      clearTimeout(saveTimeout)
    }
    
    // Debounce: chỉ lưu sau 500ms khi user ngừng nhập
    saveTimeout = setTimeout(() => {
      console.log('Auto-saving form data to localStorage', {
        formValuesKeys: Object.keys(formValues),
        hasData: Object.keys(formValues).length > 0
      })
      saveFormData(formValues, locale.value, 'n-600')
    }, 500)
  },
  { deep: true, flush: 'post' }
)

// ===== Submit Functions =====
// Submit state
const isSubmitting = ref(false)
const submitError = ref<string | null>(null)

// Thank you modal state
const showThankYouModal = ref(false)
const submissionId = ref<string | null>(null)

// Handle form submit
const handleSubmit = async () => {
  // Validate required fields
  if (!formValues['applicant_full_name']) {
    const message = locale.value === 'vi' 
      ? 'Vui lòng điền họ và tên của người điền đơn'
      : 'Please enter the full name of the applicant'
    alert(message)
    return
  }
  
  if (!formValues['applicant_signature']) {
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
    const applicantFullName = formValues['applicant_full_name'] || ''
    const applicantSignature = formValues['applicant_signature'] || ''
    
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
      applicant_full_name: applicantFullName,
      applicant_signature: applicantSignature,
      // All form data (includes all fields including applicant_full_name and applicant_signature)
      form_data: formValues,
      submitted_at: new Date().toISOString()
    }

    console.log('Submitting N-600 form data:', {
      applicant_full_name: submitData.applicant_full_name,
      applicant_full_name_length: submitData.applicant_full_name?.length || 0,
      applicant_signature: submitData.applicant_signature ? `Present (${submitData.applicant_signature.substring(0, 50)}...)` : 'Missing',
      applicant_signature_length: submitData.applicant_signature?.length || 0,
      form_data_has_applicant_full_name: 'applicant_full_name' in formValues,
      form_data_has_applicant_signature: 'applicant_signature' in formValues,
      form_data_keys: Object.keys(submitData.form_data)
    })

    // Call API
    const response = await submitForm('n-600', submitData)

    if (response.success) {
      // Clear saved form data sau khi submit thành công
      clearFormData('n-600')
      
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
  <div class="max-w-3xl mx-auto p-6">
    <h1 class="text-3xl font-bold mb-6">
      {{ locale === 'vi' ? 'Biểu mẫu N-600 từ ICAVIET' : 'N-600 Form from ICAVIET' }}
    </h1>

    <!-- Box cam kết bảo mật thông tin -->
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
              <span class="text-blue-700">›</span>
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
        <span class="text-xl">🇻🇳</span>
        <span>VI</span>
      </button>
      <button
        class="px-3 py-1 border rounded flex items-center gap-2"
        :class="locale === 'en' ? 'bg-gray-200' : ''"
        @click="locale = 'en'"
      >
        <span class="text-xl">🇺🇸</span>
        <span>EN</span>
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

    <!-- Render toàn bộ schema -->
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
        <h2 v-if="section" class="text-2xl font-semibold mb-4">
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
          <!-- Group title: chỉ hiển thị khi có title, không fallback sang order/id -->
          <h3 
            v-if="group && getLocalizedText(group.title, locale)" 
            class="text-xl font-semibold mb-4 pb-2 border-b border-gray-200 text-gray-800"
          >
            {{ getLocalizedText(group.title, locale) }}
          </h3>

          <!-- Grid container cho các field trong group -->
          <div
            class="group-grid grid gap-4"
            :style="getGroupGridStyle(group)"
          >
            <!-- Render fields -->
            <template
              v-for="(field, fieldIndex) in ((group?.fields || []) as any[])"
              :key="field?.id || field?.name || `field-${sectionIndex}-${groupIndex}-${fieldIndex}`"
            >
              <!-- Field với conditional - chỉ render nếu shouldShowField = true -->
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
                    class="flex items-center gap-2 cursor-pointer px-3 py-2 rounded border-2 transition-all"
                    :class="{
                      'bg-blue-100 border-blue-400': isCheckboxSelected(field.name, option.value),
                      'border-gray-200 hover:bg-gray-50': !isCheckboxSelected(field.name, option.value)
                    }"
                  >
                    <input
                      type="checkbox"
                      :value="option.value"
                      :checked="isCheckboxSelected(field.name, option.value)"
                      @change="toggleCheckbox(field.name, option.value)"
                      class="cursor-pointer"
                    />
                    <span>{{ getLocalizedText(option.label, locale) }}</span>
                  </label>
                </div>
              </div>

              <!-- Residence Period Table -->
              <div v-else-if="field.type === 'residence_period_table'" class="mb-6">
                <div class="space-y-2 mb-4">
                  <p class="text-base font-semibold text-gray-800">
                    {{ getLocalizedText(field.label, locale) }}
                    <span v-if="field.required" class="text-red-500">*</span>
                  </p>
                </div>

                <!-- Debug info (chỉ trong dev mode) -->
                <div v-if="!field.fields_template || field.fields_template.length === 0" class="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                  ⚠️ Warning: fields_template is missing or empty for field "{{ field.name }}"
                </div>

                <!-- Render các period rows -->
                <div
                  v-for="(period, periodIndex) in ((formValues[field.name] || []) as any[])"
                  :key="`period-${periodIndex}`"
                  class="mb-4 border border-gray-200 rounded-lg p-4 bg-white"
                >
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div
                      v-for="templateField in (field.fields_template || [])"
                      :key="templateField.id || templateField.name"
                      class="flex flex-col"
                    >
                      <label class="text-sm font-medium mb-1">
                        {{ getLocalizedText(templateField.label, locale) }}
                        <span v-if="templateField.required" class="text-red-500">*</span>
                      </label>
                      <!-- Date input: render as MM / DD / YYYY selects -->
                      <div v-if="templateField.type === 'date'" class="grid grid-cols-3 gap-2">
                        <select
                          :value="getDatePart(period[templateField.name], 'month')"
                          :class="getInputClasses(`${field.name}_${periodIndex}_${templateField.name}_month`, 'border rounded px-3 py-2', getDatePart(period[templateField.name], 'month'))"
                          @change="setPeriodDatePart(period, templateField.name, 'month', ($event.target as HTMLSelectElement).value)"
                          @focus="handleInputFocus(`${field.name}_${periodIndex}_${templateField.name}_month`)"
                          @blur="handleInputBlur"
                        >
                          <option value="">MM</option>
                          <option v-for="month in monthOptions" :key="month" :value="month">{{ month }}</option>
                        </select>
                        <select
                          :value="getDatePart(period[templateField.name], 'day')"
                          :class="getInputClasses(`${field.name}_${periodIndex}_${templateField.name}_day`, 'border rounded px-3 py-2', getDatePart(period[templateField.name], 'day'))"
                          @change="setPeriodDatePart(period, templateField.name, 'day', ($event.target as HTMLSelectElement).value)"
                          @focus="handleInputFocus(`${field.name}_${periodIndex}_${templateField.name}_day`)"
                          @blur="handleInputBlur"
                        >
                          <option value="">DD</option>
                          <option v-for="day in dayOptions" :key="day" :value="day">{{ day }}</option>
                        </select>
                        <select
                          :value="getDatePart(period[templateField.name], 'year')"
                          :class="getInputClasses(`${field.name}_${periodIndex}_${templateField.name}_year`, 'border rounded px-3 py-2', getDatePart(period[templateField.name], 'year'))"
                          @change="setPeriodDatePart(period, templateField.name, 'year', ($event.target as HTMLSelectElement).value)"
                          @focus="handleInputFocus(`${field.name}_${periodIndex}_${templateField.name}_year`)"
                          @blur="handleInputBlur"
                        >
                          <option value="">YYYY</option>
                          <option v-for="year in yearOptions" :key="year" :value="year">{{ year }}</option>
                        </select>
                      </div>
                      <!-- Text input (default) -->
                      <input
                        v-else
                        v-model="period[templateField.name]"
                        :type="templateField.type || 'text'"
                        :placeholder="getLocalizedText(templateField.placeholder, locale)"
                        :class="getInputClasses(`${field.name}_${periodIndex}_${templateField.name}`, 'border rounded px-3 py-2', period[templateField.name])"
                        @focus="handleInputFocus(`${field.name}_${periodIndex}_${templateField.name}`)"
                        @blur="handleInputBlur"
                      />
                    </div>
                  </div>

                  <!-- Button xóa period (chỉ hiển thị nếu is_repeatable = true) -->
                  <div v-if="field.is_repeatable || field.isRepeatable" class="mt-4 flex justify-end">
                    <button
                      type="button"
                      class="px-3 py-1 text-sm border rounded bg-red-50 text-red-600 hover:bg-red-100"
                      @click="removeResidencePeriod(field.name, periodIndex)"
                    >
                      {{ locale === 'vi' ? 'Xóa' : 'Remove' }}
                    </button>
                  </div>
                </div>

                <!-- Button thêm period -->
                <!-- Hiển thị nếu: is_repeatable = true HOẶC chưa có period nào (để thêm period đầu tiên) -->
                <button
                  v-if="(field.is_repeatable || field.isRepeatable) || (!formValues[field.name] || formValues[field.name].length === 0)"
                  type="button"
                  @click="addResidencePeriod(field.name)"
                  class="mt-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded flex items-center gap-2"
                >
                  <span>+</span>
                  <span>{{ locale === 'vi' ? 'Thêm' : 'Add' }}</span>
                </button>
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
                  <option value="">{{ getLocalizedText(field.placeholder, locale) || (locale === 'vi' ? 'Chọn...' : 'Please Select...') }}</option>
                  <option
                    v-for="option in (field.options || [])"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ getLocalizedText(option.label, locale) || option.value }}
                  </option>
                </select>
              </div>

              <!-- Date field: render as MM / DD / YYYY selects -->
              <div v-else-if="field.type === 'date'" class="flex flex-col mb-4">
                <label class="text-base font-medium mt-2 mb-1">
                  {{ getLocalizedText(field.label, locale) }}
                  <span v-if="field.required" class="text-red-500">*</span>
                </label>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <select
                    :value="getDatePart(formValues[field.name], 'month')"
                    :class="getInputClasses(`${field.name}_month`, 'border rounded px-3 py-2', getDatePart(formValues[field.name], 'month'))"
                    @change="setDatePart(field.name, 'month', ($event.target as HTMLSelectElement).value)"
                    @focus="handleInputFocus(`${field.name}_month`)"
                    @blur="handleInputBlur"
                  >
                    <option value="">MM</option>
                    <option v-for="month in monthOptions" :key="month" :value="month">{{ month }}</option>
                  </select>
                  <select
                    :value="getDatePart(formValues[field.name], 'day')"
                    :class="getInputClasses(`${field.name}_day`, 'border rounded px-3 py-2', getDatePart(formValues[field.name], 'day'))"
                    @change="setDatePart(field.name, 'day', ($event.target as HTMLSelectElement).value)"
                    @focus="handleInputFocus(`${field.name}_day`)"
                    @blur="handleInputBlur"
                  >
                    <option value="">DD</option>
                    <option v-for="day in dayOptions" :key="day" :value="day">{{ day }}</option>
                  </select>
                  <select
                    :value="getDatePart(formValues[field.name], 'year')"
                    :class="getInputClasses(`${field.name}_year`, 'border rounded px-3 py-2', getDatePart(formValues[field.name], 'year'))"
                    @change="setDatePart(field.name, 'year', ($event.target as HTMLSelectElement).value)"
                    @focus="handleInputFocus(`${field.name}_year`)"
                    @blur="handleInputBlur"
                  >
                    <option value="">YYYY</option>
                    <option v-for="year in yearOptions" :key="year" :value="year">{{ year }}</option>
                  </select>
                </div>
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
                    class="border rounded bg-white cursor-crosshair w-full max-w-full touch-none"
                    @mousedown="(e) => { const canvas = e.target as HTMLCanvasElement; initSignatureCanvas(canvas); handleSignatureMouseDown(e, canvas); }"
                    @mousemove="(e) => handleSignatureMouseMove(e, e.target as HTMLCanvasElement)"
                    @mouseup="(e) => handleSignatureMouseUp(e.target as HTMLCanvasElement)"
                    @mouseleave="(e) => handleSignatureMouseUp(e.target as HTMLCanvasElement)"
                    @touchstart="(e) => { const canvas = e.target as HTMLCanvasElement; initSignatureCanvas(canvas); handleSignatureTouchStart(e, canvas); }"
                    @touchmove="(e) => handleSignatureTouchMove(e, e.target as HTMLCanvasElement)"
                    @touchend="(e) => handleSignatureTouchEnd(e, e.target as HTMLCanvasElement)"
                    @touchcancel="(e) => handleSignatureTouchEnd(e, e.target as HTMLCanvasElement)"
                  ></canvas>
                  <div class="mt-2 flex gap-2">
                    <button
                      type="button"
                      @click="clearSignature(field.name)"
                      class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
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
                <div class="flex flex-col sm:flex-row sm:flex-wrap gap-2">
                  <label
                    v-for="option in field.options"
                    :key="option.value"
                    class="flex items-center gap-2 cursor-pointer px-3 py-2 rounded transition-all"
                    :class="{
                      'bg-blue-100 border-2 border-blue-400': formValues[field.name] === option.value,
                      'border-2 border-transparent hover:bg-gray-50': formValues[field.name] !== option.value
                    }"
                  >
                    <input
                      type="radio"
                      :name="field.name"
                      :value="option.value"
                      v-model="formValues[field.name]"
                      class="cursor-pointer"
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
                <textarea
                  v-model="formValues[field.name]"
                  rows="3"
                  :placeholder="getLocalizedText(field.placeholder, locale)"
                  :class="getInputClasses(field.name, 'border rounded px-3 py-2 resize-y', formValues[field.name])"
                  @focus="handleInputFocus(field.name)"
                  @blur="handleInputBlur"
                ></textarea>
              </div>

              <!-- Text input (default) -->
              <div v-else class="flex flex-col mb-4">
                <label v-if="!field.hide_label" class="text-base font-medium mt-2 mb-1">
                  {{ getLocalizedText(field.label, locale) }}
                  <span v-if="field.required" class="text-red-500">*</span>
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
        <div class="bg-white rounded-lg shadow-lg p-8 text-center max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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

/* Mobile: luôn 1 cột, bỏ qua grid_cols/col_span */
.group-grid {
  grid-template-columns: minmax(0, 1fr);
}

/* PC (md+): áp dụng grid_cols và col_span */
@media (min-width: 768px) {
  .group-grid {
    grid-template-columns: repeat(var(--group-cols, 1), minmax(0, 1fr));
  }

  .field-grid-item {
    grid-column: span var(--field-span, 1) / span var(--field-span, 1);
  }
}
</style>











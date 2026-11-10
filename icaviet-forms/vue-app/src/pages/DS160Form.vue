<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useFormApi } from '@/composables/useFormApi'
import { useFormPersistence } from '@/composables/useFormPersistence'
import { useAssetUrl } from '@/composables/useAssetUrl'
import DateSelect from '@/components/DateSelect.vue'

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

// Helper to detect date fields
const isDateField = (field: any, currentLocale: string) => {
  if (!field) return false;
  if (field.type === 'date') return true;
  
  // If it's explicitly a different input type that can't be a date, skip
  if (field.type === 'radio' || field.type === 'checkbox' || field.type === 'select' || field.type === 'file' || field.type === 'textarea') {
    return false;
  }
  
  // Check field name for 'date' (catches birthDate, issueDate, expirationDate, etc.)
  if (field.name && typeof field.name === 'string') {
    const nameLower = field.name.toLowerCase();
    if (nameLower.includes('date') && !nameLower.includes('update') && !nameLower.includes('candidate')) {
      return true;
    }
  }
  
  // Check if label indicates a date field based on common patterns
  const enLabel = (field.label && (field.label.en || field.label)) || '';
  const viLabel = (field.label && (field.label.vi || field.label)) || '';
  const labelStr = String(enLabel + ' ' + viLabel).toLowerCase();
  
  const dateKeywords = [
    '(dd/mm/yyyy)', 'ngày sinh', 'sinh ngày', 'date of birth', 
    'ngày cấp', 'date of issue', 'ngày hết hạn', 'expiration date',
    'ngày bắt đầu', 'ngày nghỉ', 'ngày kết hôn', 'ngày ly hôn', 'ngày ly dị',
    'ngày đến', 'ngày đi', 'ngày về', 'từ ngày', 'đến ngày', 'ngày dự định', 'ngày dự kiến'
  ];
  
  for (const keyword of dateKeywords) {
    if (labelStr.includes(keyword)) {
      return true;
    }
  }
  
  return false;
};

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

// Fetch schema from API với slug 'DS-160'
const fetchSchema = async () => {
  console.log('fetchSchema called')
  loadingSchema.value = true
  schemaError.value = null

  try {
    console.log('Calling getForm with slug: DS-160, locale:', locale.value)
    // Gọi API để lấy schema với slug 'DS-160' và locale hiện tại
    const data = await getForm('DS-160', locale.value)
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

// Helper function để check conditional cho option
const shouldShowOption = (option: any): boolean => {
  if (!option) return true

  if (option.hide_if) {
    const conditions = option.hide_if
    for (const [key, value] of Object.entries(conditions)) {
      const fieldValue = formValues[key]
      if (Array.isArray(value)) {
        if (value.includes(fieldValue)) return false
      } else {
        if (fieldValue === value) return false
      }
    }
  }

  if (option.show_if) {
    const conditions = option.show_if
    for (const [key, value] of Object.entries(conditions)) {
      const fieldValue = formValues[key]
      if (Array.isArray(value)) {
        if (!value.includes(fieldValue)) return false
      } else {
        if (fieldValue !== value) return false
      }
    }
  }

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

// Toggle lựa chọn Có/Không trong bảng lặp bằng checkbox nhưng chỉ cho chọn 1 giá trị
const toggleRepeatableSingleChoice = (period: Record<string, any>, fieldName: string, value: string) => {
  period[fieldName] = period[fieldName] === value ? '' : value
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

// Đảm bảo field mạng xã hội có sẵn 1 dòng nhập khi người dùng chọn "Có".
const ensureRepeatableFirstRow = (fieldName: string) => {
  if (!Array.isArray(formValues[fieldName]) || formValues[fieldName].length === 0) {
    formValues[fieldName] = []
    addResidencePeriod(fieldName)
  }
}

// Khi đổi từ "Có" sang "Không có", xoá danh sách mạng xã hội để tránh lưu dữ liệu thừa.
const handleUseSocialMediaChange = (value: string) => {
  formValues.useSocialMedia = value

  if (value === 'Có') {
    ensureRepeatableFirstRow('socialMediaLinks')
  } else {
    formValues.socialMediaLinks = []
  }
}

// Xử lý upload file
const handleFileUpload = (e: Event, fieldName: string) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    const file = target.files[0]
    const reader = new FileReader()
    reader.onload = (evt) => {
      formValues[fieldName] = {
        name: file.name,
        type: file.type,
        data: evt.target?.result as string
      }
    }
    reader.readAsDataURL(file)
  } else {
    delete formValues[fieldName]
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
}

// ===== Grid layout helpers =====
// Tính CSS variables cho group, dùng cho grid trên PC (desktop)
const getGroupGridStyle = (group: any) => {
  const colsRaw = group?.grid_cols
  const colsNumber = typeof colsRaw === 'number' ? colsRaw : parseInt(colsRaw ?? '0', 10)
  const cols = colsNumber && colsNumber > 0 ? colsNumber : 1

  return {
    '--group-cols': cols
  }
}

// Tính CSS variables cho field, dùng cho grid-column trên PC
const getFieldGridStyle = (field: any) => {
  const spanRaw = field?.col_span
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
  // Load dữ liệu đã lưu từ localStorage với formSlug 'DS-160' (nếu có)
  const savedData = loadFormData('DS-160')
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
  saveFormData(formValues, locale.value, 'DS-160')
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
      saveFormData(formValues, locale.value, 'DS-160')
    }, 500)
  },
  { deep: true, flush: 'post' }
)

// Nếu người dùng đã chọn Có trước đó rồi reload form, tự hiện dòng nhập đầu tiên.
watch(
  () => formValues.useSocialMedia,
  (value) => {
    if (value === 'Có') {
      ensureRepeatableFirstRow('socialMediaLinks')
    }
  },
  { immediate: true }
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
  if (!formValues['declarantFullName']) {
    const message = locale.value === 'vi' 
      ? 'Vui lòng điền họ và tên của người điền đơn'
      : 'Please enter the full name of the applicant'
    alert(message)
    return
  }
  
  if (!formValues['declarantSignature']) {
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
    const applicantFullName = formValues['declarantFullName'] || ''
    const applicantSignature = formValues['declarantSignature'] || ''
    
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
      declarantFullName: applicantFullName,
      declarantSignature: applicantSignature,
      // All form data (includes all fields including declarantFullName and declarantSignature)
      form_data: formValues,
      submitted_at: new Date().toISOString()
    }

    console.log('Submitting DS-160 form data:', {
      declarantFullName: submitData.declarantFullName,
      declarantFullName_length: submitData.declarantFullName?.length || 0,
      declarantSignature: submitData.declarantSignature ? `Present (${submitData.declarantSignature.substring(0, 50)}...)` : 'Missing',
      declarantSignature_length: submitData.declarantSignature?.length || 0,
      form_data_has_declarantFullName: 'declarantFullName' in formValues,
      form_data_has_declarantSignature: 'declarantSignature' in formValues,
      form_data_keys: Object.keys(submitData.form_data)
    })

    // Call API
    const response = await submitForm('DS-160', submitData)

    if (response.success) {
      // Clear saved form data sau khi submit thành công
      clearFormData('DS-160')
      
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
      {{ locale === 'vi' ? 'Biểu mẫu DS-160 từ ICAVIET' : 'DS-160 Form from ICAVIET' }}
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
                    v-for="option in (field.options || []).filter(shouldShowOption)"
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
                  <div v-if="field.name === 'socialMediaLinks'" class="mb-3 text-sm font-medium text-gray-700">
                    {{ locale === 'vi' ? `Mạng xã hội #${periodIndex + 1}` : `Social media #${periodIndex + 1}` }}
                  </div>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <template v-for="templateField in (field.fields_template || [])" :key="templateField.id || templateField.name">
                      <!-- Riêng phần con của K1: chừa 1 ô trống bên phải dưới Quốc gia
                           để 2 câu hỏi Có/Không nằm cùng một hàng ngang. -->
                      <div
                        v-if="field.name === 'k1ChildrenList' && templateField.name === 'childTravelWithYou'"
                        class="hidden md:block"
                        aria-hidden="true"
                      ></div>

                      <div
                        class="flex flex-col"
                      >
                      <label class="text-sm font-medium mb-1">
                        {{ getLocalizedText(templateField.label, locale) }}
                        <span v-if="templateField.required" class="text-red-500">*</span>
                      </label>
                      <!-- Date input -->
                      <DateSelect
                        v-if="isDateField(templateField, locale)"
                        v-model="period[templateField.name]"
                        :locale="locale"
                        :base-class="getInputClasses(`${field.name}_${periodIndex}_${templateField.name}`, 'border rounded px-3 py-2', period[templateField.name])"
                        @focus="handleInputFocus(`${field.name}_${periodIndex}_${templateField.name}`)"
                        @blur="handleInputBlur"
                      />
                      <!-- Checkbox Có/Không trong bảng lặp: dùng checkbox nhưng chỉ cho chọn 1 lựa chọn -->
                      <div
                        v-else-if="templateField.type === 'radio'"
                        class="flex flex-col gap-2"
                      >
                        <label
                          v-for="option in (templateField.options || []).filter(shouldShowOption)"
                          :key="option.value"
                          class="flex items-center gap-2 cursor-pointer px-3 py-2 rounded border-2 transition-all"
                          :class="{
                            'bg-blue-100 border-blue-400': period[templateField.name] === option.value,
                            'border-gray-200 hover:bg-gray-50': period[templateField.name] !== option.value
                          }"
                        >
                          <input
                            type="checkbox"
                            :checked="period[templateField.name] === option.value"
                            @change="toggleRepeatableSingleChoice(period, templateField.name, option.value)"
                            class="cursor-pointer"
                          />
                          <span>{{ getLocalizedText(option.label, locale) || option.value }}</span>
                        </label>
                      </div>
                      <!-- Select input trong bảng lặp -->
                      <select
                        v-else-if="templateField.type === 'select'"
                        v-model="period[templateField.name]"
                        :class="getInputClasses(`${field.name}_${periodIndex}_${templateField.name}`, 'border rounded px-3 py-2', period[templateField.name])"
                        @focus="handleInputFocus(`${field.name}_${periodIndex}_${templateField.name}`)"
                        @blur="handleInputBlur"
                      >
                        <option value="">{{ locale === 'vi' ? 'Chọn...' : 'Please Select...' }}</option>
                        <option
                          v-for="option in (templateField.options || []).filter(shouldShowOption)"
                          :key="option.value"
                          :value="option.value"
                        >
                          {{ getLocalizedText(option.label, locale) || option.value }}
                        </option>
                      </select>
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
                    </template>
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
                  <span>
                    {{ field.name === 'socialMediaLinks'
                      ? (locale === 'vi' ? 'Thêm mạng xã hội' : 'Add social media')
                      : (locale === 'vi' ? 'Thêm' : 'Add') }}
                  </span>
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
                  <option value="">{{ locale === 'vi' ? 'Chọn...' : 'Please Select...' }}</option>
                  <option
                    v-for="option in (field.options || []).filter(shouldShowOption)"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ getLocalizedText(option.label, locale) || option.value }}
                  </option>
                </select>
              </div>

              <!-- Date field -->
              <div v-else-if="isDateField(field, locale)" class="flex flex-col mb-4">
                <label class="text-base font-medium mt-2 mb-1">
                  {{ getLocalizedText(field.label, locale) }}
                  <span v-if="field.required" class="text-red-500">*</span>
                </label>
                <DateSelect
                  v-model="formValues[field.name]"
                  :locale="locale"
                  :base-class="getInputClasses(field.name, 'border rounded px-3 py-2', formValues[field.name])"
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
                <div class="flex flex-col gap-2">
                  <label
                    v-for="option in (field.options || []).filter(shouldShowOption)"
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
                      :checked="formValues[field.name] === option.value"
                      @change="field.name === 'useSocialMedia' ? handleUseSocialMediaChange(option.value) : (formValues[field.name] = option.value)"
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

              <!-- File upload -->
              <div v-else-if="field.type === 'file'" class="flex flex-col mb-4">
                <label class="text-base font-medium mt-2 mb-1">
                  {{ getLocalizedText(field.label, locale) }}
                  <span v-if="field.required" class="text-red-500">*</span>
                </label>
                <div class="relative border-2 border-gray-300 rounded-lg px-4 py-8 hover:bg-gray-50 transition-colors text-center bg-white cursor-pointer group">
                  <input
                    type="file"
                    class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    @change="(e) => handleFileUpload(e, field.name)"
                  />
                  <div v-if="!formValues[field.name]" class="text-gray-500 flex flex-col items-center justify-center gap-3">
                    <svg class="w-8 h-8 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span class="text-sm font-medium">{{ locale === 'vi' ? 'Nhấn để chọn file tải lên' : 'Click to select file' }}</span>
                  </div>
                  <div v-else class="flex flex-col items-center justify-center gap-2 text-green-600">
                    <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 384 512">
                      <path d="M181.9 256.1c-5-16-4.9-46.9-2-46.9 8.4 0 7.6 36.9 2 46.9zm-1.7 47.2c-7.7 20.2-17.3 43.3-28.4 62.7 18.3-7 39-17.2 62.9-21.9-12.7-9.6-24.9-23.4-34.5-40.8zM86.1 428.1c0 .8 13.2-5.4 34.9-40.2-6.7 6.3-29.1 24.5-34.9 40.2zM261.4 314c25.2 0 36.6 5.9 36.6 15.6 0 14.4-23.5 14.4-44.5 4.3 6-9.1 7.6-18.7 7.9-19.9zm64.4-234.3l-90.8-90.8A48 48 0 0 0 201.1 0H48C21.5 0 0 21.5 0 48v416c0 26.5 21.5 48 48 48h288c26.5 0 48-21.5 48-48V127.6c0-12.7-5.1-24.9-14.2-33.9zM352 464c0 8.8-7.2 16-16 16H48c-8.8 0-16-7.2-16-16V48c0-8.8 7.2-16 16-16h144v88c0 13.2 10.8 24 24 24h88v320zm-24-118c0 30.6-51.5 35.8-68.5 36.4-22.1 12.3-46.2 27.6-64.8 45.4C179.8 442.2 145 464 122 464c-19.7 0-38-10.4-38-30.8 0-25 24-43.1 48-62.7 13.9-11.4 29.2-24.2 41.5-40.6 10-15.5 19.3-36.4 26.1-59.2-18.8-49.2-22.6-86.4-11.3-99.7 7.6-9 22.3-12.8 35.9-1.9 14.8 11.9 11 39.2 4.1 63.8 14.4 24.1 31.9 44.5 45.7 54.7 30.6-2.5 54-15.1 54-36.6z"/>
                    </svg>
                    <span class="font-medium truncate max-w-[200px]" :title="formValues[field.name].name">{{ formValues[field.name].name }}</span>
                  </div>
                </div>
              </div>

              <!-- Text input (default) -->
              <div v-else class="flex flex-col mb-4">
                <label class="text-base font-medium mt-2 mb-1">
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












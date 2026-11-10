<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useFormApi } from '@/composables/useFormApi'
import { useFormPersistence } from '@/composables/useFormPersistence'
import { useAssetUrl } from '@/composables/useAssetUrl'

const { getAssetUrl } = useAssetUrl()
const birthYearOptions = Array.from({ length: new Date().getFullYear() - 1915 + 1 }, (_, i) => new Date().getFullYear() - i)


// Note: Khi đổi ngôn ngữ, dữ liệu user đang nhập sẽ bị reset. => đã fix

const locale = ref<'vi' | 'en'>('vi')

// API client
const { getForm, submitForm } = useFormApi()

// Form persistence
const { saveFormData, loadFormData, clearFormData } = useFormPersistence()

// Schema state - sẽ được load từ API
const schema = ref<any>(null)
const loadingSchema = ref(false)
const schemaError = ref<string | null>(null)

// Translations for address history and work history fields
const translations = {
  vi: {
    address: 'Địa chỉ',
    startDate: 'Ngày bắt đầu ở',
    endDate: 'Ngày chuyển đi',
    profession: 'Nghề nghiệp',
    companyName: 'Tên công ty',
    workAddress: 'Địa chỉ',
    workStartDate: 'Ngày nhận việc',
    workEndDate: 'Ngày nghỉ việc',
    add: 'Thêm',
    remove: 'Xóa',
    addressPlaceholder: 'Nhập địa chỉ',
    professionPlaceholder: 'Nhập nghề nghiệp',
    companyPlaceholder: 'Nhập tên công ty',
    datePlaceholder: 'dd/mm/yyyy'
  },
  en: {
    address: 'Address',
    startDate: 'Start Date',
    endDate: 'End Date',
    profession: 'Profession',
    companyName: 'Company Name',
    workAddress: 'Address',
    workStartDate: 'Start Date',
    workEndDate: 'End Date',
    add: 'Add',
    remove: 'Remove',
    addressPlaceholder: 'Enter address',
    professionPlaceholder: 'Enter profession',
    companyPlaceholder: 'Enter company name',
    datePlaceholder: 'mm/dd/yyyy'
  }
}

const childrenTranslations = {
  vi: {
    documentNameTitle: 'Tên trên giấy tờ:',
    firstName: 'Tên:',
    lastName: 'Họ:',
    middleName: 'Tên lót:',
    birthDate: 'Ngày sinh (dd/mm/yyyy):',
    birthPlace: 'Nơi sinh:',
    currentAddress: 'Địa chỉ ở hiện tại:',
    alienNumber: 'Số A (nếu có):',
    relationship: 'Mối quan hệ:',
    relationshipOptions: [
      { value: 'biological', label: 'Con ruột' },
      { value: 'step', label: 'Con riêng' },
      { value: 'adopted', label: 'Con nuôi' },
      { value: 'other', label: 'Khác' }
    ],
    emptyHint: 'Tăng số lượng con để hiển thị các trường thông tin.'
  },
  en: {
    documentNameTitle: 'Legal name on documents:',
    firstName: 'First name:',
    lastName: 'Last name:',
    middleName: 'Middle name:',
    birthDate: 'Date of birth (mm/dd/yyyy):',
    birthPlace: 'Place of birth:',
    currentAddress: 'Current address:',
    alienNumber: 'Alien Number (if any):',
    relationship: 'Relationship:',
    relationshipOptions: [
      { value: 'biological', label: 'Biological' },
      { value: 'step', label: 'Stepchild' },
      { value: 'adopted', label: 'Adopted' },
      { value: 'other', label: 'Other' }
    ],
    emptyHint: 'Increase the total number of children to show detail fields.'
  }
}

const travelTranslations = {
  vi: {
    startDate: 'Ngày bắt đầu',
    endDate: 'Ngày kết thúc',
    destination: 'Đi đến quốc gia',
    totalDays: 'Tổng số ngày',
    addTrip: 'Thêm chuyến đi',
    removeTrip: 'Xóa chuyến đi'
  },
  en: {
    startDate: 'Start date',
    endDate: 'End date',
    destination: 'Country visited',
    totalDays: 'Total days',
    addTrip: 'Add trip',
    removeTrip: 'Remove trip'
  }
}

const offenseTranslations = {
  vi: {
    offense: 'Tội danh',
    date: 'Ngày bị',
    location: 'Nơi diễn ra (thành phố, quốc gia)',
    outcome: 'Kết quả (vô tội, tù, phạt, ...)',
    add: 'Thêm tiền án',
    remove: 'Xóa tiền án'
  },
  en: {
    offense: 'Offense/Charge',
    date: 'Date charged',
    location: 'Location (city, country)',
    outcome: 'Outcome (dismissed, jail, fine, etc.)',
    add: 'Add offense',
    remove: 'Remove offense'
  }
}

const organizationTranslations = {
  vi: {
    purpose: 'Mục đích',
    position: 'Chức vụ',
    startDate: 'Ngày bắt đầu',
    endDate: 'Ngày kết thúc',
    add: 'Thêm tổ chức',
    remove: 'Xóa tổ chức'
  },
  en: {
    purpose: 'Purpose',
    position: 'Position',
    startDate: 'Start Date',
    endDate: 'End Date',
    add: 'Add organization',
    remove: 'Remove organization'
  }
}

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

// Validation error translations
const validationTranslations: Record<'vi' | 'en', {
  fields: Record<string, string>
  messages: Record<string, string>
  patterns: Record<string, string>
}> = {
  vi: {
    // Field names
    fields: {
      customer_email: 'Email',
      customer_phone: 'Số điện thoại',
      applicant_full_name: 'Họ và tên',
      applicant_signature: 'Chữ ký',
      email: 'Email',
      phone: 'Số điện thoại'
    },
    // Error messages
    messages: {
      'The customer email field must be a valid email address.': 'Email phải là địa chỉ email hợp lệ.',
      'The :field field must be a valid email address.': 'Trường :field phải là địa chỉ email hợp lệ.',
      'The :field field is required.': 'Trường :field là bắt buộc.',
      'The :field field must be a valid phone number.': 'Trường :field phải là số điện thoại hợp lệ.',
      'The :field field must be at least :min characters.': 'Trường :field phải có ít nhất :min ký tự.',
      'The :field field must not exceed :max characters.': 'Trường :field không được vượt quá :max ký tự.'
    },
    // Common patterns
    patterns: {
      'must be a valid email address': 'phải là địa chỉ email hợp lệ',
      'is required': 'là bắt buộc',
      'must be a valid phone number': 'phải là số điện thoại hợp lệ',
      'must be at least': 'phải có ít nhất',
      'must not exceed': 'không được vượt quá',
      'characters': 'ký tự'
    }
  },
  en: {
    // Field names
    fields: {
      customer_email: 'Email',
      customer_phone: 'Phone number',
      applicant_full_name: 'Full name',
      applicant_signature: 'Signature',
      email: 'Email',
      phone: 'Phone number'
    },
    // Error messages (keep English as is, or customize)
    messages: {
      'The customer email field must be a valid email address.': 'The email field must be a valid email address.',
      'The :field field must be a valid email address.': 'The :field field must be a valid email address.',
      'The :field field is required.': 'The :field field is required.',
      'The :field field must be a valid phone number.': 'The :field field must be a valid phone number.',
      'The :field field must be at least :min characters.': 'The :field field must be at least :min characters.',
      'The :field field must not exceed :max characters.': 'The :field field must not exceed :max characters.'
    },
    // Common patterns
    patterns: {
      'must be a valid email address': 'must be a valid email address',
      'is required': 'is required',
      'must be a valid phone number': 'must be a valid phone number',
      'must be at least': 'must be at least',
      'must not exceed': 'must not exceed',
      'characters': 'characters'
    }
  }
}

const createEmptyChildInfo = () => ({
  firstName: '',
  lastName: '',
  middleName: '',
  birthDate: '',
  birthPlace: '',
  currentAddress: '',
  alienNumber: '',
  relationship: ''
})

const getChildHeading = (index: number | string, currentLocale: 'vi' | 'en') => {
  const numIndex = Number(index);
  if (currentLocale === 'vi') {
    return numIndex === 0 ? 'Con đầu:' : `Con thứ ${numIndex + 1}:`
  }
  return numIndex === 0 ? 'First child:' : `Child #${numIndex + 1}:`
}

const syncChildrenInfoList = (count: number) => {
  if (!Array.isArray(formValues.children_info_list)) {
    formValues.children_info_list = []
  }

  if (count < 0) {
    count = 0
  }

  const list = formValues.children_info_list
  if (list.length < count) {
    for (let i = list.length; i < count; i++) {
      list.push(createEmptyChildInfo())
    }
  } else if (list.length > count) {
    list.splice(count)
  }
}

const createEmptyTravelEntry = () => ({
  startDate: '',
  endDate: '',
  destination: '',
  totalDays: ''
})

const addTravelEntry = (fieldName: string) => {
  if (!Array.isArray(formValues[fieldName])) {
    formValues[fieldName] = []
  }
  formValues[fieldName].push(createEmptyTravelEntry())
}

const removeTravelEntry = (fieldName: string, index: number | string) => {
  const numIndex = Number(index);
  if (!Array.isArray(formValues[fieldName])) {
    return
  }
  if (formValues[fieldName].length > 1) {
    formValues[fieldName].splice(numIndex, 1)
  } else {
    formValues[fieldName][numIndex] = createEmptyTravelEntry()
  }
}

const createEmptyOffenseEntry = () => ({
  offense: '',
  date: '',
  location: '',
  outcome: ''
})

const addOffenseEntry = (fieldName: string) => {
  if (!Array.isArray(formValues[fieldName])) {
    formValues[fieldName] = []
  }
  formValues[fieldName].push(createEmptyOffenseEntry())
}

const removeOffenseEntry = (fieldName: string, index: number | string) => {
  const numIndex = Number(index);
  if (!Array.isArray(formValues[fieldName])) {
    return
  }
  if (formValues[fieldName].length > 1) {
    formValues[fieldName].splice(numIndex, 1)
  } else {
    formValues[fieldName][numIndex] = createEmptyOffenseEntry()
  }
}

const createEmptyOrganizationEntry = () => ({
  purpose: '',
  position: '',
  startDate: '',
  endDate: ''
})

const addOrganizationEntry = (fieldName: string) => {
  if (!Array.isArray(formValues[fieldName])) {
    formValues[fieldName] = []
  }
  formValues[fieldName].push(createEmptyOrganizationEntry())
}

const removeOrganizationEntry = (fieldName: string, index: number | string) => {
  const numIndex = Number(index);
  if (!Array.isArray(formValues[fieldName])) {
    return
  }
  if (formValues[fieldName].length > 1) {
    formValues[fieldName].splice(numIndex, 1)
  } else {
    formValues[fieldName][numIndex] = createEmptyOrganizationEntry()
  }
}

// Tạo object lưu value form
const formValues = reactive<Record<string, any>>({})

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

const phoneOnlyFields = new Set(['phone_primary', 'phone_secondary'])

const handlePhoneInput = (fieldName: string) => {
  if (!phoneOnlyFields.has(fieldName)) return
  const currentValue = formValues[fieldName]
  if (typeof currentValue === 'string') {
    formValues[fieldName] = currentValue.replace(/\D/g, '')
  }
}

// Get input classes with focus highlight, filled state, and error state
const getInputClasses = (fieldName: string, baseClasses: string = 'border rounded px-3 py-2', fieldValue?: any) => {
  const isFocused = focusedInput.value === fieldName
  const hasValue = fieldValue !== undefined && fieldValue !== null && fieldValue !== ''
  const hasError = fieldsWithErrors[fieldName] === true
  
  // Error state takes priority
  if (hasError) {
    return `${baseClasses} transition-colors bg-red-50 border-2 border-red-400`
  }
  
  if (isFocused) {
    return `${baseClasses} transition-colors bg-blue-50 border-2 border-blue-400`
  }
  if (hasValue) {
    return `${baseClasses} transition-colors bg-blue-50 border-gray-300`
  }
  return `${baseClasses} transition-colors bg-white border-gray-300`
}

// Signature canvas refs
const signatureCanvasRef = ref<HTMLCanvasElement | null>(null)
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

// Normalize schema từ API về format giống schema tĩnh
// Chuyển đổi từ format { title_en, title_vi } sang { title: { en, vi } }
const normalizeSchema = (apiSchema: any): any => {
  if (!apiSchema) return null

  // Nếu schema đã có format đúng (title: { en, vi }), return luôn
  if (apiSchema.sections && apiSchema.sections.length > 0) {
    const firstSection = apiSchema.sections[0]
    if (firstSection.title && typeof firstSection.title === 'object' && 'en' in firstSection.title) {
      // Schema đã đúng format, không cần normalize
      return apiSchema
    }
  }

  // Normalize sections
  const normalizedSections = apiSchema.sections?.map((section: any) => {
    const normalizedSection: any = {
      id: section.id,
      title: section.title_en && section.title_vi 
        ? { en: section.title_en, vi: section.title_vi }
        : section.title || { en: '', vi: '' },
      groups: section.groups?.map((group: any) => {
        const normalizedGroup: any = {
          id: group.id,
          title: group.title_en && group.title_vi
            ? { en: group.title_en, vi: group.title_vi }
            : group.title || { en: '', vi: '' },
          fields: group.fields?.map((field: any) => {
            const normalizedField: any = {
              ...field,
              label: field.label_en && field.label_vi
                ? { en: field.label_en, vi: field.label_vi }
                : field.label || { en: '', vi: '' },
              placeholder: field.placeholder_en && field.placeholder_vi
                ? { en: field.placeholder_en, vi: field.placeholder_vi }
                : field.placeholder || undefined
            }
            
            // Normalize options nếu có
            if (field.options_en && field.options_vi) {
              normalizedField.options = field.options_en.map((opt: any, index: number) => ({
                value: opt.value || opt,
                label: {
                  en: typeof opt === 'string' ? opt : (opt.label_en || opt.label?.en || opt),
                  vi: typeof field.options_vi[index] === 'string' 
                    ? field.options_vi[index] 
                    : (field.options_vi[index]?.label_vi || field.options_vi[index]?.label?.vi || field.options_vi[index])
                }
              }))
            } else if (field.options) {
              normalizedField.options = field.options
            }
            
            return normalizedField
          }) || []
        }
        return normalizedGroup
      }) || []
    }
    return normalizedSection
  }) || []

  return {
    ...apiSchema,
    sections: normalizedSections
  }
}

// Fetch schema from API
const fetchSchema = async (preserveData: boolean = false) => {
  loadingSchema.value = true
  schemaError.value = null

  try {
    const data = await getForm('i-90', locale.value)
    
    // Normalize schema về format đúng
    const normalizedData = normalizeSchema(data)
    console.log('Schema từ API (sau normalize):', normalizedData)
    
    schema.value = normalizedData
    
    // Initialize or merge form values after schema is loaded
    if (preserveData) {
      mergeFormValuesWithSchema()
    } else {
      initializeFormValues()
    }
  } catch (error: any) {
    console.error('Failed to fetch schema from API:', error)
    schemaError.value = error.message || 'Không thể tải schema từ API'
    
    // I-90 không có fallback schema, chỉ hiển thị error
    schema.value = null
    
    // Không initialize form values nếu không có schema
    if (!preserveData) {
      // Clear form values
      Object.keys(formValues).forEach(key => {
        delete formValues[key]
      })
    }
  } finally {
    loadingSchema.value = false
  }
}

// Helper function để lấy label/text an toàn
const getLocalizedText = (obj: any, locale: 'vi' | 'en'): string => {
  if (!obj) return ''
  
  // Nếu là object có en/vi
  if (typeof obj === 'object' && ('en' in obj || 'vi' in obj)) {
    return obj[locale] || obj.en || obj.vi || ''
  }
  
  // Nếu là string, return luôn
  if (typeof obj === 'string') {
    return obj
  }
  
  return ''
}

// Helper function để translate validation errors
const translateValidationError = (field: string, message: string, currentLocale: 'vi' | 'en'): string => {
  const translations = validationTranslations[currentLocale]
  
  // Translate field name
  const fieldLabel = translations.fields[field] || field
  
  // Check if exact message exists in translations
  if (translations.messages[message]) {
    return translations.messages[message].replace(':field', fieldLabel)
  }
  
  // Handle Laravel validation message format: "The customer_email field must be a valid email address."
  // Extract field name from message if it's in Laravel format
  let translatedMessage = message
  
  // Replace "The customer_email field" or "The field" patterns
  translatedMessage = translatedMessage.replace(/The\s+(\w+)\s+field/gi, (match, fieldNameInMessage) => {
    // Use fieldNameInMessage if it exists, otherwise use the field parameter
    const fieldToTranslate = fieldNameInMessage || field
    const translatedField = translations.fields[fieldToTranslate] || fieldToTranslate
    return currentLocale === 'vi' ? `Trường ${translatedField}` : `The ${translatedField} field`
  })
  
  // Replace field name in message (for cases where field name appears directly)
  translatedMessage = translatedMessage.replace(new RegExp(`\\b${field}\\b`, 'gi'), fieldLabel)
  
  // Translate common patterns
  Object.entries(translations.patterns).forEach(([pattern, translation]) => {
    if (translatedMessage.toLowerCase().includes(pattern.toLowerCase())) {
      translatedMessage = translatedMessage.replace(new RegExp(pattern, 'gi'), translation)
    }
  })
  
  return translatedMessage
}

// Initialize form values based on schema
// khởi tạo dữ liệu trả lời theo schema (reset tất cả)
const initializeFormValues = () => {
  if (!schema.value || !schema.value.sections) return
  
  schema.value.sections.forEach((section: any) => {
    section.groups.forEach((group: any) => {
      group.fields.forEach((field: any) => {
        if (field.type === 'address_history') {
          formValues[field.name] = [{ address: '', startDate: '', endDate: '' }]
        } else if (field.type === 'work_history') {
          formValues[field.name] = [{ profession: '', companyName: '', address: '', startDate: '', endDate: '' }]
        } else if (field.type === 'children_info') {
          formValues[field.name] = []
        } else if (field.type === 'travel_history') {
          formValues[field.name] = [createEmptyTravelEntry()]
        } else if (field.type === 'offense_history') {
          formValues[field.name] = [createEmptyOffenseEntry()]
        } else if (field.type === 'organization_history') {
          formValues[field.name] = [createEmptyOrganizationEntry()]
        } else if (field.type === 'signature') {
          formValues[field.name] = ''
        } else if (field.name === 'marriage_count' || field.name === 'current_spouse_marriage_count') {
          formValues[field.name] = '1'
        } else if (field.name === 'children_count') {
          formValues[field.name] = '0'
        } else {
          formValues[field.name] = ''
        }
      })
    })
  })
}

// Merge form values with schema (chỉ khởi tạo các field mới, giữ nguyên field đã có giá trị)
// Sử dụng khi đổi ngôn ngữ để preserve dữ liệu đã nhập
const mergeFormValuesWithSchema = () => {
  if (!schema.value || !schema.value.sections) {
    console.warn('Cannot merge: schema not loaded yet')
    return
  }
  
  console.log('Merging form values with schema. Current formValues keys:', Object.keys(formValues))
  
  schema.value.sections.forEach((section: any) => {
    section.groups.forEach((group: any) => {
      group.fields.forEach((field: any) => {
        // Chỉ khởi tạo nếu field chưa tồn tại trong formValues
        if (!(field.name in formValues)) {
          console.log(`Initializing new field: ${field.name}`)
          if (field.type === 'address_history') {
            formValues[field.name] = [{ address: '', startDate: '', endDate: '' }]
          } else if (field.type === 'work_history') {
            formValues[field.name] = [{ profession: '', companyName: '', address: '', startDate: '', endDate: '' }]
          } else if (field.type === 'children_info') {
            formValues[field.name] = []
          } else if (field.type === 'travel_history') {
            formValues[field.name] = [createEmptyTravelEntry()]
          } else if (field.type === 'offense_history') {
            formValues[field.name] = [createEmptyOffenseEntry()]
          } else if (field.type === 'organization_history') {
            formValues[field.name] = [createEmptyOrganizationEntry()]
          } else if (field.type === 'signature') {
            formValues[field.name] = ''
          } else if (field.name === 'marriage_count' || field.name === 'current_spouse_marriage_count') {
            formValues[field.name] = '1'
          } else if (field.name === 'children_count') {
            formValues[field.name] = '0'
          } else {
            formValues[field.name] = ''
          }
        } else {
          // Nếu field đã tồn tại, giữ nguyên giá trị hiện tại
          console.log(`Preserving existing field: ${field.name} =`, formValues[field.name])
        }
      })
    })
  })
  
  console.log('After merge. FormValues keys:', Object.keys(formValues))
}

// Submit state
const isSubmitting = ref(false)
const submitError = ref<string | null>(null)

// Thank you modal state
const showThankYouModal = ref(false)
const submissionId = ref<string | null>(null)

// Track fields with validation errors
const fieldsWithErrors = reactive<Record<string, boolean>>({})

// Mapping giữa backend field names và form field names
const fieldNameMapping: Record<string, string> = {
  'customer_email': 'email',
  'customer_phone': 'phone',
  'customer_name': 'applicant_full_name',
  'applicant_full_name': 'applicant_full_name',
  'applicant_signature': 'applicant_signature'
}

// Get validation errors for all required fields in I-90 form
const getValidationErrors = () => {
  const errors: Record<string, string> = {}
  
  const addError = (fieldName: string, viMsg: string, enMsg: string) => {
    errors[fieldName] = locale.value === 'vi' ? viMsg : enMsg
  }

  // 1. Legal Name
  if (!formValues.legal_first_name || !formValues.legal_first_name.trim()) addError('legal_first_name', 'Vui lòng điền Tên', 'Please enter your First Name')
  if (!formValues.legal_middle_name || !formValues.legal_middle_name.trim()) addError('legal_middle_name', 'Vui lòng điền Tên lót', 'Please enter your Middle Name')
  if (!formValues.legal_last_name || !formValues.legal_last_name.trim()) addError('legal_last_name', 'Vui lòng điền Họ', 'Please enter your Last Name')

  // 2. Name Change
  if (!formValues.has_name_changed_since_green_card) {
    addError('has_name_changed_since_green_card', 'Vui lòng chọn câu hỏi về việc đổi tên', 'Please answer the name change question')
  } else if (formValues.has_name_changed_since_green_card === 'Có') {
    if (!formValues.current_gc_first_name || !formValues.current_gc_first_name.trim()) addError('current_gc_first_name', 'Vui lòng điền Tên trên thẻ xanh hiện tại', 'Please enter First Name on current green card')
    if (!formValues.current_gc_middle_name || !formValues.current_gc_middle_name.trim()) addError('current_gc_middle_name', 'Vui lòng điền Tên lót trên thẻ xanh hiện tại', 'Please enter Middle Name on current green card')
    if (!formValues.current_gc_last_name || !formValues.current_gc_last_name.trim()) addError('current_gc_last_name', 'Vui lòng điền Họ trên thẻ xanh hiện tại', 'Please enter Last Name on current green card')
  }

  // 3. Gender
  if (!formValues.gender) addError('gender', 'Vui lòng chọn Giới tính', 'Please select Gender')

  // 4. DOB
  if (!formValues.date_of_birth_month || !formValues.date_of_birth_day || !formValues.date_of_birth_year) {
    addError('date_of_birth_month', 'Vui lòng điền đầy đủ Ngày sinh', 'Please enter complete Date of Birth')
  }

  // 5. Place of Birth
  if (!formValues.place_of_birth_city || !formValues.place_of_birth_city.trim()) addError('place_of_birth_city', 'Vui lòng điền Huyện/Thành phố sinh', 'Please enter District/City of birth')
  if (!formValues.place_of_birth_province || !formValues.place_of_birth_province.trim()) addError('place_of_birth_province', 'Vui lòng điền Tỉnh sinh', 'Please enter Province/State of birth')
  if (!formValues.place_of_birth_country || !formValues.place_of_birth_country.trim()) addError('place_of_birth_country', 'Vui lòng điền Quốc gia sinh', 'Please enter Country of birth')

  // 6. Country of Citizenship
  if (!formValues.citizenship_country || !formValues.citizenship_country.trim()) addError('citizenship_country', 'Vui lòng điền Quốc tịch', 'Please enter Country of Citizenship')

  // 7. Contact info
  if (!formValues.phone_primary || !formValues.phone_primary.trim()) {
    addError('phone_primary', 'Vui lòng điền Số điện thoại chính', 'Please enter Primary Phone Number')
  } else if (!/^[0-9]+$/.test(formValues.phone_primary)) {
    addError('phone_primary', 'Số điện thoại chỉ được nhập số, không nhập chữ hoặc ký tự', 'Phone number can contain digits only')
  }
  if (formValues.phone_secondary && formValues.phone_secondary.trim() && !/^[0-9]+$/.test(formValues.phone_secondary)) {
    addError('phone_secondary', 'Số điện thoại khác chỉ được nhập số, không nhập chữ hoặc ký tự', 'Other phone number can contain digits only')
  }
  if (!formValues.email || !formValues.email.trim()) addError('email', 'Vui lòng điền Email', 'Please enter Email Address')

  // 8. Mailing Address
  if (!formValues.mailing_address_street || !formValues.mailing_address_street.trim()) addError('mailing_address_street', 'Vui lòng điền số nhà/đường địa chỉ nhận thư', 'Please enter Mailing Address Street')
  if (!formValues.mailing_address_city || !formValues.mailing_address_city.trim()) addError('mailing_address_city', 'Vui lòng điền Huyện/Thành phố nhận thư', 'Please enter Mailing Address District/City')
  if (!formValues.mailing_address_province || !formValues.mailing_address_province.trim()) addError('mailing_address_province', 'Vui lòng điền Tỉnh/Bang nhận thư', 'Please enter Mailing Address Province/State')
  if (!formValues.mailing_address_zip || !formValues.mailing_address_zip.trim()) addError('mailing_address_zip', 'Vui lòng điền ZIP/Mã bưu chính địa chỉ nhận thư', 'Please enter Mailing Address ZIP/Postal Code')
  if (!formValues.mailing_address_country || !formValues.mailing_address_country.trim()) addError('mailing_address_country', 'Vui lòng điền Quốc gia nhận thư', 'Please enter Mailing Address Country')

  // 9. Lives at mailing address
  if (!formValues.lives_at_mailing_address) {
    addError('lives_at_mailing_address', 'Vui lòng trả lời câu hỏi Đương đơn sống ở địa chỉ nhận thư?', 'Please answer if you currently live at your mailing address')
  } else if (formValues.lives_at_mailing_address === 'Không') {
    if (!formValues.physical_address_street || !formValues.physical_address_street.trim()) addError('physical_address_street', 'Vui lòng điền số nhà/đường địa chỉ hiện tại', 'Please enter Current Physical Address Street')
    if (!formValues.physical_address_city || !formValues.physical_address_city.trim()) addError('physical_address_city', 'Vui lòng điền Huyện/Thành phố địa chỉ hiện tại', 'Please enter Current Physical Address District/City')
    if (!formValues.physical_address_province || !formValues.physical_address_province.trim()) addError('physical_address_province', 'Vui lòng điền Tỉnh/Bang địa chỉ hiện tại', 'Please enter Current Physical Address Province/State')
    if (!formValues.physical_address_zip || !formValues.physical_address_zip.trim()) addError('physical_address_zip', 'Vui lòng điền ZIP/Mã bưu chính địa chỉ hiện tại', 'Please enter Current Physical Address ZIP/Postal Code')
    if (!formValues.physical_address_country || !formValues.physical_address_country.trim()) addError('physical_address_country', 'Vui lòng điền Quốc gia địa chỉ hiện tại', 'Please enter Current Physical Address Country')
  }

  // 10. USCIS Account Number, SSN, A-Number
  if (!formValues.ssn || !formValues.ssn.trim()) addError('ssn', 'Vui lòng điền Số an sinh xã hội (SSN)', 'Please enter Social Security Number (SSN)')
  if (!formValues.alien_number || !formValues.alien_number.trim()) addError('alien_number', 'Vui lòng điền Số A (A-Number)', 'Please enter Alien Registration Number (A-Number)')
  
  // 11. Parents Info
  if (!formValues.mother_first_name || !formValues.mother_first_name.trim()) addError('mother_first_name', 'Vui lòng điền Tên của mẹ', 'Please enter Mother\'s First Name')
  if (!formValues.mother_middle_name || !formValues.mother_middle_name.trim()) addError('mother_middle_name', 'Vui lòng điền Tên lót của mẹ', 'Please enter Mother\'s Middle Name')
  if (!formValues.mother_last_name || !formValues.mother_last_name.trim()) addError('mother_last_name', 'Vui lòng điền Họ của mẹ', 'Please enter Mother\'s Last Name')
  if (!formValues.father_first_name || !formValues.father_first_name.trim()) addError('father_first_name', 'Vui lòng điền Tên của cha', 'Please enter Father\'s First Name')
  if (!formValues.father_middle_name || !formValues.father_middle_name.trim()) addError('father_middle_name', 'Vui lòng điền Tên lót của cha', 'Please enter Father\'s Middle Name')
  if (!formValues.father_last_name || !formValues.father_last_name.trim()) addError('father_last_name', 'Vui lòng điền Họ của cha', 'Please enter Father\'s Last Name')

  // 12. Sponsorship Category
  if (!formValues.sponsorship_category || !formValues.sponsorship_category.trim()) addError('sponsorship_category', 'Vui lòng điền Diện bảo lãnh', 'Please enter Sponsorship Category')

  // 13. Date of Entry
  if (!formValues.date_of_entry_month || !formValues.date_of_entry_day || !formValues.date_of_entry_year) {
    addError('date_of_entry_month', 'Vui lòng điền đầy đủ Ngày nhập cảnh', 'Please enter complete Date of Entry')
  }

  // 14. Current Status
  if (!formValues.current_status) {
    addError('current_status', 'Vui lòng chọn Trạng thái hiện tại', 'Please select Current Status')
  } else {
    if (formValues.current_status === 'Thường trú nhân' || formValues.current_status === 'Thường trú nhân - diện đi làm (dành cho công dân Canada hoặc Mexico)') {
      if (!formValues.reason_lpr) addError('reason_lpr', 'Vui lòng chọn Lý do làm đơn', 'Please select Reason for application')
    } else if (formValues.current_status === 'Thường trú nhân có điều kiện (thẻ xanh 2 năm)') {
      if (!formValues.reason_cpr) addError('reason_cpr', 'Vui lòng chọn Lý do làm đơn dành cho CPR', 'Please select Reason for application (for Conditional Permanent Resident)')
    }
  }

  // 15. Entry info
  if (!formValues.intended_port_of_entry_city_state || !formValues.intended_port_of_entry_city_state.trim()) addError('intended_port_of_entry_city_state', 'Vui lòng điền Nơi nhập cảnh Mỹ dự kiến', 'Please enter where you entered the U.S. (city, state)')
  if (!formValues.place_submitted_immigrant_visa_or_adjustment || !formValues.place_submitted_immigrant_visa_or_adjustment.trim()) addError('place_submitted_immigrant_visa_or_adjustment', 'Vui lòng điền Nơi nộp đơn xin visa nhập cảnh/chuyển diện', 'Please enter location where you applied for immigrant visa or adjustment')
  if (!formValues.place_issued_immigrant_visa_or_approved_adjustment || !formValues.place_issued_immigrant_visa_or_approved_adjustment.trim()) addError('place_issued_immigrant_visa_or_approved_adjustment', 'Vui lòng điền Nơi cấp visa nhập cảnh/chuyển diện', 'Please enter location where visa was issued or adjustment approved')
  
  if (!formValues.entered_with_immigrant_visa) {
    addError('entered_with_immigrant_visa', 'Vui lòng trả lời câu hỏi Nhập cảnh với visa định cư?', 'Please answer if you entered with an immigrant visa')
  } else if (formValues.entered_with_immigrant_visa === 'Có') {
    if (!formValues.first_us_state_of_residence || !formValues.first_us_state_of_residence.trim()) addError('first_us_state_of_residence', 'Vui lòng điền Bang cư trú đầu tiên', 'Please enter First U.S. state of residence')
    if (!formValues.port_of_entry_city_state || !formValues.port_of_entry_city_state.trim()) addError('port_of_entry_city_state', 'Vui lòng điền Cảng nhập cảnh', 'Please enter Port of entry')
  }

  // 16. Removal history
  if (!formValues.ever_in_removal_proceedings) {
    addError('ever_in_removal_proceedings', 'Vui lòng trả lời câu hỏi về việc bị trục xuất', 'Please answer if you have ever been in removal proceedings')
  } else if (formValues.ever_in_removal_proceedings === 'Có') {
    if (!formValues.removal_reason || !formValues.removal_reason.trim()) addError('removal_reason', 'Vui lòng điền Lý do bị trục xuất', 'Please enter Reason for removal')
  }

  // 17. Abandonment history
  if (!formValues.ever_filed_i407_or_intended_abandon_lpr) {
    addError('ever_filed_i407_or_intended_abandon_lpr', 'Vui lòng trả lời câu hỏi về việc từ bỏ tư cách thường trú nhân', 'Please answer if you have ever filed Form I-407 or intended to abandon LPR')
  } else if (formValues.ever_filed_i407_or_intended_abandon_lpr === 'Có') {
    if (!formValues.i407_detail_reason || !formValues.i407_detail_reason.trim()) addError('i407_detail_reason', 'Vui lòng điền lý do chi tiết từ bỏ LPR', 'Please enter Detailed reason for abandoning LPR')
  }

  // 18. Ethnicity / Race
  if (!formValues.ethnicity) addError('ethnicity', 'Vui lòng chọn Chủng tộc', 'Please select Ethnicity')
  if (!formValues.race) addError('race', 'Vui lòng chọn Chủng tộc/Màu da', 'Please select Race')

  // 19. Physical characteristics
  if (!formValues.height || !formValues.height.trim()) addError('height', 'Vui lòng điền Chiều cao', 'Please enter Height')
  if (!formValues.weight || !formValues.weight.trim()) addError('weight', 'Vui lòng điền Cân nặng', 'Please enter Weight')
  if (!formValues.eye_color) addError('eye_color', 'Vui lòng chọn Màu mắt', 'Please select Eye Color')
  if (!formValues.hair_color) addError('hair_color', 'Vui lòng chọn Màu tóc', 'Please select Hair Color')

  // 20. Disability
  if (!formValues.has_disability) {
    addError('has_disability', 'Vui lòng chọn câu hỏi về Khuyết tật', 'Please answer the disability question')
  } else if (formValues.has_disability === 'Có') {
    if (!formValues.disability_details || !formValues.disability_details.trim()) addError('disability_details', 'Vui lòng mô tả tình trạng khuyết tật', 'Please describe your disability')
  }

  // 21. Additional information
  if (!formValues.has_additional_information) {
    addError('has_additional_information', 'Vui lòng chọn câu hỏi về Bổ sung thông tin', 'Please answer the additional information question')
  } else if (formValues.has_additional_information === 'Có') {
    if (!formValues.additional_information || !formValues.additional_information.trim()) addError('additional_information', 'Vui lòng điền thông tin bổ sung', 'Please enter additional information')
  }

  // 22. Applicant full name
  if (!formValues.applicant_full_name || !formValues.applicant_full_name.trim()) {
    addError('applicant_full_name', 'Vui lòng điền họ và tên người khai đơn', 'Please enter your full name')
  }

  // 23. Applicant signature
  if (!formValues.applicant_signature) {
    addError('applicant_signature', 'Vui lòng ký tên', 'Please sign your name')
  }

  return errors
}

// Handle form submit
const handleSubmit = async () => {
  // Reset error
  submitError.value = null
  // Clear previous field errors
  Object.keys(fieldsWithErrors).forEach(key => {
    delete fieldsWithErrors[key]
  })

  // Frontend validation for all required fields
  const validationErrors = getValidationErrors()
  const errorKeys = Object.keys(validationErrors)
  if (errorKeys.length > 0) {
    // Mark fields with errors
    errorKeys.forEach(field => {
      fieldsWithErrors[field] = true
      // Also mark sub-fields of composite fields if they are the reason
      if (field === 'date_of_birth_month') {
        fieldsWithErrors['date_of_birth_month'] = true
        fieldsWithErrors['date_of_birth_day'] = true
        fieldsWithErrors['date_of_birth_year'] = true
      }
      if (field === 'date_of_entry_month') {
        fieldsWithErrors['date_of_entry_month'] = true
        fieldsWithErrors['date_of_entry_day'] = true
        fieldsWithErrors['date_of_entry_year'] = true
      }
      if (field === 'place_of_birth_city') {
        fieldsWithErrors['place_of_birth_city'] = true
        fieldsWithErrors['place_of_birth_province'] = true
        fieldsWithErrors['place_of_birth_country'] = true
      }
      if (field === 'mailing_address_street') {
        fieldsWithErrors['mailing_address_street'] = true
        fieldsWithErrors['mailing_address_city'] = true
        fieldsWithErrors['mailing_address_province'] = true
        fieldsWithErrors['mailing_address_zip'] = true
        fieldsWithErrors['mailing_address_country'] = true
      }
      if (field === 'physical_address_street') {
        fieldsWithErrors['physical_address_street'] = true
        fieldsWithErrors['physical_address_city'] = true
        fieldsWithErrors['physical_address_province'] = true
        fieldsWithErrors['physical_address_zip'] = true
        fieldsWithErrors['physical_address_country'] = true
      }
      if (field === 'mother_first_name') {
        fieldsWithErrors['mother_first_name'] = true
        fieldsWithErrors['mother_middle_name'] = true
        fieldsWithErrors['mother_last_name'] = true
      }
      if (field === 'father_first_name') {
        fieldsWithErrors['father_first_name'] = true
        fieldsWithErrors['father_middle_name'] = true
        fieldsWithErrors['father_last_name'] = true
      }
    })

    const errorMessages = Object.values(validationErrors).join('\n')
    submitError.value = errorMessages
    
    alert(locale.value === 'vi' 
      ? `Vui lòng điền đầy đủ các thông tin bắt buộc:\n\n${errorMessages}`
      : `Please fill out all required fields:\n\n${errorMessages}`
    )
    return
  }

  isSubmitting.value = true

  try {
    // Prepare data to send
    const applicantFullName = formValues['applicant_full_name'] || ''
    const applicantSignature = formValues['applicant_signature'] || ''
    
    const submitData = {
      language: locale.value,
      customer_name: applicantFullName,
      customer_email: formValues['email'] || '',
      customer_phone: formValues['phone_primary'] || formValues['phone'] || '',
      // Required fields at top level for backend validation
      applicant_full_name: applicantFullName,
      applicant_signature: applicantSignature,
      // All form data (includes all fields including applicant_full_name and applicant_signature)
      form_data: formValues,
      submitted_at: new Date().toISOString()
    }

    // Debug: Log data being sent
    console.log('Submitting data:', {
      applicant_full_name: submitData.applicant_full_name,
      applicant_full_name_length: submitData.applicant_full_name?.length || 0,
      applicant_signature: submitData.applicant_signature ? `Present (${submitData.applicant_signature.substring(0, 50)}...)` : 'Missing',
      applicant_signature_length: submitData.applicant_signature?.length || 0,
      form_data_has_applicant_full_name: 'applicant_full_name' in formValues,
      form_data_has_applicant_signature: 'applicant_signature' in formValues,
      form_data_keys: Object.keys(submitData.form_data)
    })

    // Call API
    const response = await submitForm('i-90', submitData)

    if (response.success) {
      // Clear saved form data sau khi submit thành công
      clearFormData('i-90')
      
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
      
      // Clear previous errors
      Object.keys(fieldsWithErrors).forEach(key => {
        delete fieldsWithErrors[key]
      })
      
      // Mark fields with errors (map backend field names to form field names)
      Object.keys(errors).forEach(backendField => {
        // Map backend field name to form field name
        const formFieldName = fieldNameMapping[backendField] || backendField
        fieldsWithErrors[formFieldName] = true
        console.log(`Marking field with error: ${backendField} -> ${formFieldName}`)
      })
      
      console.log('Fields with errors after mapping:', Object.keys(fieldsWithErrors))
      
      const errorMessages = Object.entries(errors)
        .map(([field, messages]: [string, any]) => {
          // Handle array of messages or single message
          const messageList = Array.isArray(messages) ? messages : [messages]
          const translatedMessages = messageList.map((msg: string) => 
            translateValidationError(field, msg, locale.value)
          )
          return translatedMessages.join(', ')
        })
        .join('\n')
      
      submitError.value = errorMessages
      
      // Log để debug
      console.error('Validation errors:', errors)
      console.error('Fields with errors:', Object.keys(fieldsWithErrors))
      console.error('Form values being sent:', {
        applicant_full_name: formValues['applicant_full_name'],
        applicant_signature: formValues['applicant_signature'] ? 'Present (base64)' : 'Missing',
        hasSignature: !!formValues['applicant_signature']
      })
      
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

// Flag để tránh watch(locale) trigger khi đang restore dữ liệu
const isRestoringData = ref(false)

// Fetch schema when component mounts
onMounted(async () => {
  // Load dữ liệu đã lưu từ localStorage (nếu có)
  const savedData = loadFormData('i-90')
  if (savedData) {
    console.log('Restoring saved data:', savedData)
    isRestoringData.value = true
    
    // Restore locale (watch sẽ không trigger vì isRestoringData = true)
    locale.value = savedData.locale
    
    // Restore form values (sẽ được merge với schema sau khi fetch)
    Object.assign(formValues, savedData.formValues)
    console.log('Form values after restore:', { ...formValues })
    
    // Fetch schema với preserveData = true để giữ dữ liệu đã load
    await fetchSchema(true)
    
    console.log('Form values after fetchSchema:', { ...formValues })
    isRestoringData.value = false
  } else {
    // Không có dữ liệu đã lưu, khởi tạo mới
    await fetchSchema(false)
  }
})

// Refetch schema when locale changes (nhưng không khi đang restore)
watch(locale, () => {
  // Bỏ qua nếu đang restore dữ liệu
  if (isRestoringData.value) return
  
  fetchSchema(true) // Preserve data khi đổi ngôn ngữ
  // Lưu ngay khi đổi locale (không debounce)
  saveFormData(formValues, locale.value, 'i-90')
})

// Auto-save form values to localStorage với debounce
let saveTimeout: ReturnType<typeof setTimeout> | null = null
let isInitialMount = true

watch(
  () => formValues,
  (newVal, oldVal) => {
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
    
    // Clear error state for fields that are being edited
    // When user starts typing, remove error highlight
    if (oldVal) {
      Object.keys(fieldsWithErrors).forEach(field => {
        // Check if this field value has changed
        if (formValues[field] !== undefined && formValues[field] !== oldVal[field]) {
          console.log(`Clearing error for field: ${field} (value changed from "${oldVal[field]}" to "${formValues[field]}")`)
          delete fieldsWithErrors[field]
        }
      })
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
      saveFormData(formValues, locale.value, 'i-90')
    }, 500)
  },
  { deep: true, flush: 'post' }
)

watch(
  () => formValues.children_count,
  newValue => {
    const sanitizedValue = Math.max(0, parseInt(newValue ?? '0', 10) || 0)
    if ((newValue ?? '') !== String(sanitizedValue)) {
      formValues.children_count = String(sanitizedValue)
    }
    syncChildrenInfoList(sanitizedValue)
  }
)

// Hàm thêm địa chỉ mới
const addAddress = (fieldName: string) => {
  if (!formValues[fieldName]) {
    formValues[fieldName] = []
  }
  formValues[fieldName].push({ address: '', startDate: '', endDate: '' })
}

// Hàm thêm công việc mới
const addWork = (fieldName: string) => {
  if (!formValues[fieldName]) {
    formValues[fieldName] = []
  }
  formValues[fieldName].push({ profession: '', companyName: '', address: '', startDate: '', endDate: '' })
}

const removeAddress = (fieldName: string, index: number | string) => {
  const numIndex = Number(index)
  if (formValues[fieldName] && formValues[fieldName].length > 1) {
    formValues[fieldName].splice(numIndex, 1)
  }
}

const adjustCounter = (fieldName: string, delta: number) => {
  const current = parseInt(formValues[fieldName] || '0', 10) || 0
  const nextValue = Math.max(0, current + delta)
  formValues[fieldName] = String(nextValue)
}

// Hàm xử lý khi thay đổi radio button
const handleRadioChange = (fieldName: string, value: string) => {
  if (fieldName === 'parents_married_before_18') {
    if (value !== 'after') {
      formValues['marriage_year'] = ''
    }
  } else if (fieldName === 'father_residency_status') {
    if (value === 'us_citizen') {
      formValues['father_alien_number'] = ''
    } else if (value === 'permanent_resident') {
      formValues['father_naturalization_date'] = ''
    }
  } else if (fieldName === 'mother_residency_status') {
    if (value === 'us_citizen') {
      formValues['mother_alien_number'] = ''
    } else if (value === 'permanent_resident') {
      formValues['mother_naturalization_date'] = ''
    }
  } else if (fieldName === 'former_spouse_residency_status') {
    if (value === 'us_citizen') {
      formValues['former_spouse_alien_number'] = ''
      formValues['former_spouse_residency_other'] = ''
    } else if (value === 'permanent_resident') {
      formValues['former_spouse_naturalization_date'] = ''
      formValues['former_spouse_residency_other'] = ''
    } else if (value === 'other') {
      formValues['former_spouse_naturalization_date'] = ''
      formValues['former_spouse_alien_number'] = ''
    }
  } else if (fieldName === 'current_spouse_residency_status') {
    if (value === 'us_citizen') {
      formValues['current_spouse_alien_number'] = ''
      formValues['current_spouse_residency_other'] = ''
    } else if (value === 'permanent_resident') {
      formValues['current_spouse_naturalization_date'] = ''
      formValues['current_spouse_residency_other'] = ''
    } else if (value === 'other') {
      formValues['current_spouse_naturalization_date'] = ''
      formValues['current_spouse_alien_number'] = ''
    }
  } else if (fieldName === 'former_spouse_divorce_reason') {
    if (value !== 'other') {
      formValues['former_spouse_divorce_reason_other'] = ''
    }
  } else if (fieldName === 'current_spouse_former_residency_status') {
    if (value === 'us_citizen') {
      formValues['current_spouse_former_alien_number'] = ''
      formValues['current_spouse_former_residency_other'] = ''
    } else if (value === 'permanent_resident') {
      formValues['current_spouse_former_naturalization_date'] = ''
      formValues['current_spouse_former_residency_other'] = ''
    } else if (value === 'other') {
      formValues['current_spouse_former_naturalization_date'] = ''
      formValues['current_spouse_former_alien_number'] = ''
    }
  } else if (fieldName === 'current_spouse_former_divorce_reason') {
    if (value !== 'other') {
      formValues['current_spouse_former_divorce_reason_other'] = ''
    }
  } else if (fieldName === 'applicant_age_status') {
    if (value !== 'uscis_office') {
      formValues['uscis_office_address'] = ''
    }
    if (value !== 'other') {
      formValues['applicant_age_status_other'] = ''
    }
  } else if (fieldName === 'filed_taxes_late') {
    if (value !== 'yes') {
      formValues['filed_taxes_late_explanation'] = ''
    }
  } else if (fieldName === 'evaded_taxes') {
    if (value !== 'yes') {
      formValues['evaded_taxes_explanation'] = ''
    }
  } else if (fieldName === 'claimed_non_resident_tax') {
    if (value !== 'yes') {
      formValues['claimed_non_resident_tax_explanation'] = ''
    }
  } else if (fieldName === 'military_training') {
    if (value !== 'yes') {
      formValues['military_training_explanation'] = ''
    }
  } else if (fieldName === 'serving_us_military') {
    if (value !== 'yes') {
      formValues['military_registration_date'] = ''
      formValues['military_registration_number'] = ''
    }
  } else if (fieldName === 'has_name_changed_since_green_card' || 
             fieldName.includes('name_change') || 
             fieldName.includes('name_changed') || 
             fieldName.includes('change_name')) {
    // Xử lý khi field "Đã từng đổi tên kể từ khi được cấp thẻ xanh?" thay đổi
    // Clear các field liên quan đến thẻ xanh hiện tại nếu giá trị không phải "yes", "Có" hoặc "có"
    const normalizedValue = String(value).toLowerCase()
    if (normalizedValue !== 'yes' && normalizedValue !== 'có') {
      // Tìm và clear các field liên quan đến thẻ xanh hiện tại
      if (schema.value && schema.value.sections) {
        schema.value.sections.forEach((section: any) => {
          if (!section.groups) return
          section.groups.forEach((group: any) => {
            if (!group.fields) return
            group.fields.forEach((field: any) => {
              if (isCurrentGreenCardNameField(field, locale.value)) {
                formValues[field.name] = ''
              }
            })
          })
        })
      }
    }
  } else if (fieldName.includes('living_at_mailing') ||
             fieldName.includes('living_at_mail') ||
             fieldName.includes('same_as_mailing') ||
             fieldName.includes('current_mailing')) {
    // Xử lý khi field "Đương đơn đang sống ở địa chỉ nhận thư?" thay đổi
    // Clear field "Địa chỉ ở hiện tại" nếu giá trị là "yes" hoặc "Có" (vì khi chọn "Có" thì không cần nhập địa chỉ hiện tại)
    const normalizedValue = String(value).trim().toLowerCase()
    if (normalizedValue === 'yes' || normalizedValue === 'có') {
      // Tìm và clear field "Địa chỉ ở hiện tại"
      if (schema.value && schema.value.sections) {
        schema.value.sections.forEach((section: any) => {
          if (!section.groups) return
          section.groups.forEach((group: any) => {
            if (!group.fields) return
            group.fields.forEach((field: any) => {
              if (isCurrentAddressField(field, locale.value)) {
                formValues[field.name] = ''
              }
            })
          })
        })
      }
    }
  } else if (fieldName.includes('applicant_type') ||
             fieldName.includes('you_are') ||
             fieldName.includes('residency_type') ||
             fieldName.includes('permanent_resident_type')) {
    // Xử lý khi field "Bạn là:" thay đổi
    // Clear các field "Lý do làm đơn" không phù hợp
    if (schema.value && schema.value.sections) {
      schema.value.sections.forEach((section: any) => {
        if (!section.groups) return
        section.groups.forEach((group: any) => {
          if (!group.fields) return
          group.fields.forEach((field: any) => {
            // Nếu là field "Lý do làm đơn (dành cho Thường trú nhân)" nhưng giá trị không phải "Thường trú nhân" hoặc "Thường trú nhân - diện đi làm"
            if (isReasonForApplicationField(field, locale.value)) {
              if (!isRegularPermanentResident(value, locale.value)) {
                formValues[field.name] = ''
              }
            }
            // Nếu là field "Lý do làm đơn (dành cho Thường trú nhân có điều kiện)" nhưng giá trị không phải "Thường trú nhân có điều kiện"
            if (isConditionalReasonForApplicationField(field, locale.value)) {
              if (!isConditionalPermanentResident(value, locale.value)) {
                formValues[field.name] = ''
              }
            }
          })
        })
      })
    }
  } else if (fieldName.includes('disability') || 
             fieldName.includes('disabled') || 
             fieldName.includes('handicap')) {
    // Xử lý khi field "Bạn có phải là người khuyết tật không?" thay đổi
    // Chỉ xử lý nếu đây là field câu hỏi (không phải field mô tả)
    const disabilityQuestionFieldName = getDisabilityQuestionField(schema.value || schema, locale.value)
    if (disabilityQuestionFieldName && fieldName === disabilityQuestionFieldName) {
      // Clear field "Vui lòng ghi rõ tình trạng khuyết tật" nếu giá trị không phải "yes", "Có" hoặc "có"
      const normalizedValue = String(value).trim().toLowerCase()
      if (normalizedValue !== 'yes' && normalizedValue !== 'có') {
        // Tìm và clear field "Vui lòng ghi rõ tình trạng khuyết tật"
        if (schema.value && schema.value.sections) {
          schema.value.sections.forEach((section: any) => {
            if (!section.groups) return
            section.groups.forEach((group: any) => {
              if (!group.fields) return
              group.fields.forEach((field: any) => {
                if (isDisabilityField(field, locale.value)) {
                  formValues[field.name] = ''
                }
              })
            })
          })
        }
      }
    }
  } else if (fieldName.includes('deportation') || 
             fieldName.includes('removal') || 
             fieldName.includes('exclusion') ||
             fieldName.includes('removed')) {
    // Xử lý khi field "Bạn đã từng bị trục xuất, loại bỏ, hay bị lên tòa để trục xuất khỏi Mỹ chưa?" thay đổi
    // Chỉ xử lý nếu đây là field câu hỏi (không phải field lý do)
    const deportationQuestionFieldName = getDeportationQuestionField(schema.value || schema, locale.value)
    if (deportationQuestionFieldName && fieldName === deportationQuestionFieldName) {
      // Clear field "Lý do bị trục xuất" nếu giá trị không phải "yes", "Có" hoặc "có"
      const normalizedValue = String(value).trim().toLowerCase()
      if (normalizedValue !== 'yes' && normalizedValue !== 'có') {
        // Tìm và clear field "Lý do bị trục xuất"
        if (schema.value && schema.value.sections) {
          schema.value.sections.forEach((section: any) => {
            if (!section.groups) return
            section.groups.forEach((group: any) => {
              if (!group.fields) return
              group.fields.forEach((field: any) => {
                if (isDeportationReasonField(field, locale.value)) {
                  formValues[field.name] = ''
                }
              })
            })
          })
        }
      }
    }
  } else if (fieldName === 'ever_filed_i407_or_intended_abandon_lpr' ||
             fieldName.includes('i407') || 
             fieldName.includes('i_407') || 
             fieldName.includes('i-407') ||
             (fieldName.includes('abandon') && (fieldName.includes('lpr') || fieldName.includes('residency'))) ||
             (fieldName.includes('relinquish') && (fieldName.includes('lpr') || fieldName.includes('residency')))) {
    // Xử lý khi field "Kể từ ngày trở thành thường trú nhân, bạn có bao giờ nộp đơn I-407 hoặc có ý định từ bỏ tư cách thường trú nhân chưa?" thay đổi
    // Chỉ xử lý nếu đây là field câu hỏi (không phải field lý do)
    const i407QuestionFieldName = getI407QuestionField(schema.value || schema, locale.value)
    console.log('I-407 handleRadioChange:', {
      fieldName,
      i407QuestionFieldName,
      value,
      isQuestionField: i407QuestionFieldName && fieldName === i407QuestionFieldName
    })
    
    if (i407QuestionFieldName && fieldName === i407QuestionFieldName) {
      // Clear field "Lý do chi tiết" nếu giá trị không phải "yes", "Có" hoặc "có"
      const normalizedValue = String(value).trim().toLowerCase()
      if (normalizedValue !== 'yes' && normalizedValue !== 'có') {
        console.log('Clearing I-407 reason field, value is:', normalizedValue)
        // Tìm và clear field "Lý do chi tiết"
        if (schema.value && schema.value.sections) {
          schema.value.sections.forEach((section: any) => {
            if (!section.groups) return
            section.groups.forEach((group: any) => {
              if (!group.fields) return
              group.fields.forEach((field: any) => {
                if (isI407ReasonField(field, locale.value)) {
                  console.log('Clearing field:', field.name)
                  formValues[field.name] = ''
                }
              })
            })
          })
        }
      } else {
        console.log('Not clearing I-407 reason field, value is:', normalizedValue)
      }
    }
  } else if (fieldName === 'has_additional_information' ||
             (fieldName.includes('additional') && fieldName.includes('information'))) {
    // Xử lý khi field "Bạn có cần bổ sung thêm thông tin nào khác không?" thay đổi
    // Chỉ xử lý nếu đây là field câu hỏi (không phải field thông tin)
    const additionalInfoQuestionFieldName = getAdditionalInformationQuestionField(schema.value || schema, locale.value)
    console.log('Additional information handleRadioChange:', {
      fieldName,
      additionalInfoQuestionFieldName,
      value,
      isQuestionField: additionalInfoQuestionFieldName && fieldName === additionalInfoQuestionFieldName
    })
    
    if (additionalInfoQuestionFieldName && fieldName === additionalInfoQuestionFieldName) {
      // Clear field "Thông tin cần bổ sung" nếu giá trị không phải "yes", "Có" hoặc "có"
      const normalizedValue = String(value).trim().toLowerCase()
      if (normalizedValue !== 'yes' && normalizedValue !== 'có') {
        console.log('Clearing additional information field, value is:', normalizedValue)
        // Tìm và clear field "Thông tin cần bổ sung"
        if (schema.value && schema.value.sections) {
          schema.value.sections.forEach((section: any) => {
            if (!section.groups) return
            section.groups.forEach((group: any) => {
              if (!group.fields) return
              group.fields.forEach((field: any) => {
                if (isAdditionalInformationField(field, locale.value)) {
                  console.log('Clearing field:', field.name)
                  formValues[field.name] = ''
                }
              })
            })
          })
        }
      } else {
        console.log('Not clearing additional information field, value is:', normalizedValue)
      }
    }
  } else {
    // Kiểm tra xem field này có phải là field "Bạn nhập cảnh Mỹ với visa định cư (không phải chuyển diện)?" không
    // Sử dụng helper function để tìm field điều kiện một cách chính xác
    const entryWithImmigrantVisaFieldName = getEntryWithImmigrantVisaField(schema.value || schema, locale.value)
    const fieldNameLower = fieldName.toLowerCase()
    const isEntryWithImmigrantVisaConditionField = entryWithImmigrantVisaFieldName && 
                                          (fieldName === entryWithImmigrantVisaFieldName ||
                                           fieldNameLower.includes('entry_with_immigrant_visa') ||
                                           fieldNameLower.includes('immigrant_visa_entry') ||
                                           fieldNameLower.includes('entry_immigrant_visa') ||
                                           (fieldNameLower.includes('entry') && fieldNameLower.includes('immigrant') && fieldNameLower.includes('visa')))
    
    if (isEntryWithImmigrantVisaConditionField) {
      // Xử lý khi field "Bạn nhập cảnh Mỹ với visa định cư (không phải chuyển diện)?" thay đổi
      // Clear các field liên quan nếu giá trị không phải "yes", "Có" hoặc "có"
      const normalizedValue = String(value).trim().toLowerCase()
      if (normalizedValue !== 'yes' && normalizedValue !== 'có') {
        // Tìm và clear các field liên quan đến nhập cảnh với visa định cư
        if (schema.value && schema.value.sections) {
          schema.value.sections.forEach((section: any) => {
            if (!section.groups) return
            section.groups.forEach((group: any) => {
              if (!group.fields) return
              group.fields.forEach((field: any) => {
                if (isEntryWithImmigrantVisaField(field, locale.value)) {
                  formValues[field.name] = ''
                }
              })
            })
          })
        }
      }
    }
  }
}

// Helper function to check if a field is a name field
const isNameField = (field: any, currentLocale: 'vi' | 'en') => {
  const label = getLocalizedText(field.label, currentLocale)
  return label === 'Tên' || label === 'Họ' || label === 'Tên lót' ||
         label === 'First Name' || label === 'Last Name' || label === 'Middle Name'
}

// Helper function to check if three consecutive fields form a name group
// Linh hoạt hơn: kiểm tra xem có 3 field name liên tiếp không, bất kể thứ tự
const isNameGroup = (fields: any[], index: number | string, currentLocale: 'vi' | 'en') => {
  const numIndex = Number(index);
  if (numIndex + 2 >= fields.length) return false
  
  const field1 = fields[numIndex]
  const field2 = fields[numIndex + 1]
  const field3 = fields[numIndex + 2]
  
  if (!field1 || !field2 || !field3) return false
  
  // Also check if they are regular text fields (not radio, textarea, etc.)
  const areTextFields = field1.type === 'text' && field2.type === 'text' && field3.type === 'text'
  if (!areTextFields) return false
  
  // Sử dụng getLocalizedText để lấy label đúng cách
  const label1 = getLocalizedText(field1.label, currentLocale)
  const label2 = getLocalizedText(field2.label, currentLocale)
  const label3 = getLocalizedText(field3.label, currentLocale)
  
  // Kiểm tra xem có phải là 3 field name không (bất kể thứ tự)
  const nameLabels = ['Tên', 'Họ', 'Tên lót', 'First Name', 'Last Name', 'Middle Name']
  const isName1 = nameLabels.includes(label1)
  const isName2 = nameLabels.includes(label2)
  const isName3 = nameLabels.includes(label3)
  
  // Nếu cả 3 đều là name fields, thì đây là name group
  return isName1 && isName2 && isName3
}

// Helper function để sắp xếp lại các field name theo thứ tự đúng: First Name, Last Name, Middle Name
const getOrderedNameFields = (fields: any[], index: number | string, currentLocale: 'vi' | 'en') => {
  const numIndex = Number(index);
  const field1 = fields[numIndex]
  const field2 = fields[numIndex + 1]
  const field3 = fields[numIndex + 2]
  
  const label1 = getLocalizedText(field1.label, currentLocale)
  const label2 = getLocalizedText(field2.label, currentLocale)
  const label3 = getLocalizedText(field3.label, currentLocale)
  
  // Xác định field nào là First Name, Last Name, Middle Name
  let firstField = null
  let lastField = null
  let middleField = null
  
  if (label1 === 'Tên' || label1 === 'First Name') firstField = { field: field1, index: numIndex }
  else if (label1 === 'Họ' || label1 === 'Last Name') lastField = { field: field1, index: numIndex }
  else if (label1 === 'Tên lót' || label1 === 'Middle Name') middleField = { field: field1, index: numIndex }
  
  if (label2 === 'Tên' || label2 === 'First Name') firstField = { field: field2, index: numIndex + 1 }
  else if (label2 === 'Họ' || label2 === 'Last Name') lastField = { field: field2, index: numIndex + 1 }
  else if (label2 === 'Tên lót' || label2 === 'Middle Name') middleField = { field: field2, index: numIndex + 1 }
  
  if (label3 === 'Tên' || label3 === 'First Name') firstField = { field: field3, index: numIndex + 2 }
  else if (label3 === 'Họ' || label3 === 'Last Name') lastField = { field: field3, index: numIndex + 2 }
  else if (label3 === 'Tên lót' || label3 === 'Middle Name') middleField = { field: field3, index: numIndex + 2 }
  
  // Trả về theo thứ tự: First Name, Last Name, Middle Name
  return [firstField, lastField, middleField].filter(f => f !== null)
}

// Helper function để kiểm tra xem field có phải là field liên quan đến thẻ xanh hiện tại không
const isCurrentGreenCardNameField = (field: any, currentLocale: 'vi' | 'en') => {
  const label = getLocalizedText(field.label, currentLocale)
  return label.includes('thẻ xanh hiện tại') || 
         label.includes('Tên trên thẻ xanh') ||
         label.includes('Tên lót trên thẻ xanh') ||
         label.includes('Họ trên thẻ xanh') ||
         label.toLowerCase().includes('current green card') ||
         label.toLowerCase().includes('name on current green card')
}

// Helper function để tìm field "Đã từng đổi tên kể từ khi được cấp thẻ xanh?" trong toàn bộ schema
const getNameChangedSinceGreenCardField = (schemaData: any, currentLocale: 'vi' | 'en'): string | null => {
  if (!schemaData || !schemaData.sections) return null
  
  // Ưu tiên tìm theo field name trước (nhanh hơn và chính xác hơn)
  for (const section of schemaData.sections) {
    if (!section.groups) continue
    for (const group of section.groups) {
      if (!group.fields) continue
      for (const field of group.fields) {
        // Kiểm tra field name trước
        if (field.name === 'has_name_changed_since_green_card' ||
            field.name.includes('name_changed') ||
            field.name.includes('name_change') ||
            field.name.includes('change_name')) {
          return field.name
        }
      }
    }
  }
  
  // Nếu không tìm thấy theo field name, tìm theo label
  for (const section of schemaData.sections) {
    if (!section.groups) continue
    for (const group of section.groups) {
      if (!group.fields) continue
      for (const field of group.fields) {
        const label = getLocalizedText(field.label, currentLocale)
        if ((label.includes('đổi tên') && label.includes('thẻ xanh')) ||
            (label.toLowerCase().includes('name change') && label.toLowerCase().includes('green card')) ||
            (label.toLowerCase().includes('change name') && label.toLowerCase().includes('green card'))) {
          return field.name
        }
      }
    }
  }
  return null
}

// Helper function để kiểm tra xem field có nên được hiển thị không dựa trên điều kiện "Đã từng đổi tên kể từ khi được cấp thẻ xanh?"
const shouldShowCurrentGreenCardNameField = (field: any, currentLocale: 'vi' | 'en'): boolean => {
  // Nếu không phải là field liên quan đến thẻ xanh hiện tại, luôn hiển thị
  if (!isCurrentGreenCardNameField(field, currentLocale)) {
    return true
  }
  
  // Tìm field điều kiện trong toàn bộ schema
  // Ưu tiên tìm field name cụ thể trước
  let conditionFieldName = 'has_name_changed_since_green_card'
  if (!(conditionFieldName in formValues)) {
    // Nếu không tìm thấy, tìm trong schema
    const foundFieldName = getNameChangedSinceGreenCardField(schema, currentLocale)
    if (foundFieldName) {
      conditionFieldName = foundFieldName
    } else {
      // Nếu không tìm thấy field điều kiện, hiển thị field này (fallback)
      return true
    }
  }
  
  // Chỉ hiển thị nếu field điều kiện có giá trị là "yes" (tiếng Anh) hoặc "Có"/"có" (tiếng Việt)
  const conditionValue = formValues[conditionFieldName]
  if (!conditionValue) {
    return false
  }
  
  // Chuẩn hóa giá trị để so sánh (loại bỏ khoảng trắng, chuyển về lowercase)
  const normalizedValue = String(conditionValue).trim().toLowerCase()
  const isYes = normalizedValue === 'yes' || normalizedValue === 'có'
  
  // Debug log (có thể xóa sau)
  if (!isYes) {
    console.log('Hiding field:', field.name, 'because condition field', conditionFieldName, 'has value:', conditionValue)
  }
  
  return isYes
}

// Helper function để kiểm tra xem field có phải là field "Địa chỉ ở hiện tại" không
const isCurrentAddressField = (field: any, currentLocale: 'vi' | 'en') => {
  // Loại trừ field lives_at_mailing_address ngay từ đầu
  if (field.name === 'lives_at_mailing_address' || 
      field.name.toLowerCase().includes('lives_at_mailing') ||
      field.name.toLowerCase().includes('living_at_mailing')) {
    return false
  }
  
  const label = getLocalizedText(field.label, currentLocale)
  const labelLower = label.toLowerCase()
  
  // Loại trừ các field có label về "living at mailing address" hoặc "sống ở địa chỉ nhận thư"
  if (labelLower.includes('living at') && labelLower.includes('mailing address')) {
    return false
  }
  if (labelLower.includes('sống') && labelLower.includes('địa chỉ') && labelLower.includes('thư')) {
    return false
  }
  
  // Kiểm tra nhiều pattern khác nhau
  const isMatch = label === 'Địa chỉ ở hiện tại' ||
                  label === 'Current address' ||
                  label.includes('Địa chỉ ở hiện tại') ||
                  (labelLower.includes('current address') && !labelLower.includes('mailing')) ||
                  (labelLower.includes('địa chỉ') && labelLower.includes('hiện tại') && !labelLower.includes('thư')) ||
                  (labelLower.includes('address') && labelLower.includes('current') && !labelLower.includes('mailing'))
  
  // Debug log
  if (isMatch) {
    console.log('Found current address field:', field.name, 'label:', label)
  }
  
  return isMatch
}

// Helper function để tìm field "Đương đơn đang sống ở địa chỉ nhận thư?" trong toàn bộ schema
const getLivingAtMailingAddressField = (schemaData: any, currentLocale: 'vi' | 'en'): string | null => {
  if (!schemaData || !schemaData.sections) {
    console.log('Schema data not available')
    return null
  }
  
  // Debug: Log tất cả các field để tìm field name chính xác (chỉ log một lần)
  let debugLogged = false
  if (typeof window !== 'undefined' && (window as any)._debugLoggedFields) {
    debugLogged = true
  }
  
  if (!debugLogged) {
    console.log('=== DEBUG: All fields in schema ===')
    schemaData.sections.forEach((section: any, sIdx: number) => {
      if (!section.groups) return
      section.groups.forEach((group: any, gIdx: number) => {
        if (!group.fields) return
        group.fields.forEach((field: any, fIdx: number) => {
          const label = getLocalizedText(field.label, currentLocale)
          if (label.includes('sống') || label.includes('địa chỉ') || label.includes('thư') || 
              label.toLowerCase().includes('living') || label.toLowerCase().includes('mailing')) {
            console.log(`Section ${sIdx}, Group ${gIdx}, Field ${fIdx}:`, {
              name: field.name,
              label: label,
              type: field.type
            })
          }
        })
      })
    })
    if (typeof window !== 'undefined') {
      (window as any)._debugLoggedFields = true
    }
  }
  
  // Ưu tiên tìm theo field name trước
  for (const section of schemaData.sections) {
    if (!section.groups) continue
    for (const group of section.groups) {
      if (!group.fields) continue
      for (const field of group.fields) {
        // Kiểm tra field name - nhiều pattern khác nhau
        const fieldNameLower = field.name.toLowerCase()
        // Kiểm tra chính xác field name từ DB: lives_at_mailing_address
        if (field.name === 'lives_at_mailing_address' ||
            fieldNameLower === 'lives_at_mailing_address' ||
            fieldNameLower.includes('lives_at_mailing') ||
            fieldNameLower.includes('living_at_mailing') ||
            fieldNameLower.includes('living_at_mail') ||
            fieldNameLower.includes('same_as_mailing') ||
            fieldNameLower.includes('current_mailing') ||
            fieldNameLower.includes('mailing_address') ||
            fieldNameLower.includes('same_mailing') ||
            fieldNameLower.includes('reside_mailing') ||
            (fieldNameLower.includes('living') && fieldNameLower.includes('mail')) ||
            (fieldNameLower.includes('lives') && fieldNameLower.includes('mailing'))) {
          console.log('Found condition field by name:', field.name)
          return field.name
        }
      }
    }
  }
  
  // Nếu không tìm thấy theo field name, tìm theo label
  for (const section of schemaData.sections) {
    if (!section.groups) continue
    for (const group of section.groups) {
      if (!group.fields) continue
      for (const field of group.fields) {
        const label = getLocalizedText(field.label, currentLocale)
        const labelLower = label.toLowerCase()
        
        // Kiểm tra nhiều pattern khác nhau cho label (bao gồm cả dấu hỏi và các biến thể)
        const hasVietnamesePattern = label.includes('sống ở địa chỉ nhận thư') || 
                                     label.includes('sống ở địa chỉ thư') ||
                                     label.includes('đang sống ở địa chỉ') ||
                                     label.includes('sống tại địa chỉ nhận thư') ||
                                     label.includes('Đương đơn đang sống') ||
                                     (labelLower.includes('sống') && labelLower.includes('địa chỉ') && (labelLower.includes('thư') || labelLower.includes('nhận')))
        
        const hasEnglishPattern = labelLower.includes('living at mailing address') || 
                                  labelLower.includes('same as mailing address') ||
                                  labelLower.includes('current mailing address') ||
                                  labelLower.includes('living at mail') ||
                                  labelLower.includes('live at your mailing address') ||
                                  labelLower.includes('live at mailing address') ||
                                  (labelLower.includes('live') && labelLower.includes('mailing address')) ||
                                  (labelLower.includes('living') && labelLower.includes('mailing'))
        
        if (hasVietnamesePattern || hasEnglishPattern) {
          console.log('Found condition field by label:', field.name, 'label:', label)
          return field.name
        }
      }
    }
  }
  
  console.log('Condition field not found in schema')
  return null
}

// Helper function để kiểm tra xem field "Địa chỉ ở hiện tại" có nên được hiển thị không
const shouldShowCurrentAddressField = (field: any, currentLocale: 'vi' | 'en'): boolean => {
  // Nếu không phải là field "Địa chỉ ở hiện tại", luôn hiển thị
  if (!isCurrentAddressField(field, currentLocale)) {
    return true
  }
  
  // Debug: Log field đang được kiểm tra
  console.log('=== Checking current address field ===')
  console.log('Field name:', field.name, 'label:', getLocalizedText(field.label, currentLocale))
  console.log('Field conditions:', field.conditions)
  
  // Ưu tiên: Kiểm tra điều kiện showWhen từ schema nếu có
  if (field.conditions && field.conditions.showWhen) {
    const showWhen = field.conditions.showWhen
    const conditionFieldName = showWhen.field
    const expectedValue = showWhen.value
    
    console.log('Using showWhen condition:', {
      field: conditionFieldName,
      value: expectedValue
    })
    
    // Lấy giá trị của field điều kiện
    const conditionValue = formValues[conditionFieldName]
    console.log('Condition field value:', conditionValue, '(type:', typeof conditionValue, ')')
    
    // Nếu chưa có giá trị, ẩn field
    if (conditionValue === undefined || conditionValue === null || conditionValue === '') {
      console.log('No condition value, hiding field')
      return false
    }
    
    // So sánh giá trị với giá trị mong đợi từ điều kiện
    const conditionValueStr = String(conditionValue).trim()
    const expectedValueStr = String(expectedValue).trim()
    
    // So sánh chính xác (case-sensitive và case-insensitive)
    const isMatch = conditionValueStr === expectedValueStr ||
                   conditionValueStr.toLowerCase() === expectedValueStr.toLowerCase()
    
    console.log('Value comparison:', {
      conditionValue: conditionValueStr,
      expectedValue: expectedValueStr,
      isMatch: isMatch
    })
    
    if (isMatch) {
      console.log('Condition matches, showing field')
      return true
    } else {
      console.log('Condition does not match, hiding field')
      return false
    }
  }
  
  // Fallback: Tìm field điều kiện tự động nếu không có showWhen
  // Ưu tiên: Kiểm tra trực tiếp field 'lives_at_mailing_address' từ formValues trước
  let conditionFieldName: string | null = null
  
  // Kiểm tra trực tiếp field 'lives_at_mailing_address' từ formValues
  if (formValues['lives_at_mailing_address'] !== undefined) {
    conditionFieldName = 'lives_at_mailing_address'
    console.log('Found condition field directly from formValues: lives_at_mailing_address')
  } else {
    // Nếu không tìm thấy, tìm trong formValues bằng pattern matching
    const possibleFieldNames = Object.keys(formValues).filter(key => {
      const keyLower = key.toLowerCase()
      return key === 'lives_at_mailing_address' ||
             keyLower === 'lives_at_mailing_address' ||
             keyLower.includes('lives_at_mailing') ||
             (keyLower.includes('lives') && keyLower.includes('mailing'))
    })
    
    if (possibleFieldNames.length > 0) {
      // Ưu tiên field có giá trị không rỗng
      for (const fieldName of possibleFieldNames) {
        const value = formValues[fieldName]
        if (value !== undefined && value !== null && value !== '') {
          conditionFieldName = fieldName
          console.log('Found condition field in formValues:', fieldName, 'value:', value)
          break
        }
      }
      
      // Nếu không tìm thấy field có giá trị, dùng field đầu tiên
      if (!conditionFieldName && possibleFieldNames.length > 0 && possibleFieldNames[0]) {
        conditionFieldName = possibleFieldNames[0]
        console.log('Using fallback field name:', conditionFieldName)
      }
    }
    
    // Nếu vẫn không tìm thấy, dùng hàm getLivingAtMailingAddressField
    if (!conditionFieldName) {
      const schemaData = schema.value || schema
      conditionFieldName = getLivingAtMailingAddressField(schemaData, currentLocale)
      console.log('Found condition field name from schema:', conditionFieldName)
    }
  }
  
  if (!conditionFieldName) {
    console.log('Condition field not found, hiding field for safety')
    return false
  }
  
  // Lấy giá trị của field điều kiện
  const conditionValue = formValues[conditionFieldName]
  console.log('Condition field name:', conditionFieldName)
  console.log('Condition value:', conditionValue, '(type:', typeof conditionValue, ')')
  
  // Nếu chưa có giá trị, ẩn field
  if (conditionValue === undefined || conditionValue === null || conditionValue === '') {
    console.log('No condition value, hiding field')
    return false
  }
  
  // So sánh với giá trị "Không"
  const conditionValueStr = String(conditionValue).trim()
  const conditionValueLower = conditionValueStr.toLowerCase()
  
  // Kiểm tra xem giá trị có phải là "Không" không
  const isNo = conditionValueStr === 'Không' ||
               conditionValueLower === 'không' ||
               conditionValueStr === 'No' ||
               conditionValueLower === 'no'
  
  const isYes = conditionValueStr === 'Có' ||
                conditionValueLower === 'có' ||
                conditionValueStr === 'Yes' ||
                conditionValueLower === 'yes'
  
  if (isYes) {
    console.log('Condition is YES/CÓ, hiding field')
    return false
  }
  
  if (isNo) {
    console.log('Condition is NO/KHÔNG, showing field')
    return true
  }
  
  console.log('Condition value does not match expected values, hiding field')
  return false
}

// Helper function để tìm field "Bạn là:" trong toàn bộ schema
const getApplicantTypeField = (schemaData: any, currentLocale: 'vi' | 'en'): string | null => {
  if (!schemaData || !schemaData.sections) {
    console.log('Schema data not available for getApplicantTypeField')
    return null
  }
  
  // Ưu tiên tìm theo field name trước
  for (const section of schemaData.sections) {
    if (!section.groups) continue
    for (const group of section.groups) {
      if (!group.fields) continue
      for (const field of group.fields) {
        const fieldNameLower = field.name.toLowerCase()
        if (fieldNameLower.includes('applicant_type') ||
            fieldNameLower.includes('you_are') ||
            fieldNameLower.includes('residency_type') ||
            fieldNameLower.includes('permanent_resident_type') ||
            fieldNameLower.includes('applicant_type') ||
            fieldNameLower.includes('residency_status')) {
          console.log('Found applicant type field by name:', field.name)
          return field.name
        }
      }
    }
  }
  
  // Nếu không tìm thấy theo field name, tìm theo label
  for (const section of schemaData.sections) {
    if (!section.groups) continue
    for (const group of section.groups) {
      if (!group.fields) continue
      for (const field of group.fields) {
        const label = getLocalizedText(field.label, currentLocale)
        const labelLower = label.toLowerCase()
        if (label === 'Bạn là:' ||
            label === 'You are:' ||
            labelLower.includes('bạn là') ||
            labelLower.includes('you are') ||
            labelLower.includes('applicant type') ||
            labelLower.includes('residency type') ||
            labelLower.includes('permanent resident type')) {
          console.log('Found applicant type field by label:', field.name, 'label:', label)
          return field.name
        }
      }
    }
  }
  
  // Fallback: Tìm trong formValues các field có giá trị liên quan đến "Thường trú nhân"
  console.log('Trying to find applicant type field in formValues...')
  const possibleFieldNames = Object.keys(formValues).filter(key => {
    const value = formValues[key]
    if (!value) return false
    const valueStr = String(value).toLowerCase()
    return valueStr.includes('thường trú nhân') || 
           valueStr.includes('permanent resident') ||
           valueStr.includes('residency')
  })
  console.log('Possible applicant type fields found:', possibleFieldNames)
  if (possibleFieldNames.length > 0) {
    return possibleFieldNames[0] || null
  }
  
  console.log('Applicant type field not found')
  return null
}

// Helper function để kiểm tra xem field có phải là "Lý do làm đơn (dành cho Thường trú nhân)" không
const isReasonForApplicationField = (field: any, currentLocale: 'vi' | 'en') => {
  const label = getLocalizedText(field.label, currentLocale)
  const labelLower = label.toLowerCase()
  
  // Debug: Log tất cả các field để kiểm tra
  if (field.name === 'reason_lpr' || field.name === 'reason_cpr') {
    console.log('isReasonForApplicationField: Checking field:', field.name, 'label:', label, 'locale:', currentLocale)
  }
  
  // Kiểm tra tiếng Việt
  if (currentLocale === 'vi') {
    const isMatch = label.includes('Lý do làm đơn') && 
                    !label.includes('có điều kiện') &&
                    label.includes('Thường trú nhân')
    if (isMatch) {
      console.log('isReasonForApplicationField: Matched Vietnamese field:', label)
    } else if (field.name === 'reason_lpr' || field.name === 'reason_cpr') {
      console.log('isReasonForApplicationField: NOT matched Vietnamese field:', label, 'checks:', {
        hasLydo: label.includes('Lý do làm đơn'),
        noConditional: !label.includes('có điều kiện'),
        hasThuongtru: label.includes('Thường trú nhân')
      })
    }
    return isMatch
  }
  
  // Kiểm tra tiếng Anh - linh hoạt hơn với nhiều pattern
  // Field reason_lpr có label: "Reason for application (for LPR)" - không có "permanent resident"
  const hasReason = labelLower.includes('reason') || labelLower.includes('application')
  const noConditional = !labelLower.includes('conditional')
  // Kiểm tra có "LPR" (viết tắt của Lawful Permanent Resident) hoặc "permanent resident"
  const hasLPR = labelLower.includes('lpr') || 
                 labelLower.includes('permanent resident') || 
                 labelLower.includes('permanent') || 
                 labelLower.includes('resident')
  
  const isMatch = hasReason && noConditional && hasLPR
  
  if (isMatch) {
    console.log('isReasonForApplicationField: Matched English field:', label)
  } else if (field.name === 'reason_lpr' || field.name === 'reason_cpr') {
    console.log('isReasonForApplicationField: NOT matched English field:', label, 'checks:', {
      hasReason,
      noConditional,
      hasLPR,
      labelLower
    })
  }
  return isMatch
}

// Helper function để kiểm tra xem field có phải là "Lý do làm đơn (dành cho Thường trú nhân có điều kiện)" không
const isConditionalReasonForApplicationField = (field: any, currentLocale: 'vi' | 'en') => {
  const label = getLocalizedText(field.label, currentLocale)
  const labelLower = label.toLowerCase()
  
  // Kiểm tra tiếng Việt
  if (currentLocale === 'vi') {
    const isMatch = label.includes('Lý do làm đơn') && 
                    label.includes('có điều kiện') &&
                    label.includes('Thường trú nhân')
    if (isMatch) {
      console.log('isConditionalReasonForApplicationField: Matched Vietnamese field:', label)
    }
    return isMatch
  }
  
  // Kiểm tra tiếng Anh - linh hoạt hơn với nhiều pattern
  const isMatch = (labelLower.includes('reason') || labelLower.includes('application')) &&
                  labelLower.includes('conditional') &&
                  (labelLower.includes('permanent resident') || labelLower.includes('permanent') || labelLower.includes('resident'))
  if (isMatch) {
    console.log('isConditionalReasonForApplicationField: Matched English field:', label)
  }
  return isMatch
}

// Helper function để kiểm tra xem giá trị có phải là "Thường trú nhân" hoặc "Thường trú nhân - diện đi làm" không
const isRegularPermanentResident = (value: string, currentLocale: 'vi' | 'en'): boolean => {
  if (!value) {
    console.log('isRegularPermanentResident: No value provided')
    return false
  }
  const normalizedValue = String(value).trim().toLowerCase()
  const originalValue = String(value).trim()
  
  console.log('isRegularPermanentResident: Checking value:', originalValue, 'locale:', currentLocale)
  
  // Kiểm tra các giá trị tiếng Việt (kiểm tra cả khi locale là tiếng Anh vì giá trị có thể là tiếng Việt)
  // Kiểm tra chính xác "Thường trú nhân" (không có "có điều kiện")
  if (originalValue === 'Thường trú nhân') {
    console.log('isRegularPermanentResident: Matched exact Vietnamese "Thường trú nhân"')
    return true
  }
  // Kiểm tra "Thường trú nhân - diện đi làm (dành cho công dân Canada hoặc Mexico)"
  if (originalValue.includes('Thường trú nhân') && 
      originalValue.includes('diện đi làm') &&
      !originalValue.includes('có điều kiện')) {
    console.log('isRegularPermanentResident: Matched Vietnamese "Thường trú nhân - diện đi làm"')
    return true
  }
  // Kiểm tra normalized tiếng Việt
  if (normalizedValue.includes('thường trú nhân') && 
      normalizedValue.includes('diện đi làm') &&
      !normalizedValue.includes('có điều kiện')) {
    console.log('isRegularPermanentResident: Matched normalized Vietnamese')
    return true
  }
  
  // Kiểm tra các giá trị tiếng Anh
  // Match "Lawful Permanent Resident" hoặc "Lawful Permanent Resident - employment-based" nhưng không match "Conditional Permanent Resident"
  if (normalizedValue.includes('permanent resident') || normalizedValue.includes('lawful permanent resident')) {
    if (normalizedValue.includes('conditional')) {
      console.log('isRegularPermanentResident: Contains "conditional", not a regular permanent resident')
      return false
    }
    // Kiểm tra "Lawful Permanent Resident" hoặc "Lawful Permanent Resident - employment-based"
    if (normalizedValue.includes('lawful') || 
        normalizedValue.includes('employment') || 
        normalizedValue.includes('work') ||
        normalizedValue.includes('canada') ||
        normalizedValue.includes('mexico') ||
        (!normalizedValue.includes('conditional') && normalizedValue.includes('permanent resident'))) {
      console.log('isRegularPermanentResident: Matched English "Lawful Permanent Resident" (not conditional)')
      return true
    }
  }
  
  console.log('isRegularPermanentResident: No match found')
  return false
}

// Helper function để kiểm tra xem giá trị có phải là "Thường trú nhân có điều kiện" không
const isConditionalPermanentResident = (value: string, currentLocale: 'vi' | 'en'): boolean => {
  if (!value) {
    console.log('isConditionalPermanentResident: No value provided')
    return false
  }
  const normalizedValue = String(value).trim().toLowerCase()
  const originalValue = String(value).trim()
  
  console.log('isConditionalPermanentResident: Checking value:', originalValue, 'locale:', currentLocale)
  
  // Kiểm tra các giá trị tiếng Việt (kiểm tra cả khi locale là tiếng Anh vì giá trị có thể là tiếng Việt)
  // Kiểm tra chính xác "Thường trú nhân có điều kiện (thẻ xanh 2 năm)"
  if (originalValue === 'Thường trú nhân có điều kiện (thẻ xanh 2 năm)') {
    console.log('isConditionalPermanentResident: Matched exact Vietnamese "Thường trú nhân có điều kiện"')
    return true
  }
  // Kiểm tra có chứa "Thường trú nhân có điều kiện"
  if (originalValue.includes('Thường trú nhân') && originalValue.includes('có điều kiện')) {
    console.log('isConditionalPermanentResident: Matched Vietnamese with "có điều kiện"')
    return true
  }
  // Kiểm tra normalized tiếng Việt
  if (normalizedValue.includes('thường trú nhân') && normalizedValue.includes('có điều kiện')) {
    console.log('isConditionalPermanentResident: Matched normalized Vietnamese')
    return true
  }
  
  // Kiểm tra các giá trị tiếng Anh
  // Match "Conditional Permanent Resident (2-year green card)" hoặc "Conditional Permanent Resident"
  if (normalizedValue.includes('conditional') && 
      (normalizedValue.includes('permanent resident') || normalizedValue.includes('permanent') || normalizedValue.includes('resident'))) {
    console.log('isConditionalPermanentResident: Matched English "Conditional Permanent Resident"')
    return true
  }
  
  console.log('isConditionalPermanentResident: No match found')
  return false
}

// Helper function để kiểm tra xem field "Lý do làm đơn" có nên được hiển thị không
const shouldShowReasonForApplicationField = (field: any, currentLocale: 'vi' | 'en'): boolean => {
  // Nếu không phải là field "Lý do làm đơn (dành cho Thường trú nhân)", luôn hiển thị
  if (!isReasonForApplicationField(field, currentLocale)) {
    return true
  }
  
  // Tìm field "Bạn là:" trong schema (sử dụng schema.value vì schema là ref)
  const applicantTypeFieldName = getApplicantTypeField(schema.value || schema, currentLocale)
  console.log('=== DEBUG Reason For Application Field ===')
  console.log('Field name:', field.name)
  console.log('Field label:', getLocalizedText(field.label, currentLocale))
  console.log('Applicant type field name:', applicantTypeFieldName)
  console.log('Schema available:', !!schema.value)
  
  if (!applicantTypeFieldName) {
    // Nếu không tìm thấy, ẩn field này để an toàn
    console.log('Applicant type field not found, hiding field')
    return false
  }
  
  // Lấy giá trị của field "Bạn là:"
  const applicantTypeValue = formValues[applicantTypeFieldName]
  console.log('Applicant type value:', applicantTypeValue, '(type:', typeof applicantTypeValue, ')')
  console.log('All formValues keys:', Object.keys(formValues))
  
  if (!applicantTypeValue) {
    console.log('No applicant type value, hiding field')
    return false
  }
  
  // Chỉ hiển thị nếu giá trị là "Thường trú nhân" hoặc "Thường trú nhân - diện đi làm"
  const shouldShow = isRegularPermanentResident(applicantTypeValue, currentLocale)
  console.log('Is regular permanent resident?', shouldShow)
  console.log('Will show field?', shouldShow)
  console.log('=========================================')
  
  return shouldShow
}

// Helper function để kiểm tra xem field "Lý do làm đơn (dành cho Thường trú nhân có điều kiện)" có nên được hiển thị không
const shouldShowConditionalReasonForApplicationField = (field: any, currentLocale: 'vi' | 'en'): boolean => {
  // Nếu không phải là field "Lý do làm đơn (dành cho Thường trú nhân có điều kiện)", luôn hiển thị
  if (!isConditionalReasonForApplicationField(field, currentLocale)) {
    return true
  }
  
  // Tìm field "Bạn là:" trong schema (sử dụng schema.value vì schema là ref)
  const applicantTypeFieldName = getApplicantTypeField(schema.value || schema, currentLocale)
  console.log('=== DEBUG Conditional Reason For Application Field ===')
  console.log('Field name:', field.name)
  console.log('Field label:', getLocalizedText(field.label, currentLocale))
  console.log('Applicant type field name:', applicantTypeFieldName)
  console.log('Schema available:', !!schema.value)
  
  if (!applicantTypeFieldName) {
    // Nếu không tìm thấy, ẩn field này để an toàn
    console.log('Applicant type field not found, hiding field')
    return false
  }
  
  // Lấy giá trị của field "Bạn là:"
  const applicantTypeValue = formValues[applicantTypeFieldName]
  console.log('Applicant type value:', applicantTypeValue, '(type:', typeof applicantTypeValue, ')')
  console.log('All formValues keys:', Object.keys(formValues))
  
  if (!applicantTypeValue) {
    console.log('No applicant type value, hiding field')
    return false
  }
  
  // Chỉ hiển thị nếu giá trị là "Thường trú nhân có điều kiện (thẻ xanh 2 năm)"
  const shouldShow = isConditionalPermanentResident(applicantTypeValue, currentLocale)
  console.log('Is conditional permanent resident?', shouldShow)
  console.log('Will show field?', shouldShow)
  console.log('=====================================================')
  
  return shouldShow
}

// Tên field điều kiện và các field phụ thuộc (khớp theo name nên không phụ thuộc ngôn ngữ)
const ENTRY_WITH_IMMIGRANT_VISA_FIELD = 'entered_with_immigrant_visa'
const ENTRY_WITH_IMMIGRANT_VISA_DEPENDENTS = ['first_us_state_of_residence', 'port_of_entry_city_state']

// Helper function để kiểm tra xem field có phải là field liên quan đến nhập cảnh với visa định cư không
const isEntryWithImmigrantVisaField = (field: any, currentLocale: 'vi' | 'en'): boolean => {
  if (ENTRY_WITH_IMMIGRANT_VISA_DEPENDENTS.includes(field.name)) {
    return true
  }

  // Fallback theo label (phòng khi schema đổi name)
  const label = getLocalizedText(field.label, currentLocale)
  const labelLower = label.toLowerCase()

  // Kiểm tra các pattern cho field "Nơi đến của bạn khi nhập cảnh (tiểu bang)"
  const isDestinationField = label.includes('Nơi đến của bạn khi nhập cảnh') ||
                              label.includes('Nơi đến') ||
                              labelLower.includes('destination upon entry') ||
                              labelLower.includes('destination when entering') ||
                              labelLower.includes('first u.s. state of residence') ||
                              labelLower.includes('first us state of residence') ||
                              (labelLower.includes('destination') && labelLower.includes('entry'))

  // Kiểm tra các pattern cho field "Thành phố và tiểu bang của cảng nhập cảnh"
  const isPortOfEntryField = label.includes('Thành phố và tiểu bang của cảng nhập cảnh') ||
                              label.includes('cảng nhập cảnh') ||
                              labelLower.includes('port of entry') ||
                              labelLower.includes('city and state of port') ||
                              (labelLower.includes('port') && labelLower.includes('entry'))

  return isDestinationField || isPortOfEntryField
}

// Helper function để tìm field "Bạn nhập cảnh Mỹ với visa định cư (không phải chuyển diện)?" trong toàn bộ schema
const getEntryWithImmigrantVisaField = (schemaData: any, currentLocale: 'vi' | 'en'): string | null => {
  if (!schemaData || !schemaData.sections) return null

  // Ưu tiên tìm theo field name trước
  for (const section of schemaData.sections) {
    if (!section.groups) continue
    for (const group of section.groups) {
      if (!group.fields) continue
      for (const field of group.fields) {
        const fieldNameLower = String(field.name || '').toLowerCase()
        if (fieldNameLower === ENTRY_WITH_IMMIGRANT_VISA_FIELD ||
            fieldNameLower.includes('entry_with_immigrant_visa') ||
            fieldNameLower.includes('immigrant_visa_entry') ||
            fieldNameLower.includes('entry_immigrant_visa') ||
            ((fieldNameLower.includes('entry') || fieldNameLower.includes('entered')) &&
              fieldNameLower.includes('immigrant') && fieldNameLower.includes('visa'))) {
          return field.name
        }
      }
    }
  }

  // Nếu không tìm thấy theo field name, tìm theo label
  for (const section of schemaData.sections) {
    if (!section.groups) continue
    for (const group of section.groups) {
      if (!group.fields) continue
      for (const field of group.fields) {
        const label = getLocalizedText(field.label, currentLocale)
        // Bỏ dấu chấm để "U.S." cũng khớp với "us"
        const labelLower = label.toLowerCase().split('.').join('')
        if ((label.includes('nhập cảnh Mỹ với visa định cư') && label.includes('không phải chuyển diện')) ||
            (labelLower.includes('immigrant visa') &&
              (labelLower.includes('enter the us') || labelLower.includes('entry')) &&
              (labelLower.includes('not adjustment') ||
                labelLower.includes('not an adjustment') ||
                labelLower.includes('not a change of status') ||
                (labelLower.includes('not') && labelLower.includes('change')))) ) {
          return field.name
        }
      }
    }
  }

  return null
}

// Helper function để kiểm tra xem field liên quan đến nhập cảnh có nên được hiển thị không
const shouldShowEntryWithImmigrantVisaFields = (field: any, currentLocale: 'vi' | 'en'): boolean => {
  // Nếu không phải là field liên quan đến nhập cảnh với visa định cư, luôn hiển thị
  if (!isEntryWithImmigrantVisaField(field, currentLocale)) {
    return true
  }

  // Tìm field điều kiện trong schema
  const conditionFieldName = getEntryWithImmigrantVisaField(schema.value || schema, currentLocale) ||
                              ENTRY_WITH_IMMIGRANT_VISA_FIELD

  // Lấy giá trị của field điều kiện
  const conditionValue = formValues[conditionFieldName]

  if (!conditionValue) {
    return false
  }

  // Chuẩn hóa giá trị để so sánh ("Có" / "Yes")
  const normalizedValue = String(conditionValue).trim().toLowerCase()

  return normalizedValue === 'yes' || normalizedValue === 'có' || normalizedValue === 'co'
}

// Helper function để kiểm tra xem field có phải là field "Vui lòng ghi rõ tình trạng khuyết tật" không
const isDisabilityField = (field: any, currentLocale: 'vi' | 'en'): boolean => {
  const label = getLocalizedText(field.label, currentLocale)
  const labelLower = label.toLowerCase()
  
  return label.includes('ghi rõ tình trạng khuyết tật') ||
         label.includes('tình trạng khuyết tật') ||
         labelLower.includes('disability condition') ||
         labelLower.includes('disability status') ||
         labelLower.includes('describe disability') ||
         (labelLower.includes('disability') && labelLower.includes('describe'))
}

// Helper function để tìm field "Bạn có phải là người khuyết tật không?" trong toàn bộ schema
const getDisabilityQuestionField = (schemaData: any, currentLocale: 'vi' | 'en'): string | null => {
  if (!schemaData || !schemaData.sections) return null
  
  // Ưu tiên tìm theo field name trước
  for (const section of schemaData.sections) {
    if (!section.groups) continue
    for (const group of section.groups) {
      if (!group.fields) continue
      for (const field of group.fields) {
        const fieldNameLower = field.name.toLowerCase()
        if (fieldNameLower.includes('disability') ||
            fieldNameLower.includes('disabled') ||
            fieldNameLower.includes('handicap')) {
          // Kiểm tra xem có phải là field câu hỏi (không phải field mô tả)
          const label = getLocalizedText(field.label, currentLocale)
          const labelLower = label.toLowerCase()
          // Nếu là field mô tả thì bỏ qua
          if (labelLower.includes('ghi rõ') || 
              labelLower.includes('describe') || 
              labelLower.includes('tình trạng')) {
            continue
          }
          return field.name
        }
      }
    }
  }
  
  // Nếu không tìm thấy theo field name, tìm theo label
  for (const section of schemaData.sections) {
    if (!section.groups) continue
    for (const group of section.groups) {
      if (!group.fields) continue
      for (const field of group.fields) {
        const label = getLocalizedText(field.label, currentLocale)
        const labelLower = label.toLowerCase()
        
        // Tìm field câu hỏi về khuyết tật (không phải field mô tả)
        if ((label.includes('Bạn có phải là người khuyết tật không') ||
             label.includes('người khuyết tật') ||
             labelLower.includes('are you disabled') ||
             labelLower.includes('do you have a disability') ||
             labelLower.includes('disability')) &&
            !labelLower.includes('ghi rõ') &&
            !labelLower.includes('describe') &&
            !labelLower.includes('tình trạng')) {
          return field.name
        }
      }
    }
  }
  
  return null
}

// Helper function để kiểm tra xem field "Vui lòng ghi rõ tình trạng khuyết tật" có nên được hiển thị không
const shouldShowDisabilityField = (field: any, currentLocale: 'vi' | 'en'): boolean => {
  // Nếu không phải là field "Vui lòng ghi rõ tình trạng khuyết tật", luôn hiển thị
  if (!isDisabilityField(field, currentLocale)) {
    return true
  }
  
  // Tìm field điều kiện trong schema (ưu tiên schema.value)
  const schemaData = schema.value || schema
  const conditionFieldName = getDisabilityQuestionField(schemaData, currentLocale)
  
  if (!conditionFieldName) {
    // Nếu không tìm thấy field điều kiện, ẩn field này để an toàn
    console.log('Disability question field not found for field:', field.name)
    return false
  }
  
  // Lấy giá trị của field điều kiện
  const conditionValue = formValues[conditionFieldName]
  
  if (!conditionValue) {
    return false
  }
  
  // Chuẩn hóa giá trị để so sánh
  const normalizedValue = String(conditionValue).trim().toLowerCase()
  const originalValue = String(conditionValue).trim()
  
  // Kiểm tra xem giá trị có phải là "Có" hoặc "Yes" không
  const isYes = normalizedValue === 'yes' || 
                normalizedValue === 'có' ||
                originalValue === 'Có' ||
                originalValue === 'có' ||
                originalValue === 'Yes' ||
                originalValue === 'YES' ||
                originalValue.toLowerCase() === 'có' ||
                originalValue.toLowerCase() === 'yes'
  
  return isYes
}

// Helper function để kiểm tra xem field có phải là field "Lý do bị trục xuất" không
const isDeportationReasonField = (field: any, currentLocale: 'vi' | 'en'): boolean => {
  const label = getLocalizedText(field.label, currentLocale)
  const labelLower = label.toLowerCase()
  
  return label.includes('Lý do bị trục xuất') ||
         label.includes('lý do trục xuất') ||
         labelLower.includes('reason for deportation') ||
         labelLower.includes('deportation reason') ||
         labelLower.includes('removal reason') ||
         (labelLower.includes('deportation') && labelLower.includes('reason')) ||
         (labelLower.includes('removal') && labelLower.includes('reason'))
}

// Helper function để tìm field "Bạn đã từng bị trục xuất, loại bỏ, hay bị lên tòa để trục xuất khỏi Mỹ chưa?" trong toàn bộ schema
const getDeportationQuestionField = (schemaData: any, currentLocale: 'vi' | 'en'): string | null => {
  if (!schemaData || !schemaData.sections) return null
  
  // Ưu tiên tìm theo field name trước
  for (const section of schemaData.sections) {
    if (!section.groups) continue
    for (const group of section.groups) {
      if (!group.fields) continue
      for (const field of group.fields) {
        const fieldNameLower = field.name.toLowerCase()
        if (fieldNameLower.includes('deportation') ||
            fieldNameLower.includes('removal') ||
            fieldNameLower.includes('exclusion') ||
            fieldNameLower.includes('removed')) {
          // Kiểm tra xem có phải là field câu hỏi (không phải field lý do)
          const label = getLocalizedText(field.label, currentLocale)
          const labelLower = label.toLowerCase()
          // Nếu là field lý do thì bỏ qua
          if (labelLower.includes('lý do') || 
              labelLower.includes('reason') ||
              labelLower.includes('ghi rõ') ||
              labelLower.includes('describe')) {
            continue
          }
          return field.name
        }
      }
    }
  }
  
  // Nếu không tìm thấy theo field name, tìm theo label
  for (const section of schemaData.sections) {
    if (!section.groups) continue
    for (const group of section.groups) {
      if (!group.fields) continue
      for (const field of group.fields) {
        const label = getLocalizedText(field.label, currentLocale)
        const labelLower = label.toLowerCase()
        
        // Tìm field câu hỏi về trục xuất (không phải field lý do)
        if ((label.includes('bị trục xuất') ||
             label.includes('loại bỏ') ||
             label.includes('lên tòa để trục xuất') ||
             labelLower.includes('deported') ||
             labelLower.includes('removed') ||
             labelLower.includes('excluded') ||
             labelLower.includes('removal proceedings')) &&
            !labelLower.includes('lý do') &&
            !labelLower.includes('reason') &&
            !labelLower.includes('ghi rõ') &&
            !labelLower.includes('describe')) {
          return field.name
        }
      }
    }
  }
  
  return null
}

// Helper function để kiểm tra xem field "Lý do bị trục xuất" có nên được hiển thị không
const shouldShowDeportationReasonField = (field: any, currentLocale: 'vi' | 'en'): boolean => {
  // Nếu không phải là field "Lý do bị trục xuất", luôn hiển thị
  if (!isDeportationReasonField(field, currentLocale)) {
    return true
  }
  
  // Tìm field điều kiện trong schema (ưu tiên schema.value)
  const schemaData = schema.value || schema
  const conditionFieldName = getDeportationQuestionField(schemaData, currentLocale)
  
  if (!conditionFieldName) {
    // Nếu không tìm thấy field điều kiện, ẩn field này để an toàn
    console.log('Deportation question field not found for field:', field.name)
    return false
  }
  
  // Lấy giá trị của field điều kiện
  const conditionValue = formValues[conditionFieldName]
  
  if (!conditionValue) {
    return false
  }
  
  // Chuẩn hóa giá trị để so sánh
  const normalizedValue = String(conditionValue).trim().toLowerCase()
  const originalValue = String(conditionValue).trim()
  
  // Kiểm tra xem giá trị có phải là "Có" hoặc "Yes" không
  const isYes = normalizedValue === 'yes' || 
                normalizedValue === 'có' ||
                originalValue === 'Có' ||
                originalValue === 'có' ||
                originalValue === 'Yes' ||
                originalValue === 'YES' ||
                originalValue.toLowerCase() === 'có' ||
                originalValue.toLowerCase() === 'yes'
  
  return isYes
}

// Helper function để kiểm tra xem field có phải là field "Lý do chi tiết" (liên quan đến I-407) không
const isI407ReasonField = (field: any, currentLocale: 'vi' | 'en'): boolean => {
  // Kiểm tra field name trước (ưu tiên)
  const fieldNameLower = field.name?.toLowerCase() || ''
  if (fieldNameLower === 'i407_detail_reason' ||
      (fieldNameLower.includes('i407') && fieldNameLower.includes('detail') && fieldNameLower.includes('reason')) ||
      (fieldNameLower.includes('i_407') && fieldNameLower.includes('detail') && fieldNameLower.includes('reason'))) {
    return true
  }
  
  // Kiểm tra label
  const label = getLocalizedText(field.label, currentLocale)
  const labelLower = label.toLowerCase()
  
  // Field name: i407_detail_reason
  // Label tiếng Việt: "Lý do chi tiết"
  // Label tiếng Anh: "Detailed reason"
  return label === 'Lý do chi tiết' ||
         label === 'Detailed reason' ||
         (labelLower.includes('lý do') && labelLower.includes('chi tiết')) ||
         (labelLower.includes('detailed') && labelLower.includes('reason'))
}

// Helper function để tìm field "Kể từ ngày trở thành thường trú nhân, bạn có bao giờ nộp đơn I-407 hoặc có ý định từ bỏ tư cách thường trú nhân chưa?" trong toàn bộ schema
const getI407QuestionField = (schemaData: any, currentLocale: 'vi' | 'en'): string | null => {
  if (!schemaData || !schemaData.sections) return null
  
  // Ưu tiên tìm theo field name trước (field name cụ thể)
  for (const section of schemaData.sections) {
    if (!section.groups) continue
    for (const group of section.groups) {
      if (!group.fields) continue
      for (const field of group.fields) {
        const fieldNameLower = field.name.toLowerCase()
        // Tìm field name cụ thể: ever_filed_i407_or_intended_abandon_lpr
        if (fieldNameLower === 'ever_filed_i407_or_intended_abandon_lpr' ||
            fieldNameLower.includes('i407') ||
            fieldNameLower.includes('i_407') ||
            fieldNameLower.includes('i-407') ||
            (fieldNameLower.includes('abandon') && (fieldNameLower.includes('lpr') || fieldNameLower.includes('residency'))) ||
            (fieldNameLower.includes('relinquish') && (fieldNameLower.includes('lpr') || fieldNameLower.includes('residency')))) {
          // Kiểm tra xem có phải là field câu hỏi (không phải field lý do)
          const label = getLocalizedText(field.label, currentLocale)
          const labelLower = label.toLowerCase()
          // Nếu là field lý do thì bỏ qua
          if (labelLower.includes('lý do') || 
              labelLower.includes('reason') ||
              labelLower.includes('chi tiết') ||
              labelLower.includes('detail') ||
              labelLower.includes('ghi rõ') ||
              labelLower.includes('describe')) {
            continue
          }
          // Kiểm tra xem label có chứa nội dung câu hỏi không
          if (labelLower.includes('i-407') || 
              labelLower.includes('i407') ||
              labelLower.includes('abandon') ||
              labelLower.includes('relinquish') ||
              labelLower.includes('nộp đơn') ||
              labelLower.includes('từ bỏ')) {
            return field.name
          }
        }
      }
    }
  }
  
  // Nếu không tìm thấy theo field name, tìm theo label
  for (const section of schemaData.sections) {
    if (!section.groups) continue
    for (const group of section.groups) {
      if (!group.fields) continue
      for (const field of group.fields) {
        const label = getLocalizedText(field.label, currentLocale)
        const labelLower = label.toLowerCase()
        
        // Tìm field câu hỏi về I-407 (không phải field lý do)
        // Pattern: "Kể từ ngày trở thành thường trú nhân, bạn có bao giờ nộp đơn I-407 hoặc có ý định từ bỏ tư cách thường trú nhân chưa?"
        if ((label.includes('I-407') ||
             label.includes('nộp đơn I-407') ||
             label.includes('từ bỏ tư cách thường trú nhân') ||
             label.includes('Kể từ ngày trở thành thường trú nhân') ||
             labelLower.includes('i-407') ||
             labelLower.includes('i407') ||
             labelLower.includes('form i-407') ||
             labelLower.includes('abandon permanent resident') ||
             labelLower.includes('relinquish permanent resident') ||
             labelLower.includes('abandon lpr') ||
             labelLower.includes('relinquish lpr') ||
             labelLower.includes('abandon residency') ||
             labelLower.includes('relinquish residency')) &&
            !labelLower.includes('lý do') &&
            !labelLower.includes('reason') &&
            !labelLower.includes('chi tiết') &&
            !labelLower.includes('detail') &&
            !labelLower.includes('ghi rõ') &&
            !labelLower.includes('describe')) {
          return field.name
        }
      }
    }
  }
  
  return null
}

// Helper function để kiểm tra xem field "Lý do chi tiết" (liên quan đến I-407) có nên được hiển thị không
const shouldShowI407ReasonField = (field: any, currentLocale: 'vi' | 'en'): boolean => {
  // Nếu không phải là field "Lý do chi tiết" (liên quan đến I-407), luôn hiển thị
  if (!isI407ReasonField(field, currentLocale)) {
    return true
  }
  
  // Tìm field điều kiện trong schema (ưu tiên schema.value)
  const schemaData = schema.value || schema
  const conditionFieldName = getI407QuestionField(schemaData, currentLocale)
  
  if (!conditionFieldName) {
    // Nếu không tìm thấy field điều kiện, ẩn field này để an toàn
    console.log('I-407 question field not found for field:', field.name)
    return false
  }
  
  // Lấy giá trị của field điều kiện
  const conditionValue = formValues[conditionFieldName]
  
  if (!conditionValue) {
    console.log('I-407 condition field has no value:', conditionFieldName)
    return false
  }
  
  // Chuẩn hóa giá trị để so sánh
  const normalizedValue = String(conditionValue).trim().toLowerCase()
  const originalValue = String(conditionValue).trim()
  
  // Kiểm tra xem giá trị có phải là "Có" hoặc "Yes" không
  const isYes = normalizedValue === 'yes' || 
                normalizedValue === 'có' ||
                originalValue === 'Có' ||
                originalValue === 'có' ||
                originalValue === 'Yes' ||
                originalValue === 'YES' ||
                originalValue.toLowerCase() === 'có' ||
                originalValue.toLowerCase() === 'yes'
  
  console.log('I-407 field check:', {
    fieldName: field.name,
    conditionFieldName,
    conditionValue: originalValue,
    normalizedValue,
    isYes,
    willShow: isYes
  })
  
  return isYes
}

// Helper function để kiểm tra xem field có phải là field "Thông tin cần bổ sung" không
const isAdditionalInformationField = (field: any, currentLocale: 'vi' | 'en'): boolean => {
  // Loại trừ field other_additional_information ngay từ đầu
  const fieldNameLower = field.name?.toLowerCase() || ''
  if (fieldNameLower === 'other_additional_information' || 
      fieldNameLower.includes('other_additional')) {
    return false
  }
  
  // Kiểm tra field name trước (ưu tiên)
  if (fieldNameLower === 'additional_information') {
    return true
  }
  
  // Kiểm tra label
  const label = getLocalizedText(field.label, currentLocale)
  const labelLower = label.toLowerCase()
  
  // Loại trừ các field có label về "other additional information"
  if (labelLower.includes('other additional information') ||
      (labelLower.includes('other') && labelLower.includes('additional') && labelLower.includes('information'))) {
    return false
  }
  
  // Field name: additional_information
  // Label tiếng Việt: "Thông tin cần bổ sung"
  // Label tiếng Anh: "Additional information"
  return label === 'Thông tin cần bổ sung' ||
         label === 'Additional information' ||
         (labelLower.includes('thông tin') && labelLower.includes('bổ sung') && !labelLower.includes('khác')) ||
         (labelLower.includes('additional') && labelLower.includes('information') && !labelLower.includes('other'))
}

// Helper function để tìm field "Bạn có cần bổ sung thêm thông tin nào khác không?" trong toàn bộ schema
const getAdditionalInformationQuestionField = (schemaData: any, currentLocale: 'vi' | 'en'): string | null => {
  if (!schemaData || !schemaData.sections) return null
  
  // Ưu tiên tìm theo field name trước (field name cụ thể) - đây là cách nhanh nhất và chính xác nhất
  for (const section of schemaData.sections) {
    if (!section.groups) continue
    for (const group of section.groups) {
      if (!group.fields) continue
      for (const field of group.fields) {
        const fieldNameLower = field.name?.toLowerCase() || ''
        // Tìm field name cụ thể: has_additional_information
        if (fieldNameLower === 'has_additional_information') {
          // Đây là field câu hỏi, return luôn
          console.log('Found has_additional_information field by name:', field.name)
          return field.name
        }
      }
    }
  }
  
  // Nếu không tìm thấy theo field name, tìm theo label (fallback)
  for (const section of schemaData.sections) {
    if (!section.groups) continue
    for (const group of section.groups) {
      if (!group.fields) continue
      for (const field of group.fields) {
        const label = getLocalizedText(field.label, currentLocale)
        const labelLower = label.toLowerCase()
        
        // Tìm field câu hỏi về bổ sung thông tin (không phải field thông tin)
        // Pattern tiếng Việt: "Bạn có cần bổ sung thêm thông tin nào khác không?"
        // Pattern tiếng Anh: "Do you need to provide any additional information?"
        const isVietnameseQuestion = label.includes('Bạn có cần bổ sung thêm thông tin') ||
                                     (labelLower.includes('có cần') && labelLower.includes('bổ sung') && labelLower.includes('thông tin'))
        
        const isEnglishQuestion = labelLower.includes('do you need to provide any additional information') ||
                                 (labelLower.includes('do you need') && labelLower.includes('additional information')) ||
                                 (labelLower.includes('do you need') && labelLower.includes('any additional'))
        
        // Loại trừ field "Thông tin cần bổ sung" (field trả lời, không phải câu hỏi)
        const isNotAnswerField = !labelLower.includes('thông tin cần bổ sung') &&
                                 !(labelLower.includes('additional information') && !labelLower.includes('do you need') && !labelLower.includes('do you'))
        
        if ((isVietnameseQuestion || isEnglishQuestion) && isNotAnswerField) {
          console.log('Found has_additional_information field by label:', field.name, 'label:', label)
          return field.name
        }
      }
    }
  }
  
  console.log('has_additional_information field not found in schema')
  return null
}

// Helper function để kiểm tra xem field có phải là field câu hỏi "has_additional_information" không
const isAdditionalInformationQuestionField = (field: any): boolean => {
  const fieldNameLower = field.name?.toLowerCase() || ''
  return fieldNameLower === 'has_additional_information'
}

// Helper function để kiểm tra xem field "Thông tin cần bổ sung" có nên được hiển thị không
const shouldShowAdditionalInformationField = (field: any, currentLocale: 'vi' | 'en'): boolean => {
  // Field câu hỏi "has_additional_information" luôn được hiển thị
  if (isAdditionalInformationQuestionField(field)) {
    return true
  }
  
  // Nếu không phải là field "Thông tin cần bổ sung", luôn hiển thị
  if (!isAdditionalInformationField(field, currentLocale)) {
    return true
  }
  
  // Tìm field điều kiện trong schema (ưu tiên schema.value)
  const schemaData = schema.value || schema
  const conditionFieldName = getAdditionalInformationQuestionField(schemaData, currentLocale)
  
  if (!conditionFieldName) {
    // Nếu không tìm thấy field điều kiện, ẩn field này để an toàn
    console.log('Additional information question field not found for field:', field.name)
    return false
  }
  
  // Lấy giá trị của field điều kiện
  const conditionValue = formValues[conditionFieldName]
  
  if (!conditionValue) {
    console.log('Additional information condition field has no value:', conditionFieldName)
    return false
  }
  
  // Chuẩn hóa giá trị để so sánh
  const normalizedValue = String(conditionValue).trim().toLowerCase()
  const originalValue = String(conditionValue).trim()
  
  // Kiểm tra xem giá trị có phải là "Có" hoặc "Yes" không
  const isYes = normalizedValue === 'yes' || 
                normalizedValue === 'có' ||
                originalValue === 'Có' ||
                originalValue === 'có' ||
                originalValue === 'Yes' ||
                originalValue === 'YES' ||
                originalValue.toLowerCase() === 'có' ||
                originalValue.toLowerCase() === 'yes'
  
  console.log('Additional information field check:', {
    fieldName: field.name,
    conditionFieldName,
    conditionValue: originalValue,
    normalizedValue,
    isYes,
    willShow: isYes
  })
  
  return isYes
}

// Navigation function for thank you modal
const goHome = () => {
  window.location.href = 'https://icaviet.com'
}
</script>

<template>
  <div class="max-w-3xl mx-auto p-6">
    <h1 class="text-3xl font-bold mb-6">
      {{ locale === 'vi' ? 'Biểu mẫu I-90 từ ICAVIET' : 'I-90 Form from ICAVIET' }}
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
          <p class="text-yellow-700 mb-2">{{ schemaError }}</p>
          <p class="text-sm text-yellow-600">
            {{ locale === 'vi' 
              ? 'Đang sử dụng schema mặc định. Vui lòng kiểm tra kết nối API.' 
              : 'Using default schema. Please check API connection.' }}
          </p>
        </div>
      </div>
    </div>

    <!-- Render toàn bộ schema -->
    <div
      v-if="schema && schema.sections && !loadingSchema"
      v-for="section in schema.sections"
      :key="section.id"
      class="mb-10"
    >
      <h2 class="text-2xl font-semibold mb-4">
        {{ getLocalizedText(section.title, locale) || section.id }}
      </h2>

      <div
        v-for="group in section.groups"
        :key="group.id"
        class="mb-6 p-4 border rounded"
      >
        <!-- Show group title only if not address_history or work_history group -->
        <h3 
            v-if="!group.fields.some((f: any) => f.type === 'address_history' || f.type === 'work_history' || f.type === 'children_info' || f.type === 'offense_history' || f.type === 'organization_history')"
          class="text-xl font-semibold mb-4 pb-2 border-b border-gray-200 text-gray-800"
        >
          {{ getLocalizedText(group.title, locale) || group.id }}
        </h3>

        <!-- All fields rendered in order -->
        <template
          v-for="(field, index) in (group.fields as any[])"
          :key="field.id"
        >
        <div
          v-if="field.type === 'address_history'"
          class="mb-6"
        >
          <h3 class="text-xl font-semibold mb-4 pb-2 border-b border-gray-200 text-gray-800">
            {{ getLocalizedText(group.title, locale) || group.id }}
          </h3>
          <div class="mb-4 pb-2 border-b border-gray-200">
            <p class="text-base font-semibold text-gray-800 mb-2">
              {{ getLocalizedText(field.label, locale) || field.name }}
              <span v-if="'required' in field && field.required" class="text-red-500">*</span>
            </p>
          </div>
          
          <div
            v-for="(item, itemIndex) in (formValues[field.name] || [])"
            :key="itemIndex"
            class="mb-4 relative"
          >
            <button
              v-if="(formValues[field.name] || []).length > 1"
              type="button"
              @click="removeAddress(field.name, itemIndex)"
              class="absolute top-0 right-0 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm"
            >
              {{ translations[locale].remove }}
            </button>
            
            <!-- Address on one row -->
            <div class="flex flex-col mb-4">
              <label class="text-base font-medium mb-1">
                {{ translations[locale].address }}
              </label>
              <input
                v-model="item.address"
                type="text"
                :class="getInputClasses(`${field.name}_${itemIndex}_address`, 'border rounded px-3 py-2', item.address)"
                @focus="handleInputFocus(`${field.name}_${itemIndex}_address`)"
                @blur="handleInputBlur"
              />
            </div>
            
            <!-- Start Date, End Date in one row -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="flex flex-col">
                <label class="text-base font-medium mb-1">
                  {{ translations[locale].startDate }}
                </label>
                <input
                  v-model="item.startDate"
                  type="text"
                  :class="getInputClasses(`${field.name}_${itemIndex}_startDate`, 'border rounded px-3 py-2', item.startDate)"
                  :placeholder="translations[locale].datePlaceholder"
                  @focus="handleInputFocus(`${field.name}_${itemIndex}_startDate`)"
                  @blur="handleInputBlur"
                />
              </div>
              
              <div class="flex flex-col">
                <label class="text-base font-medium mb-1">
                  {{ translations[locale].endDate }}
                </label>
                <input
                  v-model="item.endDate"
                  type="text"
                  :class="getInputClasses(`${field.name}_${itemIndex}_endDate`, 'border rounded px-3 py-2', item.endDate)"
                  :placeholder="translations[locale].datePlaceholder"
                  @focus="handleInputFocus(`${field.name}_${itemIndex}_endDate`)"
                  @blur="handleInputBlur"
                />
              </div>
            </div>
          </div>
          
          <button
            type="button"
            @click="addAddress(field.name)"
            class="mt-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded flex items-center gap-2"
          >
            <span>+</span>
            <span>{{ translations[locale].add }}</span>
          </button>
        </div>

        <!-- Work History fields (render outside grid) -->
        <div
          v-if="field.type === 'work_history'"
          class="mb-6"
        >
          <h3 class="text-xl font-semibold mb-4 pb-2 border-b border-gray-200 text-gray-800">
            {{ getLocalizedText(group.title, locale) || group.id }}
          </h3>
          <div class="mb-4 pb-2 border-b border-gray-200">
            <p class="text-base font-semibold text-gray-800 mb-2">
              {{ getLocalizedText(field.label, locale) || field.name }}
              <span v-if="'required' in field && field.required" class="text-red-500">*</span>
            </p>
          </div>
          
          <div
            v-for="(item, itemIndex) in (formValues[field.name] || [])"
            :key="itemIndex"
            class="mb-4 space-y-4 relative"
          >
            <button
              v-if="(formValues[field.name] || []).length > 1"
              type="button"
              @click="removeAddress(field.name, itemIndex)"
              class="absolute top-0 right-0 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm"
            >
              {{ translations[locale].remove }}
            </button>
            
            <!-- Row 1: Profession, Company Name -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div class="flex flex-col">
                <label class="text-base font-medium mb-1">
                  {{ translations[locale].profession }}
                </label>
                <input
                  v-model="item.profession"
                  type="text"
                  :class="getInputClasses(`${field.name}_${itemIndex}_profession`, 'border rounded px-3 py-2', item.profession)"
                  @focus="handleInputFocus(`${field.name}_${itemIndex}_profession`)"
                  @blur="handleInputBlur"
                />
              </div>
              
              <div class="flex flex-col">
                <label class="text-base font-medium mb-1">
                  {{ translations[locale].companyName }}
                </label>
                <input
                  v-model="item.companyName"
                  type="text"
                  :class="getInputClasses(`${field.name}_${itemIndex}_companyName`, 'border rounded px-3 py-2', item.companyName)"
                  @focus="handleInputFocus(`${field.name}_${itemIndex}_companyName`)"
                  @blur="handleInputBlur"
                />
              </div>
            </div>
            
            <!-- Address on one row -->
            <div class="flex flex-col mb-4">
              <label class="text-base font-medium mb-1">
                {{ translations[locale].workAddress }}
              </label>
              <input
                v-model="item.address"
                type="text"
                :class="getInputClasses(`${field.name}_${itemIndex}_address`, 'border rounded px-3 py-2', item.address)"
                @focus="handleInputFocus(`${field.name}_${itemIndex}_address`)"
                @blur="handleInputBlur"
              />
            </div>
            
            <!-- Row 2: Start Date, End Date -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="flex flex-col">
                <label class="text-base font-medium mb-1">
                  {{ translations[locale].workStartDate }}
                </label>
                <input
                  v-model="item.startDate"
                  type="text"
                  :class="getInputClasses(`${field.name}_${itemIndex}_startDate`, 'border rounded px-3 py-2', item.startDate)"
                  :placeholder="translations[locale].datePlaceholder"
                  @focus="handleInputFocus(`${field.name}_${itemIndex}_startDate`)"
                  @blur="handleInputBlur"
                />
              </div>
              
              <div class="flex flex-col">
                <label class="text-base font-medium mb-1">
                  {{ translations[locale].workEndDate }}
                </label>
                <input
                  v-model="item.endDate"
                  type="text"
                  :class="getInputClasses(`${field.name}_${itemIndex}_endDate`, 'border rounded px-3 py-2', item.endDate)"
                  :placeholder="translations[locale].datePlaceholder"
                  @focus="handleInputFocus(`${field.name}_${itemIndex}_endDate`)"
                  @blur="handleInputBlur"
                />
              </div>
            </div>
          </div>
          
          <button
            type="button"
            @click="addWork(field.name)"
            class="mt-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded flex items-center gap-2"
          >
            <span>+</span>
            <span>{{ translations[locale].add }}</span>
          </button>
        </div>

        <!-- Children information (render custom) -->
        <div
          v-if="field.type === 'children_info'"
          class="mb-6"
        >
          <h3 class="text-xl font-semibold mb-4 pb-2 border-b border-gray-200 text-gray-800">
            {{ getLocalizedText(group.title, locale) || group.id }}
          </h3>

          <div
            v-if="(formValues[field.name] || []).length === 0"
            class="text-sm text-gray-500"
          >
            {{ childrenTranslations[locale].emptyHint }}
          </div>

          <div
            v-for="(child, childIndex) in (formValues[field.name] || [])"
            :key="childIndex"
            class="mb-8 space-y-4 border border-gray-200 rounded-lg p-4 bg-gray-50"
          >
            <p class="text-lg font-semibold text-gray-800">
              {{ getChildHeading(childIndex, locale) }}
            </p>

            <div class="space-y-4">
              <div>
                <p class="text-base font-semibold text-gray-800">
                  {{ childrenTranslations[locale].documentNameTitle }}
                </p>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                  <div class="flex flex-col">
                    <label class="text-sm font-medium mb-1">{{ childrenTranslations[locale].firstName }}</label>
                    <input 
                      v-model="child.firstName" 
                      type="text" 
                      :class="getInputClasses(`${field.name}_${childIndex}_firstName`, 'border rounded px-3 py-2', child.firstName)"
                      @focus="handleInputFocus(`${field.name}_${childIndex}_firstName`)"
                      @blur="handleInputBlur"
                    />
                  </div>
                  <div class="flex flex-col">
                    <label class="text-sm font-medium mb-1">{{ childrenTranslations[locale].lastName }}</label>
                    <input 
                      v-model="child.lastName" 
                      type="text" 
                      :class="getInputClasses(`${field.name}_${childIndex}_lastName`, 'border rounded px-3 py-2', child.lastName)"
                      @focus="handleInputFocus(`${field.name}_${childIndex}_lastName`)"
                      @blur="handleInputBlur"
                    />
                  </div>
                  <div class="flex flex-col">
                    <label class="text-sm font-medium mb-1">{{ childrenTranslations[locale].middleName }}</label>
                    <input 
                      v-model="child.middleName" 
                      type="text" 
                      :class="getInputClasses(`${field.name}_${childIndex}_middleName`, 'border rounded px-3 py-2', child.middleName)"
                      @focus="handleInputFocus(`${field.name}_${childIndex}_middleName`)"
                      @blur="handleInputBlur"
                    />
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="flex flex-col">
                  <label class="text-sm font-medium mb-1">{{ childrenTranslations[locale].birthDate }}</label>
                  <input 
                    v-model="child.birthDate" 
                    type="text" 
                    :class="getInputClasses(`${field.name}_${childIndex}_birthDate`, 'border rounded px-3 py-2', child.birthDate)"
                    @focus="handleInputFocus(`${field.name}_${childIndex}_birthDate`)"
                    @blur="handleInputBlur"
                  />
                </div>
                <div class="flex flex-col">
                  <label class="text-sm font-medium mb-1">{{ childrenTranslations[locale].birthPlace }}</label>
                  <input 
                    v-model="child.birthPlace" 
                    type="text" 
                    :class="getInputClasses(`${field.name}_${childIndex}_birthPlace`, 'border rounded px-3 py-2', child.birthPlace)"
                    @focus="handleInputFocus(`${field.name}_${childIndex}_birthPlace`)"
                    @blur="handleInputBlur"
                  />
                </div>
              </div>

              <div class="flex flex-col">
                <label class="text-sm font-medium mb-1">{{ childrenTranslations[locale].currentAddress }}</label>
                <input 
                  v-model="child.currentAddress" 
                  type="text" 
                  :class="getInputClasses(`${field.name}_${childIndex}_currentAddress`, 'border rounded px-3 py-2', child.currentAddress)"
                  @focus="handleInputFocus(`${field.name}_${childIndex}_currentAddress`)"
                  @blur="handleInputBlur"
                />
              </div>

              <div class="flex flex-col">
                <label class="text-sm font-medium mb-1">{{ childrenTranslations[locale].alienNumber }}</label>
                <input 
                  v-model="child.alienNumber" 
                  type="text" 
                  :class="getInputClasses(`${field.name}_${childIndex}_alienNumber`, 'border rounded px-3 py-2', child.alienNumber)"
                  @focus="handleInputFocus(`${field.name}_${childIndex}_alienNumber`)"
                  @blur="handleInputBlur"
                />
              </div>

              <div class="flex flex-col">
                <label class="text-sm font-medium mb-2">{{ childrenTranslations[locale].relationship }}</label>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="option in childrenTranslations[locale].relationshipOptions"
                    :key="option.value"
                    type="button"
                    class="px-4 py-2 border rounded transition-colors"
                    :class="child.relationship === option.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'"
                    @click="child.relationship = option.value"
                  >
                    {{ option.label }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Travel history (custom layout) -->
        <div
          v-if="field.type === 'travel_history'"
          class="mb-6"
        >
          <div class="space-y-2 mb-4">
            <p class="text-base font-semibold text-gray-800">
              {{ getLocalizedText(field.label, locale) || field.name }}
            </p>
          </div>

          <div
            v-for="(trip, tripIndex) in (formValues[field.name] || [])"
            :key="`trip-${tripIndex}`"
            class="mb-4 border border-gray-200 rounded-lg p-4 bg-white"
          >
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div class="flex flex-col">
                <label class="text-sm font-medium mb-1">{{ travelTranslations[locale].startDate }}</label>
                <input 
                  v-model="trip.startDate" 
                  type="text" 
                  :class="getInputClasses(`${field.name}_${tripIndex}_startDate`, 'border rounded px-3 py-2', trip.startDate)"
                  @focus="handleInputFocus(`${field.name}_${tripIndex}_startDate`)"
                  @blur="handleInputBlur"
                />
              </div>
              <div class="flex flex-col">
                <label class="text-sm font-medium mb-1">{{ travelTranslations[locale].endDate }}</label>
                <input 
                  v-model="trip.endDate" 
                  type="text" 
                  :class="getInputClasses(`${field.name}_${tripIndex}_endDate`, 'border rounded px-3 py-2', trip.endDate)"
                  @focus="handleInputFocus(`${field.name}_${tripIndex}_endDate`)"
                  @blur="handleInputBlur"
                />
              </div>
              <div class="flex flex-col">
                <label class="text-sm font-medium mb-1">{{ travelTranslations[locale].destination }}</label>
                <input 
                  v-model="trip.destination" 
                  type="text" 
                  :class="getInputClasses(`${field.name}_${tripIndex}_destination`, 'border rounded px-3 py-2', trip.destination)"
                  @focus="handleInputFocus(`${field.name}_${tripIndex}_destination`)"
                  @blur="handleInputBlur"
                />
              </div>
              <div class="flex flex-col">
                <label class="text-sm font-medium mb-1">{{ travelTranslations[locale].totalDays }}</label>
                <input 
                  v-model="trip.totalDays" 
                  type="text" 
                  :class="getInputClasses(`${field.name}_${tripIndex}_totalDays`, 'border rounded px-3 py-2', trip.totalDays)"
                  @focus="handleInputFocus(`${field.name}_${tripIndex}_totalDays`)"
                  @blur="handleInputBlur"
                />
              </div>
            </div>

            <div class="mt-4 flex justify-end">
              <button
                type="button"
                class="px-3 py-1 text-sm border rounded bg-red-50 text-red-600 hover:bg-red-100"
                @click="removeTravelEntry(field.name, tripIndex)"
              >
                {{ travelTranslations[locale].removeTrip }}
              </button>
            </div>
          </div>

          <button
            type="button"
            @click="addTravelEntry(field.name)"
            class="mt-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded flex items-center gap-2"
          >
            <span>+</span>
            <span>{{ travelTranslations[locale].addTrip }}</span>
          </button>
        </div>

        <!-- Offense history -->
        <div
          v-if="field.type === 'offense_history'"
          class="mb-6"
        >
          <div class="space-y-2 mb-4">
            <p class="text-base font-semibold text-gray-800">
              {{ getLocalizedText(field.label, locale) || field.name }}
            </p>
          </div>

          <div
            v-for="(entry, entryIndex) in (formValues[field.name] || [])"
            :key="`offense-${entryIndex}`"
            class="mb-4 border border-gray-200 rounded-lg p-4 bg-white"
          >
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div class="flex flex-col">
                <label class="text-sm font-medium mb-1">{{ offenseTranslations[locale].offense }}</label>
                <input 
                  v-model="entry.offense" 
                  type="text" 
                  :class="getInputClasses(`${field.name}_${entryIndex}_offense`, 'border rounded px-3 py-2', entry.offense)"
                  @focus="handleInputFocus(`${field.name}_${entryIndex}_offense`)"
                  @blur="handleInputBlur"
                />
              </div>
              <div class="flex flex-col">
                <label class="text-sm font-medium mb-1">{{ offenseTranslations[locale].date }}</label>
                <input 
                  v-model="entry.date" 
                  type="text" 
                  :class="getInputClasses(`${field.name}_${entryIndex}_date`, 'border rounded px-3 py-2', entry.date)"
                  @focus="handleInputFocus(`${field.name}_${entryIndex}_date`)"
                  @blur="handleInputBlur"
                />
              </div>
              <div class="flex flex-col">
                <label class="text-sm font-medium mb-1">{{ offenseTranslations[locale].location }}</label>
                <input 
                  v-model="entry.location" 
                  type="text" 
                  :class="getInputClasses(`${field.name}_${entryIndex}_location`, 'border rounded px-3 py-2', entry.location)"
                  @focus="handleInputFocus(`${field.name}_${entryIndex}_location`)"
                  @blur="handleInputBlur"
                />
              </div>
              <div class="flex flex-col">
                <label class="text-sm font-medium mb-1">{{ offenseTranslations[locale].outcome }}</label>
                <input 
                  v-model="entry.outcome" 
                  type="text" 
                  :class="getInputClasses(`${field.name}_${entryIndex}_outcome`, 'border rounded px-3 py-2', entry.outcome)"
                  @focus="handleInputFocus(`${field.name}_${entryIndex}_outcome`)"
                  @blur="handleInputBlur"
                />
              </div>
            </div>

            <div class="mt-4 flex justify-end">
              <button
                type="button"
                class="px-3 py-1 text-sm border rounded bg-red-50 text-red-600 hover:bg-red-100"
                @click="removeOffenseEntry(field.name, entryIndex)"
              >
                {{ offenseTranslations[locale].remove }}
              </button>
            </div>
          </div>

          <button
            type="button"
            @click="addOffenseEntry(field.name)"
            class="mt-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded flex items-center gap-2"
          >
            <span>+</span>
            <span>{{ offenseTranslations[locale].add }}</span>
          </button>
        </div>

        <!-- Organization history -->
        <div
          v-if="field.type === 'organization_history'"
          class="mb-6"
        >
          <div class="space-y-2 mb-4">
            <p class="text-base font-semibold text-gray-800">
              {{ getLocalizedText(field.label, locale) || field.name }}
            </p>
          </div>

          <div
            v-for="(entry, entryIndex) in (formValues[field.name] || [])"
            :key="`organization-${entryIndex}`"
            class="mb-4 border border-gray-200 rounded-lg p-4 bg-white"
          >
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div class="flex flex-col">
                <label class="text-sm font-medium mb-1">{{ organizationTranslations[locale].purpose }}</label>
                <input 
                  v-model="entry.purpose" 
                  type="text" 
                  :class="getInputClasses(`${field.name}_${entryIndex}_purpose`, 'border rounded px-3 py-2', entry.purpose)"
                  @focus="handleInputFocus(`${field.name}_${entryIndex}_purpose`)"
                  @blur="handleInputBlur"
                />
              </div>
              <div class="flex flex-col">
                <label class="text-sm font-medium mb-1">{{ organizationTranslations[locale].position }}</label>
                <input 
                  v-model="entry.position" 
                  type="text" 
                  :class="getInputClasses(`${field.name}_${entryIndex}_position`, 'border rounded px-3 py-2', entry.position)"
                  @focus="handleInputFocus(`${field.name}_${entryIndex}_position`)"
                  @blur="handleInputBlur"
                />
              </div>
              <div class="flex flex-col">
                <label class="text-sm font-medium mb-1">{{ organizationTranslations[locale].startDate }}</label>
                <input 
                  v-model="entry.startDate" 
                  type="text" 
                  :class="getInputClasses(`${field.name}_${entryIndex}_startDate`, 'border rounded px-3 py-2', entry.startDate)"
                  @focus="handleInputFocus(`${field.name}_${entryIndex}_startDate`)"
                  @blur="handleInputBlur"
                />
              </div>
              <div class="flex flex-col">
                <label class="text-sm font-medium mb-1">{{ organizationTranslations[locale].endDate }}</label>
                <input 
                  v-model="entry.endDate" 
                  type="text" 
                  :class="getInputClasses(`${field.name}_${entryIndex}_endDate`, 'border rounded px-3 py-2', entry.endDate)"
                  @focus="handleInputFocus(`${field.name}_${entryIndex}_endDate`)"
                  @blur="handleInputBlur"
                />
              </div>
            </div>

            <div class="mt-4 flex justify-end">
              <button
                type="button"
                class="px-3 py-1 text-sm border rounded bg-red-50 text-red-600 hover:bg-red-100"
                @click="removeOrganizationEntry(field.name, entryIndex)"
              >
                {{ organizationTranslations[locale].remove }}
              </button>
            </div>
          </div>

          <button
            type="button"
            @click="addOrganizationEntry(field.name)"
            class="mt-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded flex items-center gap-2"
          >
            <span>+</span>
            <span>{{ organizationTranslations[locale].add }}</span>
          </button>
        </div>

        <!-- Custom layout: Parent name fields split into First / Middle / Last for checker mapping -->
        <div
          v-if="field.name === 'mother_first_name' || field.name === 'father_first_name'"
          class="flex flex-col mb-4 transition-colors rounded p-3"
        >
          <label class="text-base font-medium mt-2 mb-2">
            {{ field.name === 'mother_first_name' ? (locale === 'vi' ? 'Tên mẹ' : "Mother's Name") : (locale === 'vi' ? 'Tên cha' : "Father's Name") }}
          </label>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="flex flex-col">
              <label class="text-sm text-gray-600 mb-1">{{ locale === 'vi' ? 'Tên' : 'First Name' }}</label>
              <input
                :id="field.name === 'mother_first_name' ? 'i90-mother-first-name' : 'i90-father-first-name'"
                v-model="formValues[field.name === 'mother_first_name' ? 'mother_first_name' : 'father_first_name']"
                type="text"
                :class="getInputClasses(field.name === 'mother_first_name' ? 'mother_first_name' : 'father_first_name', 'border rounded px-3 py-2 w-full', formValues[field.name === 'mother_first_name' ? 'mother_first_name' : 'father_first_name'])"
                @focus="handleInputFocus(field.name === 'mother_first_name' ? 'mother_first_name' : 'father_first_name')"
                @blur="handleInputBlur"
              />
            </div>
            <div class="flex flex-col">
              <label class="text-sm text-gray-600 mb-1">{{ locale === 'vi' ? 'Tên lót' : 'Middle Name' }}</label>
              <input
                :id="field.name === 'mother_first_name' ? 'i90-mother-middle-name' : 'i90-father-middle-name'"
                v-model="formValues[field.name === 'mother_first_name' ? 'mother_middle_name' : 'father_middle_name']"
                type="text"
                :class="getInputClasses(field.name === 'mother_first_name' ? 'mother_middle_name' : 'father_middle_name', 'border rounded px-3 py-2 w-full', formValues[field.name === 'mother_first_name' ? 'mother_middle_name' : 'father_middle_name'])"
                @focus="handleInputFocus(field.name === 'mother_first_name' ? 'mother_middle_name' : 'father_middle_name')"
                @blur="handleInputBlur"
              />
            </div>
            <div class="flex flex-col">
              <label class="text-sm text-gray-600 mb-1">{{ locale === 'vi' ? 'Họ' : 'Last Name' }}</label>
              <input
                :id="field.name === 'mother_first_name' ? 'i90-mother-last-name' : 'i90-father-last-name'"
                v-model="formValues[field.name === 'mother_first_name' ? 'mother_last_name' : 'father_last_name']"
                type="text"
                :class="getInputClasses(field.name === 'mother_first_name' ? 'mother_last_name' : 'father_last_name', 'border rounded px-3 py-2 w-full', formValues[field.name === 'mother_first_name' ? 'mother_last_name' : 'father_last_name'])"
                @focus="handleInputFocus(field.name === 'mother_first_name' ? 'mother_last_name' : 'father_last_name')"
                @blur="handleInputBlur"
              />
            </div>
          </div>
        </div>

        <!-- Name fields group (Tên, Họ, Tên lót) - rendered in 3 columns -->
        <template v-else-if="!['mother_first_name','mother_middle_name','mother_last_name','father_first_name','father_middle_name','father_last_name'].includes(field.name) && isNameGroup(group.fields, index, locale) && field.type !== 'address_history' && field.type !== 'work_history' && field.type !== 'children_info' && field.type !== 'travel_history' && field.type !== 'offense_history' && field.type !== 'organization_history'">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div
              v-for="(nameFieldInfo, nameIndex) in getOrderedNameFields(group.fields, index, locale)"
              :key="nameFieldInfo.index"
              class="flex flex-col"
            >
              <label class="text-base font-medium mt-2 mb-1">
                {{ getLocalizedText(nameFieldInfo.field.label, locale) || nameFieldInfo.field.name }}
                <span v-if="'required' in nameFieldInfo.field && nameFieldInfo.field.required" class="text-red-500">*</span>
              </label>
              <input
                v-model="formValues[nameFieldInfo.field.name]"
                type="text"
                :placeholder="getLocalizedText(nameFieldInfo.field.placeholder, locale)"
                :class="getInputClasses(nameFieldInfo.field.name, 'border rounded px-3 py-2', formValues[nameFieldInfo.field.name])"
                @focus="handleInputFocus(nameFieldInfo.field.name)"
                @blur="handleInputBlur"
              />
            </div>
          </div>
        </template>

        <!-- Skip rendering if this is the 2nd or 3rd field in a name group (already rendered above) -->
        <template v-else-if="isNameField(field, locale) && field.type === 'text' && ((index > 0 && isNameGroup(group.fields, index - 1, locale)) || (index > 1 && isNameGroup(group.fields, index - 2, locale)))">
          <!-- Skip this field, it's already rendered in the name group above -->
        </template>

        <!-- Custom layout: Date of birth as Month / Day / Year -->
        <div
          v-else-if="field.name === 'date_of_birth_month'"
          class="flex flex-col mb-4 transition-colors rounded p-3"
        >
          <label class="text-base font-medium mt-2 mb-2">
            {{ locale === 'vi' ? 'Ngày sinh (dd/mm/yyyy)' : 'Date of Birth (mm/dd/yyyy)' }}
            <span class="text-red-500">*</span>
          </label>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="flex flex-col">
              <label class="text-sm text-gray-600 mb-1">{{ locale === 'vi' ? 'Tháng' : 'Month' }}</label>
              <select
                v-model="formValues.date_of_birth_month"
                required
                :class="getInputClasses('date_of_birth_month', 'border rounded px-3 py-2 bg-white', formValues.date_of_birth_month)"
                @focus="handleInputFocus('date_of_birth_month')"
                @blur="handleInputBlur"
              >
                <option value="">{{ locale === 'vi' ? 'Tháng' : 'Month' }}</option>
                <option v-for="m in 12" :key="`dob-month-${m}`" :value="String(m).padStart(2, '0')">
                  {{ String(m).padStart(2, '0') }}
                </option>
              </select>
            </div>
            <div class="flex flex-col">
              <label class="text-sm text-gray-600 mb-1">{{ locale === 'vi' ? 'Ngày' : 'Day' }}</label>
              <select
                v-model="formValues.date_of_birth_day"
                required
                :class="getInputClasses('date_of_birth_day', 'border rounded px-3 py-2 bg-white', formValues.date_of_birth_day)"
                @focus="handleInputFocus('date_of_birth_day')"
                @blur="handleInputBlur"
              >
                <option value="">{{ locale === 'vi' ? 'Ngày' : 'Day' }}</option>
                <option v-for="d in 31" :key="`dob-day-${d}`" :value="String(d).padStart(2, '0')">
                  {{ String(d).padStart(2, '0') }}
                </option>
              </select>
            </div>
            <div class="flex flex-col">
              <label class="text-sm text-gray-600 mb-1">{{ locale === 'vi' ? 'Năm' : 'Year' }}</label>
              <select
                v-model="formValues.date_of_birth_year"
                required
                :class="getInputClasses('date_of_birth_year', 'border rounded px-3 py-2 bg-white', formValues.date_of_birth_year)"
                @focus="handleInputFocus('date_of_birth_year')"
                @blur="handleInputBlur"
              >
                <option value="">{{ locale === 'vi' ? 'Năm' : 'Year' }}</option>
                <option v-for="y in birthYearOptions" :key="`dob-year-${y}`" :value="String(y)">
                  {{ y }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <!-- Skip date fields already rendered above -->
        <template v-else-if="field.name === 'date_of_birth_day' || field.name === 'date_of_birth_year'">
        </template>

        <!-- Custom layout: Date of entry as Month / Day / Year -->
        <div
          v-else-if="field.name === 'date_of_entry_month'"
          class="flex flex-col mb-4 transition-colors rounded p-3"
        >
          <label class="text-base font-medium mt-2 mb-2">
            {{ locale === 'vi' ? 'Ngày nhập cảnh (ngày trên thẻ xanh dd/mm/yyyy)' : 'Date of Entry (mm/dd/yyyy)' }}
          </label>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="flex flex-col">
              <label class="text-sm text-gray-600 mb-1">{{ locale === 'vi' ? 'Tháng' : 'Month' }}</label>
              <select
                id="i90-date-of-entry-month"
                v-model="formValues.date_of_entry_month"
                :class="getInputClasses('date_of_entry_month', 'border rounded px-3 py-2 bg-white', formValues.date_of_entry_month)"
                @focus="handleInputFocus('date_of_entry_month')"
                @blur="handleInputBlur"
              >
                <option value="">{{ locale === 'vi' ? 'Tháng' : 'Month' }}</option>
                <option v-for="m in 12" :key="`entry-month-${m}`" :value="String(m).padStart(2, '0')">
                  {{ String(m).padStart(2, '0') }}
                </option>
              </select>
            </div>
            <div class="flex flex-col">
              <label class="text-sm text-gray-600 mb-1">{{ locale === 'vi' ? 'Ngày' : 'Day' }}</label>
              <select
                id="i90-date-of-entry-day"
                v-model="formValues.date_of_entry_day"
                :class="getInputClasses('date_of_entry_day', 'border rounded px-3 py-2 bg-white', formValues.date_of_entry_day)"
                @focus="handleInputFocus('date_of_entry_day')"
                @blur="handleInputBlur"
              >
                <option value="">{{ locale === 'vi' ? 'Ngày' : 'Day' }}</option>
                <option v-for="d in 31" :key="`entry-day-${d}`" :value="String(d).padStart(2, '0')">
                  {{ String(d).padStart(2, '0') }}
                </option>
              </select>
            </div>
            <div class="flex flex-col">
              <label class="text-sm text-gray-600 mb-1">{{ locale === 'vi' ? 'Năm' : 'Year' }}</label>
              <select
                id="i90-date-of-entry-year"
                v-model="formValues.date_of_entry_year"
                :class="getInputClasses('date_of_entry_year', 'border rounded px-3 py-2 bg-white', formValues.date_of_entry_year)"
                @focus="handleInputFocus('date_of_entry_year')"
                @blur="handleInputBlur"
              >
                <option value="">{{ locale === 'vi' ? 'Năm' : 'Year' }}</option>
                <option v-for="y in birthYearOptions" :key="`entry-year-${y}`" :value="String(y)">
                  {{ y }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <!-- Skip date of entry fields already rendered above -->
        <template v-else-if="field.name === 'date_of_entry_day' || field.name === 'date_of_entry_year'">
        </template>

        <!-- Custom layout: Place of birth as District/City / Province / Country -->
        <div
          v-else-if="field.name === 'place_of_birth_city'"
          class="flex flex-col mb-4 transition-colors rounded p-3"
        >
          <label class="text-base font-medium mt-2 mb-2">
            {{ locale === 'vi' ? 'Nơi sinh' : 'Place of Birth' }}
            <span class="text-red-500">*</span>
          </label>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="flex flex-col">
              <label class="text-sm text-gray-600 mb-1">{{ locale === 'vi' ? 'Huyện/Thành phố' : 'District/City' }}</label>
              <input
                v-model="formValues.place_of_birth_city"
                type="text"
                required
                :class="getInputClasses('place_of_birth_city', 'border rounded px-3 py-2', formValues.place_of_birth_city)"
                @focus="handleInputFocus('place_of_birth_city')"
                @blur="handleInputBlur"
              />
            </div>
            <div class="flex flex-col">
              <label class="text-sm text-gray-600 mb-1">{{ locale === 'vi' ? 'Tỉnh' : 'Province/State' }}</label>
              <input
                v-model="formValues.place_of_birth_province"
                type="text"
                required
                :class="getInputClasses('place_of_birth_province', 'border rounded px-3 py-2', formValues.place_of_birth_province)"
                @focus="handleInputFocus('place_of_birth_province')"
                @blur="handleInputBlur"
              />
            </div>
            <div class="flex flex-col">
              <label class="text-sm text-gray-600 mb-1">{{ locale === 'vi' ? 'Quốc gia' : 'Country' }}</label>
              <input
                v-model="formValues.place_of_birth_country"
                type="text"
                required
                :class="getInputClasses('place_of_birth_country', 'border rounded px-3 py-2', formValues.place_of_birth_country)"
                @focus="handleInputFocus('place_of_birth_country')"
                @blur="handleInputBlur"
              />
            </div>
          </div>
        </div>

        <!-- Skip place of birth fields already rendered above -->
        <template v-else-if="field.name === 'place_of_birth_province' || field.name === 'place_of_birth_country'">
        </template>



        <!-- Custom layout: Mailing address as separate fields for checker mapping -->
        <div
          v-else-if="field.name === 'mailing_address_street'"
          class="flex flex-col mb-4 transition-colors rounded p-3"
        >
          <label class="text-base font-medium mt-2 mb-2">
            {{ locale === 'vi' ? 'Địa chỉ nhận thư' : 'Mailing Address' }}
            <span v-if="field.required" class="text-red-500">*</span>
          </label>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2 w-full">
            <input
              id="i90-mailing-address-street"
              v-model="formValues.mailing_address_street"
              :required="field.required"
              :class="getInputClasses('mailing_address_street', 'border rounded px-3 py-2 w-full', formValues.mailing_address_street)"
              :placeholder="locale === 'vi' ? 'Số nhà/đường/xã/phường/quận' : 'Street/Ward/District'"
              @focus="handleInputFocus('mailing_address_street')"
              @blur="handleInputBlur"
            />
            <input
              id="i90-mailing-address-city"
              v-model="formValues.mailing_address_city"
              :required="field.required"
              :class="getInputClasses('mailing_address_city', 'border rounded px-3 py-2 w-full', formValues.mailing_address_city)"
              :placeholder="locale === 'vi' ? 'Huyện/Thành phố' : 'District/City'"
              @focus="handleInputFocus('mailing_address_city')"
              @blur="handleInputBlur"
            />
            <input
              id="i90-mailing-address-province"
              v-model="formValues.mailing_address_province"
              :required="field.required"
              :class="getInputClasses('mailing_address_province', 'border rounded px-3 py-2 w-full', formValues.mailing_address_province)"
              :placeholder="locale === 'vi' ? 'Tỉnh/Bang' : 'Province/State'"
              @focus="handleInputFocus('mailing_address_province')"
              @blur="handleInputBlur"
            />
            <input
              id="i90-mailing-address-zip"
              v-model="formValues.mailing_address_zip"
              :class="getInputClasses('mailing_address_zip', 'border rounded px-3 py-2 w-full', formValues.mailing_address_zip)"
              :placeholder="locale === 'vi' ? 'Mã Zip' : 'ZIP Code'"
              @focus="handleInputFocus('mailing_address_zip')"
              @blur="handleInputBlur"
            />
            <input
              id="i90-mailing-address-country"
              v-model="formValues.mailing_address_country"
              :required="field.required"
              :class="getInputClasses('mailing_address_country', 'border rounded px-3 py-2 w-full', formValues.mailing_address_country)"
              :placeholder="locale === 'vi' ? 'Quốc gia' : 'Country'"
              @focus="handleInputFocus('mailing_address_country')"
              @blur="handleInputBlur"
            />
          </div>
        </div>

        <!-- Skip mailing address fields already rendered above -->
        <template v-else-if="field.name === 'mailing_address_city' || field.name === 'mailing_address_province' || field.name === 'mailing_address_zip' || field.name === 'mailing_address_country'">
        </template>

        <!-- Custom layout: Current physical address as separate fields for checker mapping -->
        <div
          v-else-if="field.name === 'physical_address_street' && formValues['lives_at_mailing_address'] === 'Không'"
          class="flex flex-col mb-4 transition-colors rounded p-3"
        >
          <label class="text-base font-medium mt-2 mb-2">
            {{ locale === 'vi' ? 'Địa chỉ ở hiện tại' : 'Current Physical Address' }}
            <span v-if="field.required" class="text-red-500">*</span>
          </label>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2 w-full">
            <input
              id="i90-physical-address-street"
              v-model="formValues.physical_address_street"
              :required="field.required"
              :class="getInputClasses('physical_address_street', 'border rounded px-3 py-2 w-full', formValues.physical_address_street)"
              :placeholder="locale === 'vi' ? 'Số nhà/đường/xã/phường/quận' : 'Street/Ward/District'"
              @focus="handleInputFocus('physical_address_street')"
              @blur="handleInputBlur"
            />
            <input
              id="i90-physical-address-city"
              v-model="formValues.physical_address_city"
              :required="field.required"
              :class="getInputClasses('physical_address_city', 'border rounded px-3 py-2 w-full', formValues.physical_address_city)"
              :placeholder="locale === 'vi' ? 'Huyện/Thành phố' : 'District/City'"
              @focus="handleInputFocus('physical_address_city')"
              @blur="handleInputBlur"
            />
            <input
              id="i90-physical-address-province"
              v-model="formValues.physical_address_province"
              :required="field.required"
              :class="getInputClasses('physical_address_province', 'border rounded px-3 py-2 w-full', formValues.physical_address_province)"
              :placeholder="locale === 'vi' ? 'Tỉnh/Bang' : 'Province/State'"
              @focus="handleInputFocus('physical_address_province')"
              @blur="handleInputBlur"
            />
            <input
              id="i90-physical-address-zip"
              v-model="formValues.physical_address_zip"
              :class="getInputClasses('physical_address_zip', 'border rounded px-3 py-2 w-full', formValues.physical_address_zip)"
              :placeholder="locale === 'vi' ? 'Mã Zip' : 'ZIP Code'"
              @focus="handleInputFocus('physical_address_zip')"
              @blur="handleInputBlur"
            />
            <input
              id="i90-physical-address-country"
              v-model="formValues.physical_address_country"
              :required="field.required"
              :class="getInputClasses('physical_address_country', 'border rounded px-3 py-2 w-full', formValues.physical_address_country)"
              :placeholder="locale === 'vi' ? 'Quốc gia' : 'Country'"
              @focus="handleInputFocus('physical_address_country')"
              @blur="handleInputBlur"
            />
          </div>
        </div>

        <!-- Skip current physical address fields already rendered above or hidden by mailing-address question -->
        <template v-else-if="field.name === 'physical_address_street' || field.name === 'physical_address_city' || field.name === 'physical_address_province' || field.name === 'physical_address_zip' || field.name === 'physical_address_country'">
        </template>


        <!-- Skip hidden technical fields used only for data storage -->
        <template v-else-if="field.type === 'hidden'">
        </template>

        <!-- Info/Notice field (render as paragraph) -->
        <div
          v-else-if="field.type === 'info'"
          class="mb-6 p-5 bg-blue-100 border-2 border-blue-500 rounded-lg shadow-md"
        >
          <div class="flex items-start gap-3">
            <div class="flex-shrink-0 mt-1">
              <svg class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p class="text-base md:text-lg font-semibold text-blue-900 leading-relaxed">
              {{ getLocalizedText(field.label, locale) || field.name }}
            </p>
          </div>
        </div>

        <!-- Signature field (render separately before regular fields) -->
        <div
          v-else-if="field.type === 'signature'"
          class="flex flex-col mb-4"
        >
          <label class="text-base font-medium mt-2 mb-1">
            {{ getLocalizedText(field.label, locale) || field.name }}
            <span v-if="'required' in field && field.required" class="text-red-500">*</span>
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

        <!-- Regular fields (rendered in same loop to maintain order) -->
        <div
          v-else-if="(!['mother_first_name','mother_middle_name','mother_last_name','father_first_name','father_middle_name','father_last_name'].includes(field.name)) && (isAdditionalInformationQuestionField(field) || (field.type !== 'address_history' && field.type !== 'work_history' && field.type !== 'children_info' && field.type !== 'travel_history' && field.type !== 'offense_history' && field.type !== 'organization_history' && field.type !== 'signature' && field.type !== 'info' && !(field.name === 'marriage_year' && formValues['parents_married_before_18'] !== 'after') && !(field.name === 'father_naturalization_date' && formValues['father_residency_status'] !== 'us_citizen') && !(field.name === 'father_alien_number' && formValues['father_residency_status'] !== 'permanent_resident') && !(field.name === 'mother_naturalization_date' && formValues['mother_residency_status'] !== 'us_citizen') && !(field.name === 'mother_alien_number' && formValues['mother_residency_status'] !== 'permanent_resident') && !(field.name === 'former_spouse_divorce_reason_other' && formValues['former_spouse_divorce_reason'] !== 'other') && !(field.name === 'former_spouse_residency_other' && formValues['former_spouse_residency_status'] !== 'other') && !(field.name === 'former_spouse_naturalization_date' && formValues['former_spouse_residency_status'] !== 'us_citizen') && !(field.name === 'former_spouse_alien_number' && formValues['former_spouse_residency_status'] !== 'permanent_resident') && !(field.name === 'current_spouse_naturalization_date' && formValues['current_spouse_residency_status'] !== 'us_citizen') && !(field.name === 'current_spouse_alien_number' && formValues['current_spouse_residency_status'] !== 'permanent_resident') && !(field.name === 'current_spouse_residency_other' && formValues['current_spouse_residency_status'] !== 'other') && !(field.name === 'current_spouse_former_divorce_reason_other' && formValues['current_spouse_former_divorce_reason'] !== 'other') && !(field.name === 'current_spouse_former_residency_other' && formValues['current_spouse_former_residency_status'] !== 'other') && !(field.name === 'current_spouse_former_naturalization_date' && formValues['current_spouse_former_residency_status'] !== 'us_citizen') && !(field.name === 'current_spouse_former_alien_number' && formValues['current_spouse_former_residency_status'] !== 'permanent_resident') && !(field.name === 'uscis_office_address' && formValues['applicant_age_status'] !== 'uscis_office') && !(field.name === 'applicant_age_status_other' && formValues['applicant_age_status'] !== 'other') && !(field.name === 'filed_taxes_late_explanation' && formValues['filed_taxes_late'] !== 'yes') && !(field.name === 'evaded_taxes_explanation' && formValues['evaded_taxes'] !== 'yes') && !(field.name === 'claimed_non_resident_tax_explanation' && formValues['claimed_non_resident_tax'] !== 'yes') && !(field.name === 'military_training_explanation' && formValues['military_training'] !== 'yes') && !(field.name === 'military_registration_date' && formValues['serving_us_military'] !== 'yes') && !(field.name === 'military_registration_number' && formValues['serving_us_military'] !== 'yes') && shouldShowCurrentGreenCardNameField(field, locale) && shouldShowCurrentAddressField(field, locale) && (formValues['lives_at_mailing_address'] || true) && (formValues['current_status'] || true) && shouldShowReasonForApplicationField(field, locale) && shouldShowConditionalReasonForApplicationField(field, locale) && shouldShowEntryWithImmigrantVisaFields(field, locale) && shouldShowDisabilityField(field, locale) && shouldShowDeportationReasonField(field, locale) && shouldShowI407ReasonField(field, locale) && shouldShowAdditionalInformationField(field, locale)))"
          class="flex flex-col mb-4 transition-colors rounded p-3"
          :class="{
            'md:col-span-full': field.type === 'radio',
            'md:col-span-3': 'colSpan' in field && field.colSpan === 3,
            'md:col-span-2': 'colSpan' in field && field.colSpan === 2,
            'md:col-span-1': 'colSpan' in field && field.colSpan === 1
          }"
          :style="field.type === 'radio' && formValues[field.name] && formValues[field.name] !== '' ? { backgroundColor: '#eff6ff', borderColor: '#93c5fd', borderWidth: '2px', borderStyle: 'solid' } : {}"
        >
          <label class="text-base font-medium mt-2 mb-1">
            {{ getLocalizedText(field.label, locale) || field.name }}
            <span v-if="'required' in field && field.required" class="text-red-500">*</span>
          </label>

          <!-- Marriage counter -->
          <div v-if="field.name === 'marriage_count' || field.name === 'current_spouse_marriage_count' || field.name === 'children_count'" class="flex items-center gap-3">
            <button
              type="button"
              class="px-3 py-2 border rounded bg-gray-100 hover:bg-gray-200"
              @click="adjustCounter(field.name, -1)"
            >
              -
            </button>
            <input
              v-model="formValues[field.name]"
              type="number"
              min="0"
              class="border rounded px-3 py-2 text-center w-24"
            />
            <button
              type="button"
              class="px-3 py-2 border rounded bg-blue-100 hover:bg-blue-200 text-blue-700"
              @click="adjustCounter(field.name, 1)"
            >
              +
            </button>
          </div>

          <!-- Radio buttons -->
          <div v-else-if="field.type === 'radio' && 'options' in field" class="flex flex-col gap-2">
            <label
              v-for="option in (field as any).options"
              :key="option.value"
              class="flex items-center gap-2 cursor-pointer px-3 py-2 rounded transition-all duration-200"
              :class="{
                '!bg-blue-100 !border-2 !border-blue-400 shadow-sm': formValues[field.name] === option.value,
                'hover:bg-gray-50 border-2 border-transparent': formValues[field.name] !== option.value
              }"
              :style="formValues[field.name] === option.value ? { backgroundColor: '#dbeafe', borderColor: '#60a5fa', borderWidth: '2px' } : {}"
              @click="formValues[field.name] = option.value; handleRadioChange(field.name, option.value)"
            >
              <input
                type="radio"
                :name="field.name"
                :value="option.value"
                v-model="formValues[field.name]"
                @change="handleRadioChange(field.name, option.value)"
                class="cursor-pointer"
              />
              <span class="flex-1">{{ getLocalizedText(option.label, locale) || option.value }}</span>
            </label>
          </div>

          <!-- Textarea -->
          <textarea
            v-else-if="field.type === 'textarea'"
            v-model="formValues[field.name]"
            rows="3"
            :placeholder="(field as any).placeholder"
            :class="getInputClasses(field.name, 'border rounded px-3 py-2 resize-y', formValues[field.name])"
            @focus="handleInputFocus(field.name)"
            @blur="handleInputBlur"
          ></textarea>

          <!-- Text input -->
          <input
            v-else
            v-model="formValues[field.name]"
            type="text"
            :inputmode="phoneOnlyFields.has(field.name) ? 'numeric' : undefined"
            :pattern="phoneOnlyFields.has(field.name) ? '[0-9]*' : undefined"
            :placeholder="(field as any).placeholder"
            :class="getInputClasses(field.name, 'border rounded px-3 py-2', formValues[field.name])"
            @input="handlePhoneInput(field.name)"
            @focus="handleInputFocus(field.name)"
            @blur="handleInputBlur"
          />
        </div>
        </template>
      </div>
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
          :disabled="isSubmitting"
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

    <!-- <pre class="bg-gray-100 p-4 rounded text-sm">
        {{ formValues }}
    </pre> -->

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



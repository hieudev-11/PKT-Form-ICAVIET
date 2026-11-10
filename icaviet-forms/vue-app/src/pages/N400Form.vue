<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useN400FormSchema } from '@/composables/useN400FormSchema'
import { useFormApi } from '@/composables/useFormApi'
import { useFormPersistence } from '@/composables/useFormPersistence'
import { useAssetUrl } from '@/composables/useAssetUrl'
import DateSelect from '@/components/DateSelect.vue'
import AddressSelect from '@/components/AddressSelect.vue'

const { getAssetUrl } = useAssetUrl()

// Note: Khi đổi ngôn ngữ, dữ liệu user đang nhập sẽ bị reset. => đã fix

// Debug: Log when component is mounted
console.log('N-400 form component is loading...')

const locale = ref<'vi' | 'en'>('vi')

// API client
const { getForm, submitForm } = useFormApi()

// Form persistence
const { saveFormData, loadFormData, clearFormData } = useFormPersistence()

// Schema state - sẽ được load từ API hoặc fallback
const schema = ref<any>(null)
const loadingSchema = ref(false)
const schemaError = ref<string | null>(null)

// Fallback schema (sử dụng khi API fail)
const fallbackSchema = useN400FormSchema()

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
    schoolName: 'Tên trường',
    educationProgram: 'Ngành học/Chương trình học',
    educationAddress: 'Địa chỉ',
    educationStartDate: 'Ngày bắt đầu học',
    educationEndDate: 'Ngày kết thúc học',
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
    schoolName: 'School Name',
    educationProgram: 'Program / Field of Study',
    educationAddress: 'Address',
    educationStartDate: 'Start Date',
    educationEndDate: 'End Date',
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
    childLivingLocation: 'Con bạn đang sống ở đâu?',
    relationship: 'Mối quan hệ:',
    relationshipOptions: [
      { value: 'biological', label: 'Con ruột' },
      { value: 'step', label: 'Con riêng' },
      { value: 'adopted', label: 'Con nuôi' },
      { value: 'other', label: 'Khác' }
    ],
    providingSupport: 'Bạn có đang chu cấp/hỗ trợ cho con trai hoặc con gái của bạn không?',
    providingSupportOptions: [
      { value: 'yes', label: 'Có' },
      { value: 'no', label: 'Không' }
    ],
    livingLocationOptions: [
      { value: 'with_me', label: 'Sống cùng tôi' },
      { value: 'not_with_me', label: 'Không sống cùng tôi' },
      { value: 'unknown_missing', label: 'Không biết/thất lạc' }
    ],
    emptyHint: 'Tăng số lượng con để hiển thị các trường thông tin.'
  },
  en: {
    documentNameTitle: 'Legal name on documents:',
    firstName: 'First name:',
    lastName: 'Last name:',
    middleName: 'Middle name:',
    birthDate: 'Date of birth (mm/dd/yyyy):',
    childLivingLocation: 'Where is your child living?',
    relationship: 'Relationship:',
    relationshipOptions: [
      { value: 'biological', label: 'Biological' },
      { value: 'step', label: 'Stepchild' },
      { value: 'adopted', label: 'Adopted' },
      { value: 'other', label: 'Other' }
    ],
    providingSupport: 'Are you providing support for your son or daughter?',
    providingSupportOptions: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' }
    ],
    livingLocationOptions: [
      { value: 'with_me', label: 'Living with me' },
      { value: 'not_with_me', label: 'Not living with me' },
      { value: 'unknown_missing', label: 'Unknown/missing' }
    ],
    emptyHint: 'Increase the total number of children to show detail fields.'
  }
}

const travelTranslations = {
  vi: {
    startDate: 'Ngày rời khỏi Mỹ',
    endDate: 'Ngày quay lại Mỹ',
    destination: 'Đi đến quốc gia',
    addTrip: 'Thêm chuyến đi',
    removeTrip: 'Xóa chuyến đi'
  },
  en: {
    startDate: 'Start date',
    endDate: 'End date',
    destination: 'Country visited',
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
  childLivingLocation: '',
  relationship: '',
  providingSupport: ''
})

const getChildHeading = (index: number | string, currentLocale: 'vi' | 'en') => {
  const numIndex = Number(index)
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

const createEmptyAddressEntry = () => ({
  address: '',
  addressStreet: '',
  addressCity: '',
  addressProvince: '',
  addressZip: '',
  addressCountry: '',
  startDate: '',
  endDate: ''
})

const createEmptyWorkEntry = () => ({
  profession: '',
  companyName: '',
  address: '',
  addressStreet: '',
  addressCity: '',
  addressProvince: '',
  addressZip: '',
  addressCountry: '',
  startDate: '',
  endDate: ''
})

const createEmptyEducationEntry = () => ({
  schoolName: '',
  program: '',
  address: '',
  addressStreet: '',
  addressCity: '',
  addressProvince: '',
  addressZip: '',
  addressCountry: '',
  startDate: '',
  endDate: ''
})

const createEmptyTravelEntry = () => ({
  startDate: '',
  endDate: '',
  destination: ''
})

const addTravelEntry = (fieldName: string) => {
  if (!Array.isArray(formValues[fieldName])) {
    formValues[fieldName] = []
  }
  formValues[fieldName].push(createEmptyTravelEntry())
}

const removeTravelEntry = (fieldName: string, index: number | string) => {
  const numIndex = Number(index)
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
  const numIndex = Number(index)
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
  const numIndex = Number(index)
  if (!Array.isArray(formValues[fieldName])) {
    return
  }
  if (formValues[fieldName].length > 1) {
    formValues[fieldName].splice(numIndex, 1)
  } else {
    formValues[fieldName][numIndex] = createEmptyOrganizationEntry()
  }
}

const addTextRepeaterEntry = (fieldName: string) => {
  if (!Array.isArray(formValues[fieldName])) {
    formValues[fieldName] = ['']
  }
  formValues[fieldName].push('')
}

const removeTextRepeaterEntry = (fieldName: string, index: number | string) => {
  const numIndex = Number(index)
  if (!Array.isArray(formValues[fieldName])) {
    return
  }
  if (formValues[fieldName].length > 1) {
    formValues[fieldName].splice(numIndex, 1)
  } else {
    formValues[fieldName][numIndex] = ''
  }
}

// Tạo object lưu value form
const formValues = reactive<Record<string, any>>({})

const isYesValue = (value: any) => value === true || value === 'yes' || value === 'Có' || value === 'co' || value === 'Có ' || value === 'YES'

const normalizeChoiceValue = (value: any) => String(value ?? '').trim().toLowerCase()

const isMarriedStatus = (value: any) => {
  const normalized = normalizeChoiceValue(value)
  return ['married', 'ket_hon', 'ket-hon', 'kết hôn'].includes(normalized)
}

const isSingleStatus = (value: any) => {
  const normalized = normalizeChoiceValue(value)
  return ['single', 'doc_than', 'doc-than', 'độc thân'].includes(normalized)
}

const shouldShowMarriageCount = () => {
  const status = formValues['marital_status']
  return !!status && !isSingleStatus(status)
}

const shouldShowCurrentSpouseMilitaryQuestion = () => isMarriedStatus(formValues['marital_status'])

const shouldShowGroup = (section: any, group: any) => {
  if (section?.id === 'part4_current_marriage') {
    return isMarriedStatus(formValues['marital_status'])
  }

  return true
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
    const data = await getForm('n-400', locale.value)
    
    // Normalize schema về format đúng
    const normalizedData = normalizeSchema(data)
    console.log('Schema từ API (sau normalize):', normalizedData)
    
    // Debug: Check if current_spouse_armed_forces field exists in schema
    let foundCurrentSpouseArmedForces = false
    if (normalizedData && normalizedData.sections) {
      normalizedData.sections.forEach((section: any) => {
        if (section.groups) {
          section.groups.forEach((group: any) => {
            if (group.fields) {
              group.fields.forEach((field: any) => {
                if (field.name === 'current_spouse_armed_forces') {
                  foundCurrentSpouseArmedForces = true
                  console.log('Found current_spouse_armed_forces field in schema:', field)
                }
              })
            }
          })
        }
      })
    }
    if (!foundCurrentSpouseArmedForces) {
      console.warn('current_spouse_armed_forces field NOT found in schema from API')
    }
    
    schema.value = normalizedData
    
    // Initialize or merge form values after schema is loaded
    if (preserveData) {
      mergeFormValuesWithSchema()
    } else {
      initializeFormValues()
    }
  } catch (error: any) {
    console.error('Failed to fetch schema from API, using fallback:', error)
    schemaError.value = error.message || 'Không thể tải schema từ API'
    
    // Use fallback schema
    schema.value = fallbackSchema
    
    // Initialize or merge form values with fallback schema
    if (preserveData) {
      mergeFormValuesWithSchema()
    } else {
      initializeFormValues()
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
          formValues[field.name] = [createEmptyAddressEntry()]
        } else if (field.type === 'work_history') {
          formValues[field.name] = [createEmptyWorkEntry()]
        } else if (field.type === 'education_history') {
          formValues[field.name] = [createEmptyEducationEntry()]
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
        } else if (field.type === 'text_repeater') {
          formValues[field.name] = ['']
        } else if (field.name === 'marriage_count') {
          formValues[field.name] = '1'
        } else if (field.name === 'current_spouse_marriage_count') {
          formValues[field.name] = ''
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
            formValues[field.name] = [createEmptyAddressEntry()]
          } else if (field.type === 'work_history') {
            formValues[field.name] = [createEmptyWorkEntry()]
          } else if (field.type === 'education_history') {
            formValues[field.name] = [createEmptyEducationEntry()]
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
          } else if (field.type === 'text_repeater') {
            formValues[field.name] = ['']
          } else if (field.name === 'marriage_count') {
            formValues[field.name] = '1'
          } else if (field.name === 'current_spouse_marriage_count') {
            formValues[field.name] = ''
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

// Handle form submit
const handleSubmit = async () => {
  // Validate required fields
  if (!formValues['applicant_full_name']) {
    const message = locale.value === 'vi' 
      ? 'Vui lòng điền họ và tên của người điền đơn'
      : 'Please enter your full name'
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
  // Clear previous field errors
  Object.keys(fieldsWithErrors).forEach(key => {
    delete fieldsWithErrors[key]
  })
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
        : 'Please enter your full name')
    }
    
    if (!applicantSignature || applicantSignature.trim() === '') {
      throw new Error(locale.value === 'vi'
        ? 'Vui lòng ký tên'
        : 'Please sign your name')
    }

    const submitData = {
      language: locale.value,
      customer_name: applicantFullName,
      customer_email: formValues['email'] || '',
      customer_phone: formValues['phone'] || '',
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
    const response = await submitForm('n-400', submitData)

    if (response.success) {
      // Clear saved form data sau khi submit thành công
      clearFormData('n-400')
      
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
  const savedData = loadFormData('n-400')
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
  saveFormData(formValues, locale.value, 'n-400')
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
      saveFormData(formValues, locale.value, 'n-400')
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

watch(
  () => formValues.has_additional_phone,
  newValue => {
    if (newValue === 'yes') {
      ensureAdditionalPhoneList()
    } else if (newValue === 'no') {
      formValues.additional_phone_numbers = []
    }
  }
)

const ensureAdditionalPhoneList = () => {
  if (!Array.isArray(formValues.additional_phone_numbers) || formValues.additional_phone_numbers.length === 0) {
    formValues.additional_phone_numbers = ['']
  }
}

const addAdditionalPhone = () => {
  ensureAdditionalPhoneList()
  formValues.additional_phone_numbers.push('')
}

const removeAdditionalPhone = (index: number | string) => {
  ensureAdditionalPhoneList()
  if (formValues.additional_phone_numbers.length > 1) {
    formValues.additional_phone_numbers.splice(Number(index), 1)
  } else {
    formValues.additional_phone_numbers[0] = ''
  }
}

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
  formValues[fieldName].push(createEmptyWorkEntry())
}

const addEducation = (fieldName: string) => {
  if (!formValues[fieldName]) {
    formValues[fieldName] = []
  }
  formValues[fieldName].push(createEmptyEducationEntry())
}

// Hàm xóa địa chỉ hoặc công việc
const removeAddress = (fieldName: string, index: number | string) => {
  if (formValues[fieldName] && formValues[fieldName].length > 1) {
    formValues[fieldName].splice(Number(index), 1)
  }
}

const adjustCounter = (fieldName: string, delta: number) => {
  const current = parseInt(formValues[fieldName] || '0', 10) || 0
  const nextValue = Math.max(0, current + delta)
  formValues[fieldName] = String(nextValue)
}


const handleRadioOptionClick = (fieldName: string, value: string) => {
  const canToggleOff = fieldName === 'current_spouse_citizenship_method'
  const nextValue = canToggleOff && formValues[fieldName] === value ? '' : value
  formValues[fieldName] = nextValue
  handleRadioChange(fieldName, nextValue)
}

// Hàm xử lý khi thay đổi radio button
const handleRadioChange = (fieldName: string, value: string) => {
  if (fieldName === 'has_additional_phone') {
    if (value === 'yes') {
      ensureAdditionalPhoneList()
    } else {
      formValues.additional_phone_numbers = []
    }
  } else if (fieldName === 'parents_married_before_18') {
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
      formValues['current_spouse_residency_other'] = ''
    } else if (value === 'permanent_resident') {
      formValues['current_spouse_naturalization_date'] = ''
      formValues['current_spouse_residency_other'] = ''
    } else if (value === 'other') {
      formValues['current_spouse_naturalization_date'] = ''
    }
  } else if (fieldName === 'current_spouse_citizenship_method') {
    if (!value || value === 'born_in_us') {
      formValues['current_spouse_citizenship_date'] = ''
    }
  } else if (fieldName === 'current_spouse_same_address') {
    if (isYesValue(value)) {
      formValues['current_spouse_current_residence'] = ''
      formValues['current_spouse_current_residenceStreet'] = ''
      formValues['current_spouse_current_residenceCity'] = ''
      formValues['current_spouse_current_residenceProvince'] = ''
      formValues['current_spouse_current_residenceZip'] = ''
      formValues['current_spouse_current_residenceCountry'] = ''
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
    if (!isYesValue(value)) {
      formValues['filed_taxes_late_explanation'] = ''
    }
  } else if (fieldName === 'non_resident_tax_since_lpr') {
    if (!isYesValue(value)) {
      formValues['non_resident_tax_since_lpr_explanation'] = ''
    }
  } else if (fieldName === 'military_training') {
    if (!isYesValue(value)) {
      formValues['military_training_explanation'] = ''
    }
  } else if (fieldName === 'claimed_us_citizen') {
    if (!isYesValue(value)) {
      formValues['claimed_us_citizen_explanation'] = ''
    }
  } else if (fieldName === 'registered_voted_us') {
    if (!isYesValue(value)) {
      formValues['registered_voted_us_explanation'] = ''
    }
  } else if (fieldName === 'legally_incompetent') {
    if (!isYesValue(value)) {
      formValues['legally_incompetent_explanation'] = ''
    }
  } else if (fieldName === 'served_prison') {
    if (!isYesValue(value)) {
      formValues['served_prison_explanation'] = ''
    }
  } else if (fieldName === 'arrested_detained') {
    if (!isYesValue(value)) {
      formValues['arrested_detained_explanation'] = ''
    }
  } else if (fieldName === 'has_foreign_hereditary_title') {
    if (!isYesValue(value)) {
      formValues['willing_to_renounce_foreign_titles'] = ''
      formValues['foreign_titles_to_renounce'] = ['']
    }
  } else if (fieldName === 'willing_to_renounce_foreign_titles') {
    if (isYesValue(value)) {
      if (!Array.isArray(formValues['foreign_titles_to_renounce']) || formValues['foreign_titles_to_renounce'].length === 0) {
        formValues['foreign_titles_to_renounce'] = ['']
      }
    } else {
      formValues['foreign_titles_to_renounce'] = ['']
    }
  } else if (fieldName === 'male_lived_us_18_26') {
    if (!isYesValue(value)) {
      formValues['selective_service_registered'] = ''
      formValues['military_registration_date'] = ''
      formValues['military_registration_number'] = ''
    }
  } else if (fieldName === 'selective_service_registered') {
    if (!isYesValue(value)) {
      formValues['military_registration_date'] = ''
      formValues['military_registration_number'] = ''
    }
  }
}


const n400InputClass = 'border rounded px-3 py-2'

const setAddressParts = (target: Record<string, any>, baseName: string, parts: any = {}) => {
  if (!target || !baseName) return
  target[`${baseName}Street`] = parts.street || ''
  target[`${baseName}City`] = parts.city || ''
  target[`${baseName}Province`] = parts.province || ''
  target[`${baseName}Zip`] = parts.zip || ''
  target[`${baseName}Country`] = parts.country || ''
}

const buildAddressText = (target: Record<string, any>, baseName: string) => {
  if (!target || !baseName) return ''
  return [
    target[`${baseName}Street`],
    target[`${baseName}City`],
    target[`${baseName}Province`],
    target[`${baseName}Zip`],
    target[`${baseName}Country`]
  ].filter(Boolean).join(', ')
}

const handleAddressPartsChange = (target: Record<string, any>, baseName: string, parts: any = {}) => {
  setAddressParts(target, baseName, parts)
  target[baseName] = buildAddressText(target, baseName)
}

const updateHeightValue = () => {
  const feet = String(formValues.height_feet || '').trim()
  const inches = String(formValues.height_inches || '').trim()
  formValues.height = [feet ? `${feet} feet` : '', inches ? `${inches} inches` : ''].filter(Boolean).join(' ')
}

const isSplitAddressField = (field: any) => [
  'address_us',
  'current_spouse_current_residence',
  'uscis_office_address'
].includes(field?.name)

const isDateSelectField = (field: any) => field?.type === 'date'

// Helper function to check if a field is a name field
const isNameField = (field: any, currentLocale: 'vi' | 'en') => {
  const label = getLocalizedText(field.label, currentLocale)
  return label === 'Tên' || label === 'Họ' || label === 'Tên lót' ||
         label === 'First Name' || label === 'Last Name' || label === 'Middle Name'
}

// Helper function to check if three consecutive fields form a name group
const isNameGroup = (fields: any[], index: number | string, currentLocale: 'vi' | 'en') => {
  const numIndex = Number(index)
  if (numIndex + 2 >= fields.length) return false
  
  const field1 = fields[numIndex]
  const field2 = fields[numIndex + 1]
  const field3 = fields[numIndex + 2]
  
  if (!field1 || !field2 || !field3) return false
  
  // Sử dụng getLocalizedText để lấy label đúng cách
  const label1 = getLocalizedText(field1.label, currentLocale)
  const label2 = getLocalizedText(field2.label, currentLocale)
  const label3 = getLocalizedText(field3.label, currentLocale)
  
  // Check if they are name fields in the correct order
  const isFirst = (label1 === 'Tên' || label1 === 'First Name')
  const isLast = (label2 === 'Họ' || label2 === 'Last Name')
  const isMiddle = (label3 === 'Tên lót' || label3 === 'Middle Name')
  
  // Also check if they are regular text fields (not radio, textarea, etc.)
  const areTextFields = field1.type === 'text' && field2.type === 'text' && field3.type === 'text'
  
  return isFirst && isLast && isMiddle && areTextFields
}

// Navigation function for thank you modal
const goHome = () => {
  window.location.href = 'https://icaviet.com'
}
</script>

<template>
  <div class="max-w-3xl mx-auto p-6">
    <h1 class="text-3xl font-bold mb-6">
      {{ locale === 'vi' ? 'Biểu mẫu N-400 từ ICAVIET' : 'N-400 Form from ICAVIET' }}
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
        v-show="shouldShowGroup(section, group)"
        :key="group.id"
        class="mb-6 p-4 border rounded"
      >
        <!-- Show group title only if not address_history, work_history or education_history group -->
        <h3 
            v-if="!group.fields.some((f: any) => f.type === 'address_history' || f.type === 'work_history' || f.type === 'education_history' || f.type === 'children_info' || f.type === 'offense_history' || f.type === 'organization_history')"
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
            
            <!-- Address split into street, city, province/state, ZIP, country -->
            <div class="flex flex-col mb-4">
              <label class="text-base font-medium mb-1">
                {{ translations[locale].address }}
              </label>
              <AddressSelect
                :street-value="item.addressStreet || ''"
                :city-value="item.addressCity || ''"
                :province-value="item.addressProvince || ''"
                :zip-value="item.addressZip || ''"
                :country-value="item.addressCountry || ''"
                v-model="item.address"
                :locale="locale"
                :baseClass="n400InputClass"
                @parts-change="handleAddressPartsChange(item, 'address', $event)"
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
                <DateSelect
                  v-model="item.startDate"
                  :locale="locale"
                  order="mdy"
                  :baseClass="n400InputClass"
                  @focus="handleInputFocus(`${field.name}_${itemIndex}_startDate`)"
                  @blur="handleInputBlur"
                />
              </div>
              
              <div class="flex flex-col">
                <label class="text-base font-medium mb-1">
                  {{ translations[locale].endDate }}
                </label>
                <DateSelect
                  v-model="item.endDate"
                  :locale="locale"
                  order="mdy"
                  :baseClass="n400InputClass"
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
            
            <!-- Work address split into street, city, province/state, ZIP, country -->
            <div class="flex flex-col mb-4">
              <label class="text-base font-medium mb-1">
                {{ translations[locale].workAddress }}
              </label>
              <AddressSelect
                :street-value="item.addressStreet || ''"
                :city-value="item.addressCity || ''"
                :province-value="item.addressProvince || ''"
                :zip-value="item.addressZip || ''"
                :country-value="item.addressCountry || ''"
                v-model="item.address"
                :locale="locale"
                :baseClass="n400InputClass"
                @parts-change="handleAddressPartsChange(item, 'address', $event)"
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
                <DateSelect
                  v-model="item.startDate"
                  :locale="locale"
                  order="mdy"
                  :baseClass="n400InputClass"
                  @focus="handleInputFocus(`${field.name}_${itemIndex}_startDate`)"
                  @blur="handleInputBlur"
                />
              </div>
              
              <div class="flex flex-col">
                <label class="text-base font-medium mb-1">
                  {{ translations[locale].workEndDate }}
                </label>
                <DateSelect
                  v-model="item.endDate"
                  :locale="locale"
                  order="mdy"
                  :baseClass="n400InputClass"
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


        <!-- Education History fields (render outside grid) -->
        <div
          v-if="field.type === 'education_history'"
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
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div class="flex flex-col">
                <label class="text-base font-medium mb-1">
                  {{ translations[locale].schoolName }}
                </label>
                <input
                  v-model="item.schoolName"
                  type="text"
                  :class="getInputClasses(`${field.name}_${itemIndex}_schoolName`, 'border rounded px-3 py-2', item.schoolName)"
                  @focus="handleInputFocus(`${field.name}_${itemIndex}_schoolName`)"
                  @blur="handleInputBlur"
                />
              </div>
              
              <div class="flex flex-col">
                <label class="text-base font-medium mb-1">
                  {{ translations[locale].educationProgram }}
                </label>
                <input
                  v-model="item.program"
                  type="text"
                  :class="getInputClasses(`${field.name}_${itemIndex}_program`, 'border rounded px-3 py-2', item.program)"
                  @focus="handleInputFocus(`${field.name}_${itemIndex}_program`)"
                  @blur="handleInputBlur"
                />
              </div>
            </div>
            
            <div class="flex flex-col mb-4">
              <label class="text-base font-medium mb-1">
                {{ translations[locale].educationAddress }}
              </label>
              <AddressSelect
                :street-value="item.addressStreet || ''"
                :city-value="item.addressCity || ''"
                :province-value="item.addressProvince || ''"
                :zip-value="item.addressZip || ''"
                :country-value="item.addressCountry || ''"
                v-model="item.address"
                :locale="locale"
                :baseClass="n400InputClass"
                @parts-change="handleAddressPartsChange(item, 'address', $event)"
                @focus="handleInputFocus(`${field.name}_${itemIndex}_address`)"
                @blur="handleInputBlur"
              />
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="flex flex-col">
                <label class="text-base font-medium mb-1">
                  {{ translations[locale].educationStartDate }}
                </label>
                <DateSelect
                  v-model="item.startDate"
                  :locale="locale"
                  order="mdy"
                  :baseClass="n400InputClass"
                  @focus="handleInputFocus(`${field.name}_${itemIndex}_startDate`)"
                  @blur="handleInputBlur"
                />
              </div>
              
              <div class="flex flex-col">
                <label class="text-base font-medium mb-1">
                  {{ translations[locale].educationEndDate }}
                </label>
                <DateSelect
                  v-model="item.endDate"
                  :locale="locale"
                  order="mdy"
                  :baseClass="n400InputClass"
                  @focus="handleInputFocus(`${field.name}_${itemIndex}_endDate`)"
                  @blur="handleInputBlur"
                />
              </div>
            </div>
          </div>
          
          <button
            type="button"
            @click="addEducation(field.name)"
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

              <div class="flex flex-col">
                <label class="text-sm font-medium mb-1">{{ childrenTranslations[locale].birthDate }}</label>
                <DateSelect
                  v-model="child.birthDate"
                  :locale="locale"
                  order="mdy"
                  isBirthDate
                  :baseClass="n400InputClass"
                  @focus="handleInputFocus(`${field.name}_${childIndex}_birthDate`)"
                  @blur="handleInputBlur"
                />
              </div>

              <div class="flex flex-col">
                <label class="text-sm font-medium mb-2">{{ childrenTranslations[locale].childLivingLocation }}</label>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="option in childrenTranslations[locale].livingLocationOptions"
                    :key="option.value"
                    type="button"
                    class="px-4 py-2 border rounded transition-colors"
                    :class="child.childLivingLocation === option.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'"
                    @click="child.childLivingLocation = option.value"
                  >
                    {{ option.label }}
                  </button>
                </div>
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

              <div class="flex flex-col">
                <label class="text-sm font-medium mb-2">{{ childrenTranslations[locale].providingSupport }}</label>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="option in childrenTranslations[locale].providingSupportOptions"
                    :key="option.value"
                    type="button"
                    class="px-4 py-2 border rounded transition-colors"
                    :class="child.providingSupport === option.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'"
                    @click="child.providingSupport = option.value"
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
            <div class="space-y-4">
              <div class="flex flex-col">
                <label class="text-sm font-medium mb-1">{{ travelTranslations[locale].destination }}</label>
                <input 
                  v-model="trip.destination" 
                  type="text" 
                  :class="getInputClasses(`${field.name}_${tripIndex}_destination`, 'border rounded px-3 py-2 w-full', trip.destination)"
                  @focus="handleInputFocus(`${field.name}_${tripIndex}_destination`)"
                  @blur="handleInputBlur"
                />
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="flex flex-col">
                  <label class="text-sm font-medium mb-1">{{ travelTranslations[locale].startDate }}</label>
                  <DateSelect
                    v-model="trip.startDate"
                    :locale="locale"
                    order="mdy"
                    :baseClass="n400InputClass"
                    @focus="handleInputFocus(`${field.name}_${tripIndex}_startDate`)"
                    @blur="handleInputBlur"
                  />
                </div>
                <div class="flex flex-col">
                  <label class="text-sm font-medium mb-1">{{ travelTranslations[locale].endDate }}</label>
                  <DateSelect
                    v-model="trip.endDate"
                    :locale="locale"
                    order="mdy"
                    :baseClass="n400InputClass"
                    @focus="handleInputFocus(`${field.name}_${tripIndex}_endDate`)"
                    @blur="handleInputBlur"
                  />
                </div>
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
            <div class="space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="flex flex-col">
                  <label class="text-sm font-medium mb-1">{{ offenseTranslations[locale].date }}</label>
                  <DateSelect
                    v-model="entry.date"
                    :locale="locale"
                    order="mdy"
                    :baseClass="n400InputClass"
                    @focus="handleInputFocus(`${field.name}_${entryIndex}_date`)"
                    @blur="handleInputBlur"
                  />
                </div>
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
                <DateSelect
                  v-model="entry.startDate"
                  :locale="locale"
                  order="mdy"
                  :baseClass="n400InputClass"
                  @focus="handleInputFocus(`${field.name}_${entryIndex}_startDate`)"
                  @blur="handleInputBlur"
                />
              </div>
              <div class="flex flex-col">
                <label class="text-sm font-medium mb-1">{{ organizationTranslations[locale].endDate }}</label>
                <DateSelect
                  v-model="entry.endDate"
                  :locale="locale"
                  order="mdy"
                  :baseClass="n400InputClass"
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

        <!-- Name fields group (Tên, Họ, Tên lót) - rendered in 3 columns -->
        <template v-if="isNameGroup(group.fields, index, locale) && field.type !== 'address_history' && field.type !== 'work_history' && field.type !== 'education_history' && field.type !== 'children_info' && field.type !== 'travel_history' && field.type !== 'offense_history' && field.type !== 'organization_history'">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div
              v-if="group.fields[index]"
              class="flex flex-col"
            >
              <label class="text-base font-medium mt-2 mb-1">
                {{ getLocalizedText(group.fields[index]!.label, locale) || group.fields[index]!.name }}
                <span v-if="'required' in group.fields[index]! && (group.fields[index] as any).required" class="text-red-500">*</span>
              </label>
              <input
                v-model="formValues[group.fields[index]!.name]"
                type="text"
                :placeholder="(group.fields[index] as any).placeholder"
                :class="getInputClasses(group.fields[index]!.name, 'border rounded px-3 py-2', formValues[group.fields[index]!.name])"
                @focus="handleInputFocus(group.fields[index]!.name)"
                @blur="handleInputBlur"
              />
            </div>
            <div
              v-if="group.fields[index + 1]"
              class="flex flex-col"
            >
              <label class="text-base font-medium mt-2 mb-1">
                {{ getLocalizedText(group.fields[index + 1]!.label, locale) || group.fields[index + 1]!.name }}
                <span v-if="'required' in group.fields[index + 1]! && (group.fields[index + 1] as any).required" class="text-red-500">*</span>
              </label>
              <input
                v-model="formValues[group.fields[index + 1]!.name]"
                type="text"
                :placeholder="(group.fields[index + 1] as any).placeholder"
                :class="getInputClasses(group.fields[index + 1]!.name, 'border rounded px-3 py-2', formValues[group.fields[index + 1]!.name])"
                @focus="handleInputFocus(group.fields[index + 1]!.name)"
                @blur="handleInputBlur"
              />
            </div>
            <div
              v-if="group.fields[index + 2]"
              class="flex flex-col"
            >
              <label class="text-base font-medium mt-2 mb-1">
                {{ getLocalizedText(group.fields[index + 2]!.label, locale) || group.fields[index + 2]!.name }}
                <span v-if="'required' in group.fields[index + 2]! && (group.fields[index + 2] as any).required" class="text-red-500">*</span>
              </label>
              <input
                v-model="formValues[group.fields[index + 2]!.name]"
                type="text"
                :placeholder="(group.fields[index + 2] as any).placeholder"
                :class="getInputClasses(group.fields[index + 2]!.name, 'border rounded px-3 py-2', formValues[group.fields[index + 2]!.name])"
                @focus="handleInputFocus(group.fields[index + 2]!.name)"
                @blur="handleInputBlur"
              />
            </div>
          </div>
        </template>

        <!-- Skip rendering if this is the 2nd or 3rd field in a name group (already rendered above) -->
        <template v-else-if="isNameField(field, locale) && field.type === 'text' && ((index > 0 && isNameGroup(group.fields, index - 1, locale)) || (index > 1 && isNameGroup(group.fields, index - 2, locale)))">
          <!-- Skip this field, it's already rendered in the name group above -->
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
          <label v-if="field.name !== 'mailing_address'" class="text-base font-medium mt-2 mb-1">
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
          v-else-if="(field.type !== 'address_history' && field.type !== 'work_history' && field.type !== 'education_history' && field.type !== 'children_info' && field.type !== 'travel_history' && field.type !== 'offense_history' && field.type !== 'organization_history' && field.type !== 'signature' && field.type !== 'info' && !(field.name === 'marriage_year' && formValues['parents_married_before_18'] !== 'after') && !(field.name === 'additional_phone_numbers' && formValues['has_additional_phone'] !== 'yes') && !(field.name === 'marriage_count' && !shouldShowMarriageCount()) && !(field.name === 'father_naturalization_date' && formValues['father_residency_status'] !== 'us_citizen') && !(field.name === 'father_alien_number' && formValues['father_residency_status'] !== 'permanent_resident') && !(field.name === 'mother_naturalization_date' && formValues['mother_residency_status'] !== 'us_citizen') && !(field.name === 'mother_alien_number' && formValues['mother_residency_status'] !== 'permanent_resident') && !(field.name === 'former_spouse_divorce_reason_other' && formValues['former_spouse_divorce_reason'] !== 'other') && !(field.name === 'former_spouse_residency_other' && formValues['former_spouse_residency_status'] !== 'other') && !(field.name === 'former_spouse_naturalization_date' && formValues['former_spouse_residency_status'] !== 'us_citizen') && !(field.name === 'former_spouse_alien_number' && formValues['former_spouse_residency_status'] !== 'permanent_resident') && !(field.name === 'current_spouse_naturalization_date' && formValues['current_spouse_residency_status'] !== 'us_citizen') && !(field.name === 'current_spouse_residency_other' && formValues['current_spouse_residency_status'] !== 'other') && !(field.name === 'current_spouse_former_divorce_reason_other' && formValues['current_spouse_former_divorce_reason'] !== 'other') && !(field.name === 'current_spouse_former_residency_other' && formValues['current_spouse_former_residency_status'] !== 'other') && !(field.name === 'current_spouse_former_naturalization_date' && formValues['current_spouse_former_residency_status'] !== 'us_citizen') && !(field.name === 'current_spouse_former_alien_number' && formValues['current_spouse_former_residency_status'] !== 'permanent_resident') && !(field.name === 'current_spouse_armed_forces' && !shouldShowCurrentSpouseMilitaryQuestion()) && !(field.name === 'current_spouse_citizenship_date' && formValues['current_spouse_citizenship_method'] !== 'other') && !(field.name === 'current_spouse_current_residence' && formValues['current_spouse_same_address'] !== 'no') && !(field.name === 'uscis_office_address' && formValues['applicant_age_status'] !== 'uscis_office') && !(field.name === 'applicant_age_status_other' && formValues['applicant_age_status'] !== 'other') && !(field.name === 'filed_taxes_late_explanation' && !isYesValue(formValues['filed_taxes_late'])) && !(field.name === 'non_resident_tax_since_lpr_explanation' && !isYesValue(formValues['non_resident_tax_since_lpr'])) && !(field.name === 'military_training_explanation' && !isYesValue(formValues['military_training']))  && !(field.name === 'claimed_us_citizen_explanation' && !isYesValue(formValues['claimed_us_citizen'])) && !(field.name === 'registered_voted_us_explanation' && !isYesValue(formValues['registered_voted_us'])) && !(field.name === 'legally_incompetent_explanation' && !isYesValue(formValues['legally_incompetent'])) && !(field.name === 'served_prison_explanation' && !isYesValue(formValues['served_prison'])) && !(field.name === 'arrested_detained_explanation' && !isYesValue(formValues['arrested_detained'])) && !(field.name === 'selective_service_registered' && !isYesValue(formValues['male_lived_us_18_26'])) && !(field.name === 'military_registration_date' && (!isYesValue(formValues['male_lived_us_18_26']) || !isYesValue(formValues['selective_service_registered']))) && !(field.name === 'military_registration_number' && (!isYesValue(formValues['male_lived_us_18_26']) || !isYesValue(formValues['selective_service_registered']))) && !(field.name === 'willing_to_renounce_foreign_titles' && !isYesValue(formValues['has_foreign_hereditary_title'])) && !(field.name === 'foreign_titles_to_renounce' && !isYesValue(formValues['willing_to_renounce_foreign_titles'])))"
          class="flex flex-col mb-4 transition-colors rounded p-3"
          :class="{
            'md:col-span-full': field.type === 'radio',
            'md:col-span-3': 'colSpan' in field && field.colSpan === 3,
            'md:col-span-2': 'colSpan' in field && field.colSpan === 2,
            'md:col-span-1': 'colSpan' in field && field.colSpan === 1
          }"
          :style="field.type === 'radio' && formValues[field.name] && formValues[field.name] !== '' ? { backgroundColor: '#eff6ff', borderColor: '#93c5fd', borderWidth: '2px', borderStyle: 'solid' } : {}"
        >
          <label v-if="field.name !== 'mailing_address'" class="text-base font-medium mt-2 mb-1">
            {{ getLocalizedText(field.label, locale) || field.name }}
            <span v-if="'required' in field && field.required" class="text-red-500">*</span>
          </label>

          <!-- DateSelect for all date fields -->
          <DateSelect
            v-if="isDateSelectField(field)"
            v-model="formValues[field.name]"
            :locale="locale"
            order="mdy"
            :isBirthDate="field.name === 'date_of_birth' || field.name.toLowerCase().includes('birth')"
            :baseClass="n400InputClass"
            @focus="handleInputFocus(field.name)"
            @blur="handleInputBlur"
          />

          <!-- Birth place: split city and province/state -->
          <div v-else-if="field.name === 'birth_province'" class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="flex flex-col">
              <label class="text-sm font-medium mb-1">{{ locale === 'vi' ? 'Thành phố nơi sinh' : 'City of Birth' }}</label>
              <input
                v-model="formValues.birth_city"
                type="text"
                :class="getInputClasses('birth_city', n400InputClass, formValues.birth_city)"
                @focus="handleInputFocus('birth_city')"
                @blur="handleInputBlur"
              />
            </div>
            <div class="flex flex-col">
              <label class="text-sm font-medium mb-1">{{ locale === 'vi' ? 'Tỉnh/Bang nơi sinh' : 'Province/State of Birth' }}</label>
              <input
                v-model="formValues.birth_province"
                type="text"
                :class="getInputClasses('birth_province', n400InputClass, formValues.birth_province)"
                @focus="handleInputFocus('birth_province')"
                @blur="handleInputBlur"
              />
            </div>
          </div>

          <!-- Height: split feet and inches -->
          <div v-else-if="field.name === 'height'" class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="flex flex-col">
              <label class="text-sm font-medium mb-1">Feet</label>
              <input
                v-model="formValues.height_feet"
                type="text"
                :class="getInputClasses('height_feet', n400InputClass, formValues.height_feet)"
                @input="updateHeightValue"
                @focus="handleInputFocus('height_feet')"
                @blur="handleInputBlur"
              />
            </div>
            <div class="flex flex-col">
              <label class="text-sm font-medium mb-1">Inches</label>
              <input
                v-model="formValues.height_inches"
                type="text"
                :class="getInputClasses('height_inches', n400InputClass, formValues.height_inches)"
                @input="updateHeightValue"
                @focus="handleInputFocus('height_inches')"
                @blur="handleInputBlur"
              />
            </div>
          </div>

          <!-- Address fields split into street, city, province/state, ZIP, country -->
          <AddressSelect
            v-else-if="isSplitAddressField(field)"
            :street-value="formValues[`${field.name}Street`] || ''"
            :city-value="formValues[`${field.name}City`] || ''"
            :province-value="formValues[`${field.name}Province`] || ''"
            :zip-value="formValues[`${field.name}Zip`] || ''"
            :country-value="formValues[`${field.name}Country`] || ''"
            v-model="formValues[field.name]"
            :locale="locale"
            :baseClass="n400InputClass"
            @parts-change="handleAddressPartsChange(formValues, field.name, $event)"
            @focus="handleInputFocus(field.name)"
            @blur="handleInputBlur"
          />

          <!-- Mailing address: ask whether same as current physical address -->
          <div v-else-if="field.name === 'mailing_address'" class="space-y-5">
            <div>
              <p class="text-base font-medium mb-3">
                {{ locale === 'vi' ? 'Địa chỉ nhận thư ở Mỹ có trùng với địa chỉ hiện tại ở Mỹ không?' : 'Is your U.S. mailing address the same as your current U.S. physical address?' }}
              </p>
              <div class="flex flex-col gap-4 mt-4">
                <label class="flex items-center gap-3 cursor-pointer text-base">
                  <input
                    v-model="formValues.mailing_same_as_current"
                    type="radio"
                    value="yes"
                    class="h-4 w-4 cursor-pointer"
                  />
                  <span>{{ locale === 'vi' ? 'Có' : 'YES' }}</span>
                </label>
                <label class="flex items-center gap-3 cursor-pointer text-base">
                  <input
                    v-model="formValues.mailing_same_as_current"
                    type="radio"
                    value="no"
                    class="h-4 w-4 cursor-pointer"
                  />
                  <span>{{ locale === 'vi' ? 'Không' : 'NO' }}</span>
                </label>
              </div>
            </div>
            <div v-if="formValues.mailing_same_as_current === 'no'" class="space-y-3">
              <p class="text-base font-medium">
                {{ locale === 'vi' ? 'Địa chỉ nhận thư ở Mỹ' : 'U.S. Mailing Address' }}
              </p>
              <AddressSelect
              :street-value="formValues.mailing_addressStreet || ''"
              :city-value="formValues.mailing_addressCity || ''"
              :province-value="formValues.mailing_addressProvince || ''"
              :zip-value="formValues.mailing_addressZip || ''"
              :country-value="formValues.mailing_addressCountry || ''"
              v-model="formValues.mailing_address"
              :locale="locale"
              :baseClass="n400InputClass"
              @parts-change="handleAddressPartsChange(formValues, 'mailing_address', $event)"
              @focus="handleInputFocus('mailing_address')"
              @blur="handleInputBlur"
            />
            </div>
          </div>

          <!-- Marriage counter -->
          <div v-else-if="field.name === 'marriage_count' || field.name === 'current_spouse_marriage_count' || field.name === 'children_count'" class="flex items-center gap-3">
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

          <!-- Text repeater -->
          <div v-else-if="field.type === 'text_repeater'" class="space-y-3">
            <div
              v-for="(_item, itemIndex) in (Array.isArray(formValues[field.name]) ? formValues[field.name] : [])"
              :key="itemIndex"
              class="flex items-center gap-2"
            >
              <input
                v-model="formValues[field.name][itemIndex]"
                type="text"
                :placeholder="(field as any).placeholder"
                :class="getInputClasses(`${field.name}_${itemIndex}`, n400InputClass, formValues[field.name][itemIndex])"
                @focus="handleInputFocus(`${field.name}_${itemIndex}`)"
                @blur="handleInputBlur"
              />
              <button
                type="button"
                class="px-3 py-2 border rounded bg-blue-100 hover:bg-blue-200 text-blue-700"
                @click="addTextRepeaterEntry(field.name)"
                v-if="itemIndex === formValues[field.name].length - 1"
              >
                +
              </button>
              <button
                type="button"
                class="px-3 py-2 border rounded bg-red-50 hover:bg-red-100 text-red-600"
                @click="removeTextRepeaterEntry(field.name, itemIndex)"
                v-if="formValues[field.name].length > 1"
              >
                Xóa
              </button>
            </div>
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
              @click.prevent="handleRadioOptionClick(field.name, option.value)"
            >
              <input
                type="radio"
                :name="field.name"
                :value="option.value"
                v-model="formValues[field.name]"
                @click.stop.prevent="handleRadioOptionClick(field.name, option.value)"
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
            :placeholder="(field as any).placeholder"
            :class="getInputClasses(field.name, 'border rounded px-3 py-2', formValues[field.name])"
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











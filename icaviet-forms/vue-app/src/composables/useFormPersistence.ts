/**
 * Composable để quản lý việc lưu/load form data từ localStorage
 * Lưu ý: Signature (applicant_signature) sẽ không được lưu vào storage
 * 
 * Sử dụng localStorage thay vì sessionStorage để giữ dữ liệu khi đóng tab
 * Hỗ trợ multiple form types với slug-based storage keys
 */

const getStorageKey = (formSlug: string): string => {
  return `form-data-${formSlug}`
}

export const useFormPersistence = () => {
  /**
   * Loại bỏ signature khỏi form values trước khi lưu
   */
  const removeSignature = (formValues: Record<string, any>): Record<string, any> => {
    const cleaned = { ...formValues }
    if ('applicant_signature' in cleaned) {
      delete cleaned.applicant_signature
    }
    return cleaned
  }

  /**
   * Lưu form data vào localStorage
   * @param formValues - Form values object
   * @param locale - Locale ('vi' | 'en')
   * @param formSlug - Form slug (default: 'n-400' for backward compatibility)
   */
  const saveFormData = (
    formValues: Record<string, any>, 
    locale: 'vi' | 'en',
    formSlug: string = 'n-400'
  ) => {
    if (typeof window === 'undefined') {
      console.warn('Cannot save: window is undefined')
      return
    }

    try {
      const cleanedFormValues = removeSignature(formValues)
      const storageKey = getStorageKey(formSlug)
      const dataToSave = {
        formValues: cleanedFormValues,
        locale,
        savedAt: new Date().toISOString()
      }
      localStorage.setItem(storageKey, JSON.stringify(dataToSave))
      console.log('Form data saved to localStorage:', {
        formSlug,
        keys: Object.keys(cleanedFormValues),
        locale,
        savedAt: dataToSave.savedAt
      })
    } catch (error) {
      console.error('Failed to save form data to localStorage:', error)
      // Nếu localStorage đầy, thử xóa dữ liệu cũ hoặc thông báo lỗi
      if (error instanceof DOMException && error.code === 22) {
        console.error('LocalStorage is full. Consider clearing old data.')
      }
    }
  }

  /**
   * Load form data từ localStorage
   * @param formSlug - Form slug (default: 'n-400' for backward compatibility)
   */
  const loadFormData = (formSlug: string = 'n-400'): { formValues: Record<string, any>, locale: 'vi' | 'en' } | null => {
    if (typeof window === 'undefined') {
      console.warn('Cannot load: window is undefined')
      return null
    }

    try {
      const storageKey = getStorageKey(formSlug)
      const savedData = localStorage.getItem(storageKey)
      if (!savedData) {
        console.log(`No saved data found in localStorage for form: ${formSlug}`)
        return null
      }

      const parsed = JSON.parse(savedData)
      console.log('Loaded data from localStorage:', {
        formSlug,
        keys: Object.keys(parsed.formValues || {}),
        locale: parsed.locale,
        savedAt: parsed.savedAt
      })
      return {
        formValues: parsed.formValues || {},
        locale: parsed.locale || 'vi'
      }
    } catch (error) {
      console.error('Failed to load form data from localStorage:', error)
      return null
    }
  }

  /**
   * Xóa form data đã lưu
   * @param formSlug - Form slug (default: 'n-400' for backward compatibility)
   */
  const clearFormData = (formSlug: string = 'n-400') => {
    if (typeof window === 'undefined') return

    try {
      const storageKey = getStorageKey(formSlug)
      localStorage.removeItem(storageKey)
      console.log(`Form data cleared from localStorage for form: ${formSlug}`)
    } catch (error) {
      console.error('Failed to clear form data from localStorage:', error)
    }
  }

  return {
    saveFormData,
    loadFormData,
    clearFormData
  }
}


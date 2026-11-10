/**
 * Composable để gọi WordPress REST API
 * Thay thế useFormApi từ Nuxt (dùng $fetch) sang fetch() thuần
 */
export const useFormApi = () => {
  const getConfig = () => {
    return window.icavietFormsConfig || {
      apiUrl: '/wp-json/ICAVIET/v1',
      nonce: '',
      assetsUrl: '',
      slug: ''
    }
  }

  const jsonHeaders = (withContentType = false): HeadersInit => {
    const headers: HeadersInit = {
      'Accept': 'application/json'
    }

    if (withContentType) {
      headers['Content-Type'] = 'application/json'
    }

    return headers
  }

  /**
   * Lấy schema form từ WordPress REST API
   * GET /wp-json/ICAVIET/v1/schema/{slug}
   */
  const getForm = async (slug: string, lang: 'vi' | 'en' = 'vi') => {
    const config = getConfig()
    
    try {
      const response = await fetch(`${config.apiUrl}/schema/${slug}?lang=${lang}`, {
        method: 'GET',
        headers: jsonHeaders()
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      // WordPress REST API trả schema trực tiếp (không wrap trong { success, data })
      // Kiểm tra cả 2 format
      if (data.success && data.data) {
        return data.data
      }
      
      // Schema trả trực tiếp
      if (data.sections) {
        return data
      }

      throw new Error('Invalid schema response')
    } catch (error: any) {
      console.error('Error fetching form schema:', error)
      throw error
    }
  }

  /**
   * Submit form data lên WordPress REST API
   * POST /wp-json/ICAVIET/v1/submit/{slug}
   */
  const submitForm = async (slug: string, data: any) => {
    const config = getConfig()
    
    try {
      const response = await fetch(`${config.apiUrl}/submit/${slug}`, {
        method: 'POST',
        headers: jsonHeaders(true),
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (result.success) {
        return result
      }

      // Throw error với validation errors nếu có
      const error: any = new Error(result.message || 'Failed to submit form')
      error.data = result
      throw error
    } catch (error: any) {
      console.error('Error submitting form:', error)
      throw error
    }
  }

  return {
    getForm,
    submitForm
  }
}

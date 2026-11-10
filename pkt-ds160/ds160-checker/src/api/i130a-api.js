import {
  getEmployees,
  getFormTypes,
  getPendingReviews,
  getCompletedReviews,
  getAllCompletedReviews,
  login,
  ssoLogin,
  ssoTokenLogin
} from './index.js'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

function normalizeReviewRecord(row = {}) {
  const reviewerId = row.reviewerId ?? row.reviewer_id ?? row.employee_b_id ?? row.employeeBId ?? row.checker_id ?? row.checkerId
  const reviewerName = row.reviewerName ?? row.reviewer_name ?? row.reviewer_full_name ?? row.reviewerFullName ?? row.employee_b_name ?? row.employeeBName ?? row.checker_name ?? row.checkerName ?? ''
  const fillerId = row.fillerId ?? row.filler_id ?? row.employee_a_id ?? row.employeeAId
  const fillerName = row.fillerName ?? row.filler_name ?? row.filler_full_name ?? row.fillerFullName ?? row.employee_a_name ?? row.employeeAName ?? ''
  const customerId = row.customerId ?? row.customer_id ?? row.submission_id ?? row.ds160_id
  const customerName = row.customerName ?? row.customer_name ?? row.fullName ?? row.full_name ?? ''
  const formType = row.formType ?? row.form_type ?? 'i130a'
  const fillerChanges = row.fillerChanges ?? row.filler_changes ?? row.changed_data ?? {}
  const reviewChanges = row.reviewChanges ?? row.review_changes ?? row.review_data ?? {}

  return {
    ...row,
    reviewerId,
    reviewer_id: reviewerId,
    reviewerName,
    reviewer_name: reviewerName,
    fillerId,
    filler_id: fillerId,
    fillerName,
    filler_name: fillerName,
    customerId,
    customer_id: customerId,
    customerName,
    customer_name: customerName,
    formType,
    form_type: formType,
    fillerChanges,
    filler_changes: fillerChanges,
    reviewChanges,
    review_changes: reviewChanges
  }
}

export { login, ssoLogin, ssoTokenLogin, getEmployees, getFormTypes, getPendingReviews, getCompletedReviews, getAllCompletedReviews }

export async function getCustomers(search = '', formType = 'i130a-nbl') {
  try {
    let url = `${BASE_URL}/i130a?per_page=100&form_type=${encodeURIComponent(formType)}`
    if (search) url += `&search=${encodeURIComponent(search)}`

    const res = await fetch(url)
    let json = {}
    try {
      json = await res.json()
    } catch {
      json = {}
    }

    if (json.ok && Array.isArray(json.data)) return json.data
  } catch (err) {
    console.error('Lỗi khi gọi API hồ sơ I-130A:', err)
  }

  return []
}

export async function getCustomerDetail(id, formType = 'i130a-nbl') {
  try {
    const res = await fetch(`${BASE_URL}/i130a/${id}?form_type=${encodeURIComponent(formType)}`)
    const json = await res.json()

    if (json.ok && json.data) {
      return {
        id: json.data.id,
        submittedAt: json.data.submittedAt,
        status: json.data.status,
        ...json.data.fields
      }
    }
    throw new Error(json.error || 'Không tìm thấy dữ liệu I-130A')
  } catch (err) {
    console.error('Lỗi khi lấy chi tiết hồ sơ I-130A:', err)
    throw err
  }
}

export async function getNBLList() {
  try {
    const res = await fetch(`${BASE_URL}/i130a/nbl-list`)
    const json = await res.json()
    if (json.success) return json.data
  } catch (err) {
    console.error('Lỗi khi lấy danh sách NBL:', err)
  }
  return []
}

export async function getNDBLList() {
  try {
    const res = await fetch(`${BASE_URL}/i130a/ndbl-list`)
    const json = await res.json()
    if (json.success) return json.data
  } catch (err) {
    console.error('Lỗi khi lấy danh sách NDBL:', err)
  }
  return []
}

export async function getCombinedI130A(nblId, ndblId, options = {}) {
  try {
    const allowAssigned = options.allowAssigned ? '&allow_assigned=1' : ''
    const res = await fetch(`${BASE_URL}/i130a/combine?nbl_id=${nblId}&ndbl_id=${ndblId}${allowAssigned}`)
    let json = {}
    try {
      json = await res.json()
    } catch {
      json = {}
    }
    if (json.ok && json.data) {
      return {
        id: json.data.id,
        submittedAt: json.data.submittedAt,
        status: json.data.status,
        ...json.data.fields
      }
    }
    if (res.status === 409) {
      throw new Error(json.error || 'Ho so nay da duoc giao kiem tra. Vui long mo trong danh sach kiem tra hoac xu ly phieu dang cho truoc.')
    }
    throw new Error(json.error || 'Lỗi kết hợp hồ sơ')
  } catch (err) {
    console.error('Lỗi khi lấy chi tiết hồ sơ kết hợp:', err)
    throw err
  }
}

export async function submitRecord(payload) {
  const fillerName = payload.fillerName || 'Người điền'
  const reviewerName = payload.reviewerName || payload.reviewer_name || 'Người kiểm tra'
  const formType = payload.formType || 'i130a-final'

  try {
    const res = await fetch(`${BASE_URL}/i130a/reviews/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submission_id: payload.customerId,
        customer_name: payload.customerData?.fullName || 'Khách hàng',
        form_type: formType,
        form_label: formType === 'i130a-nbl' ? 'I-130A — NBL' : (formType === 'i130a-ndbl' ? 'I-130A — NDBL' : 'I-130 — Final'),
        filler_id: parseInt(payload.fillerId),
        filler_name: fillerName,
        reviewer_id: parseInt(payload.reviewerId || payload.reviewer_id),
        reviewer_name: reviewerName,
        reviewerName,
        filler_changes: payload.fillerChanges || {},
        nbl_submission_id: payload.nblSubmissionId || null,
        ndbl_submission_id: payload.ndblSubmissionId || null
      })
    })

    const json = await res.json()
    if (!res.ok || !json.success) throw new Error(json.message || 'Lỗi submit I-130A')
    return json
  } catch (err) {
    console.error('Lỗi submitRecord I-130A:', err)
    return { success: false, message: err.message || 'Không thể giao phiếu I-130A. Lỗi kết nối server.' }
  }
}

export async function completeReview(recordId, changes) {
  try {
    const res = await fetch(`${BASE_URL}/i130a/reviews/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        review_id: recordId,
        changes
      })
    })

    const json = await res.json()
    if (!res.ok || !json.success) throw new Error(json.message || 'Lỗi complete I-130A')
    return json
  } catch (err) {
    console.error('Lỗi completeReview I-130A:', err)
    return { success: false, message: 'Lỗi khi lưu kết quả kiểm tra I-130A.' }
  }
}

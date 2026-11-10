import { customers, employees, formTypes, pendingReviews } from '../data/mock-data.js'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

// Simulate API delay
const delay = (ms) => new Promise(r => setTimeout(r, ms))

// Lấy giá trị 1 ô header (dạng HTML contenteditable) từ object changes/fillerChanges
// và làm sạch về text thuần để lưu vào cột riêng (phục vụ search).
function extractHeaderCellValue(changeMap = {}, cellId) {
  const raw = changeMap?.[cellId]
  if (raw === undefined || raw === '__CLEARED__') return ''
  return String(raw)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Lấy giá trị MS (header_A_mshs) từ object changes/fillerChanges.
function extractMshsFromChanges(changeMap = {}) {
  return extractHeaderCellValue(changeMap, 'header_A_mshs')
}

// Lấy Số ID (header_A_id) từ object changes/fillerChanges để lưu vào cột
// id_number riêng (phục vụ search) — chỉ áp dụng cho DS-160/DS-260,
// các form khác (I-90, N-400, N-600, I-130A...) không lưu field này.
function extractIdNumberForForm(apiFormType, changeMap = {}) {
  if (apiFormType !== 'ds160' && apiFormType !== 'ds-260') return ''
  return extractHeaderCellValue(changeMap, 'header_A_id')
}

function normalizeApiFormType(formType = 'ds160') {
  const raw = String(formType || 'ds160').trim().toLowerCase()
  if (raw === 'ds260' || raw === 'ds-260') return 'ds-260'
  if (raw === 'i90' || raw === 'i-90') return 'i-90'
  if (raw === 'n600' || raw === 'n-600') return 'n-600'
  if (raw === 'n400' || raw === 'n-400') return 'n-400'
  if (raw === 'ds160' || raw === 'ds-160') return 'ds160'
  return formType || 'ds160'
}

function normalizeReviewRecord(row = {}) {
  const reviewerId = row.reviewerId ?? row.reviewer_id ?? row.employee_b_id ?? row.employeeBId ?? row.checker_id ?? row.checkerId
  const reviewerName = row.reviewerName ?? row.reviewer_name ?? row.reviewer_full_name ?? row.reviewerFullName ?? row.employee_b_name ?? row.employeeBName ?? row.checker_name ?? row.checkerName ?? ''
  const fillerId = row.fillerId ?? row.filler_id ?? row.employee_a_id ?? row.employeeAId
  const fillerName = row.fillerName ?? row.filler_name ?? row.filler_full_name ?? row.fillerFullName ?? row.employee_a_name ?? row.employeeAName ?? ''
  const customerId = row.customerId ?? row.customer_id ?? row.submission_id ?? row.ds160_id
  const customerName = row.customerName ?? row.customer_name ?? row.fullName ?? row.full_name ?? ''
  const formType = row.formType ?? row.form_type ?? 'ds-160'
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

export async function login(username, password) {
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Đăng nhập thất bại')
    return data
  } catch (err) {
    if (err.message.includes('fetch') || err.message.includes('Failed')) {
      throw new Error('Không thể kết nối server. Vui lòng kiểm tra backend đang chạy.')
    }
    throw err
  }
}

export async function ssoLogin(userId) {
  throw new Error('SSO bằng user_id đã bị tắt. Vui lòng dùng ssoTokenLogin().')
}

export async function ssoTokenLogin(token) {
  try {
    const res = await fetch(`${BASE_URL}/auth/sso-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'SSO thất bại')
    return data
  } catch (err) {
    if (err.message.includes('fetch') || err.message.includes('Failed')) {
      throw new Error('Không thể kết nối server.')
    }
    throw err
  }
}

export async function getCustomers(search = '', formType = 'ds160') {
  try {
    const apiFormType = normalizeApiFormType(formType)
    let url = `${BASE_URL}/ds160?per_page=100&form_type=${encodeURIComponent(apiFormType)}`
    if (search) url += `&search=${encodeURIComponent(search)}`

    const res = await fetch(url)
    const json = await res.json()

    if (json.ok && Array.isArray(json.data)) {
      return json.data
    }
  } catch (err) {
    console.error('Lỗi khi gọi API hồ sơ:', err)
  }

  await delay(200)
  return customers
}

export async function getCustomerDetail(id, formType = 'ds160') {
  try {
    const apiFormType = normalizeApiFormType(formType)
    const res = await fetch(`${BASE_URL}/ds160/${id}?form_type=${encodeURIComponent(apiFormType)}`)
    const json = await res.json()

    if (json.ok && json.data) {
      return {
        id: json.data.id,
        submittedAt: json.data.submittedAt,
        status: json.data.status,
        ...json.data.fields
      }
    }

    throw new Error(json.error || 'Không tìm thấy dữ liệu')
  } catch (err) {
    console.error('Lỗi khi lấy chi tiết hồ sơ:', err)
    throw err
  }
}

// ── Quản lý tài khoản (backend chỉ cho phép khi requesterId là ittest) ──
export async function getUserAccounts(requesterId) {
  const res = await fetch(`${BASE_URL}/auth/users?requester_id=${encodeURIComponent(requesterId ?? '')}`)
  const json = await res.json().catch(() => ({}))
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Không lấy được danh sách tài khoản')
  }
  return Array.isArray(json.data) ? json.data : []
}

export async function createUserAccount(payload = {}) {
  const res = await fetch(`${BASE_URL}/auth/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requester_id: payload.requesterId,
      username: payload.username,
      name: payload.name,
      password: payload.password,
      phong_ban: payload.phongBan,
      role: payload.role,
      can_comment: payload.canComment ? 1 : 0
    })
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Tạo tài khoản thất bại')
  }
  return json
}

export async function setUserCanComment(requesterId, targetUserId, canComment) {
  const res = await fetch(`${BASE_URL}/auth/users/${encodeURIComponent(targetUserId)}/can-comment`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requester_id: requesterId, can_comment: canComment ? 1 : 0 })
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Đổi quyền comment thất bại')
  }
  return json
}

// ── Comment theo từng dòng của cột TƯ VẤN (phiếu đã kiểm tra) ──
export async function getReviewComments(reviewId, userId) {
  const res = await fetch(
    `${BASE_URL}/reviews/${encodeURIComponent(reviewId)}/comments?user_id=${encodeURIComponent(userId ?? '')}`
  )
  const json = await res.json().catch(() => ({}))
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Không lấy được comment')
  }
  return { canComment: !!json.canComment, comments: Array.isArray(json.data) ? json.data : [] }
}

export async function addReviewComment(reviewId, payload = {}) {
  const res = await fetch(`${BASE_URL}/reviews/${encodeURIComponent(reviewId)}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: payload.userId,
      cell_id: payload.cellId,
      row_label: payload.rowLabel,
      content: payload.content
    })
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Gửi comment thất bại')
  }
  return json.data
}

export async function deleteReviewComment(commentId, userId) {
  const res = await fetch(
    `${BASE_URL}/comments/${encodeURIComponent(commentId)}?user_id=${encodeURIComponent(userId ?? '')}`,
    { method: 'DELETE' }
  )
  const json = await res.json().catch(() => ({}))
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Xóa comment thất bại')
  }
  return true
}

export async function getEmployees() {
  try {
    const res = await fetch(`${BASE_URL}/employees`)
    const json = await res.json()
    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
      return json.data
    }
  } catch (err) {
    console.warn('[API] Không lấy được danh sách nhân viên từ backend, dùng mock:', err.message)
  }

  await delay(100)
  return employees
}

export async function getFormTypes() {
  await delay(50)
  return formTypes
}

export async function getPendingReviews(reviewerId) {
  if (!reviewerId) return []
  try {
    const res = await fetch(`${BASE_URL}/reviews/pending/${reviewerId}`)
    const json = await res.json()
    if (json.success) return json.data.map(normalizeReviewRecord)
  } catch (err) {
    console.error('Lỗi khi lấy pending reviews:', err)
  }
  return []
}

export async function getCompletedReviews(reviewerId) {
  if (!reviewerId) return []
  try {
    const res = await fetch(`${BASE_URL}/reviews/completed/${reviewerId}`)
    const json = await res.json()
    if (json.success) return json.data.map(normalizeReviewRecord)
  } catch (err) {
    console.error('Lỗi khi lấy completed reviews:', err)
  }
  return []
}

export async function getAllCompletedReviews() {
  try {
    const res = await fetch(`${BASE_URL}/reviews/completed-all`)
    const json = await res.json()
    if (json.success) return json.data.map(normalizeReviewRecord)
  } catch (err) {
    console.error('Lỗi khi lấy all completed reviews:', err)
  }
  return []
}

export async function searchReviews(query) {
  if (!query || !query.trim()) return []
  try {
    const res = await fetch(`${BASE_URL}/reviews/search?search=${encodeURIComponent(query)}`)
    const json = await res.json()
    if (json.success) return json.data.map(normalizeReviewRecord)
  } catch (err) {
    console.error('Lỗi khi search reviews:', err)
  }
  return []
}

export async function searchGlobal(query) {
  if (!query || !query.trim()) return { reviews: [], submissions: [] }
  try {
    const res = await fetch(`${BASE_URL}/search/global?q=${encodeURIComponent(query)}`)
    const json = await res.json()
    if (json.success) {
      return {
        reviews: (json.data.reviews || []).map(normalizeReviewRecord),
        submissions: json.data.submissions || []
      }
    }
  } catch (err) {
    console.error('Lỗi khi tìm kiếm tổng hợp:', err)
  }
  return { reviews: [], submissions: [] }
}

export async function getDraft(draftKey, userId) {
  if (!draftKey || !userId) return null
  try {
    const res = await fetch(`${BASE_URL}/drafts/${encodeURIComponent(draftKey)}?user_id=${encodeURIComponent(userId)}`)
    const json = await res.json()
    if (!res.ok || !json.success) throw new Error(json.message || 'Loi lay ban nhap')
    return json.data || null
  } catch (err) {
    console.warn('[API] Khong lay duoc draft tu server:', err.message)
    return null
  }
}

export async function saveDraft(payload = {}) {
  try {
    const res = await fetch(`${BASE_URL}/drafts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        draft_key: payload.draftKey,
        user_id: payload.userId,
        draft_type: payload.draftType,
        form_type: payload.formType,
        customer_id: payload.customerId || null,
        review_id: payload.reviewId || null,
        draft_data: payload.draftData || {}
      })
    })
    const json = await res.json()
    if (!res.ok || !json.success) throw new Error(json.message || 'Loi luu ban nhap')
    return true
  } catch (err) {
    console.warn('[API] Khong luu duoc draft len server:', err.message)
    return false
  }
}

export async function deleteDraft(draftKey, userId) {
  if (!draftKey || !userId) return false
  try {
    const res = await fetch(`${BASE_URL}/drafts/${encodeURIComponent(draftKey)}?user_id=${encodeURIComponent(userId)}`, {
      method: 'DELETE'
    })
    const json = await res.json()
    if (!res.ok || !json.success) throw new Error(json.message || 'Loi xoa ban nhap')
    return true
  } catch (err) {
    console.warn('[API] Khong xoa duoc draft tren server:', err.message)
    return false
  }
}

export async function submitRecord(payload) {
  console.log('Submitting to backend:', payload)
  const fillerName = payload.fillerName || 'Người điền'
  const reviewerName = payload.reviewerName || payload.reviewer_name || 'Người kiểm tra'

  const apiFormType = normalizeApiFormType(payload.formType)

  try {
    const res = await fetch(`${BASE_URL}/reviews/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submission_id: payload.customerId,
        customer_name: payload.customerData?.fullName || 'Khách hàng',
        form_type: apiFormType,
        form_label: apiFormType === 'ds160' || apiFormType === 'ds-160'
          ? 'DS-160'
          : (apiFormType === 'ds260' || apiFormType === 'ds-260'
            ? 'DS-260'
            : (apiFormType === 'i130a' || apiFormType === 'i-130a' ? 'I-130A' : apiFormType)),
        filler_id: parseInt(payload.fillerId),
        filler_name: fillerName,
        reviewer_id: parseInt(payload.reviewerId || payload.reviewer_id),
        reviewer_name: reviewerName,
        reviewerName: reviewerName,
        filler_changes: payload.fillerChanges || {},
        mshs: extractMshsFromChanges(payload.fillerChanges),
        id_number: extractIdNumberForForm(apiFormType, payload.fillerChanges)
      })
    })

    const json = await res.json()
    if (!res.ok || !json.success) throw new Error(json.message || 'Lỗi submit')
    return json
  } catch (err) {
    console.error('Lỗi submitRecord:', err)
    return { success: false, message: 'Không thể giao phiếu. Lỗi kết nối server.' }
  }
}

// Phiếu đã giao cho tư vấn của 1 hồ sơ (nếu có). Dùng để người xử lý mở lại đúng
// bản đã submit - giữ nguyên những gì đã điền - thay vì phải gõ lại từ đầu.
export async function getReviewBySubmission(submissionId, formType) {
  if (!submissionId) return null
  try {
    const query = new URLSearchParams()
    if (formType) query.set('form_type', normalizeApiFormType(formType))
    const res = await fetch(`${BASE_URL}/reviews/by-submission/${submissionId}?${query.toString()}`)
    const json = await res.json()
    if (!res.ok || !json.success) throw new Error(json.message || 'Không lấy được phiếu của hồ sơ')
    return json.data ? normalizeReviewRecord(json.data) : null
  } catch (err) {
    console.warn('[API] Không lấy được phiếu theo hồ sơ:', err.message)
    return null
  }
}

export async function reopenReview(reviewId, actor = {}) {
  try {
    const res = await fetch(`${BASE_URL}/reviews/reopen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        review_id: reviewId,
        actor_id: actor.id || null,
        actor_name: actor.name || '',
        actor_username: actor.username || ''
      })
    })
    const json = await res.json()
    if (!res.ok || !json.success) {
      return { success: false, message: json.message || 'Không mở lại được phiếu.' }
    }
    return json
  } catch (err) {
    console.error('Lỗi reopenReview:', err)
    return { success: false, message: 'Không mở lại được phiếu. Lỗi kết nối server.' }
  }
}

export async function completeReview(recordId, changes, formType) {
  const apiFormType = normalizeApiFormType(formType)
  try {
    const res = await fetch(`${BASE_URL}/reviews/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        review_id: recordId,
        changes: changes,
        mshs: extractMshsFromChanges(changes),
        id_number: extractIdNumberForForm(apiFormType, changes)
      })
    })

    const json = await res.json()
    if (!res.ok || !json.success) throw new Error(json.message || 'Lỗi complete')
    return json
  } catch (err) {
    console.error('Lỗi completeReview:', err)
    return { success: false, message: 'Lỗi khi lưu kết quả kiểm tra.' }
  }
}

// ===== CHỮ KÝ ĐIỆN TỬ CỦA PHIẾU =====

export async function getReviewSignatures(reviewId) {
  try {
    const res = await fetch(`${BASE_URL}/reviews/${reviewId}/signatures`)
    const json = await res.json()
    if (!res.ok || !json.success) throw new Error(json.message || 'Không lấy được chữ ký')
    return json.data || {}
  } catch (err) {
    console.error('Lỗi getReviewSignatures:', err)
    return {}
  }
}

export async function saveReviewSignatures(reviewId, signatures) {
  try {
    const res = await fetch(`${BASE_URL}/reviews/signatures`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ review_id: reviewId, signatures })
    })
    const json = await res.json()
    if (!res.ok || !json.success) throw new Error(json.message || 'Lỗi lưu chữ ký')
    return { success: true }
  } catch (err) {
    console.error('Lỗi saveReviewSignatures:', err)
    return { success: false, message: 'Không lưu được chữ ký. Lỗi kết nối server.' }
  }
}

export async function getCheckLogs(params = {}) {
  try {
    const query = new URLSearchParams()
    if (params.userId) query.set('user_id', params.userId)
    if (params.username) query.set('username', params.username)
    if (params.submissionId) query.set('submission_id', params.submissionId)
    if (params.reviewId) query.set('review_id', params.reviewId)
    if (params.actor) query.set('actor', params.actor)
    if (params.action) query.set('action', params.action)
    if (params.formType) query.set('form_type', params.formType)
    if (params.limit) query.set('limit', params.limit)
    const res = await fetch(`${BASE_URL}/check-logs?${query.toString()}`)
    const json = await res.json()
    if (!res.ok || !json.success) throw new Error(json.message || 'Không thể lấy check log')
    return json.data || { logs: [], reviews: [] }
  } catch (err) {
    console.error('Lỗi getCheckLogs:', err)
    throw err
  }
}

// Bản tổng hợp cuối của 1 phiếu: 1 dòng cho mỗi ô, kèm data gốc / người xử lý điền /
// tư vấn sửa / giá trị cuối và lịch sử từng lần save.
export async function getFinalReport(params = {}) {
  const query = new URLSearchParams()
  if (params.username) query.set('username', params.username)
  if (params.reviewId) query.set('review_id', params.reviewId)
  if (params.submissionId) query.set('submission_id', params.submissionId)

  const res = await fetch(`${BASE_URL}/check-logs/final?${query.toString()}`)
  const json = await res.json()
  if (!res.ok || !json.success) throw new Error(json.message || 'Không lấy được bản tổng hợp cuối')
  return json.data
}

export async function createAuditLog(payload = {}) {
  try {
    const res = await fetch(`${BASE_URL}/audit-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const json = await res.json()
    if (!res.ok || !json.success) throw new Error(json.message || 'Không thể ghi audit log')
    return true
  } catch (err) {
    console.warn('[API] Không ghi được audit log:', err.message)
    return false
  }
}

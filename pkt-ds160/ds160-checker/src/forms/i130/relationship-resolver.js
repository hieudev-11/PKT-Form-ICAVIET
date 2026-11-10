export const I130_CASE_TYPES = Object.freeze({
  SPOUSE: 'spouse',
  CHILD: 'child',
  PARENT: 'parent',
  SIBLING: 'sibling',
  FIANCE: 'fiance'
})

export function normalizeI130CaseText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function getI130CaseRawText(data = {}) {
  return [
    // relationCategory/relationLabel do backend tu suy ra (detectI130ARelationCategory)
    // va luon co trong du lieu tai lai tu server, khac voi loaiHoSoBaoLanh chi duoc
    // trang ghep NBL+NDBL gan them o phia client. Thieu 2 key nay thi ho so mo lai
    // bang deep-link se roi ve mau phieu vo chong.
    data.relationCategory,
    data.relation_category,
    data.relationLabel,
    data.relation_label,
    data.petitionRelationship,
    data.petitionRelationshipLabel,
    data.loaiHoSoBaoLanh,
    data.dienBaoLanh,
    data.loaiHoSo,
    data.relationshipToPetitioner,
    data.relationship,
    data.caseType,
    data.petitionType,
    data.formCategory,
    data.category,
    data.form_slug,
    data.formSlug,
    data.formType,
    data.type
  ].filter(value => value !== undefined && value !== null).join(' ')
}

export function resolveI130CaseType(data = {}) {
  const text = normalizeI130CaseText(getI130CaseRawText(data))

  if (text.includes('con gai') || text.includes('con cai') || text.includes('child') || text.includes('son') || text.includes('daughter')) {
    return I130_CASE_TYPES.CHILD
  }

  if (text.includes('cha me') || text.includes('parent') || text.includes('father') || text.includes('mother')) {
    return I130_CASE_TYPES.PARENT
  }

  if (text.includes('anh chi em') || text.includes('sibling') || text.includes('brother') || text.includes('sister')) {
    return I130_CASE_TYPES.SIBLING
  }

  if (text.includes('hon phu') || text.includes('hon the') || text.includes('fiance') || text.includes('fiancee') || text.includes('k1')) {
    return I130_CASE_TYPES.FIANCE
  }

  return I130_CASE_TYPES.SPOUSE
}

export function resolveI130CaseModuleName(data = {}) {
  return resolveI130CaseType(data)
}

import {
  removeAccents, hasValue, recordHasValue, firstRecordList, mergeRecordValues,
  isUSZipCode, formatI130DateMMDDYYYY, isI130DateField, isSectionHeading,
  getDataCell, getNoteCell, isEmploymentSortTriggerField, splitNameParts
} from '../../shared/i130a-dynamic-sections-base.js'

export function renderI130ADynamicSections({
  paperEl,
  data = {},
  mode = 'view',
  changes,
  emit = () => {},
  normalizeText = value => String(value ?? '').toUpperCase(),
  splitAddr = () => ({ street: '', line2: '', city: '', province: '', zip: '', country: '' }),
  firstValue = (...values) => values.find(value => value !== undefined && value !== null && String(value).trim() !== '') || '',
  updateCorrectionCountDisplay = () => {}
} = {}) {
  if (!paperEl) return

  const changeRef = changes && typeof changes === 'object' && 'value' in changes
    ? changes
    : { value: {} }
  const emitChange = () => emit('change', { ...changeRef.value })
  const checklistTable = paperEl.querySelectorAll('table')[2]
  const tbody = checklistTable?.querySelector('tbody')
  if (!tbody) return
  const EMPLOYMENT_FIELD_KEYS = ['employer', 'country', 'line1', 'line2', 'city', 'state', 'zip', 'occupation', 'from', 'to']
  const OLD_ADDRESS_FIELD_KEYS = ['country', 'line1', 'line2', 'city', 'state', 'zip', 'from', 'to']
  // cloneNode(true) copies dataset attributes, so a dataset flag would make a freshly
  // cloned block (added via the "+" button) look already-bound without ever attaching
  // its own listener. A WeakSet tracks real bound instances instead.
  const sortBoundCells = new WeakSet()

  const normalizePlainText = (value) => removeAccents(normalizeText(String(value || '').replace(/\s+/g, ' ').trim()))
  const objectValue = (source, ...keys) => {
    if (!source || typeof source !== 'object') return ''
    return firstValue(...keys.map(key => source[key]))
  }
  const freeformAddress = (record) => {
    if (!record || typeof record !== 'object') return record || ''
    return firstValue(
      record.fullAddress,
      record.address,
      record.diaChi,
      record.companyAddress,
      record.line1,
      record.addressLine1,
      record.street
    )
  }
  const isLocalAddressPart = (value) => {
    const text = normalizePlainText(value)
    if (!text) return false
    return /(PHUONG|PHUONG|XA|QUAN|HUYEN|WARD|DISTRICT|COMMUNE)/.test(text)
  }
  const countryOnlyValue = (value) => {
    const raw = String(value || '').trim()
    if (!raw) return ''

    const parts = raw
      .split(/,|;/)
      .map(part => part.trim())
      .filter(Boolean)
    const candidates = parts.length ? [...parts].reverse() : [raw]

    for (const candidate of candidates) {
      const key = normalizePlainText(candidate).replace(/[^A-Z0-9]+/g, '')
      if (['US', 'USA', 'UNITEDSTATES', 'UNITEDSTATESOFAMERICA', 'AMERICA', 'HOAKY', 'MY'].includes(key)) return 'USA'
      if (key === 'VN' || key.includes('VIETNAM')) return 'VIETNAM'
    }

    return ''
  }
  const isUSStateCode = (value) => {
    const key = normalizePlainText(value).replace(/[^A-Z]/g, '')
    return [
      'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
      'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
      'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
      'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
      'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
      'DC'
    ].includes(key)
  }
  const zipOnlyValue = (...values) => {
    for (const value of values) {
      const raw = firstValue(value)
      if (!raw) continue
      const text = String(raw).trim()
      if (/^\d{4,10}(?:-\d{4})?$/.test(text)) return text
      if (normalizePlainText(text).replace(/[^A-Z0-9]+/g, '') === 'DOESNOTAPPLY') return text
    }
    return ''
  }
  const isHoChiMinhAddressPart = (value) => {
    const key = normalizePlainText(value).replace(/[^A-Z0-9]+/g, '')
    if (!key) return false
    return [
      'HOCHIMINH',
      'TPHOCHIMINH',
      'THANHPHOHOCHIMINH',
      'HOCHIMINHCITY',
      'HCM',
      'HCMC',
      'SAIGON',
      'SAIGON',
      'SAIGON'
    ].includes(key) || key.includes('HOCHIMINH') || key.includes('SAIGON')
  }
  const normalizeHoChiMinhProvince = (city, state, country) => {
    const countryKey = normalizePlainText(country).replace(/[^A-Z0-9]+/g, '')
    const isUSCountry = ['US', 'USA', 'UNITEDSTATES', 'UNITEDSTATESOFAMERICA'].includes(countryKey)
    if (!isUSCountry && isHoChiMinhAddressPart(city) && (!state || isHoChiMinhAddressPart(state))) {
      return 'Hồ Chí Minh'
    }
    return state
  }
  const inferUSCountryFromParts = (parts = {}) => {
    const state = firstValue(parts.state, parts.province)
    const zip = firstValue(parts.zip, parts.postalCode, parts.postal)
    const hasAddressText = [parts.line1, parts.street, parts.city, parts.fullAddress].some(hasValue)
    return isUSStateCode(state) && (isUSZipCode(zip) || hasAddressText) ? 'USA' : ''
  }
  const getAddressParts = (record = {}) => {
    const fullAddress = freeformAddress(record)
    const countryFromAddress = countryOnlyValue(fullAddress)
    const explicitCountry = countryOnlyValue(
      objectValue(record, 'country', 'quocGia', 'diaChiCountry'),
      objectValue(record?.diaChiParts, 'country', 'quocGia')
    )
    const parsed = splitAddr(fullAddress, record, '', countryFromAddress === 'USA' || explicitCountry === 'USA')
    const line1 = firstValue(
      objectValue(record, 'addressLine1', 'line1', 'diaChiLine1'),
      objectValue(record?.diaChiParts, 'line1', 'street'),
      objectValue(record, 'street', 'diaChiStreet'),
      parsed.street
    )
    const line2 = firstValue(objectValue(record, 'addressLine2', 'line2', 'diaChiLine2'), parsed.line2)
    const line2IsLocal = isLocalAddressPart(line2)
    const city = firstValue(
      explicitCountry === 'VIETNAM' ? objectValue(record?.diaChiParts, 'city', 'cityTown', 'town', 'thanhPho') : '',
      objectValue(record, 'city', 'cityTown', 'town', 'thanhPho', 'huyen', 'diaChiCity'),
      objectValue(record?.diaChiParts, 'city', 'cityTown', 'town', 'thanhPho'),
      parsed.city
    )
    const state = firstValue(
      objectValue(record, 'state', 'province', 'stateProvince', 'tinh', 'diaChiProvince', 'diaChiState'),
      objectValue(record?.diaChiParts, 'province', 'state', 'stateProvince', 'tinh'),
      parsed.province
    )
    const zip = firstValue(
      zipOnlyValue(
        objectValue(record, 'zipCode', 'postalCode', 'postal', 'diaChiZipCode', 'diaChiZip', 'zip'),
        objectValue(record?.diaChiParts, 'zip', 'zipCode', 'postalCode')
      ),
      zipOnlyValue(parsed.zip)
    )

    const country = firstValue(countryFromAddress, explicitCountry, inferUSCountryFromParts({ line1, city, state, zip, fullAddress }))
    const normalizedState = normalizeHoChiMinhProvince(city, state, country)

    return {
      country,
      line1: line2IsLocal ? [line1, line2].filter(Boolean).join(', ') : line1,
      line2: line2IsLocal ? '' : line2,
      city: isHoChiMinhAddressPart(city) && normalizedState === 'Hồ Chí Minh' ? 'Hồ Chí Minh' : city,
      state: normalizedState,
      zip,
      from: firstValue(objectValue(record, 'from', 'start', 'startDate', 'ngayBatDau')),
      to: firstValue(objectValue(record, 'to', 'end', 'endDate', 'ngayChuyenDi')) || (firstValue(objectValue(record, 'from', 'start', 'startDate', 'ngayBatDau')) ? 'PRESENT' : '')
    }
  }
  const isNonEmployerEmploymentStatus = (value) => {
    const text = normalizePlainText(value)
    if (!text) return false
    return [
      'VE HUU',
      'RETIRED',
      'UNEMPLOYED',
      'THAT NGHIEP',
      'KHONG CO VIEC LAM',
      'KHONG DI LAM',
      'HOMEMAKER',
      'HOUSEWIFE',
      'STUDENT',
      'SINH VIEN'
    ].some(status => text === status || text.includes(status))
  }
  const cleanEmployerName = (value) => {
    const raw = firstValue(value)
    return isNonEmployerEmploymentStatus(raw) ? '' : raw
  }
  const getJobParts = (record = {}) => {
    const fullAddress = freeformAddress(record)
    const countryFromAddress = countryOnlyValue(fullAddress)
    const explicitCountry = countryOnlyValue(
      objectValue(record, 'country', 'quocGia', 'diaChiCountry'),
      objectValue(record?.diaChiParts, 'country', 'quocGia')
    )
    const parsed = splitAddr(fullAddress, record, '', countryFromAddress === 'USA' || explicitCountry === 'USA')
    const line1 = firstValue(
      objectValue(record, 'addressLine1', 'line1', 'diaChiLine1'),
      objectValue(record?.diaChiParts, 'line1', 'street'),
      objectValue(record, 'street', 'diaChiStreet'),
      parsed.street
    )
    const line2 = firstValue(objectValue(record, 'addressLine2', 'line2', 'diaChiLine2'), parsed.line2)
    const line2IsLocal = isLocalAddressPart(line2)
    const city = firstValue(
      explicitCountry === 'VIETNAM' ? objectValue(record?.diaChiParts, 'city', 'cityTown', 'town', 'thanhPho') : '',
      objectValue(record, 'city', 'cityTown', 'town', 'thanhPho', 'huyen', 'diaChiCity'),
      objectValue(record?.diaChiParts, 'city', 'cityTown', 'town', 'thanhPho'),
      parsed.city
    )
    const state = firstValue(
      objectValue(record, 'state', 'province', 'stateProvince', 'tinh', 'diaChiProvince', 'diaChiState'),
      objectValue(record?.diaChiParts, 'province', 'state', 'stateProvince', 'tinh'),
      parsed.province
    )
    const zip = firstValue(
      zipOnlyValue(
        objectValue(record, 'zipCode', 'postalCode', 'postal', 'diaChiZipCode', 'diaChiZip', 'zip'),
        objectValue(record?.diaChiParts, 'zip', 'zipCode', 'postalCode')
      ),
      zipOnlyValue(parsed.zip)
    )

    const country = firstValue(countryFromAddress, explicitCountry, inferUSCountryFromParts({ line1, city, state, zip, fullAddress }))
    const normalizedState = normalizeHoChiMinhProvince(city, state, country)
    const normalizedCity = isHoChiMinhAddressPart(city) && normalizedState === 'Hồ Chí Minh' ? 'Hồ Chí Minh' : city

    const parts = {
      employer: cleanEmployerName(firstValue(
        objectValue(record, 'employer', 'company', 'companyName', 'tenCongTy', 'employerName', 'currentEmployerName'),
        objectValue(record, 'name')
      )),
      country,
      line1: line2IsLocal ? [line1, line2].filter(Boolean).join(', ') : line1,
      line2: line2IsLocal ? '' : line2,
      city: normalizedCity,
      state: normalizedState,
      zip,
      occupation: firstValue(objectValue(record, 'occupation', 'job', 'profession', 'title', 'ngheNghiep')),
      from: firstValue(objectValue(record, 'from', 'start', 'startDate', 'ngayNhanViec', 'ngayBatDau')),
      to: firstValue(objectValue(record, 'to', 'end', 'endDate', 'ngayNghiViec', 'ngayKetThuc')) || (firstValue(objectValue(record, 'from', 'start', 'startDate', 'ngayNhanViec', 'ngayBatDau')) ? 'PRESENT' : '')
    }

    if (isUnemployedText(parts.employer)) {
      parts.country = ''
      parts.line1 = ''
      parts.line2 = ''
      parts.city = ''
      parts.state = ''
      parts.zip = ''
      parts.occupation = ''
    }

    return parts
  }
  const cellTextValue = (cell) => String(cell?.innerHTML || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const fillHoChiMinhStateFromCityRows = (rows, blockSize = EMPLOYMENT_FIELD_KEYS.length) => {
    if (!Array.isArray(rows) || !rows.length) return

    const cityIndex = EMPLOYMENT_FIELD_KEYS.indexOf('city')
    const stateIndex = EMPLOYMENT_FIELD_KEYS.indexOf('state')
    if (cityIndex < 0 || stateIndex < 0) return

    for (let index = 0; index + blockSize <= rows.length; index += blockSize) {
      const blockRows = rows.slice(index, index + blockSize)
      const cityCell = getDataCell(blockRows[cityIndex])
      const stateCell = getDataCell(blockRows[stateIndex])
      const cityText = cellTextValue(cityCell)
      const stateText = cellTextValue(stateCell)

      if (isHoChiMinhAddressPart(cityText) && !stateText) {
        setFilledCell(stateCell, 'Hồ Chí Minh', 'state')
      }
    }
  }
  const getFlatJobRecord = (blockNumber) => {
    const sfx = String(blockNumber).padStart(2, '0')
    return {
      employer: firstValue(data[`employer${blockNumber}Name`], data[`petitionerEmployer${blockNumber}Name`], data[`companyName${sfx}`]),
      companyName: firstValue(data[`employer${blockNumber}Name`], data[`petitionerEmployer${blockNumber}Name`], data[`companyName${sfx}`]),
      address: firstValue(data[`petitionerEmployer${blockNumber}Address`], data[`employer${blockNumber}Address`], data[`companyAddress${sfx}`]),
      addressLine1: firstValue(data[`petitionerEmployer${blockNumber}AddressLine1`], data[`employer${blockNumber}AddressLine1`], data[`companyAddress${sfx}Street`], data[`companyAddress${sfx}Line1`]),
      addressLine2: firstValue(data[`petitionerEmployer${blockNumber}AddressLine2`], data[`employer${blockNumber}AddressLine2`], data[`companyAddress${sfx}Line2`], data[`companyAddress${sfx}Street2`]),
      city: firstValue(data[`petitionerEmployer${blockNumber}City`], data[`employer${blockNumber}City`], data[`companyAddress${sfx}City`]),
      state: firstValue(data[`petitionerEmployer${blockNumber}State`], data[`employer${blockNumber}State`], data[`companyAddress${sfx}Province`], data[`companyAddress${sfx}State`]),
      zipCode: firstValue(data[`petitionerEmployer${blockNumber}ZipCode`], data[`employer${blockNumber}ZipCode`], data[`companyZipCode${sfx}`], data[`companyAddress${sfx}ZipCode`], data[`companyAddress${sfx}PostalCode`]),
      country: firstValue(data[`petitionerEmployer${blockNumber}Country`], data[`employer${blockNumber}Country`], data[`companyAddress${sfx}Country`]),
      occupation: firstValue(data[`employer${blockNumber}Occupation`], data[`petitionerEmployer${blockNumber}Occupation`], data[`occupationTitle${sfx}`]),
      from: firstValue(data[`employer${blockNumber}From`], data[`petitionerEmployer${blockNumber}From`], data[`occupationFrom${sfx}`], data[`employmentStartDate${sfx}`]),
      to: firstValue(data[`employer${blockNumber}To`], data[`petitionerEmployer${blockNumber}To`], data[`occupationTo${sfx}`], data[`employmentEndDate${sfx}`]) || (firstValue(data[`employer${blockNumber}From`], data[`petitionerEmployer${blockNumber}From`], data[`occupationFrom${sfx}`], data[`employmentStartDate${sfx}`]) ? 'PRESENT' : '')
    }
  }
  const findHeadingRow = (needle) => {
    const target = normalizePlainText(needle)
    return Array.from(tbody.querySelectorAll('tr')).find(row => normalizePlainText(row.textContent).includes(target)) || null
  }
  const getRowsUntilNextHeading = (headingRow) => {
    const rows = []
    let curr = headingRow?.nextElementSibling
    while (curr) {
      if (isSectionHeading(curr)) break
      rows.push(curr)
      curr = curr.nextElementSibling
    }
    return rows
  }
  const updateRowNumber = (row, blockNumber) => {
    const labelCell = Array.from(row.children).find(td => {
      if (td.classList.contains('data-cell') || td.classList.contains('note-cell')) return false
      return /\(\d+\)/.test(td.textContent || '')
    })
    if (labelCell) labelCell.innerHTML = labelCell.innerHTML.replace(/\(\d+\)/, `(${blockNumber})`)
  }
  // Do not auto-sort when the employer/name cell changes.
  // When staff types UNEMPLOYED first and fills From/To later, sorting immediately on employer blur
  // moves the whole block before it is complete and makes rows appear to jump around.
  // Keep initial data sorted, but only re-sort manually edited blocks after date fields are changed.
  // Chỉ UNEMPLOYED mới được xóa địa chỉ/nghề nghiệp. HOMEMAKER/RETIRED/STUDENT... nhân viên vẫn
  // có thể điền địa chỉ; nếu coi như UNEMPLOYED thì sort lúc load lại sẽ xóa mất dữ liệu đã lưu.
  const isUnemployedText = (value) => {
    const text = normalizePlainText(value)
    return text === 'UNEMPLOYED' || text === 'THAT NGHIEP' || text === 'KHONG CO VIEC LAM'
  }
  const bindEmploymentSortOnBlur = (cell) => {
    if (!cell || mode === 'view' || sortBoundCells.has(cell)) return

    sortBoundCells.add(cell)

    cell.addEventListener('blur', () => {
      setTimeout(() => {
        sortEmploymentBlocksByDate()
      }, 100)
    })
  }
  const bindOldAddressSortOnBlur = (cell) => {
    if (!cell || mode === 'view' || sortBoundCells.has(cell)) return

    sortBoundCells.add(cell)

    cell.addEventListener('blur', () => {
      setTimeout(() => {
        sortOldAddressBlocksByDate()
      }, 100)
    })
  }
  const bindCurrentEmploymentOnBlur = (cell) => {
    if (!cell || mode === 'view' || sortBoundCells.has(cell)) return

    sortBoundCells.add(cell)

    cell.addEventListener('blur', () => {
      setTimeout(() => {
        normalizeCurrentEmploymentUnemployedBlocks()
      }, 100)
    })
  }
  const tagBlockCell = (cell, blockType, blockNumber, fieldKey) => {
    if (!cell || !blockType) return
    cell.dataset.i130aBlockType = blockType
    cell.dataset.i130aBlockNumber = String(blockNumber)
    cell.dataset.i130aFieldKey = fieldKey
    if (blockType === 'employment' && isEmploymentSortTriggerField(fieldKey)) {
      bindEmploymentSortOnBlur(cell)
    }
    if (blockType === 'old_address' && isEmploymentSortTriggerField(fieldKey)) {
      bindOldAddressSortOnBlur(cell)
    }
    if (blockType === 'current_employment' && fieldKey === 'employer') {
      bindCurrentEmploymentOnBlur(cell)
    }
  }

  const setFilledCell = (cell, value, fieldKey = '') => {
    if (!cell || !hasValue(value)) return
    const rawValue = isI130DateField(fieldKey) ? formatI130DateMMDDYYYY(value) : value
    const normalizedValue = normalizeText(String(rawValue))
    cell.innerHTML = normalizedValue
    cell.dataset.filled = 'true'
    cell.dataset.filledValue = normalizedValue
    if (isI130DateField(fieldKey)) cell.dataset.i130DateFormatted = 'true'
    cell.classList.remove('color-filler', 'color-reviewer', 'modified')
    cell.classList.add('color-customer')
  }
  const clearEditableCell = (cell) => {
    if (!cell) return
    cell.innerHTML = ''
    cell.dataset.originalHtml = ''
    delete cell.dataset.filled
    delete cell.dataset.filledValue
    delete cell.dataset.submittedValue
    cell.classList.remove('color-customer', 'color-filler', 'color-reviewer', 'modified')
  }
  const setStableDynamicCellId = (cell, role, blockType, blockNumber, fieldKey, options = {}) => {
    if (!cell || !blockType) return

    const shouldMigrate = options.migrate !== false
    const nextCellId = `${role}_i130a_${blockType}_${blockNumber}_${fieldKey}`
    const previousCellId = cell.dataset.cellId
    if (previousCellId && previousCellId !== nextCellId) {
      if (shouldMigrate && !cell.dataset.legacyCellId) cell.dataset.legacyCellId = previousCellId
      if (!shouldMigrate) delete cell.dataset.legacyCellId
      const savedChanges = changeRef.value || {}
      if (shouldMigrate && savedChanges[nextCellId] === undefined && savedChanges[previousCellId] !== undefined) {
        savedChanges[nextCellId] = savedChanges[previousCellId]
      }
    }

    cell.dataset.cellId = nextCellId
    tagBlockCell(cell, blockType, blockNumber, fieldKey)
  }
  const setupExistingRows = (rows, fieldSpecs) => {
    fieldSpecs.forEach((field, index) => {
      const row = rows[index]
      if (!row) return
      updateRowNumber(row, field.blockNumber)
      setStableDynamicCellId(getDataCell(row), 'data', field.blockType, field.blockNumber, field.key)
      setStableDynamicCellId(getNoteCell(row), 'note', field.blockType, field.blockNumber, field.key)
    })
  }
  const bindDynamicI130ACell = (td) => {
    if (td.classList.contains('data-cell')) {
      td.setAttribute('contenteditable', mode === 'create' ? 'true' : 'false')
      if (mode === 'create') {
        td.addEventListener('focus', function () {
          if (this.innerHTML === (this.dataset.originalHtml || '') && !this.dataset.filled) {
            this.innerHTML = ''
          }
        })
        td.addEventListener('blur', function () {
          const val = this.innerHTML.trim()
          if (!val || val === '<br>') {
            const wasFilled = this.dataset.filled === 'true'
            this.innerHTML = this.dataset.originalHtml || ''
            this.classList.remove('color-filler', 'color-customer', 'modified', 'color-reviewer')
            if (wasFilled) changeRef.value[this.dataset.cellId] = '__CLEARED__'
            else delete changeRef.value[this.dataset.cellId]
          } else if (this.dataset.filled && val === this.dataset.filledValue) {
            this.classList.remove('color-filler', 'modified', 'color-reviewer')
            this.classList.add('color-customer')
            delete changeRef.value[this.dataset.cellId]
          } else {
            this.classList.remove('color-customer', 'color-reviewer')
            this.classList.add('color-filler', 'modified')
            changeRef.value[this.dataset.cellId] = val
          }
          emitChange()
          updateCorrectionCountDisplay()
        })
      }
    }

    if (td.classList.contains('note-cell')) {
      td.setAttribute('contenteditable', mode === 'review' ? 'true' : 'false')
      if (mode === 'review') {
        td.addEventListener('input', function () {
          const val = this.innerHTML.trim()
          if (!val || val === '<br>') {
            this.classList.remove('color-reviewer')
            delete changeRef.value[this.dataset.cellId]
          } else {
            this.classList.remove('color-customer', 'color-filler')
            this.classList.add('color-reviewer')
            changeRef.value[this.dataset.cellId] = val
          }
          emitChange()
          updateCorrectionCountDisplay()
        })
      }
    }
  }
  const setupClonedRow = (row, blockType, blockNumber, fieldKey) => {
    row.classList.add(`dynamic-i130a-${blockType}-row`)
    updateRowNumber(row, blockNumber)

    const dataCell = getDataCell(row)
    const noteCell = getNoteCell(row)
    if (dataCell) {
      setStableDynamicCellId(dataCell, 'data', blockType, blockNumber, fieldKey, { migrate: false })
      clearEditableCell(dataCell)
      bindDynamicI130ACell(dataCell)
    }
    if (noteCell) {
      setStableDynamicCellId(noteCell, 'note', blockType, blockNumber, fieldKey, { migrate: false })
      clearEditableCell(noteCell)
      bindDynamicI130ACell(noteCell)
    }
  }
  const fillRows = (rows, fieldSpecs, record, shouldClear = false) => {
    if (!rows.length) return
    fieldSpecs.forEach((field, index) => {
      const row = rows[index]
      if (!row) return
      updateRowNumber(row, field.blockNumber)
      const dataCell = getDataCell(row)
      const noteCell = getNoteCell(row)
      setStableDynamicCellId(dataCell, 'data', field.blockType, field.blockNumber, field.key)
      setStableDynamicCellId(noteCell, 'note', field.blockType, field.blockNumber, field.key)
      if (shouldClear) {
        clearEditableCell(dataCell)
        clearEditableCell(noteCell)
      }
      setFilledCell(dataCell, field.value(record), field.key)
    })
  }
  const getSavedCount = (changeMap, blockType) => {
    if (!changeMap) return 0
    const pattern = new RegExp(`^(?:data|note)_i130a_${blockType}_(\\d+)_`)
    return Object.keys(changeMap).reduce((max, key) => {
      const match = key.match(pattern)
      return match ? Math.max(max, parseInt(match[1], 10) || 0) : max
    }, 0)
  }
  const createAddButton = (className, title, onClick) => {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = className
    btn.textContent = '+'
    btn.title = title
    btn.style.cssText = [
      'float:right',
      'width:22px',
      'height:22px',
      'line-height:18px',
      'margin-left:8px',
      'border:1px solid #16a34a',
      'border-radius:4px',
      'background:#dcfce7',
      'color:#166534',
      'font-size:16px',
      'font-weight:700',
      'font-family:Arial,sans-serif',
      'cursor:pointer',
      'padding:0'
    ].join(';')
    btn.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      onClick()
      emitChange()
      updateCorrectionCountDisplay()
    })
    return btn
  }

  
  const PRESENT_SORT_TIME = new Date('9999-12-31T00:00:00Z').getTime()
  const parseSortDate = (d) => {
    const str = String(d || '').trim()
    const key = normalizePlainText(str)
    if (!key || ['PRESENT', 'HIEN TAI', 'NOW', 'CURRENT', 'NAY'].includes(key)) return PRESENT_SORT_TIME

    const parts = str.split(/[/-]/).map(part => part.trim()).filter(Boolean)
    if (parts.length === 3) {
      let year = ''
      let month = ''
      let day = ''

      if (parts[0].length === 4) {
        year = parts[0]
        month = parts[1]
        day = parts[2]
      } else {
        const first = parseInt(parts[0], 10)
        const second = parseInt(parts[1], 10)
        year = parts[2]
        if (first <= 12) {
          month = parts[0]
          day = parts[1]
        } else {
          day = parts[0]
          month = parts[1]
        }
      }

      const time = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`).getTime()
      return Number.isNaN(time) ? 0 : time
    }

    const time = new Date(str).getTime()
    return Number.isNaN(time) ? 0 : time
  }

  function sortEmploymentBlocksByDate() {
    // Ở mode 'view' (phiếu đã kiểm tra) vẫn phải sắp xếp lại thứ tự hiển thị:
    // sort chỉ đổi vị trí hàng trong DOM chứ không đổi cellId, nên dữ liệu lưu lại
    // vẫn nằm theo thứ tự khối gốc. Nếu bỏ qua sort ở đây thì phiếu đã kiểm tra
    // hiện các mốc thời gian theo thứ tự nhập, không theo thứ tự thời gian.
    // Chỉ bỏ qua các thao tác ghi dữ liệu (normalize UNEMPLOYED, emitChange) ở mode view.
    const readOnly = mode === 'view'

    const employmentHeading = findHeadingRow('VIEC LAM TRONG 5 NAM QUA')
    if (!employmentHeading) return

    const rows = getRowsUntilNextHeading(employmentHeading)
    const blockSize = EMPLOYMENT_FIELD_KEYS.length

    if (rows.length < blockSize) return

    const htmlToPlainText = (value) => String(value || '')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    const cleanCellHtml = (cell) => {
      const value = String(cell?.innerHTML || '').trim()
      return value === '<br>' ? '' : value
    }

    const setCellHtml = (cell, value) => {
      if (!cell) return
      const normalizedValue = String(value || '').trim()
      cell.innerHTML = normalizedValue

      if (normalizedValue) {
        cell.dataset.filled = 'true'
        cell.dataset.filledValue = normalizedValue
      } else {
        cell.innerHTML = ''
        delete cell.dataset.filled
        delete cell.dataset.filledValue
      }
    }

    const readDataText = (row) => {
      const cell = getDataCell(row)
      return htmlToPlainText(cleanCellHtml(cell))
    }

    const normalizeUnemployedBlockRows = (blockRows) => {
      const employerText = readDataText(blockRows[0])
      if (!isUnemployedText(employerText)) return

      ;['country', 'line1', 'line2', 'city', 'state', 'zip', 'occupation'].forEach(fieldKey => {
        const fieldIndex = EMPLOYMENT_FIELD_KEYS.indexOf(fieldKey)
        const row = blockRows[fieldIndex]
        const dataCell = getDataCell(row)
        const noteCell = getNoteCell(row)

        if (dataCell) {
          // Xoá trên màn hình thôi là chưa đủ: delete changeRef.value[...] không để lại dấu vết nào
          // trong bản nháp, nên mục "Đã kiểm tra" (mode view) đổ lại data gốc. Ô vốn có data khách
          // hàng phải ghi marker __CLEARED__ y như thao tác xoá tay.
          const dataCellId = dataCell.dataset.cellId
          const filledValue = dataCell.dataset.filledValue
          const hadCustomerData = dataCell.dataset.filled === 'true' && String(filledValue || '').trim()
          setCellHtml(dataCell, '')
          // setCellHtml('') xoá luôn dataset.filled/filledValue. Phải khôi phục, nếu không blur sau
          // đó thấy ô "trống và chưa từng có data" rồi xoá mất chính marker vừa ghi.
          if (hadCustomerData) {
            dataCell.dataset.filled = 'true'
            dataCell.dataset.filledValue = filledValue
          }
          dataCell.classList.remove('color-customer', 'color-filler', 'color-reviewer', 'modified')
          if (dataCellId && !readOnly) {
            // Ở mode 'review' changeRef là map của tư vấn: ghi __CLEARED__ vào đó là đếm nhầm các ô
            // này thành lỗi tư vấn, nên chỉ người xử lý mới được ghi marker.
            if (hadCustomerData && mode === 'create') changeRef.value[dataCellId] = '__CLEARED__'
            else delete changeRef.value[dataCellId]
          }
        }

        if (noteCell && !readOnly) {
          setCellHtml(noteCell, '')
          noteCell.classList.remove('color-customer', 'color-filler', 'color-reviewer', 'modified')
          delete changeRef.value[noteCell.dataset.cellId]
        }
      })
    }

    const blocks = []

    for (let index = 0; index + blockSize <= rows.length; index += blockSize) {
      const blockRows = rows.slice(index, index + blockSize)
      normalizeUnemployedBlockRows(blockRows)

      const values = {}

      EMPLOYMENT_FIELD_KEYS.forEach((fieldKey, fieldIndex) => {
        values[fieldKey] = readDataText(blockRows[fieldIndex])
      })

      const fromValue = values.from || ''
      const toValue = values.to || ''
      const hasData = EMPLOYMENT_FIELD_KEYS.some(fieldKey => values[fieldKey])

      blocks.push({
        rows: blockRows,
        values,
        hasData,
        originalIndex: blocks.length,
        sortTo: toValue || (fromValue ? 'PRESENT' : ''),
        sortFrom: fromValue
      })
    }

    if (blocks.length <= 1) return

    const sortedBlocks = blocks.slice().sort((a, b) => {
      if (a.hasData !== b.hasData) return a.hasData ? -1 : 1
      if (!a.hasData && !b.hasData) return a.originalIndex - b.originalIndex

      const endDiff = parseSortDate(b.sortTo) - parseSortDate(a.sortTo)
      if (endDiff) return endDiff

      const startDiff = parseSortDate(b.sortFrom) - parseSortDate(a.sortFrom)
      if (startDiff) return startDiff

      return a.originalIndex - b.originalIndex
    })

    let insertAfter = employmentHeading

    sortedBlocks.forEach((block, blockIndex) => {
      const displayBlockNumber = blockIndex + 1

      block.rows.forEach((row, rowIndex) => {
        insertAfter.parentNode.insertBefore(row, insertAfter.nextSibling)
        insertAfter = row

        // Reorder rows visually, but keep the stable cell ids attached to the logical job record.
        // Re-keying employment_3 into employment_1 after a sort makes the next reload apply an
        // added draft job over the original first job from the form data.
        updateRowNumber(row, displayBlockNumber)
      })
    })

    if (readOnly) return

    emitChange()
    updateCorrectionCountDisplay()
  }

  function sortOldAddressBlocksByDate() {
    const readOnly = mode === 'view'

    const oldAddressHeadingRow = findHeadingRow('DIA CHI CU TRONG 5 NAM QUA')
    if (!oldAddressHeadingRow) return

    const rows = getRowsUntilNextHeading(oldAddressHeadingRow)
    const blockSize = OLD_ADDRESS_FIELD_KEYS.length

    if (rows.length < blockSize) return

    const htmlToPlainText = (value) => String(value || '')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    const cleanCellHtml = (cell) => {
      const value = String(cell?.innerHTML || '').trim()
      return value === '<br>' ? '' : value
    }

    const readDataText = (row) => htmlToPlainText(cleanCellHtml(getDataCell(row)))

    const blocks = []

    for (let index = 0; index + blockSize <= rows.length; index += blockSize) {
      const blockRows = rows.slice(index, index + blockSize)
      const values = {}

      OLD_ADDRESS_FIELD_KEYS.forEach((fieldKey, fieldIndex) => {
        values[fieldKey] = readDataText(blockRows[fieldIndex])
      })

      const fromValue = values.from || ''
      const toValue = values.to || ''
      const hasData = OLD_ADDRESS_FIELD_KEYS.some(fieldKey => values[fieldKey])

      blocks.push({
        rows: blockRows,
        values,
        hasData,
        originalIndex: blocks.length,
        sortTo: toValue || (fromValue ? 'PRESENT' : ''),
        sortFrom: fromValue
      })
    }

    if (blocks.length <= 1) return

    const sortedBlocks = blocks.slice().sort((a, b) => {
      if (a.hasData !== b.hasData) return a.hasData ? -1 : 1
      if (!a.hasData && !b.hasData) return a.originalIndex - b.originalIndex

      const endDiff = parseSortDate(b.sortTo) - parseSortDate(a.sortTo)
      if (endDiff) return endDiff

      const startDiff = parseSortDate(b.sortFrom) - parseSortDate(a.sortFrom)
      if (startDiff) return startDiff

      return a.originalIndex - b.originalIndex
    })

    let insertAfter = oldAddressHeadingRow

    sortedBlocks.forEach((block, blockIndex) => {
      const displayBlockNumber = blockIndex + 1

      block.rows.forEach(row => {
        insertAfter.parentNode.insertBefore(row, insertAfter.nextSibling)
        insertAfter = row
        updateRowNumber(row, displayBlockNumber)
      })
    })

    if (readOnly) return

    emitChange()
    updateCorrectionCountDisplay()
  }

  const toRecordList = (value) => {
    if (Array.isArray(value)) return value.filter(recordHasValue)
    return recordHasValue(value) ? [value] : []
  }
  const normalizeCaseValue = (value) => normalizePlainText(value)
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
  const getPetitionRelationship = () => {
    const raw = firstValue(
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
    )
    const text = normalizeCaseValue(raw)

    if (text.includes('CON GAI') || text.includes('CON CAI') || text.includes('CHILD') || text.includes('SON') || text.includes('DAUGHTER')) return 'CHILD'
    if (text.includes('CHA ME') || text.includes('PARENT') || text.includes('FATHER') || text.includes('MOTHER')) return 'PARENT'
    if (text.includes('ANH CHI EM') || text.includes('SIBLING') || text.includes('BROTHER') || text.includes('SISTER')) return 'SIBLING'
    if (text.includes('VO CHONG') || text.includes('SPOUSE') || text.includes('WIFE') || text.includes('HUSBAND') || text.includes('CR1') || text.includes('IR1')) return 'SPOUSE'

    return ''
  }
  const splitFamilyName = (...values) => {
    const direct = values.find(value => value && typeof value === 'object' && !Array.isArray(value)) || {}
    const family = firstValue(objectValue(direct, 'family', 'familyName', 'lastName', 'surname', 'ho', 'ten_ho'))
    const middle = firstValue(objectValue(direct, 'middle', 'middleName', 'tenDem', 'tenLot', 'ten_tenLot'))
    const given = firstValue(objectValue(direct, 'given', 'givenName', 'firstName', 'ten_ten', 'ten'))
    const countryHint = firstValue(
      countryOnlyValue(objectValue(direct, 'birthCountry', 'countryOfBirth', 'quocGiaSinh')),
      countryOnlyValue(objectValue(direct, 'noiSinh', 'birthPlace', 'placeOfBirth'))
    )
    const useWesternOrder = countryHint && countryHint !== 'VIETNAM'

    if (family || middle || given) {
      const givenText = String(given || '').replace(/\s+/g, ' ').trim()
      if (givenText.includes(' ')) {
        const givenKey = normalizeCaseValue(givenText)
        const familyKey = normalizeCaseValue(family)
        const familyMiddleKey = normalizeCaseValue([family, middle].filter(Boolean).join(' '))
        const givenLooksLikeFullName = !family ||
          (!!familyMiddleKey && givenKey.startsWith(`${familyMiddleKey} `)) ||
          (!!familyKey && givenKey.startsWith(`${familyKey} `))

        if (givenLooksLikeFullName) return splitNameParts(givenText, useWesternOrder)
      }
      return { family, middle, given }
    }

    const raw = firstValue(...values.map(value => {
      if (Array.isArray(value)) return ''
      if (value && typeof value === 'object') {
        return firstValue(
          value.fullName,
          value.full_name,
          value.name,
          value.hoTen,
          value.ten,
          value.tenTrenGiayTo
        )
      }
      return value
    }))
    return splitNameParts(raw, useWesternOrder)
  }
  const countryFromPlace = (value) => {
    const raw = firstValue(value)
    if (!raw) return ''
    const parts = String(raw).split(/,|;/).map(part => part.trim()).filter(Boolean)
    return parts.length > 1 ? parts[parts.length - 1] : ''
  }
  const explicitPetitionerSource = recordHasValue(data.petitionerData) ? data.petitionerData : (recordHasValue(data.nguoiBaoLanh) ? data.nguoiBaoLanh : {})
  const explicitBeneficiarySource = recordHasValue(data.beneficiaryData) ? data.beneficiaryData : (recordHasValue(data.nguoiDuocBaoLanh) ? data.nguoiDuocBaoLanh : {})
  const hasSeparatedSources = recordHasValue(explicitPetitionerSource) || recordHasValue(explicitBeneficiarySource)

  const optionKey = (value) => String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toUpperCase()
    .replace(/[^A-Z0-9.,]+/g, ' ')
    .trim()

  const formScope = optionKey(firstValue(data.formType, data.form_type, data.formSlug, data.form_slug, data.type))
  const isBeneficiaryOnlyForm = !hasSeparatedSources && (
    formScope.includes('NDBL') ||
    formScope.includes('NGUOI DUOC BAO LANH') ||
    formScope.includes('BENEFICIARY') ||
    !!(data.passport || data.diaChiNhanThuVN || data.noiCapPassport)
  )
  const isPetitionerOnlyForm = !hasSeparatedSources && !isBeneficiaryOnlyForm && (
    formScope.includes('NBL') ||
    formScope.includes('BAO LANH') ||
    formScope.includes('PETITIONER') ||
    formScope.includes('I130')
  )

  const petitionerSource = hasSeparatedSources
    ? explicitPetitionerSource
    : (isPetitionerOnlyForm ? data : {})
  const beneficiarySource = hasSeparatedSources
    ? explicitBeneficiarySource
    : (isBeneficiaryOnlyForm ? data : {})

  const petitionerFlatFallback = hasSeparatedSources ? {} : (isPetitionerOnlyForm ? data : {})
  const beneficiaryFlatFallback = hasSeparatedSources ? {} : (isBeneficiaryOnlyForm ? data : {})
  const normalizeFamilyMemberRecord = (record = {}, fallbackRelationship = '') => {
    const name = splitFamilyName(record)
    const birthPlace = firstValue(
      objectValue(record, 'birthPlace', 'placeOfBirth', 'noiSinh'),
      objectValue(record, 'childBirthPlace', 'spouseBirthPlace')
    )

    return {
      given: firstValue(objectValue(record, 'given', 'givenName', 'firstName', 'ten_ten'), name.given),
      middle: firstValue(objectValue(record, 'middle', 'middleName', 'tenDem', 'ten_tenLot'), name.middle),
      family: firstValue(objectValue(record, 'family', 'familyName', 'lastName', 'surname', 'ten_ho'), name.family),
      relationship: firstValue(
        objectValue(record, 'relationship', 'relation', 'moiQuanHe', 'quanHe', 'relationshipToBeneficiary'),
        fallbackRelationship
      ),
      birthDate: firstValue(
        objectValue(record, 'birthDate', 'dateOfBirth', 'dob', 'ngaySinh', 'childBirthDate', 'spouseBirthDate')
      ),
      birthCountry: firstValue(
        objectValue(record, 'birthCountry', 'countryOfBirth', 'quocGiaSinh', 'childBirthCountry', 'spouseBirthCountry'),
        countryFromPlace(birthPlace)
      )
    }
  }
  const getFlatChildFamilyRecord = (index) => {
    const compact = String(index)
    const padded = compact.padStart(2, '0')
    const fullName = firstValue(
      data[`child${compact}FullName`],
      data[`childFullName${padded}`],
      data[`childName${compact}`],
      data[`childName${padded}`]
    )
    const splitName = splitFamilyName(fullName)

    return {
      given: firstValue(data[`child${compact}GivenName`], data[`childGivenName${padded}`], splitName.given),
      middle: firstValue(data[`child${compact}MiddleName`], data[`childMiddleName${padded}`], splitName.middle),
      family: firstValue(data[`child${compact}FamilyName`], data[`child${compact}Surname`], data[`childSurname${padded}`], splitName.family),
      relationship: firstValue(data[`child${compact}Relationship`], data[`childRelationship${padded}`]),
      birthDate: firstValue(data[`child${compact}BirthDate`], data[`childBirthDate${padded}`]),
      birthCountry: firstValue(data[`child${compact}BirthCountry`], data[`childCountry${padded}`], data[`childNationality${padded}`])
    }
  }
  const getBeneficiaryFamilyRecords = () => {
    const relationship = getPetitionRelationship()
    const directRecords = [
      ...toRecordList(data.beneficiaryFamilyMembers),
      ...toRecordList(data.beneficiaryFamilyList),
      ...(hasSeparatedSources ? [] : toRecordList(data.familyMembers)),
      ...(hasSeparatedSources ? [] : toRecordList(data.thongTinGiaDinh)),
      ...toRecordList(beneficiarySource.beneficiaryFamilyMembers),
      ...toRecordList(beneficiarySource.familyMembers),
      ...toRecordList(beneficiarySource.thongTinGiaDinh)
    ].map(record => normalizeFamilyMemberRecord(record)).filter(recordHasValue)

    const spouseRecord = firstRecordList(
      data.beneficiaryCurrentSpouse,
      beneficiarySource.beneficiaryCurrentSpouse,
      beneficiarySource.currentSpouse,
      beneficiarySource.honPhoiHienTai,
      hasSeparatedSources ? [] : data.currentSpouse,
      hasSeparatedSources ? [] : data.honPhoiHienTai
    )[0]
    const beneficiaryMaritalStatus = firstValue(
      data.beneficiaryMaritalStatus,
      beneficiarySource.beneficiaryMaritalStatus,
      beneficiarySource.tinhTrangHonNhan,
      hasSeparatedSources ? '' : data.tinhTrangHonNhan,
      hasSeparatedSources ? '' : data.maritalStatus
    )
    const isMarried = (status) => {
      if (!status) return false
      const key = String(status).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').replace(/Đ/gi, 'D').toUpperCase()
      if (['DOC THAN', 'CHUA BAO GIO', 'CHUA KET HON', 'SINGLE', 'NEVER MARRIED'].some(word => key.includes(word))) return false
      return ['KET HON', 'MARRIED', 'TAI HON', 'REMARRIED'].some(word => key.includes(word))
    }
    const hasSpouse = recordHasValue(spouseRecord) || isMarried(beneficiaryMaritalStatus)
    const norm = (val) => String(val || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').replace(/Đ/gi, 'D').toUpperCase().trim()
    const isSameAsPetitioner = (name) => {
      if (!name) return false
      const n1 = norm(name)
      return [
        data.petitionerFullName,
        data.fullName,
        data.sponsorFullName,
        data.petitionerName,
        petitionerSource.fullName,
        petitionerSource.petitionerFullName
      ].some(pName => pName && norm(pName) === n1)
    }

    const spouseFullNameVal = relationship === 'SPOUSE'
      ? firstValue(data.beneficiaryCurrentSpouseName, data.currentSpouseFullName, data.spouseFullName, data.spouseName)
      : firstValue(
          beneficiarySource.beneficiaryCurrentSpouseName,
          objectValue(spouseRecord, 'fullName', 'full_name', 'name', 'hoTen', 'ten', 'tenTrenGiayTo'),
          !isSameAsPetitioner(data.beneficiaryCurrentSpouseName) ? data.beneficiaryCurrentSpouseName : '',
          hasSeparatedSources ? '' : data.currentSpouseFullName,
          hasSeparatedSources ? '' : data.spouseFullName,
          hasSeparatedSources ? '' : data.spouseName
        )

    const spouseFamilyRecord = recordHasValue(spouseRecord)
      ? normalizeFamilyMemberRecord(spouseRecord, 'SPOUSE')
      : (hasSpouse && spouseFullNameVal
        ? normalizeFamilyMemberRecord({
            fullName: spouseFullNameVal,
            birthDate: firstValue(data.beneficiaryCurrentSpouseBirthDate, data.spouseBirthDate),
            birthCountry: firstValue(data.beneficiaryCurrentSpouseBirthCountry, data.spouseBirthCountry),
            birthPlace: firstValue(data.beneficiaryCurrentSpouseBirthPlace, data.spouseBirthPlace)
          }, 'SPOUSE')
        : null)

    const childRecords = [
      ...toRecordList(data.beneficiaryChildren),
      ...toRecordList(data.beneficiaryChildrenInfo),
      ...toRecordList(data.beneficiaryThongTinCon),
      ...(hasSeparatedSources ? [] : toRecordList(data.thongTinCon)),
      ...(hasSeparatedSources ? [] : toRecordList(data.children)),
      ...(hasSeparatedSources ? [] : toRecordList(data.childrenInfo)),
      ...(hasSeparatedSources ? [] : toRecordList(data.conCai)),
      ...toRecordList(data.k1ChildrenList),
      ...toRecordList(beneficiarySource.thongTinCon),
      ...toRecordList(beneficiarySource.children),
      ...toRecordList(beneficiarySource.childrenInfo),
      ...toRecordList(beneficiarySource.conCai),
      ...Array.from({ length: 10 }, (_, index) => getFlatChildFamilyRecord(index + 1)).filter(recordHasValue)
    ].map(record => normalizeFamilyMemberRecord(record, 'CHILD')).filter(recordHasValue)

    const beneficiaryFatherRecord = firstRecordList(
      beneficiarySource.thongTinCha,
      beneficiarySource.fatherInfo,
      beneficiarySource.father,
      beneficiarySource.cha,
      beneficiaryFlatFallback.thongTinCha,
      beneficiaryFlatFallback.fatherInfo,
      beneficiaryFlatFallback.father,
      beneficiaryFlatFallback.cha
    )[0]
    const fatherFamilyRecord = beneficiaryFatherRecord
      ? normalizeFamilyMemberRecord(beneficiaryFatherRecord, 'FATHER')
      : (beneficiarySource.fatherFullName || (!hasSeparatedSources && isBeneficiaryOnlyForm && data.fatherFullName)
        ? normalizeFamilyMemberRecord({
            fullName: firstValue(beneficiarySource.fatherFullName, hasSeparatedSources ? '' : data.fatherFullName),
            birthDate: firstValue(beneficiarySource.fatherBirthDate, hasSeparatedSources ? '' : data.fatherBirthDate),
            birthPlace: firstValue(beneficiarySource.fatherBirthPlace, hasSeparatedSources ? '' : data.fatherBirthPlace)
          }, 'FATHER')
        : null)

    const beneficiaryMotherRecord = firstRecordList(
      beneficiarySource.thongTinMe,
      beneficiarySource.motherInfo,
      beneficiarySource.mother,
      beneficiarySource.me,
      beneficiaryFlatFallback.thongTinMe,
      beneficiaryFlatFallback.motherInfo,
      beneficiaryFlatFallback.mother,
      beneficiaryFlatFallback.me
    )[0]
    const motherFamilyRecord = beneficiaryMotherRecord
      ? normalizeFamilyMemberRecord(beneficiaryMotherRecord, 'MOTHER')
      : (beneficiarySource.motherFullName || (!hasSeparatedSources && isBeneficiaryOnlyForm && data.motherFullName)
        ? normalizeFamilyMemberRecord({
            fullName: firstValue(beneficiarySource.motherFullName, hasSeparatedSources ? '' : data.motherFullName),
            birthDate: firstValue(beneficiarySource.motherBirthDate, hasSeparatedSources ? '' : data.motherBirthDate),
            birthPlace: firstValue(beneficiarySource.motherBirthPlace, hasSeparatedSources ? '' : data.motherBirthPlace)
          }, 'MOTHER')
        : null)

    const hideBeneficiaryParentInfo = ['PARENT', 'SIBLING'].includes(relationship)
    const parentRecords = hideBeneficiaryParentInfo ? [] : [fatherFamilyRecord, motherFamilyRecord]
    const records = [...directRecords, spouseFamilyRecord, ...childRecords, ...parentRecords].filter(recordHasValue)
    const normNameDob = (r) => norm(r.family + ' ' + r.given) + '|' + norm(r.birthDate)
    const isParentPetitionFamilyRelationship = (value) => {
      const key = normalizeCaseValue(value)
      const tokens = key.split(/\s+/).filter(Boolean)
      return key === 'SPOUSE' ||
        key.includes('VO CHONG') ||
        tokens.includes('WIFE') ||
        tokens.includes('HUSBAND') ||
        key.includes('CHILD') ||
        tokens.includes('CON') ||
        tokens.includes('SON') ||
        tokens.includes('DAUGHTER')
    }

    const filteredRecords = records.filter(record => {
      const recordRelationship = normalizeCaseValue(record.relationship)
      if (relationship === 'PARENT' && !isParentPetitionFamilyRelationship(recordRelationship)) {
        return false
      }
      if (hideBeneficiaryParentInfo && ['FATHER', 'MOTHER', 'PARENT'].includes(recordRelationship)) {
        return false
      }
      if (recordRelationship === 'SPOUSE') {
        const spouseKey = normNameDob(record)
        const hasParentMatch = records.some(r => 
          (r.relationship === 'FATHER' || r.relationship === 'MOTHER') &&
          normNameDob(r) === spouseKey
        )
        if (hasParentMatch) return false
      }
      return true
    })

    const seen = new Set()
    return filteredRecords.filter(record => {
      const key = [
        record.relationship,
        record.family,
        record.middle,
        record.given,
        record.birthDate
      ].map(value => normalizeCaseValue(value)).join('|')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }
  const createBeneficiaryFamilyRows = (blockNumber) => {
    const withReviewColumn = mode === 'review' || mode === 'view'
    const fields = [
      { key: 'given', label: 'Given name (first name)', value: item => item.given },
      { key: 'middle', label: 'Middle name', value: item => item.middle },
      { key: 'family', label: 'Family name (last name)', value: item => item.family },
      { key: 'relationship', label: 'What is their relationship to the beneficiary?', value: item => item.relationship },
      { key: 'birth_date', label: 'What is their date of birth?', value: item => item.birthDate },
      { key: 'birth_country', label: 'What is their country of birth?', value: item => item.birthCountry }
    ]

    return fields.map((field, index) => {
      const row = document.createElement('tr')
      row.className = `${index % 2 === 0 ? 'odd' : 'even'} dynamic-i130a-beneficiary_family-row`

      if (index === 0) {
        const numberCell = document.createElement('td')
        numberCell.rowSpan = fields.length
        numberCell.colSpan = 1
        numberCell.innerHTML = '<strong>16</strong>'
        numberCell.style.textAlign = 'center'
        numberCell.style.verticalAlign = 'top'
        row.appendChild(numberCell)

        const indexCell = document.createElement('td')
        indexCell.rowSpan = fields.length
        indexCell.colSpan = 1
        indexCell.innerHTML = `<strong>(${blockNumber})</strong>`
        indexCell.style.textAlign = 'center'
        indexCell.style.verticalAlign = 'top'
        indexCell.style.background = '#31599b'
        indexCell.style.color = '#fff'
        row.appendChild(indexCell)
      }

      const labelCell = document.createElement('td')
      labelCell.colSpan = 11
      labelCell.innerHTML = field.key === 'relationship'
        ? `<strong>${field.label}</strong>`
        : field.label
      row.appendChild(labelCell)

      const dataCell = document.createElement('td')
      dataCell.colSpan = 11
      dataCell.className = 'data-cell'
      dataCell.dataset.cellId = `data_i130a_beneficiary_family_${blockNumber}_${field.key}`
      clearEditableCell(dataCell)
      bindDynamicI130ACell(dataCell)
      row.appendChild(dataCell)

      if (withReviewColumn) {
        const noteCell = document.createElement('td')
        noteCell.colSpan = 11
        noteCell.className = 'note-cell'
        noteCell.dataset.cellId = `note_i130a_beneficiary_family_${blockNumber}_${field.key}`
        noteCell.dataset.submittedValue = ''
        clearEditableCell(noteCell)
        bindDynamicI130ACell(noteCell)
        row.appendChild(noteCell)
      }

      return row
    })
  }
  const beneficiaryFamilyHeading = findHeadingRow('CUOC HON NHAN TRUOC DAY CUA NGUOI DUOC BAO LANH')
  paperEl.querySelectorAll('tr.dynamic-i130a-beneficiary_family-row, tr.dynamic-i130a-beneficiary_family-heading-row').forEach(row => row.remove())
  if (beneficiaryFamilyHeading && ['PARENT', 'CHILD', 'SIBLING'].includes(getPetitionRelationship())) {
    const familyRecords = getBeneficiaryFamilyRecords()
    const previousMarriageRows = getRowsUntilNextHeading(beneficiaryFamilyHeading)
    const sectionColspan = mode === 'review' || mode === 'view' ? 35 : 24
    const headingRow = document.createElement('tr')
    headingRow.className = 'even dynamic-i130a-beneficiary_family-heading-row'
    const headingCell = document.createElement('td')
    headingCell.colSpan = sectionColspan
    headingCell.style.textAlign = 'center'
    headingCell.style.verticalAlign = 'middle'
    headingCell.style.background = '#dbe5f1'
    headingCell.innerHTML = '<strong>THÔNG TIN GIA ĐÌNH</strong>'
    headingRow.appendChild(headingCell)

    let insertRef = previousMarriageRows[previousMarriageRows.length - 1] || beneficiaryFamilyHeading
    insertRef.insertAdjacentElement('afterend', headingRow)
    insertRef = headingRow

    const fieldsForFamily = (blockNumber) => [
      { key: 'given', blockNumber, value: item => item.given },
      { key: 'middle', blockNumber, value: item => item.middle },
      { key: 'family', blockNumber, value: item => item.family },
      { key: 'relationship', blockNumber, value: item => item.relationship },
      { key: 'birth_date', blockNumber, value: item => item.birthDate },
      { key: 'birth_country', blockNumber, value: item => item.birthCountry }
    ]
    let renderedFamilyCount = 0
    const appendFamilyBlock = (blockNumber, record = null) => {
      const rows = createBeneficiaryFamilyRows(blockNumber)
      rows.forEach(row => {
        insertRef.insertAdjacentElement('afterend', row)
        insertRef = row
      })
      fillRows(rows, fieldsForFamily(blockNumber), record || {}, false)
      renderedFamilyCount = Math.max(renderedFamilyCount, blockNumber)
    }
    const familyCount = Math.max(
      1,
      familyRecords.length,
      getSavedCount(data._fillerChanges, 'beneficiary_family'),
      getSavedCount(data._reviewChanges, 'beneficiary_family')
    )

    for (let blockNumber = 1; blockNumber <= familyCount; blockNumber += 1) {
      appendFamilyBlock(blockNumber, familyRecords[blockNumber - 1] || null)
    }

    headingCell.querySelectorAll('.i130a-beneficiary-family-add-btn').forEach(btn => btn.remove())
    if (mode !== 'view') {
      headingCell.appendChild(createAddButton('i130a-beneficiary-family-add-btn', 'Them thanh vien gia dinh', () => {
        appendFamilyBlock(renderedFamilyCount + 1)
      }))
    }
  }

  const previousAddressRecords = firstRecordList(
    data.addresses5Years,
    data.diaChi5Nam,
    data.previousAddresses,
    data.previousAddressList
  ).slice().sort((a, b) => {
    const fromA = firstValue(objectValue(a, 'from', 'start', 'startDate', 'ngayBatDau'))
    const fromB = firstValue(objectValue(b, 'from', 'start', 'startDate', 'ngayBatDau'))
    const toA = firstValue(objectValue(a, 'to', 'end', 'endDate', 'ngayKetThuc', 'ngayChuyenDi')) || (fromA ? 'PRESENT' : '')
    const toB = firstValue(objectValue(b, 'to', 'end', 'endDate', 'ngayKetThuc', 'ngayChuyenDi')) || (fromB ? 'PRESENT' : '')
    const endDiff = parseSortDate(toB) - parseSortDate(toA)
    if (endDiff) return endDiff
    return parseSortDate(fromB) - parseSortDate(fromA)
  })
  const oldAddressHeading = findHeadingRow('DIA CHI CU TRONG 5 NAM QUA')
  const oldAddressRows = getRowsUntilNextHeading(oldAddressHeading).slice(0, 8)
  if (oldAddressHeading && oldAddressRows.length === 8) {
    paperEl.querySelectorAll('tr.dynamic-i130a-old_address-row').forEach(row => row.remove())

    const fieldsForAddress = (blockNumber) => [
      { key: 'country', blockType: 'old_address', blockNumber, value: item => getAddressParts(item).country },
      { key: 'line1', blockType: 'old_address', blockNumber, value: item => getAddressParts(item).line1 },
      { key: 'line2', blockType: 'old_address', blockNumber, value: item => getAddressParts(item).line2 },
      { key: 'city', blockType: 'old_address', blockNumber, value: item => getAddressParts(item).city },
      { key: 'state', blockType: 'old_address', blockNumber, value: item => getAddressParts(item).state },
      { key: 'zip', blockType: 'old_address', blockNumber, value: item => getAddressParts(item).zip },
      { key: 'from', blockType: 'old_address', blockNumber, value: item => getAddressParts(item).from },
      { key: 'to', blockType: 'old_address', blockNumber, value: item => getAddressParts(item).to }
    ]
    let renderedAddressCount = 1
    setupExistingRows(oldAddressRows, fieldsForAddress(1))
    if (previousAddressRecords[0]) {
      fillRows(oldAddressRows, fieldsForAddress(1), previousAddressRecords[0], true)
    }
    const appendAddressBlock = (blockNumber, record = null) => {
      const fieldSpecs = fieldsForAddress(blockNumber)
      const clonedRows = oldAddressRows.map((row, index) => {
        const clone = row.cloneNode(true)
        setupClonedRow(clone, 'old_address', blockNumber, fieldSpecs[index].key)
        return clone
      })
      fillRows(clonedRows, fieldSpecs, record || {}, false)

      let insertRef = paperEl.querySelectorAll('tr.dynamic-i130a-old_address-row')
      insertRef = insertRef.length ? insertRef[insertRef.length - 1] : oldAddressRows[oldAddressRows.length - 1]
      clonedRows.forEach(row => {
        insertRef.insertAdjacentElement('afterend', row)
        insertRef = row
      })
      renderedAddressCount = Math.max(renderedAddressCount, blockNumber)
    }
    const addressCount = Math.max(
      1,
      previousAddressRecords.length,
      getSavedCount(data._fillerChanges, 'old_address'),
      getSavedCount(data._reviewChanges, 'old_address')
    )
    for (let blockNumber = 2; blockNumber <= addressCount; blockNumber += 1) {
      appendAddressBlock(blockNumber, previousAddressRecords[blockNumber - 1] || null)
    }
    renderedAddressCount = Math.max(renderedAddressCount, addressCount)

    const headingCell = Array.from(oldAddressHeading.children).find(td => td.colSpan >= 24) || oldAddressHeading.children[0]
    headingCell?.querySelectorAll('.i130a-address-add-btn').forEach(btn => btn.remove())
    if (mode !== 'view' && headingCell) {
      headingCell.appendChild(createAddButton('i130a-address-add-btn', 'Them dia chi cu', () => {
        appendAddressBlock(renderedAddressCount + 1)
      }))
    }
  }



  const employmentRecordList = firstRecordList(
    petitionerSource.congViec5Nam,
    petitionerSource.jobs5Years,
    data.congViec5Nam,
    data.jobs5Years,
    data.previousJobs,
    data.employment5Years,
    data.previousJobsList
  )
  const parseEmploymentDateForSort = (value) => {
    if (!hasValue(value)) return 0
    return parseSortDate(value)
  }
  const flatEmploymentRecords = [1, 2, 3, 4, 5].map(getFlatJobRecord).filter(recordHasValue)
  const employmentRecords = Array.from({
    length: Math.max(employmentRecordList.length, flatEmploymentRecords.length)
  }, (_, index) => mergeRecordValues(employmentRecordList[index], flatEmploymentRecords[index]))
    .filter(recordHasValue)
    .sort((a, b) => {
      const aParts = getJobParts(a)
      const bParts = getJobParts(b)
      const endDiff = parseEmploymentDateForSort(bParts.to) - parseEmploymentDateForSort(aParts.to)
      if (endDiff) return endDiff
      return parseEmploymentDateForSort(bParts.from) - parseEmploymentDateForSort(aParts.from)
    })
  const employmentHeading = findHeadingRow('VIEC LAM TRONG 5 NAM QUA')
  const employmentRows = getRowsUntilNextHeading(employmentHeading)
  const firstEmploymentRows = employmentRows.slice(0, 10)
  const secondEmploymentRows = employmentRows.slice(10, 20)
  if (employmentHeading && firstEmploymentRows.length === 10 && secondEmploymentRows.length === 10) {
    paperEl.querySelectorAll('tr.dynamic-i130a-employment-row').forEach(row => row.remove())

    const fieldsForJob = (blockNumber) => [
      { key: 'employer', blockType: 'employment', blockNumber, value: item => getJobParts(item).employer },
      { key: 'country', blockType: 'employment', blockNumber, value: item => getJobParts(item).country },
      { key: 'line1', blockType: 'employment', blockNumber, value: item => getJobParts(item).line1 },
      { key: 'line2', blockType: 'employment', blockNumber, value: item => getJobParts(item).line2 },
      { key: 'city', blockType: 'employment', blockNumber, value: item => getJobParts(item).city },
      { key: 'state', blockType: 'employment', blockNumber, value: item => getJobParts(item).state },
      { key: 'zip', blockType: 'employment', blockNumber, value: item => getJobParts(item).zip },
      { key: 'occupation', blockType: 'employment', blockNumber, value: item => getJobParts(item).occupation },
      { key: 'from', blockType: 'employment', blockNumber, value: item => getJobParts(item).from },
      { key: 'to', blockType: 'employment', blockNumber, value: item => getJobParts(item).to }
    ]
    let renderedEmploymentCount = 2
    const firstEmploymentFields = fieldsForJob(1)
    const secondEmploymentFields = fieldsForJob(2)
    setupExistingRows(firstEmploymentRows, firstEmploymentFields)
    setupExistingRows(secondEmploymentRows, secondEmploymentFields)
    if (employmentRecords[0]) {
      fillRows(firstEmploymentRows, firstEmploymentFields, employmentRecords[0], true)
    }
    if (employmentRecords[1]) {
      fillRows(secondEmploymentRows, secondEmploymentFields, employmentRecords[1], true)
    }
    const appendEmploymentBlock = (blockNumber, record = null) => {
      const fieldSpecs = fieldsForJob(blockNumber)
      const clonedRows = secondEmploymentRows.map((row, index) => {
        const clone = row.cloneNode(true)
        setupClonedRow(clone, 'employment', blockNumber, fieldSpecs[index].key)
        return clone
      })
      fillRows(clonedRows, fieldSpecs, record || {}, false)

      let insertRef = paperEl.querySelectorAll('tr.dynamic-i130a-employment-row')
      insertRef = insertRef.length ? insertRef[insertRef.length - 1] : secondEmploymentRows[secondEmploymentRows.length - 1]
      clonedRows.forEach(row => {
        insertRef.insertAdjacentElement('afterend', row)
        insertRef = row
      })
      renderedEmploymentCount = Math.max(renderedEmploymentCount, blockNumber)
    }
    const employmentCount = Math.max(
      2,
      employmentRecords.length,
      getSavedCount(data._fillerChanges, 'employment'),
      getSavedCount(data._reviewChanges, 'employment')
    )
    for (let blockNumber = 3; blockNumber <= employmentCount; blockNumber += 1) {
      appendEmploymentBlock(blockNumber, employmentRecords[blockNumber - 1] || null)
    }
    renderedEmploymentCount = Math.max(renderedEmploymentCount, employmentCount)

    const headingCell = Array.from(employmentHeading.children).find(td => td.colSpan >= 24) || employmentHeading.children[0]
    headingCell?.querySelectorAll('.i130a-employment-add-btn').forEach(btn => btn.remove())
    if (mode !== 'view' && headingCell) {
      headingCell.appendChild(createAddButton('i130a-employment-add-btn', 'Them viec lam 5 nam qua', () => {
        appendEmploymentBlock(renderedEmploymentCount + 1)
      }))
    }
  }

  // Dynamic Previous Petitions (THÔNG TIN THÊM) Section
  const previousPetitionRecordList = firstRecordList(
    data.previousPetitions,
    data.lanBaoLanhCu,
    data.lanBaoLanh,
    data.donBaoLanhCu,
    data.cacLanBaoLanhCu,
    data.previousImmigrantPetitions,
    data.lanDuocBaoLanh
  )

  const getPreviousPetitionParts = (record = {}) => {
    const fullName = firstValue(
      objectValue(record, 'beneficiaryName', 'fullName', 'ten', 'hoTen', 'tenNguoiDuocBaoLanh'),
      ''
    )
    let given = firstValue(objectValue(record, 'givenName', 'given', 'ten'), '')
    let middle = firstValue(objectValue(record, 'middleName', 'middle', 'tenLot', 'tenDem'), '')
    let family = firstValue(objectValue(record, 'familyName', 'family', 'ho'), '')

    if (!given && !family && fullName) {
      const nameParts = String(fullName).trim().split(' ')
      if (nameParts.length > 1) {
        family = nameParts[0]
        given = nameParts[nameParts.length - 1]
        middle = nameParts.slice(1, -1).join(' ')
      } else {
        family = nameParts[0]
      }
    }

    return {
      given,
      middle,
      family,
      filedPlace: firstValue(objectValue(record, 'filedPlace', 'whereFiled', 'trungTamUscis', 'uscisCenter', 'noiNop'), ''),
      city: firstValue(objectValue(record, 'city', 'filedCity', 'thanhPho'), ''),
      state: firstValue(objectValue(record, 'state', 'filedState', 'tinh', 'bang'), ''),
      filedDate: firstValue(objectValue(record, 'filedDate', 'whenFiled', 'ngayNop', 'ngayUuTien', 'priorityDate'), ''),
      result: firstValue(objectValue(record, 'result', 'status', 'ketQua'), '')
    }
  }

  const previousPetitionHeading = findHeadingRow('THONG TIN THEM')
  if (previousPetitionHeading) {
    const previousPetitionAllRows = getRowsUntilNextHeading(previousPetitionHeading)
    // The details are the 8 rows following "Have you EVER previously filed a petition..."
    // Row 0 is the YES/NO question, rows 1-8 are the details (Given name, Middle name, Family name, WHERE WAS THE PETITION FILED?, City or town, State, When was the petition filed?, What was the result?)
    const firstPetitionRows = previousPetitionAllRows.slice(1, 9)
    if (firstPetitionRows.length === 8) {
      paperEl.querySelectorAll('tr.dynamic-i130a-previous_petition-row').forEach(row => row.remove())

      const fieldsForPetition = (blockNumber) => [
        { key: 'given', blockType: 'previous_petition', blockNumber, value: item => getPreviousPetitionParts(item).given },
        { key: 'middle', blockType: 'previous_petition', blockNumber, value: item => getPreviousPetitionParts(item).middle },
        { key: 'family', blockType: 'previous_petition', blockNumber, value: item => getPreviousPetitionParts(item).family },
        { key: 'filedPlace', blockType: 'previous_petition', blockNumber, value: item => getPreviousPetitionParts(item).filedPlace },
        { key: 'city', blockType: 'previous_petition', blockNumber, value: item => getPreviousPetitionParts(item).city },
        { key: 'state', blockType: 'previous_petition', blockNumber, value: item => getPreviousPetitionParts(item).state },
        { key: 'filedDate', blockType: 'previous_petition', blockNumber, value: item => getPreviousPetitionParts(item).filedDate },
        { key: 'result', blockType: 'previous_petition', blockNumber, value: item => getPreviousPetitionParts(item).result }
      ]

      let renderedPetitionCount = 1
      if (previousPetitionRecordList[0]) {
        fillRows(firstPetitionRows, fieldsForPetition(1), previousPetitionRecordList[0], true)
      }

      const appendPetitionBlock = (blockNumber, record = null) => {
        const fieldSpecs = fieldsForPetition(blockNumber)
        const clonedRows = firstPetitionRows.map((row, index) => {
          const clone = row.cloneNode(true)
          setupClonedRow(clone, 'previous_petition', blockNumber, fieldSpecs[index].key)
          return clone
        })
        fillRows(clonedRows, fieldSpecs, record || {}, false)

        let insertRef = paperEl.querySelectorAll('tr.dynamic-i130a-previous_petition-row')
        insertRef = insertRef.length ? insertRef[insertRef.length - 1] : firstPetitionRows[firstPetitionRows.length - 1]
        clonedRows.forEach(row => {
          insertRef.insertAdjacentElement('afterend', row)
          insertRef = row
        })
        renderedPetitionCount = Math.max(renderedPetitionCount, blockNumber)
      }

      const petitionCount = Math.max(
        1,
        previousPetitionRecordList.length,
        getSavedCount(data._fillerChanges, 'previous_petition'),
        getSavedCount(data._reviewChanges, 'previous_petition')
      )

      for (let blockNumber = 2; blockNumber <= petitionCount; blockNumber += 1) {
        appendPetitionBlock(blockNumber, previousPetitionRecordList[blockNumber - 1] || null)
      }
      renderedPetitionCount = Math.max(renderedPetitionCount, petitionCount)

      const headingCell = Array.from(previousPetitionHeading.children).find(td => td.colSpan >= 24) || previousPetitionHeading.children[0]
      headingCell?.querySelectorAll('.i130a-previous-petition-add-btn').forEach(btn => btn.remove())
      if (mode !== 'view' && headingCell) {
        headingCell.appendChild(createAddButton('i130a-previous-petition-add-btn', 'Them don bao lanh cu', () => {
          appendPetitionBlock(renderedPetitionCount + 1)
        }))
      }
    }
  }

  // Dynamic Other Relatives Section (Q15 - Are you submitting separate petitions for other relatives?)
  const otherRelativeHeadingRow = findHeadingRow('Are you submitting separate petitions for other relatives')
  if (otherRelativeHeadingRow) {
    const otherRelativeAllRows = getRowsUntilNextHeading(otherRelativeHeadingRow)
    // The 2 relatives already printed on the static template are 4 rows each:
    // Given name, Middle name, Family name, Relationship.
    const firstRelativeRows = otherRelativeAllRows.slice(0, 4)
    const secondRelativeRows = otherRelativeAllRows.slice(4, 8)
    if (firstRelativeRows.length === 4 && secondRelativeRows.length === 4) {
      paperEl.querySelectorAll('tr.dynamic-i130a-other_relative-row').forEach(row => row.remove())

      const fieldsForOtherRelative = (blockNumber) => [
        { key: 'given', blockType: 'other_relative', blockNumber },
        { key: 'middle', blockType: 'other_relative', blockNumber },
        { key: 'family', blockType: 'other_relative', blockNumber },
        { key: 'relationship', blockType: 'other_relative', blockNumber }
      ]

      setupExistingRows(firstRelativeRows, fieldsForOtherRelative(1))
      setupExistingRows(secondRelativeRows, fieldsForOtherRelative(2))

      let renderedOtherRelativeCount = 2
      const appendOtherRelativeBlock = (blockNumber) => {
        const fieldSpecs = fieldsForOtherRelative(blockNumber)
        const clonedRows = secondRelativeRows.map((row, index) => {
          const clone = row.cloneNode(true)
          setupClonedRow(clone, 'other_relative', blockNumber, fieldSpecs[index].key)
          return clone
        })

        let insertRef = paperEl.querySelectorAll('tr.dynamic-i130a-other_relative-row')
        insertRef = insertRef.length ? insertRef[insertRef.length - 1] : secondRelativeRows[secondRelativeRows.length - 1]
        clonedRows.forEach(row => {
          insertRef.insertAdjacentElement('afterend', row)
          insertRef = row
        })
        renderedOtherRelativeCount = Math.max(renderedOtherRelativeCount, blockNumber)
      }

      const otherRelativeCount = Math.max(
        2,
        getSavedCount(data._fillerChanges, 'other_relative'),
        getSavedCount(data._reviewChanges, 'other_relative')
      )
      for (let blockNumber = 3; blockNumber <= otherRelativeCount; blockNumber += 1) {
        appendOtherRelativeBlock(blockNumber)
      }
      renderedOtherRelativeCount = Math.max(renderedOtherRelativeCount, otherRelativeCount)

      // Row layout is [number cell, question label cell, data cell, hidden note cell] — the
      // question label is always the 2nd cell, unlike the full-width divider rows used by the
      // other sections above where the add button is appended to a colSpan >= 24 heading cell.
      const headingLabelCell = otherRelativeHeadingRow.children[1]
      headingLabelCell?.querySelectorAll('.i130a-other-relative-add-btn').forEach(btn => btn.remove())
      if (mode !== 'view' && headingLabelCell) {
        headingLabelCell.appendChild(createAddButton('i130a-other-relative-add-btn', 'Them nguoi than khac', () => {
          appendOtherRelativeBlock(renderedOtherRelativeCount + 1)
        }))
      }
    }
  }

  // --- DYNAMIC BENEFICIARY FORMER MARRIAGES SECTION (Cuộc hôn nhân trước đây của người được bảo lãnh) ---
  const getBeneficiaryFormerMarriages = () => {
    const list = [
      ...toRecordList(data.beneficiaryFormerSpouses),
      ...toRecordList(beneficiarySource.honNhanCu),
      ...toRecordList(beneficiarySource.formerSpouses),
      ...toRecordList(beneficiarySource.honPhoiDaMat),
      ...(hasSeparatedSources ? [] : toRecordList(data.honNhanCu)),
      ...(hasSeparatedSources ? [] : toRecordList(data.formerSpouses)),
      ...(hasSeparatedSources ? [] : toRecordList(data.previousSpouses)),
      ...(hasSeparatedSources ? [] : toRecordList(data.deceasedSpouses))
    ].map(record => {
      const name = splitFamilyName(record)
      return {
        given: name.given,
        middle: name.middle,
        family: name.family,
        endDate: firstValue(objectValue(record, 'endDate', 'marriageEndDate', 'ngayLyHon', 'ngayMat', 'dateOfDeath', 'end'))
      }
    }).filter(recordHasValue)

    if (list.length === 0) {
      const spouse1 = splitFamilyName(firstValue(data.beneficiaryFormerSpouseName, hasSeparatedSources ? '' : data.formerSpouseFullName, hasSeparatedSources ? '' : data.exSpouseName))
      const date1 = firstValue(data.beneficiaryFormerMarriageEndDate)
      if (spouse1.given || spouse1.family || date1) {
        list.push({ given: spouse1.given, middle: spouse1.middle, family: spouse1.family, endDate: date1 })
      }

      const spouse2 = splitFamilyName(firstValue(hasSeparatedSources ? '' : data.formerSpouse2FullName, hasSeparatedSources ? '' : data.exSpouse2Name))
      const date2 = firstValue(hasSeparatedSources ? '' : data.formerMarriage2EndDate)
      if (spouse2.given || spouse2.family || date2) {
        list.push({ given: spouse2.given, middle: spouse2.middle, family: spouse2.family, endDate: date2 })
      }
    }

    const seen = new Set()
    return list.filter(record => {
      const key = [
        record.family,
        record.middle,
        record.given,
        record.endDate
      ].map(value => normalizeCaseValue(value)).join('|')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  const beneficiaryFormerMarriageHeading = findHeadingRow('CUOC HON NHAN TRUOC DAY CUA NGUOI DUOC BAO LANH')
  if (beneficiaryFormerMarriageHeading) {
    const formerMarriageRows = getRowsUntilNextHeading(beneficiaryFormerMarriageHeading).slice(0, 4)
    if (formerMarriageRows.length === 4) {
      paperEl.querySelectorAll('tr.dynamic-i130a-beneficiary_former_marriage-row').forEach(row => row.remove())

      const fieldsForFormerMarriage = (blockNumber) => [
        { key: 'given', blockType: 'beneficiary_former_marriage', blockNumber, value: item => item.given },
        { key: 'middle', blockType: 'beneficiary_former_marriage', blockNumber, value: item => item.middle },
        { key: 'family', blockType: 'beneficiary_former_marriage', blockNumber, value: item => item.family },
        { key: 'end_date', blockType: 'beneficiary_former_marriage', blockNumber, value: item => item.endDate }
      ]

      let renderedFormerMarriageCount = 1
      const formerSpouseRecords = getBeneficiaryFormerMarriages()
      if (formerSpouseRecords[0]) {
        fillRows(formerMarriageRows, fieldsForFormerMarriage(1), formerSpouseRecords[0], true)
      }

      const appendFormerMarriageBlock = (blockNumber, record = null) => {
        const fieldSpecs = fieldsForFormerMarriage(blockNumber)
        const clonedRows = formerMarriageRows.map((row, index) => {
          const clone = row.cloneNode(true)
          setupClonedRow(clone, 'beneficiary_former_marriage', blockNumber, fieldSpecs[index].key)
          return clone
        })
        fillRows(clonedRows, fieldSpecs, record || {}, false)

        let insertRef = paperEl.querySelectorAll('tr.dynamic-i130a-beneficiary_former_marriage-row')
        insertRef = insertRef.length ? insertRef[insertRef.length - 1] : formerMarriageRows[formerMarriageRows.length - 1]
        clonedRows.forEach(row => {
          insertRef.insertAdjacentElement('afterend', row)
          insertRef = row
        })
        renderedFormerMarriageCount = Math.max(renderedFormerMarriageCount, blockNumber)
      }

      const formerMarriageCount = Math.max(
        1,
        formerSpouseRecords.length,
        getSavedCount(data._fillerChanges, 'beneficiary_former_marriage'),
        getSavedCount(data._reviewChanges, 'beneficiary_former_marriage')
      )

      for (let blockNumber = 2; blockNumber <= formerMarriageCount; blockNumber += 1) {
        appendFormerMarriageBlock(blockNumber, formerSpouseRecords[blockNumber - 1] || null)
      }
      renderedFormerMarriageCount = Math.max(renderedFormerMarriageCount, formerMarriageCount)

      const headingCell = Array.from(beneficiaryFormerMarriageHeading.children).find(td => td.colSpan >= 24) || beneficiaryFormerMarriageHeading.children[0]
      headingCell?.querySelectorAll('.i130a-beneficiary-former-marriage-add-btn').forEach(btn => btn.remove())
      if (mode !== 'view' && headingCell) {
        headingCell.appendChild(createAddButton('i130a-beneficiary-former-marriage-add-btn', 'Them cuoc hon nhan cu', () => {
          appendFormerMarriageBlock(renderedFormerMarriageCount + 1)
        }))
      }
    }
  }


  // --- DYNAMIC CHILDREN INFO SECTION (Thông tin con) ---
  // --- DYNAMIC PETITIONER FORMER MARRIAGES SECTION (Cuoc hon nhan cu) ---
  const getPetitionerFormerMarriages = () => {
    const list = [
      ...toRecordList(data.petitionerFormerSpouses),
      ...toRecordList(data.petitionerPastMarriages),
      ...toRecordList(petitionerSource.honNhanCu),
      ...toRecordList(petitionerSource.pastMarriages),
      ...toRecordList(petitionerSource.formerSpouses),
      ...toRecordList(petitionerSource.honPhoiDaMat),
      ...(hasSeparatedSources ? [] : toRecordList(data.honNhanCu)),
      ...(hasSeparatedSources ? [] : toRecordList(data.formerSpouses)),
      ...(hasSeparatedSources ? [] : toRecordList(data.previousSpouses)),
      ...(hasSeparatedSources ? [] : toRecordList(data.honPhoiDaMat)),
      ...(hasSeparatedSources ? [] : toRecordList(data.deceasedSpouses))
    ].map(record => {
      const name = splitFamilyName(record)
      return {
        given: firstValue(objectValue(record, 'given', 'givenName', 'firstName', 'ten'), name.given),
        middle: firstValue(objectValue(record, 'middle', 'middleName', 'tenDem'), name.middle),
        family: firstValue(objectValue(record, 'family', 'familyName', 'lastName', 'surname', 'ho'), name.family),
        endDate: firstValue(objectValue(record, 'endDate', 'marriageEndDate', 'ngayLyHon', 'ngayMat', 'dateOfDeath', 'end'))
      }
    }).filter(recordHasValue)

    if (list.length === 0) {
      const spouse1 = splitFamilyName(firstValue(data.formerSpouseFullName, data.exSpouseName))
      const date1 = firstValue(data.formerMarriageEndDate, data.divorceDate)
      if (spouse1.given || spouse1.family || date1) {
        list.push({ given: spouse1.given, middle: spouse1.middle, family: spouse1.family, endDate: date1 })
      }

      const spouse2 = splitFamilyName(firstValue(data.formerSpouse2FullName, data.exSpouse2Name))
      const date2 = firstValue(data.formerMarriage2EndDate)
      if (spouse2.given || spouse2.family || date2) {
        list.push({ given: spouse2.given, middle: spouse2.middle, family: spouse2.family, endDate: date2 })
      }
    }

    const seen = new Set()
    return list.filter(record => {
      const key = [
        record.family,
        record.middle,
        record.given,
        record.endDate
      ].map(value => normalizeCaseValue(value)).join('|')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  const petitionerFormerMarriageHeading = findHeadingRow('CUOC HON NHAN CU')
  if (petitionerFormerMarriageHeading) {
    const formerMarriageRows = getRowsUntilNextHeading(petitionerFormerMarriageHeading)
    const firstFormerMarriageRows = formerMarriageRows.slice(0, 4)
    const secondFormerMarriageRows = formerMarriageRows.slice(4, 8)

    if (firstFormerMarriageRows.length === 4 && secondFormerMarriageRows.length === 4) {
      paperEl.querySelectorAll('tr.dynamic-i130a-petitioner_former_marriage-row').forEach(row => row.remove())

      const fieldsForPetitionerFormerMarriage = (blockNumber) => [
        { key: 'given', blockType: 'petitioner_former_marriage', blockNumber, value: item => item.given },
        { key: 'middle', blockType: 'petitioner_former_marriage', blockNumber, value: item => item.middle },
        { key: 'family', blockType: 'petitioner_former_marriage', blockNumber, value: item => item.family },
        { key: 'end_date', blockType: 'petitioner_former_marriage', blockNumber, value: item => item.endDate }
      ]

      let renderedPetitionerFormerMarriageCount = 2
      const formerSpouseRecords = getPetitionerFormerMarriages()
      fillRows(firstFormerMarriageRows, fieldsForPetitionerFormerMarriage(1), formerSpouseRecords[0] || {}, true)
      fillRows(secondFormerMarriageRows, fieldsForPetitionerFormerMarriage(2), formerSpouseRecords[1] || {}, true)

      const appendPetitionerFormerMarriageBlock = (blockNumber, record = null) => {
        const fieldSpecs = fieldsForPetitionerFormerMarriage(blockNumber)
        const clonedRows = secondFormerMarriageRows.map((row, index) => {
          const clone = row.cloneNode(true)
          setupClonedRow(clone, 'petitioner_former_marriage', blockNumber, fieldSpecs[index].key)
          return clone
        })
        fillRows(clonedRows, fieldSpecs, record || {}, false)

        let insertRef = paperEl.querySelectorAll('tr.dynamic-i130a-petitioner_former_marriage-row')
        insertRef = insertRef.length ? insertRef[insertRef.length - 1] : secondFormerMarriageRows[secondFormerMarriageRows.length - 1]
        clonedRows.forEach(row => {
          insertRef.insertAdjacentElement('afterend', row)
          insertRef = row
        })
        renderedPetitionerFormerMarriageCount = Math.max(renderedPetitionerFormerMarriageCount, blockNumber)
      }

      const formerMarriageCount = Math.max(
        2,
        formerSpouseRecords.length,
        getSavedCount(data._fillerChanges, 'petitioner_former_marriage'),
        getSavedCount(data._reviewChanges, 'petitioner_former_marriage')
      )

      for (let blockNumber = 3; blockNumber <= formerMarriageCount; blockNumber += 1) {
        appendPetitionerFormerMarriageBlock(blockNumber, formerSpouseRecords[blockNumber - 1] || null)
      }
      renderedPetitionerFormerMarriageCount = Math.max(renderedPetitionerFormerMarriageCount, formerMarriageCount)

      const headingCell = Array.from(petitionerFormerMarriageHeading.children).find(td => td.colSpan >= 24) || petitionerFormerMarriageHeading.children[0]
      headingCell?.querySelectorAll('.i130a-petitioner-former-marriage-add-btn').forEach(btn => btn.remove())
      if (mode !== 'view' && headingCell) {
        headingCell.appendChild(createAddButton('i130a-petitioner-former-marriage-add-btn', 'Them cuoc hon nhan cu', () => {
          appendPetitionerFormerMarriageBlock(renderedPetitionerFormerMarriageCount + 1)
        }))
      }
    }
  }


  const getBeneficiaryChildren = () => {
    const childRecords = [
      ...toRecordList(data.beneficiaryChildren),
      ...toRecordList(data.beneficiaryChildrenInfo),
      ...toRecordList(data.beneficiaryThongTinCon),
      ...(hasSeparatedSources ? [] : toRecordList(data.thongTinCon)),
      ...(hasSeparatedSources ? [] : toRecordList(data.children)),
      ...(hasSeparatedSources ? [] : toRecordList(data.childrenInfo)),
      ...(hasSeparatedSources ? [] : toRecordList(data.conCai)),
      ...toRecordList(data.k1ChildrenList),
      ...toRecordList(beneficiarySource.thongTinCon),
      ...toRecordList(beneficiarySource.children),
      ...toRecordList(beneficiarySource.childrenInfo),
      ...toRecordList(beneficiarySource.conCai),
      ...Array.from({ length: 10 }, (_, index) => getFlatChildFamilyRecord(index + 1)).filter(recordHasValue)
    ].map(record => normalizeFamilyMemberRecord(record, 'CHILD')).filter(recordHasValue)

    const seen = new Set()
    return childRecords.filter(record => {
      const key = [
        record.family,
        record.middle,
        record.given,
        record.birthDate
      ].map(value => normalizeCaseValue(value)).join('|')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  const childHeading = findHeadingRow('THONG TIN CON')
  if (childHeading) {
    const childRows = getRowsUntilNextHeading(childHeading)
    const firstChildRows = childRows.slice(0, 6)
    const secondChildRows = childRows.slice(6, 12)
    const isParentPetition = getPetitionRelationship() === 'PARENT'

    if (firstChildRows.length === 6 && secondChildRows.length === 6) {
      paperEl.querySelectorAll('tr.dynamic-i130a-beneficiary_child-row').forEach(row => row.remove())

      const fieldsForChild = (blockNumber) => [
        { key: 'given', blockType: 'beneficiary_child', blockNumber, value: item => item.given },
        { key: 'middle', blockType: 'beneficiary_child', blockNumber, value: item => item.middle },
        { key: 'family', blockType: 'beneficiary_child', blockNumber, value: item => item.family },
        { key: 'relationship', blockType: 'beneficiary_child', blockNumber, value: item => item.relationship },
        { key: 'birth_date', blockType: 'beneficiary_child', blockNumber, value: item => item.birthDate },
        { key: 'birth_country', blockType: 'beneficiary_child', blockNumber, value: item => item.birthCountry }
      ]

      const headingCell = Array.from(childHeading.children).find(td => td.colSpan >= 24) || childHeading.children[0]
      headingCell?.querySelectorAll('.i130a-child-add-btn').forEach(btn => btn.remove())

      if (isParentPetition) {
        fillRows(firstChildRows, fieldsForChild(1), {}, true)
        fillRows(secondChildRows, fieldsForChild(2), {}, true)
      } else {
      let renderedChildCount = 2
      const childrenRecords = getBeneficiaryChildren()
      if (childrenRecords[0]) {
        fillRows(firstChildRows, fieldsForChild(1), childrenRecords[0], true)
      }
      if (childrenRecords[1]) {
        fillRows(secondChildRows, fieldsForChild(2), childrenRecords[1], true)
      }

      const appendChildBlock = (blockNumber, record = null) => {
        const fieldSpecs = fieldsForChild(blockNumber)
        const clonedRows = secondChildRows.map((row, index) => {
          const clone = row.cloneNode(true)
          setupClonedRow(clone, 'beneficiary_child', blockNumber, fieldSpecs[index].key)
          return clone
        })
        fillRows(clonedRows, fieldSpecs, record || {}, false)

        let insertRef = paperEl.querySelectorAll('tr.dynamic-i130a-beneficiary_child-row')
        insertRef = insertRef.length ? insertRef[insertRef.length - 1] : secondChildRows[secondChildRows.length - 1]
        clonedRows.forEach(row => {
          insertRef.insertAdjacentElement('afterend', row)
          insertRef = row
        })
        renderedChildCount = Math.max(renderedChildCount, blockNumber)
      }

      const childCount = Math.max(
        2,
        childrenRecords.length,
        getSavedCount(data._fillerChanges, 'beneficiary_child'),
        getSavedCount(data._reviewChanges, 'beneficiary_child')
      )

      for (let blockNumber = 3; blockNumber <= childCount; blockNumber += 1) {
        appendChildBlock(blockNumber, childrenRecords[blockNumber - 1] || null)
      }
      renderedChildCount = Math.max(renderedChildCount, childCount)

      if (mode !== 'view' && headingCell) {
        headingCell.appendChild(createAddButton('i130a-child-add-btn', 'Them con', () => {
          appendChildBlock(renderedChildCount + 1)
        }))
      }
      }
    }
  }


  // --- DYNAMIC CURRENT EMPLOYMENT SECTION (Việc làm hiện tại) ---
  const beneficiaryEmploymentRecordList = firstRecordList(
    beneficiarySource.congViec5Nam,
    beneficiarySource.employmentHistory,
    beneficiarySource.jobs5Years,
    hasSeparatedSources ? [] : data.congViec5Nam,
    data.employmentHistory,
    data.jobs5Years
  )

  const beneficiaryEmploymentRecords = beneficiaryEmploymentRecordList
    .filter(recordHasValue)
    .sort((a, b) => {
      const aParts = getJobParts(a)
      const bParts = getJobParts(b)
      const endDiff = parseEmploymentDateForSort(bParts.to) - parseEmploymentDateForSort(aParts.to)
      if (endDiff) return endDiff
      return parseEmploymentDateForSort(bParts.from) - parseEmploymentDateForSort(aParts.from)
    })

  const getCurrentJobs = () => {
    const currentJobs = beneficiaryEmploymentRecords.filter(job => {
      const parts = getJobParts(job)
      const toVal = normalizePlainText(parts.to)
      if (toVal && !['PRESENT', 'HIEN TAI', 'NOW', 'CURRENT', 'NAY'].includes(toVal)) return false

      const rawEmployer = firstValue(
        objectValue(job, 'employer', 'company', 'companyName', 'tenCongTy', 'employerName', 'currentEmployerName'),
        objectValue(job, 'name')
      )
      const rawOccupation = objectValue(job, 'occupation', 'job', 'profession', 'title', 'ngheNghiep')
      const isStatusOnly = isNonEmployerEmploymentStatus(rawEmployer) ||
        (isNonEmployerEmploymentStatus(rawOccupation) && !parts.employer)

      return !isStatusOnly
    })
    return currentJobs
  }


  function normalizeCurrentEmploymentUnemployedBlocks() {
    // Mode 'view' vẫn chuẩn hoá hiển thị, chỉ không ghi gì vào bản nháp.
    const readOnly = mode === 'view'
    const currentEmploymentHeading = findHeadingRow('VIEC LAM HIEN TAI')
    if (!currentEmploymentHeading) return
    const rows = getRowsUntilNextHeading(currentEmploymentHeading)
    const blockSize = 8

    const readDataText = (row) => {
      const cell = getDataCell(row)
      return String(cell?.innerHTML || '')
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    }

    const setCellHtml = (cell, value) => {
      if (!cell) return
      const normalizedValue = String(value || '').trim()
      cell.innerHTML = normalizedValue
      if (normalizedValue) {
        cell.dataset.filled = 'true'
        cell.dataset.filledValue = normalizedValue
      } else {
        cell.innerHTML = ''
        delete cell.dataset.filled
        delete cell.dataset.filledValue
      }
    }

    for (let index = 0; index + blockSize <= rows.length; index += blockSize) {
      const blockRows = rows.slice(index, index + blockSize)
      const employerText = readDataText(blockRows[0])
      if (isUnemployedText(employerText)) {
        ;['country', 'line1', 'line2', 'city', 'state', 'zip', 'from'].forEach(fieldKey => {
          const fieldIndex = ['employer', 'country', 'line1', 'line2', 'city', 'state', 'zip', 'from'].indexOf(fieldKey)
          const row = blockRows[fieldIndex]
          const dataCell = getDataCell(row)
          const noteCell = getNoteCell(row)

          if (dataCell) {
            // Xoá trên màn hình thôi là chưa đủ: delete changeRef.value[...] không để lại dấu vết nào
            // trong bản nháp, nên mục "Đã kiểm tra" (mode view) đổ lại data gốc. Ô vốn có data khách
            // hàng phải ghi marker __CLEARED__ y như thao tác xoá tay.
            const dataCellId = dataCell.dataset.cellId
            const filledValue = dataCell.dataset.filledValue
            const hadCustomerData = dataCell.dataset.filled === 'true' && String(filledValue || '').trim()
            setCellHtml(dataCell, '')
            // setCellHtml('') xoá luôn dataset.filled/filledValue. Phải khôi phục, nếu không blur sau
            // đó thấy ô "trống và chưa từng có data" rồi xoá mất chính marker vừa ghi.
            if (hadCustomerData) {
              dataCell.dataset.filled = 'true'
              dataCell.dataset.filledValue = filledValue
            }
            dataCell.classList.remove('color-customer', 'color-filler', 'color-reviewer', 'modified')
            if (dataCellId && !readOnly) {
              // Ở mode 'review' changeRef là map của tư vấn: ghi __CLEARED__ vào đó là đếm nhầm các ô
              // này thành lỗi tư vấn, nên chỉ người xử lý mới được ghi marker.
              if (hadCustomerData && mode === 'create') changeRef.value[dataCellId] = '__CLEARED__'
              else delete changeRef.value[dataCellId]
            }
          }
          if (noteCell && !readOnly) {
            setCellHtml(noteCell, '')
            noteCell.classList.remove('color-customer', 'color-filler', 'color-reviewer', 'modified')
            delete changeRef.value[noteCell.dataset.cellId]
          }
        })
      }
    }
    if (readOnly) return

    emitChange()
    updateCorrectionCountDisplay()
  }

  const currentEmploymentHeading = findHeadingRow('VIEC LAM HIEN TAI')
  if (currentEmploymentHeading) {
    const currentEmploymentRows = getRowsUntilNextHeading(currentEmploymentHeading).slice(0, 8)
    if (currentEmploymentRows.length === 8) {
      paperEl.querySelectorAll('tr.dynamic-i130a-current_employment-row').forEach(row => row.remove())

      const fieldsForCurrentJob = (blockNumber) => [
        { key: 'employer', blockType: 'current_employment', blockNumber, value: item => getJobParts(item).employer },
        { key: 'country', blockType: 'current_employment', blockNumber, value: item => getJobParts(item).country },
        { key: 'line1', blockType: 'current_employment', blockNumber, value: item => getJobParts(item).line1 },
        { key: 'line2', blockType: 'current_employment', blockNumber, value: item => getJobParts(item).line2 },
        { key: 'city', blockType: 'current_employment', blockNumber, value: item => getJobParts(item).city },
        { key: 'state', blockType: 'current_employment', blockNumber, value: item => getJobParts(item).state },
        { key: 'zip', blockType: 'current_employment', blockNumber, value: item => getJobParts(item).zip },
        { key: 'from', blockType: 'current_employment', blockNumber, value: item => getJobParts(item).from }
      ]

      let renderedCurrentEmploymentCount = 1
      const currentJobs = getCurrentJobs()
      // fillRows/setupExistingRows la noi duy nhat gan cell-id on dinh
      // (data_i130a_current_employment_1_*) cho 8 dong goc cua muc nay. Truoc day nhanh
      // "khong co du lieu" chi xoa o ma bo qua buoc gan id, nen khi ho so mo lai ma thieu
      // du lieu NDBL thi cac o giu id vi tri cu (data_N) va ban nhap da luu khong khop o nao.
      setupExistingRows(currentEmploymentRows, fieldsForCurrentJob(1))
      if (currentJobs[0]) {
        fillRows(currentEmploymentRows, fieldsForCurrentJob(1), currentJobs[0], true)
      } else {
        currentEmploymentRows.forEach(row => {
          clearEditableCell(getDataCell(row))
          clearEditableCell(getNoteCell(row))
        })
      }

      const appendCurrentEmploymentBlock = (blockNumber, record = null) => {
        const fieldSpecs = fieldsForCurrentJob(blockNumber)
        const clonedRows = currentEmploymentRows.map((row, index) => {
          const clone = row.cloneNode(true)
          setupClonedRow(clone, 'current_employment', blockNumber, fieldSpecs[index].key)
          return clone
        })
        fillRows(clonedRows, fieldSpecs, record || {}, false)

        let insertRef = paperEl.querySelectorAll('tr.dynamic-i130a-current_employment-row')
        insertRef = insertRef.length ? insertRef[insertRef.length - 1] : currentEmploymentRows[currentEmploymentRows.length - 1]
        clonedRows.forEach(row => {
          insertRef.insertAdjacentElement('afterend', row)
          insertRef = row
        })
        renderedCurrentEmploymentCount = Math.max(renderedCurrentEmploymentCount, blockNumber)
      }

      const currentEmploymentCount = Math.max(
        1,
        currentJobs.length,
        getSavedCount(data._fillerChanges, 'current_employment'),
        getSavedCount(data._reviewChanges, 'current_employment')
      )

      for (let blockNumber = 2; blockNumber <= currentEmploymentCount; blockNumber += 1) {
        appendCurrentEmploymentBlock(blockNumber, currentJobs[blockNumber - 1] || null)
      }
      renderedCurrentEmploymentCount = Math.max(renderedCurrentEmploymentCount, currentEmploymentCount)

      const headingCell = Array.from(currentEmploymentHeading.children).find(td => td.colSpan >= 24) || currentEmploymentHeading.children[0]
      headingCell?.querySelectorAll('.i130a-current-employment-add-btn').forEach(btn => btn.remove())
      if (mode !== 'view' && headingCell) {
        headingCell.appendChild(createAddButton('i130a-current-employment-add-btn', 'Them viec lam hien tai', () => {
          appendCurrentEmploymentBlock(renderedCurrentEmploymentCount + 1)
        }))
      }

      normalizeCurrentEmploymentUnemployedBlocks()
      fillHoChiMinhStateFromCityRows(getRowsUntilNextHeading(currentEmploymentHeading), 8)
    }
  }

  // Safety pass: một số block động có thể render lại sau mapping chính.
  // Nếu City or town là Hồ Chí Minh nhưng State/Province còn trống, tự điền Hồ Chí Minh.
  if (employmentHeading) {
    fillHoChiMinhStateFromCityRows(getRowsUntilNextHeading(employmentHeading), EMPLOYMENT_FIELD_KEYS.length)
  }
  if (currentEmploymentHeading) {
    fillHoChiMinhStateFromCityRows(getRowsUntilNextHeading(currentEmploymentHeading), 8)
  }

  return {
    sortEmploymentBlocksByDate,
    sortOldAddressBlocksByDate
  }
}

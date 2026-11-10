// Xóa nội dung 1 ô trên phiếu (trạng thái __CLEARED__ = người dùng chủ ý xóa).
//
// Ô thường thì xóa innerHTML là đúng. Nhưng ô dạng widget (YES/NO, immigrant status,
// lựa chọn địa chỉ hôn phối, ô có <select>) thì chính cái control nằm TRONG innerHTML:
// xóa innerHTML là xóa luôn 2 ô tick, ô trở thành rỗng hoàn toàn và không bao giờ
// tick lại được nữa cho tới khi tải lại phiếu. Với những ô đó, "xóa" nghĩa là bỏ chọn.
export function clearCellContent(cell) {
  if (!cell) return

  const checks = cell.querySelectorAll('input[type="checkbox"], input[type="radio"]')
  if (checks.length) {
    checks.forEach(check => {
      check.checked = false
      check.removeAttribute('checked')
    })
    return
  }

  const select = cell.querySelector('select')
  if (select) {
    select.selectedIndex = 0
    return
  }

  cell.innerHTML = ''
}

// Ô đang có data khách hàng đổ sẵn mà người dùng bỏ chọn/xóa trắng thì đó là thao tác
// XÓA, phải ghi marker __CLEARED__. Nếu chỉ xóa key khỏi changes thì lần mở lại phiếu
// autofill sẽ đổ data cũ về, thao tác xóa coi như mất trắng.
export function recordClearedChange(changeMap, cell) {
  const cellId = cell?.dataset?.cellId
  if (!changeMap || !cellId) return

  // Chỉ áp dụng cho ô cột XỬ LÝ (data-cell) vì chỉ ô đó mới có data khách hàng tự đổ vào.
  // Ô cột TƯ VẤN (note-cell) vốn trống, xoá key là đúng - không có gì để "đổ về" cả.
  const isDataCell = !cell.classList?.contains('note-cell')
  const hadCustomerData = cell.dataset.filled === 'true' && String(cell.dataset.filledValue || '').trim()

  if (isDataCell && hadCustomerData) {
    changeMap[cellId] = '__CLEARED__'
  } else {
    delete changeMap[cellId]
  }
}

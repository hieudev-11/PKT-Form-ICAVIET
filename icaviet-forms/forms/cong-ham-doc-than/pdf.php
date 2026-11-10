<?php
if (!defined('ABSPATH')) {
    exit;
}

/**
 * PDF Template: Công Hàm Độc Thân
 * Style theo mẫu user upload
 *
 * Scope:
 *   $pdf  - ICAVIET_FPDF
 *   $data - array
 */

/* @var ICAVIET_FPDF $pdf */
/* @var array $data */

if (!function_exists('ICAVIET_chdt_pdf_sv')) {
    function ICAVIET_chdt_pdf_sv($data, $key, $default = '')
    {
        $val = isset($data[$key]) ? trim((string) $data[$key]) : '';
        return $val !== '' ? $val : $default;
    }
}

if (!function_exists('ICAVIET_chdt_pdf_vi_date')) {
    function ICAVIET_chdt_pdf_vi_date($raw = '')
    {
        $ts = 0;

        if (!empty($raw)) {
            $parsed = strtotime((string) $raw);
            if ($parsed) {
                $ts = $parsed;
            }
        }

        if (!$ts) {
            if (function_exists('current_time')) {
                $ts = current_time('timestamp');
            } else {
                $ts = time();
            }
        }

        $map = array(
            'Sunday'    => 'chủ nhật',
            'Monday'    => 'thứ hai',
            'Tuesday'   => 'thứ ba',
            'Wednesday' => 'thứ tư',
            'Thursday'  => 'thứ năm',
            'Friday'    => 'thứ sáu',
            'Saturday'  => 'thứ bảy',
        );

        $weekdayEn = date('l', $ts);
        $weekdayVi = isset($map[$weekdayEn]) ? $map[$weekdayEn] : strtolower($weekdayEn);

        // Truoc day: ", tháng n j, Y" -> "thứ hai, tháng 8 3, 2026" (thang dung
        // truoc ngay, thieu chu "ngay"/"nam"). Doi thu tu cho dung "Ngày D
        // tháng M năm Y" nhu phan con lai cua PDF.
        return $weekdayVi . ', ngày ' . date('j', $ts) . ' tháng ' . date('n', $ts) . ' năm ' . date('Y', $ts);
    }
}

if (!function_exists('ICAVIET_chdt_pdf_lines')) {
    function ICAVIET_chdt_pdf_lines($pdf, $text, $width)
    {
        $text = trim((string) $text);
        if ($text === '') {
            return 1;
        }

        $text = preg_replace('/\s+/u', ' ', $text);
        $words = preg_split('/\s+/u', $text);
        if (!$words || !is_array($words)) {
            return 1;
        }

        $lines = 1;
        $line = '';

        foreach ($words as $word) {
            $test = ($line === '') ? $word : ($line . ' ' . $word);
            if ($pdf->GetStringWidth($test) <= $width) {
                $line = $test;
            } else {
                $lines++;
                $line = $word;
            }
        }

        return max(1, $lines);
    }
}

if (!function_exists('ICAVIET_chdt_pdf_bg')) {
    function ICAVIET_chdt_pdf_bg($pdf, $withHeader = false)
    {
        // Nền xám rất nhạt toàn trang
        $pdf->SetFillColor(246, 246, 249);
        $pdf->Rect(0, 0, 210, 297, 'F');

        // Band header tím nhạt ở trang 1
        if ($withHeader) {
            $pdf->SetFillColor(234, 235, 250);
            $pdf->Rect(0, 0, 210, 50, 'F');
        }
    }
}

if (!function_exists('ICAVIET_chdt_pdf_page_no')) {
    function ICAVIET_chdt_pdf_page_no($pdf, $pageNo)
    {
        $pdf->SetTextColor(20, 20, 20);
        $pdf->SetFont('DejaVu', '', 9);
        $pdf->SetXY(190, 286);
        $pdf->Cell(10, 5, (string) $pageNo, 0, 0, 'R');
    }
}

if (!function_exists('ICAVIET_chdt_pdf_section_title')) {
    function ICAVIET_chdt_pdf_section_title($pdf, $title, $size = 17)
    {
        $pdf->SetFont('DejaVu', 'B', $size);
        $pdf->SetTextColor(15, 22, 74);
        $pdf->Cell(0, 8, $title, 0, 1, 'L');
    }
}

if (!function_exists('ICAVIET_chdt_pdf_kv')) {
    function ICAVIET_chdt_pdf_kv($pdf, $label, $value, $opts = array())
    {
        $x       = isset($opts['x']) ? (float) $opts['x'] : 13;
        $labelW  = isset($opts['label_w']) ? (float) $opts['label_w'] : 76;
        $valueW  = isset($opts['value_w']) ? (float) $opts['value_w'] : 108;
        $lineH   = isset($opts['line_h']) ? (float) $opts['line_h'] : 9.5;
        $gapY    = isset($opts['gap_y']) ? (float) $opts['gap_y'] : 0.8;
        $labelFs = isset($opts['label_fs']) ? (float) $opts['label_fs'] : 10;
        $valueFs = isset($opts['value_fs']) ? (float) $opts['value_fs'] : 10;

        $label = trim((string) $label);
        if ($label !== '' && mb_substr($label, -1, 1, 'UTF-8') !== ':') {
            $label .= ':';
        }

        $value = trim((string) $value);

        $y = $pdf->GetY();

        $pdf->SetFont('DejaVu', 'B', $labelFs);
        $labelLines = ICAVIET_chdt_pdf_lines($pdf, $label, $labelW - 1);

        $pdf->SetFont('DejaVu', '', $valueFs);
        $valueLines = ICAVIET_chdt_pdf_lines($pdf, $value, $valueW - 1);

        $rowH = max($labelLines, $valueLines) * $lineH;

        $pdf->SetXY($x, $y);
        $pdf->SetFont('DejaVu', 'B', $labelFs);
        $pdf->SetTextColor(15, 22, 74);
        $pdf->MultiCell($labelW, $lineH, $label, 0, 'L');

        $pdf->SetXY($x + $labelW, $y);
        $pdf->SetFont('DejaVu', '', $valueFs);
        $pdf->SetTextColor(79, 87, 108);
        $pdf->MultiCell($valueW, $lineH, $value, 0, 'L');

        $pdf->SetY($y + $rowH + $gapY);
    }
}

if (!function_exists('ICAVIET_chdt_pdf_table_row')) {
    function ICAVIET_chdt_pdf_table_row($pdf, $x, $widths, $values, $isHeader = false)
    {
        $lineH = $isHeader ? 7 : 7.2;
        $fontSize = $isHeader ? 9.5 : 10;

        $pdf->SetFont('DejaVu', $isHeader ? 'B' : '', $fontSize);

        $maxLines = 1;
        foreach ($values as $i => $val) {
            $cellW = isset($widths[$i]) ? $widths[$i] : 20;
            $lines = ICAVIET_chdt_pdf_lines($pdf, (string) $val, $cellW - 4);
            if ($lines > $maxLines) {
                $maxLines = $lines;
            }
        }

        $rowH = max($isHeader ? 9 : 12, $maxLines * $lineH + 4);
        $y = $pdf->GetY();
        $cursorX = $x;

        for ($i = 0; $i < count($values); $i++) {
            $w = $widths[$i];
            $txt = (string) $values[$i];

            if ($isHeader) {
                $pdf->SetFillColor(234, 235, 245);
                $pdf->SetDrawColor(215, 217, 230);
                $pdf->SetTextColor(28, 33, 76);
            } else {
                $pdf->SetFillColor(246, 246, 249);
                $pdf->SetDrawColor(215, 217, 230);
                $pdf->SetTextColor(79, 87, 108);
            }

            $pdf->Rect($cursorX, $y, $w, $rowH, $isHeader ? 'FD' : 'D');

            $pdf->SetXY($cursorX + 2, $y + 2);
            $pdf->MultiCell($w - 4, $lineH, $txt, 0, $isHeader ? 'C' : 'L');

            $cursorX += $w;
        }

        $pdf->SetY($y + $rowH);
    }
}

$sv = function ($key, $default = '') use ($data) {
    return ICAVIET_chdt_pdf_sv($data, $key, $default);
};

$submittedDate = '';
foreach (array('_submitted_at', '_created_at', 'created_at', 'submitted_at', 'date_created') as $dateKey) {
    if (!empty($data[$dateKey])) {
        $submittedDate = (string) $data[$dateKey];
        break;
    }
}

$displayDate = ICAVIET_chdt_pdf_vi_date($submittedDate);

// ========= PAGE 1 =========
$pdf->SetMargins(13, 12, 13);
$pdf->SetAutoPageBreak(false);
$pdf->SetTextColor(0, 0, 0);

ICAVIET_chdt_pdf_bg($pdf, true);

// Ngày góc phải
$pdf->SetXY(148, 11);
$pdf->SetFont('DejaVu', '', 10.5);
$pdf->SetTextColor(28, 28, 28);
$pdf->Cell(50, 6, $displayDate, 0, 0, 'R');

// Title + mô tả
$pdf->SetXY(13, 17);
$pdf->SetFont('DejaVu', 'B', 20);
$pdf->SetTextColor(15, 22, 74);
$pdf->Cell(0, 9, 'Thông tin điền đơn CHDT', 0, 1, 'L');

$pdf->SetX(13);
$pdf->SetFont('DejaVu', '', 11);
$pdf->SetTextColor(24, 31, 67);
$pdf->MultiCell(
    170,
    6,
    'Anh chị vui lòng cung cấp thông tin chính xác để em dựa trên thông tin này điền vào các mẫu đơn công hàm độc thân ạ!',
    0,
    'L'
);

// Section: Thông tin của bạn
$pdf->SetY(52);
ICAVIET_chdt_pdf_section_title($pdf, 'Thông tin của bạn:', 20);
$pdf->Ln(4);

// Key-value rows
ICAVIET_chdt_pdf_kv($pdf, 'Họ và tên', $sv('hoVaTen'));
ICAVIET_chdt_pdf_kv($pdf, 'Nơi sinh', $sv('noiSinh'));
ICAVIET_chdt_pdf_kv($pdf, 'Dân tộc', $sv('danToc', 'Kinh'));
ICAVIET_chdt_pdf_kv($pdf, 'Quê quán', $sv('queQuan'));
ICAVIET_chdt_pdf_kv($pdf, 'Địa chỉ cư trú hiện tại', $sv('diaChiCuTru'));
ICAVIET_chdt_pdf_kv($pdf, 'Số điện thoại cá nhân', $sv('soDienThoai'));
ICAVIET_chdt_pdf_kv($pdf, 'Số an sinh xã hội SSN', $sv('ssn'));
ICAVIET_chdt_pdf_kv($pdf, 'Nghề nghiệp hiện tại', $sv('ngheNghiep'));
ICAVIET_chdt_pdf_kv($pdf, 'Nơi làm việc', $sv('noiLamViec'));
ICAVIET_chdt_pdf_kv($pdf, 'Địa chỉ nơi làm việc', $sv('diaChiLamViec'));

$pdf->Ln(2);

// Tiêu đề bảng công việc
$pdf->SetFont('DejaVu', 'B', 11);
$pdf->SetTextColor(15, 22, 74);
$pdf->MultiCell(
    182,
    6.2,
    'Cung cấp thông tin về các công việc, địa chỉ đã từ ở từ năm 15 tuổi (Không bao gồm công việc' . "\n" . 'và địa chỉ hiện tại)',
    0,
    'L'
);

$pdf->Ln(1);

// Bảng work history
$tableX = 13;
$tableWidths = array(46, 46, 46, 46);

ICAVIET_chdt_pdf_table_row(
    $pdf,
    $tableX,
    $tableWidths,
    array('Từ năm', 'Đến năm', 'Công việc', 'Địa chỉ nơi ở'),
    true
);

$workItems = isset($data['__work']) && is_array($data['__work']) ? $data['__work'] : array();
$hasWork = false;

foreach ($workItems as $w) {
    $from = isset($w['fromYear']) ? trim((string) $w['fromYear']) : '';
    $to   = isset($w['toYear']) ? trim((string) $w['toYear']) : '';
    $job  = isset($w['job']) ? trim((string) $w['job']) : '';
    $addr = isset($w['address']) ? trim((string) $w['address']) : '';

    if ($from === '' && $to === '' && $job === '' && $addr === '') {
        continue;
    }

    $hasWork = true;

    ICAVIET_chdt_pdf_table_row(
        $pdf,
        $tableX,
        $tableWidths,
        array($from, $to, $job, $addr),
        false
    );
}

if (!$hasWork) {
    ICAVIET_chdt_pdf_table_row(
        $pdf,
        $tableX,
        $tableWidths,
        array('', '', '', ''),
        false
    );
}

ICAVIET_chdt_pdf_page_no($pdf, 1);

// ========= PAGE 2 =========
$pdf->AddPage();
$pdf->SetMargins(13, 12, 13);
$pdf->SetAutoPageBreak(false);

ICAVIET_chdt_pdf_bg($pdf, false);
$pdf->SetY(18);

// Bố
ICAVIET_chdt_pdf_section_title($pdf, 'Thông tin bố:', 20);
$pdf->Ln(3);
ICAVIET_chdt_pdf_kv($pdf, 'Họ và tên bố', $sv('bo_hoTen'));
ICAVIET_chdt_pdf_kv($pdf, 'Ngày sinh bố', $sv('bo_ngaySinh'));
ICAVIET_chdt_pdf_kv($pdf, 'Dân tộc của bố', $sv('bo_danToc'));
ICAVIET_chdt_pdf_kv($pdf, 'Quốc tịch bố', $sv('bo_quocTich'));
ICAVIET_chdt_pdf_kv($pdf, 'Quê quán bố', $sv('bo_queQuan'));
ICAVIET_chdt_pdf_kv($pdf, 'Nơi cư trú của bố', $sv('bo_noiCuTru'));

$pdf->Ln(4);

// Mẹ
ICAVIET_chdt_pdf_section_title($pdf, 'Thông tin mẹ:', 20);
$pdf->Ln(3);
ICAVIET_chdt_pdf_kv($pdf, 'Họ và tên mẹ', $sv('me_hoTen'));
ICAVIET_chdt_pdf_kv($pdf, 'Ngày sinh mẹ', $sv('me_ngaySinh'));
ICAVIET_chdt_pdf_kv($pdf, 'Dân tộc của mẹ', $sv('me_danToc'));
ICAVIET_chdt_pdf_kv($pdf, 'Quốc tịch mẹ', $sv('me_quocTich'));
ICAVIET_chdt_pdf_kv($pdf, 'Quê quán mẹ', $sv('me_queQuan'));
ICAVIET_chdt_pdf_kv($pdf, 'Nơi cư trú của mẹ', $sv('me_noiCuTru'));

$pdf->Ln(4);

// Vợ/chồng
ICAVIET_chdt_pdf_section_title($pdf, 'Thông tin vợ chồng', 20);
$pdf->Ln(3);
ICAVIET_chdt_pdf_kv($pdf, 'Họ và tên', $sv('honThe_hoTen'));
ICAVIET_chdt_pdf_kv($pdf, 'Nơi sinh', $sv('honThe_noiSinh'));

// Nếu có thêm dữ liệu ngoài mẫu, append cuối trang 2 theo cùng style
$siblings = isset($data['__siblings']) && is_array($data['__siblings']) ? $data['__siblings'] : array();
$marriages = isset($data['__marriage']) && is_array($data['__marriage']) ? $data['__marriage'] : array();

$hasSibling = false;
foreach ($siblings as $s) {
    if (!empty($s['hoTen']) || !empty($s['relationship']) || !empty($s['address']) || !empty($s['dob'])) {
        $hasSibling = true;
        break;
    }
}

if ($hasSibling) {
    $pdf->Ln(4);
    ICAVIET_chdt_pdf_section_title($pdf, 'Thông tin anh chị em', 18);
    $pdf->Ln(3);

    foreach ($siblings as $idx => $s) {
        $rel  = isset($s['relationship']) ? trim((string) $s['relationship']) : '';
        $name = isset($s['hoTen']) ? trim((string) $s['hoTen']) : '';
        $addr = isset($s['address']) ? trim((string) $s['address']) : '';
        $dob  = isset($s['dob']) ? trim((string) $s['dob']) : '';

        if ($rel === '' && $name === '' && $addr === '' && $dob === '') {
            continue;
        }

        ICAVIET_chdt_pdf_kv($pdf, 'Người ' . ($idx + 1), trim($rel . ' - ' . $name, ' -'));
        if ($dob !== '') {
            ICAVIET_chdt_pdf_kv($pdf, 'Ngày sinh', $dob, array('label_fs' => 9.5, 'value_fs' => 9.5));
        }
        if ($addr !== '') {
            ICAVIET_chdt_pdf_kv($pdf, 'Địa chỉ cư trú', $addr, array('label_fs' => 9.5, 'value_fs' => 9.5));
        }
        $pdf->Ln(1);
    }
}

$hasMarriage = false;
foreach ($marriages as $m) {
    if (!empty($m['fromYear']) || !empty($m['toYear']) || !empty($m['exName']) || !empty($m['exAddress']) || !empty($m['reason'])) {
        $hasMarriage = true;
        break;
    }
}

if ($hasMarriage) {
    if ($pdf->GetY() > 235) {
        ICAVIET_chdt_pdf_page_no($pdf, 2);
        $pdf->AddPage();
        $pdf->SetMargins(13, 12, 13);
        $pdf->SetAutoPageBreak(false);
        ICAVIET_chdt_pdf_bg($pdf, false);
        $pdf->SetY(18);
    } else {
        $pdf->Ln(4);
    }

    ICAVIET_chdt_pdf_section_title($pdf, 'Tình trạng hôn nhân', 18);
    $pdf->Ln(3);

    foreach ($marriages as $idx => $m) {
        $from   = isset($m['fromYear']) ? trim((string) $m['fromYear']) : '';
        $to     = isset($m['toYear']) ? trim((string) $m['toYear']) : '';
        $ex     = isset($m['exName']) ? trim((string) $m['exName']) : '';
        $addr   = isset($m['exAddress']) ? trim((string) $m['exAddress']) : '';
        $reason = isset($m['reason']) ? trim((string) $m['reason']) : '';

        if ($from === '' && $to === '' && $ex === '' && $addr === '' && $reason === '') {
            continue;
        }

        ICAVIET_chdt_pdf_kv($pdf, 'Lần ' . ($idx + 1), trim($from . ' - ' . $to . ' - ' . $ex, ' -'));
        if ($addr !== '') {
            ICAVIET_chdt_pdf_kv($pdf, 'Địa chỉ', $addr, array('label_fs' => 9.5, 'value_fs' => 9.5));
        }
        if ($reason !== '') {
            ICAVIET_chdt_pdf_kv($pdf, 'Lý do chấm dứt', $reason, array('label_fs' => 9.5, 'value_fs' => 9.5));
        }
        $pdf->Ln(1);
    }
}

ICAVIET_chdt_pdf_page_no($pdf, 2);
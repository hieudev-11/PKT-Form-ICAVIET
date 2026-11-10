<?php
if (!defined('ABSPATH')) {
    exit;
}

/**
 * PDF Template: Bao lanh
 * Mau moi theo file tham chieu Jotform/I-130 user gui:
 * - Bo cuc sach, chu xanh navy, khong dung gach dau dong.
 * - Label/value 2 cot, value dang text hoac pill xam nhe.
 * - Cac muc danh sach hien thi bang co header xam nhat.
 *
 * Scope:
 *   $pdf  - ICAVIET_FPDF
 *   $data - array
 */

/* @var ICAVIET_FPDF $pdf */
/* @var array $data */

if (!function_exists('icaviet_bl_pdf_value')) {
    function icaviet_bl_pdf_value($value)
    {
        if (is_array($value)) {
            $parts = array();
            foreach ($value as $k => $v) {
                $v = icaviet_bl_pdf_value($v);
                if ($v === '') {
                    continue;
                }
                if (is_string($k) && !is_numeric($k)) {
                    $parts[] = $k . ': ' . $v;
                } else {
                    $parts[] = $v;
                }
            }
            return trim(implode('; ', $parts));
        }

        $value = trim((string) $value);
        if (strpos($value, 'data:image/') === 0) {
            return '';
        }
        return $value;
    }
}

if (!function_exists('icaviet_bl_pdf_get')) {
    function icaviet_bl_pdf_get($data, $key, $default = '')
    {
        if (!isset($data[$key])) {
            return $default;
        }
        $value = icaviet_bl_pdf_value($data[$key]);
        return $value !== '' ? $value : $default;
    }
}


if (!function_exists('icaviet_bl_pdf_address_from_item')) {
    /**
     * AddressSelect hiện lưu địa chỉ thành nhiều field riêng:
     *   {base}Street, {base}City, {base}Province, {base}Zip, {base}Country
     * và cố ý để {base} = ''. Vì vậy PDF không được chỉ đọc mỗi {base}.
     */
    function icaviet_bl_pdf_address_from_item($item, $base = 'diaChi')
    {
        if (!is_array($item)) {
            return icaviet_bl_pdf_value($item);
        }

        $direct = isset($item[$base]) ? icaviet_bl_pdf_value($item[$base]) : '';
        if ($direct !== '') {
            return $direct;
        }

        $parts = array();
        $keys = array(
            $base . 'Street',
            $base . 'Line1',
            $base . 'City',
            $base . 'Province',
            $base . 'State',
            $base . 'Zip',
            $base . 'ZipCode',
            $base . 'Country',
        );

        foreach ($keys as $key) {
            if (!isset($item[$key])) {
                continue;
            }
            $value = icaviet_bl_pdf_value($item[$key]);
            if ($value !== '' && !in_array($value, $parts, true)) {
                $parts[] = $value;
            }
        }

        if (empty($parts) && isset($item[$base . 'Parts']) && is_array($item[$base . 'Parts'])) {
            foreach (array('street', 'line1', 'city', 'province', 'state', 'zip', 'zipCode', 'country') as $key) {
                if (!isset($item[$base . 'Parts'][$key])) {
                    continue;
                }
                $value = icaviet_bl_pdf_value($item[$base . 'Parts'][$key]);
                if ($value !== '' && !in_array($value, $parts, true)) {
                    $parts[] = $value;
                }
            }
        }

        return trim(implode(', ', $parts));
    }
}

if (!function_exists('icaviet_bl_pdf_case_label')) {
    function icaviet_bl_pdf_case_label($case)
    {
        $map = array(
            'anh-chi-em' => 'Mở hồ sơ bảo lãnh anh chị em',
            'cha-me'     => 'Mở hồ sơ bảo lãnh cha mẹ',
            'vo-chong'   => 'Mở hồ sơ bảo lãnh vợ chồng',
            'hon-phu'    => 'Mở hồ sơ bảo lãnh hôn phu - hôn thê',
            'con-gai'    => 'Mở hồ sơ bảo lãnh con cái',
        );
        return isset($map[$case]) ? $map[$case] : $case;
    }
}

if (!function_exists('icaviet_bl_pdf_is_empty_row')) {
    function icaviet_bl_pdf_is_empty_row($row)
    {
        return icaviet_bl_pdf_value($row) === '';
    }
}

if (!function_exists('icaviet_bl_pdf_clean_rows')) {
    function icaviet_bl_pdf_clean_rows($rows)
    {
        if (!is_array($rows)) {
            return array();
        }
        $out = array();
        foreach ($rows as $row) {
            if (!is_array($row) || icaviet_bl_pdf_is_empty_row($row)) {
                continue;
            }
            $out[] = $row;
        }
        return $out;
    }
}

if (!function_exists('icaviet_bl_pdf_date')) {
    function icaviet_bl_pdf_date($value)
    {
        $value = trim((string) $value);
        if ($value === '') {
            return '';
        }
        if (preg_match('/^\d{1,2}\/\d{1,2}\/\d{4}$/', $value)) {
            $parts = explode('/', $value);
            return 'Ngày ' . intval($parts[0]) . ' tháng ' . intval($parts[1]) . ' năm ' . intval($parts[2]);
        }
        if (preg_match('/^\d{4}-\d{1,2}-\d{1,2}$/', $value)) {
            $parts = explode('-', $value);
            return 'Ngày ' . intval($parts[2]) . ' tháng ' . intval($parts[1]) . ' năm ' . intval($parts[0]);
        }
        if (preg_match('/^\d{1,2}\/\d{4}$/', $value)) {
            $parts = explode('/', $value);
            return 'Tháng ' . intval($parts[0]) . ' năm ' . intval($parts[1]);
        }
        if (preg_match('/^\d{4}$/', $value)) {
            return 'Năm ' . intval($value);
        }
        return $value;
    }
}

if (!function_exists('icaviet_bl_pdf_split_full_name')) {
    /**
     * Du lieu cu (truoc khi form co field _ho/_tenLot/_ten rieng) chi luu 1
     * chuoi ten gop. Tach lai theo dung quy tac cac form Vue dang dung: tu
     * dau -> Ho, tu cuoi -> Ten, cac tu o giua -> Ten lot.
     */
    function icaviet_bl_pdf_split_full_name($full)
    {
        $full = trim((string) $full);
        if ($full === '') {
            return array('', '', '');
        }
        $words = preg_split('/\s+/u', $full, -1, PREG_SPLIT_NO_EMPTY);
        $count = count($words);
        if ($count === 0) {
            return array('', '', '');
        }
        if ($count === 1) {
            return array($words[0], '', '');
        }
        if ($count === 2) {
            return array($words[0], '', $words[1]);
        }
        $ho = $words[0];
        $ten = $words[$count - 1];
        $ten_lot = implode(' ', array_slice($words, 1, $count - 2));
        return array($ho, $ten_lot, $ten);
    }
}

if (!function_exists('icaviet_bl_pdf_name_parts')) {
    /**
     * Cac form Vue (BaoLanh*.vue) da luu san Ho/Ten lot/Ten thanh field
     * rieng {base}_ho, {base}_tenLot, {base}_ten (song song voi field gop
     * {base}). Doc ca 2 nguon roi chon nguon "day du" hon (nhieu tu hon) -
     * vi co truong hop cac field tach chi duoc dien mot phan (vd chi go
     * "MARI" vao o Ho roi bo trong Ten lot/Ten) trong khi field gop {base}
     * van con luu day du ten. Tra ve array(ho, ten_lot, ten).
     */
    function icaviet_bl_pdf_name_parts($source, $base = 'ten')
    {
        if (!is_array($source)) {
            return array('', '', '');
        }
        $ho = isset($source[$base . '_ho']) ? icaviet_bl_pdf_value($source[$base . '_ho']) : '';
        $ten_lot = isset($source[$base . '_tenLot']) ? icaviet_bl_pdf_value($source[$base . '_tenLot']) : '';
        $ten = isset($source[$base . '_ten']) ? icaviet_bl_pdf_value($source[$base . '_ten']) : '';
        $combined = isset($source[$base]) ? icaviet_bl_pdf_value($source[$base]) : '';

        $split_joined = trim(implode(' ', array_filter(array($ho, $ten_lot, $ten), function ($v) {
            return $v !== '';
        })));
        $split_word_count = $split_joined === '' ? 0 : count(preg_split('/\s+/u', $split_joined, -1, PREG_SPLIT_NO_EMPTY));
        $combined_word_count = $combined === '' ? 0 : count(preg_split('/\s+/u', $combined, -1, PREG_SPLIT_NO_EMPTY));

        if ($split_word_count > 0 && $split_word_count >= $combined_word_count) {
            return array($ho, $ten_lot, $ten);
        }
        if ($combined_word_count > 0) {
            return icaviet_bl_pdf_split_full_name($combined);
        }
        return array($ho, $ten_lot, $ten);
    }
}

if (!function_exists('icaviet_bl_pdf_today')) {
    /**
     * Truoc day dung date_i18n('l, \t\h\á\n\g n j, Y') -> "Monday, tháng 8 3, 2026"
     * (thu tieng Anh, thang dung truoc ngay, thieu chu "ngay"/"nam"). Doi
     * sang dung tieng Viet + dong bo thu tu "Ngày D tháng M năm Y" nhu phan
     * con lai cua PDF: "Thứ Hai, ngày 3 tháng 8 năm 2026".
     */
    function icaviet_bl_pdf_today()
    {
        $ts = function_exists('current_time') ? current_time('timestamp') : time();
        $days = array(
            0 => 'Chủ nhật',
            1 => 'Thứ hai',
            2 => 'Thứ ba',
            3 => 'Thứ tư',
            4 => 'Thứ năm',
            5 => 'Thứ sáu',
            6 => 'Thứ bảy',
        );
        $w = (int) date('w', $ts);
        return $days[$w] . ', ngày ' . date('j', $ts) . ' tháng ' . date('n', $ts) . ' năm ' . date('Y', $ts);
    }
}

if (!function_exists('icaviet_bl_pdf_colors')) {
    function icaviet_bl_pdf_colors($pdf, $type = 'text')
    {
        if ($type === 'navy') {
            $pdf->SetTextColor(13, 19, 55);
        } elseif ($type === 'muted') {
            $pdf->SetTextColor(87, 91, 110);
        } elseif ($type === 'line') {
            $pdf->SetDrawColor(226, 229, 238);
        } else {
            $pdf->SetTextColor(35, 38, 55);
        }
    }
}

if (!function_exists('icaviet_bl_pdf_bottom_limit')) {
    /**
     * Moc ma FPDF tu dong ngat trang: chieu cao trang - bottom margin (20mm,
     * dat o SetAutoPageBreak ben duoi). Truoc day cac ham dung hang so 282 /
     * 280 - lon hon moc that (277) nen khoi noi dung "lot" qua vong kiem tra
     * roi bi FPDF ngat trang ngay giua khi dang ve -> lech toa do.
     */
    function icaviet_bl_pdf_bottom_limit($pdf)
    {
        return $pdf->GetPageHeight() - 20;
    }
}

if (!function_exists('icaviet_bl_pdf_check_page')) {
    function icaviet_bl_pdf_check_page($pdf, $needed = 12)
    {
        if (($pdf->GetY() + $needed) > icaviet_bl_pdf_bottom_limit($pdf)) {
            $pdf->AddPage();
            $pdf->SetY(16);
        }
    }
}

if (!function_exists('icaviet_bl_pdf_section')) {
    function icaviet_bl_pdf_section($pdf, $title, $space_before = 5)
    {
        // Tieu de mục (~12.5mm) + cho du cho it nhat mot dong noi dung, de
        // khong con canh tieu de nam tro troi o day trang.
        icaviet_bl_pdf_check_page($pdf, 30);
        if ($space_before > 0) {
            $pdf->Ln($space_before);
        }
        icaviet_bl_pdf_colors($pdf, 'navy');
        $pdf->SetFont('DejaVu', 'B', 14);
        $pdf->MultiCell(0, 7, mb_strtoupper($title, 'UTF-8'), 0, 'L');
        $pdf->Ln(1.5);
        icaviet_bl_pdf_colors($pdf, 'line');
        $pdf->Line($pdf->GetX(), $pdf->GetY(), 190, $pdf->GetY());
        $pdf->Ln(3);
    }
}

if (!function_exists('icaviet_bl_pdf_text')) {
    function icaviet_bl_pdf_text($pdf, $text, $bold = false, $size = 10.5)
    {
        if (trim((string) $text) === '') {
            return;
        }
        icaviet_bl_pdf_check_page($pdf, 10);
        icaviet_bl_pdf_colors($pdf, $bold ? 'navy' : 'text');
        $pdf->SetFont('DejaVu', $bold ? 'B' : '', $size);
        $pdf->MultiCell(0, 6, $text, 0, 'L');
        $pdf->Ln(1);
    }
}

if (!function_exists('icaviet_bl_pdf_pair')) {
    function icaviet_bl_pdf_pair($pdf, $label, $value = '', $pill = false, $show_empty = false)
    {
        $value = icaviet_bl_pdf_value($value);
        if ($value === '' && !$show_empty) {
            return;
        }

        $label_w = 76;
        $value_w = 94;
        $line_h = 5.4;

        // Do truoc chieu cao that su cua ca nhan lan gia tri roi moi quyet
        // dinh sang trang. Neu de MultiCell cua nhan tu ngat trang giua chung
        // (nhan dai 2-3 dong roi vao cuoi trang), $y van con la toa do cua
        // trang cu trong khi con tro da o trang moi -> gia tri bi ve tit duoi
        // day trang sau va de lai mot trang gan nhu trong tron.
        icaviet_bl_pdf_colors($pdf, 'navy');
        $pdf->SetFont('DejaVu', 'B', 9.5);
        $need_label = icaviet_bl_pdf_lines_for_multicell($pdf, $label_w, $label . ':') * $line_h;
        if ($pill && $value !== '') {
            $need_value = 8;
        } else {
            $pdf->SetFont('DejaVu', '', 9.5);
            $need_value = icaviet_bl_pdf_lines_for_multicell($pdf, $value_w, $value) * $line_h;
        }
        icaviet_bl_pdf_check_page($pdf, max($need_label, $need_value) + 2);

        $x = $pdf->GetX();
        $y = $pdf->GetY();

        icaviet_bl_pdf_colors($pdf, 'navy');
        $pdf->SetFont('DejaVu', 'B', 9.5);
        $page_before = $pdf->PageNo();
        $pdf->MultiCell($label_w, $line_h, $label . ':', 0, 'L');
        if ($pdf->PageNo() !== $page_before) {
            // Truong hop bien (nhan dai hon mot trang): bam theo trang moi.
            $x = 20;
            $y = 16;
        }
        $label_h = max($line_h, $pdf->GetY() - $y);

        $pdf->SetXY($x + $label_w + 4, $y);
        if ($pill && $value !== '') {
            $tw = min($value_w, max(16, $pdf->GetStringWidth($value) + 8));
            $pdf->SetFillColor(235, 238, 246);
            $pdf->SetDrawColor(235, 238, 246);
            $pdf->Rect($x + $label_w + 4, $y + .4, $tw, 7, 'F');
            $pdf->SetXY($x + $label_w + 7, $y + 1.1);
            icaviet_bl_pdf_colors($pdf, 'muted');
            $pdf->SetFont('DejaVu', '', 9.2);
            $pdf->Cell($tw - 6, 5, $value, 0, 0, 'L');
            $value_h = 8;
        } else {
            icaviet_bl_pdf_colors($pdf, 'muted');
            $pdf->SetFont('DejaVu', '', 9.5);
            $pdf->MultiCell($value_w, $line_h, $value, 0, 'L');
            $value_h = max($line_h, $pdf->GetY() - $y);
        }

        $pdf->SetXY($x, $y + max($label_h, $value_h) + 2);
    }
}

if (!function_exists('icaviet_bl_pdf_lines_for_width')) {
    function icaviet_bl_pdf_lines_for_width($pdf, $w, $txt)
    {
        $txt = trim((string) $txt);
        if ($txt === '') {
            return 1;
        }
        $paragraphs = preg_split('/\r\n|\r|\n/', $txt);
        $lines = 0;
        foreach ($paragraphs as $para) {
            $words = preg_split('/\s+/', trim($para));
            $line = '';
            foreach ($words as $word) {
                if ($word === '') {
                    continue;
                }
                $test = $line === '' ? $word : $line . ' ' . $word;
                // -3 khop voi MultiCell($w-3,...) o noi goi; -2 them la 2*cMargin (le trong FPDF tu them
                // vao trong MultiCell) de so dong uoc luong khop voi so dong MultiCell thuc su xuong dong,
                // tranh chu bi tran khoi hang va bi de/rot khi ve hang ke tiep.
                if ($pdf->GetStringWidth($test) <= ($w - 3 - 2)) {
                    $line = $test;
                } else {
                    $lines++;
                    $line = $word;
                }
            }
            $lines += $line === '' ? 1 : 1;
        }
        return max(1, $lines);
    }
}

if (!function_exists('icaviet_bl_pdf_lines_for_multicell')) {
    /**
     * So dong khi goi truc tiep MultiCell($w, ...) - khac
     * icaviet_bl_pdf_lines_for_width von danh cho o bang (noi MultiCell duoc
     * goi voi $w - 3). Cong bu 3mm de dung chung mot cong thuc do chu.
     */
    function icaviet_bl_pdf_lines_for_multicell($pdf, $w, $txt)
    {
        return icaviet_bl_pdf_lines_for_width($pdf, $w + 3, $txt);
    }
}

if (!function_exists('icaviet_bl_pdf_table_header')) {
    function icaviet_bl_pdf_table_header($pdf, $columns, $widths)
    {
        $x = $pdf->GetX();
        $y = $pdf->GetY();
        $h = 8;
        $pdf->SetFillColor(241, 242, 251);
        $pdf->SetDrawColor(226, 229, 238);
        icaviet_bl_pdf_colors($pdf, 'navy');
        $pdf->SetFont('DejaVu', 'B', 8.4);
        foreach ($columns as $i => $col) {
            $w = $widths[$i];
            $pdf->Rect($x, $y, $w, $h, 'DF');
            $pdf->SetXY($x + 1, $y + 1.2);
            $pdf->MultiCell($w - 2, 3.4, $col, 0, 'C');
            $x += $w;
        }
        $pdf->SetXY(20, $y + $h);
    }
}

if (!function_exists('icaviet_bl_pdf_table')) {
    function icaviet_bl_pdf_table($pdf, $columns, $rows, $widths)
    {
        $rows = icaviet_bl_pdf_clean_rows($rows);
        if (count($rows) === 0) {
            return;
        }

        icaviet_bl_pdf_check_page($pdf, 18);
        icaviet_bl_pdf_table_header($pdf, $columns, $widths);

        foreach ($rows as $row) {
            $pdf->SetFont('DejaVu', '', 8.5);
            $line_h = 4.5;
            $max_lines = 1;
            foreach ($columns as $i => $col) {
                $txt = isset($row[$i]) ? icaviet_bl_pdf_value($row[$i]) : '';
                $max_lines = max($max_lines, icaviet_bl_pdf_lines_for_width($pdf, $widths[$i], $txt));
            }
            $h = max(8, $max_lines * $line_h + 3);
            if ($pdf->GetY() + $h > icaviet_bl_pdf_bottom_limit($pdf)) {
                $pdf->AddPage();
                $pdf->SetY(16);
                icaviet_bl_pdf_table_header($pdf, $columns, $widths);
            }

            $x = $pdf->GetX();
            $y = $pdf->GetY();
            $pdf->SetFillColor(255, 255, 255);
            $pdf->SetDrawColor(226, 229, 238);
            icaviet_bl_pdf_colors($pdf, 'muted');
            foreach ($columns as $i => $col) {
                $w = $widths[$i];
                $txt = isset($row[$i]) ? icaviet_bl_pdf_value($row[$i]) : '';
                $pdf->Rect($x, $y, $w, $h, 'D');
                $pdf->SetXY($x + 1.5, $y + 1.8);
                $pdf->MultiCell($w - 3, $line_h, $txt, 0, 'L');
                $x += $w;
            }
            $pdf->SetXY(20, $y + $h);
        }
        $pdf->Ln(3);
    }
}

if (!function_exists('icaviet_bl_pdf_resolve_field_value')) {
    function icaviet_bl_pdf_resolve_field_value($item, $field)
    {
        if (is_array($field)) {
            $value = '';
            foreach ($field as $candidate) {
                $value = icaviet_bl_pdf_resolve_field_value($item, $candidate);
                if ($value !== '') {
                    break;
                }
            }
            return $value;
        }
        if (is_string($field) && strpos($field, 'diaChi') !== false) {
            return icaviet_bl_pdf_address_from_item($item, $field);
        }
        $value = isset($item[$field]) ? icaviet_bl_pdf_value($item[$field]) : '';
        if ($value !== '' && is_string($field) && strpos($field, 'ngay') === 0) {
            $value = icaviet_bl_pdf_date($value);
        }
        return $value;
    }
}

if (!function_exists('icaviet_bl_pdf_rows_from_array')) {
    function icaviet_bl_pdf_rows_from_array($items, $fields)
    {
        $items = icaviet_bl_pdf_clean_rows($items);
        $rows = array();
        foreach ($items as $item) {
            $row = array();
            foreach ($fields as $field) {
                $row[] = icaviet_bl_pdf_resolve_field_value($item, $field);
            }
            $rows[] = $row;
        }
        return $rows;
    }
}

if (!function_exists('icaviet_bl_pdf_name_multiline')) {
    /**
     * Gop Ho/Ten lot/Ten thanh 1 gia tri nhieu dong (moi phan 1 dong) de
     * hien thi trong 1 cot bang duy nhat thay vi 3 cot rieng qua chat hep
     * khi ket hop voi cac cot khac (Ngay sinh, Noi sinh...).
     */
    function icaviet_bl_pdf_name_multiline($ho, $ten_lot, $ten)
    {
        $lines = array();
        if ($ho !== '') {
            $lines[] = 'Họ: ' . $ho;
        }
        if ($ten_lot !== '') {
            $lines[] = 'Tên lót: ' . $ten_lot;
        }
        if ($ten !== '') {
            $lines[] = 'Tên: ' . $ten;
        }
        return implode("\n", $lines);
    }
}

if (!function_exists('icaviet_bl_pdf_name_rows_from_array')) {
    /**
     * Giong icaviet_bl_pdf_rows_from_array nhung cot dau tien la Ho va Ten
     * gop tu {name_base}_ho/_tenLot/_ten cua tung dong, hien thi thanh 3
     * dong rieng trong cung 1 cot (xem icaviet_bl_pdf_name_multiline), theo
     * sau boi cac $extra_fields con lai.
     */
    function icaviet_bl_pdf_name_rows_from_array($items, $extra_fields, $name_base = 'ten')
    {
        $items = icaviet_bl_pdf_clean_rows($items);
        $rows = array();
        foreach ($items as $item) {
            list($ho, $ten_lot, $ten) = icaviet_bl_pdf_name_parts($item, $name_base);
            $row = array(icaviet_bl_pdf_name_multiline($ho, $ten_lot, $ten));
            foreach ($extra_fields as $field) {
                $row[] = icaviet_bl_pdf_resolve_field_value($item, $field);
            }
            $rows[] = $row;
        }
        return $rows;
    }
}

if (!function_exists('icaviet_bl_pdf_draw_signature')) {
    function icaviet_bl_pdf_draw_signature($pdf, $data)
    {
        $keys = array('chuKy', 'chuKyNguoiDienDon', 'signature', 'signatureData', 'nguoiDienDonSignature');
        foreach ($keys as $key) {
            if (!empty($data[$key]) && is_string($data[$key]) && strpos($data[$key], 'data:image/') === 0) {
                $tmp = tempnam(sys_get_temp_dir(), 'icaviet_sig_');
                $img = preg_replace('/^data:image\/\w+;base64,/', '', $data[$key]);
                file_put_contents($tmp, base64_decode($img));
                $pdf->Image($tmp, $pdf->GetX(), $pdf->GetY(), 45, 18);
                @unlink($tmp);
                return true;
            }
        }
        return false;
    }
}

$case_type = icaviet_bl_pdf_get($data, 'loaiHoSoBaoLanh');
$case_label = icaviet_bl_pdf_case_label($case_type);

$pdf->SetMargins(20, 16, 20);
$pdf->SetAutoPageBreak(true, 20);
$pdf->SetTextColor(35, 38, 55);

// Header giong mau: ngay tao + tieu de lon.
icaviet_bl_pdf_colors($pdf, 'muted');
$pdf->SetFont('DejaVu', '', 8.5);
$pdf->Cell(0, 5, icaviet_bl_pdf_today(), 0, 1, 'L');
$pdf->Ln(2);

icaviet_bl_pdf_colors($pdf, 'navy');
$pdf->SetFont('DejaVu', 'B', 17);
$pdf->MultiCell(0, 8, 'XÁC NHẬN THÔNG TIN CÁ NHÂN', 0, 'C');
$pdf->Ln(3);

icaviet_bl_pdf_colors($pdf, 'text');
$pdf->SetFont('DejaVu', '', 10.5);
$pdf->Write(6, 'Mục đích điền đơn: ');
$pdf->SetFont('DejaVu', 'B', 10.5);
$pdf->Write(6, $case_label);
$pdf->Ln(10);

icaviet_bl_pdf_section($pdf, 'Thông tin cá nhân của đương đơn', 2);
list($ho_trenGiayTo, $tenLot_trenGiayTo, $ten_trenGiayTo) = icaviet_bl_pdf_name_parts($data, 'tenTrenGiayTo');
icaviet_bl_pdf_pair($pdf, 'Họ', $ho_trenGiayTo);
icaviet_bl_pdf_pair($pdf, 'Tên lót', $tenLot_trenGiayTo);
icaviet_bl_pdf_pair($pdf, 'Tên', $ten_trenGiayTo);

list($ho_goiKhac, $tenLot_goiKhac, $ten_goiKhac) = icaviet_bl_pdf_name_parts($data, 'tenGoiKhac');
icaviet_bl_pdf_pair($pdf, 'Họ (tên gọi khác)', $ho_goiKhac);
icaviet_bl_pdf_pair($pdf, 'Tên lót (tên gọi khác)', $tenLot_goiKhac);
icaviet_bl_pdf_pair($pdf, 'Tên (tên gọi khác)', $ten_goiKhac);
icaviet_bl_pdf_pair($pdf, 'Ngày sinh (Ngày tháng năm)', icaviet_bl_pdf_date(icaviet_bl_pdf_get($data, 'ngaySinh')));
icaviet_bl_pdf_pair($pdf, 'Giới tính', icaviet_bl_pdf_get($data, 'gioiTinh'), true);
icaviet_bl_pdf_pair($pdf, 'Nơi sinh (thành phố, tỉnh, quốc gia)', icaviet_bl_pdf_get($data, 'noiSinh'));
icaviet_bl_pdf_pair($pdf, 'Chiều cao (feet & inches)', icaviet_bl_pdf_get($data, 'chieuCao'));
icaviet_bl_pdf_pair($pdf, 'Cân nặng (Pounds)', icaviet_bl_pdf_get($data, 'canNang'));
icaviet_bl_pdf_pair($pdf, 'Có phải dân tộc Mỹ Latinh không?', icaviet_bl_pdf_get($data, 'danTocMyLatinh'), true);
icaviet_bl_pdf_pair($pdf, 'Màu mắt', trim(icaviet_bl_pdf_get($data, 'mauMat') . ' ' . icaviet_bl_pdf_get($data, 'mauMatKhac')));
icaviet_bl_pdf_pair($pdf, 'Màu tóc', trim(icaviet_bl_pdf_get($data, 'mauToc') . ' ' . icaviet_bl_pdf_get($data, 'mauTocKhac')));
icaviet_bl_pdf_pair($pdf, 'Chủng tộc', icaviet_bl_pdf_get($data, 'chungToc'));
icaviet_bl_pdf_pair($pdf, 'Địa chỉ nhận thư ở Mỹ', icaviet_bl_pdf_address_from_item($data, 'diaChiNhanThuMy'));
icaviet_bl_pdf_pair($pdf, 'Tình trạng cư trú hiện tại ở Mỹ', icaviet_bl_pdf_get($data, 'tinhTrangCuTruMy'));
icaviet_bl_pdf_pair($pdf, 'Số điện thoại', icaviet_bl_pdf_get($data, 'soDienThoai'));
icaviet_bl_pdf_pair($pdf, 'Email', icaviet_bl_pdf_get($data, 'email'));
icaviet_bl_pdf_pair($pdf, 'Số SSN', icaviet_bl_pdf_get($data, 'soSsn'));

icaviet_bl_pdf_section($pdf, 'Thông tin thường trú nhân / công dân', 4);
icaviet_bl_pdf_pair($pdf, 'Số thẻ xanh', icaviet_bl_pdf_get($data, 'soTheXanh'));
icaviet_bl_pdf_pair($pdf, 'Nơi cấp thẻ xanh', icaviet_bl_pdf_get($data, 'noiCapTheXanh'));
icaviet_bl_pdf_pair($pdf, 'Ngày cấp thẻ xanh', icaviet_bl_pdf_date(icaviet_bl_pdf_get($data, 'ngayCapTheXanh')));
icaviet_bl_pdf_pair($pdf, 'Thẻ xanh diện con nuôi', icaviet_bl_pdf_get($data, 'theXanhDienConNuoi'), true);
icaviet_bl_pdf_pair($pdf, 'Thẻ xanh diện kết hôn', icaviet_bl_pdf_get($data, 'theXanhDienKetHon'), true);
icaviet_bl_pdf_pair($pdf, 'Có quốc tịch theo diện', icaviet_bl_pdf_get($data, 'dienQuocTich'));
icaviet_bl_pdf_pair($pdf, 'Số chứng nhận trên giấy quốc tịch', icaviet_bl_pdf_get($data, 'soChungNhanQuocTich'));
icaviet_bl_pdf_pair($pdf, 'Nơi cấp', icaviet_bl_pdf_get($data, 'noiCapQuocTich'));
icaviet_bl_pdf_pair($pdf, 'Ngày cấp', icaviet_bl_pdf_date(icaviet_bl_pdf_get($data, 'ngayCapQuocTich')));
icaviet_bl_pdf_pair($pdf, 'Có quốc tịch theo diện con nuôi không?', icaviet_bl_pdf_get($data, 'quocTichDienConNuoi'), true);

icaviet_bl_pdf_section($pdf, 'Tài khoản USCIS và bảo lãnh', 4);
icaviet_bl_pdf_pair($pdf, 'Đã từng mở tài khoản USCIS online chưa?', icaviet_bl_pdf_get($data, 'tungMoTaiKhoanUscis'), true);
icaviet_bl_pdf_pair($pdf, 'Số tài khoản USCIS online', icaviet_bl_pdf_get($data, 'soTaiKhoanUscis'));
icaviet_bl_pdf_pair($pdf, 'Bạn đã từng nộp hồ sơ bảo lãnh nhập cư Mỹ trước đây chưa?', icaviet_bl_pdf_get($data, 'tungBaoLanh'), true);
icaviet_bl_pdf_pair($pdf, 'Tổng số hồ sơ đã bảo lãnh', icaviet_bl_pdf_get($data, 'tongSoHoSoBaoLanh'));
icaviet_bl_pdf_pair($pdf, 'Bạn có đang nộp hồ sơ bảo lãnh nhập cư Mỹ cho ai khác không?', icaviet_bl_pdf_get($data, 'dangBaoLanhAiKhac'), true);
icaviet_bl_pdf_pair($pdf, 'Tổng số hồ sơ đang bảo lãnh', icaviet_bl_pdf_get($data, 'tongSoHoSoDangBaoLanh'));
icaviet_bl_pdf_pair($pdf, 'Đã từng bị lệnh cách ly tạm thời hoặc vĩnh viễn chưa?', icaviet_bl_pdf_get($data, 'tungBiCachLy', icaviet_bl_pdf_get($data, 'lenhCachLy')), true);
icaviet_bl_pdf_pair($pdf, 'Đã từng bị bắt hoặc nhận án tích trừ tòa án chưa?', icaviet_bl_pdf_get($data, 'tungBiBat', icaviet_bl_pdf_get($data, 'biBatGiu')), true);

$father_rows = icaviet_bl_pdf_name_rows_from_array(isset($data['thongTinCha']) ? $data['thongTinCha'] : array(), array('ngaySinh', 'noiSinh', array('diaChi', 'namMat')));
if (count($father_rows) > 0) {
    icaviet_bl_pdf_section($pdf, 'Thông tin của cha', 4);
    icaviet_bl_pdf_table($pdf, array('Tên cha', 'Ngày sinh', 'Nơi sinh', 'Địa chỉ ở (nếu mất, ghi năm mất)'), $father_rows, array(42, 42, 40, 46));
}

$mother_rows = icaviet_bl_pdf_name_rows_from_array(isset($data['thongTinMe']) ? $data['thongTinMe'] : array(), array('ngaySinh', 'noiSinh', array('diaChi', 'namMat')));
if (count($mother_rows) > 0) {
    icaviet_bl_pdf_section($pdf, 'Thông tin của mẹ', 2);
    icaviet_bl_pdf_table($pdf, array('Tên mẹ', 'Ngày sinh', 'Nơi sinh', 'Địa chỉ ở (nếu mất, ghi năm mất)'), $mother_rows, array(42, 42, 40, 46));
}

icaviet_bl_pdf_section($pdf, 'Thông tin hôn nhân', 4);
icaviet_bl_pdf_pair($pdf, 'Tình trạng hôn nhân hiện tại', icaviet_bl_pdf_get($data, 'tinhTrangHonNhan'), true, true);

$spouse_rows = icaviet_bl_pdf_name_rows_from_array(isset($data['honPhoiHienTai']) ? $data['honPhoiHienTai'] : array(), array('ngaySinh', 'noiSinh', 'ngayKetHon', 'noiKetHon', 'diaChiSongChung'));
if (count($spouse_rows) > 0) {
    icaviet_bl_pdf_text($pdf, 'Thông tin hôn phối hiện tại:', true, 10);
    icaviet_bl_pdf_table($pdf, array('Họ và tên', 'Ngày sinh', 'Nơi sinh', 'Ngày kết hôn', 'Nơi kết hôn', 'Địa chỉ sống chung'), $spouse_rows, array(28, 28, 28, 28, 28, 30));
}

$old_marriage_rows = icaviet_bl_pdf_name_rows_from_array(isset($data['honNhanCu']) ? $data['honNhanCu'] : array(), array('ngayLyHon'));
if (count($old_marriage_rows) > 0) {
    icaviet_bl_pdf_text($pdf, 'Thông tin hôn nhân cũ:', true, 10);
    icaviet_bl_pdf_table($pdf, array('Tên vợ/chồng cũ', 'Ngày kết thúc'), $old_marriage_rows, array(85, 85));
}

$dead_spouse_rows = icaviet_bl_pdf_name_rows_from_array(isset($data['honPhoiDaMat']) ? $data['honPhoiDaMat'] : array(), array('ngayMat'));
if (count($dead_spouse_rows) > 0) {
    icaviet_bl_pdf_text($pdf, 'Thông tin hôn phối đã mất:', true, 10);
    icaviet_bl_pdf_table($pdf, array('Tên hôn phối', 'Ngày mất'), $dead_spouse_rows, array(85, 85));
}

$child_rows = icaviet_bl_pdf_name_rows_from_array(isset($data['thongTinConCai']) ? $data['thongTinConCai'] : array(), array('ngaySinh'));
if (count($child_rows) > 0) {
    icaviet_bl_pdf_section($pdf, 'Thông tin con cái', 4);
    icaviet_bl_pdf_table($pdf, array('Tên con', 'Ngày sinh'), $child_rows, array(95, 75));
}

// Phan rieng cho hon phu - hon the neu co du lieu.
if (icaviet_bl_pdf_get($data, 'coConDuoi18Tuoi') !== '' || icaviet_bl_pdf_get($data, 'coHoHang') !== '' || icaviet_bl_pdf_get($data, 'quenNhauQuaDau') !== '') {
    icaviet_bl_pdf_section($pdf, 'Thông tin con cái và quan hệ', 4);
    icaviet_bl_pdf_pair($pdf, 'Có con dưới 18 tuổi', icaviet_bl_pdf_get($data, 'coConDuoi18Tuoi'), true);
    icaviet_bl_pdf_pair($pdf, 'Có họ hàng với nhau không', icaviet_bl_pdf_get($data, 'coHoHang'), true);
    icaviet_bl_pdf_pair($pdf, 'Quen nhau qua đâu', icaviet_bl_pdf_get($data, 'quenNhauQuaDau'));
}

// Cong ty moi gioi dung chung field _ho/_tenLot/_ten voi cac bang ten
// nguoi (Vue tai su dung component nhap ten), nhung day la ten cong ty
// nen ghep lai thanh 1 cot "Ten cong ty" thay vi tach 3 cot Ho/Ten lot/Ten.
$broker_items = icaviet_bl_pdf_clean_rows(isset($data['congTyMoiGioi']) ? $data['congTyMoiGioi'] : array());
$broker_rows = array();
foreach ($broker_items as $item) {
    list($ho_cty, $tenLot_cty, $ten_cty) = icaviet_bl_pdf_name_parts($item, 'ten');
    $ten_cong_ty = trim(implode(' ', array_filter(array($ho_cty, $tenLot_cty, $ten_cty), function ($v) {
        return $v !== '';
    })));
    $broker_rows[] = array(
        $ten_cong_ty,
        icaviet_bl_pdf_resolve_field_value($item, 'website'),
        icaviet_bl_pdf_resolve_field_value($item, 'soDienThoai'),
    );
}
if (count($broker_rows) > 0) {
    icaviet_bl_pdf_section($pdf, 'Công ty môi giới', 4);
    icaviet_bl_pdf_table($pdf, array('Tên công ty', 'Website', 'Số điện thoại'), $broker_rows, array(62, 62, 46));
}

$ref_rows = icaviet_bl_pdf_name_rows_from_array(isset($data['nguoiGioiThieu']) ? $data['nguoiGioiThieu'] : array(), array('moiQuanHe', 'soDienThoai'));
if (count($ref_rows) > 0) {
    icaviet_bl_pdf_section($pdf, 'Người giới thiệu', 4);
    icaviet_bl_pdf_table($pdf, array('Họ và tên', 'Mối quan hệ', 'Số điện thoại'), $ref_rows, array(62, 62, 46));
}

$address_rows = icaviet_bl_pdf_rows_from_array(isset($data['diaChi5Nam']) ? $data['diaChi5Nam'] : array(), array('diaChi', 'ngayBatDau', 'ngayChuyenDi'));
if (count($address_rows) > 0) {
    icaviet_bl_pdf_section($pdf, 'Địa chỉ ở trong 5 năm qua', 4);
    icaviet_bl_pdf_text($pdf, 'Liệt kê các địa chỉ đã có trong 5 năm qua, ở bất kỳ quốc gia nào: (Liệt kê từ gần tới xa, bao gồm địa chỉ hiện tại đang ở) theo thứ tự: Địa chỉ - Ngày bắt đầu ở - Ngày chuyển đi', true, 9.2);
    icaviet_bl_pdf_table($pdf, array('Địa chỉ', 'Ngày bắt đầu ở', 'Ngày chuyển đi'), $address_rows, array(76, 47, 47));
}

$job_rows = icaviet_bl_pdf_rows_from_array(isset($data['congViec5Nam']) ? $data['congViec5Nam'] : array(), array('ngheNghiep', 'tenCongTy', 'diaChi', 'ngayNhanViec', 'ngayNghiViec'));
if (count($job_rows) > 0) {
    icaviet_bl_pdf_section($pdf, 'Công việc trong 5 năm qua', 4);
    icaviet_bl_pdf_text($pdf, 'Liệt kê những công việc đã làm trong 5 năm qua: (Liệt kê từ gần tới xa, bao gồm việc làm hiện tại đang làm) theo thứ tự nghề nghiệp - tên công ty - địa chỉ - ngày nhận việc - ngày nghỉ việc.', true, 9.2);
    icaviet_bl_pdf_table($pdf, array('Nghề nghiệp', 'Tên công ty', 'Địa chỉ', 'Ngày nhận việc', 'Ngày nghỉ việc'), $job_rows, array(32, 38, 48, 27, 25));
}

icaviet_bl_pdf_section($pdf, 'Số lần gặp mặt trong 2 năm', 4);
icaviet_bl_pdf_pair($pdf, 'Số lần / nội dung gặp mặt trong 2 năm', icaviet_bl_pdf_get($data, 'gapMat2Nam'));

icaviet_bl_pdf_section($pdf, 'Thông tin bổ sung', 4);
icaviet_bl_pdf_pair($pdf, 'Ghi chú', icaviet_bl_pdf_get($data, 'ghiChu'));
list($ho_dienDon, $tenLot_dienDon, $ten_dienDon) = icaviet_bl_pdf_name_parts($data, 'tenNguoiDienDon');
if ($ho_dienDon === '' && $tenLot_dienDon === '' && $ten_dienDon === '') {
    list($ho_dienDon, $tenLot_dienDon, $ten_dienDon) = icaviet_bl_pdf_name_parts($data, 'tenTrenGiayTo');
}
icaviet_bl_pdf_pair($pdf, 'Họ của người điền đơn', $ho_dienDon, false, true);
icaviet_bl_pdf_pair($pdf, 'Tên lót của người điền đơn', $tenLot_dienDon, false, true);
icaviet_bl_pdf_pair($pdf, 'Tên của người điền đơn', $ten_dienDon, false, true);

icaviet_bl_pdf_check_page($pdf, 30);
$x = $pdf->GetX();
$y = $pdf->GetY();
icaviet_bl_pdf_colors($pdf, 'navy');
$pdf->SetFont('DejaVu', 'B', 9.5);
$pdf->MultiCell(76, 5.4, 'Chữ nhận dạng xác thực của người điền đơn:', 0, 'L');
$pdf->SetXY($x + 80, $y);
if (!icaviet_bl_pdf_draw_signature($pdf, $data)) {
    icaviet_bl_pdf_colors($pdf, 'muted');
    $pdf->SetFont('DejaVu', '', 9.5);
    $pdf->Cell(90, 6, '', 'B', 1, 'L');
}

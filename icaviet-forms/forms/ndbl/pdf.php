<?php
if (!defined('ABSPATH')) {
    exit;
}

/**
 * PDF Template: Nguoi duoc bao lanh (NDBL)
 * Giao dien lay y tuong tu PDF Jotform mau user gui:
 * - Header nen xanh nhat, nhan dien ICAVIET, ngay tao ben phai
 * - Tieu de muc in dam mau xanh dam
 * - Doi voi gia tri ngan: hien thi dang pill nen xam xanh
 * - Doi voi danh sach: hien thi bang co header nen xam xanh
 *
 * Scope:
 *   $pdf  - ICAVIET_FPDF
 *   $data - array
 */

/* @var ICAVIET_FPDF $pdf */
/* @var array $data */

if (!function_exists('icaviet_ndbl_pdf_value')) {
    function icaviet_ndbl_pdf_value($value)
    {
        if (is_array($value)) {
            $parts = array();
            foreach ($value as $k => $v) {
                $v = icaviet_ndbl_pdf_value($v);
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

if (!function_exists('icaviet_ndbl_pdf_get')) {
    function icaviet_ndbl_pdf_get($data, $key, $default = '')
    {
        if (!isset($data[$key])) {
            return $default;
        }
        $value = icaviet_ndbl_pdf_value($data[$key]);
        return $value !== '' ? $value : $default;
    }
}

if (!function_exists('icaviet_ndbl_pdf_format_date')) {
    function icaviet_ndbl_pdf_format_date($value)
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

if (!function_exists('icaviet_ndbl_pdf_split_full_name')) {
    /**
     * Du lieu cu (truoc khi form co field _ho/_tenLot/_ten rieng) chi luu 1
     * chuoi ten gop. Tach lai theo dung quy tac cac form Vue dang dung: tu
     * dau -> Ho, tu cuoi -> Ten, cac tu o giua -> Ten lot.
     */
    function icaviet_ndbl_pdf_split_full_name($full)
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

if (!function_exists('icaviet_ndbl_pdf_name_parts')) {
    /**
     * Cac form Vue (NDBL*.vue) da luu san Ho/Ten lot/Ten thanh field rieng
     * {base}_ho, {base}_tenLot, {base}_ten (song song voi field gop
     * {base}). Doc ca 2 nguon roi chon nguon "day du" hon (nhieu tu hon) -
     * vi co truong hop cac field tach chi duoc dien mot phan trong khi field
     * gop {base} van con luu day du ten. Tra ve array(ho, ten_lot, ten).
     */
    function icaviet_ndbl_pdf_name_parts($source, $base = 'ten')
    {
        if (!is_array($source)) {
            return array('', '', '');
        }
        $ho = isset($source[$base . '_ho']) ? icaviet_ndbl_pdf_value($source[$base . '_ho']) : '';
        $ten_lot = isset($source[$base . '_tenLot']) ? icaviet_ndbl_pdf_value($source[$base . '_tenLot']) : '';
        $ten = isset($source[$base . '_ten']) ? icaviet_ndbl_pdf_value($source[$base . '_ten']) : '';
        $combined = isset($source[$base]) ? icaviet_ndbl_pdf_value($source[$base]) : '';

        $split_joined = trim(implode(' ', array_filter(array($ho, $ten_lot, $ten), function ($v) {
            return $v !== '';
        })));
        $split_word_count = $split_joined === '' ? 0 : count(preg_split('/\s+/u', $split_joined, -1, PREG_SPLIT_NO_EMPTY));
        $combined_word_count = $combined === '' ? 0 : count(preg_split('/\s+/u', $combined, -1, PREG_SPLIT_NO_EMPTY));

        if ($split_word_count > 0 && $split_word_count >= $combined_word_count) {
            return array($ho, $ten_lot, $ten);
        }
        if ($combined_word_count > 0) {
            return icaviet_ndbl_pdf_split_full_name($combined);
        }
        return array($ho, $ten_lot, $ten);
    }
}

if (!function_exists('icaviet_ndbl_pdf_name_multiline')) {
    /**
     * Gop Ho/Ten lot/Ten thanh 1 gia tri nhieu dong (moi phan 1 dong) de
     * hien thi gon trong 1 dong/1 cot duy nhat.
     */
    function icaviet_ndbl_pdf_name_multiline($ho, $ten_lot, $ten)
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

if (!function_exists('icaviet_ndbl_pdf_date')) {
    function icaviet_ndbl_pdf_date()
    {
        $ts = current_time('timestamp');
        $days = array(
            0 => 'chủ nhật',
            1 => 'thứ hai',
            2 => 'thứ ba',
            3 => 'thứ tư',
            4 => 'thứ năm',
            5 => 'thứ sáu',
            6 => 'thứ bảy',
        );
        // Truoc day: "$days[$w] . ', tháng ' . n . ' ' . j . ', ' . Y" -> "thứ hai, tháng 8 3, 2026"
        // (thang dung truoc ngay, thieu chu "ngay"/"nam"). Doi thu tu cho dung
        // "Ngày D tháng M năm Y" nhu phan con lai cua PDF.
        $w = (int) date('w', $ts);
        return $days[$w] . ', ngày ' . date('j', $ts) . ' tháng ' . date('n', $ts) . ' năm ' . date('Y', $ts);
    }
}

if (!function_exists('icaviet_ndbl_pdf_case_label')) {
    function icaviet_ndbl_pdf_case_label($case)
    {
        $map = array(
            'anh-chi-em' => 'Mở hồ sơ bảo lãnh anh chị em',
            'cha-me'     => 'Mở hồ sơ bảo lãnh cha mẹ',
            'vo-chong'   => 'Mở hồ sơ bảo lãnh vợ chồng',
            'hon-phu'    => 'Mở hồ sơ bảo lãnh hôn phu - hôn thê',
            'con-gai'    => 'Mở hồ sơ bảo lãnh con cái',
        );
        return isset($map[$case]) ? $map[$case] : ($case !== '' ? $case : 'Người được bảo lãnh');
    }
}

if (!function_exists('icaviet_ndbl_pdf_clean_array')) {
    function icaviet_ndbl_pdf_clean_array($items)
    {
        if (!is_array($items)) {
            return array();
        }
        $out = array();
        foreach ($items as $item) {
            if (!is_array($item)) {
                continue;
            }
            if (icaviet_ndbl_pdf_value($item) === '') {
                continue;
            }
            $out[] = $item;
        }
        return $out;
    }
}

if (!function_exists('icaviet_ndbl_pdf_check_page')) {
    function icaviet_ndbl_pdf_check_page($pdf, $needed = 16)
    {
        if ($pdf->GetY() > (280 - $needed)) {
            $pdf->AddPage();
            $pdf->SetY(18);
        }
    }
}

if (!function_exists('icaviet_ndbl_pdf_header')) {
    function icaviet_ndbl_pdf_header($pdf)
    {
        $pdf->SetFillColor(235, 238, 248);
        $pdf->Rect(0, 0, 210, 46, 'F');

        $pdf->SetXY(16, 15);
        $pdf->SetFont('DejaVu', 'B', 30);
        $pdf->SetTextColor(19, 57, 133);
        $pdf->Write(9, 'ICA');
        $pdf->SetTextColor(226, 36, 55);
        $pdf->Write(9, 'VIET');

        $pdf->SetXY(16, 25);
        $pdf->SetFont('DejaVu', 'B', 8);
        $pdf->SetTextColor(19, 57, 133);
        $pdf->Cell(0, 5, 'PROFESSIONAL IMMIGRATION SERVICE', 0, 1, 'L');
        $pdf->SetX(16);
        $pdf->SetFont('DejaVu', 'B', 7.5);
        $pdf->Cell(0, 5, 'XÁC NHẬN THÔNG TIN CÁ NHÂN', 0, 1, 'L');

        $pdf->SetXY(118, 17);
        $pdf->SetFont('DejaVu', '', 11);
        $pdf->SetTextColor(20, 20, 20);
        $pdf->Cell(76, 6, icaviet_ndbl_pdf_date(), 0, 0, 'R');

        $pdf->SetY(54);
    }
}

if (!function_exists('icaviet_ndbl_pdf_section')) {
    function icaviet_ndbl_pdf_section($pdf, $title)
    {
        icaviet_ndbl_pdf_check_page($pdf, 18);
        $pdf->Ln(4);
        $pdf->SetFont('DejaVu', 'B', 15);
        $pdf->SetTextColor(7, 13, 54);
        $pdf->MultiCell(0, 8, mb_strtoupper($title, 'UTF-8'), 0, 'L');
        $pdf->Ln(1);
    }
}

if (!function_exists('icaviet_ndbl_pdf_is_pill')) {
    function icaviet_ndbl_pdf_is_pill($value)
    {
        $v = trim((string) $value);
        if ($v === '') {
            return false;
        }
        // Gia tri nhieu dong (vd Ho/Ten lot/Ten tach rieng) khong duoc ve
        // dang pill - Cell() dung de ve pill khong xu ly xuong dong "\n".
        if (strpos($v, "\n") !== false) {
            return false;
        }
        if (mb_strlen($v, 'UTF-8') <= 18) {
            return true;
        }
        return false;
    }
}

if (!function_exists('icaviet_ndbl_pdf_row')) {
    function icaviet_ndbl_pdf_row($pdf, $label, $value = '')
    {
        $value = icaviet_ndbl_pdf_value($value);
        if ($value === '') {
            $value = 'N/A';
        }

        icaviet_ndbl_pdf_check_page($pdf, 13);

        $x = $pdf->GetX();
        $y = $pdf->GetY();
        $label_w = 76;
        $value_w = 96;
        $line_h = 6.8;

        $pdf->SetTextColor(7, 13, 54);
        $pdf->SetFont('DejaVu', 'B', 10.4);
        $pdf->MultiCell($label_w, $line_h, $label . ':', 0, 'L');
        $label_h = $pdf->GetY() - $y;

        $pdf->SetXY($x + $label_w + 3, $y);
        $pdf->SetTextColor(73, 80, 99);
        $pdf->SetFont('DejaVu', '', 10.2);

        if (icaviet_ndbl_pdf_is_pill($value)) {
            $pill_w = min($value_w, max(15, $pdf->GetStringWidth($value) + 8));
            $pdf->SetFillColor(231, 235, 246);
            icaviet_ndbl_pdf_pill_rect($pdf, $x + $label_w + 3, $y + 0.6, $pill_w, 6.8);
            $pdf->SetXY($x + $label_w + 6, $y + 1.2);
            $pdf->Cell($pill_w - 6, 5.5, $value, 0, 0, 'L');
            $value_h = 8;
        } else {
            $pdf->MultiCell($value_w, $line_h, $value, 0, 'L');
            $value_h = $pdf->GetY() - $y;
        }

        $pdf->SetXY($x, $y + max($label_h, $value_h) + 2.4);
    }
}

if (!function_exists('icaviet_ndbl_pdf_nb_lines')) {
    function icaviet_ndbl_pdf_nb_lines($pdf, $w, $txt)
    {
        $txt = trim((string) $txt);
        if ($txt === '') {
            return 1;
        }
        // Tach truoc theo \n thanh tung doan rieng (vd gia tri Ho/Ten lot/Ten
        // nhieu dong) - neu khong \n se bi coi nhu khoang trang thuong va bi
        // gop lai khi wrap, lam so dong uoc luong it hon so dong MultiCell
        // thuc su xuong dong (chu bi tran khoi hang va bi de/rot).
        $paragraphs = preg_split('/\r\n|\r|\n/', $txt);
        $lines = 0;
        foreach ($paragraphs as $para) {
            $words = preg_split('/\s+/u', trim($para), -1, PREG_SPLIT_NO_EMPTY);
            $line = '';
            foreach ($words as $word) {
                $test = $line === '' ? $word : $line . ' ' . $word;
                // -2.6 khop voi MultiCell($widths[$i]-2.6,...) o noi goi; -2 them la 2*cMargin
                // (le trong FPDF tu them vao trong MultiCell) de so dong uoc luong khop voi so dong
                // MultiCell thuc su xuong dong, tranh chu bi tran khoi hang va bi de/rot.
                if ($pdf->GetStringWidth($test) > ($w - 2.6 - 2)) {
                    $lines++;
                    $line = $word;
                } else {
                    $line = $test;
                }
            }
            $lines++;
        }
        return max(1, $lines);
    }
}



if (!function_exists('icaviet_ndbl_pdf_first_non_empty')) {
    function icaviet_ndbl_pdf_first_non_empty($item, $keys, $default = '')
    {
        if (!is_array($item)) {
            return $default;
        }
        foreach ($keys as $key) {
            if (isset($item[$key])) {
                $value = icaviet_ndbl_pdf_value($item[$key]);
                if ($value !== '') {
                    return $value;
                }
            }
        }
        return $default;
    }
}

if (!function_exists('icaviet_ndbl_pdf_join_parts')) {
    function icaviet_ndbl_pdf_join_parts($parts)
    {
        $out = array();
        foreach ($parts as $part) {
            $part = icaviet_ndbl_pdf_value($part);
            if ($part !== '' && !in_array($part, $out, true)) {
                $out[] = $part;
            }
        }
        return trim(implode(', ', $out));
    }
}

if (!function_exists('icaviet_ndbl_pdf_compose_address')) {
    function icaviet_ndbl_pdf_compose_address($item, $field = 'diaChi')
    {
        if (!is_array($item)) {
            return '';
        }

        // Uu tien gia tri full address neu frontend co luu vao field chinh.
        $direct = icaviet_ndbl_pdf_first_non_empty($item, array($field, $field . 'Full', $field . 'Address'));
        if ($direct !== '') {
            return $direct;
        }

        // AddressSelect cua frontend co the luu thanh cac field tach rieng:
        // diaChiStreet, diaChiCity, diaChiProvince, diaChiZip, diaChiCountry...
        $street = icaviet_ndbl_pdf_first_non_empty($item, array($field . 'Street', $field . 'Line1'));
        $city = icaviet_ndbl_pdf_first_non_empty($item, array($field . 'City'));
        $province = icaviet_ndbl_pdf_first_non_empty($item, array($field . 'Province', $field . 'State'));
        $zip = icaviet_ndbl_pdf_first_non_empty($item, array($field . 'Zip', $field . 'ZipCode'));
        $country = icaviet_ndbl_pdf_first_non_empty($item, array($field . 'Country'));

        if (($street === '' || $city === '' || $province === '' || $zip === '' || $country === '') && isset($item[$field . 'Parts']) && is_array($item[$field . 'Parts'])) {
            $parts = $item[$field . 'Parts'];
            if ($street === '') {
                $street = icaviet_ndbl_pdf_first_non_empty($parts, array('street'));
            }
            if ($city === '') {
                $city = icaviet_ndbl_pdf_first_non_empty($parts, array('city'));
            }
            if ($province === '') {
                $province = icaviet_ndbl_pdf_first_non_empty($parts, array('province', 'state'));
            }
            if ($zip === '') {
                $zip = icaviet_ndbl_pdf_first_non_empty($parts, array('zip', 'zipCode'));
            }
            if ($country === '') {
                $country = icaviet_ndbl_pdf_first_non_empty($parts, array('country'));
            }
        }

        return icaviet_ndbl_pdf_join_parts(array($street, $city, $province, $zip, $country));
    }
}

if (!function_exists('icaviet_ndbl_pdf_address_history_rows')) {
    function icaviet_ndbl_pdf_address_history_rows($items)
    {
        $rows = array();
        foreach (icaviet_ndbl_pdf_clean_array($items) as $item) {
            $rows[] = array(
                icaviet_ndbl_pdf_compose_address($item, 'diaChi'),
                isset($item['ngayBatDau']) ? icaviet_ndbl_pdf_format_date($item['ngayBatDau']) : '',
                isset($item['ngayChuyenDi']) && icaviet_ndbl_pdf_value($item['ngayChuyenDi']) !== '' ? icaviet_ndbl_pdf_format_date($item['ngayChuyenDi']) : 'Vẫn còn ở',
            );
        }
        return $rows;
    }
}

if (!function_exists('icaviet_ndbl_pdf_employment_rows')) {
    function icaviet_ndbl_pdf_employment_rows($items)
    {
        $rows = array();
        foreach (icaviet_ndbl_pdf_clean_array($items) as $item) {
            $rows[] = array(
                isset($item['ngheNghiep']) ? $item['ngheNghiep'] : '',
                isset($item['tenCongTy']) ? $item['tenCongTy'] : '',
                icaviet_ndbl_pdf_compose_address($item, 'diaChi'),
                isset($item['ngayNhanViec']) ? icaviet_ndbl_pdf_format_date($item['ngayNhanViec']) : '',
                isset($item['ngayNghiViec']) && icaviet_ndbl_pdf_value($item['ngayNghiViec']) !== '' ? icaviet_ndbl_pdf_format_date($item['ngayNghiViec']) : 'Hiện đang làm',
            );
        }
        return $rows;
    }
}

if (!function_exists('icaviet_ndbl_pdf_table')) {
    function icaviet_ndbl_pdf_table($pdf, $headers, $rows, $widths)
    {
        $rows = icaviet_ndbl_pdf_clean_array($rows);
        if (empty($rows)) {
            return;
        }

        icaviet_ndbl_pdf_check_page($pdf, 20);
        $x0 = $pdf->GetX();
        $line_h = 4.8;

        $pdf->SetFont('DejaVu', 'B', 8.2);
        $pdf->SetTextColor(7, 13, 54);
        $pdf->SetDrawColor(218, 223, 235);
        $pdf->SetFillColor(241, 243, 252);
        $h = 8;
        foreach ($headers as $i => $header) {
            $x = $pdf->GetX();
            $y = $pdf->GetY();
            $pdf->Rect($x, $y, $widths[$i], $h, 'DF');
            $pdf->MultiCell($widths[$i], 4, $header, 0, 'C');
            $pdf->SetXY($x + $widths[$i], $y);
        }
        $pdf->Ln($h);

        $pdf->SetFont('DejaVu', '', 8.0);
        $pdf->SetTextColor(73, 80, 99);
        foreach ($rows as $row) {
            $values = array();
            foreach ($headers as $key => $_) {
                // This loop is not used directly; values are passed in row using numeric keys below.
            }

            $values = array();
            foreach ($row as $v) {
                $values[] = icaviet_ndbl_pdf_value($v);
            }
            while (count($values) < count($widths)) {
                $values[] = '';
            }

            $max_lines = 1;
            foreach ($values as $i => $v) {
                $max_lines = max($max_lines, icaviet_ndbl_pdf_nb_lines($pdf, $widths[$i], $v));
            }
            $row_h = max(8, $max_lines * $line_h + 3);
            icaviet_ndbl_pdf_check_page($pdf, $row_h + 6);

            $y = $pdf->GetY();
            $pdf->SetX($x0);
            foreach ($values as $i => $v) {
                $x = $pdf->GetX();
                $pdf->Rect($x, $y, $widths[$i], $row_h, 'D');
                $pdf->SetXY($x + 1.3, $y + 1.5);
                $pdf->MultiCell($widths[$i] - 2.6, $line_h, $v !== '' ? $v : 'N/A', 0, 'L');
                $pdf->SetXY($x + $widths[$i], $y);
            }
            $pdf->SetXY($x0, $y + $row_h);
        }
        $pdf->Ln(2.5);
    }
}

if (!function_exists('icaviet_ndbl_pdf_parent_rows')) {
    function icaviet_ndbl_pdf_parent_rows($items)
    {
        $rows = array();
        foreach (icaviet_ndbl_pdf_clean_array($items) as $item) {
            $address = icaviet_ndbl_pdf_compose_address($item, 'diaChi');
            if ($address === '') {
                $address = isset($item['namMat']) ? icaviet_ndbl_pdf_format_date($item['namMat']) : '';
            }
            list($ho, $ten_lot, $ten) = icaviet_ndbl_pdf_name_parts($item, 'ten');
            $rows[] = array(
                icaviet_ndbl_pdf_name_multiline($ho, $ten_lot, $ten),
                isset($item['ngaySinh']) ? icaviet_ndbl_pdf_format_date($item['ngaySinh']) : '',
                isset($item['noiSinh']) ? $item['noiSinh'] : '',
                $address,
            );
        }
        return $rows;
    }
}

if (!function_exists('icaviet_ndbl_pdf_items_to_rows')) {
    function icaviet_ndbl_pdf_items_to_rows($items, $keys)
    {
        $rows = array();
        foreach (icaviet_ndbl_pdf_clean_array($items) as $item) {
            $row = array();
            foreach ($keys as $key) {
                if ($key === 'ten') {
                    list($ho, $ten_lot, $ten) = icaviet_ndbl_pdf_name_parts($item, 'ten');
                    $row[] = icaviet_ndbl_pdf_name_multiline($ho, $ten_lot, $ten);
                    continue;
                }
                // AddressSelect ben frontend luu dia chi thanh cac field tach rieng
                // (vd: diaChiSongChungStreet / City / Province / Zip / Country) va CO Y de
                // field gop (diaChiSongChung) rong. Doc thang $item[$key] se ra chuoi rong,
                // nen cot dia chi trong bang bi trang du da co du lieu.
                // compose_address uu tien field gop neu con du lieu cu, khong thi ghep tu cac
                // field tach rieng, nen ho so cu va ho so moi deu hien thi dung.
                if (is_string($key) && strpos($key, 'diaChi') === 0) {
                    $row[] = icaviet_ndbl_pdf_compose_address($item, $key);
                    continue;
                }
                $value = isset($item[$key]) ? $item[$key] : '';
                if ($value !== '' && is_string($key) && strpos($key, 'ngay') === 0) {
                    $value = icaviet_ndbl_pdf_format_date($value);
                }
                $row[] = $value;
            }
            $rows[] = $row;
        }
        return $rows;
    }
}

if (!method_exists($pdf, 'RoundedRect')) {
    // tFPDF/FPDF ban goc trong plugin thuong khong co RoundedRect.
    // Ve fallback bang Rect de tranh loi fatal neu server khong co method nay.
    $pdf->_icaviet_has_no_rounded_rect = true;
}

// Monkey patch khong the them method runtime, nen neu RoundedRect khong co thi row() se loi.
// Xu ly bang wrapper function rieng.
if (!function_exists('icaviet_ndbl_pdf_pill_rect')) {
    function icaviet_ndbl_pdf_pill_rect($pdf, $x, $y, $w, $h)
    {
        if (method_exists($pdf, 'RoundedRect')) {
            $pdf->RoundedRect($x, $y, $w, $h, 1.2, 'F');
        } else {
            $pdf->Rect($x, $y, $w, $h, 'F');
        }
    }
}

// Ghi de row() de dung wrapper pill rect an toan neu RoundedRect khong ton tai.
if (!function_exists('icaviet_ndbl_pdf_row_safe_defined')) {
    function icaviet_ndbl_pdf_row_safe_defined() { return true; }
}

$pdf->SetMargins(16, 16, 16);
$pdf->SetAutoPageBreak(true, 18);
$pdf->SetTextColor(7, 13, 54);

icaviet_ndbl_pdf_header($pdf);

$case_type = icaviet_ndbl_pdf_get($data, 'loaiHoSoBaoLanh');
$case_label = icaviet_ndbl_pdf_case_label($case_type);

$pdf->SetFont('DejaVu', 'B', 11.5);
$pdf->SetTextColor(7, 13, 54);
$pdf->Cell(76, 8, 'Mục đích điền đơn:', 0, 0, 'L');
$pdf->SetFont('DejaVu', '', 10.8);
$pdf->SetTextColor(73, 80, 99);
$pdf->SetFillColor(231, 235, 246);
$pdf->Cell(min(98, max(42, $pdf->GetStringWidth($case_label) + 8)), 8, $case_label, 0, 1, 'L', true);
$pdf->Ln(3);

icaviet_ndbl_pdf_section($pdf, 'Thông tin cá nhân của đương đơn');
list($ho_trenGiayTo, $tenLot_trenGiayTo, $ten_trenGiayTo) = icaviet_ndbl_pdf_name_parts($data, 'tenTrenGiayTo');
icaviet_ndbl_pdf_row($pdf, 'Tên trên giấy tờ', icaviet_ndbl_pdf_name_multiline($ho_trenGiayTo, $tenLot_trenGiayTo, $ten_trenGiayTo));

list($ho_goiKhac, $tenLot_goiKhac, $ten_goiKhac) = icaviet_ndbl_pdf_name_parts($data, 'tenGoiKhac');
icaviet_ndbl_pdf_row($pdf, 'Tên gọi khác', icaviet_ndbl_pdf_name_multiline($ho_goiKhac, $tenLot_goiKhac, $ten_goiKhac));
icaviet_ndbl_pdf_row($pdf, 'Ngày sinh (Ngày tháng năm)', icaviet_ndbl_pdf_format_date(icaviet_ndbl_pdf_get($data, 'ngaySinh')));
icaviet_ndbl_pdf_row($pdf, 'Giới tính', icaviet_ndbl_pdf_get($data, 'gioiTinh'));
icaviet_ndbl_pdf_row($pdf, 'Nơi sinh (thành phố, tỉnh, quốc gia)', icaviet_ndbl_pdf_get($data, 'noiSinh'));
icaviet_ndbl_pdf_row($pdf, 'Số điện thoại', icaviet_ndbl_pdf_get($data, 'soDienThoai'));
icaviet_ndbl_pdf_row($pdf, 'Email', icaviet_ndbl_pdf_get($data, 'email'));
icaviet_ndbl_pdf_row($pdf, 'Địa chỉ nhận thư Việt Nam', icaviet_ndbl_pdf_compose_address($data, 'diaChiNhanThuVN'));
icaviet_ndbl_pdf_row($pdf, 'Địa chỉ dự định sống ở Mỹ', icaviet_ndbl_pdf_compose_address($data, 'diaChiDuDinhSongMy'));
icaviet_ndbl_pdf_row($pdf, 'Số hộ chiếu', icaviet_ndbl_pdf_get($data, 'passport'));
icaviet_ndbl_pdf_row($pdf, 'Nơi cấp hộ chiếu', icaviet_ndbl_pdf_compose_address($data, 'noiCapPassport'));
icaviet_ndbl_pdf_row($pdf, 'Ngày hết hạn hộ chiếu', icaviet_ndbl_pdf_format_date(icaviet_ndbl_pdf_get($data, 'ngayHetHanPassport')));

icaviet_ndbl_pdf_section($pdf, 'Lịch sử nhập cảnh và hồ sơ di trú');
icaviet_ndbl_pdf_row($pdf, 'Đã từng nhập cảnh Mỹ chưa', icaviet_ndbl_pdf_get($data, 'tungNhapCanhMy'));
icaviet_ndbl_pdf_table($pdf,
    array('Ngày nhập cảnh', 'Diện', 'Số visa'),
    icaviet_ndbl_pdf_items_to_rows(isset($data['lanNhapCanhMy']) ? $data['lanNhapCanhMy'] : array(), array('ngayNhapCanh', 'dien', 'soVisa')),
    array(42, 58, 68)
);
icaviet_ndbl_pdf_row($pdf, 'Đã từng được bảo lãnh chưa', icaviet_ndbl_pdf_get($data, 'tungDuocBaoLanh'));
icaviet_ndbl_pdf_table($pdf,
    array('Ngày ưu tiên', 'Trung tâm USCIS', 'Kết quả'),
    icaviet_ndbl_pdf_items_to_rows(isset($data['lanDuocBaoLanh']) ? $data['lanDuocBaoLanh'] : array(), array('ngayUuTien', 'trungTamUscis', 'ketQua')),
    array(42, 58, 68)
);
icaviet_ndbl_pdf_row($pdf, 'Đã từng ở quá hạn chưa', icaviet_ndbl_pdf_get($data, 'tungOQuaHan'));
icaviet_ndbl_pdf_table($pdf,
    array('Thời gian ở quá hạn', 'Diện nhập cảnh', 'Lý do'),
    icaviet_ndbl_pdf_items_to_rows(isset($data['lanOQuaHan']) ? $data['lanOQuaHan'] : array(), array('thoiGianOQuaHan', 'dienNhapCanh', 'lyDo')),
    array(50, 50, 68)
);

icaviet_ndbl_pdf_section($pdf, 'Thông tin hôn nhân');
icaviet_ndbl_pdf_row($pdf, 'Tình trạng hôn nhân hiện tại', icaviet_ndbl_pdf_get($data, 'tinhTrangHonNhan'));

$hon_phoi = icaviet_ndbl_pdf_items_to_rows(isset($data['honPhoiHienTai']) ? $data['honPhoiHienTai'] : array(), array('ten', 'ngaySinh', 'noiSinh', 'ngayKetHon', 'noiKetHon', 'diaChiSongChung', 'ngayBatDauSongChung', 'ngayKetThucSongChung'));
if (!empty($hon_phoi)) {
    $pdf->SetFont('DejaVu', 'B', 9.5);
    $pdf->SetTextColor(7, 13, 54);
    $pdf->Cell(0, 7, 'Hiện tại thông tin hôn phối hiện tại:', 0, 1, 'L');
    icaviet_ndbl_pdf_table($pdf,
        array('Tên người hôn phối', 'Ngày sinh', 'Nơi sinh', 'Ngày kết hôn', 'Nơi kết hôn', 'Địa chỉ sống chung', 'Ngày bắt đầu', 'Ngày kết thúc'),
        $hon_phoi,
        array(24, 21, 27, 21, 27, 30, 19, 19)
    );
}

icaviet_ndbl_pdf_table($pdf,
    array('Tên vợ/chồng cũ', 'Ngày ly hôn'),
    icaviet_ndbl_pdf_items_to_rows(isset($data['honNhanCu']) ? $data['honNhanCu'] : array(), array('ten', 'ngayLyHon')),
    array(100, 68)
);
icaviet_ndbl_pdf_table($pdf,
    array('Tên hôn phối đã mất', 'Ngày mất'),
    icaviet_ndbl_pdf_items_to_rows(isset($data['honPhoiDaMat']) ? $data['honPhoiDaMat'] : array(), array('ten', 'ngayMat')),
    array(100, 68)
);

icaviet_ndbl_pdf_section($pdf, 'Thông tin của cha');
icaviet_ndbl_pdf_table($pdf,
    array('Tên cha', 'Ngày sinh', 'Nơi sinh', 'Địa chỉ ở / Năm mất'),
    icaviet_ndbl_pdf_parent_rows(isset($data['thongTinCha']) ? $data['thongTinCha'] : array()),
    array(42, 30, 48, 48)
);

icaviet_ndbl_pdf_section($pdf, 'Thông tin của mẹ');
icaviet_ndbl_pdf_table($pdf,
    array('Tên mẹ', 'Ngày sinh', 'Nơi sinh', 'Địa chỉ ở / Năm mất'),
    icaviet_ndbl_pdf_parent_rows(isset($data['thongTinMe']) ? $data['thongTinMe'] : array()),
    array(42, 30, 48, 48)
);

icaviet_ndbl_pdf_section($pdf, 'Địa chỉ ở trong 5 năm qua');
$pdf->SetFont('DejaVu', 'B', 8.8);
$pdf->SetTextColor(7, 13, 54);
$pdf->MultiCell(0, 5.2, 'Liệt kê các địa chỉ đã có trong 5 năm qua, ở bất kỳ quốc gia nào: theo thứ tự Địa chỉ - Ngày bắt đầu ở - Ngày chuyển đi', 0, 'L');
icaviet_ndbl_pdf_table($pdf,
    array('Địa chỉ', 'Ngày bắt đầu ở', 'Ngày chuyển đi'),
    icaviet_ndbl_pdf_address_history_rows(isset($data['diaChi5Nam']) ? $data['diaChi5Nam'] : array()),
    array(88, 40, 40)
);

icaviet_ndbl_pdf_section($pdf, 'Công việc trong 5 năm qua');
$pdf->SetFont('DejaVu', 'B', 8.8);
$pdf->SetTextColor(7, 13, 54);
$pdf->MultiCell(0, 5.2, 'Liệt kê những công việc đã làm trong 5 năm qua: nghề nghiệp - tên công ty - địa chỉ - ngày nhận việc - ngày nghỉ việc.', 0, 'L');
icaviet_ndbl_pdf_table($pdf,
    array('Nghề nghiệp', 'Tên công ty', 'Địa chỉ', 'Ngày nhận việc', 'Ngày nghỉ việc'),
    icaviet_ndbl_pdf_employment_rows(isset($data['congViec5Nam']) ? $data['congViec5Nam'] : array()),
    array(34, 32, 54, 24, 24)
);

icaviet_ndbl_pdf_section($pdf, 'Số lần gặp mặt trong 2 năm');
icaviet_ndbl_pdf_row($pdf, 'Thông tin gặp mặt', icaviet_ndbl_pdf_get($data, 'gapMat2Nam'));

icaviet_ndbl_pdf_section($pdf, 'Thông tin con cái của đương đơn');
icaviet_ndbl_pdf_row($pdf, 'Đã có con', icaviet_ndbl_pdf_get($data, 'daCoCon'));
icaviet_ndbl_pdf_table($pdf,
    array('Tên con', 'Ngày sinh', 'Nơi sinh'),
    icaviet_ndbl_pdf_items_to_rows(isset($data['thongTinCon']) ? $data['thongTinCon'] : array(), array('ten', 'ngaySinh', 'noiSinh')),
    array(56, 40, 72)
);

icaviet_ndbl_pdf_section($pdf, 'Thông tin bổ sung');
icaviet_ndbl_pdf_row($pdf, 'Ghi chú', icaviet_ndbl_pdf_get($data, 'ghiChu'));
list($ho_dienDon, $tenLot_dienDon, $ten_dienDon) = icaviet_ndbl_pdf_name_parts($data, 'tenNguoiDienDon');
if ($ho_dienDon === '' && $tenLot_dienDon === '' && $ten_dienDon === '') {
    list($ho_dienDon, $tenLot_dienDon, $ten_dienDon) = icaviet_ndbl_pdf_name_parts($data, 'tenTrenGiayTo');
}
icaviet_ndbl_pdf_row($pdf, 'Tên đầy đủ của người điền đơn', icaviet_ndbl_pdf_name_multiline($ho_dienDon, $tenLot_dienDon, $ten_dienDon));
icaviet_ndbl_pdf_row($pdf, 'Chữ nhận dạng xác thực của người điền đơn', icaviet_ndbl_pdf_get($data, 'chuNhanDangXacThuc'));

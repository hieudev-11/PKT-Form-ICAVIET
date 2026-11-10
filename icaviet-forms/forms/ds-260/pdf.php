<?php
/**
 * PDF template cho form DS-260.
 * Fix: thay the template.pdf bi thieu bang template PHP de ICAVIET_PDF::generate() include duoc.
 * Bien co san: $pdf (ICAVIET_FPDF), $data (array)
 */
if (!defined('ABSPATH')) {
    exit;
}

if (!function_exists('icaviet_ds260_pdf_text')) {
    function icaviet_ds260_pdf_text($text)
    {
        $text = (string) $text;

        if (class_exists('Normalizer')) {
            $normalized = Normalizer::normalize($text, Normalizer::FORM_C);
            if (is_string($normalized)) {
                $text = $normalized;
            }
        }

        $text = wp_strip_all_tags($text);
        $text = str_replace(array("\r\n", "\r"), "\n", $text);
        $text = preg_replace('/[ \t]+/u', ' ', $text);
        $text = preg_replace('/\n{3,}/u', "\n\n", $text);
        return trim($text);
    }
}

if (!function_exists('icaviet_ds260_pdf_val')) {
    function icaviet_ds260_pdf_val($data, $key, $default = '')
    {
        if (!is_array($data) || !array_key_exists($key, $data)) {
            return $default;
        }

        $value = $data[$key];

        if (is_array($value)) {
            $parts = array();
            foreach ($value as $k => $v) {
                if (is_array($v)) {
                    $nested = array();
                    foreach ($v as $nk => $nv) {
                        if (is_scalar($nv) && trim((string) $nv) !== '') {
                            $nested[] = icaviet_ds260_pdf_text((string) $nk . ': ' . (string) $nv);
                        }
                    }
                    if (!empty($nested)) {
                        $parts[] = implode('; ', $nested);
                    }
                } elseif (is_scalar($v) && trim((string) $v) !== '') {
                    if (is_string($k) && !is_numeric($k)) {
                        $parts[] = icaviet_ds260_pdf_text((string) $k . ': ' . (string) $v);
                    } else {
                        $parts[] = icaviet_ds260_pdf_text((string) $v);
                    }
                }
            }
            $value = implode("\n", $parts);
        }

        if (is_object($value)) {
            $value = '';
        }

        $value = icaviet_ds260_pdf_text((string) $value);
        return $value !== '' ? $value : $default;
    }
}


if (!function_exists('icaviet_ds260_pdf_address_parts')) {
    function icaviet_ds260_pdf_address_parts($data, $base_key)
    {
        if (!is_array($data) || $base_key === '') {
            return '';
        }

        $us_address_keys = array(
            'plannedAddressUS' => true,
            'greenCardAddressUS' => true,
            'sponsorAddress' => true,
        );

        $suffixes = isset($us_address_keys[$base_key])
            ? array('Street', 'City', 'State', 'Zip', 'Country')
            : array('Street', 'City', 'Province', 'Zip', 'Country');

        $parts = array();
        foreach ($suffixes as $suffix) {
            $key = $base_key . $suffix;

            // Some old/imported data may use ZipCode instead of Zip.
            if ($suffix === 'Zip' && (empty($data[$key]) || !is_scalar($data[$key]))) {
                $fallback_zip_key = $base_key . 'ZipCode';
                if (!empty($data[$fallback_zip_key]) && is_scalar($data[$fallback_zip_key])) {
                    $key = $fallback_zip_key;
                }
            }

            if (!empty($data[$key]) && is_scalar($data[$key])) {
                $parts[] = icaviet_ds260_pdf_text((string) $data[$key]);
            }
        }

        $parts = array_values(array_filter($parts, function ($part) {
            return $part !== '';
        }));

        if (!empty($parts)) {
            return implode(', ', $parts);
        }

        // Fallback for old submissions saved as one combined text value.
        return icaviet_ds260_pdf_val($data, $base_key);
    }
}

if (!function_exists('icaviet_ds260_pdf_label')) {
    function icaviet_ds260_pdf_label($field)
    {
        if (isset($field['label']['vi']) && trim((string) $field['label']['vi']) !== '') {
            return icaviet_ds260_pdf_text($field['label']['vi']);
        }
        if (isset($field['columnKey']) && trim((string) $field['columnKey']) !== '') {
            return icaviet_ds260_pdf_text($field['columnKey']);
        }
        if (isset($field['label']['en']) && trim((string) $field['label']['en']) !== '') {
            return icaviet_ds260_pdf_text($field['label']['en']);
        }
        if (isset($field['name'])) {
            return icaviet_ds260_pdf_text($field['name']);
        }
        if (isset($field['id'])) {
            return icaviet_ds260_pdf_text($field['id']);
        }
        return '';
    }
}

if (!function_exists('icaviet_ds260_pdf_section_title')) {
    function icaviet_ds260_pdf_section_title($section)
    {
        if (isset($section['title']['vi']) && trim((string) $section['title']['vi']) !== '') {
            return icaviet_ds260_pdf_text($section['title']['vi']);
        }
        if (isset($section['title']['en']) && trim((string) $section['title']['en']) !== '') {
            return icaviet_ds260_pdf_text($section['title']['en']);
        }
        if (isset($section['id'])) {
            return icaviet_ds260_pdf_text($section['id']);
        }
        return 'Thông tin';
    }
}

if (!function_exists('icaviet_ds260_pdf_group_title')) {
    function icaviet_ds260_pdf_group_title($group)
    {
        if (isset($group['title']['vi']) && trim((string) $group['title']['vi']) !== '') {
            return icaviet_ds260_pdf_text($group['title']['vi']);
        }
        if (isset($group['title']['en']) && trim((string) $group['title']['en']) !== '') {
            return icaviet_ds260_pdf_text($group['title']['en']);
        }
        return '';
    }
}

if (!function_exists('icaviet_ds260_pdf_header')) {
    function icaviet_ds260_pdf_header($pdf)
    {
        $pdf->SetTextColor(20, 38, 75);
        $pdf->SetFont('DejaVu', 'B', 16);
        $pdf->Cell(0, 8, 'XÁC NHẬN THÔNG TIN DS-260', 0, 1, 'L');
        $pdf->SetFont('DejaVu', '', 9);
        $pdf->SetTextColor(90, 96, 110);
        $pdf->Cell(0, 6, 'Phiếu tổng hợp thông tin người dùng đã nhập trên form DS-260', 0, 1, 'L');
        $pdf->Ln(3);
    }
}

if (!function_exists('icaviet_ds260_pdf_section')) {
    function icaviet_ds260_pdf_section($pdf, $title)
    {
        if ($pdf->GetY() > 260) {
            $pdf->AddPage();
        }
        $pdf->Ln(3);
        $pdf->SetTextColor(20, 38, 75);
        $pdf->SetFont('DejaVu', 'B', 13);
        $pdf->MultiCell(0, 7, mb_strtoupper($title, 'UTF-8'), 0, 'L');
        $pdf->SetDrawColor(230, 232, 240);
        $pdf->Line(20, $pdf->GetY() + 1, 190, $pdf->GetY() + 1);
        $pdf->Ln(3);
    }
}

if (!function_exists('icaviet_ds260_pdf_group')) {
    function icaviet_ds260_pdf_group($pdf, $title)
    {
        if ($title === '') {
            return;
        }
        if ($pdf->GetY() > 258) {
            $pdf->AddPage();
        }
        // In dam + doi mau xanh duong de tieu de phu tach han khoi cac dong
        // nhan/gia tri ben duoi (nhan cung in dam mau xanh dam nen truoc day
        // nhin gan nhu giong nhau). Mau (29, 78, 216) lay theo text-blue-700
        // ma DS260Form.vue dung cho tieu de phu tren form web.
        $pdf->Ln(2);
        $pdf->SetTextColor(29, 78, 216);
        $pdf->SetFont('DejaVu', 'B', 10.5);
        $pdf->MultiCell(0, 6, $title, 0, 'L');
        $pdf->SetFont('DejaVu', '', 10.5);
        $pdf->Ln(1.5);
    }
}

if (!function_exists('icaviet_ds260_pdf_row')) {
    function icaviet_ds260_pdf_row($pdf, $label, $value)
    {
        $label = rtrim(icaviet_ds260_pdf_text($label), ':');
        $value = icaviet_ds260_pdf_text($value);

        if ($label === '' || $value === '') {
            return;
        }

        if ($pdf->GetY() > 265) {
            $pdf->AddPage();
        }

        $x = $pdf->GetX();
        $y = $pdf->GetY();
        $label_w = 62;
        $value_w = 108;

        $pdf->SetTextColor(20, 38, 75);
        $pdf->SetFont('DejaVu', 'B', 8.5);
        $pdf->MultiCell($label_w, 5.2, $label . ':', 0, 'L');
        $label_h = $pdf->GetY() - $y;

        $pdf->SetXY($x + $label_w, $y);
        $pdf->SetTextColor(72, 78, 94);
        $pdf->SetFont('DejaVu', '', 8.5);
        $pdf->MultiCell($value_w, 5.2, $value, 0, 'L');
        $value_h = $pdf->GetY() - $y;

        $pdf->SetY($y + max($label_h, $value_h) + 1.5);
    }
}



if (!function_exists('icaviet_ds260_pdf_cell_lines')) {
    function icaviet_ds260_pdf_cell_lines($pdf, $width, $text)
    {
        $text = icaviet_ds260_pdf_text($text);
        if ($text === '') {
            return 1;
        }
        $text = str_replace("\r", '', $text);
        $lines = 0;
        foreach (explode("\n", $text) as $paragraph) {
            $paragraph = trim($paragraph);
            if ($paragraph === '') {
                $lines++;
                continue;
            }
            $words = preg_split('/\s+/u', $paragraph);
            $line = '';
            foreach ($words as $word) {
                $test = $line === '' ? $word : $line . ' ' . $word;
                // -2 khop voi MultiCell($w-2,...) o icaviet_ds260_pdf_table_cell(); -2 them
                // la 2*cMargin (le trong FPDF tu them vao trong MultiCell) de so dong uoc
                // luong khop voi so dong MultiCell thuc su xuong dong, tranh chu bi tran
                // khoi o va bi de/rot khi ve o ke tiep.
                if ($pdf->GetStringWidth($test) <= ($width - 2 - 2)) {
                    $line = $test;
                } else {
                    $lines++;
                    $line = $word;
                }
            }
            if ($line !== '') {
                $lines++;
            }
        }
        return max(1, $lines);
    }
}

if (!function_exists('icaviet_ds260_pdf_table_cell')) {
    function icaviet_ds260_pdf_table_cell($pdf, $x, $y, $w, $h, $text, $fill = false, $align = 'L')
    {
        $pdf->Rect($x, $y, $w, $h, 'D');
        if ($fill) {
            $pdf->SetFillColor(244, 247, 252);
            $pdf->Rect($x, $y, $w, $h, 'F');
            $pdf->Rect($x, $y, $w, $h, 'D');
        }
        $pdf->SetXY($x + 1, $y + 1);
        $pdf->MultiCell($w - 2, 4.2, icaviet_ds260_pdf_text($text), 0, $align);
    }
}

if (!function_exists('icaviet_ds260_pdf_format_date')) {
    /* ── DS260Form.vue (parseDateParts/formatDateParts) luu ngay theo thu tu
       "day/month/year" duoi 1 field duy nhat, PHAN NAO KHONG NHAP se de rong
       (vd chi nho thang/nam -> "/08/1987", chi nho nam -> "//1987"). Doi ve
       dang chu, dong bo voi bao-lanh/ndbl/N-400/N-600/I-90:
       - Co du ngay/thang/nam -> "Ngày D tháng M năm Y"
       - Chi co thang/nam     -> "Tháng M năm Y"
       - Chi co nam           -> "Năm Y" ── */
    function icaviet_ds260_pdf_format_date($value)
    {
        $value = trim((string) $value);
        if ($value === '') {
            return '';
        }
        if (preg_match('/^(\d{4})-(\d{1,2})-(\d{1,2})$/', $value, $m)) {
            return 'Ngày ' . intval($m[3]) . ' tháng ' . intval($m[2]) . ' năm ' . intval($m[1]);
        }
        if (preg_match('/^(\d{0,2})\/(\d{0,2})\/(\d{4})$/', $value, $m)) {
            $day = $m[1];
            $month = $m[2];
            $year = $m[3];
            if ($day !== '' && $month !== '') {
                return 'Ngày ' . intval($day) . ' tháng ' . intval($month) . ' năm ' . intval($year);
            }
            if ($month !== '') {
                return 'Tháng ' . intval($month) . ' năm ' . intval($year);
            }
            return 'Năm ' . intval($year);
        }
        return icaviet_ds260_pdf_text($value);
    }
}

if (!function_exists('icaviet_ds260_pdf_format_period_date')) {
    function icaviet_ds260_pdf_format_period_date($row, $key)
    {
        if (!is_array($row)) {
            return '';
        }

        if (isset($row[$key]) && is_scalar($row[$key])) {
            $value = trim((string) $row[$key]);
            if ($value !== '') {
                return icaviet_ds260_pdf_format_date($value);
            }
        }

        // Fallback cho du lieu cu luu tach rieng {key}_month/_day/_year.
        $month = isset($row[$key . '_month']) ? trim((string) $row[$key . '_month']) : '';
        $day = isset($row[$key . '_day']) ? trim((string) $row[$key . '_day']) : '';
        $year = isset($row[$key . '_year']) ? trim((string) $row[$key . '_year']) : '';
        if ($month === '' || $day === '' || $year === '') {
            return '';
        }
        return 'Ngày ' . intval($day) . ' tháng ' . intval($month) . ' năm ' . intval($year);
    }
}

if (!function_exists('icaviet_ds260_pdf_residence_address')) {
    function icaviet_ds260_pdf_residence_address($row)
    {
        if (!is_array($row)) {
            return '';
        }

        $parts = array();
        foreach (array('street', 'city', 'province', 'zipCode', 'country') as $key) {
            if (!empty($row[$key]) && is_scalar($row[$key])) {
                $parts[] = icaviet_ds260_pdf_text((string) $row[$key]);
            }
        }

        return implode(', ', array_filter($parts));
    }
}

if (!function_exists('icaviet_ds260_pdf_residence_history_table')) {
    function icaviet_ds260_pdf_residence_history_table($pdf, $label, $rows)
    {
        if (!is_array($rows) || empty($rows)) {
            return;
        }

        $clean_rows = array();
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $address = icaviet_ds260_pdf_residence_address($row);
            $from = icaviet_ds260_pdf_format_period_date($row, 'dateFrom');
            $to = icaviet_ds260_pdf_format_period_date($row, 'dateTo');
            if ($address === '' && $from === '' && $to === '') {
                continue;
            }
            $clean_rows[] = array($address, $from, $to);
        }

        if (empty($clean_rows)) {
            return;
        }

        if ($pdf->GetY() > 250) {
            $pdf->AddPage();
        }

        $label = rtrim(icaviet_ds260_pdf_text($label), ':');
        $pdf->SetTextColor(20, 38, 75);
        $pdf->SetFont('DejaVu', 'B', 8.5);
        $pdf->MultiCell(0, 5.2, $label . ':', 0, 'L');
        $pdf->Ln(1);

        $widths = array(10, 96, 32, 32);
        $headers = array('STT', 'Địa chỉ', 'Từ ngày', 'Đến ngày');
        $line_h = 4.2;
        $left = $pdf->GetX();

        $draw_header = function () use ($pdf, $widths, $headers, $line_h, $left) {
            if ($pdf->GetY() > 258) {
                $pdf->AddPage();
            }
            $y = $pdf->GetY();
            $h = 7;
            $x = $left;
            $pdf->SetDrawColor(205, 210, 222);
            $pdf->SetTextColor(20, 38, 75);
            $pdf->SetFont('DejaVu', 'B', 8);
            foreach ($headers as $i => $header) {
                icaviet_ds260_pdf_table_cell($pdf, $x, $y, $widths[$i], $h, $header, true, 'C');
                $x += $widths[$i];
            }
            $pdf->SetY($y + $h);
        };

        $draw_header();

        $pdf->SetFont('DejaVu', '', 7.7);
        $pdf->SetTextColor(72, 78, 94);
        foreach ($clean_rows as $index => $row) {
            list($address, $from, $to) = $row;
            $values = array((string) ($index + 1), $address, $from, $to);
            $row_lines = 1;
            foreach ($values as $i => $value) {
                $row_lines = max($row_lines, icaviet_ds260_pdf_cell_lines($pdf, $widths[$i], $value));
            }
            $h = max(7, ($row_lines * $line_h) + 2);

            if (($pdf->GetY() + $h) > 270) {
                $pdf->AddPage();
                $draw_header();
                $pdf->SetFont('DejaVu', '', 7.7);
                $pdf->SetTextColor(72, 78, 94);
            }

            $y = $pdf->GetY();
            $x = $left;
            foreach ($values as $i => $value) {
                $align = $i === 0 ? 'C' : 'L';
                icaviet_ds260_pdf_table_cell($pdf, $x, $y, $widths[$i], $h, $value, false, $align);
                $x += $widths[$i];
            }
            $pdf->SetY($y + $h);
        }

        $pdf->Ln(2);
    }
}


if (!function_exists('icaviet_ds260_pdf_job_address')) {
    function icaviet_ds260_pdf_job_address($row)
    {
        if (!is_array($row)) {
            return '';
        }

        $parts = array();
        foreach (array('street', 'city', 'province', 'zipCode', 'country') as $key) {
            if (!empty($row[$key]) && is_scalar($row[$key])) {
                $parts[] = icaviet_ds260_pdf_text((string) $row[$key]);
            }
        }

        return implode(', ', array_filter($parts));
    }
}

if (!function_exists('icaviet_ds260_pdf_jobs_table')) {
    function icaviet_ds260_pdf_jobs_table($pdf, $label, $rows)
    {
        if (!is_array($rows) || empty($rows)) {
            return;
        }

        $clean_rows = array();
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }

            $occupation = !empty($row['occupation']) && is_scalar($row['occupation']) ? icaviet_ds260_pdf_text((string) $row['occupation']) : '';
            $employer = !empty($row['employer']) && is_scalar($row['employer']) ? icaviet_ds260_pdf_text((string) $row['employer']) : '';
            $address = icaviet_ds260_pdf_job_address($row);
            $from = icaviet_ds260_pdf_format_period_date($row, 'dateFrom');
            $to = icaviet_ds260_pdf_format_period_date($row, 'dateTo');

            if ($occupation === '' && $employer === '' && $address === '' && $from === '' && $to === '') {
                continue;
            }

            $clean_rows[] = array($occupation, $employer, $address, $from, $to);
        }

        if (empty($clean_rows)) {
            return;
        }

        if ($pdf->GetY() > 250) {
            $pdf->AddPage();
        }

        $label = rtrim(icaviet_ds260_pdf_text($label), ':');
        $pdf->SetTextColor(20, 38, 75);
        $pdf->SetFont('DejaVu', 'B', 8.5);
        $pdf->MultiCell(0, 5.2, $label . ':', 0, 'L');
        $pdf->Ln(1);

        $widths = array(11, 30, 30, 59, 20, 20);
        $headers = array('STT', 'Nghề nghiệp', 'Công ty', 'Địa chỉ', 'Từ ngày', 'Đến ngày');
        $line_h = 4.2;
        $left = $pdf->GetX();

        $draw_header = function () use ($pdf, $widths, $headers, $left) {
            if ($pdf->GetY() > 258) {
                $pdf->AddPage();
            }
            $y = $pdf->GetY();
            $h = 10;
            $x = $left;
            $pdf->SetDrawColor(205, 210, 222);
            $pdf->SetTextColor(20, 38, 75);
            $pdf->SetFont('DejaVu', 'B', 7);
            foreach ($headers as $i => $header) {
                icaviet_ds260_pdf_table_cell($pdf, $x, $y, $widths[$i], $h, $header, true, 'C');
                $x += $widths[$i];
            }
            $pdf->SetY($y + $h);
        };

        $draw_header();

        $pdf->SetFont('DejaVu', '', 7.2);
        $pdf->SetTextColor(72, 78, 94);
        foreach ($clean_rows as $index => $row) {
            list($occupation, $employer, $address, $from, $to) = $row;
            $values = array((string) ($index + 1), $occupation, $employer, $address, $from, $to);
            $row_lines = 1;
            foreach ($values as $i => $value) {
                $row_lines = max($row_lines, icaviet_ds260_pdf_cell_lines($pdf, $widths[$i], $value));
            }
            $h = max(7, ($row_lines * $line_h) + 2);

            if (($pdf->GetY() + $h) > 270) {
                $pdf->AddPage();
                $draw_header();
                $pdf->SetFont('DejaVu', '', 7.2);
                $pdf->SetTextColor(72, 78, 94);
            }

            $y = $pdf->GetY();
            $x = $left;
            foreach ($values as $i => $value) {
                $align = $i === 0 ? 'C' : 'L';
                icaviet_ds260_pdf_table_cell($pdf, $x, $y, $widths[$i], $h, $value, false, $align);
                $x += $widths[$i];
            }
            $pdf->SetY($y + $h);
        }

        $pdf->Ln(2);
    }
}


if (!function_exists('icaviet_ds260_pdf_school_table')) {
    function icaviet_ds260_pdf_school_table($pdf, $label, $rows)
    {
        if (!is_array($rows) || empty($rows)) {
            return;
        }

        $clean_rows = array();
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }

            $name = !empty($row['name']) && is_scalar($row['name']) ? icaviet_ds260_pdf_text((string) $row['name']) : '';
            $course = !empty($row['course']) && is_scalar($row['course']) ? icaviet_ds260_pdf_text((string) $row['course']) : '';
            $address = icaviet_ds260_pdf_job_address($row);
            $from = icaviet_ds260_pdf_format_period_date($row, 'dateFrom');
            $to = icaviet_ds260_pdf_format_period_date($row, 'dateTo');

            if ($name === '' && $course === '' && $address === '' && $from === '' && $to === '') {
                continue;
            }

            $clean_rows[] = array($name, $course, $address, $from, $to);
        }

        if (empty($clean_rows)) {
            return;
        }

        if ($pdf->GetY() > 250) {
            $pdf->AddPage();
        }

        $label = rtrim(icaviet_ds260_pdf_text($label), ':');
        $pdf->SetTextColor(20, 38, 75);
        $pdf->SetFont('DejaVu', 'B', 8.5);
        $pdf->MultiCell(0, 5.2, $label . ':', 0, 'L');
        $pdf->Ln(1);

        $widths = array(11, 38, 35, 56, 15, 15);
        $headers = array('STT', 'Trường học', 'Chuyên ngành', 'Địa chỉ', 'Từ ngày', 'Đến ngày');
        $line_h = 4.2;
        $left = $pdf->GetX();

        $draw_header = function () use ($pdf, $widths, $headers, $left) {
            if ($pdf->GetY() > 258) {
                $pdf->AddPage();
            }
            $y = $pdf->GetY();
            $h = 10;
            $x = $left;
            $pdf->SetDrawColor(205, 210, 222);
            $pdf->SetTextColor(20, 38, 75);
            $pdf->SetFont('DejaVu', 'B', 7);
            foreach ($headers as $i => $header) {
                icaviet_ds260_pdf_table_cell($pdf, $x, $y, $widths[$i], $h, $header, true, 'C');
                $x += $widths[$i];
            }
            $pdf->SetY($y + $h);
        };

        $draw_header();

        $pdf->SetFont('DejaVu', '', 7.2);
        $pdf->SetTextColor(72, 78, 94);
        foreach ($clean_rows as $index => $row) {
            list($name, $course, $address, $from, $to) = $row;
            $values = array((string) ($index + 1), $name, $course, $address, $from, $to);
            $row_lines = 1;
            foreach ($values as $i => $value) {
                $row_lines = max($row_lines, icaviet_ds260_pdf_cell_lines($pdf, $widths[$i], $value));
            }
            $h = max(7, ($row_lines * $line_h) + 2);

            if (($pdf->GetY() + $h) > 270) {
                $pdf->AddPage();
                $draw_header();
                $pdf->SetFont('DejaVu', '', 7.2);
                $pdf->SetTextColor(72, 78, 94);
            }

            $y = $pdf->GetY();
            $x = $left;
            foreach ($values as $i => $value) {
                $align = $i === 0 ? 'C' : 'L';
                icaviet_ds260_pdf_table_cell($pdf, $x, $y, $widths[$i], $h, $value, false, $align);
                $x += $widths[$i];
            }
            $pdf->SetY($y + $h);
        }

        $pdf->Ln(2);
    }
}


if (!function_exists('icaviet_ds260_pdf_split_full_name')) {
    /* ── Cha/me/con trong DS-260 chi luu 1 chuoi ten day du (fatherFullName,
       motherFullName, hoac "fullName"/"name" cua du lieu con cai cu), khong
       tach san thanh lastName/middleName/firstName nhu ho so nguoi dien don
       va vo/chong. Ham nay tach lai theo dung quy tac DS260Form.vue dang
       dung (splitChildFullName/fatherNameParts/motherNameParts): tu dau ->
       Ho, tu cuoi -> Ten, cac tu o giua -> Ten lot. Tra ve array(ho, ten
       lot, ten). ── */
    function icaviet_ds260_pdf_split_full_name($full)
    {
        $full = icaviet_ds260_pdf_text($full);
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
        $last = $words[0];
        $first = $words[$count - 1];
        $middle = implode(' ', array_slice($words, 1, $count - 2));
        return array($last, $middle, $first);
    }
}

if (!function_exists('icaviet_ds260_pdf_child_field_value')) {
    function icaviet_ds260_pdf_child_field_value($parts, $prefix)
    {
        foreach ($parts as $part) {
            $part = icaviet_ds260_pdf_text($part);
            if ($part === '') {
                continue;
            }
            if (mb_stripos($part, $prefix, 0, 'UTF-8') === 0) {
                $value = trim(mb_substr($part, mb_strlen($prefix, 'UTF-8'), null, 'UTF-8'));
                $value = ltrim($value, ':： ');
                return icaviet_ds260_pdf_text($value);
            }
        }
        return '';
    }
}

if (!function_exists('icaviet_ds260_pdf_parse_children_info')) {
    function icaviet_ds260_pdf_parse_children_info($value)
    {
        $text = '';
        if (is_array($value)) {
            $lines = array();
            foreach ($value as $row) {
                if (is_array($row)) {
                    // Uu tien lastName/middleName/firstName da tach san (childrenInfo/
                    // childrenInfoJson tu form moi); fallback tach tu ten day du
                    // (name/fullName/childName/hoTen) cho du lieu cu chi luu 1 chuoi.
                    $last = isset($row['lastName']) && is_scalar($row['lastName']) ? icaviet_ds260_pdf_text((string) $row['lastName']) : '';
                    $middle = isset($row['middleName']) && is_scalar($row['middleName']) ? icaviet_ds260_pdf_text((string) $row['middleName']) : '';
                    $first = isset($row['firstName']) && is_scalar($row['firstName']) ? icaviet_ds260_pdf_text((string) $row['firstName']) : '';
                    if ($last === '' && $middle === '' && $first === '') {
                        $full_name = '';
                        foreach (array('fullName', 'name', 'childName', 'hoTen') as $key) {
                            if (!empty($row[$key]) && is_scalar($row[$key])) {
                                $full_name = (string) $row[$key];
                                break;
                            }
                        }
                        list($last, $middle, $first) = icaviet_ds260_pdf_split_full_name($full_name);
                    }

                    $birth = '';
                    foreach (array('birthDate', 'dateOfBirth', 'dob', 'ngaySinh') as $key) {
                        if (!empty($row[$key]) && is_scalar($row[$key])) {
                            $birth = icaviet_ds260_pdf_format_date((string) $row[$key]);
                            break;
                        }
                    }
                    $place = '';
                    foreach (array('birthPlace', 'placeOfBirth', 'noiSinh') as $key) {
                        if (!empty($row[$key]) && is_scalar($row[$key])) {
                            $place = icaviet_ds260_pdf_text((string) $row[$key]);
                            break;
                        }
                    }
                    if ($place === '') {
                        // childrenInfo (du lieu moi) luu noi sinh thanh cac field
                        // rieng: birthCity/birthProvince/birthCountry (birthPlace
                        // luc nay la object, khong phai scalar nen bo qua o tren).
                        $place_parts = array();
                        foreach (array('birthCity', 'birthProvince', 'birthCountry') as $key) {
                            if (!empty($row[$key]) && is_scalar($row[$key])) {
                                $place_parts[] = icaviet_ds260_pdf_text((string) $row[$key]);
                            }
                        }
                        $place = implode(', ', $place_parts);
                    }
                    $living = '';
                    foreach (array('livingWithYou', 'isLivingWithYou', 'songCung') as $key) {
                        if (!empty($row[$key]) && is_scalar($row[$key])) {
                            $living = icaviet_ds260_pdf_text((string) $row[$key]);
                            break;
                        }
                    }
                    $immigrating_with = '';
                    foreach (array('immigratingWithYou', 'isImmigratingWithYou', 'nhapCuCung') as $key) {
                        if (!empty($row[$key]) && is_scalar($row[$key])) {
                            $immigrating_with = icaviet_ds260_pdf_text((string) $row[$key]);
                            break;
                        }
                    }
                    $immigrating_later = '';
                    foreach (array('immigratingLater', 'isImmigratingLater', 'nhapCuSau') as $key) {
                        if (!empty($row[$key]) && is_scalar($row[$key])) {
                            $immigrating_later = icaviet_ds260_pdf_text((string) $row[$key]);
                            break;
                        }
                    }
                    if ($last !== '' || $middle !== '' || $first !== '' || $birth !== '' || $place !== '' || $living !== '' || $immigrating_with !== '' || $immigrating_later !== '') {
                        $lines[] = array($last, $middle, $first, $birth, $place, $living, $immigrating_with, $immigrating_later);
                    }
                } elseif (is_scalar($row)) {
                    $text .= ' ' . (string) $row;
                }
            }
            if (!empty($lines)) {
                return $lines;
            }
        } elseif (is_scalar($value)) {
            $text = (string) $value;
        }

        $text = icaviet_ds260_pdf_text($text);
        if ($text === '') {
            return array();
        }

        $entries = preg_split('/(?=\b\d{1,3}\s*-\s*)/u', $text, -1, PREG_SPLIT_NO_EMPTY);
        $rows = array();
        foreach ($entries as $entry) {
            $entry = trim($entry);
            if ($entry === '') {
                continue;
            }
            $entry = preg_replace('/^\d{1,3}\s*-\s*/u', '', $entry);
            $parts = preg_split('/\s+-\s+/u', $entry);
            $parts = array_values(array_filter(array_map('icaviet_ds260_pdf_text', $parts), function ($part) {
                return $part !== '';
            }));

            list($last, $middle, $first) = icaviet_ds260_pdf_split_full_name(isset($parts[0]) ? $parts[0] : '');
            $birth = isset($parts[1]) ? icaviet_ds260_pdf_format_date($parts[1]) : '';
            $place = isset($parts[2]) ? $parts[2] : '';
            $living = icaviet_ds260_pdf_child_field_value($parts, 'Sống cùng');
            $immigrating_with = icaviet_ds260_pdf_child_field_value($parts, 'Nhập cư cùng');
            $immigrating_later = icaviet_ds260_pdf_child_field_value($parts, 'Nhập cư sau');

            if ($last === '' && $middle === '' && $first === '' && $birth === '' && $place === '' && $living === '' && $immigrating_with === '' && $immigrating_later === '') {
                continue;
            }
            $rows[] = array($last, $middle, $first, $birth, $place, $living, $immigrating_with, $immigrating_later);
        }

        return $rows;
    }
}

if (!function_exists('icaviet_ds260_pdf_children_info_table')) {
    function icaviet_ds260_pdf_children_info_table($pdf, $label, $value)
    {
        $clean_rows = icaviet_ds260_pdf_parse_children_info($value);
        if (empty($clean_rows)) {
            return false;
        }

        if ($pdf->GetY() > 250) {
            $pdf->AddPage();
        }

        $label = rtrim(icaviet_ds260_pdf_text($label), ':');
        $pdf->SetTextColor(20, 38, 75);
        $pdf->SetFont('DejaVu', 'B', 8.5);
        $pdf->MultiCell(0, 5.2, $label . ':', 0, 'L');
        $pdf->Ln(1);

        $widths = array(8, 20, 20, 20, 20, 34, 16, 16, 16);
        $headers = array('STT', 'Họ', 'Tên lót', 'Tên', 'Ngày sinh', 'Nơi sinh', 'Sống cùng', 'Nhập cư cùng', 'Nhập cư sau');
        $line_h = 4.2;
        $left = $pdf->GetX();

        $draw_header = function () use ($pdf, $widths, $headers, $left) {
            if ($pdf->GetY() > 258) {
                $pdf->AddPage();
            }
            $y = $pdf->GetY();
            $h = 12;
            $x = $left;
            $pdf->SetDrawColor(205, 210, 222);
            $pdf->SetTextColor(20, 38, 75);
            $pdf->SetFont('DejaVu', 'B', 6.4);
            foreach ($headers as $i => $header) {
                icaviet_ds260_pdf_table_cell($pdf, $x, $y, $widths[$i], $h, $header, true, 'C');
                $x += $widths[$i];
            }
            $pdf->SetY($y + $h);
        };

        $draw_header();

        $pdf->SetFont('DejaVu', '', 7.2);
        $pdf->SetTextColor(72, 78, 94);
        foreach ($clean_rows as $index => $row) {
            list($last, $middle, $first, $birth, $place, $living, $immigrating_with, $immigrating_later) = $row;
            $values = array((string) ($index + 1), $last, $middle, $first, $birth, $place, $living, $immigrating_with, $immigrating_later);
            $row_lines = 1;
            foreach ($values as $i => $value) {
                $row_lines = max($row_lines, icaviet_ds260_pdf_cell_lines($pdf, $widths[$i], $value));
            }
            $h = max(8, ($row_lines * $line_h) + 2);

            if (($pdf->GetY() + $h) > 270) {
                $pdf->AddPage();
                $draw_header();
                $pdf->SetFont('DejaVu', '', 7.2);
                $pdf->SetTextColor(72, 78, 94);
            }

            $y = $pdf->GetY();
            $x = $left;
            foreach ($values as $i => $value) {
                $align = $i === 0 ? 'C' : 'L';
                icaviet_ds260_pdf_table_cell($pdf, $x, $y, $widths[$i], $h, $value, false, $align);
                $x += $widths[$i];
            }
            $pdf->SetY($y + $h);
        }

        $pdf->Ln(2);
        return true;
    }
}


if (!function_exists('icaviet_ds260_pdf_simple_table_columns')) {
    /* ── Khai bao cot cho cac danh sach lap lai khong co ham ve rieng.
       Tong do rong cac cot phai bang 160 vi cot STT chiem 10 (tong 170). */
    function icaviet_ds260_pdf_simple_table_columns($key)
    {
        switch ($key) {
            case 'siblingsList':
                return array(
                    array('key' => 'lastName', 'header' => 'Họ', 'width' => 32),
                    array('key' => 'middleName', 'header' => 'Tên lót', 'width' => 30),
                    array('key' => 'firstName', 'header' => 'Tên', 'width' => 30),
                    array('key' => 'birthDate', 'header' => 'Ngày sinh', 'width' => 36, 'date' => true),
                    array('key' => 'nationality', 'header' => 'Quốc tịch', 'width' => 32),
                );

            case 'otherPassports15YearsList':
                return array(
                    array('key' => 'issuingCountry', 'header' => 'Quốc gia cấp', 'width' => 80),
                    array('key' => 'passportNumber', 'header' => 'Số hộ chiếu', 'width' => 80),
                );

            case 'countriesVisited5YearsList':
                return array(
                    array('key' => 'countryName', 'header' => 'Tên quốc gia', 'width' => 30),
                    array('key' => 'citiesVisited', 'header' => 'Địa điểm đến', 'width' => 38),
                    array('key' => 'arrivalDate', 'header' => 'Ngày nhập cảnh', 'width' => 32, 'date' => true),
                    array('key' => 'lengthOfStay', 'header' => 'Thời gian lưu trú', 'width' => 26),
                    array('key' => 'tripPayer', 'header' => 'Người chi trả chuyến đi', 'width' => 34),
                );
        }

        return array();
    }
}


if (!function_exists('icaviet_ds260_pdf_simple_table')) {
    /* ── Bang chung cho danh sach lap lai: moi dong mot ban ghi, tieu de cot
       tieng Viet. Neu khong co ham nay thi icaviet_ds260_pdf_val() se in ra
       chuoi tho dang "lastName: Nguyen; firstName: An". */
    function icaviet_ds260_pdf_simple_table($pdf, $label, $rows, $columns)
    {
        if (!is_array($rows) || empty($rows) || empty($columns)) {
            return false;
        }

        $clean_rows = array();
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }

            $values = array();
            $has_value = false;
            foreach ($columns as $column) {
                if (!empty($column['date'])) {
                    $value = icaviet_ds260_pdf_format_period_date($row, $column['key']);
                } elseif (isset($row[$column['key']]) && is_scalar($row[$column['key']])) {
                    $value = icaviet_ds260_pdf_text(trim((string) $row[$column['key']]));
                } else {
                    $value = '';
                }

                if ($value !== '') {
                    $has_value = true;
                }
                $values[] = $value;
            }

            if ($has_value) {
                $clean_rows[] = $values;
            }
        }

        if (empty($clean_rows)) {
            return false;
        }

        if ($pdf->GetY() > 250) {
            $pdf->AddPage();
        }

        $label = rtrim(icaviet_ds260_pdf_text($label), ':');
        $pdf->SetTextColor(20, 38, 75);
        $pdf->SetFont('DejaVu', 'B', 8.5);
        $pdf->MultiCell(0, 5.2, $label . ':', 0, 'L');
        $pdf->Ln(1);

        $widths = array(10);
        $headers = array('STT');
        foreach ($columns as $column) {
            $widths[] = $column['width'];
            $headers[] = icaviet_ds260_pdf_text($column['header']);
        }

        $line_h = 4.2;
        $left = $pdf->GetX();

        $draw_header = function () use ($pdf, $widths, $headers, $left) {
            if ($pdf->GetY() > 258) {
                $pdf->AddPage();
            }
            $y = $pdf->GetY();
            $h = 10;
            $x = $left;
            $pdf->SetDrawColor(205, 210, 222);
            $pdf->SetTextColor(20, 38, 75);
            $pdf->SetFont('DejaVu', 'B', 7);
            foreach ($headers as $i => $header) {
                icaviet_ds260_pdf_table_cell($pdf, $x, $y, $widths[$i], $h, $header, true, 'C');
                $x += $widths[$i];
            }
            $pdf->SetY($y + $h);
        };

        $draw_header();

        $pdf->SetFont('DejaVu', '', 7.2);
        $pdf->SetTextColor(72, 78, 94);
        foreach ($clean_rows as $index => $row) {
            $values = array_merge(array((string) ($index + 1)), $row);
            $row_lines = 1;
            foreach ($values as $i => $value) {
                $row_lines = max($row_lines, icaviet_ds260_pdf_cell_lines($pdf, $widths[$i], $value));
            }
            $h = max(7, ($row_lines * $line_h) + 2);

            if (($pdf->GetY() + $h) > 270) {
                $pdf->AddPage();
                $draw_header();
                $pdf->SetFont('DejaVu', '', 7.2);
                $pdf->SetTextColor(72, 78, 94);
            }

            $y = $pdf->GetY();
            $x = $left;
            foreach ($values as $i => $value) {
                $align = $i === 0 ? 'C' : 'L';
                icaviet_ds260_pdf_table_cell($pdf, $x, $y, $widths[$i], $h, $value, false, $align);
                $x += $widths[$i];
            }
            $pdf->SetY($y + $h);
        }

        $pdf->Ln(2);
        return true;
    }
}


if (!function_exists('icaviet_ds260_pdf_field_has_value')) {
    /* ── Kiem tra mot field co gi de in khong. Phai bam sat logic cua vong lap
       render ben duoi: neu khac nhau thi se in tieu de nhom rong hoac nguoc lai
       an mat nhom co du lieu. */
    function icaviet_ds260_pdf_field_has_value($field, $key, $data)
    {
        // Chu ky in rieng o phan XAC NHAN, khong tinh la noi dung cua nhom.
        if (function_exists('icaviet_ds260_pdf_is_signature_field') && icaviet_ds260_pdf_is_signature_field($field, $key)) {
            return false;
        }

        // Tieu de phu (section_heading) khong co du lieu rieng.
        if (isset($field['type']) && strtolower((string) $field['type']) === 'section_heading') {
            return false;
        }

        if (isset($field['type']) && strtolower((string) $field['type']) === 'address_parts') {
            return icaviet_ds260_pdf_address_parts($data, $key) !== '';
        }

        if ($key === 'listChildrenInfo') {
            if (!empty($data['childrenInfo']) && is_array($data['childrenInfo'])) {
                return true;
            }
            if (!empty($data['childrenInfoJson']) && is_string($data['childrenInfoJson'])) {
                $decoded_children = json_decode($data['childrenInfoJson'], true);
                if (!empty($decoded_children) && is_array($decoded_children)) {
                    return true;
                }
            }
        }

        return icaviet_ds260_pdf_val($data, $key) !== '';
    }
}


if (!function_exists('icaviet_ds260_pdf_group_has_value')) {
    /* ── Nhom khong co field nao co du lieu thi bo qua ca tieu de, tranh
       PDF day nhung dong nhu "Thong tin cuoc hon nhan cu thu 3 (neu co):"
       khong kem theo gi. */
    function icaviet_ds260_pdf_group_has_value($group, $data)
    {
        if (empty($group['fields']) || !is_array($group['fields'])) {
            return false;
        }

        foreach ($group['fields'] as $field) {
            $key = '';
            if (!empty($field['name'])) {
                $key = (string) $field['name'];
            } elseif (!empty($field['id'])) {
                $key = (string) $field['id'];
            }
            if ($key === '') {
                continue;
            }

            if (icaviet_ds260_pdf_field_has_value($field, $key, $data)) {
                return true;
            }
        }

        return false;
    }
}


if (!function_exists('icaviet_ds260_pdf_signature')) {
    function icaviet_ds260_pdf_signature($pdf, $data)
    {
        $signature = '';

        // 1) Lay chu ky dang base64 neu data cu van con luu trong submission.
        foreach (array('applicantSignature', 'signaturePng', '__signature', 'signatureData', 'applicant_signature', '__sig') as $key) {
            if (!empty($data[$key]) && is_string($data[$key]) && strpos($data[$key], 'data:image') === 0) {
                $signature = $data[$key];
                break;
            }
        }

        $image_file = '';
        $image_type = '';
        $tmp_file = '';

        // 2) Neu khong con base64 trong data, lay file chu ky da tach rieng theo submission id.
        if ($signature === '' && !empty($data['_id']) && class_exists('ICAVIET_DB') && method_exists('ICAVIET_DB', 'get_signature_path')) {
            $saved_signature = ICAVIET_DB::get_signature_path((int) $data['_id']);
            if ($saved_signature && file_exists($saved_signature)) {
                $image_file = $saved_signature;
                $image_type = 'PNG';
            }
        }

        // 3) Neu co base64 thi ghi thanh file tam co duoi file va type ro rang cho tFPDF.
        if ($signature !== '') {
            if (!preg_match('/^data:image\/(png|jpe?g|gif);base64,/i', $signature, $m)) {
                return;
            }

            $ext = strtolower($m[1]);
            if ($ext === 'jpeg') {
                $ext = 'jpg';
            }
            $image_type = strtoupper($ext === 'jpg' ? 'JPEG' : $ext);

            $comma = strpos($signature, ',');
            if ($comma === false) {
                return;
            }

            $raw = base64_decode(substr($signature, $comma + 1));
            if ($raw === false || $raw === '') {
                return;
            }

            $tmp_file = tempnam(sys_get_temp_dir(), 'icaviet_ds260_sig_');
            if (!$tmp_file) {
                return;
            }

            $image_file = $tmp_file . '.' . $ext;
            @rename($tmp_file, $image_file);
            file_put_contents($image_file, $raw);
        }

        if ($image_file === '' || !file_exists($image_file)) {
            return;
        }

        if ($pdf->GetY() > 235) {
            $pdf->AddPage();
        }

        $pdf->Ln(2);
        $pdf->SetTextColor(20, 38, 75);
        $pdf->SetFont('DejaVu', 'B', 9);
        $pdf->Cell(62, 8, 'Chữ ký:', 0, 0, 'L');
        $x = $pdf->GetX();
        $y = $pdf->GetY() - 3;
        $pdf->Image($image_file, $x, $y, 45, 18, $image_type);
        $pdf->Ln(20);

        if ($tmp_file !== '' || strpos(basename($image_file), 'icaviet_ds260_sig_') === 0) {
            @unlink($image_file);
        }
    }
}

if (!function_exists('icaviet_ds260_pdf_is_signature_field')) {
    function icaviet_ds260_pdf_is_signature_field($field, $key)
    {
        $signature_keys = array(
            'applicantSignature' => true,
            'signaturePng' => true,
            '__signature' => true,
            'signatureData' => true,
            'applicant_signature' => true,
            '__sig' => true,
        );

        if (isset($signature_keys[$key])) {
            return true;
        }

        if (isset($field['type']) && strtolower((string) $field['type']) === 'signature') {
            return true;
        }

        return false;
    }
}

$pdf->SetMargins(20, 16, 20);
$pdf->SetAutoPageBreak(true, 18);
$pdf->SetFont('DejaVu', '', 9);
icaviet_ds260_pdf_header($pdf);

$schema_path = dirname(__FILE__) . '/schema.json';
$schema = array();
if (file_exists($schema_path)) {
    $decoded = json_decode(file_get_contents($schema_path), true);
    if (is_array($decoded)) {
        $schema = $decoded;
    }
}

$printed = array();

if (!empty($schema['sections']) && is_array($schema['sections'])) {
    foreach ($schema['sections'] as $section) {
        if (empty($section['groups']) || !is_array($section['groups'])) {
            continue;
        }

        // Chi giu lai cac nhom thuc su co du lieu. Nguoi dung chi dien mot phan
        // don nen phan lon nhom la rong (hon nhan cu 2/3, quan doi, Dang vien...).
        $visible_groups = array();
        foreach ($section['groups'] as $group) {
            if (icaviet_ds260_pdf_group_has_value($group, $data)) {
                $visible_groups[] = $group;
            }
        }

        // Ca muc khong con nhom nao thi bo luon tieu de muc.
        if (empty($visible_groups)) {
            continue;
        }

        icaviet_ds260_pdf_section($pdf, icaviet_ds260_pdf_section_title($section));

        foreach ($visible_groups as $group) {
            $group_title = icaviet_ds260_pdf_group_title($group);

            // Nhom chi co 1 field ma nhan trung tieu de nhom (children_info) thi
            // bo tieu de di, neu khong PDF in "Thong tin ve con:" hai lan lien nhau.
            if ($group_title !== '' && !empty($group['fields']) && is_array($group['fields']) && count($group['fields']) === 1) {
                $only_label = icaviet_ds260_pdf_label($group['fields'][0]);
                if ($only_label !== '' && rtrim($only_label, ':') === rtrim($group_title, ':')) {
                    $group_title = '';
                }
            }

            icaviet_ds260_pdf_group($pdf, $group_title);

            if (empty($group['fields']) || !is_array($group['fields'])) {
                continue;
            }

            foreach ($group['fields'] as $field) {
                $key = '';
                if (!empty($field['name'])) {
                    $key = (string) $field['name'];
                } elseif (!empty($field['id'])) {
                    $key = (string) $field['id'];
                }
                if ($key === '') {
                    continue;
                }

                // Khong in truc tiep chuoi base64 cua chu ky vao PDF.
                // Chu ky se duoc render rieng bang anh o phan XAC NHAN ben duoi.
                if (function_exists('icaviet_ds260_pdf_is_signature_field') && icaviet_ds260_pdf_is_signature_field($field, $key)) {
                    $printed[$key] = true;
                    continue;
                }

                $label = icaviet_ds260_pdf_label($field);

                // Cha/me/nguoi bao lanh/nguoi lien he chi luu 1 chuoi ten day du
                // (fatherFullName/motherFullName/sponsorFullName/contactNameUS/
                // alternateContactNameUS), khong tach san Ho/Ten lot/Ten nhu nguoi
                // dien don (lastName/middleName/firstName) va vo/chong (spouseLastName/
                // ...). Tach lai va in thanh 3 dong rieng de dong nhat cach hien thi.
                if ($key === 'fatherFullName' || $key === 'motherFullName' || $key === 'sponsorFullName' || $key === 'contactNameUS' || $key === 'alternateContactNameUS' || $key === 'applicantFullName') {
                    list($last, $middle, $first) = icaviet_ds260_pdf_split_full_name(icaviet_ds260_pdf_val($data, $key));
                    icaviet_ds260_pdf_row($pdf, 'Họ', $last);
                    icaviet_ds260_pdf_row($pdf, 'Tên lót', $middle);
                    icaviet_ds260_pdf_row($pdf, 'Tên', $first);
                    $printed[$key] = true;
                    continue;
                }

                // Render cac field dia chi dang tach thanh nhieu o con: Street, City, Province/State, Zip, Country.
                // Neu khong ghep lai o day thi PDF se bi thieu cac dia chi nhu hien tai, vo/chong, My, cha, me.
                if (isset($field['type']) && strtolower((string) $field['type']) === 'address_parts') {
                    $value = icaviet_ds260_pdf_address_parts($data, $key);
                    if ($value !== '') {
                        icaviet_ds260_pdf_row($pdf, $label, $value);
                        $printed[$key] = true;
                    }
                    continue;
                }

                // Render rieng lich su noi o theo dang bang de moi dia chi nam tren mot dong.
                if ($key === 'residenceHistory' && !empty($data[$key]) && is_array($data[$key])) {
                    icaviet_ds260_pdf_residence_history_table($pdf, $label, $data[$key]);
                    $printed[$key] = true;
                    continue;
                }

                // Render rieng danh sach cong viec hien tai theo dang bang de moi cong viec nam tren mot dong.
                if ($key === 'jobsTenYears' && !empty($data[$key]) && is_array($data[$key])) {
                    icaviet_ds260_pdf_jobs_table($pdf, $label, $data[$key]);
                    $printed[$key] = true;
                    continue;
                }

                // Render rieng danh sach cong viec truoc day theo dang bang de moi cong viec nam tren mot dong.
                if ($key === 'previousJobs' && !empty($data[$key]) && is_array($data[$key])) {
                    icaviet_ds260_pdf_jobs_table($pdf, $label, $data[$key]);
                    $printed[$key] = true;
                    continue;
                }

                // Render rieng danh sach truong hoc theo dang bang de moi truong nam tren mot dong.
                if ($key === 'schoolList' && !empty($data[$key]) && is_array($data[$key])) {
                    icaviet_ds260_pdf_school_table($pdf, $label, $data[$key]);
                    $printed[$key] = true;
                    continue;
                }

                // Cac danh sach lap lai bo sung sau nay (anh chi em, ho chieu khac
                // trong 15 nam, quoc gia da den) khong co ham ve rieng nhu tren
                // nen dung bang chung theo khai bao cot.
                $simple_columns = icaviet_ds260_pdf_simple_table_columns($key);
                if (!empty($simple_columns) && !empty($data[$key]) && is_array($data[$key])) {
                    if (icaviet_ds260_pdf_simple_table($pdf, $label, $data[$key], $simple_columns)) {
                        $printed[$key] = true;
                        continue;
                    }
                }

                // Render rieng thong tin ve con theo dang bang de moi nguoi con nam tren mot dong.
                // Uu tien childrenInfo/childrenInfoJson (DS260Form.vue luu lastName/
                // middleName/firstName tach san cho tung con); listChildrenInfo chi
                // con la fallback/legacy display khi 2 field kia khong co.
                if ($key === 'listChildrenInfo') {
                    $children_source = null;
                    if (!empty($data['childrenInfo']) && is_array($data['childrenInfo'])) {
                        $children_source = $data['childrenInfo'];
                    } elseif (!empty($data['childrenInfoJson']) && is_string($data['childrenInfoJson'])) {
                        $decoded_children = json_decode($data['childrenInfoJson'], true);
                        if (is_array($decoded_children)) {
                            $children_source = $decoded_children;
                        }
                    }
                    if ($children_source === null) {
                        $children_source = !empty($data[$key]) ? $data[$key] : array();
                    }
                    if (!empty($children_source)) {
                        if (icaviet_ds260_pdf_children_info_table($pdf, $label, $children_source)) {
                            $printed[$key] = true;
                            continue;
                        }
                    }
                }

                $value = icaviet_ds260_pdf_val($data, $key);
                if ($value === '') {
                    continue;
                }

                if (isset($field['type']) && strtolower((string) $field['type']) === 'date_parts') {
                    $value = icaviet_ds260_pdf_format_date($value);
                }

                icaviet_ds260_pdf_row($pdf, $label, $value);
                $printed[$key] = true;
            }
        }
    }
}

// Khong in phan "THONG TIN KHAC".
// Cac field phat sinh ngoai schema se duoc bo qua de PDF gon va khong bi lo chuoi ky thuat/base64.

icaviet_ds260_pdf_section($pdf, 'XÁC NHẬN');
list($applicant_last, $applicant_middle, $applicant_first) = icaviet_ds260_pdf_split_full_name(icaviet_ds260_pdf_val($data, 'applicantFullName'));
icaviet_ds260_pdf_row($pdf, 'Họ', $applicant_last);
icaviet_ds260_pdf_row($pdf, 'Tên lót', $applicant_middle);
icaviet_ds260_pdf_row($pdf, 'Tên', $applicant_first);
icaviet_ds260_pdf_signature($pdf, $data);

<?php
/**
 * PDF template cho form DS-160.
 * Version: 2026-10-12-v8-i130-style
 * Muc tieu: xuat PDF dang van ban dep, gan voi file mau DS-160 tieng Viet.
 * Bien co san tu ICAVIET_PDF::generate():
 * - $pdf  : ICAVIET_FPDF
 * - $data : array du lieu submit
 */
if (!defined('ABSPATH')) {
    exit;
}

if (!function_exists('icaviet_ds160_pdf_register_body_font')) {
    function icaviet_ds160_pdf_register_body_font($pdf)
    {
        // Dùng DejaVu đã được ICAVIET_FPDF đăng ký sẵn để bảo đảm tiếng Việt không bị rớt chữ.
        // Times New Roman trên tFPDF thường làm sai độ rộng ký tự UTF-8 ở một số server.
        return 'DejaVu';
    }
}

if (!function_exists('icaviet_ds160_pdf_set_font')) {
    function icaviet_ds160_pdf_set_font($pdf, $style = '', $size = 11)
    {
        global $icaviet_ds160_pdf_font_family;
        $family = !empty($icaviet_ds160_pdf_font_family) ? $icaviet_ds160_pdf_font_family : 'DejaVu';
        $pdf->SetFont($family, $style, $size);
    }
}


if (!function_exists('icaviet_ds160_pdf_fix_unicode')) {
    function icaviet_ds160_pdf_fix_unicode($text)
    {
        $text = (string) $text;

        // Rất quan trọng: schema DS-160 có nhiều chữ Việt ở dạng Unicode tổ hợp
        // ví dụ: "gọi", "khác", "Tình trạng".
        // tFPDF không xử lý tốt dấu tổ hợp nên dấu/chữ bị rơi từng dòng.
        // Chuẩn hóa về ký tự dựng sẵn NFC trước khi in PDF.
        if (class_exists('Normalizer')) {
            $normalized = Normalizer::normalize($text, Normalizer::FORM_C);
            if (is_string($normalized)) {
                $text = $normalized;
            }
        }

        static $map = null;
        if ($map === null) {
            $map = array(
            'À̂' => 'Ầ',
            'À̆' => 'Ằ',
            'Á̂' => 'Ấ',
            'Á̆' => 'Ắ',
            'Ầ' => 'Ầ',
            'Ấ' => 'Ấ',
            'Ẫ' => 'Ẫ',
            'Ẩ' => 'Ẩ',
            'Ậ' => 'Ậ',
            'Ã̂' => 'Ẫ',
            'Ã̆' => 'Ẵ',
            'Ằ' => 'Ằ',
            'Ắ' => 'Ắ',
            'Ẵ' => 'Ẵ',
            'Ẳ' => 'Ẳ',
            'Ặ' => 'Ặ',
            'Ả̂' => 'Ẩ',
            'Ả̆' => 'Ẳ',
            'Ậ' => 'Ậ',
            'Ặ' => 'Ặ',
            'È̂' => 'Ề',
            'É̂' => 'Ế',
            'Ề' => 'Ề',
            'Ế' => 'Ế',
            'Ễ' => 'Ễ',
            'Ể' => 'Ể',
            'Ệ' => 'Ệ',
            'Ẽ̂' => 'Ễ',
            'Ẻ̂' => 'Ể',
            'Ệ' => 'Ệ',
            'Ò̂' => 'Ồ',
            'Ờ' => 'Ờ',
            'Ó̂' => 'Ố',
            'Ớ' => 'Ớ',
            'Ồ' => 'Ồ',
            'Ố' => 'Ố',
            'Ỗ' => 'Ỗ',
            'Ổ' => 'Ổ',
            'Ộ' => 'Ộ',
            'Õ̂' => 'Ỗ',
            'Ỡ' => 'Ỡ',
            'Ỏ̂' => 'Ổ',
            'Ở' => 'Ở',
            'Ờ' => 'Ờ',
            'Ớ' => 'Ớ',
            'Ỡ' => 'Ỡ',
            'Ở' => 'Ở',
            'Ợ' => 'Ợ',
            'Ộ' => 'Ộ',
            'Ợ' => 'Ợ',
            'Ừ' => 'Ừ',
            'Ứ' => 'Ứ',
            'Ữ' => 'Ữ',
            'Ử' => 'Ử',
            'Ừ' => 'Ừ',
            'Ứ' => 'Ứ',
            'Ữ' => 'Ữ',
            'Ử' => 'Ử',
            'Ự' => 'Ự',
            'Ự' => 'Ự',
            'à̂' => 'ầ',
            'à̆' => 'ằ',
            'á̂' => 'ấ',
            'á̆' => 'ắ',
            'ầ' => 'ầ',
            'ấ' => 'ấ',
            'ẫ' => 'ẫ',
            'ẩ' => 'ẩ',
            'ậ' => 'ậ',
            'ã̂' => 'ẫ',
            'ã̆' => 'ẵ',
            'ằ' => 'ằ',
            'ắ' => 'ắ',
            'ẵ' => 'ẵ',
            'ẳ' => 'ẳ',
            'ặ' => 'ặ',
            'ả̂' => 'ẩ',
            'ả̆' => 'ẳ',
            'ậ' => 'ậ',
            'ặ' => 'ặ',
            'è̂' => 'ề',
            'é̂' => 'ế',
            'ề' => 'ề',
            'ế' => 'ế',
            'ễ' => 'ễ',
            'ể' => 'ể',
            'ệ' => 'ệ',
            'ẽ̂' => 'ễ',
            'ẻ̂' => 'ể',
            'ệ' => 'ệ',
            'ò̂' => 'ồ',
            'ờ' => 'ờ',
            'ó̂' => 'ố',
            'ớ' => 'ớ',
            'ồ' => 'ồ',
            'ố' => 'ố',
            'ỗ' => 'ỗ',
            'ổ' => 'ổ',
            'ộ' => 'ộ',
            'õ̂' => 'ỗ',
            'ỡ' => 'ỡ',
            'ỏ̂' => 'ổ',
            'ở' => 'ở',
            'ờ' => 'ờ',
            'ớ' => 'ớ',
            'ỡ' => 'ỡ',
            'ở' => 'ở',
            'ợ' => 'ợ',
            'ộ' => 'ộ',
            'ợ' => 'ợ',
            'ừ' => 'ừ',
            'ứ' => 'ứ',
            'ữ' => 'ữ',
            'ử' => 'ử',
            'ừ' => 'ừ',
            'ứ' => 'ứ',
            'ữ' => 'ữ',
            'ử' => 'ử',
            'ự' => 'ự',
            'ự' => 'ự',
            'À' => 'À',
            'Á' => 'Á',
            'Â' => 'Â',
            'Ã' => 'Ã',
            'Ă' => 'Ă',
            'Ả' => 'Ả',
            'Ạ' => 'Ạ',
            'È' => 'È',
            'É' => 'É',
            'Ê' => 'Ê',
            'Ẽ' => 'Ẽ',
            'Ẻ' => 'Ẻ',
            'Ẹ' => 'Ẹ',
            'Ì' => 'Ì',
            'Í' => 'Í',
            'Ĩ' => 'Ĩ',
            'Ỉ' => 'Ỉ',
            'Ị' => 'Ị',
            'Ò' => 'Ò',
            'Ó' => 'Ó',
            'Ô' => 'Ô',
            'Õ' => 'Õ',
            'Ỏ' => 'Ỏ',
            'Ơ' => 'Ơ',
            'Ọ' => 'Ọ',
            'Ù' => 'Ù',
            'Ú' => 'Ú',
            'Ũ' => 'Ũ',
            'Ủ' => 'Ủ',
            'Ư' => 'Ư',
            'Ụ' => 'Ụ',
            'Ỳ' => 'Ỳ',
            'Ý' => 'Ý',
            'Ỹ' => 'Ỹ',
            'Ỷ' => 'Ỷ',
            'Ỵ' => 'Ỵ',
            'à' => 'à',
            'á' => 'á',
            'â' => 'â',
            'ã' => 'ã',
            'ă' => 'ă',
            'ả' => 'ả',
            'ạ' => 'ạ',
            'è' => 'è',
            'é' => 'é',
            'ê' => 'ê',
            'ẽ' => 'ẽ',
            'ẻ' => 'ẻ',
            'ẹ' => 'ẹ',
            'ì' => 'ì',
            'í' => 'í',
            'ĩ' => 'ĩ',
            'ỉ' => 'ỉ',
            'ị' => 'ị',
            'ò' => 'ò',
            'ó' => 'ó',
            'ô' => 'ô',
            'õ' => 'õ',
            'ỏ' => 'ỏ',
            'ơ' => 'ơ',
            'ọ' => 'ọ',
            'ù' => 'ù',
            'ú' => 'ú',
            'ũ' => 'ũ',
            'ủ' => 'ủ',
            'ư' => 'ư',
            'ụ' => 'ụ',
            'ỳ' => 'ỳ',
            'ý' => 'ý',
            'ỹ' => 'ỹ',
            'ỷ' => 'ỷ',
            'ỵ' => 'ỵ',
        );
        }

        return strtr($text, $map);
    }
}

if (!function_exists('icaviet_ds160_pdf_is_date_key')) {
    /* ── Cung tieu chi voi isDateField() trong DS160Form.vue: field ten co
       chua "date" (tru "update"/"candidate") duoc coi la field ngay, du
       khai bao type "text". Dung de nhan dien key trong cac mang lap
       (residence_period_table, work history...) khi flatten thanh text. ── */
    function icaviet_ds160_pdf_is_date_key($key)
    {
        if (!is_string($key)) {
            return false;
        }
        $k = function_exists('mb_strtolower') ? mb_strtolower($key, 'UTF-8') : strtolower($key);
        if (strpos($k, 'date') === false) {
            return false;
        }
        if (strpos($k, 'update') !== false || strpos($k, 'candidate') !== false) {
            return false;
        }
        return true;
    }
}

if (!function_exists('icaviet_ds160_pdf_format_date')) {
    /* ── DateSelect.vue luu ngay theo DD/MM/YYYY (hoac MM/YYYY, YYYY neu
       khach khong nho day du). Doi ve dang chu "Ngày D tháng M năm Y", dong
       bo voi bao-lanh/ndbl/N-400/N-600/I-90/DS-260. ── */
    function icaviet_ds160_pdf_format_date($value)
    {
        $value = trim((string) $value);
        if ($value === '') {
            return '';
        }
        if (preg_match('/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/', $value, $m)) {
            return 'Ngày ' . intval($m[1]) . ' tháng ' . intval($m[2]) . ' năm ' . intval($m[3]);
        }
        if (preg_match('/^(\d{4})-(\d{1,2})-(\d{1,2})$/', $value, $m)) {
            return 'Ngày ' . intval($m[3]) . ' tháng ' . intval($m[2]) . ' năm ' . intval($m[1]);
        }
        if (preg_match('/^(\d{1,2})\/(\d{4})$/', $value, $m)) {
            return 'Tháng ' . intval($m[1]) . ' năm ' . intval($m[2]);
        }
        if (preg_match('/^(\d{4})$/', $value, $m)) {
            return 'Năm ' . intval($m[1]);
        }
        return $value;
    }
}

if (!function_exists('icaviet_ds160_pdf_is_person_name_field')) {
    /* ── Khac bao-lanh/ndbl, DS-160 KHONG co field Ho/Ten lot/Ten tach san -
       cac field nhu fatherName/motherName/spouseName la 1 o nhap tu do duy
       nhat. Danh sach nay liet ke chinh xac cac field ten nguoi (khong
       dung substring "Name" vi se khop nham companyName/schoolName...). ── */
    function icaviet_ds160_pdf_is_person_name_field($name)
    {
        static $names = array(
            'fullName' => true,
            'otherName' => true,
            'fatherName' => true,
            'motherName' => true,
            'spouseName' => true,
            'exSpouseName' => true,
            'usContactFullName' => true,
            'sponsorName' => true,
            'managerName01' => true,
        );
        return isset($names[$name]);
    }
}

if (!function_exists('icaviet_ds160_pdf_split_full_name')) {
    /* ── Doan ranh gioi Ho/Ten lot/Ten tu 1 chuoi ten day du (khong co du
       lieu tach san de doi chieu): tu dau -> Ho, tu cuoi -> Ten, cac tu o
       giua -> Ten lot. Co the sai neu ten khong nhap theo dung thu tu nay. ── */
    function icaviet_ds160_pdf_split_full_name($full)
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

if (!function_exists('icaviet_ds160_pdf_name_multiline')) {
    function icaviet_ds160_pdf_name_multiline($ho, $ten_lot, $ten)
    {
        $lines = array();
        if ($ho !== '') $lines[] = 'Họ: ' . $ho;
        if ($ten_lot !== '') $lines[] = 'Tên lót: ' . $ten_lot;
        if ($ten !== '') $lines[] = 'Tên: ' . $ten;
        return implode("\n", $lines);
    }
}

if (!function_exists('icaviet_ds160_pdf_value')) {
    function icaviet_ds160_pdf_value($value)
    {
        if (is_array($value)) {
            $is_list = array_keys($value) === range(0, count($value) - 1);
            $parts = array();

            foreach ($value as $key => $item) {
                if (is_array($item)) {
                    $line_parts = array();
                    foreach ($item as $item_key => $item_value) {
                        if (!is_array($item_value) && icaviet_ds160_pdf_is_date_key($item_key)) {
                            $item_value = icaviet_ds160_pdf_format_date(icaviet_ds160_pdf_fix_unicode(trim((string) $item_value)));
                        } else {
                            $item_value = icaviet_ds160_pdf_value($item_value);
                        }
                        if ($item_value === '') {
                            continue;
                        }
                        $clean_key = trim((string) $item_key);
                        $line_parts[] = ($clean_key !== '' && !is_numeric($clean_key)) ? ($clean_key . ': ' . $item_value) : $item_value;
                    }
                    $line = trim(implode('; ', $line_parts));
                    if ($line !== '') {
                        $parts[] = ($is_list ? '- ' : '') . $line;
                    }
                } else {
                    if (!$is_list && is_string($key) && icaviet_ds160_pdf_is_date_key($key)) {
                        $item_value = icaviet_ds160_pdf_format_date(icaviet_ds160_pdf_fix_unicode(trim((string) $item)));
                    } else {
                        $item_value = icaviet_ds160_pdf_value($item);
                    }
                    if ($item_value === '') {
                        continue;
                    }
                    if (!$is_list && is_string($key) && !is_numeric($key)) {
                        $parts[] = $key . ': ' . $item_value;
                    } else {
                        $parts[] = $item_value;
                    }
                }
            }

            return trim(implode("\n", $parts));
        }

        $value = icaviet_ds160_pdf_fix_unicode(trim((string) $value));

        // Khong in base64 file/signature vao PDF dang text.
        if (strpos($value, 'data:image/') === 0 || strpos($value, 'data:application/') === 0) {
            return '[Đã đính kèm]';
        }

        return $value;
    }
}

if (!function_exists('icaviet_ds160_pdf_get_raw')) {
    function icaviet_ds160_pdf_get_raw($data, $key, $default = '')
    {
        if (!is_array($data) || !array_key_exists($key, $data)) {
            return $default;
        }
        return $data[$key];
    }
}

if (!function_exists('icaviet_ds160_pdf_get')) {
    function icaviet_ds160_pdf_get($data, $key, $default = '')
    {
        $value = icaviet_ds160_pdf_value(icaviet_ds160_pdf_get_raw($data, $key, $default));
        return $value !== '' ? $value : $default;
    }
}

if (!function_exists('icaviet_ds160_pdf_text')) {
    function icaviet_ds160_pdf_text($mixed, $locale = 'vi')
    {
        if (is_array($mixed)) {
            if (!empty($mixed[$locale])) {
                return (string) $mixed[$locale];
            }
            if (!empty($mixed['vi'])) {
                return (string) $mixed['vi'];
            }
            if (!empty($mixed['en'])) {
                return (string) $mixed['en'];
            }
            return '';
        }
        return is_string($mixed) ? icaviet_ds160_pdf_fix_unicode($mixed) : '';
    }
}

if (!function_exists('icaviet_ds160_pdf_label')) {
    function icaviet_ds160_pdf_label($field, $locale = 'vi')
    {
        $label = '';
        if (isset($field['columnKey']) && trim((string) $field['columnKey']) !== '') {
            $label = (string) $field['columnKey'];
        } elseif (isset($field['label'])) {
            $label = icaviet_ds160_pdf_text($field['label'], $locale);
        } elseif (!empty($field['name'])) {
            $label = (string) $field['name'];
        }

        $label = icaviet_ds160_pdf_fix_unicode(trim(preg_replace('/\s+/u', ' ', $label)));
        $label = rtrim($label, " \t\n\r\0\x0B:");
        return $label;
    }
}

if (!function_exists('icaviet_ds160_pdf_section_title')) {
    function icaviet_ds160_pdf_section_title($section, $locale = 'vi')
    {
        if (isset($section['title'])) {
            $title = icaviet_ds160_pdf_text($section['title'], $locale);
            if ($title !== '') {
                return $title;
            }
        }
        return !empty($section['id']) ? (string) $section['id'] : 'Thông tin';
    }
}

if (!function_exists('icaviet_ds160_pdf_group_title')) {
    function icaviet_ds160_pdf_group_title($group, $locale = 'vi')
    {
        if (isset($group['title'])) {
            return icaviet_ds160_pdf_text($group['title'], $locale);
        }
        return '';
    }
}

if (!function_exists('icaviet_ds160_pdf_show_field')) {
    function icaviet_ds160_pdf_show_field($field, $data)
    {
        if (empty($field['show_if']) || !is_array($field['show_if'])) {
            return true;
        }

        foreach ($field['show_if'] as $dep_key => $allowed) {
            $actual = icaviet_ds160_pdf_get($data, $dep_key);
            if (is_array($allowed)) {
                if (!in_array($actual, $allowed, true)) {
                    return false;
                }
            } else {
                if ($actual !== (string) $allowed) {
                    return false;
                }
            }
        }
        return true;
    }
}

if (!function_exists('icaviet_ds160_pdf_is_date_field')) {
    /* ── Rap lai dung tieu chi cua isDateField() trong DS160Form.vue: da so
       field ngay trong schema DS-160 khai bao type "text" (khong phai
       "date"), Vue nhan dien bang ten field chua "date" hoac tu khoa trong
       nhan. Neu khong rap lai dung tieu chi nay, cac field nhu birthDate,
       passportIssueDateVN... se khong duoc doi ve dang chu. ── */
    function icaviet_ds160_pdf_is_date_field($field)
    {
        if (!is_array($field)) {
            return false;
        }

        $type = isset($field['type']) ? (string) $field['type'] : '';
        if ($type === 'date') {
            return true;
        }
        if (in_array($type, array('radio', 'checkbox', 'select', 'file', 'textarea'), true)) {
            return false;
        }

        $name = isset($field['name']) ? (string) $field['name'] : '';
        if ($name !== '' && icaviet_ds160_pdf_is_date_key($name)) {
            return true;
        }

        $label_vi = isset($field['label']['vi']) ? (string) $field['label']['vi'] : '';
        $label_en = isset($field['label']['en']) ? (string) $field['label']['en'] : '';
        $label_str = function_exists('mb_strtolower') ? mb_strtolower($label_vi . ' ' . $label_en, 'UTF-8') : strtolower($label_vi . ' ' . $label_en);
        $keywords = array(
            '(dd/mm/yyyy)', 'ngày sinh', 'sinh ngày', 'date of birth',
            'ngày cấp', 'date of issue', 'ngày hết hạn', 'expiration date',
            'ngày bắt đầu', 'ngày nghỉ', 'ngày kết hôn', 'ngày ly hôn', 'ngày ly dị',
            'ngày đến', 'ngày đi', 'ngày về', 'từ ngày', 'đến ngày', 'ngày dự định', 'ngày dự kiến',
        );
        foreach ($keywords as $keyword) {
            if (strpos($label_str, $keyword) !== false) {
                return true;
            }
        }

        return false;
    }
}

if (!function_exists('icaviet_ds160_pdf_check_page')) {
    function icaviet_ds160_pdf_check_page($pdf, $needed = 14)
    {
        if (($pdf->GetY() + $needed) > icaviet_ds160_pdf_bottom_limit($pdf)) {
            $pdf->AddPage();
            $pdf->SetY(16);
        }
    }
}

if (!function_exists('icaviet_ds160_pdf_normalize_one_line')) {
    function icaviet_ds160_pdf_normalize_one_line($text)
    {
        $text = icaviet_ds160_pdf_fix_unicode(trim((string) $text));
        $text = preg_replace('/[ \t]+/u', ' ', $text);
        return $text;
    }
}

if (!function_exists('icaviet_ds160_pdf_text_width')) {
    function icaviet_ds160_pdf_text_width($pdf, $text)
    {
        return $pdf->GetStringWidth(icaviet_ds160_pdf_fix_unicode((string) $text));
    }
}

if (!function_exists('icaviet_ds160_pdf_split_long_word_by_width')) {
    function icaviet_ds160_pdf_split_long_word_by_width($pdf, $word, $max_width)
    {
        $word = icaviet_ds160_pdf_fix_unicode((string) $word);
        $parts = array();
        $current = '';
        $length = mb_strlen($word, 'UTF-8');

        for ($i = 0; $i < $length; $i++) {
            $ch = mb_substr($word, $i, 1, 'UTF-8');
            $candidate = $current . $ch;
            if ($current !== '' && icaviet_ds160_pdf_text_width($pdf, $candidate) > $max_width) {
                $parts[] = $current;
                $current = $ch;
            } else {
                $current = $candidate;
            }
        }

        if ($current !== '') {
            $parts[] = $current;
        }

        return !empty($parts) ? $parts : array($word);
    }
}

if (!function_exists('icaviet_ds160_pdf_wrap_by_width')) {
    function icaviet_ds160_pdf_wrap_by_width($pdf, $text, $max_width)
    {
        $text = icaviet_ds160_pdf_normalize_one_line($text);
        if ($text === '') {
            return array('');
        }

        $words = preg_split('/\s+/u', $text, -1, PREG_SPLIT_NO_EMPTY);
        if (!$words) {
            return array($text);
        }

        $lines = array();
        $current = '';

        foreach ($words as $word) {
            $word = icaviet_ds160_pdf_fix_unicode($word);
            $candidate = $current === '' ? $word : $current . ' ' . $word;

            if (icaviet_ds160_pdf_text_width($pdf, $candidate) <= $max_width) {
                $current = $candidate;
                continue;
            }

            if ($current !== '') {
                $lines[] = $current;
                $current = '';
            }

            if (icaviet_ds160_pdf_text_width($pdf, $word) <= $max_width) {
                $current = $word;
                continue;
            }

            $chunks = icaviet_ds160_pdf_split_long_word_by_width($pdf, $word, $max_width);
            $last_index = count($chunks) - 1;
            foreach ($chunks as $idx => $chunk) {
                if ($idx === $last_index) {
                    $current = $chunk;
                } else {
                    $lines[] = $chunk;
                }
            }
        }

        if ($current !== '') {
            $lines[] = $current;
        }

        return !empty($lines) ? $lines : array('');
    }
}

if (!function_exists('icaviet_ds160_pdf_write_line')) {
    function icaviet_ds160_pdf_write_line($pdf, $text, $indent = 20, $height = 6.8, $style = '', $size = 10.5)
    {
        // V5: KHONG dung Cell() nua vi Cell() khong tu xuong dong.
        // Luon dung MultiCell() full-width de FPDF tu cat dong theo kho giay.
        icaviet_ds160_pdf_check_page($pdf, 8);
        icaviet_ds160_pdf_set_font($pdf, $style, $size);
        $pdf->SetX($indent);
        $pdf->MultiCell(190 - $indent, $height, icaviet_ds160_pdf_fix_unicode((string) $text), 0, 'L', false);
    }
}

if (!function_exists('icaviet_ds160_pdf_write_wrapped')) {
    function icaviet_ds160_pdf_write_wrapped($pdf, $text, $indent = 20, $width = 170, $height = 6.8, $style = '', $size = 10.5)
    {
        // V5: bo toan bo cach tu tinh GetStringWidth/cat chu.
        // MultiCell cua tFPDF xu ly xuong dong theo dung be rong, ke ca URL dai.
        icaviet_ds160_pdf_set_font($pdf, $style, $size);
        $raw_lines = preg_split('/\r\n|\r|\n/', (string) $text);
        if (!$raw_lines) {
            $raw_lines = array('');
        }

        foreach ($raw_lines as $raw_line) {
            $line = icaviet_ds160_pdf_fix_unicode((string) $raw_line);
            $line = preg_replace('/[ \t]+/u', ' ', $line);

            icaviet_ds160_pdf_check_page($pdf, 8);
            $pdf->SetX($indent);

            if (trim($line) === '') {
                $pdf->Ln($height);
            } else {
                $pdf->MultiCell($width, $height, $line, 0, 'L', false);
            }
        }
    }
}

/* ── V8: dong bo style voi PDF I-130 / bao lanh (forms/bao-lanh/pdf.php):
   chu navy, tieu de phan chu hoa 14pt + vach mo, nhan in dam navy / gia tri
   chu thuong mau xam, cau tra loi lua chon dang "pill" nen xam, danh sach
   lap thanh bang co header xam nhat. Dong khong co gia tri thi an nhu I-130. ── */
if (!function_exists('icaviet_ds160_pdf_colors')) {
    function icaviet_ds160_pdf_colors($pdf, $type = 'text')
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

if (!function_exists('icaviet_ds160_pdf_bottom_limit')) {
    // Moc FPDF tu ngat trang: chieu cao trang - bottom margin 20mm (SetAutoPageBreak ben duoi).
    function icaviet_ds160_pdf_bottom_limit($pdf)
    {
        return $pdf->GetPageHeight() - 20;
    }
}

if (!function_exists('icaviet_ds160_pdf_today')) {
    function icaviet_ds160_pdf_today()
    {
        $ts = function_exists('current_time') ? current_time('timestamp') : time();
        $days = array('Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy');
        return $days[(int) date('w', $ts)] . ', ngày ' . date('j', $ts) . ' tháng ' . date('n', $ts) . ' năm ' . date('Y', $ts);
    }
}

if (!function_exists('icaviet_ds160_pdf_lines')) {
    // Tach text thanh cac dong da wrap theo be rong cot, do bang dung font se in.
    function icaviet_ds160_pdf_lines($pdf, $text, $width, $style, $size)
    {
        icaviet_ds160_pdf_set_font($pdf, $style, $size);
        $out = array();
        foreach (preg_split('/\r\n|\r|\n/', (string) $text) as $raw) {
            if (trim($raw) === '') {
                continue;
            }
            foreach (icaviet_ds160_pdf_wrap_by_width($pdf, $raw, $width) as $line) {
                $out[] = $line;
            }
        }
        return $out;
    }
}

if (!function_exists('icaviet_ds160_pdf_clean_label')) {
    function icaviet_ds160_pdf_clean_label($label)
    {
        $label = icaviet_ds160_pdf_normalize_one_line($label);
        // Gia tri ngay da doi sang dang chu nen bo goi y dinh dang khoi nhan.
        $label = preg_replace('/\s*\(\s*dd\/mm\/yyyy\s*\)/iu', '', $label);
        return rtrim($label, " \t:");
    }
}

if (!function_exists('icaviet_ds160_pdf_label_colon')) {
    // "Nhãn:" nhung khong them ":" sau cau hoi ("...chưa?").
    function icaviet_ds160_pdf_label_colon($label)
    {
        $label = icaviet_ds160_pdf_clean_label($label);
        return substr($label, -1) === '?' ? $label : $label . ':';
    }
}

if (!function_exists('icaviet_ds160_pdf_section')) {
    function icaviet_ds160_pdf_section($pdf, $title, $space_before = 5)
    {
        // Tieu de + du cho tieu de nhom va vai dong noi dung, tranh tieu de mo coi cuoi trang.
        icaviet_ds160_pdf_check_page($pdf, 45);
        if ($space_before > 0) {
            $pdf->Ln($space_before);
        }
        $title = mb_strtoupper(icaviet_ds160_pdf_normalize_one_line($title), 'UTF-8');
        icaviet_ds160_pdf_colors($pdf, 'navy');
        foreach (icaviet_ds160_pdf_lines($pdf, $title, 170, 'B', 14) as $line) {
            $pdf->SetX(20);
            $pdf->Cell(170, 7, $line, 0, 1, 'L');
        }
        $pdf->Ln(1.5);
        icaviet_ds160_pdf_colors($pdf, 'line');
        $pdf->SetLineWidth(0.2);
        $pdf->Line(20, $pdf->GetY(), 190, $pdf->GetY());
        $pdf->Ln(3);
    }
}

if (!function_exists('icaviet_ds160_pdf_subheading')) {
    // Tieu de nhom / tieu de bang - giong "Thông tin hôn phối hiện tại:" ben I-130.
    function icaviet_ds160_pdf_subheading($pdf, $text, $size = 10.5)
    {
        $text = icaviet_ds160_pdf_clean_label($text);
        if ($text === '') {
            return;
        }
        icaviet_ds160_pdf_check_page($pdf, 22);
        $pdf->Ln(1);
        icaviet_ds160_pdf_colors($pdf, 'navy');
        foreach (icaviet_ds160_pdf_lines($pdf, $text . ':', 170, 'B', $size) as $line) {
            $pdf->SetX(20);
            $pdf->Cell(170, 6, $line, 0, 1, 'L');
        }
        $pdf->Ln(1.5);
    }
}

if (!function_exists('icaviet_ds160_pdf_paragraph')) {
    function icaviet_ds160_pdf_paragraph($pdf, $text, $size = 10)
    {
        $lines = icaviet_ds160_pdf_lines($pdf, $text, 170, '', $size);
        icaviet_ds160_pdf_check_page($pdf, count($lines) * 6);
        icaviet_ds160_pdf_colors($pdf, 'text');
        foreach ($lines as $line) {
            $pdf->SetX(20);
            $pdf->Cell(170, 6, $line, 0, 1, 'L');
        }
        $pdf->Ln(2);
    }
}

if (!function_exists('icaviet_ds160_pdf_pair')) {
    /* ── 1 dong nhan/gia tri kieu I-130: nhan in dam navy rong 76mm, gia tri
       chu thuong mau xam bat dau o x=100. $pill = cau tra loi lua chon (radio). ── */
    function icaviet_ds160_pdf_pair($pdf, $label, $value, $pill = false, $show_empty = false)
    {
        $label = icaviet_ds160_pdf_label_colon($label);
        $value = trim(icaviet_ds160_pdf_fix_unicode((string) $value));
        if ($label === ':' || ($value === '' && !$show_empty)) {
            return;
        }

        $size = 9.5;
        $line_h = 5.4;
        $label_w = 76;
        $value_x = 100;
        $value_w = 90;

        $label_lines = icaviet_ds160_pdf_lines($pdf, $label, $label_w, 'B', $size);
        $value_lines = $value === '' ? array() : icaviet_ds160_pdf_lines($pdf, $value, $value_w, '', $size);
        // Pill chi dung cho gia tri ngan 1 dong; dai hon thi in nhu chu thuong.
        $pill = $pill && count($value_lines) === 1;
        $value_h = $pill ? 7 : count($value_lines) * $line_h;
        $h = max(count($label_lines) * $line_h, $value_h, $line_h);

        icaviet_ds160_pdf_check_page($pdf, min($h, 60) + 2);
        $y = $pdf->GetY();

        if ($pill) {
            icaviet_ds160_pdf_set_font($pdf, '', 9.2);
            $tw = min($value_w, max(16, $pdf->GetStringWidth($value_lines[0]) + 8));
            $pdf->SetFillColor(235, 238, 246);
            $pdf->Rect($value_x, $y - 0.8, $tw, 7, 'F');
            icaviet_ds160_pdf_colors($pdf, 'muted');
            $pdf->SetXY($value_x + 4, $y);
            $pdf->Cell($tw - 8, $line_h, $value_lines[0], 0, 0, 'L');
        }

        // Ve theo tung dong; gia tri rat dai (vd BỔ SUNG) duoc tran sang trang moi.
        $n = max(count($label_lines), $pill ? 1 : count($value_lines), 1);
        $row_y = $y;
        for ($i = 0; $i < $n; $i++) {
            if ($row_y + $line_h > icaviet_ds160_pdf_bottom_limit($pdf)) {
                $pdf->AddPage();
                $row_y = 16;
            }
            if (isset($label_lines[$i])) {
                icaviet_ds160_pdf_set_font($pdf, 'B', $size);
                icaviet_ds160_pdf_colors($pdf, 'navy');
                $pdf->SetXY(20, $row_y);
                $pdf->Cell($label_w, $line_h, $label_lines[$i], 0, 0, 'L');
            }
            if (!$pill && isset($value_lines[$i])) {
                icaviet_ds160_pdf_set_font($pdf, '', $size);
                icaviet_ds160_pdf_colors($pdf, 'muted');
                $pdf->SetXY($value_x, $row_y);
                $pdf->Cell($value_w, $line_h, $value_lines[$i], 0, 0, 'L');
            }
            $row_y += $line_h;
        }
        $end_y = max($row_y, $y + $value_h);
        $pdf->SetY($end_y + 2);
    }
}

if (!function_exists('icaviet_ds160_pdf_table_header')) {
    function icaviet_ds160_pdf_table_header($pdf, $columns, $widths)
    {
        $y = $pdf->GetY();
        $col_lines = array();
        $max = 1;
        foreach ($columns as $i => $col) {
            $col_lines[$i] = icaviet_ds160_pdf_lines($pdf, $col, $widths[$i] - 2, 'B', 8.4);
            $max = max($max, count($col_lines[$i]));
        }
        $h = max(8, $max * 3.6 + 2.6);

        $pdf->SetFillColor(241, 242, 251);
        icaviet_ds160_pdf_colors($pdf, 'line');
        icaviet_ds160_pdf_colors($pdf, 'navy');
        icaviet_ds160_pdf_set_font($pdf, 'B', 8.4);
        $x = 20;
        foreach ($columns as $i => $col) {
            $w = $widths[$i];
            $pdf->Rect($x, $y, $w, $h, 'DF');
            foreach ($col_lines[$i] as $j => $line) {
                $pdf->SetXY($x + 1, $y + 1.3 + $j * 3.6);
                $pdf->Cell($w - 2, 3.6, $line, 0, 0, 'C');
            }
            $x += $w;
        }
        $pdf->SetXY(20, $y + $h);
    }
}

if (!function_exists('icaviet_ds160_pdf_table')) {
    function icaviet_ds160_pdf_table($pdf, $columns, $rows, $widths)
    {
        if (empty($rows)) {
            return;
        }
        icaviet_ds160_pdf_check_page($pdf, 22);
        icaviet_ds160_pdf_table_header($pdf, $columns, $widths);

        $line_h = 4.5;
        foreach ($rows as $row) {
            $cell_lines = array();
            $max = 1;
            foreach ($columns as $i => $col) {
                $txt = isset($row[$i]) ? (string) $row[$i] : '';
                $cell_lines[$i] = $txt === '' ? array() : icaviet_ds160_pdf_lines($pdf, $txt, $widths[$i] - 3, '', 8.5);
                $max = max($max, count($cell_lines[$i]));
            }
            $h = max(8, $max * $line_h + 3);
            if ($pdf->GetY() + $h > icaviet_ds160_pdf_bottom_limit($pdf)) {
                $pdf->AddPage();
                $pdf->SetY(16);
                icaviet_ds160_pdf_table_header($pdf, $columns, $widths);
            }

            $y = $pdf->GetY();
            $x = 20;
            icaviet_ds160_pdf_colors($pdf, 'line');
            icaviet_ds160_pdf_colors($pdf, 'muted');
            icaviet_ds160_pdf_set_font($pdf, '', 8.5);
            foreach ($columns as $i => $col) {
                $w = $widths[$i];
                $pdf->Rect($x, $y, $w, $h, 'D');
                foreach ($cell_lines[$i] as $j => $line) {
                    $pdf->SetXY($x + 1.5, $y + 1.5 + $j * $line_h);
                    $pdf->Cell($w - 3, $line_h, $line, 0, 0, 'L');
                }
                $x += $w;
            }
            $pdf->SetXY(20, $y + $h);
        }
        $pdf->Ln(3);
    }
}

if (!function_exists('icaviet_ds160_pdf_item_value')) {
    function icaviet_ds160_pdf_item_value($item, $key)
    {
        if (!is_array($item) || !array_key_exists($key, $item)) {
            return '';
        }
        $v = $item[$key];
        if (!is_array($v) && icaviet_ds160_pdf_is_date_key($key)) {
            return icaviet_ds160_pdf_format_date(icaviet_ds160_pdf_fix_unicode(trim((string) $v)));
        }
        return icaviet_ds160_pdf_value($v);
    }
}

if (!function_exists('icaviet_ds160_pdf_cell')) {
    /* ── Gia tri 1 o bang tu nhieu key: moi phan tu cua $parts la 1 key, hoac
       mang key (gop bang ", " - dung cho dia chi). Key chuoi cua $parts la
       tien to ("Từ: "). Cac phan cach nhau bang xuong dong. ── */
    function icaviet_ds160_pdf_cell($item, $parts)
    {
        $out = array();
        foreach ($parts as $prefix => $part) {
            $keys = is_array($part) ? $part : array($part);
            $vals = array();
            foreach ($keys as $k) {
                $v = icaviet_ds160_pdf_item_value($item, $k);
                if ($v !== '' && !in_array($v, $vals, true)) {
                    $vals[] = $v;
                }
            }
            if (empty($vals)) {
                continue;
            }
            $out[] = (is_string($prefix) ? $prefix : '') . implode(', ', $vals);
        }
        return implode("\n", $out);
    }
}

if (!function_exists('icaviet_ds160_pdf_table_spec')) {
    /* ── Cot bang cho tung danh sach lap cua DS-160: array(tieu de, parts, rong).
       Tong be rong = 170mm. Danh sach nhieu thong tin (cong viec) gop vai
       field vao 1 o de khong mat du lieu ma bang van vua kho giay. ── */
    function icaviet_ds160_pdf_table_spec($name)
    {
        $address = function ($p) {
            return array($p . 'Street', $p . 'City', $p . 'Province', $p . 'Country');
        };
        $specs = array(
            'k1ChildrenList' => array(
                array('Họ tên con', array('childFullName'), 38),
                array('Ngày sinh', array('childBirthDate'), 30),
                array('Nơi sinh', array(array('childBirthCity', 'childBirthProvince', 'childBirthCountry')), 46),
                array('Hiện qua Mỹ cùng đương đơn', array('childTravelWithYou'), 28),
                array('Sau này qua Mỹ cùng đương đơn', array('childJoinLater'), 28),
            ),
            'companionDetails' => array(
                array('Họ', array('surname'), 50),
                array('Tên', array('givenName'), 60),
                array('Mối quan hệ', array('relationship'), 60),
            ),
            'socialMediaLinks' => array(
                array('Nền tảng', array('platform'), 45),
                array('Link mạng xã hội', array('link'), 125),
            ),
            'previousJobsList' => array(
                array('Nghề nghiệp / chức danh', array('occupationTitle'), 28),
                array('Công ty / địa chỉ', array('companyName', $address('companyAddress')), 44),
                array('Liên hệ', array('ĐT: ' => 'companyPhone', 'Quản lý: ' => 'managerName'), 32),
                array('Mô tả công việc', array('jobDescription', 'Lương: ' => 'monthlySalary'), 36),
                array('Thời gian', array('Từ: ' => 'employmentStartDate', 'Đến: ' => 'employmentEndDate'), 30),
            ),
            'schoolList' => array(
                array('Tên trường', array('name'), 38),
                array('Địa chỉ', array(array('street', 'city', 'province', 'country')), 50),
                array('Chuyên ngành', array('course'), 30),
                array('Từ', array('dateFrom'), 26),
                array('Đến', array('dateTo'), 26),
            ),
        );
        return isset($specs[$name]) ? $specs[$name] : null;
    }
}

if (!function_exists('icaviet_ds160_pdf_repeat_block')) {
    /* ── Danh sach lap (residence_period_table) -> bang kieu I-130. Field chua
       co cau hinh cot: tu sinh cot tu fields_template (toi da 6 cot), nhieu
       hon thi in tung muc thanh cac dong nhan/gia tri. ── */
    function icaviet_ds160_pdf_repeat_block($pdf, $field, $raw, $locale = 'vi', $group_title = '')
    {
        $items = array();
        if (is_array($raw)) {
            foreach ($raw as $item) {
                if (is_array($item) && icaviet_ds160_pdf_value($item) !== '') {
                    $items[] = $item;
                }
            }
        }
        if (empty($items)) {
            return;
        }

        $label = icaviet_ds160_pdf_label($field, $locale);
        if (icaviet_ds160_pdf_clean_label($label) !== icaviet_ds160_pdf_clean_label($group_title)) {
            icaviet_ds160_pdf_subheading($pdf, $label, 10);
        }

        $spec = icaviet_ds160_pdf_table_spec(isset($field['name']) ? (string) $field['name'] : '');
        if ($spec === null) {
            $spec = array();
            $tpl = !empty($field['fields_template']) && is_array($field['fields_template']) ? $field['fields_template'] : array();
            if (count($tpl) > 0 && count($tpl) <= 6) {
                $w = round(170 / count($tpl), 2);
                foreach ($tpl as $sub) {
                    if (!empty($sub['name'])) {
                        $spec[] = array(icaviet_ds160_pdf_label($sub, $locale), array((string) $sub['name']), $w);
                    }
                }
            }
        }

        if (!empty($spec)) {
            $columns = array();
            $widths = array();
            foreach ($spec as $col) {
                $columns[] = $col[0];
                $widths[] = $col[2];
            }
            $rows = array();
            foreach ($items as $item) {
                $row = array();
                foreach ($spec as $col) {
                    $row[] = icaviet_ds160_pdf_cell($item, $col[1]);
                }
                $rows[] = $row;
            }
            icaviet_ds160_pdf_table($pdf, $columns, $rows, $widths);
            return;
        }

        // Fallback: qua nhieu cot -> moi muc 1 khoi nhan/gia tri.
        foreach ($items as $idx => $item) {
            icaviet_ds160_pdf_subheading($pdf, 'Mục ' . ($idx + 1), 9.5);
            foreach ($field['fields_template'] as $sub) {
                if (empty($sub['name'])) {
                    continue;
                }
                icaviet_ds160_pdf_pair($pdf, icaviet_ds160_pdf_label($sub, $locale), icaviet_ds160_pdf_item_value($item, (string) $sub['name']));
            }
        }
    }
}

if (!function_exists('icaviet_ds160_pdf_get_signature_data')) {
    function icaviet_ds160_pdf_get_signature_data($data)
    {
        $possible_keys = array(
            'declarantSignature',
            '__signature',
            'signaturePng',
            'signatureData',
            'signature',
            'customerSignature',
        );

        foreach ($possible_keys as $key) {
            if (!isset($data[$key])) {
                continue;
            }
            $sig = trim((string) $data[$key]);
            if ($sig !== '' && strpos($sig, 'data:image/') === 0) {
                return $sig;
            }
        }

        // Truong hop data submit bi boc trong form_data.
        if (!empty($data['form_data']) && is_array($data['form_data'])) {
            foreach ($possible_keys as $key) {
                if (!isset($data['form_data'][$key])) {
                    continue;
                }
                $sig = trim((string) $data['form_data'][$key]);
                if ($sig !== '' && strpos($sig, 'data:image/') === 0) {
                    return $sig;
                }
            }
        }

        return '';
    }
}

if (!function_exists('icaviet_ds160_pdf_signature')) {
    function icaviet_ds160_pdf_signature($pdf, $data, $x = 128, $width = 48)
    {
        // Quan trong: lay RAW data, khong dung icaviet_ds160_pdf_get()
        // vi ham get/value se doi base64 thanh chu "[Da dinh kem]".
        $sig = icaviet_ds160_pdf_get_signature_data($data);
        if ($sig === '') {
            return false;
        }

        $raw = preg_replace('#^data:image/[^;]+;base64,#', '', $sig);
        $img = base64_decode($raw);
        if (!$img) {
            return false;
        }

        $upload = wp_upload_dir();
        $dir = trailingslashit($upload['basedir']) . 'ICAVIET-temp/';
        if (!is_dir($dir)) {
            wp_mkdir_p($dir);
        }

        $file = $dir . 'ds160-signature-' . md5($sig . microtime(true)) . '.png';
        file_put_contents($file, $img);

        if (!file_exists($file)) {
            return false;
        }

        icaviet_ds160_pdf_check_page($pdf, 24);
        $y = $pdf->GetY();
        $pdf->Image($file, $x, $y, $width);
        $pdf->Ln(22);
        @unlink($file);
        return true;
    }
}

if (!function_exists('icaviet_ds160_pdf_commitment')) {
    /* ── Cam ket + ten nguoi dien don + chu ky, bo cuc giong cuoi PDF I-130:
       nhan ben trai, anh chu ky (hoac duong ke de ky tay) ben phai. ── */
    function icaviet_ds160_pdf_commitment($pdf, $data)
    {
        // Cam ket + ten + chu ky (~45mm) khong bi tach trang.
        icaviet_ds160_pdf_check_page($pdf, 48);
        icaviet_ds160_pdf_paragraph($pdf, 'Tôi xin cam kết tất cả những thông tin trên là đúng sự thật. Tôi hoàn toàn chịu trách nhiệm về nội dung lời khai của mình.');

        $name = icaviet_ds160_pdf_get($data, 'declarantFullName');
        if ($name === '') {
            $name = icaviet_ds160_pdf_get($data, 'fullName');
        }
        icaviet_ds160_pdf_pair($pdf, 'Họ và tên người điền đơn', $name, false, true);

        icaviet_ds160_pdf_check_page($pdf, 24);
        $y = $pdf->GetY();
        icaviet_ds160_pdf_colors($pdf, 'navy');
        foreach (icaviet_ds160_pdf_lines($pdf, 'Chữ ký xác nhận của người điền đơn:', 76, 'B', 9.5) as $i => $line) {
            $pdf->SetXY(20, $y + $i * 5.4);
            $pdf->Cell(76, 5.4, $line, 0, 0, 'L');
        }
        $pdf->SetY($y);
        if (!icaviet_ds160_pdf_signature($pdf, $data, 100, 45)) {
            icaviet_ds160_pdf_colors($pdf, 'line');
            $pdf->Line(100, $y + 16, 190, $y + 16);
            $pdf->SetY($y + 20);
        }
    }
}

// Mot so submission luu nguyen payload Vue { language, declarantFullName, form_data: {...} }
// ma khong duoc go form_data ra -> moi field deu rong. Go ra giong handler (top-level ghi de).
if (!empty($data['form_data']) && is_array($data['form_data'])) {
    $icaviet_ds160_form_data = $data['form_data'];
    unset($data['form_data']);
    $data = array_merge($icaviet_ds160_form_data, $data);
}

$locale = !empty($data['language']) && in_array($data['language'], array('vi', 'en'), true) ? $data['language'] : 'vi';
$schema_path = dirname(__FILE__) . '/schema.json';
$schema = array();
if (file_exists($schema_path)) {
    $json = file_get_contents($schema_path);
    if (is_string($json)) {
        $json = preg_replace('/^\xEF\xBB\xBF/', '', $json);
    }
    $decoded = json_decode($json, true);
    if (is_array($decoded)) {
        $schema = $decoded;
    }
}

$icaviet_ds160_pdf_font_family = icaviet_ds160_pdf_register_body_font($pdf);

$pdf->SetMargins(20, 16, 20);
$pdf->SetAutoPageBreak(true, 20);
icaviet_ds160_pdf_colors($pdf, 'text');

// Header giong I-130: ngay tao + tieu de lon + muc dich dien don.
icaviet_ds160_pdf_colors($pdf, 'muted');
icaviet_ds160_pdf_set_font($pdf, '', 8.5);
$pdf->Cell(0, 5, icaviet_ds160_pdf_today(), 0, 1, 'L');
$pdf->Ln(2);

icaviet_ds160_pdf_colors($pdf, 'navy');
icaviet_ds160_pdf_set_font($pdf, 'B', 17);
$pdf->Cell(0, 8, 'THÔNG TIN DS-160 TIẾNG VIỆT', 0, 1, 'C');
$pdf->Ln(3);

$purpose = icaviet_ds160_pdf_get($data, 'purposeApp');
if ($purpose !== '') {
    icaviet_ds160_pdf_colors($pdf, 'text');
    icaviet_ds160_pdf_set_font($pdf, '', 10.5);
    $pdf->Write(6, 'Mục đích điền đơn: ');
    icaviet_ds160_pdf_set_font($pdf, 'B', 10.5);
    $pdf->Write(6, $purpose);
    $pdf->Ln(10);
}

$printed = array(
    '_id' => true,
    'language' => true,
    'submitted_at' => true,
    'form_data' => true,
    'customer_name' => true,
    'customer_email' => true,
    'customer_phone' => true,
    'declarantSignature' => true,
    '__signature' => true,
    'signaturePng' => true,
    'signatureData' => true,
    'declarationCommitment' => true,
    'declarantFullName' => true,
    'purposeApp' => true,
);

if (!function_exists('icaviet_ds160_pdf_field_display')) {
    /* ── Chuan bi 1 field de in: tra ve null neu khong co gi de in (an nhu
       I-130), nguoc lai array('kind' => pair|name|table, ...). ── */
    function icaviet_ds160_pdf_field_display($field, $data)
    {
        $name = (string) $field['name'];
        $raw = icaviet_ds160_pdf_get_raw($data, $name, '');

        if (!empty($field['fields_template'])) {
            return icaviet_ds160_pdf_value($raw) === '' ? null : array('kind' => 'table', 'raw' => $raw);
        }
        if (!is_array($raw) && icaviet_ds160_pdf_is_person_name_field($name)) {
            $parts = icaviet_ds160_pdf_split_full_name(icaviet_ds160_pdf_fix_unicode($raw));
            return implode('', $parts) === '' ? null : array('kind' => 'name', 'parts' => $parts);
        }
        if (!is_array($raw) && icaviet_ds160_pdf_is_date_field($field)) {
            $value = icaviet_ds160_pdf_format_date(icaviet_ds160_pdf_fix_unicode($raw));
        } else {
            $value = icaviet_ds160_pdf_value($raw);
        }
        if ($value === '') {
            return null;
        }
        $type = isset($field['type']) ? (string) $field['type'] : '';
        return array('kind' => 'pair', 'value' => $value, 'pill' => in_array($type, array('radio', 'select'), true));
    }
}

$icaviet_ds160_signed = false;
$icaviet_ds160_first_section = true;

if (!empty($schema['sections']) && is_array($schema['sections'])) {
    foreach ($schema['sections'] as $section) {
        $section_rows = array();
        $has_signature_block = false;
        if (!empty($section['groups']) && is_array($section['groups'])) {
            foreach ($section['groups'] as $group) {
                if (empty($group['fields']) || !is_array($group['fields'])) {
                    continue;
                }
                $group_rows = array();
                foreach ($group['fields'] as $field) {
                    if (empty($field['name'])) {
                        continue;
                    }
                    $name = (string) $field['name'];
                    if ($name === 'declarantFullName' || (isset($field['type']) && $field['type'] === 'signature')) {
                        $has_signature_block = true;
                    }
                    if (isset($printed[$name])) {
                        continue;
                    }
                    if (!icaviet_ds160_pdf_show_field($field, $data)) {
                        continue;
                    }
                    if (!empty($field['type']) && in_array($field['type'], array('info', 'signature'), true)) {
                        continue;
                    }
                    $printed[$name] = true;
                    $display = icaviet_ds160_pdf_field_display($field, $data);
                    if ($display !== null) {
                        $group_rows[] = array('field' => $field, 'display' => $display);
                    }
                }
                if (!empty($group_rows)) {
                    $section_rows[] = array('group' => $group, 'rows' => $group_rows);
                }
            }
        }

        if (empty($section_rows) && !$has_signature_block) {
            continue;
        }

        $section_title = icaviet_ds160_pdf_section_title($section, $locale);
        if (empty($section_rows)) {
            // Phan chi co khoi ky ten: giu tieu de + cam ket + chu ky tren cung 1 trang.
            icaviet_ds160_pdf_check_page($pdf, 75);
        }
        icaviet_ds160_pdf_section($pdf, $section_title, $icaviet_ds160_first_section ? 2 : 5);
        $icaviet_ds160_first_section = false;

        foreach ($section_rows as $block) {
            $group_title = icaviet_ds160_pdf_group_title($block['group'], $locale);
            // Nhom trung ten voi phan (vd "Thông tin hôn nhân trước đây") thi khong in lai.
            if (icaviet_ds160_pdf_clean_label($group_title) !== icaviet_ds160_pdf_clean_label($section_title)) {
                icaviet_ds160_pdf_subheading($pdf, $group_title);
            }
            foreach ($block['rows'] as $row) {
                $field = $row['field'];
                $display = $row['display'];
                $label = icaviet_ds160_pdf_label($field, $locale);

                if ($display['kind'] === 'table') {
                    icaviet_ds160_pdf_repeat_block($pdf, $field, $display['raw'], $locale, $group_title);
                } elseif ($display['kind'] === 'name') {
                    // Tach Ho / Ten lot / Ten thanh tung dong nhu I-130.
                    $base = icaviet_ds160_pdf_clean_label($label);
                    $plain = in_array(mb_strtolower($base, 'UTF-8'), array('họ và tên', 'họ tên'), true);
                    list($ho, $ten_lot, $ten) = $display['parts'];
                    icaviet_ds160_pdf_pair($pdf, $plain ? 'Họ' : 'Họ (' . $base . ')', $ho);
                    icaviet_ds160_pdf_pair($pdf, $plain ? 'Tên lót' : 'Tên lót (' . $base . ')', $ten_lot);
                    icaviet_ds160_pdf_pair($pdf, $plain ? 'Tên' : 'Tên (' . $base . ')', $ten);
                } else {
                    icaviet_ds160_pdf_pair($pdf, $label, $display['value'], $display['pill']);
                }
            }
        }

        if ($has_signature_block && !$icaviet_ds160_signed) {
            $pdf->Ln(2);
            icaviet_ds160_pdf_commitment($pdf, $data);
            $icaviet_ds160_signed = true;
        }
    }
}

// Neu data co field ngoai schema, in them o cuoi de khong mat thong tin.
$extra_rows = array();
foreach ($data as $key => $value) {
    if (isset($printed[$key])) {
        continue;
    }
    $clean = icaviet_ds160_pdf_value($value);
    if ($clean === '') {
        continue;
    }
    $extra_rows[$key] = $clean;
}
if (!empty($extra_rows)) {
    icaviet_ds160_pdf_section($pdf, 'Thông tin khác');
    foreach ($extra_rows as $key => $value) {
        icaviet_ds160_pdf_pair($pdf, $key, $value);
    }
}

// additionalInfo da nam trong schema (Phan 6) - chi in rieng khi schema thieu field nay.
if (!isset($printed['additionalInfo'])) {
    $icaviet_ds160_more = icaviet_ds160_pdf_get($data, 'additionalInfo');
    if ($icaviet_ds160_more !== '') {
        icaviet_ds160_pdf_section($pdf, 'Bổ sung');
        icaviet_ds160_pdf_pair($pdf, 'Bổ sung', $icaviet_ds160_more);
    }
}

if (!$icaviet_ds160_signed) {
    icaviet_ds160_pdf_section($pdf, 'Cam kết và ký tên');
    icaviet_ds160_pdf_commitment($pdf, $data);
}

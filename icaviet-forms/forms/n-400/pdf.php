<?php
/**
 * PDF template cho form N-400 - Thong Tin Nhap Tich My
 * Bien co san: $pdf (ICAVIET_FPDF), $data (array)
 *
 * Form N-400 hien tai duoc nhap qua Vue app render dong tu schema.json
 * (xem forms/n-400/schema.json + vue-app/src/pages/N400Form.vue). Du lieu
 * gui len nam trong $data['form_data'] va duoc merge vao $data o tang
 * ICAVIET_Handler::process(), nen moi field trong schema deu co the doc
 * truc tiep bang $data[$field['name']]. Template nay render lai dung theo
 * cau truc schema (section > group > field) de dam bao khong thieu thong
 * tin nguoi dung da nhap, thay vi doc mot danh sach key VI co dinh.
 */
if (!defined('ABSPATH')) exit;

if (!function_exists('n400_txt')) {

    function n400_txt($v) {
        if (is_array($v)) return '';
        return trim((string) $v);
    }

    function n400_localized($obj) {
        if (is_array($obj)) {
            if (isset($obj['vi']) && $obj['vi'] !== '') return (string) $obj['vi'];
            if (isset($obj['en'])) return (string) $obj['en'];
            return '';
        }
        return (string) $obj;
    }

    function n400_option_label($field, $raw) {
        $raw = n400_txt($raw);
        if ($raw === '') return '';
        if (!empty($field['options']) && is_array($field['options'])) {
            foreach ($field['options'] as $opt) {
                if (isset($opt['value']) && (string) $opt['value'] === $raw) {
                    return n400_localized(isset($opt['label']) ? $opt['label'] : $raw);
                }
            }
        }
        return $raw;
    }

    /* ── DateSelect.vue luu ngay theo DD/MM/YYYY (hoac MM/YYYY, YYYY neu khach
       khong nho day du). Doi ve dang chu "Ngày D tháng M năm Y" khi in PDF,
       dong bo voi bao-lanh/ndbl/N-600 - nen nhan khong con can hint
       "(mm/dd/yyyy)" nua. ── */
    function n400_field_label($field) {
        $label = n400_localized(isset($field['label']) ? $field['label'] : (isset($field['name']) ? $field['name'] : ''));
        if ((isset($field['type']) ? $field['type'] : '') === 'date') {
            $label = trim((string) preg_replace('/\s*\(?\s*(?:mm|dd)\s*\/\s*(?:mm|dd)\s*\/\s*yyyy\s*\)?\s*:?/i', '', $label));
        }
        return $label;
    }

    /* ── DD/MM/YYYY (dinh dang DateSelect.vue luu) -> "Ngày D tháng M năm Y".
       MM/YYYY -> "Tháng M năm Y", YYYY -> "Năm Y" (truong hop khach chi nho
       thang/nam hoac chi nho nam). ── */
    function n400_format_date_value($raw) {
        $raw = n400_txt($raw);
        if ($raw === '') return '';
        if (preg_match('/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/', $raw, $m)) {
            return 'Ngày ' . intval($m[1]) . ' tháng ' . intval($m[2]) . ' năm ' . intval($m[3]);
        }
        if (preg_match('/^(\d{1,2})\/(\d{4})$/', $raw, $m)) {
            return 'Tháng ' . intval($m[1]) . ' năm ' . intval($m[2]);
        }
        if (preg_match('/^(\d{4})$/', $raw, $m)) {
            return 'Năm ' . intval($m[1]);
        }
        return $raw;
    }

    function n400_field_display_value($field, $data) {
        $fname = isset($field['name']) ? $field['name'] : '';
        if ($fname === '') return '';
        $raw = isset($data[$fname]) ? $data[$fname] : '';
        if (is_array($raw)) return '';
        if ((isset($field['type']) ? $field['type'] : '') === 'radio') {
            return n400_option_label($field, $raw);
        }
        return n400_txt($raw);
    }

    /* ── Kiem tra field/group/section co du lieu de hien thi khong ── */
    function n400_field_has_value($field, $data) {
        $ftype = isset($field['type']) ? $field['type'] : 'text';
        $fname = isset($field['name']) ? $field['name'] : '';
        if ($fname === '' || $ftype === 'info' || $ftype === 'signature') return false;

        if (in_array($ftype, array('address_history', 'work_history', 'education_history', 'travel_history', 'offense_history'), true)) {
            $items = isset($data[$fname]) ? $data[$fname] : array();
            if (!is_array($items)) return n400_txt($items) !== '';
            foreach ($items as $item) {
                if (is_array($item)) {
                    foreach ($item as $v) {
                        if (!is_array($v) && n400_txt($v) !== '') return true;
                    }
                } elseif (n400_txt($item) !== '') {
                    return true;
                }
            }
            return false;
        }

        if ($ftype === 'children_info') {
            $items = isset($data[$fname]) ? $data[$fname] : array();
            if (!is_array($items)) return false;
            foreach ($items as $child) {
                if (!is_array($child)) continue;
                foreach ($child as $v) {
                    if (!is_array($v) && n400_txt($v) !== '') return true;
                }
            }
            return false;
        }

        if ($ftype === 'text_repeater') {
            $items = isset($data[$fname]) ? $data[$fname] : array();
            if (is_array($items)) {
                foreach ($items as $v) {
                    if (n400_txt($v) !== '') return true;
                }
                return false;
            }
            return n400_txt($items) !== '';
        }

        if ($fname === 'birth_province' && n400_txt(isset($data['birth_city']) ? $data['birth_city'] : '') !== '') return true;
        if ($fname === 'mailing_address' && n400_txt(isset($data['mailing_same_as_current']) ? $data['mailing_same_as_current'] : '') === 'yes') return true;

        $v = isset($data[$fname]) ? $data[$fname] : '';
        return !is_array($v) && n400_txt($v) !== '';
    }

    function n400_group_has_data($group, $data) {
        foreach ((isset($group['fields']) && is_array($group['fields'])) ? $group['fields'] : array() as $field) {
            if (n400_field_has_value($field, $data)) return true;
        }
        return false;
    }

    function n400_section_has_data($section, $data) {
        foreach ((isset($section['groups']) && is_array($section['groups'])) ? $section['groups'] : array() as $group) {
            if (n400_group_has_data($group, $data)) return true;
        }
        return false;
    }

    /* ── Layout helpers ── */
    function n400_upper($s) {
        return function_exists('mb_strtoupper') ? mb_strtoupper($s, 'UTF-8') : strtoupper($s);
    }

    function n400_ensure_space($pdf, $needed) {
        if ($pdf->GetY() + $needed > $pdf->GetPageHeight() - 25) {
            $pdf->AddPage();
        }
    }

    function n400_section($pdf, $title) {
        if (trim((string) $title) === '') return;
        n400_ensure_space($pdf, 22);
        $pdf->Ln(4);
        $pdf->SetX(20);
        $pdf->SetTextColor(20, 38, 75);
        $pdf->SetFont('DejaVu', 'B', 13);
        $pdf->MultiCell(0, 7, n400_upper($title), 0, 'L');
        $pdf->SetDrawColor(230, 232, 240);
        $pdf->Line(20, $pdf->GetY() + 1, 190, $pdf->GetY() + 1);
        $pdf->SetTextColor(0, 0, 0);
        $pdf->SetX(20);
        $pdf->Ln(3);
    }

    /* ── Mot so nhom duoc yeu cau to sang mau nhan dien #e22437 thay vi mau xam mac dinh ── */
    function n400_group_is_highlighted($title) {
        static $set = null;
        if ($set === null) {
            $set = array_flip(array_map('n400_upper', array(
                'Tên hợp pháp',
                'Thông tin ngày tháng năm sinh & nơi sinh',
                'Thông tin sinh trắc',
                'Địa chỉ',
                'Liên hệ',
                'Thông tin di trú',
                'Địa chỉ ở trong 5 năm qua',
                'Công việc trong 5 năm qua',
                'Thông tin quốc tịch của cha mẹ',
                'Tình trạng hôn nhân hiện tại',
                'Tổng quan về con',
                'Thông tin từng con',
                'Thông tin những lần ra khỏi Mỹ',
            )));
        }
        $norm = n400_upper(rtrim(trim((string) $title), ':'));
        return isset($set[$norm]);
    }

    function n400_group($pdf, $title) {
        if (trim((string) $title) === '') return;
        n400_ensure_space($pdf, 10);
        $highlighted = n400_group_is_highlighted($title);
        $pdf->SetFont('DejaVu', 'B', $highlighted ? 10.5 : 9);
        if ($highlighted) {
            $pdf->SetTextColor(226, 36, 55);
        } else {
            $pdf->SetTextColor(100, 116, 139);
        }
        $label = n400_upper($title);
        $y = $pdf->GetY();
        $pdf->SetX(20);
        $tw = $pdf->GetStringWidth($label) + 2;
        $pdf->Cell($tw, 6, $label, 0, 0);
        $pdf->SetDrawColor(226, 232, 240);
        $pdf->Line(20 + $tw + 2, $y + 4, 190, $y + 4);
        $pdf->SetTextColor(0, 0, 0);
        $pdf->Ln(8);
        $pdf->SetX(20);
    }

    function n400_row($pdf, $label, $value, $indent = 0) {
        $value = n400_txt($value);
        if ($value === '') return;
        n400_ensure_space($pdf, 14);
        $x0 = 20 + $indent;
        $pdf->SetX($x0);
        $pdf->SetFont('DejaVu', 'B', 9);
        $pdf->SetTextColor(37, 99, 235);
        $pdf->MultiCell(0, 5, $label, 0, 'L');
        $pdf->SetX($x0 + 4);
        $pdf->SetFont('DejaVu', '', 9.5);
        $pdf->SetTextColor(15, 23, 42);
        $pdf->MultiCell(0, 5.4, $value, 0, 'L');
        $pdf->SetTextColor(0, 0, 0);
        $y = $pdf->GetY();
        $pdf->SetDrawColor(243, 244, 246);
        $pdf->Line($x0, $y + 1, 190, $y + 1);
        $pdf->SetY($y + 2.6);
        $pdf->SetX(20);
    }

    /* ── Ghep 2 field ngan (gioi tinh, chieu cao, mau mat, ngay sinh...) tren
       cung 1 dong de khong bo trong ben phai trang khi tung dong day chi co
       vai chu. ── */
    function n400_str_len($s) {
        return function_exists('mb_strlen') ? mb_strlen($s, 'UTF-8') : strlen($s);
    }

    function n400_is_short($label, $value) {
        return n400_str_len($label) <= 45 && n400_str_len($value) <= 30;
    }

    function n400_row_pair($pdf, $labelA, $valueA, $labelB, $valueB) {
        n400_ensure_space($pdf, 14);
        $x0 = 20;
        $colW = 83;
        $gap = 4;
        $y0 = $pdf->GetY();

        $pdf->SetXY($x0, $y0);
        $pdf->SetFont('DejaVu', 'B', 9);
        $pdf->SetTextColor(37, 99, 235);
        $pdf->MultiCell($colW, 5, $labelA, 0, 'L');
        $pdf->SetXY($x0, $pdf->GetY());
        $pdf->SetFont('DejaVu', '', 9.5);
        $pdf->SetTextColor(15, 23, 42);
        $pdf->MultiCell($colW, 5.4, $valueA, 0, 'L');
        $yA = $pdf->GetY();

        $x1 = $x0 + $colW + $gap;
        $pdf->SetXY($x1, $y0);
        $pdf->SetFont('DejaVu', 'B', 9);
        $pdf->SetTextColor(37, 99, 235);
        $pdf->MultiCell($colW, 5, $labelB, 0, 'L');
        $pdf->SetXY($x1, $pdf->GetY());
        $pdf->SetFont('DejaVu', '', 9.5);
        $pdf->SetTextColor(15, 23, 42);
        $pdf->MultiCell($colW, 5.4, $valueB, 0, 'L');
        $yB = $pdf->GetY();

        $pdf->SetTextColor(0, 0, 0);
        $yEnd = max($yA, $yB);
        $pdf->SetDrawColor(243, 244, 246);
        $pdf->Line($x0, $yEnd + 1, 190, $yEnd + 1);
        $pdf->SetY($yEnd + 2.6);
        $pdf->SetX(20);
    }

    /* Tra ve array(label, value) neu day la field "don gian" co the ghep cap;
       tra ve null neu la field dang mang/dac biet (da co renderer rieng). */
    function n400_field_row_data($field, $data) {
        $ftype = isset($field['type']) ? $field['type'] : 'text';
        $fname = isset($field['name']) ? $field['name'] : '';
        if ($fname === '' || $ftype === 'info' || $ftype === 'signature') return null;
        if (in_array($ftype, array('address_history', 'work_history', 'education_history', 'travel_history', 'offense_history', 'children_info', 'text_repeater'), true)) return null;
        if ($fname === 'birth_province' || $fname === 'mailing_address') return null;

        $label = n400_field_label($field);
        $value = n400_field_display_value($field, $data);
        if ($ftype === 'date') {
            $value = n400_format_date_value($value);
        }
        return array($label, $value);
    }

    function n400_entry_heading($pdf, $text) {
        n400_ensure_space($pdf, 10);
        $pdf->SetX(20);
        $pdf->SetFont('DejaVu', 'B', 10.5);
        $pdf->SetTextColor(37, 99, 235);
        $pdf->Cell(0, 6, $text, 0, 1);
        $pdf->SetTextColor(0, 0, 0);
    }

    /* ── Repeatable entries (dia chi / cong viec / hoc van / xuat canh / tien an) ── */
    function n400_render_entries($pdf, $items, $labelPrefix, $fieldsMap) {
        if (!is_array($items)) return;
        $n = 0;
        foreach ($items as $item) {
            if (!is_array($item)) continue;
            $hasValue = false;
            foreach ($fieldsMap as $fm) {
                if (n400_txt(isset($item[$fm[0]]) ? $item[$fm[0]] : '') !== '') { $hasValue = true; break; }
            }
            if (!$hasValue) continue;
            $n++;
            n400_entry_heading($pdf, $labelPrefix . ' ' . $n);
            foreach ($fieldsMap as $fm) {
                $v = n400_txt(isset($item[$fm[0]]) ? $item[$fm[0]] : '');
                if (!empty($fm[2])) {
                    $v = n400_format_date_value($v);
                }
                n400_row($pdf, $fm[1], $v, 4);
            }
        }
    }

    function n400_children_label($key, $type) {
        $maps = array(
            'relationship' => array('biological' => 'Con ruột', 'step' => 'Con riêng', 'adopted' => 'Con nuôi', 'other' => 'Khác'),
            'living'       => array('with_me' => 'Sống cùng tôi', 'not_with_me' => 'Không sống cùng tôi', 'unknown_missing' => 'Không biết/thất lạc'),
            'support'      => array('yes' => 'Có', 'no' => 'Không'),
        );
        $key = n400_txt($key);
        if ($key === '') return '';
        return isset($maps[$type][$key]) ? $maps[$type][$key] : $key;
    }

    function n400_render_children($pdf, $items) {
        if (!is_array($items)) return;
        $n = 0;
        foreach ($items as $child) {
            if (!is_array($child)) continue;
            $childLast = n400_txt(isset($child['lastName']) ? $child['lastName'] : '');
            $childMiddle = n400_txt(isset($child['middleName']) ? $child['middleName'] : '');
            $childFirst = n400_txt(isset($child['firstName']) ? $child['firstName'] : '');
            $name = trim($childLast . ' ' . $childMiddle . ' ' . $childFirst);
            $hasValue = $name !== ''
                || n400_txt(isset($child['birthDate']) ? $child['birthDate'] : '') !== ''
                || n400_txt(isset($child['relationship']) ? $child['relationship'] : '') !== ''
                || n400_txt(isset($child['childLivingLocation']) ? $child['childLivingLocation'] : '') !== ''
                || n400_txt(isset($child['providingSupport']) ? $child['providingSupport'] : '') !== '';
            if (!$hasValue) continue;
            $n++;
            $heading = ($n === 1 ? 'Con đầu' : 'Con thứ ' . $n) . ($name !== '' ? ': ' . $name : '');
            n400_entry_heading($pdf, $heading);
            if ($name !== '') n400_row($pdf, 'Họ và tên', n400_name_multiline($childLast, $childMiddle, $childFirst), 4);
            n400_row($pdf, 'Ngày sinh', n400_format_date_value(isset($child['birthDate']) ? $child['birthDate'] : ''), 4);
            n400_row($pdf, 'Mối quan hệ', n400_children_label(isset($child['relationship']) ? $child['relationship'] : '', 'relationship'), 4);
            n400_row($pdf, 'Con đang sống ở đâu', n400_children_label(isset($child['childLivingLocation']) ? $child['childLivingLocation'] : '', 'living'), 4);
            n400_row($pdf, 'Đang chu cấp/hỗ trợ cho con', n400_children_label(isset($child['providingSupport']) ? $child['providingSupport'] : '', 'support'), 4);
        }
    }

    function n400_render_list_row($pdf, $label, $items) {
        if (is_array($items)) {
            $vals = array();
            foreach ($items as $v) {
                $v = n400_txt($v);
                if ($v !== '') $vals[] = $v;
            }
            if (empty($vals)) return;
            n400_row($pdf, $label, implode(', ', $vals));
            return;
        }
        n400_row($pdf, $label, n400_txt($items));
    }

    /* ── Bang cho dia chi 5 nam / cong viec 5 nam (de nhin hon dang the) ── */
    function n400_wrap_text($pdf, $text, $width) {
        $text = trim((string) $text);
        if ($text === '') return array('');
        $words = preg_split('/\s+/u', $text, -1, PREG_SPLIT_NO_EMPTY);
        if (empty($words)) return array('');
        $lines = array();
        $current = '';
        foreach ($words as $word) {
            $test = $current === '' ? $word : $current . ' ' . $word;
            if ($current !== '' && $pdf->GetStringWidth($test) > $width) {
                $lines[] = $current;
                $current = $word;
            } else {
                $current = $test;
            }
        }
        if ($current !== '') $lines[] = $current;
        return empty($lines) ? array('') : $lines;
    }

    function n400_render_table($pdf, $items, $columns) {
        if (!is_array($items)) return;
        $rows = array();
        foreach ($items as $item) {
            if (!is_array($item)) continue;
            $hasValue = false;
            foreach ($columns as $col) {
                if (n400_txt(isset($item[$col[0]]) ? $item[$col[0]] : '') !== '') { $hasValue = true; break; }
            }
            if ($hasValue) $rows[] = $item;
        }
        if (empty($rows)) return;

        $lineH = 4.6;
        $padX = 2;
        $padY = 1.6;

        n400_ensure_space($pdf, 14);
        $pdf->SetFont('DejaVu', 'B', 8.5);
        $pdf->SetFillColor(239, 246, 255);
        $pdf->SetTextColor(30, 64, 175);
        $pdf->SetDrawColor(191, 219, 254);
        $pdf->SetX(20);
        foreach ($columns as $col) {
            $pdf->Cell($col[2], 7, $col[1], 1, 0, 'L', true);
        }
        $pdf->Ln();
        $pdf->SetTextColor(15, 23, 42);
        $pdf->SetFont('DejaVu', '', 8.5);

        $fillOn = false;
        foreach ($rows as $item) {
            $wrapped = array();
            $maxLines = 1;
            foreach ($columns as $col) {
                $txt = n400_txt(isset($item[$col[0]]) ? $item[$col[0]] : '');
                if (!empty($col[3])) {
                    $txt = n400_format_date_value($txt);
                }
                $lines = n400_wrap_text($pdf, $txt, $col[2] - 2 * $padX);
                $wrapped[] = $lines;
                $maxLines = max($maxLines, count($lines));
            }
            $rowH = $maxLines * $lineH + 2 * $padY;

            n400_ensure_space($pdf, $rowH + 6);

            $x0 = 20;
            $y0 = $pdf->GetY();
            if ($fillOn) {
                $pdf->SetFillColor(248, 250, 252);
                $pdf->Rect($x0, $y0, 170, $rowH, 'F');
            }
            $pdf->SetDrawColor(226, 232, 240);
            $x = $x0;
            foreach ($columns as $idx => $col) {
                $pdf->Rect($x, $y0, $col[2], $rowH, 'D');
                $ly = $y0 + $padY;
                foreach ($wrapped[$idx] as $line) {
                    $pdf->SetXY($x + $padX, $ly);
                    $pdf->Cell($col[2] - 2 * $padX, $lineH, $line, 0, 0);
                    $ly += $lineH;
                }
                $x += $col[2];
            }
            $pdf->SetXY($x0, $y0 + $rowH);
            $fillOn = !$fillOn;
        }
        $pdf->Ln(3);
    }

    /* ── Gom nhom 3 truong Ten/Ho/Ten lot thanh 1 dong "Ho va ten" ── */
    function n400_field_label_vi($field) {
        return n400_localized(isset($field['label']) ? $field['label'] : '');
    }

    function n400_is_name_triplet($f1, $f2, $f3) {
        $t1 = isset($f1['type']) ? $f1['type'] : 'text';
        $t2 = isset($f2['type']) ? $f2['type'] : 'text';
        $t3 = isset($f3['type']) ? $f3['type'] : 'text';
        return $t1 === 'text' && $t2 === 'text' && $t3 === 'text'
            && n400_field_label_vi($f1) === 'Tên'
            && n400_field_label_vi($f2) === 'Họ'
            && n400_field_label_vi($f3) === 'Tên lót';
    }

    /* Gop Ho/Ten lot/Ten thanh 1 gia tri nhieu dong (moi phan 1 dong) de in
       trong 1 khoi label/value duy nhat thay vi gop thanh 1 dong lien tuc
       (kho phan biet ranh gioi giua Ho/Ten lot/Ten khi co nhieu tu). */
    function n400_name_multiline($ho, $ten_lot, $ten) {
        $lines = array();
        if ($ho !== '') $lines[] = 'Họ: ' . $ho;
        if ($ten_lot !== '') $lines[] = 'Tên lót: ' . $ten_lot;
        if ($ten !== '') $lines[] = 'Tên: ' . $ten;
        return implode("\n", $lines);
    }

    function n400_render_name_triplet($pdf, $tenField, $hoField, $lotField, $data) {
        $tenName = isset($tenField['name']) ? $tenField['name'] : '';
        $hoName  = isset($hoField['name']) ? $hoField['name'] : '';
        $lotName = isset($lotField['name']) ? $lotField['name'] : '';
        $ten = n400_txt($tenName !== '' && isset($data[$tenName]) ? $data[$tenName] : '');
        $ho  = n400_txt($hoName !== '' && isset($data[$hoName]) ? $data[$hoName] : '');
        $lot = n400_txt($lotName !== '' && isset($data[$lotName]) ? $data[$lotName] : '');
        n400_row($pdf, 'Họ và tên', n400_name_multiline($ho, $lot, $ten));
    }

    /* ── Render 1 field theo dinh nghia trong schema ── */
    function n400_render_field($pdf, $field, $data) {
        $ftype = isset($field['type']) ? $field['type'] : 'text';
        $fname = isset($field['name']) ? $field['name'] : '';
        if ($fname === '' || $ftype === 'info' || $ftype === 'signature') return;

        // Dia chi 5 nam / cong viec 5 nam: hien dang bang cho de nhin
        if ($ftype === 'address_history') {
            n400_render_table($pdf, isset($data[$fname]) ? $data[$fname] : array(), array(
                array('address', 'Địa chỉ', 110),
                array('startDate', 'Từ ngày', 30, true),
                array('endDate', 'Đến ngày', 30, true),
            ));
            return;
        }
        if ($ftype === 'work_history') {
            n400_render_table($pdf, isset($data[$fname]) ? $data[$fname] : array(), array(
                array('profession', 'Nghề nghiệp', 30),
                array('companyName', 'Tên công ty', 35),
                array('address', 'Địa chỉ', 65),
                array('startDate', 'Từ ngày', 20, true),
                array('endDate', 'Đến ngày', 20, true),
            ));
            return;
        }
        if ($ftype === 'travel_history') {
            n400_render_table($pdf, isset($data[$fname]) ? $data[$fname] : array(), array(
                array('destination', 'Đi đến quốc gia', 70),
                array('startDate', 'Ngày rời khỏi Mỹ', 50, true),
                array('endDate', 'Ngày quay lại Mỹ', 50, true),
            ));
            return;
        }

        static $entryMaps = null;
        if ($entryMaps === null) {
            $entryMaps = array(
                'education_history' => array('Học vấn', array(array('schoolName', 'Tên trường'), array('program', 'Ngành học/Chương trình học'), array('address', 'Địa chỉ'), array('startDate', 'Từ ngày', true), array('endDate', 'Đến ngày', true))),
                'offense_history'   => array('Tiền án', array(array('offense', 'Tội danh'), array('location', 'Nơi diễn ra'), array('date', 'Ngày bị', true), array('outcome', 'Kết quả'))),
            );
        }

        if (isset($entryMaps[$ftype])) {
            n400_render_entries($pdf, isset($data[$fname]) ? $data[$fname] : array(), $entryMaps[$ftype][0], $entryMaps[$ftype][1]);
            return;
        }

        if ($ftype === 'children_info') {
            n400_render_children($pdf, isset($data[$fname]) ? $data[$fname] : array());
            return;
        }

        if ($ftype === 'text_repeater') {
            n400_render_list_row($pdf, n400_localized(isset($field['label']) ? $field['label'] : $fname), isset($data[$fname]) ? $data[$fname] : array());
            return;
        }

        $label = n400_field_label($field);

        if ($fname === 'birth_province') {
            n400_row($pdf, 'Thành phố nơi sinh', n400_txt(isset($data['birth_city']) ? $data['birth_city'] : ''));
        }

        if ($fname === 'mailing_address') {
            $same = n400_txt(isset($data['mailing_same_as_current']) ? $data['mailing_same_as_current'] : '');
            $val = $same === 'yes' ? 'Giống địa chỉ hiện tại ở Mỹ' : n400_txt(isset($data['mailing_address']) ? $data['mailing_address'] : '');
            n400_row($pdf, $label, $val);
            return;
        }

        $value = n400_field_display_value($field, $data);
        if ($ftype === 'date') {
            $value = n400_format_date_value($value);
        }
        n400_row($pdf, $label, $value);
    }

}

/* ── Load schema (nguon su that cho cac field ma nguoi dung da dien) ── */
$schema_path = ICAVIET_DIR . 'forms/n-400/schema.json';
$schema = array();
if (file_exists($schema_path)) {
    $decoded = json_decode(file_get_contents($schema_path), true);
    if (is_array($decoded)) $schema = $decoded;
}

/* ── Header ── */
$applicant_name = n400_txt(isset($data['applicant_full_name']) ? $data['applicant_full_name'] : '');
if ($applicant_name === '') {
    $applicant_name = trim(
        n400_txt(isset($data['last_name']) ? $data['last_name'] : '') . ' ' .
        n400_txt(isset($data['middle_name']) ? $data['middle_name'] : '') . ' ' .
        n400_txt(isset($data['first_name']) ? $data['first_name'] : '')
    );
}
$submission_id = isset($data['_id']) ? '#' . (int) $data['_id'] : '';

$pdf->SetTextColor(20, 38, 75);
$pdf->SetFont('DejaVu', 'B', 16);
$pdf->Cell(0, 8, 'ĐƠN XIN NHẬP TỊCH HOA KỲ', 0, 1, 'L');

$pdf->SetFont('DejaVu', '', 9);
$pdf->SetTextColor(90, 96, 110);
$sub = 'Mẫu N-400';
if ($submission_id !== '') $sub .= '   •   Mã hồ sơ ' . $submission_id;
if ($applicant_name !== '') $sub .= '   •   Đương đơn: ' . $applicant_name;
$pdf->Cell(0, 6, $sub, 0, 1, 'L');

$pdf->SetTextColor(0, 0, 0);
$pdf->Ln(3);

/* ── Render toan bo schema (section > group > field) ── */
foreach ((isset($schema['sections']) && is_array($schema['sections'])) ? $schema['sections'] : array() as $section) {
    $sectionId = isset($section['id']) ? $section['id'] : '';

    // Xac nhan & chu ky duoc render rieng o cuoi file (kem anh chu ky)
    if ($sectionId === 'part7_additional_info') continue;

    // Chi hien chi tiet vo/chong hien tai khi tinh trang hon nhan la "Ket hon"
    // (giong logic an/hien cua chinh form Vue)
    if ($sectionId === 'part4_current_marriage') {
        $maritalRaw = n400_txt(isset($data['marital_status']) ? $data['marital_status'] : '');
        $maritalNorm = function_exists('mb_strtolower') ? mb_strtolower($maritalRaw, 'UTF-8') : strtolower($maritalRaw);
        if (!in_array($maritalNorm, array('kết hôn', 'ket hon', 'married'), true)) {
            continue;
        }
    }

    if (!n400_section_has_data($section, $data)) continue;

    n400_section($pdf, n400_localized(isset($section['title']) ? $section['title'] : $sectionId));

    foreach ((isset($section['groups']) && is_array($section['groups'])) ? $section['groups'] : array() as $group) {
        if (!n400_group_has_data($group, $data)) continue;

        n400_group($pdf, n400_localized(isset($group['title']) ? $group['title'] : ''));

        $fields = (isset($group['fields']) && is_array($group['fields'])) ? array_values($group['fields']) : array();
        $fieldCount = count($fields);
        $fi = 0;
        while ($fi < $fieldCount) {
            if ($fi + 2 < $fieldCount && n400_is_name_triplet($fields[$fi], $fields[$fi + 1], $fields[$fi + 2])) {
                n400_render_name_triplet($pdf, $fields[$fi], $fields[$fi + 1], $fields[$fi + 2], $data);
                $fi += 3;
                continue;
            }

            $rowA = n400_field_row_data($fields[$fi], $data);
            if ($rowA !== null) {
                if ($rowA[1] === '') { $fi++; continue; }
                if ($fi + 1 < $fieldCount) {
                    $rowB = n400_field_row_data($fields[$fi + 1], $data);
                    if ($rowB !== null && $rowB[1] !== '' && n400_is_short($rowA[0], $rowA[1]) && n400_is_short($rowB[0], $rowB[1])) {
                        n400_row_pair($pdf, $rowA[0], $rowA[1], $rowB[0], $rowB[1]);
                        $fi += 2;
                        continue;
                    }
                }
                n400_row($pdf, $rowA[0], $rowA[1]);
                $fi++;
                continue;
            }

            n400_render_field($pdf, $fields[$fi], $data);
            $fi++;
        }
    }
}

/* ── XAC NHAN & CHU KY ── */
n400_section($pdf, 'XÁC NHẬN & CHỮ KÝ');

$note = n400_txt(isset($data['additional_info_note']) ? $data['additional_info_note'] : '');
if ($note !== '') {
    n400_row($pdf, 'Thông tin bổ sung', $note);
}
n400_row($pdf, 'Họ và tên người điền đơn', $applicant_name);
n400_row($pdf, 'Ngày ký', n400_format_date_value(isset($data['signature_date']) ? $data['signature_date'] : ''));

$sig = isset($data['__signature']) ? $data['__signature'] : '';
if ($sig && strpos($sig, 'data:image/png;base64,') === 0) {
    $img_data = base64_decode(str_replace('data:image/png;base64,', '', $sig));
    if ($img_data) {
        $tmp = tempnam(sys_get_temp_dir(), 'sig_') . '.png';
        file_put_contents($tmp, $img_data);
        try {
            n400_ensure_space($pdf, 34);
            $pdf->Ln(2);
            $pdf->SetFont('DejaVu', 'B', 9);
            $pdf->SetTextColor(55, 65, 81);
            $pdf->Cell(0, 7, 'Chữ ký:', 0, 1);
            $pdf->SetTextColor(0, 0, 0);
            $pdf->SetDrawColor(226, 232, 240);
            $pdf->Rect($pdf->GetX(), $pdf->GetY(), 85, 27);
            $pdf->Image($tmp, $pdf->GetX() + 2, $pdf->GetY() + 2, 81, 23);
            $pdf->Ln(30);
        } catch (\Exception $e) {}
        @unlink($tmp);
    }
}

$pdf->Ln(4);
$pdf->SetFont('DejaVu', 'I', 8);
$pdf->SetTextColor(100, 116, 139);
$pdf->Cell(0, 6, 'Tài liệu này được tạo bởi hệ thống ICAVIET Forms – ' . date_i18n('d/m/Y H:i'), 0, 1, 'C');

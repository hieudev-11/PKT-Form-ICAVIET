<?php
/**
 * PDF template cho form N-600 - Don xin Giay chung nhan Quoc tich My
 * Bien co san: $pdf (ICAVIET_FPDF), $data (array)
 *
 * Form N-600 duoc nhap qua Vue app render dong tu schema.json (xem
 * forms/n-600/schema.json + vue-app/src/pages/N600Form.vue). Du lieu gui len
 * nam trong $data['form_data'] va duoc merge vao $data o tang
 * ICAVIET_Handler::process(), nen moi field trong schema deu co the doc truc
 * tiep bang $data[$field['name']]. Template nay render lai dung theo cau truc
 * schema (section > group > field) de dam bao khong thieu thong tin nguoi
 * dung da nhap, dong thoi tranh loi chu bi de (nhan dai bi Cell() de len gia
 * tri) bang cach dung MultiCell xep chong nhan/gia tri, va giai ma cac gia
 * tri radio/select/checkbox_group ve dung nhan tieng Viet thay vi hien thi
 * code tho.
 */
if (!defined('ABSPATH')) exit;

if (!function_exists('n600_txt')) {

    function n600_txt($v) {
        if (is_array($v)) return '';
        return trim((string) $v);
    }

    function n600_localized($obj) {
        if (is_array($obj)) {
            if (isset($obj['vi']) && $obj['vi'] !== '') return (string) $obj['vi'];
            if (isset($obj['en'])) return (string) $obj['en'];
            return '';
        }
        return (string) $obj;
    }

    /* ── Mot so label trong schema (vd option "Khac." cua
       relationship_to_us_citizen_parent) duoc dem them mot chuoi dai KY TU
       KHOANG TRANG KHONG NGAT (U+00A0 / \xC2\xA0 trong UTF-8) chu khong phai
       space thuong, nen trim() cua PHP (chi strip ASCII whitespace) khong
       loai bo duoc. Ham nay strip ca hai loai o dau/cuoi chuoi. ── */
    function n600_trim_ws($s) {
        $s = (string) $s;
        $trimmed = preg_replace('/^(?:\s|\xC2\xA0)+|(?:\s|\xC2\xA0)+$/u', '', $s);
        return $trimmed === null ? trim($s) : $trimmed;
    }

    /* ── Giai ma gia tri tho (value) cua radio/select/checkbox_group ve dung
       nhan tieng Viet trong field['options']; fallback ve gia tri tho neu
       khong tim thay option khop. ── */
    function n600_option_label($field, $raw) {
        $raw = n600_txt($raw);
        if ($raw === '') return '';
        if (!empty($field['options']) && is_array($field['options'])) {
            foreach ($field['options'] as $opt) {
                if (isset($opt['value']) && (string) $opt['value'] === $raw) {
                    return n600_trim_ws(n600_localized(isset($opt['label']) ? $opt['label'] : $raw));
                }
            }
        }
        return $raw;
    }

    /* ── N-600: cac field type "date" duoc DateSelect (3 select MM/DD/YYYY
       trong N600Form.vue) luu truc tiep theo dinh dang MM/DD/YYYY (khac voi
       N-400, noi DateSelect luon luu DD/MM/YYYY bat ke thu tu hien thi). Gia
       tri duoc doi ve dang chu "Ngày D tháng M năm Y" khi hien thi trong PDF
       (dong bo voi bao-lanh/ndbl), nen khong con can goi y dinh dang trong
       nhan nua. ── */
    function n600_field_label($field) {
        return n600_localized(isset($field['label']) ? $field['label'] : (isset($field['name']) ? $field['name'] : ''));
    }

    /* ── Doi gia tri ngay luu dang MM/DD/YYYY (hoac YYYY-MM-DD) sang dang chu
       "Ngày D tháng M năm Y", dong bo voi cach hien thi ngay o bao-lanh/ndbl. ── */
    function n600_format_date($value) {
        $value = trim((string) $value);
        if ($value === '') return '';
        if (preg_match('/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/', $value, $m)) {
            return 'Ngày ' . intval($m[2]) . ' tháng ' . intval($m[1]) . ' năm ' . intval($m[3]);
        }
        if (preg_match('/^(\d{4})-(\d{1,2})-(\d{1,2})$/', $value, $m)) {
            return 'Ngày ' . intval($m[3]) . ' tháng ' . intval($m[2]) . ' năm ' . intval($m[1]);
        }
        return $value;
    }

    /* ── Lay gia tri hien thi cho 1 field theo dung type cua no ── */
    function n600_field_display_value($field, $data) {
        $fname = isset($field['name']) ? $field['name'] : '';
        if ($fname === '') return '';
        $ftype = isset($field['type']) ? $field['type'] : 'text';
        $raw = isset($data[$fname]) ? $data[$fname] : '';

        if ($ftype === 'checkbox_group') {
            if (!is_array($raw)) return n600_txt($raw);
            $labels = array();
            foreach ($raw as $v) {
                if (is_array($v)) continue;
                $lbl = n600_option_label($field, $v);
                if ($lbl !== '') $labels[] = $lbl;
            }
            return implode(', ', $labels);
        }

        if (is_array($raw)) return '';

        if ($ftype === 'radio' || $ftype === 'select') {
            return n600_option_label($field, $raw);
        }

        if ($ftype === 'date') {
            return n600_format_date(n600_txt($raw));
        }

        return n600_txt($raw);
    }

    /* ── Kiem tra field/group/section co du lieu de hien thi khong. Xu ly
       rieng cac type dang mang (checkbox_group la mang chuoi da chon,
       residence_period_table la mang cac dong {from_date,to_date}) de
       khong coi isset() la "co du lieu" khi ben trong toan chuoi rong. ── */
    function n600_field_has_value($field, $data) {
        $ftype = isset($field['type']) ? $field['type'] : 'text';
        $fname = isset($field['name']) ? $field['name'] : '';
        if ($fname === '' || $ftype === 'signature' || $ftype === 'info') return false;

        $raw = isset($data[$fname]) ? $data[$fname] : '';

        if ($ftype === 'residence_period_table') {
            if (!is_array($raw)) return n600_txt($raw) !== '';
            foreach ($raw as $row) {
                if (is_array($row)) {
                    foreach ($row as $v) {
                        if (!is_array($v) && n600_txt($v) !== '') return true;
                    }
                } elseif (n600_txt($row) !== '') {
                    return true;
                }
            }
            return false;
        }

        if ($ftype === 'checkbox_group') {
            if (!is_array($raw)) return n600_txt($raw) !== '';
            foreach ($raw as $v) {
                if (!is_array($v) && n600_txt($v) !== '') return true;
            }
            return false;
        }

        if (is_array($raw)) return false;
        return n600_txt($raw) !== '';
    }

    /* ── Dia chi voi hide_label=true tren MOI subfield (Ten duong/Huyen-TP/
       Tinh-Bang/Zip/Quoc gia) can duoc gop thanh 1 dong duy nhat thay vi 5
       dong "nhan trong: gia tri" rieng le. Phat hien dua tren ten field (hau
       to _street/_city/_state/_zip/_country) + hide_label === true tren tat
       ca cac field trong group, khong hardcode ten group cu the de ap dung
       dung cho ca current_us_address, us_mailing_address, father_current_address,
       mother_current_address (cac group "hon hop" hide_label nhu
       father_spouse/mother_spouse_current_address KHONG khop dieu kien nay nen
       van duoc render rieng le nhu binh thuong). ── */
    function n600_address_field_suffix($name) {
        if (preg_match('/_(street|city|state|zip|country)$/', (string) $name, $m)) {
            return $m[1];
        }
        return null;
    }

    function n600_is_address_merge_group($group) {
        $fields = (isset($group['fields']) && is_array($group['fields'])) ? $group['fields'] : array();
        if (count($fields) < 2) return false;
        $seen = array();
        foreach ($fields as $f) {
            if (!is_array($f)) return false;
            if ((isset($f['type']) ? $f['type'] : 'text') !== 'text') return false;
            if (!isset($f['hide_label']) || $f['hide_label'] !== true) return false;
            $suffix = n600_address_field_suffix(isset($f['name']) ? $f['name'] : '');
            if ($suffix === null || isset($seen[$suffix])) return false;
            $seen[$suffix] = true;
        }
        return true;
    }

    function n600_address_group_value($group, $data) {
        $fields = (isset($group['fields']) && is_array($group['fields'])) ? $group['fields'] : array();
        $bySuffix = array();
        foreach ($fields as $f) {
            $suffix = n600_address_field_suffix(isset($f['name']) ? $f['name'] : '');
            if ($suffix === null) continue;
            $fname = isset($f['name']) ? $f['name'] : '';
            $bySuffix[$suffix] = n600_txt($fname !== '' && isset($data[$fname]) ? $data[$fname] : '');
        }
        $street = isset($bySuffix['street']) ? $bySuffix['street'] : '';
        $city = isset($bySuffix['city']) ? $bySuffix['city'] : '';
        $state = isset($bySuffix['state']) ? $bySuffix['state'] : '';
        $zip = isset($bySuffix['zip']) ? $bySuffix['zip'] : '';
        $country = isset($bySuffix['country']) ? $bySuffix['country'] : '';
        $stateZip = trim($state . ' ' . $zip);
        $parts = array_filter(array($street, $city, $stateZip, $country), function ($v) { return $v !== ''; });
        return implode(', ', $parts);
    }

    function n600_group_has_data($group, $data) {
        if (n600_is_address_merge_group($group)) {
            return n600_address_group_value($group, $data) !== '';
        }
        foreach ((isset($group['fields']) && is_array($group['fields'])) ? $group['fields'] : array() as $field) {
            if (n600_field_has_value($field, $data)) return true;
        }
        return false;
    }

    function n600_section_has_data($section, $data) {
        foreach ((isset($section['groups']) && is_array($section['groups'])) ? $section['groups'] : array() as $group) {
            if (n600_group_has_data($group, $data)) return true;
        }
        return false;
    }

    /* ── Layout helpers ── */
    function n600_upper($s) {
        return function_exists('mb_strtoupper') ? mb_strtoupper($s, 'UTF-8') : strtoupper($s);
    }

    function n600_ensure_space($pdf, $needed) {
        if ($pdf->GetY() + $needed > $pdf->GetPageHeight() - 25) {
            $pdf->AddPage();
        }
    }

    function n600_section($pdf, $title) {
        if (trim((string) $title) === '') return;
        n600_ensure_space($pdf, 22);
        $pdf->Ln(4);
        $pdf->SetX(20);
        $pdf->SetTextColor(20, 38, 75);
        $pdf->SetFont('DejaVu', 'B', 13);
        $pdf->MultiCell(0, 7, n600_upper($title), 0, 'L');
        $pdf->SetDrawColor(230, 232, 240);
        $pdf->Line(20, $pdf->GetY() + 1, 190, $pdf->GetY() + 1);
        $pdf->SetTextColor(0, 0, 0);
        $pdf->SetX(20);
        $pdf->Ln(3);
    }

    function n600_group($pdf, $title) {
        if (trim((string) $title) === '') return;
        n600_ensure_space($pdf, 10);
        $pdf->SetFont('DejaVu', 'B', 10.5);
        $pdf->SetTextColor(226, 36, 55);
        $label = n600_upper($title);
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

    /* ── Render 1 dong nhan/gia tri: nhan va gia tri deu dung MultiCell xep
       chong (khong dung Cell co do rong co dinh) nen nhan dai (cau day du
       60-150+ ky tu) se tu xuong dong thay vi trang len gia tri. Day la fix
       chinh cho loi "chu bi de". ── */
    function n600_row($pdf, $label, $value, $indent = 0) {
        $value = n600_txt($value);
        if ($value === '') return;
        n600_ensure_space($pdf, 14);
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

    /* ── Ghep 2 field ngan (thang/ngay/nam, gioi tinh...) tren cung 1 dong de
       khong bo trong ben phai trang khi tung dong day chi co vai chu. ── */
    function n600_str_len($s) {
        return function_exists('mb_strlen') ? mb_strlen($s, 'UTF-8') : strlen($s);
    }

    function n600_is_short($label, $value) {
        return n600_str_len($label) <= 45 && n600_str_len($value) <= 30;
    }

    function n600_row_pair($pdf, $labelA, $valueA, $labelB, $valueB) {
        n600_ensure_space($pdf, 14);
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

    function n600_entry_heading($pdf, $text) {
        n600_ensure_space($pdf, 10);
        $pdf->SetX(20);
        $pdf->SetFont('DejaVu', 'B', 10.5);
        $pdf->SetTextColor(37, 99, 235);
        $pdf->Cell(0, 6, $text, 0, 1);
        $pdf->SetTextColor(0, 0, 0);
    }

    /* ── residence_period_table: $data[name] la mang cac dong
       {from_date, to_date} (ten lay tu field['fields_template']), moi dong la
       1 gia doan cu tru/phuc vu duoc luu MM/DD/YYYY (giong cac field "date"
       khac). Dung cho ca us_residence_periods (Phan D) va
       military_service_periods (Phan E). ── */
    function n600_render_residence_table($pdf, $field, $data) {
        $fname = isset($field['name']) ? $field['name'] : '';
        $rows = ($fname !== '' && isset($data[$fname]) && is_array($data[$fname])) ? $data[$fname] : array();
        $n = 0;
        foreach ($rows as $row) {
            if (!is_array($row)) continue;
            $from = n600_txt(isset($row['from_date']) ? $row['from_date'] : '');
            $to = n600_txt(isset($row['to_date']) ? $row['to_date'] : '');
            if ($from === '' && $to === '') continue;
            $n++;
            n600_entry_heading($pdf, 'Giai đoạn ' . $n);
            n600_row($pdf, 'Từ ngày', n600_format_date($from), 4);
            n600_row($pdf, 'Đến ngày', n600_format_date($to), 4);
        }
    }

    /* Tra ve array(label, value) cho field "don gian" (co the ghep cap);
       tra ve null cho cac type can renderer rieng (residence_period_table,
       signature, info). */
    function n600_field_row_data($field, $data) {
        $ftype = isset($field['type']) ? $field['type'] : 'text';
        $fname = isset($field['name']) ? $field['name'] : '';
        if ($fname === '' || in_array($ftype, array('signature', 'info', 'residence_period_table'), true)) return null;

        $label = n600_field_label($field);
        $value = n600_field_display_value($field, $data);
        return array($label, $value);
    }

    /* ── Mot so nhom trong schema tach ngay sinh/ngay cap... thanh 3 field
       select rieng (ten hau to _month/_day/_year, vd date_of_birth_month/day/
       year, previous_entry_date_month/day/year) thay vi 1 field type "date"
       duy nhat. De hien thi thanh 1 dong "Ngày D tháng M năm Y" duy nhat
       (giong cac field type "date" khac) thay vi 3 dong "Thang/Ngay/Nam"
       rieng le, ta phat hien 3 field lien tiep co cung tien to + hau to
       _month/_day/_year va gop lai. ── */
    function n600_mdy_prefix($name, $suffix) {
        $name = (string) $name;
        $len = strlen($suffix);
        if (substr($name, -$len) === $suffix) return substr($name, 0, -$len);
        return null;
    }

    function n600_mdy_triplet_at($fields, $fi) {
        if (!isset($fields[$fi + 2])) return null;
        $f1 = $fields[$fi]; $f2 = $fields[$fi + 1]; $f3 = $fields[$fi + 2];
        $p1 = n600_mdy_prefix(isset($f1['name']) ? $f1['name'] : '', '_month');
        $p2 = n600_mdy_prefix(isset($f2['name']) ? $f2['name'] : '', '_day');
        $p3 = n600_mdy_prefix(isset($f3['name']) ? $f3['name'] : '', '_year');
        if ($p1 === null || $p2 === null || $p3 === null) return null;
        if ($p1 !== $p2 || $p2 !== $p3) return null;
        return array($f1, $f2, $f3);
    }

    function n600_mdy_value($f1, $f2, $f3, $data) {
        $m = n600_txt(isset($data[$f1['name']]) ? $data[$f1['name']] : '');
        $d = n600_txt(isset($data[$f2['name']]) ? $data[$f2['name']] : '');
        $y = n600_txt(isset($data[$f3['name']]) ? $data[$f3['name']] : '');
        if ($m === '' || $d === '' || $y === '') return '';
        return n600_format_date($m . '/' . $d . '/' . $y);
    }

    function n600_mdy_label($monthField) {
        $label = isset($monthField['label']) ? $monthField['label'] : array();
        $vi = is_array($label) ? (isset($label['vi']) ? (string) $label['vi'] : '') : (string) $label;
        $en = is_array($label) ? (isset($label['en']) ? (string) $label['en'] : '') : '';
        $vi = trim((string) preg_replace('/\bTháng\b/u', 'Ngày', $vi));
        $en = trim((string) preg_replace('/\bMonth\b/u', 'Date', $en));
        $out = $vi !== '' ? $vi : $en;
        if ($out === '') $out = 'Ngày sinh';
        return $out;
    }

    /* ── Nhieu nhom trong schema tach ten thanh 3 field text rieng (Ho/Ten
       lot/Ten, vd legal_family_name+legal_last_name+legal_first_name,
       green_card_family_name+..._middle_name+..._first_name,
       previous_entry_used_family_name+..., father_family_name+...,
       father_spouse_family_name+..., mother_family_name+...,
       mother_spouse_family_name+...). Gop ca 3 thanh 1 gia tri "Ho Ten lot
       Ten" duy nhat thay vi hien rieng le tung o. Thu tu field trong schema
       khong nhat quan (co nhom Ho/Ten lot/Ten, co nhom Ten/Ho/Ten lot) nen
       nhan dien theo hau to ten field (khong theo vi tri) roi luon xuat theo
       thu tu co dinh Ho + Ten lot + Ten. ── */
    function n600_name_field_role($name) {
        $name = (string) $name;
        $suffixes = array(
            '_family_name' => 'family',
            '_middle_name' => 'middle',
            '_last_name' => 'middle',
            '_first_name' => 'first',
        );
        foreach ($suffixes as $suf => $role) {
            $len = strlen($suf);
            if (substr($name, -$len) === $suf) {
                return array(substr($name, 0, -$len), $role);
            }
        }
        return null;
    }

    function n600_name_triplet_at($fields, $fi) {
        if (!isset($fields[$fi + 2])) return null;
        $prefix = null;
        $roles = array();
        for ($k = 0; $k < 3; $k++) {
            $f = $fields[$fi + $k];
            if (!is_array($f) || (isset($f['type']) ? $f['type'] : 'text') !== 'text') return null;
            $r = n600_name_field_role(isset($f['name']) ? $f['name'] : '');
            if ($r === null) return null;
            list($p, $role) = $r;
            if ($prefix === null) { $prefix = $p; } elseif ($p !== $prefix) { return null; }
            if (isset($roles[$role])) return null;
            $roles[$role] = $f;
        }
        if (!isset($roles['family']) || !isset($roles['middle']) || !isset($roles['first'])) return null;
        return $roles;
    }

    /* Gop Ho/Ten lot/Ten thanh 1 gia tri nhieu dong (moi phan 1 dong) de in
       trong 1 khoi label/value duy nhat thay vi gop lien tuc thanh 1 dong
       (kho phan biet ranh gioi giua Ho/Ten lot/Ten khi co nhieu tu). */
    function n600_name_triplet_value($roles, $data) {
        $family = n600_txt(isset($data[$roles['family']['name']]) ? $data[$roles['family']['name']] : '');
        $middle = n600_txt(isset($data[$roles['middle']['name']]) ? $data[$roles['middle']['name']] : '');
        $first = n600_txt(isset($data[$roles['first']['name']]) ? $data[$roles['first']['name']] : '');
        $lines = array();
        if ($family !== '') $lines[] = 'Họ: ' . $family;
        if ($middle !== '') $lines[] = 'Tên lót: ' . $middle;
        if ($first !== '') $lines[] = 'Tên: ' . $first;
        return implode("\n", $lines);
    }

    function n600_name_triplet_label($roles) {
        $label = isset($roles['family']['label']) ? $roles['family']['label'] : array();
        $vi = is_array($label) ? (isset($label['vi']) ? (string) $label['vi'] : '') : (string) $label;
        $en = is_array($label) ? (isset($label['en']) ? (string) $label['en'] : '') : '';
        $vi = trim((string) preg_replace('/\bHọ\b(?!\s+tên)/u', 'Họ tên', $vi));
        $en = trim((string) preg_replace('/\bFamily\s+Name\b/ui', 'Name', $en));
        $out = $vi !== '' ? $vi : $en;
        if ($out === '') $out = 'Họ tên';
        return $out;
    }

    /* ── Chieu cao tach thanh 2 field text rieng height_feet + height_inches
       (a_number_height_group) thay vi 1 field duy nhat. Gop thanh 1 dong
       "5' 5"" duy nhat thay vi hien rieng le - va giong nhu mdy/name triplet,
       phai chan khong cho field truoc do (a_number) "cuop" height_feet vao
       cap ghep dong cua no. ── */
    function n600_height_pair_at($fields, $fi) {
        if (!isset($fields[$fi + 1])) return null;
        $f1 = $fields[$fi]; $f2 = $fields[$fi + 1];
        if (!is_array($f1) || !is_array($f2)) return null;
        if ((isset($f1['type']) ? $f1['type'] : 'text') !== 'text') return null;
        if ((isset($f2['type']) ? $f2['type'] : 'text') !== 'text') return null;
        $n1 = isset($f1['name']) ? (string) $f1['name'] : '';
        $n2 = isset($f2['name']) ? (string) $f2['name'] : '';
        if (substr($n1, -5) !== '_feet' || substr($n2, -7) !== '_inches') return null;
        if (substr($n1, 0, -5) !== substr($n2, 0, -7)) return null;
        return array($f1, $f2);
    }

    function n600_height_pair_value($pair, $data) {
        $feet = n600_txt(isset($data[$pair[0]['name']]) ? $data[$pair[0]['name']] : '');
        $inches = n600_txt(isset($data[$pair[1]['name']]) ? $data[$pair[1]['name']] : '');
        if ($feet === '' && $inches === '') return '';
        if ($feet !== '' && $inches !== '') return $feet . "' " . $inches . '"';
        return $feet !== '' ? $feet . "'" : $inches . '"';
    }

    function n600_height_pair_label($pair) {
        $label = isset($pair[0]['label']) ? $pair[0]['label'] : array();
        $vi = is_array($label) ? (isset($label['vi']) ? (string) $label['vi'] : '') : (string) $label;
        $en = is_array($label) ? (isset($label['en']) ? (string) $label['en'] : '') : '';
        $vi = trim((string) preg_replace('/\s*-\s*feet\s*$/iu', '', $vi));
        $en = trim((string) preg_replace('/\s*-\s*feet\s*$/iu', '', $en));
        $out = $vi !== '' ? $vi : $en;
        if ($out === '') $out = 'Chiều cao';
        return $out;
    }

}

/* ── Load schema (nguon su that cho cac field ma nguoi dung da dien) ── */
$schema_path = ICAVIET_DIR . 'forms/n-600/schema.json';
$schema = array();
if (file_exists($schema_path)) {
    $decoded = json_decode(file_get_contents($schema_path), true);
    if (is_array($decoded)) $schema = $decoded;
}

/* ── Header ── */
$applicant_name = n600_txt(isset($data['applicant_full_name']) ? $data['applicant_full_name'] : '');
$submission_id = isset($data['_id']) ? '#' . (int) $data['_id'] : '';

$pdf->SetFont('DejaVu', 'B', 14);
$pdf->SetFillColor(26, 110, 245);
$pdf->SetTextColor(255, 255, 255);
$pdf->Cell(0, 12, n600_upper('Đơn xin Giấy chứng nhận Quốc tịch Hoa Kỳ (N-600)'), 0, 1, 'C', true);

$pdf->SetFont('DejaVu', '', 9);
$pdf->SetTextColor(90, 96, 110);
$sub = 'Mẫu N-600';
if ($submission_id !== '') $sub .= '   •   Mã hồ sơ ' . $submission_id;
if ($applicant_name !== '') $sub .= '   •   Đương đơn: ' . $applicant_name;
$pdf->Cell(0, 6, $sub, 0, 1, 'L');

$pdf->SetTextColor(0, 0, 0);
$pdf->Ln(3);

/* ── Render toan bo schema (section > group > field) ── */
foreach ((isset($schema['sections']) && is_array($schema['sections'])) ? $schema['sections'] : array() as $section) {
    $sectionId = isset($section['id']) ? $section['id'] : '';

    // Chu ky & xac nhan duoc render rieng o cuoi file (kem anh chu ky)
    if ($sectionId === 'part_f_signature') continue;

    if (!n600_section_has_data($section, $data)) continue;

    n600_section($pdf, n600_localized(isset($section['title']) ? $section['title'] : $sectionId));

    foreach ((isset($section['groups']) && is_array($section['groups'])) ? $section['groups'] : array() as $group) {
        if (!n600_group_has_data($group, $data)) continue;

        $groupTitle = n600_localized(isset($group['title']) ? $group['title'] : '');
        $fields = (isset($group['fields']) && is_array($group['fields'])) ? array_values($group['fields']) : array();
        $fieldCount = count($fields);

        // Nhom dia chi voi hide_label=true tren tat ca subfield: gop thanh 1
        // dong duy nhat, dung tieu de nhom lam nhan thay vi in tieu de nhom
        // roi lai in 5 dong nhan/gia tri rieng le ben duoi.
        if (n600_is_address_merge_group($group)) {
            $addr = n600_address_group_value($group, $data);
            if ($addr !== '') {
                n600_row($pdf, $groupTitle !== '' ? $groupTitle : 'Địa chỉ', $addr);
            }
            continue;
        }

        // Nhom chi gom dung 3 field ngay/thang/nam (vd date_of_birth_group):
        // gop thanh 1 dong duy nhat dung tieu de nhom lam nhan, thay vi in
        // tieu de nhom roi lai in rieng 3 dong Thang/Ngay/Nam ben duoi.
        if ($fieldCount === 3) {
            $mdyOnly = n600_mdy_triplet_at($fields, 0);
            if ($mdyOnly !== null) {
                $mdyOnlyValue = n600_mdy_value($mdyOnly[0], $mdyOnly[1], $mdyOnly[2], $data);
                if ($mdyOnlyValue !== '') {
                    $mdyOnlyLabel = $groupTitle !== '' ? $groupTitle : n600_mdy_label($mdyOnly[0]);
                    n600_row($pdf, $mdyOnlyLabel, $mdyOnlyValue);
                    continue;
                }
            }

            // Nhom chi gom dung 3 field Ho/Ten lot/Ten (vd legal_name,
            // green_card_name_group, father_legal_name_group,
            // mother_legal_name_group): gop thanh 1 dong "Ho Ten lot Ten"
            // dung tieu de nhom lam nhan.
            $nameOnly = n600_name_triplet_at($fields, 0);
            if ($nameOnly !== null) {
                $nameOnlyValue = n600_name_triplet_value($nameOnly, $data);
                if ($nameOnlyValue !== '') {
                    $nameOnlyLabel = $groupTitle !== '' ? $groupTitle : n600_name_triplet_label($nameOnly);
                    n600_row($pdf, $nameOnlyLabel, $nameOnlyValue);
                    continue;
                }
            }
        }

        n600_group($pdf, $groupTitle);

        $fi = 0;
        while ($fi < $fieldCount) {
            $field = $fields[$fi];
            $ftype = isset($field['type']) ? $field['type'] : 'text';

            $mdy = n600_mdy_triplet_at($fields, $fi);
            if ($mdy !== null) {
                $mdyValue = n600_mdy_value($mdy[0], $mdy[1], $mdy[2], $data);
                if ($mdyValue !== '') {
                    n600_row($pdf, n600_mdy_label($mdy[0]), $mdyValue);
                    $fi += 3;
                    continue;
                }
            }

            $nameTriplet = n600_name_triplet_at($fields, $fi);
            if ($nameTriplet !== null) {
                $nameTripletValue = n600_name_triplet_value($nameTriplet, $data);
                if ($nameTripletValue !== '') {
                    n600_row($pdf, n600_name_triplet_label($nameTriplet), $nameTripletValue);
                    $fi += 3;
                    continue;
                }
            }

            $heightPair = n600_height_pair_at($fields, $fi);
            if ($heightPair !== null) {
                $heightValue = n600_height_pair_value($heightPair, $data);
                if ($heightValue !== '') {
                    n600_row($pdf, n600_height_pair_label($heightPair), $heightValue);
                    $fi += 2;
                    continue;
                }
            }

            if ($ftype === 'residence_period_table') {
                n600_render_residence_table($pdf, $field, $data);
                $fi++;
                continue;
            }

            if ($ftype === 'signature' || $ftype === 'info') {
                $fi++;
                continue;
            }

            $rowA = n600_field_row_data($field, $data);
            if ($rowA === null || $rowA[1] === '') { $fi++; continue; }

            if ($fi + 1 < $fieldCount) {
                $nextField = $fields[$fi + 1];
                $nextType = isset($nextField['type']) ? $nextField['type'] : 'text';
                // Neu field ke tiep la khoi dau cua 1 triplet mdy/ten hoac
                // cap height_feet/height_inches (vd height_feet sau a_number),
                // KHONG duoc ghep no vao dong hien tai - neu khong fi se
                // nhay qua luon vi tri bat dau nhom o vong lap sau va lam vo
                // hieu logic gop ben tren.
                $nextStartsTriplet = n600_mdy_triplet_at($fields, $fi + 1) !== null
                    || n600_name_triplet_at($fields, $fi + 1) !== null
                    || n600_height_pair_at($fields, $fi + 1) !== null;
                if (!$nextStartsTriplet && !in_array($nextType, array('residence_period_table', 'signature', 'info'), true)) {
                    $rowB = n600_field_row_data($nextField, $data);
                    if ($rowB !== null && $rowB[1] !== '' && n600_is_short($rowA[0], $rowA[1]) && n600_is_short($rowB[0], $rowB[1])) {
                        n600_row_pair($pdf, $rowA[0], $rowA[1], $rowB[0], $rowB[1]);
                        $fi += 2;
                        continue;
                    }
                }
            }

            n600_row($pdf, $rowA[0], $rowA[1]);
            $fi++;
        }
    }
}

/* ── XÁC NHẬN & CHỮ KÝ ── */
n600_section($pdf, 'Xác nhận & Chữ ký');

n600_row($pdf, 'Họ và tên người điền đơn', $applicant_name);

$sig = isset($data['__signature']) ? $data['__signature'] : '';
if ($sig && strpos($sig, 'data:image/png;base64,') === 0) {
    $img_data = base64_decode(str_replace('data:image/png;base64,', '', $sig));
    if ($img_data) {
        $tmp = tempnam(sys_get_temp_dir(), 'sig_') . '.png';
        file_put_contents($tmp, $img_data);
        try {
            n600_ensure_space($pdf, 34);
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

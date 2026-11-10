<?php
/**
 * PDF template cho form I-90 - Don xin Thay The The Xanh
 * Bien co san: $pdf (ICAVIET_FPDF), $data (array)
 *
 * Render dong tu schema.json (section > group > field), cung 1 ky thuat da
 * dung cho N-600 (forms/n-600/pdf.php): dung MultiCell xep chong nhan/gia
 * tri thay vi Cell() do rong co dinh, de tranh loi "chu bi de" khi nhan dai
 * (nhieu nhan tieng Viet trong form nay dai hon 60mm - vd "Noi visa dinh cu
 * duoc cap hoac van phong USCIS da cho ban chuyen dien" - se bi Cell(60,...)
 * ve tran qua cot gia tri ben canh). Chi an cac field thuc su khong co du
 * lieu (thay vi luon in ca nhan rong) de khong bi hieu nham la "thieu data".
 */
if (!defined('ABSPATH')) exit;

if (!function_exists('i90_txt')) {

    function i90_txt($v) {
        if (is_array($v)) return '';
        return trim((string) $v);
    }

    function i90_localized($obj) {
        if (is_array($obj)) {
            if (isset($obj['vi']) && $obj['vi'] !== '') return (string) $obj['vi'];
            if (isset($obj['en'])) return (string) $obj['en'];
            return '';
        }
        return (string) $obj;
    }

    /* Mot so nhan/option co the dinh khoang trang khong ngat (\xC2\xA0) o
       dau/cuoi ma trim() thuong khong loai bo duoc. */
    function i90_trim_ws($s) {
        $s = (string) $s;
        $trimmed = preg_replace('/^(?:\s|\xC2\xA0)+|(?:\s|\xC2\xA0)+$/u', '', $s);
        return $trimmed === null ? trim($s) : $trimmed;
    }

    /* Giai ma gia tri tho cua radio/select ve dung nhan tieng Viet trong
       field['options']; fallback ve gia tri tho neu khong co options hoac
       khong khop (vd cac field select ngay/thang/nam khong khai bao options
       trong schema). */
    function i90_option_label($field, $raw) {
        $raw = i90_txt($raw);
        if ($raw === '') return '';
        if (!empty($field['options']) && is_array($field['options'])) {
            foreach ($field['options'] as $opt) {
                if (isset($opt['value']) && (string) $opt['value'] === $raw) {
                    return i90_trim_ws(i90_localized(isset($opt['label']) ? $opt['label'] : $raw));
                }
            }
        }
        return $raw;
    }

    function i90_field_label($field) {
        return i90_localized(isset($field['label']) ? $field['label'] : (isset($field['name']) ? $field['name'] : ''));
    }

    /* Mot so dong trong PDF lay du lieu tu field khac voi field khai bao
       trong schema. Dong "Noi ban da nhap canh vao My (thanh pho va tieu
       bang)" (intended_port_of_entry_city_state) duoc in theo gia tri cua
       port_of_entry_city_state (vd "Minneapolis-Saint Paul International
       Airport") - field nay khong in rieng le trong PDF (xem
       i90_field_hidden_in_pdf); con dong "Noi den cua ban khi nhap canh
       (tieu bang dau tien...)" van in gia tri goc
       first_us_state_of_residence (vd "Minnesota"). Neu nguon thay the rong
       (du lieu cu) thi quay ve gia tri goc cua field. */
    function i90_field_value_source($fname) {
        $aliases = array(
            'intended_port_of_entry_city_state' => 'port_of_entry_city_state',
        );
        return isset($aliases[$fname]) ? $aliases[$fname] : null;
    }

    function i90_field_raw_value($field, $data) {
        $fname = isset($field['name']) ? $field['name'] : '';
        if ($fname === '') return '';

        $src = i90_field_value_source($fname);
        if ($src !== null && isset($data[$src]) && !is_array($data[$src]) && i90_txt($data[$src]) !== '') {
            return $data[$src];
        }

        return isset($data[$fname]) ? $data[$fname] : '';
    }

    function i90_field_display_value($field, $data) {
        $fname = isset($field['name']) ? $field['name'] : '';
        if ($fname === '') return '';
        $ftype = isset($field['type']) ? $field['type'] : 'text';
        $raw = i90_field_raw_value($field, $data);

        if (is_array($raw)) return '';

        if ($ftype === 'radio' || $ftype === 'select') {
            return i90_option_label($field, $raw);
        }

        return i90_txt($raw);
    }

    /* Cac field co trong schema (va van hien thi tren form nhap lieu) nhung
       khong duoc in ra trong ban PDF theo yeu cau. */
    function i90_field_hidden_in_pdf($field) {
        $fname = isset($field['name']) ? $field['name'] : '';
        $hidden = array('port_of_entry_city_state');
        return in_array($fname, $hidden, true);
    }

    function i90_field_has_value($field, $data) {
        $ftype = isset($field['type']) ? $field['type'] : 'text';
        $fname = isset($field['name']) ? $field['name'] : '';
        if ($fname === '' || $ftype === 'signature' || $ftype === 'info') return false;
        if (i90_field_hidden_in_pdf($field)) return false;

        $raw = i90_field_raw_value($field, $data);
        if (is_array($raw)) return false;
        return i90_txt($raw) !== '';
    }

    function i90_group_has_data($group, $data) {
        foreach ((isset($group['fields']) && is_array($group['fields'])) ? $group['fields'] : array() as $field) {
            if (i90_field_has_value($field, $data)) return true;
        }
        return false;
    }

    function i90_section_has_data($section, $data) {
        foreach ((isset($section['groups']) && is_array($section['groups'])) ? $section['groups'] : array() as $group) {
            if (i90_group_has_data($group, $data)) return true;
        }
        return false;
    }

    /* ── Layout helpers ── */
    function i90_upper($s) {
        return function_exists('mb_strtoupper') ? mb_strtoupper($s, 'UTF-8') : strtoupper($s);
    }

    function i90_ensure_space($pdf, $needed) {
        if ($pdf->GetY() + $needed > $pdf->GetPageHeight() - 25) {
            $pdf->AddPage();
        }
    }

    function i90_section($pdf, $title) {
        if (trim((string) $title) === '') return;
        i90_ensure_space($pdf, 22);
        $pdf->Ln(4);
        $pdf->SetX(20);
        $pdf->SetTextColor(20, 38, 75);
        $pdf->SetFont('DejaVu', 'B', 13);
        $pdf->MultiCell(0, 7, i90_upper($title), 0, 'L');
        $pdf->SetDrawColor(230, 232, 240);
        $pdf->Line(20, $pdf->GetY() + 1, 190, $pdf->GetY() + 1);
        $pdf->SetTextColor(0, 0, 0);
        $pdf->SetX(20);
        $pdf->Ln(3);
    }

    function i90_group($pdf, $title) {
        if (trim((string) $title) === '') return;
        i90_ensure_space($pdf, 10);
        $pdf->SetFont('DejaVu', 'B', 10.5);
        $pdf->SetTextColor(226, 36, 55);
        $label = i90_upper($title);
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

    /* Nhan va gia tri deu dung MultiCell xep chong (khong Cell co do rong co
       dinh) nen nhan dai se tu xuong dong thay vi de len gia tri - day la
       fix chinh cho loi "chu bi de". */
    function i90_row($pdf, $label, $value, $indent = 0) {
        $value = i90_txt($value);
        if ($value === '') return;
        i90_ensure_space($pdf, 14);
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

    function i90_str_len($s) {
        return function_exists('mb_strlen') ? mb_strlen($s, 'UTF-8') : strlen($s);
    }

    /* Ghep 2 field ngan (thang/ngay/nam, ho/ten...) tren cung 1 dong de
       khong bo trong ben phai trang. */
    function i90_is_short($label, $value) {
        return i90_str_len($label) <= 45 && i90_str_len($value) <= 30;
    }

    function i90_row_pair($pdf, $labelA, $valueA, $labelB, $valueB) {
        i90_ensure_space($pdf, 14);
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

    /* Tra ve array(label, value) cho field "don gian"; tra ve null cho
       signature/info (co renderer rieng). */
    function i90_field_row_data($field, $data) {
        $ftype = isset($field['type']) ? $field['type'] : 'text';
        $fname = isset($field['name']) ? $field['name'] : '';
        if ($fname === '' || in_array($ftype, array('signature', 'info'), true)) return null;

        $label = i90_field_label($field);
        $value = i90_field_display_value($field, $data);
        return array($label, $value);
    }

    /* ── Ngay sinh / ngay nhap canh duoc tach thanh 3 field _month/_day/_year
       rieng le trong schema. Gop lai thanh 1 gia tri mm/dd/yyyy duy nhat thay
       vi in 3 dong Thang/Ngay/Nam rieng le. ── */
    function i90_mdy_prefix($name, $suffix) {
        $name = (string) $name;
        $len = strlen($suffix);
        if (substr($name, -$len) === $suffix) return substr($name, 0, -$len);
        return null;
    }

    function i90_mdy_triplet_at($fields, $fi) {
        if (!isset($fields[$fi + 2])) return null;
        $f1 = $fields[$fi]; $f2 = $fields[$fi + 1]; $f3 = $fields[$fi + 2];
        $p1 = i90_mdy_prefix(isset($f1['name']) ? $f1['name'] : '', '_month');
        $p2 = i90_mdy_prefix(isset($f2['name']) ? $f2['name'] : '', '_day');
        $p3 = i90_mdy_prefix(isset($f3['name']) ? $f3['name'] : '', '_year');
        if ($p1 === null || $p2 === null || $p3 === null) return null;
        if ($p1 !== $p2 || $p2 !== $p3) return null;
        return array('prefix' => $p1, 'fields' => array($f1, $f2, $f3));
    }

    /* ── Doi gia tri "M/D/Y" (tu 3 select thang/ngay/nam) sang dang chu
       "Ngày D tháng M năm Y", dong bo voi bao-lanh/ndbl/N-400/N-600. ── */
    function i90_format_date($m, $d, $y) {
        if ($m === '' || $d === '' || $y === '') return '';
        return 'Ngày ' . intval($d) . ' tháng ' . intval($m) . ' năm ' . intval($y);
    }

    function i90_mdy_value($triplet, $data) {
        $fields = $triplet['fields'];
        $m = i90_txt(isset($data[$fields[0]['name']]) ? $data[$fields[0]['name']] : '');
        $d = i90_txt(isset($data[$fields[1]['name']]) ? $data[$fields[1]['name']] : '');
        $y = i90_txt(isset($data[$fields[2]['name']]) ? $data[$fields[2]['name']] : '');
        return i90_format_date($m, $d, $y);
    }

    function i90_mdy_label($triplet) {
        $labels = array(
            'date_of_birth' => 'Ngày sinh',
            'date_of_entry' => 'Ngày nhập cảnh',
        );
        $prefix = $triplet['prefix'];
        return isset($labels[$prefix]) ? $labels[$prefix] : 'Ngày';
    }

    /* ── Ho/Ten lot/Ten duoc tach thanh 3 field text rieng le
       (_first_name/_middle_name/_last_name) trong schema. Gop lai thanh 1
       gia tri "Ho Ten lot Ten" duy nhat thay vi in 3 dong rieng le. Nhan dien
       theo hau to ten field (khong theo vi tri) vi thu tu field trong schema
       la Tên/Tên lót/Họ (khac thu tu hien thi mong muon). ── */
    function i90_name_field_role($name) {
        $name = (string) $name;
        $suffixes = array(
            '_first_name' => 'first',
            '_middle_name' => 'middle',
            '_last_name' => 'family',
        );
        foreach ($suffixes as $suf => $role) {
            $len = strlen($suf);
            if (substr($name, -$len) === $suf) {
                return array(substr($name, 0, -$len), $role);
            }
        }
        return null;
    }

    function i90_name_triplet_at($fields, $fi) {
        if (!isset($fields[$fi + 2])) return null;
        $prefix = null;
        $roles = array();
        for ($k = 0; $k < 3; $k++) {
            $f = $fields[$fi + $k];
            if (!is_array($f) || (isset($f['type']) ? $f['type'] : 'text') !== 'text') return null;
            $r = i90_name_field_role(isset($f['name']) ? $f['name'] : '');
            if ($r === null) return null;
            list($p, $role) = $r;
            if ($prefix === null) { $prefix = $p; } elseif ($p !== $prefix) { return null; }
            if (isset($roles[$role])) return null;
            $roles[$role] = $f;
        }
        if (!isset($roles['family']) || !isset($roles['middle']) || !isset($roles['first'])) return null;
        return array('prefix' => $prefix, 'roles' => $roles);
    }

    function i90_name_triplet_value($triplet, $data) {
        $roles = $triplet['roles'];
        $family = i90_txt(isset($data[$roles['family']['name']]) ? $data[$roles['family']['name']] : '');
        $middle = i90_txt(isset($data[$roles['middle']['name']]) ? $data[$roles['middle']['name']] : '');
        $first = i90_txt(isset($data[$roles['first']['name']]) ? $data[$roles['first']['name']] : '');
        return array($family, $middle, $first);
    }

    /* Gop Ho/Ten lot/Ten thanh 1 gia tri nhieu dong (moi phan 1 dong) de in
       trong 1 khoi label/value duy nhat thay vi 3 dong rieng chiem qua
       nhieu chieu cao trang. */
    function i90_name_multiline($family, $middle, $first) {
        $lines = array();
        if ($family !== '') $lines[] = 'Họ: ' . $family;
        if ($middle !== '') $lines[] = 'Tên lót: ' . $middle;
        if ($first !== '') $lines[] = 'Tên: ' . $first;
        return implode("\n", $lines);
    }

    function i90_name_triplet_label($triplet, $group_title = '') {
        if ($group_title !== '') return $group_title;
        $labels = array(
            'legal' => 'Họ và tên (theo giấy tờ)',
            'current_gc' => 'Họ và tên trên thẻ xanh hiện tại',
            'mother' => 'Họ và tên mẹ',
            'father' => 'Họ và tên cha',
        );
        $prefix = $triplet['prefix'];
        return isset($labels[$prefix]) ? $labels[$prefix] : 'Họ và tên';
    }

}

/* ── Load schema (nguon su that cho cac field ma nguoi dung da dien) ── */
$slug = 'i-90';
$schema_path = ICAVIET_DIR . 'forms/' . $slug . '/schema.json';
$schema = array();
if (file_exists($schema_path)) {
    $decoded = json_decode(file_get_contents($schema_path), true);
    if (is_array($decoded)) $schema = $decoded;
}

/* ── Header ── */
$applicant_name = i90_txt(isset($data['applicant_full_name']) ? $data['applicant_full_name'] : '');
$submission_id = isset($data['_id']) ? '#' . (int) $data['_id'] : '';

$pdf->SetFont('DejaVu', 'B', 14);
$pdf->SetFillColor(26, 110, 245);
$pdf->SetTextColor(255, 255, 255);
$pdf->Cell(0, 12, i90_upper('Đơn xin Thay Thế Thẻ Xanh (Mẫu I-90)'), 0, 1, 'C', true);

$pdf->SetFont('DejaVu', '', 9);
$pdf->SetTextColor(90, 96, 110);
$sub = 'Mẫu I-90';
if ($submission_id !== '') $sub .= '   •   Mã hồ sơ ' . $submission_id;
if ($applicant_name !== '') $sub .= '   •   Đương đơn: ' . $applicant_name;
$pdf->Cell(0, 6, $sub, 0, 1, 'L');

$pdf->SetTextColor(0, 0, 0);
$pdf->Ln(3);

/* ── Render toan bo schema (section > group > field) ── */
foreach ((isset($schema['sections']) && is_array($schema['sections'])) ? $schema['sections'] : array() as $section) {
    if (!i90_section_has_data($section, $data)) continue;

    i90_section($pdf, i90_localized(isset($section['title']) ? $section['title'] : ''));

    foreach ((isset($section['groups']) && is_array($section['groups'])) ? $section['groups'] : array() as $group) {
        if (!i90_group_has_data($group, $data)) continue;

        $groupTitle = i90_localized(isset($group['title']) ? $group['title'] : '');
        $fields = (isset($group['fields']) && is_array($group['fields'])) ? array_values($group['fields']) : array();
        $fieldCount = count($fields);

        // Nhom chi gom dung 3 field Ho/Ten lot/Ten hoac Thang/Ngay/Nam (vd
        // legal_name): gop thanh 1 dong duy nhat, dung tieu de nhom lam nhan
        // thay vi in tieu de nhom roi lai in 3 dong rieng le ben duoi.
        if ($fieldCount === 3) {
            $nameOnly = i90_name_triplet_at($fields, 0);
            if ($nameOnly !== null) {
                list($nameOnlyFamily, $nameOnlyMiddle, $nameOnlyFirst) = i90_name_triplet_value($nameOnly, $data);
                $nameOnlyValue = i90_name_multiline($nameOnlyFamily, $nameOnlyMiddle, $nameOnlyFirst);
                if ($nameOnlyValue !== '') {
                    i90_row($pdf, i90_name_triplet_label($nameOnly, $groupTitle), $nameOnlyValue);
                    continue;
                }
            }

            $mdyOnly = i90_mdy_triplet_at($fields, 0);
            if ($mdyOnly !== null) {
                $mdyOnlyValue = i90_mdy_value($mdyOnly, $data);
                if ($mdyOnlyValue !== '') {
                    i90_row($pdf, $groupTitle !== '' ? $groupTitle : i90_mdy_label($mdyOnly), $mdyOnlyValue);
                    continue;
                }
            }
        }

        i90_group($pdf, $groupTitle);

        $fi = 0;
        while ($fi < $fieldCount) {
            $field = $fields[$fi];
            $ftype = isset($field['type']) ? $field['type'] : 'text';

            $nameTriplet = i90_name_triplet_at($fields, $fi);
            if ($nameTriplet !== null) {
                list($tripletFamily, $tripletMiddle, $tripletFirst) = i90_name_triplet_value($nameTriplet, $data);
                $tripletValue = i90_name_multiline($tripletFamily, $tripletMiddle, $tripletFirst);
                if ($tripletValue !== '') {
                    i90_row($pdf, i90_name_triplet_label($nameTriplet), $tripletValue);
                    $fi += 3;
                    continue;
                }
            }

            $mdy = i90_mdy_triplet_at($fields, $fi);
            if ($mdy !== null) {
                $mdyValue = i90_mdy_value($mdy, $data);
                if ($mdyValue !== '') {
                    i90_row($pdf, i90_mdy_label($mdy), $mdyValue);
                    $fi += 3;
                    continue;
                }
            }

            if ($ftype === 'signature' || $ftype === 'info' || i90_field_hidden_in_pdf($field)) {
                $fi++;
                continue;
            }

            $rowA = i90_field_row_data($field, $data);
            if ($rowA === null || $rowA[1] === '') { $fi++; continue; }

            if ($fi + 1 < $fieldCount) {
                $nextField = $fields[$fi + 1];
                $nextType = isset($nextField['type']) ? $nextField['type'] : 'text';
                // Neu field ke tiep la khoi dau cua 1 triplet ten/ngay, KHONG
                // duoc ghep no vao dong hien tai - neu khong fi se nhay qua
                // luon vi tri bat dau triplet o vong lap sau va lam vo hieu
                // logic gop ben tren.
                $nextStartsTriplet = i90_name_triplet_at($fields, $fi + 1) !== null
                    || i90_mdy_triplet_at($fields, $fi + 1) !== null;
                if (!$nextStartsTriplet && !in_array($nextType, array('signature', 'info'), true) && !i90_field_hidden_in_pdf($nextField)) {
                    $rowB = i90_field_row_data($nextField, $data);
                    if ($rowB !== null && $rowB[1] !== '' && i90_is_short($rowA[0], $rowA[1]) && i90_is_short($rowB[0], $rowB[1])) {
                        i90_row_pair($pdf, $rowA[0], $rowA[1], $rowB[0], $rowB[1]);
                        $fi += 2;
                        continue;
                    }
                }
            }

            i90_row($pdf, $rowA[0], $rowA[1]);
            $fi++;
        }
    }
}

/* ── XÁC NHẬN & CHỮ KÝ ── */
i90_section($pdf, 'Xác nhận & Chữ ký');

i90_row($pdf, 'Họ và tên người điền đơn', $applicant_name);

$sig = isset($data['__signature']) ? $data['__signature'] : '';
if ($sig && strpos($sig, 'data:image/png;base64,') === 0) {
    $img_data = base64_decode(str_replace('data:image/png;base64,', '', $sig));
    if ($img_data) {
        $tmp = tempnam(sys_get_temp_dir(), 'sig_') . '.png';
        file_put_contents($tmp, $img_data);
        try {
            i90_ensure_space($pdf, 34);
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

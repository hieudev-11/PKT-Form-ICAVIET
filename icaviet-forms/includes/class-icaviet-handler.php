<?php
if (!defined('ABSPATH'))
    exit;

/**
 * ICAVIET_Handler – lop co so (abstract) cho moi form.
 * Moi form tao 1 lop con ke thua lop nay.
 */
abstract class ICAVIET_Handler
{

    protected $slug;

    public function __construct($slug)
    {
        $this->slug = $slug;

        // Tu dong dang ky vao router khi duoc khoi tao
        ICAVIET_Router::add($slug, get_class($this));
    }

    // ==== Cac method bat buoc phai implement ====

    /** Ten hien thi cua form (dung trong email, admin) */
    abstract public function get_label();

    /** Duong dan tuyet doi toi file PHP template PDF */
    abstract public function get_pdf_template();

    /**
     * Validate du lieu.
     *
     * @param  array $data Du lieu da sanitize
     * @return array Mang errors (rong = hop le)
     */
    abstract public function validate($data);

    /**
     * Duong dan toi file template PDF tieng Viet (optional).
     * Mac dinh tra ve '' – nghia la khong tao PDF VI.
     */
    public function get_pdf_template_vi()
    {
        return '';
    }

    // ==== Helper: kiem tra truong bat buoc ====
    protected function require_fields($data, $fields)
    {
        $errors = array();

        foreach ($fields as $key => $label) {
            if (!isset($data[$key]) || '' === trim((string) $data[$key])) {
                $errors[$key] = $label . ' la bat buoc.';
            }
        }

        return $errors;
    }

    protected function normalize_submitter_name_value($value)
    {
        if (is_array($value) || is_object($value)) {
            return '';
        }

        $value = trim(preg_replace('/\s+/u', ' ', (string) $value));
        if ($value === '') {
            return '';
        }

        $lower = function_exists('mb_strtolower') ? mb_strtolower($value, 'UTF-8') : strtolower($value);
        $ignored = array(
            '-', '--', 'n/a', 'na', 'none', 'null', 'khong', 'không',
            'ho', 'họ', 'ten', 'tên', 'ten lot', 'tên lót',
            'first name', 'middle name', 'last name', 'family name', 'full name',
            'ho va ten', 'họ và tên', 'nguoi nop', 'người nộp'
        );

        if (in_array($lower, $ignored, true)) {
            return '';
        }

        return $value;
    }

    protected function first_submitter_name_value($data, $keys)
    {
        foreach ($keys as $key) {
            if (isset($data[$key])) {
                $value = $this->normalize_submitter_name_value($data[$key]);
                if ($value !== '') {
                    return $value;
                }
            }
        }

        return '';
    }

    protected function join_submitter_name_parts($data, $keys)
    {
        $parts = array();

        foreach ($keys as $key) {
            if (isset($data[$key])) {
                $value = $this->normalize_submitter_name_value($data[$key]);
                if ($value !== '') {
                    $parts[] = $value;
                }
            }
        }

        return !empty($parts) ? implode(' ', $parts) : '';
    }

    protected function get_submitter_name($data)
    {
        if (!is_array($data)) {
            return '';
        }

        // Lay ten dua tren slug truoc vi moi form dang dat key khac nhau.
        // Thu tu ten tra ve theo cach Viet Nam: Ho + Ten lot + Ten.
        $form_rules = array(
            'bao-lanh' => array(
                'direct' => array('tenTrenGiayTo', 'beneficiaryExpectedName', 'nguoiDuocBaoLanhDuKienName', 'tenNguoiDienDon'),
                'groups' => array(
                    array('tenTrenGiayTo_ho', 'tenTrenGiayTo_tenLot', 'tenTrenGiayTo_ten'),
                    array('beneficiaryExpectedName_ho', 'beneficiaryExpectedName_tenLot', 'beneficiaryExpectedName_ten'),
                    array('tenNguoiDienDon_ho', 'tenNguoiDienDon_tenLot', 'tenNguoiDienDon_ten'),
                ),
            ),
            'ndbl' => array(
                'direct' => array('tenTrenGiayTo', 'beneficiary_full_name', 'fullName', 'tenNguoiDienDon'),
                'groups' => array(
                    array('tenTrenGiayTo_ho', 'tenTrenGiayTo_tenLot', 'tenTrenGiayTo_ten'),
                    array('tenNguoiDienDon_ho', 'tenNguoiDienDon_tenLot', 'tenNguoiDienDon_ten'),
                ),
            ),
            'ds-160' => array(
                'direct' => array('fullName', 'declarantFullName', 'applicant_full_name', 'applicantFullName'),
                'groups' => array(
                    array('surname', 'givenName'),
                    array('lastName', 'middleName', 'firstName'),
                ),
            ),
            'ds-260' => array(
                'direct' => array('fullName', 'applicantFullName', 'applicant_full_name'),
                'groups' => array(
                    array('lastName', 'middleName', 'firstName'),
                ),
            ),
            'i-90' => array(
                'direct' => array('full_name', 'applicant_full_name'),
                'groups' => array(
                    array('legal_last_name', 'legal_middle_name', 'legal_first_name'),
                    array('last_name', 'middle_name', 'first_name'),
                ),
            ),
            'i-751' => array(
                'direct' => array('full_name', 'applicant_full_name'),
                'groups' => array(
                    array('last_name', 'middle_name', 'first_name'),
                ),
            ),
            'n-400' => array(
                'direct' => array('full_name', 'applicant_full_name'),
                'groups' => array(
                    array('last_name', 'middle_name', 'first_name'),
                ),
            ),
            'n-600' => array(
                'direct' => array('full_name', 'green_card_full_name', 'applicant_full_name'),
                'groups' => array(
                    array('legal_family_name', 'legal_last_name', 'legal_first_name'),
                    array('legal_last_name', 'legal_middle_name', 'legal_first_name'),
                ),
            ),
            'cong-ham-doc-than' => array(
                'direct' => array('hoVaTen', 'fullName', 'applicant_full_name', 'tenNguoiDienDon'),
                'groups' => array(
                    array('lastName', 'middleName', 'firstName'),
                    array('ho', 'tenLot', 'ten'),
                ),
            ),
            'hop-dong' => array(
                'direct' => array('hoVaTen', 'fullName', 'customer_name', 'applicant_full_name', 'tenNguoiDienDon'),
                'groups' => array(
                    array('lastName', 'middleName', 'firstName'),
                    array('ho', 'tenLot', 'ten'),
                ),
            ),
        );

        if (!empty($this->slug) && isset($form_rules[$this->slug])) {
            $rule = $form_rules[$this->slug];
            $name = $this->first_submitter_name_value($data, isset($rule['direct']) ? $rule['direct'] : array());
            if ($name !== '') {
                return $name;
            }

            if (!empty($rule['groups'])) {
                foreach ($rule['groups'] as $group) {
                    $name = $this->join_submitter_name_parts($data, $group);
                    if ($name !== '') {
                        return $name;
                    }
                }
            }
        }

        // Fallback dung chung cho cac form cu hoac form moi neu co them sau nay.
        $candidate_keys = array(
            'tenTrenGiayTo',
            'beneficiaryExpectedName',
            'beneficiary_full_name',
            'applicant_full_name',
            'applicantFullName',
            'customer_name',
            'fullName',
            'full_name',
            'hoVaTen',
            'hoTen',
            'hoTenThuongDung',
            'hoTenKhaisinh',
            'tenNguoiDienDon',
            'declarantFullName',
            'legal_name',
            'green_card_full_name',
            'q59_tenDy',
        );

        $name = $this->first_submitter_name_value($data, $candidate_keys);
        if ($name !== '') {
            return $name;
        }

        $name_groups = array(
            array('tenTrenGiayTo_ho', 'tenTrenGiayTo_tenLot', 'tenTrenGiayTo_ten'),
            array('beneficiaryExpectedName_ho', 'beneficiaryExpectedName_tenLot', 'beneficiaryExpectedName_ten'),
            array('tenNguoiDienDon_ho', 'tenNguoiDienDon_tenLot', 'tenNguoiDienDon_ten'),
            array('lastName', 'middleName', 'firstName'),
            array('last_name', 'middle_name', 'first_name'),
            array('legal_last_name', 'legal_middle_name', 'legal_first_name'),
            array('legal_family_name', 'legal_last_name', 'legal_first_name'),
            array('surname', 'givenName'),
            array('ho', 'tenLot', 'ten'),
        );

        foreach ($name_groups as $group) {
            $name = $this->join_submitter_name_parts($data, $group);
            if ($name !== '') {
                return $name;
            }
        }

        return '';
    }

    protected function get_request_ip()
    {
        if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $forwarded = explode(',', (string) $_SERVER['HTTP_X_FORWARDED_FOR']);
            $ip = trim($forwarded[0]);
            if ($ip !== '') {
                return $ip;
            }
        }

        if (!empty($_SERVER['REMOTE_ADDR'])) {
            return sanitize_text_field((string) $_SERVER['REMOTE_ADDR']);
        }

        return '';
    }

    // ==== Pipeline xu ly chinh ====
    public function process(WP_REST_Request $request)
    {

        // 1. Lay du lieu tu request
        $body = $request->get_json_params();
        if (empty($body)) {
            $body = $request->get_body_params();
        }

        if (empty($body) || !is_array($body)) {
            return new WP_REST_Response(
                array(
                    'success' => false,
                    'message' => 'Khong co du lieu.',
                ),
                400
            );
        }

        // 2. Tach signature truoc khi sanitize (giu nguyen base64)
        $signature = '';
        if (!empty($body['signaturePng'])) {
            $signature = $body['signaturePng'];
        } elseif (!empty($body['signatureData'])) {
            $signature = $body['signatureData'];
        } elseif (!empty($body['applicant_signature'])) {
            $signature = $body['applicant_signature'];
        } elseif (!empty($body['__sig'])) {
            $signature = $body['__sig'];
        }

        // 3. Sanitize
        $data = $this->sanitize_array($body);

        // Neu request gui form_data tu Vue (khi nhung Vue app)
        if (isset($data['form_data']) && is_array($data['form_data'])) {
            $form_data = $data['form_data'];
            unset($data['form_data']);
            $data = array_merge($form_data, $data);
        }

        // Tra signature goc vao
        if ($signature) {
            $data['signaturePng'] = $signature;
            $data['__signature'] = $signature; // Cho pdf.php (template cu dung __signature)
        }

        // Bao-lanh/NDBL: giao dien da tach dia chi/noi sinh thanh nhieu o,
        // nhung gia tri v-model cu van la chuoi ghep. Tao them cac field tach rieng
        // de admin xem chi tiet va ben PKT/I-130 mapping chinh xac hon.
        if (in_array($this->slug, array('bao-lanh', 'ndbl'), true)) {
            $data = $this->enrich_location_parts($data);
        }

        // 4. Validate
        $errors = $this->validate($data);
        if (!empty($errors)) {
            return new WP_REST_Response(
                array(
                    'success' => false,
                    'errors' => $errors,
                ),
                422
            );
        }

        // 5. Luu DB
        $ip = $this->get_request_ip();
        $id = ICAVIET_DB::save($this->slug, $data, $ip);

        if (!$id) {
            return new WP_REST_Response(
                array(
                    'success' => false,
                    'message' => 'Loi luu du lieu. Vui long thu lai.',
                ),
                500
            );
        }

        // 6. Tao PDF English + luu file
        $pdf_data = $data;
        $pdf_data['_id'] = $id;

        $pdf_path = '';
        $pdf_path_vi = '';

        try {
            $pdf_bytes = ICAVIET_PDF::generate(
                $pdf_data,
                $this->get_pdf_template(),
                $this->get_label()
            );

            if (!empty($pdf_bytes)) {
                $pdf_path = ICAVIET_PDF::save_file($pdf_bytes, $this->slug, $id, 'en');

                if (!empty($pdf_path)) {
                    ICAVIET_DB::update_pdf_path($id, $pdf_path);
                }
            }
        } catch (\Throwable $e) {
            error_log('[ICAVIET] PDF EN error #' . $id . ': ' . $e->getMessage());
        }

        // 6b. Tao PDF tieng Viet (neu co template)
        $vi_template = $this->get_pdf_template_vi();
        if (!empty($vi_template) && file_exists($vi_template)) {
            try {
                $pdf_bytes_vi = ICAVIET_PDF::generate(
                    $pdf_data,
                    $vi_template,
                    $this->get_label() . ' (VI)'
                );

                if (!empty($pdf_bytes_vi)) {
                    $pdf_path_vi = ICAVIET_PDF::save_file($pdf_bytes_vi, $this->slug, $id, 'vi');

                    if (!empty($pdf_path_vi)) {
                        ICAVIET_DB::update_pdf_path_vi($id, $pdf_path_vi);
                    }
                }
            } catch (\Throwable $e) {
                error_log('[ICAVIET] PDF VI error #' . $id . ': ' . $e->getMessage());
            }
        }

        // 7. Gui email admin (2 mail, noi dung la link PDF)
        try {
            $name = $this->get_submitter_name($data);
            $pdf_url = ICAVIET_Router::get_public_pdf_url($id, 'en');
            $pdf_url_vi = !empty($pdf_path_vi) ? ICAVIET_Router::get_public_pdf_url($id, 'vi') : '';
            $view_url = admin_url('admin.php?page=ICAVIET-forms&action=view&id=' . (int) $id);

            ICAVIET_Mailer::send_admin(
                $this->get_label(),
                $name,
                $id,
                $pdf_url,
                $view_url,
                $pdf_url_vi
            );
        } catch (\Throwable $e) {
            error_log('[ICAVIET] Mail error #' . $id . ': ' . $e->getMessage());
        }

        return new WP_REST_Response(
            array(
                'success' => true,
                'id' => $id,
                'message' => 'Cam on ban da gui thong tin. Chung toi se lien he som!',
            ),
            200
        );
    }

    // ==== Sanitize de quy ====

    /**
     * Tao them field tach rieng cho cac truong dia chi/noi sinh.
     * - Dia chi: Street/City/Province/Zip/Country + Parts
     * - Noi sinh: City/Province/Country + Parts
     * Giu nguyen field goc de khong lam hong PDF/template/code cu.
     */
    protected function enrich_location_parts($data)
    {
        if (!is_array($data)) {
            return $data;
        }

        foreach ($data as $key => $value) {
            if (is_array($value)) {
                $data[$key] = $this->enrich_location_parts($value);
                continue;
            }

            if (!is_string($value) || trim($value) === '') {
                continue;
            }

            $key_text = strtolower((string) $key);
            $is_birth_place = in_array($key, array('noiSinh', 'noiKetHon'), true)
                || false !== strpos($key_text, 'birthplace')
                || false !== strpos($key_text, 'placebirth');

            $is_address = false !== strpos($key, 'diaChi')
                || false !== strpos($key_text, 'address');

            if ($is_birth_place) {
                $parts = $this->split_place_birth_value($value);
                $data[$key . 'Parts'] = $parts;
                $data[$key . 'City'] = $parts['city'];
                $data[$key . 'Province'] = $parts['province'];
                $data[$key . 'Country'] = $parts['country'];
            } elseif ($is_address) {
                $parts = $this->split_address_value($value);
                $data[$key . 'Parts'] = $parts;
                $data[$key . 'Street'] = $parts['street'];
                $data[$key . 'City'] = $parts['city'];
                $data[$key . 'Province'] = $parts['province'];
                $data[$key . 'Zip'] = $parts['zip'];
                $data[$key . 'Country'] = $parts['country'];
            }
        }

        return $data;
    }

    protected function split_address_value($value)
    {
        $parts = $this->split_csv_like_value($value);

        $street = '';
        $city = '';
        $province = '';
        $zip = '';
        $country = '';

        if (count($parts) >= 5) {
            $country = array_pop($parts);
            $zip = array_pop($parts);
            $province = array_pop($parts);
            $city = array_pop($parts);
            $street = implode(', ', $parts);
        } elseif (count($parts) === 4) {
            $street = $parts[0];
            $city = $parts[1];
            $province = $parts[2];
            if ($this->looks_like_zip($parts[3])) {
                $zip = $parts[3];
            } else {
                $country = $parts[3];
            }
        } elseif (count($parts) === 3) {
            $street = $parts[0];
            $city = $parts[1];
            $province = $parts[2];
        } elseif (count($parts) === 2) {
            $street = $parts[0];
            $city = $parts[1];
        } elseif (count($parts) === 1) {
            $street = $parts[0];
        }

        return array(
            'street' => $street,
            'city' => $city,
            'province' => $province,
            'zip' => $zip,
            'country' => $country,
        );
    }

    protected function split_place_birth_value($value)
    {
        $parts = $this->split_csv_like_value($value);

        $city = '';
        $province = '';
        $country = '';

        if (count($parts) >= 3) {
            $country = array_pop($parts);
            $province = array_pop($parts);
            $city = implode(', ', $parts);
        } elseif (count($parts) === 2) {
            $city = $parts[0];
            $province = $parts[1];
        } elseif (count($parts) === 1) {
            $city = $parts[0];
        }

        return array(
            'city' => $city,
            'province' => $province,
            'country' => $country,
        );
    }

    protected function split_csv_like_value($value)
    {
        $raw = explode(',', (string) $value);
        $parts = array();

        foreach ($raw as $part) {
            $part = trim($part);
            if ($part !== '') {
                $parts[] = $part;
            }
        }

        return $parts;
    }

    protected function looks_like_zip($value)
    {
        $value = trim((string) $value);
        return $value !== '' && (bool) preg_match('/^(?=.*\d)[A-Za-z0-9][A-Za-z0-9\s-]{2,12}$/', $value);
    }

    protected function sanitize_array($data)
    {
        if (is_array($data)) {
            $result = array();

            foreach ($data as $k => $v) {
                $result[$k] = $this->sanitize_array($v);
            }

            return $result;
        }

        if (is_string($data)) {
            return sanitize_text_field($data);
        }

        return $data;
    }

    public function get_slug()
    {
        return $this->slug;
    }
}
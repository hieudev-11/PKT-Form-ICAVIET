<?php
if (!defined('ABSPATH'))
    exit;

class ICAVIET_SYLL extends ICAVIET_Handler
{

    public function __construct()
    {
        parent::__construct('n-400');
    }

    public function get_label()
    {
        return 'Thong Tin Nhap Tich My (N-400)';
    }

    public function get_pdf_template()
    {
        return ICAVIET_DIR . 'forms/n-400/pdf.php';
    }

    protected function sanitize_array($array)
    {
        $data = parent::sanitize_array($array);

        // Map English keys from schema.json to Vietnamese keys for PDF and DB
        $map = [
            'last_name' => 'ho_hop_phap',
            'first_name' => 'ten_hop_phap',
            'middle_name' => 'ten_lot_hop_phap',
            'date_of_birth' => 'ngay_sinh',
            'lpr_date' => 'ngay_thuong_tru',
            'phone' => 'dien_thoai',
            'has_additional_phone' => 'co_so_dien_thoai_khac',
            'additional_phone_numbers' => 'so_dien_thoai_khac',
            'birth_province' => 'noi_sinh_tinh',
            'birth_country' => 'noi_sinh_quoc_gia',
            'address_us' => 'dia_chi_my',
            'applicant_age_status' => 'dien_nop_don',
            'applicant_full_name' => 'ten_nguoi_dien',
            'signature_date' => 'ngay_ky',
            'gender' => 'gioi_tinh',
            'is_hispanic_latino' => 'dan_toc_my_latinh',
            'race' => 'chung_toc',
            'ssn' => 'ssn',
            'uscis_online_account_number' => 'so_tai_khoan_uscis_online',
            'a_number' => 'a_number',
            'current_spouse_citizenship_method' => 'sp_cach_tro_thanh_cong_dan_my',
            'current_spouse_citizenship_date' => 'sp_ngay_tro_thanh_cong_dan_my',
            'current_spouse_alien_number' => 'sp_a_number',
            'current_spouse_marriage_count' => 'sp_so_lan_ket_hon',
            'current_spouse_same_address' => 'sp_dia_chi_giong_duong_don',
            'current_spouse_current_residence' => 'sp_dia_chi',
            'has_foreign_hereditary_title' => 'co_tuoc_hieu_cha_truyen_con_noi',            'willing_to_renounce_foreign_titles' => 'san_sang_tu_bo_tuoc_hieu',
            'foreign_titles_to_renounce' => 'danh_sach_tuoc_hieu_tu_bo',
            'claimed_us_citizen' => 'tu_nhan_cong_dan_my',
            'claimed_us_citizen_explanation' => 'giai_thich_tu_nhan_cong_dan_my',
            'registered_voted_us' => 'dang_ky_bau_cu_my',
            'registered_voted_us_explanation' => 'giai_thich_dang_ky_bau_cu_my',
            'legally_incompetent' => 'mat_nang_luc_phap_ly',
            'legally_incompetent_explanation' => 'giai_thich_mat_nang_luc_phap_ly',
            'filed_taxes_late' => 'dong_thue_qua_han',
            'filed_taxes_late_explanation' => 'giai_thich_dong_thue_qua_han',
            'non_resident_tax_since_lpr' => 'khai_khong_cu_tru_my_sau_khi_thanh_thuong_tru_nhan',
            'non_resident_tax_since_lpr_explanation' => 'giai_thich_khai_khong_cu_tru_my_sau_khi_thanh_thuong_tru_nhan',
            'served_prison' => 'phuc_vu_trong_nha_tu',
            'served_prison_explanation' => 'giai_thich_phuc_vu_trong_nha_tu',
            'military_training' => 'huan_luyen_quan_su',
            'military_training_explanation' => 'giai_thich_huan_luyen_quan_su',
            'arrested_detained' => 'bi_bat_giu_phat_giam_giu',
            'arrested_detained_explanation' => 'giai_thich_bi_bat_giu_phat_giam_giu',
            'male_lived_us_18_26' => 'nam_song_o_my_18_26',
            'selective_service_registered' => 'da_dang_ky_selective_service',
            'ever_served_us_military' => 'da_tung_phuc_vu_quan_doi_my',
            'military_registration_date' => 'ngay_dang_ky_selective_service',
            'military_registration_number' => 'so_dang_ky_selective_service',
            'education_5year' => 'lich_su_hoc_van'
        ];

        // Map ca tu form_data wrapper lan top-level
        foreach ($map as $en => $vi) {
            if (isset($data['form_data'][$en]) && !isset($data['form_data'][$vi])) {
                $data['form_data'][$vi] = $data['form_data'][$en];
            }
            if (isset($data[$en]) && !isset($data[$vi])) {
                $data[$vi] = $data[$en];
            }
        }

        // Chuan hoa danh sach con tu Vue (children_info_list) hoac form PHP cu (__ch)
        // sang key __children de PDF va admin doc duoc cung mot format.
        $data = $this->normalize_children_payload($data);
        if (isset($data['form_data']) && is_array($data['form_data'])) {
            $data['form_data'] = $this->normalize_children_payload($data['form_data']);
        }
        
        return $data;
    }


    protected function get_child_living_location_label($value)
    {
        $labels = array(
            'with_me' => 'Song cung toi',
            'not_with_me' => 'Khong song cung toi',
            'unknown_missing' => 'Khong biet/that lac',
        );

        return isset($labels[$value]) ? $labels[$value] : $value;
    }

    protected function normalize_children_payload($data)
    {
        if (!is_array($data)) {
            return $data;
        }

        $children_source = array();
        if (isset($data['children_info_list']) && is_array($data['children_info_list'])) {
            $children_source = $data['children_info_list'];
        } elseif (isset($data['__ch']) && is_array($data['__ch'])) {
            $children_source = $data['__ch'];
        }

        if (empty($children_source)) {
            return $data;
        }

        $children = array();
        foreach ($children_source as $child) {
            if (!is_array($child)) {
                continue;
            }

            $living_location = isset($child['childLivingLocation']) ? $child['childLivingLocation'] : (isset($child['song']) ? $child['song'] : '');

            $children[] = array(
                'ho' => isset($child['lastName']) ? $child['lastName'] : (isset($child['ho']) ? $child['ho'] : ''),
                'ten' => isset($child['firstName']) ? $child['firstName'] : (isset($child['ten']) ? $child['ten'] : ''),
                'ten_lot' => isset($child['middleName']) ? $child['middleName'] : (isset($child['tl']) ? $child['tl'] : ''),
                'ngay_sinh' => isset($child['birthDate']) ? $child['birthDate'] : (isset($child['ns']) ? $child['ns'] : ''),
                'noi_sinh' => isset($child['birthPlace']) ? $child['birthPlace'] : (isset($child['nsi']) ? $child['nsi'] : ''),
                'quan_he' => isset($child['relationship']) ? $child['relationship'] : (isset($child['qh']) ? $child['qh'] : ''),
                'a_number' => isset($child['aNumber']) ? $child['aNumber'] : (isset($child['an']) ? $child['an'] : ''),
                'noi_song' => $this->get_child_living_location_label($living_location),
                'noi_song_value' => $living_location,
                'chu_cap' => isset($child['providingSupport']) ? $child['providingSupport'] : '',
            );
        }

        $data['__children'] = $children;
        if (!isset($data['tong_so_con']) && isset($data['children_count'])) {
            $data['tong_so_con'] = $data['children_count'];
        }

        return $data;
    }

    public function validate($data)
    {
        // Dung EN keys (khop voi schema.json va frontend renderer)
        $errors = $this->require_fields($data, array(
            'first_name' => 'Ten (ten hop phap)',
            'last_name' => 'Ho (ten hop phap)',
            'date_of_birth' => 'Ngay sinh',
            'phone' => 'So dien thoai',
            'birth_province' => 'Tinh/thanh pho noi sinh',
            'birth_country' => 'Quoc gia noi sinh',
            'address_us' => 'Dia chi tai My',
            'applicant_full_name' => 'Ho va ten nguoi dien',
        ));

        // Bat buoc co SSN hoac A-Number
        $has_ssn = !empty(trim($data['ssn'] ?? ''));
        $has_anum = !empty(trim($data['a_number'] ?? ''));
        if (!$has_ssn && !$has_anum) {
            $errors['ssn'] = 'Can nhap so SSN hoac so A (A-Number).';
        }

        // Validate so dien thoai
        if (!empty($data['phone'])) {
            $phone = preg_replace('/[\s\-\(\)\+]/', '', $data['phone']);
            if (!preg_match('/^\d{7,15}$/', $phone)) {
                $errors['phone'] = 'So dien thoai khong hop le.';
            }
        }

        // Current spouse citizenship method/date is optional.

        if (($data['has_additional_phone'] ?? '') === 'yes') {
            $additional_phones = $data['additional_phone_numbers'] ?? array();
            if (!is_array($additional_phones)) {
                $additional_phones = array($additional_phones);
            }
            $additional_phones = array_values(array_filter(array_map('trim', $additional_phones)));

            if (empty($additional_phones)) {
                $errors['additional_phone_numbers'] = 'Vui long nhap so dien thoai khac hoac chon Khong.';
            }

            foreach ($additional_phones as $index => $additional_phone) {
                $phone = preg_replace('/[\s\-\(\)\+]/', '', $additional_phone);
                if (!preg_match('/^\d{7,15}$/', $phone)) {
                    $errors['additional_phone_numbers_' . $index] = 'So dien thoai khac khong hop le.';
                }
            }
        }

        return $errors;
    }
}

new ICAVIET_SYLL();

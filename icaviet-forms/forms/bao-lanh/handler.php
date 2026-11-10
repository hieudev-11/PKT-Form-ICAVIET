<?php
/**
 * Handler cho Danh muc Bao Lanh
 * Gom nhieu form con: hon phu/hon the, vo chong, con cai...
 */

if (!defined('ABSPATH')) {
    exit;
}

class ICAVIET_BaoLanh extends ICAVIET_Handler
{
    /**
     * Khoi tao class va dang ky slug bao-lanh vao router.
     */
    public function __construct()
    {
        parent::__construct('bao-lanh');
    }

    /**
     * Lay ten form.
     *
     * @return string
     */
    public function get_label()
    {
        return __('Mở hồ sơ bảo lãnh', 'icaviet-forms');
    }

    /**
     * Validate du lieu form.
     *
     * @param array $data Du lieu nguoi dung gui len.
     * @return array Mang chua loi. Rong nghia la hop le.
     */
    public function validate($data)
    {
        $errors = array();

        if (!is_array($data)) {
            $errors['form'] = __('Dữ liệu gửi lên không hợp lệ.', 'icaviet-forms');
            return $errors;
        }

        $candidate_keys = array(
            'applicant_full_name',
            'tenNguoiDienDon',
            'q59_tenDy',
            'hoVaTen',
            'tenTrenGiayTo',
            'beneficiary_full_name',
        );

        $has_name = false;

        foreach ($candidate_keys as $key) {
            if (isset($data[$key]) && trim((string) $data[$key]) !== '') {
                $has_name = true;
                break;
            }
        }

        if (!$has_name) {
            $errors['applicant_full_name'] = __('Vui lòng nhập họ và tên người điền đơn.', 'icaviet-forms');
        }

        return $errors;
    }

    /**
     * Lay duong dan toi file template PDF dang PHP.
     *
     * @return string
     */
    public function get_pdf_template()
    {
        return ICAVIET_DIR . 'forms/bao-lanh/pdf.php';
    }
}

new ICAVIET_BaoLanh();

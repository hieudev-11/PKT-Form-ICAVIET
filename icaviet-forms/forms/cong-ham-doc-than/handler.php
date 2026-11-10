<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class ICAVIET_CHDT extends ICAVIET_Handler {

    public function __construct() {
        parent::__construct( 'cong-ham-doc-than' );
    }

    public function get_label() {
        return 'Cong Ham Doc Than';
    }

    public function get_pdf_template() {
        return ICAVIET_DIR . 'forms/cong-ham-doc-than/pdf.php';
    }

    public function validate( $data ) {
        // Kiem tra cac truong bat buoc
        $errors = $this->require_fields( $data, array(
            'hoVaTen'     => 'Ho va ten',
            'noiSinh'     => 'Noi sinh',
            'danToc'      => 'Dan toc',
            'queQuan'     => 'Que quan',
            'soDienThoai' => 'So dien thoai',
            'ssn'         => 'So an sinh xa hoi SSN',
            'diaChiCuTru' => 'Dia chi cu tru hien tai',
            'ngheNghiep'  => 'Nghe nghiep',
            'noiLamViec'  => 'Noi lam viec',
        ) );

        // Validate so dien thoai
        if ( ! empty( $data['soDienThoai'] ) ) {
            $phone = preg_replace( '/[\s\-\(\)\+]/', '', $data['soDienThoai'] );
            if ( ! preg_match( '/^\d{7,15}$/', $phone ) ) {
                $errors['soDienThoai'] = 'So dien thoai khong hop le.';
            }
        }

        return $errors;
    }
}

// Khoi tao ngay khi load file – tu dong dang ky vao router
new ICAVIET_CHDT();

<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class ICAVIET_I751 extends ICAVIET_Handler {

    public function __construct() {
        parent::__construct( 'i-751' );
    }

    public function get_label() {
        return 'Form I-751 (Thao go dieu kien the xanh)';
    }

    public function get_pdf_template() {
        // Có thể bổ sung đường dẫn PDF khi có file pdf.php sau
        return ICAVIET_DIR . 'forms/i-751/pdf.php';
    }

    public function validate( $data ) {
        $errors = array();

        // 1. Kiểm tra field chung (Full name, Signature)
        if ( empty( $data['applicant_full_name'] ) && empty( $data['customer_name'] ) ) {
            $errors['applicant_full_name'] = 'The applicant_full_name field is required.';
        }
        
        if ( empty( $data['applicant_signature'] ) ) {
            $errors['applicant_signature'] = 'The applicant_signature field is required.';
        }

        return $errors;
    }
}

new ICAVIET_I751();

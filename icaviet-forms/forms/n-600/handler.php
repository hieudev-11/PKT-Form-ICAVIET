<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class ICAVIET_N600 extends ICAVIET_Handler {

    public function __construct() {
        parent::__construct( 'n-600' );
    }

    public function get_label() {
        return 'Don Xin Cap Giay Chung Nhan Quoc Tich (N-600)';
    }

    public function get_pdf_template() {
        return ICAVIET_DIR . 'forms/n-600/pdf.php';
    }

    public function validate( $data ) {
        // The Vue frontend already validates. 
        // We do minimal backend validation here.
        $errors = array();

        if ( empty( $data['applicant_full_name'] ) && empty( $data['customer_name'] ) ) {
            $errors['applicant_full_name'] = 'Ho va ten la bat buoc.';
        }

        return $errors;
    }
}

new ICAVIET_N600();

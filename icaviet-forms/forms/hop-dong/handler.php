<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class ICAVIET_HopDong extends ICAVIET_Handler {

    public function __construct() {
        parent::__construct( 'hop-dong' );
    }

    public function get_label() {
        return 'Hop Dong Dich Vu Tu Van Di Tru';
    }

    public function get_pdf_template() {
        return ICAVIET_DIR . 'forms/hop-dong/pdf.php';
    }

    public function get_pdf_template_vi() {
        return ICAVIET_DIR . 'forms/hop-dong/pdf-vi.php';
    }

    public function validate( $data ) {
        $errors = $this->require_fields( $data, array(
            'hoVaTen'       => 'Ho va Ten',
            'soDienThoai'   => 'So Dien Thoai',
            'giaTriHopDong' => 'Gia Tri Hop Dong',
            'ngayKy'        => 'Ngay Ky',
        ) );

        // Validate phone
        if ( ! empty( $data['soDienThoai'] ) ) {
            $phone = preg_replace( '/[\s\-\(\)\+]/', '', $data['soDienThoai'] );
            if ( ! preg_match( '/^\d{7,15}$/', $phone ) ) {
                $errors['soDienThoai'] = 'So dien thoai khong hop le.';
            }
        }

        // Validate giá trị hợp đồng >= 0
        if ( isset( $data['giaTriHopDong'] ) && ( ! is_numeric( $data['giaTriHopDong'] ) || (float) $data['giaTriHopDong'] < 0 ) ) {
            $errors['giaTriHopDong'] = 'Gia tri hop dong khong hop le.';
        }

        return $errors;
    }

    protected function get_submitter_name( $data ) {
        return ! empty( $data['hoVaTen'] ) ? trim( (string) $data['hoVaTen'] ) : '';
    }
}

new ICAVIET_HopDong();

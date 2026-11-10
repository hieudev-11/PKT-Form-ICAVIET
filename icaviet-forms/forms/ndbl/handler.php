<?php
/**
 * Handler cho form Người Được Bảo Lãnh (NDBL)
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly
}

class ICAVIET_NDBL extends ICAVIET_Handler {

    /**
     * Khởi tạo class
     */
    public function __construct() {
        parent::__construct( 'ndbl' );
    }

    /**
     * Lấy tên form
     *
     * @return string
     */
    public function get_label() {
        return __( 'Người Được Bảo Lãnh', 'icaviet-forms' );
    }

    /**
     * Validate dữ liệu form
     * 
     * @param array $data Dữ liệu người dùng gửi lên
     * @return array Mảng chứa các lỗi nếu có, rỗng nếu hợp lệ
     */
    public function validate( $data ) {
        $errors = array();

        if ( empty( $data['tenNguoiDienDon'] ) ) {
            $errors['tenNguoiDienDon'] = __( 'Vui lòng nhập họ và tên người điền đơn.', 'icaviet-forms' );
        }

        return $errors;
    }

    /**
     * Lấy đường dẫn tới file template PDF
     *
     * @return string
     */
    public function get_pdf_template() {
        return dirname( __FILE__ ) . '/pdf.php';
    }

}

new ICAVIET_NDBL();

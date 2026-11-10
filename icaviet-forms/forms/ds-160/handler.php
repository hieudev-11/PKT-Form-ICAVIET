<?php
/**
 * Handler cho Form DS-160
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly
}

class ICAVIET_DS160 extends ICAVIET_Handler {

    /**
     * Khởi tạo class
     */
    public function __construct() {
        parent::__construct( 'ds-160' );
    }

    /**
     * Lấy tên form (bắt buộc theo abstract class)
     *
     * @return string
     */
    public function get_label() {
        return __( 'Form DS-160', 'icaviet-forms' );
    }

    /**
     * Validate dữ liệu form (bắt buộc theo abstract class)
     * 
     * @param array $data Dữ liệu người dùng gửi lên
     * @return array Mảng chứa các lỗi nếu có, rỗng nếu hợp lệ
     */
    public function validate( $data ) {
        $errors = array();

        // Validate các trường bắt buộc
        if ( empty( $data['purposeApp'] ) ) {
            $errors['purposeApp'] = __( 'Vui lòng chọn mục đích điền đơn.', 'icaviet-forms' );
        }
        
        if ( empty( $data['fullName'] ) ) {
            $errors['fullName'] = __( 'Vui lòng nhập họ và tên.', 'icaviet-forms' );
        }

        if ( empty( $data['gender'] ) ) {
            $errors['gender'] = __( 'Vui lòng chọn giới tính.', 'icaviet-forms' );
        }

        if ( empty( $data['birthDate'] ) ) {
            $errors['birthDate'] = __( 'Vui lòng nhập ngày sinh.', 'icaviet-forms' );
        }

        if ( empty( $data['idNumber'] ) ) {
            $errors['idNumber'] = __( 'Vui lòng nhập số CMND / CCCD.', 'icaviet-forms' );
        }

        if ( empty( $data['passportNumberVN'] ) ) {
            $errors['passportNumberVN'] = __( 'Vui lòng nhập số Passport Việt Nam.', 'icaviet-forms' );
        }
        
        if ( empty( $data['declarantFullName'] ) ) {
            $errors['declarantFullName'] = __( 'Vui lòng nhập họ và tên người ký.', 'icaviet-forms' );
        }

        if ( empty( $data['declarantSignature'] ) ) {
            $errors['declarantSignature'] = __( 'Vui lòng ký xác nhận.', 'icaviet-forms' );
        }

        return $errors;
    }

    /**
     * Lấy đường dẫn tới file template PDF (bắt buộc theo abstract class)
     *
     * @return string
     */
    public function get_pdf_template() {
        return dirname( __FILE__ ) . '/pdf.php';
    }

}

new ICAVIET_DS160();

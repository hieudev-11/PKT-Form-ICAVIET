<?php
/**
 * Handler cho Form DS-260
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly
}

class ICAVIET_DS260 extends ICAVIET_Handler {

    /**
     * Khởi tạo class
     */
    public function __construct() {
        parent::__construct( 'ds-260' );
    }

    /**
     * Lấy tên form (bắt buộc theo abstract class)
     *
     * @return string
     */
    public function get_label() {
        return __( 'Form DS-260', 'icaviet-forms' );
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
        if ( empty( $data['lastName'] ) ) {
            $errors['lastName'] = __( 'Vui lòng nhập họ.', 'icaviet-forms' );
        }

        if ( empty( $data['firstName'] ) ) {
            $errors['firstName'] = __( 'Vui lòng nhập tên.', 'icaviet-forms' );
        }

        if ( empty( $data['gender'] ) ) {
            $errors['gender'] = __( 'Vui lòng chọn giới tính.', 'icaviet-forms' );
        }

        if ( empty( $data['birthDate'] ) ) {
            $errors['birthDate'] = __( 'Vui lòng nhập ngày sinh.', 'icaviet-forms' );
        }

        if ( empty( $data['birthPlace'] ) ) {
            $errors['birthPlace'] = __( 'Vui lòng nhập nơi sinh.', 'icaviet-forms' );
        }

        if ( empty( $data['maritalStatus'] ) ) {
            $errors['maritalStatus'] = __( 'Vui lòng chọn tình trạng hôn nhân.', 'icaviet-forms' );
        }

        if ( empty( $data['primaryPhone'] ) ) {
            $errors['primaryPhone'] = __( 'Vui lòng nhập số điện thoại.', 'icaviet-forms' );
        }

        if ( empty( $data['primaryEmail'] ) ) {
            $errors['primaryEmail'] = __( 'Vui lòng nhập email.', 'icaviet-forms' );
        }

        // Dia chi hien tai trong DS-260 hien dang tach thanh nhieu o rieng.
        // Cac o dia chi van hien dau * do tren giao dien de nguoi dung chu y,
        // nhung backend chi bat buoc field quoc gia. Cac phan con lai khong bat buoc.
        if ( empty( $data['currentAddressVNCountry'] ) ) {
            $errors['currentAddressVN'] = __( 'Vui lòng nhập Quốc gia trong phần địa chỉ hiện tại.', 'icaviet-forms' );
        }
        
        if ( empty( $data['applicantFullName'] ) ) {
            $errors['applicantFullName'] = __( 'Vui lòng nhập họ và tên người ký.', 'icaviet-forms' );
        }

        if ( empty( $data['applicantSignature'] ) ) {
            $errors['applicantSignature'] = __( 'Vui lòng ký xác nhận.', 'icaviet-forms' );
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

new ICAVIET_DS260();


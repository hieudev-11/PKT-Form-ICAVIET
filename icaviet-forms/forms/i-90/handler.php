<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class ICAVIET_I90 extends ICAVIET_Handler {

    public function __construct() {
        parent::__construct( 'i-90' );
    }

    public function get_label() {
        return 'Don Xin Thay The The Xanh (I-90)';
    }

    public function get_pdf_template() {
        return ICAVIET_DIR . 'forms/i-90/pdf.php';
    }

    public function validate( $data ) {
        $errors = array();

        // 1. Legal Name
        if ( empty( $data['legal_first_name'] ) ) $errors['legal_first_name'] = 'Tên là bắt buộc.';
        if ( empty( $data['legal_middle_name'] ) ) $errors['legal_middle_name'] = 'Tên lót là bắt buộc.';
        if ( empty( $data['legal_last_name'] ) ) $errors['legal_last_name'] = 'Họ là bắt buộc.';

        // 2. Name Change
        if ( empty( $data['has_name_changed_since_green_card'] ) ) {
            $errors['has_name_changed_since_green_card'] = 'Vui lòng trả lời câu hỏi đổi tên.';
        } elseif ( $data['has_name_changed_since_green_card'] === 'Có' ) {
            if ( empty( $data['current_gc_first_name'] ) ) $errors['current_gc_first_name'] = 'Tên trên thẻ xanh hiện tại là bắt buộc.';
            if ( empty( $data['current_gc_middle_name'] ) ) $errors['current_gc_middle_name'] = 'Tên lót trên thẻ xanh hiện tại là bắt buộc.';
            if ( empty( $data['current_gc_last_name'] ) ) $errors['current_gc_last_name'] = 'Họ trên thẻ xanh hiện tại là bắt buộc.';
        }

        // 3. Gender
        if ( empty( $data['gender'] ) ) $errors['gender'] = 'Giới tính là bắt buộc.';

        // 4. DOB
        if ( empty( $data['date_of_birth_month'] ) || empty( $data['date_of_birth_day'] ) || empty( $data['date_of_birth_year'] ) ) {
            $errors['date_of_birth_month'] = 'Ngày sinh đầy đủ là bắt buộc.';
        }

        // 5. Place of Birth
        if ( empty( $data['place_of_birth_city'] ) ) $errors['place_of_birth_city'] = 'Huyện/Thành phố sinh là bắt buộc.';
        if ( empty( $data['place_of_birth_province'] ) ) $errors['place_of_birth_province'] = 'Tỉnh sinh là bắt buộc.';
        if ( empty( $data['place_of_birth_country'] ) ) $errors['place_of_birth_country'] = 'Quốc gia sinh là bắt buộc.';

        // 6. Country of Citizenship
        if ( empty( $data['citizenship_country'] ) ) $errors['citizenship_country'] = 'Quốc tịch là bắt buộc.';

        // 7. Contact info
        if ( empty( $data['phone_primary'] ) ) {
            $errors['phone_primary'] = 'Số điện thoại chính là bắt buộc.';
        } elseif ( ! preg_match( '/^[0-9]+$/', (string) $data['phone_primary'] ) ) {
            $errors['phone_primary'] = 'Số điện thoại chính chỉ được nhập số, không nhập chữ hoặc ký tự.';
        }
        if ( ! empty( $data['phone_secondary'] ) && ! preg_match( '/^[0-9]+$/', (string) $data['phone_secondary'] ) ) {
            $errors['phone_secondary'] = 'Số điện thoại khác chỉ được nhập số, không nhập chữ hoặc ký tự.';
        }
        if ( empty( $data['email'] ) ) $errors['email'] = 'Email là bắt buộc.';

        // 8. Mailing Address
        if ( empty( $data['mailing_address_street'] ) ) $errors['mailing_address_street'] = 'Địa chỉ nhận thư là bắt buộc.';
        if ( empty( $data['mailing_address_city'] ) ) $errors['mailing_address_city'] = 'Thành phố nhận thư là bắt buộc.';
        if ( empty( $data['mailing_address_province'] ) ) $errors['mailing_address_province'] = 'Tỉnh/Bang nhận thư là bắt buộc.';
        if ( empty( $data['mailing_address_zip'] ) ) $errors['mailing_address_zip'] = 'Mã ZIP địa chỉ nhận thư là bắt buộc.';
        if ( empty( $data['mailing_address_country'] ) ) $errors['mailing_address_country'] = 'Quốc gia nhận thư là bắt buộc.';

        // 9. Lives at mailing address
        if ( empty( $data['lives_at_mailing_address'] ) ) {
            $errors['lives_at_mailing_address'] = 'Vui lòng trả lời câu hỏi Đương đơn sống ở địa chỉ nhận thư?';
        } elseif ( $data['lives_at_mailing_address'] === 'Không' ) {
            if ( empty( $data['physical_address_street'] ) ) $errors['physical_address_street'] = 'Địa chỉ hiện tại là bắt buộc.';
            if ( empty( $data['physical_address_city'] ) ) $errors['physical_address_city'] = 'Thành phố địa chỉ hiện tại là bắt buộc.';
            if ( empty( $data['physical_address_province'] ) ) $errors['physical_address_province'] = 'Tỉnh/Bang địa chỉ hiện tại là bắt buộc.';
            if ( empty( $data['physical_address_zip'] ) ) $errors['physical_address_zip'] = 'Mã ZIP địa chỉ hiện tại là bắt buộc.';
            if ( empty( $data['physical_address_country'] ) ) $errors['physical_address_country'] = 'Quốc gia địa chỉ hiện tại là bắt buộc.';
        }

        // 10. USCIS Account Number, SSN & A-Number
        if ( empty( $data['ssn'] ) ) $errors['ssn'] = 'Số an sinh xã hội (SSN) là bắt buộc.';
        if ( empty( $data['alien_number'] ) ) $errors['alien_number'] = 'Số A (A-Number) là bắt buộc.';

        // 11. Parents Info
        if ( empty( $data['mother_first_name'] ) ) $errors['mother_first_name'] = 'Tên của mẹ là bắt buộc.';
        if ( empty( $data['mother_middle_name'] ) ) $errors['mother_middle_name'] = 'Tên lót của mẹ là bắt buộc.';
        if ( empty( $data['mother_last_name'] ) ) $errors['mother_last_name'] = 'Họ của mẹ là bắt buộc.';
        if ( empty( $data['father_first_name'] ) ) $errors['father_first_name'] = 'Tên của cha là bắt buộc.';
        if ( empty( $data['father_middle_name'] ) ) $errors['father_middle_name'] = 'Tên lót của cha là bắt buộc.';
        if ( empty( $data['father_last_name'] ) ) $errors['father_last_name'] = 'Họ của cha là bắt buộc.';

        // 12. Sponsorship Category
        if ( empty( $data['sponsorship_category'] ) ) $errors['sponsorship_category'] = 'Diện bảo lãnh là bắt buộc.';

        // 13. Date of Entry
        if ( empty( $data['date_of_entry_month'] ) || empty( $data['date_of_entry_day'] ) || empty( $data['date_of_entry_year'] ) ) {
            $errors['date_of_entry_month'] = 'Ngày nhập cảnh đầy đủ là bắt buộc.';
        }

        // 14. Current Status
        if ( empty( $data['current_status'] ) ) {
            $errors['current_status'] = 'Trạng thái hiện tại là bắt buộc.';
        } else {
            if ( $data['current_status'] === 'Thường trú nhân' || $data['current_status'] === 'Thường trú nhân - diện đi làm (dành cho công dân Canada hoặc Mexico)' ) {
                if ( empty( $data['reason_lpr'] ) ) $errors['reason_lpr'] = 'Lý do làm đơn LPR là bắt buộc.';
            } elseif ( $data['current_status'] === 'Thường trú nhân có điều kiện (thẻ xanh 2 năm)' ) {
                if ( empty( $data['reason_cpr'] ) ) $errors['reason_cpr'] = 'Lý do làm đơn CPR là bắt buộc.';
            }
        }

        // 15. Entry info
        if ( empty( $data['intended_port_of_entry_city_state'] ) ) $errors['intended_port_of_entry_city_state'] = 'Nơi nhập cảnh Mỹ dự kiến là bắt buộc.';
        if ( empty( $data['place_submitted_immigrant_visa_or_adjustment'] ) ) $errors['place_submitted_immigrant_visa_or_adjustment'] = 'Nơi nộp đơn xin visa nhập cảnh/chuyển diện là bắt buộc.';
        if ( empty( $data['place_issued_immigrant_visa_or_approved_adjustment'] ) ) $errors['place_issued_immigrant_visa_or_approved_adjustment'] = 'Nơi cấp visa nhập cảnh/chuyển diện là bắt buộc.';
        
        if ( empty( $data['entered_with_immigrant_visa'] ) ) {
            $errors['entered_with_immigrant_visa'] = 'Vui lòng trả lời câu hỏi Nhập cảnh với visa định cư?';
        } elseif ( $data['entered_with_immigrant_visa'] === 'Có' ) {
            if ( empty( $data['first_us_state_of_residence'] ) ) $errors['first_us_state_of_residence'] = 'Bang cư trú đầu tiên là bắt buộc.';
            if ( empty( $data['port_of_entry_city_state'] ) ) $errors['port_of_entry_city_state'] = 'Cảng nhập cảnh là bắt buộc.';
        }

        // 16. Removal history
        if ( empty( $data['ever_in_removal_proceedings'] ) ) {
            $errors['ever_in_removal_proceedings'] = 'Vui lòng trả lời câu hỏi về việc bị trục xuất.';
        } elseif ( $data['ever_in_removal_proceedings'] === 'Có' ) {
            if ( empty( $data['removal_reason'] ) ) $errors['removal_reason'] = 'Lý do bị trục xuất là bắt buộc.';
        }

        // 17. Abandonment history
        if ( empty( $data['ever_filed_i407_or_intended_abandon_lpr'] ) ) {
            $errors['ever_filed_i407_or_intended_abandon_lpr'] = 'Vui lòng trả lời câu hỏi về việc từ bỏ tư cách thường trú nhân.';
        } elseif ( $data['ever_filed_i407_or_intended_abandon_lpr'] === 'Có' ) {
            if ( empty( $data['i407_detail_reason'] ) ) $errors['i407_detail_reason'] = 'Lý do chi tiết từ bỏ LPR là bắt buộc.';
        }

        // 18. Ethnicity / Race
        if ( empty( $data['ethnicity'] ) ) $errors['ethnicity'] = 'Dân tộc là bắt buộc.';
        if ( empty( $data['race'] ) ) $errors['race'] = 'Chủng tộc là bắt buộc.';

        // 19. Physical characteristics
        if ( empty( $data['height'] ) ) $errors['height'] = 'Chiều cao là bắt buộc.';
        if ( empty( $data['weight'] ) ) $errors['weight'] = 'Cân nặng là bắt buộc.';
        if ( empty( $data['eye_color'] ) ) $errors['eye_color'] = 'Màu mắt là bắt buộc.';
        if ( empty( $data['hair_color'] ) ) $errors['hair_color'] = 'Màu tóc là bắt buộc.';

        // 20. Disability
        if ( empty( $data['has_disability'] ) ) {
            $errors['has_disability'] = 'Vui lòng chọn câu hỏi về Khuyết tật.';
        } elseif ( $data['has_disability'] === 'Có' ) {
            if ( empty( $data['disability_details'] ) ) $errors['disability_details'] = 'Vui lòng mô tả tình trạng khuyết tật.';
        }

        // 21. Additional information
        if ( empty( $data['has_additional_information'] ) ) {
            $errors['has_additional_information'] = 'Vui lòng chọn câu hỏi về Bổ sung thông tin.';
        } elseif ( $data['has_additional_information'] === 'Có' ) {
            if ( empty( $data['additional_information'] ) ) $errors['additional_information'] = 'Vui lòng điền thông tin bổ sung.';
        }

        // 22. Applicant full name
        if ( empty( $data['applicant_full_name'] ) ) {
            $errors['applicant_full_name'] = 'Họ và tên người khai đơn là bắt buộc.';
        }

        // 23. Applicant signature
        if ( empty( $data['applicant_signature'] ) ) {
            $errors['applicant_signature'] = 'Chữ ký là bắt buộc.';
        }

        return $errors;
    }
}

new ICAVIET_I90();

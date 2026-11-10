<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class ICAVIET_Admin {

    public static function register_menu() {
        add_menu_page(
            'ICAVIET Forms',
            'ICAVIET Forms',
            'manage_options',
            'ICAVIET-forms',
            array( __CLASS__, 'render_list' ),
            'dashicons-feedback',
            56
        );

        add_submenu_page(
            'ICAVIET-forms',
            'Submissions',
            'Submissions',
            'manage_options',
            'ICAVIET-forms',
            array( __CLASS__, 'render_list' )
        );

        add_submenu_page(
            'ICAVIET-forms',
            'Cai dat',
            'Cai dat',
            'manage_options',
            'ICAVIET-settings',
            array( __CLASS__, 'render_settings' )
        );
    }

    public static function enqueue_assets( $hook ) {
        if ( false === strpos( $hook, 'ICAVIET' ) ) {
            return;
        }

        wp_enqueue_style(
            'ICAVIET-admin',
            ICAVIET_URL . 'assets/admin.css',
            array(),
            ICAVIET_VERSION
        );
    }

    private static function get_submission_name( $data ) {
        if ( ! is_array( $data ) ) {
            return '-';
        }

        $keys = array(
            'tenTrenGiayTo',
            'tenNguoiDienDon',
            'hoVaTen',
            'hoTenThuongDung',
            'hoTenKhaisinh',
            'fullName',
            'applicantFullName',
            'applicant_full_name',
            'beneficiaryFullName',
            'beneficiary_full_name',
            'declarantFullName',
        );

        foreach ( $keys as $key ) {
            if ( ! empty( $data[ $key ] ) && ! is_array( $data[ $key ] ) ) {
                return $data[ $key ];
            }
        }

        return '-';
    }


    private static function clean_pdf_filename_part( $text ) {
        $text = trim( wp_strip_all_tags( (string) $text ) );
        $text = preg_replace( '/[\x00-\x1F\x7F]+/u', ' ', $text );
        $text = preg_replace( '/[\\\/\:\*\?"\<\>\|]+/u', ' ', $text );
        $text = preg_replace( '/\s+/u', ' ', $text );
        $text = trim( $text, " .-\t\n\r\0\x0B" );

        return $text;
    }

    private static function get_form_pdf_label( $slug ) {
        $slug = strtolower( trim( (string) $slug ) );

        $labels = array(
            'ds-160'   => 'DS-160',
            'ds-260'   => 'DS-260',
            'n-400'    => 'N-400',
            'n-600'    => 'N-600',
            'i-90'     => 'I-90',
            'i-751'    => 'I-751',
            'bao-lanh' => 'Bao lanh',
            'ndbl'     => 'NDBL',
            'hop-dong' => 'Hop dong',
        );

        if ( isset( $labels[ $slug ] ) ) {
            return $labels[ $slug ];
        }

        return $slug !== '' ? strtoupper( $slug ) : 'ICAVIET Form';
    }

    private static function build_admin_pdf_filename( $slug, $name, $id ) {
        $form_label = self::clean_pdf_filename_part( self::get_form_pdf_label( $slug ) );
        $name       = self::clean_pdf_filename_part( $name );
        $id         = (int) $id;

        $parts = array();
        $parts[] = $form_label !== '' ? $form_label : 'ICAVIET Form';

        if ( $name !== '' && $name !== '-' ) {
            $parts[] = $name;
        } elseif ( $id > 0 ) {
            $parts[] = 'ID ' . $id;
        }

        $filename = implode( ' - ', $parts ) . '.pdf';
        $filename = self::clean_pdf_filename_part( $filename );

        return $filename !== '' ? $filename : 'ICAVIET Form.pdf';
    }

    private static function format_submission_time( $datetime ) {
        if ( empty( $datetime ) ) {
            return '-';
        }

        $ts = strtotime( $datetime );
        if ( ! $ts ) {
            return '-';
        }

        return date( 'd/m/Y H:i', $ts + ( 7 * HOUR_IN_SECONDS ) );
    }


    private static function get_i130_relation_options() {
        return array(
            'anh-chi-em' => 'Bảo lãnh anh chị em',
            'cha-me'    => 'Bảo lãnh cha mẹ',
            'vo-chong'  => 'Bảo lãnh vợ chồng',
            'hon-phu'   => 'Bảo lãnh hôn phu/hôn thê',
            'con-gai'   => 'Bảo lãnh con cái',
        );
    }

    private static function get_i130_relation_label( $value ) {
        $value   = sanitize_key( (string) $value );
        $options = self::get_i130_relation_options();

        return isset( $options[ $value ] ) ? $options[ $value ] : '';
    }

    private static function update_submission_json_data( $id, $data ) {
        global $wpdb;

        $id = (int) $id;
        if ( $id <= 0 || ! is_array( $data ) ) {
            return false;
        }

        $table = $wpdb->prefix . ICAVIET_DB::TABLE;

        return false !== $wpdb->update(
            $table,
            array(
                'data' => wp_json_encode( $data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ),
            ),
            array( 'id' => $id ),
            array( '%s' ),
            array( '%d' )
        );
    }

    private static function handle_relation_update_if_needed( $id, $row, &$data ) {
        if ( empty( $_POST['ICAVIET_update_relation'] ) ) {
            return '';
        }

        if ( ! current_user_can( 'manage_options' ) ) {
            return '<div class="notice notice-error"><p>Bạn không có quyền cập nhật diện hồ sơ.</p></div>';
        }

        check_admin_referer( 'ICAVIET_update_relation_' . (int) $id );

        $slug = isset( $row['form_slug'] ) ? sanitize_key( $row['form_slug'] ) : '';
        if ( ! in_array( $slug, array( 'bao-lanh', 'ndbl' ), true ) ) {
            return '<div class="notice notice-error"><p>Chức năng đổi diện chỉ áp dụng cho form bảo lãnh và NĐBL.</p></div>';
        }

        $relation = isset( $_POST['loaiHoSoBaoLanh'] ) ? sanitize_key( wp_unslash( $_POST['loaiHoSoBaoLanh'] ) ) : '';
        $label    = self::get_i130_relation_label( $relation );

        if ( $relation === '' || $label === '' ) {
            return '<div class="notice notice-error"><p>Diện hồ sơ không hợp lệ.</p></div>';
        }

        if ( ! is_array( $data ) ) {
            $data = array();
        }

        $data['loaiHoSoBaoLanh']      = $relation;
        $data['loaiHoSoBaoLanhLabel'] = $label;
        $data['relationCategory']     = $relation;
        $data['relationLabel']        = $label;

        if ( self::update_submission_json_data( $id, $data ) ) {
            return '<div class="notice notice-success is-dismissible"><p>Đã cập nhật diện hồ sơ thành: <strong>' . esc_html( $label ) . '</strong>.</p></div>';
        }

        return '<div class="notice notice-error"><p>Không cập nhật được diện hồ sơ. Vui lòng thử lại.</p></div>';
    }

    private static function render_relation_update_box( $id, $row, $data ) {
        $slug = isset( $row['form_slug'] ) ? sanitize_key( $row['form_slug'] ) : '';
        if ( ! in_array( $slug, array( 'bao-lanh', 'ndbl' ), true ) ) {
            return;
        }

        $options = self::get_i130_relation_options();
        $current = '';
        if ( is_array( $data ) ) {
            $current = ! empty( $data['loaiHoSoBaoLanh'] ) ? sanitize_key( $data['loaiHoSoBaoLanh'] ) : '';
            if ( $current === '' && ! empty( $data['relationCategory'] ) ) {
                $current = sanitize_key( $data['relationCategory'] );
            }
        }

        ?>
        <div style="max-width:720px;background:#fff;border:1px solid #cbd5e1;border-radius:6px;padding:14px 16px;margin:12px 0 16px;">
            <form method="post" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0;">
                <?php wp_nonce_field( 'ICAVIET_update_relation_' . (int) $id ); ?>
                <strong style="min-width:110px;">Đổi diện hồ sơ:</strong>
                <select name="loaiHoSoBaoLanh" style="min-width:260px;">
                    <option value="">-- Chọn diện hồ sơ --</option>
                    <?php foreach ( $options as $value => $label ) : ?>
                        <option value="<?php echo esc_attr( $value ); ?>" <?php selected( $current, $value ); ?>>
                            <?php echo esc_html( $label ); ?>
                        </option>
                    <?php endforeach; ?>
                </select>
                <button type="submit" name="ICAVIET_update_relation" value="1" class="button button-primary">Lưu diện</button>
                <?php if ( $current && isset( $options[ $current ] ) ) : ?>
                    <span style="color:#64748b;">Hiện tại: <strong><?php echo esc_html( $options[ $current ] ); ?></strong></span>
                <?php endif; ?>
            </form>
            <p style="margin:8px 0 0;color:#64748b;font-size:12px;">
                Diện này sẽ lưu vào <code>loaiHoSoBaoLanh</code>, <code>relationCategory</code> để PKT I-130/I-130A đọc đúng khi ghép hồ sơ.
            </p>
        </div>
        <?php
    }


    private static function get_expected_beneficiary_name_parts( $data ) {
        $parts = array(
            'ho'     => '',
            'tenLot' => '',
            'ten'    => '',
        );

        if ( ! is_array( $data ) ) {
            return $parts;
        }

        foreach ( array( 'ho', 'tenLot', 'ten' ) as $key ) {
            $field = 'beneficiaryExpectedName_' . $key;
            if ( isset( $data[ $field ] ) && ! is_array( $data[ $field ] ) ) {
                $parts[ $key ] = (string) $data[ $field ];
            }
        }

        return $parts;
    }

    private static function build_expected_beneficiary_full_name( $ho, $ten_lot, $ten ) {
        $name_parts = array_filter(
            array(
                trim( (string) $ho ),
                trim( (string) $ten_lot ),
                trim( (string) $ten ),
            ),
            static function ( $part ) {
                return $part !== '';
            }
        );

        return trim( preg_replace( '/\s+/u', ' ', implode( ' ', $name_parts ) ) );
    }

    private static function get_expected_beneficiary_match_info( $data ) {
        $info = self::get_expected_beneficiary_name_parts( $data );
        $info['dob']   = '';
        $info['phone'] = '';

        if ( ! is_array( $data ) ) {
            return $info;
        }

        $dob_keys = array(
            'beneficiaryExpectedDob',
            'beneficiaryExpectedBirthDate',
            'expectedBeneficiaryDob',
            'expectedBeneficiaryBirthDate',
            'expected_beneficiary_dob',
        );

        foreach ( $dob_keys as $key ) {
            if ( isset( $data[ $key ] ) && ! is_array( $data[ $key ] ) && trim( (string) $data[ $key ] ) !== '' ) {
                $info['dob'] = (string) $data[ $key ];
                break;
            }
        }

        if ( $info['dob'] === '' && ! empty( $data['nguoiDuocBaoLanhDuKien'] ) && is_array( $data['nguoiDuocBaoLanhDuKien'] ) ) {
            foreach ( array( 'ngaySinh', 'birthDate', 'dateOfBirth', 'dob' ) as $key ) {
                if ( isset( $data['nguoiDuocBaoLanhDuKien'][ $key ] ) && ! is_array( $data['nguoiDuocBaoLanhDuKien'][ $key ] ) && trim( (string) $data['nguoiDuocBaoLanhDuKien'][ $key ] ) !== '' ) {
                    $info['dob'] = (string) $data['nguoiDuocBaoLanhDuKien'][ $key ];
                    break;
                }
            }
        }

        if ( $info['dob'] === '' && ! empty( $data['expectedBeneficiary'] ) && is_array( $data['expectedBeneficiary'] ) ) {
            foreach ( array( 'birthDate', 'dateOfBirth', 'dob', 'ngaySinh' ) as $key ) {
                if ( isset( $data['expectedBeneficiary'][ $key ] ) && ! is_array( $data['expectedBeneficiary'][ $key ] ) && trim( (string) $data['expectedBeneficiary'][ $key ] ) !== '' ) {
                    $info['dob'] = (string) $data['expectedBeneficiary'][ $key ];
                    break;
                }
            }
        }

        $phone_keys = array(
            'beneficiaryExpectedPhone',
            'expectedBeneficiaryPhone',
            'expected_beneficiary_phone',
        );

        foreach ( $phone_keys as $key ) {
            if ( isset( $data[ $key ] ) && ! is_array( $data[ $key ] ) && trim( (string) $data[ $key ] ) !== '' ) {
                $info['phone'] = (string) $data[ $key ];
                break;
            }
        }

        if ( $info['phone'] === '' && ! empty( $data['nguoiDuocBaoLanhDuKien'] ) && is_array( $data['nguoiDuocBaoLanhDuKien'] ) ) {
            foreach ( array( 'soDienThoai', 'phone', 'phoneNumber', 'mobilePhone' ) as $key ) {
                if ( isset( $data['nguoiDuocBaoLanhDuKien'][ $key ] ) && ! is_array( $data['nguoiDuocBaoLanhDuKien'][ $key ] ) && trim( (string) $data['nguoiDuocBaoLanhDuKien'][ $key ] ) !== '' ) {
                    $info['phone'] = (string) $data['nguoiDuocBaoLanhDuKien'][ $key ];
                    break;
                }
            }
        }

        if ( $info['phone'] === '' && ! empty( $data['expectedBeneficiary'] ) && is_array( $data['expectedBeneficiary'] ) ) {
            foreach ( array( 'phone', 'phoneNumber', 'mobilePhone', 'soDienThoai' ) as $key ) {
                if ( isset( $data['expectedBeneficiary'][ $key ] ) && ! is_array( $data['expectedBeneficiary'][ $key ] ) && trim( (string) $data['expectedBeneficiary'][ $key ] ) !== '' ) {
                    $info['phone'] = (string) $data['expectedBeneficiary'][ $key ];
                    break;
                }
            }
        }

        return $info;
    }

    private static function set_expected_beneficiary_name_fields( &$data, $ho, $ten_lot, $ten ) {
        if ( ! is_array( $data ) ) {
            $data = array();
        }

        $full_name = self::build_expected_beneficiary_full_name( $ho, $ten_lot, $ten );

        $data['beneficiaryExpectedName_ho']     = $ho;
        $data['beneficiaryExpectedName_tenLot'] = $ten_lot;
        $data['beneficiaryExpectedName_ten']    = $ten;
        $data['beneficiaryExpectedName']        = $full_name;
        $data['expectedBeneficiaryName']        = $full_name;
        $data['expected_beneficiary_name']      = $full_name;

        if ( ! isset( $data['nguoiDuocBaoLanhDuKien'] ) || ! is_array( $data['nguoiDuocBaoLanhDuKien'] ) ) {
            $data['nguoiDuocBaoLanhDuKien'] = array();
        }
        $data['nguoiDuocBaoLanhDuKien']['hoTen']    = $full_name;
        $data['nguoiDuocBaoLanhDuKien']['fullName'] = $full_name;
        $data['nguoiDuocBaoLanhDuKien']['name']     = $full_name;

        if ( ! isset( $data['expectedBeneficiary'] ) || ! is_array( $data['expectedBeneficiary'] ) ) {
            $data['expectedBeneficiary'] = array();
        }
        $data['expectedBeneficiary']['fullName'] = $full_name;
        $data['expectedBeneficiary']['name']     = $full_name;
    }

    private static function set_expected_beneficiary_match_fields( &$data, $ho, $ten_lot, $ten, $dob, $phone ) {
        self::set_expected_beneficiary_name_fields( $data, $ho, $ten_lot, $ten );

        $dob   = trim( (string) $dob );
        $phone = trim( (string) $phone );

        $data['beneficiaryExpectedDob']       = $dob;
        $data['beneficiaryExpectedBirthDate'] = $dob;
        $data['expectedBeneficiaryDob']       = $dob;
        $data['expectedBeneficiaryBirthDate'] = $dob;
        $data['expected_beneficiary_dob']     = $dob;

        $data['beneficiaryExpectedPhone']   = $phone;
        $data['expectedBeneficiaryPhone']   = $phone;
        $data['expected_beneficiary_phone'] = $phone;

        if ( ! isset( $data['nguoiDuocBaoLanhDuKien'] ) || ! is_array( $data['nguoiDuocBaoLanhDuKien'] ) ) {
            $data['nguoiDuocBaoLanhDuKien'] = array();
        }
        $data['nguoiDuocBaoLanhDuKien']['ngaySinh']    = $dob;
        $data['nguoiDuocBaoLanhDuKien']['birthDate']   = $dob;
        $data['nguoiDuocBaoLanhDuKien']['dateOfBirth'] = $dob;
        $data['nguoiDuocBaoLanhDuKien']['dob']         = $dob;
        $data['nguoiDuocBaoLanhDuKien']['soDienThoai'] = $phone;
        $data['nguoiDuocBaoLanhDuKien']['phone']       = $phone;
        $data['nguoiDuocBaoLanhDuKien']['phoneNumber'] = $phone;
        $data['nguoiDuocBaoLanhDuKien']['mobilePhone'] = $phone;

        if ( ! isset( $data['expectedBeneficiary'] ) || ! is_array( $data['expectedBeneficiary'] ) ) {
            $data['expectedBeneficiary'] = array();
        }
        $data['expectedBeneficiary']['birthDate']   = $dob;
        $data['expectedBeneficiary']['dateOfBirth'] = $dob;
        $data['expectedBeneficiary']['dob']         = $dob;
        $data['expectedBeneficiary']['ngaySinh']    = $dob;
        $data['expectedBeneficiary']['phone']       = $phone;
        $data['expectedBeneficiary']['phoneNumber'] = $phone;
        $data['expectedBeneficiary']['mobilePhone'] = $phone;
        $data['expectedBeneficiary']['soDienThoai'] = $phone;
    }

    private static function handle_expected_beneficiary_name_update_if_needed( $id, $row, &$data ) {
        if ( empty( $_POST['ICAVIET_update_expected_beneficiary_name'] ) ) {
            return '';
        }

        if ( ! current_user_can( 'manage_options' ) ) {
            return '<div class="notice notice-error"><p>Bạn không có quyền cập nhật thông tin này.</p></div>';
        }

        check_admin_referer( 'ICAVIET_update_expected_beneficiary_name_' . (int) $id );

        $slug = isset( $row['form_slug'] ) ? sanitize_key( $row['form_slug'] ) : '';
        if ( $slug !== 'bao-lanh' ) {
            return '<div class="notice notice-error"><p>Chức năng này chỉ áp dụng cho form bảo lãnh.</p></div>';
        }

        $ho      = isset( $_POST['beneficiaryExpectedName_ho'] ) ? sanitize_text_field( wp_unslash( $_POST['beneficiaryExpectedName_ho'] ) ) : '';
        $ten_lot = isset( $_POST['beneficiaryExpectedName_tenLot'] ) ? sanitize_text_field( wp_unslash( $_POST['beneficiaryExpectedName_tenLot'] ) ) : '';
        $ten     = isset( $_POST['beneficiaryExpectedName_ten'] ) ? sanitize_text_field( wp_unslash( $_POST['beneficiaryExpectedName_ten'] ) ) : '';
        $dob     = isset( $_POST['beneficiaryExpectedDob'] ) ? sanitize_text_field( wp_unslash( $_POST['beneficiaryExpectedDob'] ) ) : '';
        $phone   = isset( $_POST['beneficiaryExpectedPhone'] ) ? sanitize_text_field( wp_unslash( $_POST['beneficiaryExpectedPhone'] ) ) : '';

        if ( trim( $ho ) === '' || trim( $ten ) === '' ) {
            return '<div class="notice notice-error"><p>Vui lòng nhập tối thiểu Họ và Tên của người được bảo lãnh.</p></div>';
        }

        if ( trim( $dob ) === '' || trim( $phone ) === '' ) {
            return '<div class="notice notice-error"><p>Vui lòng nhập đầy đủ ngày sinh và số điện thoại của người được bảo lãnh.</p></div>';
        }

        if ( ! is_array( $data ) ) {
            $data = array();
        }

        self::set_expected_beneficiary_match_fields( $data, $ho, $ten_lot, $ten, $dob, $phone );
        $full_name = self::build_expected_beneficiary_full_name( $ho, $ten_lot, $ten );

        if ( self::update_submission_json_data( $id, $data ) ) {
            return '<div class="notice notice-success is-dismissible"><p>Đã cập nhật thông tin người được bảo lãnh dự kiến: <strong>' . esc_html( $full_name ) . '</strong>, ngày sinh <strong>' . esc_html( $dob ) . '</strong>, số điện thoại <strong>' . esc_html( $phone ) . '</strong>.</p></div>';
        }

        return '<div class="notice notice-error"><p>Không cập nhật được thông tin người được bảo lãnh. Vui lòng thử lại.</p></div>';
    }

    private static function render_expected_beneficiary_name_update_box( $id, $row, $data ) {
        $slug = isset( $row['form_slug'] ) ? sanitize_key( $row['form_slug'] ) : '';
        if ( $slug !== 'bao-lanh' ) {
            return;
        }

        $info = self::get_expected_beneficiary_match_info( $data );
        ?>
        <div style="max-width:920px;background:#fff;border:1px solid #cbd5e1;border-radius:6px;padding:14px 16px;margin:12px 0 16px;">
            <form method="post" style="margin:0;">
                <?php wp_nonce_field( 'ICAVIET_update_expected_beneficiary_name_' . (int) $id ); ?>
                <strong style="display:block;margin-bottom:10px;">Sửa thông tin “Bạn bảo lãnh cho ai?”</strong>
                <div style="display:grid;grid-template-columns:repeat(3,minmax(160px,1fr));gap:10px;max-width:820px;">
                    <label>
                        <span style="display:block;margin-bottom:4px;color:#475569;">Họ <span style="color:#dc2626;">*</span></span>
                        <input type="text" name="beneficiaryExpectedName_ho" value="<?php echo esc_attr( $info['ho'] ); ?>" class="regular-text" style="width:100%;" required>
                    </label>
                    <label>
                        <span style="display:block;margin-bottom:4px;color:#475569;">Tên lót</span>
                        <input type="text" name="beneficiaryExpectedName_tenLot" value="<?php echo esc_attr( $info['tenLot'] ); ?>" class="regular-text" style="width:100%;">
                    </label>
                    <label>
                        <span style="display:block;margin-bottom:4px;color:#475569;">Tên <span style="color:#dc2626;">*</span></span>
                        <input type="text" name="beneficiaryExpectedName_ten" value="<?php echo esc_attr( $info['ten'] ); ?>" class="regular-text" style="width:100%;" required>
                    </label>
                </div>
                <div style="display:grid;grid-template-columns:minmax(220px,1fr) minmax(260px,1fr);gap:10px;max-width:620px;margin-top:10px;">
                    <label>
                        <span style="display:block;margin-bottom:4px;color:#475569;">Ngày tháng năm sinh <span style="color:#dc2626;">*</span></span>
                        <input type="text" name="beneficiaryExpectedDob" value="<?php echo esc_attr( $info['dob'] ); ?>" placeholder="mm/dd/yyyy" class="regular-text" style="width:100%;" required>
                    </label>
                    <label>
                        <span style="display:block;margin-bottom:4px;color:#475569;">Số điện thoại <span style="color:#dc2626;">*</span></span>
                        <input type="text" name="beneficiaryExpectedPhone" value="<?php echo esc_attr( $info['phone'] ); ?>" class="regular-text" style="width:100%;" required>
                    </label>
                </div>
                <p style="margin:10px 0 0;display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                    <button type="submit" name="ICAVIET_update_expected_beneficiary_name" value="1" class="button button-primary">Lưu thông tin</button>
                    <span style="color:#64748b;font-size:12px;">Sửa dữ liệu gốc của form bảo lãnh để PKT I-130/I-130A ghép đúng với form NĐBL.</span>
                </p>
            </form>
        </div>
        <?php
    }

    private static function render_field_value( $value ) {
        if ( is_array( $value ) || is_object( $value ) ) {
            $json = wp_json_encode(
                $value,
                JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT
            );

            return '<pre style="margin:0;white-space:pre-wrap;word-break:break-word;">' . esc_html( $json ) . '</pre>';
        }

        return nl2br( esc_html( (string) $value ) );
    }

    public static function render_list() {
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_die( 'Khong co quyen.' );
        }

        $action = isset( $_GET['action'] ) ? sanitize_key( $_GET['action'] ) : '';
        if ( 'view' === $action && ! empty( $_GET['id'] ) ) {
            self::render_detail( (int) $_GET['id'] );
            return;
        }

        if ( 'duplicate' === $action && ! empty( $_GET['id'] ) ) {
            self::handle_duplicate( (int) $_GET['id'] );
            return;
        }

        if ( 'edit' === $action && ! empty( $_GET['id'] ) ) {
            self::render_edit( (int) $_GET['id'] );
            return;
        }

        $slug  = isset( $_GET['form_slug'] ) ? sanitize_key( $_GET['form_slug'] ) : '';
        $page  = isset( $_GET['paged'] ) ? max( 1, (int) $_GET['paged'] ) : 1;
        $res   = ICAVIET_DB::get_list( $slug, $page, 20 );
        $news  = ICAVIET_DB::count_new();
        $slugs = ICAVIET_Router::get_slugs();
        ?>
        <div class="wrap ICAVIET-wrap">
            <h1>
                ICAVIET Forms
                <?php if ( $news > 0 ) : ?>
                    <span class="ICAVIET-badge"><?php echo (int) $news; ?> moi</span>
                <?php endif; ?>
            </h1>

            <form method="get" style="margin:12px 0">
                <input type="hidden" name="page" value="ICAVIET-forms">
                <select name="form_slug" onchange="this.form.submit()">
                    <option value="">-- Tat ca form --</option>
                    <?php foreach ( $slugs as $s ) : ?>
                        <option value="<?php echo esc_attr( $s ); ?>" <?php selected( $slug, $s ); ?>>
                            <?php echo esc_html( $s ); ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </form>

            <table class="wp-list-table widefat fixed striped">
                <thead>
                    <tr>
                        <th style="width:60px">#</th>
                        <th>Loai form</th>
                        <th>Ho ten</th>
                        <th>Thoi gian</th>
                        <th>Trang thai</th>
                        <th>Thao tac</th>
                    </tr>
                </thead>
                <tbody>
                <?php if ( empty( $res['rows'] ) ) : ?>
                    <tr>
                        <td colspan="6" style="text-align:center;padding:30px;color:#94a3b8;">Chua co du lieu.</td>
                    </tr>
                <?php else : ?>
                    <?php foreach ( $res['rows'] as $row ) : ?>
                        <?php
                        $d            = json_decode( $row['data'], true );
                        $d            = is_array( $d ) ? $d : array();
                        $name         = self::get_submission_name( $d );
                        $display_time = self::format_submission_time( $row['submitted_at'] );
                        $is_new       = ( 'new' === $row['status'] );
                        $vurl         = admin_url( 'admin.php?page=ICAVIET-forms&action=view&id=' . (int) $row['id'] );
                        $dup_url      = wp_nonce_url(
                            admin_url( 'admin.php?page=ICAVIET-forms&action=duplicate&id=' . (int) $row['id'] ),
                            'ICAVIET_duplicate_' . (int) $row['id']
                        );
                        $purl         = add_query_arg(
                            '_wpnonce',
                            wp_create_nonce( 'wp_rest' ),
                            rest_url( 'ICAVIET/v1/pdf/' . (int) $row['id'] )
                        );
                        ?>
                        <tr <?php if ( $is_new ) echo 'style="font-weight:600"'; ?>>
                            <td>#<?php echo (int) $row['id']; ?></td>
                            <td><span class="ICAVIET-tag"><?php echo esc_html( $row['form_slug'] ); ?></span></td>
                            <td><?php echo esc_html( $name ); ?></td>
                            <td><?php echo esc_html( $display_time ); ?></td>
                            <td>
                                <?php
                                echo $is_new
                                    ? '<span class="ICAVIET-new">Moi</span>'
                                    : '<span class="ICAVIET-read">Da doc</span>';
                                ?>
                            </td>
                            <td>
                                <?php
                                $purl_en = add_query_arg(
                                    '_wpnonce',
                                    wp_create_nonce( 'wp_rest' ),
                                    rest_url( 'ICAVIET/v1/pdf/' . (int) $row['id'] )
                                );
                                $pdf_download_name = self::build_admin_pdf_filename( $row['form_slug'], $name, (int) $row['id'] );
                                // VI PDF only shows for hop-dong (or any future form with VI template)
                                $has_pdf_vi = ! empty( $row['pdf_path_vi'] ) && file_exists( $row['pdf_path_vi'] );
                                $purl_vi = $has_pdf_vi
                                    ? add_query_arg(
                                        array(
                                            '_wpnonce' => wp_create_nonce( 'wp_rest' ),
                                            'lang'     => 'vi',
                                        ),
                                        rest_url( 'ICAVIET/v1/pdf-link/' . (int) $row['id'] . '?token=' . ICAVIET_Router::make_pdf_token( (int) $row['id'] ) )
                                    )
                                    : '';
                                ?>
                                <a class="button button-small" href="<?php echo esc_url( $vurl ); ?>">Xem</a>
                                <a class="button button-small" href="<?php echo esc_url( $dup_url ); ?>" onclick="return confirm('Nhan ban ho so nay thanh 1 ho so moi de sua rieng?');">Nhan ban</a>
                                <a class="button button-small" href="<?php echo esc_url( $purl_en ); ?>" download="<?php echo esc_attr( $pdf_download_name ); ?>" title="PDF Tieng Anh">PDF (EN)</a>
                                <?php if ( $has_pdf_vi ) : ?>
                                <a class="button button-small" href="<?php echo esc_url( $purl_vi ); ?>" download="<?php echo esc_attr( self::build_admin_pdf_filename( $row['form_slug'], $name, (int) $row['id'] ) ); ?>" title="PDF Tieng Viet" style="background:#f0fdf4;border-color:#86efac;color:#166534;">PDF (VI)</a>
                                <?php endif; ?>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                <?php endif; ?>
                </tbody>
            </table>

            <?php if ( ! empty( $res['total_pages'] ) && $res['total_pages'] > 1 ) : ?>
                <div class="tablenav bottom">
                    <div class="tablenav-pages">
                        <?php
                        echo paginate_links( array(
                            'base'    => add_query_arg( 'paged', '%#%' ),
                            'format'  => '',
                            'current' => $page,
                            'total'   => (int) $res['total_pages'],
                        ) );
                        ?>
                    </div>
                </div>
            <?php endif; ?>
        </div>
        <?php
    }

    private static function render_detail( $id ) {
        $row = ICAVIET_DB::get_by_id( $id );

        if ( ! $row ) {
            echo '<div class="wrap"><p>Khong tim thay submission #' . (int) $id . '</p></div>';
            return;
        }

        if ( 'new' === $row['status'] ) {
            ICAVIET_DB::mark_read( $id );
        }

        $data        = json_decode( $row['data'], true );
        $data        = is_array( $data ) ? $data : array();
        $relation_notice = self::handle_relation_update_if_needed( $id, $row, $data );
        $expected_name_notice = self::handle_expected_beneficiary_name_update_if_needed( $id, $row, $data );
        $back        = admin_url( 'admin.php?page=ICAVIET-forms' );
        $pdf         = add_query_arg(
            '_wpnonce',
            wp_create_nonce( 'wp_rest' ),
            rest_url( 'ICAVIET/v1/pdf/' . (int) $id )
        );
        $edit_url    = admin_url( 'admin.php?page=ICAVIET-forms&action=edit&id=' . (int) $id );
        $dup_url     = wp_nonce_url(
            admin_url( 'admin.php?page=ICAVIET-forms&action=duplicate&id=' . (int) $id ),
            'ICAVIET_duplicate_' . (int) $id
        );
        $detail_time = self::format_submission_time( $row['submitted_at'] );
        ?>
        <div class="wrap ICAVIET-wrap">
            <h1>
                <a href="<?php echo esc_url( $back ); ?>" class="page-title-action">&larr; Quay lai</a>
                <?php echo esc_html( $row['form_slug'] ); ?> #<?php echo (int) $id; ?>
            </h1>

            <?php
            if ( ! empty( $relation_notice ) ) {
                echo $relation_notice;
            }
            if ( ! empty( $expected_name_notice ) ) {
                echo $expected_name_notice;
            }
            self::render_relation_update_box( $id, $row, $data );
            self::render_expected_beneficiary_name_update_box( $id, $row, $data );
            ?>

            <p>
                <?php
                $pdf_en = add_query_arg(
                    '_wpnonce',
                    wp_create_nonce( 'wp_rest' ),
                    rest_url( 'ICAVIET/v1/pdf/' . (int) $id )
                );
                $has_vi     = ! empty( $row['pdf_path_vi'] ) && file_exists( $row['pdf_path_vi'] );
                $token_vi   = ICAVIET_Router::make_pdf_token( (int) $id );
                $pdf_vi_url = rest_url( 'ICAVIET/v1/pdf-link/' . (int) $id );
                $pdf_vi     = $has_vi
                    ? add_query_arg(
                        array(
                            'token' => $token_vi,
                            'lang'  => 'vi',
                        ),
                        $pdf_vi_url
                    )
                    : '';
                ?>
                <a class="button button-primary" href="<?php echo esc_url( $pdf_en ); ?>" target="_blank">&#x1F4E5; Tai PDF (Tieng Anh)</a>
                <?php if ( $has_vi ) : ?>
                <a class="button" href="<?php echo esc_url( $pdf_vi ); ?>" target="_blank" style="background:#16a34a;color:#fff;border-color:#15803d;">&#x1F4E5; Tai PDF (Tieng Viet)</a>
                <?php endif; ?>
                <a class="button" href="<?php echo esc_url( $edit_url ); ?>">&#x270F;&#xFE0F; Sua truc tiep</a>
                <a class="button" href="<?php echo esc_url( $dup_url ); ?>" onclick="return confirm('Nhan ban ho so nay thanh 1 ho so moi de sua rieng?');">&#x1F4CB; Nhan ban</a>
                <span style="margin-left:12px;color:#64748b;font-size:13px">
                    Nop luc: <?php echo esc_html( $detail_time ); ?>
                    | IP: <?php echo esc_html( $row['ip_address'] ); ?>
                </span>
            </p>

            <table class="wp-list-table widefat fixed" style="max-width:720px">
                <thead>
                    <tr>
                        <th style="width:40%">Truong</th>
                        <th>Gia tri</th>
                    </tr>
                </thead>
                <tbody>
                <?php foreach ( $data as $k => $v ) : ?>
                    <tr>
                        <td><strong><?php echo esc_html( $k ); ?></strong></td>
                        <td><?php echo self::render_field_value( $v ); ?></td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>

            <?php
            $sig = ICAVIET_DB::get_signature_path( $id );
            if ( ! empty( $sig ) && file_exists( $sig ) ) {
                $upload = wp_upload_dir();
                $url    = $upload['baseurl'] . '/ICAVIET-signatures/sig-' . (int) $id . '.png';
                echo '<div style="margin-top:20px"><strong>Chu ky:</strong><br>';
                echo '<img src="' . esc_url( $url ) . '" style="max-width:280px;border:1px solid #e2e8f0;border-radius:6px;margin-top:8px"></div>';
            }
            ?>
        </div>
        <?php
    }

    /** Nhan ban 1 submission thanh ho so moi, roi chuyen sang man hinh sua. */
    private static function handle_duplicate( $id ) {
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_die( 'Ban khong co quyen thuc hien thao tac nay.' );
        }

        check_admin_referer( 'ICAVIET_duplicate_' . $id );

        $row = ICAVIET_DB::get_by_id( $id );
        if ( ! $row ) {
            wp_die( 'Khong tim thay submission #' . (int) $id );
        }

        $data = json_decode( $row['data'], true );
        $data = is_array( $data ) ? $data : array();

        $new_id = ICAVIET_DB::save( $row['form_slug'], $data, '' );

        if ( ! $new_id ) {
            wp_die( 'Nhan ban khong thanh cong. Vui long thu lai.' );
        }

        wp_safe_redirect(
            admin_url( 'admin.php?page=ICAVIET-forms&action=edit&id=' . $new_id . '&duplicated_from=' . (int) $id )
        );
        exit;
    }

    /**
     * Man hinh sua truc tiep toan bo field cua 1 submission trong Admin.
     * Field dang mang/object duoc sua qua JSON (textarea), field dang chuoi sua truc tiep.
     * Chi danh cho nhan vien co quyen manage_options.
     */
    /**
     * DS-260 luu Ho/Ten lot/Ten cua cha, me, nguoi bao lanh, nguoi lien he My
     * thanh 1 chuoi gop "Ho Ten_lot Ten" (xem sync*FullName trong DS260Form.vue
     * va icaviet_ds260_pdf_split_full_name trong pdf.php). Trang sua ho so admin
     * can tach lai thanh 3 o rieng cho cac field nay de nguoi sua khong phai
     * doan dung thu tu tu khi go 1 dong.
     */
    private static function ds260_name_split_fields() {
        return array( 'fatherFullName', 'motherFullName', 'sponsorFullName', 'contactNameUS', 'alternateContactNameUS', 'applicantFullName' );
    }

    private static function split_full_name_parts( $full ) {
        $full  = trim( (string) $full );
        if ( '' === $full ) {
            return array( '', '', '' );
        }
        $words = preg_split( '/\s+/u', $full, -1, PREG_SPLIT_NO_EMPTY );
        $count = count( $words );
        if ( 0 === $count ) {
            return array( '', '', '' );
        }
        if ( 1 === $count ) {
            return array( $words[0], '', '' );
        }
        if ( 2 === $count ) {
            return array( $words[0], '', $words[1] );
        }
        $last   = $words[0];
        $first  = $words[ $count - 1 ];
        $middle = implode( ' ', array_slice( $words, 1, $count - 2 ) );
        return array( $last, $middle, $first );
    }

    private static function render_edit( $id ) {
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_die( 'Ban khong co quyen thuc hien thao tac nay.' );
        }

        $row = ICAVIET_DB::get_by_id( $id );
        if ( ! $row ) {
            echo '<div class="wrap"><p>Khong tim thay submission #' . (int) $id . '</p></div>';
            return;
        }

        $data = json_decode( $row['data'], true );
        $data = is_array( $data ) ? $data : array();

        $is_ds260        = ( 'ds-260' === $row['form_slug'] );
        $name_split_keys = $is_ds260 ? self::ds260_name_split_fields() : array();

        $notice = '';

        if ( isset( $_POST['ICAVIET_save_edit'] ) ) {
            check_admin_referer( 'ICAVIET_edit_submission_' . $id );

            $json_errors = array();

            foreach ( $data as $key => $original_value ) {
                if ( in_array( $key, $name_split_keys, true ) ) {
                    continue;
                }

                $post_key = 'field__' . $key;
                if ( ! isset( $_POST[ $post_key ] ) ) {
                    continue;
                }

                $raw = wp_unslash( $_POST[ $post_key ] );

                if ( is_array( $original_value ) ) {
                    $decoded = json_decode( $raw, true );
                    if ( json_last_error() !== JSON_ERROR_NONE || ! is_array( $decoded ) ) {
                        $json_errors[] = $key;
                        continue;
                    }
                    $data[ $key ] = $decoded;
                } else {
                    $data[ $key ] = sanitize_textarea_field( $raw );
                }
            }

            foreach ( $name_split_keys as $nk ) {
                if ( ! array_key_exists( $nk, $data ) ) {
                    continue;
                }
                $last_key   = 'field__' . $nk . '__last';
                $middle_key = 'field__' . $nk . '__middle';
                $first_key  = 'field__' . $nk . '__first';
                if ( ! isset( $_POST[ $last_key ] ) && ! isset( $_POST[ $middle_key ] ) && ! isset( $_POST[ $first_key ] ) ) {
                    continue;
                }
                $last   = isset( $_POST[ $last_key ] ) ? sanitize_text_field( wp_unslash( $_POST[ $last_key ] ) ) : '';
                $middle = isset( $_POST[ $middle_key ] ) ? sanitize_text_field( wp_unslash( $_POST[ $middle_key ] ) ) : '';
                $first  = isset( $_POST[ $first_key ] ) ? sanitize_text_field( wp_unslash( $_POST[ $first_key ] ) ) : '';
                $data[ $nk ] = implode( ' ', array_filter( array( $last, $middle, $first ), function ( $part ) {
                    return '' !== $part;
                } ) );
            }

            ICAVIET_DB::update_submission_data( $id, $data );
            ICAVIET_DB::clear_pdf_paths( $id );

            if ( ! empty( $json_errors ) ) {
                $notice = '<div class="notice notice-error"><p>Cac truong sau dinh dang JSON khong hop le nen chua duoc luu: <strong>'
                    . esc_html( implode( ', ', $json_errors ) )
                    . '</strong>. Cac truong khac da duoc luu, vui long sua lai roi luu tiep.</p></div>';
            } else {
                $notice = '<div class="notice notice-success is-dismissible"><p>Da luu thay doi.</p></div>';
            }
        }

        $back             = admin_url( 'admin.php?page=ICAVIET-forms' );
        $view_url         = admin_url( 'admin.php?page=ICAVIET-forms&action=view&id=' . $id );
        $duplicated_from  = isset( $_GET['duplicated_from'] ) ? (int) $_GET['duplicated_from'] : 0;
        ?>
        <div class="wrap ICAVIET-wrap">
            <h1>
                <a href="<?php echo esc_url( $back ); ?>" class="page-title-action">&larr; Quay lai</a>
                Sua ho so <?php echo esc_html( $row['form_slug'] ); ?> #<?php echo (int) $id; ?>
            </h1>

            <?php if ( $duplicated_from > 0 ) : ?>
                <div class="notice notice-info">
                    <p>Da tao ho so moi #<?php echo (int) $id; ?> tu ho so #<?php echo (int) $duplicated_from; ?>.
                    Vui long kiem tra va sua cac thong tin khac nhau (ten, ngay sinh, hoc van, so dien thoai...) roi luu lai.</p>
                </div>
            <?php endif; ?>

            <?php if ( $notice ) echo $notice; ?>

            <p><a class="button" href="<?php echo esc_url( $view_url ); ?>">Xem chi tiet / Tai PDF</a></p>

            <form method="post">
                <?php wp_nonce_field( 'ICAVIET_edit_submission_' . $id ); ?>
                <table class="wp-list-table widefat fixed" style="max-width:960px">
                    <thead>
                        <tr>
                            <th style="width:30%">Truong</th>
                            <th>Gia tri</th>
                        </tr>
                    </thead>
                    <tbody>
                    <?php foreach ( $data as $k => $v ) : ?>
                        <tr>
                            <td>
                                <strong><?php echo esc_html( $k ); ?></strong>
                                <?php if ( is_array( $v ) ) : ?>
                                    <p style="color:#94a3b8;font-size:11px;margin:4px 0 0;">Dinh dang JSON &mdash; giu nguyen dau ngoac</p>
                                <?php endif; ?>
                            </td>
                            <td>
                                <?php if ( in_array( $k, $name_split_keys, true ) && ! is_array( $v ) ) :
                                    list( $part_last, $part_middle, $part_first ) = self::split_full_name_parts( (string) $v );
                                ?>
                                    <div style="display:flex;gap:8px;">
                                        <div style="flex:1;">
                                            <label style="display:block;font-size:11px;color:#64748b;margin-bottom:2px;">Ho</label>
                                            <input type="text" name="field__<?php echo esc_attr( $k ); ?>__last" value="<?php echo esc_attr( $part_last ); ?>" style="width:100%;" />
                                        </div>
                                        <div style="flex:1;">
                                            <label style="display:block;font-size:11px;color:#64748b;margin-bottom:2px;">Ten lot</label>
                                            <input type="text" name="field__<?php echo esc_attr( $k ); ?>__middle" value="<?php echo esc_attr( $part_middle ); ?>" style="width:100%;" />
                                        </div>
                                        <div style="flex:1;">
                                            <label style="display:block;font-size:11px;color:#64748b;margin-bottom:2px;">Ten</label>
                                            <input type="text" name="field__<?php echo esc_attr( $k ); ?>__first" value="<?php echo esc_attr( $part_first ); ?>" style="width:100%;" />
                                        </div>
                                    </div>
                                <?php else : ?>
                                    <textarea
                                        name="field__<?php echo esc_attr( $k ); ?>"
                                        rows="<?php echo is_array( $v ) ? 6 : 1; ?>"
                                        style="width:100%;<?php echo is_array( $v ) ? 'font-family:monospace;font-size:12px;' : ''; ?>"
                                    ><?php
                                        echo is_array( $v )
                                            ? esc_textarea( wp_json_encode( $v, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) )
                                            : esc_textarea( (string) $v );
                                    ?></textarea>
                                <?php endif; ?>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                    </tbody>
                </table>
                <p class="submit">
                    <button type="submit" name="ICAVIET_save_edit" value="1" class="button button-primary">Luu thay doi</button>
                </p>
            </form>
        </div>
        <?php
    }

    public static function render_settings() {
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_die( 'Khong co quyen.' );
        }

        // Xu ly luu cai dat
        if ( isset( $_POST['ICAVIET_save'] ) && check_admin_referer( 'ICAVIET_settings' ) ) {
            $raw_emails = isset( $_POST['ICAVIET_emails'] ) ? wp_unslash( $_POST['ICAVIET_emails'] ) : '';
            // Sanitize tung dong
            $lines = preg_split( '/[\r\n,;]+/', $raw_emails );
            $clean = array();
            foreach ( $lines as $line ) {
                $line = trim( $line );
                if ( ! empty( $line ) && is_email( $line ) ) {
                    $clean[] = sanitize_email( $line );
                }
            }
            update_option( 'ICAVIET_admin_emails', implode( "\n", array_unique( $clean ) ) );

            // Luu webhook settings
            $webhook_url = isset( $_POST['ICAVIET_webhook_url'] ) ? esc_url_raw( wp_unslash( $_POST['ICAVIET_webhook_url'] ) ) : '';
            $webhook_secret = isset( $_POST['ICAVIET_webhook_secret'] ) ? sanitize_text_field( wp_unslash( $_POST['ICAVIET_webhook_secret'] ) ) : '';
            update_option( 'ICAVIET_webhook_url', $webhook_url );
            update_option( 'ICAVIET_webhook_secret', $webhook_secret );

            echo '<div class="notice notice-success"><p>Da luu.</p></div>';
        }

        // Xu ly tao API Key moi
        if ( isset( $_POST['ICAVIET_generate_api_key'] ) && check_admin_referer( 'ICAVIET_settings' ) ) {
            $new_key = ICAVIET_Router::generate_api_key();
            update_option( 'ICAVIET_api_key', $new_key );
            echo '<div class="notice notice-success"><p>Da tao API Key moi!</p></div>';
        }

        // Xu ly test gui mail
        $test_results = null;
        if ( isset( $_POST['ICAVIET_test_mail'] ) && check_admin_referer( 'ICAVIET_settings' ) ) {
            $test_results = ICAVIET_Mailer::test_send();
        }

        // Xu ly test webhook
        $webhook_result = null;
        if ( isset( $_POST['ICAVIET_test_webhook'] ) && check_admin_referer( 'ICAVIET_settings' ) ) {
            $webhook_result = ICAVIET_Mailer::test_webhook();
        }

        $emails_raw = get_option( 'ICAVIET_admin_emails', '' );
        // Backward compat: neu chua co option moi, doc tu option cu
        if ( empty( $emails_raw ) ) {
            $to1 = get_option( 'ICAVIET_admin_email', get_option( 'admin_email' ) );
            $to2 = get_option( 'ICAVIET_admin_email_2', '' );
            $emails_raw = implode( "\n", array_filter( array( $to1, $to2 ) ) );
        }
        $endpoint = rest_url( 'ICAVIET/v1/submit/{form-slug}' );
        $webhook_url = get_option( 'ICAVIET_webhook_url', '' );
        $webhook_secret = get_option( 'ICAVIET_webhook_secret', '' );
        $api_key = get_option( 'ICAVIET_api_key', '' );
        ?>
        <div class="wrap ICAVIET-wrap">
            <h1>Cai dat – ICAVIET Forms</h1>

            <?php if ( $test_results !== null ) : ?>
                <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:16px 0;max-width:600px;">
                    <h3 style="margin:0 0 12px;">🧪 Ket qua Test gui mail</h3>

                    <?php if ( isset( $test_results['_error'] ) ) : ?>
                        <div class="notice notice-error" style="margin:0;">
                            <p><?php echo esc_html( $test_results['_error'] ); ?></p>
                        </div>
                    <?php else : ?>
                        <table style="border-collapse:collapse;width:100%;font-size:14px;">
                            <thead>
                                <tr style="background:#f1f5f9;">
                                    <th style="text-align:left;padding:10px 8px;border-bottom:2px solid #e2e8f0;">Email</th>
                                    <th style="text-align:left;padding:10px 8px;border-bottom:2px solid #e2e8f0;">Ket qua</th>
                                    <th style="text-align:left;padding:10px 8px;border-bottom:2px solid #e2e8f0;">Chi tiet loi</th>
                                </tr>
                            </thead>
                            <tbody>
                            <?php foreach ( $test_results as $email => $info ) : ?>
                                <tr>
                                    <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;">
                                        <code><?php echo esc_html( $email ); ?></code>
                                    </td>
                                    <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;">
                                        <?php if ( $info['ok'] ) : ?>
                                            <span style="color:#16a34a;font-weight:bold;">✅ Thanh cong</span>
                                        <?php else : ?>
                                            <span style="color:#dc2626;font-weight:bold;">❌ That bai</span>
                                        <?php endif; ?>
                                    </td>
                                    <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;">
                                        <?php echo esc_html( $info['error'] ); ?>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                            </tbody>
                        </table>

                        <p style="margin:12px 0 0;font-size:13px;color:#64748b;">
                            💡 Neu thanh cong nhung khong nhan duoc mail, kiem tra thu muc Spam/Junk.
                            <br>Neu that bai, kiem tra cau hinh SMTP plugin (FluentSMTP / WP Mail SMTP).
                        </p>
                    <?php endif; ?>
                </div>
            <?php endif; ?>

            <?php if ( $webhook_result !== null ) : ?>
                <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:16px 0;max-width:600px;">
                    <h3 style="margin:0 0 12px;">🔗 Ket qua Test Webhook</h3>
                    <?php if ( $webhook_result['ok'] ) : ?>
                        <div class="notice notice-success" style="margin:0;">
                            <p><strong>✅ Thanh cong!</strong> Website backup da nhan du lieu.</p>
                        </div>
                    <?php else : ?>
                        <div class="notice notice-error" style="margin:0;">
                            <p><strong>❌ That bai!</strong> <?php echo esc_html( $webhook_result['error'] ); ?></p>
                        </div>
                    <?php endif; ?>
                    <?php if ( ! empty( $webhook_result['http_code'] ) ) : ?>
                        <p style="margin:10px 0 0;font-size:13px;color:#64748b;">HTTP Code: <code><?php echo (int) $webhook_result['http_code']; ?></code></p>
                    <?php endif; ?>
                    <?php if ( ! empty( $webhook_result['response'] ) ) : ?>
                        <p style="margin:6px 0 0;font-size:13px;color:#64748b;">Response: <code><?php echo esc_html( mb_substr( $webhook_result['response'], 0, 500 ) ); ?></code></p>
                    <?php endif; ?>
                </div>
            <?php endif; ?>

            <form method="post">
                <?php wp_nonce_field( 'ICAVIET_settings' ); ?>

                <table class="form-table">
                    <tr>
                        <th>Email nhan thong bao</th>
                        <td>
                            <textarea
                                name="ICAVIET_emails"
                                rows="5"
                                class="large-text"
                                style="max-width:420px;"
                                placeholder="email1@example.com&#10;email2@example.com&#10;email3@example.com"
                            ><?php echo esc_textarea( $emails_raw ); ?></textarea>
                            <p class="description">
                                Nhap danh sach email nhan thong bao, <strong>moi dong 1 email</strong>.<br>
                                Khong gioi han so luong. Co the phan cach bang xuong dong, dau phay, hoac dau cham phay.
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <th>SMTP</th>
                        <td>
                            <p class="description">
                                Cai them plugin <strong>FluentSMTP</strong> hoac <strong>WP Mail SMTP</strong> de gui qua SMTP/Gmail.
                                Plugin nay dung <code>wp_mail()</code>.
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <th>Noi dung email</th>
                        <td>
                            <p class="description">
                                Khi user submit, he thong se gui mail toi tat ca email o tren.
                                Noi dung mail gom link mo PDF va link xem chi tiet trong WP Admin.
                            </p>
                        </td>
                    </tr>
                </table>

                <h2 style="margin-top:30px;padding-top:20px;border-top:1px solid #e2e8f0;">🔗 Webhook Backup (API)</h2>
                <p class="description" style="margin-bottom:16px;">
                    Cau hinh gui du lieu qua API den 1 website khac lam phuong an backup.
                    Khi co form moi, ngoai gui mail, he thong se POST du lieu (gom link PDF) den URL ben duoi.
                </p>
                <table class="form-table">
                    <tr>
                        <th>Webhook URL</th>
                        <td>
                            <input
                                type="url"
                                name="ICAVIET_webhook_url"
                                class="large-text"
                                style="max-width:420px;"
                                value="<?php echo esc_attr( $webhook_url ); ?>"
                                placeholder="https://website-khac.com/icaviet-receiver.php"
                            />
                            <p class="description">
                                URL cua website backup se nhan du lieu. De trong neu khong su dung.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <th>Secret Key</th>
                        <td>
                            <input
                                type="text"
                                name="ICAVIET_webhook_secret"
                                class="large-text"
                                style="max-width:420px;"
                                value="<?php echo esc_attr( $webhook_secret ); ?>"
                                placeholder="dat-mat-khau-bi-mat-o-day"
                            />
                            <p class="description">
                                Mat khau chia se giua 2 website de xac thuc. Phai giong nhau o ca 2 ben.
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <th>Endpoint URL</th>
                        <td><code><?php echo esc_html( $endpoint ); ?></code></td>
                    </tr>

                    <tr>
                        <th>Forms da dang ky</th>
                        <td>
                            <?php foreach ( ICAVIET_Router::get_all() as $s => $c ) : ?>
                                <div>
                                    <code><?php echo esc_html( $s ); ?></code>
                                    &rarr;
                                    <em><?php echo esc_html( $c ); ?></em>
                                </div>
                            <?php endforeach; ?>
                        </td>
                    </tr>
                </table>

                <h2 style="margin-top:30px;padding-top:20px;border-top:1px solid #e2e8f0;">🔑 API cho Web App</h2>
                <p class="description" style="margin-bottom:16px;">
                    Cac endpoint API de web app ben ngoai goi vao lay PDF va du lieu submissions.
                    Can API Key de xac thuc.
                </p>
                <table class="form-table">
                    <tr>
                        <th>API Key</th>
                        <td>
                            <?php if ( ! empty( $api_key ) ) : ?>
                                <code style="background:#f1f5f9;padding:6px 12px;border-radius:4px;font-size:14px;user-select:all;"><?php echo esc_html( $api_key ); ?></code>
                                <p class="description">Copy key nay de dung trong web app. <strong>Giu bi mat!</strong></p>
                            <?php else : ?>
                                <span style="color:#94a3b8;">Chua co API Key.</span>
                            <?php endif; ?>
                            <br>
                            <button type="submit" name="ICAVIET_generate_api_key" value="1" class="button button-secondary" style="margin-top:8px;background:#059669;color:#fff;border-color:#047857;">
                                🔑 <?php echo empty( $api_key ) ? 'Tao API Key' : 'Tao lai API Key moi'; ?>
                            </button>
                        </td>
                    </tr>
                    <tr>
                        <th>API Endpoints</th>
                        <td>
                            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:16px;font-size:13px;line-height:2;">
                                <strong>📄 Lay PDF moi nhat:</strong><br>
                                <code>GET <?php echo esc_html( rest_url( 'ICAVIET/v1/api/latest-pdf' ) ); ?>?api_key=xxx&amp;lang=en</code>
                                <br><br>
                                <strong>📄 Lay PDF theo ID:</strong><br>
                                <code>GET <?php echo esc_html( rest_url( 'ICAVIET/v1/api/pdf/{id}' ) ); ?>?api_key=xxx&amp;lang=en</code>
                                <br><br>
                                <strong>📋 Danh sach submissions:</strong><br>
                                <code>GET <?php echo esc_html( rest_url( 'ICAVIET/v1/api/submissions' ) ); ?>?api_key=xxx</code>
                            </div>
                            <p class="description" style="margin-top:10px;">
                                Truyen <code>api_key</code> qua query param hoac header <code>X-API-Key</code>.<br>
                                Them <code>&amp;lang=vi</code> de lay PDF tieng Viet.<br>
                                Them <code>&amp;form_slug=hop-dong</code> de loc theo loai form.
                            </p>
                        </td>
                    </tr>
                </table>

                <p class="submit" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                    <?php submit_button( 'Luu cai dat', 'primary', 'ICAVIET_save', false ); ?>
                    <button type="submit" name="ICAVIET_test_mail" value="1" class="button button-secondary" style="background:#f59e0b;color:#fff;border-color:#d97706;height:30px;">
                        📧 Test gui mail
                    </button>
                    <button type="submit" name="ICAVIET_test_webhook" value="1" class="button button-secondary" style="background:#8b5cf6;color:#fff;border-color:#7c3aed;height:30px;">
                        🔗 Test Webhook
                    </button>
                </p>
            </form>
        </div>
        <?php
    }
}
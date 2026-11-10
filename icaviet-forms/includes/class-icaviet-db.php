<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class ICAVIET_DB {

    const TABLE = 'ICAVIET_submissions';

    /** Tao bang DB khi kich hoat plugin */
    public static function create_table() {
        global $wpdb;
        $table   = $wpdb->prefix . self::TABLE;
        $charset = $wpdb->get_charset_collate();
        
        // Fallback for misconfigured DB_CHARSET in wp-config.php
        if ( empty( $charset ) || strpos( $charset, 'utf8' ) === false ) {
            $charset = 'DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci';
        }

        $sql = "CREATE TABLE IF NOT EXISTS {$table} (
            id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            form_slug    VARCHAR(100)    NOT NULL,
            data         LONGTEXT        NOT NULL,
            pdf_path     VARCHAR(500)    DEFAULT NULL,
            pdf_path_vi  VARCHAR(500)    DEFAULT NULL,
            submitted_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
            ip_address   VARCHAR(45)     DEFAULT NULL,
            status       ENUM('new','read','archived') NOT NULL DEFAULT 'new',
            PRIMARY KEY (id),
            KEY idx_slug   (form_slug),
            KEY idx_status (status)
        ) {$charset};";

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        dbDelta( $sql );

        self::create_relationship_change_log_table();
    }

    /** Tao bang log khi nhan vien chuyen dien ho so bao lanh. */
    public static function create_relationship_change_log_table() {
        global $wpdb;
        $table   = $wpdb->prefix . 'icaviet_relationship_change_logs';
        $charset = $wpdb->get_charset_collate();

        if ( empty( $charset ) || strpos( $charset, 'utf8' ) === false ) {
            $charset = 'DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci';
        }

        $sql = "CREATE TABLE IF NOT EXISTS {$table} (
            id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            submission_id    BIGINT UNSIGNED NOT NULL,
            submission_slug  VARCHAR(100)    NOT NULL,
            old_relationship VARCHAR(100)    DEFAULT NULL,
            new_relationship VARCHAR(100)    NOT NULL,
            reason           TEXT            DEFAULT NULL,
            changed_by       BIGINT UNSIGNED DEFAULT NULL,
            changed_by_name  VARCHAR(191)    DEFAULT NULL,
            old_data         LONGTEXT        DEFAULT NULL,
            new_data         LONGTEXT        DEFAULT NULL,
            changed_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_submission (submission_id, submission_slug),
            KEY idx_changed_at (changed_at)
        ) {$charset};";

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        dbDelta( $sql );
    }

    /**
     * Luu submission moi.
     * @return int ID moi vua insert, 0 neu loi.
     */
    public static function save( $form_slug, $data, $ip = '' ) {
        global $wpdb;
        $table = $wpdb->prefix . self::TABLE;

        // Tach signature ra – khong luu base64 vao cot data chinh
        $signature = '';
        if ( ! empty( $data['signaturePng'] ) ) {
            $signature = $data['signaturePng'];
            unset( $data['signaturePng'] );
        }
        if ( ! empty( $data['signatureData'] ) ) {
            $signature = $data['signatureData'];
            unset( $data['signatureData'] );
        }

        $inserted = $wpdb->insert(
            $table,
            array(
                'form_slug'    => sanitize_key( $form_slug ),
                'data'         => wp_json_encode( $data, JSON_UNESCAPED_UNICODE ),
                'ip_address'   => sanitize_text_field( $ip ),
                'submitted_at' => current_time( 'mysql' ),
            ),
            array( '%s', '%s', '%s', '%s' )
        );

        if ( false === $inserted ) {
            error_log( '[ICAVIET DB] Insert failed: ' . $wpdb->last_error );
            return 0;
        }

        $id = (int) $wpdb->insert_id;

        if ( $id && $signature ) {
            self::save_signature( $id, $signature );
        }

        return $id;
    }

    public static function update_pdf_path( $id, $path ) {
        global $wpdb;
        $wpdb->update(
            $wpdb->prefix . self::TABLE,
            array( 'pdf_path' => $path ),
            array( 'id'       => $id ),
            array( '%s' ),
            array( '%d' )
        );
    }

    public static function update_pdf_path_vi( $id, $path ) {
        global $wpdb;
        $wpdb->update(
            $wpdb->prefix . self::TABLE,
            array( 'pdf_path_vi' => $path ),
            array( 'id'          => $id ),
            array( '%s' ),
            array( '%d' )
        );
    }

    /** Xoa cache PDF da luu, de lan tai sau luon dung lai tu data moi nhat. */
    public static function clear_pdf_paths( $id ) {
        global $wpdb;
        $wpdb->update(
            $wpdb->prefix . self::TABLE,
            array(
                'pdf_path'    => null,
                'pdf_path_vi' => null,
            ),
            array( 'id' => (int) $id ),
            array( '%s', '%s' ),
            array( '%d' )
        );
    }

    public static function get_list( $form_slug = '', $page = 1, $per_page = 20 ) {
        global $wpdb;
        $table  = $wpdb->prefix . self::TABLE;
        $offset = ( $page - 1 ) * $per_page;

        if ( $form_slug ) {
            $rows  = $wpdb->get_results( $wpdb->prepare(
                "SELECT id, form_slug, data, submitted_at, ip_address, status, pdf_path, pdf_path_vi
                 FROM {$table} WHERE form_slug = %s ORDER BY submitted_at DESC LIMIT %d OFFSET %d",
                $form_slug, $per_page, $offset
            ), ARRAY_A );
            $total = (int) $wpdb->get_var( $wpdb->prepare(
                "SELECT COUNT(*) FROM {$table} WHERE form_slug = %s", $form_slug
            ) );
        } else {
            $rows  = $wpdb->get_results( $wpdb->prepare(
                "SELECT id, form_slug, data, submitted_at, ip_address, status, pdf_path, pdf_path_vi
                 FROM {$table} ORDER BY submitted_at DESC LIMIT %d OFFSET %d",
                $per_page, $offset
            ), ARRAY_A );
            $total = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$table}" );
        }

        return array(
            'rows'        => $rows ? $rows : array(),
            'total'       => $total,
            'page'        => $page,
            'per_page'    => $per_page,
            'total_pages' => (int) ceil( $total / $per_page ),
        );
    }

    public static function get_by_id( $id ) {
        global $wpdb;
        $row = $wpdb->get_row(
            $wpdb->prepare(
                'SELECT * FROM ' . $wpdb->prefix . self::TABLE . ' WHERE id = %d',
                $id
            ),
            ARRAY_A
        );
        return $row ? $row : null;
    }

    public static function mark_read( $id ) {
        global $wpdb;
        $wpdb->update(
            $wpdb->prefix . self::TABLE,
            array( 'status' => 'read' ),
            array( 'id'     => $id ),
            array( '%s' ),
            array( '%d' )
        );
    }

    public static function update_submission_data( $id, $data ) {
        global $wpdb;
        return false !== $wpdb->update(
            $wpdb->prefix . self::TABLE,
            array( 'data' => wp_json_encode( $data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) ),
            array( 'id'   => (int) $id ),
            array( '%s' ),
            array( '%d' )
        );
    }

    public static function insert_relationship_change_log( $args ) {
        global $wpdb;
        self::create_relationship_change_log_table();

        $defaults = array(
            'submission_id'    => 0,
            'submission_slug'  => '',
            'old_relationship' => '',
            'new_relationship' => '',
            'reason'           => '',
            'changed_by'       => get_current_user_id(),
            'changed_by_name'  => '',
            'old_data'         => null,
            'new_data'         => null,
        );
        $args = wp_parse_args( $args, $defaults );

        $user = wp_get_current_user();
        if ( empty( $args['changed_by_name'] ) && $user && $user->exists() ) {
            $args['changed_by_name'] = $user->user_login;
        }

        return false !== $wpdb->insert(
            $wpdb->prefix . 'icaviet_relationship_change_logs',
            array(
                'submission_id'    => (int) $args['submission_id'],
                'submission_slug'  => sanitize_key( $args['submission_slug'] ),
                'old_relationship' => sanitize_text_field( $args['old_relationship'] ),
                'new_relationship' => sanitize_text_field( $args['new_relationship'] ),
                'reason'           => sanitize_textarea_field( $args['reason'] ),
                'changed_by'       => (int) $args['changed_by'],
                'changed_by_name'  => sanitize_text_field( $args['changed_by_name'] ),
                'old_data'         => null === $args['old_data'] ? null : wp_json_encode( $args['old_data'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ),
                'new_data'         => null === $args['new_data'] ? null : wp_json_encode( $args['new_data'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ),
                'changed_at'       => current_time( 'mysql' ),
            ),
            array( '%d', '%s', '%s', '%s', '%s', '%d', '%s', '%s', '%s', '%s' )
        );
    }

    public static function get_relationship_change_logs( $submission_id, $submission_slug = '' ) {
        global $wpdb;
        self::create_relationship_change_log_table();

        if ( $submission_slug ) {
            return $wpdb->get_results(
                $wpdb->prepare(
                    'SELECT * FROM ' . $wpdb->prefix . 'icaviet_relationship_change_logs WHERE submission_id = %d AND submission_slug = %s ORDER BY changed_at DESC, id DESC',
                    (int) $submission_id,
                    sanitize_key( $submission_slug )
                ),
                ARRAY_A
            );
        }

        return $wpdb->get_results(
            $wpdb->prepare(
                'SELECT * FROM ' . $wpdb->prefix . 'icaviet_relationship_change_logs WHERE submission_id = %d ORDER BY changed_at DESC, id DESC',
                (int) $submission_id
            ),
            ARRAY_A
        );
    }

    public static function count_new() {
        global $wpdb;
        return (int) $wpdb->get_var(
            'SELECT COUNT(*) FROM ' . $wpdb->prefix . self::TABLE . " WHERE status = 'new'"
        );
    }

    public static function get_signature_path( $id ) {
        $upload_dir = wp_upload_dir();
        return $upload_dir['basedir'] . '/ICAVIET-signatures/sig-' . $id . '.png';
    }

    private static function save_signature( $id, $base64 ) {
        $upload_dir = wp_upload_dir();
        $dir        = $upload_dir['basedir'] . '/ICAVIET-signatures/';
        if ( ! is_dir( $dir ) ) {
            wp_mkdir_p( $dir );
            file_put_contents( $dir . '.htaccess', 'deny from all' );
        }
        $raw = preg_replace( '/^data:image\/\w+;base64,/', '', $base64 );
        $png = base64_decode( $raw );
        if ( $png ) {
            file_put_contents( $dir . 'sig-' . $id . '.png', $png );
        }
    }
}

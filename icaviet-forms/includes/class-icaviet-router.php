<?php
if (!defined('ABSPATH'))
    exit;

class ICAVIET_Router
{
    // PDF filename patch: 2026-05-25-v1-form-name-applicant-name

    private static $registry = array();

    public static function add($slug, $class_name)
    {
        self::$registry[$slug] = $class_name;
    }

    public static function register()
    {
        // Route submit form
        register_rest_route('ICAVIET/v1', '/submit/(?P<form>[a-z0-9\-]+)', array(
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => array(__CLASS__, 'dispatch'),
            'permission_callback' => '__return_true',
        ));

        // Route get schema
        register_rest_route('ICAVIET/v1', '/schema/(?P<form>[a-z0-9\-]+)', array(
            'methods' => WP_REST_Server::READABLE,
            'callback' => array(__CLASS__, 'get_schema'),
            'permission_callback' => '__return_true',
        ));

        // Route tải PDF (chỉ admin)
        register_rest_route('ICAVIET/v1', '/pdf/(?P<id>\d+)', array(
            'methods' => WP_REST_Server::READABLE,
            'callback' => array(__CLASS__, 'download_pdf'),
            'permission_callback' => array(__CLASS__, 'check_admin'),
        ));

        // Route public để mở PDF bằng token (dùng gửi qua email)
        register_rest_route('ICAVIET/v1', '/pdf-link/(?P<id>\d+)', array(
            'methods' => WP_REST_Server::READABLE,
            'callback' => array(__CLASS__, 'download_pdf_public'),
            'permission_callback' => '__return_true',
        ));

        // Route debug – chỉ admin
        register_rest_route('ICAVIET/v1', '/pdf-debug/(?P<id>\d+)', array(
            'methods' => WP_REST_Server::READABLE,
            'callback' => array(__CLASS__, 'debug_pdf'),
            'permission_callback' => array(__CLASS__, 'check_admin'),
        ));

        // ====== API CHO WEB APP BEN NGOAI ======

        // Lay PDF moi nhat
        register_rest_route('ICAVIET/v1', '/api/latest-pdf', array(
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => array(__CLASS__, 'api_latest_pdf'),
            'permission_callback' => '__return_true',
        ));

        // Lay PDF theo ID
        register_rest_route('ICAVIET/v1', '/api/pdf/(?P<id>\d+)', array(
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => array(__CLASS__, 'api_get_pdf'),
            'permission_callback' => '__return_true',
        ));

        // Lay danh sach submissions (JSON, khong tra PDF)
        register_rest_route('ICAVIET/v1', '/api/submissions', array(
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => array(__CLASS__, 'api_list_submissions'),
            'permission_callback' => '__return_true',
        ));

        // ====== API QUẢN LÝ DS-160 ======

        // Lay danh sach DS-160
        register_rest_route('ICAVIET/v1', '/api/ds160', array(
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => array(__CLASS__, 'api_ds160_list'),
            'permission_callback' => '__return_true',
        ));

        // Lay chi tiet 1 DS-160 theo ID
        register_rest_route('ICAVIET/v1', '/api/ds160/(?P<id>\d+)', array(
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => array(__CLASS__, 'api_ds160_detail'),
            'permission_callback' => '__return_true',
        ));
    }

    public static function check_admin()
    {
        return current_user_can('manage_options');
    }

    public static function dispatch(WP_REST_Request $request)
    {
        $slug = sanitize_key($request->get_param('form'));

        if (!isset(self::$registry[$slug])) {
            return new WP_REST_Response(
                array(
                    'success' => false,
                    'message' => 'Form khong ton tai: ' . $slug,
                ),
                404
            );
        }

        $class = self::$registry[$slug];

        if (!class_exists($class)) {
            return new WP_REST_Response(
                array(
                    'success' => false,
                    'message' => 'Handler khong tim thay.',
                ),
                500
            );
        }

        $handler = new $class();
        return $handler->process($request);
    }

    public static function get_schema(WP_REST_Request $request) {
        $slug = sanitize_key($request->get_param('form'));
        $schema_path = ICAVIET_DIR . 'forms/' . $slug . '/schema.json';
        
        if (!file_exists($schema_path)) {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'Schema not found for: ' . $slug
            ], 404);
        }

        $json = file_get_contents($schema_path);
        if (is_string($json)) {
            $json = preg_replace('/^\xEF\xBB\xBF/', '', $json);
        }

        $schema = json_decode($json, true);
        if (JSON_ERROR_NONE !== json_last_error()) {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'Invalid schema JSON: ' . json_last_error_msg()
            ], 500);
        }

        return new WP_REST_Response($schema, 200);
    }

    public static function make_pdf_token($id)
    {
        $id = (int) $id;
        return hash_hmac('sha256', 'ICAVIET-pdf|' . $id, wp_salt('auth'));
    }

    public static function get_public_pdf_url($id, $lang = 'en')
    {
        $id = (int) $id;

        return add_query_arg(
            array(
                'token' => self::make_pdf_token($id),
                'lang' => $lang,
            ),
            rest_url('ICAVIET/v1/pdf-link/' . $id)
        );
    }

    private static function verify_pdf_token($id, $token)
    {
        $expected = self::make_pdf_token($id);
        return hash_equals($expected, (string) $token);
    }

    private static function clear_output_buffers()
    {
        while (ob_get_level() > 0) {
            @ob_end_clean();
        }
    }

    private static function get_submission_and_handler($id, &$row = null, &$handler = null, &$slug = '', &$error = '')
    {
        $id = (int) $id;
        $row = ICAVIET_DB::get_by_id($id);

        if (!$row) {
            $error = 'Khong tim thay submission.';
            return false;
        }

        $slug = isset($row['form_slug']) ? sanitize_key($row['form_slug']) : '';

        if (!isset(self::$registry[$slug])) {
            $error = 'Handler chua duoc dang ky.';
            return false;
        }

        $class = self::$registry[$slug];

        if (!class_exists($class)) {
            $error = 'Handler khong ton tai.';
            return false;
        }

        $handler = new $class();
        return true;
    }

    private static function build_pdf_bytes($id, &$row = null, &$slug = '', &$error = '')
    {
        $handler = null;

        if (!self::get_submission_and_handler($id, $row, $handler, $slug, $error)) {
            return false;
        }

        $data = json_decode($row['data'], true);
        $data = is_array($data) ? $data : array();
        $data['_id'] = (int) $id;

        try {
            return ICAVIET_PDF::generate(
                $data,
                $handler->get_pdf_template(),
                $handler->get_label()
            );
        } catch (\Throwable $e) {
            $error = 'Loi tao PDF: ' . $e->getMessage();
            error_log(
                '[ICAVIET] PDF Error: ' .
                $e->getMessage() .
                ' in ' . $e->getFile() . ':' . $e->getLine()
            );
            return false;
        }
    }

    private static function get_saved_pdf_path($row)
    {
        if (!is_array($row)) {
            return '';
        }

        if (!empty($row['pdf_path']) && file_exists($row['pdf_path'])) {
            return $row['pdf_path'];
        }

        return '';
    }

    /**
     * Mot so form can render lai PDF moi moi lan tai, vi PDF cu da duoc luu trong uploads.
     * Bao-lanh va DS-260 can dung template hien tai, ke ca voi ho so da luu PDF cu.
     */
    private static function should_use_saved_pdf($row, $slug = '', $lang = 'en')
    {
        if (!is_array($row)) {
            return false;
        }

        $slug = $slug !== '' ? sanitize_key($slug) : sanitize_key(isset($row['form_slug']) ? $row['form_slug'] : '');

        if ($slug === 'bao-lanh' || $slug === 'ds-260') {
            return false;
        }

        return true;
    }


    private static function get_scalar_from_array_path($data, $keys)
    {
        if (!is_array($data)) {
            return '';
        }

        foreach ($keys as $key) {
            if (isset($data[$key]) && !is_array($data[$key]) && !is_object($data[$key])) {
                $value = trim(wp_strip_all_tags((string) $data[$key]));
                if ($value !== '') {
                    return $value;
                }
            }
        }

        foreach ($data as $value) {
            if (is_array($value)) {
                $found = self::get_scalar_from_array_path($value, $keys);
                if ($found !== '') {
                    return $found;
                }
            }
        }

        return '';
    }

    private static function looks_like_person_name($value)
    {
        $value = trim(wp_strip_all_tags((string) $value));
        if ($value === '') {
            return false;
        }

        if (strlen($value) > 80) {
            return false;
        }

        if (preg_match('/[@:\\/]|https?:|www\./i', $value)) {
            return false;
        }

        if (preg_match('/^[0-9\s\-\/\.]+$/', $value)) {
            return false;
        }

        if (preg_match('/^(co|có|khong|không|yes|no|nam|nữ|nu)$/iu', $value)) {
            return false;
        }

        $words = preg_split('/\s+/u', $value, -1, PREG_SPLIT_NO_EMPTY);
        if (count($words) < 2 || count($words) > 8) {
            return false;
        }

        return (bool) preg_match('/\p{L}/u', $value);
    }

    private static function find_possible_name_recursive($data)
    {
        if (!is_array($data)) {
            return '';
        }

        foreach ($data as $value) {
            if (!is_array($value) && !is_object($value) && self::looks_like_person_name($value)) {
                return trim(wp_strip_all_tags((string) $value));
            }
        }

        foreach ($data as $value) {
            if (is_array($value)) {
                $found = self::find_possible_name_recursive($value);
                if ($found !== '') {
                    return $found;
                }
            }
        }

        return '';
    }

    private static function get_download_name_from_data($data)
    {
        if (!is_array($data)) {
            return '';
        }

        $candidate_keys = array(
            // Bao lanh / NDBL
            'tenTrenGiayTo',
            'tenNguoiDienDon',
            'hoTenThuongDung',
            'hoTenKhaisinh',
            'hoVaTen',
            'tenDayDu',
            'ten',

            // DS-160 / DS-260 / generic
            'fullName',
            'applicantFullName',
            'applicant_full_name',
            'beneficiaryFullName',
            'beneficiary_full_name',
            'declarantFullName',
            'q59_tenDy',
            'name',
        );

        $name = self::get_scalar_from_array_path($data, $candidate_keys);
        if ($name !== '') {
            return $name;
        }

        return self::find_possible_name_recursive($data);
    }

    private static function clean_download_filename_part($text)
    {
        $text = trim(wp_strip_all_tags((string) $text));
        $text = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $text);
        $text = preg_replace('/[\\\/\:\*\?"\<\>\|]+/u', ' ', $text);
        $text = preg_replace('/\s+/u', ' ', $text);
        $text = trim($text, " .-\t\n\r\0\x0B");

        return $text;
    }

    private static function get_download_form_label($slug)
    {
        $slug = strtolower(trim((string) $slug));

        $labels = array(
            'ds-160'   => 'DS-160',
            'ds-260'   => 'DS-260',
            'n-400'    => 'N-400',
            'n-600'    => 'N-600',
            'i-90'     => 'I-90',
            'i-751'    => 'I-751',
            'bao-lanh' => 'Bao lanh',
            'hop-dong' => 'Hop dong',
        );

        if (isset($labels[$slug])) {
            return $labels[$slug];
        }

        if ($slug !== '') {
            return strtoupper($slug);
        }

        return 'ICAVIET Form';
    }

    private static function build_pdf_download_filename($row, $slug, $id, $lang = '')
    {
        $slug = self::clean_download_filename_part($slug);
        $id = (int) $id;
        $lang = self::clean_download_filename_part($lang);

        if ($slug === '' && is_array($row) && !empty($row['form_slug'])) {
            $slug = self::clean_download_filename_part((string) $row['form_slug']);
        }

        $data = array();
        if (is_array($row) && !empty($row['data'])) {
            $decoded = json_decode($row['data'], true);
            if (is_array($decoded)) {
                $data = $decoded;
            }
        }

        $form_label = self::clean_download_filename_part(self::get_download_form_label($slug));
        $name = self::clean_download_filename_part(self::get_download_name_from_data($data));

        $parts = array();
        $parts[] = $form_label !== '' ? $form_label : 'ICAVIET Form';

        if ($name !== '') {
            $parts[] = $name;
        } elseif ($id > 0) {
            $parts[] = 'ID ' . $id;
        }

        if ($lang !== '') {
            $parts[] = strtoupper($lang);
        }

        $filename = implode(' - ', $parts) . '.pdf';
        $filename = self::clean_download_filename_part($filename);

        if ($filename === '') {
            $filename = 'ICAVIET Form' . ($id > 0 ? ' - ID ' . $id : '') . '.pdf';
        }

        return $filename;
    }

    private static function make_ascii_download_filename($filename)
    {
        $filename = self::clean_download_filename_part($filename);

        if (function_exists('remove_accents')) {
            $filename = remove_accents($filename);
        }

        if (function_exists('sanitize_file_name')) {
            $filename = sanitize_file_name($filename);
            $filename = str_replace('-', ' ', $filename);
            $filename = preg_replace('/\s+pdf$/i', '.pdf', $filename);
        }

        $filename = preg_replace('/[^A-Za-z0-9\.\-_ ]+/', '', $filename);
        $filename = preg_replace('/\s+/', ' ', $filename);
        $filename = trim($filename, " .-\t\n\r\0\x0B");

        return $filename !== '' ? $filename : 'icaviet-form.pdf';
    }

    private static function output_pdf_headers($filename, $inline, $length)
    {
        $disposition = $inline ? 'inline' : 'attachment';
        $filename = self::clean_download_filename_part($filename);
        if ($filename === '') {
            $filename = 'icaviet-form.pdf';
        }
        $ascii_filename = self::make_ascii_download_filename($filename);

        nocache_headers();
        header('Content-Type: application/pdf');
        header(
            'Content-Disposition: ' . $disposition .
            '; filename="' . addcslashes($ascii_filename, '"\\') . '"' .
            "; filename*=UTF-8''" . rawurlencode($filename)
        );
        header('Content-Length: ' . (int) $length);
        header('X-Content-Type-Options: nosniff');
    }

    private static function output_pdf_file($file_path, $filename, $inline = false)
    {
        if (!$file_path || !file_exists($file_path)) {
            wp_send_json_error('Khong tim thay file PDF.', 404);
            return;
        }

        self::clear_output_buffers();

        self::output_pdf_headers($filename, $inline, filesize($file_path));

        readfile($file_path); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_readfile
        exit;
    }

    private static function output_pdf_bytes($pdf_bytes, $filename, $inline = false)
    {
        if (!is_string($pdf_bytes) || '' === $pdf_bytes) {
            wp_send_json_error('Du lieu PDF khong hop le.', 500);
            return;
        }

        self::clear_output_buffers();

        self::output_pdf_headers($filename, $inline, strlen($pdf_bytes));

        echo $pdf_bytes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
        exit;
    }

    public static function download_pdf(WP_REST_Request $request)
    {
        $id = (int) $request->get_param('id');

        $row = null;
        $slug = '';
        $error = '';
        $bytes = false;

        if (!self::get_submission_and_handler($id, $row, $handler, $slug, $error)) {
            wp_send_json_error($error, 404);
            return;
        }

        $filename = self::build_pdf_download_filename($row, $slug, $id);
        $pdf_path = self::should_use_saved_pdf($row, $slug, 'en') ? self::get_saved_pdf_path($row) : '';

        if ($pdf_path) {
            self::output_pdf_file($pdf_path, $filename, false);
            return;
        }

        $bytes = self::build_pdf_bytes($id, $row, $slug, $error);
        if (false === $bytes) {
            wp_send_json_error($error, 500);
            return;
        }

        self::output_pdf_bytes($bytes, $filename, false);
    }

    public static function download_pdf_public(WP_REST_Request $request)
    {
        $id = (int) $request->get_param('id');
        $token = (string) $request->get_param('token');
        $lang = sanitize_key((string) $request->get_param('lang'));
        if (!in_array($lang, array('en', 'vi'), true)) {
            $lang = 'en';
        }

        if (!$id || '' === $token) {
            wp_send_json_error('Thieu token.', 403);
            return;
        }

        if (!self::verify_pdf_token($id, $token)) {
            wp_send_json_error('Token khong hop le.', 403);
            return;
        }

        $row = null;
        $slug = '';
        $error = '';
        $bytes = false;

        if (!self::get_submission_and_handler($id, $row, $handler, $slug, $error)) {
            wp_send_json_error($error, 404);
            return;
        }

        $filename = self::build_pdf_download_filename($row, $slug, $id, $lang);

        // Try saved file first (match by lang suffix)
        if (self::should_use_saved_pdf($row, $slug, $lang)) {
            if ($lang === 'vi' && !empty($row['pdf_path_vi']) && file_exists($row['pdf_path_vi'])) {
                self::output_pdf_file($row['pdf_path_vi'], $filename, false);
                return;
            }
            if ($lang === 'en') {
                $pdf_path = self::get_saved_pdf_path($row);
                if ($pdf_path) {
                    self::output_pdf_file($pdf_path, $filename, false);
                    return;
                }
            }
        }

        // Fallback: regenerate
        $vi_template = method_exists($handler, 'get_pdf_template_vi') ? $handler->get_pdf_template_vi() : '';
        $template = ($lang === 'vi' && !empty($vi_template)) ? $vi_template : $handler->get_pdf_template();

        $data = json_decode($row['data'], true);
        $data = is_array($data) ? $data : array();
        $data['_id'] = (int) $id;

        try {
            $bytes = ICAVIET_PDF::generate($data, $template, $handler->get_label());
        } catch (\Throwable $e) {
            wp_send_json_error('Loi tao PDF: ' . $e->getMessage(), 500);
            return;
        }

        if (false === $bytes || '' === $bytes) {
            wp_send_json_error('Khong tao duoc PDF.', 500);
            return;
        }

        self::output_pdf_bytes($bytes, $filename, false);
    }

    public static function debug_pdf(WP_REST_Request $request)
    {
        $id = (int) $request->get_param('id');
        $row = ICAVIET_DB::get_by_id($id);
        $info = array(
            'ICAVIET_dir' => ICAVIET_DIR,
            'tfpdf_exists' => file_exists(ICAVIET_DIR . 'lib/tfpdf.php'),
            'ttfonts_exists' => file_exists(ICAVIET_DIR . 'lib/tfont/unifont/ttfonts.php'),
            'font_dejavusans' => file_exists(ICAVIET_DIR . 'lib/tfont/unifont/DejaVuSans.ttf'),
            'upload_dir' => wp_upload_dir()['basedir'],
            'upload_ICAVIET_exists' => is_dir(wp_upload_dir()['basedir'] . '/ICAVIET-fonts/unifont/'),
            'upload_ttfonts' => file_exists(wp_upload_dir()['basedir'] . '/ICAVIET-fonts/unifont/ttfonts.php'),
            'upload_font' => file_exists(wp_upload_dir()['basedir'] . '/ICAVIET-fonts/unifont/DejaVuSans.ttf'),
            'submission' => $row ? 'found' : 'not found',
            'saved_pdf_path' => ($row && !empty($row['pdf_path'])) ? $row['pdf_path'] : '',
            'saved_pdf_exists' => ($row && !empty($row['pdf_path'])) ? file_exists($row['pdf_path']) : false,
            'public_pdf_url' => self::get_public_pdf_url($id),
            'php_version' => phpversion(),
            'error' => null,
        );

        if ($row) {
            $slug = isset($row['form_slug']) ? $row['form_slug'] : '';
            $class = isset(self::$registry[$slug]) ? self::$registry[$slug] : null;

            if ($class) {
                $data = json_decode($row['data'], true);
                $data = is_array($data) ? $data : array();
                $data['_id'] = $id;
                $handler = new $class();

                try {
                    $bytes = ICAVIET_PDF::generate(
                        $data,
                        $handler->get_pdf_template(),
                        $handler->get_label()
                    );
                    $info['pdf_size'] = strlen($bytes) . ' bytes';
                    $info['success'] = true;
                } catch (\Throwable $e) {
                    $info['error'] = $e->getMessage();
                    $info['file'] = $e->getFile() . ':' . $e->getLine();
                }
            } else {
                $info['error'] = 'Handler not registered for slug: ' . $slug;
            }
        }

        return new WP_REST_Response($info, 200);
    }

    public static function get_all()
    {
        return self::$registry;
    }

    public static function get_slugs()
    {
        return array_keys(self::$registry);
    }

    // ====== API CHO WEB APP BEN NGOAI ======

    /**
     * Xac thuc API Key tu header hoac query param.
     * @return bool|WP_REST_Response true neu hop le, WP_REST_Response loi neu khong
     */
    private static function verify_api_key(WP_REST_Request $request)
    {
        $api_key = get_option('ICAVIET_api_key', '');

        if (empty($api_key)) {
            return new WP_REST_Response(array(
                'ok'    => false,
                'error' => 'API key chua duoc cau hinh tren server.',
            ), 500);
        }

        // Lay key tu header hoac query param
        $provided_key = $request->get_header('X-API-Key');
        if (empty($provided_key)) {
            $provided_key = $request->get_param('api_key');
        }

        if (empty($provided_key) || !hash_equals($api_key, $provided_key)) {
            return new WP_REST_Response(array(
                'ok'    => false,
                'error' => 'API key khong hop le.',
            ), 403);
        }

        return true;
    }

    /**
     * Tao API Key ngau nhien.
     */
    public static function generate_api_key()
    {
        return 'ica_' . bin2hex(random_bytes(24));
    }

    /**
     * API: Lay PDF moi nhat.
     * GET /ICAVIET/v1/api/latest-pdf?api_key=xxx&lang=en
     *
     * Query params:
     *   - api_key (bat buoc neu khong co header X-API-Key)
     *   - lang: en|vi (mac dinh: en)
     *   - form_slug: loc theo loai form (tuy chon)
     */
    public static function api_latest_pdf(WP_REST_Request $request)
    {
        $auth = self::verify_api_key($request);
        if ($auth !== true) {
            return $auth;
        }

        $lang = sanitize_key($request->get_param('lang') ?: 'en');
        if (!in_array($lang, array('en', 'vi'), true)) {
            $lang = 'en';
        }

        $form_slug = sanitize_key($request->get_param('form_slug') ?: '');

        // Tim submission moi nhat
        global $wpdb;
        $table = $wpdb->prefix . ICAVIET_DB::TABLE;

        if ($form_slug) {
            $row = $wpdb->get_row($wpdb->prepare(
                "SELECT * FROM {$table} WHERE form_slug = %s ORDER BY id DESC LIMIT 1",
                $form_slug
            ), ARRAY_A);
        } else {
            $row = $wpdb->get_row(
                "SELECT * FROM {$table} ORDER BY id DESC LIMIT 1",
                ARRAY_A
            );
        }

        if (!$row) {
            return new WP_REST_Response(array(
                'ok'    => false,
                'error' => 'Khong co submission nao.',
            ), 404);
        }

        $id = (int) $row['id'];

        // Tim file PDF da luu
        $saved_slug = sanitize_key(isset($row['form_slug']) ? $row['form_slug'] : '');
        if (self::should_use_saved_pdf($row, $saved_slug, $lang)) {
            if ($lang === 'vi' && !empty($row['pdf_path_vi']) && file_exists($row['pdf_path_vi'])) {
                $slug = $saved_slug;
                $filename = self::build_pdf_download_filename($row, $slug, $id, 'vi');
                self::output_pdf_file($row['pdf_path_vi'], $filename, false);
                return;
            }

            $pdf_path = self::get_saved_pdf_path($row);
            if ($pdf_path && $lang === 'en') {
                $slug = $saved_slug;
                $filename = self::build_pdf_download_filename($row, $slug, $id);
                self::output_pdf_file($pdf_path, $filename, false);
                return;
            }
        }

        // Fallback: generate PDF
        $slug = '';
        $error = '';
        $handler = null;

        if (!self::get_submission_and_handler($id, $row, $handler, $slug, $error)) {
            return new WP_REST_Response(array('ok' => false, 'error' => $error), 500);
        }

        $data = json_decode($row['data'], true);
        $data = is_array($data) ? $data : array();
        $data['_id'] = $id;

        $template = $handler->get_pdf_template();
        if ($lang === 'vi' && method_exists($handler, 'get_pdf_template_vi')) {
            $vi_tpl = $handler->get_pdf_template_vi();
            if (!empty($vi_tpl)) {
                $template = $vi_tpl;
            }
        }

        try {
            $bytes = ICAVIET_PDF::generate($data, $template, $handler->get_label());
        } catch (\Throwable $e) {
            return new WP_REST_Response(array('ok' => false, 'error' => 'Loi tao PDF: ' . $e->getMessage()), 500);
        }

        $filename = self::build_pdf_download_filename($row, $slug, $id, $lang === 'vi' ? 'vi' : '');
        self::output_pdf_bytes($bytes, $filename, false);
    }

    /**
     * API: Lay PDF theo ID.
     * GET /ICAVIET/v1/api/pdf/{id}?api_key=xxx&lang=en
     */
    public static function api_get_pdf(WP_REST_Request $request)
    {
        $auth = self::verify_api_key($request);
        if ($auth !== true) {
            return $auth;
        }

        $id = (int) $request->get_param('id');
        $lang = sanitize_key($request->get_param('lang') ?: 'en');
        if (!in_array($lang, array('en', 'vi'), true)) {
            $lang = 'en';
        }

        $row = ICAVIET_DB::get_by_id($id);
        if (!$row) {
            return new WP_REST_Response(array('ok' => false, 'error' => 'Khong tim thay submission #' . $id), 404);
        }

        // Tim file PDF da luu
        $saved_slug = sanitize_key(isset($row['form_slug']) ? $row['form_slug'] : '');
        if (self::should_use_saved_pdf($row, $saved_slug, $lang)) {
            if ($lang === 'vi' && !empty($row['pdf_path_vi']) && file_exists($row['pdf_path_vi'])) {
                $slug = $saved_slug;
                $filename = self::build_pdf_download_filename($row, $slug, $id, 'vi');
                self::output_pdf_file($row['pdf_path_vi'], $filename, false);
                return;
            }

            $pdf_path = self::get_saved_pdf_path($row);
            if ($pdf_path && $lang === 'en') {
                $slug = $saved_slug;
                $filename = self::build_pdf_download_filename($row, $slug, $id);
                self::output_pdf_file($pdf_path, $filename, false);
                return;
            }
        }

        // Fallback: generate
        $slug = '';
        $error = '';
        $handler = null;

        if (!self::get_submission_and_handler($id, $row, $handler, $slug, $error)) {
            return new WP_REST_Response(array('ok' => false, 'error' => $error), 500);
        }

        $data = json_decode($row['data'], true);
        $data = is_array($data) ? $data : array();
        $data['_id'] = $id;

        $template = $handler->get_pdf_template();
        if ($lang === 'vi' && method_exists($handler, 'get_pdf_template_vi')) {
            $vi_tpl = $handler->get_pdf_template_vi();
            if (!empty($vi_tpl)) {
                $template = $vi_tpl;
            }
        }

        try {
            $bytes = ICAVIET_PDF::generate($data, $template, $handler->get_label());
        } catch (\Throwable $e) {
            return new WP_REST_Response(array('ok' => false, 'error' => 'Loi tao PDF: ' . $e->getMessage()), 500);
        }

        $filename = self::build_pdf_download_filename($row, $slug, $id, $lang === 'vi' ? 'vi' : '');
        self::output_pdf_bytes($bytes, $filename, false);
    }

    /**
     * API: Lay danh sach submissions (JSON).
     * GET /ICAVIET/v1/api/submissions?api_key=xxx&form_slug=hop-dong&page=1&per_page=20
     */
    public static function api_list_submissions(WP_REST_Request $request)
    {
        $auth = self::verify_api_key($request);
        if ($auth !== true) {
            return $auth;
        }

        $form_slug = sanitize_key($request->get_param('form_slug') ?: '');
        $page      = max(1, (int) ($request->get_param('page') ?: 1));
        $per_page  = min(100, max(1, (int) ($request->get_param('per_page') ?: 20)));

        $result = ICAVIET_DB::get_list($form_slug, $page, $per_page);

        // Build response voi PDF links
        $items = array();
        foreach ($result['rows'] as $row) {
            $id   = (int) $row['id'];
            $data = json_decode($row['data'], true);
            $data = is_array($data) ? $data : array();

            $item = array(
                'id'           => $id,
                'form_slug'    => $row['form_slug'],
                'submitted_at' => $row['submitted_at'],
                'status'       => $row['status'],
                'submitter'    => '',
                'pdf_url_en'   => rest_url('ICAVIET/v1/api/pdf/' . $id) . '?lang=en',
                'pdf_url_vi'   => rest_url('ICAVIET/v1/api/pdf/' . $id) . '?lang=vi',
            );

            // Tim ten nguoi nop
            if (!empty($data['hoVaTen'])) {
                $item['submitter'] = $data['hoVaTen'];
            } elseif (!empty($data['hoTenThuongDung'])) {
                $item['submitter'] = $data['hoTenThuongDung'];
            } elseif (!empty($data['hoTenKhaisinh'])) {
                $item['submitter'] = $data['hoTenKhaisinh'];
            }

            $items[] = $item;
        }

        return new WP_REST_Response(array(
            'ok'          => true,
            'data'        => $items,
            'total'       => $result['total'],
            'page'        => $result['page'],
            'per_page'    => $result['per_page'],
            'total_pages' => $result['total_pages'],
        ), 200);
    }

    // ====== API QUẢN LÝ DS-160 ======

    /**
     * API: Lấy danh sách submissions DS-160.
     * GET /ICAVIET/v1/api/ds160?api_key=xxx&page=1&per_page=20&search=keyword
     */
    public static function api_ds160_list(WP_REST_Request $request)
    {
        $auth = self::verify_api_key($request);
        if ($auth !== true) {
            return $auth;
        }

        $page     = max(1, (int) ($request->get_param('page') ?: 1));
        $per_page = min(100, max(1, (int) ($request->get_param('per_page') ?: 50)));
        $search   = sanitize_text_field($request->get_param('search') ?: '');

        global $wpdb;
        $table  = $wpdb->prefix . ICAVIET_DB::TABLE;
        $offset = ($page - 1) * $per_page;

        // Build WHERE
        $where  = "WHERE form_slug = 'ds-160'";
        $params = array();

        if ($search) {
            $where   .= " AND data LIKE %s";
            $params[] = '%' . $wpdb->esc_like($search) . '%';
        }

        // Total count
        if ($params) {
            $total = (int) $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM {$table} {$where}",
                ...$params
            ));
        } else {
            $total = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$table} {$where}");
        }

        // Fetch rows
        $query_params   = $params;
        $query_params[] = $per_page;
        $query_params[] = $offset;

        $rows = $wpdb->get_results($wpdb->prepare(
            "SELECT id, form_slug, data, submitted_at, ip_address, status, pdf_path
             FROM {$table} {$where}
             ORDER BY submitted_at DESC
             LIMIT %d OFFSET %d",
            ...$query_params
        ), ARRAY_A);

        // Build response
        $items = array();
        if ($rows) {
            foreach ($rows as $row) {
                $id   = (int) $row['id'];
                $data = json_decode($row['data'], true);
                $data = is_array($data) ? $data : array();

                $items[] = array(
                    'id'                => $id,
                    'fullName'          => isset($data['fullName']) ? $data['fullName'] : '',
                    'gender'            => isset($data['gender']) ? $data['gender'] : '',
                    'birthDate'         => isset($data['birthDate']) ? $data['birthDate'] : '',
                    'placeBirth'        => isset($data['placeBirth']) ? $data['placeBirth'] : '',
                    'idNumber'          => isset($data['idNumber']) ? $data['idNumber'] : '',
                    'contactPrimary'    => isset($data['contactPrimary']) ? $data['contactPrimary'] : '',
                    'email'             => isset($data['email']) ? $data['email'] : '',
                    'maritalStatus'     => isset($data['maritalStatus']) ? $data['maritalStatus'] : '',
                    'occupationTitle01' => isset($data['occupationTitle01']) ? $data['occupationTitle01'] : '',
                    'companyName01'     => isset($data['companyName01']) ? $data['companyName01'] : '',
                    'passportNumberVN'  => isset($data['passportNumberVN']) ? $data['passportNumberVN'] : '',
                    'submittedAt'       => $row['submitted_at'],
                    'status'            => $row['status'],
                    'pdfUrl'            => rest_url('ICAVIET/v1/api/pdf/' . $id) . '?lang=en',
                    'pdfUrlVi'          => rest_url('ICAVIET/v1/api/pdf/' . $id) . '?lang=vi',
                );
            }
        }

        return new WP_REST_Response(array(
            'ok'          => true,
            'data'        => $items,
            'total'       => $total,
            'page'        => $page,
            'per_page'    => $per_page,
            'total_pages' => (int) ceil($total / max(1, $per_page)),
        ), 200);
    }

    /**
     * API: Lấy chi tiết 1 submission DS-160 (toàn bộ data).
     * GET /ICAVIET/v1/api/ds160/{id}?api_key=xxx
     */
    public static function api_ds160_detail(WP_REST_Request $request)
    {
        $auth = self::verify_api_key($request);
        if ($auth !== true) {
            return $auth;
        }

        $id = (int) $request->get_param('id');

        global $wpdb;
        $table = $wpdb->prefix . ICAVIET_DB::TABLE;

        $row = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$table} WHERE id = %d AND form_slug = 'ds-160'",
            $id
        ), ARRAY_A);

        if (!$row) {
            return new WP_REST_Response(array(
                'ok'    => false,
                'error' => 'Khong tim thay don DS-160 voi ID: ' . $id,
            ), 404);
        }

        $data = json_decode($row['data'], true);
        $data = is_array($data) ? $data : array();

        return new WP_REST_Response(array(
            'ok'   => true,
            'data' => array(
                'id'          => (int) $row['id'],
                'form_slug'   => $row['form_slug'],
                'fields'      => $data,
                'submittedAt' => $row['submitted_at'],
                'ipAddress'   => $row['ip_address'],
                'status'      => $row['status'],
                'pdfUrl'      => rest_url('ICAVIET/v1/api/pdf/' . $row['id']) . '?lang=en',
                'pdfUrlVi'    => rest_url('ICAVIET/v1/api/pdf/' . $row['id']) . '?lang=vi',
            ),
        ), 200);
    }
}

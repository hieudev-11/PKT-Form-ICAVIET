<?php
if (!defined('ABSPATH'))
    exit;

class ICAVIET_Mailer
{

    /** Luu tam loi PHPMailer trong 1 lan gui */
    private static $last_mail_error = '';

    private static function get_recipients()
    {
        $raw = get_option('ICAVIET_admin_emails', '');

        // Backward compat: migrate tu 2 option cu sang option moi
        if (empty($raw)) {
            $to1 = get_option('ICAVIET_admin_email', get_option('admin_email'));
            $to2 = get_option('ICAVIET_admin_email_2', '');
            $lines = array_filter(array($to1, $to2));
            if (!empty($lines)) {
                $raw = implode("\n", $lines);
                update_option('ICAVIET_admin_emails', $raw);
            }
        }

        // Parse: chap nhan xuong dong, dau phay, dau cham phay
        $emails = preg_split('/[\r\n,;]+/', $raw);
        $recipients = array();

        foreach ($emails as $email) {
            $email = trim($email);
            if (empty($email)) {
                continue;
            }
            if (is_email($email)) {
                $recipients[] = sanitize_email($email);
            } else {
                error_log('[ICAVIET] Email khong hop le: ' . $email);
            }
        }

        $recipients = array_values(array_unique($recipients));

        return $recipients;
    }

    private static function get_mail_time()
    {
        return date_i18n('d/m/Y H:i:s', current_time('timestamp'));
    }

    /**
     * Hook bat loi tu PHPMailer khi wp_mail() that bai.
     * Duoc goi tu WordPress action 'wp_mail_failed'.
     */
    public static function on_mail_failed($wp_error)
    {
        if (is_wp_error($wp_error)) {
            self::$last_mail_error = $wp_error->get_error_message();
            $data = $wp_error->get_error_data();
            error_log('[ICAVIET] wp_mail_failed: ' . self::$last_mail_error);
            if (!empty($data)) {
                error_log('[ICAVIET] wp_mail_failed data: ' . wp_json_encode($data));
            }
        }
    }

    /**
     * Gui wp_mail() cho 1 recipient voi error logging.
     */
    private static function send_single($to, $subject, $body, $headers)
    {
        self::$last_mail_error = '';

        // Dang ky hook bat loi
        add_action('wp_mail_failed', array(__CLASS__, 'on_mail_failed'));

        $result = wp_mail($to, $subject, $body, $headers);

        // Go hook sau khi gui xong
        remove_action('wp_mail_failed', array(__CLASS__, 'on_mail_failed'));

        if (!$result) {
            $reason = self::$last_mail_error !== '' ? self::$last_mail_error : 'wp_mail() returned false (khong ro ly do)';
            error_log('[ICAVIET] MAIL THAT BAI => To: ' . $to . ' | Subject: ' . $subject . ' | Ly do: ' . $reason);
        } else {
            error_log('[ICAVIET] Mail OK => To: ' . $to);
        }

        return $result;
    }

    /**
     * Gui email thong bao cho admin khi co form moi.
     * Khong dinh kem PDF, chi gui link PDF va link WP Admin.
     */
    public static function send_admin($form_label, $submitter_name, $id, $pdf_url = '', $view_url = '', $pdf_url_vi = '')
    {
        $recipients = self::get_recipients();

        if (empty($recipients)) {
            error_log('[ICAVIET] Khong co recipient nao hop le, khong gui mail.');
            return false;
        }

        error_log('[ICAVIET] Bat dau gui mail cho ' . count($recipients) . ' recipient: ' . implode(', ', $recipients));

        $id = (int) $id;
        $form_label = (string) $form_label;
        $submitter_name = trim((string) $submitter_name);
        $submitter_name = $submitter_name !== '' ? $submitter_name : '-';

        if (empty($view_url)) {
            $view_url = admin_url('admin.php?page=ICAVIET-forms&action=view&id=' . $id);
        }

        $subject = '[ICAVIET] Co form moi: ' . $form_label . ' #' . $id;

        $body = '<html><body style="font-family:Arial,sans-serif;color:#1e293b;background:#f8fafc;margin:0;padding:24px;">';
        $body .= '<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;">';

        $body .= '<div style="background:#1a6ef5;padding:20px 24px;">';
        $body .= '<h2 style="color:#ffffff;margin:0;font-size:22px;">ICAVIET Forms</h2>';
        $body .= '</div>';

        $body .= '<div style="padding:24px;">';
        $body .= '<p style="margin:0 0 16px;">Co submission moi vua duoc gui len he thong.</p>';

        $body .= '<table style="border-collapse:collapse;width:100%;font-size:14px;">';
        $body .= '<tr>';
        $body .= '<td style="padding:10px 8px;font-weight:bold;width:38%;border-bottom:1px solid #e2e8f0;">Loai form</td>';
        $body .= '<td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;">' . esc_html($form_label) . '</td>';
        $body .= '</tr>';

        $body .= '<tr>';
        $body .= '<td style="padding:10px 8px;font-weight:bold;width:38%;border-bottom:1px solid #e2e8f0;background:#f8fafc;">Nguoi nop</td>';
        $body .= '<td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;background:#f8fafc;">' . esc_html($submitter_name) . '</td>';
        $body .= '</tr>';

        $body .= '<tr>';
        $body .= '<td style="padding:10px 8px;font-weight:bold;width:38%;border-bottom:1px solid #e2e8f0;">Ma so</td>';
        $body .= '<td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;">#' . $id . '</td>';
        $body .= '</tr>';

        $body .= '<tr>';
        $body .= '<td style="padding:10px 8px;font-weight:bold;width:38%;background:#f8fafc;">Thoi gian</td>';
        $body .= '<td style="padding:10px 8px;background:#f8fafc;">' . esc_html(self::get_mail_time()) . '</td>';
        $body .= '</tr>';
        $body .= '</table>';

        if (!empty($pdf_url)) {
            $body .= '<div style="margin-top:24px;display:flex;gap:10px;flex-wrap:wrap;">';
            $body .= '<a href="' . esc_url($pdf_url) . '" style="display:inline-block;background:#16a34a;color:#ffffff;padding:11px 18px;border-radius:6px;text-decoration:none;font-weight:bold;">Mo file PDF (EN)</a>';
            if (!empty($pdf_url_vi)) {
                $body .= '<a href="' . esc_url($pdf_url_vi) . '" style="display:inline-block;background:#dc6c12;color:#ffffff;padding:11px 18px;border-radius:6px;text-decoration:none;font-weight:bold;">Mo file PDF (VI)</a>';
            }
            $body .= '</div>';

            $body .= '<p style="margin:14px 0 0;font-size:13px;color:#64748b;line-height:1.6;">';
            $body .= 'PDF (EN): ' . esc_html($pdf_url);
            if (!empty($pdf_url_vi)) {
                $body .= '<br>PDF (VI): ' . esc_html($pdf_url_vi);
            }
            $body .= '</p>';
        }

        if (!empty($view_url)) {
            $body .= '<div style="margin-top:18px;">';
            $body .= '<a href="' . esc_url($view_url) . '" style="display:inline-block;background:#1a6ef5;color:#ffffff;padding:11px 18px;border-radius:6px;text-decoration:none;font-weight:bold;">Xem chi tiet trong WP Admin</a>';
            $body .= '</div>';

            $body .= '<p style="margin:14px 0 0;font-size:13px;color:#64748b;line-height:1.6;">';
            $body .= 'Link WP Admin:<br>';
            $body .= esc_html($view_url);
            $body .= '</p>';
        }

        $body .= '</div>';
        $body .= '</div>';
        $body .= '</body></html>';

        $headers = array(
            'Content-Type: text/html; charset=UTF-8',
        );

        $sent = false;
        $results = array();

        foreach ($recipients as $recipient) {
            $ok = self::send_single($recipient, $subject, $body, $headers);
            $results[$recipient] = $ok;
            if ($ok) {
                $sent = true;
            }
        }

        // Tong ket
        $ok_list = array_keys(array_filter($results));
        $fail_list = array_keys(array_diff_key($results, array_filter($results)));

        if (!empty($fail_list)) {
            error_log('[ICAVIET] === KET QUA GUI MAIL #' . $id . ' === OK: [' . implode(', ', $ok_list) . '] | THAT BAI: [' . implode(', ', $fail_list) . ']');
        }

        // === WEBHOOK BACKUP: gui data qua API website khac ===
        self::send_via_webhook(array(
            'action'         => 'new_submission',
            'form_label'     => $form_label,
            'submitter_name' => $submitter_name,
            'id'             => $id,
            'pdf_url'        => $pdf_url,
            'pdf_url_vi'     => $pdf_url_vi,
            'view_url'       => $view_url,
            'recipients'     => $recipients,
            'mail_results'   => $results,
            'time'           => self::get_mail_time(),
        ));

        return $sent;
    }

    /**
     * Gui du lieu qua webhook den website khac (backup).
     * Data duoc gui dang JSON qua POST, co kem secret de xac thuc.
     *
     * @param array $data Du lieu can gui
     * @return bool
     */
    public static function send_via_webhook($data)
    {
        $webhook_url = get_option('ICAVIET_webhook_url', '');
        $webhook_secret = get_option('ICAVIET_webhook_secret', '');

        if (empty($webhook_url)) {
            return false; // Chua cau hinh webhook, bo qua
        }

        // Them secret va timestamp vao payload
        $payload = array_merge($data, array(
            'secret'    => $webhook_secret,
            'timestamp' => current_time('mysql'),
            'site_url'  => home_url(),
        ));

        $json_body = wp_json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        error_log('[ICAVIET] Webhook: Dang gui den ' . $webhook_url);

        $response = wp_remote_post($webhook_url, array(
            'timeout'   => 15,
            'headers'   => array(
                'Content-Type'       => 'application/json; charset=UTF-8',
                'X-ICAVIET-Secret'   => $webhook_secret,
            ),
            'body'      => $json_body,
            'sslverify' => false,
        ));

        if (is_wp_error($response)) {
            error_log('[ICAVIET] Webhook THAT BAI: ' . $response->get_error_message());
            return false;
        }

        $code = wp_remote_retrieve_response_code($response);
        $body = wp_remote_retrieve_body($response);

        if ($code >= 200 && $code < 300) {
            error_log('[ICAVIET] Webhook OK => HTTP ' . $code);
            return true;
        } else {
            error_log('[ICAVIET] Webhook LOI => HTTP ' . $code . ' | Body: ' . $body);
            return false;
        }
    }

    /**
     * Test gui webhook.
     *
     * @return array ['ok' => bool, 'error' => string, 'http_code' => int, 'response' => string]
     */
    public static function test_webhook()
    {
        $webhook_url = get_option('ICAVIET_webhook_url', '');
        $webhook_secret = get_option('ICAVIET_webhook_secret', '');

        if (empty($webhook_url)) {
            return array(
                'ok'    => false,
                'error' => 'Chua cau hinh Webhook URL.',
            );
        }

        $payload = array(
            'action'         => 'test',
            'secret'         => $webhook_secret,
            'timestamp'      => current_time('mysql'),
            'site_url'       => home_url(),
            'form_label'     => 'Test Form',
            'submitter_name' => 'Test User',
            'id'             => 0,
            'pdf_url'        => home_url('/sample-test.pdf'),
            'pdf_url_vi'     => '',
            'view_url'       => admin_url('admin.php?page=ICAVIET-forms'),
            'recipients'     => self::get_recipients(),
            'time'           => self::get_mail_time(),
        );

        $json_body = wp_json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $response = wp_remote_post($webhook_url, array(
            'timeout'   => 15,
            'headers'   => array(
                'Content-Type'       => 'application/json; charset=UTF-8',
                'X-ICAVIET-Secret'   => $webhook_secret,
            ),
            'body'      => $json_body,
            'sslverify' => false,
        ));

        if (is_wp_error($response)) {
            return array(
                'ok'    => false,
                'error' => $response->get_error_message(),
            );
        }

        $code = wp_remote_retrieve_response_code($response);
        $body = wp_remote_retrieve_body($response);

        return array(
            'ok'        => ($code >= 200 && $code < 300),
            'error'     => ($code >= 200 && $code < 300) ? '' : 'HTTP ' . $code,
            'http_code' => $code,
            'response'  => $body,
        );
    }

    /**
     * Gui mail test de kiem tra cau hinh.
     * Tra ve mang ket qua cho tung email.
     *
     * @return array [ 'email@...' => ['ok' => bool, 'error' => string], ... ]
     */
    public static function test_send()
    {
        $recipients = self::get_recipients();
        $results = array();

        if (empty($recipients)) {
            return array('_error' => 'Khong co email nao duoc cau hinh.');
        }

        $subject = '[ICAVIET] Test gui mail – ' . date_i18n('d/m/Y H:i:s', current_time('timestamp'));

        $body = '<html><body style="font-family:Arial,sans-serif;color:#1e293b;background:#f8fafc;margin:0;padding:24px;">';
        $body .= '<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;">';
        $body .= '<div style="background:#16a34a;padding:20px 24px;">';
        $body .= '<h2 style="color:#ffffff;margin:0;font-size:22px;">✅ ICAVIET Forms – Test Mail</h2>';
        $body .= '</div>';
        $body .= '<div style="padding:24px;">';
        $body .= '<p>Day la email test tu plugin ICAVIET Forms.</p>';
        $body .= '<p>Neu ban nhan duoc email nay, he thong gui mail dang hoat dong binh thuong.</p>';
        $body .= '<p style="color:#64748b;font-size:13px;">Thoi gian: ' . esc_html(self::get_mail_time()) . '</p>';
        $body .= '</div></div></body></html>';

        $headers = array('Content-Type: text/html; charset=UTF-8');

        foreach ($recipients as $recipient) {
            self::$last_mail_error = '';
            add_action('wp_mail_failed', array(__CLASS__, 'on_mail_failed'));

            $ok = wp_mail($recipient, $subject, $body, $headers);

            remove_action('wp_mail_failed', array(__CLASS__, 'on_mail_failed'));

            $results[$recipient] = array(
                'ok' => $ok,
                'error' => $ok ? '' : (self::$last_mail_error !== '' ? self::$last_mail_error : 'wp_mail() returned false'),
            );
        }

        return $results;
    }
}
<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * ICAVIET_PDF – Tạo PDF dùng tFPDF (hỗ trợ UTF-8 / tiếng Việt).
 */
class ICAVIET_PDF {

    /**
     * Tạo PDF từ data + template, trả về chuỗi bytes.
     * @throws Exception
     */
    public static function generate( $data, $template_path, $form_label ) {

        $tfpdf_file = ICAVIET_DIR . 'lib/tfpdf.php';

        if ( ! file_exists( $tfpdf_file ) ) {
            throw new Exception( 'Thiếu thư viện tFPDF: ' . $tfpdf_file );
        }
        if ( ! file_exists( $template_path ) ) {
            // Một số form cũ (đặc biệt DS-260) từng trỏ nhầm tới template.pdf.
            // Nếu template.pdf không tồn tại nhưng cùng thư mục có pdf.php thì tự fallback
            // để link PDF cũ vẫn tải được sau khi cập nhật code.
            $fallback_php_template = dirname( $template_path ) . '/pdf.php';
            if ( strtolower( basename( $template_path ) ) === 'template.pdf' && file_exists( $fallback_php_template ) ) {
                $template_path = $fallback_php_template;
            } else {
                throw new Exception( 'Không tìm thấy PDF template: ' . $template_path );
            }
        }

        // Load tFPDF
        if ( ! class_exists( 'tFPDF' ) ) {
            require_once $tfpdf_file;
        }

        // Load ICAVIET_FPDF (extends tFPDF)
        if ( ! class_exists( 'ICAVIET_FPDF' ) ) {
            require_once ICAVIET_DIR . 'includes/class-icaviet-fpdf.php';
        }

        $pdf = new ICAVIET_FPDF( $form_label );
        $pdf->AliasNbPages();
        $pdf->SetAutoPageBreak( true, 25 );
        $pdf->AddPage();

        include $template_path;

        return $pdf->Output( 'S' );
    }

    /**
     * Lưu file PDF vào uploads/ICAVIET-pdfs/
     * @return string Đường dẫn tuyệt đối.
     */
    public static function save_file( $bytes, $slug, $id, $suffix = '' ) {
        $upload_dir = wp_upload_dir();
        $dir        = $upload_dir['basedir'] . '/ICAVIET-pdfs/';
        if ( ! is_dir( $dir ) ) {
            wp_mkdir_p( $dir );
            file_put_contents( $dir . '.htaccess', "Options -Indexes\ndeny from all\n" );
        }
        $suffix_str = $suffix !== '' ? '-' . ltrim( $suffix, '-' ) : '';
        $file = $dir . $slug . '-' . $id . '-' . date( 'Ymd' ) . $suffix_str . '.pdf';
        file_put_contents( $file, $bytes );
        return $file;
    }

    /**
     * Lấy giá trị từ $data array.
     */
    public static function val( $data, $key, $default = '' ) {
        $v = isset( $data[ $key ] ) ? trim( (string) $data[ $key ] ) : '';
        return $v !== '' ? $v : $default;
    }
}

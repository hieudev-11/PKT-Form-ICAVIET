<?php
/**
 * ICAVIET_FPDF – extend tFPDF cho PDF tiếng Việt.
 *
 * Font cache được ghi vào wp-content/uploads/ICAVIET-fonts/unifont/
 * (server có quyền ghi), TTF files được copy từ plugin vào đó lần đầu.
 */

if ( ! class_exists( 'tFPDF' ) ) {
    throw new Exception( '[ICAVIET] tFPDF chưa được load.' );
}

class ICAVIET_FPDF extends tFPDF {

    public function __construct( $form_label = '' ) {

        // ── Chuẩn bị thư mục font cache trong uploads ────────────────────────
        $upload    = wp_upload_dir();
        $cache_dir = $upload['basedir'] . '/ICAVIET-fonts/unifont/';

        if ( ! is_dir( $cache_dir ) ) {
            wp_mkdir_p( $cache_dir );
        }

        // Copy file TTF từ plugin → cache dir (nếu chưa có)
        $src = ICAVIET_DIR . 'lib/tfont/unifont/';
        $ttf_files = array(
            'DejaVuSans.ttf',
            'DejaVuSans-Bold.ttf',
            'DejaVuSans-Oblique.ttf',
            'DejaVuSans-BoldOblique.ttf',
            'ttfonts.php',
        );
        foreach ( $ttf_files as $f ) {
            $dest = $cache_dir . $f;
            if ( ! file_exists( $dest ) && file_exists( $src . $f ) ) {
                copy( $src . $f, $dest );
            }
        }

        // tFPDF tìm TTF trong FPDF_FONTPATH/unifont/
        // Cache dir LÀ cái "fontpath" – nó chứa subfolder unifont/ luôn
        $font_base = $upload['basedir'] . '/ICAVIET-fonts/';

        if ( ! defined( 'FPDF_FONTPATH' ) ) {
            define( 'FPDF_FONTPATH', $font_base );
        }

        parent::__construct( 'P', 'mm', 'A4' );
        $this->SetMargins( 20, 15, 20 );
        $this->SetAuthor( 'ICAVIET' );

        // Đăng ký font DejaVu UTF-8
        $this->AddFont( 'DejaVu', '',   'DejaVuSans.ttf',             true );
        $this->AddFont( 'DejaVu', 'B',  'DejaVuSans-Bold.ttf',        true );
        $this->AddFont( 'DejaVu', 'I',  'DejaVuSans-Oblique.ttf',     true );
        $this->AddFont( 'DejaVu', 'BI', 'DejaVuSans-BoldOblique.ttf', true );
    }

    /** Header trống – mẫu nhà nước không cần logo */
    public function Header() {}

    public function Footer() {
        $this->SetY( -12 );
        $this->SetDrawColor( 180, 180, 180 );
        $this->Line( 20, $this->GetY(), 190, $this->GetY() );
        $this->Ln( 1 );
        $this->SetFont( 'DejaVu', 'I', 7 );
        $this->SetTextColor( 160, 160, 160 );
        $this->Cell( 0, 4, 'Trang ' . $this->PageNo() . '/{nb}', 0, 0, 'C' );
    }
}

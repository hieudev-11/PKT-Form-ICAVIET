<?php
/**
 * Plugin Name:  ICAVIET Forms
 * Plugin URI:   https://ICAVIET.com
 * Description:  Quan ly form truc tuyen – luu DB, xuat PDF, gui email. Tu dong tao trang form khi kich hoat.
 * Version:      1.0.1
 * Author:       Vanhieuit
 * License:      GPL-2.0+
 * Requires PHP: 7.4
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'ICAVIET_VERSION',     '1.0.1' );
define( 'ICAVIET_DIR',         plugin_dir_path( __FILE__ ) );
define( 'ICAVIET_URL',         plugin_dir_url( __FILE__ ) );
define( 'ICAVIET_PLUGIN_FILE', __FILE__ );

// Core classes
require_once ICAVIET_DIR . 'includes/class-icaviet-db.php';
require_once ICAVIET_DIR . 'includes/class-icaviet-pdf.php';
require_once ICAVIET_DIR . 'includes/class-icaviet-mailer.php';
require_once ICAVIET_DIR . 'includes/class-icaviet-handler.php';
require_once ICAVIET_DIR . 'includes/class-icaviet-router.php';
require_once ICAVIET_DIR . 'includes/class-icaviet-admin.php';

// Auto-load form handlers
foreach ( glob( ICAVIET_DIR . 'forms/*/handler.php' ) as $f ) {
    require_once $f;
}

// ── Activation ────────────────────────────────────────────────────────────────
register_activation_hook( __FILE__, 'ICAVIET_activate' );
function ICAVIET_activate() {
    ICAVIET_DB::create_table();

    if ( ! get_option( 'ICAVIET_admin_email' ) ) {
        update_option( 'ICAVIET_admin_email', get_option( 'admin_email' ) );
    }


    // Tu dong tao trang "Hop Dong Dich Vu" neu chua co
    ICAVIET_create_form_page(
        'Hop Dong Dich Vu Tu Van Di Tru ICAVIET', // post_title
        'hop-dong-dich-vu',                        // post_name (slug URL)
        '[ICAVIET_hop_dong]'                       // shortcode
    );

    flush_rewrite_rules();
}

/**
 * Tao trang WordPress neu chua ton tai.
 */
function ICAVIET_create_form_page( $title, $slug, $content ) {
    $option_key = 'ICAVIET_page_' . $slug;
    $existing   = (int) get_option( $option_key );

    // Neu da tao va van ton tai -> bo qua
    if ( $existing && get_post( $existing ) ) {
        return $existing;
    }

    $id = wp_insert_post( array(
        'post_title'   => $title,
        'post_name'    => $slug,
        'post_content' => $content,
        'post_status'  => 'publish',
        'post_type'    => 'page',
        'post_author'  => 1,
    ) );

    if ( $id && ! is_wp_error( $id ) ) {
        update_option( $option_key, $id );
        return $id;
    }

    return 0;
}

// ── Deactivation ──────────────────────────────────────────────────────────────
register_deactivation_hook( __FILE__, 'flush_rewrite_rules' );

// ── Shortcodes ───────────────────────────────────────────────────────────────
add_action( 'init', 'ICAVIET_register_shortcodes' );
function ICAVIET_register_shortcodes() {
    add_shortcode( 'ICAVIET_hop_dong',          'ICAVIET_render_hop_dong' );
    add_shortcode( 'ICAVIET_n400',              'ICAVIET_render_n400' );
    add_shortcode( 'ICAVIET_i90',               'ICAVIET_render_i90' );
    add_shortcode( 'ICAVIET_n600',              'ICAVIET_render_n600' );
    add_shortcode( 'ICAVIET_i751',              'ICAVIET_render_i751' );
    add_shortcode( 'ICAVIET_ds160',             'ICAVIET_render_ds160' );
    add_shortcode( 'ICAVIET_ds260',             'ICAVIET_render_ds260' );
    add_shortcode( 'ICAVIET_bao_lanh',          'ICAVIET_render_bao_lanh' );
    add_shortcode( 'ICAVIET_ndbl',              'ICAVIET_render_ndbl' );
}

function ICAVIET_render_hop_dong() { return ICAVIET_render_vue_form( 'hop-dong' ); }

// ── Vue SPA Form Loader ────────────────────────────────────────────────────
// Renders a mount div for the Vue SPA and enqueues the built JS/CSS bundle
function ICAVIET_render_vue_form( $slug ) {
    // Enqueue Vue bundle (built từ vue-app/)
    $dist_dir = ICAVIET_DIR . 'assets/vue-dist/';
    $dist_url = ICAVIET_URL . 'assets/vue-dist/';

    // JS bundle
    wp_enqueue_script(
        'icaviet-vue-forms',
        $dist_url . 'icaviet-forms.js',
        array(),
        ICAVIET_VERSION,
        true // load in footer
    );

    // CSS bundle
    wp_enqueue_style(
        'icaviet-vue-forms',
        $dist_url . 'icaviet-forms.css',
        array(),
        ICAVIET_VERSION
    );

    // Inject config cho Vue app (API URL, nonce, assets URL)
    wp_localize_script( 'icaviet-vue-forms', 'icavietFormsConfig', array(
        'apiUrl'    => rest_url( 'ICAVIET/v1' ),
        'nonce'     => wp_create_nonce( 'wp_rest' ),
        'assetsUrl' => $dist_url,
        'slug'      => $slug,
    ));

    // Tao mount div cho Vue app
    return '<div id="icaviet-form-app" data-form-slug="' . esc_attr( $slug ) . '"></div>';
}

// Shortcode handlers cho 3 forms Vue
function ICAVIET_render_n400() { return ICAVIET_render_vue_form( 'n-400' ); }
function ICAVIET_render_i90()  { return ICAVIET_render_vue_form( 'i-90' ); }
function ICAVIET_render_n600() { return ICAVIET_render_vue_form( 'n-600' ); }
function ICAVIET_render_i751() { return ICAVIET_render_vue_form( 'i-751' ); }
function ICAVIET_render_ds160() { return ICAVIET_render_vue_form( 'ds-160' ); }
function ICAVIET_render_ds260() { return ICAVIET_render_vue_form( 'ds-260' ); }
function ICAVIET_render_bao_lanh() { return ICAVIET_render_vue_form( 'bao-lanh' ); }
function ICAVIET_render_ndbl() { return ICAVIET_render_vue_form( 'ndbl' ); }

// ── WP Hooks ─────────────────────────────────────────────────────────────────
add_action( 'rest_api_init',         array( 'ICAVIET_Router', 'register' ) );
add_action( 'admin_menu',            array( 'ICAVIET_Admin',  'register_menu' ) );
add_action( 'admin_enqueue_scripts', array( 'ICAVIET_Admin',  'enqueue_assets' ) );

// Tu dong nang cap DB (them cot moi neu chua co) khi plugin duoc load
add_action( 'plugins_loaded', 'ICAVIET_maybe_upgrade_db' );
function ICAVIET_maybe_upgrade_db() {
    $db_version     = get_option( 'ICAVIET_db_version', '0' );
    $current_version = '1.1.0'; // Tang len moi khi co thay doi schema
    if ( version_compare( $db_version, $current_version, '<' ) ) {
        ICAVIET_DB::create_table();
        update_option( 'ICAVIET_db_version', $current_version );
    }
}

// ── Fix Vite ES Module Output ────────────────────────────────────────────────
add_filter( 'script_loader_tag', 'ICAVIET_add_module_to_script', 10, 3 );
function ICAVIET_add_module_to_script( $tag, $handle, $src ) {
    if ( 'icaviet-vue-forms' === $handle ) {
        // Thay the the <script> mac dinh cua WP thanh <script type="module">
        return '<script type="module" src="' . esc_url( $src ) . '" id="icaviet-vue-forms-js"></script>' . "\n";
    }
    return $tag;
}

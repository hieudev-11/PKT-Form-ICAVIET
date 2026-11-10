<?php
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) exit;
global $wpdb;
$wpdb->query( 'DROP TABLE IF EXISTS ' . $wpdb->prefix . 'ICAVIET_submissions' );
delete_option( 'ICAVIET_admin_email' );
delete_option( 'ICAVIET_admin_email_2' );
delete_option( 'ICAVIET_admin_emails' );
$upload_dir = wp_upload_dir();
foreach ( array( '/ICAVIET-pdfs/', '/ICAVIET-signatures/' ) as $sub ) {
    $dir = $upload_dir['basedir'] . $sub;
    if ( is_dir( $dir ) ) {
        array_map( 'unlink', glob( $dir . '*.*' ) );
        rmdir( $dir );
    }
}

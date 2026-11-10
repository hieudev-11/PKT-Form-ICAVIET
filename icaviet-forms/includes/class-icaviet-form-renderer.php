<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class ICAVIET_Form_Renderer {

    public static function render( $schema_path ) {
        $json = file_get_contents( $schema_path );
        if ( is_string( $json ) ) {
            $json = preg_replace( '/^\xEF\xBB\xBF/', '', $json );
        }

        $schema = json_decode( $json, true );

        if ( ! $schema || empty( $schema['sections'] ) ) {
            echo '<p class="text-red-500">Error parsing schema: ' . esc_html( json_last_error_msg() ) . '</p>';
            return;
        }

        echo '<div class="icaviet-form-wrapper bg-white rounded shadow-md p-6 max-w-4xl mx-auto">';
        
        // Language Toggle
        echo '<div class="flex justify-end space-x-2 mb-4 border-b pb-4">';
        echo '<button type="button" class="lang-toggle px-3 py-1 rounded bg-blue-600 text-white font-medium hover:bg-blue-700" data-lang="vi">Tiếng Việt</button>';
        echo '<button type="button" class="lang-toggle px-3 py-1 rounded bg-gray-200 text-gray-700 font-medium hover:bg-gray-300" data-lang="en">English</button>';
        echo '</div>';

        echo '<form id="icaviet-dynamic-form" class="space-y-8">';
        
        foreach ( $schema['sections'] as $section ) {
            self::render_section( $section );
        }

        // Signature Canvas
        echo '<div class="section-wrapper p-6 bg-gray-50 rounded-lg border border-gray-200 mt-8">';
        echo '<h2 class="text-2xl font-bold mb-4 text-blue-900 border-b pb-2"><span class="lang-text" data-vi="Chữ ký & Xác nhận" data-en="Signature & Confirmation">Chữ ký & Xác nhận</span></h2>';
        echo '<div class="mb-4">';
        echo '<label class="block text-sm font-semibold text-gray-700 mb-1"><span class="lang-text" data-vi="Họ và tên của người điền đơn *" data-en="Applicant\'s Full Name *">Họ và tên của người điền đơn *</span></label>';
        echo '<input type="text" name="applicant_full_name" required class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />';
        echo '</div>';
        
        echo '<div class="mb-4">';
        echo '<label class="block text-sm font-semibold text-gray-700 mb-1"><span class="lang-text" data-vi="Chữ ký *" data-en="Signature *">Chữ ký *</span></label>';
        echo '<canvas id="signature-pad" class="w-full h-48 border border-gray-300 rounded bg-white" width="600" height="200"></canvas>';
        echo '<button type="button" id="clear-signature" class="mt-2 px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"><span class="lang-text" data-vi="Xóa chữ ký" data-en="Clear Signature">Xóa chữ ký</span></button>';
        echo '<input type="hidden" name="applicant_signature" id="signature-data" required>';
        echo '</div>';
        echo '</div>';

        // Submit Button
        echo '<div class="mt-8 flex justify-center">';
        echo '<button type="submit" class="px-8 py-3 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 w-full md:w-auto"><span class="lang-text" data-vi="Gửi Thông Tin" data-en="Submit Form">Gửi Thông Tin</span></button>';
        echo '</div>';
        
        // Message Box
        echo '<div id="form-message" class="mt-4 hidden p-4 rounded font-medium text-center"></div>';

        echo '</form>';
        echo '</div>';
    }

    private static function render_section( $section ) {
        echo '<div class="section-wrapper mb-8">';
        
        $title_vi = htmlspecialchars( $section['title']['vi'] ?? $section['id'] );
        $title_en = htmlspecialchars( $section['title']['en'] ?? $section['id'] );
        echo '<h2 class="text-2xl font-bold mb-4 text-blue-900 border-b pb-2"><span class="lang-text" data-vi="' . $title_vi . '" data-en="' . $title_en . '">' . $title_vi . '</span></h2>';

        if ( ! empty( $section['groups'] ) ) {
            foreach ( $section['groups'] as $group ) {
                self::render_group( $group );
            }
        }
        
        echo '</div>';
    }

    private static function render_group( $group ) {
        echo '<div class="group-wrapper mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">';
        
        $title_vi = htmlspecialchars( $group['title']['vi'] ?? $group['id'] );
        $title_en = htmlspecialchars( $group['title']['en'] ?? $group['id'] );
        echo '<h3 class="text-xl font-semibold mb-4 text-gray-800"><span class="lang-text" data-vi="' . $title_vi . '" data-en="' . $title_en . '">' . $title_vi . '</span></h3>';

        $cols = $group['gridCols'] ?? 1;
        $grid_class = $cols > 1 ? "grid grid-cols-1 md:grid-cols-{$cols} gap-4" : "space-y-4";
        
        echo '<div class="' . $grid_class . '">';

        if ( ! empty( $group['fields'] ) ) {
            foreach ( $group['fields'] as $field ) {
                self::render_field( $field, $cols );
            }
        }

        echo '</div>';
        echo '</div>';
    }

    private static function render_field( $field, $group_cols ) {
        $type = $field['type'] ?? 'text';
        
        // Handle repeatable groups (like address_history, work_history, children_info)
        if ( ! empty( $field['isRepeatable'] ) || in_array( $type, ['address_history', 'work_history', 'children_info'] ) ) {
            self::render_repeatable_field( $field );
            return;
        }

        $colSpan = $field['colSpan'] ?? 1;
        $col_class = $group_cols > 1 && $colSpan > 1 ? "md:col-span-{$colSpan}" : "";
        
        echo '<div class="field-wrapper ' . $col_class . '">';
        
        $label_vi = htmlspecialchars( $field['label']['vi'] ?? $field['name'] );
        $label_en = htmlspecialchars( $field['label']['en'] ?? $field['name'] );
        $required = ! empty( $field['required'] ) ? ' <span class="text-red-500">*</span>' : '';
        
        echo '<label class="block text-sm font-semibold text-gray-700 mb-1"><span class="lang-text" data-vi="' . $label_vi . '" data-en="' . $label_en . '">' . $label_vi . '</span>' . $required . '</label>';

        $name = htmlspecialchars( $field['name'] );
        $req_attr = ! empty( $field['required'] ) ? 'required' : '';
        $placeholder = htmlspecialchars( $field['placeholder'] ?? '' );
        
        $input_class = 'w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white';

        if ( $type === 'textarea' ) {
            echo '<textarea name="' . $name . '" class="' . $input_class . '" rows="3" ' . $req_attr . ' placeholder="' . $placeholder . '"></textarea>';
        } elseif ( $type === 'radio' ) {
            echo '<div class="flex flex-wrap gap-4">';
            if ( ! empty( $field['options'] ) ) {
                foreach ( $field['options'] as $opt ) {
                    $opt_val = htmlspecialchars( $opt['value'] );
                    $opt_vi = htmlspecialchars( $opt['label']['vi'] ?? $opt_val );
                    $opt_en = htmlspecialchars( $opt['label']['en'] ?? $opt_val );
                    
                    echo '<label class="inline-flex items-center">';
                    echo '<input type="radio" name="' . $name . '" value="' . $opt_val . '" class="form-radio text-blue-600 h-4 w-4" ' . $req_attr . '>';
                    echo '<span class="ml-2 text-gray-700 lang-text" data-vi="' . $opt_vi . '" data-en="' . $opt_en . '">' . $opt_vi . '</span>';
                    echo '</label>';
                }
            }
            echo '</div>';
        } else {
            // text, date, etc
            $input_type = $type === 'date' ? 'text' : $type; // Fallback to text for date if we don't use native datepicker
            echo '<input type="' . $input_type . '" name="' . $name . '" class="' . $input_class . '" ' . $req_attr . ' placeholder="' . $placeholder . '" />';
        }

        echo '</div>';
    }

    private static function render_repeatable_field( $field ) {
        $label_vi = htmlspecialchars( $field['label']['vi'] ?? $field['name'] );
        $label_en = htmlspecialchars( $field['label']['en'] ?? $field['name'] );
        
        echo '<div class="repeatable-wrapper col-span-full border border-blue-200 rounded p-4 bg-blue-50" data-field-name="' . htmlspecialchars($field['name']) . '" data-field-type="' . htmlspecialchars($field['type']) . '">';
        echo '<label class="block text-base font-bold text-blue-900 mb-2"><span class="lang-text" data-vi="' . $label_vi . '" data-en="' . $label_en . '">' . $label_vi . '</span></label>';
        
        echo '<div class="items-container space-y-4"></div>';
        
        echo '<button type="button" class="mt-4 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded font-medium text-sm flex items-center btn-add-item">';
        echo '<span class="lang-text" data-vi="+ Thêm" data-en="+ Add">+ Thêm</span>';
        echo '</button>';
        
        // Store template for JS to clone
        echo '<template class="item-template">';
        echo '<div class="repeatable-item relative p-4 bg-white border border-gray-200 rounded shadow-sm">';
        echo '<button type="button" class="btn-remove-item absolute top-2 right-2 px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs font-bold"><span class="lang-text" data-vi="Xóa" data-en="Remove">Xóa</span></button>';
        
        if ( $field['type'] === 'address_history' ) {
            echo '<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">';
            echo '<div><label class="block text-sm text-gray-600 mb-1">Địa chỉ (Address)</label><input type="text" data-name="address" class="w-full border border-gray-300 rounded px-2 py-1"></div>';
            echo '<div><label class="block text-sm text-gray-600 mb-1">Từ ngày (From)</label><input type="text" data-name="startDate" class="w-full border border-gray-300 rounded px-2 py-1"></div>';
            echo '<div><label class="block text-sm text-gray-600 mb-1">Đến ngày (To)</label><input type="text" data-name="endDate" class="w-full border border-gray-300 rounded px-2 py-1"></div>';
            echo '</div>';
        } elseif ( $field['type'] === 'work_history' ) {
            echo '<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">';
            echo '<div><label class="block text-sm text-gray-600 mb-1">Tên công ty (Employer)</label><input type="text" data-name="companyName" class="w-full border border-gray-300 rounded px-2 py-1"></div>';
            echo '<div><label class="block text-sm text-gray-600 mb-1">Nghề nghiệp (Occupation)</label><input type="text" data-name="profession" class="w-full border border-gray-300 rounded px-2 py-1"></div>';
            echo '<div><label class="block text-sm text-gray-600 mb-1">Từ ngày (From)</label><input type="text" data-name="startDate" class="w-full border border-gray-300 rounded px-2 py-1"></div>';
            echo '<div><label class="block text-sm text-gray-600 mb-1">Đến ngày (To)</label><input type="text" data-name="endDate" class="w-full border border-gray-300 rounded px-2 py-1"></div>';
            echo '</div>';
        } elseif ( $field['type'] === 'children_info' ) {
            echo '<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">';
            echo '<div><label class="block text-sm text-gray-600 mb-1">Họ (Last Name)</label><input type="text" data-name="lastName" class="w-full border border-gray-300 rounded px-2 py-1"></div>';
            echo '<div><label class="block text-sm text-gray-600 mb-1">Tên (First Name)</label><input type="text" data-name="firstName" class="w-full border border-gray-300 rounded px-2 py-1"></div>';
            echo '<div><label class="block text-sm text-gray-600 mb-1">Ngày sinh (DOB)</label><input type="text" data-name="dob" class="w-full border border-gray-300 rounded px-2 py-1"></div>';
            echo '<div><label class="block text-sm text-gray-600 mb-1">Quan hệ (Relationship)</label><input type="text" data-name="relationship" class="w-full border border-gray-300 rounded px-2 py-1"></div>';
            echo '</div>';
        } else {
            echo '<div><label class="block text-sm text-gray-600 mb-1">Value</label><input type="text" data-name="value" class="w-full border border-gray-300 rounded px-2 py-1"></div>';
        }
        
        echo '</div>';
        echo '</template>';
        
        echo '</div>';
    }
}

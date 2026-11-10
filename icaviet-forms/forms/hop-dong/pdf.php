<?php
/**
 * PDF template – Hợp Đồng Dịch Vụ ICAVIET
 * Clone 100% từ: ICAVIET - DICHVU-EN (Google Docs)
 * Biến có sẵn: $pdf (ICAVIET_FPDF), $data (array)
 */
if (!defined('ABSPATH'))
    exit;

/* ── Helpers ── */
function hd_val($data, $key, $default = '')
{
    $v = isset($data[$key]) ? trim((string) $data[$key]) : '';
    return $v !== '' ? $v : $default;
}

$full_name = hd_val($data, 'hoVaTen', '___________________');
$phone = hd_val($data, 'soDienThoai', '');
$email_c = hd_val($data, 'email', '');
$gia_raw = hd_val($data, 'giaTriHopDong', '0');
$ngay_ky = hd_val($data, 'ngayKy', date('Y-m-d'));
$contract = hd_val($data, 'contractRef', 'HD-' . hd_val($data, '_id', '0'));

$ts = strtotime($ngay_ky);
$date_fmt = $ts ? date('m/d/Y', $ts) : $ngay_ky;

$LH = 6; // line height

/* ── Shortcut: print full-width paragraph ── */
// style: '' = normal, 'B' = bold, 'I' = italic, 'BI' = bold+italic
function hd_p($pdf, $text, $style = '', $size = 11, $align = 'L', $lh = 6)
{
    $pdf->SetFont('DejaVu', $style, $size);
    $pdf->MultiCell(0, $lh, $text, 0, $align);
}

/* ── Shortcut: vertical space ── */
function hd_br($pdf, $n = 3)
{
    $pdf->Ln($n);
}

/* ── Shortcut: indented cell then multicell on same line ── */
function hd_indent_p($pdf, $indent, $text, $style = '', $size = 11, $lh = 6)
{
    $pdf->Cell($indent, $lh, '', 0, 0);
    $pdf->SetFont('DejaVu', $style, $size);
    $pdf->MultiCell(0, $lh, $text, 0, 'L');
}

/* ── Logo góc trên PHẢI — dùng ảnh bundled trong plugin (không cần download) ── */
$assets_dir = __DIR__ . '/assets/';
$logo_webp = $assets_dir . 'logo-en.webp';  // nguồn WebP
$logo_cache_en = $assets_dir . 'logo-en.png';   // PNG đã convert (cache local)

// Convert WebP → PNG một lần duy nhất (tFPDF không đọc WebP)
if (!file_exists($logo_cache_en) && file_exists($logo_webp)) {
    if (function_exists('imagecreatefromwebp')) {
        $im = @imagecreatefromwebp($logo_webp);
        if ($im) {
            imagepng($im, $logo_cache_en);
            imagedestroy($im);
        }
    }
}

if (file_exists($logo_cache_en)) {
    $saved_x = $pdf->GetX();
    $saved_y = $pdf->GetY();
    $logo_w = 55;
    $logo_x = $pdf->GetPageWidth() - $logo_w - 20;
    try {
        $pdf->Image($logo_cache_en, $logo_x, 14, $logo_w, 0);
    } catch (\Exception $e) { /* bỏ qua */
    }
    $pdf->SetXY($saved_x, $saved_y);
}


/* ══════════════════════════════════════════════════
   LETTERHEAD
   ══════════════════════════════════════════════════ */
hd_p($pdf, 'ICAVIET Immigration LLC', '', 11);
hd_p($pdf, 'Address: 300 E. 2nd Street Ste 1510,');
hd_p($pdf, 'Reno, NV 89501');
hd_br($pdf, 2);
hd_p($pdf, 'Email: info@icaviet.com');
hd_br($pdf, 2);
hd_p($pdf, 'Phone: 253 343 5988');
hd_br($pdf, 7);


/* ══════════════════════════════════════════════════
   TITLE  — BOLD, centered
   ══════════════════════════════════════════════════ */
hd_p($pdf, 'CONTRACT OF DOCUMENT PREPARATION SERVICE', 'B', 13, 'C', 8);
$pdf->SetFont('DejaVu', 'B', 12);
$pdf->MultiCell(0, 7, 'Hợp đồng tư vấn chuẩn bị hồ sơ định cư Mỹ', 0, 'C');
hd_br($pdf, 5);

/* ══════════════════════════════════════════════════
   DATE
   ══════════════════════════════════════════════════ */
hd_p($pdf, 'Date/Ngày: ' . $date_fmt);
hd_br($pdf, 1);

/* ══════════════════════════════════════════════════
   PARTIES
   ══════════════════════════════════════════════════ */
hd_p($pdf, 'This is the contract between:');
hd_p($pdf, 'Hợp đồng này được soạn giữa:', 'I');
hd_br($pdf, 2);

/* 1. ICAVIET */
$pdf->SetFont('DejaVu', '', 11);
$pdf->Cell(8, $LH, '1.', 0, 0);
$pdf->MultiCell(0, $LH, 'ICAVIET Immigration, called "ICAVIET" and', 0, 'L');

$pdf->SetFont('DejaVu', 'I', 11);
$pdf->Cell(8, $LH, '', 0, 0);
$pdf->MultiCell(0, $LH, 'Công ty ICAVIET Immigration, gọi tắt là ICAVIET và', 0, 'L');
hd_br($pdf, 2);

/* 2. Client — tên in đậm, phần còn lại bình thường */
$pdf->SetFont('DejaVu', '', 11);
$pdf->Cell(8, $LH, '2.', 0, 0);
$pdf->SetFont('DejaVu', 'B', 11);
$name_en = $full_name . ', ';
$pdf->Cell($pdf->GetStringWidth($name_en), $LH, $name_en, 0, 0);
$pdf->SetFont('DejaVu', '', 11);
$pdf->MultiCell(0, $LH, 'called "Client".', 0, 'L');

$pdf->Cell(8, $LH, '', 0, 0);
$pdf->SetFont('DejaVu', 'BI', 11);
$name_vi = $full_name . ', ';
$pdf->Cell($pdf->GetStringWidth($name_vi), $LH, $name_vi, 0, 0);
$pdf->SetFont('DejaVu', 'I', 11);
$pdf->MultiCell(0, $LH, 'Sau đây gọi là "Khách hàng".', 0, 'L');

hd_br($pdf, 4);

/* ══════════════════════════════════════════════════
   NOTICE / LƯU Ý
   ══════════════════════════════════════════════════ */
hd_p($pdf, 'NOTICE/LƯU Ý:', 'B');
hd_br($pdf, 2);

/* EN notice 1 */
$pdf->SetFont('DejaVu', '', 11);
$pdf->Write($LH, "ICAVIET prepares applications in a thorough and professional manner, helping to improve approval success rates. However, we ");
$pdf->SetFont('DejaVu', 'B', 11);
$pdf->Write($LH, "strictly do not accept marriage-based cases solely for immigration ");
$pdf->Ln();
$pdf->Write($LH, "purposes ");
$pdf->SetFont('DejaVu', '', 11);
$pdf->Write($LH, "and ");
$pdf->SetFont('DejaVu', 'B', 11);
$pdf->Write($LH, "will immediately terminate support if any signs of misrepresentation are identified.");
$pdf->Ln();

/* VI notice 1 — italic */
hd_p($pdf, "ICAVIET chuẩn bị hồ sơ chặt chẽ, chuyên nghiệp, giúp tăng tỷ lệ đậu của hồ sơ. Tuy nhiên, chúng tôi tuyệt đối không nhận các hồ sơ kết hôn chỉ vì mục đích định cư và sẽ ngừng hỗ trợ ngay nếu phát hiện dấu hiệu không trung thực.", 'I');
hd_br($pdf, 4);

/* EN notice 2 — full BOLD */
hd_p($pdf, 'ICAVIET is not a law firm and therefore cannot provide legal advice or represent you in any immigration matters. We are a professional immigration services company.', 'B');

/* VI notice 2 — italic */
hd_p($pdf, 'ICAVIET không phải là văn phòng luật sư và không cung cấp các lời khuyên pháp lý hoặc đại diện pháp lý. Chúng tôi là công ty dịch vụ di trú chuyên nghiệp.', 'I');
hd_br($pdf, 4);

/* ══════════════════════════════════════════════════
   I. SERVICES / DỊCH VỤ
   ══════════════════════════════════════════════════ */
hd_p($pdf, 'I. SERVICES/DỊCH VỤ', 'B');
hd_br($pdf, 1);

hd_p($pdf, '- ICAVIET provides services for preparing family-based immigration documents.');
hd_p($pdf, '- ICAVIET cung cấp dịch vụ chuẩn bị hồ sơ bảo lãnh định cư diện gia đình.', 'I');
hd_br($pdf, 3);

hd_p($pdf, '- ICAVIET guarantees that the services provided will be delivered professionally, adhering to all relevant regulations established by the United States Citizenship and Immigration Services (USCIS).');
hd_p($pdf, '- ICAVIET đảm bảo rằng dịch vụ sẽ được thực hiện một cách chuyên nghiệp, phù hợp với các yêu cầu của Sở Di trú và Nhập tịch (USCIS).', 'I');
hd_br($pdf, 3);

hd_p($pdf, '- ICAVIET does not guarantee specific results, as the outcome of each application is subject to review and determination by USCIS.');
hd_p($pdf, '- ICAVIET không đảm bảo hoặc đảm bảo rằng các dịch vụ sẽ đạt được kết quả, kết quả hồ sơ sẽ do Sở Di trú và Nhập tịch (USCIS) xem xét và quyết định.', 'I');
hd_br($pdf, 4);

/* ══════════════════════════════════════════════════
   II. DOCUMENTS / TÀI LIỆU
   ══════════════════════════════════════════════════ */
hd_p($pdf, 'II. DOCUMENTS/TÀI LIỆU', 'B');
hd_br($pdf, 1);

hd_p($pdf, '- The timeline for processing family petitions is governed by the USCIS and the monthly Visa Bulletin issued by the National Visa Center (NVC). ICAVIET does not have the authority to expedite this process.');
hd_p($pdf, '- Tiến độ giải quyết hồ sơ bảo lãnh diện gia đình phụ thuộc vào USCIS và lịch visa Bulletin hàng tháng của NVC, ICAVIET không có quyền can thiệp để đẩy nhanh tiến độ này.', 'I');
hd_br($pdf, 3);

hd_p($pdf, "- ICAVIET commits to completing the preparation and submission of the Client's application as required by the USCIS, NVC, or US Consulate in Vietnam within 30 days of receiving all necessary documents from the Client.");
hd_p($pdf, '- Chúng tôi cam kết hoàn thành việc chuẩn bị và nộp hồ sơ cho Khách hàng trong vòng 30 ngày kể từ khi chúng tôi nhận đầy đủ hồ sơ cần thiết theo yêu cầu của Sở Di trú và Nhập tịch (USCIS), Trung tâm Thị thực Quốc gia (NVC) hoặc Lãnh sự quán Mỹ tại Việt Nam.', 'I');
hd_br($pdf, 4);

/* ══════════════════════════════════════════════════
   III. SERVICE FEES
   ══════════════════════════════════════════════════ */
hd_p($pdf, 'III. SERVICE FEES AND GOVERNMENT FEES/PHÍ DỊCH VỤ VÀ PHÍ CHÍNH PHỦ:', 'B');
hd_br($pdf, 1);

hd_p($pdf, '- ICAVIET immigration preparation service fee for this case is $' . $gia_raw);
hd_p($pdf, '- Phí dịch vụ chuẩn bị hồ sơ định cư Mỹ cho trường hợp này là $' . $gia_raw, 'I');
hd_br($pdf, 3);

hd_p($pdf, '- ICAVIET commits not to charge any additional fees, except for government fees that arise from the Client\'s request for additional services.');
hd_p($pdf, '- ICAVIET cam kết không thu thêm bất kỳ chi phí nào khác, ngoại trừ các chi phí của chính phủ hoặc các phí phát sinh từ yêu cầu thêm của Khách hàng về dịch vụ.', 'I');
hd_br($pdf, 4);

/* ══════════════════════════════════════════════════
   IV. CANCELLATION / HỦY HỢP ĐỒNG
   ══════════════════════════════════════════════════ */
hd_p($pdf, 'IV. CANCELLATION/HỦY HỢP ĐỒNG', 'B');
hd_br($pdf, 1);

hd_p($pdf, '- Within 24 hours of signing this contract, if the Client cancels the contract, ICAVIET will refund 70% of the service fee.');
hd_p($pdf, '- Trong vòng 24h kể từ khi ký hợp đồng này, nếu Khách hàng hủy hợp đồng, ICAVIET sẽ hoàn lại 70% phí dịch vụ.', 'I');
hd_br($pdf, 3);

hd_p($pdf, '- After that time, we will not refund the service fee under any circumstances.');
hd_p($pdf, '- Sau thời gian đó, chúng tôi sẽ không hoàn lại phí dịch vụ trong bất kỳ trường hợp nào.', 'I');
hd_br($pdf, 4);

/* ══════════════════════════════════════════════════
   V. COMPLAINTS / KHIẾU NẠI
   ══════════════════════════════════════════════════ */
hd_p($pdf, 'V. COMPLAINTS/KHIẾU NẠI', 'B');
hd_br($pdf, 1);

hd_p($pdf, 'ICAVIET is committed to providing sincere and top-quality consulting services to the Client. Therefore, if the Client is not satisfied during the consultation process:');
hd_p($pdf, 'ICAVIET cam kết mang lại dịch vụ tư vấn chân thành và tốt nhất cho Khách hàng, vì vậy trong suốt quá trình tư vấn nếu Khách hàng không hài lòng:', 'I');
hd_br($pdf, 3);

/* indented sub-bullets */
hd_indent_p($pdf, 10, '- Please send us a complaint via email: info@icaviet.com');
hd_indent_p($pdf, 10, '- Vui lòng gửi khiếu nại cho chúng tôi qua email: info@icaviet.com', 'I');
hd_br($pdf, 3);

hd_indent_p($pdf, 10, '- We are committed to listening and processing complaints within 7 days after receiving the email.');
hd_indent_p($pdf, 10, '- Chúng tôi cam kết sẽ lắng nghe và xử lý khiếu nại trong vòng 7 ngày kể từ khi nhận email.', 'I');
hd_br($pdf, 3);

hd_p($pdf, "If we resolve the complaints unsatisfactorily, the Client can file a complaint directly with the Nevada Secretary of State's office via Hotline: (800) 450 8594 (Option 6), - (800) 254-2797 at www.nvbar.org");
hd_p($pdf, 'Nếu chúng tôi giải quyết không thỏa đáng, Khách hàng có thể khiếu nại trực tiếp đến văn phòng Thư ký Tiểu bang Nevada theo số Hotline: (800) 450 8594 (Option 6), - (800) 254-2797 theo đạ chỉ www.nvbar.org', 'I');
hd_br($pdf, 6);

/* ══════════════════════════════════════════════════
   CONFIRMATION — normal, italic
   ══════════════════════════════════════════════════ */
hd_p($pdf, 'I have read and agree to the entire content of the contract above.');
hd_p($pdf, 'Tôi đã đọc và đồng ý với toàn bộ.', 'I');
hd_br($pdf, 5);

/* Agreed and Accepted — BOLD centered */
hd_p($pdf, 'Agreed and Accepted', 'B', 12, 'C');
/* Xác nhận — BOLD ITALIC centered */
hd_p($pdf, 'Xác nhận đã xem và đồng ý', 'BI', 12, 'C');
hd_br($pdf, 5);

/* ══════════════════════════════════════════════════
   SIGNATURE
   ══════════════════════════════════════════════════ */
$sig_key = 'signaturePng';
$sig = !empty($data[$sig_key]) ? $data[$sig_key] : (!empty($data['__signature']) ? $data['__signature'] : '');

if ($sig && strpos($sig, 'data:image/png;base64,') === 0) {
    $img_data = base64_decode(str_replace('data:image/png;base64,', '', $sig));
    if ($img_data) {
        $tmp = tempnam(sys_get_temp_dir(), 'sig_') . '.png';
        file_put_contents($tmp, $img_data); // phpcs:ignore
        try {
            $cx = ($pdf->GetPageWidth() / 2) - 35;
            $pdf->Image($tmp, $cx, $pdf->GetY(), 70, 22);
            $pdf->Ln(25);
        } catch (\Exception $e) {
            $pdf->Ln(25);
        }
        @unlink($tmp);
    }
} else {
    $pdf->Ln(20);
}

hd_p($pdf, $full_name, '', 11, 'C');
hd_p($pdf, 'Date: ' . $date_fmt, '', 11, 'C');

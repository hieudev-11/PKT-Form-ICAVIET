<?php
/**
 * PDF template – Tiếng Việt (Vietnamese only)
 * Biến có sẵn: $pdf (ICAVIET_FPDF), $data (array)
 */
if (!defined('ABSPATH'))
    exit;

/* ── Helpers (unique prefix to avoid conflict with pdf.php) ── */
function hdvi_val($data, $key, $default = '')
{
    $v = isset($data[$key]) ? trim((string) $data[$key]) : '';
    return $v !== '' ? $v : $default;
}

$full_name = hdvi_val($data, 'hoVaTen', '___________________');
$phone = hdvi_val($data, 'soDienThoai', '');
$gia_raw = hdvi_val($data, 'giaTriHopDong', '0');
$ngay_ky = hdvi_val($data, 'ngayKy', date('Y-m-d'));

$ts = strtotime($ngay_ky);
// Vietnamese date format: dd/mm/yyyy
$date_fmt = $ts ? date('d/m/Y', $ts) : $ngay_ky;

$LH = 6.5; // line height

/* ── Shortcuts ── */
function hdvi_p($pdf, $text, $style = '', $size = 11, $align = 'L', $lh = 6.5)
{
    $pdf->SetFont('DejaVu', $style, $size);
    $pdf->MultiCell(0, $lh, $text, 0, $align);
}
function hdvi_br($pdf, $n = 4)
{
    $pdf->Ln($n);
}

/* ══════════════════════════════════════════════════
   INTRO PARAGRAPH
   ══════════════════════════════════════════════════ */
hdvi_br($pdf, 10); // Đẩy top xuống theo yêu cầu
hdvi_p($pdf, "ICAVIET cảm ơn Quý anh/chị đã tin tưởng lựa chọn chúng tôi đế chuẩn bị hồ sơ định cư Mỹ.");
hdvi_br($pdf, 2);
hdvi_p($pdf, "Trước khi bắt đầu, anh/chị hãy dành ít phút đế hiểu thêm về dịch vụ của chúng tôi!");
hdvi_br($pdf, 8);

/* ══════════════════════════════════════════════════
   CLIENT INFO
   ══════════════════════════════════════════════════ */
// Hôm nay ngày: dd/mm/yyyy
$pdf->SetFont('DejaVu', 'B', 11);
$pdf->Cell(35, $LH, "Hôm nay ngày:", 0, 0);
$pdf->SetFont('DejaVu', '', 11);
$pdf->MultiCell(0, $LH, '  ' . $date_fmt, 0, 'L');
hdvi_br($pdf, 2);

// Họ và tên
$pdf->SetFont('DejaVu', 'B', 11);
$pdf->Cell(92, $LH, "Anh/chị vui lòng nhập đầy đủ họ và tên:", 0, 0);
$pdf->SetFont('DejaVu', '', 11);
$pdf->MultiCell(0, $LH, $full_name, 0, 'L');
hdvi_br($pdf, 2);

// Số điện thoại
$pdf->SetFont('DejaVu', 'B', 11);
$pdf->Cell(38, $LH, "Số điện thoại:", 0, 0);
$pdf->SetFont('DejaVu', '', 11);
$pdf->MultiCell(0, $LH, $phone, 0, 'L');
hdvi_br($pdf, 2);

// Giá trị hợp đồng
$pdf->SetFont('DejaVu', 'B', 11);
$pdf->Cell(42, $LH, "Giá trị hợp đồng:", 0, 0);
$pdf->SetFont('DejaVu', '', 11);
$pdf->MultiCell(0, $LH, $gia_raw . ' $', 0, 'L');
hdvi_br($pdf, 8);

/* ══════════════════════════════════════════════════
   THÔNG TIN VỀ ICAVIET
   ══════════════════════════════════════════════════ */
hdvi_p($pdf, "Thông tin về ICAVIET:", 'B', 11);
hdvi_br($pdf, 2);

hdvi_p($pdf, "ICAVIET là một trong 3 công ty thành viên của ICA Holding Group, được thành lập từ năm 2019 và là Admin của group \"Luật Di trú và Cuộc sống Mỹ\" với hơn 100.000 thành viên.");
hdvi_br($pdf, 4);

/* ─── Logo (bundled trong plugin – không cần download) ─── */
$logo_cache = __DIR__ . '/assets/logo-vi.png';


if (file_exists($logo_cache)) {
    try {
        $pdf->Image($logo_cache, $pdf->GetX(), $pdf->GetY(), 130, 0);
        $pdf->Ln(32);
    } catch (\Exception $e) {
        hdvi_br($pdf, 6);
    }
} else {
    // Placeholder không tải được ảnh
    $pdf->SetDrawColor(200, 200, 200);
    $pdf->SetFillColor(245, 245, 245);
    $pdf->Rect($pdf->GetX(), $pdf->GetY(), 130, 28, 'DF');
    $pdf->SetFont('DejaVu', '', 9);
    $pdf->SetTextColor(160, 160, 160);
    $page_w = $pdf->GetPageWidth();
    $pdf->SetXY(($page_w - 130) / 2, $pdf->GetY() + 10);
    $pdf->Cell(130, 8, '[Logo ICAVIET]', 0, 0, 'C');
    $pdf->SetTextColor(0, 0, 0);
    $pdf->Ln(22);
}


hdvi_p($pdf, "ICAVIET không phải là văn phòng luật sư, chúng tôi là công ty dịch vụ di trú chuyên nghiệp.", 'BI', 11);
hdvi_br($pdf, 5);

/* ══════════════════════════════════════════════════
   ĐIỂM MẠNH CỦA ICAVIET
   ══════════════════════════════════════════════════ */
hdvi_p($pdf, "Điểm mạnh của ICAVIET:", 'B', 11);
hdvi_br($pdf, 2);

hdvi_p($pdf, "-  Là quản trị viên của một trong những group lớn nhất về định cư Mỹ, chúng tôi luôn cập nhật những quy định mới nhất của Sở Di trú và Nhập tịch (USCIS), Trung tâm Thị thực Quốc gia (NVC) và Lãnh sự quán Mỹ.");
hdvi_br($pdf, 3);

hdvi_p($pdf, "-  Đội ngũ chuyên viên tư vấn của ICAVIET có nhiều năm kinh nghiệm, luôn theo sát hồ sơ.");
hdvi_br($pdf, 3);

hdvi_p($pdf, "-  ICAVIET quản lý tiến độ hồ sơ bằng phần mềm chuyên nghiệp, quy trình kiểm soát hồ sơ chặt chẽ qua 2 bước, đảm bảo thông tin hồ sơ bảo lãnh luôn chính xác và đầy đủ.");
hdvi_br($pdf, 3);

hdvi_p($pdf, "-  Chúng tôi hỗ trợ thực tập phỏng vấn với các câu hỏi sát theo từng hồ sơ, đế người được bảo lãnh tự tin khi tham gia phỏng vấn thật sự, chúng tôi cũng cửr nhân viên hỗ trợ người được bảo lãnh khi khám sức khỏe, chích ngừa ở Việt Nam.");
hdvi_br($pdf, 5);

/* ══════════════════════════════════════════════════
   LƯU Ý
   ══════════════════════════════════════════════════ */
hdvi_p($pdf, "Lưu ý:", 'B', 11);
hdvi_br($pdf, 2);

$pdf->SetFont('DejaVu', '', 11);
$pdf->Write($LH, "-  ICAVIET chuẩn bị hồ sơ chặt chẽ, chuyên nghiệp, giúp tăng tỷ lệ đậu của hồ sơ. Tuy nhiên, chúng tôi ");
$pdf->SetFont('DejaVu', 'B', 11);
$pdf->Write($LH, "tuyệt đối không nhận các hồ sơ kết hôn chỉ vì mục đích định cư");
$pdf->SetFont('DejaVu', '', 11);
$pdf->Write($LH, " và sẽ ");
$pdf->SetFont('DejaVu', 'B', 11);
$pdf->Write($LH, "ngừng hỗ trợ ngay nếu phát hiện dấu hiệu không trung thực.");
$pdf->Ln();
hdvi_br($pdf, 3);

hdvi_p($pdf, "-  Nếu ở bước này, anh/chị hủy hợp đồng thì sẽ nhận lại đầy đủ 100% phí dịch vụ tư vấn.");
hdvi_br($pdf, 3);

hdvi_p($pdf, "-  Trong vòng 24 giờ sau khi hoàn tất bước này, anh/chị hủy hợp đồng thì sẽ nhận lại 70% phí dịch vụ tư vấn.");
hdvi_br($pdf, 3);

hdvi_p($pdf, "-  Sau thời gian trên, chúng tôi sẽ không hoàn lại phí dịch vụ trong bất kỳ trường hợp nào.");
hdvi_br($pdf, 3);

hdvi_p($pdf, "-  Trong quá trình làm hồ sơ, nếu anh/chị không hài lòng với chuyên viên tư vấn định cư của chúng tôi, vui lòng gửi email về info@icaviet.com.");
hdvi_br($pdf, 8);

/* ══════════════════════════════════════════════════
   XÁC NHẬN + SIGNATURE
   ══════════════════════════════════════════════════ */
hdvi_p($pdf, "Xác nhận đã xem và đồng ý", 'B', 12);
hdvi_br($pdf, 6);

/* Signature – đọc từ file PNG đã lưu (DB save_signature tách base64 ra file riêng) */
$sig_path = '';
if (!empty($data['_id'])) {
    $sig_path = ICAVIET_DB::get_signature_path((int) $data['_id']);
}

$left_margin = $pdf->GetX(); // lề trái hiện tại

if ($sig_path && file_exists($sig_path)) {
    try {
        $pdf->Image($sig_path, $left_margin, $pdf->GetY(), 70, 22);
        $pdf->Ln(25);
    } catch (\Exception $e) {
        $pdf->Ln(25);
    }
} else {
    $pdf->Ln(20);
}

// Tên và ngày căn trái, giới hạn 80mm (cùng khối với chữ ký)
$pdf->SetFont('DejaVu', '', 11);
$pdf->SetX($left_margin);
$pdf->MultiCell(80, 6.5, $full_name, 0, 'L');
$pdf->SetX($left_margin);
$pdf->MultiCell(80, 6.5, "Ngày: " . $date_fmt, 0, 'L');

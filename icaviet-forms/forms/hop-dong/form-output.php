<?php
/**
 * Form Hợp Đồng Dịch Vụ ICAVIET – Song ngữ Việt / English
 * $api_url – REST endpoint
 */
if (!defined('ABSPATH'))
  exit;
?>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  :root {
    --bl: #2563eb;
    --bld: #1d4ed8;
    --bll: #eff6ff;
    --dk: #111827;
    --md: #374151;
    --gr: #6b7280;
    --bd: #e5e7eb;
    --lt: #f9fafb;
    --rd: #dc2626;
    --gn: #16a34a;
    --sh: 0 1px 3px rgba(0, 0, 0, .08), 0 8px 32px rgba(0, 0, 0, .06);
    --sh2: 0 4px 24px rgba(37, 99, 235, .18);
    --text: #000;
  }

  .hd-wrap {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 15px;
    color: var(--dk);
    width: 100%;
    max-width: 700px;
/*     padding: 0 16px; */
    margin: 32px auto;
    line-height: 1.6;
    box-sizing: border-box;
  }

  .hd-wrap * {
    box-sizing: border-box
  }

  /* ── Language toggle ── */
  .lang-bar {
    display: flex;
    background: #f3f4f6;
    border-radius: 50px;
    padding: 4px;
    width: fit-content;
    margin: 0 auto 28px;
    gap: 2px
  }

  .lang-btn {
    padding: 8px 24px;
    border: none;
    background: none;
    border-radius: 50px;
    font-size: 13.5px;
    font-weight: 600;
    cursor: pointer;
    color: var(--gr);
    transition: all .2s;
    font-family: inherit
  }

  .lang-btn.active {
    background: #fff;
    color: var(--bl);
    box-shadow: 0 2px 8px rgba(0, 0, 0, .12)
  }

  /* ── Main card ── */
  .hd-card {
    background: #fff;
    border: 1px solid rgba(0, 0, 0, .07);
    border-radius: 20px;
    box-shadow: var(--sh);
    padding: 36px 40px 40px;
  }

  /* ── Header ── */
  .form-hd {
    padding-bottom: 24px;
    margin-bottom: 28px;
    border-bottom: 1px solid var(--bd);
  }

  .form-hd .hd-welcome {
    font-size: 17px;
    font-weight: 600;
    color: black;
    line-height: 1.6;
    margin: 0;
  }

  @media(max-width:600px) {
    .hd-card {
      padding: 22px 18px 28px
    }

    .form-hd {
      padding-bottom: 20px;
      margin-bottom: 20px;
    }

    .form-hd .hd-welcome {
      font-size: 15.5px;
      line-height: 1.5;
    }

    .hd-wrap {
      margin: 16px auto
    }
  }

  /* ── Section header ── */
  .sec-hd {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 32px 0 18px;
    padding: 0;
    border-bottom: 2px solid var(--bd);
    padding-bottom: 12px;
  }

  .sec-hd:first-of-type {
    margin-top: 4px
  }

  .sec-hd .sec-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: var(--bll);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
  }

  .sec-hd h3 {
    font-size: 15.5px;
    font-weight: 700;
    margin: 0;
    color: var(--dk);
    line-height: 1.2
  }

  .sec-hd span {
    font-size: 12px;
    color: var(--gr);
    display: block;
    margin-top: 1px
  }

  /* ── Terms box ── */
  .terms-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 24px;
    font-size: 15px;
    color: var(--text);
    line-height: 1.7;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.02);
  }

  .terms-box .brand {
    font-weight: 700;
    color: var(--bl)
  }

  .terms-box .bul {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
    align-items: flex-start
  }

  .terms-box .bul::before {
    content: '›';
    color: var(--bl);
    font-size: 16px;
    line-height: 1.5;
    flex-shrink: 0;
    font-weight: 700
  }

  .terms-box .note-hd {
    font-weight: 700;
    color: var(--dk);
    margin: 14px 0 8px;
    font-size: 12.5px;
    letter-spacing: .05em;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .terms-box .note-hd::before {
    content: '';
    width: 16px;
    height: 2px;
    background: var(--bl);
    border-radius: 2px;
    flex-shrink: 0;
  }

  /* ── Field groups ── */
  .fgrp {
    margin-bottom: 20px
  }

  .fgrp>label {
    display: block;
    font-size: 14.5px;
    font-weight: 500;
    color: #1f2937;
    margin-bottom: 8px;
  }

  .fgrp label .req {
    color: var(--rd);
    margin-left: 1px
  }

  .fgrp label .sub {
    font-size: 11px;
    font-weight: 500;
    text-transform: none;
    color: #9ca3af;
    margin-left: 5px;
    letter-spacing: 0;
  }

  .fgrp input,
  .fgrp textarea,
  .fgrp select {
    width: 100%;
    padding: 12px 15px;
    border: 1.5px solid var(--bd);
    border-radius: 10px;
    font-size: 14.5px;
    font-family: inherit;
    background: #fff;
    color: var(--dk);
    transition: border-color .15s, box-shadow .15s;
    -webkit-appearance: none;
    appearance: none;
  }

  .fgrp input::placeholder {
    color: #c4c9d4
  }

  .fgrp input:hover,
  .fgrp textarea:hover {
    border-color: #d1d5db
  }

  .fgrp input:focus,
  .fgrp textarea:focus,
  .fgrp select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
  }

  .fgrp textarea {
    resize: vertical;
    min-height: 80px
  }

  .fgrp.err input,
  .fgrp.err textarea {
    border-color: var(--rd);
    box-shadow: 0 0 0 4px rgba(220, 38, 38, .08)
  }

  .fgrp .errmsg {
    font-size: 12px;
    color: var(--rd);
    margin-top: 5px;
    display: none;
    font-weight: 500
  }

  .fgrp.err .errmsg {
    display: block
  }

  .fgrp .hint {
    font-size: 12px;
    color: #9ca3af;
    margin-top: 5px;
    font-style: italic
  }

  /* ── $ prefix ── */
  .input-prefix {
    position: relative
  }

  .input-prefix>span {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 15px;
    font-weight: 700;
    color: #9ca3af;
    pointer-events: none;
  }

  .input-prefix input {
    padding-left: 28px
  }

  /* ── Grid ── */
  .g2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px
  }

  @media(max-width:520px) {
    .g2 {
      grid-template-columns: 1fr
    }
  }

  .sig-wrap {
    border: 2px dashed #cbd5e1;
    border-radius: 12px;
    overflow: hidden;
    margin-top: 6px;
    background: #f8fafc;
    transition: all .2s;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.01);
  }

  .sig-wrap:hover {
    border-color: #60a5fa;
    background: #fff;
  }

  .sig-wrap canvas {
    display: block;
    width: 100%;
    max-width: 100%;
    height: 160px;
    cursor: crosshair;
    touch-action: none;
    background: #fff
  }

  .sig-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 9px 16px;
    background: #f9fafb;
    border-top: 1px solid var(--bd)
  }

  .sig-bar span {
    font-size: 12px;
    color: var(--gr)
  }

  .sig-bar button {
    font-size: 12px;
    padding: 5px 14px;
    border-radius: 7px;
    border: 1.5px solid var(--bd);
    background: #fff;
    cursor: pointer;
    color: var(--md);
    transition: all .15s;
    font-weight: 500;
  }

  .sig-bar button:hover {
    background: #fef2f2;
    border-color: #fca5a5;
    color: var(--rd)
  }

  /* ── Submit ── */
  .btn-submit {
    width: 100%;
    padding: 15px;
    border: none;
    border-radius: 12px;
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    font-size: 15.5px;
    font-weight: 700;
    color: #fff;
    cursor: pointer;
    transition: all .2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    letter-spacing: .02em;
    box-shadow: 0 4px 16px rgba(37, 99, 235, .35);
    margin-top: 10px;
    font-family: inherit;
  }

  .btn-submit:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(37, 99, 235, .45)
  }

  .btn-submit:active {
    transform: translateY(0)
  }

  .btn-submit:disabled {
    opacity: .5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none
  }

  .spn {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2.5px solid rgba(255, 255, 255, .3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: sp .7s linear infinite
  }

  @keyframes sp {
    to {
      transform: rotate(360deg)
    }
  }

  /* ── Error banner ── */
  .errbanner {
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 10px;
    padding: 13px 16px;
    color: #b91c1c;
    font-size: 13px;
    margin-bottom: 20px;
    display: none;
    font-weight: 500;
  }

  /* ── Success ── */
  .hd-suc {
    display: none;
    text-align: center;
    padding: 64px 24px;
    background: #fff;
    border-radius: 20px;
    box-shadow: var(--sh)
  }

  .hd-suc .ico {
    font-size: 60px;
    margin-bottom: 16px
  }

  .hd-suc h2 {
    font-size: 22px;
    font-weight: 800;
    color: var(--gn);
    margin-bottom: 10px
  }

  .hd-suc p {
    font-size: 14px;
    color: var(--gr);
    max-width: 380px;
    margin: 0 auto
  }

  .hd-suc .ref {
    display: inline-block;
    margin-top: 18px;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 8px;
    padding: 8px 20px;
    font-size: 13px;
    font-weight: 700;
    color: #166534;
    font-family: monospace
  }

  /* ── Divider ── */
  .val-display {
    font-size: 24px;
    font-weight: 800;
    color: var(--bl);
    background: #eff6ff;
    border-radius: 8px;
    padding: 10px 16px;
    display: inline-block;
    margin-top: 4px
  }

  @media(max-width: 480px) {
    .terms-box {
      padding: 14px;
    }
  }
</style>

<div class="hd-wrap" id="hd-root">

  <!-- ══ SPLASH SCREEN ══ -->
  <div id="hd-splash" style="
    position:fixed; top:0; left:0; width:100%; height:100%; z-index:9999;
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    background:rgba(17, 24, 39, 0.6); backdrop-filter:blur(5px); padding: 16px;">

    <div style="
      background:#fff; border-radius:24px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.3);
      padding:48px 32px; text-align:center; width: 100%; max-width:440px;">

      <img src="https://icaviet.com/wp-content/uploads/2025/09/icaviet-png.webp" alt="ICAVIET"
        style="max-width:190px; height:auto; margin-bottom:20px;">

      <!-- Language toggle in Splash -->
      <div class="lang-bar" style="margin: 0 auto 24px;">
        <button class="lang-btn lang-btn-vi active" type="button">🇻🇳 Tiếng Việt</button>
        <button class="lang-btn lang-btn-en" type="button">🇺🇸 English</button>
      </div>

      <p style="font-size:20px; font-weight:700; color:#111827; margin:0 0 12px;">
        <span class="vn">XÁC NHẬN DỊCH VỤ<br> TƯ VẤN ĐỊNH CƯ</span>
        <span class="en" style="display:none">CONFIRM IMMIGRATION CONSULTING SERVICE</span>
      </p>

      <p style="font-size:16px; font-weight:400; color:#4b5563; margin:0 0 28px; line-height: 1.6;">
        <span class="vn">ICAVIET xin cảm ơn Quý khách đã tin tưởng lựa chọn dịch vụ của chúng tôi. Trước khi bắt đầu hồ
          sơ, Quý khách vui lòng dành ít phút để điền thông tin và xác nhận anh/chị đã hiểu về phạm vi dịch vụ của chúng
          tôi.</span>
        <span class="en" style="display:none">Thank you for choosing ICAVIET. Before starting your petition, please take
          a moment to provide your information and confirm your understanding of our service scope.</span>
      </p>

      <button id="hd-splash-btn" type="button" style="
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        color:#fff; border:none; border-radius:10px; width: 100%;
        padding:14px 36px; font-size:15.5px; font-weight:700; cursor:pointer;
        font-family:inherit; transition:all .2s; box-shadow:0 4px 14px rgba(37,99,235,0.35);">
        <span class="vn">Bắt đầu xác nhận</span>
        <span class="en" style="display:none">Start Confirmation</span>
      </button>
    </div>
  </div>

  <!-- ══ NỘI DUNG FORM (ẩn lúc đầu) ══ -->
  <div id="hd-main" style="display:none;">

    <!-- Language toggle -->
    <div class="lang-bar">
      <button class="lang-btn lang-btn-vi active" type="button">🇻🇳 Tiếng Việt</button>
      <button class="lang-btn lang-btn-en" type="button">🇺🇸 English</button>
    </div>


    <!-- Form card -->
    <div class="hd-card">

      <!-- Header -->
<!--       <div class="form-hd">
        <p class="hd-welcome">
          <span class="vn">ICAVIET cảm ơn Quý anh/chị đã tin tưởng lựa chọn chúng tôi để chuẩn bị hồ sơ định cư
            Mỹ. Trước khi bắt đầu, anh/chị hãy dành ít phút để hiểu thêm về dịch vụ của chúng tôi!</span>
          <span class="en" style="display:none">Thank you for choosing ICAVIET as your trusted partner to prepare your
            U.S.
            Immigrant Petition. Before we begin, please kindly take your time to know more about our service!</span>
        </p>
      </div> -->

      <!-- Error banner -->
      <div class="errbanner" id="hd-err"></div>

      <form id="hd-form" autocomplete="off">

        
		  
		   <div class="form-hd">
        <p class="hd-welcome">
          <span class="vn">Quý khách Vui lòng dành ít phút đọc các thông tin dưới đây để hiểu rõ cách thức và phạm vi hỗ trợ của ICAVIET:</span>
          <span class="en" style="display:none">Please take a few minutes to read the information below so you can clearly understand ICAVIET’s process and scope of support:</span>
        </p>
      </div>

        <div class="terms-box">
          <!-- Vietnamese -->
          <div class="vn">
            <p><strong>VỀ ICAVIET:</strong></p>
            <p style="margin-top:10px">ICAVIET là công ty tư vấn định cư Mỹ, thuộc ICA Holding Group (thành lập từ
              2019).
              Chúng tôi là quản trị viên của cộng đồng “Luật Di trú & Cuộc sống Mỹ” với hơn 122.000 thành viên.
            </p>

            <p style="margin-top:16px; font-weight: 700;">ĐIỂM MẠNH CỦA ICAVIET:</p>
<!--             <p style="margin-top:8px">&#9679; Là quản trị viên của một trong những Group lớn nhất về định cư Mỹ.</p> -->
			<p style="margin-top:8px">&#9679; Chúng tôi luôn cập nhật những quy định mới nhất của Sở di trú Mỹ, NVC và lãnh sự quán Mỹ.</p>
            <p style="margin-top:6px">&#9679; Đội ngũ chuyên viên tư vấn của ICAVIET có nhiều năm kinh nghiệm, luôn theo
              sát hồ sơ.</p>
            <p style="margin-top:6px">&#9679; ICAVIET quản lý tiến độ hồ sơ bằng phần mềm chuyên nghiệp, quy trình kiểm
              soát hồ sơ chặt chẽ qua 2 bước, đảm bảo thông tin hồ sơ bảo lãnh luôn chính xác, đầy đủ.</p>
            <p style="margin-top:6px">&#9679; Có nhân viên đồng hành trực tiếp và hỗ trợ người được bảo lãnh trong quá
              trình khám sức khỏe và chích ngừa tại Việt Nam</p>
            <p style="margin-top:6px">&#9679; Hỗ trợ luyện phỏng vấn để người được bảo lãnh tự tin tham gia phỏng vấn
              tại Lãnh sự quán Mỹ.</p>

            <p style="margin-top:16px; font-weight: 700;">LƯU Ý QUAN TRỌNG:</p>
            <p style="margin-top:6px">&#9679; ICAVIET không phải là văn phòng luật sư và không liên kết với bất kì cơ
              quan nào của chính phủ.</p>
            <p style="margin-top:8px">&#9679; ICAVIET cam kết chuẩn bị hồ sơ chặt chẽ, chuyên nghiệp, giúp tăng tỷ lệ
              đậu của hồ sơ. Tuy nhiên, <span style="font-weight: 700;">chúng tôi tuyệt đối không nhận các hồ sơ kết hôn
                chỉ vì mục đích định cư và sẽ ngừng hỗ trợ ngay nếu phát hiện dấu hiệu không trung thực.</span></p>
            <p style="margin-top:6px">&#9679; Trong trường hợp hủy dịch vụ, quy định hoàn phí như sau:</p>
            <p style="margin-top:6px; margin-left: 20px;">&#10148; Tại thời điểm này: hoàn 100% phí hồ sơ (nếu chưa hoàn
              tất xác nhận)</p>
            <p style="margin-top:6px; margin-left: 20px;">&#10148; Trong 24 giờ kể từ khi gửi xác nhận này: hoàn 70% phí
              hồ sơ</p>
            <p style="margin-top:6px; margin-left: 20px;">&#10148; Sau thời gian trên, chúng tôi sẽ không hoàn lại phí
              dịch vụ trong bất kỳ trường hợp nào.</p>
            <p style="margin-top:6px">&#9679; Nếu anh/chị có bất cứ trải nghiệm không hài lòng nào trong quá trình hỗ
              trợ, vui lòng liên hệ: <a href="mailto:info@icaviet.com" style="color:var(--bl)">info@icaviet.com</a></p>
          </div>

          <!-- English -->
          <div class="en" style="display:none">
            <p><strong>ABOUT ICAVIET:</strong></p>
            <p style="margin-top:10px">ICAVIET is a U.S. immigration case preparation company under ICA Holding Group,
              established in 2019. We are also the administrators of the “Luật Di trú & Cuộc sống Mỹ” community, which
              has more than 122,000 members.
            </p>

            <p style="margin-top:16px; font-weight: 700;">ICAVIET’S STRENGTHS:</p>
<!--             <p style="margin-top:8px">&#9679; ICAVIET is one of the administrators of one of the largest U.S. immigration
              groups</p> -->
			<p style="margin-top:8px">&#9679; We stay up to date with the latest policies from USCIS, the NVC, and U.S. embassies and
              consulates.</p>
            <p style="margin-top:6px">&#9679; ICAVIET’s consulting team has many years of experience and closely follows
              each case.</p>
            <p style="margin-top:6px">&#9679; We manage case progress using professional software and a two-step
              review process to ensure that petition information is always accurate and complete.</p>
            <p style="margin-top:6px">&#9679; Our dedicated staff provide direct support to beneficiaries during the
              medical exam and vaccination process in Vietnam.</p>
            <p style="margin-top:6px">&#9679; We provide interview preparation support so beneficiaries can attend their
              interview at the U.S. consulate with confidence.</p>

            <p style="margin-top:16px; font-weight: 700;">IMPORTANT NOTES:</p>
            <p style="margin-top:6px">&#9679; ICAVIET is not a law firm and is not affiliated with any government
              agency.</p>
            <p style="margin-top:8px">&#9679; ICAVIET is committed to preparing cases carefully and professionally to
              help improve the chances of approval. However, <span style="font-weight: 700;">we do not accept fraudulent
                cases or non-genuine marriages for immigration purposes, and we will immediately stop providing support
                if we find that any information provided is false.</span></p>
            <p style="margin-top:6px">&#9679; In the event of service cancellation, the refund policy is as follows:</p>
            <p style="margin-top:6px; margin-left: 20px;">&#10148; On the date this confirmation is submitted: 100%
              refund of the case fee (if the confirmation process has not been completed)</p>
            <p style="margin-top:6px; margin-left: 20px;">&#10148; Within 24 hours after this confirmation is submitted:
              70% refund of the case fee</p>
            <p style="margin-top:6px; margin-left: 20px;">&#10148; After that period, no service fee will be refunded
              under any circumstances.</p>
            <p style="margin-top:6px">&#9679; If you experience any dissatisfaction during the support process, please
              contact: <a href="mailto:info@icaviet.com" style="color:var(--bl)">info@icaviet.com</a></p>
          </div>
        </div>
		  
		 
		  <div class="fgrp" style="padding-top: 30px">
          <label>
            <span class="vn">Điền họ và tên đầy đủ</span><span class="en" style="display:none">Please Fill in your full
              name</span>
            <span class="req">*</span>
          </label>
          <input type="text" name="hoVaTen" id="f-hovaten" required>
          <div class="errmsg vn">Vui lòng nhập họ và tên</div>
          <div class="errmsg en" style="display:none">Your full name</div>
        </div>

        <div class="fgrp">
          <label>
            <span class="vn">Số điện thoại</span><span class="en" style="display:none">Phone number</span>
            <span class="req">*</span>
          </label>
          <input type="tel" name="soDienThoai" id="f-phone" required>
          <div class="errmsg vn">Vui lòng nhập số điện thoại</div>
          <div class="errmsg en" style="display:none">Please enter phone number</div>
        </div>

        <div class="fgrp">
          <label>
            <span class="vn">Giá trị hợp đồng</span><span class="en" style="display:none">Contract value</span>
            <span class="req">*</span>
          </label>
          <div class="input-prefix">
            <span>$</span>
            <input type="number" name="giaTriHopDong" id="f-gia" required min="0" value="0"
              oninput="updateVal(this.value)">
          </div>
        </div>

        <!-- Signature section -->
        <div class="fgrp" style="margin-top:32px">
          <label style="font-size:15px;font-weight:700;color:var(--dk); line-height: 24px;">
            <span class="vn">Tôi đã đọc và đồng ý với tất cả những điều trên đây (Ký tên):</span>
            <span class="en" style="display:none; line-height: 24px;">I have read and agreed to all of the above (Sign):</span>
          </label>
          <div class="sig-wrap">
            <canvas id="hd-sig" width="640" height="160"></canvas>
            <div class="sig-bar">
              <span class="vn">Chạm để mở khóa / ký tên bằng ngón tay hoặc chuột</span>
              <span class="en" style="display:none">Tap to unlock / sign with finger or mouse</span>
              <button type="button" id="sig-clr">🗑 <span class="vn">Xóa</span><span class="en"
                  style="display:none">Clear</span></button>
            </div>
          </div>
          <div class="hint vn">Chữ ký của bạn sẽ được đưa vào hợp đồng PDF</div>
          <div class="hint en" style="display:none">Your signature will be included in the PDF contract</div>
        </div>

        <div class="fgrp">
          <label>
            <span class="vn">Ngày Ký</span><span class="en" style="display:none">Date Signed</span>
            <span class="req">*</span>
          </label>
          <input type="date" name="ngayKy" id="f-ngayky" required>
        </div>

        <button type="button" class="btn-submit" id="btn-submit">
          <span id="btn-text">
            <span class="vn">📝 Ký & Gửi xác nhận</span>
            <span class="en" style="display:none">📝 Sign & Submit</span>
          </span>
        </button>

      </form>

    </div><!-- /hd-card -->
  </div><!-- /hd-main -->
</div><!-- /hd-wrap -->

<!-- ══ SUCCESS MODAL ══ -->
<div id="hd-suc-modal" style="
  display:none; position:fixed; top:0; left:0; width:100%; height:100%; z-index:9999;
  align-items:center; justify-content:center;
  background:rgba(17, 24, 39, 0.65); backdrop-filter:blur(6px); padding:16px;">

  <div style="
    background:#fff; border-radius:24px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.3);
    padding:48px 32px; text-align:center; width:100%; max-width:420px;">

    <div style="font-size:64px; line-height:1; margin-bottom:20px;">🎉</div>

    <h2 style="font-size:22px; font-weight:800; color:#16a34a; margin:0 0 10px;">
      <span class="vn">Gửi thành công!</span>
      <span class="en" style="display:none">Submitted Successfully!</span>
    </h2>

    <p style="font-size:14px; color:#6b7280; margin:0 0 20px; line-height:1.6;">
      <span class="vn">ICAVIET đã nhận được thông tin của bạn. Chúng tôi sẽ liên hệ với bạn trong thời gian sớm
        nhất.</span>
      <span class="en" style="display:none">ICAVIET has received your information. We will contact you as soon as
        possible.</span>
    </p>

    <span id="suc-ref" style="
      display:inline-block; background:#f0fdf4; border:1px solid #bbf7d0;
      border-radius:8px; padding:8px 20px; font-size:13px; font-weight:700;
      color:#166534; font-family:monospace; margin-bottom:28px;"></span>

    <br>
    <button onclick="document.getElementById('hd-suc-modal').style.display='none';" type="button" style="
      background:linear-gradient(135deg,#16a34a,#15803d); color:#fff;
      border:none; border-radius:10px; padding:12px 32px;
      font-size:14.5px; font-weight:700; cursor:pointer; font-family:inherit;
      box-shadow:0 4px 14px rgba(22,163,74,.35); transition:all .2s;">
      <span class="vn">✓ Đóng</span>
      <span class="en" style="display:none">✓ Close</span>
    </button>
  </div>
</div>

<script>
  /* ── Splash screen handler ── */
  document.getElementById('hd-splash-btn').addEventListener('click', function () {
    var splash = document.getElementById('hd-splash');
    var main = document.getElementById('hd-main');
    splash.style.transition = 'opacity .3s';
    splash.style.opacity = '0';
    setTimeout(function () {
      splash.style.display = 'none';
      main.style.display = 'block';
      main.style.opacity = '0';
      main.style.transition = 'opacity .3s';
      setTimeout(function () { main.style.opacity = '1'; }, 10);
    }, 300);
  });
  /* hover effect cho nút */
  var btn = document.getElementById('hd-splash-btn');
  btn.addEventListener('mouseover', function () { this.style.background = '#1d4ed8'; });
  btn.addEventListener('mouseout', function () { this.style.background = '#2563eb'; });
</script>

<script>
  (function () {
    var API = '<?php echo esc_js($api_url); ?>';
    var hdNonce = '<?php echo esc_js(wp_create_nonce('wp_rest')); ?>';
    var lang = 'vi';

    /* ── Language toggle ── */
    function setLang(l) {
      lang = l;
      document.querySelectorAll('.vn').forEach(function (el) { el.style.display = l === 'vi' ? '' : 'none'; });
      document.querySelectorAll('.en').forEach(function (el) { el.style.display = l === 'en' ? '' : 'none'; });
      document.querySelectorAll('.lang-btn-vi').forEach(function (el) { el.classList.toggle('active', l === 'vi'); });
      document.querySelectorAll('.lang-btn-en').forEach(function (el) { el.classList.toggle('active', l === 'en'); });
      try { localStorage.setItem('hd_lang', l); } catch (e) { }
    }
    document.querySelectorAll('.lang-btn-vi').forEach(function (btn) { btn.addEventListener('click', function () { setLang('vi'); }); });
    document.querySelectorAll('.lang-btn-en').forEach(function (btn) { btn.addEventListener('click', function () { setLang('en'); }); });
    try { var sl = localStorage.getItem('hd_lang'); if (sl) setLang(sl); } catch (e) { }

    /* ── Contract value display ── */
    window.updateVal = function (v) {
      /* val-show da bo, khong can cap nhat */
    };

    /* ── Set today's date ── */
    var today = new Date().toISOString().split('T')[0];
    var dtEl = document.getElementById('f-ngayky');
    if (dtEl) dtEl.value = today;

    /* ── Signature ── */
    var canvas = document.getElementById('hd-sig');
    var ctx = canvas.getContext('2d');
    var drawing = false;
    var hasSig = false;

    function gpos(e) {
      var r = canvas.getBoundingClientRect();
      var c = e.touches ? e.touches[0] : e;
      return {
        x: (c.clientX - r.left) * canvas.width / r.width,
        y: (c.clientY - r.top) * canvas.height / r.height
      };
    }
    function startDraw(e) { drawing = true; ctx.beginPath(); var p = gpos(e); ctx.moveTo(p.x, p.y); }
    function moveDraw(e) { if (!drawing) return; var p = gpos(e); ctx.lineTo(p.x, p.y); ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(); hasSig = true; }
    function stopDraw() { drawing = false; }

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', moveDraw);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseleave', stopDraw);
    canvas.addEventListener('touchstart', function (e) { e.preventDefault(); startDraw(e); }, { passive: false });
    canvas.addEventListener('touchmove', function (e) { e.preventDefault(); moveDraw(e); }, { passive: false });
    canvas.addEventListener('touchend', stopDraw);

    document.getElementById('sig-clr').addEventListener('click', function () {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasSig = false;
    });

    function getSig() {
      if (!hasSig) return '';
      try { return canvas.toDataURL('image/png'); } catch (e) { return ''; }
    }

    /* ── Submit ── */
    document.getElementById('btn-submit').addEventListener('click', function () {
      var btn = this;
      var errEl = document.getElementById('hd-err');
      errEl.style.display = 'none';

      // Validate
      var form = document.getElementById('hd-form');
      var ok = true;

      // Required inputs
      form.querySelectorAll('[required]').forEach(function (el) {
        var grp = el.closest('.fgrp');
        var val = el.type === 'checkbox' ? el.checked : (el.value || '').trim();
        if (!val) {
          ok = false;
          if (grp) { grp.classList.add('err'); }
        } else {
          if (grp) grp.classList.remove('err');
        }
      });

      if (!hasSig) {
        ok = false;
        var sigWrap = canvas.closest('.sig-wrap');
        if (sigWrap) sigWrap.style.borderColor = '#ef4444';
        var msg = lang === 'vi' ? 'Vui lòng ký tên vào ô chữ ký.' : 'Please sign in the signature field.';
        errEl.textContent = msg;
        errEl.style.display = 'block';
      } else {
        var sigWrap = canvas.closest('.sig-wrap');
        if (sigWrap) sigWrap.style.borderColor = '';
      }

      if (!ok) {
        if (hasSig) {
          var msg = lang === 'vi' ? 'Vui lòng điền đầy đủ tất cả thông tin bắt buộc.' : 'Please complete all required fields.';
          errEl.textContent = msg;
          errEl.style.display = 'block';
        }
        errEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      // Collect data
      var data = { lang: lang };
      var els = form.elements;
      for (var i = 0; i < els.length; i++) {
        var el = els[i];
        var k = el.name || el.id;
        if (!k || el.type === 'submit' || el.type === 'button') continue;
        if (el.type === 'checkbox') data[k] = el.checked;
        else data[k] = el.value;
      }
      data.signaturePng = getSig();
      data.contractRef = 'HD-' + Math.random().toString(36).substr(2, 8).toUpperCase();

      // Submit
      btn.disabled = true;
      btn.innerHTML = '<span class="spn"></span>';

      fetch(API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': hdNonce
        },
        body: JSON.stringify(data)
      })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (res && res.success) {
            var modal = document.getElementById('hd-suc-modal');
            document.getElementById('suc-ref').textContent = data.contractRef;
            modal.style.display = 'flex';
            if (lang === 'en') setLang('en');
          } else {
            var msg = (res && res.message) || (lang === 'vi' ? 'Có lỗi xảy ra, vui lòng thử lại.' : 'An error occurred, please try again.');
            errEl.textContent = msg;
            errEl.style.display = 'block';
            errEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            btn.disabled = false;
            btn.innerHTML = '<span id="btn-text"><span class="vn">📝 Ký & Gửi Hợp Đồng</span><span class="en" style="display:' + (lang === 'en' ? '' : 'none') + '">📝 Sign & Submit Agreement</span></span>';
            if (lang === 'en') setLang('en');
          }
        })
        .catch(function () {
          var msg = lang === 'vi' ? 'Lỗi kết nối, vui lòng kiểm tra mạng và thử lại.' : 'Connection error. Please check your network and try again.';
          errEl.textContent = msg;
          errEl.style.display = 'block';
          errEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          btn.disabled = false;
          btn.innerHTML = '<span id="btn-text"><span class="vn">📝 Ký & Gửi Hợp Đồng</span><span class="en">📝 Sign & Submit Agreement</span></span>';
        });
    });

    /* ── Remove err on input ── */
    document.getElementById('hd-form').addEventListener('input', function (e) {
      var grp = e.target.closest('.fgrp');
      if (grp) grp.classList.remove('err');
    });

  })();
</script>
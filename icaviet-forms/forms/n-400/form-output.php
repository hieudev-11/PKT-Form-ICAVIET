<?php
/**
 * Form N-400 – Thong Tin Nhap Tich My (Multi-step Wizard)
 * $api_url – REST endpoint
 */
if (!defined('ABSPATH'))
  exit;
?>
<style>
:root{--bl:#2563eb;--bld:#1d4ed8;--dk:#111827;--md:#374151;--gr:#6b7280;--bd:#e5e7eb;--lt:#f9fafb;--rd:#ef4444;--gn:#16a34a;--r:12px;--sh:0 1px 3px rgba(0,0,0,.1),0 1px 2px rgba(0,0,0,.06)}
.wz{font-family:'Inter','Segoe UI',system-ui,sans-serif;font-size:15px;color:var(--dk);max-width:680px;margin:0 auto;line-height:1.6}
.wz *{box-sizing:border-box}

/* ── Header ── */
.wz-hd{text-align:center;padding:32px 24px 24px}
.wz-hd h1{font-size:24px;font-weight:700;margin:0 0 6px;color:var(--dk)}
.wz-hd p{font-size:14px;color:var(--gr);margin:0}

/* ── Step dots ── */
.wz-steps{display:flex;align-items:center;justify-content:center;gap:0;padding:0 24px 28px;overflow-x:auto}
.wz-steps::-webkit-scrollbar{height:0}
.wz-step{display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;min-width:48px;position:relative}
.wz-step:not(:last-child)::after{content:'';position:absolute;top:14px;left:calc(50% + 14px);right:calc(-50% + 14px);height:2px;background:var(--bd);z-index:0;transition:background .3s}
.wz-step.done:not(:last-child)::after{background:var(--bl)}
.wz-dot{width:28px;height:28px;border-radius:50%;border:2px solid var(--bd);background:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--gr);z-index:1;transition:all .3s;position:relative}
.wz-step.done .wz-dot{background:var(--bl);border-color:var(--bl);color:#fff}
.wz-step.active .wz-dot{background:#fff;border-color:var(--bl);color:var(--bl);box-shadow:0 0 0 4px rgba(37,99,235,.15)}
.wz-lbl{font-size:10px;font-weight:600;color:var(--gr);text-align:center;white-space:nowrap;transition:color .3s}
.wz-step.active .wz-lbl{color:var(--bl)}
.wz-step.done .wz-lbl{color:var(--bl)}
@media(max-width:540px){.wz-lbl{display:none}.wz-steps{gap:0;padding:0 12px 20px}}

/* ── Card ── */
.wz-card{background:#fff;border:1px solid var(--bd);border-radius:var(--r);box-shadow:var(--sh);padding:28px 32px;margin:0 0 16px}
@media(max-width:540px){.wz-card{padding:20px 16px;border-radius:8px}}
.wz-card-hd{display:flex;align-items:center;gap:12px;margin-bottom:24px}
.wz-card-icon{width:40px;height:40px;border-radius:10px;background:rgba(37,99,235,.08);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
.wz-card-hd h2{font-size:17px;font-weight:700;margin:0;color:var(--dk)}
.wz-card-hd p{font-size:13px;color:var(--gr);margin:0}

/* ── Fields ── */
.fgrp{margin-bottom:18px}
.fgrp label{display:block;font-size:12px;font-weight:600;color:var(--md);margin-bottom:6px;letter-spacing:.02em}
.fgrp label .req{color:var(--rd);margin-left:2px}
.fgrp input,.fgrp textarea,.fgrp select{
  width:100%;padding:10px 14px;
  border:1.5px solid var(--bd);border-radius:8px;
  font-size:14px;font-family:inherit;
  background:#fff;color:var(--dk);
  transition:border-color .15s,box-shadow .15s;
  appearance:none;-webkit-appearance:none;
}
.fgrp input:focus,.fgrp textarea:focus,.fgrp select:focus{outline:none;border-color:var(--bl);box-shadow:0 0 0 3px rgba(37,99,235,.12)}
.fgrp textarea{resize:vertical;min-height:90px}
.fgrp.err input,.fgrp.err textarea{border-color:var(--rd)}
.fgrp .errmsg{font-size:12px;color:var(--rd);margin-top:4px;display:none}
.fgrp.err .errmsg{display:block}

/* ── Grid ── */
.g2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
@media(max-width:520px){.g2,.g3{grid-template-columns:1fr}}

/* ── Chip choices ── */
.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:2px}
.chips .chip{
  padding:8px 18px;border:1.5px solid var(--bd);border-radius:100px;
  font-size:13px;font-weight:500;cursor:pointer;background:#fff;
  color:var(--md);transition:all .15s;user-select:none;
}
.chips .chip:hover{border-color:#93c5fd;color:var(--bl);background:#eff6ff}
.chips .chip.on{background:var(--bl);border-color:var(--bl);color:#fff;font-weight:600}

/* ── Subsection ── */
.ssub{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#9ca3af;margin:24px 0 14px;display:flex;align-items:center;gap:8px}
.ssub::after{content:'';flex:1;height:1px;background:var(--bd)}

/* ── Dynamic items ── */
.di{background:var(--lt);border:1px solid var(--bd);border-radius:10px;padding:16px;margin-bottom:10px;position:relative}
.di-title{font-size:12px;font-weight:700;color:var(--bl);margin-bottom:12px}
.di-rm{position:absolute;top:12px;right:12px;background:none;border:none;color:#d1d5db;font-size:18px;cursor:pointer;line-height:1;padding:2px;border-radius:4px;transition:color .15s}
.di-rm:hover{color:var(--rd)}
.add-btn{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;border:1.5px dashed #93c5fd;border-radius:8px;color:var(--bl);background:#eff6ff;cursor:pointer;font-size:13px;font-weight:600;transition:all .15s;margin-top:4px}
.add-btn:hover{background:#dbeafe;border-color:var(--bl)}

/* ── Cond block ── */
.cond{display:none}
.cond.show{display:block}

/* ── Signature ── */
.sig-wrap{border:1.5px solid var(--bd);border-radius:10px;overflow:hidden;margin-top:4px;background:#fafafa}
.sig-wrap canvas{display:block;width:100%;height:150px;cursor:crosshair;touch-action:none;background:#fff}
.sig-bar{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--lt);border-top:1px solid var(--bd)}
.sig-bar span{font-size:12px;color:var(--gr)}
.sig-bar button{font-size:12px;padding:4px 12px;border-radius:6px;border:1px solid var(--bd);background:#fff;cursor:pointer;color:var(--md);transition:all .15s}
.sig-bar button:hover{background:#fee2e2;border-color:#fca5a5;color:var(--rd)}

/* ── Confirm checkbox ── */
.confirm-box{display:flex;gap:12px;align-items:flex-start;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 16px;margin-bottom:16px}
.confirm-box input[type=checkbox]{width:18px;height:18px;flex-shrink:0;margin-top:2px;accent-color:var(--gn);cursor:pointer}
.confirm-box label{font-size:13px;color:#166534;cursor:pointer;line-height:1.5}

/* ── Nav buttons ── */
.wz-nav{display:flex;gap:10px;margin-top:8px}
.btn-prev{flex:0 0 auto;padding:11px 22px;border:1.5px solid var(--bd);border-radius:8px;background:#fff;font-size:14px;font-weight:600;color:var(--md);cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:6px}
.btn-prev:hover{border-color:#9ca3af;color:var(--dk)}
.btn-next{flex:1;padding:12px 22px;border:none;border-radius:8px;background:var(--bl);font-size:15px;font-weight:700;color:#fff;cursor:pointer;transition:background .15s;display:flex;align-items:center;justify-content:center;gap:6px}
.btn-next:hover{background:var(--bld)}
.btn-next:disabled{opacity:.55;cursor:not-allowed}

/* ── Error banner ── */
.errbanner{background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 15px;color:#b91c1c;font-size:13px;margin-bottom:16px;display:none}

/* ── Success ── */
.wz-suc{display:none;text-align:center;padding:52px 24px}
.wz-suc .ico{font-size:56px;margin-bottom:16px}
.wz-suc h2{font-size:22px;font-weight:700;color:var(--gn);margin-bottom:8px}
.wz-suc p{font-size:14px;color:var(--gr);max-width:360px;margin:0 auto}

/* ── Spinner ── */
.spn{display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;animation:sp .7s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}

/* ── Note ── */
.note{font-size:12px;color:var(--gr);font-style:italic;margin:2px 0 8px}
</style>

<div class="wz" id="wz-root">
  <div class="wz-hd">
    <h1>📋 Thông Tin Nhập Tịch Mỹ</h1>
    <p>Đơn N-400 – Điền đầy đủ thông tin để chúng tôi hỗ trợ bạn</p>
  </div>

  <!-- Step dots -->
  <div class="wz-steps" id="wz-dots"></div>

  <!-- Error -->
  <div class="errbanner" id="wz-err"></div>

  <!-- Steps HTML -->
  <form id="wz-form" autocomplete="off">

    <!-- ═══════════════════════════════════ STEP 1 ═══ -->
    <div class="wz-step-content" data-step="1">
      <div class="wz-card">
        <div class="wz-card-hd">
          <div class="wz-card-icon">👤</div>
          <div><h2>Thông tin cá nhân</h2><p>Phần A – Tên, mã số, liên lạc</p></div>
        </div>

        <div class="ssub">Tên hợp pháp hiện tại (trên giấy tờ)</div>
        <div class="g3">
          <div class="fgrp"><label>Họ <span class="req">*</span></label><input name="ho_hop_phap" required placeholder="Family Name"></div>
          <div class="fgrp"><label>Tên <span class="req">*</span></label><input name="ten_hop_phap" required placeholder="Given Name"></div>
          <div class="fgrp"><label>Tên lót</label><input name="ten_lot_hop_phap" placeholder="Middle Name"></div>
        </div>

        <div class="ssub">Tên trên thẻ xanh (nếu khác)</div>
        <div class="g3">
          <div class="fgrp"><label>Họ</label><input name="ho_the_xanh" placeholder="Family Name"></div>
          <div class="fgrp"><label>Tên</label><input name="ten_the_xanh" placeholder="Given Name"></div>
          <div class="fgrp"><label>Tên lót</label><input name="ten_lot_the_xanh" placeholder="Middle Name"></div>
        </div>

        <div class="ssub">Tên gọi khác / Biệt danh (nếu có)</div>
        <div class="g3">
          <div class="fgrp"><label>Họ</label><input name="biet_danh_ho" placeholder="Family Name"></div>
          <div class="fgrp"><label>Tên</label><input name="biet_danh_ten" placeholder="Given Name"></div>
          <div class="fgrp"><label>Tên lót</label><input name="biet_danh_ten_lot" placeholder="Middle Name"></div>
        </div>

        <div class="ssub">Tên muốn đổi sau khi nhập tịch (để trống nếu không đổi)</div>
        <div class="g3">
          <div class="fgrp"><label>Họ mới</label><input name="ten_doi_ho" placeholder="Family Name"></div>
          <div class="fgrp"><label>Tên mới</label><input name="ten_doi_ten" placeholder="Given Name"></div>
          <div class="fgrp"><label>Tên lót mới</label><input name="ten_doi_ten_lot" placeholder="Middle Name"></div>
        </div>

        <div class="ssub">Số định danh</div>
        <div class="g2">
          <div class="fgrp"><label>Số An Sinh Xã Hội – SSN <span class="req">*</span></label><input name="ssn" required placeholder="XXX-XX-XXXX"></div>
          <div class="fgrp"><label>Số tài khoản USCIS online</label><input name="uscis_online_account_number" placeholder="0000-0000-0000"></div>
          <div class="fgrp"><label>Số A (A-Number) <span class="req">*</span></label><input name="a_number" required placeholder="A-000 000 000"></div>
        </div>

        <div class="ssub">Ngày tháng</div>
        <div class="g2">
          <div class="fgrp"><label>Ngày sinh <span class="req">*</span></label><input type="date" name="ngay_sinh" required></div>
          <div class="fgrp"><label>Ngày trở thành thường trú nhân <span class="req">*</span></label><input type="date" name="ngay_thuong_tru" required></div>
        </div>

        <div class="ssub">Liên lạc</div>
        <div class="g3">
          <div class="fgrp"><label>Số ĐT ban ngày <span class="req">*</span></label><input type="tel" name="dien_thoai" required placeholder="+1 (xxx) xxx-xxxx"></div>
          <div class="fgrp"><label>Số ĐT di động / buổi tối</label><input type="tel" name="dien_thoai_toi" placeholder="+1 (xxx) xxx-xxxx"></div>
          <div class="fgrp"><label>Email</label><input type="email" name="email" placeholder="example@email.com"></div>
        </div>

        <div class="ssub">Nơi sinh</div>
        <div class="g3">
          <div class="fgrp"><label>Tỉnh / Thành phố <span class="req">*</span></label><input name="noi_sinh_tinh" required></div>
          <div class="fgrp"><label>Bang / Vùng</label><input name="noi_sinh_bang"></div>
          <div class="fgrp"><label>Quốc gia <span class="req">*</span></label><input name="noi_sinh_quoc_gia" required value="Việt Nam"></div>
        </div>

        <div class="ssub">Đặc điểm nhận dạng</div>
        <div class="fgrp">
          <label>Giới tính <span class="req">*</span></label>
          <input type="hidden" name="gioi_tinh" id="gt-hid">
          <div class="chips" data-hid="gt-hid"><span class="chip">Nam</span><span class="chip">Nữ</span></div>
        </div>
        <div class="g2">
          <div class="fgrp"><label>Chiều cao (inches)</label><input name="chieu_cao" placeholder="VD: 65"></div>
          <div class="fgrp"><label>Cân nặng (pounds)</label><input name="can_nang" placeholder="VD: 140"></div>
        </div>
        <div class="fgrp">
          <label>Màu mắt</label>
          <input type="hidden" name="mau_mat" id="mm-hid">
          <div class="chips" data-hid="mm-hid">
            <?php foreach (['Đen', 'Nâu', 'Xanh lá', 'Xanh dương', 'Xám', 'Khác'] as $v): ?>
            <span class="chip"><?php echo esc_html($v); ?></span>
    
        <?php if ($key === 'dang_ky_bau_cu'): ?>
        <div class="fgrp">
          <label>Bạn đang có, hoặc đã từng có, tước hiệu cha truyền con nối hoặc huân chương quý tộc ở bất kỳ quốc gia nào khác không?</label>
          <input type="hidden" name="has_foreign_hereditary_title" id="foreign-title-hid">
          <div class="chips" data-hid="foreign-title-hid">
            <span class="chip" data-hide="foreign-title-extra">Không</span><span class="chip" data-show="foreign-title-extra">Có</span>
          </div>
        </div>
        <div id="foreign-title-extra" class="cond">
          <div class="fgrp">
            <label>Giải thích</label>
            <textarea name="foreign_title_explanation" placeholder="Giải thích về tước hiệu cha truyền con nối hoặc huân chương quý tộc"></textarea>
          </div>
          <div class="fgrp">
            <label>Bạn có sẵn sàng từ bỏ bất kỳ tước hiệu cha truyền con nối hoặc huân chương quý tộc nào mà bạn có ở nước ngoài trong nghi lễ nhập tịch của mình không?</label>
            <input type="hidden" name="willing_to_renounce_foreign_titles" id="renounce-title-hid">
            <div class="chips" data-hid="renounce-title-hid">
              <span class="chip" data-hide="renounce-title-list">Không</span><span class="chip" data-show="renounce-title-list">Có</span>
            </div>
          </div>
          <div id="renounce-title-list" class="cond fgrp">
            <label>Các tước hiệu cha truyền con nối hoặc huân chương quý tộc</label>
            <div id="foreign-title-list"><input name="foreign_titles_to_renounce[]" placeholder="Nhập tước hiệu hoặc huân chương quý tộc"></div>
            <button type="button" class="btn ghost" id="add-foreign-title">+ Thêm</button>
          </div>
        </div>
        <?php endif; ?>
        <?php
endforeach; ?>
          </div>
        </div>
        <div class="fgrp">
          <label>Màu tóc</label>
          <input type="hidden" name="mau_toc" id="mt-hid">
          <div class="chips" data-hid="mt-hid">
            <?php foreach (['Đen', 'Nâu', 'Vàng', 'Đỏ', 'Bạc/Trắng', 'Trọc', 'Khác'] as $v): ?>
            <span class="chip"><?php echo esc_html($v); ?></span>
    
        <?php if ($key === 'dang_ky_bau_cu'): ?>
        <div class="fgrp">
          <label>Bạn đang có, hoặc đã từng có, tước hiệu cha truyền con nối hoặc huân chương quý tộc ở bất kỳ quốc gia nào khác không?</label>
          <input type="hidden" name="has_foreign_hereditary_title" id="foreign-title-hid">
          <div class="chips" data-hid="foreign-title-hid">
            <span class="chip" data-hide="foreign-title-extra">Không</span><span class="chip" data-show="foreign-title-extra">Có</span>
          </div>
        </div>
        <div id="foreign-title-extra" class="cond">
          <div class="fgrp">
            <label>Giải thích</label>
            <textarea name="foreign_title_explanation" placeholder="Giải thích về tước hiệu cha truyền con nối hoặc huân chương quý tộc"></textarea>
          </div>
          <div class="fgrp">
            <label>Bạn có sẵn sàng từ bỏ bất kỳ tước hiệu cha truyền con nối hoặc huân chương quý tộc nào mà bạn có ở nước ngoài trong nghi lễ nhập tịch của mình không?</label>
            <input type="hidden" name="willing_to_renounce_foreign_titles" id="renounce-title-hid">
            <div class="chips" data-hid="renounce-title-hid">
              <span class="chip" data-hide="renounce-title-list">Không</span><span class="chip" data-show="renounce-title-list">Có</span>
            </div>
          </div>
          <div id="renounce-title-list" class="cond fgrp">
            <label>Các tước hiệu cha truyền con nối hoặc huân chương quý tộc</label>
            <div id="foreign-title-list"><input name="foreign_titles_to_renounce[]" placeholder="Nhập tước hiệu hoặc huân chương quý tộc"></div>
            <button type="button" class="btn ghost" id="add-foreign-title">+ Thêm</button>
          </div>
        </div>
        <?php endif; ?>
        <?php
endforeach; ?>
          </div>
        </div>

        <div class="ssub">Địa chỉ</div>
        <div class="fgrp"><label>Địa chỉ hiện tại tại Mỹ <span class="req">*</span></label><input name="dia_chi_my" required placeholder="Street, City, State, ZIP"></div>
        <div class="g2">
          <div class="fgrp"><label>Ngày bắt đầu ở địa chỉ này</label><input type="date" name="ngay_bat_dau_dia_chi"></div>
          <div class="fgrp"><label>Địa chỉ nhận thư tại Mỹ (nếu khác địa chỉ trên)</label><input name="dia_chi_nhan_thu" placeholder="Street, City, State, ZIP"></div>
        </div>
        <div class="fgrp"><label>Địa chỉ cũ tại Việt Nam</label><input name="dia_chi_vn" placeholder="Số nhà, đường, quận/huyện, tỉnh/thành phố"></div>

        <div class="ssub">Lịch sử 5 năm</div>
        <p class="note">Có thể xuống dòng để kê nhiều mục</p>
        <div class="fgrp"><label>Các địa chỉ đã ở trong 5 năm qua</label>
          <textarea name="lich_su_dia_chi" placeholder="MM/YYYY – MM/YYYY: địa chỉ&#10;VD: 01/2020 – 06/2022: 123 Main St, San Jose, CA"></textarea>
        </div>
        <div class="fgrp"><label>Lịch sử công việc &amp; học tập trong 5 năm qua</label>
          <textarea name="lich_su_cong_viec" placeholder="MM/YYYY – MM/YYYY: Tên công ty/trường – Chức vụ – Địa chỉ"></textarea>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════ STEP 2 ═══ -->
    <div class="wz-step-content" data-step="2" style="display:none">
      <div class="wz-card">
        <div class="wz-card-hd">
          <div class="wz-card-icon">👨‍👩‍👧</div>
          <div><h2>Thông tin cha mẹ</h2><p>Phần B</p></div>
        </div>

        <div class="fgrp">
          <label>Cha mẹ kết hôn trước khi bạn 18 tuổi?</label>
          <input type="hidden" name="cha_me_ket_hon" id="cmkh-hid">
          <div class="chips" data-hid="cmkh-hid">
            <span class="chip">Trước 18 tuổi</span>
            <span class="chip">Sau 18 tuổi</span>
            <span class="chip">Không áp dụng</span>
          </div>
        </div>

        <div class="ssub">Thông tin Cha</div>
        <div class="g3">
          <div class="fgrp"><label>Họ</label><input name="cha_ho"></div>
          <div class="fgrp"><label>Tên</label><input name="cha_ten"></div>
          <div class="fgrp"><label>Tên lót</label><input name="cha_ten_lot"></div>
        </div>
        <div class="g2">
          <div class="fgrp"><label>Ngày sinh</label><input type="date" name="cha_ngay_sinh"></div>
          <div class="fgrp"><label>Nơi sinh</label><input name="cha_noi_sinh"></div>
        </div>
        <div class="g2">
          <div class="fgrp"><label>Nơi ở hiện tại</label><input name="cha_noi_o"></div>
          <div class="fgrp">
            <label>Tình trạng cư trú</label>
            <input type="hidden" name="cha_cu_tru" id="chact-hid">
            <div class="chips" data-hid="chact-hid">
              <span class="chip">Công dân Mỹ</span><span class="chip">Thường trú nhân</span><span class="chip">Khác</span>
            </div>
          </div>
        </div>
        <div class="g2">
          <div class="fgrp"><label>Quốc tịch</label><input name="cha_quoc_tich" value="Việt Nam"></div>
          <div class="fgrp"><label>Ngày mất (nếu đã qua đời)</label><input type="date" name="cha_ngay_mat"></div>
        </div>

        <div class="ssub">Thông tin Mẹ</div>
        <div class="g3">
          <div class="fgrp"><label>Họ</label><input name="me_ho"></div>
          <div class="fgrp"><label>Tên</label><input name="me_ten"></div>
          <div class="fgrp"><label>Tên lót</label><input name="me_ten_lot"></div>
        </div>
        <div class="g2">
          <div class="fgrp"><label>Ngày sinh</label><input type="date" name="me_ngay_sinh"></div>
          <div class="fgrp"><label>Nơi sinh</label><input name="me_noi_sinh"></div>
        </div>
        <div class="g2">
          <div class="fgrp"><label>Nơi ở hiện tại</label><input name="me_noi_o"></div>
          <div class="fgrp">
            <label>Tình trạng cư trú</label>
            <input type="hidden" name="me_cu_tru" id="mect-hid">
            <div class="chips" data-hid="mect-hid">
              <span class="chip">Công dân Mỹ</span><span class="chip">Thường trú nhân</span><span class="chip">Khác</span>
            </div>
          </div>
        </div>
        <div class="g3">
          <div class="fgrp"><label>Họ thời con gái của mẹ (Maiden Name)</label><input name="me_ho_truoc_ket_hon" placeholder="Nếu khác họ hiện tại"></div>
          <div class="fgrp"><label>Quốc tịch</label><input name="me_quoc_tich" value="Việt Nam"></div>
          <div class="fgrp"><label>Ngày mất (nếu đã qua đời)</label><input type="date" name="me_ngay_mat"></div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════ STEP 3 ═══ -->
    <div class="wz-step-content" data-step="3" style="display:none">
      <div class="wz-card">
        <div class="wz-card-hd">
          <div class="wz-card-icon">💍</div>
          <div><h2>Tình trạng hôn nhân</h2><p>Phần C/D</p></div>
        </div>

        <div class="fgrp">
          <label>Tình trạng hôn nhân hiện tại <span class="req">*</span></label>
          <input type="hidden" name="tinh_trang_hon_nhan" id="tthn-hid">
          <div class="chips" data-hid="tthn-hid" data-cond>
            <span class="chip" data-show="sp-block">Kết hôn</span>
            <span class="chip" data-hide="sp-block">Độc thân</span>
            <span class="chip" data-hide="sp-block">Ly thân</span>
            <span class="chip" data-hide="sp-block">Ly hôn</span>
            <span class="chip" data-hide="sp-block">Góa</span>
          </div>
        </div>
        <div class="fgrp" style="max-width:180px">
          <label>Tổng số lần kết hôn</label>
          <input type="number" name="so_lan_ket_hon" min="0" max="20" value="0">
        </div>

        <div class="cond" id="sp-block">
          <div class="ssub">Vợ / chồng hiện tại</div>
          <div class="g3">
            <div class="fgrp"><label>Họ</label><input name="sp_ho"></div>
            <div class="fgrp"><label>Tên</label><input name="sp_ten"></div>
            <div class="fgrp"><label>Tên lót</label><input name="sp_ten_lot"></div>
          </div>
          <div class="g2">
            <div class="fgrp"><label>Ngày sinh</label><input type="date" name="sp_ngay_sinh"></div>
            <div class="fgrp">
              <label>Giới tính</label>
              <input type="hidden" name="sp_gioi_tinh" id="spgt-hid">
              <div class="chips" data-hid="spgt-hid"><span class="chip">Nam</span><span class="chip">Nữ</span></div>
            </div>
          </div>
          <div class="g2">
            <div class="fgrp"><label>Nơi sinh</label><input name="sp_noi_sinh"></div>
            <div class="fgrp"><label>Quốc tịch</label><input name="sp_quoc_tich" value="Việt Nam"></div>
          </div>
          <div class="g2">
            <div class="fgrp"><label>Địa chỉ hiện tại</label><input name="sp_dia_chi"></div>
            <div class="fgrp"><label>Ngày kết hôn</label><input type="date" name="sp_ngay_ket_hon"></div>
          </div>
          <div class="fgrp">
            <label>Người hôn phối hiện tại của bạn trở thành công dân Mỹ khi nào?</label>
            <input type="hidden" name="sp_cach_tro_thanh_cong_dan_my" id="spcitizen-hid">
            <div class="chips" data-hid="spcitizen-hid">
              <span class="chip" data-hide="sp-citizen-date-block">Sinh ra tại Mỹ</span>
              <span class="chip" data-show="sp-citizen-date-block">Khác</span>
            </div>
          </div>
          <div class="cond" id="sp-citizen-date-block">
            <div class="fgrp"><label>Ngày người hôn phối hiện tại của bạn trở thành công dân Mỹ</label><input type="date" name="sp_ngay_tro_thanh_cong_dan_my"></div>
          </div>
          <div class="g2">
            <div class="fgrp"><label>Số A của người hôn phối hiện tại</label><input name="sp_a_number" placeholder="A-000 000 000"></div>
            <div class="fgrp"><label>Số lần kết hôn của người hôn phối hiện tại</label><input type="number" name="sp_so_lan_ket_hon" min="0" max="20" value="1"></div>
          </div>
          <div class="g2">
            <div class="fgrp"><label>SSN của vợ/chồng</label><input name="sp_ssn"></div>
            <div class="fgrp"><label>Nơi kết hôn (Thành phố, Tiểu bang)</label><input name="sp_noi_ket_hon" placeholder="VD: San Jose, CA"></div>
          </div>
          <div class="g2">
            <div class="fgrp"><label>Nghề nghiệp của vợ/chồng</label><input name="sp_nghe_nghiep" placeholder="VD: Kỹ sư, Nội trợ..."></div>
            <div class="fgrp">
              <label>Tình trạng nhập cư của vợ/chồng</label>
              <input type="hidden" name="sp_tinh_trang_nhap_cu" id="sptnc-hid">
              <div class="chips" data-hid="sptnc-hid">
                <span class="chip">Công dân Mỹ</span><span class="chip">Thường trú nhân</span><span class="chip">Visa</span><span class="chip">Khác</span>
              </div>
            </div>
          </div>
        </div>

        <div class="ssub">Vợ / chồng cũ</div>
        <p class="note">Kê tất cả lần hôn nhân trước đây (nếu có)</p>
        <div id="exsp-list"></div>
        <button type="button" class="add-btn" id="add-exsp">＋ Thêm vợ/chồng cũ</button>
      </div>
    </div>

    <!-- ═══════════════════════════════════ STEP 4 ═══ -->
    <div class="wz-step-content" data-step="4" style="display:none">
      <div class="wz-card">
        <div class="wz-card-hd">
          <div class="wz-card-icon">👶</div>
          <div><h2>Thông tin con cái</h2><p>Phần E</p></div>
        </div>
        <div class="fgrp" style="max-width:200px">
          <label>Tổng số con (ruột, riêng, nuôi)</label>
          <input type="number" name="tong_so_con" min="0" max="30" value="0">
        </div>
        <div id="child-list"></div>
        <button type="button" class="add-btn" id="add-child">＋ Thêm con</button>
      </div>
    </div>

    <!-- ═══════════════════════════════════ STEP 5 ═══ -->
    <div class="wz-step-content" data-step="5" style="display:none">
      <div class="wz-card">
        <div class="wz-card-hd">
          <div class="wz-card-icon">✈️</div>
          <div><h2>Xuất cảnh &amp; Điều kiện nộp đơn</h2><p>Phần F</p></div>
        </div>

        <div class="g2">
          <div class="fgrp" style="max-width:200px">
            <label>Tổng số chuyến xuất cảnh trong 5 năm qua</label>
            <input type="number" name="so_chuyen_xuat_canh" min="0" max="99" value="0">
          </div>
          <div class="fgrp">
            <label>Tổng số ngày vắng mặt khỏi nước Mỹ</label>
            <input type="number" name="so_ngay_vang_mat" min="0" placeholder="Số ngày">
          </div>
        </div>
        <div class="fgrp">
          <label>Lịch sử ra khỏi Mỹ trong 5 năm qua</label>
          <textarea name="lich_su_xuat_canh" placeholder="MM/YYYY – MM/YYYY: Quốc gia – Lý do&#10;VD: 06/2022 – 07/2022: Việt Nam – Thăm gia đình"></textarea>
        </div>
        <div class="fgrp">
          <label>Diện nộp đơn <span class="req">*</span></label>
          <input type="hidden" name="dien_nop_don" id="dnd-hid">
          <div class="chips" data-hid="dnd-hid">
            <span class="chip">5 năm thường trú</span>
            <span class="chip">3 năm (vợ/chồng USC)</span>
            <span class="chip">Phục vụ quân sự</span>
            <span class="chip">Khác</span>
          </div>
        </div>
        <div class="fgrp">
          <label>Miễn thi tiếng Anh</label>
          <input type="hidden" name="mien_thi" id="mth-hid">
          <div class="chips" data-hid="mth-hid">
            <span class="chip">Không miễn</span>
            <span class="chip">50/20 năm</span>
            <span class="chip">55/15 năm</span>
            <span class="chip">65/20 năm</span>
          </div>
        </div>
        <div class="fgrp">
          <label>Thông tin sức khỏe / khuyết tật (nếu cần hỗ trợ đặc biệt khi phỏng vấn)</label>
          <textarea name="suc_khoe" placeholder="Để trống nếu không có"></textarea>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════ STEP 6 ═══ -->
    <div class="wz-step-content" data-step="6" style="display:none">
      <div class="wz-card">
        <div class="wz-card-hd">
          <div class="wz-card-icon">⚖️</div>
          <div><h2>Câu hỏi tư cách đạo đức</h2><p>Phần G – Part 12 N-400</p></div>
        </div>
        <div class="fgrp">
          <label>Tổ chức, hiệp hội, đảng phái đã tham gia</label>
          <textarea name="to_chuc" placeholder="Tên tổ chức – Thời gian – Vai trò (để trống nếu không có)"></textarea>
        </div>
        <?php
$yns = [
  'thanh_vien_dang_cs'         => 'Bạn có từng là thành viên Đảng Cộng Sản hoặc tổ chức toàn trị?',
  'khai_gian_quoc_tich'        => 'Bạn có từng khai gian để có quy chế di trú?',
  'dang_ky_bau_cu'             => 'Bạn có đăng ký bầu cử / bỏ phiếu khi chưa đủ điều kiện?',
  'dong_thue_muon'             => 'Bạn có nợ thuế với chính phủ Mỹ?',
  'no_cap_duong'               => 'Bạn có đang nợ tiền chu cấp (alimony) hoặc tiền nuôi con (child support)?',
  'tien_an'                    => 'Bạn có tiền án, bắt giữ hoặc truy tố nào? (kể cả bị xóa án)',
  'bi_truc_xuat'               => 'Bạn có từng bị lệnh trục xuất, ra lệnh rời Mỹ, hoặc bị từ chối nhập cư?',
  'lien_quan_khung_bo'         => 'Bạn có liên quan đến khủng bố, diệt chủng, hành hạ người khác?',
  'bao_luc_tra_tan'            => 'Bạn có từng tra tấn, giết người, hoặc tham gia đàn áp dân thường?',
  'buon_nguoi'                 => 'Bạn có từng tham gia buôn bán người?',
  'buon_ma_tuy'                => 'Bạn có từng buôn bán, sản xuất hoặc phân phối ma tuý?',
  'rua_tien'                   => 'Bạn có từng tham gia rửa tiền?',
  'mai_dam'                    => 'Bạn có từng tham gia hoặc kiếm tiền nhờ mại dâm?',
  'kiem_soat_xuat_khau'        => 'Bạn có từng vi phạm luật kiểm soát xuất khẩu vũ khí / hàng hóa kiểm soát?',
  'bo_de_tranh_nghia_vu'       => 'Bạn có từ bỏ quốc tịch / TT nhân để tránh nghĩa vụ không?',
  'tron_nghia_vu_quan_su'      => 'Bạn có từng trốn tránh nghĩa vụ quân sự (draft) tại Mỹ?',
  'phuc_vu_quan_su_nuoc_ngoai' => 'Bạn có phục vụ trong lực lượng vũ trang nước ngoài?',
];
foreach ($yns as $key => $q):
  $hid = 'yn-' . $key;
?>
        <div class="fgrp">
          <label><?php echo esc_html($q); ?></label>
          <input type="hidden" name="<?php echo esc_attr($key); ?>" id="<?php echo esc_attr($hid); ?>">
          <div class="chips" data-hid="<?php echo esc_attr($hid); ?>">
            <span class="chip">Không</span><span class="chip">Có</span>
          </div>
        </div>

        <?php if ($key === 'dang_ky_bau_cu'): ?>
        <div class="fgrp">
          <label>Bạn đang có, hoặc đã từng có, tước hiệu cha truyền con nối hoặc huân chương quý tộc ở bất kỳ quốc gia nào khác không?</label>
          <input type="hidden" name="has_foreign_hereditary_title" id="foreign-title-hid">
          <div class="chips" data-hid="foreign-title-hid">
            <span class="chip" data-hide="foreign-title-extra">Không</span><span class="chip" data-show="foreign-title-extra">Có</span>
          </div>
        </div>
        <div id="foreign-title-extra" class="cond">
          <div class="fgrp">
            <label>Giải thích</label>
            <textarea name="foreign_title_explanation" placeholder="Giải thích về tước hiệu cha truyền con nối hoặc huân chương quý tộc"></textarea>
          </div>
          <div class="fgrp">
            <label>Bạn có sẵn sàng từ bỏ bất kỳ tước hiệu cha truyền con nối hoặc huân chương quý tộc nào mà bạn có ở nước ngoài trong nghi lễ nhập tịch của mình không?</label>
            <input type="hidden" name="willing_to_renounce_foreign_titles" id="renounce-title-hid">
            <div class="chips" data-hid="renounce-title-hid">
              <span class="chip" data-hide="renounce-title-list">Không</span><span class="chip" data-show="renounce-title-list">Có</span>
            </div>
          </div>
          <div id="renounce-title-list" class="cond fgrp">
            <label>Các tước hiệu cha truyền con nối hoặc huân chương quý tộc</label>
            <div id="foreign-title-list"><input name="foreign_titles_to_renounce[]" placeholder="Nhập tước hiệu hoặc huân chương quý tộc"></div>
            <button type="button" class="btn ghost" id="add-foreign-title">+ Thêm</button>
          </div>
        </div>
        <?php endif; ?>
        <?php
endforeach; ?>
        <div class="fgrp">
          <label>Giải thích thêm cho các câu trả lời "Có"</label>
          <textarea name="bo_sung_dao_duc" placeholder="Ngắn gọn, rõ ràng..."></textarea>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════ STEP 7 ═══ -->
    <div class="wz-step-content" data-step="7" style="display:none">
      <div class="wz-card">
        <div class="wz-card-hd">
          <div class="wz-card-icon">✅</div>
          <div><h2>Xác nhận &amp; Chữ ký</h2><p>Bước cuối cùng</p></div>
        </div>
        <div class="g2">
          <div class="fgrp"><label>Họ và tên người điền đơn <span class="req">*</span></label><input name="ten_nguoi_dien" required placeholder="IN HOA họ tên"></div>
          <div class="fgrp"><label>Ngày ký <span class="req">*</span></label><input type="date" name="ngay_ky" required></div>
        </div>
        <div class="fgrp">
          <label>Chữ ký</label>
          <div class="sig-wrap">
            <canvas id="wz-sig" width="600" height="150"></canvas>
            <div class="sig-bar">
              <span>Ký tên bằng chuột hoặc ngón tay</span>
              <button type="button" id="sig-clr">🗑 Xóa</button>
            </div>
          </div>
        </div>
        <div class="confirm-box">
          <input type="checkbox" id="wz-agree" required>
          <label for="wz-agree">Tôi xác nhận rằng tất cả thông tin cung cấp là đúng sự thật, chính xác và đầy đủ theo hiểu biết của tôi. Tôi hiểu rằng khai man là vi phạm pháp luật Hoa Kỳ.</label>
        </div>
      </div>
    </div>

    <!-- Nav -->
    <div class="wz-nav">
      <button type="button" class="btn-prev" id="btn-prev" style="display:none">← Quay lại</button>
      <button type="button" class="btn-next" id="btn-next">Tiếp theo →</button>
    </div>

  </form>

  <!-- Success -->
  <div class="wz-suc" id="wz-suc">
    <div class="ico">🎉</div>
    <h2>Gửi thành công!</h2>
    <p>Cảm ơn bạn. Chúng tôi đã nhận thông tin N-400 và sẽ liên hệ với bạn trong thời gian sớm nhất.</p>
  </div>
</div>

<script>
(function(){
  var API = '<?php echo esc_js($api_url); ?>';
  var wzNonce = '<?php echo esc_js(wp_create_nonce("wp_rest")); ?>';
  var TOTAL = 7;
  var cur = 1;
  var SK = 'n400wz_' + window.location.pathname;

  /* ── Step labels ── */
  var labels = ['Cá nhân','Cha mẹ','Hôn nhân','Con cái','Xuất cảnh','Đạo đức','Xác nhận'];
  var icons  = ['👤','👨‍👩‍👧','💍','👶','✈️','⚖️','✅'];

  /* ── Build step dots ── */
  var dotsEl = document.getElementById('wz-dots');
  for(var i=1;i<=TOTAL;i++){
    var s = document.createElement('div');
    s.className = 'wz-step' + (i===1?' active':'');
    s.id = 'dot-'+i;
    s.innerHTML = '<div class="wz-dot">'+(i<=1?'✓':i)+'</div><div class="wz-lbl">'+labels[i-1]+'</div>';
    dotsEl.appendChild(s);
  }

  /* ── Helpers ── */
  function $$(sel,ctx){ return (ctx||document).querySelectorAll(sel); }
  function $id(id){ return document.getElementById(id); }
  function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  /* ── Chip buttons ── */
  function initChips(root){
    $$(('.chips'), root||document).forEach(function(grp){
      var hid = grp.dataset.hid ? $id(grp.dataset.hid) : null;
      grp.querySelectorAll('.chip').forEach(function(c){
        c.addEventListener('click',function(){
          grp.querySelectorAll('.chip').forEach(function(x){ x.classList.remove('on'); });
          c.classList.add('on');
          if(hid) hid.value = c.textContent.trim();
          /* cond */
          if(c.dataset.show){ var el=$id(c.dataset.show); if(el)el.classList.add('show'); }
          if(c.dataset.hide){ var el=$id(c.dataset.hide); if(el)el.classList.remove('show'); }
          saveDraft();
        });
      });
    });
  }
  initChips();

  function addForeignTitle(){
    var list=$id('foreign-title-list'); if(!list)return;
    var wrap=document.createElement('div'); wrap.style.marginTop='8px';
    wrap.innerHTML='<input name="foreign_titles_to_renounce[]" placeholder="Nhập tước hiệu hoặc huân chương quý tộc"> <button type="button" class="btn ghost rm-title">Xóa</button>';
    list.appendChild(wrap);
    var btn=wrap.querySelector('.rm-title'); if(btn)btn.addEventListener('click',function(){wrap.remove();saveDraft();});
  }
  var addForeignTitleBtn=$id('add-foreign-title');
  if(addForeignTitleBtn){addForeignTitleBtn.addEventListener('click',function(){addForeignTitle();saveDraft();});}

  function applyChipUI(){
    $$(('.chips')).forEach(function(grp){
      var hid=grp.dataset.hid?$id(grp.dataset.hid):null; if(!hid)return;
      var val=(hid.value||'').trim();
      grp.querySelectorAll('.chip').forEach(function(c){ c.classList.toggle('on',c.textContent.trim()===val); });
      var on=grp.querySelector('.chip.on');
      if(on){
        if(on.dataset.show){ var s=$id(on.dataset.show); if(s)s.classList.add('show'); }
      }
    });
  }

  /* ── Signature ── */
  var canvas=$id('wz-sig'), ctx=canvas.getContext('2d'), drawing=false;
  function gpos(e){ var r=canvas.getBoundingClientRect(),c=e.touches?e.touches[0]:e; return {x:(c.clientX-r.left)*canvas.width/r.width,y:(c.clientY-r.top)*canvas.height/r.height}; }
  canvas.addEventListener('mousedown',function(e){drawing=true;ctx.beginPath();var p=gpos(e);ctx.moveTo(p.x,p.y);});
  canvas.addEventListener('mousemove',function(e){if(!drawing)return;var p=gpos(e);ctx.lineTo(p.x,p.y);ctx.strokeStyle='#111827';ctx.lineWidth=2;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();});
  canvas.addEventListener('mouseup',function(){drawing=false;saveDraft();});
  canvas.addEventListener('mouseleave',function(){drawing=false;});
  canvas.addEventListener('touchstart',function(e){e.preventDefault();drawing=true;ctx.beginPath();var p=gpos(e);ctx.moveTo(p.x,p.y);},{passive:false});
  canvas.addEventListener('touchmove',function(e){e.preventDefault();if(!drawing)return;var p=gpos(e);ctx.lineTo(p.x,p.y);ctx.strokeStyle='#111827';ctx.lineWidth=2;ctx.lineCap='round';ctx.stroke();},{passive:false});
  canvas.addEventListener('touchend',function(){drawing=false;saveDraft();});
  $id('sig-clr').addEventListener('click',function(){ctx.clearRect(0,0,canvas.width,canvas.height);saveDraft();});
  function getSig(){try{return canvas.toDataURL('image/png');}catch(e){return '';}}
  function setSig(d){if(!d||d==='data:,')return;var img=new Image();img.onload=function(){ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);};img.src=d;}

  /* ── Dynamic lists ── */
  var exCnt=0;
  function addExSp(pre){
    exCnt++;var n=exCnt;
    var d=document.createElement('div');d.className='di';
    var ho=esc(pre&&pre.ho||''),ten=esc(pre&&pre.ten||''),ns=esc(pre&&pre.ns||''),qt=esc(pre&&pre.qt||''),nkh=esc(pre&&pre.nkh||''),nlh=esc(pre&&pre.nlh||''),ly=esc(pre&&pre.ly||''),noi=esc(pre&&pre.noi||'');
    d.innerHTML='<div class="di-title">Vợ/chồng cũ '+n+'</div><button type="button" class="di-rm" title="Xóa">×</button>'+
      '<div class="g3"><div class="fgrp"><label>Họ</label><input name="exsp_'+n+'_ho" value="'+ho+'"></div>'+
      '<div class="fgrp"><label>Tên</label><input name="exsp_'+n+'_ten" value="'+ten+'"></div>'+
      '<div class="fgrp"><label>Ngày sinh</label><input type="date" name="exsp_'+n+'_ns" value="'+ns+'"></div></div>'+
      '<div class="g3"><div class="fgrp"><label>Quốc tịch</label><input name="exsp_'+n+'_qt" value="'+qt+'"></div>'+
      '<div class="fgrp"><label>Ngày kết hôn</label><input type="date" name="exsp_'+n+'_nkh" value="'+nkh+'"></div>'+
      '<div class="fgrp"><label>Ngày ly hôn/góa</label><input type="date" name="exsp_'+n+'_nlh" value="'+nlh+'"></div></div>'+
      '<div class="g2"><div class="fgrp"><label>Nơi kết hôn</label><input name="exsp_'+n+'_noi" value="'+noi+'" placeholder="Thành phố, Tiểu bang / Quốc gia"></div>'+
      '<div class="fgrp"><label>Lý do kết thúc</label><input name="exsp_'+n+'_ly" value="'+ly+'" placeholder="Ly hôn / Qua đời / Khác"></div></div>';
    d.querySelector('.di-rm').onclick=function(){d.remove();saveDraft();};
    $id('exsp-list').appendChild(d);saveDraft();
  }
  $id('add-exsp').addEventListener('click',function(){addExSp(null);});

  var chCnt=0;
  function addChild(pre){
    chCnt++;var n=chCnt;
    var d=document.createElement('div');d.className='di';
    var ho=esc(pre&&pre.ho||''),ten=esc(pre&&pre.ten||''),tl=esc(pre&&pre.tl||''),ns=esc(pre&&pre.ns||''),nsi=esc(pre&&pre.nsi||''),qh=esc(pre&&pre.qh||''),an=esc(pre&&pre.an||''),song=esc(pre&&pre.song||''),sc=pre&&pre.sc?' checked':'';
    d.innerHTML='<div class="di-title">Con thứ '+n+'</div><button type="button" class="di-rm" title="Xóa">×</button>'+
      '<div class="g3"><div class="fgrp"><label>Họ</label><input name="ch_'+n+'_ho" value="'+ho+'"></div>'+
      '<div class="fgrp"><label>Tên</label><input name="ch_'+n+'_ten" value="'+ten+'"></div>'+
      '<div class="fgrp"><label>Tên lót</label><input name="ch_'+n+'_tl" value="'+tl+'"></div></div>'+
      '<div class="g3"><div class="fgrp"><label>Ngày sinh</label><input type="date" name="ch_'+n+'_ns" value="'+ns+'"></div>'+
      '<div class="fgrp"><label>Nơi sinh</label><input name="ch_'+n+'_nsi" value="'+nsi+'"></div>'+
      '<div class="fgrp"><label>Quan hệ</label><input name="ch_'+n+'_qh" value="'+qh+'" placeholder="Ruột/Riêng/Nuôi"></div></div>'+
      '<div class="g2"><div class="fgrp"><label>Số A</label><input name="ch_'+n+'_an" value="'+an+'"></div>'+
      '<div class="fgrp"><label>Con bạn đang sống ở đâu?</label><select name="ch_'+n+'_song"><option value="">-- Chọn --</option><option value="with_me"'+(song==='with_me'?' selected':'')+'>Sống cùng tôi</option><option value="not_with_me"'+(song==='not_with_me'?' selected':'')+'>Không sống cùng tôi</option><option value="unknown_missing"'+(song==='unknown_missing'?' selected':'')+'>Không biết/thất lạc</option></select></div></div>';
    d.querySelector('.di-rm').onclick=function(){d.remove();saveDraft();};
    $id('child-list').appendChild(d);saveDraft();
  }
  $id('add-child').addEventListener('click',function(){addChild(null);});

  /* ── Draft ── */
  function collectExSp(){var a=[];$$('.di',$id('exsp-list')).forEach(function(b){function v(s){var e=b.querySelector(s);return e?e.value:'';}a.push({ho:v('[name*="_ho"]'),ten:v('[name*="_ten"]'),ns:v('[name*="_ns"]'),qt:v('[name*="_qt"]'),nkh:v('[name*="_nkh"]'),nlh:v('[name*="_nlh"]'),ly:v('[name*="_ly"]'),noi:v('[name*="_noi"]')});});return a;}
  function collectChildren(){var a=[];$$('.di',$id('child-list')).forEach(function(b){function v(s){var e=b.querySelector(s);return e?e.value:'';}function cb(s){var e=b.querySelector(s);return e?e.checked:false;}a.push({ho:v('[name*="_ho"]'),ten:v('[name*="_ten"]'),tl:v('[name*="_tl"]'),ns:v('[name*="_ns"]'),nsi:v('[name*="_nsi"]'),qh:v('[name*="_qh"]'),an:v('[name*="_an"]'),song:v('[name*="_song"]'),sc:cb('[name*="_sc"]')});});return a;}
  function getAll(){
    var d={},f=$id('wz-form');
    for(var i=0;i<f.elements.length;i++){var el=f.elements[i],k=el.name||el.id;if(!k||el.type==='submit'||el.type==='button')continue;d[k]=el.type==='checkbox'?el.checked:el.value;}
    d.__ex=collectExSp();d.__ch=collectChildren();d.__sig=getSig();d.__step=cur;
    return d;
  }
  function saveDraft(){try{sessionStorage.setItem(SK,JSON.stringify(getAll()));}catch(e){}}
  function loadDraft(){try{var r=sessionStorage.getItem(SK);return r?JSON.parse(r):null;}catch(e){return null;}}
  function clearDraft(){try{sessionStorage.removeItem(SK);}catch(e){}}

  function restoreDraft(d){
    if(!d)return;
    var f=$id('wz-form');
    for(var k in d){
      if(k.startsWith('__'))continue;
      var el=f.querySelector('[name="'+k+'"]')||$id(k);
      if(!el)continue;
      el.type==='checkbox'?el.checked=!!d[k]:el.value=d[k]||'';
    }
    applyChipUI();
    if(d.__ex&&d.__ex.length)d.__ex.forEach(function(p){addExSp(p);});
    if(d.__ch&&d.__ch.length)d.__ch.forEach(function(p){addChild(p);});
    if(d.__sig)setSig(d.__sig);
    if(d.__step&&d.__step>1)goTo(Math.min(d.__step,TOTAL));
  }

  /* ── Navigate ── */
  function updateDots(){
    for(var i=1;i<=TOTAL;i++){
      var dot=$id('dot-'+i);
      dot.className='wz-step'+(i<cur?' done':i===cur?' active':'');
      dot.querySelector('.wz-dot').textContent = i<cur?'✓':String(i);
    }
  }
  function showStep(n){
    $$('.wz-step-content').forEach(function(el){el.style.display=el.dataset.step==n?'':'none';});
    $id('btn-prev').style.display=n>1?'':'none';
    $id('btn-next').textContent=n<TOTAL?'Tiếp theo →':'🚀 Gửi đơn';
    updateDots();
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function goTo(n){cur=n;showStep(cur);}

  function validateStep(){
    var content=document.querySelector('[data-step="'+cur+'"]');
    var ok=true;
    content.querySelectorAll('[required]').forEach(function(el){
      var grp=el.closest('.fgrp');
      var val=el.type==='checkbox'?el.checked:(el.value||'').trim();
      if(!val){ok=false;if(grp){grp.classList.add('err');var em=grp.querySelector('.errmsg');if(!em){em=document.createElement('div');em.className='errmsg';em.textContent='Vui lòng điền thông tin này';grp.appendChild(em);}}}
      else{if(grp)grp.classList.remove('err');}
    });
    return ok;
  }

  $id('btn-prev').addEventListener('click',function(){if(cur>1)goTo(cur-1);saveDraft();});
  $id('btn-next').addEventListener('click',function(){
    if(!validateStep()){
      var firstErr=document.querySelector('[data-step="'+cur+'"] .fgrp.err');
      if(firstErr)firstErr.scrollIntoView({behavior:'smooth',block:'center'});
      return;
    }
    saveDraft();
    if(cur<TOTAL){goTo(cur+1);}
    else{submitForm();}
  });

  /* ── Submit ── */
  function submitForm(){
    var btn=$id('btn-next');
    var err=$id('wz-err');
    err.style.display='none';
    btn.disabled=true;
    btn.innerHTML='<span class="spn"></span> Đang gửi...';
    fetch(API,{method:'POST',headers:{'Content-Type':'application/json','X-WP-Nonce':wzNonce},body:JSON.stringify(getAll())})
    .then(function(r){return r.json();})
    .then(function(res){
      if(res&&res.success){
        clearDraft();
        document.getElementById('wz-form').style.display='none';
        document.getElementById('wz-dots').style.display='none';
        document.querySelector('.wz-hd').style.display='none';
        document.getElementById('wz-suc').style.display='block';
        window.scrollTo({top:0,behavior:'smooth'});
      } else {
        err.textContent=(res&&res.message)||'Có lỗi xảy ra, vui lòng thử lại.';
        err.style.display='block';
        err.scrollIntoView({behavior:'smooth',block:'center'});
        btn.disabled=false;btn.innerHTML='🚀 Gửi đơn';
      }
    })
    .catch(function(){
      err.textContent='Lỗi kết nối. Kiểm tra mạng và thử lại.';
      err.style.display='block';
      err.scrollIntoView({behavior:'smooth',block:'center'});
      btn.disabled=false;btn.innerHTML='🚀 Gửi đơn';
    });
  }

  /* ── Remove err on input ── */
  $id('wz-form').addEventListener('input',function(e){
    var grp=e.target.closest('.fgrp');if(grp)grp.classList.remove('err');
    saveDraft();
  });

  /* ── Init ── */
  showStep(1);
  restoreDraft(loadDraft());
})();
</script>
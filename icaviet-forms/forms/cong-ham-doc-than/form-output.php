<?php
/**
 * Form output cho shortcode [ICAVIET_cong_ham_doc_than].
 *
 * Bien san co:
 *   $api_url – REST endpoint nhan form data
 *
 * Khong co <html><head><body> – chi output phan noi dung.
 */
if (!defined('ABSPATH')) {
  exit;
}
?>
<style>
.ICAVIET-chdt{
  --blue:#1a6ef5;
  --dark:#0f172a;
  --gray:#64748b;
  --border:#e2e8f0;
  --light:#f1f5f9;
  --red:#ef4444;
  --green:#22c55e;
  --radius:10px;
  font-family:'Segoe UI',system-ui,sans-serif;
  font-size:15px;
  color:var(--dark);
  line-height:1.6;
  max-width:820px;
  margin:0 auto;
}
.ICAVIET-chdt *{box-sizing:border-box}
.ICAVIET-chdt .fh{
  background:linear-gradient(135deg,#1a6ef5,#0043c7);
  color:#fff;
  border-radius:var(--radius) var(--radius) 0 0;
  padding:28px;
  text-align:center;
}
.ICAVIET-chdt .fh h2{
  font-size:22px;
  font-weight:700;
  margin:0 0 4px;
}
.ICAVIET-chdt .fh p{
  font-size:13px;
  opacity:.8;
  margin:0;
}
.ICAVIET-chdt .prog{
  height:5px;
  background:#dbeafe;
}
.ICAVIET-chdt .prog-fill{
  height:100%;
  background:#1a6ef5;
  width:0;
  transition:width .4s;
}
.ICAVIET-chdt .fc{
  background:#fff;
  box-shadow:0 4px 24px rgba(0,0,0,.07);
  border-radius:0 0 var(--radius) var(--radius);
  padding:28px 32px;
}
@media(max-width:600px){
  .ICAVIET-chdt .fc{padding:18px 14px}
}
.ICAVIET-chdt .sec{margin-bottom:26px}
.ICAVIET-chdt .stitle{
  font-size:12.5px;
  font-weight:700;
  color:var(--blue);
  text-transform:uppercase;
  letter-spacing:.06em;
  border-left:3px solid var(--blue);
  padding-left:9px;
  margin-bottom:14px;
}
.ICAVIET-chdt .ssub{
  font-size:13.5px;
  font-weight:600;
  color:var(--gray);
  margin:16px 0 8px;
  border-bottom:1px solid var(--border);
  padding-bottom:3px;
}
.ICAVIET-chdt .g2{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:12px;
}
.ICAVIET-chdt .g3{
  display:grid;
  grid-template-columns:1fr 1fr 1fr;
  gap:12px;
}
.ICAVIET-chdt .g4{
  display:grid;
  grid-template-columns:1fr 1fr 1fr 1fr;
  gap:12px;
}
@media(max-width:600px){
  .ICAVIET-chdt .g2,.ICAVIET-chdt .g3,.ICAVIET-chdt .g4{grid-template-columns:1fr}
}
.ICAVIET-chdt .mt{margin-top:12px}
.ICAVIET-chdt .f label{
  display:block;
  font-size:12px;
  font-weight:600;
  color:var(--gray);
  margin-bottom:4px;
}
.ICAVIET-chdt .f label .r{
  color:var(--red);
  margin-left:2px;
}
.ICAVIET-chdt .f input,
.ICAVIET-chdt .f textarea,
.ICAVIET-chdt .f select{
  width:100%;
  padding:9px 12px;
  border:1.5px solid var(--border);
  border-radius:7px;
  font-size:14px;
  font-family:inherit;
  background:#fff;
  color:var(--dark);
  transition:border-color .2s;
}
.ICAVIET-chdt .f input:focus,
.ICAVIET-chdt .f textarea:focus,
.ICAVIET-chdt .f select:focus{
  outline:none;
  border-color:#1a6ef5;
  box-shadow:0 0 0 3px rgba(26,110,245,.1);
}
.ICAVIET-chdt .f textarea{
  resize:vertical;
  min-height:75px;
}
.ICAVIET-chdt .hint{
  font-size:11.5px;
  color:var(--gray);
  margin-top:3px;
  font-style:italic;
}
.ICAVIET-chdt .di{
  background:var(--light);
  border:1px solid var(--border);
  border-radius:8px;
  padding:14px;
  margin-bottom:9px;
  position:relative;
}
.ICAVIET-chdt .di .dnum{
  font-size:12.5px;
  font-weight:700;
  color:#1a6ef5;
  margin-bottom:8px;
}
.ICAVIET-chdt .di .rm{
  position:absolute;
  top:8px;
  right:10px;
  background:none;
  border:none;
  color:var(--red);
  font-size:17px;
  cursor:pointer;
  padding:2px 6px;
  border-radius:5px;
}
.ICAVIET-chdt .di .rm:hover{background:#fee2e2}
.ICAVIET-chdt .addbtn{
  display:inline-flex;
  align-items:center;
  gap:5px;
  padding:7px 14px;
  border:1.5px dashed #1a6ef5;
  border-radius:7px;
  color:#1a6ef5;
  background:none;
  cursor:pointer;
  font-size:13px;
  font-weight:600;
  margin-top:4px;
}
.ICAVIET-chdt .addbtn:hover{background:#eff6ff}
.ICAVIET-chdt .conf{
  display:flex;
  align-items:flex-start;
  gap:10px;
  margin:18px 0 6px;
}
.ICAVIET-chdt .conf input{
  width:16px;
  height:16px;
  margin-top:3px;
  flex-shrink:0;
  accent-color:#1a6ef5;
}
.ICAVIET-chdt .subbtn{
  width:100%;
  padding:13px;
  background:#1a6ef5;
  color:#fff;
  border:none;
  border-radius:8px;
  font-size:16px;
  font-weight:700;
  cursor:pointer;
  transition:background .2s;
  margin-top:10px;
}
.ICAVIET-chdt .subbtn:hover:not(:disabled){background:#0043c7}
.ICAVIET-chdt .subbtn:disabled{
  opacity:.6;
  cursor:not-allowed;
}
.ICAVIET-chdt .spn{
  display:inline-block;
  width:15px;
  height:15px;
  border:2px solid rgba(255,255,255,.4);
  border-top-color:#fff;
  border-radius:50%;
  animation:chtdspin .7s linear infinite;
  vertical-align:middle;
  margin-right:6px;
}
@keyframes chtdspin{
  to{transform:rotate(360deg)}
}
.ICAVIET-chdt .suc{
  text-align:center;
  padding:48px 20px;
  display:none;
}
.ICAVIET-chdt .suc .ico{
  font-size:52px;
  margin-bottom:12px;
}
.ICAVIET-chdt .suc h3{
  font-size:21px;
  color:var(--green);
  font-weight:700;
  margin-bottom:8px;
}
.ICAVIET-chdt .suc p{
  color:var(--gray);
  font-size:14px;
}
.ICAVIET-chdt .errbanner{
  background:#fef2f2;
  border:1px solid #fecaca;
  border-radius:8px;
  padding:12px 14px;
  color:#b91c1c;
  font-size:13px;
  margin-bottom:14px;
  display:none;
}
.ICAVIET-chdt .info-box{
  background:#eff6ff;
  border:1px solid #bfdbfe;
  border-radius:8px;
  padding:12px 14px;
  font-size:13px;
  color:#1e40af;
  margin-bottom:18px;
}
</style>

<div class="ICAVIET-chdt">


  <div class="prog">
    <div class="prog-fill" id="ic-chdt-prog"></div>
  </div>

  <div class="fc">
    <div class="errbanner" id="ic-chdt-err"></div>

    <div class="info-box">
      ℹ️ Tất cả thông tin cần điền theo đúng tên trên passport Việt Nam (nếu chỉ có passport VN) hoặc passport Mỹ (nếu có passport Mỹ).
    </div>

    <form id="ic-chdt-form">

      <div class="sec">
        <div class="stitle">01 – Thông tin của bạn</div>

        <div class="f">
          <label>Họ và tên <span class="r">*</span></label>
          <input name="hoVaTen" id="ic-chdt-hoVaTen" required>
          <div class="hint">Ví dụ: Theo tên trên passport VN nếu chỉ có passport VN, theo tên trên passport Mỹ nếu có passport Mỹ</div>
        </div>

        <div class="g2 mt">
          <div class="f">
            <label>Nơi sinh <span class="r">*</span></label>
            <input name="noiSinh" id="ic-chdt-noiSinh" required>
            <div class="hint">Ghi tên tỉnh/thành. Ví dụ: Hồ Chí Minh</div>
          </div>
          <div class="f">
            <label>Dân tộc <span class="r">*</span></label>
            <input name="danToc" id="ic-chdt-danToc" required value="Kinh">
            <div class="hint">Ví dụ: Kinh</div>
          </div>
        </div>

        <div class="f mt">
          <label>Quê quán <span class="r">*</span></label>
          <input name="queQuan" id="ic-chdt-queQuan" required>
          <div class="hint">Theo giấy tờ tùy thân (theo quê cha hoặc quê mẹ). Ví dụ: Tiền Giang</div>
        </div>

        <div class="g2 mt">
          <div class="f">
            <label>Số điện thoại cá nhân <span class="r">*</span></label>
            <input type="tel" name="soDienThoai" id="ic-chdt-soDienThoai" required placeholder="(000) 000-0000">
          </div>
          <div class="f">
            <label>Số an sinh xã hội (SSN) <span class="r">*</span></label>
            <input name="ssn" id="ic-chdt-ssn" required placeholder="XXX-XX-XXXX">
          </div>
        </div>

        <div class="f mt">
          <label>Địa chỉ cư trú hiện tại <span class="r">*</span></label>
          <input name="diaChiCuTru" id="ic-chdt-diaChiCuTru" required>
        </div>

        <div class="g2 mt">
          <div class="f">
            <label>Nghề nghiệp hiện tại <span class="r">*</span></label>
            <input name="ngheNghiep" id="ic-chdt-ngheNghiep" required>
          </div>
          <div class="f">
            <label>Nơi làm việc <span class="r">*</span></label>
            <input name="noiLamViec" id="ic-chdt-noiLamViec" required>
          </div>
        </div>

        <div class="g2 mt">
          <div class="f">
            <label>Địa chỉ nơi làm việc</label>
            <input name="diaChiLamViec" id="ic-chdt-diaChiLamViec">
          </div>
          <div class="f">
            <label>Số điện thoại chỗ làm</label>
            <input type="tel" name="sdtChoLam" id="ic-chdt-sdtChoLam" placeholder="(000) 000-0000">
          </div>
        </div>

        <div class="f mt">
          <label>Kết hôn lần thứ mấy</label>
          <input name="ketHonLan" id="ic-chdt-ketHonLan" placeholder="Ví dụ: 1 (lần đầu), 2 (lần 2),...">
        </div>
      </div>

      <div class="sec">
        <div class="stitle">02 – Lịch sử công việc & cư trú (từ 15 tuổi)</div>
        <div id="ic-chdt-work"></div>
        <button type="button" class="addbtn" id="ic-chdt-addwork">+ Thêm dòng</button>
      </div>

      <div class="sec">
        <div class="stitle">03 – Thông tin anh chị em</div>
        <div id="ic-chdt-siblings"></div>
        <button type="button" class="addbtn" id="ic-chdt-addsib">+ Thêm anh/chị/em</button>
      </div>

      <div class="sec">
        <div class="stitle">04 – Tình trạng hôn nhân (nếu đã từng kết hôn)</div>
        <div id="ic-chdt-marriage"></div>
        <button type="button" class="addbtn" id="ic-chdt-addmarriage">+ Thêm lịch sử hôn nhân</button>
      </div>

      <div class="sec">
        <div class="stitle">05 – Thông tin Bố & Mẹ</div>

        <div class="ssub">Bố / Cha</div>
        <div class="g2">
          <div class="f"><label>Họ và tên</label><input name="bo_hoTen"></div>
          <div class="f"><label>Ngày sinh</label><input type="date" name="bo_ngaySinh"></div>
        </div>
        <div class="g2 mt">
          <div class="f"><label>Dân tộc</label><input name="bo_danToc"></div>
          <div class="f"><label>Quốc tịch</label><input name="bo_quocTich"></div>
        </div>
        <div class="g2 mt">
          <div class="f"><label>Quê quán</label><input name="bo_queQuan"></div>
          <div class="f"><label>Nơi cư trú hiện tại</label><input name="bo_noiCuTru"></div>
        </div>

        <div class="ssub">Mẹ</div>
        <div class="g2">
          <div class="f"><label>Họ và tên</label><input name="me_hoTen"></div>
          <div class="f"><label>Ngày sinh</label><input type="date" name="me_ngaySinh"></div>
        </div>
        <div class="g2 mt">
          <div class="f"><label>Dân tộc</label><input name="me_danToc"></div>
          <div class="f"><label>Quốc tịch</label><input name="me_quocTich"></div>
        </div>
        <div class="g2 mt">
          <div class="f"><label>Quê quán</label><input name="me_queQuan"></div>
          <div class="f"><label>Nơi cư trú hiện tại</label><input name="me_noiCuTru"></div>
        </div>
      </div>

      <div class="sec">
        <div class="stitle">06 – Thông tin hôn thê / hôn phu</div>

        <div class="g2">
          <div class="f"><label>Họ và tên</label><input name="honThe_hoTen"></div>
          <div class="f"><label>Nơi sinh</label><input name="honThe_noiSinh"></div>
        </div>
        <div class="g2 mt">
          <div class="f"><label>Dân tộc</label><input name="honThe_danToc"></div>
          <div class="f"><label>Kết hôn lần thứ mấy</label><input name="honThe_ketHonLan" placeholder="Ví dụ: 1, 2,..."></div>
        </div>
      </div>

      <div class="sec">
        <div class="stitle">07 – Xác nhận</div>

        <div class="conf">
          <input type="checkbox" id="ic-chdt-agree" required>
          <label for="ic-chdt-agree" style="font-size:13.5px">
            Tôi xác nhận tất cả thông tin trên là đúng sự thật và chịu hoàn toàn trách nhiệm.
          </label>
        </div>

        <button type="submit" class="subbtn" id="ic-chdt-sub">Gửi Công Hàm Độc Thân</button>
      </div>
    </form>

    <div class="suc" id="ic-chdt-suc">
      <div class="ico">✅</div>
      <h3>Gửi thành công!</h3>
      <p>Cảm ơn bạn. Chúng tôi đã nhận được thông tin và sẽ liên hệ sớm nhất có thể.</p>
    </div>
  </div>
</div>

<script>
(function(){
  var API = '<?php echo esc_js($api_url); ?>';
  var chdtNonce = '<?php echo esc_js(wp_create_nonce("wp_rest")); ?>';
  var form = document.getElementById('ic-chdt-form');
  var STORAGE_KEY = 'ICAVIET_chdt_form_draft_' + window.location.pathname;

  var wc = 0, sc = 0, mc = 0;

  function escAttr(str){
    return String(str || '')
      .replace(/&/g,'&amp;')
      .replace(/"/g,'&quot;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;');
  }

  function upProg(){
    var req = form.querySelectorAll('[required]');
    var filled = 0;

    req.forEach(function(el){
      if (el.type === 'checkbox') {
        if (el.checked) filled++;
      } else {
        if ((el.value || '').trim()) filled++;
      }
    });

    document.getElementById('ic-chdt-prog').style.width =
      (req.length ? Math.round(filled / req.length * 100) : 0) + '%';
  }

  function addWork(pre){
    wc++;
    var n = wc;
    var d = document.createElement('div');
    d.className = 'di';
    var p = pre || {};

    d.innerHTML =
      '<div class="dnum">Giai đoạn ' + n + '</div>' +
      '<button type="button" class="rm">×</button>' +
      '<div class="g4">' +
        '<div class="f"><label>Từ năm</label><input name="work_' + n + '_fromYear" value="' + escAttr(p.fromYear || '') + '" placeholder="VD: 2010"></div>' +
        '<div class="f"><label>Đến năm</label><input name="work_' + n + '_toYear" value="' + escAttr(p.toYear || '') + '" placeholder="VD: 2015"></div>' +
        '<div class="f"><label>Công việc</label><input name="work_' + n + '_job" value="' + escAttr(p.job || '') + '"></div>' +
        '<div class="f"><label>Địa chỉ nơi ở</label><input name="work_' + n + '_address" value="' + escAttr(p.address || '') + '"></div>' +
      '</div>';

    d.querySelector('.rm').addEventListener('click', function(){
      d.remove();
      upProg();
      saveDraft();
    });

    document.getElementById('ic-chdt-work').appendChild(d);
    upProg();
  }

  function addSibling(pre){
    sc++;
    var n = sc;
    var d = document.createElement('div');
    d.className = 'di';
    var p = pre || {};

    d.innerHTML =
      '<div class="dnum">Anh/chị/em ' + n + '</div>' +
      '<button type="button" class="rm">×</button>' +
      '<div class="g2">' +
        '<div class="f"><label>Mối quan hệ</label><input name="sib_' + n + '_relationship" value="' + escAttr(p.relationship || '') + '" placeholder="Anh, Chị, Em,..."></div>' +
        '<div class="f"><label>Họ và tên</label><input name="sib_' + n + '_hoTen" value="' + escAttr(p.hoTen || '') + '"></div>' +
      '</div>' +
      '<div class="g2 mt">' +
        '<div class="f"><label>Địa chỉ cư trú</label><input name="sib_' + n + '_address" value="' + escAttr(p.address || '') + '"></div>' +
        '<div class="f"><label>Ngày sinh</label><input type="date" name="sib_' + n + '_dob" value="' + escAttr(p.dob || '') + '"></div>' +
      '</div>';

    d.querySelector('.rm').addEventListener('click', function(){
      d.remove();
      upProg();
      saveDraft();
    });

    document.getElementById('ic-chdt-siblings').appendChild(d);
    upProg();
  }

  function addMarriage(pre){
    mc++;
    var n = mc;
    var d = document.createElement('div');
    d.className = 'di';
    var p = pre || {};

    d.innerHTML =
      '<div class="dnum">Lần kết hôn ' + n + '</div>' +
      '<button type="button" class="rm">×</button>' +
      '<div class="g2">' +
        '<div class="f"><label>Từ năm</label><input name="mar_' + n + '_fromYear" value="' + escAttr(p.fromYear || '') + '" placeholder="VD: 2010"></div>' +
        '<div class="f"><label>Đến năm</label><input name="mar_' + n + '_toYear" value="' + escAttr(p.toYear || '') + '" placeholder="VD: 2015"></div>' +
      '</div>' +
      '<div class="g2 mt">' +
        '<div class="f"><label>Họ tên vợ/chồng cũ</label><input name="mar_' + n + '_exName" value="' + escAttr(p.exName || '') + '"></div>' +
        '<div class="f"><label>Địa chỉ</label><input name="mar_' + n + '_exAddress" value="' + escAttr(p.exAddress || '') + '"></div>' +
      '</div>' +
      '<div class="f mt"><label>Lý do chấm dứt hôn nhân</label><input name="mar_' + n + '_reason" value="' + escAttr(p.reason || '') + '" placeholder="Ly hôn / Qua đời..."></div>';

    d.querySelector('.rm').addEventListener('click', function(){
      d.remove();
      upProg();
      saveDraft();
    });

    document.getElementById('ic-chdt-marriage').appendChild(d);
    upProg();
  }

  function collectWork(){
    var arr = [];
    document.querySelectorAll('#ic-chdt-work .di').forEach(function(box){
      function v(s){
        var e = box.querySelector(s);
        return e ? e.value : '';
      }
      var idx = box.querySelector('[name*="_fromYear"]').name.split('_')[1];
      arr.push({
        fromYear: v('[name="work_' + idx + '_fromYear"]'),
        toYear:   v('[name="work_' + idx + '_toYear"]'),
        job:      v('[name="work_' + idx + '_job"]'),
        address:  v('[name="work_' + idx + '_address"]')
      });
    });
    return arr;
  }

  function collectSiblings(){
    var arr = [];
    document.querySelectorAll('#ic-chdt-siblings .di').forEach(function(box){
      function v(s){
        var e = box.querySelector(s);
        return e ? e.value : '';
      }
      var idx = box.querySelector('[name*="_relationship"]').name.split('_')[1];
      arr.push({
        relationship: v('[name="sib_' + idx + '_relationship"]'),
        hoTen:        v('[name="sib_' + idx + '_hoTen"]'),
        address:      v('[name="sib_' + idx + '_address"]'),
        dob:          v('[name="sib_' + idx + '_dob"]')
      });
    });
    return arr;
  }

  function collectMarriage(){
    var arr = [];
    document.querySelectorAll('#ic-chdt-marriage .di').forEach(function(box){
      function v(s){
        var e = box.querySelector(s);
        return e ? e.value : '';
      }
      var idx = box.querySelector('[name*="_fromYear"]').name.split('_')[1];
      arr.push({
        fromYear:  v('[name="mar_' + idx + '_fromYear"]'),
        toYear:    v('[name="mar_' + idx + '_toYear"]'),
        exName:    v('[name="mar_' + idx + '_exName"]'),
        exAddress: v('[name="mar_' + idx + '_exAddress"]'),
        reason:    v('[name="mar_' + idx + '_reason"]')
      });
    });
    return arr;
  }

  function getFormDataObject(){
    var data = {};
    var els = form.elements;

    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var key = el.name || el.id;

      if (!key || el.type === 'submit' || el.type === 'button') continue;

      if (el.type === 'checkbox') {
        data[key] = !!el.checked;
      } else {
        data[key] = el.value;
      }
    }

    data.__work = collectWork();
    data.__siblings = collectSiblings();
    data.__marriage = collectMarriage();

    return data;
  }

  function saveDraft(){
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(getFormDataObject()));
    } catch (e) {}
  }

  function loadDraft(){
    try {
      var r = sessionStorage.getItem(STORAGE_KEY);
      return r ? JSON.parse(r) : null;
    } catch (e) {
      return null;
    }
  }

  function clearDraft(){
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }

  function restoreDraft(d){
    if (!d) return;

    var els = form.elements;
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var key = el.name || el.id;

      if (!key || el.type === 'submit' || el.type === 'button') continue;

      if (key in d) {
        if (el.type === 'checkbox') {
          el.checked = !!d[key];
        } else {
          el.value = d[key] || '';
        }
      }
    }

    if (d.__work && d.__work.length) {
      d.__work.forEach(function(r){ addWork(r); });
    }
    if (d.__siblings && d.__siblings.length) {
      d.__siblings.forEach(function(r){ addSibling(r); });
    }
    if (d.__marriage && d.__marriage.length) {
      d.__marriage.forEach(function(r){ addMarriage(r); });
    }

    upProg();
  }

  form.addEventListener('input', function(){
    upProg();
    saveDraft();
  });

  form.addEventListener('change', function(){
    upProg();
    saveDraft();
  });

  form.addEventListener('submit', function(e){
    e.preventDefault();

    var errEl = document.getElementById('ic-chdt-err');
    var btn   = document.getElementById('ic-chdt-sub');
    var data  = getFormDataObject();

    errEl.style.display = 'none';
    errEl.textContent = '';

    btn.disabled = true;
    btn.innerHTML = '<span class="spn"></span>Đang gửi...';

    var payload = {
      hoVaTen:           data.hoVaTen || '',
      noiSinh:           data.noiSinh || '',
      danToc:            data.danToc || '',
      queQuan:           data.queQuan || '',
      soDienThoai:       data.soDienThoai || '',
      ssn:               data.ssn || '',
      diaChiCuTru:       data.diaChiCuTru || '',
      ngheNghiep:        data.ngheNghiep || '',
      noiLamViec:        data.noiLamViec || '',
      diaChiLamViec:     data.diaChiLamViec || '',
      sdtChoLam:         data.sdtChoLam || '',
      ketHonLan:         data.ketHonLan || '',
      bo_hoTen:          data.bo_hoTen || '',
      bo_ngaySinh:       data.bo_ngaySinh || '',
      bo_danToc:         data.bo_danToc || '',
      bo_quocTich:       data.bo_quocTich || '',
      bo_queQuan:        data.bo_queQuan || '',
      bo_noiCuTru:       data.bo_noiCuTru || '',
      me_hoTen:          data.me_hoTen || '',
      me_ngaySinh:       data.me_ngaySinh || '',
      me_danToc:         data.me_danToc || '',
      me_quocTich:       data.me_quocTich || '',
      me_queQuan:        data.me_queQuan || '',
      me_noiCuTru:       data.me_noiCuTru || '',
      honThe_hoTen:      data.honThe_hoTen || '',
      honThe_noiSinh:    data.honThe_noiSinh || '',
      honThe_danToc:     data.honThe_danToc || '',
      honThe_ketHonLan:  data.honThe_ketHonLan || '',
      __work:            data.__work || [],
      __siblings:        data.__siblings || [],
      __marriage:        data.__marriage || [],
      signaturePng:      ''
    };

    fetch(API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': chdtNonce
      },
      body: JSON.stringify(payload)
    })
    .then(function(r){
      var contentType = r.headers.get('content-type') || '';

      if (contentType.indexOf('application/json') !== -1) {
        return r.json().then(function(j){
          return {
            ok: r.ok,
            status: r.status,
            body: j
          };
        });
      }

      return r.text().then(function(txt){
        return {
          ok: r.ok,
          status: r.status,
          body: {
            success: false,
            message: txt || 'Máy chủ trả về dữ liệu không hợp lệ.'
          }
        };
      });
    })
    .then(function(res){
      if (res.ok && res.body && res.body.success) {
        clearDraft();
        form.style.display = 'none';
        document.getElementById('ic-chdt-suc').style.display = 'block';
        return;
      }

      var msg = 'Có lỗi xảy ra. Vui lòng thử lại.';

      if (res.body) {
        if (res.body.message) {
          msg = res.body.message;
        } else if (res.body.errors) {
          try {
            msg = JSON.stringify(res.body.errors);
          } catch (e) {}
        } else if (res.body.code === 'rest_cookie_invalid_nonce') {
          msg = 'Phiên gửi biểu mẫu không hợp lệ. Vui lòng tải lại trang rồi thử lại.';
        }
      }

      errEl.textContent = msg;
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = 'Gửi Công Hàm Độc Thân';
    })
    .catch(function(err){
      console.error('Submit error:', err);
      errEl.textContent = 'Không kết nối được với máy chủ. Vui lòng thử lại.';
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = 'Gửi Công Hàm Độc Thân';
    });
  });

  document.getElementById('ic-chdt-addwork').addEventListener('click', function(){
    addWork();
    saveDraft();
  });

  document.getElementById('ic-chdt-addsib').addEventListener('click', function(){
    addSibling();
    saveDraft();
  });

  document.getElementById('ic-chdt-addmarriage').addEventListener('click', function(){
    addMarriage();
    saveDraft();
  });

  var draft = loadDraft();
  if (draft) {
    restoreDraft(draft);
  }
  upProg();

})();
</script>
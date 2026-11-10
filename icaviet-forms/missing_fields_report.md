# DANH SÁCH CÁC TRƯỜNG CẦN BỔ SUNG / SỬA ĐỔI TRONG FORM DS-160 (SCHEMA.JSON)

Sau khi quét toàn bộ mẫu Phiếu Kiểm Tra (`ds160.html`), dưới đây là danh sách các hạng mục (câu hỏi) hiện **đang có trên Phiếu Kiểm Tra nhưng lại vắng mặt (hoặc gộp chung chưa tách) trong Form khách hàng (`schema.json`)**.

Để hệ thống Auto-fill hoạt động hoàn hảo 100%, anh vui lòng vào trình tạo Form (của icaviet-forms) và bổ sung các trường sau:

---

## 1. Thông tin Cá nhân & Nơi sinh
Hiện tại form mới có `Nơi sinh` (gộp chung). Cần chia nhỏ và bổ sung theo đúng phiếu:
- [ ] `Surnames` (Họ)
- [ ] `Given Names` (Tên lót và Tên)
- [ ] `Have ever used other names?` (Từng sử dụng tên khác chưa? YES/NO)
- [ ] `Do you have a telecode that represents your name?` (YES/NO)
- [ ] `City of Birth` (Thành phố sinh)
- [ ] `State/Province of Birth` (Tỉnh/Bang sinh)
- [ ] `Country/Region of Birth` (Quốc gia sinh)
- [ ] `Are you a permanent resident of a country/region other than your original nationality?`

## 2. Thông tin Định danh & Thuế (ID & Tax)
- [ ] `National Identification Number` (Số CMND/CCCD - *Hiện form có idNumber nhưng tiếng Anh đang để là National ID Number, cần đổi nhãn tiếng Anh thành National Identification Number*)
- [ ] `U.S. Social Security Number` (Số an sinh xã hội Mỹ)
- [ ] `U.S. Taxpayer ID Number` (Mã số thuế Mỹ)

## 3. Lịch sử / Thông tin Visa
- [ ] `Visa class` (Loại Visa)
- [ ] `Application Receipt/Petition Number` (Số biên nhận / Số hồ sơ bảo lãnh)

## 4. Chuyến bay & Lịch trình (Flight & Travel)
- [ ] `Thông tin chuyến bay đến Mỹ`
- [ ] `Thông tin chuyến bay về`
- [ ] `Thành phố rời đi`
- [ ] `Các nơi sẽ đi ở Mỹ`
- [ ] `Date Arrived` (Ngày đến)

## 5. BẮT BUỘC CHIA NHỎ ĐỊA CHỈ (Rất quan trọng)
*Trên phiếu DS-160, MỌI địa chỉ (địa chỉ nhà ở VN, địa chỉ thư tín, địa chỉ ở Mỹ, địa chỉ người thân, công ty...) đều bắt buộc phải tách làm 5 ô riêng biệt. Form hiện tại đang cho khách gộp chung vào 1 ô text.*
**Anh cần thay thế các ô nhập địa chỉ chung chung hiện tại thành 5 trường nhỏ cho MỖI loại địa chỉ:**
- [ ] `Street Address (Line 1)` (Số nhà + Đường)
- [ ] `Street Address (Line 2)` (Quận/Phường/Xã hoặc Căn hộ)
- [ ] `City` (Thành phố / Huyện)
- [ ] `State/Province` (Bang / Tỉnh)
- [ ] `Postal Zone/ZIP Code` (Mã bưu điện)

*(Ví dụ: Thay vì `currentAddressVN`, anh phải tạo `currentAddressVN_Line1`, `currentAddressVN_Line2`, `currentAddressVN_City`, v.v... Cần làm vậy cho cả Địa chỉ ở VN, Địa chỉ Mỹ, Địa chỉ công ty, v.v.)*

## 6. Thông tin Hộ chiếu (Passport Details)
Form hiện tại thiếu rất nhiều thông tin chi tiết của Hộ chiếu:
- [ ] `Passport/Travel Document Type` (Loại hộ chiếu - Regular/Official/Diplomatic...)
- [ ] `Passport/Travel Document Number` (Số hộ chiếu)
- [ ] `Passport Book Number` (Số sổ hộ chiếu)
- [ ] `Country/Authority that Issued Passport` (Quốc gia cấp)
- [ ] `City of Issuance` (Thành phố cấp)
- [ ] `State/Province of Issuance` (Tỉnh/Bang cấp)
- [ ] `Country of Issuance` (Quốc gia cấp - lặp lại hoặc chi tiết hơn)
- [ ] `Issuance Date` (Ngày cấp)

## 7. Các số điện thoại
- [ ] `Work Phone Number` (Số điện thoại nơi làm việc)
- [ ] `Do you or did you ever hold a U.S. Driver’s License` (Từng có bằng lái xe Mỹ chưa?)

---
> 💡 **Lưu ý cho Dev:**
> Sau khi anh thêm đầy đủ các trường (fields) này vào bên `schema.json`, hãy báo lại cho tôi. Tôi sẽ viết script Quét (Map) tự động, lúc đó chỉ cần 1 click là hàng trăm ô trên Phiếu Kiểm Tra sẽ tự động điền không sai một dấu chấm phẩy!

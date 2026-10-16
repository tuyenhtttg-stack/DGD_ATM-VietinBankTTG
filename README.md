# Web app Bản đồ ATM – VietinBank Chi nhánh Tây Tiền Giang

Trang web tĩnh, chạy trên GitHub Pages, tối ưu cho điện thoại. Dữ liệu đọc trực tiếp từ Google Sheets: sửa Sheet thì web app tự cập nhật trong khoảng 5 phút.

## Cấu trúc thư mục

| File / thư mục | Nội dung |
|---|---|
| `index.html`, `style.css`, `app.js`, `lib.js` | Ứng dụng chính |
| `config.js` | **Cấu hình – file duy nhất cần sửa** (link dữ liệu, hotline…) |
| `qr.html` | Trang in mã QR dán tại ATM/PGD (khổ A4) |
| `data/atm.csv`, `data/pgd.csv` | Dữ liệu dự phòng khi chưa nối Google Sheets |
| `assets/logo.png` | Logo VietinBank – Chi nhánh Tây Tiền Giang (tách từ file gốc) |
| `assets/anh/` | (Tùy chọn) Ảnh ATM đặt trong repo, tên file = giá trị cột "Link ảnh" |
| `icons/`, `manifest.webmanifest`, `sw.js` | Cài lên màn hình chính (PWA), chạy khi mạng yếu |
| `vendor/` | Thư viện Leaflet 1.9.4 (bản đồ), qrcode-generator 1.4.4 |
| `fonts/` | (Tùy chọn) Chép font SVN-Gilroy vào đây |

---

## Bước 1 – Chuẩn bị Google Sheets

### 1.1 Tạo sheet WEB (chỉ chứa thông tin công khai)
1. Trong file Google Sheets, tạo trang tính mới, đặt tên **WEB**.
2. Tại ô **A1**, dán công thức:
   ```
   =QUERY(DS_ATM!B4:O500,"select B,C,D,E,F,G,H,I,J,K,L,M,O where B is not null and N = 'Có'",1)
   ```
   Sheet WEB tự lấy các ATM có cột Công khai = "Có", **không có cột Ghi chú nội bộ**.
   > Locale của file phải là **Vương quốc Anh** (Tệp → Cài đặt) thì công thức mới dùng dấu phẩy `,` như trên.

### 1.2 Thêm sheet điểm giao dịch
1. Tệp → **Nhập** → Tải lên file `DS_PGD_mau.xlsx` → chọn **"Chèn (các) trang tính mới"**.
2. Nhập địa chỉ, tọa độ, giờ làm việc, điện thoại cho 5 PGD. Điểm chưa có tọa độ sẽ chưa hiện trên bản đồ.

### 1.3 Xuất bản dữ liệu ra web (dạng CSV)
1. Tệp → **Chia sẻ** → **Công bố lên web** (Publish to web).
2. Tab **Đường liên kết**: chọn trang tính **WEB**, định dạng **Giá trị được phân tách bằng dấu phẩy (.csv)** → **Xuất bản** → sao chép link.
3. Làm lại bước 2 cho trang tính **DS_PGD** → sao chép link thứ hai.
4. Ở mục "Nội dung đã xuất bản và cài đặt", giữ chọn **"Tự động xuất bản lại khi có thay đổi"**.
5. Mở `config.js`, dán link:
   ```js
   ATM_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?gid=...&single=true&output=csv",
   PGD_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?gid=...&single=true&output=csv",
   ```

> ⚠️ **Bảo mật:** Chỉ xuất bản sheet **WEB** và **DS_PGD**, **không** xuất bản DS_ATM (có cột Ghi chú nội bộ).
> Sau khi xuất bản, chuyển quyền chia sẻ của file Sheet về **"Bị hạn chế"**: web app vẫn đọc được dữ liệu qua link xuất bản, còn người ngoài không mở được file gốc.

### 1.4 Ảnh ATM – chọn 1 trong 2 cách
- **Cách A – Google Drive:** dán link chia sẻ của từng ảnh vào cột "Link ảnh (Google Drive)". Ảnh phải để quyền "Bất kỳ ai có đường liên kết – Người xem".
- **Cách B – Lưu trong repo (tải nhanh, ổn định hơn):** giữ nguyên giá trị trong cột "Link ảnh" (VD: `ATM-76200010`), rồi đưa file ảnh `ATM-76200010.jpg` vào thư mục `assets/anh/` trên GitHub. Ảnh nên chụp ngang, nén dưới 300 KB.

Chưa có ảnh thì app hiển thị khung "Hình ảnh đang được cập nhật".

---

## Bước 2 – Đưa lên GitHub Pages
1. Đăng nhập GitHub → **New repository**. Đặt tên, VD `atm-vietinbank-tty`, chọn **Public** → Create.
2. Trong repo: **Add file → Upload files**. Kéo **toàn bộ nội dung** thư mục đã giải nén (không kéo thư mục cha) → **Commit changes**.
3. **Settings → Pages** → Source: **Deploy from a branch** → Branch **main**, thư mục **/(root)** → **Save**.
4. Khoảng 1–2 phút sau, web app chạy tại `https://<tên-tài-khoản>.github.io/atm-vietinbank-tty/`.

Có thể gắn tên miền riêng sau (Settings → Pages → Custom domain).

---

## Vận hành hằng ngày
| Việc cần làm | Thao tác |
|---|---|
| Thêm / sửa ATM, đổi trạng thái | Sửa sheet **DS_ATM**, web tự cập nhật sau ≤ 5 phút |
| Tạm ẩn 1 ATM | Đặt cột Công khai = **Không** |
| In mã QR dán tại ATM | Mở `.../qr.html` → **In / Lưu PDF** |
| Link riêng từng ATM | `.../?atm=<Mã ATM>` hoặc `.../?pgd=<Mã điểm>` (nút Chia sẻ trong app) |
| Sửa code / config | Sửa file trên GitHub, **tăng `VERSION` trong `sw.js`** (VD `atm-v1.0.1`) để máy khách nhận bản mới |

## Ghi chú kỹ thuật
- **Chỉ đường:** `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>&travelmode=two-wheeler&dir_action=navigate`. Trên điện thoại, Google Maps vào thẳng chế độ dẫn đường bằng xe máy. Đổi phương tiện ở `TRAVEL_MODE` trong `config.js`.
- **"Gần bạn nhất":** tính theo khoảng cách đường chim bay, chỉ xét ATM có trạng thái **Hoạt động**. Máy tạm ngưng/bảo trì vẫn hiện, màu xám.
- **Bản đồ:** OpenStreetMap, miễn phí, không cần API key. Bắt buộc giữ dòng ghi nguồn © OpenStreetMap ở góc bản đồ.
- **Font:** đang dùng Be Vietnam Pro (Google Fonts) thay thế. Muốn dùng đúng font chuẩn SVN-Gilroy, chép `SVN-Gilroy-Regular.ttf`, `SVN-Gilroy-Medium.ttf`, `SVN-Gilroy-Bold.ttf` vào `fonts/`, app tự nhận.
- **Dải Hoa nở** (dải màu trên cùng và chân trang) đang dựng bằng CSS theo mã màu chuẩn. Có file gốc thì thay được.
- **Icon app** dùng biểu tượng VietinBank tách từ file logo gốc, không vẽ lại.

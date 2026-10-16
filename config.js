/* =========================================================
   CẤU HÌNH WEB APP BẢN ĐỒ ATM – chỉ cần sửa file này
   ========================================================= */
window.APP_CONFIG = {
  // Link "Xuất bản lên web" (định dạng CSV) của sheet WEB trong Google Sheets.
  // Để trống "" thì app đọc file mẫu data/atm.csv trong repo.
  ATM_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTgtracghtIm8RxBcFV9KUsXjZkE9GcGgEe90bmWo7ERoOKgd1RPbJQ1qUMWah6hnlkUlIicqPI8FfF/pub?gid=1336943684&single=true&output=csv",

  // Link "Xuất bản lên web" (CSV) của sheet DS_PGD (điểm giao dịch).
  PGD_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTgtracghtIm8RxBcFV9KUsXjZkE9GcGgEe90bmWo7ERoOKgd1RPbJQ1qUMWah6hnlkUlIicqPI8FfF/pub?gid=2138942701&single=true&output=csv",

  // File dự phòng trong repo (dùng khi chưa có link hoặc Google lỗi)
  FALLBACK_ATM: "data/atm.csv",
  FALLBACK_PGD: "data/pgd.csv",

  // Thông tin hiển thị
  APP_TITLE: "Tìm ATM VietinBank",
  BRANCH_NAME: "Chi nhánh Tây Tiền Giang",
  LOGO: "assets/logo.png",          // file logo gốc (PNG nền trong suốt hoặc SVG)
  HOTLINE: "1900 558 868",          // tổng đài VietinBank
  BRANCH_PHONE: "",                 // số điện thoại chi nhánh, để trống thì ẩn
  WEBSITE: "www.vietinbank.vn",

  // Bản đồ
  MAP_CENTER: [10.38, 106.0],       // tâm bản đồ khi chưa có dữ liệu
  MAP_ZOOM: 11,

  // Chế độ dẫn đường Google Maps: "two-wheeler" (xe máy), "driving", "walking"
  TRAVEL_MODE: "two-wheeler",

  // Tự tải lại dữ liệu mỗi N phút khi app đang mở
  REFRESH_MINUTES: 5
};

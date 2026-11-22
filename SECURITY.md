# Bảo mật và quyền riêng tư / Security and privacy

## Dữ liệu được lưu ở đâu

7000 Từ IELTS không có tài khoản, không lưu trữ phía máy chủ, không thống kê và không theo dõi. Tiến độ học chỉ được lưu trong localStorage của trình duyệt đang dùng, và có thể xuất ra bản sao lưu JSON trong mục “Của tôi”. Khi nhập bản sao lưu, mọi trường đều được kiểm tra từng cái một, dữ liệu sai định dạng sẽ bị loại bỏ.

7000 Từ IELTS has no accounts, server-side storage, analytics or tracking. Progress lives in the browser's localStorage and can be exported as JSON. Imported backups are validated field by field.

## Thông tin xác thực / Credentials

Bản web chạy không cần bất kỳ API key nào. Chỉ các script tạo nội dung trong `scripts/atlas/` mới cần gọi dịch vụ mô hình. Chúng đọc thông tin xác thực từ biến môi trường (`SUB2_BASE_URL`, `SUB2_API_KEY` hoặc `OPENAI_BASE_URL`, `OPENAI_API_KEY`, và `ELEVENLABS_API_KEY`) hoặc từ thư mục nằm ngoài repo (`ATLAS_SECRETS`), và không ghi vào repo.

- Không dùng biến `VITE_*` để lưu thông tin xác thực, vì chúng sẽ được đóng gói vào mã chạy trên trình duyệt.
- Trước khi công khai, chạy `npm run pack:public`. Lệnh này xuất theo danh sách cho phép và quét tìm thông tin xác thực cùng đường dẫn cá nhân. Quét tự động chỉ là công cụ hỗ trợ, không thay thế được kiểm tra thủ công.
- Nếu thông tin xác thực bị lộ ngoài ý muốn, hãy thu hồi hoặc thay mới ngay tại nhà cung cấp.

## Báo cáo sự cố / Reporting

Khi phát hiện lỗi bảo mật, hãy liên hệ người duy trì qua GitHub private vulnerability reporting (Security → Report a vulnerability). Mở một security advisory riêng tư trên GitHub của kho này, không đăng chi tiết công khai.

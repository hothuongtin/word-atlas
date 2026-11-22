# Tham gia đóng góp / Contributing

Cảm ơn bạn đã muốn giúp 7000 Từ IELTS tốt hơn.

## Sửa mục từ

Đóng góp có giá trị nhất là sửa lỗi. Hãy ghi rõ `id` của mục từ, vấn đề và cách sửa đề xuất trong Issue, hoặc gửi trực tiếp một PR:

1. Trước khi sửa dữ liệu nguồn ngoài `.local`, hãy đọc [docs/pipeline.md](docs/pipeline.md). Với sửa nhỏ, bạn có thể chỉnh trực tiếp mục tương ứng trong `data/word-atlas.json` và `public/atlas/entries/`, và giữ hai nơi nhất quán với nhau.
2. Chạy `npm run check:atlas` và `npm test`.
3. Nêu lý do sửa trong PR, khi cần thì đính kèm liên kết tới từ điển uy tín.

## Mã nguồn

- TypeScript chế độ strict, React function component. Không thêm phụ thuộc vào thư viện quản lý state hay UI framework.
- Giữ định hướng “không cần tài khoản, ưu tiên chạy cục bộ, không theo dõi”.
- Với thay đổi giao diện, hãy kiểm tra cả giao diện sáng, giao diện tối và chiều rộng màn hình điện thoại 375px.
- Trước khi commit, chạy `npm test`, `npm run check:atlas` và `npm run build`.

## Tài nguyên mới

Khi thêm hình ảnh, bản ghi âm hoặc văn bản mới, hãy ghi rõ nguồn và giấy phép. Chỉ nhận nội dung có thể phân phối lại theo CC BY 4.0.

## Bảo mật

Không dán bất kỳ API key nào vào Issue, PR, ảnh chụp màn hình hay nhật ký. Script tạo nội dung chỉ đọc thông tin xác thực từ biến môi trường hoặc tệp nằm ngoài repo, xem [SECURITY.md](SECURITY.md).

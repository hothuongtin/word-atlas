# Video giới thiệu 7000 Từ IELTS

Video Full HD (1920×1080, 30 fps, khoảng 2 phút 10 giây) giới thiệu app cho người học Việt Nam, dựng bằng [Remotion](https://www.remotion.dev/). Nhạc nền được tổng hợp hoàn toàn bằng code trong `scripts/music.py` (96 BPM, giọng Rê trưởng), không dùng nhạc có sẵn.

## Tạo lại video

Cần Node.js 20+, Python 3 có `numpy` và `scipy`, cùng `ffmpeg`. Chạy app ở thư mục gốc trước (`npm run dev`, cổng 5188) vì bước chụp màn hình dùng giao diện thật.

```bash
cd video
npm ci
(cd .. && npx playwright install chromium)   # Trình duyệt cho bước chụp, nếu máy chưa có
node scripts/assets.mjs   # Chép tranh minh họa, ảnh thương hiệu và giọng chào từ app
npm run capture           # Chụp màn hình và quay clip app (Playwright ở thư mục gốc)
npm run music             # Tổng hợp nhạc nền vào public/music.wav
npm run studio            # Xem trước và chỉnh trong Remotion Studio
npm run render            # Xuất out/gioi-thieu-7000-tu-ielts.mp4
```

Các tệp do script tạo ra (ảnh chụp, tranh, nhạc, video xuất) không được commit.

## Cấu trúc

| Tệp | Nội dung |
|---|---|
| `src/Intro.tsx` | Kịch bản 11 cảnh. Mỗi lần chuyển cảnh rơi đúng vạch nhịp của nhạc (1 ô nhịp = 75 khung hình). |
| `src/lib.tsx` | Camera ảo (zoom, lia, xoay 3D, rung tay nhẹ, nhòe khi lia nhanh), nền sao, khung trình duyệt, khung điện thoại, chữ động. |
| `scripts/capture.mjs` | Chụp ảnh màn hình 2× và quay clip màn chào, bầu trời sao bằng Chrome DevTools. |
| `scripts/music.py` | Tổng hợp pad, arpeggio, trống, bass, giai điệu chuông, riser, tiếng whoosh và impact. |

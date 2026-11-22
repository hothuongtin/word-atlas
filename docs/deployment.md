# Triển khai / Deployment

`npm run build` tạo ra một trang tĩnh thuần trong `dist/`, có thể đặt trên bất kỳ dịch vụ lưu trữ tĩnh nào (Nginx, Cloudflare Pages, Vercel, GitHub Pages).

## Đường dẫn con

```bash
ATLAS_BASE=/words/ npm run build
```

## Ví dụ Nginx

```nginx
location ^~ /words/ {
    alias /var/www/word-atlas/;
    try_files $uri $uri/ /words/index.html;
    expires 7d;
}
```

## GitHub Pages

Kho có sẵn `.github/workflows/pages.yml`. Vào Settings → Pages của kho, chọn “GitHub Actions”, rồi chạy thủ công “Deploy to GitHub Pages”.

## Dung lượng

Tranh minh họa và âm thanh cộng lại khoảng vài trăm MB. Nên triển khai phía sau CDN, hoặc chỉ đưa lên `thumb/` và một phần âm thanh tùy theo nhu cầu.

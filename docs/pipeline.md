# Quy trình tạo nội dung / Content pipeline

Tất cả script nằm trong `scripts/atlas/`. Thông tin xác thực chỉ được đọc từ biến môi trường hoặc thư mục nằm ngoài repo (xem [SECURITY.md](../SECURITY.md)). Sản phẩm trung gian ghi vào `.local/forge/` (thư mục này đã bị Git bỏ qua), và có thể chạy tiếp từ chỗ đã dừng.

1. **Từ đầu mục (headword)**: `.local/forge/headwords.json`, mỗi mục có dạng `{hid, word, raw}`. `raw` là gợi ý nghĩa tùy chọn, chỉ dùng để xác định nghĩa nào quan trọng, không được sao chép vào đầu ra.
2. **Văn bản mục từ** `gen_text.py`: mỗi lô 10 từ, sinh JSON theo quy định biên soạn trong [`gen_text.py`](../scripts/atlas/gen_text.py) (ưu tiên chính xác, nội dung nguyên gốc, hai loại câu ví dụ, không bịa nguồn gốc từ, an toàn và trung lập).
3. **Tranh minh họa** `gen_images.py`: mỗi mục có một mô tả cảnh `scene`, được kết hợp với prompt phong cách thống nhất để tạo ảnh 1024px, rồi nén thành WebP 768px làm bản gốc. Sinh theo thứ tự lộ trình học.
4. **Phát âm** `gen_word_audio.py`: ElevenLabs, giọng Anh - Anh là Alice, giọng Anh - Mỹ là Sarah.
5. **Đọc câu ví dụ** `gen_sentence_audio.py`: tổng hợp giọng đọc cho `ex[0]`, theo thứ tự lộ trình học.
6. **Biên dịch** `build_atlas.py`: làm sạch trường, sắp xếp, chia khối, sinh `public/atlas/` và `data/`.
7. **Kiểm tra** `npm run check:atlas`: cấu trúc, thứ tự, tham chiếu và sự tồn tại của tệp media.

```bash
export SUB2_BASE_URL=... SUB2_API_KEY=... ELEVENLABS_API_KEY=...
python3 scripts/atlas/gen_text.py --workers 8
python3 scripts/atlas/gen_images.py --workers 8 --follow
python3 scripts/atlas/gen_word_audio.py
python3 scripts/atlas/gen_sentence_audio.py --follow
python3 scripts/atlas/build_atlas.py
npm run check:atlas
```

`SUB2_BASE_URL` trỏ tới bất kỳ endpoint nào tương thích OpenAI.

Các bước trên là pipeline của dự án gốc, tạo ra văn bản tiếng Anh, tranh minh họa và âm thanh. Phần tiếng Việt do `scripts/atlas/localize_vi.py` tạo: một mô hình ngôn ngữ lớn viết nghĩa tiếng Việt, bản dịch câu ví dụ, nghĩa của cụm từ thường gặp, gợi ý và ghi chú từ nội dung tiếng Anh, có tự động kiểm tra cấu trúc, độ dài và ký tự. Sau đó `scripts/atlas/apply_vi.py` gộp kết quả vào `data/` và `public/atlas/` mà không thay đổi `id`, văn bản tiếng Anh hay media.

```bash
export OPENAI_API_KEY=...
cd scripts/atlas
python3 localize_vi.py --sample 200   # pilot, review before the full run
python3 localize_vi.py --all          # resumable, rerun to retry rejected entries
python3 apply_vi.py --strict          # fails while any entry is still not localized
npm run check:atlas
```

Ba câu thoại tiếng Việt (màn chào và bầu trời từ vựng) do `scripts/atlas/gen_voice_vi.py` tạo bằng OpenAI text-to-speech. Script sinh vài bản đọc cho mỗi câu, dùng speech-to-text nghe lại để đối chiếu từng chữ, rồi xử lý âm lượng và ghi bản được chọn vào `public/sfx/`.

```bash
python3 gen_voice_vi.py                 # generate takes and print what speech-to-text hears
python3 gen_voice_vi.py --publish nova  # master the chosen voice into public/sfx/
```

## Giới hạn về chất lượng

Kiểm tra tự động bao phủ cấu trúc, trường, thứ tự và tệp, nhưng không bao phủ tính đúng đắn về ngữ nghĩa. Tranh minh họa và câu ví dụ chưa được duyệt thủ công từng mục. Nếu phát hiện vấn đề, hãy mở Issue hoặc PR.

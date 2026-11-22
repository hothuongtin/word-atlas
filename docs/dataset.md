# Định dạng bộ từ / Dataset format

## `data/word-atlas.json`

Một mảng, sắp xếp theo lộ trình học (CEFR từ dễ đến khó, trong cùng một cấp thì xen kẽ các chủ đề). Mỗi mục từ gồm:

| Trường | Kiểu | Mô tả |
| --- | --- | --- |
| `id` | string | Định danh duy nhất, an toàn cho URL, đồng thời là tên tệp media, ví dụ `principle`, `day-off` |
| `w` | string | Từ đầu mục (headword) |
| `uk` / `us` | string | IPA kiểu Anh / kiểu Mỹ, có dấu gạch chéo |
| `senses` | `{pos, vi, en}[]` | 1-3 nghĩa: từ loại, nghĩa tiếng Việt, nghĩa tiếng Anh ngắn gọn |
| `ex` | `{en, vi}[]` | Hai câu ví dụ gốc: `ex[0]` là câu ngắn sinh hoạt hằng ngày, `ex[1]` là câu dài trong ngữ cảnh IELTS |
| `col` | string[] | Cụm từ thường gặp, định dạng `english|tiếng Việt` |
| `fam` | string[] | Họ từ, định dạng `word (pos)` |
| `syn` / `ant` | string[] | Từ đồng nghĩa / trái nghĩa |
| `tip` | string | Một gợi ý tiếng Việt về cách dùng hoặc cách phân biệt |
| `cefr` | `A1`…`C2` | Độ khó ước lượng |
| `topic` | string | Một trong 19 chủ đề: education, work, technology, science, environment, health, society, government, economy, media, arts, travel, city, nature, daily, emotion, thinking, sport, history |
| `note` | string | Tùy chọn: lưu ý khi dùng (xúc phạm, lỗi thời, ghi chú chính tả, v.v.) |

## `data/word-atlas.csv`

Cùng nội dung dưới dạng bảng. Các trường nhiều giá trị được nối bằng ` | `, ` ; ` hoặc `, `. Mã hóa UTF-8.

## Dữ liệu web `public/atlas/`

- `index.json`: chỉ mục gọn, mỗi dòng trong `words` có dạng `[id, word, vi, ipa, cefrIndex, topicIndex, media]`. `media` là cờ bit: `1` tranh minh họa, `2` giọng Anh - Anh, `4` giọng Anh - Mỹ, `8` đọc câu ví dụ `ex[0]`, `16` đọc câu ví dụ `ex[1]`.
- `entries/<n>.json`: mục từ đầy đủ, mỗi khối 100 mục. Khối thứ `n` ứng với các dòng từ `n*100` đến `n*100+99` trong chỉ mục.
- `img/<id>.webp` (512px), `thumb/<id>.webp` (256px).
- `audio/uk/<id>.mp3`, `audio/us/<id>.mp3`, `audio/ex/<id>.mp3` (đọc `ex[0]`), `audio/ex2/<id>.mp3` (đọc `ex[1]`, chỉ một phần mục từ có).

Độ phủ của media lấy theo cờ bit trong `index.json`. Đừng giả định mỗi từ đều có đủ mọi tệp.

## Giấy phép

CC BY 4.0, ghi công “Word Atlas contributors”. Xem [CONTENT_LICENSE.md](../CONTENT_LICENSE.md).

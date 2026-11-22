import { ArrowUpRight, Database, Github, Heart } from "lucide-react";
import { useAtlas } from "../atlas/context";
import { APP_NAME, APP_TAGLINE, REPO_URL, UPSTREAM_URL } from "../config";

const BASE = import.meta.env.BASE_URL;

export function About() {
  const atlas = useAtlas();
  return (
    <div className="page about">
      <header className="about-hero">
        <img src={`${BASE}brand/og.webp`} alt="" />
        <div>
          <p className="eyebrow">Giới thiệu {APP_NAME}</p>
          <h1 className="display">{APP_TAGLINE}.</h1>
          <p className="lede">
            {APP_NAME} sắp xếp vốn từ đọc hiểu IELTS thành {atlas.count.toLocaleString("vi-VN")} mục từ. Mỗi từ có một bức tranh minh họa, một câu ví dụ đời thường, một câu ví dụ theo ngữ cảnh IELTS, kèm phát âm Anh - Mỹ, cụm từ thường gặp và mẹo tránh nhầm lẫn dành cho người Việt. Thuộc một từ, bầu trời của bạn sáng thêm một ngôi sao.
          </p>
          <p className="lede">Miễn phí, mã nguồn mở, không cần đăng ký. Mã nguồn theo giấy phép MIT, bộ từ theo CC BY 4.0, ai cũng có thể dùng lại.</p>
          <div className="about-actions">
            <a className="btn btn-primary" href={REPO_URL} target="_blank" rel="noreferrer">
              <Github size={18} /> Xem trên GitHub
            </a>
            <a className="btn btn-ghost" href={`${REPO_URL}/tree/main/data`} target="_blank" rel="noreferrer">
              <Database size={18} /> Tải bộ từ JSON / CSV
            </a>
          </div>
        </div>
      </header>

      <div className="about-grid">
        <section className="panel">
          <h3 className="eyebrow">Vì sao nhớ lâu</h3>
          <ul className="feature-list">
            <li>
              <b>Nhìn thấy trước.</b> Mỗi từ có một bức tranh, vẽ đúng điều xảy ra trong câu ví dụ đầu tiên.
            </li>
            <li>
              <b>Rồi tự nhớ lại.</b> Chọn nghĩa, nhìn tranh điền câu, nghe đoán từ, đánh vần: đi từ nhận ra đến viết được.
            </li>
            <li>
              <b>Gặp lại đúng lúc sắp quên.</b> FSRS là thuật toán ghi nhớ mã nguồn mở mà Anki bản mới đang dùng, chỉ xếp lịch ôn khi bạn sắp quên.
            </li>
            <li>
              <b>Điểm số trung thực.</b> Chỉ tính lần trả lời đầu tiên. Từ trả lời sai sẽ quay lại dưới dạng bài khác, nhưng không làm tăng tỉ lệ đúng.
            </li>
            <li>
              <b>Tiến độ là của riêng bạn.</b> Không tài khoản, không máy chủ, dữ liệu nằm trong trình duyệt của bạn và xuất ra được bất cứ lúc nào.
            </li>
          </ul>
        </section>

        <section className="panel">
          <h3 className="eyebrow">Phím tắt</h3>
          <dl className="keys">
            <div>
              <dt>
                <kbd>⌘</kbd>
                <kbd>K</kbd> hoặc <kbd>/</kbd>
              </dt>
              <dd>Tìm một từ bất kỳ</dd>
            </div>
            <div>
              <dt>
                <kbd>1</kbd>–<kbd>4</kbd>
              </dt>
              <dd>Chọn đáp án</dd>
            </div>
            <div>
              <dt>
                <kbd>Enter</kbd>
              </dt>
              <dd>Xác nhận / tiếp tục</dd>
            </div>
            <div>
              <dt>
                <kbd>←</kbd> <kbd>→</kbd>
              </dt>
              <dd>Chuyển từ trước, từ sau trong thẻ từ</dd>
            </div>
            <div>
              <dt>
                <kbd>Esc</kbd>
              </dt>
              <dd>Đóng cửa sổ</dd>
            </div>
          </dl>
        </section>

        <section className="panel">
          <h3 className="eyebrow">Nội dung đến từ đâu</h3>
          <p className="muted">
            Phần tiếng Anh (định nghĩa, câu ví dụ, cụm từ), tranh minh họa và giọng đọc đến từ dự án mở{" "}
            <a className="link" href={UPSTREAM_URL} target="_blank" rel="noreferrer">
              Word Atlas
            </a>{" "}
            (CC BY 4.0, Word Atlas contributors): chữ do mô hình ngôn ngữ lớn soạn theo một chuẩn từ điển thống nhất, tranh do mô hình tạo ảnh vẽ, giọng đọc do ElevenLabs tổng hợp (giọng Anh Alice, giọng Mỹ Sarah). Phần tiếng Việt (nghĩa, bản dịch câu ví dụ, mẹo) được mô hình ngôn ngữ lớn viết lại từ nội dung tiếng Anh cho người học Việt Nam. Mọi nội dung đều qua kiểm tra tự động về cấu trúc và tính nhất quán, nhưng chưa được con người duyệt từng mục. Thấy chỗ sai, bạn hãy mở Issue trên GitHub hoặc sửa dữ liệu rồi gửi PR.
          </p>
          <p className="muted">{APP_NAME} không phải danh sách từ chính thức của IELTS, không liên kết với các đơn vị tổ chức kỳ thi IELTS và không cam kết tăng điểm. Ứng dụng chỉ muốn việc học từ vựng đẹp hơn và chắc hơn một chút.</p>
        </section>

        <section className="panel">
          <h3 className="eyebrow">Dành cho lập trình viên</h3>
          <p className="muted">
            <code>data/word-atlas.json</code> và <code>.csv</code> là bộ từ đầy đủ; <code>public/atlas</code> chứa dữ liệu chia khối, tranh và âm thanh cho bản web. Bạn có thể dùng để làm bộ thẻ Anki, ứng dụng học từ, tiện ích trình duyệt hoặc bộ đánh giá cho ứng dụng AI, chỉ cần ghi nguồn.
          </p>
          <a className="link" href={`${REPO_URL}#readme`} target="_blank" rel="noreferrer">
            Đọc tài liệu <ArrowUpRight size={14} />
          </a>
        </section>
      </div>
      <p className="colophon">
        <Heart size={14} /> Dành cho tất cả những ai đang học từ vựng.
      </p>
    </div>
  );
}

import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { useAtlas } from "../atlas/context";
import { APP_NAME } from "../config";
import { store } from "../store/store";

const LEVELS = [
  ["A2", "Cơ bản", "Từ thông dụng còn chưa vững"],
  ["B1", "Trung cấp", "Mục tiêu 5.5 - 6.0"],
  ["B2", "Trung cao", "Mục tiêu 6.5 - 7.0"],
  ["C1", "Cao cấp", "Bứt phá từ 7.5 trở lên"],
];

export function Onboarding() {
  const atlas = useAtlas();
  const [level, setLevel] = useState(1);
  const [goal, setGoal] = useState(10);
  const finish = () => store.settings({ onboarded: true, startLevel: atlas.cefr.indexOf(LEVELS[level][0]), dailyNew: goal });
  return (
    <div className="onboard" role="dialog" aria-modal="true" aria-label="Chào mừng">
      <div className="onboard-card">
        <img className="onboard-art" src={`${import.meta.env.BASE_URL}brand/hero.webp`} alt="" />
        <div className="onboard-body">
          <p className="eyebrow">Chào mừng đến với {APP_NAME}</p>
          <h1 className="display">
            {atlas.count.toLocaleString("vi-VN")} ngôi sao{" "}
            <br />
            đang chờ bạn thắp sáng.
          </h1>
          <fieldset>
            <legend>Bạn xuất phát từ đâu?</legend>
            <div className="choice-grid">
              {LEVELS.map(([code, name, desc], i) => (
                <button key={code} className={`choice ${level === i ? "is-on" : ""}`} onClick={() => setLevel(i)} aria-pressed={level === i}>
                  <span className={`chip chip-level lv-${code}`}>{code}</span>
                  <b>{name}</b>
                  <small>{desc}</small>
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>Mỗi ngày thắp sáng mấy ngôi sao mới?</legend>
            <div className="segmented segmented-wide">
              {[5, 10, 15, 20].map((n) => (
                <button key={n} className={goal === n ? "is-on" : ""} onClick={() => setGoal(n)} aria-pressed={goal === n}>
                  {n} từ{n === 10 ? " · nên chọn" : ""}
                </button>
              ))}
            </div>
          </fieldset>
          <button className="btn btn-primary btn-xl" onClick={finish}>
            Lên đường <ArrowRight size={20} />
          </button>
          <p className="muted">Không cần đăng ký. Tiến độ chỉ lưu trên thiết bị này, bạn có thể đổi bất cứ lúc nào trong mục "Của tôi".</p>
        </div>
      </div>
    </div>
  );
}

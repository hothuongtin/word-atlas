import React from "react";
import { AbsoluteFill, Audio, Easing, Img, interpolate, OffthreadVideo, random, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import data from "./words.json";
import boxes from "../public/capture/boxes.json";
import { At, Backdrop, BrowserFrame, C, Camera, Caption, clamp, Emblem, Flash, Grain, Phone, Playing, Pointer, sans, serif, Shot, Stars, Vignette, Words } from "./lib";

// 96 BPM: one bar = 2.5 s = 75 frames. Cuts land on bars so they match the score in scripts/music.py.
const BAR = 75;
const X = 6;
export const TOTAL = BAR * 51 + 60;
const nf = (n: number) => n.toLocaleString("vi-VN");
const start = (bar: number) => Math.max(0, bar * BAR - X);

type Box = { x: number; y: number };
const B = boxes as unknown as Record<string, Box | Box[]>;
const box = (k: string, i = 0, fb: Box = { x: 800, y: 450 }): Box => {
  const v = B[k];
  return (Array.isArray(v) ? v[i] : v) ?? fb;
};

const W = data.words;
const byId = new Map(W.map((w) => [w.id, w]));
const img = (id: string) => staticFile(`words/${id}.webp`);
const voice = (f: string) => staticFile(`voice/${f}.mp3`);

const Center: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center", ...style }}>{children}</AbsoluteFill>
);

function useCount(f: number, a: number, b: number, to: number) {
  return Math.round(interpolate(f, [a, b], [0, to], { ...clamp, easing: Easing.out(Easing.cubic) }));
}

// Browser frame (1600×944) centred on the stage; helpers convert screenshot coords (1600×900) to stage coords.
const sx = (x: number) => x - 800;
const sy = (y: number) => y + 44 - 472;

/** Browser frame with a pointer drawn in screenshot coordinates. */
const Screen: React.FC<{ src: string; pointer?: React.ReactNode; glow?: boolean }> = ({ src, pointer, glow }) => (
  <div style={{ position: "relative" }}>
    <BrowserFrame src={src} glow={glow} />
    <div style={{ position: "absolute", left: 0, top: 44 }}>{pointer}</div>
  </div>
);

const Speaker: React.FC<{ size?: number }> = ({ size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={C.bg} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 9v6h4l5 4V5L8 9H4z" fill={C.bg} />
    <path d="M16 8.5a5 5 0 0 1 0 7M18.8 6a8.5 8.5 0 0 1 0 12" />
  </svg>
);

/* 1 · Hook */
const Hook = () => {
  const f = useCurrentFrame();
  const ring = W.slice(0, 10);
  const second = f > 150;
  return (
    <AbsoluteFill>
      <Backdrop />
      <Stars speed={0.0025} />
      <Camera keys={[{ f: 0, s: 1.25, rz: -4 }, { f: 300, s: 1, rz: 2 }]} shake={0.6}>
        <AbsoluteFill style={{ transformStyle: "preserve-3d" }}>
          {ring.map((w, i) => {
            const a = (i / ring.length) * Math.PI * 2 + f / 110;
            const appear = spring({ frame: f - 120 - i * 3, fps: 30, config: { damping: 14 } });
            const z = Math.sin(a) * 500;
            return (
              <At key={w.id} x={Math.cos(a) * 780} y={Math.sin(a * 2) * 60 + (i % 2 ? -260 : 270)} z={z} ry={-Math.cos(a) * 30} s={appear * 0.9}>
                <Img src={img(w.id)} style={{ width: 230, height: 230, borderRadius: 24, boxShadow: "0 30px 80px rgba(0,0,0,.6)", opacity: Math.min(1, (z + 700) / 900) }} />
              </At>
            );
          })}
        </AbsoluteFill>
      </Camera>
      <Center>
        {!second ? (
          <div>
            <Words text="Học từ vựng IELTS" at={10} style={{ fontFamily: serif, fontWeight: 600, fontSize: 120, color: C.cream }} />
            <Words text="mà cứ học trước quên sau?" at={34} style={{ fontFamily: serif, fontStyle: "italic", fontWeight: 500, fontSize: 84, color: C.dim, marginTop: 12 }} />
          </div>
        ) : (
          <div>
            <Words text="Thử nhớ từ" at={158} style={{ fontFamily: serif, fontWeight: 600, fontSize: 130, color: C.cream }} />
            <Words text="bằng hình ảnh." at={176} style={{ fontFamily: serif, fontWeight: 600, fontSize: 130, color: C.gold }} />
          </div>
        )}
      </Center>
    </AbsoluteFill>
  );
};

/* 2 · The app's own splash */
const Splash = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    <Camera keys={[{ f: 0, s: 1.35, y: -40 }, { f: 230, s: 1.05, y: 0 }]} shake={0.4}>
      <AbsoluteFill>
        <OffthreadVideo src={staticFile("capture/splash.mp4")} startFrom={24} playbackRate={0.75} muted style={{ width: 1920, height: 1080 }} />
      </AbsoluteFill>
    </Camera>
    <Stars speed={0.004} opacity={0.6} seed="sp" count={140} />
  </AbsoluteFill>
);

/* 3 · What is inside: the numbers */
const Stats = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = data.audio as Record<string, number>;
  const audioTotal = Object.values(a).reduce((s, n) => s + n, 0);
  const items: { n: number; label: string; sub?: string }[] = [
    { n: data.count, label: "từ vựng IELTS", sub: "Chọn lọc cho kỳ thi IELTS" },
    { n: data.count, label: "tranh minh họa", sub: "Mỗi từ một bức tranh riêng" },
    { n: data.examples, label: "câu ví dụ song ngữ", sub: "Anh – Việt, đặt trong ngữ cảnh" },
    { n: audioTotal, label: "file âm thanh", sub: `${nf(a.uk)} giọng Anh – Anh · ${nf(a.us)} Anh – Mỹ · ${nf(a.ex + (a.ex2 ?? 0))} câu đọc mẫu` },
    { n: data.topics.length, label: "chủ đề IELTS", sub: "Giáo dục, môi trường, công nghệ…" },
    { n: data.cefr.length, label: "cấp độ A1 → C2", sub: "Theo khung tham chiếu CEFR" },
  ];
  return (
    <AbsoluteFill>
      <Backdrop hue={0.5} />
      <AbsoluteFill style={{ filter: "blur(5px)", opacity: 0.3 }}>
        <Camera keys={[{ f: 0, y: 380, s: 1.1, rz: -8 }, { f: 300, y: -260, s: 0.95, rz: 4 }]} shake={0.3}>
          <At rx={46}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(9, 260px)", gap: 26 }}>
              {Array.from({ length: 72 }, (_, i) => (
                <Img key={i} src={img(W[(i * 5) % W.length].id)} style={{ width: 260, height: 260, borderRadius: 20 }} />
              ))}
            </div>
          </At>
        </Camera>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(70% 60% at 50% 50%, rgba(11,16,32,.55), rgba(11,16,32,.9))" }} />
      <Camera keys={[{ f: 0, s: 1.12, rz: -1.5, ry: -6 }, { f: 300, s: 0.98, rz: 0.5, ry: 5 }]} shake={0.4}>
        <AbsoluteFill style={{ alignItems: "center", paddingTop: 110 }}>
          <Words text="Trong app có gì?" at={6} style={{ fontFamily: serif, fontWeight: 600, fontSize: 92, color: C.cream }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 520px)", gap: 34, marginTop: 56 }}>
            {items.map((it, i) => {
              const at = 26 + i * 26;
              const p = spring({ frame: f - at, fps, config: { damping: 16 } });
              const n = useCount(f, at, at + 60, it.n);
              const audio = i === 3;
              return (
                <div key={it.label} style={{ opacity: p, transform: `translateY(${(1 - p) * 60}px) scale(${0.85 + p * 0.15})`, padding: "30px 34px", borderRadius: 28, background: audio ? "rgba(242,196,109,.12)" : "rgba(30,38,64,.72)", border: `1px solid ${audio ? C.gold : "rgba(243,236,223,.14)"}`, boxShadow: "0 30px 70px rgba(0,0,0,.45)", textAlign: "left", minHeight: 270, boxSizing: "border-box" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                    <div style={{ fontFamily: serif, fontWeight: 700, fontSize: 92, lineHeight: 1, color: C.gold, fontVariantNumeric: "tabular-nums" }}>{nf(n)}</div>
                    {audio && (
                      <div style={{ display: "flex", alignItems: "center", gap: 5, height: 60 }}>
                        {Array.from({ length: 9 }, (_, k) => (
                          <span key={k} style={{ width: 6, borderRadius: 3, background: C.gold, height: 10 + Math.abs(Math.sin(f / 4 + k * 1.1)) * 46 * p }} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ fontFamily: sans, fontWeight: 600, fontSize: 36, color: C.cream, marginTop: 14 }}>{it.label}</div>
                  <div style={{ fontFamily: sans, fontSize: 22, color: C.dim, marginTop: 8, lineHeight: 1.35 }}>{it.sub}</div>
                </div>
              );
            })}
          </div>
        </AbsoluteFill>
      </Camera>
      <Vignette />
    </AbsoluteFill>
  );
};

/* 4 · The level journey, A1 → C2 */
const LV = [
  { name: "Khởi đầu", hint: "Từ quen thuộc hằng ngày" },
  { name: "Sơ cấp", hint: "Mở rộng giao tiếp" },
  { name: "Trung cấp", hint: "≈ IELTS 4.0 – 5.0" },
  { name: "Trung cấp cao", hint: "≈ IELTS 5.5 – 6.5" },
  { name: "Cao cấp", hint: "≈ IELTS 7.0 – 8.0" },
  { name: "Thành thạo", hint: "≈ IELTS 8.5 – 9.0" },
];
const GX = 1800;
const GY = 330;
const STEP = 102;
const arrive = (k: number) => 60 + k * STEP;
const CARD = 380;
const cardLeft = (j: number) => -630 + j * (CARD + 60);

const Station: React.FC<{ k: number }> = ({ k }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ids = data.levels[k];
  const near = Math.abs((f - arrive(k) - 30) / STEP);
  const on = Math.max(0.35, 1 - near * 0.65);
  return (
    <At x={k * GX} y={-k * GY}>
      <div style={{ position: "absolute", left: -630, top: -560, width: 1260, opacity: on }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 34 }}>
          <div style={{ fontFamily: serif, fontWeight: 700, fontSize: 170, lineHeight: 0.9, color: C.gold, textShadow: "0 0 60px rgba(242,196,109,.45)" }}>{data.cefr[k]}</div>
          <div style={{ paddingBottom: 12 }}>
            <div style={{ fontFamily: serif, fontWeight: 600, fontSize: 64, color: C.cream }}>{LV[k].name}</div>
            <div style={{ fontFamily: sans, fontSize: 30, color: C.dim, marginTop: 4 }}>
              {nf(data.perLevel[k])} từ · {LV[k].hint}
            </div>
          </div>
        </div>
      </div>
      {ids.map((id, j) => {
        const w = byId.get(id)!;
        const p = spring({ frame: f - arrive(k) + 18 - j * 6, fps, config: { damping: 15 } });
        return (
          <div key={id} style={{ position: "absolute", left: cardLeft(j), top: -330, width: CARD, opacity: on * Math.max(0.15, p), transform: `translateY(${(1 - p) * 80}px) rotate(${(j - 1) * 2 * (1 - p)}deg)` }}>
            <div style={{ position: "relative", borderRadius: 26, overflow: "hidden", boxShadow: "0 40px 90px rgba(0,0,0,.55)" }}>
              <Img src={img(id)} style={{ display: "block", width: CARD, height: CARD }} />
              {j === 0 && (
                <div style={{ position: "absolute", right: 18, top: 18, width: 64, height: 64, borderRadius: 32, background: C.gold, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(0,0,0,.4)" }}>
                  <Speaker />
                </div>
              )}
            </div>
            <div style={{ fontFamily: serif, fontWeight: 600, fontSize: 48, color: C.cream, marginTop: 20 }}>{w.word}</div>
            <div style={{ fontFamily: sans, fontSize: 24, color: C.gold, marginTop: 4 }}>{w.ipa}</div>
            <div style={{ fontFamily: sans, fontSize: 26, color: C.dim, marginTop: 8, lineHeight: 1.3 }}>{w.vi}</div>
          </div>
        );
      })}
      <Pointer
        keys={[
          { f: arrive(k) + 4, x: cardLeft(0) + CARD + 160, y: 40 },
          { f: arrive(k) + 22, x: cardLeft(0) + CARD - 50, y: -330 + 50 },
          { f: arrive(k) + 80, x: cardLeft(0) + CARD - 44, y: -330 + 58 },
        ]}
        clicks={[arrive(k) + 26]}
        size={40}
      />
      <div style={{ position: "absolute", left: cardLeft(0) + CARD - 60, top: -330 + 92 }}>
        <Playing from={arrive(k) + 26} to={arrive(k) + 64} x={0} y={0} label="UK" />
      </div>
      <Sequence from={arrive(k) + 26} layout="none">
        <Audio src={voice(`uk-${ids[0]}`)} volume={1} />
      </Sequence>
    </At>
  );
};

const Levels = () => {
  const f = useCurrentFrame();
  const cur = Math.max(0, Math.min(5, Math.floor((f - arrive(0) + 20) / STEP)));
  const keys = [
    { f: 0, x: 2.5 * GX, y: -2.5 * GY - 120, s: 0.19, rz: -4 },
    { f: 36, x: 2.5 * GX, y: -2.5 * GY - 120, s: 0.21, rz: -2 },
    ...[0, 1, 2, 3, 4, 5].flatMap((k) => [
      { f: arrive(k), x: k * GX, y: -k * GY - 150, s: 1.08, ry: k % 2 ? 5 : -5, rz: 0 },
      { f: arrive(k) + 78, x: k * GX + 50, y: -k * GY - 160, s: 1.14, ry: 0, rz: 0 },
    ]),
  ];
  const intro = interpolate(f, [0, 8, 40, 56], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill>
      <Backdrop hue={0.3} />
      <Stars speed={0.0025} opacity={0.7} seed="lv" count={260} />
      <Camera keys={keys} shake={0.5}>
        {[0, 1, 2, 3, 4].map((k) => {
          const x1 = k * GX + 690;
          const y1 = -k * GY;
          const x2 = (k + 1) * GX - 690;
          const y2 = -(k + 1) * GY;
          const len = Math.hypot(x2 - x1, y2 - y1);
          const grow = interpolate(f, [arrive(k) + 40, arrive(k + 1)], [0, 1], clamp);
          return (
            <div key={k} style={{ position: "absolute", left: x1, top: y1, width: len * grow, height: 0, borderTop: `6px dashed ${C.gold}`, opacity: 0.7, transformOrigin: "0 0", transform: `rotate(${Math.atan2(y2 - y1, x2 - x1)}rad)` }} />
          );
        })}
        {[0, 1, 2, 3, 4, 5].map((k) => (
          <Station key={k} k={k} />
        ))}
      </Camera>
      <Vignette />
      <Center style={{ opacity: intro, background: `rgba(5,7,15,${0.55 * intro})` }}>
        <Words text="Hành trình 6 cấp độ" at={2} style={{ fontFamily: serif, fontWeight: 600, fontSize: 120, color: C.cream }} />
        <Words text="Leo từng chặng, từ A1 lên C2" at={12} style={{ fontFamily: serif, fontStyle: "italic", fontSize: 60, color: C.gold, marginTop: 10 }} />
      </Center>
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 54, opacity: 1 - intro }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 18px", borderRadius: 40, background: "rgba(11,16,32,.8)", border: "1px solid rgba(243,236,223,.14)" }}>
          {data.cefr.map((c, k) => (
            <React.Fragment key={c}>
              {k > 0 && <span style={{ width: 50, height: 3, borderRadius: 2, background: k <= cur ? C.gold : "rgba(243,236,223,.2)" }} />}
              <span style={{ fontFamily: sans, fontWeight: 700, fontSize: 26, padding: "8px 18px", borderRadius: 24, color: k === cur ? C.bg : k < cur ? C.gold : C.dim, background: k === cur ? C.gold : "transparent" }}>{c}</span>
            </React.Fragment>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* 5 · Word card: click the speaker and listen */
const WORD_CLICK = 105;
const EX_CLICK = 222;
const WordAudio = () => {
  const f = useCurrentFrame();
  const uk = box("word", 0, { x: 850, y: 240 });
  const ex = box("word", 1, { x: 1236, y: 512 });
  const env = byId.get("environment");
  return (
    <AbsoluteFill>
      <Backdrop />
      <Camera
        keys={[
          { f: 0, x: sx(900), y: sy(210), s: 2.3, rz: -2 },
          { f: 60, x: sx(880), y: sy(215), s: 2.15, rz: 0 },
          { f: 150, x: sx(900), y: sy(240), s: 2.0 },
          { f: 185, x: sx(1000), y: sy(500), s: 1.85, ry: -3 },
          { f: 310, x: sx(1000), y: sy(510), s: 1.75, ry: -4 },
          { f: 375, x: 0, y: 0, s: 1.02, ry: -8 },
        ]}
        shake={0.5}
      >
        <At>
          <Screen
            src="capture/word.png"
            pointer={
              <>
                <Pointer
                  keys={[
                    { f: 36, x: uk.x + 260, y: uk.y + 170 },
                    { f: 92, x: uk.x, y: uk.y },
                    { f: 160, x: uk.x + 6, y: uk.y + 4 },
                    { f: 205, x: ex.x, y: ex.y },
                  ]}
                  clicks={[WORD_CLICK, EX_CLICK]}
                  size={22}
                />
                <Playing from={WORD_CLICK} to={WORD_CLICK + 48} x={uk.x + 120} y={uk.y - 22} label={`UK ${env?.ipa ?? ""}`} />
                <Playing from={EX_CLICK} to={EX_CLICK + 104} x={ex.x - 120} y={ex.y + 30} label="Đang đọc câu ví dụ" />
              </>
            }
          />
        </At>
      </Camera>
      <Vignette />
      {f < 165 ? (
        <Caption key="a" kicker="Bấm loa để nghe" title="Phát âm chuẩn Anh – Anh, Anh – Mỹ" at={14} />
      ) : (
        <Caption key="b" kicker="Nghe cả câu" title="Mỗi câu ví dụ đều có giọng đọc mẫu" at={170} />
      )}
      {[WORD_CLICK, EX_CLICK].map((c) => (
        <Sequence key={c} from={c - 1} durationInFrames={20} layout="none">
          <Audio src={voice("tap")} volume={0.5} />
        </Sequence>
      ))}
      <Sequence from={WORD_CLICK + 3} layout="none">
        <Audio src={voice("uk-environment")} />
      </Sequence>
      <Sequence from={EX_CLICK + 3} layout="none">
        <Audio src={voice("ex-environment")} />
      </Sequence>
    </AbsoluteFill>
  );
};

/* 6 · Today */
const Today = () => {
  const f = useCurrentFrame();
  return (
  <AbsoluteFill>
    <Backdrop />
    <Stars speed={0.0015} opacity={0.5} seed="td" count={160} />
    <Camera
      keys={[
        { f: 0, s: 0.72, rx: 18, ry: -26, rz: 4 },
        { f: 80, s: 0.98, rx: 4, ry: -6, rz: 0 },
        { f: 140, x: sx(420), y: sy(380), s: 1.5, rx: 0, ry: 0 },
        { f: 225, x: sx(1150), y: sy(760), s: 1.7, ry: -4 },
      ]}
    >
      <At>
        <BrowserFrame src="capture/today.png" />
      </At>
    </Camera>
    <Vignette />
    {f < 150 ? (
      <Caption key="a" kicker="Mỗi ngày một chặng" title="Ôn từ cũ, rồi học 10 từ mới" side="right" at={14} />
    ) : (
      <Caption key="b" kicker="Chuỗi ngày học" title="Giữ lửa 12 ngày liên tiếp" side="left" at={150} />
    )}
  </AbsoluteFill>
);
};

/* 7 · Learn: answer recall quizzes, then meet new words */
const Q = [
  { shot: "quiz-0", from: 0, click: 62 },
  { shot: "quiz-1", from: 124, click: 178 },
];
const Learn = () => {
  const f = useCurrentFrame();
  const q = f < Q[1].from ? Q[0] : f < 232 ? Q[1] : null;
  const src = q ? `capture/${q.shot}${f >= q.click + 2 ? "-done" : ""}.png` : "capture/learn-0.png";
  const b0 = box("quiz-0");
  const b1 = box("quiz-1");
  return (
    <AbsoluteFill>
      <Backdrop />
      <Camera
        keys={[
          { f: 0, x: sx(800), y: sy(560), s: 1.55, rz: -1.5, ry: -6 },
          { f: 100, x: sx(800), y: sy(640), s: 1.4, rz: 0, ry: 0 },
          { f: 124, x: sx(800), y: sy(520), s: 1.5, ry: 6 },
          { f: 220, x: sx(800), y: sy(640), s: 1.4, ry: 0 },
          { f: 236, x: 0, y: 0, s: 1.0, ry: -5 },
          { f: 300, x: sx(700), y: sy(420), s: 1.25, ry: 3 },
        ]}
        shake={0.5}
      >
        <At>
          <Screen
            src={src}
            pointer={
              f < 232 && (
                <Pointer
                  keys={[
                    { f: 20, x: b0.x + 300, y: b0.y + 200 },
                    { f: 54, x: b0.x, y: b0.y },
                    { f: 120, x: b0.x + 40, y: b0.y + 30 },
                    { f: 170, x: b1.x, y: b1.y },
                  ]}
                  clicks={[Q[0].click, Q[1].click]}
                  size={24}
                />
              )
            }
          />
        </At>
      </Camera>
      <Vignette />
      {Q.map((x) => (
        <Sequence key={x.click} from={x.click} durationInFrames={45} layout="none">
          <Audio src={voice("correct")} volume={0.7} />
        </Sequence>
      ))}
      {f < 232 ? (
        <Caption key="a" kicker="Học chủ động" title="Nhìn tranh, chọn đúng từ" at={10} />
      ) : (
        <Caption key="b" kicker="Ôn tập ngắt quãng FSRS" title="Nhắc ôn đúng lúc bạn sắp quên" at={236} />
      )}
    </AbsoluteFill>
  );
};

/* 8 · Accent-free search */
const Search = () => {
  const f = useCurrentFrame();
  const shots = ["02", "04", "06", "08", "10"];
  const src = `capture/search-${shots[Math.min(shots.length - 1, Math.max(0, Math.floor((f - 10) / 16)))]}.png`;
  return (
    <AbsoluteFill>
      <Backdrop />
      <Camera
        keys={[
          { f: 0, x: sx(1173), y: sy(225), s: 2.7, rz: 2 },
          { f: 95, s: 2.5, rz: 0 },
          { f: 150, x: 0, y: 0, s: 1.0, ry: 0 },
          { f: 225, s: 1.08, ry: 6, rx: 3 },
        ]}
      >
        <At>
          <BrowserFrame src={src} />
        </At>
      </Camera>
      <Vignette />
      <Caption kicker="Gõ không dấu vẫn tìm ra" title="“moi truong” → môi trường" at={12} />
    </AbsoluteFill>
  );
};

/* 9 · Galaxy */
const topics = data.topics.map((t) => t[1]);
const Galaxy = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lit = useCount(f, 220, 320, 640);
  return (
    <AbsoluteFill style={{ background: "#05060c" }}>
      <Camera
        keys={[
          { f: 0, s: 1.6, rz: -8 },
          { f: 210, s: 1.15, rz: 0 },
          { f: 218, s: 1.3, rz: 4 },
          { f: 450, s: 1.05, rz: 9, y: -20 },
        ]}
        shake={0.4}
      >
        <div style={{ position: "absolute", left: -604, top: -665, width: 1600 * 1.95, height: 900 * 1.95 }}>
          <OffthreadVideo src={staticFile("capture/galaxy.mp4")} startFrom={30} playbackRate={0.85} muted style={{ width: "100%", height: "100%" }} />
        </div>
      </Camera>
      <Stars speed={0.006} warp={interpolate(f, [0, 20], [1, 0], clamp)} opacity={0.8} seed="gx" />
      <AbsoluteFill style={{ transformStyle: "preserve-3d", perspective: 1400 }}>
        {topics.map((t, i) => {
          const z = ((random(`tz${i}`) * 1200 + f * 9) % 1500) - 1100;
          const x = (random(`tx${i}`) * 2 - 1) * 820;
          const y = (i % 2 ? 1 : -1) * (250 + random(`ty${i}`) * 200);
          const o = interpolate(f, [230, 270], [0, 1], clamp) * Math.min(1, (z + 1100) / 300) * Math.min(1, (400 - z) / 200);
          return (
            <div key={t} style={{ position: "absolute", left: 960 + x, top: 540 + y, transform: `translateZ(${z}px)`, fontFamily: sans, fontWeight: 600, fontSize: 30, color: C.cream, padding: "10px 22px", borderRadius: 40, background: "rgba(30,38,64,.7)", border: "1px solid rgba(242,196,109,.4)", opacity: Math.max(0, o), whiteSpace: "nowrap" }}>
              {t}
            </div>
          );
        })}
      </AbsoluteFill>
      <Vignette />
      <AbsoluteFill style={{ background: "radial-gradient(42% 30% at 50% 50%, rgba(5,6,12,.72), transparent 100%)" }} />
      <Center>
        <div style={{ opacity: interpolate(f, [200, 218], [1, 0], clamp), textShadow: "0 0 50px rgba(242,196,109,.5)" }}>
          <Words text="Học một từ," at={24} style={{ fontFamily: serif, fontWeight: 600, fontSize: 124, color: C.cream }} />
          <Words text="thắp sáng một ngôi sao." at={46} style={{ fontFamily: serif, fontWeight: 600, fontSize: 124, color: C.gold }} />
        </div>
      </Center>
      <Center style={{ opacity: spring({ frame: f - 218, fps, config: { damping: 20 } }) }}>
        <div style={{ fontFamily: serif, fontWeight: 700, fontSize: 200, color: C.gold, textShadow: "0 0 70px rgba(242,196,109,.6)", fontVariantNumeric: "tabular-nums" }}>{nf(lit)}</div>
        <div style={{ fontFamily: sans, fontSize: 40, color: C.cream, letterSpacing: 1 }}>/ {nf(data.count)} ngôi sao đã sáng · {topics.length} chủ đề IELTS</div>
      </Center>
    </AbsoluteFill>
  );
};

/* 10 · Practice */
const Practice = () => (
  <AbsoluteFill>
    <Backdrop hue={0.4} />
    <Camera
      keys={[
        { f: 0, x: -520, s: 1.5, ry: 10 },
        { f: 90, x: -520, s: 1.35, ry: 4 },
        { f: 135, x: 520, s: 1.35, ry: -4 },
        { f: 225, x: 520, s: 1.5, ry: -10 },
      ]}
    >
      <At x={-520} ry={16} s={0.6}>
        <BrowserFrame src="capture/practice.png" />
      </At>
      <At x={520} ry={-16} s={0.6}>
        <BrowserFrame src="capture/typing.png" />
      </At>
    </Camera>
    <Vignette />
    <Caption kicker="Luyện tập" title="Nghe, gõ lại, nhớ luôn chính tả" side="center" at={10} bottom={70} />
  </AbsoluteFill>
);

/* 11 · Mobile */
const Mobile = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const phones = ["m-atlas", "m-today", "m-word"];
  return (
    <AbsoluteFill>
      <Backdrop />
      <Stars speed={0.002} opacity={0.6} seed="mb" count={180} />
      <Camera keys={[{ f: 0, s: 0.9, ry: -18, y: 60 }, { f: 225, s: 1.0, ry: 14, y: 40 }]} shake={0.6}>
        {phones.map((p, i) => {
          const s = spring({ frame: f - i * 6, fps, config: { damping: 15 } });
          return (
            <At key={p} x={(i - 1) * 500} y={110 + Math.sin(f / 24 + i) * 14 + (1 - s) * 500} z={i === 1 ? 140 : 0} ry={(1 - i) * 10} s={0.86}>
              <Phone src={`capture/${p}.png`} />
            </At>
          );
        })}
      </Camera>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(11,16,32,.9), transparent 28%)" }} />
      <Center style={{ justifyContent: "flex-start", paddingTop: 60 }}>
        <Words text="Mở trình duyệt là học được" at={6} style={{ fontFamily: serif, fontWeight: 600, fontSize: 74, color: C.cream }} />
        <div style={{ display: "flex", gap: 18, marginTop: 22 }}>
          {["Không cần tài khoản", "Tiến độ lưu trên máy bạn", "Miễn phí · mã nguồn mở"].map((t, i) => {
            const p = spring({ frame: f - 26 - i * 8, fps, config: { damping: 14 } });
            return (
              <div key={t} style={{ opacity: p, transform: `scale(${0.6 + p * 0.4})`, fontFamily: sans, fontWeight: 600, fontSize: 28, color: C.bg, background: i === 1 ? C.gold : C.cream, padding: "12px 26px", borderRadius: 40 }}>
                {t}
              </div>
            );
          })}
        </div>
      </Center>
    </AbsoluteFill>
  );
};

/* 12 · Outro */
const Outro = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const draw = interpolate(f, [0, 40], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const t = spring({ frame: f - 20, fps, config: { damping: 18 } });
  const out = interpolate(f, [300, 358], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ opacity: out }}>
      <Backdrop hue={0.6} />
      <AbsoluteFill style={{ filter: "blur(6px)", opacity: 0.22 }}>
        <Camera keys={[{ f: 0, s: 1.3, rz: -6 }, { f: 360, s: 1.0, rz: 0 }]}>
          <At>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 240px)", gap: 24 }}>
              {Array.from({ length: 40 }, (_, i) => (
                <Img key={i} src={img(W[(i * 7) % W.length].id)} style={{ width: 240, height: 240, borderRadius: 20 }} />
              ))}
            </div>
          </At>
        </Camera>
      </AbsoluteFill>
      <Stars speed={0.0018} seed="out" />
      <Center>
        <div style={{ transform: `scale(${0.8 + draw * 0.2})`, filter: `drop-shadow(0 0 40px rgba(242,196,109,${draw * 0.4}))` }}>
          <Emblem size={210} draw={draw} />
        </div>
        <div style={{ fontFamily: serif, fontWeight: 600, fontSize: 150, color: C.cream, marginTop: 20, opacity: t, letterSpacing: interpolate(t, [0, 1], [24, 0]) }}>7000 Từ IELTS</div>
        <div style={{ fontFamily: sans, fontWeight: 600, fontSize: 26, letterSpacing: 10, color: C.gold, marginTop: 6, opacity: t }}>HỌC QUA TRANH</div>
        <Words text="Mỗi từ một bức tranh, thắp sáng IELTS" at={45} style={{ fontFamily: serif, fontStyle: "italic", fontSize: 54, color: C.dim, marginTop: 34 }} />
        <div style={{ opacity: spring({ frame: f - 80, fps }), marginTop: 50, fontFamily: sans, fontWeight: 700, fontSize: 54, letterSpacing: 2, color: C.bg, background: C.gold, padding: "16px 48px", borderRadius: 60, boxShadow: "0 0 60px rgba(242,196,109,.45)" }}>
          kimcuongdo.com
        </div>
        <div style={{ opacity: spring({ frame: f - 100, fps }), marginTop: 22, fontFamily: sans, fontSize: 28, color: C.dim }}>
          Miễn phí · không cần tài khoản · học ngay trên trình duyệt
        </div>
      </Center>
    </AbsoluteFill>
  );
};

const SHOTS: [React.FC, number, number][] = [
  [Hook, 0, 4],
  [Splash, 4, 3],
  [Stats, 7, 4],
  [Levels, 11, 9],
  [WordAudio, 20, 5],
  [Today, 25, 3],
  [Learn, 28, 4],
  [Search, 32, 3],
  [Galaxy, 35, 6],
  [Practice, 41, 3],
  [Mobile, 44, 3],
  [Outro, 47, 4],
];

// Frames where a voice plays; the music dips under them.
const VOICES: [number, number][] = [
  [start(4) + 66, 70],
  ...[0, 1, 2, 3, 4, 5].map((k): [number, number] => [start(11) + arrive(k) + 26, 36]),
  [start(20) + WORD_CLICK, 44],
  [start(20) + EX_CLICK, 104],
];
const musicVolume = (f: number) =>
  VOICES.reduce((v, [a, d]) => Math.min(v, interpolate(f, [a - 6, a + 2, a + d, a + d + 12], [1, 0.4, 0.4, 1], clamp)), 1);

export const Intro: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    {SHOTS.map(([S, bar, len], i) => {
      const from = start(bar);
      const end = i === SHOTS.length - 1 ? TOTAL : (bar + len) * BAR + X;
      return (
        <Sequence key={i} from={from} durationInFrames={end - from} premountFor={30}>
          <Shot inF={i ? 2 * X : 0} outF={i === SHOTS.length - 1 ? 0 : 2 * X} dir={i % 2 ? -1 : 1}>
            <S />
          </Shot>
        </Sequence>
      );
    })}
    {[7, 11, 35, 47].map((b) => (
      <Flash key={b} at={b * BAR} strength={b === 35 ? 0.9 : 0.7} />
    ))}
    <Grain />
    <Audio src={staticFile("music.wav")} volume={musicVolume} />
    <Sequence from={start(4) + 66}>
      <Audio src={staticFile("splash-voice.mp3")} volume={0.9} />
    </Sequence>
  </AbsoluteFill>
);

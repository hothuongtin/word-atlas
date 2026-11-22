import React from "react";
import { AbsoluteFill, Audio, Easing, Img, interpolate, OffthreadVideo, random, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import data from "./words.json";
import { At, Backdrop, BrowserFrame, C, Camera, Caption, clamp, Emblem, Flash, Grain, Phone, sans, serif, Shot, Stars, Vignette, Words } from "./lib";

// 96 BPM: one bar = 2.5 s = 75 frames. Cuts land on bars so they match the score in scripts/music.py.
const BAR = 75;
const X = 6;
export const TOTAL = BAR * 24 + 60;
const nf = (n: number) => n.toLocaleString("vi-VN");

const W = data.words;
const img = (id: string) => staticFile(`words/${id}.webp`);

const Center: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center", ...style }}>{children}</AbsoluteFill>
);

/* 1 · Hook */
const Hook = () => {
  const f = useCurrentFrame();
  const ring = W.slice(0, 10);
  const second = f > 78;
  return (
    <AbsoluteFill>
      <Backdrop />
      <Stars speed={0.0025} />
      <Camera keys={[{ f: 0, s: 1.25, rz: -4 }, { f: 150, s: 1, rz: 2 }]} shake={0.6}>
        <AbsoluteFill style={{ transformStyle: "preserve-3d" }}>
          {ring.map((w, i) => {
            const a = (i / ring.length) * Math.PI * 2 + f / 60;
            const appear = spring({ frame: f - 70 - i * 2, fps: 30, config: { damping: 14 } });
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
            <Words text="Học từ vựng IELTS" at={8} style={{ fontFamily: serif, fontWeight: 600, fontSize: 120, color: C.cream }} />
            <Words text="mà cứ học trước quên sau?" at={22} style={{ fontFamily: serif, fontStyle: "italic", fontWeight: 500, fontSize: 84, color: C.dim, marginTop: 12 }} />
          </div>
        ) : (
          <div>
            <Words text="Thử nhớ từ" at={80} style={{ fontFamily: serif, fontWeight: 600, fontSize: 130, color: C.cream }} />
            <Words text="bằng hình ảnh." at={92} style={{ fontFamily: serif, fontWeight: 600, fontSize: 130, color: C.gold }} />
          </div>
        )}
      </Center>
    </AbsoluteFill>
  );
};

/* 2 · The app's own splash */
const Splash = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    <Camera keys={[{ f: 0, s: 1.35, y: -40 }, { f: 160, s: 1.05, y: 0 }]} shake={0.4}>
      <AbsoluteFill>
        <OffthreadVideo src={staticFile("capture/splash.mp4")} startFrom={24} muted style={{ width: 1920, height: 1080 }} />
      </AbsoluteFill>
    </Camera>
    <Stars speed={0.004} opacity={0.6} seed="sp" count={140} />
  </AbsoluteFill>
);

/* 3 · Word wall flythrough */
const Wall = () => {
  const f = useCurrentFrame();
  const cols = 9;
  const n = useCount(f, 10, 80, data.count);
  return (
    <AbsoluteFill>
      <Backdrop hue={0.5} />
      <Camera keys={[{ f: 0, y: 700, s: 0.9, rx: 0, rz: -10 }, { f: 160, y: -250, s: 1.05, rz: 6 }]} shake={0.5}>
        <At rx={52} s={1}>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 260px)`, gap: 26, transformStyle: "preserve-3d" }}>
            {Array.from({ length: cols * 8 }, (_, i) => {
              const w = W[i % W.length];
              const lift = Math.max(0, Math.sin(f / 14 + i * 1.7)) ** 6;
              return (
                <div key={i} style={{ transform: `translateZ(${lift * 60}px)`, borderRadius: 20, overflow: "hidden", background: "#121831", boxShadow: "0 20px 50px rgba(0,0,0,.5)", opacity: 0.75 + lift * 0.25 }}>
                  <Img src={img(w.id)} style={{ display: "block", width: 260, height: 260 }} />
                  <div style={{ padding: "12px 16px", fontFamily: serif, fontSize: 26, color: C.cream }}>
                    {w.word}
                    <div style={{ fontFamily: sans, fontSize: 16, color: C.dim, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{w.vi.replace(/^\w+\.\s*/, "")}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </At>
      </Camera>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(11,16,32,.85) 0%, rgba(11,16,32,.2) 45%, rgba(11,16,32,.7) 100%)" }} />
      <AbsoluteFill style={{ background: "radial-gradient(50% 32% at 50% 28%, rgba(5,7,15,.8), transparent 100%)" }} />
      <Center style={{ justifyContent: "flex-start", paddingTop: 150 }}>
        <div style={{ fontFamily: serif, fontWeight: 700, fontSize: 190, color: C.gold, lineHeight: 1, fontVariantNumeric: "tabular-nums", textShadow: "0 10px 60px rgba(242,196,109,.35)" }}>{nf(n)}</div>
        <Words text="từ vựng IELTS · mỗi từ một bức tranh" at={30} style={{ fontFamily: serif, fontSize: 64, color: C.cream, marginTop: 10 }} />
      </Center>
    </AbsoluteFill>
  );
};

function useCount(f: number, a: number, b: number, to: number) {
  return Math.round(interpolate(f, [a, b], [0, to], { ...clamp, easing: Easing.out(Easing.cubic) }));
}

// Browser frame (1600×944) centred on the stage; helpers convert screenshot coords (1600×900) to stage coords.
const sx = (x: number) => x - 800;
const sy = (y: number) => y + 44 - 472;

/* 4 · Word card */
const Word = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Backdrop />
      <Camera
        keys={[
          { f: 0, x: sx(515), y: sy(267), s: 2.4, rz: -3 },
          { f: 45, s: 2.1, rz: 0 },
          { f: 80, x: sx(905), y: sy(200), s: 1.9 },
          { f: 118, x: sx(1000), y: sy(470), s: 1.6, ry: -4 },
          { f: 162, x: 0, y: 0, s: 1.02, ry: -8 },
        ]}
      >
        <At>
          <BrowserFrame src={f < 110 ? "capture/word.png" : "capture/word-2.png"} />
        </At>
      </Camera>
      <Vignette />
      <Sequence from={10} layout="none">
        <Caption key="a" kicker="Tranh minh họa gốc" title={f < 70 ? "Nhìn tranh là nhớ ra từ" : f < 112 ? "Phát âm Anh – Anh & Anh – Mỹ" : "Nghĩa Việt và ví dụ song ngữ"} at={0} />
      </Sequence>
    </AbsoluteFill>
  );
};

/* 5 · Today */
const Today = () => (
  <AbsoluteFill>
    <Backdrop />
    <Stars speed={0.0015} opacity={0.5} seed="td" count={160} />
    <Camera
      keys={[
        { f: 0, s: 0.72, rx: 18, ry: -26, rz: 4 },
        { f: 70, s: 0.98, rx: 4, ry: -6, rz: 0 },
        { f: 160, x: sx(400), y: sy(360), s: 1.55, rx: 0, ry: 0 },
      ]}
    >
      <At>
        <BrowserFrame src="capture/today.png" />
      </At>
    </Camera>
    <Vignette />
    <Caption kicker="Hành trình mỗi ngày" title="10 từ mới · chỉ khoảng 9 phút" side="right" at={14} />
  </AbsoluteFill>
);

/* 6 · Learn deck */
const Learn = () => {
  const f = useCurrentFrame();
  const gap = 1400;
  const keys = [0, 1, 2, 3].flatMap((i) => [
    { f: i * 40, x: i * gap, y: -40, s: 1.05, ry: i % 2 ? 6 : -6 },
    { f: i * 40 + 26, x: i * gap, s: 1.2 },
  ]);
  return (
    <AbsoluteFill>
      <Backdrop />
      <Camera keys={keys} shake={0.6}>
        {[0, 1, 2, 3].map((i) => {
          const d = Math.abs(f / 40 - i);
          return (
            <At key={i} x={i * gap} ry={(f / 40 - i) * -14} z={-d * 300} s={0.9}>
              <div style={{ opacity: Math.max(0.35, 1 - d * 0.5) }}>
                <BrowserFrame src={`capture/learn-${i}.png`} glow={d < 0.5} />
              </div>
            </At>
          );
        })}
      </Camera>
      <Vignette />
      <Caption kicker="Ôn tập ngắt quãng FSRS" title="Học chủ động, ôn đúng lúc sắp quên" at={10} />
    </AbsoluteFill>
  );
};

/* 7 · Accent-free search */
const Search = () => {
  const f = useCurrentFrame();
  const shots = ["02", "04", "06", "08", "10"];
  const src = `capture/search-${shots[Math.min(shots.length - 1, Math.max(0, Math.floor((f - 6) / 9)))]}.png`;
  return (
    <AbsoluteFill>
      <Backdrop />
      <Camera
        keys={[
          { f: 0, x: sx(1173), y: sy(225), s: 2.7, rz: 2 },
          { f: 60, s: 2.5, rz: 0 },
          { f: 110, x: 0, y: 0, s: 1.0, ry: 0 },
          { f: 162, s: 1.08, ry: 6, rx: 3 },
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

/* 8 · Galaxy */
const topics = data.topics.map((t) => t[1]);
const Galaxy = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lit = useCount(f, 150, 230, 640);
  return (
    <AbsoluteFill style={{ background: "#05060c" }}>
      <Camera
        keys={[
          { f: 0, s: 1.6, rz: -8 },
          { f: 150, s: 1.15, rz: 0 },
          { f: 156, s: 1.3, rz: 4 },
          { f: 312, s: 1.05, rz: 9, y: -20 },
        ]}
        shake={0.4}
      >
        <div style={{ position: "absolute", left: -604, top: -665, width: 1600 * 1.95, height: 900 * 1.95 }}>
          <OffthreadVideo src={staticFile("capture/galaxy.mp4")} startFrom={30} muted style={{ width: "100%", height: "100%" }} />
        </div>
      </Camera>
      <Stars speed={0.006} warp={interpolate(f, [0, 20], [1, 0], clamp)} opacity={0.8} seed="gx" />
      <AbsoluteFill style={{ transformStyle: "preserve-3d", perspective: 1400 }}>
        {topics.map((t, i) => {
          const z = ((random(`tz${i}`) * 1200 + f * 9) % 1500) - 1100;
          const x = (random(`tx${i}`) * 2 - 1) * 820;
          const y = (i % 2 ? 1 : -1) * (250 + random(`ty${i}`) * 200);
          const o = interpolate(f, [160, 200], [0, 1], clamp) * Math.min(1, (z + 1100) / 300) * Math.min(1, (400 - z) / 200);
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
        <div style={{ opacity: interpolate(f, [140, 158], [1, 0], clamp), textShadow: "0 0 50px rgba(242,196,109,.5)" }}>
          <Words text="Học một từ," at={18} style={{ fontFamily: serif, fontWeight: 600, fontSize: 124, color: C.cream }} />
          <Words text="thắp sáng một ngôi sao." at={32} style={{ fontFamily: serif, fontWeight: 600, fontSize: 124, color: C.gold }} />
        </div>
      </Center>
      <Center style={{ opacity: spring({ frame: f - 156, fps, config: { damping: 20 } }) }}>
        <div style={{ fontFamily: serif, fontWeight: 700, fontSize: 200, color: C.gold, textShadow: "0 0 70px rgba(242,196,109,.6)", fontVariantNumeric: "tabular-nums" }}>{nf(lit)}</div>
        <div style={{ fontFamily: sans, fontSize: 40, color: C.cream, letterSpacing: 1 }}>/ {nf(data.count)} ngôi sao đã sáng · {topics.length} chủ đề IELTS</div>
      </Center>
    </AbsoluteFill>
  );
};

/* 9 · Practice */
const Practice = () => (
  <AbsoluteFill>
    <Backdrop hue={0.4} />
    <Camera
      keys={[
        { f: 0, x: -520, s: 1.5, ry: 10 },
        { f: 60, x: -520, s: 1.35, ry: 4 },
        { f: 100, x: 520, s: 1.35, ry: -4 },
        { f: 162, x: 520, s: 1.5, ry: -10 },
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

/* 10 · Mobile */
const Mobile = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const phones = ["m-atlas", "m-today", "m-word"];
  return (
    <AbsoluteFill>
      <Backdrop />
      <Stars speed={0.002} opacity={0.6} seed="mb" count={180} />
      <Camera keys={[{ f: 0, s: 0.9, ry: -18, y: 60 }, { f: 162, s: 1.0, ry: 14, y: 40 }]} shake={0.6}>
        {phones.map((p, i) => {
          const s = spring({ frame: f - i * 6, fps, config: { damping: 15 } });
          return (
            <At key={p} x={(i - 1) * 500} y={110 + Math.sin(f / 18 + i) * 14 + (1 - s) * 500} z={i === 1 ? 140 : 0} ry={(1 - i) * 10} s={0.86}>
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

/* 11 · Outro */
const Outro = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const draw = interpolate(f, [0, 40], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const t = spring({ frame: f - 20, fps, config: { damping: 18 } });
  const out = interpolate(f, [180, 222], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ opacity: out }}>
      <Backdrop hue={0.6} />
      <AbsoluteFill style={{ filter: "blur(6px)", opacity: 0.22 }}>
        <Camera keys={[{ f: 0, s: 1.3, rz: -6 }, { f: 220, s: 1.0, rz: 0 }]}>
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
        <div style={{ opacity: spring({ frame: f - 80, fps }), marginTop: 50, fontFamily: sans, fontWeight: 500, fontSize: 30, color: C.cream, padding: "14px 34px", borderRadius: 40, border: "1px solid rgba(243,236,223,.35)" }}>
          github.com/thuongtin/word-atlas
        </div>
      </Center>
    </AbsoluteFill>
  );
};

const SHOTS: [React.FC, number, number][] = [
  [Hook, 0, 2],
  [Splash, 2, 2],
  [Wall, 4, 2],
  [Word, 6, 2],
  [Today, 8, 2],
  [Learn, 10, 2],
  [Search, 12, 2],
  [Galaxy, 14, 4],
  [Practice, 18, 2],
  [Mobile, 20, 2],
  [Outro, 22, 3],
];

export const Intro: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    {SHOTS.map(([S, bar, len], i) => {
      const from = Math.max(0, bar * BAR - X);
      const end = i === SHOTS.length - 1 ? TOTAL : (bar + len) * BAR + X;
      return (
        <Sequence key={i} from={from} durationInFrames={end - from} premountFor={30}>
          <Shot inF={i ? 2 * X : 0} outF={i === SHOTS.length - 1 ? 0 : 2 * X} dir={i % 2 ? -1 : 1}>
            <S />
          </Shot>
        </Sequence>
      );
    })}
    <Flash at={4 * BAR} />
    <Flash at={14 * BAR} strength={0.9} />
    <Flash at={22 * BAR} />
    <Grain />
    <Audio src={staticFile("music.wav")} />
    <Sequence from={2 * BAR + 60}>
      <Audio src={staticFile("splash-voice.mp3")} volume={0.9} />
    </Sequence>
  </AbsoluteFill>
);

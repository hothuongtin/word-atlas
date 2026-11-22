import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadSerif } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadSans } from "@remotion/google-fonts/BeVietnamPro";

export const serif = loadSerif("normal", { weights: ["500", "600", "700"], subsets: ["latin", "latin-ext", "vietnamese"] }).fontFamily;
export const sans = loadSans("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin", "latin-ext", "vietnamese"] }).fontFamily;

export const C = { bg: "#0B1020", navy: "#1E2640", cream: "#F3ECDF", coral: "#E07A5A", gold: "#F2C46D", dim: "rgba(243,236,223,.66)" };

const ease = Easing.bezier(0.65, 0, 0.35, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export type Key = { f: number; x?: number; y?: number; s?: number; rx?: number; ry?: number; rz?: number };
const PROPS = ["x", "y", "s", "rx", "ry", "rz"] as const;
const DEF = { x: 0, y: 0, s: 1, rx: 0, ry: 0, rz: 0 };

function sample(keys: Key[], f: number) {
  const full: Required<Key>[] = [];
  keys.forEach((k, i) => full.push({ ...(i ? full[i - 1] : DEF), ...k } as Required<Key>));
  const at = full.map((k) => k.f);
  const out = { ...DEF };
  for (const p of PROPS) out[p] = full.length > 1 ? interpolate(f, at, full.map((k) => k[p]), { ...clamp, easing: ease }) : full[0][p];
  return out;
}

/** A virtual camera: `x,y` is the stage point kept centred, `s` the zoom, r* the orbit in degrees. */
export const Camera: React.FC<{ keys: Key[]; shake?: number; children: React.ReactNode }> = ({ keys, shake = 1, children }) => {
  const f = useCurrentFrame();
  const c = sample(keys, f);
  const p = sample(keys, f - 1);
  const speed = Math.hypot((c.x - p.x) * c.s, (c.y - p.y) * c.s) + Math.abs(c.s - p.s) * 600;
  const hx = shake * (Math.sin(f / 23) * 4 + Math.sin(f / 9.7) * 1.5);
  const hy = shake * (Math.cos(f / 19) * 3 + Math.sin(f / 11.3) * 1.2);
  return (
    <AbsoluteFill style={{ perspective: 2000, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          transformStyle: "preserve-3d",
          transform: `translate(${hx}px, ${hy}px) rotateX(${c.rx}deg) rotateY(${c.ry}deg) rotateZ(${c.rz}deg) scale(${c.s}) translate(${-c.x}px, ${-c.y}px)`,
          filter: speed > 6 ? `blur(${Math.min(4, (speed - 6) / 10)}px)` : undefined,
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Places children centred at stage point (x, y) relative to the frame centre. */
export const At: React.FC<{ x?: number; y?: number; z?: number; rx?: number; ry?: number; rz?: number; s?: number; children: React.ReactNode }> = ({ x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1, children }) => (
  <div
    style={{
      position: "absolute",
      left: 960 + x,
      top: 540 + y,
      transformStyle: "preserve-3d",
      transform: `translate(-50%, -50%) translateZ(${z}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${s})`,
    }}
  >
    {children}
  </div>
);

export const Backdrop: React.FC<{ hue?: number }> = ({ hue = 0 }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 50% 40%, #1b2444 0%, ${C.bg} 60%, #05070f 100%)` }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(40% 50% at ${30 + Math.sin(f / 70) * 20}% ${40 + Math.cos(f / 90) * 15}%, rgba(224,122,90,${0.16 + hue * 0.1}), transparent 70%),
            radial-gradient(45% 55% at ${70 + Math.cos(f / 80) * 18}% ${60 + Math.sin(f / 60) * 15}%, rgba(90,120,224,.18), transparent 70%)`,
        }}
      />
    </AbsoluteFill>
  );
};

/** Deterministic star field flying toward the viewer; `warp` stretches stars into streaks. */
export const Stars: React.FC<{ speed?: number; warp?: number; count?: number; seed?: string; opacity?: number }> = ({ speed = 0.002, warp = 0, count = 320, seed = "s", opacity = 1 }) => {
  const f = useCurrentFrame();
  const stars = [];
  for (let i = 0; i < count; i++) {
    const x = random(`${seed}x${i}`) * 2 - 1;
    const y = random(`${seed}y${i}`) * 2 - 1;
    const z0 = random(`${seed}z${i}`);
    const z = ((z0 - f * speed) % 1 + 1) % 1 + 0.02;
    const z2 = z + 0.015 + warp * 0.08;
    const px = 960 + (x / z) * 420, py = 540 + (y / z) * 420;
    const qx = 960 + (x / z2) * 420, qy = 540 + (y / z2) * 420;
    const a = Math.min(1, (1 - z) * 2) * Math.min(1, z * 8) * opacity;
    const r = (1.02 - z) * 2.6;
    const warm = random(`${seed}c${i}`) > 0.8;
    const col = warm ? C.gold : C.cream;
    stars.push(
      warp > 0.05 ? (
        <line key={i} x1={px} y1={py} x2={qx} y2={qy} stroke={col} strokeWidth={r} strokeLinecap="round" opacity={a} />
      ) : (
        <circle key={i} cx={px} cy={py} r={r} fill={col} opacity={a * (0.6 + 0.4 * Math.sin(f / 7 + i))} />
      ),
    );
  }
  return (
    <AbsoluteFill>
      <svg width={1920} height={1080}>{stars}</svg>
    </AbsoluteFill>
  );
};

export const Grain: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "overlay", opacity: 0.22 }}>
      <svg width={1920} height={1080}>
        <filter id="g">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={f % 30} />
          <feColorMatrix values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 .6 0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#g)" />
      </svg>
    </AbsoluteFill>
  );
};

export const Vignette: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: "none", background: "radial-gradient(85% 85% at 50% 50%, transparent 55%, rgba(0,0,0,.6) 100%)" }} />
);

/** Fades/blurs a shot in and out so overlapping sequences read as a camera whip. */
export const Shot: React.FC<{ children: React.ReactNode; inF?: number; outF?: number; dir?: number }> = ({ children, inF = 12, outF = 12, dir = 1 }) => {
  const f = useCurrentFrame();
  const { durationInFrames: d } = useVideoConfig();
  const a = inF ? interpolate(f, [0, inF], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) }) : 1;
  const b = outF ? interpolate(f, [d - outF, d], [1, 0], { ...clamp, easing: Easing.in(Easing.cubic) }) : 1;
  const blur = (1 - a) * 18 + (1 - b) * 18;
  return (
    <AbsoluteFill
      style={{
        opacity: Math.min(a, b),
        transform: `scale(${1 + (1 - a) * 0.12 + (1 - b) * 0.1}) translateX(${((1 - a) * 80 - (1 - b) * 80) * dir}px)`,
        filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** Word-by-word reveal with a soft spring rise. */
export const Words: React.FC<{ text: string; at?: number; stagger?: number; style?: React.CSSProperties; color?: (i: number) => string | undefined }> = ({ text, at = 0, stagger = 3, style, color }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: "0.26em", ...style }}>
      {text.split(" ").map((w, i) => {
        const p = spring({ frame: f - at - i * stagger, fps, config: { damping: 16, mass: 0.7 } });
        return (
          <span key={i} style={{ display: "inline-block", opacity: p, transform: `translateY(${(1 - p) * 0.6}em) rotateX(${(1 - p) * 60}deg)`, filter: `blur(${(1 - p) * 10}px)`, color: color?.(i) }}>
            {w}
          </span>
        );
      })}
    </div>
  );
};

export const BrowserFrame: React.FC<{ src: string; width?: number; glow?: boolean }> = ({ src, width = 1600, glow = true }) => (
  <div
    style={{
      width,
      borderRadius: 26,
      overflow: "hidden",
      background: "#0d1222",
      border: "1px solid rgba(243,236,223,.16)",
      boxShadow: glow ? "0 60px 140px rgba(0,0,0,.65), 0 0 0 1px rgba(0,0,0,.4), 0 0 120px rgba(224,122,90,.12)" : "0 40px 90px rgba(0,0,0,.55)",
    }}
  >
    <div style={{ height: 44, display: "flex", alignItems: "center", gap: 9, padding: "0 20px", background: "#141a2e", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
      {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
        <span key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c, opacity: 0.85 }} />
      ))}
      <div style={{ margin: "0 auto", padding: "6px 22px", borderRadius: 10, background: "rgba(255,255,255,.06)", color: C.dim, fontFamily: sans, fontSize: 15 }}>7000 Từ IELTS · Học qua tranh</div>
    </div>
    <Img src={staticFile(src)} style={{ display: "block", width, height: (width * 9) / 16 }} />
  </div>
);

export const Phone: React.FC<{ src: string; width?: number }> = ({ src, width = 390 }) => (
  <div style={{ width: width + 24, padding: 12, borderRadius: 64, background: "linear-gradient(160deg,#2a3048,#0a0d18)", boxShadow: "0 60px 120px rgba(0,0,0,.6), inset 0 0 0 2px rgba(255,255,255,.08)" }}>
    <div style={{ position: "relative", borderRadius: 52, overflow: "hidden" }}>
      <Img src={staticFile(src)} style={{ display: "block", width, height: (width * 2532) / 1170 }} />
      <div style={{ position: "absolute", top: 12, left: "50%", width: 120, height: 34, marginLeft: -60, borderRadius: 20, background: "#000" }} />
    </div>
  </div>
);

/** Lower-third caption: small kicker plus a bold line. */
export const Caption: React.FC<{ kicker: string; title: string; at?: number; side?: "left" | "right" | "center"; bottom?: number }> = ({ kicker, title, at = 0, side = "left", bottom = 90 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: f - at, fps, config: { damping: 18 } });
  const align = side === "center" ? "center" : side === "left" ? "flex-start" : "flex-end";
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: align, padding: `0 120px ${bottom}px`, background: `linear-gradient(0deg, rgba(5,7,15,${0.92 * p}) 0%, rgba(5,7,15,${0.6 * p}) 22%, transparent 42%)` }}>
      <div style={{ opacity: p, transform: `translateY(${(1 - p) * 40}px)`, textAlign: side === "center" ? "center" : side }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 12, fontFamily: sans, fontWeight: 600, fontSize: 24, letterSpacing: 4, textTransform: "uppercase", color: C.gold }}>
          <span style={{ width: 40 * p, height: 2, background: C.coral }} />
          {kicker}
        </div>
        <div style={{ fontFamily: serif, fontWeight: 600, fontSize: 66, lineHeight: 1.1, color: C.cream, marginTop: 10, textShadow: "0 6px 40px rgba(0,0,0,.7)" }}>{title}</div>
      </div>
    </AbsoluteFill>
  );
};

export const Emblem: React.FC<{ size?: number; draw?: number }> = ({ size = 200, draw = 1 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="11" fill="none" stroke={C.cream} strokeWidth="1.2" strokeDasharray={70} strokeDashoffset={70 * (1 - draw)} transform="rotate(-90 16 16)" />
    <g style={{ transformOrigin: "16px 16px", transform: `scale(${draw}) rotate(${(1 - draw) * -180}deg)` }}>
      <path d="M16 5 18.6 16 16 27 13.4 16Z" fill={C.cream} />
      <path d="M16 5 18.6 16H13.4Z" fill={C.coral} />
      <circle cx="16" cy="16" r="1.5" fill={C.navy} />
    </g>
  </svg>
);

export const Flash: React.FC<{ at: number; strength?: number }> = ({ at, strength = 0.7 }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [at - 2, at, at + 18], [0, strength, 0], clamp);
  if (o <= 0) return null;
  return <AbsoluteFill style={{ pointerEvents: "none", background: `radial-gradient(60% 60% at 50% 50%, rgba(255,236,200,${o}), rgba(242,196,109,${o * 0.4}) 50%, transparent 80%)`, mixBlendMode: "screen" }} />;
};

export { clamp, ease };

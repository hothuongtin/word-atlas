import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { duck, playFile, preloadFiles } from "../lib/sound";
import { APP_KICKER, APP_NAME } from "../config";
import { dayKey, store } from "../store/store";
import { Mark } from "./Logo";

const SEEN_KEY = "word-atlas:splash";
const PALETTE: [string, number][] = [
  ["243,236,223", 0.58],
  ["230,180,87", 0.16],
  ["229,124,90", 0.12],
  ["151,184,142", 0.08],
  ["143,178,204", 0.06],
];

export function shouldShowSplash() {
  if (!store.get().settings.splash) return false;
  const h = location.hash.replace(/^#\/?/, "");
  if (h && !h.startsWith("?")) return false; // deep links go straight to content
  try {
    return localStorage.getItem(SEEN_KEY) !== dayKey();
  } catch {
    return true;
  }
}

interface P {
  x: number;
  y: number;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  vx: number;
  vy: number;
  c: string;
  r: number;
  d: number;
  a: number;
  tw: number;
}

const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

/**
 * Sample the compass mark (the same shapes as <Mark>, viewBox 32) drawn into `box`,
 * so the dust gathers into exactly the emblem that then lights up on top of it.
 */
function targets(w: number, h: number, box: DOMRect, count: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  const k = box.width / 32;
  g.setTransform(k, 0, 0, k, box.left, box.top);
  g.fillStyle = g.strokeStyle = "#fff";
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(16, 16, 14.5, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 0.75;
  g.setLineDash([1.2, 2.2]);
  g.beginPath();
  g.arc(16, 16, 10.5, 0, Math.PI * 2);
  g.stroke();
  g.fill(new Path2D("M16 3.5 19 16 16 28.5 13 16Z"));
  g.fill(new Path2D("M3.5 16 16 13.4 28.5 16 16 18.6Z"));
  const data = g.getImageData(0, 0, w, h).data;
  // Take every lit pixel, then a random subset: no visible sampling grid.
  const all: [number, number][] = [];
  const x0 = Math.max(0, Math.floor(box.left));
  const y0 = Math.max(0, Math.floor(box.top));
  const x1 = Math.min(w, Math.ceil(box.right));
  const y1 = Math.min(h, Math.ceil(box.bottom));
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++)
      if (data[(y * w + x) * 4 + 3] > 100) all.push([x, y]);
  const pts: [number, number][] = [];
  for (let i = 0; i < count && all.length; i++) {
    const [x, y] = all[Math.floor(Math.random() * all.length)];
    pts.push([x + Math.random(), y + Math.random()]);
  }
  return pts;
}

/** The name split into words, each word one gradient-filled unit with its own reveal delay. */
const WORDS = APP_NAME.normalize("NFC").split(" ");

export function Splash({ onDone }: { onDone: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const emblem = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"gather" | "ready" | "open">("gather");
  const opening = useRef(false);
  const reduce =
    typeof matchMedia !== "undefined" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    preloadFiles(["splash-voice.mp3", "splash-door.mp3", "splash-burst.mp3"]);
    const t = window.setTimeout(
      () => setPhase((p) => (p === "gather" ? "ready" : p)),
      reduce ? 300 : 2500,
    );
    return () => window.clearTimeout(t);
  }, [reduce]);

  useEffect(() => {
    const cv = canvas.current;
    const em = emblem.current;
    if (!cv || !em || reduce) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth;
    const h = window.innerHeight;
    cv.width = w * dpr;
    cv.height = h * dpr;
    const g = cv.getContext("2d")!;
    g.scale(dpr, dpr);
    // The emblem starts slightly scaled down; aim the dust at its final, unscaled size.
    const r = em.getBoundingClientRect();
    const ex = r.left + r.width / 2;
    const ey = r.top + r.height / 2;
    const size = em.offsetWidth;
    const box = new DOMRect(ex - size / 2, ey - size / 2, size, size);
    const N = w < 700 ? 1500 : 2400;
    const pts = targets(w, h, box, N);
    const pick = (): string => {
      let r = Math.random();
      for (const [c, p] of PALETTE) if ((r -= p) <= 0) return c;
      return PALETTE[0][0];
    };
    const ps: P[] = [];
    for (let i = 0; i < N; i++) {
      const [tx, ty] = pts.length ? pts[i % pts.length] : [ex, ey];
      // Start as a drifting dust cloud across (and slightly beyond) the screen.
      const sx = -0.1 * w + Math.random() * 1.2 * w;
      const sy = -0.1 * h + Math.random() * 1.2 * h;
      ps.push({
        x: sx,
        y: sy,
        sx,
        sy,
        tx,
        ty,
        vx: 0,
        vy: 0,
        c: pick(),
        r:
          Math.random() < 0.05
            ? 2.2 + Math.random() * 1.4
            : 0.6 + Math.random() * 1.1,
        d: Math.random() * 0.4,
        a: 0.55 + Math.random() * 0.45,
        tw: Math.random() * Math.PI * 2,
      });
    }
    const stars = Array.from({ length: Math.round((w * h) / 9000) }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 0.9 + 0.2,
      tw: Math.random() * 6,
    }));
    let raf = 0;
    const t0 = performance.now();
    let openAt = 0;
    const frame = (now: number) => {
      const t = (now - t0) / 1000;
      g.clearRect(0, 0, w, h);
      g.globalCompositeOperation = "lighter";
      for (const s of stars) {
        g.fillStyle = `rgba(243,236,223,${0.15 + 0.25 * (0.5 + 0.5 * Math.sin(t * 1.3 + s.tw))})`;
        g.fillRect(s.x, s.y, s.r, s.r);
      }
      if (opening.current && !openAt) {
        openAt = t;
        // Burst outward from the compass as the doors open.
        for (const p of ps) {
          const dx = p.x - ex;
          const dy = p.y - ey;
          const len = Math.hypot(dx, dy) || 1;
          const sp = 4 + Math.random() * 9;
          p.vx = (dx / len) * sp + (Math.random() - 0.5) * 3;
          p.vy = (dy / len) * sp + (Math.random() - 0.5) * 3 - 1;
        }
      }
      // Once the crisp emblem has lit up, the dust fades to a faint shimmer so the compass reads clean.
      const level = openAt
        ? Math.max(0, 1 - (t - openAt) / 1.1)
        : 1 - 0.9 * ease((t - 1.5) / 0.9);
      for (const p of ps) {
        if (openAt) {
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.985;
          p.vy = p.vy * 0.985 + 0.04;
        } else {
          const k = ease((t - 0.1 - p.d) / 1.4);
          // Spiral in: the swirl offset shrinks as the particle arrives.
          const sw = (1 - k) * (90 + p.tw * 12);
          const ang = (1 - k) * 3.2 + p.tw;
          p.x = p.sx + (p.tx - p.sx) * k + Math.cos(ang) * sw;
          p.y = p.sy + (p.ty - p.sy) * k + Math.sin(ang) * sw;
          if (k >= 1) {
            p.x += Math.sin(t * 2 + p.tw) * 0.35;
            p.y += Math.cos(t * 1.7 + p.tw) * 0.35;
          }
        }
        const twinkle = 0.75 + 0.25 * Math.sin(t * 3 + p.tw * 3);
        const alpha = p.a * twinkle * level;
        if (p.r > 2) {
          g.fillStyle = `rgba(${p.c},${alpha * 0.12})`;
          g.beginPath();
          g.arc(p.x, p.y, p.r * 2.6, 0, Math.PI * 2);
          g.fill();
        }
        g.fillStyle = `rgba(${p.c},${alpha})`;
        g.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r);
      }
      g.globalCompositeOperation = "source-over";
      if (!openAt || t - openAt < 1.4) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [reduce]);

  const open = (sound = true) => {
    if (opening.current) return;
    opening.current = true;
    try {
      localStorage.setItem(SEEN_KEY, dayKey());
    } catch {
      /* optional */
    }
    if (sound && store.get().settings.sfx) {
      void playFile("splash-burst.mp3", 0.55);
      void playFile("splash-door.mp3", 0.6, 0.12);
      void playFile("splash-voice.mp3", 0.95, 0.35);
      // Let the welcome line sit above the music that fades in with the doors.
      duck(true);
      window.setTimeout(() => duck(false), 3200);
    }
    setPhase("open");
    window.setTimeout(onDone, reduce ? 300 : 1900);
  };

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.key === "Tab") return;
      e.preventDefault();
      if (e.key === "Escape") open(false);
      else open();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className={`splash is-${phase} ${reduce ? "is-reduced" : ""}`}
      onClick={() => open()}
      role="dialog"
      aria-label="Chào mừng bạn mở cánh cửa IELTS, chạm để vào"
    >
      <div className="door door-l" />
      <div className="door door-r" />
      <div className="splash-light" />
      <canvas ref={canvas} className="splash-canvas" aria-hidden="true" />
      <div className="splash-brand">
        <div className="splash-emblem" ref={emblem}>
          <Mark size={32} />
        </div>
        <p className="splash-name" aria-label={APP_NAME}>
          {WORDS.map((word, i) => (
            <Fragment key={i}>
              {i > 0 && " "}
              <span
                className="splash-word"
                aria-hidden="true"
                style={{ "--i": i } as CSSProperties}
              >
                {word}
              </span>
            </Fragment>
          ))}
        </p>
        <p className="splash-kicker">
          <i />
          {APP_KICKER}
          <i />
        </p>
      </div>
      <div className="splash-copy">
        <p className="splash-tag">Chào mừng bạn mở cánh cửa IELTS</p>
        <p className="splash-hint">
          <span className="splash-key" />
          Chạm để mở · hoặc nhấn phím bất kỳ
        </p>
      </div>
      <button
        className="splash-skip"
        onClick={(e) => {
          e.stopPropagation();
          open(false);
        }}
      >
        Bỏ qua
      </button>
    </div>
  );
}

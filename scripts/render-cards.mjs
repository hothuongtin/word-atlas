#!/usr/bin/env node
/**
 * Render the social card, README banner and app screenshots with headless Chromium.
 *   node scripts/render-cards.mjs [--app http://localhost:5188/]
 * Set CHROME_PATH to use a specific Chromium build.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appArg = process.argv.indexOf("--app");
const app = appArg > 0 ? process.argv[appArg + 1] : null;
// Brand name and kicker come from src/config.ts, so the cards follow a rename.
const config = fs.readFileSync(path.join(root, "src/config.ts"), "utf8");
const brand = (name) => config.match(new RegExp(`${name} = "([^"]+)"`))[1];
const index = JSON.parse(fs.readFileSync(path.join(root, "public/atlas/index.json"), "utf8"));
const fontFile = (subset, style) => pathToFileURL(path.join(root, `node_modules/@fontsource-variable/fraunces/files/fraunces-${subset}-opsz-${style}.woff2`)).href;
// Same subsets and unicode ranges as @fontsource-variable/fraunces/opsz.css, so Vietnamese letters use the brand face.
const SUBSETS = {
  vietnamese: "U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB",
  "latin-ext": "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF",
  latin: "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
};
const faces = Object.entries(SUBSETS)
  .flatMap(([subset, range]) => ["normal", "italic"].map((style) => `@font-face{font-family:F;font-style:${style};src:url(${fontFile(subset, style)}) format("woff2");font-weight:100 900;unicode-range:${range}}`))
  .join("\n");
const thumb = (id) => pathToFileURL(path.join(root, "public/atlas/thumb", `${id}.webp`)).href;

// Illustrated words, spread across levels and topics, deterministic.
const illustrated = index.words.filter((w) => w[6] & 1);
const pick = (n, seed = 7) => {
  const out = [];
  const step = Math.max(1, Math.floor(illustrated.length / n));
  for (let i = 0; out.length < n && i < illustrated.length; i++) out.push(illustrated[(i * step + seed) % illustrated.length]);
  return out;
};

const fmt = (n) => n.toLocaleString("vi-VN");
const base = `
${faces}
*{box-sizing:border-box;margin:0}
body{background:#f3ecdf;color:#1e2640;font-family:-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;-webkit-font-smoothing:antialiased}
.serif{font-family:F,Georgia,serif;font-variation-settings:"opsz" 144}
.mosaic{display:grid;gap:10px}
.mosaic figure{position:relative;border-radius:14px;overflow:hidden;background:#ece3d2;box-shadow:0 10px 24px -14px rgba(30,38,64,.45)}
.mosaic img{width:100%;height:100%;object-fit:cover;display:block}
.mosaic figcaption{position:absolute;left:10px;bottom:8px;color:#fff;font:600 15px F,serif;text-shadow:0 1px 8px rgba(0,0,0,.5)}
`;

function card({ width, height, cols, rows, title, sub, chips, tile }) {
  const words = pick(cols * rows);
  return `<!doctype html><html><head><meta charset="utf-8"><style>${base}
  body{width:${width}px;height:${height}px;overflow:hidden;position:relative}
  .mosaic{position:absolute;inset:-40px -60px -40px 52%;grid-template-columns:repeat(${cols},${tile}px);grid-auto-rows:${tile}px;transform:rotate(-8deg);transform-origin:center}
  .fade{position:absolute;inset:0;background:linear-gradient(90deg,#f3ecdf 46%,rgba(243,236,223,.0) 66%)}
  .copy{position:absolute;left:72px;top:0;bottom:0;width:52%;display:flex;flex-direction:column;justify-content:center;gap:22px}
  .brand{display:flex;align-items:center;gap:14px;font:600 30px F,serif}
  .brand small{font:600 22px F,Georgia,serif;color:#7c7f8c;letter-spacing:.12em}
  h1{font-weight:600;font-size:${Math.round(height * 0.105)}px;line-height:1.08;letter-spacing:-.02em}
  h1 em{font-style:italic;color:#c4573a}
  p.sub{font-size:${Math.round(height * 0.04)}px;color:#444d68;line-height:1.5}
  .chips{display:flex;flex-wrap:wrap;gap:10px}
  .chips span{padding:8px 16px;border-radius:999px;background:#fbf8f2;border:1px solid rgba(30,38,64,.14);font-size:${Math.round(height * 0.03)}px;font-weight:600;color:#444d68}
  </style></head><body>
  <div class="mosaic">${words.map((w) => `<figure><img src="${thumb(w[0])}"><figcaption>${w[1]}</figcaption></figure>`).join("")}</div>
  <div class="fade"></div>
  <div class="copy">
    <div class="brand"><svg width="40" height="40" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14.5" fill="none" stroke="#1e2640" stroke-width="1.5"/><path d="M16 3.5 19 16 16 28.5 13 16Z" fill="#1e2640"/><path d="M16 3.5 19 16H13Z" fill="#c4573a"/><circle cx="16" cy="16" r="1.6" fill="#f3ecdf"/></svg>${brand("APP_NAME")} <small>${brand("APP_KICKER").toUpperCase()}</small></div>
    <h1 class="serif">${title}</h1>
    <p class="sub">${sub}</p>
    <div class="chips">${chips.map((c) => `<span>${c}</span>`).join("")}</div>
  </div></body></html>`;
}

const exe = process.env.CHROME_PATH;
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const shot = async (html, w, h, out, type = "jpeg") => {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  // Load from a file URL so the page may read local fonts and illustrations.
  const tmp = path.join(root, ".local", "render-card.html");
  fs.mkdirSync(path.dirname(tmp), { recursive: true });
  fs.writeFileSync(tmp, html);
  await page.goto(pathToFileURL(tmp).href, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await page.screenshot({ path: out, type, quality: type === "jpeg" ? 88 : undefined });
  await page.close();
  fs.rmSync(tmp, { force: true });
  console.log("wrote", path.relative(root, out));
};

const title = `Mỗi từ một bức tranh,<br><em>thắp sáng IELTS</em>.`;
const sub = `${fmt(index.count)} từ vựng IELTS, từ nào cũng có tranh<br>${fmt(index.examples)} câu ví dụ · phát âm Anh - Mỹ · mã nguồn mở`;
await shot(card({ width: 1200, height: 630, cols: 6, rows: 7, tile: 150, title, sub, chips: ["Không cần đăng ký", "Dùng tốt trên điện thoại", "Bộ từ CC BY 4.0"] }), 1200, 630, path.join(root, "public/brand/og-card.jpg"));
await shot(card({ width: 1600, height: 720, cols: 7, rows: 7, tile: 170, title, sub, chips: ["Không cần đăng ký", "Bầu trời từ vựng", "Tải JSON / CSV"] }), 1600, 720, path.join(root, "docs/assets/banner.jpg"));

// App icon (maskable: artwork kept inside the safe zone).
await shot(
  `<!doctype html><html><body style="margin:0;width:256px;height:256px;background:#1E2640;display:grid;place-items:center"><svg width="165" height="165" viewBox="0 0 32 32"><circle cx="16" cy="16" r="13" fill="none" stroke="#F3ECDF" stroke-width="1.2"/><circle cx="16" cy="16" r="9.5" fill="none" stroke="#F3ECDF" stroke-width=".6" stroke-dasharray="1 1.8" opacity=".5"/><path d="M16 4 18.8 16 16 28 13.2 16Z" fill="#F3ECDF"/><path d="M16 4 18.8 16H13.2Z" fill="#E07A5A"/><path d="M4 16 16 13.6 28 16 16 18.4Z" fill="#F3ECDF" opacity=".35"/><circle cx="16" cy="16" r="1.4" fill="#1E2640"/></svg></body></html>`,
  256,
  256,
  path.join(root, "public/icon-512.png"),
  "png",
);

// A dense wall of illustrations for README and launch posts.
const wall = pick(12 * 6, 3);
await shot(
  `<!doctype html><html><head><meta charset="utf-8"><style>${base}body{width:1600px;height:820px;padding:24px;overflow:hidden}.mosaic{grid-template-columns:repeat(12,1fr);grid-auto-rows:120px}</style></head><body><div class="mosaic">${wall.map((w) => `<figure><img src="${thumb(w[0])}"><figcaption>${w[1]}</figcaption></figure>`).join("")}</div></body></html>`,
  1600,
  820,
  path.join(root, "docs/assets/mosaic.jpg"),
);

if (app) {
  const views = [
    ["today-desktop", "#/", 1440, 900],
    ["atlas-desktop", "#/atlas", 1440, 900],
    ["word-desktop", `#/atlas?w=${pick(1, 41)[0][0]}`, 1440, 900],
    ["today-mobile", "#/", 390, 844],
    ["atlas-mobile", "#/atlas", 390, 844],
    ["word-mobile", `#/atlas?w=${pick(1, 41)[0][0]}`, 390, 844],
  ];
  for (const [name, hash, w, h] of views) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, colorScheme: "light" });
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.setItem("word-atlas:settings", JSON.stringify({ onboarded: true, startLevel: 2, splash: false })));
    await page.goto(new URL(hash, app).href, { waitUntil: "networkidle" });
    await page.waitForTimeout(1600);
    await page.screenshot({ path: path.join(root, `docs/assets/${name}.jpg`), type: "jpeg", quality: 86 });
    await ctx.close();
    console.log("wrote", `docs/assets/${name}.jpg`);
  }
}
await browser.close();

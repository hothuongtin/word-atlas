#!/usr/bin/env node
/**
 * Capture hi-res screens and clips of a running app into video/public/capture.
 *   node scripts/capture.mjs [http://localhost:5188/]
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repo = path.resolve(here, "..");
const app = process.argv[2] || "http://localhost:5188/";
const out = path.join(here, "public", "capture");
fs.mkdirSync(out, { recursive: true });
const index = JSON.parse(fs.readFileSync(path.join(repo, "public/atlas/index.json"), "utf8"));
const lit = index.words.filter((w, i) => w[4] <= 2 && i % 3 === 0).slice(0, 640).map((w) => w[0]);

function seed([ids, splash]) {
  if (sessionStorage.getItem("seeded")) return;
  localStorage.clear();
  localStorage.setItem("word-atlas:settings", JSON.stringify({ onboarded: true, startLevel: 2, dailyNew: 10, autoplay: false, sfx: false, splash }));
  const now = Date.now();
  const cards = Object.fromEntries(
    ids.map((id, i) => [id, { due: i < 2 ? now - 3600000 : now + (1 + (i % 9)) * 86400000, s: i < 2 ? 1 : i % 3 ? 8 : 40, d: 5, el: 3, sd: 6, ls: 0, reps: 4, lapses: 0, st: 2, seen: now - (10 + (i % 20)) * 86400000 }]),
  );
  const days = {};
  for (let d = 1; d <= 12; d++) days[new Date(now - d * 86400000).toISOString().slice(0, 10)] = { n: 10, r: 18, c: 24, t: 900 };
  localStorage.setItem("word-atlas:v2:word-atlas-open", JSON.stringify({ version: 2, datasetId: "word-atlas-open", cards, bookmarks: [], days, typing: [], session: null, mistakes: [] }));
  sessionStorage.setItem("seeded", "1");
}

const browser = await chromium.launch();
async function context(viewport, scale, splash = false) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: scale, colorScheme: "light", hasTouch: viewport.width < 500, isMobile: viewport.width < 500 });
  await ctx.addInitScript(seed, [lit, splash]);
  const page = await ctx.newPage();
  return { ctx, page, wait: (ms) => page.waitForTimeout(ms) };
}
const shot = (page, name) => page.screenshot({ path: path.join(out, `${name}.png`) });

async function clip(page, name, run, scale) {
  const dir = path.join(here, ".frames", name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const vp = page.viewportSize();
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on("Page.screencastFrame", async ({ data, sessionId, metadata }) => {
    const file = path.join(dir, `f${String(frames.length).padStart(5, "0")}.jpg`);
    fs.writeFileSync(file, Buffer.from(data, "base64"));
    frames.push({ file, t: metadata.timestamp });
    await cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => null);
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: vp.width * scale, maxHeight: vp.height * scale });
  await run();
  await cdp.send("Page.stopScreencast");
  const list = frames.map((f, i) => `file '${f.file}'\nduration ${Math.max(0.001, (frames[i + 1]?.t ?? f.t + 0.5) - f.t).toFixed(4)}`).join("\n");
  fs.writeFileSync(path.join(dir, "frames.txt"), list + `\nfile '${frames.at(-1).file}'\n`);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", path.join(dir, "frames.txt"), "-vf", "fps=30,scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p", "-c:v", "libx264", "-crf", "16", "-preset", "slow", "-movflags", "+faststart", path.join(out, `${name}.mp4`)]);
  console.log("clip", name, frames.length);
}

const desk = { width: 1600, height: 900 };
// Screen positions (CSS px) of buttons the video's cursor clicks.
const boxes = {};
const speakBoxes = (page) =>
  page.$$eval(".speak", (els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, label: e.getAttribute("aria-label") };
    }),
  );

// Splash as a clip.
{
  const { ctx, page, wait } = await context(desk, 1.2, true);
  await clip(page, "splash", async () => {
    await page.goto(app, { waitUntil: "networkidle" });
    await wait(5200);
  }, 1.2);
  await ctx.close();
}

// Desktop stills.
{
  const { ctx, page, wait } = await context(desk, 2);
  await page.goto(app, { waitUntil: "networkidle" });
  await wait(2500);
  await shot(page, "today");
  await page.getByRole("button", { name: /Bắt đầu hành trình hôm nay|Đi tiếp hành trình/ }).first().click();
  await wait(2600);
  // Two seeded cards are due, so the session opens with recall quizzes before new words.
  for (let k = 0; k < 2 && (await page.locator(".learn-stage button.option").count()); k++) {
    await shot(page, `quiz-${k}`);
    const step = await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem("word-atlas:v2:word-atlas-open") || "{}").session;
      return s?.steps?.[s.index] ?? null;
    });
    const answerId = step?.id ?? null;
    // A listening quiz asks with the word's audio, so the video needs that clip too.
    if (step?.kind === "listen") {
      fs.mkdirSync(path.join(here, "public", "voice"), { recursive: true });
      fs.copyFileSync(path.join(repo, "public", "atlas", "audio", "uk", `${answerId}.mp3`), path.join(here, "public", "voice", `quiz-${k}.mp3`));
    }
    const right = page.locator(`.learn-stage button.option[data-option="${answerId}"]`);
    const pick = answerId && (await right.count()) ? right : page.locator(".learn-stage button.option").first();
    boxes[`quiz-${k}`] = await pick.evaluate((e) => {
      const r = e.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    boxes[`quiz-${k}`].kind = step?.kind ?? null;
    await pick.click();
    await wait(1200);
    await shot(page, `quiz-${k}-done`);
    await page.keyboard.press("Enter");
    await wait(1800);
  }
  for (let i = 0; i < 4; i++) {
    await shot(page, `learn-${i}`);
    await page.keyboard.press("Enter");
    await wait(1800);
  }
  await page.goto(new URL("#/atlas", app).href, { waitUntil: "networkidle" });
  await wait(2500);
  await shot(page, "atlas");
  const q = "moi truong";
  const input = page.locator("label.search input");
  for (let i = 1; i <= q.length; i++) {
    await input.fill(q.slice(0, i));
    await wait(i === q.length ? 1800 : 500);
    if (i % 2 === 0 || i === q.length) await shot(page, `search-${String(i).padStart(2, "0")}`);
  }
  await input.fill("");
  await page.goto(new URL("#/atlas?w=environment", app).href, { waitUntil: "networkidle" });
  await wait(2500);
  await shot(page, "word");
  boxes.word = await speakBoxes(page);
  await page.locator(".sheet").evaluate((e) => e.scrollTo(0, 520));
  await wait(800);
  await shot(page, "word-2");
  boxes["word-2"] = await speakBoxes(page);
  await page.goto(new URL("#/practice", app).href, { waitUntil: "networkidle" });
  await wait(1800);
  await shot(page, "practice");
  await page.locator(".practice .btn-primary").first().click();
  await wait(1800);
  await page.keyboard.type("env", { delay: 160 });
  await wait(600);
  await shot(page, "typing");
  await page.goto(new URL("#/me", app).href, { waitUntil: "networkidle" });
  await wait(2000);
  await shot(page, "me");
  await page.goto(new URL("#/atlas?view=galaxy", app).href, { waitUntil: "networkidle" });
  await wait(5000);
  await shot(page, "galaxy");
  await ctx.close();
}

// Galaxy as an idle clip; the pointer stays off the canvas so no word tooltip appears.
{
  const { ctx, page, wait } = await context(desk, 1.2);
  await page.goto(new URL("#/atlas?view=galaxy", app).href, { waitUntil: "networkidle" });
  await page.mouse.move(2, 2);
  await wait(4500);
  await clip(page, "galaxy", async () => {
    await wait(12000);
  }, 1.2);
  await ctx.close();
}

// Phone stills.
{
  const { ctx, page, wait } = await context({ width: 390, height: 844 }, 3);
  await page.goto(app, { waitUntil: "networkidle" });
  await wait(2200);
  await shot(page, "m-today");
  await page.goto(new URL("#/atlas?w=environment", app).href, { waitUntil: "networkidle" });
  await wait(2500);
  await shot(page, "m-word");
  await page.goto(new URL("#/atlas", app).href, { waitUntil: "networkidle" });
  await wait(2500);
  await shot(page, "m-atlas");
  await page.goto(new URL("#/atlas?view=galaxy", app).href, { waitUntil: "networkidle" });
  await wait(5000);
  await shot(page, "m-galaxy");
  await ctx.close();
}
fs.writeFileSync(path.join(out, "boxes.json"), JSON.stringify(boxes, null, 1));
await browser.close();

// Copies the word illustrations, brand art and voice line used by the video from the app.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pub = path.resolve(here, "..", "public");
const index = JSON.parse(fs.readFileSync(path.join(pub, "atlas", "index.json"), "utf8"));
const ids = `environment journey library ocean harvest festival lantern mountain music dream bicycle coffee rain
  island future travel garden planet teacher market river sunrise friendship courage curious principle abandon
  volcano telescope orchestra recycle compass bridge umbrella kitchen rocket forest desert camera harmony`.split(/\s+/);

// Three example words per CEFR level for the level journey, A1 → C2.
const levels = [
  ["sun", "cat", "bicycle"],
  ["island", "bridge", "journey"],
  ["volcano", "telescope", "lighthouse"],
  ["harvest", "satellite", "curiosity"],
  ["avalanche", "tranquil", "pilgrimage"],
  ["vortex", "odyssey", "alchemy"],
];
// Pronunciations the video plays: UK/US word audio and the example sentence read aloud.
const voices = [["uk", "environment"], ["us", "environment"], ["ex", "environment"], ...levels.map((l) => ["uk", l[0]])];
const rows = new Map(index.words.map((r) => [r[0], r]));
fs.mkdirSync(path.join(here, "public", "words"), { recursive: true });
fs.mkdirSync(path.join(here, "public", "brand"), { recursive: true });
const words = [...new Set([...ids, ...levels.flat()])]
  .filter((id) => rows.has(id))
  .map((id) => {
    const [, word, vi, ipa, level, topic] = rows.get(id);
    fs.copyFileSync(path.join(pub, "atlas", "img", `${id}.webp`), path.join(here, "public", "words", `${id}.webp`));
    return { id, word, vi, ipa, cefr: index.cefr[level], topic: index.topics[topic][1] };
  });
for (const f of ["hero.webp", "night.webp"]) fs.copyFileSync(path.join(pub, "brand", f), path.join(here, "public", "brand", f));
fs.mkdirSync(path.join(here, "public", "voice"), { recursive: true });
for (const [accent, id] of voices) fs.copyFileSync(path.join(pub, "atlas", "audio", accent, `${id}.mp3`), path.join(here, "public", "voice", `${accent}-${id}.mp3`));
const audio = Object.fromEntries(
  fs.readdirSync(path.join(pub, "atlas", "audio")).map((d) => [d, fs.readdirSync(path.join(pub, "atlas", "audio", d)).filter((f) => f.endsWith(".mp3")).length]),
);
const perLevel = index.cefr.map((_, l) => index.words.filter((r) => r[4] === l).length);
fs.copyFileSync(path.join(pub, "sfx", "splash-voice.mp3"), path.join(here, "public", "splash-voice.mp3"));
for (const f of ["tap.mp3", "correct.mp3"]) fs.copyFileSync(path.join(pub, "sfx", f), path.join(here, "public", "voice", f));
fs.writeFileSync(
  path.join(here, "src", "words.json"),
  JSON.stringify({ count: index.count, examples: index.examples, topics: index.topics, cefr: index.cefr, perLevel, levels, audio, words }, null, 1),
);
console.log("words", words.length);

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

const rows = new Map(index.words.map((r) => [r[0], r]));
fs.mkdirSync(path.join(here, "public", "words"), { recursive: true });
fs.mkdirSync(path.join(here, "public", "brand"), { recursive: true });
const words = ids
  .filter((id) => rows.has(id))
  .map((id) => {
    const [, word, vi, ipa, level, topic] = rows.get(id);
    fs.copyFileSync(path.join(pub, "atlas", "img", `${id}.webp`), path.join(here, "public", "words", `${id}.webp`));
    return { id, word, vi, ipa, cefr: index.cefr[level], topic: index.topics[topic][1] };
  });
for (const f of ["hero.webp", "night.webp"]) fs.copyFileSync(path.join(pub, "brand", f), path.join(here, "public", "brand", f));
fs.copyFileSync(path.join(pub, "sfx", "splash-voice.mp3"), path.join(here, "public", "splash-voice.mp3"));
fs.writeFileSync(
  path.join(here, "src", "words.json"),
  JSON.stringify({ count: index.count, examples: index.examples, topics: index.topics, words }, null, 1),
);
console.log("words", words.length);

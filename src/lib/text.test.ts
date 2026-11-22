import assert from "node:assert/strict";
import { test } from "node:test";
import { fold, gap, glossPhrases, imeInterference, normalize, splitHighlight, splitPair } from "./text";

test("highlights the headword and common inflections", () => {
  assert.deepEqual(splitHighlight("Training with a friend motivates me.", "motivate")?.[1], "motivates");
  assert.deepEqual(splitHighlight("She studied hard.", "study")?.[1], "studied");
  assert.deepEqual(splitHighlight("We got a day off today.", "day off")?.[1], "day off");
  assert.equal(splitHighlight("Nothing here.", "salt"), null);
});

test("does not match inside longer unrelated words", () => {
  assert.equal(splitHighlight("The cartoon was funny.", "art"), null);
});

test("gaps the sentence for cloze questions", () => {
  const g = gap("I refused the extra money as a matter of principle.", "principle");
  assert.equal(g?.hidden, "principle");
  assert.equal(g?.after, ".");
});

test("normalizes typography from mobile keyboards", () => {
  assert.equal(normalize("  Don’t  "), "don't");
  assert.deepEqual(splitPair("in principle|về nguyên tắc"), { en: "in principle", vi: "về nguyên tắc" });
});

test("folds Vietnamese diacritics for search", () => {
  assert.equal(fold("Môi Trường"), "moi truong");
  assert.equal(fold("Đường đi"), "duong di");
  assert.equal(fold("thủy"), fold("thuỷ"));
});

test("splits a gloss into comparable phrases without the part of speech", () => {
  assert.deepEqual(glossPhrases("n. nguyên tắc; chuẩn mực hành xử"), ["nguyên tắc", "chuẩn mực hành xử"]);
  assert.deepEqual(glossPhrases("thư, lá thư"), ["thư", "lá thư"]);
});

test("detects a Vietnamese input method changing English keystrokes", () => {
  assert.equal(imeInterference("ô", "book"), true);
  assert.equal(imeInterference("đ", "dd"), true);
  assert.equal(imeInterference("boo", "book"), false);
  assert.equal(imeInterference("caf", "café"), false);
  assert.equal(imeInterference("café", "café"), false);
});

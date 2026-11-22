import { CornerDownLeft, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Atlas, WordRef } from "../atlas/types";
import { useAtlas } from "../atlas/context";
import { openWord } from "../lib/router";
import { fold } from "../lib/text";
import { Illustration } from "./Illustration";

const glossCache = new WeakMap<Atlas, string[]>();
/** Glosses without diacritics or the part-of-speech label, aligned with atlas.words. */
function foldedGlosses(atlas: Atlas) {
  let g = glossCache.get(atlas);
  if (!g) glossCache.set(atlas, (g = atlas.words.map((w) => fold(w.vi.replace(/^[a-z]+\.\s+/, "")))));
  return g;
}

/**
 * Search English headwords and Vietnamese meanings at once. Vietnamese matches ignore
 * diacritics ("moi truong" finds "môi trường"); typing them only ranks exact matches higher.
 */
export function searchAtlas(atlas: Atlas, raw: string, limit = 40): WordRef[] {
  const q = raw.trim().toLowerCase().normalize("NFC");
  if (!q) return [];
  const fq = fold(q);
  const marked = fq !== q;
  const glosses = foldedGlosses(atlas);
  const hits: [number, WordRef][] = [];
  atlas.words.forEach((w, n) => {
    let score = 0;
    const word = w.word.toLowerCase();
    if (word === q) score = 1000;
    else if (word.startsWith(q)) score = 500 - word.length;
    else if (word.includes(q)) score = 200 - word.indexOf(q) - word.length;
    if (!score) {
      const g = glosses[n];
      const i = g.indexOf(fq);
      if (i >= 0) {
        const wholeStart = i === 0 || /[\s;,(]/.test(g[i - 1]);
        const end = g[i + fq.length];
        const wholeEnd = end === undefined || /[\s;,)]/.test(end);
        if (wholeStart || fq.length >= 3) {
          score = 60 - Math.min(40, i) - g.length * 0.2 + (wholeStart ? 40 : 0) + (wholeEnd ? 20 : 0);
          if (marked && w.vi.toLowerCase().normalize("NFC").includes(q)) score += 30;
          score = Math.max(1, score);
        }
      }
    }
    if (score > 0) hits.push([score, w]);
  });
  hits.sort((a, b) => b[0] - a[0] || a[1].order - b[1].order);
  return hits.slice(0, limit).map((h) => h[1]);
}

export function Palette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const atlas = useAtlas();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const results = useMemo(() => searchAtlas(atlas, q, 30), [atlas, q]);
  useEffect(() => {
    if (open) {
      setQ("");
      setSel(0);
      requestAnimationFrame(() => input.current?.focus());
    }
  }, [open]);
  useEffect(() => setSel(0), [q]);
  if (!open) return null;
  const pick = (w: WordRef) => {
    onClose();
    openWord(w.id);
  };
  return (
    <div className="palette-root" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Tìm từ">
        <label className="palette-input">
          <Search size={20} />
          <input
            ref={input}
            value={q}
            placeholder="Tìm từ tiếng Anh hoặc nghĩa tiếng Việt, ví dụ serendipity / môi trường"
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSel((s) => Math.min(results.length - 1, s + 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setSel((s) => Math.max(0, s - 1));
              }
              if (e.key === "Enter" && results[sel]) pick(results[sel]);
            }}
            aria-controls="palette-list"
            aria-activedescendant={results[sel] ? `pal-${results[sel].id}` : undefined}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd>Esc</kbd>
        </label>
        <ul id="palette-list" className="palette-list" role="listbox">
          {results.map((w, i) => (
            <li
              key={w.id}
              id={`pal-${w.id}`}
              role="option"
              aria-selected={i === sel}
              className={i === sel ? "is-sel" : ""}
              onMouseEnter={() => setSel(i)}
              onClick={() => pick(w)}
            >
              <Illustration src={atlas.img(w, "thumb")} word={w.word} topic={w.topic} className="palette-thumb" />
              <span className="palette-word" lang="en">
                {w.word}
              </span>
              <span className="palette-vi">{w.vi}</span>
              {i === sel && <CornerDownLeft size={15} className="palette-enter" />}
            </li>
          ))}
          {q && !results.length && <li className="palette-empty">Không tìm thấy "{q}"</li>}
          {!q && (
            <li className="palette-hint">
              {atlas.count.toLocaleString("vi-VN")} mục từ · gõ tiếng Anh hoặc nghĩa tiếng Việt, không cần dấu · <kbd>↑</kbd>
              <kbd>↓</kbd> chọn <kbd>↵</kbd> mở
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

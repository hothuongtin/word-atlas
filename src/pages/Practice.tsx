import { Headphones, Keyboard, RotateCcw, Type } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { prefetch, useAtlas } from "../atlas/context";
import type { Entry } from "../atlas/types";
import { play, stopAudio } from "../lib/audio";
import { cue } from "../lib/sound";
import { hashSeed, imeInterference, shuffle } from "../lib/text";
import { clean, correctCharacterCount, same, typingDelta, typingMetrics } from "../lib/typing";
import { store, useStore } from "../store/store";
import { AmbiencePicker } from "../ui/Ambience";
import { Illustration } from "../ui/Illustration";

type Mode = "word" | "sentence" | "dictation";
type Source = "recent" | "mistakes" | "saved" | "path";

const MODES: [Mode, string, string, typeof Type][] = [
  ["word", "Từ đơn", "Nhìn tranh, gõ ra từ", Type],
  ["sentence", "Câu ví dụ", "Chép lại câu để quen tay", Keyboard],
  ["dictation", "Nghe chép", "Chỉ nghe rồi gõ cả câu", Headphones],
];
const SOURCES: [Source, string][] = [
  ["recent", "Mới học"],
  ["mistakes", "Hay sai"],
  ["saved", "Đã lưu"],
  ["path", "Lộ trình"],
];

export function Practice() {
  const atlas = useAtlas();
  const progress = useStore((s) => s.progress);
  const startLevel = useStore((s) => s.settings.startLevel);
  const [mode, setMode] = useState<Mode>("word");
  const [source, setSource] = useState<Source>(() => (Object.keys(progress.cards).length ? "recent" : "path"));
  const [round, setRound] = useState<{ entries: Entry[]; key: number } | null>(null);

  const pool = useMemo(() => {
    const learned = Object.entries(progress.cards)
      .sort((a, b) => (b[1].last ?? 0) - (a[1].last ?? 0))
      .map(([id]) => id);
    const ids =
      source === "recent" ? learned : source === "mistakes" ? progress.mistakes : source === "saved" ? progress.bookmarks : atlas.words.filter((w) => w.cefr >= startLevel).slice(0, 400).map((w) => w.id);
    return ids.filter((id) => atlas.byId.has(id));
  }, [atlas, progress.cards, progress.mistakes, progress.bookmarks, source, startLevel]);

  const start = async () => {
    const ids = shuffle(pool.slice(0, 60), hashSeed(String(Date.now()))).slice(0, 10);
    const entries = (await prefetch(atlas, ids)).filter((e): e is Entry => !!e && (mode === "word" || e.ex.length > 0));
    if (entries.length) setRound({ entries, key: Date.now() });
  };

  if (round) return <TypingRound key={round.key} mode={mode} entries={round.entries} onExit={() => setRound(null)} onAgain={start} />;

  const best = progress.typing.filter((t) => t.mode === mode).reduce((m, t) => Math.max(m, t.wpm), 0);
  return (
    <div className="page practice">
      <header className="page-head">
        <p className="eyebrow">Luyện tập · Luyện gõ</p>
        <h1 className="display">Để đôi tay cũng nhớ từ.</h1>
        <p className="lede">Luyện gõ chỉ rèn chính tả và độ quen tay, không thay đổi tiến độ ghi nhớ. Nhớ chuyển bộ gõ sang tiếng Anh.</p>
      </header>
      <div className="practice-grid">
        <section className="panel">
          <h3 className="eyebrow">Chế độ</h3>
          <div className="mode-cards">
            {MODES.map(([k, name, desc, Icon]) => (
              <button key={k} className={`mode-card ${mode === k ? "is-on" : ""}`} onClick={() => setMode(k)} aria-pressed={mode === k}>
                <Icon size={22} strokeWidth={1.7} />
                <b>{name}</b>
                <small>{desc}</small>
              </button>
            ))}
          </div>
          <h3 className="eyebrow">Nguồn từ</h3>
          <div className="segmented segmented-wide">
            {SOURCES.map(([k, label]) => (
              <button key={k} className={source === k ? "is-on" : ""} onClick={() => setSource(k)} aria-pressed={source === k}>
                {label}
              </button>
            ))}
          </div>
          <p className="muted">
            {pool.length
              ? source === "path"
                ? "Chọn ngẫu nhiên 10 từ trong 400 từ đầu của lộ trình."
                : `Có ${pool.length} từ để luyện, mỗi lượt 10 từ ngẫu nhiên.`
              : "Ở đây chưa có từ nào, hãy học vài từ trước hoặc đổi nguồn."}
          </p>
          <button className="btn btn-primary btn-xl" onClick={start} disabled={!pool.length}>
            Bắt đầu một lượt
          </button>
        </section>
        <section className="panel practice-side">
          <img src={`${import.meta.env.BASE_URL}brand/${mode === "dictation" ? "listen" : "typing"}.webp`} alt="" />
          <dl className="mini-stats">
            <div>
              <dt>Tốc độ cao nhất</dt>
              <dd>
                {best}
                <small>WPM</small>
              </dd>
            </div>
            <div>
              <dt>Số lượt đã xong</dt>
              <dd>{progress.typing.length}</dd>
            </div>
          </dl>
          <p className="muted">WPM tính theo chuẩn 5 ký tự là 1 từ, chỉ đếm ký tự gõ đúng.</p>
        </section>
      </div>
    </div>
  );
}

function TypingRound({ mode, entries, onExit, onAgain }: { mode: Mode; entries: Entry[]; onExit: () => void; onAgain: () => void }) {
  const atlas = useAtlas();
  const settings = useStore((s) => s.settings);
  const [i, setI] = useState(0);
  const [value, setValue] = useState("");
  // Running totals live in a ref so every keystroke is counted exactly once.
  const totalsRef = useRef({ typed: 0, correct: 0, accepted: 0, ms: 0 });
  const [totals, setTotals] = useState(totalsRef.current);
  const [done, setDone] = useState(false);
  const started = useRef<number | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const e = entries[i];
  const target = mode === "word" ? e.w : e.ex[0].en;

  useEffect(() => {
    setValue("");
    started.current = null;
    input.current?.focus();
    if (mode === "dictation") void play(atlas.audio(e, "ex"), e.ex[0].en, settings.accent);
    if (mode === "word" && settings.autoplay) void play(atlas.audio(e, settings.accent), e.w, settings.accent);
  }, [i]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => stopAudio(), []);

  const onChange = (next: string) => {
    if (done) return;
    if (started.current === null && next) started.current = performance.now();
    const d = typingDelta(value, next, target);
    if (settings.sfx && d.total > 0) void cue("key");
    const t = totalsRef.current;
    totalsRef.current = { ...t, typed: t.typed + d.total, correct: t.correct + d.correct };
    setTotals(totalsRef.current);
    setValue(next);
    if (clean(next).length >= clean(target).length && same(next.trimEnd(), target)) finishItem(next);
  };

  const finishItem = (final: string) => {
    const ms = started.current ? performance.now() - started.current : 0;
    const accepted = correctCharacterCount(final, target);
    if (settings.sfx) void cue("correct");
    const t = totalsRef.current;
    const nt = { ...t, accepted: t.accepted + accepted, ms: t.ms + ms };
    totalsRef.current = nt;
    setTotals(nt);
    if (i + 1 >= entries.length) {
      setDone(true);
      const m = typingMetrics(nt.correct, nt.typed, nt.accepted, nt.ms);
      store.progress((p) => ({ ...p, typing: [...p.typing, { at: Date.now(), mode, items: entries.length, wpm: m.wpm, accuracy: m.accuracy }].slice(-500) }));
    } else window.setTimeout(() => setI(i + 1), 260);
  };

  const m = typingMetrics(totals.correct, totals.typed, totals.accepted, totals.ms);
  const chars = Array.from(target);
  const typed = Array.from(value);
  const ime = imeInterference(value, target);

  if (done)
    return (
      <div className="page practice">
        <section className="panel typing-done">
          <p className="eyebrow">Xong một lượt</p>
          <h1 className="display">
            {m.wpm} <small>WPM</small>
          </h1>
          <p className="lede">Độ chính xác {m.accuracy}% · {entries.length} mục</p>
          <div className="summary-actions">
            <button className="btn btn-ghost" onClick={onExit}>
              Quay lại
            </button>
            <button className="btn btn-primary btn-xl" onClick={onAgain} autoFocus>
              <RotateCcw size={18} /> Thêm một lượt
            </button>
          </div>
        </section>
      </div>
    );

  return (
    <div className="page practice typing">
      <header className="typing-top">
        <button className="btn btn-ghost" onClick={onExit}>
          Kết thúc
        </button>
        <AmbiencePicker />
        <div className="learn-progress">
          <span style={{ width: `${(i / entries.length) * 100}%` }} />
        </div>
        <span className="typing-meter">
          <b>{m.wpm}</b> WPM · <b>{m.accuracy}%</b>
        </span>
      </header>
      <section className="typing-stage" onClick={() => input.current?.focus()}>
        {mode === "word" && (
          <div className="typing-cue">
            <Illustration src={atlas.img(e)} word={e.w} topic={0} eager />
            <p>
              <span className="pos">{e.senses[0].pos}</span> {e.senses[0].vi}
            </p>
          </div>
        )}
        {mode !== "word" && (
          <p className="typing-vi">
            {mode === "dictation" && (
              <button className="link" onClick={() => play(atlas.audio(e, "ex"), e.ex[0].en, settings.accent)}>
                Nghe lại
              </button>
            )}
            {e.ex[0].vi}
          </p>
        )}
        <p className={`typing-text ${mode === "word" ? "is-word" : ""} ${mode === "dictation" ? "is-hidden" : ""}`} lang="en" aria-hidden="true">
          {chars.map((ch, k) => {
            const t = typed[k];
            const cls = t === undefined ? (k === typed.length ? "is-caret" : "") : same(t, ch) ? "is-ok" : "is-bad";
            const show = mode === "dictation" && t === undefined ? (ch === " " ? " " : /[A-Za-z]/.test(ch) ? "·" : ch) : ch;
            return (
              <span key={k} className={cls}>
                {show}
              </span>
            );
          })}
        </p>
        <input
          ref={input}
          className="typing-input"
          value={value}
          onChange={(ev) => onChange(ev.target.value)}
          autoFocus
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          lang="en"
          aria-label="Gõ vào đây"
        />
        {ime && <p className="ime-hint">Bộ gõ tiếng Việt đang bật nên chữ bị thêm dấu. Hãy chuyển sang bàn phím tiếng Anh.</p>}
        <p className="muted typing-help">
          {mode === "dictation" ? 'Nghe chưa rõ thì bấm "Nghe lại".' : "Cứ gõ luôn, đúng hết sẽ tự sang mục tiếp theo."} Mục {i + 1}/{entries.length}
        </p>
      </section>
    </div>
  );
}

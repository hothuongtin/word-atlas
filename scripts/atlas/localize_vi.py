"""Write the Vietnamese side of every entry (meanings, example translations, collocation
glosses, tips, notes). English text, ids and media are never touched, so existing
illustrations and recordings keep matching.

Usage:
  python3 scripts/atlas/localize_vi.py --sample 200          # stratified pilot
  python3 scripts/atlas/localize_vi.py --ids abandon,principle
  python3 scripts/atlas/localize_vi.py --all [--workers 8]
Output: .local/forge/vi/<hash>.json, one file per batch (resumable). Apply with apply_vi.py.
"""
import argparse
import concurrent.futures as cf
import hashlib
import json
import random
import re
import sys

from common import FORGE, ROOT, load_env, stream_chat, with_retry

CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"]
PILOT_MIX = {"A1": 30, "A2": 30, "B1": 40, "B2": 50, "C1": 35, "C2": 15}
# Entries whose original tip was written for Chinese speakers; always part of a pilot.
PILOT_MUST = ["china", "chinese", "letter", "international", "mid-term", "esthetic", "needful", "province", "dollar"]

SYSTEM = """You are the lead lexicographer of an open English vocabulary atlas for VIETNAMESE learners preparing for IELTS (band 5.5-7.5).
Each input entry already has correct English content plus an older Chinese gloss. Write the Vietnamese side.

Source of truth: the English definition and the English example sentences. The Chinese text ("zh") is only a hint for which sense is meant. Never translate from Chinese and never produce Sino-Vietnamese calques when an everyday Vietnamese word exists (write "bỏ rơi", not "phế khí").

Return strict JSON only: {"entries":[...]}, one object per input entry, same order:
{
 "id": same id as the input,
 "senses": ["one Vietnamese gloss per input sense, same order"],
 "ex": ["one Vietnamese translation per input example, same order"],
 "col": ["one Vietnamese gloss per input collocation, same order"],
 "tip": "one tip in Vietnamese",
 "note": "Vietnamese version of the input note, or empty string when the input note is empty"
}

Rules for "senses":
- Anh-Việt dictionary style gloss for exactly that sense and part of speech. Lowercase first letter unless it is a proper noun.
- Start with the Vietnamese equivalent word or words a good bilingual dictionary gives. Never replace an existing equivalent with a paraphrase of the English definition: write "cổ chân", not "khớp nối bàn chân với cẳng chân"; "tháng tư", not "tháng tư (tháng thứ tư trong năm)"; "bản lề", not "bản lề giúp cửa đóng mở"; "tiền đề; giả định làm cơ sở", not only a description.
- A concrete everyday sense whose equivalent is unambiguous gets the equivalent only (often under 25 characters), with near-synonyms separated by "; " (at most 3).
- Add a short clarification in round brackets ONLY when the equivalent alone would leave the reader asking "of what?" or would be confused with another sense of the same entry: "bên tham gia (người hoặc tổ chức trong một sự việc)", "ngành (kinh doanh, dịch vụ)", "mũi (máy bay, tàu xe)", "cửa sổ (trên màn hình máy tính)", "đủ (đứng sau tính từ, trạng từ)".
- When Vietnamese has no equivalent word, give a short descriptive phrase that is complete in itself: "cân thiếu hàng cho khách", "khoảng thời gian thuận lợi để làm việc gì đó".
- When Vietnamese speakers normally use the English word itself as a loanword (blog, email, internet, website, video, pizza, marketing, podcast), use that loanword as the equivalent, optionally with a Vietnamese synonym: "blog", "email; thư điện tử", "viết blog". Do the same in "ex" and "col". Never invent a descriptive phrase such as "trang nhật ký trực tuyến" for it.
- Never exceed 60 characters. Apart from such loanwords, Vietnamese only: no other English and no part-of-speech label.

Rules for "ex":
- Natural, fluent Vietnamese a native speaker would write, faithful to the English sentence, with normal sentence capitalisation and punctuation. Always a complete sentence.
- Keep personal names as they are. Use neutral standard Vietnamese pronouns that fit the context.

Rules for "col":
- A lowercase Vietnamese gloss of the whole collocation that makes sense on its own, at most 55 characters. Use "..." for an open slot.
- Never leave a fragment such as "câu hỏi nào" or "lấy ... trừ đi ...". Complete it: "bất kỳ câu hỏi nào", "trừ ... khỏi ...".

Rules for "tip" (and "note"):
- One or two COMPLETE Vietnamese sentences, 60-160 characters in total, each ending with a full stop. No telegraphic fragments, no dropped subject or verb. The reader is weak at English, so the tip must be clear without outside knowledge.
- Content: the single most useful thing for a Vietnamese learner: usage pattern, a commonly confused word, register, a spelling trap, or a pronunciation trap Vietnamese speakers really have (final consonants, -s / -ed endings, word stress, silent letters).
- Every English word or phrase mentioned inside the tip goes in straight double quotes, and its Vietnamese meaning follows unless it is obvious: Dùng "in" trước tháng và "on" trước một ngày cụ thể. "Last week" nghĩa là tuần trước, còn "the last week" là tuần cuối cùng. Vietnamese meanings are NOT put in quotes. Phonetic symbols stay between slashes, e.g. /waɪnd/.
- Start with a capital letter. When the tip opens with a quoted English word, capitalise that word.
- Write "tiếng Anh Anh" and "tiếng Anh Mỹ" for the two varieties.
- Reuse the idea of the original tip when it is universally true. If it only makes sense for Chinese speakers (Chinese characters, China-specific exams or context), write a new tip. Never mention Chinese characters or the Chinese language unless the headword itself is about China.
- Never invent etymology.

General:
- Correct Vietnamese spelling with full diacritics (tone marks on the standard vowel, e.g. "hòa", "thủy").
- When Northern and Southern everyday words differ, give both in the gloss ("thịt lợn; thịt heo") and use the Northern standard form in sentences.
- No Chinese characters, no full-width punctuation, no curly quotes, and never the em dash character. Use plain ASCII punctuation such as ";" "," "." ":" "-".
- Safe for all ages."""

HAN = re.compile(r"[\u3000-\u303f\u3400-\u9fff\uff00-\uffef]")
VI_MARK = re.compile(r"[àáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]", re.I)
QUOTES = re.compile("["+chr(0x201c)+chr(0x201d)+"]")
BAD = re.compile(r"[\u2014|\uff5c]")


def legacy(d):
    """Old files use the key "zh", localized ones "vi"."""
    return d.get("vi") or d.get("zh") or ""


def split_col(c):
    en, _, tr = c.replace("｜", "|").partition("|")
    return en.strip(), tr.strip()


# Set by --no-hint: leave the older gloss out for entries where the model copies characters from it.
NO_HINT = False


def brief(e):
    hint = (lambda t: "") if NO_HINT else (lambda t: t)
    return {
        "id": e["id"],
        "w": e["w"],
        "cefr": e["cefr"],
        "senses": [{"pos": s["pos"], "en": s["en"], "zh": hint(legacy(s))} for s in e["senses"]],
        "ex": [{"en": x["en"], "zh": hint(legacy(x))} for x in e["ex"]],
        "col": [{"en": split_col(c)[0], "zh": hint(split_col(c)[1])} for c in e["col"]],
        "tip": hint(e.get("tip", "")),
        # The stored result must have a note exactly when the source has one.
        "note": ("(write one short usage note for this word)" if e.get("note") else "") if NO_HINT else e.get("note", ""),
    }


def problems(src, out):
    """Hard failures for one localized entry; an empty list means it can be stored."""
    bad = []
    if out.get("id") != src["id"]:
        return [f"id mismatch {out.get('id')!r}"]
    for key in ("senses", "ex", "col"):
        got = out.get(key)
        if not isinstance(got, list) or len(got) != len(src[key]) or any(not isinstance(x, str) or not x.strip() for x in got):
            bad.append(f"{key}: expected {len(src[key])} non-empty strings")
    if bad:
        return bad
    if not isinstance(out.get("tip"), str) or not out["tip"].strip():
        bad.append("tip empty")
    if not isinstance(out.get("note", ""), str) or bool(src.get("note")) != bool((out.get("note") or "").strip()):
        bad.append("note presence differs from source")
    texts = out["senses"] + out["ex"] + out["col"] + [out.get("tip") or "", out.get("note") or ""]
    if any(HAN.search(t) for t in texts):
        bad.append("CJK or full-width character")
    if any(BAD.search(t) for t in texts):
        bad.append("em dash or pipe")
    if any(len(s) > 70 for s in out["senses"]):
        bad.append("sense longer than 70 chars")
    if any(len(c) > 80 for c in out["col"]):
        bad.append("collocation gloss longer than 80 chars")
    tip = (out.get("tip") or "").strip()
    if len(tip) > 220:
        bad.append("tip longer than 220 chars")
    if tip and (len(tip) < 30 or tip[-1] not in ".!?" or tip.count('"') % 2):
        bad.append("tip is a fragment, lacks a final stop or has unbalanced quotes")
    if any(len(x.split()) >= 5 and not VI_MARK.search(x) for x in out["ex"]):
        bad.append("example translation has no Vietnamese diacritics")
    return bad


def clean(out):
    fix = lambda t: re.sub(r"\s+", " ", QUOTES.sub('"', t.replace("…", "..."))).strip()
    bare = lambda t: t if t.endswith("...") else t.rstrip(".")
    return {
        "id": out["id"],
        "senses": [bare(fix(x)) for x in out["senses"]],
        "ex": [fix(x) for x in out["ex"]],
        "col": [bare(fix(x)) for x in out["col"]],
        "tip": fix(out["tip"]),
        "note": fix(out.get("note") or ""),
    }


def run_batch(env, model, batch, outdir):
    name = hashlib.sha1("|".join(e["id"] for e in batch).encode()).hexdigest()[:16]
    payload = {
        "model": model,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": "Entries:\n" + json.dumps([brief(e) for e in batch], ensure_ascii=False)},
        ],
    }

    def call():
        text = stream_chat(env, payload)
        text = re.sub(r"^```(?:json)?|```$", "", text.strip()).strip()
        got = json.loads(text)["entries"]
        if len(got) != len(batch):
            raise ValueError(f"expected {len(batch)} got {len(got)}")
        return got

    got = with_retry(call, tries=4, base=5)
    good, rejected = [], []
    for src, out in zip(batch, got):
        out = clean(out) if not problems(src, out) else out
        bad = problems(src, out)
        (rejected if bad else good).append((src["id"], out, bad))
    if good:
        (outdir / f"{name}.json").write_text(json.dumps([o for _, o, _ in good], ensure_ascii=False, indent=1))
    return [(i, bad) for i, _, bad in rejected]


def done_ids(outdir):
    ids = set()
    for p in outdir.glob("*.json"):
        try:
            ids.update(e["id"] for e in json.loads(p.read_text()))
        except Exception:
            pass
    return ids


def main():
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--sample", type=int, help="stratified pilot of about N entries")
    g.add_argument("--ids", help="comma separated entry ids")
    g.add_argument("--all", action="store_true")
    ap.add_argument("--workers", type=int, default=6)
    ap.add_argument("--batch", type=int, default=10)
    ap.add_argument("--model", default="gpt-6.2-sol")
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--redo", action="store_true", help="ignore stored results for the selected ids")
    ap.add_argument("--no-hint", action="store_true", help="send English only, without the older gloss (for entries that keep failing the character check)")
    a = ap.parse_args()
    global NO_HINT
    NO_HINT = a.no_hint

    entries = json.loads((ROOT / "data" / "word-atlas.json").read_text())
    by_id = {e["id"]: e for e in entries}
    if a.all:
        todo = entries
    elif a.ids:
        todo = [by_id[i] for i in a.ids.split(",") if i in by_id]
    else:
        rnd = random.Random(a.seed)
        scale = a.sample / sum(PILOT_MIX.values())
        todo = [by_id[i] for i in PILOT_MUST if i in by_id]
        picked = {e["id"] for e in todo}
        for level, n in PILOT_MIX.items():
            pool = [e for e in entries if e["cefr"] == level and e["id"] not in picked]
            todo += rnd.sample(pool, min(len(pool), round(n * scale)))

    outdir = FORGE / "vi"
    outdir.mkdir(parents=True, exist_ok=True)
    if not a.redo:
        have = done_ids(outdir)
        todo = [e for e in todo if e["id"] not in have]
    if not todo:
        print("nothing to do")
        return 0
    env = load_env()
    if not env.get("SUB2_API_KEY"):
        raise SystemExit("no API key: set OPENAI_API_KEY or SUB2_API_KEY")
    batches = [todo[i : i + a.batch] for i in range(0, len(todo), a.batch)]
    ok = fail = 0
    rejected = []
    with cf.ThreadPoolExecutor(a.workers) as ex:
        futs = {ex.submit(run_batch, env, a.model, b, outdir): b for b in batches}
        for f in cf.as_completed(futs):
            try:
                rej = f.result()
                rejected += rej
                ok += len(futs[f]) - len(rej)
            except Exception as e:
                fail += len(futs[f])
                print("FAIL", futs[f][0]["id"], str(e)[:200], flush=True)
            if (ok + fail + len(rejected)) % 100 < a.batch:
                print(f"progress {ok + fail + len(rejected)}/{len(todo)} rejected={len(rejected)} failed={fail}", flush=True)
    for i, bad in rejected:
        print("REJECT", i, "; ".join(bad), flush=True)
    print(f"finished stored={ok} rejected={len(rejected)} failed={fail} (rerun to retry the rest)", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())

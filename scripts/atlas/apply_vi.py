"""Merge localize_vi.py output into the published dataset, in place.

Rewrites public/atlas/index.json, public/atlas/entries/*.json and data/word-atlas.json|.csv
with the Vietnamese schema ("vi" keys, "english|tiếng Việt" collocations). Order, ids and
media flags are kept, so illustrations and recordings need no rebuild. Entries without a
stored localization keep their previous text and are counted as pending.

Usage: python3 scripts/atlas/apply_vi.py [--strict]   (--strict fails while entries are pending)
"""
import argparse
import csv
import json
import re
import sys

from common import FORGE, ROOT

TOPICS = [
    ("education", "Giáo dục"), ("work", "Công việc"), ("technology", "Công nghệ"), ("science", "Khoa học"),
    ("environment", "Môi trường"), ("health", "Sức khỏe"), ("society", "Xã hội"), ("government", "Chính trị"),
    ("economy", "Kinh tế"), ("media", "Truyền thông"), ("arts", "Nghệ thuật"), ("travel", "Du lịch"),
    ("city", "Đô thị"), ("nature", "Thiên nhiên"), ("daily", "Đời sống"), ("emotion", "Cảm xúc"),
    ("thinking", "Tư duy"), ("sport", "Thể thao"), ("history", "Lịch sử"),
]
PUB = ROOT / "public" / "atlas"
DATA = ROOT / "data"


HAN = re.compile(r"[\u3400-\u9fff]")


def old(d):
    return d.get("vi") if "vi" in d else d.get("zh", "")


def split_col(c):
    en, _, tr = c.replace("｜", "|").partition("|")
    return en.strip(), tr.strip()


def localize(e, vi):
    """Return the entry in the Vietnamese schema, using `vi` when it is available."""
    out = {}
    for k, v in e.items():
        if k == "senses":
            out[k] = [{"pos": s["pos"], "vi": vi["senses"][i] if vi else old(s), "en": s["en"]} for i, s in enumerate(v)]
        elif k == "ex":
            out[k] = [{"en": x["en"], "vi": vi["ex"][i] if vi else old(x)} for i, x in enumerate(v)]
        elif k == "col":
            out[k] = [f"{split_col(c)[0]}|{vi['col'][i] if vi else split_col(c)[1]}" for i, c in enumerate(v)]
        elif k == "tip" and vi:
            out[k] = vi["tip"]
        elif k == "note" and vi:
            out[k] = vi["note"]
        elif k in ("fam", "syn", "ant"):
            # English-only lists: drop the rare Chinese leftover in the source data.
            out[k] = [x for x in v if not HAN.search(x)]
        else:
            out[k] = v
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--strict", action="store_true")
    a = ap.parse_args()

    store = {}
    for p in sorted((FORGE / "vi").glob("*.json")):
        for e in json.loads(p.read_text()):
            store[e["id"]] = e

    index = json.loads((PUB / "index.json").read_text())
    pending = []
    row_of = {r[0]: r for r in index["words"]}

    def convert(e):
        vi = store.get(e["id"])
        if vi and (len(vi["senses"]) != len(e["senses"]) or len(vi["ex"]) != len(e["ex"]) or len(vi["col"]) != len(e["col"])):
            vi = None  # stale localization for an entry that has since changed
        return localize(e, vi), bool(vi)

    for n in range(0, index["count"], index["chunk"]):
        path = PUB / "entries" / f"{n // index['chunk']}.json"
        chunk = []
        for e in json.loads(path.read_text()):
            c, done = convert(e)
            if not done:
                pending.append(e["id"])
            s0 = c["senses"][0]
            row_of[e["id"]][2] = f'{s0["pos"]} {s0["vi"]}'.strip()
            chunk.append(c)
        path.write_text(json.dumps(chunk, ensure_ascii=False, separators=(",", ":")))

    index["topics"] = TOPICS
    index["fields"] = ["id", "word", "vi", "ipa", "cefr", "topic", "media"]
    index["lang"] = "vi"
    (PUB / "index.json").write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")))

    public = [convert(e)[0] for e in json.loads((DATA / "word-atlas.json").read_text())]
    (DATA / "word-atlas.json").write_text(json.dumps(public, ensure_ascii=False, indent=1))
    with open(DATA / "word-atlas.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["id", "word", "ipa_uk", "ipa_us", "cefr", "topic", "meanings_vi", "definition_en",
                    "example1_en", "example1_vi", "example2_en", "example2_vi", "collocations", "word_family",
                    "synonyms", "antonyms", "tip_vi"])
        for c in public:
            ex = c["ex"] + [{"en": "", "vi": ""}] * (2 - len(c["ex"]))
            w.writerow([c["id"], c["w"], c["uk"], c["us"], c["cefr"], c["topic"],
                        " | ".join(f'{s["pos"]} {s["vi"]}' for s in c["senses"]),
                        " | ".join(s["en"] for s in c["senses"]),
                        ex[0]["en"], ex[0]["vi"], ex[1]["en"], ex[1]["vi"],
                        " ; ".join(c["col"]), " ; ".join(c["fam"]), ", ".join(c["syn"]), ", ".join(c["ant"]), c["tip"]])

    print(json.dumps({"entries": index["count"], "localized": index["count"] - len(pending), "pending": len(pending)}))
    if pending and a.strict:
        print("pending:", ", ".join(pending[:20]), "..." if len(pending) > 20 else "", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

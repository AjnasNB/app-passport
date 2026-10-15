"""Align trust-launch subtitle sidecars without touching the encoded video.

Uses the exact script in voice/timeline.json and ordered word anchors from the
independent readback.json. Compound/number/name normalization is alignment-only:
all written script tokens are preserved. Run with --dry-run before applying.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def normalize(token: str) -> str:
    token = token.lower().replace("’", "").replace("'", "")
    token = re.sub(r"[^a-z0-9.]", "", token).strip(".")
    return {
        "arciv": "arkiv", "archiv": "arkiv",
        "arcivs": "arkivs", "archivs": "arkivs",
        "one": "1", "two": "2", "three": "3", "six": "6",
        "eighteen": "18", "ninetyeight": "98", "ninetysix": "96",
    }.get(token, token)


PHRASES = {
    ("zero", "point", "four"): "0.4",
    ("zero", "point", "6"): "0.6",
    ("car", "in", "a"): "qarinah",
    ("physical", "phone"): "physicalphone",
}


def units(tokens: list[str]) -> list[dict]:
    result, i = [], 0
    normalized = [normalize(t) for t in tokens]
    while i < len(tokens):
        count, canonical = 1, normalized[i]
        for phrase, value in PHRASES.items():
            if tuple(normalized[i:i + len(phrase)]) == phrase:
                count, canonical = len(phrase), value
                break
        result.append({"first": i, "last": i + count - 1,
                       "canonical": canonical, "text": " ".join(tokens[i:i + count])})
        i += count
    return result


def ordered_alignment(script: list[dict], heard: list[dict]) -> list[tuple]:
    """Minimum edit alignment; timing never chooses/reorders script words."""
    rows, cols = len(script), len(heard)
    cost = [[0] * (cols + 1) for _ in range(rows + 1)]
    for i in range(rows + 1):
        cost[i][0] = 2 * i
    for j in range(cols + 1):
        cost[0][j] = 2 * j
    for i in range(1, rows + 1):
        for j in range(1, cols + 1):
            same = script[i - 1]["canonical"] == heard[j - 1]["canonical"]
            cost[i][j] = min(cost[i - 1][j - 1] + (0 if same else 3),
                             cost[i - 1][j] + 2, cost[i][j - 1] + 2)
    result, i, j = [], rows, cols
    while i or j:
        same = i and j and script[i - 1]["canonical"] == heard[j - 1]["canonical"]
        if i and j and cost[i][j] == cost[i - 1][j - 1] + (0 if same else 3):
            result.append((i - 1, j - 1, "normalized_match" if same else "substitution"))
            i, j = i - 1, j - 1
        elif i and cost[i][j] == cost[i - 1][j] + 2:
            result.append((i - 1, None, "script_unmatched"))
            i -= 1
        else:
            result.append((None, j - 1, "asr_unmatched"))
            j -= 1
    return list(reversed(result))


def seconds(value: str) -> float:
    h, m, s, ms = map(int, re.split(r"[:,.]", value))
    return h * 3600 + m * 60 + s + ms / 1000


def parse_srt(text: str) -> list[dict]:
    result, offset = [], 0
    for block in re.split(r"\r?\n\r?\n", text.strip()):
        rows = block.splitlines()
        start, end = rows[1].split(" --> ")
        words = " ".join(rows[2:]).split()
        result.append({"id": int(rows[0]), "start": seconds(start), "end": seconds(end),
                       "text": " ".join(words), "first_word": offset,
                       "last_word": offset + len(words) - 1})
        offset += len(words)
    return result


def wrap(words: list[str], width: int) -> list[str] | None:
    text = " ".join(words)
    if len(text) <= width:
        return [text]
    choices = []
    forbidden = {i for unit in units(words)
                 for i in range(unit["first"] + 1, unit["last"] + 1)}
    for i in range(1, len(words)):
        if i in forbidden:
            continue
        left, right = " ".join(words[:i]), " ".join(words[i:])
        if max(len(left), len(right)) <= width and len(words) - i > 1:
            choices.append((abs(len(left) - len(right)), i, [left, right]))
    return min(choices)[2] if choices else None


def time_string(value: float, separator: str) -> str:
    ms = round(value * 1000)
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02}{separator}{ms:03}"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--final-dir", type=Path, required=True)
    parser.add_argument("--max-cps", type=float, default=19.5)
    parser.add_argument("--max-line", type=int, default=42)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    folder = args.final_dir
    paths = {key: folder / name for key, name in {
        "video": "arkiv-graph-launch.mp4", "srt": "arkiv-graph-launch.srt",
        "vtt": "arkiv-graph-launch.vtt", "readback": "readback.json",
        "timeline": "voice/timeline.json", "audit": "caption-alignment.json",
    }.items()}
    video_sha = sha(paths["video"].read_bytes())
    timeline = json.loads(paths["timeline"].read_text(encoding="utf-8"))["lines"]
    readback = json.loads(paths["readback"].read_text(encoding="utf-8"))
    heard_words = [w for w in readback["words"] if w.get("type") == "word"]
    script, line_of, line_ranges = [], [], []
    for line_no, line in enumerate(timeline):
        first = len(script)
        script.extend(line["text"].split())
        line_of.extend([line_no] * (len(script) - first))
        line_ranges.append((first, len(script) - 1))
    current = parse_srt(paths["srt"].read_text(encoding="utf-8"))
    if [w for c in current for w in c["text"].split()] != script:
        raise ValueError("SRT differs from the exact timeline script")
    if len(script) != 339:
        raise ValueError(f"Expected the approved 339-word script, got {len(script)}")
    original = current
    if paths["audit"].exists():
        previous = json.loads(paths["audit"].read_text(encoding="utf-8"))
        if previous.get("srt_sha256") == sha(paths["srt"].read_bytes()):
            original = previous["original_cues"]

    script_units = units(script)
    asr_units = units([w["text"] for w in heard_words])
    mapping = ordered_alignment(script_units, asr_units)
    starts, ends = [None] * len(script), [None] * len(script)
    sources, uncertainties, forbidden_breaks = {}, [], set()
    for si, ai, method in mapping:
        if si is None:
            uncertainties.append({"kind": method, "asr": asr_units[ai]})
            continue
        su = script_units[si]
        forbidden_breaks.update(range(su["first"] + 1, su["last"] + 1))
        if ai is None:
            # Do not silently return to proportional timing after an alignment miss.
            raise ValueError(f"No ASR anchor for script unit {su}")
        au = asr_units[ai]
        heard_span = heard_words[au["first"]:au["last"] + 1]
        begin, finish = heard_span[0]["start"], heard_span[-1]["end"]
        first, last = su["first"], su["last"]
        line = timeline[line_of[first]]
        trusted_first = line_ranges[line_of[first]][0] == first
        if trusted_first and (begin < line["start"] - 0.15 or finish - begin > 0.9):
            uncertainties.append({"kind": "scene_first_asr_spans_previous_pause",
                                  "script": su["text"], "line_id": line["id"],
                                  "asr_start": begin, "asr_end": finish,
                                  "trusted_synthesis_start": line["start"]})
            begin = line["start"]
            finish = max(finish, begin + 0.05)
            method = "trusted_synthesis_start"
        if method == "substitution":
            uncertainties.append({"kind": method, "script": su["text"],
                                  "asr": au["text"], "start": begin, "end": finish})
        confidences = [w.get("conf", 1) for w in heard_span]
        if min(confidences) < 0.8:
            uncertainties.append({"kind": "low_asr_confidence", "script": su["text"],
                                  "asr": au["text"], "min_confidence": min(confidences),
                                  "start": begin, "end": finish})
        # A number phrase is one acoustic unit. Its interior word estimates are
        # recorded, but subtitle boundaries are forbidden inside that unit.
        weights = [len(t) for t in script[first:last + 1]]
        total, progress = sum(weights), 0
        for wi, weight in zip(range(first, last + 1), weights):
            starts[wi] = begin + (finish - begin) * progress / total
            progress += weight
            ends[wi] = begin + (finish - begin) * progress / total
            sources[wi] = {"method": method, "script_unit": su["text"],
                           "asr_unit": au["text"], "asr_start": heard_span[0]["start"],
                           "asr_end": heard_span[-1]["end"],
                           "min_confidence": min(confidences)}
    if any(v is None for v in starts + ends):
        raise ValueError("Incomplete word timing")
    if any(starts[i] > starts[i + 1] for i in range(len(starts) - 1)):
        raise ValueError("ASR anchors are not ordered after trusted-start repair")

    original_breaks = {c["last_word"] + 1 for c in original}
    final = []
    for line_no, (first, last) in enumerate(line_ranges):
        # Dynamic programming reflows a complete voice line under line-length,
        # two-line, reading-speed, gap and acoustic-unit constraints.
        best = {last + 1: (0.0, [])}
        for i in range(last, first - 1, -1):
            if i in forbidden_breaks:
                continue
            choices = []
            for j in range(i + 1, last + 1):
                if j + 1 in forbidden_breaks or j + 1 not in best:
                    continue
                text = " ".join(script[i:j + 1])
                if len(text) > args.max_line * 2 + 1:
                    break
                rows = wrap(script[i:j + 1], args.max_line)
                if rows is None:
                    continue
                begin = round(max(0, starts[i] - 0.05), 3)
                finish = round((starts[j + 1] - 0.08) if j < last
                               else timeline[line_no]["end"], 3)
                duration = finish - begin
                if duration < 0.75 or duration > 7.0:
                    continue
                cps = len(text) / duration
                if cps > args.max_cps + 1e-9:
                    continue
                if finish < ends[j] - 0.15:
                    continue
                # Retain existing textual breaks when equally good, but prefer
                # complete clauses and balanced lines over proportional groups.
                penalty = 100 + (0 if j + 1 in original_breaks else 2)
                penalty += 0 if re.search(r"[.!?:;]$", script[j]) else 5
                penalty += abs(len(rows[0]) - len(rows[-1])) / 100
                cue = {"start": begin, "end": finish, "text": text, "lines": rows,
                       "first_word": i, "last_word": j,
                       "voice_line": timeline[line_no]["id"],
                       "cps": round(cps, 4), "start_anchor": sources[i]}
                tail_cost, tail = best[j + 1]
                choices.append((penalty + tail_cost, [cue] + tail))
            if choices:
                best[i] = min(choices, key=lambda item: item[0])
        if first not in best:
            raise ValueError(f"No readable alignment for voice line {timeline[line_no]['id']}")
        final.extend(best[first][1])

    for cue_no, cue in enumerate(final, 1):
        cue["id"] = cue_no
    if [w for c in final for w in c["text"].split()] != script:
        raise ValueError("Final captions changed script text/order")
    overlaps = sum(a["end"] > b["start"] for a, b in zip(final, final[1:]))
    if overlaps:
        raise ValueError("Final caption overlap")
    srt = "\n".join(f"{c['id']}\n{time_string(c['start'], ',')} --> "
                    f"{time_string(c['end'], ',')}\n" + "\n".join(c["lines"]) + "\n"
                    for c in final)
    vtt = "WEBVTT\n\n" + re.sub(r"(\d{2}:\d{2}:\d{2}),(\d{3})", r"\1.\2", srt)
    srt_bytes, vtt_bytes = srt.encode("utf-8"), vtt.encode("utf-8")
    corrections = [{"original_cue": c["id"], "original_start": c["start"],
                    "original_end": c["end"], "first_word": c["first_word"],
                    "last_word": c["last_word"],
                    "asr_or_trusted_start": round(starts[c["first_word"]], 3),
                    "original_start_minus_anchor_ms": round((c["start"] - starts[c["first_word"]]) * 1000),
                    "final_cues_covering_original_words": [n["id"] for n in final
                        if n["first_word"] <= c["last_word"] and n["last_word"] >= c["first_word"]]}
                   for c in original]
    audit = {
        "status": "pass", "authored_by": "caption-correction agent; requires independent verification",
        "method": "Ordered script/ASR unit edit alignment with explicit number, compound and proper-name normalization; exact script retained. Cue starts lead ASR anchors by 50ms. Known synthesis starts replace implausible scene-first ASR anchors. Dynamic-programming reflow enforces two lines, 42 chars/line, no overlaps and <=19.5 CPS; no proportional fallback for unmatched words.",
        "script_word_count": len(script), "asr_word_count": len(heard_words),
        "script_normalized_units": len(script_units), "asr_normalized_units": len(asr_units),
        "exact_script_text_preserved": True, "mp4_sha256": video_sha,
        "mp4_bytes": paths["video"].stat().st_size,
        "readback_sha256": sha(paths["readback"].read_bytes()),
        "timeline_sha256": sha(paths["timeline"].read_bytes()),
        "generator_sha256": sha(Path(__file__).read_bytes()),
        "srt_sha256": sha(srt_bytes), "vtt_sha256": sha(vtt_bytes),
        "cue_count": len(final), "max_cps": round(max(c["cps"] for c in final), 4),
        "max_line_characters": max(len(row) for c in final for row in c["lines"]),
        "minimum_cue_seconds": round(min(c["end"] - c["start"] for c in final), 3),
        "overlaps": overlaps, "asr_uncertainties": uncertainties,
        "original_cues": original, "final_cues": final, "corrections": corrections,
    }
    if not args.dry_run:
        paths["srt"].write_bytes(srt_bytes)
        paths["vtt"].write_bytes(vtt_bytes)
        if sha(paths["video"].read_bytes()) != video_sha:
            raise ValueError("MP4 identity changed during sidecar work")
        paths["audit"].write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: audit[k] for k in ["status", "script_word_count", "asr_word_count",
          "script_normalized_units", "asr_normalized_units", "cue_count", "max_cps",
          "max_line_characters", "overlaps", "srt_sha256", "vtt_sha256", "asr_uncertainties"]}, indent=2))
    if args.dry_run:
        print(json.dumps(final, ensure_ascii=True, indent=2))


if __name__ == "__main__":
    main()

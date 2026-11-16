#!/usr/bin/env python
"""Write project/words.json from script.txt + assets/audio/voice.wav.

Usage: python scripts/align.py <videoFolder> [--model base.en]
Backends: faster-whisper (word timestamps, edit-distance mapped to script words), otherwise
tts_lines.json / ffmpeg silencedetect line spans with per-line proportional word timing.
"""
import argparse
import difflib
import json
import os
import re
import subprocess
import sys
import wave


def read_script(folder):
    """Returns a list of lines: (caption_words, spoken_words)."""
    out = []
    with open(os.path.join(folder, "project", "script.txt"), "r", encoding="utf-8-sig") as f:
        for raw in f.read().splitlines():
            if not raw.strip():
                continue
            if "\t" in raw:
                cap, spoken = raw.split("\t", 1)
                spoken = spoken.strip() or cap
            else:
                cap = spoken = raw
            out.append((cap.split(), spoken.split()))
    return out


def norm(t):
    t = t.lower().replace("’", "'")
    return re.sub(r"[^a-z0-9']+", "", t)


def wav_duration(path):
    try:
        with wave.open(path, "rb") as w:
            return w.getnframes() / w.getframerate()
    except Exception:
        r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path], capture_output=True, text=True)
        return float(r.stdout.strip())


def distribute(words, t0, t1):
    """Distribute words over [t0, t1]: time ~ chars + const, small gaps at punctuation."""
    n = len(words)
    if n == 0:
        return []
    span = max(t1 - t0, 0.01 * n)
    gaps = []
    for i, w in enumerate(words):
        if i == n - 1:
            gaps.append(0.0)
        elif re.search(r"[.!?]$", w):
            gaps.append(0.12)
        elif re.search(r"[,;:—-]$", w):
            gaps.append(0.07)
        else:
            gaps.append(0.0)
    gsum = sum(gaps)
    if gsum > span * 0.3:
        k = span * 0.3 / gsum
        gaps = [g * k for g in gaps]
        gsum = sum(gaps)
    weights = [len(norm(w)) + 2.0 for w in words]
    avail = span - gsum
    out = []
    t = t0
    for wt, g in zip(weights, gaps):
        d = avail * wt / sum(weights)
        out.append((t, t + d))
        t += d + g
    out[-1] = (out[-1][0], t0 + span)
    return out


def line_spans_from_tts(folder, voice, n):
    p = os.path.join(folder, "project", "tts_lines.json")
    if not os.path.exists(p) or os.path.getmtime(p) < os.path.getmtime(voice) - 2:
        return None
    with open(p, encoding="utf-8") as f:
        spans = json.load(f)
    if len(spans) != n:
        return None
    if abs(spans[-1]["end"] - wav_duration(voice)) > 0.5:
        return None
    return [(s["start"], s["end"]) for s in spans]


def line_spans_from_silence(voice, n):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", voice, "-af", "silencedetect=noise=-35dB:d=0.25", "-f", "null", "-"], capture_output=True, text=True)
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", r.stderr)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", r.stderr)]
    dur = wav_duration(voice)
    speech = []
    cur = 0.0
    for i, s in enumerate(starts):
        e = ends[i] if i < len(ends) else dur
        if s - cur > 0.05:
            speech.append((cur, s))
        cur = e
    if dur - cur > 0.05:
        speech.append((cur, dur))
    if not speech:
        return [(dur * i / n, dur * (i + 1) / n) for i in range(n)]
    if len(speech) < n:
        print("warning: only %d speech segments for %d lines; splitting evenly" % (len(speech), n), file=sys.stderr)
        t0, total = speech[0][0], speech[-1][1] - speech[0][0]
        return [(t0 + total * i / n, t0 + total * (i + 1) / n) for i in range(n)]
    # Line boundaries = the n-1 longest silences between speech segments.
    gaps = [(speech[i + 1][0] - speech[i][1], i) for i in range(len(speech) - 1)]
    idx = sorted(g[1] for g in sorted(gaps, reverse=True)[: n - 1])
    spans = []
    first = 0
    for b in idx + [len(speech) - 1]:
        spans.append((speech[first][0], speech[b][1]))
        first = b + 1
    return spans


def align_fallback(folder, voice, script):
    spans = line_spans_from_tts(folder, voice, len(script))
    backend = "line spans (tts_lines.json)"
    if spans is None:
        spans = line_spans_from_silence(voice, len(script))
        backend = "line spans (ffmpeg silencedetect)"
    res = []
    for li, ((cap, _), (a, b)) in enumerate(zip(script, spans)):
        for w, (s, e) in zip(cap, distribute(cap, a, b)):
            res.append({"w": w, "s": s, "e": e, "line": li})
    return res, backend


def align_whisper(voice, script, model_name):
    from faster_whisper import WhisperModel

    model = WhisperModel(model_name, device="cpu", compute_type="int8")
    segs, _ = model.transcribe(voice, word_timestamps=True, language="en")
    rec = [(norm(w.word), w.start, w.end) for sg in segs for w in (sg.words or []) if norm(w.word)]
    spoken = []
    for li, (_, sp) in enumerate(script):
        for w in sp:
            spoken.append((norm(w), li))
    sm = difflib.SequenceMatcher(None, [s[0] for s in spoken], [r[0] for r in rec], autojunk=False)
    t = [None] * len(spoken)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal" or (tag == "replace" and (i2 - i1) == (j2 - j1)):
            for k in range(i2 - i1):
                t[i1 + k] = (rec[j1 + k][1], rec[j1 + k][2])
    dur = wav_duration(voice)
    n = len(t)
    i = 0
    while i < n:
        if t[i] is not None:
            i += 1
            continue
        j = i
        while j < n and t[j] is None:
            j += 1
        a = t[i - 1][1] if i > 0 else 0.0
        b = t[j][0] if j < n else dur
        labels = [spoken[k][0] or "x" for k in range(i, j)]
        for k, (s, e) in zip(range(i, j), distribute(labels, a, max(b, a + 0.02 * (j - i)))):
            t[k] = (s, e)
        i = j
    res = []
    pos = 0
    for li, (cap, sp) in enumerate(script):
        sl = t[pos : pos + len(sp)]
        pos += len(sp)
        if len(cap) == len(sp):
            for w, (s, e) in zip(cap, sl):
                res.append({"w": w, "s": s, "e": e, "line": li})
        else:
            for w, (s, e) in zip(cap, distribute(cap, sl[0][0], sl[-1][1])):
                res.append({"w": w, "s": s, "e": e, "line": li})
    return res


def finalize(res):
    """Monotonic starts, e > s, no overlap with the next word, rounded to 3 decimals."""
    out = []
    prev_s = 0.0
    for i, w in enumerate(res):
        s = round(max(w["s"], prev_s), 3)
        e = round(max(w["e"], s + 0.02), 3)
        if i + 1 < len(res):
            nxt = round(max(res[i + 1]["s"], s + 0.02), 3)
            e = min(e, nxt)
        out.append({"i": i, "w": w["w"], "s": s, "e": e, "line": w["line"]})
        prev_s = s
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder")
    ap.add_argument("--model", default="base.en")
    a = ap.parse_args()
    folder = os.path.abspath(a.folder)
    voice = os.path.join(folder, "assets", "audio", "voice.wav")
    if not os.path.exists(voice):
        sys.exit("missing " + voice)
    script = read_script(folder)
    if not script:
        sys.exit("script.txt has no narration lines")
    try:
        import faster_whisper  # noqa: F401

        res = align_whisper(voice, script, a.model)
        backend = "faster-whisper (%s)" % a.model
    except ImportError:
        res, backend = align_fallback(folder, voice, script)
    print("Align backend: " + backend)
    words = finalize(res)
    with open(os.path.join(folder, "project", "words.json"), "w", encoding="utf-8") as f:
        json.dump(words, f, indent=1, ensure_ascii=False)
    print("Wrote project/words.json: %d words, ends at %.3f s (wav %.3f s)" % (len(words), words[-1]["e"], wav_duration(voice)))


if __name__ == "__main__":
    main()

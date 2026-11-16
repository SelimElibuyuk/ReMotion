#!/usr/bin/env python
"""Synthesise project/script.txt into assets/audio/voice.wav (one wav per line, trimmed, 70 ms gaps).

Usage: python scripts/tts.py <videoFolder> [--voice af_heart] [--speed 1.12]
Backends: Kokoro if importable, otherwise Windows SAPI (System.Speech) through PowerShell.
Also writes project/tts_lines.json: [{line, start, end}] (seconds) for align.py's fallback.
"""
import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
import wave

SR = 24000
GAP_S = 0.070


def read_lines(folder):
    path = os.path.join(folder, "project", "script.txt")
    out = []  # (caption, spoken)
    with open(path, "r", encoding="utf-8-sig") as f:
        for raw in f.read().splitlines():
            if not raw.strip():
                continue
            if "\t" in raw:
                cap, spoken = raw.split("\t", 1)
                spoken = spoken.strip() or cap.strip()
            else:
                cap = spoken = raw
            out.append((cap.strip(), spoken.strip()))
    return out


def run(cmd):
    return subprocess.run(cmd, shell=False, capture_output=True, text=True)


def synth_kokoro(lines, tmp, voice, speed):
    import numpy as np
    from kokoro import KPipeline

    pipe = KPipeline(lang_code=voice[0] if voice else "a")
    paths = []
    for i, (_, spoken) in enumerate(lines):
        chunks = [np.asarray(audio, dtype=np.float32) for _, _, audio in pipe(spoken, voice=voice, speed=speed)]
        data = np.concatenate(chunks) if chunks else np.zeros(int(SR * 0.2), dtype=np.float32)
        pcm = (np.clip(data, -1, 1) * 32767).astype("<i2")
        p = os.path.join(tmp, "raw_%03d.wav" % i)
        with wave.open(p, "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(pcm.tobytes())
        paths.append(p)
    return paths


SAPI_PS1 = """param([string]$Jobs,[int]$Rate)
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$names = $s.GetInstalledVoices() | Where-Object { $_.Enabled } | ForEach-Object { $_.VoiceInfo.Name }
$pick = $names | Where-Object { $_ -match 'Zira|David' } | Select-Object -First 1
if (-not $pick) { $pick = $names | Where-Object { $_ -match 'English' } | Select-Object -First 1 }
if ($pick) { $s.SelectVoice($pick) }
[Console]::Out.WriteLine('VOICE=' + $s.Voice.Name)
$s.Rate = $Rate
$list = Get-Content -Raw -Encoding UTF8 $Jobs | ConvertFrom-Json
foreach ($j in $list) {
  $s.SetOutputToWaveFile($j.wav)
  $s.Speak((Get-Content -Raw -Encoding UTF8 $j.txt))
  $s.SetOutputToNull()
}
$s.Dispose()
"""


def synth_sapi(lines, tmp, speed):
    rate = max(-10, min(10, round((speed - 1.0) * 10)))
    jobs = []
    paths = []
    for i, (_, spoken) in enumerate(lines):
        txt = os.path.join(tmp, "line_%03d.txt" % i)
        with open(txt, "w", encoding="utf-8") as f:
            f.write(spoken)
        wav = os.path.join(tmp, "raw_%03d.wav" % i)
        jobs.append({"txt": txt, "wav": wav})
        paths.append(wav)
    jobs_path = os.path.join(tmp, "jobs.json")
    with open(jobs_path, "w", encoding="utf-8") as f:
        json.dump(jobs, f)
    ps1 = os.path.join(tmp, "sapi.ps1")
    with open(ps1, "w", encoding="utf-8-sig") as f:
        f.write(SAPI_PS1)
    r = run(["powershell.exe", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", ps1, "-Jobs", jobs_path, "-Rate", str(rate)])
    if r.returncode != 0:
        sys.exit("SAPI synthesis failed:\n%s\n%s" % (r.stdout, r.stderr))
    for line in r.stdout.splitlines():
        if line.startswith("VOICE="):
            print("SAPI voice:", line[6:].strip())
    for p in paths:
        if not os.path.exists(p):
            sys.exit("SAPI did not produce " + p)
    return paths


def trim_to_mono(src, dst):
    """Trim leading/trailing silence, convert to mono 24 kHz s16."""
    sil = "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02:detection=peak"
    af = "%s,areverse,%s,areverse" % (sil, sil)
    r = run(["ffmpeg", "-y", "-v", "error", "-i", src, "-af", af, "-ac", "1", "-ar", str(SR), "-c:a", "pcm_s16le", dst])
    if r.returncode != 0:
        sys.exit("ffmpeg trim failed: " + r.stderr)


def read_pcm(path):
    with wave.open(path, "rb") as w:
        assert w.getnchannels() == 1 and w.getsampwidth() == 2 and w.getframerate() == SR, "unexpected wav format"
        return w.readframes(w.getnframes())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder")
    ap.add_argument("--voice", default="af_heart")
    ap.add_argument("--speed", type=float, default=1.12)
    a = ap.parse_args()
    folder = os.path.abspath(a.folder)
    lines = read_lines(folder)
    if not lines:
        sys.exit("script.txt has no narration lines")
    if not shutil.which("ffmpeg"):
        sys.exit("ffmpeg not found on PATH")

    tmp = tempfile.mkdtemp(prefix="tts_")
    try:
        try:
            import kokoro  # noqa: F401

            backend = "kokoro"
        except Exception:
            backend = "sapi"
        print("TTS backend: " + backend)
        raw = synth_kokoro(lines, tmp, a.voice, a.speed) if backend == "kokoro" else synth_sapi(lines, tmp, a.speed)

        gap = b"\x00\x00" * int(round(SR * GAP_S))
        pcm_all = b""
        spans = []
        for i, p in enumerate(raw):
            t = os.path.join(tmp, "trim_%03d.wav" % i)
            trim_to_mono(p, t)
            pcm = read_pcm(t)
            if i > 0:
                pcm_all += gap
            start = len(pcm_all) / 2 / SR
            pcm_all += pcm
            spans.append({"line": i, "start": round(start, 3), "end": round(len(pcm_all) / 2 / SR, 3)})

        out_dir = os.path.join(folder, "assets", "audio")
        os.makedirs(out_dir, exist_ok=True)
        out = os.path.join(out_dir, "voice.wav")
        with wave.open(out, "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(pcm_all)
        with open(os.path.join(folder, "project", "tts_lines.json"), "w", encoding="utf-8") as f:
            json.dump(spans, f, indent=1)
        print("Wrote %s (%.2f s, %d lines) and project/tts_lines.json" % (out, spans[-1]["end"], len(lines)))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()

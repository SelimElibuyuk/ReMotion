# Explainer Engine — Project Spec

Nov 16, 2026 · @Selim Elibüyük

## Goal and scope

Build a code-driven engine that turns a written scene file plus a voiceover into a finished 1080×1920 explainer short, 60–80 s, in a calm, story-led tone: one concrete story, a named idea, a takeaway. Every video has one consistent visual theme, elements appear in sync with the narration, and there are almost no hard cuts.

In scope:
- A theme system so a new video picks a look instead of designing one
- A library of animated primitives (draw-on shapes, counters, charts, timelines, labels, captions)
- A JSON scene format that Claude can write and the engine renders without code changes
- Word-level sync between narration and animation
- One-command rendering into the C:\Yts\NNN_topic\export folders

Not in scope for v1: character animation, 3D, particle effects, live footage editing, an in-browser editor beyond Remotion Studio, automatic uploading.

## Tech stack decision

Use Remotion (React + TypeScript) as the rendering core, Node 20+, rendering locally on the Windows PC.

| Option | Why / why not |
|---|---|
| Remotion | Chosen. Any web tech works in a frame (SVG, CSS, web fonts, Lottie, filters). Renders headless from the CLI with input props, so a JSON scene file drives a render with no code change. Mature Studio for previewing. |
| Motion Canvas | Strong fit for narration-synced vector explainers and MIT licensed, but rendering is mainly driven from its editor UI; harder to batch-automate. Keep as fallback. |
| Pillow / ffmpeg frame drawing (v1–v4 of 001) | Rejected: no anti-aliased vectors, weak typography, every primitive hand-rolled. |


License: Remotion is free for individuals and for-profit companies of up to 3 people, including commercial use (LICENSE.md). Re-check if the channel ever becomes a 4+ person company.

Supporting tools: zod for the scene schema, @remotion/lottie (optional), opentype.js or Remotion's measureText for caption fitting, ffmpeg for audio prep, Python for the TTS and alignment scripts.

## Architecture and data flow

Three independent chains meet in one Remotion composition: narration gives timing, the scene file gives content, assets and themes give the look. Each chain can be redone alone: a new voice re-times the video, a new theme restyles it, a new scene file changes the story.

data flow · 3 input chains, 1 render

The composition is pure: same scene, words and assets always render the same frames, which makes snapshot tests and re-renders reliable.

## Repo layout

One repo, engine code separate from per-video content. Videos live outside the repo in C:\Yts; the repo only holds reusable parts.
```
explainer-engine/
  src/
    Root.tsx              # registers the one composition: <Explainer scene={...}/>
    Explainer.tsx         # reads a scene file, lays out layers, resolves cues to frames
    schema/scene.ts       # zod schema for scene files (single source of truth)
    timing/cues.ts        # word cue -> frame resolution, easing helpers
    primitives/           # one file per primitive (DrawPath, Counter, BarChart, ...)
    layout/               # safe-area grid, caption band, title bar
    themes/               # one folder per theme: tokens.ts, textures/, fonts/
    assets/registry.ts    # maps asset ids -> SVG files, validates they exist
  assets/
    svg/<theme-agnostic>/ # line-art illustrations, single-colour, recolourable
    icons/                # vendored permissive icon sets (Lucide, Phosphor)
  scripts/
    tts.py                # text -> wav per line (Kokoro)
    align.py              # wav + text -> word timings JSON (forced alignment)
    vectorize.py          # SD raster -> cleaned SVG (vtracer + svgo)
    render.ts             # CLI: render a scene folder to export/
  examples/
    demo-scene/           # scene.json + voice.wav + words.json used in tests
  tests/                  # schema tests, cue resolution tests, snapshot frames
```

Per-video folder (unchanged from today, plus two files): C:\Yts\NNN_topic\project\scene.json, project\words.json, assets\audio\voice.wav, export\*.mp4.

## Scene file schema

A scene file describes what appears and when, never pixels per frame. Time is expressed as cues: a word in the narration, optionally with an offset. The engine resolves cues to frames from words.json, so re-recording the voice re-times the whole video with no edits.

Cue syntax:
- "@w:12" — start of the 12th word of the script (0-based)
- "@line:3" — start of narration line 3
- "@w:12+0.4" — 0.4 s after word 12; "@w:12-0.2" before it
- "@end" — end of the voiceover; plain numbers are seconds

Top-level shape:
```json
{
  "id": "002_cobra_effect",
  "theme": "blueprint",
  "fps": 30,
  "audio": { "voice": "assets/audio/voice.wav", "words": "project/words.json", "music": "_shared/music/calm_01.mp3", "musicGain": 0.12 },
  "chrome": { "title": "The Cobra Effect", "kicker": "IDEAS · INCENTIVES", "footnote": "Source: Siebert, Der Kobra-Effekt (2001)" },
  "stages": [
    {
      "id": "bounty",
      "from": "@line:0", "to": "@line:4",
      "camera": { "pan": [0, 0, 0, -40] },
      "elements": [
        { "type": "svg", "asset": "cobra", "x": 540, "y": 760, "w": 420, "enter": { "draw": "@w:3", "dur": 1.2 } },
        { "type": "tag", "text": "BOUNTY: 1 RUPEE", "x": 540, "y": 1040, "enter": { "pop": "@w:9" } },
        { "type": "counter", "from": 0, "to": 10000, "suffix": " cobras", "x": 540, "y": 560, "at": "@w:21", "dur": 1.5 }
      ]
    }
  ]
}
```

Rules:
- A stage is a continuous layout; elements persist until the stage's to unless they have an exit. Moving between stages is a crossfade or a shared-element morph, never a hard cut, unless "cut": true is set.
- Every element has type, a position in the 1080×1920 grid, and an enter (and optional exit) whose timing is a cue.
- Captions are not written per element: they come from words.json automatically and can be overridden per line ("captions": {"3": "custom text"}).
- The schema lives in src/schema/scene.ts (zod). Unknown keys fail validation, so a typo never renders silently.
- Scene files are written by Claude; humans edit them in Studio's props panel or by hand.

## Primitives library

Each primitive is a React component taking theme tokens plus resolved frame numbers. All motion goes through one easing module, so the whole engine keeps the same feel. Build them in the order listed; the first eight cover both reference videos.

| Primitive | What it does | Key props | Motion |
|---|---|---|---|
| SvgAsset | Places an illustration from the asset registry, recoloured to the theme | asset, x, y, w, tint | draw-on (stroke-dash), fade, pop (scale 0.92→1) |
| DrawPath | Any path or line drawn progressively, hand-drawn wobble optional | d / points, stroke, wobble | stroke-dashoffset over dur |
| TextType | Label or headline that types or fades in by word | text, size, weight, align | per-word reveal synced to cues |
| Tag | Small boxed label ("TARGET: WEIGHT") | text, tone | pop, then idle |
| Counter | Number rolling between two values with formatting | from, to, prefix, suffix, decimals | ease-out roll, tabular figures |
| BarChart | 2–6 bars that grow, can re-grow to new values | bars[], max, labels | staggered grow, value change tween |
| Timeline | Horizontal time axis with events and brackets | range, events[], spans[] | axis draw, events pop in order |
| StrikeCheck | Strike-through, cross-out or tick over another element | target id, kind | stroke draw |
| Arrow / Callout | Pointer from a note to an element | from, to, text | draw, then label fades |
| Panel | Rounded container / card grouping elements | x, y, w, h | fade + slide 24 px |
| Map | Simple region map with a pin or route | geo asset, pins[] | pin drop, route draw |
| Meter / Gauge | Dial or progress bar for a measure | value, min, max | needle sweep |
| Grid / Dots | Unit chart (1 dot = N things) | count, perRow, highlight | fill in reading order |
| Captions | Bottom caption band driven by words.json | style, maxWords | phrase swap, active-word tint |
| Chrome | Title bar, kicker, footnote, progress line | from scene.chrome | static; progress line advances |


Each primitive ships with a Studio preview and a frame-snapshot test (render frame N, compare PNG).

## Theme system

A theme is a single tokens.ts plus optional textures and fonts; primitives never hard-code a colour, font or stroke. Switching "theme" in a scene file restyles the whole video.

Tokens every theme must define:
- palette: background, ink, mutedInk, accent, accent2, good, bad (max 6 colours plus background)
- type: display font, body font, mono font, scale (title / label / caption / footnote sizes)
- stroke: width, cap, join, wobble (0 = clean vector, 0.6 = hand-drawn)
- surface: background texture (paper grain, grid, scanlines, none), vignette strength
- caption: box style (solid bar, underline, none), active-word colour, position band
- motion: default ease, enter duration, idle drift amount (0 by default)
- render: vector or pixel (pixel = draw at 1/6 scale, upscale nearest-neighbour)

Starter themes (our own looks, not copies of the reference channels):

| Theme | Look | Good for |
|---|---|---|
| blueprint | White line art on deep blue, measurement ticks, mono labels | Engineering, systems, how-things-work |
| archive | Warm cream index card, typewriter labels, ink stamps | History, laws, origin stories |
| amber-crt | Amber on near-black, scanlines, pixel font, render: pixel | Tech incidents, internet history |
| newsprint | Off-white newsprint, halftone fills, serif headlines | Economics, incentives, social experiments |
| transit | Clean white, bold colour lines, rounded geometric type | Processes, flows, comparisons |


Fonts: only open-licence fonts (Google Fonts / OFL), vendored in the repo so renders are reproducible offline.

## Audio and word sync

Word timings are the backbone: every cue resolves against words.json, so their accuracy decides how tight the video feels.
- Script — script.txt, one narration line per row. Numbers written as spoken ("twenty-five sixty") in a parallel spoken column when they differ from the caption.
- TTS (scripts/tts.py) — Kokoro, one wav per line, trimmed and concatenated with a fixed 70 ms gap; voice and speed set per video. Current default: af_heart, speed 1.12. Swap-in point for a human voice recording: drop voice.wav in and skip this step.
- Alignment (scripts/align.py) — forced alignment of the final voice.wav against the script to get per-word start/end. Preferred: faster-whisper with word_timestamps=True, then map recognised words back to script words by edit distance so captions keep the script's spelling. Check first whether the installed Kokoro version returns token timestamps directly; if it does, use those and skip Whisper.
- Output — words.json: [{"i":0,"w":"Cleopatra","s":0.00,"e":0.52,"line":0}, ...].
- Resolution (src/timing/cues.ts) — cue → seconds → frame; validation fails if a cue points past the last word.

Music and sound: one quiet bed track per video from _shared/music, auto-ducked under the voice (sidechain-style gain envelope computed from the voice RMS). Sound effects are limited to soft ticks, pops and paper/pen sounds tied to element entrances; no whooshes, ever.

## Asset pipeline

The look is decided here more than in the engine: illustrations must share one drawing language, and themes must be able to recolour them. So every illustration is stored as line art in a single ink colour, and themes apply colour, fill and texture at render time.

Sources, in order of preference:
- Stable Diffusion → vector. Generate on the local Forge (--api, 1024×1024, plain background, one object per image) with a fixed style prompt; scripts/vectorize.py runs background removal, vtracer (spline mode), then svgo, and strips fills to strokes for line themes. Prompts and seeds are saved next to each asset so an object can be regenerated in the same style.
- Permissive icon sets for small UI-like symbols (Lucide, Phosphor, Tabler — MIT/ISC), vendored with their licence files.
- Hand-made in Figma for recurring hero objects; exported as SVG into assets/svg.

Rules:
- One object per file, named noun_variant.svg (factory_small.svg, nail_giant.svg), viewBox normalised to fit 1000×1000.
- Every SVG passes a lint: single stroke colour, no embedded rasters, no text elements, path count under a limit.
- assets/registry.ts is generated from the folder, so the scene schema can autocomplete and validate asset ids.
- Never trace or copy another channel's artwork; references are for tone only.

## Render and automation

One command renders a video folder end to end:
```
npm run video -- C:\Yts\002_cobra_effect
```

which runs, in order: validate scene.json → tts.py if voice.wav is missing → align.py if words.json is missing or older than the wav → remotion render with the scene as input props → loudness normalise to −14 LUFS with ffmpeg → write export\<id>_vN.mp4 (never overwrite an earlier version).
- Output: 1080×1920, 30 fps, H.264 CRF 18, AAC 192 kbps.
- A --preview flag renders at half resolution and 15 fps for fast review; --frames 120-240 renders a range.
- --stills writes a contact sheet PNG (one frame per stage) to project\, so a review can happen without watching the whole video.
- Rendering happens on the Windows PC (Remotion needs a local Chromium); Claude edits scene files and triggers renders through the linked computer.

## Motion and editing rules

These are product rules, enforced in code (defaults and validation), not left to each scene file.
- No camera shake and no zoom-punch on cuts. The only camera move is a slow pan or push, at most 1% scale per second, and it is off by default.
- No whoosh sound effects. The SFX library ships without them, so they cannot be picked by accident.
- No hard cuts by default. Stages change by crossfade (≤ 0.4 s) or by a shared element moving into its new place.
- One thing moves at a time. Enter animations in the same stage are staggered by at least 0.15 s, and nothing animates while the viewer must read a new caption line, unless the motion is the point.
- Enter durations 0.3–0.8 s; draw-on up to 1.5 s. Ease-out for entrances, ease-in-out for moves, no bounce larger than 4%.
- Readable at a glance: captions at least 64 px, labels at least 40 px, everything inside the 1080×1920 safe area (top 220 px and bottom 380 px kept clear of key content for the Shorts UI).
- Every on-screen number comes from the script or a cited source; the footnote line names the source.

## Milestones

Each milestone ends with something watchable; the first one exists to decide the look before the big build.
- M0 — Repo skeleton. Remotion project, TypeScript strict, zod schema stub, one empty composition at 1080×1920. Done when npm run studio opens and npm run video -- examples/demo-scene renders a blank 5 s mp4.
- M1 — Style frames. One 15 s stage rendered in two themes (blueprint, archive) with SvgAsset, Tag, Counter, Captions, Chrome. Done when Selim picks a direction or rejects both; no further engine work until then.
- M2 — Core primitives. DrawPath, TextType, BarChart, Timeline, StrikeCheck, Arrow, Panel, plus snapshot tests. Done when each has a Studio preview and a passing frame test.
- M3 — Cues and audio. tts.py, align.py, words.json, cue resolution, auto-captions, music ducking. Done when re-recording the voice re-times the demo video with no scene edits.
- M4 — Asset pipeline. vectorize.py, SVG lint, generated registry, 20 starter illustrations in one style. Done when a new SD object becomes a usable, recolourable asset in under 2 minutes.
- M5 — First real video. Claude writes 002_* scene file end to end; one review round. Done when the export is uploadable as is.
- M6 — Throughput. Preview mode, contact sheets, batch rendering of several folders, remaining themes. Done when a 5-video weekly batch renders unattended.

## Open questions
- ☐ Which illustration style wins the M1 style test: clean flat vector, hand-drawn ink line, or blueprint line art? (SD style tests pending; Forge needs to be running.)
- ☐ Does a style LoRA for flat/line illustration beat prompting the current photoreal models (epiCRealismXL, Juggernaut XL)? Disk budget: about 20 GB free on C:.
- ☐ Voice: keep Kokoro af_heart, try a male voice, or record narration by hand for the story-led format?
- ☐ Video length target: 60–80 s like the references, or keep 45 s for retention?
- ☐ Music: build a small _shared/music set from YouTube Audio Library before M3.
- ☐ Repo hosting: private GitHub repo under Selim's account; does Claude get access to it for scene-file PRs?

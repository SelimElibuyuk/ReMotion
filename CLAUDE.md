# Explainer Engine (ReMotion)

PRD: [docs/PRD.md](docs/PRD.md) (original: docs/Explainer_Engine_Project_Spec.docx). The PRD is the source of truth for scope, milestones and product rules.

## What this is
Remotion 4 (React + TS) engine: `scene.json` + `words.json` + `voice.wav` -> 1080x1920 explainer short.
Videos live in `C:\Yts\NNN_topic\` (project/, assets/audio/, export/); this repo holds only reusable engine parts.

## Commands
- `npm run studio` — Remotion Studio with the demo scene (examples/demo-scene)
- `npm run video -- <videoFolder> [--preview] [--frames a-b] [--stills] [--theme name]` — validate -> tts -> align -> render -> loudnorm -> export/<id>_vN.mp4
  - No downloadable headless browser (e.g. sandbox)? Set `REMOTION_BROWSER_EXECUTABLE` to a system Chrome/Chromium path.
  - Contact sheet stills are taken just before each stage's outgoing crossfade, so every element of the stage is visible.
  - PowerShell 5.1 swallows flags after `npm run video --`; there use `npx tsx scripts/render.ts <folder> --preview` (Git Bash is fine).
- `npm run registry` — regenerate src/assets/registry.generated.ts after adding SVGs to assets/svg
- `npm run lint:svg`, `npm run typecheck`, `npm test`

## Architecture (fixed contracts — change deliberately)
- `src/schema/scene.ts` — zod schema, single source of truth. All objects `.strict()`.
- `src/schema/validate.ts` — cue resolution + product motion rules (stagger >= 0.15 s, enter 0.3–0.8 s, draw <= 1.5 s, safe area 220/380, push <= 1 %/s).
- `src/timing/cues.ts` (cue -> seconds -> frame), `src/timing/easing.ts` (the ONE easing module), `src/timing/motion.ts` (`useMotion` shared enter/exit).
- `src/primitives/types.ts` — `PrimitiveProps<T>`; primitives render inside their stage `<Sequence>` (frames are stage-relative). Map in `src/primitives/index.ts`.
- `src/themes/types.ts` — `ThemeTokens`; primitives never hard-code colours/fonts/strokes.
- Media: composition props `media.voice/music` are paths relative to `public/`; render.ts stages audio into `public/media/<id>/`. SVGs are inlined from the generated registry (themes recolour them). Fonts are vendored in `public/fonts/` (OFL), loaded with @remotion/fonts.
- Renders must be deterministic: no Math.random / Date; use `rand(seed)`.

## Writing a scene file (for Claude)
- Cues: `"@w:12"` (0-based word index in words.json), `"@line:3"`, offsets `"@w:12+0.4"`, `"@end"`, or seconds.
- Word indices = `line.split()` over project/script.txt, counted across all lines.
- One thing moves at a time: entrances in a stage >= 0.15 s apart. Keep key content y in 220–1540.
- Validate without rendering: `npm run video -- <folder> --stills` (writes project/contact_sheet.png).

## Product rules (never break)
No camera shake, no zoom-punch, no whoosh SFX, no hard cuts unless `"cut": true`. Every on-screen number comes from the script or a cited source (footnote).

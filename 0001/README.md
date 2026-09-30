# 0001 — Motion Designer Showreel (30s)

A 30-second showreel of motion graphics, built with [HyperFrames](https://hyperframes.heygen.com): an HTML composition animated with GSAP and rendered to MP4.

- **Finished video:** `renders/showreel.mp4` (1920×1080 / 30fps / H.264 + AAC)
- **Tempo:** 120 BPM. Every cut and accent lands on the beat.

## Structure

| Time | Scene | What it shows |
|---|---|---|
| 0–2s | Intro | Grid lines draw in, 3-2-1 countdown, "SHOW / REEL" slam |
| 2–5s | Name | Name reveal (per-character mask), rotating badge, role tags |
| 5–9s | 01 Kinetic Typography | Flowing outline text, words that switch on every beat |
| 9–13s | 02 Shape & Rhythm | 45 shapes rotate and morph in a wave from the centre |
| 13–17s | 03 Data in Motion | Counter, bar chart, line chart, donut chart (sample data) |
| 17–21s | 04 Depth & Space | CSS 3D card orbit, wireframe cube, perspective floor |
| 21–24.5s | 05 UI & Product | App UI, cursor, toggle, ripple, toast notification |
| 24.5–27s | Toolkit | Rapid cuts through 10 tools, 0.25s each |
| 27–30s | Outro | Name, contact details, "Available for work" |

## Personalising

Edit the `CONFIG` object at the top of the `<script>` in `index.html` (name, initials, role, site, email, social handle, tools). Every name and contact on screen is read from it.

## Re-rendering

```bash
python3 tools/make_music.py     # regenerate the soundtrack (needs numpy; deterministic)
npx hyperframes check           # validate
npx hyperframes render --quality high --output renders/showreel.mp4
```

Rendering needs FFmpeg/FFprobe and Chrome Headless Shell (`npx hyperframes browser ensure`).
GSAP and the fonts (Anton / Space Grotesk / JetBrains Mono, OFL) are bundled locally in `assets/`, so no CDN access is required.

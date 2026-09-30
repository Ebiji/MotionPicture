# 0001 — EIJI Showreel 2026 (30s)

A 30-second showreel for EIJI, built from EIJI's actual body of work (the conversation log in `EIJI.md`). It is an HTML composition built with [HyperFrames](https://hyperframes.heygen.com), animated with GSAP and rendered to MP4.

- **Finished video:** `renders/showreel.mp4` (1920×1080 / 30fps / H.264 + AAC)
- **Tempo:** 120 BPM. Every cut and accent lands on the beat.

## Structure

| Time | Scene | Source in EIJI's work |
|---|---|---|
| 0–2s | Intro | 3-2-1 countdown, "SHOW / REEL" |
| 2–5s | EIJI MOTION | Name reveal, badge "CODE × MOTION × STORY", tags (Motion Design / Generative Art / HyperFrames / Vibe Coding) |
| 5–9s | 01 Kinetic Captions | The Jugemu rakugo video: 寿限無 → 寿限無 → 五劫の → 擦り切れ → 海砂利水魚, with switching furigana |
| 9–13s | 02 Generative Art | Shape grid → the "7 circles become a mad spinning machine" piece, GenerativeArt-Psyche (100 works) |
| 13–17s | 03 Music Writing | 1982 Billboard year-end article series: count-up to 1982, #55 / #58 / #62 / #63 / #64, spinning record |
| 17–21s | 04 3D & WebGL | Crystal Valley Explorer: starfield, 3D card orbit (Crystal Valley, Psyche, Quantum, Fractal, 寿限無, Sacred Vow, Twinkle, Critics), "MORE SPLENDID." |
| 21–24.5s | 05 AI × Creative Systems | AGENTS.md / CRITICS.md: maturity Lv 1–5, 5-critic council, 100 autonomous works |
| 24.5–27s | Toolkit | HyperFrames, GSAP, Three.js, Claude Code, HTML/CSS, JavaScript, MIDI, YAML Prompt, AGENTS.md, Vibe Coding |
| 27–30s | Outro | EIJI / コードで動かし、物語で見せる。/ github.com/ebiji |

The soundtrack is original and synthesised by `tools/make_music.py`. It includes a "Twinkle Twinkle Little Star" bell phrase under the 3D scene, a nod to the Twinkle MIDI piece.

## Personalising

Edit the `CONFIG` object at the top of the `<script>` in `index.html` (name, initials, role, site, email, social handle, tools). Every name and contact on screen is read from it.

## Re-rendering

```bash
python3 tools/make_music.py     # regenerate the soundtrack (needs numpy; deterministic)
npx hyperframes check           # validate
npx hyperframes render --quality high --output renders/showreel.mp4
```

Rendering needs FFmpeg/FFprobe and Chrome Headless Shell (`npx hyperframes browser ensure`).
GSAP and the fonts are bundled locally in `assets/`, so no CDN access is required. Fonts: Anton, Space Grotesk and JetBrains Mono, plus Dela Gothic One and Zen Kaku Gothic New, subset to the Japanese glyphs used. All are OFL.
If you add new Japanese text, re-subset the fonts; otherwise the new characters fall back to a system font.

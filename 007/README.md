# 007 — Quantum Bloom

Three.js generative 3D art. Run `npm run dev` (or `python3 -m http.server 8007`) and open http://localhost:8007/ .

| Element | Role |
|---|---|
| Romanesco (3-level recursive spiral cones) | the flower's heart |
| Fibonacci petal rings (8 / 13 / 21) | the flower |
| Barnsley ferns (IFS, 7 fronds) | leaves |
| Sierpinski tetrahedron (depth 5) | glass frame |
| Koch snowflakes (depth 5) | halos and base |
| Hydrogen 3d z² orbital point cloud | quantum dust |

**Quantum colouring:** one shader superposes four standing-wave eigenstates (E ∝ k²). Their time-evolving probability density picks among the hydrogen Balmer lines (656 / 486 / 434 / 410 nm) and the wavefunction phase shifts the hue, so colour flows as the state evolves.

Controls: drag = orbit, wheel = zoom, Space = pause, S = save PNG, H = hide UI. Add `?q=low` for a lighter version.

Three.js r170 is vendored under `vendor/` so it works offline.

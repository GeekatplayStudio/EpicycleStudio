<p align="center">
  <img src="public/favicon.svg" width="72" alt="EpicycleStudio">
</p>

<h1 align="center">EpicycleStudio</h1>

<p align="center">
  Turn any drawing, image or SVG into animated Fourier epicycles and exact formulas.<br>
  <strong>by Geekatplay Studio</strong>
</p>

---

EpicycleStudio decomposes a closed outline into rotating circles. Draw a shape,
drop in a silhouette image or an SVG, and watch the chain of epicycles redraw it
while the live equations, spectrum and coefficients update beside it. Everything
runs in your browser; nothing is uploaded anywhere.

## Quick start

```bash
./install.sh     # install dependencies (Node.js 20+)
./start.sh       # launch at http://localhost:5173
./stop.sh        # stop the server
./build.sh       # production build in dist/
```

Windows: double-click `start.cmd`, or use `npm install`, `npm run dev`, `npm run build`.

## Features

**Input**
- Freehand drawing with automatic loop closing
- SVG import (`path`, `polygon`, `polyline`, `circle`, `ellipse`, `rect`)
- Bitmap silhouettes (PNG, JPEG, WebP) traced automatically; drag-and-drop or paste
- Built-in presets: heart, star, square, triangle, infinity, butterfly, gear, π

**Visualisation**
- *Orthogonal split*: separate x(t) and y(t) circle chains with projection lines
- *Complex chain*: one nested chain of rotating vectors
- 3D view powered by three.js, with optional time extrusion
- Harmonic count K with live reconstruction error, frequency or amplitude ordering
- Play, pause, scrub, speed 0.1×–5×, layer toggles, custom colors, dark and light themes
- Live amplitude spectrum, rendered formulas and coefficient tables

**Export**
- LaTeX equations and JSON coefficients
- Ready-to-run Python (Matplotlib), JavaScript (HTML5 Canvas) and GLSL shader snippets
- WebM video recording, loopable animated SVG, PNG frame

## Keyboard

| Key | Action |
| --- | --- |
| `Space` | Play / pause |
| `D` | Draw mode |
| `M` | Switch mode |
| `↑` `↓` | Harmonics ±1 (Shift: ±10) |
| `←` `→` | Scrub |
| `E` | Export |
| `Esc` | Close / leave draw mode |

Share a state with the URL, for example `?preset=butterfly&mode=complex&k=40&view=3d&theme=light`.

## Built with

Vite · React · TypeScript · Tailwind CSS · three.js · KaTeX

## License

© Geekatplay Studio. All rights reserved.

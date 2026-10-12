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
- Freehand drawing in 2D with automatic loop closing
- 3D sketching directly in the 3D view on a positionable plane (screen-facing, XY, XZ or YZ, with offset); strokes can be appended to build a curve across several planes
- 3D models (OBJ, STL, GLB, GLTF): the longest boundary edge loop is used, or an axis-aligned cross-section with a live offset slider
- SVG import (`path`, `polygon`, `polyline`, `circle`, `ellipse`, `rect`)
- Bitmap silhouettes (PNG, JPEG, WebP) traced automatically; drag-and-drop or paste
- 3D point lists as JSON (`[[x,y,z], …]`, `[{x,y,z}, …]`) or CSV rows
- Flat presets: heart, star, square, triangle, infinity, butterfly, gear, π
- 3D curve presets: trefoil knot, torus knot, Viviani curve, baseball seam, Lissajous, closed spring

**Visualisation**
- *Orthogonal split*: separate x(t) and y(t) circle chains with projection lines
- *Complex chain*: one nested chain of rotating vectors
- 3D view powered by three.js: every chain lives in its own plane and the projections meet at the pen
- Every curve is decomposed into three series x(t), y(t), z(t), each with its own chain; flat drawings can be sculpted into 3D with wave, bowl, saddle or ramp depth
- Optional time extrusion that turns any loop into a helix
- Harmonic count K with live reconstruction error, frequency or amplitude ordering
- Play, pause, scrub, speed 0.1×–5×, layer toggles, custom colors, dark and light themes
- Live amplitude spectrum, rendered formulas and coefficient tables

**Export**
- LaTeX equations and JSON coefficients (x, y and z series)
- Ready-to-run Python (Matplotlib), JavaScript (HTML5 Canvas) and GLSL shader snippets
- WebM video recording, loopable animated SVG, PNG frame

## Keyboard

| Key | Action |
| --- | --- |
| `Space` | Play / pause |
| `D` | Draw mode (2D canvas, or 3D sketch when the 3D view is active) |
| `M` | Switch mode |
| `↑` `↓` | Harmonics ±1 (Shift: ±10) |
| `←` `→` | Scrub |
| `E` | Export |
| `Esc` | Close / leave draw mode |

Share a state with the URL, for example `?preset=trefoil&k=12` or `?preset=heart&depth=wave&mode=complex&k=40&theme=light`.

## Built with

Vite · React · TypeScript · Tailwind CSS · three.js · KaTeX

## License

© Geekatplay Studio. All rights reserved.

<p align="center">
  <img src="public/favicon.svg" width="72" alt="EpicycleStudio">
</p>

<h1 align="center">EpicycleStudio</h1>

<p align="center">
  Turn any drawing, image, SVG or 3D model into animated Fourier epicycles and exact formulas, in 2D and 3D.<br>
  <strong>by Geekatplay Studio</strong>
</p>

---

EpicycleStudio decomposes a closed curve into rotating circles. Draw a shape in
2D or sketch one in 3D space, drop in a silhouette image, an SVG or a 3D model,
and watch the chains of epicycles redraw it while the live equations, spectrum
and coefficients update beside it. Every curve is split into three Fourier
series, x(t), y(t) and z(t), each driven by its own chain. Everything runs in
your browser; nothing is uploaded anywhere.

## Quick start

```bash
./install.sh     # install dependencies (Node.js 20+)
./start.sh       # launch at http://localhost:5173
./stop.sh        # stop the server
./build.sh       # production build in dist/   (./start.sh --prod serves it)
```

Windows: double-click `start.cmd`, or use `npm install`, `npm run dev`, `npm run build`.

## How to use

**Draw in 2D.** Press **Draw** (or `D`) and draw one closed stroke in the
viewport. The loop closes automatically and snaps shut when you finish near
the start point.

**Sketch in 3D.** Switch to the **3D** view, then press **Draw**. A translucent
drawing plane appears. Pick its orientation in the floating panel
(screen-facing, XY, XZ or YZ) and slide it along its normal with the offset
slider. Left-drag draws on the plane, right-drag orbits the camera. Turn on
*Append to current curve* to continue the loop on another plane and build a
curve that wanders through space.

**Import a 3D model.** Drop an OBJ, STL, GLB or GLTF file on the viewport or use
**Import**. The model appears as a wireframe. If the mesh has open borders, its
longest boundary loop becomes the curve; otherwise it is sliced with an
axis-aligned plane. In *Parameters → Model* choose Boundary or Cross-section,
the X, Y or Z plane and the section offset. When a slice yields several rings
the longest one is used; move the offset or change the axis to pick another.

**Import a drawing.** SVG files use the longest `path`, `polygon`, `polyline`,
`circle`, `ellipse` or `rect`. PNG, JPEG and WebP silhouettes are traced
automatically. JSON (`[[x,y,z], …]`, `[{x,y,z}, …]` or `{points: …}`) and CSV
rows (`x,y[,z]`) load point lists. Files can be dropped or pasted.

**Add depth to a flat drawing.** *Parameters → Depth* sculpts a 2D outline into
3D with a wave, bowl, saddle or ramp profile and an amplitude slider. *Source*
keeps depth that came with the input.

**Presets.** Flat: heart, star, square, triangle, infinity, butterfly, gear, π.
3D curves: trefoil knot, torus knot, Viviani curve, baseball seam, Lissajous,
closed spring.

## Views and controls

- **Orthogonal split**: separate x(t) and y(t) chains with projection lines that meet at the pen. In 3D each chain lives in its own plane and a third z(t) chain joins them.
- **Complex chain**: one nested chain of rotating vectors, plus the z(t) chain for space curves.
- **3D view** (three.js): drag to orbit, wheel to zoom. *Extrude trace along time* turns any loop into a helix.
- **Harmonics K** with live reconstruction error; drag across the spectrum to set it. Chain order by frequency or amplitude.
- Play, pause, scrub, speed 0.1×–5×, layer toggles (circles, arms, projections, ghost path, trail), custom colors, dark and light themes.
- Left dock: live amplitude spectrum, rendered formulas (real and complex form) and coefficient tables.

## Export

- LaTeX equations and a coefficient table; JSON with the x, y and z series and the complex terms
- Ready-to-run Python (Matplotlib), JavaScript (HTML5 Canvas) and GLSL shader snippets
- WebM video recording of the viewport, loopable animated SVG, PNG frame

## Keyboard

| Key | Action |
| --- | --- |
| `Space` | Play / pause |
| `D` | Draw mode (2D canvas, or 3D sketch when the 3D view is active) |
| `M` | Switch between split and complex mode |
| `↑` `↓` | Harmonics ±1 (Shift: ±10) |
| `←` `→` | Scrub the timeline |
| `E` | Export |
| `Esc` | Close dialog / leave draw mode |

## Share a state by URL

| Parameter | Values |
| --- | --- |
| `preset` | any preset id, e.g. `heart`, `butterfly`, `trefoil`, `torus-knot` |
| `mode` | `split`, `complex` |
| `view` | `2d`, `3d` |
| `k` | harmonic count |
| `n` | `128`, `256`, `512`, `1024`, `2048` |
| `depth` | `wave`, `bowl`, `saddle`, `ramp` |
| `theme` | `dark`, `light` |
| `t` | start time in radians; add `paused` to start stopped |
| `tool` | `draw` |

Example: `?preset=heart&depth=wave&mode=complex&k=40&theme=light`

## Supported files

| Type | Formats |
| --- | --- |
| Vector | SVG |
| Image | PNG, JPEG, WebP, GIF, BMP |
| 3D model | OBJ, STL, GLB, GLTF |
| Points | JSON, CSV |

## Built with

Vite · React · TypeScript · Tailwind CSS · three.js · KaTeX

## License

© Geekatplay Studio. All rights reserved.

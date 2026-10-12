import type { Harmonic } from '@/core/types/epicycle'

const num = (v: number) => (Number.isInteger(v) ? v.toString() : v.toFixed(6))

export function pythonSnippet(harmonics: Harmonic[]): string {
  const rows = harmonics.map((h) => `    (${h.k}, ${num(h.radius)}, ${num(h.phase)}),`).join('\n')
  return `# EpicycleStudio — Fourier epicycle animation (Matplotlib)
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation

# (k, radius, phase): z(t) = sum radius * exp(i * (k * t + phase))
TERMS = [
${rows}
]

def pen(t):
    z = 0j
    for k, r, ph in TERMS:
        z += r * np.exp(1j * (k * t + ph))
    return z

ts = np.linspace(0, 2 * np.pi, 600, endpoint=False)
trace = np.array([pen(t) for t in ts])

fig, ax = plt.subplots(figsize=(6, 6))
ax.set_aspect("equal")
ax.set_xlim(-1.6, 1.6)
ax.set_ylim(1.6, -1.6)  # y points down, like the screen
ax.axis("off")
path_line, = ax.plot([], [], lw=2, color="#f5b942")
arm_line, = ax.plot([], [], lw=1, color="#e7e9ee")
circles = [plt.Circle((0, 0), r, fill=False, lw=0.6, color="#8b93a7", alpha=0.6) for _, r, _ in TERMS]
for c in circles:
    ax.add_patch(c)

def update(frame):
    t = ts[frame]
    z = 0j
    xs, ys = [0.0], [0.0]
    for (k, r, ph), c in zip(TERMS, circles):
        c.center = (z.real, z.imag)
        z += r * np.exp(1j * (k * t + ph))
        xs.append(z.real)
        ys.append(z.imag)
    arm_line.set_data(xs, ys)
    path_line.set_data(trace[: frame + 1].real, trace[: frame + 1].imag)
    return path_line, arm_line, *circles

anim = FuncAnimation(fig, update, frames=len(ts), interval=16, blit=True)
plt.show()
`
}

export function javascriptSnippet(harmonics: Harmonic[]): string {
  const rows = harmonics.map((h) => `  [${h.k}, ${num(h.radius)}, ${num(h.phase)}],`).join('\n')
  return `<!-- EpicycleStudio — Fourier epicycle animation (HTML5 Canvas) -->
<canvas id="c" width="720" height="720" style="background:#0b0d12"></canvas>
<script>
// [k, radius, phase]: z(t) = Σ radius · e^{i(k t + phase)}
const TERMS = [
${rows}
];
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const S = canvas.width * 0.3; // world unit → pixels
const cx = canvas.width / 2, cy = canvas.height / 2;
const trail = [];
let t = 0;

function frame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  let x = 0, y = 0;
  ctx.lineWidth = 1;
  for (const [k, r, ph] of TERMS) {
    const px = x, py = y;
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(139,147,167,0.5)';
    ctx.arc(cx + px * S, cy + py * S, r * S, 0, Math.PI * 2);
    ctx.stroke();
    x += r * Math.cos(k * t + ph);
    y += r * Math.sin(k * t + ph);
    ctx.beginPath();
    ctx.strokeStyle = '#e7e9ee';
    ctx.moveTo(cx + px * S, cy + py * S);
    ctx.lineTo(cx + x * S, cy + y * S);
    ctx.stroke();
  }
  trail.push([x, y]);
  if (trail.length > 1200) trail.shift();
  ctx.beginPath();
  ctx.strokeStyle = '#f5b942';
  ctx.lineWidth = 2;
  trail.forEach(([tx, ty], i) => (i ? ctx.lineTo(cx + tx * S, cy + ty * S) : ctx.moveTo(cx + tx * S, cy + ty * S)));
  ctx.stroke();
  t = (t + 0.008) % (Math.PI * 2);
  requestAnimationFrame(frame);
}
frame();
</script>
`
}

export function glslSnippet(harmonics: Harmonic[]): string {
  const terms = [...harmonics].sort((a, b) => b.radius - a.radius)
  const rows = terms.map((h) => `  vec3(${num(h.k)}, ${num(h.radius)}, ${num(h.phase)})`).join(',\n')
  return `// EpicycleStudio — Fourier curve fragment shader (GLSL ES 3.00 / ShaderToy-style)
// Each term: (k, radius, phase). The curve is z(t) = Σ r·e^{i(k t + φ)}.
// The shader renders the curve by distance-field sampling over t.
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
out vec4 fragColor;

const int TERMS = ${terms.length};
const vec3 T[${terms.length}] = vec3[](
${rows}
);

vec2 curve(float t) {
  vec2 z = vec2(0.0);
  for (int i = 0; i < TERMS; i++) {
    float ang = T[i].x * t + T[i].z;
    z += T[i].y * vec2(cos(ang), sin(ang));
  }
  return z;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / min(iResolution.x, iResolution.y) * 3.2;
  uv.y = -uv.y; // y down, like the editor
  float head = mod(iTime * 0.4, 6.28318530718);
  float d = 1e9;
  float glow = 0.0;
  const int STEPS = 512;
  for (int i = 0; i < STEPS; i++) {
    float t = 6.28318530718 * float(i) / float(STEPS);
    vec2 p = curve(t);
    float dd = length(uv - p);
    d = min(d, dd);
    if (t < head) glow += smoothstep(0.02, 0.0, dd) * 0.03;
  }
  vec3 col = vec3(0.043, 0.051, 0.071);
  col += vec3(0.545, 0.576, 0.655) * smoothstep(0.006, 0.0, d) * 0.5;
  col += vec3(0.96, 0.725, 0.26) * glow;
  vec2 pen = curve(head);
  col += vec3(1.0) * smoothstep(0.025, 0.0, length(uv - pen));
  fragColor = vec4(col, 1.0);
}
`
}

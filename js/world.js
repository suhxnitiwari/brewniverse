// The world behind everything: one full-screen canvas of particles whose “weather” changes as you
// travel (pollen on the farm, embers at the roast, grounds at the grinder, steam at the bar…).
// Particles lean toward your cursor, a soft light follows it, and clicking empty space sends a ripple.
import { Sound } from './sound.js';

const BIOMES = {
  steam:   { colors: ['#f3e6cf', '#e6b986', '#fffaf2'], shape: 'glow', size: [1, 3.2], vx: 0, vy: -0.25, turb: 0.35, alpha: [0.15, 0.55], density: 0.8 },
  pollen:  { colors: ['#d8e39a', '#f3d77a', '#bfe08a', '#fff2b0'], shape: 'glow', size: [0.8, 2.4], vx: 0.08, vy: -0.05, turb: 0.5, alpha: [0.25, 0.85], twinkle: true, density: 1 },
  water:   { colors: ['#bfe0ef', '#9fcde3', '#e6f4fa'], shape: 'drop', size: [1, 2.6], vx: 0, vy: 1.6, turb: 0.1, alpha: [0.25, 0.7], density: 0.9 },
  sea:     { colors: ['#9fcde3', '#d9eef6', '#7fb2c9'], shape: 'glow', size: [0.8, 2.2], vx: 0.9, vy: -0.05, turb: 0.25, alpha: [0.2, 0.6], density: 0.9 },
  embers:  { colors: ['#ffb35c', '#ff7a2e', '#ffd59a', '#e2531f'], shape: 'glow', size: [0.8, 2.6], vx: 0.05, vy: -0.9, turb: 0.6, alpha: [0.35, 1], twinkle: true, density: 1 },
  grounds: { colors: ['#5a321b', '#7a4520', '#3d2213', '#9a6a44'], shape: 'fleck', size: [1.4, 3.6], vx: 0, vy: 0.9, turb: 0.25, alpha: [0.5, 0.95], density: 1.1 },
  crema:   { colors: ['#c79a6a', '#e6b986', '#a8703f', '#f0d2a8'], shape: 'glow', size: [0.8, 2.4], vx: 0, vy: 0, turb: 0.2, swirl: 0.6, alpha: [0.25, 0.75], density: 1 },
  bubbles: { colors: ['#fffaf2', '#f3e6cf'], shape: 'ring', size: [1.6, 4.5], vx: 0, vy: -0.5, turb: 0.3, alpha: [0.25, 0.6], density: 0.7 },
  aroma:   { colors: ['#d9488f', '#e0412f', '#e7a222', '#5c9e3e', '#d4782b', '#b2452d'], shape: 'petal', size: [1.6, 3.6], vx: 0.1, vy: -0.25, turb: 0.55, alpha: [0.3, 0.8], density: 0.8 },
  beans:   { colors: ['#6b3d22', '#8a5631', '#a3ae78', '#3d2213'], shape: 'bean', size: [2.2, 4.6], vx: 0.05, vy: 0.25, turb: 0.2, alpha: [0.35, 0.8], spin: true, density: 0.55 },
  dust:    { colors: ['#ffe2b0', '#fff2d6', '#f0c98a'], shape: 'glow', size: [0.6, 2], vx: 0.12, vy: 0.04, turb: 0.3, alpha: [0.15, 0.8], twinkle: true, density: 0.9 },
  sound:   { colors: ['#e6b986', '#fffaf2'], shape: 'glow', size: [0.8, 2.2], vx: 0, vy: 0, turb: 0.15, alpha: [0.15, 0.6], density: 0.8 },
};

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let cv, g, W = 0, H = 0, dpr = 1;
let biome = BIOMES.steam, biomeName = 'steam', heat = 0;
const P = [];
const mouse = { x: -1e4, y: -1e4, on: false, px: 0, py: 0 };
const ripples = [], trail = [];
let lastScroll = scrollY, scrollV = 0;
const sprites = new Map();

const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];

// soft glow dots are drawn from cached sprites, not a new gradient per particle per frame
function glowSprite(color) {
  if (sprites.has(color)) return sprites.get(color);
  const s = document.createElement('canvas'); s.width = s.height = 64;
  const c = s.getContext('2d'), gr = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, color); gr.addColorStop(0.25, color + 'cc'); gr.addColorStop(1, color + '00');
  c.fillStyle = gr; c.fillRect(0, 0, 64, 64);
  sprites.set(color, s);
  return s;
}

function dress(p, b, fadeIn) {
  p.color = pick(b.colors);
  p.shape = b.shape;
  p.r = rand(b.size[0], b.size[1]);
  p.a0 = rand(b.alpha[0], b.alpha[1]);
  p.tw = b.twinkle ? rand(0.6, 2.2) : 0;
  p.rot = rand(0, Math.PI * 2); p.vr = b.spin ? rand(-0.02, 0.02) : 0;
  p.seed = Math.random() * 1000;
  p.fade = fadeIn ? 0 : 1;
  p.pts = p.shape === 'fleck' ? Array.from({ length: 5 }, (_, k) => [Math.cos(k * 1.256) * rand(0.6, 1.2), Math.sin(k * 1.256) * rand(0.6, 1.2)]) : null;
}

function spawn(p, b, anywhere = true) {
  p.z = rand(0.25, 1);                           // depth: near particles are bigger, faster, and drift more with the cursor
  p.x = rand(0, W); p.y = anywhere ? rand(0, H) : (b.vy < 0 ? H + 10 : b.vy > 0 ? -10 : rand(0, H));
  if (!anywhere && b.vx > 0.5) { p.x = -10; p.y = rand(0, H); }
  p.ox = 0; p.oy = 0; p.glow = 0;
  dress(p, b, !anywhere);
}

function count() {
  const base = Math.min(650, Math.round((W * H) / 3200));
  return Math.round((reduce ? 0.3 : 1) * base * (biome.density || 1));
}

function resize() {
  dpr = Math.min(2, devicePixelRatio || 1);
  W = innerWidth; H = innerHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  cv.style.width = W + 'px'; cv.style.height = H + 'px';
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const n = count();
  while (P.length < n) { const p = {}; spawn(p, biome); P.push(p); }
  P.length = n;
}

function drawParticle(p, x, y, a) {
  const r = p.r * (0.55 + p.z * 0.8) * (1 + p.glow * 0.8);
  if (p.shape === 'glow') {
    const s = r * 2.6;
    g.globalAlpha = a;
    g.drawImage(glowSprite(p.color), x - s, y - s, s * 2, s * 2);
    return;
  }
  g.globalAlpha = a;
  g.save(); g.translate(x, y); g.rotate(p.rot);
  if (p.shape === 'drop') { g.fillStyle = p.color; g.beginPath(); g.ellipse(0, 0, r * 0.5, r * 1.6, 0, 0, 7); g.fill(); }
  else if (p.shape === 'ring') { g.strokeStyle = p.color; g.lineWidth = 0.9; g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke(); }
  else if (p.shape === 'petal') { g.fillStyle = p.color; g.beginPath(); g.ellipse(0, 0, r * 0.55, r * 1.3, 0, 0, 7); g.fill(); }
  else if (p.shape === 'bean') {
    g.fillStyle = p.color; g.beginPath(); g.ellipse(0, 0, r, r * 1.4, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = Math.max(0.6, r * 0.25); g.beginPath(); g.moveTo(0, -r * 1.2); g.quadraticCurveTo(-r * 0.5, 0, 0, r * 1.2); g.stroke();
  } else if (p.shape === 'fleck') {
    g.fillStyle = p.color; g.beginPath(); p.pts.forEach(([u, v], k) => (k ? g.lineTo(u * r, v * r) : g.moveTo(u * r, v * r))); g.closePath(); g.fill();
  }
  g.restore();
}

let last = performance.now(), raf = 0;
function frame(now) {
  raf = requestAnimationFrame(frame);
  const dt = Math.min(2.5, (now - last) / 16.67); last = now;
  const t = now / 1000;
  g.clearRect(0, 0, W, H);

  // the cursor is a warm light
  if (mouse.on) {
    const cg = g.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 220);
    cg.addColorStop(0, biomeName === 'embers' ? 'rgba(255,140,60,.10)' : 'rgba(230,185,134,.07)'); cg.addColorStop(1, 'rgba(230,185,134,0)');
    g.globalAlpha = 1; g.fillStyle = cg; g.fillRect(mouse.x - 220, mouse.y - 220, 440, 440);
  }

  // scrolling makes the near particles rush past, like moving through air
  scrollV += ((scrollY - lastScroll) - scrollV) * 0.2; lastScroll = scrollY;
  const b = biome;
  const heatBoost = biomeName === 'embers' ? 0.6 + heat * 1.6 : 1;
  for (let i = ripples.length - 1; i >= 0; i--) if (now - ripples[i].t > 1800) ripples.splice(i, 1);

  for (let i = 0; i < P.length; i++) {
    const p = P[i];
    const n = Math.sin(t * 0.7 + p.seed) + Math.cos(t * 0.53 + p.seed * 1.7);
    let vx = (b.vx + n * b.turb * 0.35) * p.z, vy = (b.vy * heatBoost + Math.cos(t * 0.6 + p.seed) * b.turb * 0.35) * p.z;
    if (b.swirl) { const dx = p.x - W / 2, dy = p.y - H / 2, d = Math.hypot(dx, dy) || 1; vx += (-dy / d) * b.swirl * p.z; vy += (dx / d) * b.swirl * p.z * 0.6; }
    p.x += vx * dt; p.y += (vy - scrollV * 0.08 * p.z) * dt; p.rot += p.vr * dt;
    if (p.fade < 1) p.fade = Math.min(1, p.fade + 0.02 * dt);

    // off-screen particles come back on the far side, dressed for the current biome
    if (p.y < -20 || p.y > H + 20 || p.x < -20 || p.x > W + 20) {
      spawn(p, b, false);
      continue;
    }

    // lean toward the cursor (on a spring), get pushed by ripples
    let tx = 0, ty = 0;
    if (mouse.on) {
      const dx = mouse.x - p.x, dy = mouse.y - p.y, d = Math.hypot(dx, dy);
      if (d < 180) { const k = 1 - d / 180; tx = dx * k * k * 0.5 * p.z; ty = dy * k * k * 0.5 * p.z; p.glow = Math.max(p.glow, k); }
    }
    for (const R of ripples) {
      const age = Math.max(0, (now - R.t) / 1800), rad = age * Math.max(W, H) * 0.9, dx = p.x - R.x, dy = p.y - R.y, d = Math.hypot(dx, dy) || 1, band = Math.abs(d - rad);
      if (band < 90) { const k = (1 - band / 90) * (1 - age) * 26 * p.z; tx += (dx / d) * k; ty += (dy / d) * k; p.glow = Math.max(p.glow, (1 - age) * (1 - band / 90)); }
    }
    p.ox += (tx - p.ox) * 0.12; p.oy += (ty - p.oy) * 0.12;
    p.glow *= 0.94;

    // the whole world tilts a little with the cursor (parallax by depth)
    const px = (mouse.px) * 18 * p.z, py = (mouse.py) * 12 * p.z;
    const tw = p.tw ? 0.55 + 0.45 * Math.sin(t * p.tw + p.seed) : 1;
    drawParticle(p, p.x + p.ox + px, p.y + p.oy + py, Math.min(1, p.a0 * tw * p.fade * (0.45 + p.z * 0.55) + p.glow * 0.35));
  }

  // ripples, drawn as soft crema rings
  for (const R of ripples) {
    // a ripple made after this frame started would have a negative age for one frame
    const age = Math.max(0, (now - R.t) / 1800);
    g.globalAlpha = 0.35 * (1 - age); g.strokeStyle = '#e6b986'; g.lineWidth = 1.5;
    g.beginPath(); g.arc(R.x, R.y, age * Math.max(W, H) * 0.9, 0, 7); g.stroke();
    g.globalAlpha = 0.2 * (1 - age);
    g.beginPath(); g.arc(R.x, R.y, age * Math.max(W, H) * 0.6, 0, 7); g.stroke();
  }

  // the cursor’s little comet trail
  for (let i = trail.length - 1; i >= 0; i--) {
    const q = trail[i]; q.life -= 0.03 * dt;
    if (q.life <= 0) { trail.splice(i, 1); continue; }
    q.x += q.vx * dt; q.y += q.vy * dt;
    g.globalAlpha = q.life * 0.6;
    const s = 6 * q.life;
    g.drawImage(glowSprite(q.c), q.x - s, q.y - s, s * 2, s * 2);
  }
  g.globalAlpha = 1;

  mouse.px += ((mouse.on ? mouse.x / W - 0.5 : 0) - mouse.px) * 0.04;
  mouse.py += ((mouse.on ? mouse.y / H - 0.5 : 0) - mouse.py) * 0.04;
}

// interactive things keep their own clicks; empty space ripples
const INTERACTIVE = 'a, button, input, select, textarea, summary, label, [role="button"], [tabindex], svg, .pl-stage, .b-bar, .lab, .story-obj, details';

export const World = {
  get biome() { return biomeName; },
  set(name) {
    if (!BIOMES[name] || name === biomeName) return;
    biomeName = name; biome = BIOMES[name];
    document.documentElement.dataset.biome = name;
    // re-dress particles in staggered waves so the weather changes like a shimmer, not a cut
    P.forEach((p, i) => setTimeout(() => dress(p, biome, true), (i % 40) * 18));
    const n = count();
    while (P.length < n) { const p = {}; spawn(p, biome); P.push(p); }
    if (P.length > n) P.length = n;
  },
  heat(v) { heat = v; },
  // recolor the current weather (the flavor wheel tints the air with whatever you’re smelling)
  tint(colors) {
    const base = BIOMES[biomeName];
    biome = colors && colors.length ? { ...base, colors } : base;
    P.forEach((p, i) => setTimeout(() => { p.color = pick(biome.colors); }, (i % 30) * 14));
  },
  ripple(x, y) { ripples.push({ x, y, t: performance.now() }); },
  pulse() { ripples.push({ x: W / 2, y: H / 2, t: performance.now() }); },
};

export function initWorld() {
  cv = document.getElementById('world');
  g = cv.getContext('2d');
  resize();
  addEventListener('resize', resize);
  addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    mouse.on = true;
    if (!reduce && Math.hypot(e.clientX - mouse.x, e.clientY - mouse.y) > 6 && trail.length < 60)
      trail.push({ x: e.clientX, y: e.clientY, vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4, life: 1, c: pick(biome.colors) });
    mouse.x = e.clientX; mouse.y = e.clientY;
  }, { passive: true });
  document.addEventListener('pointerleave', () => (mouse.on = false));
  addEventListener('click', e => {
    if (e.target.closest(INTERACTIVE)) return;
    World.ripple(e.clientX, e.clientY);
    Sound.sfx('drop');
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  });
  raf = requestAnimationFrame(frame);
}

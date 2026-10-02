// Seed to Cup as one continuous scroll: a single object travels down the page and transforms
// cherry → seed → green bean → sack → roast → grounds → espresso → milk → latte.
// The detailed step-by-step text still lives behind each chapter’s “Why? +”.
import { JOURNEY } from './world-data.js';
import { ROAST_COLORS } from './data.js';
import { photoUrl } from './photos.js';
import { Sound } from './sound.js';
import { $, seeded, clamp, lerp } from './util.js';

const STAGES = [
  { ch: '01', name: 'Grow',    line: 'Coffee is<br>a fruit.', note: 'Yes. Really.', photo: 'farm', bed: 'farm', why: ['plant', 'flower'] },
  { ch: '01', name: 'Grow',    line: 'Six to nine months<br>to turn red.', note: 'Green, then yellow, then red.', photo: 'cherry', bed: 'farm', why: ['ripen'] },
  { ch: '02', name: 'Pick',    line: 'Picked by hand.<br>One by one.', note: 'A good picker fills 45–90 kg a day.', photo: 'pick', bed: 'farm', why: ['harvest', 'separate'] },
  { ch: '03', name: 'Process', line: 'Surprise.<br>That’s your coffee bean.', note: 'Every cherry hides two seeds.', photo: 'dry', bed: 'water', why: ['process'], more: '#anatomy' },
  { ch: '03', name: 'Process', line: 'Weeks<br>in the sun.', note: 'Raked by hand, down to 11% water.', photo: 'dry', bed: 'wind', why: ['dry', 'hull'] },
  { ch: '03', name: 'Process', line: 'Green<br>coffee.', note: 'Smells like hay. Hard as a pebble.', photo: 'green', bed: 'wind', why: ['sort'] },
  { ch: '04', name: 'Ship',    line: 'Your coffee<br>has a passport.', note: '60 kg sacks. Weeks at sea.', photo: 'sacks', bed: 'sea', why: ['ship'], more: '#coffeemap' },
  { ch: '05', name: 'Roast',   line: '', note: '', photo: 'roaster', bed: 'roaster', why: ['roast'], roast: true, more: '#roast' },
  { ch: '05', name: 'Roast',   line: 'Roasting is<br>controlled destruction.', note: 'Over 800 aroma compounds, made in minutes.', photo: 'roasted', bed: 'roaster', why: ['rest'] },
  { ch: '06', name: 'Grind',   line: '10,000×<br>more surface.', note: 'Ground seconds before brewing.', photo: 'grind', bed: 'none', why: ['grind'], more: '#grind' },
  { ch: '07', name: 'Brew',    line: 'Nine bars<br>of pressure later…', note: '18 g in. 36 g out. 28 seconds.', photo: 'hero', bed: 'cafe', why: ['brew'] },
  { ch: '08', name: 'Steam',   line: 'Then comes<br>milk.', note: 'Silky, glossy, never scalded.', photo: 'milk', bed: 'cafe', why: [] },
  { ch: '09', name: 'Pour',    line: 'Finally:<br>yours.', note: 'Now make one yourself.', photo: 'latte', bed: 'cafe', why: ['sip'], more: '#barista' },
];
const N = STAGES.length;
const CHAPTERS = [...new Map(STAGES.map((s, i) => [s.ch, { ch: s.ch, name: s.name, at: i }])).values()];

// ---------- color helpers ----------
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const rgb = a => `rgb(${a.map(Math.round).join(',')})`;
const mix = (a, b, t) => rgb(hex(a).map((v, i) => lerp(v, hex(b)[i], t)));
const ease = t => t * t * (3 - 2 * t);
const seg = (t, a, b) => ease(clamp((t - a) / (b - a), 0, 1));
function roastColor(temp) {
  for (let i = 0; i < ROAST_COLORS.length - 1; i++) {
    const [t0, c0] = ROAST_COLORS[i], [t1, c1] = ROAST_COLORS[i + 1];
    if (temp <= t1) return mix(c0, c1, clamp((temp - t0) / (t1 - t0), 0, 1));
  }
  return ROAST_COLORS.at(-1)[1];
}
const roastTemp = t => 20 + 225 * ease(clamp(t * 1.05, 0, 1));

// grounds: where each particle starts (inside the bean) and where it lands (a mound)
const rnd = seeded(42);
const PARTS = Array.from({ length: 90 }, () => {
  const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd());
  const x0 = Math.cos(a) * r * 62, y0 = Math.sin(a) * r * 88;
  const gx = (rnd() + rnd() + rnd() - 1.5) * 90;
  return {
    x0, y0, bx: x0 * 2.1 + (rnd() - 0.5) * 60, by: y0 * 1.7 - 40,
    mx: gx, my: 160 - (1 - Math.abs(gx) / 140) * 34 * rnd(),
    px: (rnd() - 0.5) * 112, py: -128 + rnd() * 14,
    s: 4 + rnd() * 5, rot: rnd() * 360, tone: 22 + rnd() * 18,
  };
});

// ---------- drawing pieces ----------
const leaf = (x, y, rot, s = 1) => `<path transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" d="M0,0 C18,-16 52,-14 68,0 C52,14 18,16 0,0Z" fill="#3f6b33"/><path transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" d="M3,0 H62" stroke="#2c4d24" stroke-width="2"/>`;
const crease = (c, w = 5) => `<path d="M0,-74 C-24,-26 24,22 0,74" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/><path d="M3,-70 C-20,-24 27,22 4,70" fill="none" stroke="#ffe2bf" stroke-width="1.6" stroke-linecap="round" opacity=".28"/>`;
function bean(color, { creaseC = 'rgb(0 0 0 / .45)', sheen = 0.3, scale = 1, x = 0, y = 0, rot = 0, op = 1 } = {}) {
  if (op <= 0.01) return '';
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${scale})" opacity="${op}">
    <ellipse rx="62" ry="88" fill="${color}"/>${crease(creaseC)}
    <ellipse rx="62" ry="88" fill="url(#jShine)" opacity="${sheen}"/></g>`;
}
function cupSide(level, fill, foam = 0, op = 1) {
  if (op <= 0.01) return '';
  const top = 40, bot = 190, h = bot - top;
  const ly = bot - h * clamp(level, 0, 1);
  return `<g opacity="${op}">
    <clipPath id="jCup"><path d="M-88,${top} L-68,${bot - 16} Q-66,${bot} -50,${bot} L50,${bot} Q66,${bot} 68,${bot - 16} L88,${top}Z"/></clipPath>
    <g clip-path="url(#jCup)">
      <rect x="-100" y="${ly}" width="200" height="${bot - ly + 2}" fill="${fill}"/>
      ${foam ? `<rect x="-100" y="${ly}" width="200" height="${foam}" fill="#f6ecdc"/>` : ''}
      ${level > 0.02 ? `<rect x="-100" y="${ly}" width="200" height="4" fill="${foam ? '#fffaf2' : '#b07a45'}" opacity=".8"/>` : ''}
    </g>
    <path d="M-88,${top} L-68,${bot - 16} Q-66,${bot} -50,${bot} L50,${bot} Q66,${bot} 68,${bot - 16} L88,${top}" fill="none" stroke="#fffaf2" stroke-width="4" stroke-linejoin="round"/>
    <ellipse cx="0" cy="${top}" rx="88" ry="9" fill="none" stroke="#fffaf2" stroke-width="3.5"/>
    <path d="M84,${top + 30} c48,0 48,74 -10,74" fill="none" stroke="#fffaf2" stroke-width="9" stroke-linecap="round"/>
  </g>`;
}

function frame(u) {
  const s = Math.min(N - 1, Math.floor(u)), t = u - s;
  let g = '';

  // branch + cherry (0–3)
  if (s <= 2) {
    const off = s === 2 ? seg(t, 0, 0.7) : 0;
    g += `<g transform="translate(${-off * 300} ${off * 40})" opacity="${1 - off}">
      <path d="M-330,-150 C-200,-120 -80,-90 -6,-40" fill="none" stroke="#5b3a22" stroke-width="12" stroke-linecap="round"/>
      ${leaf(-250, -128, -150, 1.4)}${leaf(-170, -106, 20, 1.2)}${leaf(-110, -86, -160, 1.1)}${leaf(-60, -62, 10, 1)}
      <path d="M-6,-40 Q-2,-20 0,${-(s === 0 ? 14 + 26 * ease(t) : 90) + 4}" stroke="#5b3a22" stroke-width="5" fill="none"/></g>`;
  }
  if (s <= 3) {
    let r = 90, color = '#b8202e', lift = 0;
    if (s === 0) { r = 14 + 26 * ease(t); color = '#7da34b'; }
    if (s === 1) { r = 40 + 50 * ease(t); color = t < 0.5 ? mix('#7da34b', '#e2b23a', t * 2) : mix('#e2b23a', '#b8202e', (t - 0.5) * 2); }
    if (s === 2) lift = -24 * seg(t, 0.2, 0.9);
    const open = s === 3 ? seg(t, 0.05, 0.75) : 0;
    // seeds (in parchment) are inside the whole time; you only see them once the skin opens
    if (s === 3) {
      const sc = 0.9 + 0.5 * ease(t);
      g += `<g transform="scale(${sc})">
        <circle r="${r * 0.86}" fill="#f2c27c" opacity="${1 - seg(t, 0.3, 0.9)}"/>
        <path d="M-3,-62 A44,62 0 0 0 -3,62Z" fill="#ecdcb0" stroke="#c3ad7c" stroke-width="2"/>
        <path d="M3,-62 A44,62 0 0 1 3,62Z" fill="#ecdcb0" stroke="#c3ad7c" stroke-width="2"/>
        <path d="M-3,-62 A44,62 0 0 0 -3,62Z M3,-62 A44,62 0 0 1 3,62Z" fill="#fbe9b0" opacity="${0.5 * (1 - seg(t, 0.5, 1))}"/></g>`;
    }
    const half = (side) => {
      const dir = side === 'l' ? -1 : 1;
      return `<g transform="translate(${dir * open * 150} ${lift + open * 40}) rotate(${dir * open * 35})" opacity="${1 - open}">
        <path d="M0,${-r} A${r},${r} 0 0 ${side === 'l' ? 0 : 1} 0,${r}Z" fill="${color}"/>
        ${side === 'l' ? `<circle cx="${-r * 0.38}" cy="${-r * 0.38}" r="${r * 0.22}" fill="#fff" opacity=".28"/>` : ''}</g>`;
    };
    g = `<g transform="translate(0 ${lift})">${g}</g>` + half('l') + half('r');
  }

  // one seed becomes the bean (4–8)
  if (s === 4) {
    const a = seg(t, 0, 0.6);
    g += `<g opacity="${1 - a}" transform="scale(1.4)">
      <path transform="translate(${-a * 120} 0)" d="M-3,-62 A44,62 0 0 0 -3,62Z" fill="#ecdcb0" stroke="#c3ad7c" stroke-width="2"/>
      <path transform="translate(${-a * 22} 0)" d="M3,-62 A44,62 0 0 1 3,62Z" fill="#ecdcb0" stroke="#c3ad7c" stroke-width="2"/></g>`;
    g += bean('#e3d3a6', { creaseC: '#b49a63', sheen: 0.2, op: seg(t, 0.25, 0.8), scale: 0.9 + 0.2 * ease(t) });
  }
  if (s === 5) {
    g += bean(mix('#e3d3a6', '#a3ae78', seg(t, 0.1, 0.7)), { creaseC: mix('#b49a63', '#6f7b46', seg(t, 0.1, 0.7)), sheen: 0.25, scale: 1.1 });
    // parchment flakes fly away
    for (let i = 0; i < 10; i++) {
      const a = i * 0.63, d = 70 + seg(t, 0, 0.8) * 160;
      g += `<path transform="translate(${Math.cos(a) * d} ${Math.sin(a) * d * 1.2}) rotate(${i * 40 + t * 120})" d="M-10,-6 L12,-2 L4,9Z" fill="#ecdcb0" opacity="${1 - seg(t, 0.2, 0.9)}"/>`;
    }
  }
  if (s === 6) {
    const sackY = lerp(320, 70, seg(t, 0, 0.45));
    const drop = seg(t, 0.3, 0.75);
    g += bean('#a3ae78', { creaseC: '#6f7b46', scale: lerp(1.1, 0.32, seg(t, 0.1, 0.5)), y: lerp(0, 90, drop), op: 1 - seg(t, 0.7, 0.8) });
    g += `<g transform="translate(0 ${sackY}) rotate(${Math.sin(t * 12) * 2 * seg(t, 0.75, 1)})">
      <path d="M-120,-40 Q-140,110 -100,160 L100,160 Q140,110 120,-40 Q60,-62 0,-50 Q-60,-62 -120,-40Z" fill="#b89567" stroke="#7a5c38" stroke-width="3"/>
      <path d="M-120,-40 Q-60,-20 0,-30 Q60,-20 120,-40" fill="none" stroke="#7a5c38" stroke-width="3"/>
      ${[-80, -40, 0, 40, 80].map(x => `<path d="M${x},-30 V150" stroke="#a5835a" stroke-width="1.2" opacity=".6"/>`).join('')}
      <text y="55" text-anchor="middle" class="j-stencil">CAFÉ</text><text y="88" text-anchor="middle" class="j-stencil sm">GREEN · 60 KG</text></g>`;
  }
  if (s === 7) {
    const temp = roastTemp(t);
    const glow = seg(t, 0, 0.5);
    g += `<circle r="210" fill="url(#jFire)" opacity="${0.25 + glow * 0.65}"/>`;
    if (t < 0.3) g += `<g transform="translate(0 ${70 + seg(t, 0, 0.3) * 260})" opacity="${1 - seg(t, 0, 0.3)}"><path d="M-120,-40 Q-140,110 -100,160 L100,160 Q140,110 120,-40 Q60,-62 0,-50 Q-60,-62 -120,-40Z" fill="#b89567"/></g>`;
    const puff = 1 + 0.12 * clamp((temp - 150) / 100, 0, 1);
    const c = roastColor(temp);
    g += bean(c, { creaseC: mix(c.startsWith('rgb') ? '#2b180e' : c, '#1a0d06', 0.4), sheen: 0.15 + clamp((temp - 215) / 40, 0, 1) * 0.6, scale: lerp(0.32, 1.1, seg(t, 0.02, 0.25)) * puff, y: lerp(90, 0, seg(t, 0.02, 0.25)) });
    if (temp > 196) for (let i = 0; i < 8; i++) {
      const a = i * 0.785 + 0.3, r1 = 120, r2 = 120 + 26 * seg(t, 0.72, 0.8) * (1 - seg(t, 0.85, 0.95));
      g += `<path d="M${Math.cos(a) * r1},${Math.sin(a) * r1 * 1.2} L${Math.cos(a) * r2},${Math.sin(a) * r2 * 1.2}" stroke="#ffd59a" stroke-width="3" stroke-linecap="round"/>`;
    }
    if (temp > 215) for (let i = 0; i < 5; i++) {
      const k = (t * 3 + i * 0.2) % 1;
      g += `<circle cx="${-40 + i * 20}" cy="${-120 - k * 120}" r="${14 + k * 26}" fill="#cfc7c0" opacity="${0.22 * (1 - k) * seg(t, 0.8, 1)}"/>`;
    }
  }
  if (s === 8) {
    g += `<circle r="210" fill="url(#jFire)" opacity="${0.9 * (1 - seg(t, 0, 0.8))}"/>`;
    g += bean('#3d2213', { creaseC: '#1a0c05', sheen: 0.55, scale: 1.23, rot: t * 25 });
  }

  // grind → espresso → milk → latte (9–12)
  if (s === 9) {
    const burst = seg(t, 0, 0.35), fall = seg(t, 0.35, 1);
    g += bean('#3d2213', { creaseC: '#1a0c05', sheen: 0.55, scale: 1.23 + burst * 0.2, op: 1 - seg(t, 0, 0.12) });
    for (const p of PARTS) {
      const x = lerp(lerp(p.x0, p.bx, burst), p.mx, fall), y = lerp(lerp(p.y0, p.by, burst), p.my, fall);
      g += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${p.s}" height="${p.s * 0.8}" transform="rotate(${p.rot} ${x.toFixed(1)} ${y.toFixed(1)})" fill="hsl(24 45% ${p.tone}%)" opacity="${seg(t, 0.02, 0.12)}"/>`;
    }
  }
  if (s === 10 || s === 11) {
    const gather = s === 10 ? seg(t, 0, 0.3) : 1;
    const basket = s === 11 ? 1 - seg(t, 0, 0.25) : seg(t, 0, 0.2);
    g += `<g opacity="${basket}" transform="translate(0 ${s === 11 ? -seg(t, 0, 0.25) * 80 : 0})">
      <rect x="-160" y="-190" width="320" height="40" rx="10" fill="#9aa0a6"/>
      <path d="M-72,-150 h144 l-10,36 h-124z" fill="#c3c7cc" stroke="#8e949a" stroke-width="2"/>
      <path d="M72,-136 h120" stroke="#2a1a12" stroke-width="16" stroke-linecap="round"/>
      ${gather >= 1 ? `<rect x="-64" y="-146" width="128" height="16" rx="3" fill="#3a2010"/>` : ''}
      <path d="M-14,-114 v14 M14,-114 v14" stroke="#8e949a" stroke-width="6" stroke-linecap="round"/></g>`;
    if (s === 10 && gather < 1) for (const p of PARTS) {
      const x = lerp(p.mx, p.px, gather), y = lerp(p.my, p.py, gather);
      g += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${p.s}" height="${p.s * 0.8}" fill="hsl(24 45% ${p.tone}%)"/>`;
    }
    const cupOp = s === 10 ? seg(t, 0.15, 0.35) : 1;
    const shot = s === 10 ? seg(t, 0.4, 0.95) : 1;
    const milk = s === 11 ? seg(t, 0.25, 0.95) : 0;
    const level = 0.22 * shot + 0.62 * milk;
    const fill = milk ? mix('#3a1d0e', '#d9b48a', milk) : '#3a1d0e';
    g += cupSide(level, fill, milk > 0.6 ? 6 + 10 * seg(milk, 0.6, 1) : 0, cupOp);
    if (s === 10 && t > 0.38 && t < 0.97) {
      const c = t < 0.6 ? '#2a1408' : t < 0.85 ? '#7a4520' : '#c08a52';
      [-14, 14].forEach(x => (g += `<path d="M${x},-100 Q${x * 0.4},${-20} 0,${190 - 150 * level}" stroke="${c}" stroke-width="${t > 0.85 ? 2 : 3.5}" fill="none" stroke-linecap="round"/>`));
    }
    if (s === 11) {
      const pin = seg(t, 0, 0.25);
      g += `<g transform="translate(${lerp(260, 120, pin)} ${-80}) rotate(${lerp(0, -38, seg(t, 0.15, 0.3))})" opacity="${pin}">
        <path d="M-50,-60 h96 l-8,108 h-80z" fill="#c3c7cc" stroke="#8e949a" stroke-width="3"/><path d="M-50,-60 l-22,-6" stroke="#8e949a" stroke-width="6" stroke-linecap="round"/></g>`;
      if (t > 0.28 && t < 0.97) g += `<path d="M40,-112 Q10,-40 0,${190 - 150 * level}" stroke="#f3e6cf" stroke-width="${t > 0.75 ? 4 : 8}" fill="none" stroke-linecap="round"/>`;
    }
  }
  if (s === 12) {
    const toTop = seg(t, 0, 0.3), art = seg(t, 0.3, 0.9);
    g += `<g opacity="${1 - toTop}">${cupSide(0.84, '#d9b48a', 16)}</g>`;
    if (toTop > 0) {
      // rosetta: stacked arcs, wide at the bottom, narrowing up to a little heart, then pulled through
      let leaves = '';
      const n = Math.round(10 * art);
      for (let i = 0; i < n; i++) {
        const y = 78 - i * 13, w = 82 - i * 6.5, lift = 26 - i * 1.2;
        leaves += `<path d="M${-w},${y} C${-w * 0.55},${y - lift} ${w * 0.55},${y - lift} ${w},${y}" fill="none" stroke="#fdf9f1" stroke-width="${8 - i * 0.35}" stroke-linecap="round"/>`;
      }
      if (art > 0.85) leaves += `<path d="M0,-52 c-10,-16 -30,-8 -20,8 l20,18 l20,-18 c10,-16 -10,-24 -20,-8z" fill="#fdf9f1"/>`;
      g += `<g opacity="${toTop}" transform="scale(${0.8 + 0.2 * toTop})">
        <circle r="168" fill="#fffaf2" stroke="#e8dccb" stroke-width="6"/><circle r="140" fill="url(#jCrema)"/>
        ${leaves}${art > 0.95 ? `<path d="M0,-40 V92" stroke="#c79a6a" stroke-width="3" opacity=".7"/>` : ''}
        <path d="M160,-30 c60,0 60,60 0,60" fill="none" stroke="#fffaf2" stroke-width="14"/></g>`;
      for (let i = 0; i < 3; i++) g += `<path class="j-steam" style="animation-delay:${i * 0.9}s" d="M${-40 + i * 40},-190 q-12,-22 0,-44 q12,-22 0,-44" fill="none" stroke="#fffaf2" stroke-width="4" stroke-linecap="round" opacity="${art}"/>`;
    }
  }
  return g;
}

// ---------- page wiring ----------
let current = -1, lastU = -1, raf = 0;

function whyHTML(st) {
  const steps = st.why.map(id => JOURNEY.find(j => j.id === id)).filter(Boolean);
  if (!steps.length && !st.more) return '';
  return `<details class="why"><summary>Why? <span>+</span></summary><div class="why-body">
    ${steps.map(j => `<h4>${j.title} <small>${j.time}</small></h4><p>${j.text}</p>${j.points.length ? `<ul>${j.points.map(p => `<li>${p}</li>`).join('')}</ul>` : ''}<p class="why-fact">${j.fact}</p>`).join('')}
    ${st.more ? `<a class="why-more" href="${st.more}">Go deeper →</a>` : ''}</div></details>`;
}

function setStage(i) {
  current = i;
  const st = STAGES[i];
  $('storyBgs').querySelectorAll('.sbg').forEach((el, k) => {
    el.classList.toggle('on', k === i);
    // load photos just ahead of where you are
    if (Math.abs(k - i) <= 2 && !el.style.backgroundImage) el.style.backgroundImage = `url("${photoUrl(el.dataset.photo)}")`;
  });
  $('storyNum').textContent = st.ch;
  $('storyName').textContent = st.name;
  const copy = $('storyCopy');
  copy.classList.remove('in'); void copy.offsetWidth; copy.classList.add('in');
  $('storyLine').innerHTML = st.line;
  $('storyNote').textContent = st.note;
  $('storyWhy').innerHTML = whyHTML(st);
  $('story').classList.toggle('is-roast', !!st.roast);
  $('storyRail').querySelectorAll('li').forEach(li => li.classList.toggle('on', li.dataset.ch === st.ch));
  Sound.ambience(st.bed);
  if (i === 2 || i === 6) Sound.sfx('drop');
}

function update() {
  raf = 0;
  const sec = $('story');
  const r = sec.getBoundingClientRect();
  const span = sec.offsetHeight - innerHeight;
  const p = clamp(-r.top / span, 0, 0.9999);
  const u = p * N;
  const i = Math.floor(u);
  const inView = r.top < innerHeight && r.bottom > 0;
  if (!inView) { if (current !== -1 && (r.bottom <= 0 || r.top >= innerHeight)) Sound.ambience('none'); return; }
  if (i !== current) setStage(i);
  if (Math.abs(u - lastU) < 0.001) return;
  lastU = u;
  $('storyObj').querySelector('#jStage').innerHTML = frame(u);
  const t = u - i;
  // the screen itself reacts: water washes over processing, the roast warms everything
  $('story').style.setProperty('--wash', i === 3 ? seg(t, 0, 0.5) - seg(t, 0.5, 1) : 0);
  $('story').style.setProperty('--heat', i === 7 ? seg(t, 0.1, 0.95) : i === 8 ? 1 - seg(t, 0, 0.8) : 0);
  $('story').style.setProperty('--cream', i === 11 ? seg(t, 0, 0.5) * 0.4 : i === 12 ? 0.4 - seg(t, 0, 0.6) * 0.4 : 0);
  $('storyProgress').style.transform = `scaleY(${p})`;
  if (STAGES[i].roast) {
    const temp = Math.round(roastTemp(t));
    $('storyLine').innerHTML = `${temp}°C`;
    $('storyNote').textContent = temp >= 224 ? 'Second crack' : temp >= 196 ? 'First crack' : temp >= 150 ? 'Browning' : 'Drying';
    const crack = temp >= 224 ? 2 : temp >= 196 ? 1 : 0;
    if (crack > (update.crack || 0)) { for (let k = 0; k < (crack === 1 ? 7 : 12); k++) setTimeout(() => Sound.sfx('crack'), Math.random() * 900); }
    update.crack = crack;
  } else update.crack = 0;
}

export function initJourney() {
  const sec = $('story');
  sec.style.setProperty('--n', N);
  $('storyBgs').innerHTML = STAGES.map(s => `<div class="sbg" data-photo="${s.photo}"></div>`).join('');
  $('storyRail').innerHTML = CHAPTERS.map(c => `<li data-ch="${c.ch}"><button type="button" data-at="${c.at}"><b>${c.ch}</b><span>${c.name}</span></button></li>`).join('');
  $('storyRail').addEventListener('click', e => {
    const b = e.target.closest('[data-at]');
    if (!b) return;
    const span = sec.offsetHeight - innerHeight;
    scrollTo({ top: sec.offsetTop + span * ((+b.dataset.at + 0.05) / N), behavior: 'smooth' });
  });
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  update();
}

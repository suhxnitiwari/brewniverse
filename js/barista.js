// Barista School: a guided build. Pick a drink, then do every step yourself:
// flavor → grind → tamp → pull → (water | milk → steam → pour + latte art).
import { CUPS } from './data.js';
import { GRINDS } from './world-data.js';
import { BOTTOM, CX, geometry, outlineMarkup, clipMarkup, layersMarkup, cupSVG, total } from './cup.js';
import { $, holdable, ticker, clamp, cToF } from './util.js';

// ---------- the menu ----------
const DRINKS = [
  { id: 'espresso',   name: 'Espresso',    cup: 'demitasse', recipe: { espresso: 60 }, steps: [],
    blurb: 'Just the shot. The base for everything else.' },
  { id: 'americano',  name: 'Americano',   cup: 'glass', recipe: { espresso: 60, water: 120 }, steps: ['water'],
    blurb: 'Espresso topped with hot water.' },
  { id: 'latte',      name: 'Latte',       cup: 'mug', recipe: { espresso: 60, milk: 200, foam: 20 }, steps: ['milk', 'steam', 'pour'], art: true,
    blurb: 'Lots of steamed milk with a thin layer of foam.' },
  { id: 'flatwhite',  name: 'Flat White',  cup: 'glass', recipe: { espresso: 60, milk: 110, foam: 10 }, steps: ['milk', 'steam', 'pour'], art: true,
    blurb: 'Smaller and stronger, with silky microfoam.' },
  { id: 'cappuccino', name: 'Cappuccino',  cup: 'glass', recipe: { espresso: 60, milk: 60, foam: 60 }, steps: ['milk', 'steam', 'pour'], art: true,
    blurb: 'Thirds: espresso, steamed milk and a thick cap of foam.' },
  { id: 'macchiato',  name: 'Macchiato',   cup: 'demitasse', recipe: { espresso: 60, foam: 20 }, steps: ['milk', 'steam', 'pour'], foamOnly: true,
    blurb: 'Espresso “marked” with a spoonful of foam.' },
  { id: 'mocha',      name: 'Mocha',       cup: 'mug', recipe: { chocolate: 30, espresso: 60, milk: 150, cream: 30 }, steps: ['milk', 'steam', 'pour'],
    blurb: 'Chocolate sauce, espresso, steamed milk, whipped cream.' },
  { id: 'breve',      name: 'Breve',       cup: 'mug', recipe: { espresso: 60, milk: 150, foam: 30 }, steps: ['milk', 'steam', 'pour'], art: true, lockMilk: 'halfhalf',
    blurb: 'A latte made with half-and-half. Rich and creamy.' },
];

// lo–hi = ideal steaming temp (°C). foam = how well it stretches.
const MILKS = [
  { id: 'whole',    name: 'Whole',     color: '#f3e5cc', foam: 1,    lo: 60, hi: 68, note: 'The easiest to steam. Fat and protein make glossy, sweet microfoam.' },
  { id: 'two',      name: '2%',        color: '#f2e8d8', foam: 1.12, lo: 60, hi: 68, note: 'Foams up quickly and a bit stiffer. Lighter and less creamy than whole.' },
  { id: 'oat',      name: 'Oat',       color: '#ead6b4', foam: 0.95, lo: 55, hi: 63, note: 'Creamy and naturally sweet. Use a “barista” oat milk, and don’t overheat it or it gets gluey.' },
  { id: 'almond',   name: 'Almond',    color: '#efdfc8', foam: 0.7,  lo: 50, hi: 60, note: 'Thin, nutty, and bubbles big. Too hot and it can separate.' },
  { id: 'soy',      name: 'Soy',       color: '#efe2c6', foam: 1.05, lo: 55, hi: 63, note: 'Foams almost like dairy. Can curdle in very acidic coffee, so pour gently.' },
  { id: 'halfhalf', name: 'Half & half', color: '#f6ead2', foam: 0.55, lo: 58, hi: 66, note: 'Half milk, half cream. Rich and thick, and makes a small, dense foam. This is what makes a breve.' },
];

// 1 pump ≈ 7.5 ml (about ¼ oz)
const SYRUPS = [
  { id: 'vanilla',   name: 'Vanilla',       color: '#e6c98f' },
  { id: 'caramel',   name: 'Caramel',       color: '#b9712a' },
  { id: 'hazelnut',  name: 'Hazelnut',      color: '#a8743f' },
  { id: 'brownsugar',name: 'Brown sugar',   color: '#8a5a2b' },
  { id: 'pumpkin',   name: 'Pumpkin spice', color: '#d27a2c' },
  { id: 'lavender',  name: 'Lavender',      color: '#b9a6d6' },
  { id: 'whitemocha',name: 'White mocha',   color: '#efe3c8' },
  { id: 'chocolate', name: 'Chocolate sauce', color: '#5c2d1a' },
];
const PUMP = 7.5;

const ARTS = [
  { id: 'heart',   name: 'Heart',   how: ['Pour from up high until the cup is about half full.', 'Bring the pitcher close and pour into the center. A white circle blooms.', 'Lift up and draw a line straight through it.'] },
  { id: 'tulip',   name: 'Tulip',   how: ['Fill the cup halfway from up high.', 'Pour a blob, stop, then pour another one just behind it to push the first forward.', 'Stack a third, then pull through all of them.'] },
  { id: 'rosetta', name: 'Rosetta', how: ['Fill halfway, then drop close to the surface.', 'Wiggle the pitcher side to side while slowly moving backward to make the leaves.', 'Lift up and pull back through to make the stem.'] },
  { id: 'swan',    name: 'Swan',    how: ['Start with a rosetta, wiggling off to one side.', 'Pour down, then back up, to draw the neck.', 'Finish with a small heart for the head.'] },
  { id: 'none',    name: 'No art',  how: ['Just pour it in.'] },
];

const STEP_TITLES = {
  drink: 'Pick a drink', flavor: 'Flavor', grind: 'Grind & dose', tamp: 'Tamp', pull: 'Pull the shot',
  water: 'Add water', milk: 'Pick a milk', steam: 'Steam', pour: 'Pour', done: 'Your drink',
};

// ---------- state ----------
let S;
function fresh(drinkId = null) {
  const d = DRINKS.find(x => x.id === drinkId) || null;
  S = {
    drink: d,
    steps: d ? ['drink', 'flavor', 'grind', 'tamp', 'pull', ...d.steps, 'done'] : ['drink'],
    at: d ? 1 : 0,
    pumps: d?.id === 'mocha' ? { chocolate: 4 } : {},
    grind: 3,           // starts on Medium so you have to think about it
    dose: 0,
    tamp: 0, tampPeak: 0,
    shotTime: 0, shotDone: false,
    milk: d?.lockMilk || null,
    pitcher: { liquid: 0, foam: 0, temp: 4, big: 0 },
    tip: 'surface', steamed: false,
    art: d?.art ? 'heart' : 'none', artP: 0,
    amounts: { syrup: 0, chocolate: 0, espresso: 0, water: 0, milk: 0, foam: 0, cream: 0 },
    spilled: 0,
    result: null,
  };
  if (d) applyPumps();
}

const step = () => S.steps[S.at];
const milkObj = () => MILKS.find(m => m.id === S.milk);
// Size up the cup if the syrup wouldn't fit.
function cupKey() {
  const need = total(S.drink.recipe) + S.amounts.syrup;
  const order = ['demitasse', 'glass', 'mug'];
  const i = order.indexOf(S.drink.cup);
  return order.slice(i).find(k => need <= CUPS[k].capacity * 0.92) || 'mug';
}
const capacity = () => CUPS[cupKey()].capacity;

function applyPumps() {
  S.amounts.chocolate = (S.pumps.chocolate || 0) * PUMP;
  S.amounts.syrup = Object.entries(S.pumps).filter(([k]) => k !== 'chocolate').reduce((s, [, n]) => s + n * PUMP, 0);
}

function syrupColor() {
  const list = Object.entries(S.pumps).filter(([k, n]) => k !== 'chocolate' && n > 0);
  if (!list.length) return null;
  let r = 0, g = 0, b = 0, n = 0;
  for (const [k, c] of list) {
    const hex = parseInt(SYRUPS.find(s => s.id === k).color.slice(1), 16);
    r += ((hex >> 16) & 255) * c; g += ((hex >> 8) & 255) * c; b += (hex & 255) * c; n += c;
  }
  return `rgb(${Math.round(r / n)},${Math.round(g / n)},${Math.round(b / n)})`;
}

function colors() {
  const m = milkObj();
  const c = {};
  if (m) { c.milk = m.color; c.foam = '#fdf9f1'; }
  const sc = syrupColor();
  if (sc) c.syrup = sc;
  return c;
}

// ---------- sound ----------
let audio = null, soundOn = true;
function noise(kind) {
  if (!soundOn) return null;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const len = audio.sampleRate * 2, buf = audio.createBuffer(1, len, audio.sampleRate), data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = audio.createBufferSource(); src.buffer = buf; src.loop = true;
    const f = audio.createBiquadFilter(); const g = audio.createGain();
    const cfg = { grind: ['bandpass', 900, .05], steam: ['highpass', 3200, .03], deep: ['lowpass', 600, .05], pour: ['lowpass', 1200, .025], pull: ['lowpass', 500, .03] }[kind];
    f.type = cfg[0]; f.frequency.value = cfg[1];
    g.gain.value = 0; g.gain.linearRampToValueAtTime(cfg[2], audio.currentTime + 0.08);
    src.connect(f).connect(g).connect(audio.destination); src.start();
    let mod = null;
    if (kind === 'grind') { mod = audio.createOscillator(); const mg = audio.createGain(); mod.frequency.value = 38; mg.gain.value = .02; mod.connect(mg).connect(g.gain); mod.start(); }
    return { stop() { g.gain.linearRampToValueAtTime(0, audio.currentTime + 0.08); setTimeout(() => { src.stop(); mod?.stop(); }, 120); } };
  } catch { return null; }
}

// ---------- shared drawing ----------
// The drink cup, plus whatever is above it (machine, pitcher, kettle) and the stream.
function cupScene({ top = null, stream = null, guide = null, art = false } = {}) {
  const geo = geometry(cupKey());
  const tot = total(S.amounts);
  const surface = BOTTOM - Math.min(tot, capacity()) * geo.mlToPx;
  let head = '';
  let sx = CX;
  if (top === 'machine') {
    head = `<rect x="60" y="-6" width="160" height="34" rx="8" class="b-metal"/><rect x="92" y="28" width="96" height="16" rx="4" class="b-dark"/>
      <path d="M188,36 h70 a8,8 0 0 1 0,14 h-70z" class="b-dark"/>
      <path d="M126,44 v10 h-6 M154,44 v10 h6" class="b-spout"/>`;
    sx = CX;
  } else if (top === 'pitcher' || top === 'kettle') {
    const tilt = stream ? -28 : -8;
    head = `<g transform="translate(${CX + 26} ${Math.max(10, surface - 120)}) rotate(${tilt})">
      ${top === 'kettle'
        ? `<path d="M0,0 h52 l6,48 h-64z" class="b-metal"/><path d="M-6,20 q-26,-6 -34,-26" class="b-spout-line"/>`
        : `<path d="M0,0 h50 l-4,56 h-42z" class="b-metal"/><path d="M0,0 l-14,-4" class="b-spout-line"/><path d="M50,10 c16,0 16,30 -2,30" class="b-spout-line"/>`}
    </g>`;
    sx = CX + (top === 'kettle' ? -6 : 10);
  }
  const startY = top === 'machine' ? 54 : Math.max(18, surface - 112);
  const streamSvg = stream
    ? `<rect x="${sx - stream.w / 2}" y="${startY}" width="${stream.w}" height="${Math.max(0, surface - startY)}" rx="${stream.w / 2}" fill="${stream.color}" class="b-stream"/>
       ${top === 'machine' ? `<rect x="${sx - 10 - stream.w / 2}" y="${startY}" width="${stream.w}" height="${Math.max(0, surface - startY)}" rx="${stream.w / 2}" fill="${stream.color}" class="b-stream"/>` : ''}`
    : '';
  const g = guide != null ? (() => {
    const y = BOTTOM - guide * geo.mlToPx;
    const done = Math.abs(tot - guide) <= Math.max(6, guide * 0.06);
    return `<line class="guide${done ? ' done' : ''}" x1="${geo.x1 - 16}" x2="${geo.x2 + 16}" y1="${y}" y2="${y}"/>
      <text class="guide-label${done ? ' done' : ''}" x="${geo.x2 + 20}" y="${y + 4}">${guide} ml</text>`;
  })() : '';
  return `<svg class="b-scene" viewBox="0 -10 300 340" aria-hidden="true">
    <defs>${clipMarkup(geo, 'bClip')}</defs>
    ${head}${streamSvg}
    <g clip-path="url(#bClip)">${layersMarkup(geo, S.amounts, { colors: colors() })}</g>
    ${g}
    ${outlineMarkup(geo)}
  </svg>`;
}

// Looking down into the cup, for latte art.
function topView() {
  const a = S.amounts;
  const coffee = a.espresso + a.syrup + a.chocolate;
  const milky = a.milk / Math.max(1, coffee + a.milk);
  // crema gets lighter as milk rises through it
  const base = `rgb(${Math.round(150 + milky * 40)},${Math.round(98 + milky * 40)},${Math.round(55 + milky * 30)})`;
  const art = ARTS.find(x => x.id === S.art);
  const p = S.artP;
  const foamQ = foamQuality();
  const fuzz = foamQ < 0.55 ? 2.4 : foamQ < 0.8 ? 1 : 0;
  const parts = artParts(S.art, p);
  return `<svg class="b-top" viewBox="-100 -100 228 200" role="img" aria-label="Top view of your cup">
    <defs><filter id="artFuzz"><feGaussianBlur stdDeviation="${fuzz}"/></filter>
      <radialGradient id="cremaG"><stop offset=".7" stop-color="${base}"/><stop offset="1" stop-color="#7a4a26"/></radialGradient></defs>
    <path d="M86,-20 c30,0 30,40 0,40" fill="none" stroke="var(--ink)" stroke-width="9"/>
    <circle r="92" fill="var(--card)" stroke="var(--ink)" stroke-width="3.5"/>
    <circle r="80" fill="${a.espresso ? 'url(#cremaG)' : 'var(--soft)'}"/>
    <g filter="url(#artFuzz)" fill="#fdf9f1">${art.id === 'none' && a.foam > 2 ? `<circle r="${Math.min(70, a.foam * 1.4)}" opacity=".85"/>` : parts}</g>
    ${a.cream ? `<g fill="#fffdf7">${Array.from({ length: 9 }, (_, i) => `<circle cx="${Math.cos(i * .7) * (i ? 26 : 0)}" cy="${Math.sin(i * .7) * (i ? 26 : 0)}" r="${i ? 22 : 30}"/>`).join('')}</g>` : ''}
  </svg>`;
}

function artParts(id, p) {
  if (p <= 0) return '';
  const show = (t, svg) => (p >= t ? svg : '');
  const grow = (t0, t1) => clamp((p - t0) / (t1 - t0), 0, 1);
  const crema = '#a8703f';
  if (id === 'heart') {
    const r = 18 + 22 * grow(0, 0.75);
    return `<circle cy="10" r="${r}"/>` + show(0.8, `<path d="M0,${10 - r} q-4,${r * .5} 0,${r * 1.6}" stroke="${crema}" stroke-width="5" fill="none"/><path d="M0,${10 + r * .6} l0,${r * .9}" stroke="#fdf9f1" stroke-width="4"/>`);
  }
  if (id === 'tulip') {
    let s = '';
    [[36, 22, 0.05], [8, 19, 0.35], [-18, 15, 0.62]].forEach(([y, r, t]) => {
      if (p >= t) s += `<path d="M${-r},${y} a${r},${r * .8} 0 0 1 ${r * 2},0 q-${r},${r * .9} -${r * 2},0z"/>`;
    });
    return s + show(0.85, `<path d="M0,-34 V60" stroke="#fdf9f1" stroke-width="3.5"/>`);
  }
  if (id === 'rosetta' || id === 'swan') {
    const swan = id === 'swan';
    const n = Math.round(9 * grow(0, swan ? 0.55 : 0.8));
    let s = '';
    for (let i = 0; i < n; i++) {
      const y = 48 - i * 9, w = 46 - i * 3.6;
      const cx = swan ? 18 + i * 1.5 : 0;
      s += `<path d="M${cx - w},${y} q${w},-22 ${w * 2},0 q-${w},-12 -${w * 2},0z"/>`;
    }
    if (!swan) return s + show(0.85, `<path d="M0,-40 V58" stroke="#fdf9f1" stroke-width="3"/><path d="M0,-40 V58" stroke="${crema}" stroke-width="1" opacity=".5"/>`);
    const neck = grow(0.55, 0.85);
    if (neck > 0) s += `<path d="M-14,56 C-40,30 -40,-10 -26,-34" stroke="#fdf9f1" stroke-width="9" fill="none" stroke-linecap="round" pathLength="1" stroke-dasharray="${neck} 1"/>`;
    s += show(0.88, `<path d="M-26,-34 c-8,-12 -24,-6 -16,6 l12,12 l12,-12 c8,-12 -8,-18 -8,-6z" transform="translate(4 -6) scale(.9)"/>`);
    return s;
  }
  return '';
}

function gauge(value, max, lo, hi, { label = '', danger = null, unit = '' } = {}) {
  const ang = v => Math.PI * (1 - clamp(v / max, 0, 1));
  const pt = (v, r) => `${(Math.cos(ang(v)) * r).toFixed(1)},${(-Math.sin(ang(v)) * r).toFixed(1)}`;
  const band = (a, b, cls) => `<path class="${cls}" d="M${pt(a, 70)} A70,70 0 0 1 ${pt(b, 70)}"/>`;
  return `<svg class="b-gauge" viewBox="-90 -86 180 132" aria-hidden="true">
    <path class="g-track" d="M${pt(0, 70)} A70,70 0 0 1 ${pt(max, 70)}"/>
    ${band(lo, hi, 'g-good')}${danger != null ? band(danger, max, 'g-bad') : ''}
    <line class="g-needle" x1="0" y1="0" x2="${pt(value, 60).split(',')[0]}" y2="${pt(value, 60).split(',')[1]}"/>
    <circle r="6" class="g-hub"/>
    <text class="g-val" y="30">${Math.round(value)}${unit}</text><text class="g-lbl" y="44">${label}</text>
  </svg>`;
}

// ---------- scoring helpers ----------
function foamQuality() {
  const d = S.drink, target = d.recipe.foam || 0;
  if (!target) return 1;
  const err = Math.abs(S.pitcher.foam + S.amounts.foam - target) / Math.max(target, 10);
  const big = clamp(S.pitcher.big / 20, 0, 0.4);
  return clamp(1 - err * 0.8 - big, 0.2, 1);
}

function band3(ok, close) { return ok ? 1 : close ? 0.7 : 0.4; }

function shotVerdict() {
  const t = S.shotTime, ml = S.amounts.espresso;
  if (!ml) return { text: 'No shot yet.', score: 0 };
  if (ml > 25 && t < 20) return { text: `${Math.round(ml)} ml in ${t.toFixed(0)} s: a gusher. Water rushed through, so it’ll taste sour and thin. Next time grind finer or use more coffee.`, score: 0.35, mood: 'sour' };
  if (t > 36 && ml < 75) return { text: `${Math.round(ml)} ml in ${t.toFixed(0)} s: it choked. Water could barely get through, so expect bitter and harsh. Grind a little coarser.`, score: 0.4, mood: 'bitter' };
  if (ml < 40) return { text: `Only ${Math.round(ml)} ml. That’s a ristretto: short, syrupy and intense. Fine if you meant it!`, score: 0.65, mood: 'short' };
  if (ml > 80) return { text: `${Math.round(ml)} ml is a long shot (a lungo). Thinner and more bitter than a normal double.`, score: 0.6, mood: 'long' };
  const inT = t >= 24 && t <= 32;
  return inT
    ? { text: `${Math.round(ml)} ml in ${t.toFixed(0)} s. That’s the sweet spot: sweet, balanced, with thick crema. 👏`, score: 1, mood: 'sweet' }
    : { text: `${Math.round(ml)} ml in ${t.toFixed(0)} s. Close! The sweet spot is 25–30 seconds.`, score: 0.75, mood: t < 24 ? 'sour' : 'bitter' };
}

// ---------- step screens ----------
// enter() builds the panel; live() refreshes only readouts and the stage (never the held button).
const SCREENS = {
  drink: {
    enter() {
      return {
        guide: 'Every drink below starts the same way: a double shot of espresso. What comes after is up to you.',
        controls: `<div class="b-menu">${DRINKS.map(d => `<button type="button" class="b-drink" data-drink="${d.id}">
          ${cupSVG(d.cup, d.recipe, { className: 'b-drink-art' })}<b>${d.name}</b><small>${d.blurb}</small></button>`).join('')}</div>`,
        stage: '',
        noNext: true,
      };
    },
  },

  flavor: {
    enter() {
      const mocha = S.drink.id === 'mocha';
      return {
        guide: `${mocha ? 'A mocha starts with chocolate sauce in the bottom of the cup. Want to add another flavor too?' : 'Want flavor? Syrup goes into the cup <em>before</em> the espresso, so the hot shot melts it in.'} One pump is about 7.5 ml. Most cafés use 2–4 pumps.`,
        controls: `<ul class="b-syrups">${SYRUPS.filter(s => mocha || s.id !== 'chocolate').map(s => `<li style="--s:${s.color}">
          <i class="b-swatch"></i><span>${s.name}</span>
          <button type="button" class="btn btn-sm" data-pump="${s.id}" data-d="-1" aria-label="One less ${s.name}">−</button>
          <b id="pump-${s.id}">${S.pumps[s.id] || 0}</b>
          <button type="button" class="btn btn-sm" data-pump="${s.id}" data-d="1" aria-label="One more ${s.name}">+</button></li>`).join('')}</ul>`,
        stage: cupScene(),
        nextLabel: () => (Object.values(S.pumps).some(n => n) ? 'Next: grind →' : 'No flavor, thanks →'),
      };
    },
    live() {
      SYRUPS.forEach(s => { const el = $(`pump-${s.id}`); if (el) el.textContent = S.pumps[s.id] || 0; });
      const n = Object.values(S.pumps).reduce((a, b) => a + b, 0);
      feedback(n ? `${n} pump${n > 1 ? 's' : ''} · ${Math.round(n * PUMP)} ml of ${Object.entries(S.pumps).filter(([, v]) => v).map(([k]) => SYRUPS.find(s => s.id === k).name.toLowerCase()).join(' + ')}.${n > 5 ? ' That’s a sweet one!' : ''}` : 'Unsweetened. A purist.');
      stage(cupScene());
    },
  },

  grind: {
    enter() {
      return {
        guide: 'Espresso has only about 25 seconds to pull flavor out, so the grind needs to be <b>fine</b>. Pick a setting, then hold <b>Grind</b> until the scale reads about <b>18 g</b>.',
        controls: `<div class="b-grinds" role="radiogroup" aria-label="Grind setting">${GRINDS.map((g, i) => `<button type="button" role="radio" data-g="${i}" aria-checked="${i === S.grind}">${g.name}</button>`).join('')}</div>
          <div class="b-row"><button type="button" class="btn btn-primary b-hold" id="bHold">⚙️ Hold to grind</button><button type="button" class="btn btn-sm" id="bReset">Dump it</button></div>`,
        stage: grindStage(),
        ready: () => S.dose >= 8,
        nextLabel: () => 'Next: tamp →',
      };
    },
    hold: { sound: 'grind', tick(dt) { S.dose = Math.min(26, S.dose + dt * 3.2); } },
    reset() { S.dose = 0; },
    live() {
      stage(grindStage());
      const g = GRINDS[S.grind];
      let msg = `${S.dose.toFixed(1)} g of ${g.name.toLowerCase()} grounds.`;
      if (S.dose >= 17.5 && S.dose <= 18.5) msg += ' Perfect dose!';
      else if (S.dose > 18.5) msg += ' A bit much. It’ll run slow.';
      else if (S.dose > 8) msg += ' Keep going: aim for 18 g.';
      if (S.grind !== 5 && S.dose > 2) msg += ` (Hmm, ${g.name.toLowerCase()} is meant for ${g.brew[0]}. Let’s see what happens…)`;
      feedback(msg);
    },
  },

  tamp: {
    enter() {
      return {
        guide: 'Tamping packs the grounds into an even puck so water can’t sneak through the gaps. Hold <b>Press</b> and let go when the gauge is in the green, around <b>30 lb</b> (about the weight of a big bag of flour).',
        controls: `<div class="b-row"><button type="button" class="btn btn-primary b-hold" id="bHold">✊ Hold to press</button><button type="button" class="btn btn-sm" id="bReset">Redo</button></div>`,
        stage: tampStage(),
        ready: () => S.tamp > 5,
        nextLabel: () => 'Next: pull the shot →',
      };
    },
    hold: { start() { S.tamp = 0; }, tick(dt) { S.tamp = Math.min(50, S.tamp + dt * 16); } },
    reset() { S.tamp = 0; },
    live() {
      stage(tampStage());
      const t = S.tamp;
      feedback(t === 0 ? '' : t < 15 ? `${Math.round(t)} lb. Too soft: water will find channels and rush through.` : t < 25 ? `${Math.round(t)} lb. A little light.` : t <= 35 ? `${Math.round(t)} lb. Nice and firm. 👌` : t <= 42 ? `${Math.round(t)} lb. Firm. That’s fine, it won’t change much.` : `${Math.round(t)} lb! Easy, your wrist will thank you.`);
    },
  },

  pull: {
    enter() {
      return {
        guide: 'Lock in the portafilter and hold <b>Pull</b>. Watch the timer and the line: a good double is about <b>60 ml in 25–30 seconds</b>. Let go to stop.',
        controls: `<div class="b-row"><button type="button" class="btn btn-primary b-hold" id="bHold">☕ Hold to pull</button><button type="button" class="btn btn-sm" id="bRedo">Dump & start over</button></div>
          <div class="b-timer"><span id="bTime">0.0</span> s <span class="b-extract"><i id="bExtract"></i></span></div>
          <div class="b-extract-lbl"><span>sour</span><span>sweet spot</span><span>bitter</span></div>`,
        stage: cupScene({ top: 'machine', guide: S.amounts.syrup + S.amounts.chocolate + 60 }),
        ready: () => S.amounts.espresso > 10,
        nextLabel: () => (S.drink.steps[0] === 'water' ? 'Next: add water →' : S.drink.steps[0] === 'milk' ? 'Next: milk →' : 'See my espresso →'),
      };
    },
    hold: {
      sound: 'pull',
      tick(dt) {
        S.shotTime += dt;
        const g = GRINDS[S.grind];
        const doseF = Math.pow(18 / Math.max(8, S.dose), 1.6);
        const tampF = S.tamp < 15 ? 1.4 : S.tamp < 25 ? 1.12 : S.tamp > 42 ? 0.92 : 1;
        // the first few seconds are pre-infusion: just drips
        const rate = S.shotTime < 6 ? 0.4 : 2.62 * g.flow * doseF * tampF;
        pourInto('espresso', rate * dt);
      },
    },
    live(streaming) {
      stage(cupScene({ top: 'machine', guide: S.amounts.syrup + S.amounts.chocolate + 60, stream: streaming ? { w: 3, color: '#3a1d0e' } : null }));
      $('bTime').textContent = S.shotTime.toFixed(1);
      $('bExtract').style.left = `${clamp((S.shotTime - 10) / 30, 0, 1) * 100}%`;
      if (!streaming) feedback(S.amounts.espresso ? shotVerdict().text : '');
      else feedback(S.shotTime < 6 ? 'Pre-infusion… the puck is soaking.' : 'Here it comes. Watch the color go from dark to golden.');
    },
  },

  water: {
    enter() {
      const target = total(S.drink.recipe) + S.amounts.syrup;
      return {
        guide: 'Hold <b>Pour</b> to top the shot with hot water (about 90 °C). Stop at the line. Fun fact: pour the espresso <em>over</em> water instead and it’s called a long black, which keeps the crema on top.',
        controls: `<div class="b-row"><button type="button" class="btn btn-primary b-hold" id="bHold">💧 Hold to pour water</button></div>`,
        stage: cupScene({ top: 'kettle', guide: target }),
        ready: () => S.amounts.water > 10,
        nextLabel: () => 'See my americano →',
      };
    },
    hold: { sound: 'pour', tick(dt) { pourInto('water', 38 * dt); } },
    live(streaming) {
      const target = total(S.drink.recipe) + S.amounts.syrup;
      stage(cupScene({ top: 'kettle', guide: target, stream: streaming ? { w: 6, color: '#bfe0ef' } : null }));
      feedback(`${Math.round(S.amounts.water)} ml of water.${S.spilled ? ' Whoops, it overflowed!' : ''}`);
    },
  },

  milk: {
    enter() {
      const lock = S.drink.lockMilk;
      return {
        guide: lock ? 'A breve is made with half-and-half by definition. That’s the rule!' : 'Every milk steams differently. Pick one.',
        controls: `<div class="b-milks">${MILKS.filter(m => !lock || m.id === lock).map(m => `<button type="button" class="b-milk" data-milk="${m.id}" aria-pressed="${S.milk === m.id}" style="--m:${m.color}">
          <i class="b-carton"></i><b>${m.name}</b><small>${m.note}</small><span class="b-temp">Steam to ${m.lo}–${m.hi} °C · ${cToF(m.lo)}–${cToF(m.hi)} °F</span></button>`).join('')}</div>`,
        stage: cupScene(),
        ready: () => !!S.milk,
        nextLabel: () => 'Next: steam it →',
      };
    },
  },

  steam: {
    enter() {
      const d = S.drink, m = milkObj();
      // a jug of cold milk: enough for the drink, foam is about half air
      if (!S.steamed) S.pitcher = { liquid: (d.recipe.milk || 0) + (d.recipe.foam || 0) * 0.5, foam: 0, temp: 4, big: 0 };
      const foamy = d.foamOnly ? 'lots of foam' : d.id === 'cappuccino' ? 'a thick, airy foam' : d.id === 'flatwhite' ? 'just a whisper of silky foam' : d.id === 'mocha' ? 'a little foam (the cream goes on top anyway)' : 'a thin layer of foam';
      return {
        guide: `For a ${d.name.toLowerCase()} you want ${foamy}.<ol class="b-how">
          <li><b>Stretch:</b> with the tip <em>just under the surface</em>, you’ll hear a “tss-tss” like tearing paper. That’s air going in. Do this while the milk is still cool.</li>
          <li><b>Spin:</b> dip the tip <em>deeper</em> so the milk whirlpools. That folds big bubbles into silky microfoam and heats it up.</li>
          <li>Stop at <b>${m.lo}–${m.hi} °C (${cToF(m.lo)}–${cToF(m.hi)} °F)</b>. Hotter than that and it scorches.</li></ol>`,
        controls: `<div class="seg" role="radiogroup" aria-label="Steam wand position">
            <button type="button" role="radio" data-tip="surface" aria-checked="${S.tip === 'surface'}">Tip at surface<small>adds air</small></button>
            <button type="button" role="radio" data-tip="deep" aria-checked="${S.tip === 'deep'}">Tip deeper<small>spins & heats</small></button></div>
          <div class="b-row"><button type="button" class="btn btn-primary b-hold" id="bHold">♨️ Hold to steam</button><button type="button" class="btn btn-sm" id="bReset">Fresh milk</button></div>`,
        stage: steamStage(),
        ready: () => S.pitcher.temp >= 35,
        nextLabel: () => 'Next: pour →',
      };
    },
    hold: {
      get sound() { return S.tip === 'surface' ? 'steam' : 'deep'; },
      tick(dt) {
        const p = S.pitcher, m = milkObj();
        p.temp = Math.min(95, p.temp + dt * 4.4);
        S.steamed = true;
        if (S.tip === 'surface') {
          const take = Math.min(p.liquid, dt * 3.4 * m.foam);
          p.liquid -= take; p.foam += take * 2;
          // stretching hot milk makes big, soapy bubbles
          if (p.temp > 42) p.big += dt * 4;
        } else {
          p.big = Math.max(0, p.big - dt * 3);
        }
      },
    },
    reset() { S.steamed = false; S.pitcher = { liquid: (S.drink.recipe.milk || 0) + (S.drink.recipe.foam || 0) * 0.5, foam: 0, temp: 4, big: 0 }; },
    live(on) {
      stage(steamStage(on));
      const p = S.pitcher, m = milkObj(), t = p.temp;
      const target = S.drink.recipe.foam || 0;
      let msg = `${Math.round(t)} °C / ${cToF(t)} °F · ${Math.round(p.foam)} ml foam (aim for ~${target}).`;
      if (on && S.tip === 'surface') msg += t > 42 ? ' Getting hot. Time to sink the tip and spin!' : ' Tss-tss… stretching.';
      if (on && S.tip === 'deep') msg += ' Whirlpool going. Smooth.';
      if (!on && t > m.hi + 6) msg += ` Too hot! ${m.name} scorches up here and loses its sweetness.`;
      else if (!on && t >= m.lo && t <= m.hi + 2) msg += ' Right in the zone. 🔥';
      else if (!on && t >= 35 && t < m.lo) msg += ' A bit cool, but drinkable. Kids’ temp!';
      if (!on && p.big > 6) msg += ' Some big bubbles in there. Tap the pitcher on the counter and swirl.';
      feedback(msg);
    },
  },

  pour: {
    enter() {
      const d = S.drink;
      S.pourTarget = Math.min(capacity(), Math.round(S.amounts.syrup + S.amounts.chocolate + S.amounts.espresso + (d.recipe.milk || 0) + (d.recipe.foam || 0)));
      return {
        guide: d.foamOnly
          ? 'Hold the liquid milk back with a spoon and just spoon a dollop of foam onto the shot. Hold <b>Spoon foam</b>.'
          : `Swirl the pitcher so the foam and milk stay mixed, then hold <b>Pour</b>. Start high and steady so the milk dives under the crema, then come in low at the end so the foam floats up and draws your design.${d.id === 'mocha' ? ' Leave room at the top for the whipped cream.' : ''}`,
        controls: `${d.art ? `<div class="b-arts" role="radiogroup" aria-label="Latte art">${ARTS.map(a => `<button type="button" role="radio" data-art="${a.id}" aria-checked="${S.art === a.id}">${a.name}</button>`).join('')}</div>
            <ol class="b-how" id="bArtHow"></ol>` : ''}
          <div class="b-row"><button type="button" class="btn btn-primary b-hold" id="bHold">${d.foamOnly ? '🥄 Spoon foam' : '🥛 Hold to pour'}</button></div>`,
        stage: pourStage(),
        ready: () => S.amounts.milk + S.amounts.foam > 4,
        nextLabel: () => 'See my drink →',
      };
    },
    hold: {
      sound: 'pour',
      tick(dt) {
        const p = S.pitcher;
        if (S.drink.foamOnly) {
          const f = Math.min(p.foam, dt * 14);
          p.foam -= f; pourInto('foam', f);
          return;
        }
        const rate = 34 * dt;
        // liquid leaves first; foam rides out at the end (that’s when art happens)
        const liq = Math.min(p.liquid, rate);
        p.liquid -= liq;
        const foam = Math.min(p.foam, rate - liq + (p.liquid < 30 ? rate * 0.4 : 0));
        p.foam -= foam;
        pourInto('milk', liq);
        pourInto('foam', foam);
        if (S.drink.art && S.art !== 'none') S.artP = clamp(S.artP + (foam / Math.max(8, (S.drink.recipe.foam || 10) * 0.85)), 0, 1);
      },
    },
    live(on) {
      stage(pourStage(on));
      const p = S.pitcher;
      const art = ARTS.find(a => a.id === S.art);
      if ($('bArtHow')) {
        const k = S.artP <= 0 ? 0 : Math.min(art.how.length - 1, Math.floor(S.artP * art.how.length));
        $('bArtHow').innerHTML = art.how.map((h, i) => `<li class="${i < k ? 'done' : i === k ? 'now' : ''}">${h}</li>`).join('');
      }
      let msg = `${Math.round(S.amounts.milk + S.amounts.foam)} ml poured · ${Math.round(p.liquid + p.foam)} ml left in the pitcher.`;
      if (S.spilled) msg += ' It overflowed. Easy does it!';
      else if (!on && S.artP >= 1) msg += ` Look at that ${art.name.toLowerCase()}! 😍`;
      feedback(msg);
    },
  },

  done: {
    enter() {
      // a mocha is served under whipped cream
      if (S.drink.id === 'mocha' && !S.amounts.cream) pourInto('cream', S.drink.recipe.cream);
      S.result = score();
      const r = S.result;
      return {
        guide: '',
        controls: `<div class="b-result">
          <p class="mini-title">You made</p><h3>${r.title}</h3>
          <p class="b-stars" aria-label="${r.stars} out of 5 stars">${'★'.repeat(r.stars)}<span>${'★'.repeat(5 - r.stars)}</span></p>
          <p>${r.verdict}</p>
          <ul class="b-score">${r.rows.map(x => `<li><span>${x.label}</span><b>${x.value}</b><i class="${x.score >= .95 ? 'good' : x.score >= .7 ? 'ok' : 'meh'}"></i></li>`).join('')}</ul>
          ${r.tip ? `<p class="layer-fact">💡 ${r.tip}</p>` : ''}
          <div class="b-row"><button type="button" class="btn btn-primary" id="bAgain">Make another</button><button type="button" class="btn btn-sm" id="bSame">Same drink again</button></div></div>`,
        stage: `<div class="b-final">${cupScene()}${S.drink.art || S.amounts.cream ? topView() : ''}</div>`,
        noNext: true,
      };
    },
  },
};

function grindStage() {
  const r = Math.min(64, 8 + S.dose * 2.6);
  const on = $('bHold')?.classList.contains('is-held');
  return `<svg class="b-scene" viewBox="0 0 300 320" aria-hidden="true">
    <path d="M110,6 h80 l-12,64 h-56z" class="b-metal" opacity=".7"/>
    <rect x="96" y="70" width="108" height="86" rx="12" class="b-dark"/><rect x="138" y="156" width="24" height="14" class="b-dark"/>
    ${on ? `<g class="b-fall">${Array.from({ length: 10 }, (_, i) => `<circle cx="${144 + (i * 7) % 14}" cy="${176 + (i * 11) % 40}" r="2" fill="#4a2a14"/>`).join('')}</g>` : ''}
    <ellipse cx="150" cy="250" rx="86" ry="30" class="b-metal"/><ellipse cx="150" cy="246" rx="70" ry="22" fill="#2a1a12" opacity=".15"/>
    <ellipse cx="150" cy="246" rx="${r}" ry="${r * 0.32}" fill="#4a2a14"/>
    <rect x="232" y="240" width="60" height="16" rx="6" class="b-dark"/>
    <rect x="100" y="290" width="100" height="26" rx="6" fill="#222"/><text x="150" y="309" class="b-lcd">${S.dose.toFixed(1)} g</text>
  </svg>`;
}

function tampStage() {
  const t = S.tamp;
  const bed = 46 - Math.min(t, 35) * 0.5;
  const y = 190 - bed - 8 - (t > 0 ? 0 : 40);
  return `<div class="b-two"><svg class="b-scene" viewBox="0 0 300 320" aria-hidden="true">
    <rect x="128" y="${y - 90}" width="44" height="80" rx="18" fill="#6b4a2c"/>
    <rect x="96" y="${y - 12}" width="108" height="12" rx="3" class="b-metal"/>
    <path d="M90,140 h120 v60 a10,10 0 0 1 -10,10 h-100 a10,10 0 0 1 -10,-10z" class="b-metal"/>
    <rect x="98" y="${200 - bed}" width="104" height="${bed}" fill="#4a2a14"/>
    <path d="M210,170 h80" stroke="#2a1a12" stroke-width="14" stroke-linecap="round"/>
  </svg>${gauge(t, 50, 25, 35, { label: 'pounds', danger: 44 })}</div>`;
}

function steamStage(on = false) {
  const p = S.pitcher, m = milkObj();
  const px = 150, bottom = 270, w = 120;
  const toPx = 0.62;
  const liqH = p.liquid * toPx, foamH = p.foam * toPx * 0.9;
  const surf = bottom - liqH - foamH;
  const tipY = S.tip === 'surface' ? surf + 6 : bottom - liqH * 0.45;
  return `<div class="b-two"><svg class="b-scene" viewBox="0 0 300 320" aria-hidden="true">
    <defs><clipPath id="jugClip"><path d="M${px - w / 2},120 h${w} l-8,${bottom - 120} h-${w - 16}z"/></clipPath></defs>
    <g clip-path="url(#jugClip)">
      <rect x="0" y="${bottom - liqH}" width="300" height="${liqH}" fill="${m.color}"/>
      <rect x="0" y="${surf}" width="300" height="${foamH + 1}" fill="#fdf9f1"/><rect x="0" y="${surf}" width="300" height="${foamH + 1}" fill="url(#bubbles)"/>
      ${on ? `<g class="b-swirl">${Array.from({ length: 8 }, (_, i) => `<circle cx="${px - 40 + i * 11}" cy="${surf + 6 + (i % 3) * 10}" r="${p.big > 6 ? 4 : 2}" fill="#fff" opacity=".7"/>`).join('')}</g>` : ''}
    </g>
    <path d="M${px - w / 2},120 h${w} l-8,${bottom - 120} h-${w - 16}z" fill="none" stroke="#9aa0a6" stroke-width="4"/>
    <path d="M${px - w / 2},120 l-16,-8" stroke="#9aa0a6" stroke-width="4" stroke-linecap="round"/>
    <path d="M${px + w / 2 - 2},140 c34,0 34,70 -6,70" fill="none" stroke="#9aa0a6" stroke-width="7"/>
    <path d="M250,0 L${px + 12},${tipY}" stroke="#7c8288" stroke-width="7" stroke-linecap="round"/>
    ${on ? `<g class="b-steam-puff"><circle cx="${px + 20}" cy="${surf - 14}" r="10"/><circle cx="${px + 6}" cy="${surf - 28}" r="8"/></g>` : ''}
  </svg>${gauge(p.temp, 90, m.lo, m.hi, { label: `°C · ${cToF(p.temp)} °F`, danger: m.hi + 8, unit: '°' })}</div>`;
}

function pourStage(on = false) {
  const m = milkObj();
  return `<div class="b-two">${cupScene({ top: 'pitcher', guide: S.pourTarget, stream: on ? { w: S.artP > 0 ? 4 : 6, color: S.pitcher.liquid > 0 ? m.color : '#fdf9f1' } : null })}
    ${S.drink.art || S.drink.foamOnly ? topView() : ''}</div>`;
}

// Move liquid into the cup, spilling anything over the rim.
function pourInto(key, ml) {
  if (ml <= 0) return;
  const room = capacity() - total(S.amounts);
  const inCup = Math.max(0, Math.min(ml, room));
  S.amounts[key] += inCup;
  if (ml > inCup + 0.01) S.spilled += ml - inCup;
}

// ---------- results ----------
function score() {
  const d = S.drink, m = milkObj(), rows = [];
  const flavors = Object.entries(S.pumps).filter(([k, n]) => n && k !== 'chocolate').map(([k]) => SYRUPS.find(s => s.id === k).name.toLowerCase());
  const art = ARTS.find(a => a.id === S.art);
  const title = [m && d.id !== 'breve' ? `${m.name.toLowerCase()}-milk` : '', flavors.join(' & '), d.name.toLowerCase()].filter(Boolean).join(' ')
    .replace(/^./, c => c.toUpperCase());

  const doseS = band3(Math.abs(S.dose - 18) <= 0.6, Math.abs(S.dose - 18) <= 2);
  rows.push({ label: 'Dose', value: `${S.dose.toFixed(1)} g`, score: doseS });
  rows.push({ label: 'Grind', value: GRINDS[S.grind].name, score: S.grind === 5 ? 1 : Math.abs(S.grind - 5) === 1 ? 0.7 : 0.4 });
  const tampS = band3(S.tamp >= 25 && S.tamp <= 36, S.tamp >= 15 && S.tamp <= 44);
  rows.push({ label: 'Tamp', value: `${Math.round(S.tamp)} lb`, score: tampS });
  const shot = shotVerdict();
  rows.push({ label: 'Shot', value: `${Math.round(S.amounts.espresso)} ml in ${S.shotTime.toFixed(0)} s`, score: shot.score });
  if (d.steps.includes('water')) {
    const want = d.recipe.water, got = S.amounts.water;
    rows.push({ label: 'Water', value: `${Math.round(got)} ml`, score: band3(Math.abs(got - want) <= 12, Math.abs(got - want) <= 30) });
  }
  if (m) {
    const t = S.pitcher.temp;
    const tS = t >= m.lo && t <= m.hi + 2 ? 1 : t > m.hi + 8 ? 0.35 : t >= m.lo - 8 && t <= m.hi + 8 ? 0.7 : 0.45;
    rows.push({ label: 'Milk temp', value: `${Math.round(t)} °C / ${cToF(t)} °F`, score: tS });
    if (d.recipe.foam) rows.push({ label: 'Foam', value: `${Math.round(S.amounts.foam)} ml`, score: foamQuality() >= .85 ? 1 : foamQuality() >= .6 ? 0.7 : 0.45 });
    if (!d.foamOnly) {
      const want = S.pourTarget, got = total(S.amounts) - S.amounts.cream;
      rows.push({ label: 'Pour', value: S.spilled > 3 ? `spilled ${Math.round(S.spilled)} ml` : `${Math.round(got)} of ${want} ml`, score: S.spilled > 3 ? 0.4 : band3(Math.abs(got - want) <= want * .07, Math.abs(got - want) <= want * .16) });
    }
    if (d.art && S.art !== 'none') rows.push({ label: 'Latte art', value: S.artP >= 1 ? `${art.name} ✓` : `${Math.round(S.artP * 100)}% of a ${art.name.toLowerCase()}`, score: S.artP >= 1 ? Math.max(0.7, foamQuality()) : 0.5 });
  }
  const avg = rows.reduce((s, r) => s + r.score, 0) / rows.length;
  const stars = clamp(Math.round(avg * 5), 1, 5);
  const verdict = stars === 5 ? 'Café quality. You could work a bar.' : stars === 4 ? 'Really good. A regular would come back for this.' : stars === 3 ? 'Drinkable and honestly not bad. Practice makes perfect.' : 'It’s… coffee. Every barista’s first one looked like this.';
  const worst = rows.slice().sort((a, b) => a.score - b.score)[0];
  const tips = {
    Dose: 'Weigh your coffee. 18 g in a double basket is the usual starting point.',
    Grind: 'Espresso needs a fine grind. Coarser grinds let water rush right through.',
    Tamp: 'Press firm and level, around 30 lb, so water flows through evenly.',
    Shot: shot.mood === 'sour' ? 'Sour and fast? Grind finer.' : shot.mood === 'bitter' ? 'Bitter and slow? Grind coarser.' : 'Aim for about 60 ml in 25–30 seconds.',
    Water: 'An americano is roughly 1 part espresso to 2 parts water. Adjust to taste.',
    'Milk temp': `Stop steaming ${m?.name.toLowerCase() || ''} milk at ${m?.lo}–${m?.hi} °C. Past that the sugars cook and it tastes flat.`,
    Foam: 'More foam: keep the tip at the surface longer. Less foam: sink it sooner.',
    Pour: 'Watch the dashed line and let go a moment early. The stream still in the air will land.',
    'Latte art': 'Art comes at the very end: get the pitcher close to the surface so the foam floats.',
  };
  return { title, stars, verdict, rows, tip: worst.score < 0.95 ? tips[worst.label] : null };
}

// ---------- engine ----------
let holdState = null;
const loop = ticker(dt => {
  const sc = SCREENS[step()];
  sc.hold?.tick(dt);
  sc.live?.(true);
});

function stage(html) { $('bStage').innerHTML = html; }
function feedback(t) { $('bFeedback').textContent = t; }

function renderSteps() {
  $('bSteps').innerHTML = S.steps.map((id, i) =>
    `<li class="${i < S.at ? 'done' : i === S.at ? 'now' : ''}" aria-current="${i === S.at ? 'step' : 'false'}"><span>${i + 1}</span>${STEP_TITLES[id]}</li>`).join('');
}

function enter() {
  const id = step();
  const sc = SCREENS[id];
  const view = sc.enter();
  renderSteps();
  $('bTitle').textContent = STEP_TITLES[id];
  $('bGuide').innerHTML = view.guide;
  $('bGuide').hidden = !view.guide;
  $('bControls').innerHTML = view.controls;
  stage(view.stage);
  feedback('');
  $('bDrinkName').textContent = S.drink ? `Making: ${S.drink.name}` : '';
  $('bChange').hidden = !S.drink || id === 'done';
  const next = $('bNext');
  next.hidden = !!view.noNext;
  S.ready = view.ready || (() => true);
  S.nextLabel = view.nextLabel || (() => 'Next →');
  const hold = $('bHold');
  if (hold && sc.hold) holdable(hold, () => startHold(sc), stopHold);
  sc.live?.(false);
  updateNext();
}

function updateNext() {
  const next = $('bNext');
  if (next.hidden) return;
  next.disabled = !S.ready();
  next.textContent = S.nextLabel();
}

function startHold(sc) {
  if (holdState) return;
  sc.hold.start?.();
  holdState = { snd: noise(sc.hold.sound) };
  loop.start();
}

function stopHold() {
  if (!holdState) return;
  holdState.snd?.stop();
  holdState = null;
  loop.stop();
  SCREENS[step()].live?.(false);
  updateNext();
}

function go(delta) {
  stopHold();
  S.at = clamp(S.at + delta, 0, S.steps.length - 1);
  enter();
  document.getElementById('barista').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

export function initBarista() {
  fresh();
  $('bNext').addEventListener('click', () => go(1));
  $('bChange').addEventListener('click', () => { fresh(); enter(); });
  $('bSound').addEventListener('click', () => {
    soundOn = !soundOn;
    $('bSound').setAttribute('aria-pressed', soundOn);
    $('bSound').textContent = soundOn ? '🔊' : '🔇';
  });

  $('bControls').addEventListener('click', e => {
    const t = e.target;
    const drink = t.closest('[data-drink]');
    if (drink) { fresh(drink.dataset.drink); enter(); return; }
    const pump = t.closest('[data-pump]');
    if (pump) {
      const k = pump.dataset.pump;
      const n = clamp((S.pumps[k] || 0) + +pump.dataset.d, 0, 6);
      const others = Object.entries(S.pumps).filter(([x]) => x !== k).reduce((s, [, v]) => s + v, 0);
      if (others + n > 8) { feedback('That’s already a lot of syrup. Easy, sugar!'); return; }
      S.pumps[k] = n; applyPumps(); SCREENS.flavor.live(); updateNext(); return;
    }
    const g = t.closest('[data-g]');
    if (g) {
      S.grind = +g.dataset.g;
      $('bControls').querySelectorAll('[data-g]').forEach(b => b.setAttribute('aria-checked', +b.dataset.g === S.grind));
      SCREENS.grind.live(); return;
    }
    const milk = t.closest('[data-milk]');
    if (milk) {
      S.milk = milk.dataset.milk; S.steamed = false;
      $('bControls').querySelectorAll('[data-milk]').forEach(b => b.setAttribute('aria-pressed', b.dataset.milk === S.milk));
      feedback(`${milkObj().name} it is.`); updateNext(); return;
    }
    const tip = t.closest('[data-tip]');
    if (tip) {
      S.tip = tip.dataset.tip;
      $('bControls').querySelectorAll('[data-tip]').forEach(b => b.setAttribute('aria-checked', b.dataset.tip === S.tip));
      SCREENS.steam.live(false); return;
    }
    const art = t.closest('[data-art]');
    if (art) {
      S.art = art.dataset.art;
      $('bControls').querySelectorAll('[data-art]').forEach(b => b.setAttribute('aria-checked', b.dataset.art === S.art));
      SCREENS.pour.live(false); return;
    }
    if (t.id === 'bReset') { SCREENS[step()].reset?.(); SCREENS[step()].live?.(false); updateNext(); return; }
    if (t.id === 'bRedo') {
      // dump the shot and go back to grinding
      S.amounts.espresso = 0; S.shotTime = 0; S.dose = 0; S.tamp = 0; S.spilled = 0;
      S.at = S.steps.indexOf('grind'); enter(); return;
    }
    if (t.id === 'bAgain') { fresh(); enter(); return; }
    if (t.id === 'bSame') { const id = S.drink.id, milk = S.milk, pumps = { ...S.pumps }, art = S.art; fresh(id); S.milk = milk; S.pumps = pumps; S.art = art; applyPumps(); enter(); }
  });

  enter();
}

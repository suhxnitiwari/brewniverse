// Seed to Cup: step through the whole journey, one drawing per step.
import { JOURNEY, PHASES, PROCESSES, MASS_TRAIL } from './world-data.js';
import { $ } from './util.js';

let at = 0;
let process = 'washed';
let playing = 0;

// ---------- drawings (viewBox 0 0 320 240) ----------
const ground = `<path d="M0,214 Q160,198 320,214 V240 H0Z" fill="#8a6440" opacity=".35"/>`;
const cherry = (x, y, c, r = 11) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/><circle cx="${x - r * .35}" cy="${y - r * .35}" r="${r * .28}" fill="#fff" opacity=".35"/>`;
const leaf = (x, y, rot, s = 1) =>
  `<path transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" d="M0,0 C14,-12 40,-10 52,0 C40,10 14,12 0,0Z" fill="#4f7d3e"/><path transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" d="M2,0 H48" stroke="#3a5f2d" stroke-width="1.5"/>`;
const bean = (x, y, c, rot = 0, s = 1, crease = 'rgb(0 0 0 / .35)') =>
  `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><ellipse rx="10" ry="14" fill="${c}"/><path d="M0,-12 C-5,-4 5,4 0,12" fill="none" stroke="${crease}" stroke-width="2.2" stroke-linecap="round"/></g>`;
const greenBean = '#a3ae78', roasted = '#5a321b';

function branch(colors) {
  let s = `<path d="M30,60 C120,70 200,96 300,150" stroke="#6b4a2c" stroke-width="7" fill="none" stroke-linecap="round"/>`;
  s += leaf(80, 66, -30) + leaf(150, 80, 40, .9) + leaf(220, 104, -35, 1.05) + leaf(270, 132, 45, .85);
  const spots = [[110, 78], [124, 86], [116, 92], [186, 96], [198, 104], [190, 110], [250, 126], [240, 120]];
  spots.forEach(([x, y], i) => (s += cherry(x, y, colors[i % colors.length])));
  return s;
}

const ART = {
  seedling: () => `${ground}
    <path d="M118,214 h84 l-8,-46 h-68z" fill="#3b2a1f"/><path d="M118,214 h84" stroke="#2a1c13" stroke-width="3"/>
    <path d="M160,168 C160,140 162,118 160,96" stroke="#5d8a4a" stroke-width="5" fill="none" stroke-linecap="round"/>
    ${leaf(160, 110, -150, .9)}${leaf(160, 104, -30, .9)}${leaf(160, 136, -160, .7)}${leaf(160, 132, -20, .7)}
    <ellipse cx="160" cy="92" rx="9" ry="12" fill="#e8d9b0" stroke="#bfa977" stroke-width="1.5"/>
    <text x="160" y="232" class="art-label">a seed still wearing its parchment</text>`,
  flower: () => {
    let s = `<path d="M30,70 C120,80 200,100 300,150" stroke="#6b4a2c" stroke-width="7" fill="none" stroke-linecap="round"/>`;
    s += leaf(90, 76, -35) + leaf(170, 92, 40, .9) + leaf(250, 122, -35);
    [[120, 84], [140, 90], [205, 108], [225, 116], [280, 140]].forEach(([x, y]) => {
      for (let p = 0; p < 5; p++) s += `<ellipse cx="${x}" cy="${y - 9}" rx="4.5" ry="9" fill="#fffdf6" stroke="#e5ddc9" transform="rotate(${p * 72} ${x} ${y})"/>`;
      s += `<circle cx="${x}" cy="${y}" r="3" fill="#f1d27a"/>`;
    });
    return s + `<text x="160" y="220" class="art-label">smells like jasmine</text>`;
  },
  ripen: () => branch(['#7da34b', '#c9c35a', '#e39a3b', '#c0272d', '#8fae4f', '#b8202e']) +
    `<text x="160" y="220" class="art-label">green → yellow → red</text>`,
  harvest: () => `
    <path d="M90,150 h140 l-14,64 h-112z" fill="#c4935a" stroke="#8b6339" stroke-width="3"/>
    <path d="M96,168 h128 M100,186 h120 M104,204 h112" stroke="#8b6339" stroke-width="2"/>
    ${Array.from({ length: 16 }, (_, i) => cherry(104 + (i % 8) * 16 + (i > 7 ? 8 : 0), 146 - (i > 7 ? 12 : 0), i % 5 ? '#b8202e' : '#9b1c27', 10)).join('')}
    <text x="160" y="232" class="art-label">selective picking: ripe ones only</text>`,
  float: () => `
    <rect x="50" y="80" width="220" height="130" rx="10" fill="#bfe0ef" opacity=".7" stroke="#7fb2c9" stroke-width="3"/>
    <path d="M50,98 q27,-8 55,0 t55,0 t55,0 t55,0" fill="none" stroke="#7fb2c9" stroke-width="2"/>
    ${cherry(90, 94, '#8aa64c', 10)}${cherry(130, 92, '#c7bd55', 10)}${cherry(210, 95, '#7a5a3a', 10)}
    ${cherry(80, 194, '#b8202e', 10)}${cherry(102, 196, '#b8202e', 10)}${cherry(124, 194, '#a91d2a', 10)}${cherry(170, 196, '#b8202e', 10)}${cherry(196, 194, '#b8202e', 10)}${cherry(226, 196, '#a91d2a', 10)}
    <text x="290" y="96" class="art-tag" text-anchor="end">floaters</text><text x="290" y="190" class="art-tag" text-anchor="end">sinkers</text>
    <text x="160" y="232" class="art-label">ripe = dense = sinks</text>`,
  process: () => {
    if (process === 'natural') return `${ground}
      <rect x="40" y="150" width="240" height="40" rx="6" fill="#d9c7a5"/>
      ${Array.from({ length: 22 }, (_, i) => cherry(56 + (i % 11) * 21, 160 + Math.floor(i / 11) * 18, i % 3 ? '#6b1f1c' : '#7f2a20', 9)).join('')}
      ${sun()}<text x="160" y="232" class="art-label">whole cherries drying in the sun</text>`;
    if (process === 'honey') return `
      ${[0, 1, 2, 3, 4, 5].map(i => `<g transform="translate(${70 + (i % 3) * 90} ${100 + Math.floor(i / 3) * 70})">
        <ellipse rx="26" ry="32" fill="#e4c17a" opacity=".9"/><ellipse rx="20" ry="26" fill="#e8dcae" stroke="#c7ae73"/>
        <path d="M0,-22 C-6,-8 6,8 0,22" stroke="#b49a63" stroke-width="2" fill="none"/></g>`).join('')}
      <text x="160" y="232" class="art-label">sticky mucilage left on to dry</text>`;
    return `
      <rect x="50" y="90" width="220" height="110" rx="10" fill="#cfe6f0" opacity=".7" stroke="#7fb2c9" stroke-width="3"/>
      ${Array.from({ length: 14 }, (_, i) => `<g transform="translate(${78 + (i % 7) * 28} ${130 + Math.floor(i / 7) * 36})"><ellipse rx="10" ry="13" fill="#ece0b8" stroke="#c3ad7c"/><path d="M0,-10 C-4,-3 4,3 0,10" stroke="#b49a63" stroke-width="1.6" fill="none"/></g>`).join('')}
      <path d="M150,60 v20 M160,56 v26 M170,60 v20" stroke="#7fb2c9" stroke-width="3" stroke-linecap="round"/>
      <text x="160" y="232" class="art-label">pulped, fermented, washed clean</text>`;
  },
  dry: () => `${sun()}
    <path d="M20,180 L60,150 H300 L260,180Z" fill="#c9b48e" stroke="#9c8762" stroke-width="2"/>
    ${Array.from({ length: 30 }, (_, i) => `<ellipse cx="${70 + (i % 10) * 20 - Math.floor(i / 10) * 12}" cy="${158 + Math.floor(i / 10) * 8}" rx="5" ry="3.5" fill="#e3d3a8"/>`).join('')}
    <path d="M200,110 L170,170" stroke="#6b4a2c" stroke-width="5" stroke-linecap="round"/><path d="M158,166 h28" stroke="#6b4a2c" stroke-width="6" stroke-linecap="round"/>
    <text x="160" y="220" class="art-label">raked every hour, down to ~11% water</text>`,
  hull: () => `
    <g transform="translate(110 120)"><ellipse rx="34" ry="44" fill="#e8dcae" stroke="#c3ad7c" stroke-width="2"/>
      <path d="M-30,-10 L-8,-2 L-26,14" stroke="#9c8762" stroke-width="2.5" fill="none"/></g>
    <path d="M156,120 h28 m-10,-8 l10,8 l-10,8" stroke="var(--muted)" stroke-width="3" fill="none" stroke-linecap="round"/>
    ${bean(222, 120, greenBean, 0, 2.6, '#6f7b46')}
    <path d="M70,186 l12,-8 l6,10z M140,190 l-10,-10 l14,-2z" fill="#e8dcae" stroke="#c3ad7c"/>
    <text x="160" y="226" class="art-label">parchment off, green bean out</text>`,
  sort: () => `
    <path d="M50,80 h220 l-30,30 h-160z" fill="#b8a07a" opacity=".5"/>
    ${[0, 1, 2].map(r => `<rect x="70" y="${118 + r * 30}" width="180" height="6" rx="3" fill="var(--muted)" opacity=".5"/>`).join('')}
    ${Array.from({ length: 9 }, (_, i) => bean(90 + (i % 9) * 18, 110, greenBean, i * 30, .7, '#6f7b46')).join('')}
    ${Array.from({ length: 6 }, (_, i) => bean(100 + i * 24, 140, greenBean, i * 40, .6, '#6f7b46')).join('')}
    ${bean(150, 170, '#3a3222', 20, .55)}${bean(176, 170, greenBean, -20, .5, '#6f7b46')}
    <text x="160" y="214" class="art-label">size screens, density, defects out</text>
    <text x="268" y="174" class="art-tag" text-anchor="end">✕ black bean</text>`,
  ship: () => `
    <path d="M60,170 h200 l-20,34 h-160z" fill="#3d5a73"/><rect x="90" y="132" width="60" height="38" fill="#b5532a"/><rect x="154" y="132" width="60" height="38" fill="#c9a24a"/><rect x="122" y="96" width="60" height="36" fill="#4f7d4a"/>
    <path d="M30,214 q20,-8 40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0" fill="none" stroke="#7fb2c9" stroke-width="3"/>
    <text x="160" y="236" class="art-label">60–70 kg jute sacks, by sea</text>`,
  roast: () => `
    <circle cx="160" cy="118" r="62" fill="#5a5a5a"/><circle cx="160" cy="118" r="50" fill="#2e2e2e"/>
    ${Array.from({ length: 12 }, (_, i) => { const a = i * 0.52, r = 18 + (i % 3) * 10; return bean(160 + Math.cos(a) * r, 128 + Math.sin(a) * r * .6, ['#8a5631', '#64391f', roasted][i % 3], i * 33, .7); }).join('')}
    <path d="M110,190 h100" stroke="#3a3a3a" stroke-width="8" stroke-linecap="round"/>
    ${[0, 1, 2, 3].map(i => `<path d="M${128 + i * 20},214 q-6,-10 0,-18 q6,8 0,18z" fill="#f08a2b"/>`).join('')}
    <text x="160" y="236" class="art-label">first crack ≈ 196 °C</text>`,
  bag: () => `
    <path d="M110,70 h100 l10,150 h-120z" fill="#c9b18a" stroke="#9c8762" stroke-width="2.5"/><path d="M110,70 l-6,-12 h112 l-6,12" fill="#b49a73"/>
    <circle cx="160" cy="110" r="12" fill="#e8e1d3" stroke="#9c8762" stroke-width="2"/><circle cx="160" cy="110" r="4" fill="#9c8762"/>
    <text x="160" y="160" class="art-tag" text-anchor="middle">ROASTED</text><text x="160" y="178" class="art-tag" text-anchor="middle" opacity=".7">roast date · origin</text>
    <path d="M178,92 q10,-14 0,-26 M190,96 q12,-16 2,-34" stroke="var(--muted)" stroke-width="2" fill="none" opacity=".6"/>
    <text x="160" y="236" class="art-label">one-way valve lets CO₂ out</text>`,
  grind: () => `
    <path d="M128,40 h64 l-12,50 h-40z" fill="#c9c9c9" stroke="#8a8a8a" stroke-width="2"/>
    ${Array.from({ length: 6 }, (_, i) => bean(140 + (i % 3) * 20, 56 + Math.floor(i / 3) * 16, roasted, i * 50, .55)).join('')}
    <rect x="124" y="90" width="72" height="70" rx="10" fill="#3a3a3a"/><rect x="146" y="160" width="28" height="10" fill="#555"/>
    <path d="M118,186 h84 l-8,30 h-68z" fill="#f2ede4" stroke="#bbb"/>
    ${Array.from({ length: 40 }, (_, i) => `<circle cx="${130 + (i * 37) % 60}" cy="${190 + (i * 13) % 14}" r="1.6" fill="${roasted}"/>`).join('')}
    <text x="160" y="236" class="art-label">grind right before brewing</text>`,
  brew: () => `
    <path d="M118,70 h84 l-30,48 h-24z" fill="#f2ede4" stroke="#bbb" stroke-width="2"/><path d="M126,76 h68 l-24,36 h-20z" fill="${roasted}" opacity=".9"/>
    <path d="M232,40 q-20,-6 -36,14" stroke="#aaa" stroke-width="5" fill="none"/><path d="M196,54 q-14,8 -30,22" stroke="#9bd0ea" stroke-width="3" fill="none" stroke-dasharray="4 4"/>
    <path d="M160,118 v34" stroke="#4a2a14" stroke-width="3" stroke-dasharray="3 6"/>
    <path d="M118,150 h84 l-8,64 h-68z" fill="#f2ede4" opacity=".6" stroke="#bbb" stroke-width="2"/><path d="M124,180 h72 l-4,32 h-64z" fill="#4a2a14"/>
    <text x="160" y="236" class="art-label">90–96 °C water</text>`,
  cup: () => `
    <ellipse cx="160" cy="206" rx="90" ry="14" fill="#e8dccb"/>
    <path d="M100,110 h120 l-10,86 a12,12 0 0 1 -12,10 h-76 a12,12 0 0 1 -12,-10z" fill="#fffaf2" stroke="#2a1a12" stroke-width="3.5"/>
    <path d="M218,126 c34,0 34,46 -4,46" fill="none" stroke="#2a1a12" stroke-width="8"/>
    <ellipse cx="160" cy="112" rx="58" ry="8" fill="#6b4429"/>
    ${[0, 1, 2].map(i => `<path class="art-steam" style="animation-delay:${i * .8}s" d="M${138 + i * 22},94 q-8,-14 0,-28 q8,-14 0,-28" fill="none" stroke="var(--muted)" stroke-width="3" stroke-linecap="round"/>`).join('')}
    <text x="160" y="236" class="art-label">years of work in one cup</text>`,
};

function sun() {
  return `<circle cx="268" cy="46" r="20" fill="#f3c34b"/>${Array.from({ length: 8 }, (_, i) =>
    `<path d="M268,46 m${Math.cos(i * .785) * 26},${Math.sin(i * .785) * 26} l${Math.cos(i * .785) * 8},${Math.sin(i * .785) * 8}" stroke="#f3c34b" stroke-width="3" stroke-linecap="round"/>`).join('')}`;
}

// ---------- render ----------
function massAt(i) {
  let m = null;
  for (let j = 0; j <= i; j++) if (MASS_TRAIL[JOURNEY[j].id] != null) m = MASS_TRAIL[JOURNEY[j].id];
  return m;
}

function render() {
  const s = JOURNEY[at];
  $('jArt').innerHTML = ART[s.art]();
  $('jArt').classList.remove('art-in'); void $('jArt').offsetWidth; $('jArt').classList.add('art-in');
  $('jCount').textContent = `Step ${at + 1} of ${JOURNEY.length}`;
  $('jPhase').textContent = s.phase;
  $('jTitle').textContent = s.title;
  $('jTime').textContent = `⏱ ${s.time}`;

  let body = `<p>${s.text}</p>`;
  if (s.choice) {
    const p = PROCESSES.find(x => x.id === process);
    body += `<div class="seg j-proc" role="radiogroup" aria-label="Processing method">${PROCESSES.map(x =>
      `<button type="button" role="radio" data-proc="${x.id}" aria-checked="${x.id === process}">${x.name}<small>${x.aka}</small></button>`).join('')}</div>
      <dl class="j-proc-info"><dt>How</dt><dd>${p.how}</dd><dt>Tastes</dt><dd>${p.taste}</dd><dt>Famous in</dt><dd>${p.where}</dd></dl>`;
  }
  if (s.points.length) body += `<ul class="j-points">${s.points.map(p => `<li>${p}</li>`).join('')}</ul>`;
  body += `<p class="j-fact">💡 ${s.fact}${s.link ? ` <a href="${s.link}">Go there →</a>` : ''}</p>`;
  $('jBody').innerHTML = body;

  const m = massAt(at);
  $('jMass').hidden = m == null;
  if (m != null) {
    $('jMassFill').style.width = `${(m / 5) * 100}%`;
    $('jMassText').textContent = at === JOURNEY.length - 1
      ? '≈ 0.82 kg roasted ≈ 55 cups'
      : `${m >= 1 ? +m.toFixed(2) + ' kg' : Math.round(m * 1000) + ' g'} left of 5 kg picked`;
  }

  $('jSteps').querySelectorAll('button').forEach((b, i) => {
    b.setAttribute('aria-current', i === at ? 'step' : 'false');
    b.classList.toggle('done', i < at);
  });
  $('jPrev').disabled = at === 0;
  $('jNext').textContent = at === JOURNEY.length - 1 ? 'Start over ↺' : 'Next →';
}

function go(i) { at = (i + JOURNEY.length) % JOURNEY.length; render(); }

function togglePlay(force) {
  const on = force ?? !playing;
  clearInterval(playing); playing = 0;
  if (on) playing = setInterval(() => (at === JOURNEY.length - 1 ? togglePlay(false) : go(at + 1)), 5200);
  $('jPlay').setAttribute('aria-pressed', !!playing);
  $('jPlay').textContent = playing ? '❚❚ Pause' : '▶ Autoplay';
}

export function initJourney() {
  // timeline grouped by phase
  $('jSteps').innerHTML = PHASES.map(ph => `<li class="j-phase"><span>${ph}</span><ol>${JOURNEY.map((s, i) => s.phase !== ph ? '' :
    `<li><button type="button" data-i="${i}" title="${s.title}"><b>${i + 1}</b><span>${s.title}</span></button></li>`).join('')}</ol></li>`).join('');
  $('jSteps').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) { togglePlay(false); go(+b.dataset.i); } });
  $('jPrev').addEventListener('click', () => { togglePlay(false); go(at - 1); });
  $('jNext').addEventListener('click', () => { togglePlay(false); go(at + 1); });
  $('jPlay').addEventListener('click', () => togglePlay());
  $('jBody').addEventListener('click', e => {
    const b = e.target.closest('[data-proc]');
    if (b) { process = b.dataset.proc; render(); }
  });
  $('journey').addEventListener('keydown', e => {
    if (e.target.closest('input, select, textarea')) return;
    if (e.key === 'ArrowRight') { togglePlay(false); go(at + 1); }
    if (e.key === 'ArrowLeft') { togglePlay(false); go(at - 1); }
  });
  render();
}

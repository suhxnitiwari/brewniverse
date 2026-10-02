// Bean Anatomy: a clickable cross-section of a coffee cherry you can peel.
import { ANATOMY, PROCESS_STAGES } from './data.js';

const $ = id => document.getElementById(id);
const CY = 225;

const state = { stage: 0, selected: 'bean', peaberry: false };

// A "D" shaped half-bean. side -1 bulges left, +1 bulges right.
function dShape(flatX, rx, ry, side) {
  const sweep = side < 0 ? 1 : 0;
  return `M${flatX},${CY + ry} A${rx},${ry} 0 0 ${sweep} ${flatX},${CY - ry} Z`;
}

// [flat-side inset, rx, ry] for the two-seed cherry, and [rx, ry] for a peaberry
const SEED_LAYERS = {
  mucilage:   { pair: [2, 76, 98],  pea: [86, 104] },
  parchment:  { pair: [5, 70, 92],  pea: [80, 98] },
  silverskin: { pair: [9, 64, 86],  pea: [74, 92] },
  bean:       { pair: [12, 60, 82], pea: [70, 88] },
};

function seedShapes(id) {
  const L = SEED_LAYERS[id];
  if (state.peaberry) {
    const [rx, ry] = L.pea;
    return `<ellipse class="shape" cx="200" cy="${CY}" rx="${rx}" ry="${ry}" />`;
  }
  const [inset, rx, ry] = L.pair;
  return `<path class="shape side-l" d="${dShape(200 - inset, rx, ry, -1)}" />
          <path class="shape side-r" d="${dShape(200 + inset, rx, ry, 1)}" />`;
}

function buildSvg() {
  const crease = state.peaberry
    ? `<path class="crease" d="M200,150 C186,190 214,240 196,300" />`
    : `<path class="crease side-l" d="M178,160 C166,200 184,240 172,290" />
       <path class="crease side-r" d="M222,160 C234,200 216,240 228,290" />`;
  const embryo = state.peaberry
    ? `<ellipse class="shape" cx="200" cy="296" rx="6" ry="10" />`
    : `<ellipse class="shape side-l" cx="160" cy="286" rx="5" ry="9" />
       <ellipse class="shape side-r" cx="240" cy="286" rx="5" ry="9" />`;

  $('anatomySvg').innerHTML = `
    <g class="layer" data-layer="skin">
      <path class="stem" d="M200,70 C200,50 208,34 222,22" />
      <path class="leaf" d="M214,36 C236,18 270,22 284,34 C262,48 232,50 214,36 Z" />
      <ellipse class="shape" cx="200" cy="${CY}" rx="150" ry="158" />
      <ellipse class="gloss" cx="140" cy="130" rx="34" ry="20" transform="rotate(-30 140 130)" />
    </g>
    <g class="layer" data-layer="pulp"><ellipse class="shape" cx="200" cy="${CY}" rx="138" ry="146" /></g>
    <g class="layer" data-layer="mucilage">${seedShapes('mucilage')}</g>
    <g class="layer" data-layer="parchment">${seedShapes('parchment')}</g>
    <g class="layer" data-layer="silverskin">${seedShapes('silverskin')}</g>
    <g class="layer" data-layer="bean">${seedShapes('bean')}${crease}</g>
    <g class="layer" data-layer="embryo">${embryo}</g>
    <g id="chaff"></g>`;
  applyState();
}

function applyState() {
  const svg = $('anatomySvg');
  svg.classList.toggle('roasted', state.stage >= 4);
  svg.classList.toggle('split', state.stage >= 3 && !state.peaberry);
  svg.classList.toggle('has-focus', !!state.selected);

  ANATOMY.forEach(layer => {
    const g = svg.querySelector(`[data-layer="${layer.id}"]`);
    g.classList.toggle('is-gone', state.stage >= layer.goneAt);
    g.classList.toggle('is-focus', state.selected === layer.id);
  });

  $('stageSlider').value = state.stage;
  const s = PROCESS_STAGES[state.stage];
  $('stageText').innerHTML = `<strong>${s.name}.</strong> ${s.text}`;
  $('stageTicks').querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-current', i === state.stage ? 'step' : 'false'));
  $('peelBtn').textContent = state.stage >= 4 ? 'Start over ↺' : 'Peel next layer →';

  $('layerList').querySelectorAll('button').forEach(b => {
    const layer = ANATOMY.find(l => l.id === b.dataset.layer);
    b.setAttribute('aria-pressed', state.selected === layer.id);
    b.classList.toggle('is-gone', state.stage >= layer.goneAt);
  });

  const layer = ANATOMY.find(l => l.id === state.selected);
  const i = ANATOMY.indexOf(layer);
  $('layerCard').innerHTML = `
    <p class="layer-num">Layer ${i + 1} of ${ANATOMY.length}</p>
    <h3>${layer.name} <span>${layer.sci}</span></h3>
    <p>${layer.body}</p>
    <p class="layer-fact">💡 ${layer.fact}</p>
    ${state.stage >= layer.goneAt ? `<p class="layer-gone">Already removed at the “${PROCESS_STAGES[layer.goneAt].name}” step. <button type="button" class="link" id="bringBack">Put it back</button></p>` : ''}`;
  const back = $('bringBack');
  if (back) back.addEventListener('click', () => setStage(layer.goneAt - 1));
}

function setStage(n) {
  const prev = state.stage;
  state.stage = Math.max(0, Math.min(4, n));
  if (state.stage === 4 && prev < 4) puffChaff();
  applyState();
}

// little silver flakes fly off when you roast
function puffChaff() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const g = $('chaff');
  g.innerHTML = Array.from({ length: 14 }, (_, i) => {
    const angle = (i / 14) * Math.PI * 2;
    const dx = Math.cos(angle) * (90 + Math.random() * 60);
    const dy = Math.sin(angle) * (90 + Math.random() * 60) - 30;
    return `<ellipse class="flake" cx="200" cy="${CY}" rx="6" ry="3" style="--dx:${dx}px;--dy:${dy}px;animation-delay:${Math.random() * 0.15}s" />`;
  }).join('');
  setTimeout(() => (g.innerHTML = ''), 1400);
}

function select(id) {
  state.selected = id;
  applyState();
}

export function initAnatomy() {
  $('layerList').innerHTML = ANATOMY.map((l, i) =>
    `<li><button type="button" data-layer="${l.id}"><span class="num">${i + 1}</span>${l.name}<small>${l.sci}</small></button></li>`).join('');
  $('stageTicks').innerHTML = PROCESS_STAGES.map((s, i) =>
    `<li><button type="button" data-stage="${i}">${s.name}</button></li>`).join('');

  buildSvg();

  const svg = $('anatomySvg');
  svg.addEventListener('click', e => {
    const g = e.target.closest('.layer');
    if (g) select(g.dataset.layer);
  });
  svg.addEventListener('pointermove', e => {
    const g = e.target.closest('.layer');
    const cap = $('anatomyCaption');
    if (g) {
      const l = ANATOMY.find(x => x.id === g.dataset.layer);
      cap.textContent = `${l.name} (${l.sci})`;
      svg.querySelectorAll('.layer').forEach(x => x.classList.toggle('is-hover', x === g));
    }
  });
  svg.addEventListener('pointerleave', () => {
    $('anatomyCaption').textContent = 'Tap a layer';
    svg.querySelectorAll('.layer').forEach(x => x.classList.remove('is-hover'));
  });

  $('layerList').addEventListener('click', e => {
    const b = e.target.closest('[data-layer]');
    if (b) select(b.dataset.layer);
  });
  $('stageTicks').addEventListener('click', e => {
    const b = e.target.closest('[data-stage]');
    if (b) setStage(+b.dataset.stage);
  });
  $('stageSlider').addEventListener('input', e => setStage(+e.target.value));
  $('peelBtn').addEventListener('click', () => setStage(state.stage >= 4 ? 0 : state.stage + 1));
  $('peaberryBtn').addEventListener('click', () => {
    state.peaberry = !state.peaberry;
    $('peaberryBtn').setAttribute('aria-pressed', state.peaberry);
    $('peaberryBtn').textContent = state.peaberry ? 'Two seeds' : 'Peaberry';
    buildSvg();
  });
}

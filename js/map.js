// Coffee Map: where coffee grows, and where the big chains say they buy it.
// Uses d3 + topojson (loaded from a CDN in index.html) and the world-atlas country shapes.
import { PRODUCERS, BRANDS, DOT_ORIGINS } from './world-data.js';
import { $ } from './util.js';

const WORLD_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
const W = 960, H = 500;
const TROPIC = 23.44;

const byId = new Map(PRODUCERS.map(p => [p.id, p]));
let brand = null;
let picked = null;
let projection, path, countries;

// light → dark coffee color by harvest size (log scale, since Brazil dwarfs everyone)
function shade(bags) {
  const t = Math.min(1, Math.log10(bags * 50 + 1) / Math.log10(66 * 50 + 1));
  const a = [233, 200, 150], b = [74, 38, 18];
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;
}

function draw(world) {
  const d3 = window.d3;
  countries = window.topojson.feature(world, world.objects.countries).features;
  projection = d3.geoNaturalEarth1().fitExtent([[6, 6], [W - 6, H - 6]], { type: 'Sphere' });
  path = d3.geoPath(projection);

  const yN = projection([0, TROPIC])[1], yS = projection([0, -TROPIC])[1];
  const svg = $('mapSvg');
  svg.innerHTML = `
    <defs><clipPath id="sphereClip"><path d="${path({ type: 'Sphere' })}"/></clipPath></defs>
    <path class="m-sphere" d="${path({ type: 'Sphere' })}"/>
    <path class="m-grat" d="${path(d3.geoGraticule10())}"/>
    <g clip-path="url(#sphereClip)">
      <rect class="m-belt" x="0" y="${yN}" width="${W}" height="${yS - yN}"/>
      <line class="m-tropic" x1="0" x2="${W}" y1="${yN}" y2="${yN}"/><line class="m-tropic" x1="0" x2="${W}" y1="${yS}" y2="${yS}"/>
    </g>
    <text class="m-tropic-label" x="14" y="${yN - 6}">Tropic of Cancer</text>
    <text class="m-tropic-label" x="14" y="${yS + 14}">Tropic of Capricorn</text>
    <g id="mCountries">${countries.map(f => {
      const p = byId.get(+f.id);
      return `<path class="m-country${p ? ' m-grows' : ''}" data-id="${+f.id}" d="${path(f)}" ${p ? `style="--c:${shade(p.bags)}" tabindex="0" role="button" aria-label="${p.name}"` : ''}/>`;
    }).join('')}</g>
    <g id="mDots">${DOT_ORIGINS.map((d, i) => { const [x, y] = projection([d.lon, d.lat]); return `<circle class="m-dot" data-dot="${i}" cx="${x}" cy="${y}" r="5" tabindex="0" role="button" aria-label="${d.name}"/>`; }).join('')}</g>
    <g id="mArcs"></g>
    <g id="mHq"></g>`;
  $('mapLoading').hidden = true;
  renderBrand();
  if (picked) pick(picked);
}

function centroid(id) {
  const f = countries.find(c => +c.id === id);
  // France-style overseas bits can drag a centroid into the ocean; these producers are fine at 110m.
  return f ? window.d3.geoCentroid(f) : null;
}

function renderBrand() {
  $('brandChips').querySelectorAll('[data-brand]').forEach(b => b.setAttribute('aria-pressed', b.dataset.brand === (brand?.id || '')));
  const svg = $('mapSvg');
  svg.classList.toggle('has-brand', !!brand);
  if (!path) return;
  svg.querySelectorAll('.m-country').forEach(el => el.classList.toggle('m-from', !!brand && brand.origins.includes(+el.dataset.id)));
  svg.style.setProperty('--brand', brand ? brand.color : 'var(--accent)');

  if (!brand) { $('mArcs').innerHTML = ''; $('mHq').innerHTML = ''; return; }
  const hq = [brand.lon, brand.lat];
  $('mArcs').innerHTML = brand.origins.map((id, i) => {
    const c = centroid(id);
    if (!c) return '';
    return `<path class="m-arc" style="animation-delay:${i * 70}ms" d="${path({ type: 'LineString', coordinates: [c, hq] })}"/>`;
  }).join('');
  const [x, y] = projection(hq);
  $('mHq').innerHTML = `<circle class="m-hq" cx="${x}" cy="${y}" r="7"/><text class="m-hq-label" x="${x + 10}" y="${y - 8}">${brand.name} HQ · ${brand.hq}</text>`;
}

function renderInfo() {
  const box = $('mapInfo');
  if (brand && !picked) {
    const names = brand.origins.map(id => byId.get(id)?.name).filter(Boolean);
    box.innerHTML = `<p class="mini-title">Where ${brand.name} gets its coffee</p>
      <h3>${brand.name}</h3>
      <p>${brand.blurb}</p>
      <p class="m-sold"><b>What you buy:</b> ${brand.sold}</p>
      <div class="chips">${names.map(n => `<span class="chip static">${n}</span>`).join('')}</div>
      <p class="m-note">Chains don’t publish exact blends, and the mix changes every harvest. These are origins they’ve named publicly.</p>`;
    return;
  }
  if (picked) {
    const p = picked;
    const rank = [...PRODUCERS].sort((a, b) => b.bags - a.bags).indexOf(p) + 1;
    const buyers = BRANDS.filter(b => b.origins.includes(p.id)).map(b => b.name);
    box.innerHTML = `<p class="mini-title">${p.dot ? 'Small but famous' : `#${rank} producer`}</p>
      <h3>${p.name}</h3>
      ${p.dot ? '' : `<dl class="sp-dl">
        <dt>Harvest</dt><dd>≈ ${p.bags < 1 ? Math.round(p.bags * 1000) + 'k' : p.bags + ' million'} 60-kg bags a year</dd>
        <dt>Species</dt><dd>${p.type.replace(/\bA\b/, 'Arabica').replace(/\bR\b/, 'Robusta')}</dd>
        <dt>Picking</dt><dd>${p.harvest}</dd>
        <dt>Tastes like</dt><dd>${p.notes}</dd>
      </dl>`}
      <p class="layer-fact">${p.fact}</p>
      ${buyers.length ? `<p class="m-sold"><b>Named by:</b> ${buyers.join(', ')}</p>` : ''}
      <button class="link" type="button" id="mapBack">← Back to the top 10</button>`;
    return;
  }
  const top = [...PRODUCERS].sort((a, b) => b.bags - a.bags).slice(0, 10);
  box.innerHTML = `<p class="mini-title">Top 10 growers · million 60-kg bags</p>
    <ol class="m-top">${top.map(p => `<li><button type="button" data-pick="${p.id}"><span>${p.name}</span>
      <i style="width:${(p.bags / top[0].bags) * 100}%;background:${shade(p.bags)}"></i><b>${p.bags}</b></button></li>`).join('')}</ol>
    <p class="m-note">Rough recent averages. About 70 countries grow coffee, almost all inside the tropics.</p>`;
}

function pick(p) {
  picked = p;
  $('mapSvg').querySelectorAll('.m-country').forEach(el => el.classList.toggle('m-picked', !!p && +el.dataset.id === p.id));
  renderInfo();
}

let loading = false;
function loadMap() {
  if (loading) return;
  loading = true;
  if (!window.d3 || !window.topojson) { $('mapLoading').textContent = 'The map needs an internet connection to load.'; return; }
  fetch(WORLD_URL).then(r => r.json()).then(draw)
    .catch(() => ($('mapLoading').textContent = 'Couldn’t load the map. Check your connection and refresh.'));
}

// Jump to a country (or a dot like Kona) from elsewhere on the page.
export function focusOrigin({ id, dot }) {
  loadMap();
  brand = null;
  renderBrand();
  if (dot != null) pick({ ...DOT_ORIGINS[dot], id: -1, dot: true });
  else pick(byId.get(id));
}

export function initMap() {
  $('brandChips').innerHTML = `<button type="button" class="chip" data-brand="" aria-pressed="true">All growers</button>` +
    BRANDS.map(b => `<button type="button" class="chip" data-brand="${b.id}" style="--b:${b.color}" aria-pressed="false"><i class="b-dot"></i>${b.name}</button>`).join('');
  $('brandChips').addEventListener('click', e => {
    const b = e.target.closest('[data-brand]');
    if (!b) return;
    brand = BRANDS.find(x => x.id === b.dataset.brand) || null;
    pick(null);
    renderBrand();
  });

  const svg = $('mapSvg'), tip = $('mapTip');
  const choose = el => {
    const c = el.closest('.m-grows'), d = el.closest('.m-dot');
    if (c) pick(byId.get(+c.dataset.id));
    else if (d) { const o = DOT_ORIGINS[+d.dataset.dot]; pick({ ...o, id: -1, dot: true }); }
  };
  svg.addEventListener('click', e => choose(e.target));
  svg.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(e.target); } });
  svg.addEventListener('pointermove', e => {
    const c = e.target.closest('.m-grows'), d = e.target.closest('.m-dot');
    const p = c ? byId.get(+c.dataset.id) : d ? DOT_ORIGINS[+d.dataset.dot] : null;
    if (!p) { tip.hidden = true; return; }
    const r = $('mapWrap').getBoundingClientRect();
    tip.textContent = p.bags ? `${p.name} · ${p.bags}M bags` : p.name;
    tip.style.left = `${e.clientX - r.left}px`;
    tip.style.top = `${e.clientY - r.top}px`;
    tip.hidden = false;
  });
  svg.addEventListener('pointerleave', () => (tip.hidden = true));
  $('mapInfo').addEventListener('click', e => {
    const b = e.target.closest('[data-pick]');
    if (b) pick(byId.get(+b.dataset.pick));
    if (e.target.id === 'mapBack') pick(null);
  });

  renderInfo();

  // only fetch the map once it’s close to the screen
  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); loadMap(); } }, { rootMargin: '600px' });
  io.observe($('coffeemap'));
}

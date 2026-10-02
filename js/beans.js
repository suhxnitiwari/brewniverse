// Beans & Roasts: the four species, cherry colors, and the four roast levels.
import { ORIGIN_COFFEES, ORIGIN_REGIONS, SPECIES, RARE_SPECIES, VARIETIES, VARIETY_FAMILIES, ROAST_LEVELS } from './world-data.js';
import { $, seeded } from './util.js';
import { focusOrigin } from './map.js';

let species = 'arabica';
let roast = 'medium';
let family = 'All';
let region = 'All';

// Each species gets its own bean silhouette.
function speciesBean(sp, size = 120) {
  const s = sp.scale;
  const shapes = {
    arabica:  { body: '<ellipse rx="34" ry="46"/>', crease: 'M0,-40 C-14,-14 14,12 0,40' },
    robusta:  { body: '<ellipse rx="34" ry="38"/>', crease: 'M0,-32 C-3,-10 3,10 0,32' },
    liberica: { body: '<path d="M0,-52 C30,-50 40,-10 34,18 C28,44 10,54 -6,52 C-30,48 -38,14 -34,-14 C-30,-40 -18,-52 0,-52Z"/>', crease: 'M2,-44 C-14,-16 16,14 -2,46' },
    excelsa:  { body: '<path d="M0,-48 C24,-44 36,-12 32,14 C28,38 12,46 0,46 C-14,46 -30,36 -32,10 C-34,-16 -22,-46 0,-48Z"/>', crease: 'M0,-40 C-10,-14 10,12 0,40' },
  }[sp.id];
  return `<svg viewBox="-60 -60 120 120" width="${size}" height="${size}" aria-hidden="true">
    <g transform="scale(${s})" fill="${sp.color}">${shapes.body}</g>
    <g transform="scale(${s})"><path d="${shapes.crease}" fill="none" stroke="#1d0e06" stroke-width="5" stroke-linecap="round" opacity=".75"/>
      <path d="${shapes.crease}" fill="none" stroke="#e2c08e" stroke-width="1.4" stroke-linecap="round" opacity=".55"/></g>
    <g transform="scale(${s})" fill="url(#beanShine)" opacity=".5">${shapes.body}</g>
  </svg>`;
}

function renderSpecies() {
  $('speciesTabs').querySelectorAll('[data-sp]').forEach(b => b.setAttribute('aria-pressed', b.dataset.sp === species));
  $('caffeineLadder').querySelectorAll('[data-sp]').forEach(b => b.setAttribute('aria-pressed', b.dataset.sp === species));
  const sp = SPECIES.find(s => s.id === species);
  const maxCaf = 2.7;
  $('speciesCard').innerHTML = `
    <div class="sp-art">${speciesBean(sp, 170)}<p class="sp-shape">${sp.shape}</p></div>
    <div class="sp-info">
      <h3>${sp.name} <span>${sp.sci}</span></h3>
      <p class="sp-taste">${sp.taste}</p>
      <div class="sp-name"><span class="mini-title">Why is it called ${sp.name}?</span><p>${sp.named}</p>${sp.parents ? `<p>${sp.parents}</p>` : ''}</div>
      <div class="sp-stats">
        <div><span class="mini-title">Share of world coffee</span><div class="bar"><i style="width:${sp.share}%"></i></div><b>${sp.share > 2 ? `≈ ${sp.share}%` : '< 2%'}</b></div>
        <div><span class="mini-title">Caffeine (of bean weight)</span><div class="bar"><i style="width:${(sp.caffeineN / maxCaf) * 100}%"></i></div><b>${sp.caffeine}</b></div>
      </div>
      <dl class="sp-dl">
        <dt>Grows at</dt><dd>${sp.altitude}</dd>
        <dt>Mostly from</dt><dd>${sp.grows}</dd>
        <dt>Ends up in</dt><dd>${sp.used}</dd>
        <dt>Price</dt><dd>${sp.price}</dd>
      </dl>
      <p class="layer-fact">${sp.notes}</p>
    </div>`;
}

// A pile of beans in one roast color, laid out the same way every time.
function pile(r, seed) {
  const rnd = seeded(seed);
  let s = '';
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 5; col++) {
      const x = 24 + col * 26 + (row % 2) * 12 + (rnd() - .5) * 8;
      const y = 22 + row * 25 + (rnd() - .5) * 6;
      const rot = rnd() * 360;
      const flat = rnd() > .45;  // flat side up shows the crease
      const shade = (rnd() - .5) * .25;
      s += `<g transform="translate(${x} ${y}) rotate(${rot})">
        <ellipse rx="10" ry="13.5" fill="${r.color}" style="filter:brightness(${1 + shade})"/>
        ${flat ? `<path d="M0,-11 C-4,-4 4,4 0,11" fill="none" stroke="${r.crease}" stroke-width="2.4" stroke-linecap="round"/>` : ''}
        <ellipse rx="10" ry="13.5" fill="url(#beanShine)" opacity="${.25 + r.sheen}"/>
      </g>`;
    }
  }
  return `<svg viewBox="0 0 170 200" aria-hidden="true">${s}</svg>`;
}

function cherry(color) {
  return `<svg viewBox="-14 -16 28 30" width="34" height="36" aria-hidden="true"><circle r="11" fill="${color}"/><circle cx="-4" cy="-4" r="3" fill="#fff" opacity=".4"/><path d="M0,-11 q2,-3 5,-3" stroke="#5b3a22" stroke-width="2" fill="none"/></svg>`;
}

function renderVarieties() {
  $('varietyFilters').querySelectorAll('[data-fam]').forEach(b => b.setAttribute('aria-pressed', b.dataset.fam === family));
  $('varieties').innerHTML = VARIETIES.filter(v => family === 'All' || v.family === family).map(v =>
    `<li>${cherry(v.color)}<div><b>${v.name}</b><small class="v-meta">${v.family} family · ${v.from}</small><span>${v.note}</span></div></li>`).join('');
}

function renderOrigins() {
  $('originFilters').querySelectorAll('[data-region]').forEach(b => b.setAttribute('aria-pressed', b.dataset.region === region));
  $('origins').innerHTML = ORIGIN_COFFEES.map((o, i) => ({ o, i })).filter(({ o }) => region === 'All' || o.region === region).map(({ o, i }) => `
    <article class="origin">
      <p class="mini-title">${o.country} · ${o.region}</p>
      <h4>${o.name}</h4>
      <div class="o-notes">${o.notes.map(n => `<span>${n}</span>`).join('')}</div>
      <dl class="sp-dl"><dt>Species</dt><dd>${o.species}</dd><dt>Process</dt><dd>${o.process}</dd></dl>
      <p class="o-bag">🏷️ ${o.bag}</p>
      <p class="o-fact">${o.fact}</p>
      <button type="button" class="link" data-origin="${i}">See it on the map →</button>
    </article>`).join('');
}

function meter(label, v) {
  return `<div class="fm"><span>${label}</span><div class="fm-track"><div class="fm-fill" style="width:${v * 20}%"></div></div></div>`;
}

function renderRoast() {
  $('roastPiles').querySelectorAll('[data-roast]').forEach(b => b.setAttribute('aria-pressed', b.dataset.roast === roast));
  const r = ROAST_LEVELS.find(x => x.id === roast);
  $('roastCard').innerHTML = `
    <h3>${r.name} roast</h3>
    <p class="roast-note">${r.taste}</p>
    <dl class="sp-dl">
      <dt>Bean temp</dt><dd>${r.temp} · ${r.crack}</dd>
      <dt>Surface</dt><dd>${r.surface}</dd>
      <dt>On the bag</dt><dd>${r.aka}</dd>
      <dt>Great for</dt><dd>${r.brew}</dd>
    </dl>
    <div class="flavor-meters">${meter('Acidity', r.acidity)}${meter('Body', r.body)}${meter('Bitterness', r.bitter)}</div>
    <a class="link" href="#roast">Roast one yourself →</a>`;
}

export function initBeans() {
  $('speciesTabs').innerHTML = SPECIES.map(sp =>
    `<button type="button" class="sp-tab" data-sp="${sp.id}" aria-pressed="false">${speciesBean(sp, 54)}<span>${sp.name}</span></button>`).join('');
  // most → least caffeine
  $('caffeineLadder').innerHTML = `<span class="mini-title">Most caffeine</span>` + [...SPECIES].sort((a, b) => b.caffeineN - a.caffeineN).map(sp =>
    `<button type="button" data-sp="${sp.id}" aria-pressed="false"><i style="height:${Math.round((sp.caffeineN / 2.7) * 44)}px"></i><b>${sp.name}</b><small>${sp.caffeine}</small></button>`).join('') + `<span class="mini-title">Least</span>`;
  $('caffeineLadder').addEventListener('click', e => { const b = e.target.closest('[data-sp]'); if (b) { species = b.dataset.sp; renderSpecies(); } });
  $('speciesTabs').addEventListener('click', e => { const b = e.target.closest('[data-sp]'); if (b) { species = b.dataset.sp; renderSpecies(); } });

  $('originFilters').innerHTML = ['All', ...ORIGIN_REGIONS].map(r => `<button type="button" class="chip" data-region="${r}" aria-pressed="false">${r === 'All' ? 'Everywhere' : r}</button>`).join('');
  $('originFilters').addEventListener('click', e => { const b = e.target.closest('[data-region]'); if (b) { region = b.dataset.region; renderOrigins(); } });
  $('origins').addEventListener('click', e => {
    const b = e.target.closest('[data-origin]');
    if (!b) return;
    const o = ORIGIN_COFFEES[+b.dataset.origin];
    focusOrigin(o.dot != null ? { dot: o.dot } : { id: o.id });
    $('coffeemap').scrollIntoView({ behavior: 'smooth' });
  });
  renderOrigins();

  $('varietyFilters').innerHTML = ['All', ...VARIETY_FAMILIES].map(f => `<button type="button" class="chip" data-fam="${f}" aria-pressed="false">${f === 'All' ? 'All varieties' : f}</button>`).join('');
  $('varietyFilters').addEventListener('click', e => { const b = e.target.closest('[data-fam]'); if (b) { family = b.dataset.fam; renderVarieties(); } });
  renderVarieties();

  $('rareSpecies').innerHTML = RARE_SPECIES.map(r =>
    `<article class="fact"><h3>${r.name} <i>${r.sci}</i></h3><p class="rare-named">${r.named}</p><p>${r.note}</p></article>`).join('');

  $('roastPiles').innerHTML = ROAST_LEVELS.map((r, i) =>
    `<button type="button" class="pile" data-roast="${r.id}" aria-pressed="false">${pile(r, 11 + i * 7)}<span>${r.name}</span></button>`).join('');
  $('roastPiles').addEventListener('click', e => { const b = e.target.closest('[data-roast]'); if (b) { roast = b.dataset.roast; renderRoast(); } });

  renderSpecies();
  renderRoast();
}
